-- ============================================================================
-- customers — admin CRM record, derived from orders (no customer-auth system
-- exists yet — see project notes on deferred account-linked features). A
-- customer here is identified by phone (the one field every order, guest or
-- not, always carries), not by an auth.users row.
--
-- Finance/order metrics (lifetimeValue, totalSpent, ordersCount, etc.) are
-- deliberately NOT stored columns — they're computed live from `orders` in
-- get_customer_stats() below, so there's no stats-cache to keep in sync
-- (the mock version needed recomputeCustomerStats() called after every order
-- event; this design removes that whole class of staleness bug).
-- ============================================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_number text not null,

  first_name text,
  last_name text,
  full_name text not null default '',
  email text not null default '',
  phone text not null,
  avatar_url text,

  gender text,
  marketing_consent boolean not null default false,
  status text not null default 'active',

  favorite_category text,
  favorite_brand text,
  favorite_color text,
  loyalty_points integer not null default 0,

  notes text not null default '',
  tags text[] not null default '{}',
  segments text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customers_number_unique unique (customer_number),
  constraint customers_status_valid check (status in ('active', 'inactive', 'blocked', 'pending', 'vip')),
  constraint customers_loyalty_points_non_negative check (loyalty_points >= 0)
);

create unique index customers_phone_normalized_idx on public.customers (regexp_replace(phone, '\D', '', 'g'));
create index customers_email_idx on public.customers (email);
create index customers_status_idx on public.customers (status);

create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

create policy "customers_select_admin" on public.customers for select to authenticated using (public.is_admin());
create policy "customers_insert_admin" on public.customers for insert to authenticated with check (public.is_admin());
create policy "customers_update_admin" on public.customers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "customers_delete_admin" on public.customers for delete to authenticated using (public.is_admin());

drop trigger if exists log_activity on public.customers;
create trigger log_activity
  after insert or update or delete on public.customers
  for each row execute function public.log_entity_activity('عميل', 'customer');

-- ─── customer_addresses ─────────────────────────────────────────────────────
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default '',
  full_name text,
  phone text,
  street text not null default '',
  apartment text,
  floor text,
  building text,
  area text,
  city text not null default '',
  postal_code text,
  country text not null default 'مصر',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index customer_addresses_customer_id_idx on public.customer_addresses (customer_id);

alter table public.customer_addresses enable row level security;

create policy "customer_addresses_all_admin" on public.customer_addresses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.customer_addresses;
create trigger log_activity
  after insert or update or delete on public.customer_addresses
  for each row execute function public.log_entity_activity('عنوان عميل', 'customer');

-- ─── customer_notes — internal admin notes, attributed to the writing admin ─
create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  admin_name text not null default '',
  text text not null,
  created_at timestamptz not null default now()
);

create index customer_notes_customer_id_idx on public.customer_notes (customer_id);

alter table public.customer_notes enable row level security;

create policy "customer_notes_all_admin" on public.customer_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.customer_notes;
create trigger log_activity
  after insert or update or delete on public.customer_notes
  for each row execute function public.log_entity_activity('ملاحظة عميل', 'customer');

-- ─── orders.customer_ref_id: was a loose text field (no customers table
-- existed yet to reference); now that one does, make it a real FK. Safe to
-- retype in place — no production orders predate this migration.
alter table public.orders alter column customer_ref_id type uuid using nullif(customer_ref_id, '')::uuid;
alter table public.orders add constraint orders_customer_ref_id_fkey foreign key (customer_ref_id) references public.customers(id) on delete set null;
create index orders_customer_ref_id_idx on public.orders (customer_ref_id);

-- ─── auto-derive: every order upserts a matching customer by phone ─────────
create sequence public.customers_number_seq;

create or replace function public.sync_customer_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_normalized_phone text := regexp_replace(new.phone, '\D', '', 'g');
begin
  if v_normalized_phone = '' then
    return new;
  end if;

  select id into v_customer_id
    from public.customers
    where regexp_replace(phone, '\D', '', 'g') = v_normalized_phone
    limit 1;

  if v_customer_id is null then
    insert into public.customers (customer_number, full_name, email, phone, status)
    values (
      'CUS-' || lpad(nextval('public.customers_number_seq')::text, 6, '0'),
      coalesce(new.customer_name, ''),
      coalesce(new.customer_email, ''),
      new.phone,
      'active'
    )
    returning id into v_customer_id;
  else
    -- Keep name/email reasonably current without clobbering admin-edited fields
    -- with blanks — only fill in what the order actually has.
    update public.customers
    set full_name = case when coalesce(new.customer_name, '') <> '' then new.customer_name else full_name end,
        email = case when coalesce(new.customer_email, '') <> '' then new.customer_email else email end
    where id = v_customer_id;
  end if;

  new.customer_ref_id := v_customer_id;
  return new;
end;
$$;

-- BEFORE INSERT (not AFTER): sets NEW.customer_ref_id directly on the row
-- being inserted, instead of a follow-up UPDATE — an AFTER-insert UPDATE
-- would spuriously re-fire log_order_activity/broadcast_order_change right
-- after every single order is created.
drop trigger if exists sync_customer_from_order on public.orders;
create trigger sync_customer_from_order
  before insert on public.orders
  for each row execute function public.sync_customer_from_order();

-- ─── live stats — no stored cache, computed on demand ──────────────────────
create or replace function public.get_customer_stats(p_customer_id uuid)
returns table (
  total_orders bigint,
  cancelled_orders bigint,
  returned_orders bigint,
  total_spent numeric,
  average_order_value numeric,
  coupons_used bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    count(*) filter (where o.status <> 'cancelled'),
    count(*) filter (where o.status = 'cancelled'),
    count(*) filter (where o.status = 'returned'),
    coalesce(sum(o.total) filter (where o.status not in ('cancelled')), 0),
    coalesce(avg(o.total) filter (where o.status not in ('cancelled')), 0),
    count(distinct o.coupon_code) filter (where o.coupon_code is not null)
  from public.orders o
  where o.customer_ref_id = p_customer_id;
$$;

grant execute on function public.get_customer_stats(uuid) to authenticated;
