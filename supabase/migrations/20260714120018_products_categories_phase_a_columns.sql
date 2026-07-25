-- ============================================================================
-- products / categories — Phase A additive columns
--
-- Brings the existing `products` and `categories` tables up to parity with
-- the mock `Product`/`Category` models so the Phase A service cutover
-- (product.service.ts, category.service.ts) is a same-signature swap with no
-- data loss. Purely additive: existing columns, indexes, RLS policies, and
-- constraints from 20260714120003/20260714120004 are untouched.
--
-- Finance/analytics-flavored fields with no real relational design yet
-- (costing breakdown, cost price, stats, revision history) are stored as
-- JSONB passthrough rather than modeled as real columns/tables — that real
-- design is deferred to Phase D (business/finance schema). This keeps the
-- admin UI (cost calculator, stats widgets, revision history) fully
-- functional in the meantime.
-- ============================================================================

-- ─── products ────────────────────────────────────────────────────────────────

alter table public.products
  add column barcode text,
  add column low_stock_limit integer not null default 5,
  add column material text,
  add column weight numeric(10, 3),
  add column brand text not null default 'AURA',
  add column tags text[] not null default '{}',
  -- The mock model has two distinct "collection" concepts: `collection` (enum
  -- winter/summer/all_season, already existed — maps to the mock's `season`
  -- field) and a free-text sub-collection display name (e.g. "الكولكشن
  -- الأساسي", admin-editable via CollectionService's managed list). The
  -- latter has no existing column; add one rather than overloading the enum.
  add column collection_name text,
  add column is_best_seller boolean not null default false,
  add column is_new_arrival boolean not null default false,
  add column status text not null default 'published',
  add column publish_at timestamptz,
  add column hide_at timestamptz,
  add column archive_at timestamptz,
  add column canonical_url text,
  add column og_title text,
  add column og_description text,
  add column hover_image_url text,
  add column badge text,
  add column details text[] not null default '{}',
  add column fabric text,
  add column packaging text,
  -- JSONB passthrough — see header note. Shape mirrors the mock ProductCosting /
  -- ProductStats / ProductRevision[] interfaces; not enforced at the DB level.
  add column costing jsonb not null default '{}'::jsonb,
  add column cost_price numeric(10, 2),
  add column stats jsonb not null default '{}'::jsonb,
  add column revisions jsonb not null default '[]'::jsonb;

alter table public.products
  add constraint products_status_valid check (
    status in ('draft', 'preview', 'published', 'scheduled', 'hidden', 'archived', 'discontinued')
  ),
  add constraint products_low_stock_limit_non_negative check (low_stock_limit >= 0),
  add constraint products_cost_price_valid check (cost_price is null or cost_price >= 0);

create index products_status_idx on public.products (status);
create index products_is_best_seller_idx on public.products (is_best_seller);
create index products_is_new_arrival_idx on public.products (is_new_arrival);

-- Keep `is_active` (used by the existing public/admin RLS policies) in sync
-- with the richer `status` workflow, so 20260714120004's policies need no
-- changes: only 'published' products are readable by guests.
create or replace function public.sync_products_is_active()
returns trigger
language plpgsql
as $$
begin
  new.is_active = (new.status = 'published');
  return new;
end;
$$;

create trigger sync_products_is_active_trigger
  before insert or update of status on public.products
  for each row execute function public.sync_products_is_active();

-- ─── categories ──────────────────────────────────────────────────────────────

alter table public.categories
  add column banner_url text,
  add column is_featured boolean not null default false,
  add column show_on_homepage boolean not null default true,
  add column show_in_menu boolean not null default true,
  add column status text not null default 'active',
  add column deleted_at timestamptz;

alter table public.categories
  add constraint categories_status_valid check (status in ('active', 'draft', 'archived'));

create index categories_status_idx on public.categories (status);
create index categories_deleted_at_idx on public.categories (deleted_at);

-- Keep `is_active` in sync with the richer status/soft-delete model, so
-- 20260714120003's public-read policy (`is_active = true`) needs no changes.
create or replace function public.sync_categories_is_active()
returns trigger
language plpgsql
as $$
begin
  new.is_active = (new.status <> 'archived' and new.deleted_at is null);
  return new;
end;
$$;

create trigger sync_categories_is_active_trigger
  before insert or update of status, deleted_at on public.categories
  for each row execute function public.sync_categories_is_active();
