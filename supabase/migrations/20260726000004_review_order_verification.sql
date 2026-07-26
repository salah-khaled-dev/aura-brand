-- ============================================================================
-- Reviews: verified-purchase order linkage, moderation workflow, analytics.
--
-- Builds on the reviews table from 20260715000011 (guest-submittable,
-- pending-only, admin-moderated free-text reviews). This migration extends
-- it — nothing here rebuilds or replaces the existing table/policies:
--
--   1. New columns linking a review to the exact order + order line item it
--      came from (order_id/order_item_id/order_number), plus the size-fit
--      feedback, yes/no recommendation, and photo array the review form
--      collects, plus a product snapshot (color/size) so a review stays
--      fully readable even after the product is edited or deleted — it
--      already was for name/image (those columns predate this migration and
--      are already denormalized text, and product_id is already
--      `on delete set null`).
--   2. Fixes reviews.customer_id, which incorrectly referenced `profiles`
--      (the staff table) — it should reference `public.customers`, the real
--      customer-identity table `orders.customer_ref_id` already points to.
--   3. A hard DB-level "one review per product per order" guarantee via a
--      partial unique index on order_item_id.
--   4. Extends the existing approval notification trigger to also fire on
--      rejection (customer-facing, via customer_notifications).
--   5. Three new RPCs: get_product_review_stats (public product-page stats,
--      computed server-side, never trusted from the client),
--      get_review_admin_stats (admin-only analytics for the existing Reviews
--      page), and mark_review_helpful (guest-safe helpful-vote counter,
--      touches nothing but helpful_count on an approved review).
--   6. A `reviews` storage bucket for review photos — admin-write-only via
--      RLS (mirrors the 4 buckets in 20260714120020); actual guest uploads
--      go through a service-role API route (src/app/api/reviews/submit),
--      never through this bucket's RLS directly.
-- ============================================================================


-- ─── 1. New columns ─────────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists order_item_id uuid references public.order_items(id) on delete set null,
  add column if not exists order_number text,
  add column if not exists customer_phone text,

  add column if not exists size_fit text,
  add column if not exists recommended boolean,

  add column if not exists images text[] not null default '{}',

  add column if not exists product_color text,
  add column if not exists product_size text,

  add column if not exists admin_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,

  add column if not exists helpful_count integer not null default 0;

-- Generated so "photos first" sorting can happen in SQL (order by has_images
-- desc, created_at desc) instead of being computed/re-sorted in app code.
alter table public.reviews
  add column if not exists has_images boolean generated always as (cardinality(images) > 0) stored;

alter table public.reviews
  add constraint reviews_size_fit_valid
    check (size_fit is null or size_fit in ('runs_small', 'true_to_size', 'runs_large'));

create index if not exists reviews_order_id_idx on public.reviews (order_id);
create index if not exists reviews_order_number_idx on public.reviews (order_number);

-- One review per product per order line — enforced at the DB level, not
-- just in the submission API route.
create unique index if not exists reviews_order_item_unique_idx
  on public.reviews (order_item_id)
  where order_item_id is not null;


-- ─── 2. Fix customer_id: profiles (staff) → customers (real identity) ──────
-- Looked up by introspection rather than assuming Postgres's default
-- `reviews_customer_id_fkey` name, so this is safe even if the original
-- constraint was named differently.

