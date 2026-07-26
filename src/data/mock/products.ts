import type { ProductColorVariant, ProductStockStatus } from '@/data/products';

export type { ProductColorVariant, ProductStockStatus };

export type ProductStatus = 'draft' | 'preview' | 'published' | 'scheduled' | 'hidden' | 'archived' | 'discontinued';

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  colorId?: string;
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
  /** Single source of truth for "which color is default" — set on `products`, not on the color itself. */
  defaultVariantId?: string;
}

// --- Tiny canonical-field helpers (shared by storefront surfaces; no second model) ---

/** Live stock status derived from the canonical stock/lowStockLimit fields. */
export const resolveStockStatus = (p: Pick<Product, 'stock' | 'lowStockLimit'>): ProductStockStatus =>
  p.stock <= 0 ? 'out_of_stock' : p.stock <= p.lowStockLimit ? 'low_stock' : 'in_stock';

/** Primary display image for a canonical product. */
export const primaryImage = (p: Product): string => p.images[0] ?? p.hoverImage ?? '';

/** Pre-discount price to strike through, or undefined when there is no discount. */
export const discountOriginalPrice = (p: Product): number | undefined =>
  p.comparePrice && p.comparePrice > p.price ? p.comparePrice : undefined;
