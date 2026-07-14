-- ============================================================================
-- cart_items
-- ============================================================================

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cart_items_quantity_positive check (quantity > 0)
);

create index cart_items_user_id_idx on public.cart_items (user_id);
create index cart_items_product_id_idx on public.cart_items (product_id);

-- Plain UNIQUE(user_id, product_id, variant_id) wouldn't dedupe simple products
-- (variant_id null), since SQL treats every NULL as distinct. Two partial
-- indexes cover both cases instead.
create unique index cart_items_unique_with_variant
  on public.cart_items (user_id, product_id, variant_id)
  where variant_id is not null;

create unique index cart_items_unique_without_variant
  on public.cart_items (user_id, product_id)
  where variant_id is null;

create trigger set_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

alter table public.cart_items enable row level security;

-- Guests: no server-side cart (handled client-side); no policies granted.

-- Authenticated users: full control over their own cart only.
create policy "cart_items_select_own"
  on public.cart_items for select
  to authenticated
  using (user_id = auth.uid());

create policy "cart_items_insert_own"
  on public.cart_items for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "cart_items_update_own"
  on public.cart_items for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cart_items_delete_own"
  on public.cart_items for delete
  to authenticated
  using (user_id = auth.uid());

-- Admins + super_admin: read-only, for customer support.
create policy "cart_items_select_admin"
  on public.cart_items for select
  to authenticated
  using (public.is_admin());
