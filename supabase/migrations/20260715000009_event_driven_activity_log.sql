-- ============================================================================
-- Event-driven activity log + admin notification feed
--
-- Two things, wired together:
--
--   1. activity_log — full before/after audit trail. One row per
--      insert/update/delete on any tracked table, or per non-table event
--      (login/logout) via log_auth_event() below.
--   2. notifications (already existed since 20260714120014 but was never
--      wired up — the admin feed read mockStorage/localStorage instead).
--      Extended with actor/action/entity columns and now populated
--      automatically by the same trigger that writes activity_log, so every
--      tracked mutation produces both a full audit record AND a
--      human-readable admin notification in one transaction.
--
-- log_entity_activity() is a single generic AFTER trigger function meant to
-- be attached to every admin-managed table (products, orders, coupons now;
-- customers/reviews/brands/collections/journal/business/website-CMS tables
-- as each is migrated in its own pass — attach it there at creation time,
-- don't wait to retrofit). It takes two trigger arguments: a human-readable
-- Arabic label for the entity (used in the notification title/message) and
-- a notifications.type value to file it under.
--
-- Known, deliberate limitation: activity_log.user_agent/ip_address stay
-- null for every trigger-driven row. Postgres triggers have no visibility
-- into the HTTP request — this app's admin CRUD calls Supabase directly from
-- the browser (anon/authenticated client), so there is no server hop to
-- observe those headers from. The only place they're captured for real is
-- inside log_auth_event() below (login/logout — logged via a client-side
-- RPC call, which is at least a request the caller controls) and the two
-- existing Next.js API routes (src/app/api/admin/staff/*), which run
-- server-side and DO see real request headers, threaded through explicitly.
-- Faking these columns for browser-direct table writes would be worse than
-- leaving them null.
-- ============================================================================

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now(),

  constraint activity_log_action_valid check (action in ('created', 'updated', 'deleted', 'login', 'logout'))
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index activity_log_actor_id_idx on public.activity_log (actor_id);

alter table public.activity_log enable row level security;

create policy "activity_log_select_admin"
  on public.activity_log for select
  to authenticated
  using (public.is_admin());

-- No insert/update/delete policy for anon/authenticated at all — every write
-- happens through log_entity_activity()/log_auth_event(), both
-- SECURITY DEFINER, so RLS never needs to authorize a direct client write.

-- ─── notifications: add actor/action/entity columns ─────────────────────────
alter table public.notifications
  add column actor_id uuid references public.profiles(id) on delete set null,
  add column actor_email text,
  add column action text,
  add column entity_type text,
  add column entity_id text,
  add column metadata jsonb not null default '{}'::jsonb;

-- ─── generic trigger: one audit row + one admin notification per mutation ──
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
    for_admins, type, title, message, actor_id, actor_email, action, entity_type, entity_id
  )
  values (
    true, v_notif_type, v_title, v_message, v_actor_id, v_actor_email, v_action, tg_table_name, v_entity_id
  );

  return coalesce(new, old);
end;
$$;

-- ─── attach to the tables that already exist and already have real CRUD ────
drop trigger if exists log_activity on public.products;
create trigger log_activity
  after insert or update or delete on public.products
  for each row execute function public.log_entity_activity('منتج', 'system');

drop trigger if exists log_activity on public.coupons;
create trigger log_activity
  after insert or update or delete on public.coupons
  for each row execute function public.log_entity_activity('كوبون', 'system');

-- Orders get a slightly richer message on status changes specifically (the
-- single most important thing an admin wants notified about), on top of the
-- generic audit trail every other table gets.
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
    else
      v_title := 'تعديل الطلب ' || new.order_number;
      v_message := coalesce(v_actor_email, 'مستخدم غير معروف') || ' قام بتعديل الطلب ' || new.order_number;
    end if;
  end if;

  insert into public.activity_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  values (v_actor_id, v_actor_email, v_action, 'orders', new.id::text, to_jsonb(old), to_jsonb(new));

  insert into public.notifications (for_admins, type, title, message, actor_id, actor_email, action, entity_type, entity_id)
  values (true, 'order', v_title, v_message, v_actor_id, v_actor_email, v_action, 'orders', new.id::text);

  return new;
end;
$$;

drop trigger if exists log_order_activity on public.orders;
create trigger log_order_activity
  after insert or update on public.orders
  for each row execute function public.log_order_activity();

-- ─── login/logout: no table row exists for these, so a client-called RPC ───
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
    return; -- nothing to attribute a logout-after-session-expiry to
  end if;

  select email into v_actor_email from public.profiles where id = v_actor_id;

  insert into public.activity_log (actor_id, actor_email, action, entity_type)
  values (v_actor_id, v_actor_email, p_action, 'auth');

  insert into public.notifications (for_admins, type, title, message, actor_id, actor_email, action, entity_type)
  values (
    true, 'system',
    case p_action when 'login' then 'تسجيل دخول' else 'تسجيل خروج' end,
    coalesce(v_actor_email, 'مستخدم') || ' ' || (case p_action when 'login' then 'قام بتسجيل الدخول' else 'قام بتسجيل الخروج' end),
    v_actor_id, v_actor_email, p_action, 'auth'
  );
end;
$$;

grant execute on function public.log_auth_event(text) to authenticated;
