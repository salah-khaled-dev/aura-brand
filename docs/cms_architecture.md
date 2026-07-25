# Storefront CMS Architecture (Phase 7)

> **Note (2026-07-15):** This doc predates the Supabase migration. Auth is
> now real Supabase Auth. Storefront CMS services described below are still
> mock/localStorage-backed as of this note — see
> [`docs/migration/mock-to-supabase-audit.md`](migration/mock-to-supabase-audit.md)
> (Settings section, Phase C) for current status.

## Overview
The AURA Storefront CMS provides the admin with full control over the storefront's content, layout, navigation, and settings, without requiring source code modifications. This adheres to our "Mock-First Architecture," where data is managed purely via the Service Layer.

## Core Modules
1. **Homepage Builder**: A Shopify-style theme editor using a split-pane interface (`CMSPreviewPanel`) and drag-and-drop sortability (`@dnd-kit/core`).
2. **Banner Manager**: Comprehensive management of site-wide banners (Desktop, Mobile, Popup, Announcement).
3. **Navigation Manager**: Multi-level navigation builder for headers, footers, and mega menus.
4. **Content Manager**: Centralized management for all static text, including pages and order tracking messages.
5. **Appearance**: Complete control over brand identity, colors, typography, theme presets, and global effects (e.g., hover scaling).
6. **SEO Center**: Management of meta titles, descriptions, open graph images, and robots configuration.
7. **Redirects**: Management of 301 and 302 redirects with visit tracking.
8. **Footer Builder**: Dynamic footer configuration including newsletters, social links, and column management.
9. **Store Info**: Management of core business identity, contact methods, tax IDs, and social media links.

## Technical Implementation
- **Service Layer**: All mock data is encapsulated within `src/lib/services/storefront/`. Each service implements basic CRUD methods (e.g., `HomepageService`, `BannerService`).
- **Live Preview (`CMSPreviewPanel`)**: A shared component that provides an isolated `iframe`-like experience for previewing changes across Desktop, Tablet, and Mobile views.
- **Drag & Drop (`@dnd-kit`)**: Utilizing the robust `@dnd-kit` library for complex reordering tasks (e.g., Homepage Sections, Navigation Links).
- **Design System**: All UI elements strictly utilize the Phase 6.5 Enterprise SaaS Design System (Cards, Badges, Buttons, Inputs).
