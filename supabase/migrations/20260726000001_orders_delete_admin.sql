-- ============================================================================
-- Relax order deletion from super_admin-only to any admin
--
-- orders_delete_super_admin (20260714120010) required is_super_admin(), but
-- the app's own roles matrix (PermissionContext/UsersService) already lets a
-- regular admin's role carry orders.delete = true, showing them a working
-- "حذف" button that Postgres then silently rejected (0 rows deleted). The
-- mismatch — not a deliberate security boundary — was surfaced as an
-- unhelpful generic error in the UI. Order deletion now follows the same
-- is_admin() shape already used for products_delete_admin (20260714120004)
-- and stock_movements_delete_admin (20260715000004).
-- ============================================================================

drop policy if exists "orders_delete_super_admin" on public.orders;

create policy "orders_delete_admin"
  on public.orders for delete
  to authenticated
  using (public.is_admin());
