  -- ============================================================================
  -- coupons — Phase B additive columns
  --
  -- Brings `coupons` up to parity with the mock `Coupon` model. Purely
  -- additive: existing columns, indexes, RLS policies, and constraints from
  -- 20260714120009 are untouched. Same pattern as
  -- 20260714120018_products_categories_phase_a_columns.sql.
  -- ============================================================================

  -- The mock model has a third coupon type — 'shipping' (free-shipping, always
  -- a $0 line discount, applied separately at checkout) — that the original
  -- enum didn't cover.
  alter type public.coupon_type add value if not exists 'shipping';

  -- A 'shipping' coupon's `value` is unused by the discount calculation (always
  -- a $0 line item — see coupon.service.ts's calculateDiscount) and the admin
  -- form may leave it at 0; the original `value > 0` check only made sense for
  -- percentage/fixed coupons.
  alter table public.coupons drop constraint coupons_value_positive;
  alter table public.coupons add constraint coupons_value_non_negative check (value >= 0);

  alter table public.coupons
    add column description text not null default '',
    -- The mock model distinguishes disabled (temporarily off) from archived
    -- (retired), which a single `is_active` boolean can't express. Add the
    -- richer status and keep `is_active` in sync via trigger, so
    -- `validate_coupon`'s `is_active = true` check (20260714120009) and the
    -- existing admin RLS policies need no changes.
    add column status text not null default 'active',
    add column included_categories uuid[] not null default '{}',
    add column excluded_categories uuid[] not null default '{}',
    add column included_products uuid[] not null default '{}',
    add column excluded_products uuid[] not null default '{}';

  alter table public.coupons
    add constraint coupons_status_valid check (status in ('active', 'disabled', 'archived'));

  create or replace function public.sync_coupons_is_active()
  returns trigger
  language plpgsql
  as $$
  begin
    new.is_active = (new.status = 'active');
    return new;
  end;
  $$;

  create trigger sync_coupons_is_active_trigger
    before insert or update of status on public.coupons
    for each row execute function public.sync_coupons_is_active();

  -- Checkout-safe usage-increment: guests (anon) redeem coupons during
  -- checkout but have no update grant on `coupons` (admin-only per
  -- 20260714120009's RLS). Mirrors `validate_coupon`'s security-definer
  -- pattern — the only mutation surface exposed is "count one redemption",
  -- auto-disabling the coupon once its usage_limit is reached (mirrors the
  -- mock's `incrementUsage` behavior).
  --
  -- Requires the caller to name a real order that actually references this
  -- code — otherwise granting `anon` execute on a bare "increment by code"
  -- function would let anyone spam it to exhaust/disable someone else's
  -- coupon without ever placing an order. Tying it to an order id (only
  -- learned by successfully creating one via create_guest_order) makes each
  -- call cost a real order, same trust model as the guest-order lookups above.
  drop function if exists public.increment_coupon_usage(text);

  create or replace function public.increment_coupon_usage(p_code text, p_order_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_id uuid;
    v_usage_count integer;
    v_usage_limit integer;
  begin
    if not exists (
      select 1 from public.orders
      where id = p_order_id and user_id is null and coupon_code = p_code
    ) then
      return;
    end if;

    update public.coupons
    set usage_count = usage_count + 1
    where code = p_code
    returning id, usage_count, usage_limit into v_id, v_usage_count, v_usage_limit;

    if v_id is not null and v_usage_limit is not null and v_usage_count >= v_usage_limit then
      update public.coupons set status = 'disabled' where id = v_id;
    end if;
  end;
  $$;

  grant execute on function public.increment_coupon_usage(text, uuid) to anon, authenticated;
