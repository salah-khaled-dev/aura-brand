# Architecture Audit — Aura Brand Admin Dashboard

**Date:** 2026-06-27  
**Auditor:** Claude Sonnet 4.6  
**Scope:** `src/app/admin/` + `src/components/admin/` + `src/lib/services/`

> **Note (2026-07-15):** This audit predates the Supabase migration. Auth,
> staff creation, and password reset are now real Supabase Auth (no longer
> mock). Products/categories/media are migrating in Phase A. For current
> per-feature migration status, see
> [`docs/migration/mock-to-supabase-audit.md`](migration/mock-to-supabase-audit.md).

---

## 1. Overall Architecture

The admin dashboard is a Next.js 15 App Router application using:
- **State:** Zustand (business pages) + React `useState` (commerce pages) — inconsistent
- **Icons:** `@tabler/icons-react` (correct) + `lucide-react` (NOT INSTALLED — critical bug)
- **Design System:** `src/components/admin/design-system/` — partially adopted
- **Mock Layer:** `src/data/mock/` → `src/lib/services/` → pages
- **Styling:** Tailwind CSS v4 with CSS custom properties (`--admin-*`)

---

## 2. Critical Bugs (Build-Breaking)

### 2.1 `lucide-react` NOT in package.json

`lucide-react` is imported in **9 files** but is NOT listed in `package.json` dependencies.  
This causes a runtime module-not-found error for every page that renders these components.

| File | Lucide Imports |
|------|---------------|
| `src/app/admin/(dashboard)/products/[id]/page.tsx` | ArrowRight, Save, Cloud, CloudOff, RefreshCcw, Eye, Calendar, Plus, Trash2, Image, History |
| `src/components/admin/crud/EntityDialogs.tsx` | Trash2, Archive, X, AlertTriangle |
| `src/components/admin/business/AssetModal.tsx` | Save |
| `src/components/admin/business/CapitalModal.tsx` | Save |
| `src/components/admin/business/ExpenseModal.tsx` | Save |
| `src/components/admin/business/LiabilityModal.tsx` | Save |
| `src/components/admin/SpotlightSearch.tsx` | Search, Package, ShoppingCart, Users, FileText, Settings, Tag, Image |
| `src/components/admin/MediaLibraryModal.tsx` | X, Upload, Search, Image, Folder, Tag, MoreVertical, Link2, Copy, Heart, Trash2 |
| `src/components/admin/NotificationCenter.tsx` | Bell, Package, ShoppingCart, Users, Tag, Star, Settings, CheckCircle2, Archive, X |

**Fix:** Replace all lucide imports with `@tabler/icons-react` equivalents.

### 2.2 Broken Modal Imports in Business Pages

Four business pages import domain modals from `@/components/admin/design-system/Modal`  
but `Modal.tsx` only exports the base `Modal` component — not the domain-specific modals.

| Page | Wrong Import | Correct Import |
|------|-------------|---------------|
| `business/assets/page.tsx` | `design-system/Modal` → `AssetModal` | `admin/business/AssetModal` |
| `business/capital/page.tsx` | `design-system/Modal` → `CapitalModal` | `admin/business/CapitalModal` |
| `business/expenses/page.tsx` | `design-system/Modal` → `ExpenseModal` | `admin/business/ExpenseModal` |
| `business/liabilities/page.tsx` | `design-system/Modal` → `LiabilityModal` | `admin/business/LiabilityModal` |

---

## 3. Duplicate Services

Two parallel service layers exist for the same entities:

| Entity | Old Service | New Service | Used By |
|--------|------------|-------------|---------|
| Product | `lib/services/product.service.ts` | `lib/services/commerce/product.service.ts` | Old: products/[id] page; New: products list page |
| Category | `lib/services/category.service.ts` | `lib/services/commerce/category.service.ts` | Old: (unused in UI); New: categories page |
| Collection | `lib/services/collection.service.ts` | `lib/services/commerce/collection.service.ts` | Mixed |
| Review | `lib/services/review.service.ts` | `lib/services/commerce/review.service.ts` | Old: (unused); New: reviews page |

The **old** product service is richer (full IProductRepository contract, bulk ops, timeline).  
The **new** commerce service is a thinner wrapper.  
**Recommendation:** Keep `lib/services/product.service.ts` (old) as canonical; migrate new pages to use it.

---

## 4. Duplicate Component Files

| Component | File 1 | File 2 |
|-----------|--------|--------|
| ProductForm | `components/admin/commerce/ProductForm.tsx` | `components/admin/products/ProductForm.tsx` |

`products/ProductForm.tsx` uses the canonical `ProductService` from `lib/services/product.service.ts`.  
`commerce/ProductForm.tsx` uses `lib/services/commerce/product.service.ts`.  
**Fix:** Delete `commerce/ProductForm.tsx` and standardize on `products/ProductForm.tsx`.

---

## 5. Inconsistent Page Patterns

Two distinct page patterns exist side by side:

### Pattern A — Business Pages
```
<div className="space-y-6" dir="rtl">
  {inline header}
  <DataTable onEdit onDuplicate onArchive onDelete />
  <Modal />
  <EntityDeleteDialog />
</div>
```

### Pattern B — Commerce Pages (products, categories, brands, etc.)
```
<div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
  <PageHeader />
  <Card>
    {custom search bar}
    {selectedIds && custom bulk action bar}
    {loading ? custom skeleton : empty ? EmptyState : <DataTable (border-0) />}
  </Card>
</div>
```

Pattern A is cleaner — uses DataTable's built-in props correctly.  
Pattern B duplicates functionality already in DataTable (search, skeleton, empty state).  
**Recommendation:** Standardize on a single pattern. See `design_system_recovery.md`.

---

## 6. Placeholder / Read-Only Pages

| Page | Issue |
|------|-------|
| `business/cash-flow/page.tsx` | Read-only report, no CRUD. Date filter is non-functional UI only. |
| `business/pnl/page.tsx` | Read-only P&L report. No editable data. |
| `business/operational-expenses/page.tsx` | Create hardcodes mock data. No modal for real input. |
| `business/manufacturing-costs/page.tsx` | Same as above — hardcoded mock expense. |
| `business/shipping-costs/page.tsx` | Same as above — hardcoded mock expense. |
| `business/suppliers/[id]/page.tsx` | Detail view — needs audit. |
| `business/purchase-orders/[id]/page.tsx` | Detail view — needs audit. |

---

## 7. Dead / Unused Components

| Component | Status |
|-----------|--------|
| `src/components/admin/badges/StatusChip.tsx` | Not imported by any page — uses hardcoded Tailwind colors |
| `src/components/admin/cards/SectionCard.tsx` | Uses `bg-white` — broken in dark mode |
| `react-icons` package | Listed in package.json, zero imports found |

---

## 8. Summary Priority Matrix

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | `lucide-react` not installed | Build fails |
| P0 | Broken modal imports (4 pages) | Runtime error |
| P1 | `EntityDialogs.tsx` broken theme + wrong library | Dark mode broken |
| P1 | `SpotlightSearch`, `MediaLibraryModal`, `NotificationCenter` hardcoded colors | Dark mode broken |
| P2 | Commerce pages use `confirm()` for delete | UX inconsistent, English text |
| P2 | Duplicate `ProductForm` component | Maintainability |
| P2 | Duplicate service layer | Maintainability |
| P3 | Placeholder pages (cash-flow, pnl, etc.) | Incomplete features |
| P3 | Dead components/packages | Bundle size |
