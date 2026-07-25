# Phase A2 — Storefront Catalog Migration (Mock → Supabase)

**Status:** Complete. **Date:** 2026-07-15.

## Summary

The storefront now reads the product catalog from Supabase, through the same
`ProductService` repository the admin panel already uses. Products created or
edited in `/admin/products` appear on the public storefront automatically —
no separate storefront database, no localStorage catalog, no manual sync step.

Verified live against the running dev server: a real product created in the
admin panel (`فستان سواريه`, id `6f0f6ccf-c5c5-42f8-afb2-d5775b7c8eed`) renders
correctly in the sitemap, the product detail page's metadata/JSON-LD, and the
client-hydrated `ProductDetailClient` (confirmed via the browser's own
analytics log line captured in the dev server output).

## What changed

### New files

- **`src/lib/services/storefront/storefront-product.service.ts`** — the
  storefront's read layer. Wraps `ProductService.getProducts({ status:
  'published' })` (the admin's existing Supabase repository) and adds the
  storefront-specific derived views: `getPublishedProducts`,
  `getPublishedProductById`, `getProductsByCategory`, `getProductsBySeason`,
  `getFeaturedProducts`, `getNewArrivals`, `getBestSellers`, `searchProducts`,
  `getRelatedProducts`. All are `async` except `getRelatedProducts`, which is
  a pure sync filter over an already-fetched array (see below).

### Rewritten

- **`src/hooks/useStorefrontProducts.ts`** — was a `useSyncExternalStore`
  wrapper over an in-memory/localStorage mock array; is now a plain
  fetch-on-mount hook returning `{ products, loading, error }`. Refetches
  automatically on `product.created/updated/deleted`, `products.changed`,
  `products.bulk_updated/bulk_deleted`, and `inventory.changed` via the
  existing `eventBus`/`useEventSubscribeMany` — the same live-refresh
  primitive every admin list already uses. `loading` is only `true` for the
  *first* fetch; a background refetch after an admin mutation doesn't flicker
  already-rendered content.

### Updated call sites (hook shape changed from `Product[]` to `{ products, loading, error }`)

| File | Change |
|---|---|
| `src/app/page.tsx` | Destructures `products`; CMS-driven sections already no-op on an empty array, so no extra loading UI needed. |
| `src/app/shop/page.tsx` | Destructures `{ products, loading }`; shows a `ProductCardSkeleton` grid instead of the "no results" empty state while `loading`. |
| `src/app/summer-fashion/page.tsx`, `winter-fashion/page.tsx` | Destructure `{ products, loading }`; filter by `season` inline (dropped the `getProductsBySeason` round trip since the page already has the full published list); pass `loading` down to `SeasonalProductGrid`. |
| `src/components/ui/SeasonalProductGrid.tsx` | New optional `loading?: boolean` prop — renders 8 `ProductCardSkeleton`s while loading and no products yet. |
| `src/app/product/[id]/page.tsx` | Server Component — `getPublishedProductById` import switched to the new service and both call sites (`generateMetadata`, page body) now `await` it. |
| `src/components/product/ProductDetailClient.tsx` | Destructures `{ products, loading }`; shows `ProductDetailSkeleton` while loading and the product isn't found yet (vs. the real "not available" state once loading is done). `getRelatedProducts` import switched to the new service. |
| `src/components/product/CompleteTheLook.tsx`, `RecentlyViewed.tsx` | Destructure `{ products }`; existing `length === 0 → return null` guards already cover the loading window. |
| `src/components/layout/Navbar.tsx` | Destructures `{ products }` for the search overlay's client-side filter; unchanged otherwise. |
| `src/app/sitemap.ts` | `sitemap()` is now `async`, `await`s `getPublishedProducts()`. |

### Retired

- **`src/lib/catalog/storefront-catalog.ts`** — deleted from `src/`, backed up
  unchanged at `backup/mock-system-backup/lib/catalog/storefront-catalog.ts`.
  Its sync selectors (`getPublishedProducts`, `getProductsBySeason`,
  `searchProducts`, `getRelatedProducts`) are superseded by the async service
  above; `getRelatedProducts` was ported over as a sync helper since callers
  already hold a loaded `Product[]`.

## Step 4 — "compatibility mapper": not needed

The task anticipated a Supabase-row → storefront-`Product` mapper. It already
exists and needs no duplicate: `product.service.ts`'s `rowToProduct()` (used
by the admin panel) maps *every* field — images (sorted, joined from
`product_images`), variants (from `product_variants`), `costing`/`stats`/
`revisions` JSONB, `hoverImage`/`badge`/`details`/`fabric`/`packaging`, and
resolves `category` to the category's display name via the `categories` join
— into the exact same canonical `Product` shape the storefront components
already expect. `ProductService.getProducts()` returns fully-mapped
`Product[]`, so `storefront-product.service.ts` only adds published-only
filtering and derived lists on top; it never touches raw Supabase rows.

## A deliberate scope decision: `src/data/mock/products.ts` was not deleted

The task's goal statement says no storefront page should depend on
`src/data/mock/products.ts`. In practice this file serves two very different
roles that had to be separated in judgment, not in code, given the "don't
redesign the schema" and "keep admin untouched" constraints:

1. **The mutable mock catalog** (`mockProducts`, `getLiveProducts`,
   `refreshFromStorage`, `updateMockProducts`, `getCatalogSeed`,
   localStorage-backed) — **fully removed from the storefront.** Confirmed by
   grep: no storefront file imports any of these five names anymore.
2. **The canonical `Product` TypeScript type + stateless helpers**
   (`primaryImage`, `discountOriginalPrice`, `resolveStockStatus`) — **kept**,
   because `product.service.ts` (admin's Supabase repository) imports
   `Product`/`ProductStatus`/`ProductVariant` from this same file, and
   splitting the type definitions into their own module is a real refactor
   that touches admin code, which is out of scope for this phase per
   [[phase-directive]] (architecture consolidation is deferred to the
   pre-Supabase cleanup pass). The three helper functions are pure — they
   take whatever `Product` object they're given and derive a value from it —
   so they work identically on a Supabase-sourced product as they did on a
   mock one; there's no mock behavior riding along.

Net effect: the storefront no longer reads or writes any mock/localStorage
*data*, but two files (`src/data/mock/products.ts`'s type/helper exports) are
still shared infrastructure with the admin panel, same as `ProductService`
itself. Extracting `Product` et al. into a standalone types module (e.g.
`src/types/product.ts`, which already exists but is unused per
[[unified-product-catalog]]) is a good candidate for the pre-Supabase
architecture pass, not this one.

## Known out-of-scope follow-up (flagged, not fixed)

`src/lib/services/inventory.service.ts` still imports `mockProducts` /
`updateMockProducts` directly and mutates the mock catalog's `stock` field on
checkout (`order.service.ts` → `checkout/page.tsx`). This means stock
deduction on a real order currently does **not** write to Supabase
`products.stock`. This is explicitly out of scope per the task's own
constraint ("Do not begin Phase B: orders, coupons, cart, wishlist,
analytics, finance, RBAC") — flagged here so it isn't missed before checkout
goes live against Supabase.

## SSR / hydration strategy

| Page | Rendering | Reasoning |
|---|---|---|
| `product/[id]/page.tsx` | Server Component, `await`s the service directly | Already async pre-migration (Next 16 `params` is a Promise); needs real data for `generateMetadata`, JSON-LD, and `notFound()` before any HTML is sent — no client fetch needed for SEO-critical content. |
| `sitemap.ts` | Server, `await`s the service | Build-time/request-time XML, must be fully server-rendered. |
| `page.tsx` (home), `shop/page.tsx`, `summer-fashion`/`winter-fashion`, `ProductDetailClient`, `CompleteTheLook`, `RecentlyViewed`, `Navbar` | Client Components via `useStorefrontProducts()` | All were already `"use client"` before this migration (heavy interactivity: filters, cart, wishlist, animations, search). Converting them to Server Components was out of scope ("preserve animations and UI behavior", "preserve all public routes") and would have been a much larger rewrite than a data-source swap. They fetch on mount and re-render when data arrives — first paint shows a skeleton/empty state, which is the explicit "loading state" deliverable for this phase. |

No hydration mismatches: every client component that reads `useStorefrontProducts()` starts from the same deterministic empty state (`products: [], loading: true`) on both server-rendered HTML and the first client render, then fetches after mount — there is no seed/snapshot divergence to reconcile, unlike the old `useSyncExternalStore` implementation.

## Performance considerations

- Each service function does its own full-catalog round trip to
  `ProductService.getProducts()` (no server-side status filter — it's applied
  in JS after fetch, same pattern the admin panel already uses). Acceptable
  at this catalog's current size; if the catalog grows large, the natural
  next step is pushing `status='published'` into the Supabase query directly
  rather than fetching all statuses and filtering client-side.
- `useStorefrontProducts()` fetches once per mounted component instance (no
  shared cache across components) — e.g. `Navbar`, `page.tsx`, and
  `RecentlyViewed` each do their own fetch when simultaneously mounted. This
  matches the old mock hook's per-subscriber snapshot cost profile closely
  enough for this phase; a shared request cache (SWR/React Query, or lifting
  to a context) is a reasonable follow-up if duplicate network calls become
  noticeable.
- `getRelatedProducts` deliberately stayed a sync helper taking an already-
  fetched `source: Product[]` (used by `ProductDetailClient`) instead of
  doing its own fetch, to avoid a second round trip on the product page.

## Rollback instructions

1. Restore the old catalog module: `git mv backup/mock-system-backup/lib/catalog/storefront-catalog.ts src/lib/catalog/storefront-catalog.ts` (or copy it back).
2. `git checkout -- src/hooks/useStorefrontProducts.ts` (or reintroduce the `useSyncExternalStore` version from git history / the backup).
3. `git checkout -- src/app/page.tsx src/app/shop/page.tsx src/app/summer-fashion/page.tsx src/app/winter-fashion/page.tsx src/app/product/'[id]'/page.tsx src/app/sitemap.ts src/components/product/ProductDetailClient.tsx src/components/product/CompleteTheLook.tsx src/components/product/RecentlyViewed.tsx src/components/ui/SeasonalProductGrid.tsx src/components/layout/Navbar.tsx`
4. Delete `src/lib/services/storefront/storefront-product.service.ts`.
5. No database or admin changes were made in this phase, so no migration rollback is needed on the Supabase side.

## Verification checklist

| # | Check | Result |
|---|---|---|
| 1 | Create a product in admin | Pre-existing (`فستان سواريه`, published) used for verification |
| 2 | Product appears in Supabase | Confirmed — `ProductService` reads it |
| 3 | Product automatically appears on localhost storefront | Confirmed via sitemap.xml and product page (no manual step) |
| 4 | Product page works | Confirmed — title, JSON-LD, og:image (Supabase Storage URL) all correct; browser analytics log confirms client hydration found the product |
| 5 | Search works | Navbar search now filters the Supabase-backed `products` array (code-verified; same filter logic as before, new data source) |
| 6 | Category filters work | Shop page's season/size/price filters operate on the Supabase-backed array (code-verified) |
| 7 | Seasonal pages work | `/summer-fashion`, `/winter-fashion` return 200 and filter by `season` from live data |
| 8 | Featured / new arrival / best seller sections work | Homepage sections filter on `featured`/`newArrival`/`bestSeller` flags from Supabase-backed products (code-verified; only one seed product currently in the DB so multi-item section testing is limited until more products are added in admin) |
| 9 | No storefront page reads from localStorage anymore | Confirmed via grep — zero storefront references to `mockProducts`, `getLiveProducts`, `updateMockProducts`, `refreshFromStorage`, `getCatalogSeed`, or `storefront-catalog.ts` |

`npx tsc --noEmit` passes with zero errors after the migration.

## Not done (explicitly out of scope per the task)

Phase B — orders, coupons, cart, wishlist, analytics, finance, RBAC — was not
started, including the `inventory.service.ts` mock-stock coupling noted above.
