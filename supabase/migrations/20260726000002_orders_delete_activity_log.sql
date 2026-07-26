-- ============================================================================
-- Order deletion wrote no audit trail at all
--
-- log_order_activity() (20260715000009_event_driven_activity_log.sql) is only
-- attached `after insert or update on public.orders` — unlike products and
-- coupons, which get the generic log_activity trigger `after insert or
-- update or delete`, orders never had DELETE coverage. Deleting an order
-- therefore left zero activity_log rows and produced no admin notification,
-- inconsistent with every other delete in the app.
--
-- log_entity_activity() (same function backing products/coupons) already has
-- a complete DELETE branch — entity_id/before_data both read from OLD — it
-- was simply never attached to orders for that operation. Reusing it here
-- rather than extending log_order_activity(), which is insert/update-shaped
-- (its UPDATE branch specifically diffs old.status vs new.status — there is
-- no equivalent "new" row on delete).
-- ============================================================================

drop trigger if exists log_activity_delete on public.orders;
create trigger log_activity_delete
  after delete on public.orders
  for each row execute function public.log_entity_activity('طلب', 'order');
