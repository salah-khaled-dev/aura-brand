export interface ProductColorVariant {
  color: string;
  value: string;
  images: string[];
}

export type ProductStockStatus = "in_stock" | "low_stock" | "out_of_stock";

/**
 * Authoring-seed shape (flat). This is NOT the runtime product model — it exists
 * only so the catalog seed below can be written in the storefront's original
 * format. The single canonical `Product` interface lives in
 * `src/data/mock/products.ts`; `seedToProduct` maps this shape onto it once.
 */
export interface StorefrontSeedInput {
  id: string;
  title: string;
  price: number;
  /** Pre-discount price. When set and greater than `price`, the card shows a discount badge and a struck-through original price. */
  originalPrice?: number;
  image: string;
  hoverImage?: string;
  collection: string;
  season: "summer" | "winter";
  badge?: string;
  /** Defaults to "in_stock" when omitted. */
  stockStatus?: ProductStockStatus;
  description: string;
  details: string[];
  fabric: string;
  packaging: string;
  colors?: string[];
  sizes?: string[];
  variants?: ProductColorVariant[];
}

/**
 * Authoring seed for the unified product catalog. This is NOT a live catalog and
 * must NOT be imported by storefront pages/components — they read the single
 * source of truth via `src/lib/services/storefront/storefront-product.service.ts`.
 * Only `src/data/mock/products.ts` consumes this seed (once, at catalog init) to
 * build the canonical rich `Product[]`.
 *
 * Intentionally empty — fresh products are created from the admin panel and
 * persisted through the catalog service (Supabase-backed once wired up).
 */
export const storefrontSeed: StorefrontSeedInput[] = [];
