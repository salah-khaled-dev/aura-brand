# AURA | Premium Luxury Fashion E-commerce & ERP Platform

![AURA Cover](public/github-cover.png)

## Project Overview

AURA is a comprehensive, enterprise-grade luxury fashion e-commerce platform that integrates a high-end storefront with a complete internal ERP and Admin Dashboard. 

The business problem AURA solves is the disconnect between customer experience and backend operations in boutique luxury fashion. Many luxury brands rely on disjointed tools for inventory, order management, and CMS. AURA unifies these into a single, cohesive ecosystem. It provides an exclusive, highly-optimized shopping experience for the customer, while empowering the brand's operations team with a secure, real-time dashboard to manage products, inventory, finances, and website content seamlessly.

---

## Features

### Storefront

The storefront is meticulously engineered to deliver an editorial, ultra-premium user experience.

* **Homepage**: Dynamic, modular homepage featuring hero videos, seasonal collections, and curated lookbooks.
* **Luxury UI**: Minimalist aesthetic utilizing generous whitespace, elegant serif typography, and micro-animations to evoke exclusivity.
* **Product Catalog**: High-performance grid with advanced filtering by category, size, color, and price.
* **Product Details**: Immersive product pages with zooming, image galleries, "Complete the Look" recommendations, and smart size guides.
* **Search**: Real-time semantic search with debouncing and instant results.
* **Wishlist**: Persistent wishlist allowing users to save items for future purchase.
* **Cart**: Slide-out cart with real-time total calculation and dynamic coupon validation.
* **Checkout**: Multi-step, conversion-optimized checkout wizard with integrated payment status (e.g., WhatsApp manual payment routing).
* **Customer Tracking**: Order tracking portal allowing customers to check fulfillment status using their order ID.
* **Reviews**: Integrated customer review system for social proof.
* **Authentication**: Customer login and profile management.
* **Responsive Design**: Flawless execution across mobile, tablet, and desktop devices.
* **RTL Support**: Full Right-to-Left language support tailored for the MENA region.
* **SEO**: Production-ready Technical SEO including dynamic OpenGraph tags, canonical URLs, automated sitemap generation, and JSON-LD structured data.

### Admin Dashboard

The Admin Dashboard serves as the central nervous system of the platform, offering comprehensive ERP capabilities.

* **Products**: Full lifecycle management of the unified product catalog. Add, edit, and archive products, manage variants (sizes, colors), and update pricing.
* **Categories & Collections**: Organize inventory into logical hierarchies and seasonal collections for the storefront.
* **Inventory**: Track stock levels in real-time. Receive alerts for low stock and manage supplier restocks.
* **Orders**: End-to-end order processing pipeline. View incoming orders, update statuses (Pending, Processing, Shipped, Delivered), and generate professional invoices.
* **Customers**: CRM module to view customer purchase history, total lifetime value, and manage accounts.
* **Coupons**: Create and manage discount codes with rules (percentage vs. fixed, minimum order value, expiration dates).
* **Finance**: Real-time revenue tracking, financial reporting, and transaction logs.
* **Website Manager**: A powerful Headless CMS allowing non-technical staff to update homepage banners, featured categories, and navigation without touching code.
* **Roles & Permissions**: Fine-grained access control ensuring staff only see what they are authorized to see.
* **Users**: Internal staff account management.
* **Reports**: Exportable business intelligence dashboards covering sales trends, top-performing products, and customer acquisition.

---

## Architecture

AURA is architected as a modern, decoupled monolithic application utilizing Next.js (App Router) to serve both the Storefront and the Admin Dashboard securely from the same codebase.

* **Frontend (Storefront)**: Server-Side Rendered (SSR) and Statically Generated (SSG) pages for maximum SEO performance and core web vitals.
* **Admin (Dashboard)**: Client-heavy, highly interactive Single Page Application (SPA) experience built within Next.js, protected by secure middleware.
* **Service Layer**: Business logic is abstracted into dedicated singleton services (e.g., `ProductService`, `OrderService`, `AuthService`). This ensures UI components remain stateless and declarative.
* **EventBus**: A custom Pub/Sub event system (`lib/events/EventBus.ts`) decouples modules. For instance, when an order is placed, the EventBus triggers inventory reduction and notification generation without direct component coupling.
* **Mock Storage**: Currently utilizing a robust `localStorage`-based JSON persistence layer (`MockStorage`) that mimics a real database with artificial latency, error rates, and schema validation.
* **State Management**: Complex UI states (Cart, Checkout, Admin Context) are managed via React Context API and custom hooks, providing a global state without the overhead of Redux.
* **Routing**: Next.js App Router handles all routing, utilizing route groups (e.g., `(dashboard)`) to enforce layout boundaries and authentication checks.
* **Reusable Components**: A strict Atomic Design methodology is used. UI primitives (Buttons, Inputs, Modals) are isolated and highly reusable across both Admin and Storefront.

