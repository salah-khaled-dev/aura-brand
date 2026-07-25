# Mock → Supabase Migration Audit

Full inventory of mock/localStorage usage across the codebase, and the target
Supabase table/bucket for each. Supersedes the "Mock-First Architecture"
framing in `docs/architecture_audit.md` and `docs/cms_architecture.md`, which
predate the (already in-progress) Supabase auth migration and no longer
reflect current state for auth/staff/password-reset.

For the backup snapshot of current mock code/data referenced here, see
`backup/mock-system-backup/`. For the phase roadmap, see the migration plan.

## Legend

- ✅ Migrated — real Supabase calls, no mock fallback.
- 🟡 Hybrid — partially migrated, mock still present for part of the feature.
- ❌ Not started — fully mock/localStorage.

---

## Auth — ✅ Migrated

| File | Mechanism | Target |
|---|---|---|
| `src/lib/services/auth.service.ts` | Real Supabase Auth: `signInWithPassword`, `signOut`, `getSession`/`getUser`, `resetPasswordForEmail`, `updateUser` (password) | `auth.users`, `profiles` |
| `src/middleware.ts` | Guards `/admin/*`, revalidates JWT via `supabase.auth.getUser()`, checks `profiles.role`/`is_active` | `profiles` |
| `src/components/admin/auth/LoginScreen.tsx` | Calls `AuthService.signInWithPassword` | — |
| `src/components/admin/auth/ForgotPasswordModal.tsx` | Calls `AuthService.requestPasswordReset()` | — |
| `src/components/admin/auth/ResetPasswordScreen.tsx` | Calls `AuthService.updatePasswordAfterRecovery()`, uses `createClient` directly | — |
| `src/app/auth/confirm/route.ts` | Exchanges magic-link token via `supabase.auth.verifyOtp()` | — |
| `src/app/auth/reset-password/page.tsx` | Renders `ResetPasswordScreen` | — |

Remaining mock residue: `src/lib/auth/PermissionContext.tsx` self-describes
as "mock-first RBAC" — the permission *matrix* (module → read/write/delete)
still comes from `UsersService`'s mock `MOCK_ROLES`, and a localStorage
"view as role" override (`aura_admin_view_as_role`) exists for testing. Real
work item for **Phase D**.

## Staff management — 🟡 Hybrid

| File | Mechanism | Target |
|---|---|---|
| `src/app/api/admin/staff/route.ts` | Real: `POST` creates a Supabase Auth user (service-role `createAdminClient`) + `profiles` row, with rollback on partial failure | `auth.users`, `profiles` |
| `src/lib/services/users.service.ts` | Mock: `MOCK_STAFF`/`MOCK_ROLES`/`MOCK_CREDENTIALS` arrays via `mockStorage` (keys `users.staff`, `users.roles`, `users.credentials`). `createStaff()` calls the real API above, then mirrors into the mock array using the real user id. `changePassword`/`setPassword` still use mock djb2 hashing, not Supabase Auth. | Needs new `roles`, `permissions`, `role_permissions`, `user_permissions` tables — **Phase D** |

## Products — ❌ Not started (target: Phase A)

| File | Mechanism |
|---|---|
| `src/data/mock/products.ts` | `mockProducts` array, `mockStorage` key `products`, seeded from `storefrontSeed` (currently empty) |
| `src/lib/services/product.service.ts` | Full CRUD facade over `mockProducts` |
| `src/store/productStore.ts` | Zustand store, calls `ProductService.*` directly |
| `src/components/admin/products/ProductForm.tsx` and admin product pages | Call `ProductService.*` |

Target: `products`, `product_images`, `product_variants` (existing tables,
need Phase A column additions — see `backup/mock-system-backup/MIGRATION_MAP.md`).

## Categories — ❌ Not started (target: Phase A)

| File | Mechanism |
|---|---|
| `src/lib/services/category.service.ts` | `MOCK_CATEGORIES` (3 real rows: winter/summer/shop), `mockStorage` key `categories` |

