# WEBSITE CMS AUDIT — AURA Brand

**Generated:** 2026-07-01 (last updated: 2026-07-01 — Phase 2 + storefront pages + homepage sections complete)  
**Architecture:** Mock-First (localStorage) · Next.js 16 · React 19 · Tailwind v4  
**Supabase Status:** Not yet integrated — all persistence via `mockStorage`

---

## 1. Connected Frontend Components

| Frontend Component | Service(s) | EventBus Event | Status |
|---|---|---|---|
| `Navbar.tsx` | `NavigationService.getMenuByLocation('header')` | `website.changed` | ✅ Live |
| `Footer.tsx` | `FooterService.getSettings()` + `StoreService.getInfo()` | `website.changed` | ✅ Live |
| `HeroSection.tsx` | `HomepageService.getSections()` → `type: 'hero'` | `website.changed` | ✅ Live |
| `app/page.tsx` (Homepage) | `HomepageService.getSections()` → best_sellers / new_arrivals / featured / newsletter / instagram / testimonials | `website.changed` | ✅ Live |
| `AnnouncementBar.tsx` | `StoreService.getInfo().announcementBar` | `website.changed` | ✅ Live |
| `ThemeProvider.tsx` | `AppearanceService.getSettings()` → CSS custom properties on `<html>` | `website.changed` | ✅ Live |
| `SEOInjector.tsx` | `SEOService.getByPage(route)` → dynamic `<head>` meta tags | `website.changed` | ✅ Live |
| `app/about/page.tsx` | `ContentService.getContentByGroup('pages')` → hero, philosophy, craftsmanship, vision, CTA | `website.changed` | ✅ Live |
| `app/tracking/page.tsx` | `ContentService` (hero text) + `StoreService` (WhatsApp URL) | `website.changed` | ✅ Live |
| `app/reviews/page.tsx` | `ContentService` (hero text) + `ReviewService` | `website.changed` | ✅ Live |
| `app/wishlist/page.tsx` | `ContentService` (empty state) | `website.changed` | ✅ Live |
| `app/cart/page.tsx` | `ContentService` (empty state) | `website.changed` | ✅ Live |
| `app/contact/ContactItems.tsx` | `StoreService.getInfo()` → address, phone, email, hours, WhatsApp | `website.changed` | ✅ Live |

---

## 2. CMS Admin → Storefront Mapping

| Admin Page | Service | Storefront Effect | EventBus |
|---|---|---|---|
| `/admin/website/home` | `HomepageService` | Hero slides, Best Sellers, New Arrivals, Newsletter, Instagram, Testimonials sections | ✅ |
| `/admin/website/navigation` | `NavigationService` | Navbar left/right link groups + mobile drawer | ✅ |
| `/admin/website/footer` | `FooterService` | Footer nav columns, newsletter copy, copyright | ✅ |
| `/admin/website/settings` | `StoreService` | Footer social icons, contact page data, AnnouncementBar, WhatsApp URL | ✅ |
| `/admin/website/appearance` | `AppearanceService` | CSS vars: `--color-accent`, `--color-text-primary`, `--color-background-primary`, `--cms-radius`, `--cms-container-max`, `--cms-transition-speed` | ✅ |
| `/admin/website/seo` | `SEOService` | `<title>`, `<meta description>`, `<meta og:*>`, `<meta twitter:*>` via `SEOInjector` | ✅ |
| `/admin/website/banners` | `BannerService` | Banner data available; storefront consumer can read via `BannerService.getBanners()` | ✅ |
| `/admin/website/pages` | `ContentService` | About page text, Tracking hero/support, Reviews hero, Wishlist empty state, Cart empty state | ✅ |

---

## 3. Removed / Audited Dead Features

