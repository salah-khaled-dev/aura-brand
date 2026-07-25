# Mock System Architecture (as of this backup)

Snapshot taken before Phase A of the mock → Supabase migration. This describes
how the mock backend works so the migration (and any future rollback) can be
reasoned about precisely.

## Layering

```
src/data/mock/*.ts            in-memory arrays, seeded once at module load
        │
        ▼
src/lib/storage/mock-storage.ts   localStorage persistence seam (single namespace)
        │
        ▼
src/lib/services/*.service.ts     async CRUD facade (setTimeout-simulated latency)
        │
        ▼
admin pages / storefront hooks    call the service, never touch mock data directly
```

## `mockStorage` (`src/lib/storage/mock-storage.ts`)

The single persistence seam for the entire mock backend. All data lives under
one localStorage namespace, `aura_mock_db`, keyed as `aura_mock_db:<key>`
(e.g. `aura_mock_db:products`, `aura_mock_db:users.staff`). A schema version
counter (`aura_mock_db:__schema_version`, currently `5`) wipes the whole
namespace on load when bumped, used historically for mock schema migrations.

SSR-safe by design: `read()` returns the seed and `write()` is a no-op when
`window` is unavailable, so importing a mock store during server rendering
never throws and never leaks one request's data into another.

The file's own header comment states the intended endgame: *"When Supabase
lands, this file is deleted and the stores read/write the database instead —
no page or component changes required."* Phase A does NOT delete this file
(other still-mock features depend on it) — only the products/categories/media
stores stop routing through it.

## Service pattern

Every `*.service.ts` file exports a plain object (not a class instance) with
async methods that:
1. `await new Promise(resolve => setTimeout(resolve, N))` to simulate network latency.
2. Read/mutate a module-level array (`MOCK_*` or `mock*`).
3. Call `mockStorage.write(key, data)` after every mutation.
4. Return plain data (arrays/objects), matching what a real API would return.

Callers (admin pages, `productStore.ts`, storefront hooks) depend only on the
service's public method signatures — this is what makes a same-signature
Supabase swap possible without touching call sites (see MIGRATION_MAP.md).

## Event bus (`src/lib/events/EventBus.ts`)

A number of mutating service methods emit events (`product.created`,
`product.updated`, `orders.changed`, etc.) after a successful write, so
same-tab UI (dashboards, badges, notification feeds) can react without a
manual refetch. This is unrelated to persistence and is preserved as-is
across every service cutover — Supabase-backed services must keep emitting
the same events after their writes succeed.

## Current seed data (as of this backup)

Confirmed by reading every file under `src/data/mock/`:

| Feature | Seed state |
|---|---|
| Products | **Empty** — `storefrontSeed` in `src/data/products.ts` is `[]`. Any products only exist in a browser's localStorage. |
| Categories | **3 real rows** (winter/summer/shop) — hardcoded in `category.service.ts`, not `src/data/mock/`. See `seeds/categories.json`. |
| Orders | Empty |
| Coupons | Empty |
| Media | Empty |
| Notifications (admin) | Empty |
| Customer notifications | Empty |
| Collections | Empty |
| Customers | Empty |
| Business (suppliers/POs/expenses/assets/liabilities/capital) | Empty |
| Journal (articles) | Empty |
| Settings | **1 real default object** (store info, payment, SEO defaults) — see `seeds/settings.json`. |
| Users/RBAC | **Real seed data** — 6 roles with a full permission matrix, 5 staff members. See `seeds/users.json`. Passwords (`MOCK_CREDENTIALS`) deliberately excluded — mock djb2 hashes, not real credentials, must never be migrated into Supabase Auth. |

Most feature areas ship with zero seed data — the repo only defines shape
and defaults, not sample records. Any "real-looking" data in a live demo of
this app was created at runtime through the admin UI and lives only in that
browser's localStorage.

## Cross-tab sync (products only)

`src/hooks/useStorefrontProducts.ts` listens for the browser `storage` event
on the literal key `aura_mock_db:products` to pick up admin edits made in
another tab, via `useSyncExternalStore`. This mechanism is specific to the
storefront product catalog and is the reason the storefront redesign was
split into Phase A2 — it has no direct Supabase equivalent without wiring
Supabase Realtime.

## Files captured in this backup

- `mock-services/` — verbatim copy of every file under `src/lib/services/` (30 files, includes `storefront/` subfolder).
- `mock-data/` — verbatim copy of every file under `src/data/mock/` (15 files).
- `seeds/*.json` — actual current seed values, transcribed from the source files above.
- `sql-seeds/*.sql` — INSERT statements for the non-empty seeds, written against the Phase A schema.
