-- ============================================================================
-- AURA — full schema (merged from supabase/migrations/20260714120001..17)
-- Generated for execution on a completely empty Supabase project, in a
-- single pass, top to bottom. Every object is created exactly once, in its
-- final form — this is not a replay of the migration history:
--   * public.profiles      includes staff_role_key (20260714120017 merged in)
--   * public.prevent_role_escalation() is the final version (guards both
--     role and staff_role_key), not the original from 20260714120002
--   * public.store_settings includes the admin-fields columns/constraints
--     from 20260714120016 merged directly into the CREATE TABLE
--
-- Source of truth for future changes is still supabase/migrations/*.sql —
-- regenerate this file from those rather than hand-editing it.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Extensions & shared helpers
-- ----------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

-- Generic "touch updated_at" trigger function, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. profiles (merged with 20260714120017 staff_role_key)
-- ----------------------------------------------------------------------------

create type public.user_role as enum ('customer', 'admin', 'super_admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'customer',
  staff_role_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_phone_format check (phone is null or phone ~ '^\+?[0-9]{8,15}$'),
  constraint profiles_staff_role_key_valid check (
    staff_role_key is null or staff_role_key in (
      'administrator', 'store_manager', 'inventory_manager',
      'finance_manager', 'marketing_manager', 'customer_support'
    )
  ),
  constraint profiles_staff_role_key_requires_staff check (
    staff_role_key is null or role in ('admin', 'super_admin')
  )
);

create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (email);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper functions used by RLS policies across all tables.
-- SECURITY DEFINER + fixed search_path avoids RLS recursion and search-path hijacking.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin') and is_active
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

-- Prevent non-super-admins from granting themselves (or anyone) elevated roles
-- or a different staff (granular-permission) role.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.staff_role_key is distinct from old.staff_role_key)
     and not public.is_super_admin() then
    raise exception 'Only a super_admin can change profile roles';
  end if;
  return new;
end;
$$;

create trigger guard_profiles_role
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

alter table public.profiles enable row level security;

-- Guests: no access.

-- Authenticated users: can read and update their own profile.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins: can read every profile (customer support, order lookup, staff management).
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Super admin: full control, including creating staff profiles directly and deleting accounts.
create policy "profiles_insert_super_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_super_admin());

create policy "profiles_delete_super_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 3. categories
-- ----------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  slug text not null,
  description_ar text,
  description_en text,
  image_url text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_slug_unique unique (slug),
  constraint categories_not_self_parent check (id <> parent_id)
);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_idx on public.categories (is_active);
create index categories_sort_order_idx on public.categories (sort_order);

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

-- Guests + authenticated: can read active categories only.
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

-- Admins + super_admin: full read (including inactive) and write access.
create policy "categories_select_admin"
  on public.categories for select
  to authenticated
  using (public.is_admin());

create policy "categories_insert_admin"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "categories_update_admin"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin"
  on public.categories for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. products
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 5. product_images
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 6. product_variants
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 7. cart_items
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 8. wishlist
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 9. coupons
-- ----------------------------------------------------------------------------

create type public.coupon_type as enum ('percentage', 'fixed');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type public.coupon_type not null,
  value numeric(10, 2) not null,
  min_order_amount numeric(10, 2) not null default 0,
  max_discount_amount numeric(10, 2),
  usage_limit integer,
  usage_count integer not null default 0,
  per_user_limit integer,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coupons_code_unique unique (code),
  constraint coupons_value_positive check (value > 0),
  constraint coupons_percentage_max check (type <> 'percentage' or value <= 100),
  constraint coupons_usage_limit_valid check (usage_limit is null or usage_limit > 0),
  constraint coupons_usage_count_non_negative check (usage_count >= 0),
  constraint coupons_date_range_valid check (starts_at is null or expires_at is null or starts_at < expires_at)
);

create index coupons_code_idx on public.coupons (code);
create index coupons_is_active_idx on public.coupons (is_active);

create trigger set_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;

-- Guests + authenticated: no direct table access. Coupon codes are validated
-- through the RPC below so the full coupon list can never be enumerated.
-- Admins + super_admin: full read/write access.
create policy "coupons_select_admin"
  on public.coupons for select
  to authenticated
  using (public.is_admin());

create policy "coupons_insert_admin"
  on public.coupons for insert
  to authenticated
  with check (public.is_admin());

create policy "coupons_update_admin"
  on public.coupons for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "coupons_delete_admin"
  on public.coupons for delete
  to authenticated
  using (public.is_admin());

-- Checkout-safe coupon lookup: returns only what the storefront needs to
-- apply a discount, never the full row, and never the row if it's invalid.
create or replace function public.validate_coupon(p_code text, p_order_amount numeric)
returns table (
  id uuid,
  type public.coupon_type,
  value numeric,
  max_discount_amount numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.type, c.value, c.max_discount_amount
  from public.coupons c
  where c.code = p_code
    and c.is_active = true
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at >= now())
    and (c.usage_limit is null or c.usage_count < c.usage_limit)
    and p_order_amount >= c.min_order_amount;
$$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 10. orders
-- ----------------------------------------------------------------------------

create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
);

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type public.payment_method as enum ('cash_on_delivery', 'card', 'wallet');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,

  -- Nullable: guest checkout is supported (no account required).
  user_id uuid references public.profiles(id) on delete set null,

  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method not null default 'cash_on_delivery',

  subtotal numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null default 0,
  shipping_fee numeric(10, 2) not null default 0,
  tax_amount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  currency text not null default 'EGP',

  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,

  phone text not null,
  shipping_address jsonb not null,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_order_number_unique unique (order_number),
  constraint orders_phone_format check (phone ~ '^\+?[0-9]{8,15}$'),
  constraint orders_amounts_non_negative check (
    subtotal >= 0 and discount_amount >= 0 and shipping_fee >= 0 and tax_amount >= 0 and total >= 0
  )
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Human-friendly sequential order numbers: ORD-000001, ORD-000002, ...
create sequence public.orders_number_seq;

create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'ORD-' || lpad(nextval('public.orders_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger set_orders_order_number
  before insert on public.orders
  for each row execute function public.generate_order_number();

alter table public.orders enable row level security;

-- Guests: can place an order without an account (user_id must be null).
create policy "orders_insert_guest"
  on public.orders for insert
  to anon
  with check (user_id is null);

-- Authenticated users: can place and view their own orders. No update/delete —
-- order mutation (status, payment) is admin-controlled to prevent tampering.
create policy "orders_insert_own"
  on public.orders for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "orders_select_own"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

-- Admins + super_admin: full visibility and status/payment management.
create policy "orders_select_admin"
  on public.orders for select
  to authenticated
  using (public.is_admin());

create policy "orders_update_admin"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders_delete_super_admin"
  on public.orders for delete
  to authenticated
  using (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 11. order_items
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 12. contact_messages
-- ----------------------------------------------------------------------------

create type public.contact_message_status as enum ('new', 'read', 'replied', 'archived');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status public.contact_message_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contact_messages_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index contact_messages_status_idx on public.contact_messages (status);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);

create trigger set_contact_messages_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;

-- Guests + authenticated: can submit a contact message, nothing else.
create policy "contact_messages_insert_public"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Admins + super_admin: full read/write access (triage, reply tracking).
create policy "contact_messages_select_admin"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin());

create policy "contact_messages_update_admin"
  on public.contact_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "contact_messages_delete_admin"
  on public.contact_messages for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 13. newsletter
-- ----------------------------------------------------------------------------

create table public.newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  is_subscribed boolean not null default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint newsletter_email_unique unique (email),
  constraint newsletter_email_format check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index newsletter_is_subscribed_idx on public.newsletter (is_subscribed);

alter table public.newsletter enable row level security;

-- Guests + authenticated: can subscribe (insert only). Unsubscribe/lookup by
-- email is handled through a signed link on a trusted server route, not RLS,
-- since anon has no identity to scope an update/select to.
create policy "newsletter_insert_public"
  on public.newsletter for insert
  to anon, authenticated
  with check (true);

-- Admins + super_admin: full read/write access.
create policy "newsletter_select_admin"
  on public.newsletter for select
  to authenticated
  using (public.is_admin());

create policy "newsletter_update_admin"
  on public.newsletter for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "newsletter_delete_admin"
  on public.newsletter for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 14. notifications
-- ----------------------------------------------------------------------------

create type public.notification_type as enum ('order', 'account', 'promotion', 'stock', 'system');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  -- Null user_id + for_admins = true means a broadcast notification for staff
  -- (e.g. "low stock", "new order"), visible to every admin/super_admin.
  user_id uuid references public.profiles(id) on delete cascade,
  for_admins boolean not null default false,

  type public.notification_type not null default 'system',
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),

  constraint notifications_audience_valid check (
    (for_admins = true and user_id is null) or (for_admins = false and user_id is not null)
  )
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_for_admins_idx on public.notifications (for_admins);
create index notifications_is_read_idx on public.notifications (is_read);
create index notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;

-- Guests: no access.

-- Authenticated users: can read/update/delete their own personal notifications.
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- Admins + super_admin: full read/write access, including admin broadcasts.
create policy "notifications_select_admin"
  on public.notifications for select
  to authenticated
  using (public.is_admin());

create policy "notifications_insert_admin"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

create policy "notifications_update_admin"
  on public.notifications for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "notifications_delete_admin"
  on public.notifications for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 15. store_settings (merged with 20260714120016 admin fields)
-- ----------------------------------------------------------------------------

create table public.store_settings (
  id integer primary key default 1,

  store_name_ar text not null default '',
  store_name_en text not null default '',
  store_description text not null default '',
  logo_url text,
  favicon_url text,

  contact_email text,
  contact_phone text,
  whatsapp_number text,
  address jsonb not null default '{}'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  working_hours jsonb not null default '[
    {"day": "saturday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "sunday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "monday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "tuesday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "wednesday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "thursday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "friday", "isOpen": false, "openTime": "10:00", "closeTime": "22:00"}
  ]'::jsonb,

  seo_title text,
  seo_description text,
  seo_keywords text[] not null default '{}',
  og_image_url text,
  google_analytics_id text,
  google_search_console_code text,
  robots_txt text not null default 'User-agent: *
Allow: /',
  sitemap_enabled boolean not null default true,

  currency text not null default 'EGP',
  tax_rate numeric(5, 2) not null default 0,
  shipping_fee numeric(10, 2) not null default 0,
  free_shipping_threshold numeric(10, 2),
  estimated_delivery_days text not null default '3-5',

  enable_cod boolean not null default true,
  enable_vodafone_cash boolean not null default false,
  enable_instapay boolean not null default false,

  maintenance_mode boolean not null default false,
  maintenance_message text,

  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,

  constraint store_settings_singleton check (id = 1),
  constraint store_settings_tax_rate_valid check (tax_rate >= 0 and tax_rate <= 100),
  constraint store_settings_fees_non_negative check (
    shipping_fee >= 0 and (free_shipping_threshold is null or free_shipping_threshold >= 0)
  ),
  constraint store_settings_working_hours_shape check (jsonb_array_length(working_hours) = 7),
  constraint store_settings_ga_id_format check (
    google_analytics_id is null or google_analytics_id = '' or google_analytics_id ~ '^(G|UA|GTM)-[A-Za-z0-9-]+$'
  )
);

create trigger set_store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

-- Guests + authenticated: public read (storefront needs logo, socials, SEO, etc).
create policy "store_settings_select_public"
  on public.store_settings for select
  to anon, authenticated
  using (true);

-- Admins: can update operational fields (shipping, taxes, contact info, SEO, etc).
create policy "store_settings_update_admin"
  on public.store_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Super admin: can (re)create the singleton row if it was ever removed.
create policy "store_settings_insert_super_admin"
  on public.store_settings for insert
  to authenticated
  with check (public.is_super_admin());

-- Baseline row so the storefront always has settings to read. Not demo/product
-- data — it's required operational configuration. Admins fill in real values later.
insert into public.store_settings (id) values (1)
on conflict (id) do nothing;

commit;
