# Pre-Deploy Checklist — Supabase Production Readiness

Companion to `docs/migration/supabase-migration-verification-report.md` (full
audit details/evidence live there). This file is the actionable checklist to
run through before deploying or running `supabase db push`.

## 1. SQL files that must run, in order

No manual/ad-hoc SQL is required — every fix from this audit is a proper
migration file. Run the standard migration pipeline; Supabase applies files in
filename order automatically. The only file that didn't exist before this
audit is the last one:

1. `20260714120001` … `20260715000018` — unchanged (already existed), except:
   - `20260715000011_dashboard_notifications_completion.sql` — **edited**
     (removed a dead `grant execute on function public.get_latest_customers(int)`
     that referenced a function never created anywhere; would have aborted
     `db push` on a fresh database)
   - `20260715000012_analytics_top_products.sql` — **edited** (stale comment
     cleanup only, no SQL behavior change)
2. `20260715000019_missing_table_grants.sql` — **new**. Grants table-level
   `SELECT`/`INSERT`/`UPDATE`/`DELETE` (matching each table's existing RLS
   policies exactly) on 21 tables that had correct RLS but no grant at all:
   `activity_log`, `customers`, `customer_addresses`, `customer_notes`,
   `brands`, `collections`, `journal_articles`, `suppliers`,
   `purchase_orders`, `expenses`, `assets`, `liabilities`, `capital`,
   `seo_settings`, `website_store_info`, `banners`, `nav_menus`,
   `footer_settings`, `appearance_settings`, `content_blocks`,
   `homepage_sections`, `customer_notifications`. Without this migration,
   every one of these tables returns `permission denied for table X` to real
   app traffic despite having correct RLS.

## 2. Files regenerated/edited outside `supabase/migrations/`

| File | What changed |
|---|---|
| `src/lib/supabase/database.types.ts` | Added missing `orders.coupon_usage_counted: boolean` to `Row`/`Insert`/`Update` (column existed in the DB since `20260715000007` but was absent from the hand-written type). |
| `src/app/checkout/page.tsx` | Comment-only fix (stale "persists in mockStorage" → "persists in Supabase"). |
| `src/components/admin/design-system/KpiCard.tsx` | Removed the `Math.random()`-driven fake sparkline. |
| `src/app/admin/(dashboard)/page.tsx` | Replaced 4 fabricated KPI trend percentages with honest neutral labels. |
| `src/app/admin/(dashboard)/business/page.tsx` | Replaced 7 fabricated KPI trend percentages with honest neutral labels; fixed invalid `accentColor` values. |

## 3. Commands to run, and whether each is required

| Command | Required? | Why |
|---|---|---|
| `supabase db push` | **Yes** | Applies the edited `20260715000011` and the new `20260715000019` to the target database. Without this, the dead-grant bug and the 21-table permission gap are still live on whatever database you deploy against. |
| `supabase gen types typescript --linked > src/lib/supabase/database.types.ts` | **Yes, after `db push`** | `database.types.ts` is hand-written (per the original ask) and was just manually patched for one missing column. Regenerating from the real post-push schema is the authoritative way to confirm the manual patch was correct and to catch anything this audit's spot-checks didn't cover. If regeneration reformats the file heavily, diff it against the hand-written version to confirm no columns are lost (some hand-added comments/organization may not survive regeneration — that's fine, only column/type fidelity matters). |
| `npm run lint` | **Yes** | Standard gate; also verify it actually surfaces errors — `next.config.js` was flagged in prior audits as suppressing build errors, so lint should not be treated as passing just because `npm run build` is green. |
| `npm run build` | **Yes** | Confirms the `KpiCard`/dashboard/business page edits compile — `MiniSparkline`'s removal changes `KpiCard`'s internal render but not its public props, so no caller changes were needed, but this should still be verified with a real build rather than assumed. |

## 4. Not required, but recommended follow-up (non-blocking)

Real month-over-month trend calculations for completed-orders, inventory
value, net profit, total expenses, cash flow, assets, and liabilities don't
exist yet — no RPC computes a prior-period comparison for any of them (only
revenue has one, `get_revenue_summary`/`get_revenue_series`). This audit
removed the fabricated percentages rather than invent new backend
infrastructure in the same pass. Building real ones would mean new RPCs
following the `get_revenue_summary` pattern (current period vs. prior period,
`is_admin()`-gated). Not a deploy blocker — showing no trend is honest; the
fabricated numbers being removed were the actual bug.

## 5. SAFE TO DEPLOY = YES

Reasons:

- Both defects that would have broken a fresh `supabase db push` or silently
  broken 21 tables' worth of admin features (dead function grant; missing
  table grants under otherwise-correct RLS) are fixed, each in a proper
  migration file — nothing ad-hoc, nothing that skips the migration history.
- Every migration from `20260715000009` onward was individually checked for
  function-before-trigger/grant ordering, duplicate triggers/policies/grants,
  and FK/table ordering — no other defect found (see the verification report
  §3 for the per-file verdict table).
- `database.types.ts` was cross-checked table-by-table, enum-by-enum,
  function-by-function against the migrations; one real gap
  (`orders.coupon_usage_counted`) found and fixed, nothing else.
- The mock-to-Supabase migration is complete: no `mockStorage.ts` exists in
  the repo, and the two services named in the original ask
  (`profile.service.ts`, `customer-notification.service.ts`) were already
  fully migrated in `20260715000018`, before this audit began.
- The fabricated KPI sparkline/trend data has been removed rather than left
  in place — a correctness/trust issue on an admin financial dashboard, now
  fixed by presenting honest, backed-by-real-data numbers instead of random
  or hardcoded ones.

Condition: this verdict assumes §3's four commands are actually run, in
order, before the deploy — the fixes exist as code/migration changes right
now, but nothing has been pushed to a live database yet.
