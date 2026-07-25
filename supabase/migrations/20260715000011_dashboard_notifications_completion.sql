-- ============================================================================
-- Dashboard + notification system completion
--
-- Builds on 20260715000009 (which added activity_log + wired notifications
-- for products/coupons/orders + login/logout). This migration:
--
--   1. notifications: adds `severity` (info/warning/critical) and `sensitive`
--      (true = super_admin-only) columns, tightens the admin SELECT policy.
--      Visibility model: operational broadcasts (orders, stock, coupons,
--      reviews, customer registration) stay visible to every admin — hiding
--      "new order" from a regular admin would break their job. Administrative
--      events (login/logout, staff created/deleted, permission changes,
--      store-settings changes) are marked sensitive=true, super_admin-only.
--   2. reviews: new table (none existed) — product reviews, guest-submittable
--      (pending only), admin-moderated. Wired into the same notification
--      trigger pattern.
--   3. products: replaces the generic trigger with log_product_activity(),
--      which distinguishes price changes / stock changes / stock hitting
--      zero into three separate, correctly-severity'd notifications instead
--      of one generic "updated" message.
--   4. orders: extends log_order_activity() with a coupon-usage notification
--      and a severity mapping by status.
--   5. profiles: new log_profile_activity() trigger, staff-only (role in
--      admin/super_admin) — create/edit/delete of an admin account, and
--      role/staff_role_key changes as a distinct "permission change" event.
--      Real customer accounts are NOT profiles rows (no customer-auth flow
--      exists) — they're rows in `public.customers` (see 20260715000010),
--      which already got its own log_entity_activity('عميل','customer')
--      trigger; this migration's CREATE OR REPLACE of log_entity_activity()
--      below upgrades that existing trigger with severity/sensitive support
--      automatically, no separate customer-notification code needed here.
--   6. roles, store_settings: attached to the (now sensitivity-aware) generic
--      log_entity_activity() trigger, marked sensitive.
--   7. Two read-only RPCs for the dashboard: get_revenue_summary,
--      get_revenue_series. (A "latest customers" RPC is unnecessary —
--      public.customers already exists and CustomerService.getCustomers()
--      already returns it real and sorted by created_at desc.)
-- ============================================================================


-- ─── 1. notifications: severity + sensitive ─────────────────────────────────

alter table public.notifications
  add column if not exists severity text not null default 'info',
  add column if not exists sensitive boolean not null default false;

alter table public.notifications drop constraint if exists notifications_severity_valid;
alter table public.notifications
  add constraint notifications_severity_valid check (severity in ('info', 'warning', 'critical'));

drop policy if exists "notifications_select_admin" on public.notifications;
create policy "notifications_select_admin"
  on public.notifications for select
  to authenticated
  using (public.is_admin() and (sensitive = false or public.is_super_admin()));


-- ─── 2. log_entity_activity(): sensitivity-aware (3rd trigger arg) ─────────

create or replace function public.log_entity_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_action text;
  v_entity_id text;
  v_before jsonb;
  v_after jsonb;
  v_label text := coalesce(tg_argv[0], tg_table_name);
  v_notif_type text := coalesce(tg_argv[1], 'system');
  v_sensitive boolean := coalesce(tg_argv[2], 'false')::boolean;
  v_title text;
  v_message text;
begin
  select email into v_actor_email from public.profiles where id = v_actor_id;

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_entity_id := (to_jsonb(new)->>'id');
    v_after := to_jsonb(new);
    v_title := v_label || ' — إضافة جديدة';
  elsif tg_op = 'UPDATE' then
    v_action := 'updated';
    v_entity_id := (to_jsonb(new)->>'id');
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_title := v_label || ' — تعديل';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
    v_entity_id := (to_jsonb(old)->>'id');
    v_before := to_jsonb(old);
    v_title := v_label || ' — حذف';
  end if;

  insert into public.activity_log (
    actor_id, actor_email, action, entity_type, entity_id, before_data, after_data
  )
  values (
    v_actor_id, v_actor_email, v_action, tg_table_name, v_entity_id, v_before, v_after
  );

  v_message := coalesce(v_actor_email, 'مستخدم غير معروف') || ' قام بعملية ' ||
    case v_action when 'created' then 'إنشاء' when 'updated' then 'تعديل' else 'حذف' end ||
    ' على ' || v_label;

  insert into public.notifications (
    for_admins, type, severity, sensitive, title, message, actor_id, actor_email, action, entity_type, entity_id
  )
  values (
    true, v_notif_type, 'info', v_sensitive, v_title, v_message, v_actor_id, v_actor_email, v_action, tg_table_name, v_entity_id
  );

  return coalesce(new, old);
end;
$$;


