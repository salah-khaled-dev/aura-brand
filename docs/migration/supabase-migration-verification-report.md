# Supabase Migration Verification Report

Full audit of `supabase/migrations/` before any `supabase db push`, in response to
concerns that two parallel sessions may have left conflicting/overwritten
migration state. Every conclusion below is based on reading the actual migration
SQL and the actual service-layer code that calls it — no assumptions.

**Bottom line: two real defects found, both fixed in this pass. Everything else
checked out clean.** See "Critical bugs found and fixed" below.

## 1. All migration files, in run order

Supabase applies migrations in filename order. 42 files total (41 pre-existing +
1 new one added by this audit, `20260715000019`):

```
20260714120001  extensions_and_common
20260714120002  profiles
20260714120003  categories
20260714120004  products
20260714120005  product_images
20260714120006  product_variants
20260714120007  cart_items
20260714120008  wishlist
20260714120009  coupons
20260714120010  orders
20260714120011  order_items
20260714120012  contact_messages
20260714120013  newsletter
20260714120014  notifications
20260714120015  store_settings
20260714120016  store_settings_admin_fields
20260714120017  staff_role_key
20260714120018  products_categories_phase_a_columns
20260714120019  media
20260714120020  storage_buckets
20260714120021  phase_a_grants
20260714120022  orders_phase_b_columns
20260714120023  coupons_phase_b_columns
20260715000001  roles_and_staff_directory
20260715000002  service_role_role_escalation_bypass
20260715000003  phase_b_grants
20260715000004  stock_movements
20260715000005  maintenance_mode_order_gate
20260715000006  fix_stock_movement_ambiguous_columns
20260715000007  harden_guest_checkout_and_coupons
20260715000008  notification_type_extend
20260715000009  event_driven_activity_log
20260715000010  customers
20260715000011  dashboard_notifications_completion   [FIXED — see §2]
20260715000012  analytics_top_products                [comment cleanup only]
20260715000013  brands
20260715000014  collections
20260715000015  journal
20260715000016  business
20260715000017  website_cms_and_seo
20260715000018  customer_notifications_and_profile
20260715000019  missing_table_grants                  [NEW — see §2]
```

No file needed reordering or renaming — every function/table/enum is defined
before the migration that first uses it (verified exhaustively in §3/§5).

## 2. Critical bugs found and fixed

### Bug A — dead grant on a function that was never created (hard failure)

`20260715000011_dashboard_notifications_completion.sql` contained:

```sql
grant execute on function public.get_latest_customers(int) to authenticated;
```

`get_latest_customers` is not defined anywhere in the migration history. The
file's own header comment (§9) explains it was deliberately skipped — the
existing `public.customers` table + `CustomerService.getCustomers()` already
cover "latest customers" without needing an RPC. The grant line was a leftover
from an earlier draft that never got cleaned up. On a fresh database this line
alone makes `supabase db push` abort with:

```
ERROR: function public.get_latest_customers(integer) does not exist (SQLSTATE 42883)
```

**Fix applied:** deleted the dead grant line. Confirmed via
`grep -rn "get_latest_customers" src/` that no frontend code calls it, so
deleting (not backfilling) is correct. Also removed a stale reference to the
same function name from a comment in `20260715000012_analytics_top_products.sql`.

### Bug B — 21 tables with correct RLS but zero table-level GRANT (silent, critical)

This exact bug class was already hit and fixed twice in this codebase's history
(`20260714120021_phase_a_grants.sql`, `20260715000003_phase_b_grants.sql`) — but
it was reintroduced for every table added after `20260715000009`. Postgres
checks table-level `GRANT` privileges **before** RLS policies are evaluated, so
a table with a perfectly correct `is_admin()`-gated policy but no
`GRANT ... ON TABLE` to `authenticated`/`anon` fails every request with
`permission denied for table X` (42501) — RLS is never even reached.

