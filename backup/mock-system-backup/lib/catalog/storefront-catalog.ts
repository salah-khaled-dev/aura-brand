/**
 * Storefront catalog queries.
 *
 * These are thin, pure read helpers over the ONE canonical catalog
 * (`mockProducts` in `src/data/mock/products.ts`). They are NOT a second service
 * or a second model — every function takes and returns the canonical `Product`.
 * The storefront only ever sees `published` products through these helpers.
 *
 * Each selector accepts an optional `source` list so the reactive hook can pass
 * its current snapshot; with no argument they read the live catalog (correct for
 * synchronous server components such as the sitemap and product page metadata).
 */
import { getLiveProducts, type Product } from '@/data/mock/products';

const live = (): Product[] => getLiveProducts();

/** All storefront-visible products (status === 'published'). */
export const getPublishedProducts = (source: Product[] = live()): Product[] =>
  source.filter((p) => p.status === 'published');

/** A single published product by id, or undefined (draft/hidden/archived/unknown). */
export const getPublishedProductById = (id: string, source: Product[] = live()): Product | undefined =>
  getPublishedProducts(source).find((p) => p.id === id);

/** Published products for a season — drives the Winter/Summer pages and /shop filter. */
export const getProductsBySeason = (season: string, source: Product[] = live()): Product[] =>
  getPublishedProducts(source).filter((p) => p.season === season);

/** Storefront search across name, collection and description. */
export const searchProducts = (query: string, source: Product[] = live()): Product[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getPublishedProducts(source).filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.collection.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
};

/** Same-collection matches first, backfilled with same-season items, capped at `limit`. */
export const getRelatedProducts = (product: Product, source: Product[] = live(), limit = 4): Product[] => {
  const pool = getPublishedProducts(source).filter((p) => p.id !== product.id);
  const sameCollection = pool.filter((p) => p.collection === product.collection);
  const sameSeason = pool.filter((p) => p.collection !== product.collection && p.season === product.season);
  return [...sameCollection, ...sameSeason].slice(0, limit);
};
