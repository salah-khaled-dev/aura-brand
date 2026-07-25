-- ============================================================================
-- brands — replaces src/lib/services/brand.service.ts's mockStorage store.
--
-- products.brand is a plain text column (no FK) — this table is the admin
-- catalog/lookup list the product form's brand picker reads from, same
-- relationship shape as today (matched by name, not a foreign key), so no
-- change to the products table is needed here.
-- ============================================================================

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo text,
  description text not null default '',
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint brands_slug_unique unique (slug),
  constraint brands_status_valid check (status in ('active', 'draft', 'archived'))
);

create index brands_status_idx on public.brands (status);
create index brands_deleted_at_idx on public.brands (deleted_at);

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

alter table public.brands enable row level security;

-- Admin-only in every direction — BrandService has no storefront callers today
-- (only the admin brand picker + admin/brands CRUD page), so there's no
-- reason to grant anon/authenticated public read access.
create policy "brands_select_admin"
  on public.brands for select
  to authenticated
  using (public.is_admin());

create policy "brands_insert_admin"
  on public.brands for insert
  to authenticated
  with check (public.is_admin());

create policy "brands_update_admin"
  on public.brands for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "brands_delete_admin"
  on public.brands for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists log_activity on public.brands;
create trigger log_activity
  after insert or update or delete on public.brands
  for each row execute function public.log_entity_activity('علامة تجارية', 'system');
