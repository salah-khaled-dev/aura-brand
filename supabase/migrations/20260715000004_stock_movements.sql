-- ============================================================================
-- stock_movements — inventory ledger backing InventoryService
--
-- Migrates the Inventory module off mockProducts/localStorage now that
-- Products and Product Variants are Supabase-backed (the admin Inventory UI
-- was passing real Supabase product ids into a service that only understood
-- mock ids). Stock movements are an append-only audit trail; the
-- authoritative stock number stays on `products.stock` (single implicit
-- warehouse, same as the mock model) and, when a movement names a variant,
-- `product_variants.stock` is kept in sync alongside it.
--
-- All writes go through the three SECURITY DEFINER RPCs below rather than
-- direct table INSERT/UPDATE/DELETE: recording a movement has to read the
-- current stock, clamp the new balance at zero, and write both
-- `products.stock` and the ledger row atomically (with a row lock to stay
-- correct under concurrent admin edits), which PostgREST can't do as a
-- single request. Same pattern as `increment_coupon_usage`
-- (20260714120023) and `create_guest_order` (20260714120022). Admin-only
-- table policies are granted too (mirrors `media`'s admin-only shape, see
-- 20260714120019) in case of direct table access later — the RPCs do their
-- own `is_admin()` check since SECURITY DEFINER bypasses RLS.
-- ============================================================================

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  type text not null,
  -- Signed delta actually applied to stock (balance_after - balance_before).
  -- Can differ from the caller's requested quantity when clamping at zero.
  quantity integer not null,
  balance_before integer not null,
  balance_after integer not null,
  reason text not null default '',
  reference_type text,
  reference_id text,
  warehouse_id text not null default 'wh_main',
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint stock_movements_type_valid check (
    type in ('receive', 'deduct', 'return', 'transfer_in', 'transfer_out', 'adjustment')
  ),
  constraint stock_movements_reference_type_valid check (
    reference_type is null or reference_type in ('purchase_receipt', 'order', 'return', 'transfer', 'adjustment', 'initial')
  ),
  constraint stock_movements_balance_non_negative check (balance_before >= 0 and balance_after >= 0)
);

create index stock_movements_product_id_idx on public.stock_movements (product_id);
create index stock_movements_variant_id_idx on public.stock_movements (variant_id);
create index stock_movements_created_at_idx on public.stock_movements (created_at desc);
create index stock_movements_reference_idx on public.stock_movements (reference_type, reference_id);

alter table public.stock_movements enable row level security;

create policy "stock_movements_select_admin"
  on public.stock_movements for select
  to authenticated
  using (public.is_admin());

create policy "stock_movements_insert_admin"
  on public.stock_movements for insert
  to authenticated
  with check (public.is_admin());

create policy "stock_movements_update_admin"
  on public.stock_movements for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "stock_movements_delete_admin"
  on public.stock_movements for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on table public.stock_movements to authenticated;
grant all on table public.stock_movements to service_role;