-- ─── 3. reviews (new table — none existed) ─────────────────────────────────

create table public.reviews (
  id uuid primary key default gen_random_uuid(),

  -- Nullable: the storefront review form (src/app/reviews/page.tsx) collects
  -- a free-text product name, not a real product_id — keep that usable.
  product_id uuid references public.products(id) on delete set null,
  product_name text not null default '',
  product_image text,

  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null default '',
  customer_avatar text,

  rating integer not null,
  title text not null default '',
  content text not null,
  status text not null default 'pending',
  is_featured boolean not null default false,
  is_pinned boolean not null default false,
  verified_purchase boolean not null default false,
  admin_reply text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_rating_range check (rating >= 1 and rating <= 5),
  constraint reviews_status_valid check (status in ('pending', 'approved', 'rejected', 'hidden'))
);

create index reviews_product_id_idx on public.reviews (product_id);
create index reviews_status_idx on public.reviews (status);
create index reviews_created_at_idx on public.reviews (created_at desc);

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

-- Guests + authenticated: can read approved reviews (storefront testimonials/product page).
create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated
  using (status = 'approved');

-- Guests + authenticated: can submit a review, but every trust-bearing column
-- is pinned to its safe default — no self-approval, no self-featuring/pinning,
-- no self-claiming verified_purchase, no pre-filled admin_reply, and no
-- claiming an arbitrary customer_id (a guest has no session to prove one).
-- Only an admin (reviews_insert_admin below) can set any of these directly.
create policy "reviews_insert_public"
  on public.reviews for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and is_featured = false
    and is_pinned = false
    and verified_purchase = false
    and admin_reply is null
    and customer_id is null
  );

-- Admins: full read/write, and can insert with any status directly.
create policy "reviews_select_admin"
  on public.reviews for select
  to authenticated
  using (public.is_admin());

create policy "reviews_insert_admin"
  on public.reviews for insert
  to authenticated
  with check (public.is_admin());

create policy "reviews_update_admin"
  on public.reviews for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "reviews_delete_admin"
  on public.reviews for delete
  to authenticated
  using (public.is_admin());

-- `anon` gets column-level SELECT only, omitting customer_email/customer_id —
-- reviews_select_public exposes approved rows to anyone unauthenticated, and
-- the row otherwise carries a reviewer's email (PII) with no business being
-- world-readable. `authenticated` keeps full-table grant: in this app every
-- authenticated session IS an admin by construction (auth.service.ts signs
-- out and rejects any profile whose role isn't admin/super_admin — there is
-- no customer-auth flow), so admins legitimately need customer_email for
-- support/CRM. Revisit this the day a real customer-auth flow ships, since
-- that would put non-admin sessions under `authenticated` too.
grant select (
  id, product_id, product_name, product_image,
  customer_name, customer_avatar,
  rating, title, content, status,
  is_featured, is_pinned, verified_purchase, admin_reply,
  created_at, updated_at
), insert on table public.reviews to anon;
grant select, insert, update, delete on table public.reviews to authenticated;
grant all on table public.reviews to service_role;

create trigger log_activity
  after insert or update or delete on public.reviews
  for each row execute function public.log_entity_activity('تقييم', 'review');


-- ─── 4. products: richer trigger (price / stock / out-of-stock) ───────────

create or replace function public.log_product_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_action text;
  v_price_changed boolean;
  v_stock_changed boolean;
  v_went_out_of_stock boolean;