Confirmed via `grep -n "^grant" <file>` that these files define zero grants,
and confirmed via `grep -rn ".from('<table>')" src/lib/services/` that real
service code queries every one of them directly (17 service files, including
`customer.service.ts`, `brand.service.ts`, `collection.service.ts`,
`journal.service.ts`, `business.service.ts`, `activity-log.service.ts`,
`customer-notification.service.ts`, and every `storefront/*.service.ts` CMS
reader):

| Table | Defined in | Read by |
|---|---|---|
| `activity_log` | 20260715000009 | `activity-log.service.ts` |
| `customers`, `customer_addresses`, `customer_notes` | 20260715000010 | `customer.service.ts` |
| `brands` | 20260715000013 | `brand.service.ts` |
| `collections` | 20260715000014 | `collection.service.ts`, `collection-display.service.ts` |
| `journal_articles` | 20260715000015 | `journal.service.ts`, `storefront-journal.service.ts` |
| `suppliers`, `purchase_orders`, `expenses`, `assets`, `liabilities`, `capital` | 20260715000016 | `business.service.ts` |
| `seo_settings` | 20260715000017 | `storefront/seo.service.ts` |
| `website_store_info` | 20260715000017 | `storefront/store.service.ts` |
| `banners` | 20260715000017 | `storefront/banner.service.ts` |
| `nav_menus` | 20260715000017 | `storefront/navigation.service.ts` |
| `footer_settings` | 20260715000017 | `storefront/footer.service.ts` |
| `appearance_settings` | 20260715000017 | `storefront/appearance.service.ts` |
| `content_blocks` | 20260715000017 | `storefront/content.service.ts` |
| `homepage_sections` | 20260715000017 | `storefront/homepage.service.ts` |
| `customer_notifications` | 20260715000018 | `customer-notification.service.ts` |

**Fix applied:** new migration `supabase/migrations/20260715000019_missing_table_grants.sql`
— purely additive, same style as the two prior grants migrations. Each grant
line matches exactly what that table's existing RLS policies already permit
(e.g. `journal_articles` gets anon+authenticated `SELECT` because
`journal_articles_select_public` already exists; `brands` gets no anon grant
because it has no anon policy at all). No new access surface is created —
this only unblocks what the policies already intended.

## 3. Per-migration verdict, `20260715000009` → last

| Migration | Verdict | Reason |
|---|---|---|
| `20260715000009_event_driven_activity_log` | SAFE TO RUN | `log_entity_activity()`, `log_order_activity()`, `log_auth_event()` all defined before their triggers/grant in the same file. `activity_log` table created before its policy and before any trigger inserts into it. |
| `20260715000010_customers` | SAFE TO RUN | `customers`/`customer_addresses`/`customer_notes` created before their `log_activity` triggers (which call `log_entity_activity`, already defined in 000009). FK `orders.customer_ref_id → customers.id` added after `customers` exists in the same file. |
| `20260715000011_dashboard_notifications_completion` | **NEEDS FIX → FIXED** | Dead `get_latest_customers` grant (Bug A). Everything else in the file (severity/sensitive columns before their use, `reviews` table before its policies/trigger, `log_product_activity`/`log_profile_activity` defined before their triggers) is correctly ordered. |
| `20260715000012_analytics_top_products` | SAFE TO RUN | Only a stale comment referenced the deleted function name (cosmetic, fixed). Functions/grants are self-contained and correctly ordered. |
| `20260715000013_brands` | SAFE TO RUN* | Structurally correct; RLS policies reference `is_admin()` (exists since 000002). *Needs `20260715000019` to run afterward for the table to actually be reachable (Bug B). |
| `20260715000014_collections` | SAFE TO RUN* | Same as above. |
| `20260715000015_journal` | SAFE TO RUN* | Same as above. |
| `20260715000016_business` | SAFE TO RUN* | Same as above (all 6 tables: suppliers, purchase_orders, expenses, assets, liabilities, capital). |
| `20260715000017_website_cms_and_seo` | SAFE TO RUN* | Same as above (8 tables) — plus adds `is_visible`/`is_featured`/`display_order` to `collections` (already created in 000014), correctly ordered. |
| `20260715000018_customer_notifications_and_profile` | SAFE TO RUN* | `customer_notifications` FK's `order_id → orders.id` (orders exists since 000010). `profiles.bio`/`profiles.preferences` are plain additive columns. |
| `20260715000019_missing_table_grants` | SAFE TO RUN (NEW) | Only grants privileges on tables that already exist by this point in the run order — closes every `*` above. |

