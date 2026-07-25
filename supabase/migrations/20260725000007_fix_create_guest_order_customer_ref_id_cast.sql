-- ============================================================================
-- Fix: create_guest_order() never cast customer_ref_id to uuid.
--
-- orders.customer_ref_id started out as `text` (20260714120022) and
-- create_guest_order() wrote `nullif(p_order->>'customer_ref_id', '')` into
-- it with no cast, which was correct at the time. 20260715000010 later
-- promoted the column to `uuid` with an FK to customers(id) — but the
-- function (last replaced by 20260715000007, which pre-dates that column
-- change) was never updated to match, unlike the sibling coupon_id column a
-- few lines above it, which does cast (`::uuid`).
--
-- Postgres does have an assignment-cast from text to uuid, so this only ever
-- surfaced when the JSON payload's customer_ref_id was a non-empty string
-- that wasn't valid uuid syntax (e.g. a stale mock-era customer id) — at
-- which point the INSERT raised `invalid input syntax for type uuid`
-- (22P02), surfaced by PostgREST as an HTTP 400. Guest checkout never hit
-- this (it always sends customer_ref_id: null), but the admin "new order"
-- form passes a real customer id and could.
--
-- No column/data change needed — only the function body.
-- ============================================================================

create or replace function public.create_guest_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_order public.orders;
  v_result jsonb;
  v_item jsonb;
  v_catalog_price numeric;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_coupon record;
  v_discount numeric := 0;
  v_shipping numeric;
  v_tax numeric;
  v_phone text;
  v_prior_redemptions integer;
begin
  -- Maintenance freeze also covers the direct-insert path via the trigger
  -- added below, but keep this early exit so guests get a clean error
  -- instead of a generic trigger exception.
  if (select maintenance_mode from public.store_settings where id = 1) and not v_is_admin then
    raise exception 'store is currently in maintenance mode' using errcode = 'P0001';
  end if;

  -- ── Line items: recompute unit_price from the catalog for non-admin callers.
  -- Admin's own "new order" form is unchanged — it was never the exploitable
  -- path (admin is already an authenticated, RLS-gated actor who can adjust
  -- pricing for manual/phone orders).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_is_admin then
      v_unit_price := (v_item->>'unit_price')::numeric;
    else
      if v_item->>'variant_id' is not null and v_item->>'variant_id' <> '' then
        select coalesce(pv.sale_price, pv.price, p.sale_price, p.price)
          into v_catalog_price
          from public.product_variants pv
          join public.products p on p.id = pv.product_id
          where pv.id = (v_item->>'variant_id')::uuid
            and pv.product_id = (v_item->>'product_id')::uuid;
      else
        select coalesce(sale_price, price)
          into v_catalog_price
          from public.products
          where id = (v_item->>'product_id')::uuid;
      end if;

      if v_catalog_price is null then
        raise exception 'Unknown product/variant in order items' using errcode = 'P0001';
      end if;

      v_unit_price := v_catalog_price;
    end if;

    v_subtotal := v_subtotal + v_unit_price * (v_item->>'quantity')::integer;
  end loop;

  -- ── Coupon: always server-recomputed from validate_coupon, regardless of
  -- caller — coupon math is never user-editable, even for admin.
  v_phone := p_order->>'phone';
  if coalesce(p_order->>'coupon_code', '') <> '' then
    select * into v_coupon
      from public.validate_coupon(p_order->>'coupon_code', v_subtotal);

    if v_coupon.id is null then
      raise exception 'Coupon is invalid, expired, or no longer applicable' using errcode = 'P0001';
    end if;

    if v_coupon.per_user_limit is not null and v_phone is not null then
      select count(*) into v_prior_redemptions
        from public.orders o
        where o.coupon_code = p_order->>'coupon_code'
          and o.status <> 'cancelled'
          and right(regexp_replace(o.phone, '\D', '', 'g'), 8) = right(regexp_replace(v_phone, '\D', '', 'g'), 8);

      if v_prior_redemptions >= v_coupon.per_user_limit then
        raise exception 'Coupon redemption limit reached for this customer' using errcode = 'P0001';
      end if;
    end if;

    if v_coupon.type = 'percentage' then
      v_discount := v_subtotal * (v_coupon.value / 100);
      if v_coupon.max_discount_amount is not null then
        v_discount := least(v_discount, v_coupon.max_discount_amount);
      end if;
    elsif v_coupon.type = 'fixed' then
      v_discount := least(v_coupon.value, v_subtotal);
    else
      v_discount := 0; -- 'shipping' coupons discount the shipping line, not subtotal
    end if;
  elsif v_is_admin then
    -- No coupon: admin manual discounts are still trusted as before.
    v_discount := coalesce((p_order->>'discount_amount')::numeric, 0);
  end if;

  v_shipping := greatest(coalesce((p_order->>'shipping_fee')::numeric, 0), 0);
  v_tax := greatest(coalesce((p_order->>'tax_amount')::numeric, 0), 0);

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
    v_subtotal,
    v_discount,
    v_shipping,
    v_tax,
    -- total is always the derived sum of the (now server-trusted) components,
    -- never taken from client-supplied `total` directly.
    v_subtotal - v_discount + v_shipping + v_tax,
    nullif(p_order->>'coupon_id', '')::uuid,
    nullif(p_order->>'coupon_code', ''),
    p_order->>'phone',
    coalesce(p_order->'shipping_address', '{}'::jsonb),
    p_order->>'notes',
    coalesce(p_order->>'customer_name', ''),
    coalesce(p_order->>'customer_email', ''),
    nullif(p_order->>'customer_ref_id', '')::uuid,
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
    case
      when v_is_admin then (item->>'unit_price')::numeric
      else coalesce(
        (select coalesce(pv.sale_price, pv.price, p.sale_price, p.price)
           from public.product_variants pv join public.products p on p.id = pv.product_id
           where pv.id = nullif(item->>'variant_id', '')::uuid),
        (select coalesce(sale_price, price) from public.products where id = nullif(item->>'product_id', '')::uuid)
      )
    end,
    (item->>'quantity')::integer * case
      when v_is_admin then (item->>'unit_price')::numeric
      else coalesce(
        (select coalesce(pv.sale_price, pv.price, p.sale_price, p.price)
           from public.product_variants pv join public.products p on p.id = pv.product_id
           where pv.id = nullif(item->>'variant_id', '')::uuid),
        (select coalesce(sale_price, price) from public.products where id = nullif(item->>'product_id', '')::uuid)
      )
    end
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
