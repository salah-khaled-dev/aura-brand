-- ============================================================================
-- Two smaller mock/localStorage surfaces missed in the first migration pass
-- (found on the follow-up repo-wide sweep):
--
--   1. customer_notifications — storefront/tracking-page order-status feed
--      (src/lib/services/customer-notification.service.ts). Distinct from
--      public.notifications (the internal admin feed) — this is customer-
--      facing and keyed by order, not by a user_id (no customer-auth exists).
--   2. profiles — extended with bio/preferences for the admin's own Profile
--      page (src/lib/services/profile.service.ts), which was storing these
--      in a second, separate mockStorage blob instead of the real profiles
--      row that already exists for every admin/staff account.
-- ============================================================================

create table public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_number text not null,
  status text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index customer_notifications_order_id_idx on public.customer_notifications (order_id);
create index customer_notifications_created_at_idx on public.customer_notifications (created_at desc);

alter table public.customer_notifications enable row level security;

-- Same trust model as get_guest_order/broadcast_order_change elsewhere in this
-- app: order_id (a random uuid) is the capability — knowing it is what proves
-- the request belongs to that order's own customer. Low-sensitivity content
-- (status text + a canned/admin-authored message), consistent with the rest
-- of this app's guest-order design.
create policy "customer_notifications_select_public"
  on public.customer_notifications for select
  to anon, authenticated
  using (true);

create policy "customer_notifications_select_admin"
  on public.customer_notifications for select
  to authenticated
  using (public.is_admin());

create policy "customer_notifications_insert_admin"
  on public.customer_notifications for insert
  to authenticated
  with check (public.is_admin());

create policy "customer_notifications_update_admin"
  on public.customer_notifications for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── profiles: bio + preferences for the admin's own Profile page ──────────
alter table public.profiles
  add column bio text not null default '',
  add column preferences jsonb not null default '{"language":"ar","theme":"system","emailNotifications":true,"pushNotifications":false}'::jsonb;
