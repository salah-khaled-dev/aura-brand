import { mockStorage } from '@/lib/storage/mock-storage';
import { storefrontSeed, type StorefrontSeedInput as SeedProduct, type ProductColorVariant, type ProductStockStatus } from '@/data/products';

export type { ProductColorVariant, ProductStockStatus };

export type ProductStatus = 'draft' | 'preview' | 'published' | 'scheduled' | 'hidden' | 'archived' | 'discontinued';

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  cost?: number;
  stock: number;
  weight?: number;
  image?: string;
  status?: 'active' | 'inactive';
}

export interface ProductSeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
}

export interface ProductStats {
  views: number;
  orders: number;
  revenue: number;
  wishlistCount: number;
  cartCount: number;
  reviewsCount: number;
}

export interface ProductCosting {
  fabric: number;
  accessories: number;
  manufacturing: number;
  printing: number;
  packaging: number;
  photography: number;
  shipping: number;
  marketing: number;
  taxes: number;
  marketplaceFees: number;
  otherExpenses: number;
}

export interface ProductRevision {
  versionId: string;
  timestamp: string;
  adminId: string;
  changesSummary: string;
  // A snapshot of the product at this version could be stored here
  snapshot: any; 
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  
  category: string;
  collection: string;
  season: string;
  brand: string;
  tags: string[];

  price: number;
  comparePrice: number;
  
  // Advanced Costing Engine
  costing: ProductCosting;
  costPrice: number; // calculated from costing
  
  sku: string;
  barcode: string;
  stock: number; // total stock or global stock if variants don't exist
  lowStockLimit: number;
  
  material: string;
  weight: number;

  variants: ProductVariant[];

  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;

  // Workflow & Scheduler
  status: ProductStatus;
  publishAt?: string;
  hideAt?: string;
  archiveAt?: string;

  // Revisions
  revisions: ProductRevision[];

  seo: ProductSeo;
  stats: ProductStats;

  images: string[];

  // Storefront presentation fields (merged from the storefront catalog during
  // unification — optional so admin-authored products remain valid without them).
  hoverImage?: string;
  badge?: string;
  details?: string[];
  fabric?: string;
  packaging?: string;
  colors?: string[];
  sizes?: string[];
  colorVariants?: ProductColorVariant[];
}

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

function stockFromStatus(status?: SeedProduct['stockStatus']): number {
  if (status === 'out_of_stock') return 0;
  if (status === 'low_stock') return 4;
  return 25;
}

/**
 * Convert one storefront authoring-seed entry into a canonical rich `Product`.
 * This is the ONE migration seam: the flat storefront catalog is consumed here
 * exactly once to build the unified catalog. Nothing is lost — presentation
 * fields (hoverImage, badge, details, fabric, packaging, colors, sizes,
 * colorVariants) ride along on the canonical object.
 */
function seedToProduct(seed: SeedProduct): Product {
  const images = Array.from(
    new Set(
      [seed.image, seed.hoverImage, ...(seed.variants?.flatMap((v) => v.images) ?? [])].filter(
        (img): img is string => Boolean(img),
      ),
    ),
  );

  return {
    id: seed.id,
    name: seed.title,
    slug: `aura-${seed.id}`,
    shortDescription: seed.description.slice(0, 120),
    description: seed.description,
    category: seed.collection,
    collection: seed.collection,
    season: seed.season,
    brand: 'AURA',
    tags: seed.badge ? [seed.badge] : [],
    price: seed.price,
    comparePrice: seed.originalPrice ?? 0,
    costing: {
      fabric: 0, accessories: 0, manufacturing: 0, printing: 0, packaging: 0,
      photography: 0, shipping: 0, marketing: 0, taxes: 0, marketplaceFees: 0, otherExpenses: 0,
    },
    costPrice: Math.round(seed.price * 0.4),
    sku: `AURA-PRD-${seed.id.padStart(3, '0')}`,
    barcode: `6281${seed.id.padStart(8, '0')}`,
    stock: stockFromStatus(seed.stockStatus),
    lowStockLimit: 5,
    material: seed.fabric,
    weight: 0.5,
    variants: [],
    featured: ['1', '9', '19', '21'].includes(seed.id),
    bestSeller: Number(seed.id) <= 8,
    newArrival: seed.badge === 'كولكشن ٢٠٢٧',
    status: 'published',
    revisions: [],
    seo: {
      metaTitle: `${seed.title} | AURA`,
      metaDescription: seed.description.slice(0, 160),
      keywords: [seed.collection, seed.season, 'AURA'].join(', '),
      canonicalUrl: `https://aura-fashion-virid.vercel.app/product/${seed.id}`,
      ogTitle: seed.title,
      ogDescription: seed.description.slice(0, 160),
    },
    stats: { views: 0, orders: 0, revenue: 0, wishlistCount: 0, cartCount: 0, reviewsCount: 0 },
    images,
    hoverImage: seed.hoverImage,
    badge: seed.badge,
    details: seed.details,
    fabric: seed.fabric,
    packaging: seed.packaging,
    colors: seed.colors,
    sizes: seed.sizes ?? DEFAULT_SIZES,
    colorVariants: seed.variants,
  };
}

/**
 * Pristine seed catalog. Identical on server and client first paint, so the
 * storefront hook can initialise from it without a hydration mismatch before
 * swapping to the persisted (localStorage) catalog after mount.
 */
const catalogSeed: Product[] = storefrontSeed.map(seedToProduct);

export const getCatalogSeed = (): Product[] => catalogSeed;

export let mockProducts: Product[] = mockStorage.read('products', catalogSeed);

export const updateMockProducts = (newProducts: Product[]) => {
  mockProducts = newProducts;
  mockStorage.write('products', newProducts);
};

/**
 * Live accessor for the single catalog. Defined in this module so it reads the
 * local `mockProducts` variable directly — callers never depend on ESM
 * live-binding interop, so an admin mutation is always visible immediately.
 */
export const getLiveProducts = (): Product[] => mockProducts;

/**
 * Re-read the catalog from persistence and adopt it if it differs. Used for
 * cross-tab sync: when another tab (e.g. the Admin) edits a product, this tab's
 * in-memory `mockProducts` is stale until it re-reads localStorage. Returns true
 * only when the catalog actually changed, so callers avoid needless re-renders.
 */
export const refreshFromStorage = (): boolean => {
  const persisted = mockStorage.read('products', catalogSeed);
  if (JSON.stringify(persisted) === JSON.stringify(mockProducts)) return false;
  mockProducts = persisted;
  return true;
};

// --- Tiny canonical-field helpers (shared by storefront surfaces; no second model) ---

/** Live stock status derived from the canonical stock/lowStockLimit fields. */
export const resolveStockStatus = (p: Pick<Product, 'stock' | 'lowStockLimit'>): ProductStockStatus =>
  p.stock <= 0 ? 'out_of_stock' : p.stock <= p.lowStockLimit ? 'low_stock' : 'in_stock';

/** Primary display image for a canonical product. */
export const primaryImage = (p: Product): string => p.images[0] ?? p.hoverImage ?? '';

/** Pre-discount price to strike through, or undefined when there is no discount. */
export const discountOriginalPrice = (p: Product): number | undefined =>
  p.comparePrice && p.comparePrice > p.price ? p.comparePrice : undefined;
