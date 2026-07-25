-- ============================================================================
-- stock_movements — attach the generic activity/notification trigger.
--
-- Every other admin-managed table added since 20260715000009 got
-- log_entity_activity() attached at creation time (brands, collections,
-- journal_articles, business tables, website CMS tables, roles,
-- store_settings, customers). stock_movements (20260715000004) was missed —
-- record_stock_movement/update_stock_movement/delete_stock_movement write
-- rows directly, so a plain AFTER trigger on the table (same shape as every
-- other generic table) catches all three without touching the RPCs.
-- ============================================================================

drop trigger if exists log_activity on public.stock_movements;
create trigger log_activity
  after insert or update or delete on public.stock_movements
  for each row execute function public.log_entity_activity('حركة مخزون', 'stock');
