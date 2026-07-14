-- ============================================================================
-- products
-- ============================================================================

create type public.product_collection as enum ('winter', 'summer', 'all_season');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  slug text not null,
  sku text not null,
  description_ar text,
  description_en text,
  short_description_ar text,
  short_description_en text,
  category_id uuid not null references public.categories(id) on delete restrict,

  price numeric(10, 2) not null,
  sale_price numeric(10, 2),

  stock integer not null default 0,

  is_featured boolean not null default false,
  is_active boolean not null default true,
  collection public.product_collection not null default 'all_season',

  seo_title text,
  seo_description text,
  seo_keywords text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_slug_unique unique (slug),
  constraint products_sku_unique unique (sku),
  constraint products_price_positive check (price >= 0),
  constraint products_sale_price_valid check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  constraint products_stock_non_negative check (stock >= 0)
);

create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx on public.products (is_active);
create index products_is_featured_idx on public.products (is_featured);
create index products_collection_idx on public.products (collection);
create index products_created_at_idx on public.products (created_at desc);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

-- Guests + authenticated: can read active products only.
create policy "products_select_public"
  on public.products for select
  to anon, authenticated
  using (is_active = true);

-- Admins + super_admin: full read (including inactive/drafts) and write access.
create policy "products_select_admin"
  on public.products for select
  to authenticated
  using (public.is_admin());

create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using (public.is_admin());
