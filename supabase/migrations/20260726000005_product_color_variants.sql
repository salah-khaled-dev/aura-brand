-- ============================================================================
-- product_colors / product_color_images — per-color image galleries
--
-- Today `product_images` is a single flat gallery per product and
-- `product_variants` (size×color stock rows) has no image link at all, so the
-- storefront color selector cannot show different images per color. This
-- migration adds a real color entity with its own image collection, links
-- existing size variants to it, and backfills every existing product so
-- nothing breaks and no image is lost:
--
--   1. product_colors — one row per distinct color a product offers (name,
--      hex, display order, optional color-level stock/sku suffix, a single
--      default color, active/inactive).
--   2. product_color_images — that color's own gallery.
--   3. product_variants.color_id — links each size×color stock row to its
--      color entity (existing color_name/color_hex text columns are kept
--      untouched as a snapshot).
--   4. order_items.color_id / color_hex — snapshots so invoices/tracking/
--      admin can render a swatch, and so a future review can link back to
--      the exact purchased color without joining through variants.
--   5. reviews.color_id — additive, sits next to the product_color/
--      product_size text snapshot added by 20260726000004 (schema-readiness
--      only; the review submission flow that would populate it isn't built
--      yet).
--   6. Backfill: derive one product_colors row per distinct
--      (color_name, color_hex) already present in product_variants for each
--      product, link variants to it, and copy the product's existing flat
--      product_images into every derived color's gallery (so every color
--      starts out showing exactly what the product showed before this
--      migration — admins differentiate the galleries afterwards).
-- ============================================================================


-- ─── 1. product_colors ──────────────────────────────────────────────────────

create table public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_ar text not null,
  name_en text,
  hex text not null,
  sort_order integer not null default 0,
  stock integer,
  sku_suffix text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_colors_hex_format check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint product_colors_stock_non_negative check (stock is null or stock >= 0)
);

create index product_colors_product_id_idx on public.product_colors (product_id);
create index product_colors_is_active_idx on public.product_colors (is_active);

-- Only one default color per product.
create unique index product_colors_one_default_per_product
  on public.product_colors (product_id)
  where is_default;

create trigger set_product_colors_updated_at
  before update on public.product_colors
  for each row execute function public.set_updated_at();

alter table public.product_colors enable row level security;

create policy "product_colors_select_public"
  on public.product_colors for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_colors.product_id and p.is_active = true
    )
  );

create policy "product_colors_select_admin"
  on public.product_colors for select
  to authenticated
  using (public.is_admin());

create policy "product_colors_insert_admin"
  on public.product_colors for insert
  to authenticated
  with check (public.is_admin());

create policy "product_colors_update_admin"
  on public.product_colors for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_colors_delete_admin"
  on public.product_colors for delete
  to authenticated
  using (public.is_admin());


-- ─── 2. product_color_images ────────────────────────────────────────────────

create table public.product_color_images (
  id uuid primary key default gen_random_uuid(),
  color_id uuid not null references public.product_colors(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_color_images_color_id_idx on public.product_color_images (color_id);
create index product_color_images_sort_order_idx on public.product_color_images (color_id, sort_order);

create unique index product_color_images_one_primary_per_color
  on public.product_color_images (color_id)
  where is_primary;

alter table public.product_color_images enable row level security;

create policy "product_color_images_select_public"
  on public.product_color_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.product_colors c
      join public.products p on p.id = c.product_id
      where c.id = product_color_images.color_id and p.is_active = true
    )
  );

create policy "product_color_images_select_admin"
  on public.product_color_images for select
  to authenticated
  using (public.is_admin());

create policy "product_color_images_insert_admin"
  on public.product_color_images for insert
  to authenticated
  with check (public.is_admin());

create policy "product_color_images_update_admin"
  on public.product_color_images for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_color_images_delete_admin"
  on public.product_color_images for delete
  to authenticated
  using (public.is_admin());


-- ─── 3. product_variants.color_id ──────────────────────────────────────────

alter table public.product_variants
  add column if not exists color_id uuid references public.product_colors(id) on delete set null;

create index if not exists product_variants_color_id_idx on public.product_variants (color_id);


-- ─── 4. order_items.color_id / color_hex ───────────────────────────────────

alter table public.order_items
  add column if not exists color_id uuid references public.product_colors(id) on delete set null,
  add column if not exists color_hex text;

alter table public.order_items
  add constraint order_items_color_hex_format
    check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$');


-- ─── 5. reviews.color_id ────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists color_id uuid references public.product_colors(id) on delete set null;

create index if not exists reviews_color_id_idx on public.reviews (color_id);


-- ─── 6. Backfill existing products ─────────────────────────────────────────

do $$
declare
  v_product record;
  v_color record;
  v_color_id uuid;
  v_sort integer;
  v_is_first boolean;
begin
  for v_product in select distinct product_id from public.product_variants loop
    v_sort := 0;
    v_is_first := true;

    for v_color in
      select color_name, color_hex, min(created_at) as first_seen
      from public.product_variants
      where product_id = v_product.product_id
      group by color_name, color_hex
      order by min(created_at)
    loop
      insert into public.product_colors (product_id, name_ar, name_en, hex, sort_order, is_default, is_active)
      values (
        v_product.product_id,
        v_color.color_name,
        v_color.color_name,
        coalesce(v_color.color_hex, '#000000'),
        v_sort,
        v_is_first,
        true
      )
      returning id into v_color_id;

      update public.product_variants
      set color_id = v_color_id
      where product_id = v_product.product_id
        and color_name = v_color.color_name
        and coalesce(color_hex, '') = coalesce(v_color.color_hex, '');

      insert into public.product_color_images (color_id, url, sort_order, is_primary)
      select v_color_id, pi.url, pi.sort_order, pi.is_primary
      from public.product_images pi
      where pi.product_id = v_product.product_id;

      v_sort := v_sort + 1;
      v_is_first := false;
    end loop;
  end loop;
end $$;


-- ─── 7. create_guest_order: snapshot color_id / color_hex on each item ─────
--
-- Order items are inserted through this SECURITY DEFINER RPC with an
-- explicit column list (see 20260725000007), not a plain insert — adding
-- order_items.color_id/color_hex columns alone doesn't make the checkout
-- flow populate them. Same trust model as the existing color_name/size/
-- image_url fields: taken directly from the client-supplied item, since
-- only pricing is server-recomputed for non-admin callers.

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
  if (select maintenance_mode from public.store_settings where id = 1) and not v_is_admin then
    raise exception 'store is currently in maintenance mode' using errcode = 'P0001';
  end if;

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
      v_discount := 0;
    end if;
  elsif v_is_admin then
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
    color_id, color_hex, quantity, unit_price, total_price
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
    nullif(item->>'color_id', '')::uuid,
    item->>'color_hex',
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
