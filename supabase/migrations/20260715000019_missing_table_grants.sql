-- ============================================================================
-- Missing table grants — same root cause as 20260714120021_phase_a_grants.sql
-- and 20260715000003_phase_b_grants.sql: every table added from
-- 20260715000009 (activity_log) onward got correct RLS policies but never an
-- explicit `GRANT ... ON TABLE`. Postgres rejects at the grant layer (42501
-- permission denied) before RLS is even evaluated, so every one of these
-- tables is unreachable from supabase-js today despite the policies being
-- right.
--
-- Each grant below matches the table's actual policy shape exactly — a role
-- is only granted an operation here if a policy for that role/operation
-- exists. Purely additive: does not revoke or alter any existing policy,
-- trigger, or grant.
-- ============================================================================

-- activity_log — read-only for admins (activity_log_select_admin); rows are
-- written exclusively by the SECURITY DEFINER log_*_activity() trigger
-- functions, which run as their owner and need no grant of their own.
grant select on table public.activity_log to authenticated;
grant all on table public.activity_log to service_role;

-- customers / customer_addresses / customer_notes — admin-only in every
-- direction, no anon or self-service customer session exists.
grant select, insert, update, delete on table public.customers to authenticated;
grant all on table public.customers to service_role;

grant select, insert, update, delete on table public.customer_addresses to authenticated;
grant all on table public.customer_addresses to service_role;

grant select, insert, update, delete on table public.customer_notes to authenticated;
grant all on table public.customer_notes to service_role;

-- brands / collections — admin-only catalog lookups, no storefront caller.
grant select, insert, update, delete on table public.brands to authenticated;
grant all on table public.brands to service_role;

grant select, insert, update, delete on table public.collections to authenticated;
grant all on table public.collections to service_role;

-- journal_articles — anon + authenticated get public SELECT of published
-- articles (journal_articles_select_public); full admin CRUD otherwise.
grant select on table public.journal_articles to anon, authenticated;
grant select, insert, update, delete on table public.journal_articles to authenticated;
grant all on table public.journal_articles to service_role;

-- Business tables — admin-only (`for all to authenticated`), no anon.
grant select, insert, update, delete on table public.suppliers to authenticated;
grant all on table public.suppliers to service_role;

grant select, insert, update, delete on table public.purchase_orders to authenticated;
grant all on table public.purchase_orders to service_role;

grant select, insert, update, delete on table public.expenses to authenticated;
grant all on table public.expenses to service_role;

grant select, insert, update, delete on table public.assets to authenticated;
grant all on table public.assets to service_role;

grant select, insert, update, delete on table public.liabilities to authenticated;
grant all on table public.liabilities to service_role;

grant select, insert, update, delete on table public.capital to authenticated;
grant all on table public.capital to service_role;

-- Website CMS tables — anon + authenticated get public SELECT (storefront
-- reads); full admin CRUD via the `_all_admin` policy on each.
grant select on table public.seo_settings to anon, authenticated;
grant select, insert, update, delete on table public.seo_settings to authenticated;
grant all on table public.seo_settings to service_role;

grant select on table public.website_store_info to anon, authenticated;
grant select, insert, update, delete on table public.website_store_info to authenticated;
grant all on table public.website_store_info to service_role;

grant select on table public.banners to anon, authenticated;
grant select, insert, update, delete on table public.banners to authenticated;
grant all on table public.banners to service_role;

grant select on table public.nav_menus to anon, authenticated;
grant select, insert, update, delete on table public.nav_menus to authenticated;
grant all on table public.nav_menus to service_role;

grant select on table public.footer_settings to anon, authenticated;
grant select, insert, update, delete on table public.footer_settings to authenticated;
grant all on table public.footer_settings to service_role;

grant select on table public.appearance_settings to anon, authenticated;
grant select, insert, update, delete on table public.appearance_settings to authenticated;
grant all on table public.appearance_settings to service_role;

grant select on table public.content_blocks to anon, authenticated;
grant select, insert, update, delete on table public.content_blocks to authenticated;
grant all on table public.content_blocks to service_role;

grant select on table public.homepage_sections to anon, authenticated;
grant select, insert, update, delete on table public.homepage_sections to authenticated;
grant all on table public.homepage_sections to service_role;

-- customer_notifications — anon + authenticated may SELECT any row (the
-- order_id itself is the capability, same trust model as get_guest_order);
-- authenticated additionally gets admin insert/update. No delete policy
-- exists on this table, so none is granted.
grant select on table public.customer_notifications to anon, authenticated;
grant select, insert, update on table public.customer_notifications to authenticated;
grant all on table public.customer_notifications to service_role;
