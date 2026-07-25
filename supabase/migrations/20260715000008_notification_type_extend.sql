-- ============================================================================
-- notification_type — extend for the admin notification feed
--
-- public.notifications already exists (20260714120014) with a proper
-- for_admins/user_id split and full RLS, but nothing in the app used it —
-- the admin feed (src/lib/services/notification.service.ts) was reading
-- mockStorage/localStorage instead. Wiring it up now (see the accompanying
-- service rewrite); the app's Notification['type'] union is
-- 'order' | 'customer' | 'system' | 'review', so add the two values the
-- original enum didn't cover. Additive only, same pattern as the
-- order_status/payment_status extensions in 20260714120022.
-- ============================================================================

alter type public.notification_type add value if not exists 'customer';
alter type public.notification_type add value if not exists 'review';
