-- ============================================================================
-- Phase 2 products-module audit repair.
--
-- products.default_variant_id (from 20260726000006_product_default_variant.sql)
-- was found missing live, while product_colors.is_default (which that same
-- file was supposed to drop) and product_colors.price_override (added later
-- in that same file) both still/already exist — proving the file was only
-- partially applied, the same ad-hoc-application pattern found in Phase 1.
--
-- This is a functional break, not just drift: product.service.ts's
-- createProduct()/updateProduct() unconditionally write
-- `products.default_variant_id` right after saving a product's colors —
-- with the column absent, that write throws a 42703 (undefined_column)
-- error, which createProduct's catch block turns into a full rollback
-- (it deletes the just-inserted product row), and which updateProduct
-- surfaces as a failed autosave on every edit that touches colors (i.e.
-- almost every edit, since colorVariants is populated on every save).
--
-- No live products exist at the time of this migration, so the backfill/
-- safety-net steps below are no-ops here — included anyway for parity with
-- the original migration file and so this is safe to run at any point later.
-- ============================================================================

alter table public.products
  add column if not exists default_variant_id uuid references public.product_colors(id) on delete set null;

update public.products p
set default_variant_id = c.id
from public.product_colors c
where c.product_id = p.id and c.is_default = true
  and p.default_variant_id is null;

drop index if exists public.product_colors_one_default_per_product;
alter table public.product_colors drop column if exists is_default;

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

update public.products p
set default_variant_id = (
  select c.id from public.product_colors c
  where c.product_id = p.id
  order by c.sort_order asc
  limit 1
)
where p.default_variant_id is null
  and exists (select 1 from public.product_colors c where c.product_id = p.id);

alter table public.product_colors
  add column if not exists price_override numeric(10, 2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_colors_price_override_valid'
  ) then
    alter table public.product_colors
      add constraint product_colors_price_override_valid
        check (price_override is null or price_override >= 0);
  end if;
end $$;
