-- ============================================================================
-- Phase B — explicit table grants for coupons / orders / order_items /
-- wishlist / cart_items / newsletter / notifications / contact_messages /
-- store_settings
--
-- Same root cause as 20260714120021_phase_a_grants.sql: none of these tables
-- ever received an explicit `GRANT ... ON TABLE` statement. RLS policies on
-- every one of them are correct (is_admin() / is_super_admin() / own-row
-- checks) — they just never mattered, because Postgres rejects the query at
-- the GRANT layer (42501 permission denied) before RLS is even evaluated.
-- `grant usage on schema public` was already covered by 20260714120021 and
-- is not repeated here.
--
-- Each grant below matches the table's actual policy shape exactly — a role
-- is only granted an operation here if a policy for that role/operation
-- exists. Table-level GRANT is necessary but not sufficient: RLS still
-- restricts which individual rows that operation can touch (e.g.
-- `authenticated` gets table-level DELETE on `orders` because
-- orders_delete_super_admin exists, but the policy itself still limits
-- actual deletes to super_admin rows via is_super_admin()).
-- Purely additive: does not revoke or alter any existing policy, trigger,
-- or grant.
-- ============================================================================

-- coupons — no anon policies at all (guest lookups go through the
-- validate_coupon/increment_coupon_usage SECURITY DEFINER RPCs, already
-- granted in 20260714120009/20260714120023); admin-only table access.
grant select, insert, update, delete on table public.coupons to authenticated;
grant all on table public.coupons to service_role;

-- orders — anon may only INSERT (guest checkout, orders_insert_guest);
-- guest reads go through get_guest_order()/create_guest_order(), not table
-- SELECT. authenticated covers self insert/select plus admin
-- select/insert/update and super_admin delete.
grant insert on table public.orders to anon;
grant select, insert, update, delete on table public.orders to authenticated;
grant all on table public.orders to service_role;

-- order_items — same shape as orders: anon may only INSERT
-- (order_items_insert_guest).
grant insert on table public.order_items to anon;
grant select, insert, update, delete on table public.order_items to authenticated;
grant all on table public.order_items to service_role;

-- wishlist — no anon policies ("no server-side wishlist"). No update
-- policy exists either (items are added/removed, never edited).
grant select, insert, delete on table public.wishlist to authenticated;
grant all on table public.wishlist to service_role;

-- cart_items — no anon policies ("no server-side cart"). Full CRUD for
-- authenticated (own rows) + admin read.
grant select, insert, update, delete on table public.cart_items to authenticated;
grant all on table public.cart_items to service_role;

-- newsletter — anon + authenticated may INSERT (public subscribe);
-- select/update/delete are admin-only.
grant insert on table public.newsletter to anon;
grant select, insert, update, delete on table public.newsletter to authenticated;
grant all on table public.newsletter to service_role;

-- notifications — no anon policies ("Guests: no access"). authenticated
-- covers own select/update/delete plus admin select/insert/update/delete.
grant select, insert, update, delete on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

-- contact_messages — anon + authenticated may INSERT (public contact
-- form); select/update/delete are admin-only.
grant insert on table public.contact_messages to anon;
grant select, insert, update, delete on table public.contact_messages to authenticated;
grant all on table public.contact_messages to service_role;

-- store_settings — anon + authenticated get public SELECT only (storefront
-- config). authenticated additionally gets INSERT (super_admin singleton
-- recreation) and UPDATE (admin edits). No DELETE policy exists anywhere
-- on this table, so none is granted.
grant select on table public.store_settings to anon, authenticated;
grant insert, update on table public.store_settings to authenticated;
grant all on table public.store_settings to service_role;