begin
  select email into v_actor_email from public.profiles where id = v_actor_id;

  if tg_op = 'INSERT' then
    insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
    values (v_actor_id, v_actor_email, 'created', 'products', new.id::text, to_jsonb(new));

    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'system', 'info', 'منتج جديد',
      coalesce(v_actor_email, 'مستخدم غير معروف') || ' أضاف منتج جديد: ' || new.name_ar,
      v_actor_id, v_actor_email, 'created', 'products', new.id::text
    );
    return new;

  elsif tg_op = 'DELETE' then
    insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, before_data)
    values (v_actor_id, v_actor_email, 'deleted', 'products', old.id::text, to_jsonb(old));

    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'system', 'info', 'حذف منتج',
      coalesce(v_actor_email, 'مستخدم غير معروف') || ' حذف المنتج: ' || old.name_ar,
      v_actor_id, v_actor_email, 'deleted', 'products', old.id::text
    );
    return old;
  end if;

  -- UPDATE
  v_price_changed := (new.price is distinct from old.price) or (new.sale_price is distinct from old.sale_price);
  v_stock_changed := new.stock is distinct from old.stock;
  v_went_out_of_stock := old.stock > 0 and new.stock <= 0;

  insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  values (v_actor_id, v_actor_email, 'updated', 'products', new.id::text, to_jsonb(old), to_jsonb(new));

  if v_price_changed then
    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'system', 'warning', 'تعديل السعر',
      coalesce(v_actor_email, 'مستخدم غير معروف') || ' غيّر سعر المنتج: ' || new.name_ar,
      v_actor_id, v_actor_email, 'updated', 'products', new.id::text
    );
  end if;

  if v_stock_changed then
    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'stock', 'info', 'تعديل المخزون',
      coalesce(v_actor_email, 'مستخدم غير معروف') || ' غيّر مخزون المنتج: ' || new.name_ar || ' (' || old.stock || ' ← ' || new.stock || ')',
      v_actor_id, v_actor_email, 'updated', 'products', new.id::text
    );
  end if;

  if v_went_out_of_stock then
    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'stock', 'critical', 'نفاد المخزون',
      'المنتج "' || new.name_ar || '" نفد من المخزون بالكامل',
      v_actor_id, v_actor_email, 'updated', 'products', new.id::text
    );
  end if;

  if not v_price_changed and not v_stock_changed then
    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'system', 'info', 'تعديل منتج',
      coalesce(v_actor_email, 'مستخدم غير معروف') || ' عدّل بيانات المنتج: ' || new.name_ar,
      v_actor_id, v_actor_email, 'updated', 'products', new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists log_activity on public.products;
drop trigger if exists log_product_activity on public.products;
create trigger log_product_activity
  after insert or update or delete on public.products
  for each row execute function public.log_product_activity();


-- ─── 5. orders: coupon-usage notification + severity by status ────────────

create or replace function public.log_order_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_action text;
  v_title text;
  v_message text;
  v_severity text := 'info';
begin
  select email into v_actor_email from public.profiles where id = v_actor_id;

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_title := 'طلب جديد';
    v_message := 'تم استلام طلب جديد رقم ' || new.order_number;
  elsif tg_op = 'UPDATE' then
    v_action := 'updated';
    if new.status is distinct from old.status then
      v_title := 'تغيير حالة الطلب ' || new.order_number;
      v_message := 'تم تغيير حالة الطلب ' || new.order_number || ' من ' || old.status || ' إلى ' || new.status;
      v_severity := case new.status when 'cancelled' then 'warning' else 'info' end;
    else
      v_title := 'تعديل الطلب ' || new.order_number;
      v_message := coalesce(v_actor_email, 'مستخدم غير معروف') || ' قام بتعديل الطلب ' || new.order_number;
    end if;
  end if;

  insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  values (v_actor_id, v_actor_email, v_action, 'orders', new.id::text, to_jsonb(old), to_jsonb(new));

  insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
  values (true, 'order', v_severity, v_title, v_message, v_actor_id, v_actor_email, v_action, 'orders', new.id::text);

  if tg_op = 'INSERT' and new.coupon_id is not null then
    insert into public.notifications (for_admins, type, severity, title, message, actor_id, actor_email, action, entity_type, entity_id)
    values (
      true, 'promotion', 'info', 'استخدام كوبون',
      'تم استخدام الكوبون "' || coalesce(new.coupon_code, '') || '" في الطلب رقم ' || new.order_number,
      v_actor_id, v_actor_email, 'created', 'coupons', new.coupon_id::text
    );
  end if;

  return new;
end;
$$;


-- ─── 6. profiles: staff account events + permission changes ───────────────
-- Staff-only (role in admin/super_admin). Real customer accounts live in
-- public.customers now (20260715000010), not profiles — a 'customer'-role
-- profiles row only exists if the (currently unused) Supabase Auth signup
-- path is ever reached, and that's not a meaningful "customer account" event
-- to broadcast on its own, so it's intentionally skipped here.

create or replace function public.log_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_row record;
  v_action text;
  v_role_changed boolean := false;
  v_title text;
  v_message text;