| Feature | Decision | Reason |
|---|---|---|
| `redirects/page.tsx` | **Replaced with info page** — mock redirects have no server-side effect; page now explains next.config.ts workflow | ✅ Done |
| Footer newsletter toggle | **Connected** — `showNewsletter` flag now gates newsletter block in `Footer.tsx` | ✅ Done |
| Footer social icons toggle | **Connected** — `showSocialIcons` flag now gates social icons block in `Footer.tsx` | ✅ Done |
| Footer column link editing | **Added** — admin footer page now has full column/link editor (was view-only) | ✅ Done |
| WhatsApp hardcoded URL | **Connected** — `WhatsAppButton.tsx` reads `StoreService.socialMedia.whatsapp` | ✅ Done |
| Tracking page hardcoded WhatsApp | **Fixed** — now reads from `StoreService.socialMedia.whatsapp` | ✅ Done |
| Hardcoded `DEFAULT_LEFT_LINKS` / `DEFAULT_RIGHT_LINKS` in `Navbar.tsx` | **Kept as fallback** — only used when `NavigationService` returns nothing | |
| Hardcoded `DEFAULT_NAV_DATA` / `DEFAULT_SOCIALS` in `Footer.tsx` | **Kept as fallback** — only used when services return nothing | |
| `collections/page.tsx` | **Kept (stub)** — `CollectionDisplayService` awaits storefront consumer | |
| `pages/page.tsx` | **Upgraded** — now edits `ContentService` blocks for all page text content | ✅ Done |
| `media/page.tsx` | **Kept (utility)** — file upload requires Supabase Storage; mock upload works for referencing | |
| Newsletter section (homepage) | **Added render** — `page.tsx` now renders when `newsletter` section is enabled | ✅ Done |
| Instagram section (homepage) | **Added render** — `page.tsx` now renders placeholder grid when `instagram` section is enabled | ✅ Done |
| Testimonials section (homepage) | **Added render** — `page.tsx` now renders approved reviews when `testimonials` section is enabled | ✅ Done |

---

## 4. CMS Coverage Percentage

```
Total controllable storefront regions:  22
CMS-connected (live today):             20
Stub / future:                           1  (collections display)
Deferred (server-side only):             1  (redirects → info page)

Coverage:  91%  →  target 100% at Supabase migration
```

**Breakdown:**

- ✅ Hero section (slides, CTA text, CTA links)
- ✅ Navbar links (primary left group + secondary right group + mobile)
- ✅ Footer columns (title, links, add/remove)
- ✅ Footer newsletter (show/hide, title, subtitle)
- ✅ Footer social icons (show/hide, links from StoreService)
- ✅ Footer copyright + developer credit
- ✅ Social media links (Instagram, Facebook, WhatsApp, TikTok, Pinterest)
- ✅ Announcement Bar (text, color, link, enable/disable)
- ✅ WhatsApp floating button URL
- ✅ Best Sellers / New Arrivals / Featured product sections
- ✅ Newsletter section (homepage — enable/configure in Home Builder)
- ✅ Instagram section (homepage — placeholder grid, enable/configure in Home Builder)
- ✅ Testimonials section (homepage — pulls approved reviews, enable/configure in Home Builder)
- ✅ Appearance (accent color, text color, bg color, border radius, container width, animation speed)
- ✅ SEO metadata (10 pages: global, homepage, shop, about, winter, summer, contact, tracking, reviews, journal)
- ✅ Store information (contact, address, hours, social URLs, WhatsApp)
- ✅ About page text content (hero, philosophy, craftsmanship, vision quote, CTA) — via ContentService
- ✅ Tracking page text content (hero, support section) + WhatsApp URL from StoreService
- ✅ Reviews page hero text — via ContentService
- ✅ Wishlist empty state text — via ContentService
- ✅ Cart empty state text — via ContentService
- 🔲 Collections display order/visibility (admin exists, no storefront consumer)

---

## 5. Remaining Hardcoded Values

| Location | Hardcoded Value | Notes |
|---|---|---|
| `app/layout.tsx` | Static `export const metadata` | SSR baseline; `SEOInjector` overlays CMS values client-side after hydration |
| `app/layout.tsx` | JSON-LD structured data (Organization + LocalBusiness) | Supabase migration: generate server-side from `StoreService` |
| `app/page.tsx` | Campaign looks grid (3 images), brand trust section, testimonials quotes | Static editorial — requires new `HomepageSectionType` variants to be fully CMS-driven |
| `app/about/page.tsx` | Values grid items (4 cards: Elegance, Trust, Quality, Details) | Stored as local const; needs `about_values` JSON block in ContentService for full CMS control |
| `app/contact/page.tsx` | Hero title/subtitle, WhatsApp assistant copy | Hero text is static; contact items come from StoreService ✅ |
| `Navbar.tsx` | Brand address in mobile menu footer | Should read from `StoreService.address` |

---

## 6. EventBus Health

| Event | Emitters | Subscribers |
|---|---|---|
| `website.changed` { area: 'homepage' } | `HomepageService.updateSection`, `addSection`, `deleteSection`, `duplicateSection`, `updateSections` | `HeroSection`, `HomePage`, `Navbar`, `Footer`, `AnnouncementBar`, `ThemeProvider`, `SEOInjector` |
| `website.changed` { area: 'navigation' } | `NavigationService.updateMenu` | same set above |
| `website.changed` { area: 'footer' } | `FooterService.updateSettings` | same set above |
| `website.changed` { area: 'store' } | `StoreService.updateInfo` | same set above |
| `website.changed` { area: 'appearance' } | `AppearanceService.updateSettings` | `ThemeProvider` |
| `website.changed` { area: 'seo' } | `SEOService.update`, `SEOService.upsert` | `SEOInjector` |
| `website.changed` { area: 'content' } | `ContentService.updateContent` | `AboutPage`, `TrackingPage`, `ReviewsPage`, `WishlistPage`, `CartPage` |
| `website.changed` { area: 'banner' } | `BannerService.*` | No storefront subscriber yet |