-- ---------------------------------------------------------------------------
-- record_stock_movement — atomic "apply signed delta + write ledger row".
-- Mirrors the mock's recordMovement: the recorded quantity is the *clamped*
-- delta (balance_after - balance_before), which differs from p_quantity only
-- when the raw delta would have taken stock below zero.
-- ---------------------------------------------------------------------------
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_variant_id uuid,
  p_type text,
  p_quantity integer,
  p_reason text,
  p_reference_type text,
  p_reference_id text,
  p_warehouse_id text
)
returns table (
  id uuid,
  product_id uuid,
  variant_id uuid,
  type text,
  quantity integer,
  balance_before integer,
  balance_after integer,
  reason text,
  reference_type text,
  reference_id text,
  warehouse_id text,
  admin_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_before integer;
  v_balance_after integer;
  v_reference_type text;
begin
  if not public.is_admin() then
    raise exception 'access denied';
  end if;

  select p.stock into v_balance_before
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  v_balance_after := greatest(0, v_balance_before + p_quantity);

  update public.products set stock = v_balance_after where id = p_product_id;

  if p_variant_id is not null then
    update public.product_variants
    set stock = greatest(0, stock + p_quantity)
    where id = p_variant_id and product_id = p_product_id;
  end if;

  v_reference_type := coalesce(p_reference_type, case when p_type = 'adjustment' then 'adjustment' else null end);

  return query
    insert into public.stock_movements as m (
      product_id, variant_id, type, quantity, balance_before, balance_after,
      reason, reference_type, reference_id, warehouse_id, admin_id
    )
    values (
      p_product_id, p_variant_id, p_type, v_balance_after - v_balance_before, v_balance_before, v_balance_after,
      coalesce(p_reason, ''), v_reference_type, p_reference_id, coalesce(p_warehouse_id, 'wh_main'), auth.uid()
    )
    returning m.id, m.product_id, m.variant_id, m.type, m.quantity, m.balance_before, m.balance_after,
      m.reason, m.reference_type, m.reference_id, m.warehouse_id, m.admin_id, m.created_at;
end;
$$;

grant execute on function public.record_stock_movement(uuid, uuid, text, integer, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- update_stock_movement — edits a ledger row's quantity/reason and
-- re-applies the *difference* to the product's current stock (mirrors the
-- mock's updateMovement). Not restricted to 'adjustment' rows, matching the
-- mock — the admin UI only exposes editing for adjustments, but the API
-- doesn't enforce that restriction either. NULL for p_quantity/p_reason
-- means "leave unchanged".
-- ---------------------------------------------------------------------------
create or replace function public.update_stock_movement(
  p_movement_id uuid,
  p_quantity integer,
  p_reason text
)
returns table (
  id uuid,
  product_id uuid,
  variant_id uuid,
  type text,
  quantity integer,
  balance_before integer,
  balance_after integer,
  reason text,
  reference_type text,
  reference_id text,
  warehouse_id text,
  admin_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.stock_movements%rowtype;
  v_new_quantity integer;
  v_diff integer;
  v_product_stock integer;
begin
  if not public.is_admin() then
    raise exception 'access denied';
  end if;

  select * into v_movement from public.stock_movements where id = p_movement_id for update;
  if not found then
    raise exception 'Movement not found';
  end if;

  v_new_quantity := coalesce(p_quantity, v_movement.quantity);
  v_diff := v_new_quantity - v_movement.quantity;

  select p.stock into v_product_stock from public.products p where p.id = v_movement.product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  update public.products set stock = greatest(0, v_product_stock + v_diff) where id = v_movement.product_id;

  update public.stock_movements m
  set quantity = v_new_quantity,
      reason = coalesce(p_reason, m.reason),
      balance_after = greatest(0, m.balance_before + v_new_quantity)
  where m.id = p_movement_id;

  return query
    select m.id, m.product_id, m.variant_id, m.type, m.quantity, m.balance_before, m.balance_after,
      m.reason, m.reference_type, m.reference_id, m.warehouse_id, m.admin_id, m.created_at
    from public.stock_movements m
    where m.id = p_movement_id;
end;
$$;

grant execute on function public.update_stock_movement(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_stock_movement — reverses a manual adjustment's stock effect and
-- removes the ledger row. Mirrors the mock: only 'adjustment' movements are
-- deletable; system movements (orders, receipts) are immutable and must be
-- reversed through their owning module.
-- ---------------------------------------------------------------------------
create or replace function public.delete_stock_movement(p_movement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement public.stock_movements%rowtype;
  v_product_stock integer;
begin
  if not public.is_admin() then
    raise exception 'access denied';
  end if;

  select * into v_movement from public.stock_movements where id = p_movement_id for update;
  if not found then
    raise exception 'Movement not found';
  end if;

  if v_movement.type != 'adjustment' then
    raise exception 'Only manual adjustments can be deleted';
  end if;

  select p.stock into v_product_stock from public.products p where p.id = v_movement.product_id for update;
  if found then
    update public.products
    set stock = greatest(0, v_product_stock - v_movement.quantity)
    where id = v_movement.product_id;
  end if;

  delete from public.stock_movements where id = p_movement_id;
end;
$$;

grant execute on function public.delete_stock_movement(uuid) to authenticated;
