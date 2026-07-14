-- ============================================================================
-- notifications
-- ============================================================================

create type public.notification_type as enum ('order', 'account', 'promotion', 'stock', 'system');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  -- Null user_id + for_admins = true means a broadcast notification for staff
  -- (e.g. "low stock", "new order"), visible to every admin/super_admin.
  user_id uuid references public.profiles(id) on delete cascade,
  for_admins boolean not null default false,

  type public.notification_type not null default 'system',
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),

  constraint notifications_audience_valid check (
    (for_admins = true and user_id is null) or (for_admins = false and user_id is not null)
  )
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_for_admins_idx on public.notifications (for_admins);
create index notifications_is_read_idx on public.notifications (is_read);
create index notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;

-- Guests: no access.

-- Authenticated users: can read/update/delete their own personal notifications.
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- Admins + super_admin: full read/write access, including admin broadcasts.
create policy "notifications_select_admin"
  on public.notifications for select
  to authenticated
  using (public.is_admin());

create policy "notifications_insert_admin"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

create policy "notifications_update_admin"
  on public.notifications for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "notifications_delete_admin"
  on public.notifications for delete
  to authenticated
  using (public.is_admin());