**Data Flow**:
1. User interaction triggers a React component event.
2. The component calls a method on the designated Service (e.g., `OrderService.createOrder()`).
3. The Service validates the payload and writes to the Storage Layer.
4. Upon success, the Service emits a domain event via the `EventBus`.
5. Listening stores/contexts update their state, triggering a reactive UI re-render.

---

## Folder Structure

```text
aura-brand/
├── public/                 # Static assets (images, icons, fonts)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── admin/          # ERP & Admin Dashboard routes
│   │   ├── checkout/       # Secure checkout flow
│   │   ├── shop/           # Product catalog and discovery
│   │   └── ...             # Other storefront routes (tracking, about, etc.)
│   ├── components/         # UI Architecture
│   │   ├── admin/          # Dashboard-specific components
│   │   ├── layout/         # Global layout structures (Navbar, Footer)
│   │   ├── shop/           # Storefront feature components
│   │   └── ui/             # Reusable UI primitives (Buttons, Inputs)
│   ├── context/            # React Context providers (Store, Auth, Notifications)
│   ├── data/               # Seed data and mock databases
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core Business Logic
│   │   ├── events/         # Pub/Sub EventBus system
│   │   ├── i18n/           # Internationalization dictionaries
│   │   ├── services/       # Domain services (Products, Orders, Auth)
│   │   └── storage/        # Persistence layer adapters
│   ├── styles/             # Global CSS, Design Tokens, and animations
│   └── utils/              # Helper functions (analytics, formatting)
├── middleware.ts           # Edge middleware for route protection & auth
├── tailwind.config.ts      # Tailwind styling configuration
└── tsconfig.json           # TypeScript strict configuration
```

---

## Technology Stack