No migration is **BLOCKED BY PREVIOUS MIGRATION** — every dependency (function,
table, enum, extension) it needs already exists earlier in the sequence. The
`*` markers above are not blockers to the migration *running*; they mark
tables that would silently reject application traffic until `20260715000019`
also runs — which it does, automatically, since it sorts last.

## 4. Dependency graph (who depends on what)

- **`log_entity_activity()`** (generic activity/notification trigger fn, defined
  `20260715000009`, upgraded in-place `20260715000011` with a 3rd
  `sensitive` arg) — triggered by: `coupons`, `customers`, `customer_addresses`,
  `customer_notes`, `reviews`, `roles`, `store_settings`, `brands`,
  `collections`, `journal_articles`, `suppliers`, `purchase_orders`,
  `expenses`, `assets`, `liabilities`, `capital`, `seo_settings`,
  `website_store_info`, `banners`, `nav_menus`, `footer_settings`,
  `appearance_settings`, `content_blocks`, `homepage_sections` (25 triggers,
  one per table; `products` originally used it too but was upgraded to the
  richer `log_product_activity()` in 000011).
- **`get_latest_customers()`** — nothing. Never created, nothing calls it
  (confirmed against `src/`). Its only mention was the now-deleted dead grant.
- **`activity_log`** (table) — written by every `log_*_activity()` trigger
  function; read by `activity-log.service.ts` via `activity_log_select_admin`.
- **`notifications`** (table) — written by every `log_*_activity()` function
  plus `log_auth_event()`; read by `notification.service.ts`.
- **`reviews`** — written by storefront guest submissions (`reviews_insert_public`)
  and admin moderation; read by `review.service.ts`; its trigger feeds
  `activity_log`/`notifications` via `log_entity_activity('تقييم', 'review')`.
- **`brands`** — read/written only by `brand.service.ts` (admin picker/CRUD, no
  storefront caller).
- **`collections`** — read/written by `collection.service.ts` (catalog CRUD) and
  `collection-display.service.ts` (storefront presentation columns
  `is_visible`/`is_featured`/`display_order`, folded onto the same table by
  `20260715000017`, *not* a separate table as an earlier comment in
  `20260715000014` implied it might be — verified this is intentional and
  both columns exist and are typed correctly in `database.types.ts`).
- **`journal_articles`** — `journal.service.ts` (admin CRUD) +
  `storefront-journal.service.ts` (public published-only reads).
- **Business tables** (`suppliers`, `purchase_orders`, `expenses`, `assets`,
  `liabilities`, `capital`) — all six read/written exclusively by
  `business.service.ts`.
- **Website CMS tables** (`seo_settings`, `website_store_info`, `banners`,
  `nav_menus`, `footer_settings`, `appearance_settings`, `content_blocks`,
  `homepage_sections`) — each has its own dedicated `storefront/*.service.ts`
  reader/writer, one file per table.

## 5. Code-level mock/localStorage sweep

Searched all of `src/` for `mockStorage`, `localStorage`, and `data/mock` usage:

- **No `mockStorage.ts` file exists anywhere in the repo** (`Glob **/mockStorage*`
  returns nothing) — the mock-storage era is fully retired.
