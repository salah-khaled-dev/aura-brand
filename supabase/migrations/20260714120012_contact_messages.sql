-- ============================================================================
-- contact_messages
-- ============================================================================

create type public.contact_message_status as enum ('new', 'read', 'replied', 'archived');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status public.contact_message_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contact_messages_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index contact_messages_status_idx on public.contact_messages (status);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);

create trigger set_contact_messages_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;

-- Guests + authenticated: can submit a contact message, nothing else.
create policy "contact_messages_insert_public"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Admins + super_admin: full read/write access (triage, reply tracking).
create policy "contact_messages_select_admin"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin());

create policy "contact_messages_update_admin"
  on public.contact_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "contact_messages_delete_admin"
  on public.contact_messages for delete
  to authenticated
  using (public.is_admin());
