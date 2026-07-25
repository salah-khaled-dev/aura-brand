-- ============================================================================
-- collections — catalog collections (manual or rule-based), replaces
-- src/lib/services/collection.service.ts's mockStorage store.
--
-- Distinct from the Website→Collections *display* settings
-- (storefront/collection-display.service.ts, still mock — migrated
-- separately as part of the Website CMS pass) — this table is the actual
-- collection catalog (name/rules/membership); that other one only controls
-- how existing collections are ordered/featured on the storefront.
-- ============================================================================

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  type text not null default 'manual',
  image text,
  match_type text not null default 'all',
  rules jsonb not null default '[]'::jsonb,
  product_ids uuid[] not null default '{}',
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint collections_slug_unique unique (slug),
  constraint collections_type_valid check (type in ('manual', 'automatic')),
  constraint collections_match_type_valid check (match_type in ('all', 'any')),
  constraint collections_status_valid check (status in ('active', 'draft', 'archived'))
);

create index collections_status_idx on public.collections (status);
create index collections_deleted_at_idx on public.collections (deleted_at);

create trigger set_collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.collections enable row level security;

-- Admin-only — same as brands, no storefront caller reads this table
-- directly today (the storefront reads collection *display* settings, a
-- separate table migrated with the rest of Website CMS).
create policy "collections_select_admin"
  on public.collections for select
  to authenticated
  using (public.is_admin());

create policy "collections_insert_admin"
  on public.collections for insert
  to authenticated
  with check (public.is_admin());

create policy "collections_update_admin"
  on public.collections for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "collections_delete_admin"
  on public.collections for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists log_activity on public.collections;
create trigger log_activity
  after insert or update or delete on public.collections
  for each row execute function public.log_entity_activity('تشكيلة', 'system');
