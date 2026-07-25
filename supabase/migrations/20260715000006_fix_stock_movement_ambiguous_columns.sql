-- ============================================================================
-- fix_stock_movement_ambiguous_columns — resolve PostgREST 42702
-- (ambiguous_column) errors raised by record_stock_movement and
-- update_stock_movement.
--
-- Root cause: both functions declare `returns table (id uuid, product_id
-- uuid, ...)`. In PL/pgSQL, RETURNS TABLE columns become implicit OUT
-- parameters that stay in scope as bare identifiers for the entire function
-- body. Several UPDATE/SELECT statements referenced `id` / `product_id`
-- without a table alias, which Postgres can't resolve between the OUT
-- parameter and the table column, so it raises 42702 instead of guessing.
--
-- delete_stock_movement returns void (no OUT params) and was never
-- ambiguous, so it is intentionally left unchanged.
--
-- Same signatures, same return shape, same grants — only the internal
-- column references are qualified with table aliases.
-- ============================================================================

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

  update public.products pr set stock = v_balance_after where pr.id = p_product_id;

  if p_variant_id is not null then
    update public.product_variants pv
    set stock = greatest(0, pv.stock + p_quantity)
    where pv.id = p_variant_id and pv.product_id = p_product_id;
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

  select * into v_movement from public.stock_movements sm where sm.id = p_movement_id for update;
  if not found then
    raise exception 'Movement not found';
  end if;

  v_new_quantity := coalesce(p_quantity, v_movement.quantity);
  v_diff := v_new_quantity - v_movement.quantity;

  select p.stock into v_product_stock from public.products p where p.id = v_movement.product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  update public.products pr set stock = greatest(0, v_product_stock + v_diff) where pr.id = v_movement.product_id;

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
