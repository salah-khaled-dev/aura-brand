-- ============================================================================
-- Phase 1 DB audit repair.
--
-- The live database was found to be missing large parts of
-- 20260715000007_harden_guest_checkout_and_coupons.sql (no
-- supabase_migrations.schema_migrations tracking table exists, so migrations
-- were evidently applied ad hoc rather than via a full sequential replay —
-- some later, narrower migrations happened to re-touch a couple of the same
-- functions and those pieces did land, but the rest of 000007 never did).
-- This migration recreates exactly the missing/outdated pieces from the
-- latest source-of-truth migration files. No new logic is introduced beyond
-- what already exists in the repo's migration history.
--
-- Missing/outdated, restored here:
--   1. orders.coupon_usage_counted column (000007) — absent entirely.
--   2. validate_coupon() (000007) — live version predates per_user_limit,
--      which create_guest_order() (already up to date) reads unconditionally;
--      every coupon checkout was one query away from
--      "record has no field per_user_limit".
--   3. get_guest_order(text) 1-arg overload (000007 dropped it) — still live
--      and still EXECUTE-granted to anon: unauthenticated PII enumeration of
--      every guest order via sequential order numbers (verified unused by
--      the frontend, which only calls the 2-arg form).
--   4. prevent_order_forgery() + trigger (000007) — missing entirely. The
--      orders_insert_guest/order_items_insert_guest RLS policies only check
--      user_id IS NULL, not status/payment_status — without this trigger a
--      guest can direct-INSERT a 'delivered'/'paid' order at any price via
--      PostgREST, bypassing create_guest_order() completely.
--   5. increment_coupon_usage() (000007) — live version lacks the
--      coupon_usage_counted idempotency guard, allowing double-counting.
--   6. contact_messages/newsletter free-text length caps (000007) — absent.
--   7. log_order_activity() (000011, the later of two definitions) — live
--      still on the 000009 draft, missing severity-by-status and the
--      coupon-usage admin notification.
--   8. log_auth_event() (000011) — live still on the 000009 draft, missing
--      severity/sensitive flags on login/logout notifications.
-- ============================================================================

-- ─── 1. Idempotency marker for coupon usage counting ───────────────────────
alter table public.orders
  add column if not exists coupon_usage_counted boolean not null default false;

-- ─── 2. validate_coupon: expose per_user_limit ──────────────────────────────
-- Adding a column to a TABLE-returning function's OUT parameters is a row
-- type change that CREATE OR REPLACE rejects (42P13) — this is very likely
-- why 20260715000007 failed and rolled back in its entirety when first run,
-- leaving every symptom found in this audit. Explicit drop first this time.
drop function if exists public.validate_coupon(text, numeric);

create or replace function public.validate_coupon(p_code text, p_order_amount numeric)
returns table (
  id uuid,
  type public.coupon_type,
  value numeric,
  max_discount_amount numeric,
  per_user_limit integer
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.type, c.value, c.max_discount_amount, c.per_user_limit
  from public.coupons c
  where c.code = p_code
    and c.is_active = true
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at >= now())
    and (c.usage_limit is null or c.usage_count < c.usage_limit)
    and p_order_amount >= c.min_order_amount;
$$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- ─── 3. Drop the insecure single-arg get_guest_order overload ──────────────
drop function if exists public.get_guest_order(text);

-- ─── 4. Table-level guard: pending-only + maintenance freeze on ANY insert ──
create or replace function public.prevent_order_forgery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select maintenance_mode from public.store_settings where id = 1)
     and not public.is_admin()
     and auth.role() is distinct from 'service_role' then
    raise exception 'store is currently in maintenance mode' using errcode = 'P0001';
  end if;

  if (new.status is distinct from 'pending' or new.payment_status is distinct from 'pending')
     and not public.is_admin()
     and auth.role() is distinct from 'service_role' then
    raise exception 'New orders must start as pending/pending' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_order_forgery on public.orders;
create trigger prevent_order_forgery
  before insert on public.orders
  for each row execute function public.prevent_order_forgery();

-- ─── 5. increment_coupon_usage: re-validate + idempotent ───────────────────
drop function if exists public.increment_coupon_usage(text, uuid);

create or replace function public.increment_coupon_usage(p_code text, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_usage_count integer;
  v_usage_limit integer;
begin
  if not exists (
    select 1 from public.orders
    where id = p_order_id
      and user_id is null
      and coupon_code = p_code
      and coupon_usage_counted = false
  ) then
    return;
  end if;

  update public.coupons
  set usage_count = usage_count + 1
  where code = p_code
    and is_active = true
  returning id, usage_count, usage_limit into v_id, v_usage_count, v_usage_limit;

  if v_id is null then
    return; -- coupon no longer active — don't count against it
  end if;

  update public.orders set coupon_usage_counted = true where id = p_order_id;

  if v_usage_limit is not null and v_usage_count >= v_usage_limit then
    update public.coupons set status = 'disabled' where id = v_id;
  end if;
end;
$$;

grant execute on function public.increment_coupon_usage(text, uuid) to anon, authenticated;

-- ─── 6. contact_messages / newsletter: length caps on free-text columns ────
alter table public.contact_messages
  add constraint contact_messages_name_length check (char_length(name) <= 200),
  add constraint contact_messages_subject_length check (subject is null or char_length(subject) <= 300),
  add constraint contact_messages_message_length check (char_length(message) <= 5000);

alter table public.newsletter
  add constraint newsletter_email_length check (char_length(email) <= 320);

-- ─── 7. log_order_activity: severity-by-status + coupon-usage notification ─
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

-- ─── 8. log_auth_event: mark login/logout as sensitive ─────────────────────
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
