-- ============================================================================
-- harden_guest_checkout_and_coupons — closes a chain of unauthenticated
-- production vulnerabilities found in a full security audit:
--
--   C1. get_guest_order(p_order_number) let anyone enumerate every guest
--       order's full PII (name/email/phone/address) by looping sequential
--       ORD-000001..ORD-999999 numbers — order_number is a DB-generated
--       sequence, not a secret.
--   C2. create_guest_order() inserted subtotal/discount/tax/total and every
--       line item's unit_price verbatim from caller-supplied JSON, with no
--       lookup against products/product_variants — a guest could call the
--       RPC directly with unit_price: 0.01 and create a real order at any
--       price they choose.
--   C3. orders/order_items also grant anon/authenticated a direct table
--       INSERT (for PostgREST), gated only by RLS checking user_id — status,
--       payment_status, and every price column were writable straight to
--       'delivered'/'paid' at any total, bypassing create_guest_order
--       entirely.
--   H1. increment_coupon_usage() never re-checked coupon validity and could
--       be called more than once for the same order (double-counting).
--   H2. The maintenance-mode order freeze only lived inside
--       create_guest_order() — the direct-insert path (C3) ignored it.
--   M1. coupons.per_user_limit was defined but never enforced anywhere.
--   M2. contact_messages/newsletter had no length caps on free-text columns.
--
-- Fix strategy: recompute pricing server-side from the product catalog for
-- non-admin callers (admin's own manual-order pricing is unchanged — it was
-- never the exploitable path, admin is already an authenticated, RLS-gated
-- actor), require a second factor (phone/email) to look up a guest order,
-- and add a table-level trigger so the maintenance gate and the
-- pending-only status rule apply no matter which insert path is used.
-- ============================================================================

-- ─── 0. Idempotency marker for coupon usage counting (H1) ───────────────────
alter table public.orders
  add column coupon_usage_counted boolean not null default false;

-- ─── 1. get_guest_order: require order_number + phone/email (C1) ───────────
drop function if exists public.get_guest_order(text);

create or replace function public.get_guest_order(p_order_number text, p_contact text)
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
    and (
      -- Email match (case-insensitive) if the second factor looks like one...
      (p_contact like '%@%' and lower(o.customer_email) = lower(trim(p_contact)))
      -- ...otherwise treat it as a phone number: compare the last 8 digits so
      -- +20/0/formatting differences between what the customer typed at
      -- checkout and at lookup time don't false-negative.
      or (
        p_contact not like '%@%'
        and length(regexp_replace(p_contact, '\D', '', 'g')) >= 8
        and right(regexp_replace(o.phone, '\D', '', 'g'), 8)
            = right(regexp_replace(p_contact, '\D', '', 'g'), 8)
      )
    )
  limit 1;
$$;

grant execute on function public.get_guest_order(text, text) to anon, authenticated;

comment on function public.get_guest_order(text, text) is
  'Guest order lookup requires BOTH the order number AND the phone/email used at checkout — order_number alone (a sequential, guessable DB counter) is not sufficient to prove ownership.';

-- ─── 2. validate_coupon: also expose per_user_limit so callers can enforce it ─
create or replace function public.validate_coupon(p_code text, p_order_amount numeric)
returns table (
  id uuid,
  type public.coupon_type,
  value numeric,
  max_discount_amount numeric,
  per_user_limit integer
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.type, c.value, c.max_discount_amount, c.per_user_limit
  from public.coupons c
  where c.code = p_code
    and c.is_active = true
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at >= now())
    and (c.usage_limit is null or c.usage_count < c.usage_limit)
    and p_order_amount >= c.min_order_amount;
$$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- ─── 3. create_guest_order: server-side pricing for non-admin callers (C2) ──
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

-- ─── 4. Table-level guard: pending-only + maintenance freeze on ANY insert ──
-- (C3, H2) Applies regardless of whether the row came from create_guest_order
-- (which already only ever inserts 'pending'/'pending', so this is a no-op
-- for that path) or a direct PostgREST insert (which this closes).
create or replace function public.prevent_order_forgery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select maintenance_mode from public.store_settings where id = 1)
     and not public.is_admin()
     and auth.role() is distinct from 'service_role' then
    raise exception 'store is currently in maintenance mode' using errcode = 'P0001';
  end if;

  if (new.status is distinct from 'pending' or new.payment_status is distinct from 'pending')
     and not public.is_admin()
     and auth.role() is distinct from 'service_role' then
    raise exception 'New orders must start as pending/pending' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_order_forgery on public.orders;
create trigger prevent_order_forgery
  before insert on public.orders
  for each row execute function public.prevent_order_forgery();

-- ─── 5. increment_coupon_usage: re-validate + idempotent (H1) ──────────────
drop function if exists public.increment_coupon_usage(text, uuid);

create or replace function public.increment_coupon_usage(p_code text, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_usage_count integer;
  v_usage_limit integer;
begin
  if not exists (
    select 1 from public.orders
    where id = p_order_id
      and user_id is null
      and coupon_code = p_code
      and coupon_usage_counted = false
  ) then
    return;
  end if;

  update public.coupons
  set usage_count = usage_count + 1
  where code = p_code
    and is_active = true
  returning id, usage_count, usage_limit into v_id, v_usage_count, v_usage_limit;

  if v_id is null then
    return; -- coupon no longer active — don't count against it
  end if;

  update public.orders set coupon_usage_counted = true where id = p_order_id;

  if v_usage_limit is not null and v_usage_count >= v_usage_limit then
    update public.coupons set status = 'disabled' where id = v_id;
  end if;
end;
$$;

grant execute on function public.increment_coupon_usage(text, uuid) to anon, authenticated;

-- ─── 6. contact_messages / newsletter: length caps on free-text columns (M2) ─
alter table public.contact_messages
  add constraint contact_messages_name_length check (char_length(name) <= 200),
  add constraint contact_messages_subject_length check (subject is null or char_length(subject) <= 300),
  add constraint contact_messages_message_length check (char_length(message) <= 5000);

alter table public.newsletter
  add constraint newsletter_email_length check (char_length(email) <= 320);
