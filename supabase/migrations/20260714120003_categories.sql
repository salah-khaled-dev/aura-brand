-- ============================================================================
-- categories
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  slug text not null,
  description_ar text,
  description_en text,
  image_url text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_slug_unique unique (slug),
  constraint categories_not_self_parent check (id <> parent_id)
);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_idx on public.categories (is_active);
create index categories_sort_order_idx on public.categories (sort_order);

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

-- Guests + authenticated: can read active categories only.
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

-- Admins + super_admin: full read (including inactive) and write access.
create policy "categories_select_admin"
  on public.categories for select
  to authenticated
  using (public.is_admin());

create policy "categories_insert_admin"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "categories_update_admin"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin"
  on public.categories for delete
  to authenticated
  using (public.is_admin());