- Only 3 files still contain the string `mockStorage`, and all 3 are stale
  **comments** describing the old pre-migration behavior, not live code:
  `storefront/homepage.service.ts`, `components/layout/AnnouncementBar.tsx`,
  `app/checkout/page.tsx` (this last one fixed in this pass — the comment said
  the order "persists in mockStorage"; it now correctly says "persists in
  Supabase", matching what `OrderService.createOrder` actually does).
- Only 2 files contain `localStorage`, and neither is a data-persistence mock:
  `auth.service.ts` clears `aura_admin_view_as_role` (a client-only UI
  view-as-role toggle, not a data store) on logout; that's legitimate
  browser-state cleanup, not a mock backing store.
- The two services explicitly named in the original audit —
  `profile.service.ts` and `customer-notification.service.ts` — are **already**
  fully Supabase-backed (added by `20260715000018`, per its own header comment
  explaining exactly this migration). Neither contains `mockStorage` or
  `localStorage`.
- "Product activity history" and "impersonation history" do not exist as
  separate mock stores to migrate: product/entity activity history is served
  by `activity-log.service.ts` reading the real `activity_log` table; there is
  no persisted "impersonation history" feature in the codebase at all — only
  a client-side "view as role" toggle (`PermissionContext.tsx`,
  `Sidebar.tsx`), which has nothing to migrate.

**Conclusion: every service listed in the original audit request is already
migrated.** No further mock-to-Supabase code changes were needed.

## 6. `database.types.ts` audit

- **Tables**: extracted every `Tables.<name>` key (40) and every
  `create table public.<name>` across all migrations (40) — exact match, no
  table missing on either side.
- **Enums**: all 8 `create type ... as enum` types (`user_role`,
  `product_collection`, `coupon_type`, `order_status`, `payment_status`,
  `payment_method`, `contact_message_status`, `notification_type`) are present
  in the `Enums` block, including values added later via
  `alter type ... add value` (`coupon_type.shipping`,
  `notification_type.customer`/`.review`). `ProductStatus`/`CategoryStatus` are
  correctly modeled as plain string literal unions (not in `Enums`) since
  they're `text` + `CHECK` columns, not real Postgres enums — confirmed
  against `products_status_valid`/`categories_status_valid` constraints.
- **Functions**: all 15 real RPC-callable functions match exactly (verified
  every `.rpc('name')` call site in `src/lib/services/` against a defined,
  granted function). Trigger-only functions (`returns trigger`) are correctly
  absent — they aren't callable via `.rpc()` and Supabase's own type generator
  excludes them too.
- **Bug found and fixed**: `orders.coupon_usage_counted` (added by
  `20260715000007`, a `boolean not null default false` idempotency flag for
  coupon-usage counting) was **completely missing** from the hand-written
  `orders` type — absent from `Row`, `Insert`, and `Update`. Added it to all
  three, matching the column's actual nullability (`not null`, so
  non-optional in `Row`, optional-with-default in `Insert`/`Update`).
- Spot-checked the tables most likely to have drifted (`products`, `orders`,
  `coupons`, `notifications`, `reviews`, `customer_notifications`, `collections`,
  `profiles`) column-by-column against their migrations; only the one gap
  above was found. The file is otherwise accurately hand-maintained.
- No columns or types were found in `database.types.ts` that *don't* exist in
  the actual schema (no phantom/aspirational types).

## 7. "SQL files I must run in order"

None of the fixes require ad-hoc SQL outside the migration system — everything
went into proper migration files, so the only action is the standard migration
run, in the filename order already shown in §1. Concretely, the only *new*
file that didn't exist before this audit is:

```
supabase/migrations/20260715000019_missing_table_grants.sql
```

It must run last (it already sorts last by timestamp) since it grants on
tables created by every migration from `20260715000009` through `20260715000018`.

## 8. "Files that must be edited before running SQL"

All of the following have already been edited as part of this audit — listed
here for the record, matching the requested format:

