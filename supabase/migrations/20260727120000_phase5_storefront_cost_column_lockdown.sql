-- ============================================================================
-- Phase 5 — Pricing Engine security audit: storefront cost-column lockdown
--
-- Root cause: `grant select on table public.products to anon, authenticated`
-- (20260714120021_phase_a_grants.sql) grants SELECT on every column. RLS
-- ("products_select_public") only filters ROWS (is_active = true) — it does
-- not and cannot restrict which COLUMNS a row exposes. The app only hid
-- cost_price/costing/revisions after the fact, in JS
-- (storefront-product.service.ts's stripInternalCostFields), by which point
-- the data has already left Postgres and crossed the network to the browser
-- using the public anon key. Any unauthenticated caller could read
-- cost_price/costing/revisions (which nests historical costPrice/costing
-- snapshots) directly via the REST API, e.g.
--   GET /rest/v1/products?select=id,cost_price,costing,revisions
-- bypassing the app entirely.
--
-- Fix: revoke anon's whole-table SELECT and re-grant SELECT on an explicit
-- column list that excludes cost_price/costing/revisions. Postgres enforces
-- this at the column level regardless of how the row is queried (REST,
-- direct SQL, etc.) — the app-layer stripping stays in place as
-- defense-in-depth but is no longer the only line of defense.
--
-- `authenticated` keeps full-column SELECT unchanged: today it is used
-- exclusively by admin/staff sessions (the app has no customer-facing
-- sign-in flow yet — see profile/auth service). This is a known scope
-- boundary, not an oversight: the day customer accounts exist, this
-- migration's column list must be mirrored for `authenticated` too, or
-- customer sessions will inherit the same leak this migration closes for
-- `anon`.
-- ============================================================================

revoke select on table public.products from anon;

grant select (
  id, name_ar, name_en, slug, sku,
  description_ar, description_en, short_description_ar, short_description_en,
  category_id, price, sale_price, stock,
  is_featured, is_active, collection, collection_name,
  seo_title, seo_description, seo_keywords,
  barcode, low_stock_limit, material, weight, brand, tags,
  is_best_seller, is_new_arrival, status,
  publish_at, hide_at, archive_at,
  canonical_url, og_title, og_description,
  hover_image_url, badge, details, fabric, packaging,
  stats, default_variant_id,
  created_at, updated_at
) on table public.products to anon;
