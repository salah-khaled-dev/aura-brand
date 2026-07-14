-- ============================================================================
-- orders
-- ============================================================================

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
