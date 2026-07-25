-- ============================================================================
-- Business module — suppliers, purchase_orders, expenses, assets,
-- liabilities, capital. Replaces src/data/mock/business.ts (mockStorage) and
-- the "MockBusinessRepository" class in business.service.ts wholesale — this
-- was the single largest remaining mock-data surface in the app, sitting
-- behind the same real admin-auth gate as every genuinely-migrated module.
--
-- All six tables are admin-only in every direction — this is internal
-- financial/procurement data, never customer- or guest-facing.
-- ============================================================================

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supplier_code text not null,
  contact_name text not null default '',
  contact_person text,
  email text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  country text not null default '',
  city text not null default '',
  address text not null default '',
  tax_number text not null default '',
  commercial_registration text not null default '',
  payment_terms text not null default '',
  currency text not null default 'EGP',
  materials_provided text[] not null default '{}',
  status text not null default 'active',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint suppliers_code_unique unique (supplier_code),
  constraint suppliers_status_valid check (status in ('active', 'inactive'))
);

create index suppliers_status_idx on public.suppliers (status);

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;
create policy "suppliers_all_admin" on public.suppliers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.suppliers;
create trigger log_activity
  after insert or update or delete on public.suppliers
  for each row execute function public.log_entity_activity('مورد', 'system');


-- ─── purchase_orders ────────────────────────────────────────────────────────
-- `items` stays a jsonb array (mirrors the mock shape exactly: productId,
-- name, quantity, unitCost, total, receivedQty per line) rather than a
-- separate line-items table — receivePurchaseOrder() only ever reads/writes
-- the whole array at once, there's no independent query need per line.
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  reference text not null,
  date timestamptz not null default now(),
  expected_arrival timestamptz,
  received_date timestamptz,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  shipping numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'draft',
  payment_status text not null default 'unpaid',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_orders_status_valid check (status in ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  constraint purchase_orders_payment_status_valid check (payment_status in ('unpaid', 'partial', 'paid'))
);

create index purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);
create index purchase_orders_status_idx on public.purchase_orders (status);

create trigger set_purchase_orders_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

alter table public.purchase_orders enable row level security;
create policy "purchase_orders_all_admin" on public.purchase_orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.purchase_orders;
create trigger log_activity
  after insert or update or delete on public.purchase_orders
  for each row execute function public.log_entity_activity('أمر شراء', 'system');


-- ─── expenses ───────────────────────────────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'other',
  amount numeric(12, 2) not null default 0,
  currency text not null default 'EGP',
  date timestamptz not null default now(),
  payment_method text not null default '',
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text,
  notes text,
  receipt text,
  reference_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint expenses_status_valid check (status in ('paid', 'pending', 'cancelled'))
);

create index expenses_category_idx on public.expenses (category);
create index expenses_status_idx on public.expenses (status);
create index expenses_supplier_id_idx on public.expenses (supplier_id);

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;
create policy "expenses_all_admin" on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.expenses;
create trigger log_activity
  after insert or update or delete on public.expenses
  for each row execute function public.log_entity_activity('مصروف', 'system');


-- ─── assets ─────────────────────────────────────────────────────────────────
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other',
  purchase_date timestamptz not null default now(),
  purchase_value numeric(12, 2),
  current_value numeric(12, 2) not null default 0,
  depreciation numeric(12, 2),
  depreciation_rate numeric(5, 2),
  status text not null default 'active',
  documents text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assets_status_valid check (status in ('active', 'sold', 'written_off'))
);

create index assets_status_idx on public.assets (status);

create trigger set_assets_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

alter table public.assets enable row level security;
create policy "assets_all_admin" on public.assets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.assets;
create trigger log_activity
  after insert or update or delete on public.assets
  for each row execute function public.log_entity_activity('أصل', 'system');


-- ─── liabilities ────────────────────────────────────────────────────────────
create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other',
  supplier_id uuid references public.suppliers(id) on delete set null,
  amount numeric(12, 2) not null default 0,
  due_date timestamptz not null default now(),
  status text not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint liabilities_status_valid check (status in ('unpaid', 'partial', 'paid'))
);

create index liabilities_status_idx on public.liabilities (status);
create index liabilities_supplier_id_idx on public.liabilities (supplier_id);

create trigger set_liabilities_updated_at
  before update on public.liabilities
  for each row execute function public.set_updated_at();

alter table public.liabilities enable row level security;
create policy "liabilities_all_admin" on public.liabilities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.liabilities;
create trigger log_activity
  after insert or update or delete on public.liabilities
  for each row execute function public.log_entity_activity('التزام مالي', 'system');


-- ─── capital ────────────────────────────────────────────────────────────────
create table public.capital (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  owner text not null default '',
  amount numeric(12, 2) not null default 0,
  reason text,
  date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint capital_type_valid check (type in ('increase', 'withdrawal'))
);

create trigger set_capital_updated_at
  before update on public.capital
  for each row execute function public.set_updated_at();

alter table public.capital enable row level security;
create policy "capital_all_admin" on public.capital for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.capital;
create trigger log_activity
  after insert or update or delete on public.capital
  for each row execute function public.log_entity_activity('رأس المال', 'system');