Target: `categories` (existing table, needs Phase A column additions).

## Media / Storage — ❌ Not started (target: Phase A)

| File | Mechanism |
|---|---|
| `src/data/mock/media.ts` | `mockMedia` array (empty seed), `mockStorage` key `media` |
| `src/lib/services/media.service.ts` | CRUD facade, no Storage calls |
| `src/components/admin/ui/ImageUpload.tsx`, `MediaPicker.tsx` | Call `MediaService.uploadMedia()` |
| `src/lib/utils/image-file.ts` | `readImageFile()` converts uploads to base64 data URLs client-side — self-documents "no Supabase Storage bucket wired up yet" |
| Deleted: `src/components/admin/MediaLibraryModal.tsx` | Older unused/duplicate media picker, superseded by `MediaPicker.tsx` — cleanup, not part of the migration itself |

Target: new `media` table + Storage buckets `products`/`media`/`avatars`/`banners`.

## Storefront product rendering — ❌ Not started (target: Phase A2, separate from Phase A)

| File | Mechanism |
|---|---|
| `src/hooks/useStorefrontProducts.ts` | `useSyncExternalStore` reading `getLiveProducts()`/`getCatalogSeed()` synchronously; cross-tab sync via `storage` event on `aura_mock_db:products` |
| `src/lib/catalog/storefront-catalog.ts` | `getPublishedProducts`, `getProductsBySeason`, `searchProducts`, `getRelatedProducts` — all read `getLiveProducts()` directly |

**Does not call `product.service.ts` at all** — this is why Phase A's
product-service cutover is transparent to admin pages but invisible to the
storefront. Needs a dedicated async catalog store + an SSR data-flow
decision; deliberately scoped out of Phase A.

## Orders — ❌ Not started (target: Phase B)

| File | Mechanism |
|---|---|
| `src/data/mock/orders.ts` | `mockOrders` (empty seed), `mockStorage` key `orders` |
| `src/lib/services/order.service.ts` | CRUD facade |
| `src/lib/orders/order-status.ts` | Shared status model (storefront + admin) |
| `src/app/checkout/page.tsx` | Directly touches `localStorage` for `aura_cart` and `aura_last_order_id` |

Target: `orders`, `order_items`.

## Coupons — ❌ Not started (target: Phase B)

| File | Mechanism |
|---|---|
| `src/data/mock/coupons.ts` | `mockCoupons` (empty seed), `mockStorage` key `coupons` |
| `src/lib/services/coupon.service.ts` | CRUD facade |

Target: `coupons`.

## Cart & Wishlist — ❌ Not started (target: Phase B)

| File | Mechanism |
|---|---|
| `src/context/StoreContext.tsx` | Raw `localStorage` keys `aura_cart`, `aura_wishlist` — **no service layer at all** |
| `src/hooks/useRecentlyViewed.ts` | Also localStorage-based |

Target: `cart_items`, `wishlist` (existing tables, currently completely unused by app code).

## Settings — ❌ Not started (target: Phase C)

| File | Mechanism |
|---|---|
| `src/data/mock/settings.ts` | `mockSettings` (1 real default object), `mockStorage` key `settings` |
| `src/lib/services/settings.service.ts` | CRUD facade |
| `src/lib/services/storefront/store.service.ts`, `seo.service.ts`, `appearance.service.ts`, `footer.service.ts`, `navigation.service.ts`, `content.service.ts`, `homepage.service.ts`, `banner.service.ts`, `redirect.service.ts`, `collection-display.service.ts` | All `mockStorage`-backed storefront CMS services |

Target: `store_settings` (existing table).

## Analytics — ❌ Not started (target: Phase C)

| File | Mechanism |
|---|---|
| `src/data/mock/analytics.ts` | `mockRevenueData`, `mockTopProducts`, `mockDeviceData` (all empty), `mockAnalyticsSummary` |
| `src/lib/services/analytics.service.ts` | Read facade |
| `src/utils/analytics.ts` | Has demo/sample-style code |

