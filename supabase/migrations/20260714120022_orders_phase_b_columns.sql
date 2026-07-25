-- ============================================================================
-- orders / order_items — Phase B additive columns
--
-- Brings `orders` up to parity with the mock `Order` model so the Phase B
-- service cutover (order.service.ts) is a same-signature swap with no
-- feature loss. Purely additive: existing columns, indexes, RLS policies,
-- and constraints from 20260714120010/20260714120011 are untouched except
-- where noted below. Same pattern as
-- 20260714120018_products_categories_phase_a_columns.sql.
-- ============================================================================

-- ─── order_status / payment_status: extend to the app's full workflow ────────
-- The app's canonical status model (src/lib/orders/order-status.ts) has more
-- granular steps than the original 7-value enum. Additive only — existing
-- values are untouched, so no data migration is needed.
alter type public.order_status add value if not exists 'preparing' after 'confirmed';
alter type public.order_status add value if not exists 'ready_to_ship' after 'preparing';
alter type public.order_status add value if not exists 'out_for_delivery' after 'shipped';
alter type public.order_status add value if not exists 'refunded' after 'returned';

alter type public.payment_status add value if not exists 'partial';
alter type public.payment_status add value if not exists 'partially_refunded';

-- ─── orders ────────────────────────────────────────────────────────────────

alter table public.orders
  -- Guest checkout has no `profiles` row to read a name/email from — the
  -- mock model stores these directly on the order, so we do too.
  add column customer_name text not null default '',
  add column customer_email text not null default '',
  -- Loose (non-FK) reference into the still-mock customer domain (customers
  -- are out of scope for this phase). Only used by the service layer to
  -- recompute that mock customer's stats on status change — never joined.
  add column customer_ref_id text,
  add column customer_notes text,
  add column discount_type text,
  add column discount_value numeric(10, 2),
  add column shipping_company text,
  add column tracking_number text,
  add column courier_name text,
  add column estimated_delivery_date timestamptz,
  add column customer_update text,
  add column customer_updated_at timestamptz,
  add column billing_address text,
  -- Status history + admin-only notes: structurally a list of small records
  -- with no independent query/relational need (mirrors the products.revisions
  -- JSONB-passthrough precedent).
  add column timeline jsonb not null default '[]'::jsonb,
  add column internal_notes jsonb not null default '[]'::jsonb;

alter table public.orders
  add constraint orders_discount_type_valid check (
    discount_type is null or discount_type in ('percentage', 'fixed', 'shipping')
  );

-- payment_method is genuinely freeform in the app (checkout hardcodes
-- 'instapay'/'vodafone-cash', admin defaults to 'cod', neither matches the
-- original cash_on_delivery/card/wallet enum). Relax to text so any value
-- the UI sends round-trips exactly, matching the mock's unconstrained
-- `paymentMethod?: string`.
alter table public.orders
  alter column payment_method type text using payment_method::text,
  alter column payment_method set default 'cod';

-- Admins create orders on behalf of customers who have no auth account
-- (user_id stays null, same as guest orders) — the existing insert policies
-- only cover anon-guest and authenticated-self, so an authenticated admin
-- inserting a null-user_id order had no matching policy.
create policy "orders_insert_admin"
  on public.orders for insert
  to authenticated
  with check (public.is_admin());

create policy "order_items_insert_admin"
  on public.order_items for insert
  to authenticated
  with check (public.is_admin());

