-- ============================================================================
-- profiles — one row per auth.users row, carries role + storefront profile data
-- ============================================================================

create type public.user_role as enum ('customer', 'admin', 'super_admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_phone_format check (phone is null or phone ~ '^\+?[0-9]{8,15}$')
);

create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (email);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper functions used by RLS policies across all tables.
-- SECURITY DEFINER + fixed search_path avoids RLS recursion and search-path hijacking.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin') and is_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

-- Prevent non-super-admins from granting themselves (or anyone) elevated roles.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super_admin can change profile roles';
  end if;
  return new;
end;
$$;

create trigger guard_profiles_role
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

alter table public.profiles enable row level security;

-- Guests: no access.

-- Authenticated users: can read and update their own profile.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins: can read every profile (customer support, order lookup, staff management).
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Super admin: full control, including creating staff profiles directly and deleting accounts.
create policy "profiles_insert_super_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_super_admin());

create policy "profiles_delete_super_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_super_admin());
