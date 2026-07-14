-- ============================================================================
-- product_images
-- ============================================================================

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);
create index product_images_sort_order_idx on public.product_images (product_id, sort_order);

-- Only one primary image per product.
create unique index product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

alter table public.product_images enable row level security;

-- Guests + authenticated: can read images belonging to active products.
create policy "product_images_select_public"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.is_active = true
    )
  );

-- Admins + super_admin: full read/write access.
create policy "product_images_select_admin"
  on public.product_images for select
  to authenticated
  using (public.is_admin());

create policy "product_images_insert_admin"
  on public.product_images for insert
  to authenticated
  with check (public.is_admin());

create policy "product_images_update_admin"
  on public.product_images for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_images_delete_admin"
  on public.product_images for delete
  to authenticated
  using (public.is_admin());