-- ─── guest read access: critical gap in the original RLS ─────────────────────
-- The original migration (20260714120010/11) only granted SELECT to
-- `authenticated` (self or admin) — but the entire storefront runs
-- unauthenticated (anon). Without something here, checkout's post-order
-- confirmation, the tracking page, and the packing slip would all read zero
-- rows for every guest order, i.e. almost all traffic.
--
-- A blanket `to anon using (user_id is null)` policy (the first cut of this
-- migration) is a PII leak: RLS filters *rows*, not *which columns a client
-- may request in one query* — it does not stop an anonymous caller from
-- reading the entire table (every guest's name/email/address/order contents)
-- via a plain `select * from orders`, not just the one order they know the
-- number for. The order number is meant to be the access token for guest
-- tracking (see order-status.ts's tolerant lookup), so guest access is scoped
-- through a SECURITY DEFINER RPC that takes the order number as an argument
-- and returns only that one matching guest order — same pattern as
-- `validate_coupon` in 20260714120009_coupons.sql. No RLS policy grants
-- `anon` direct SELECT on `orders` / `order_items` at all.
create or replace function public.get_guest_order(p_order_number text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select to_jsonb(o) || jsonb_build_object(
    'order_items', coalesce(
      (select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = o.id),
      '[]'::jsonb
    )
  )
  from public.orders o
  where o.user_id is null
    and upper(regexp_replace(o.order_number, '[^A-Za-z0-9]', '', 'g'))
        = upper(regexp_replace(p_order_number, '[^A-Za-z0-9]', '', 'g'))
  limit 1;
$$;

grant execute on function public.get_guest_order(text) to anon, authenticated;

-- ─── Realtime: push admin status changes live to open tracking pages ─────────
-- postgres_changes (the table-subscription API) re-evaluates the row's table
-- RLS for every subscriber, so wiring it up for anon here would reopen the
-- exact "select * from orders" hole get_guest_order() was just added to
-- close — Realtime has no way to know a subscriber already proved they know
-- one specific order's number, it only knows their role.
--
-- Broadcast from Database sidesteps that: the channel topic embeds the order's
-- (unguessable) id, so knowing the id — learned only from get_guest_order()'s
-- response or the customer's own order — is itself the capability, same
-- trust model as the order-number lookup above. No SELECT policy on
-- `orders`/`order_items` is involved.
create or replace function public.broadcast_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.broadcast_changes(
    'order:' || new.id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

drop trigger if exists broadcast_order_change on public.orders;
create trigger broadcast_order_change
  after update on public.orders
  for each row execute function public.broadcast_order_change();

drop policy if exists "order_broadcast_receive" on realtime.messages;
create policy "order_broadcast_receive"
  on realtime.messages for select
  to anon, authenticated
  using (realtime.topic() like 'order:%');

-- ─── create_guest_order: atomic order+items creation, RETURNING-safe ─────────
-- Postgres RLS gates a RETURNING clause the same way it gates SELECT (see
-- get_guest_order's note above) — so a plain `insert(...).select()` from
-- PostgREST would succeed at writing but come back empty for anon, since
-- there is no anon SELECT policy on `orders`/`order_items` at all anymore.
-- Every order in this app is a guest order today (user_id always null — no
-- customer-login system exists), so this is the single creation path for
-- both storefront checkout and the admin "new order" form; wrapping the
-- whole order+items insert in one SECURITY DEFINER function sidesteps the
-- RETURNING problem entirely, since its internal INSERTs run as the function
-- owner and the jsonb it returns is data, not a policy-gated table row.
create or replace function public.create_guest_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_result jsonb;
begin
  insert into public.orders (
    user_id, status, payment_status, payment_method, subtotal, discount_amount,
    shipping_fee, tax_amount, total, coupon_id, coupon_code, phone, shipping_address,
    notes, customer_name, customer_email, customer_ref_id, customer_notes,
    discount_type, discount_value, timeline, internal_notes
  )
  values (
    null,
    'pending',
    'pending',
    coalesce(p_order->>'payment_method', 'cod'),
    (p_order->>'subtotal')::numeric,
    coalesce((p_order->>'discount_amount')::numeric, 0),
    coalesce((p_order->>'shipping_fee')::numeric, 0),
    coalesce((p_order->>'tax_amount')::numeric, 0),
    (p_order->>'total')::numeric,
    nullif(p_order->>'coupon_id', '')::uuid,
    nullif(p_order->>'coupon_code', ''),
    p_order->>'phone',
    coalesce(p_order->'shipping_address', '{}'::jsonb),
    p_order->>'notes',
    coalesce(p_order->>'customer_name', ''),
    coalesce(p_order->>'customer_email', ''),
    nullif(p_order->>'customer_ref_id', ''),
    p_order->>'customer_notes',
    p_order->>'discount_type',
    nullif(p_order->>'discount_value', '')::numeric,
    coalesce(p_order->'timeline', '[]'::jsonb),
    '[]'::jsonb
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, sku, image_url, size, color_name,
    quantity, unit_price, total_price
  )
  select
    v_order.id,
    nullif(item->>'product_id', '')::uuid,
    nullif(item->>'variant_id', '')::uuid,
    item->>'product_name',
    item->>'sku',
    item->>'image_url',
    item->>'size',
    item->>'color_name',
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric,
    (item->>'total_price')::numeric
  from jsonb_array_elements(p_items) as item;

  select to_jsonb(v_order) || jsonb_build_object(
    'order_items', coalesce(
      (select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = v_order.id),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.create_guest_order(jsonb, jsonb) to anon, authenticated;