* **Core Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
* **Library**: [React 18](https://react.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS modules
* **Animations**: [Framer Motion](https://www.framer.com/motion/)
* **Icons**: [Tabler Icons](https://tabler-icons.com/) & [Lucide React](https://lucide.dev/)
* **State Management**: React Context API
* **Event Architecture**: Custom Pub/Sub EventBus
* **Persistence**: Local Storage API (Mock DB)
* **Code Quality**: ESLint, Prettier
* **Toast Notifications**: Sonner

---

## Design System

AURA utilizes a bespoke, dual-theme design system.

* **Typography**: Primary elegant Serif for headings (evoking haute couture heritage) paired with a clean Sans-Serif (`Geist`, `Inter`) for highly readable interface elements.
* **Colors**: A curated luxury palette. The storefront utilizes ivory, charcoal, bronze, and muted gold. The Admin dashboard utilizes a high-contrast, accessibility-first SaaS palette with secure dark mode support.
* **Spacing**: An 8pt grid system. Generous whitespace is intentionally used in the storefront to let products breathe, while the Admin dashboard uses tighter data-density spacing.
* **Components**: Strict adherence to reusable UI tokens. Forms, buttons, and cards all inherit from a centralized CSS variable system (`admin-tokens.css`).
* **Animations**: Subtle micro-interactions powered by Framer Motion. Page transitions are fluid, mimicking a high-end native application.
* **Responsive Layout**: Mobile-first architecture scaling up gracefully to ultra-wide displays.
* **RTL & Accessibility**: Built natively with Arabic Right-to-Left (RTL) support. Contrast ratios, ARIA labels, and semantic HTML ensure WCAG AA compliance.

---

## Product System

AURA features a unified product catalog. There is a single source of truth (`ProductService`) that feeds both the storefront and the ERP. 
When a product is added or modified in the Admin Dashboard, the changes are instantly reflected on the storefront. The system supports complex product variants, allowing independent tracking of sizes (S, M, L) and colors, alongside localized descriptions and dynamic pricing.

---

## Order Workflow

The lifecycle of an order is seamlessly integrated:
1. **Customer**: Adds items to cart and enters the Checkout wizard.
2. **Checkout**: Customer submits details. An order is generated with a `pending` status and a unique Tracking ID.
3. **Dashboard**: The Admin team receives a real-time notification via the EventBus. The order appears in the ERP.
4. **Processing**: Admin reviews the order, checks inventory, and approves it (updating status to `processing`).
5. **Tracking**: The customer inputs their Tracking ID on the storefront to see the status change in real-time.
6. **Completion**: Order is marked as `shipped` and `delivered`. Financial metrics in the ERP are automatically updated.

---

## Authentication

Security and identity management are core to the platform.
* **Login**: Secure email/password authentication flow.
* **Sessions**: Simulated JWT-style session management via `AuthService`.
* **RBAC (Role-Based Access Control)**: Strict authorization enforcing roles (e.g., `SuperAdmin`, `Manager`, `Editor`).
* **Permissions**: Access to specific ERP modules (Finance, Users, System Settings) is dynamically guarded based on the user's assigned role. 

---

## Website Manager

A built-in Headless CMS capability allowing operators to control storefront content directly from the ERP.
* **Homepage Builder**: Toggle and reorder sections (Hero, Featured, Categories).
* **Navigation**: Manage top navigation links and hierarchies.
* **Media**: Manage banner assets and promotional imagery.
* **SEO**: Update global metadata, site descriptions, and keywords.
* **Content Management**: Real-time synchronization ensuring that marketing teams can update the site without engineering deployments.

---

## Finance

The integrated ERP includes a financial tracking module. It monitors Gross Merchandise Value (GMV), net revenue (post-discounts), and average order value (AOV). It provides daily, weekly, and monthly aggregate reporting, securely locked behind the `SuperAdmin` role.

---

## Inventory

The inventory module provides complete oversight of stock movements.
* **Stock Tracking**: Real-time deduction upon order placement.
* **Alerts**: Visual indicators for low stock thresholds.
* **Management**: Ability to manually adjust stock levels based on warehouse audits or new supplier shipments.

---

## Development

### Prerequisites
- Node.js 18.17 or newer
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/EngSalahKhaled/aura-brand.git
cd aura-brand
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront, or navigate to `/admin` to access the dashboard.

### Build and Lint

To type-check the project:
```bash
npm run typecheck
```

To build for production:
```bash
npm run build
```

---

## Current Status & Production Audits (Pre-Supabase)

AURA is currently in a production-ready frontend state. It utilizes a highly sophisticated Mock Persistence Layer (`localStorage`) that simulates network latency and complex database relationships. 

In the final production verification audits, several enterprise-grade fixes and enhancements were successfully implemented:
* **XSS Security (DOMPurify)**: Dynamic journal article content and custom HTML sections are sanitized using client/server-safe `isomorphic-dompurify` to strip scripts, iframes, inline event triggers, and `javascript:` protocol payloads.
* **Dynamic Homepage Builder**: Replaced hardcoded storefront rendering sequences with a dynamic loop over builder layout configurations sorted by `order`, fully supporting all 11 design sections (including Testimonials and Custom HTML).
* **Server-Side SEO**: Swapped static metadata properties for Next.js App Router server-side `generateMetadata` dynamic exports linked to database SEO settings. Nested layout containers resolve SEO for client-side pages without breaking hydration.
* **Accessibility Compliance**: Auto-binds input/select/textarea controls to labels using unique `id` and `htmlFor` fields. Propagates validation tags (`aria-required`, `aria-invalid`) and flags modal containers with `role="dialog"` and `aria-modal="true"`.
* **Unified Coupon System**: Unified checkout validation, admin tools, and usage counts under a single source of truth (`CouponService` + `mockStorage`). Leverages the EventBus for immediate, cross-tab reactive updates when coupons are created, updated, used, or deleted.
* **React Hydration Fixes**: Replaced random inline style width computations in data table rows with a deterministic indexing lookup table, resolving tree hydration warnings on all admin pages.

The codebase compiles with `0 errors` (via `tsc`), passes static analysis checks with `0 warnings` (via `eslint`), and packages successfully for production (via `next build`).

The architecture is strictly decoupled; the `Service Layer` acts as an adapter, meaning the application is fully prepared for an upcoming backend migration where the Mock Storage will simply be swapped out for real API endpoints, with zero changes required to the React components.

---

## Future Roadmap

- **Database Migration**: Swap mock storage for a PostgreSQL database via Supabase or Prisma.
- **Authentication**: Integrate NextAuth.js or Clerk for robust OAuth and session management.
- **Payments**: Integrate Stripe or local payment gateways (e.g., Paymob) for automated transaction processing.
- **Email Notifications**: Integrate Resend or SendGrid for automated order confirmations and password resets.
- **File Storage**: Migrate local static assets to an AWS S3 or Cloudinary CDN.
- **Analytics**: Integrate Google Analytics 4 and custom tracking pixels.
- **Shipping APIs**: Connect with DHL or Aramex APIs for automated airway bill generation and live courier tracking.

---

## Screenshots

### Storefront

![Homepage Placeholder](https://via.placeholder.com/800x450/0B1220/FFFFFF?text=Homepage)
![Product Detail Placeholder](https://via.placeholder.com/800x450/0B1220/FFFFFF?text=Product+Details)
![Checkout Flow Placeholder](https://via.placeholder.com/800x450/0B1220/FFFFFF?text=Checkout+Flow)

### Admin Dashboard

![Dashboard Overview Placeholder](https://via.placeholder.com/800x450/0F172A/FFFFFF?text=ERP+Dashboard)
![Order Management Placeholder](https://via.placeholder.com/800x450/0F172A/FFFFFF?text=Order+Management)
![Website Manager Placeholder](https://via.placeholder.com/800x450/0F172A/FFFFFF?text=Website+Manager)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
