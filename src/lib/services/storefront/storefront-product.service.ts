/**
 * Storefront catalog reads — Supabase-backed.
 *
 * Thin read layer over `ProductService` (the same Supabase repository the admin
 * panel uses). `ProductService.getProducts()` already returns the canonical,
 * fully-mapped `Product` shape (images, variants, costing/stats/revisions JSONB,
 * etc.) via its own `rowToProduct` mapper, so this module does NOT re-map rows —
 * it only adds the storefront-specific "published only" + derived-list filters
 * that used to live in `storefront-catalog.ts` (now retired, see
 * backup/mock-system-backup/storefront-catalog.ts).
 *
 * Every function does its own round trip to `ProductService.getProducts()`
 * unless noted — acceptable at this catalog's size and consistent with how the
 * admin panel already fetches. Client components that already hold a `Product[]`
 * from `useStorefrontProducts()` should prefer the sync helpers below
 * (`getRelatedProducts`) instead of re-fetching.
 */
import { ProductService } from '@/lib/services/product.service';
import type { Product } from '@/data/mock/products';

const ZERO_COSTING = {
  fabric: 0, accessories: 0, manufacturing: 0, printing: 0, packaging: 0,
  photography: 0, shipping: 0, marketing: 0, taxes: 0, marketplaceFees: 0, otherExpenses: 0,
};

/**
 * `ProductService.getPublicProducts()` never asks Postgres for `cost_price`/
 * `costing`/`revisions` in the first place — the anon Postgres role has had
 * column-level SELECT on those three columns revoked (see the
 * 20260727120000 migration), so even a direct REST call with the public
 * anon key can't read them. This zeroing is defense-in-depth on top of that
 * DB-level enforcement, not the primary guard — don't swap the call below
 * back to `ProductService.getProducts()` (which selects `*` and would 403
 * for anon under the new grants, since `*` is expanded to every column
 * including the restricted ones).
 */
function stripInternalCostFields(product: Product): Product {
  return { ...product, costPrice: 0, costing: ZERO_COSTING, revisions: [] };
}

/** All storefront-visible products (status === 'published'). */
export async function getPublishedProducts(): Promise<Product[]> {
  const products = await ProductService.getPublicProducts();
  return products.map(stripInternalCostFields);
}

/** A single published product by id, or undefined (draft/hidden/archived/unknown/not found). */
export async function getPublishedProductById(id: string): Promise<Product | undefined> {
  const products = await getPublishedProducts();
  return products.find((p) => p.id === id);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const products = await getPublishedProducts();
  return products.filter((p) => p.category === category);
}

/** Published products for a season — drives the Winter/Summer pages and /shop filter. */
export async function getProductsBySeason(season: string): Promise<Product[]> {
  const products = await getPublishedProducts();
  return products.filter((p) => p.season === season);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getPublishedProducts();
  return products.filter((p) => p.featured);
}

export async function getNewArrivals(): Promise<Product[]> {
  const products = await getPublishedProducts();
  return products.filter((p) => p.newArrival);
}

export async function getBestSellers(): Promise<Product[]> {
  const products = await getPublishedProducts();
  return products.filter((p) => p.bestSeller);
}

/** Storefront search across name, collection and description. */
export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const products = await getPublishedProducts();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.collection.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
}

/**
 * Same-collection matches first, backfilled with same-season items, capped at `limit`.
 * Sync and takes an explicit `source` — callers on the client already have a loaded
 * `Product[]` from `useStorefrontProducts()` and shouldn't pay for another round trip.
 */
export function getRelatedProducts(product: Product, source: Product[], limit = 4): Product[] {
  const pool = source.filter((p) => p.id !== product.id);
  const sameCollection = pool.filter((p) => p.collection === product.collection);
  const sameSeason = pool.filter((p) => p.collection !== product.collection && p.season === product.season);
  return [...sameCollection, ...sameSeason].slice(0, limit);
}
