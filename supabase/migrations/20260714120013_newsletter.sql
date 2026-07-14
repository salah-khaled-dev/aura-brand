-- ============================================================================
-- newsletter
-- ============================================================================

create table public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  is_subscribed boolean not null default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint newsletter_email_unique unique (email),
  constraint newsletter_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index newsletter_is_subscribed_idx on public.newsletter (is_subscribed);

alter table public.newsletter enable row level security;

-- Guests + authenticated: can subscribe (insert only). Unsubscribe/lookup by
-- email is handled through a signed link on a trusted server route, not RLS,
-- since anon has no identity to scope an update/select to.
create policy "newsletter_insert_public"
  on public.newsletter for insert
  to anon, authenticated
  with check (true);

-- Admins + super_admin: full read/write access.
create policy "newsletter_select_admin"
  on public.newsletter for select
  to authenticated
  using (public.is_admin());

create policy "newsletter_update_admin"
  on public.newsletter for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "newsletter_delete_admin"
  on public.newsletter for delete
  to authenticated
  using (public.is_admin());
