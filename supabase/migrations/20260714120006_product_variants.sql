-- ============================================================================
-- product_variants — size/color combinations, each with its own stock & SKU
-- ============================================================================

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color_name text not null,
  color_hex text,
  sku text not null,
  price numeric(10, 2),
  sale_price numeric(10, 2),
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_variants_sku_unique unique (sku),
  constraint product_variants_unique_combo unique (product_id, size, color_name),
  constraint product_variants_stock_non_negative check (stock >= 0),
  constraint product_variants_price_valid check (price is null or price >= 0),
  constraint product_variants_sale_price_valid check (
    sale_price is null or (sale_price >= 0 and (price is null or sale_price < price))
  ),
  constraint product_variants_color_hex_format check (
    color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_is_active_idx on public.product_variants (is_active);

create trigger set_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

alter table public.product_variants enable row level security;

-- Guests + authenticated: can read variants belonging to active products.
create policy "product_variants_select_public"
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_active = true
    )
  );

-- Admins + super_admin: full read/write access.
create policy "product_variants_select_admin"
  on public.product_variants for select
  to authenticated
  using (public.is_admin());

create policy "product_variants_insert_admin"
  on public.product_variants for insert
  to authenticated
  with check (public.is_admin());

create policy "product_variants_update_admin"
  on public.product_variants for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_variants_delete_admin"
  on public.product_variants for delete
  to authenticated
  using (public.is_admin());
