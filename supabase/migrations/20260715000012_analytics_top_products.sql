-- ============================================================================
-- get_top_products / get_customer_growth — last piece analytics.service.ts
-- needs to stop returning hardcoded zeros. Complements get_revenue_summary/
-- get_revenue_series from 20260715000011.
--
-- "Top products" and revenue growth are both revenue-recognition metrics, so
-- they follow the same convention already established by get_revenue_summary:
-- only `delivered` orders count.
-- ============================================================================

create or replace function public.get_top_products(p_limit int default 5)
returns table (
  product_id uuid,
  name text,
  image text,
  sales bigint,
  revenue numeric
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    oi.product_id,
    (array_agg(oi.product_name order by oi.created_at desc))[1] as name,
    (array_agg(oi.image_url order by oi.created_at desc))[1] as image,
    sum(oi.quantity)::bigint as sales,
    sum(oi.total_price) as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status = 'delivered' and oi.product_id is not null
  group by oi.product_id
  order by sum(oi.total_price) desc
  limit p_limit;
end;
$$;

grant execute on function public.get_top_products(int) to authenticated;

-- Customer count now vs. the prior 30-day window, for the analytics summary's growth %.
create or replace function public.get_customer_growth()
returns table (total_customers bigint, new_this_month bigint, new_last_month bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.customers)::bigint,
    (select count(*) from public.customers where created_at >= date_trunc('month', now()))::bigint,
    (select count(*) from public.customers
       where created_at >= date_trunc('month', now()) - interval '1 month'
         and created_at < date_trunc('month', now()))::bigint;
end;
$$;

grant execute on function public.get_customer_growth() to authenticated;
