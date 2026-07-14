-- ============================================================================
-- wishlist
-- ============================================================================

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint wishlist_unique_item unique (user_id, product_id)
);

create index wishlist_user_id_idx on public.wishlist (user_id);
create index wishlist_product_id_idx on public.wishlist (product_id);

alter table public.wishlist enable row level security;

-- Guests: no server-side wishlist; no policies granted.

-- Authenticated users: full control over their own wishlist only.
create policy "wishlist_select_own"
  on public.wishlist for select
  to authenticated
  using (user_id = auth.uid());

create policy "wishlist_insert_own"
  on public.wishlist for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "wishlist_delete_own"
  on public.wishlist for delete
  to authenticated
  using (user_id = auth.uid());

-- Admins + super_admin: read-only, for merchandising insight.
create policy "wishlist_select_admin"
  on public.wishlist for select
  to authenticated
  using (public.is_admin());