begin
  v_row := coalesce(new, old);
  if v_row.role not in ('admin', 'super_admin') then
    return coalesce(new, old);
  end if;

  select email into v_actor_email from public.profiles where id = v_actor_id;

  if tg_op = 'INSERT' then
    v_action := 'created';
    v_title := 'إضافة عضو فريق جديد';
    v_message := coalesce(new.full_name, new.email) || ' — تم إنشاء حساب إداري';

    insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
    values (v_actor_id, v_actor_email, v_action, 'profiles', new.id::text, to_jsonb(new));

  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
    v_title := 'حذف عضو فريق';
    v_message := coalesce(old.full_name, old.email) || ' — تم حذف الحساب الإداري';

    insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, before_data)
    values (v_actor_id, v_actor_email, v_action, 'profiles', old.id::text, to_jsonb(old));

  else -- UPDATE
    v_action := 'updated';
    v_role_changed := (new.role is distinct from old.role) or (new.staff_role_key is distinct from old.staff_role_key);
    if v_role_changed then
      v_title := 'تغيير صلاحيات';
      v_message := coalesce(v_actor_email, 'مستخدم غير معروف') || ' غيّر صلاحيات ' || coalesce(new.full_name, new.email);
    else
      v_title := 'تعديل بيانات عضو فريق';
      v_message := coalesce(v_actor_email, 'مستخدم غير معروف') || ' عدّل بيانات ' || coalesce(new.full_name, new.email);
    end if;

    insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
    values (v_actor_id, v_actor_email, v_action, 'profiles', new.id::text, to_jsonb(old), to_jsonb(new));
  end if;

  insert into public.notifications (for_admins, type, severity, sensitive, title, message, actor_id, actor_email, action, entity_type, entity_id)
  values (true, 'system', 'info', true, v_title, v_message, v_actor_id, v_actor_email, v_action, 'profiles', v_row.id::text);

  return coalesce(new, old);
end;
$$;

drop trigger if exists log_profile_activity on public.profiles;
create trigger log_profile_activity
  after insert or update or delete on public.profiles
  for each row execute function public.log_profile_activity();


-- ─── 7. roles + store_settings: sensitive, admin-only notifications ───────

drop trigger if exists log_activity on public.roles;
create trigger log_activity
  after insert or update or delete on public.roles
  for each row execute function public.log_entity_activity('صلاحيات', 'system', 'true');

drop trigger if exists log_activity on public.store_settings;
create trigger log_activity
  after insert or update or delete on public.store_settings
  for each row execute function public.log_entity_activity('إعدادات المتجر', 'system', 'true');


-- ─── 8. log_auth_event(): mark login/logout as sensitive ──────────────────

create or replace function public.log_auth_event(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text;
begin
  if p_action not in ('login', 'logout') then
    raise exception 'invalid auth event action';
  end if;

  if v_actor_id is null then
    return;
  end if;

  select email into v_actor_email from public.profiles where id = v_actor_id;

  insert into public.activity_log (actor_id, actor_email, action, entity_type)
  values (v_actor_id, v_actor_email, p_action, 'auth');

  insert into public.notifications (for_admins, type, severity, sensitive, title, message, actor_id, actor_email, action, entity_type)
  values (
    true, 'system', 'info', true,
    case p_action when 'login' then 'تسجيل دخول' else 'تسجيل خروج' end,
    coalesce(v_actor_email, 'مستخدم') || ' ' || (case p_action when 'login' then 'قام بتسجيل الدخول' else 'قام بتسجيل الخروج' end),
    v_actor_id, v_actor_email, p_action, 'auth'
  );
end;
$$;


-- ─── 9. Dashboard RPCs ──────────────────────────────────────────────────────
-- (Latest customers needs no RPC here — public.customers already exists,
-- see 20260715000010, and CustomerService.getCustomers() already returns it
-- real and sorted by created_at desc.)

create or replace function public.get_revenue_summary()
returns table (today numeric, this_week numeric, this_month numeric)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    coalesce(sum(total) filter (where created_at >= date_trunc('day', now())), 0) as today,
    coalesce(sum(total) filter (where created_at >= date_trunc('week', now())), 0) as this_week,
    coalesce(sum(total) filter (where created_at >= date_trunc('month', now())), 0) as this_month
  from public.orders
  where status = 'delivered';
end;
$$;

create or replace function public.get_revenue_series(p_period text default 'month')
returns table (name text, revenue numeric, orders int)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_start timestamptz;
  v_trunc text;
  v_fmt text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_period = 'week' then
    v_start := date_trunc('day', now()) - interval '6 days';
    v_trunc := 'day'; v_fmt := 'DD/MM';
  elsif p_period = 'year' then
    v_start := date_trunc('month', now()) - interval '11 months';
    v_trunc := 'month'; v_fmt := 'MM/YYYY';
  else
    v_start := date_trunc('day', now()) - interval '29 days';
    v_trunc := 'day'; v_fmt := 'DD/MM';
  end if;

  return query
  select
    to_char(date_trunc(v_trunc, o.created_at), v_fmt) as name,
    coalesce(sum(o.total), 0) as revenue,
    count(*)::int as orders
  from public.orders o
  where o.status = 'delivered' and o.created_at >= v_start
  group by date_trunc(v_trunc, o.created_at)
  order by date_trunc(v_trunc, o.created_at);
end;
$$;

grant execute on function public.get_revenue_summary() to authenticated;
grant execute on function public.get_revenue_series(text) to authenticated;