Target: no table exists yet — needs schema design (deferred, likely alongside Phase D given its finance/reporting overlap).

## Notifications — ❌ Not started (target: Phase C)

| File | Mechanism |
|---|---|
| `src/data/mock/notifications.ts` | `mockNotifications` (empty), `mockStorage` key `notifications` |
| `src/lib/services/notification.service.ts` | CRUD facade |
| `src/data/mock/customer-notifications.ts` | `mockCustomerNotifications` (empty), `mockStorage` key `customer_notifications` |
| `src/lib/services/customer-notification.service.ts` | CRUD facade |
| `src/components/storefront/CustomerNotificationListener.tsx` | Consumer |

Target: `notifications` (existing table, currently unused).

## Contact form & Newsletter — ❌ Not started at all, not even mock (target: Phase C)

| File | Mechanism |
|---|---|
| `src/app/contact/page.tsx`, `ContactItems.tsx` | Static contact info — **no form submission logic of any kind** |
| `src/components/layout/Footer.tsx` (`handleSubscribe`) | Shows a success toast and clears the input — **no persistence whatsoever** |

Target: `contact_messages`, `newsletter` (existing tables, currently unused). These are genuinely new features to build, not migrations of existing mock behavior.

## Business / Finance — ❌ Not started (target: Phase D)

| File | Mechanism |
|---|---|
| `src/data/mock/business.ts` | `mockSuppliers`, `mockPurchaseOrders`, `mockExpenses`, `mockAssets`, `mockLiabilities`, `mockCapital` — all empty seeds |
| `src/lib/services/business.service.ts` | CRUD facade |
| Various admin pages (assets, liabilities, capital, expenses, suppliers, purchase orders) | Consumers |

Target: no tables exist yet — needs new schema design from scratch.

## RBAC / Permissions matrix — ❌ Not started (target: Phase D)

Covered under "Staff management" above. Full migration required per project
decision — no RBAC logic (roles, permission matrix, role assignment) may
remain in localStorage once Phase D lands. Target: new `roles`,
`permissions`, `role_permissions`, `user_permissions` tables.

## Unscheduled (no target phase yet)

| Feature | File | Mechanism |
|---|---|---|
| Collections | `src/data/mock/collections.ts`, `collection.service.ts` | Empty seed, CRUD facade |
| Customers (CRM) | `src/data/mock/customers.ts`, `customer.service.ts` | Empty seed, CRUD facade |
| Journal (blog/articles) | `src/data/mock/journal.ts`, `journal.service.ts` | Empty seed, CRUD facade |
| Brands | `src/lib/services/brand.service.ts` | Mock |
| Reviews | `src/lib/services/review.service.ts` | Mock |
| Inventory | `src/lib/services/inventory.service.ts` | Mock (overlaps with Products) |
| Website/misc | `src/lib/services/website.service.ts` | Mock |
| Search | `src/lib/services/search.service.ts` | Mock, reads other mock services |
| Profile | `src/data/mock/profile.ts`, `profile.service.ts` | Mock |

## Dead code — not part of any migration phase

`src/lib/contracts/v2/*`, `src/lib/repositories/mock/*` (~30 repository
classes), `src/lib/providers/RepositoryProvider.ts`, and the `enableSupabase`
feature flag (`src/types/feature-flags.ts`, currently `false`) form a
separate, largely unused ERP-style DI abstraction. `src/lib/repositories/supabase/README.md`
is a placeholder stating "Supabase repositories implemented when
enableSupabase = true" but nothing has been implemented there. Only
`PermissionContext.tsx` imports `RepositoryProvider`, and not meaningfully
vs. `UsersService`. **Not migrated as part of this effort** — flagged for a
future cleanup decision (keep dead, or remove) once the real migration
(`src/lib/services/*`) is complete.
