-- ============================================================================
-- products.default_variant_id — single authoritative "which color is default"
--
-- 20260726000005 modeled "default" as an `is_default` boolean on
-- product_colors, resolved by array/sort order as a fallback when absent.
-- That's two sources of truth for the same fact (a flag *and* implicit
-- position), which is exactly the kind of thing that lets "default" silently
-- drift during an update. This migration moves the pointer onto `products`
-- itself, per the requested shape (`products.default_variant_id` instead of
-- depending on upload order):
--
--   1. products.default_variant_id — added, backfilled from whichever color
--      currently has is_default = true, then product_colors.is_default and
--      its unique index are dropped. One source of truth from here on.
--   2. Safety net: any product that ended up with zero product_colors rows
--      after 20260726000005's backfill (a colorless product that had no
--      product_variants to derive a color from) gets one auto-created
--      default color now, seeded from its existing flat product_images, so
--      every product has exactly one default variant after this migration —
--      no exceptions.
--   3. product_colors.price_override — optional per-color price, additive.
-- ============================================================================


-- ─── 1. products.default_variant_id ─────────────────────────────────────────

alter table public.products
  add column if not exists default_variant_id uuid references public.product_colors(id) on delete set null;

update public.products p
set default_variant_id = c.id
from public.product_colors c
where c.product_id = p.id and c.is_default = true;

drop index if exists public.product_colors_one_default_per_product;
alter table public.product_colors drop column if exists is_default;


-- ─── 2. Safety net: guarantee every product has a default variant ─────────

do $$
declare
  v_product record;
  v_color_id uuid;
begin
  for v_product in
    select p.id
    from public.products p
    where not exists (select 1 from public.product_colors c where c.product_id = p.id)
  loop
    insert into public.product_colors (product_id, name_ar, name_en, hex, sort_order, is_active)
    values (v_product.id, 'افتراضي', 'Default', '#000000', 0, true)
    returning id into v_color_id;

    insert into public.product_color_images (color_id, url, sort_order, is_primary)
    select v_color_id, pi.url, pi.sort_order, pi.is_primary
    from public.product_images pi
    where pi.product_id = v_product.id;

    update public.products set default_variant_id = v_color_id where id = v_product.id;
  end loop;
end $$;

-- Any product that still has colors but no default pointer (edge case: the
-- is_default flag was never set on any row) falls back to its lowest
-- sort_order color.
update public.products p
set default_variant_id = (
  select c.id from public.product_colors c
  where c.product_id = p.id
  order by c.sort_order asc
  limit 1
)
where p.default_variant_id is null
  and exists (select 1 from public.product_colors c where c.product_id = p.id);


-- ─── 3. product_colors.price_override ──────────────────────────────────────

alter table public.product_colors
  add column if not exists price_override numeric(10, 2);

alter table public.product_colors
  add constraint product_colors_price_override_valid
    check (price_override is null or price_override >= 0);
