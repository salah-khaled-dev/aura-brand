-- ============================================================================
-- coupons
-- ============================================================================

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