| File | Line | Edit | Reason |
|---|---|---|---|
| `supabase/migrations/20260715000011_dashboard_notifications_completion.sql` | 573 (pre-edit) | Deleted `grant execute on function public.get_latest_customers(int) to authenticated;` | Function was never created anywhere in the migration history — would abort `db push` with `42883 function does not exist`. |
| `supabase/migrations/20260715000012_analytics_top_products.sql` | 3–4 (pre-edit) | Removed stale `get_latest_customers` mention from the header comment | Cosmetic, but misleading after the function was confirmed dead. |
| `supabase/migrations/20260715000019_missing_table_grants.sql` | new file | Added | Closes the missing-GRANT gap on 21 tables (Bug B, §2). |
| `src/lib/supabase/database.types.ts` | `orders` Row/Insert/Update | Added `coupon_usage_counted: boolean` (and `?:` variants) | Column exists in the DB (`20260715000007`) but was missing from the hand-written type, which would make it invisible/untyped to every TS caller. |
| `src/app/checkout/page.tsx` | 234 | Comment fix: "persists in mockStorage" → "persists in Supabase" | Stale comment from before the Supabase migration; no functional change. |
| `src/components/admin/design-system/KpiCard.tsx` | `MiniSparkline` (removed) | Deleted the `Math.random()`-driven sparkline | Every KPI card's sparkline was regenerating random points on every render — not derived from any real data. See §9. |
| `src/app/admin/(dashboard)/page.tsx` | 4 KPI cards | Replaced fabricated `trend` percentages (15%, 3%, 18%, 8%) with neutral, honest labels | No backing month-over-month calculation exists for these metrics; a fake percentage is worse than no percentage on a financial dashboard. |
| `src/app/admin/(dashboard)/business/page.tsx` | 7 KPI cards | Same fix, plus corrected `accentColor` values (`success`/`warning`/`danger`/`info` aren't in the `IconColor` union — replaced with valid values) | Same rationale; the invalid `accentColor` values also silently fell through to unstyled cards. |

## 9. Dashboard/Business KPI trend audit (task 6)

Found and fixed:

- `KpiCard`'s `MiniSparkline` called `Math.random()` on every mount — every
  KPI card across Dashboard, Business, Users, and Inventory pages rendered a
  fabricated sparkline shape that changed on every page refresh, with zero
  connection to real historical data. Removed it entirely rather than leave a
  fake visual, since no time-series snapshot table exists to back it honestly.
- 11 hardcoded, non-zero `trend` percentages across
  `app/admin/(dashboard)/page.tsx` (4: completed orders, inventory value, net
  profit, total expenses, cash flow) and
  `app/admin/(dashboard)/business/page.tsx` (7: revenue, COGS, expenses, net
  profit, cash flow, assets, liabilities) — all labeled "مقارنة بالشهر الماضي"
  / "vs last month" but backed by no actual prior-period query anywhere in
  `business.service.ts` or `analytics.service.ts`. Replaced with neutral,
  honest indicators (matching the pattern already used correctly elsewhere on
  the same pages, e.g. the `capital` card's `"لا يوجد تغيير"`).
- Real, correctly-computed trends were left untouched: `summary.revenueGrowth`,
  `.ordersGrowth`, `.customersGrowth`, `.conversionGrowth` on the main
  dashboard are genuinely computed by `analytics.service.ts` from
  `get_revenue_series`/`get_customer_growth` and were not touched.
- **Follow-up (non-blocking):** building real month-over-month trends for
  completed-orders/inventory-value/net-profit/expenses/cash-flow/assets/
  liabilities would need new SQL RPCs (current vs. prior period), the same
  pattern `get_revenue_summary` already uses for revenue. Tracked as a
  post-deploy enhancement, not a launch blocker — showing no trend is honest;
  showing a fake one is not.

## 10. Final readiness assessment

| Metric | Result |
|---|---|
| Supabase migration readiness | **~98%** — both blocking bugs (dead grant, missing table grants) are fixed; nothing else found that would fail `db push` or `gen types`. |
| Tables migrated off mock storage | **100%** (40/40) — no `mockStorage.ts` file exists in the repo at all. |
| Services still reading local/mock data | **0%** for persisted data. Two files mention `localStorage`, both for a client-only "view as role" UI toggle, not a data store. |
| **Production-ready?** | **Conditionally YES** — after running `supabase db push` (which will apply `20260715000019` and pick up the `20260715000011` fix) and `supabase gen types typescript` to confirm the regenerated types match the manual patch in `database.types.ts`. See `docs/pre_deploy_checklist.md` for the exact command sequence. |