**EventBus status: HEALTHY** — all CMS mutations now emit; all live frontend components subscribe.

---

## 7. Mock Persistence Health

| Storage Key | Service | Schema |
|---|---|---|
| `aura_mock_db:storefront.homepage` | `HomepageService` | `HomepageSection[]` |
| `aura_mock_db:storefront.navigation` | `NavigationService` | `NavMenu[]` |
| `aura_mock_db:storefront.footer` | `FooterService` | `FooterSettings` |
| `aura_mock_db:storefront.store` | `StoreService` | `StoreInfo` (+ `announcementBar` — backfilled on load) |
| `aura_mock_db:storefront.appearance` | `AppearanceService` | `StoreAppearance` (+ color fields — backfilled on load) |
| `aura_mock_db:storefront.seo` | `SEOService` | `SEOSettings[]` (10 pages — backfilled on load) |
| `aura_mock_db:storefront.banners` | `BannerService` | `Banner[]` |
| `aura_mock_db:storefront.content` | `ContentService` | `ContentBlock[]` (32 blocks across 5 groups) |

**Schema version:** 4  
**Persistence status: HEALTHY** — all services read/write through `mockStorage`; backfill guards prevent missing-field crashes.

---

## 8. Supabase Migration Readiness

| Concern | Status |
|---|---|
| All data flows through a service layer (no direct localStorage reads in components) | ✅ Ready |
| `mockStorage.read/write` are the only persistence calls — one file to swap | ✅ Ready |
| EventBus pattern is storage-agnostic (will work with Supabase Realtime) | ✅ Ready |
| `WebsiteService.getFullConfig()` provides a single hydration endpoint | ✅ Ready |
| `website.service.ts` is the facade — consumers import from one place | ✅ Ready |
| `ContentService` emits `website.changed` — all page consumers re-render on admin save | ✅ Ready |
| SSR metadata in `app/layout.tsx` needs to call Supabase at build/request time | 🔲 Future |
| `SEOInjector` should be replaced by server-side `generateMetadata()` per page | 🔲 Future |
| Media Library needs Supabase Storage integration | 🔲 Future |

---

## 9. Files Created / Modified in This CMS Integration

### Session 1 (Phase 1–2, original)

- `src/lib/services/website.service.ts` — unified CMS facade + `WebsiteConfiguration` type
- `src/components/layout/ThemeProvider.tsx` — CSS custom property injection from `AppearanceService`
- `src/components/layout/AnnouncementBar.tsx` — live announcement bar from `StoreService`
- `src/components/layout/SEOInjector.tsx` — dynamic `<head>` updates from `SEOService`
- `src/lib/services/storefront/appearance.service.ts` — added EventBus emit + color fields
- `src/lib/services/storefront/seo.service.ts` — added EventBus emit + 10 page types + `upsert`
- `src/lib/services/storefront/store.service.ts` — added `AnnouncementBarSettings` + `announcementBar` field
- `src/components/layout/StorefrontLayoutWrapper.tsx` — mounts ThemeProvider, AnnouncementBar, SEOInjector
- `src/app/admin/(dashboard)/website/seo/page.tsx` — all 10 page tabs + ogImage + completion indicator
- `src/app/admin/(dashboard)/website/settings/page.tsx` — announcement bar section with color pickers
- `src/app/admin/(dashboard)/website/appearance/page.tsx` — color picker fields + live preview

### Session 2 (Phase 2 storefront pages + homepage sections)

- `src/lib/services/storefront/content.service.ts` — added EventBus emit + 32 content blocks (about, tracking, reviews, wishlist, cart)
- `src/app/about/page.tsx` — reads hero, philosophy, craftsmanship, vision, CTA from ContentService
- `src/app/tracking/page.tsx` — reads hero from ContentService; WhatsApp URL from StoreService
- `src/app/reviews/page.tsx` — reads hero label/title/subtitle from ContentService
- `src/app/wishlist/page.tsx` — reads empty state title/text/button from ContentService
- `src/app/cart/page.tsx` — reads empty state title/text/button from ContentService
- `src/app/page.tsx` — added Newsletter, Instagram, Testimonials section renders (HomepageService-driven)
