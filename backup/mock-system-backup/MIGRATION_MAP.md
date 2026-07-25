# Migration Map: mock → Supabase

Per-feature mapping of current mock storage to target Supabase table/bucket.
Status reflects the state at the time of this backup (before Phase A
execution). See `docs/migration/mock-to-supabase-audit.md` for the full
file-by-file audit; this map is the condensed table→table view.

| Feature | Mock source | Service | Target table(s)/bucket(s) | Phase | Status (at backup time) |
|---|---|---|---|---|---|
| Auth | Supabase Auth (already real) | `auth.service.ts` | `auth.users`, `profiles` | done | ✅ Migrated |
| Staff creation | Hybrid: real Supabase Auth user + mock staff mirror | `users.service.ts`, `/api/admin/staff` | `profiles` (real user) + mock staff array (directory) | done/Phase D | Hybrid |
| Products | `src/data/mock/products.ts` (`mockProducts`, empty seed) | `product.service.ts` | `products`, `product_images`, `product_variants` | A | ❌ Not started |
| Categories | `category.service.ts` (`MOCK_CATEGORIES`, 3 rows) | `category.service.ts` | `categories` | A | ❌ Not started |
| Media/Storage | `src/data/mock/media.ts` (`mockMedia`, empty) | `media.service.ts` | `media` (new table) + Storage buckets `products`/`media`/`avatars`/`banners` | A | ❌ Not started |
| Storefront product rendering | `useStorefrontProducts.ts` / `storefront-catalog.ts` (separate localStorage read, bypasses `product.service.ts`) | n/a (direct data access) | same `products` tables, via a new async store | A2 | ❌ Not started — needs redesign, not just a service swap |
| Orders | `src/data/mock/orders.ts` (empty) | `order.service.ts` | `orders`, `order_items` | B | ❌ Not started |
| Coupons | `src/data/mock/coupons.ts` (empty) | `coupon.service.ts` | `coupons` | B | ❌ Not started |
| Cart | `StoreContext.tsx` (raw localStorage `aura_cart`, no service) | none | `cart_items` | B | ❌ Not started |
| Wishlist | `StoreContext.tsx` (raw localStorage `aura_wishlist`, no service) | none | `wishlist` | B | ❌ Not started |
| Settings (admin) | `src/data/mock/settings.ts` (1 default object) | `settings.service.ts` | `store_settings` | C | ❌ Not started |
| Settings (storefront CMS) | mock, various `storefront/*.service.ts` | `storefront/store.service.ts`, `seo.service.ts`, `appearance.service.ts`, etc. | `store_settings` (admin fields) | C | ❌ Not started |
| Analytics | `src/data/mock/analytics.ts` | `analytics.service.ts` | none yet — needs schema | C | ❌ Not started |
| Notifications (admin) | `src/data/mock/notifications.ts` (empty) | `notification.service.ts` | `notifications` | C | ❌ Not started |
| Customer notifications | `src/data/mock/customer-notifications.ts` (empty) | `customer-notification.service.ts` | `notifications` (or a customer-scoped view) | C | ❌ Not started |
| Contact form | none — no persistence at all today | none (`app/contact/page.tsx` is static) | `contact_messages` | C | ❌ Not started (new feature, not a migration) |
| Newsletter | none — no persistence at all today | none (`Footer.tsx` shows a toast only) | `newsletter` | C | ❌ Not started (new feature, not a migration) |
| Business/finance | `src/data/mock/business.ts` (all empty) | `business.service.ts` | none yet — needs new schema (assets, liabilities, capital, expenses, suppliers, purchase_orders) | D | ❌ Not started |
| RBAC / permissions | `users.service.ts` (`MOCK_ROLES`, `MOCK_STAFF`, `MOCK_CREDENTIALS`) | `users.service.ts` | none yet — needs new schema: `roles`, `permissions`, `role_permissions`, `user_permissions` | D | ❌ Not started — full migration required, no RBAC logic may remain in localStorage per project decision |
| Collections | `src/data/mock/collections.ts` (empty) | `collection.service.ts` | none yet | unscheduled | ❌ Not started |
| Customers (CRM) | `src/data/mock/customers.ts` (empty) | `customer.service.ts` | none yet (distinct from `profiles`) | unscheduled | ❌ Not started |
| Journal (blog/articles) | `src/data/mock/journal.ts` (empty) | `journal.service.ts` | none yet | unscheduled | ❌ Not started |

## Field-level mapping: Products (Phase A)

Mock `Product` field → target column, for fields with no 1:1 existing column
(resolved via Phase A `ALTER TABLE` + JSONB passthrough, per project decision):

| Mock field | Target |
|---|---|
| `barcode`, `lowStockLimit`, `material`, `weight`, `brand`, `tags[]` | new plain columns |
| `bestSeller`, `newArrival` | `is_best_seller`, `is_new_arrival` (new columns; `is_featured` already existed) |
| `status`, `publishAt`, `hideAt`, `archiveAt` | new columns; `is_active` kept in sync with `status = 'published'` |
| `seo.canonicalUrl`, `seo.ogTitle`, `seo.ogDescription` | new columns (`seo_title`/`seo_description`/`seo_keywords` already existed) |
| `hoverImage`, `badge`, `details[]`, `fabric`, `packaging` | new columns |
| `costing` (11-field breakdown), `costPrice` | `costing jsonb`, `cost_price` — JSONB passthrough (finance schema deferred to Phase D) |
| `stats` (views/orders/revenue/wishlist/cart/reviews) | `stats jsonb` — JSONB passthrough (analytics schema deferred) |
| `revisions[]` | `revisions jsonb` — JSONB passthrough |
| `colors[]`, `sizes[]`, `colorVariants[]` | derived from `product_variants` rows (no new columns — DB is already normalized here) |

## Field-level mapping: Categories (Phase A)

| Mock field | Target |
|---|---|
| `thumbnail`, `banner` | `image_url` (existing), `banner_url` (new) |
| `isFeatured`, `showOnHomepage`, `showInMenu` | new columns |
| `status`, `deletedAt` | new columns (soft delete — DB only had `is_active` before) |
| `seo: { title, description }` | flattened to `seo_title`/`seo_description` (existing columns) |

## Important constraint carried forward

The 3 category slugs (`winter`, `summer`, `shop`) are a storefront contract
(`Navbar.tsx`, `shop/page.tsx` filter on them, `Product.season` maps 1:1).
Any Supabase seed/migration must preserve these exact slug values.
