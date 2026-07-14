-- ============================================================================
-- order_items — line items, snapshotting product data at time of purchase
-- ============================================================================

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,

  -- Snapshots: survive product edits/deletion so historical orders stay accurate.
  product_name text not null,
  sku text not null,
  image_url text,
  size text,
  color_name text,

  quantity integer not null,
  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null,

  created_at timestamptz not null default now(),

  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_prices_non_negative check (unit_price >= 0 and total_price >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

alter table public.order_items enable row level security;

-- Guests: can insert items for the guest order they're currently placing.
create policy "order_items_insert_guest"
  on public.order_items for insert
  to anon
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id is null
    )
  );

-- Authenticated users: can insert and view items belonging to their own orders.
create policy "order_items_insert_own"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- Admins + super_admin: full read/write access.
create policy "order_items_select_admin"
  on public.order_items for select
  to authenticated
  using (public.is_admin());

create policy "order_items_update_admin"
  on public.order_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items_delete_admin"
  on public.order_items for delete
  to authenticated
  using (public.is_admin());
