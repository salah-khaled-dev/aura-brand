-- ============================================================================
-- create_guest_order — refuse new orders while the store is in maintenance
--
-- Guest checkout never goes through the Next.js server (it calls this
-- SECURITY DEFINER RPC directly from the browser), so the middleware
-- maintenance-mode gate added alongside this migration can't block it.
-- `create_guest_order` is also the same function admins use for the "new
-- order" form (see 20260714120022), so the check only blocks non-admin
-- callers — admins keep full access while maintenance mode is on.
-- ============================================================================

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
  if (select maintenance_mode from public.store_settings where id = 1) and not public.is_admin() then
    raise exception 'store is currently in maintenance mode' using errcode = 'P0001';
  end if;

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
