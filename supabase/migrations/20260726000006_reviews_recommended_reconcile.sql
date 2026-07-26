-- ============================================================================
-- Reconciles the live `reviews` schema with the final version of
-- 20260726000004_review_order_verification.sql.
--
-- That migration file was edited in place after an earlier draft (with
-- quality_rating/shipping_rating star ratings) had already been applied to
-- this project — editing a migration file on disk doesn't retroactively
-- re-apply it, so the live schema was left on the old draft: missing the
-- `recommended` yes/no column the review form actually collects, still
-- carrying the now-unused quality_rating/shipping_rating columns, and
-- get_product_review_stats still returning average_quality/average_shipping
-- instead of pct_recommended. `reviews` has zero rows at the time of writing,
-- so dropping the two unused columns loses nothing.
-- ============================================================================

alter table public.reviews
  add column if not exists recommended boolean;

alter table public.reviews
  drop column if exists quality_rating,
  drop column if exists shipping_rating;

grant select (recommended) on table public.reviews to anon;

drop function if exists public.get_product_review_stats(uuid);

create or replace function public.get_product_review_stats(p_product_id uuid)
returns table (
  average_rating numeric,
  review_count int,
  pct_true_to_size numeric,
  pct_runs_small numeric,
  pct_runs_large numeric,
  pct_recommended numeric
)
language sql
stable
set search_path = public
as $$
  select
    round(avg(rating)::numeric, 1) as average_rating,
    count(*)::int as review_count,
    round(100.0 * count(*) filter (where size_fit = 'true_to_size') / nullif(count(*) filter (where size_fit is not null), 0), 0) as pct_true_to_size,
    round(100.0 * count(*) filter (where size_fit = 'runs_small') / nullif(count(*) filter (where size_fit is not null), 0), 0) as pct_runs_small,
    round(100.0 * count(*) filter (where size_fit = 'runs_large') / nullif(count(*) filter (where size_fit is not null), 0), 0) as pct_runs_large,
    round(100.0 * count(*) filter (where recommended = true) / nullif(count(*) filter (where recommended is not null), 0), 0) as pct_recommended
  from public.reviews
  where product_id = p_product_id and status = 'approved';
$$;

grant execute on function public.get_product_review_stats(uuid) to anon, authenticated;