do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where con.conrelid = 'public.reviews'::regclass
    and con.contype = 'f'
    and att.attname = 'customer_id';

  if v_constraint_name is not null then
    execute format('alter table public.reviews drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.reviews
  add constraint reviews_customer_id_fkey
    foreign key (customer_id) references public.customers(id) on delete set null;


-- ─── 3. Anon column-select grant: add the new public-safe columns ──────────
-- (order_id/order_item_id/order_number/customer_phone/admin_notes/
--  approved_at/approved_by stay out — internal-only, same treatment as the
--  existing customer_email/customer_id exclusion from 20260715000011.)

grant select (
  size_fit, recommended, images, has_images,
  helpful_count, product_color, product_size
) on table public.reviews to anon;


-- ─── 4. Approval/rejection customer notification ───────────────────────────

create or replace function public.notify_review_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.order_id is not null then
    if new.status = 'approved' then
      insert into public.customer_notifications (order_id, order_number, status, title, message)
      values (
        new.order_id, coalesce(new.order_number, ''), 'review_approved',
        'تم نشر تقييمكِ',
        'شكراً لكِ! تقييمكِ لمنتج "' || new.product_name || '" تم اعتماده ونشره الآن.'
      );
    elsif new.status = 'rejected' then
      insert into public.customer_notifications (order_id, order_number, status, title, message)
      values (
        new.order_id, coalesce(new.order_number, ''), 'review_rejected',
        'تقييمكِ بحاجة إلى مراجعة',
        'نأسف، لم يتم نشر تقييمكِ لمنتج "' || new.product_name || '". يمكنكِ التواصل معنا لمزيد من التفاصيل.'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_review_moderation on public.reviews;
create trigger notify_review_moderation
  after update on public.reviews
  for each row execute function public.notify_review_moderation();


-- ─── 5. RPCs ────────────────────────────────────────────────────────────────

-- Public product-page stats — computed server-side from approved reviews
-- only. Explicit `where status = 'approved'` (not left to RLS) so the result
-- is correct no matter which role/session calls it — an admin browsing the
-- storefront while signed in must not see pending/rejected rows leak into
-- the public average.
create or replace function public.get_product_review_stats(p_product_id uuid)
returns table (
  average_rating numeric,
  review_count int,
  pct_true_to_size numeric,
  pct_runs_small numeric,
  pct_runs_large numeric,
  pct_recommended numeric
)
language sql
stable
set search_path = public
as $$
  select
    round(avg(rating)::numeric, 1) as average_rating,
    count(*)::int as review_count,
    round(100.0 * count(*) filter (where size_fit = 'true_to_size') / nullif(count(*) filter (where size_fit is not null), 0), 0) as pct_true_to_size,
    round(100.0 * count(*) filter (where size_fit = 'runs_small') / nullif(count(*) filter (where size_fit is not null), 0), 0) as pct_runs_small,
    round(100.0 * count(*) filter (where size_fit = 'runs_large') / nullif(count(*) filter (where size_fit is not null), 0), 0) as pct_runs_large,
    round(100.0 * count(*) filter (where recommended = true) / nullif(count(*) filter (where recommended is not null), 0), 0) as pct_recommended
  from public.reviews
  where product_id = p_product_id and status = 'approved';
$$;

grant execute on function public.get_product_review_stats(uuid) to anon, authenticated;

-- Admin-only analytics surfaced on the existing admin Reviews page (no new
-- dashboard page).
create or replace function public.get_review_admin_stats()
returns table (
  average_rating numeric,
  review_count int,
  approval_rate numeric,
  most_reviewed_products jsonb,
  lowest_rated_products jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_approved int;
  v_rejected int;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select count(*) into v_approved from public.reviews where status = 'approved';
  select count(*) into v_rejected from public.reviews where status = 'rejected';

  return query
  select
    (select round(avg(rating)::numeric, 1) from public.reviews where status = 'approved'),
    (select count(*)::int from public.reviews),
    case when (v_approved + v_rejected) = 0 then null
         else round(100.0 * v_approved / (v_approved + v_rejected), 0) end,
    (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select product_id, product_name, count(*) as review_count
        from public.reviews
        where product_id is not null
        group by product_id, product_name
        order by count(*) desc
        limit 5
      ) t
    ),
    (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select product_id, product_name, round(avg(rating)::numeric, 1) as average_rating, count(*) as review_count
        from public.reviews
        where product_id is not null and status = 'approved'
        group by product_id, product_name
        having count(*) >= 3
        order by avg(rating) asc
        limit 5
      ) t
    );
end;
$$;

grant execute on function public.get_review_admin_stats() to authenticated;

-- Guest-safe "helpful" vote — security definer so it can bump a counter
-- without granting anon a general UPDATE policy on reviews; only touches
-- helpful_count, and only on an already-approved row.
create or replace function public.mark_review_helpful(p_review_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.reviews
  set helpful_count = helpful_count + 1
  where id = p_review_id and status = 'approved'
  returning helpful_count into v_count;

  if v_count is null then
    raise exception 'review not found or not approved';
  end if;

  return v_count;
end;
$$;

grant execute on function public.mark_review_helpful(uuid) to anon, authenticated;


-- ─── 6. Storage bucket for review photos ───────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reviews', 'reviews', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "public_read_reviews"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'reviews');

create policy "admin_insert_reviews"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reviews' and public.is_admin());
create policy "admin_update_reviews"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reviews' and public.is_admin())
  with check (bucket_id = 'reviews' and public.is_admin());
create policy "admin_delete_reviews"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reviews' and public.is_admin());
