-- ============================================================================
-- Phase A — explicit table grants for products / product_images /
-- product_variants / categories / media
--
-- Root cause of "permission denied for table X": across the entire schema
-- (all 17 original migrations + the 3 Phase A migrations), there was not a
-- single explicit `GRANT ... ON TABLE` statement anywhere — table access was
-- relying entirely on the Supabase project's bootstrap-time
-- `ALTER DEFAULT PRIVILEGES`, which only auto-applies to new objects created
-- by the exact role/session that default-privileges statement targeted.
-- RLS policies (is_admin(), public-read, etc.) were always correct — they
-- just never mattered, because Postgres rejects the query at the GRANT layer
-- (42501 permission denied) before RLS is even evaluated.
--
-- This migration makes the grants explicit and idempotent for every Phase A
-- table, matching each table's actual RLS policy shape:
--   - products / product_images / product_variants / categories have BOTH a
--     public-read policy (anon + authenticated) and admin write policies
--     (authenticated + is_admin()) -> anon gets SELECT only, authenticated
--     gets full CRUD (RLS still enforces is_admin() for writes).
--   - media is admin-only (no anon policy at all, by design — see
--     20260714120019) -> anon gets nothing, authenticated gets full CRUD.
--   - service_role gets ALL on every table (used by scripts/migrate-catalog.mjs
--     and any other trusted server-side/service-role code).
-- Purely additive: does not revoke or alter any existing policy or grant.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- products
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;
grant all on table public.products to service_role;

-- product_images
grant select on table public.product_images to anon, authenticated;
grant insert, update, delete on table public.product_images to authenticated;
grant all on table public.product_images to service_role;

-- product_variants
grant select on table public.product_variants to anon, authenticated;
grant insert, update, delete on table public.product_variants to authenticated;
grant all on table public.product_variants to service_role;

-- categories
grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;
grant all on table public.categories to service_role;

-- media (admin-only — no anon grant, matching the absence of any anon RLS policy)
grant select, insert, update, delete on table public.media to authenticated;
grant all on table public.media to service_role;
