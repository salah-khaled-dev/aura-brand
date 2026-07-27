import { Product, ProductStatus } from '@/data/mock/products';
import type { ProductFilters } from '@/lib/services/product.service';

export interface IProductRepository {
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  /** Published products with cost_price/costing/revisions never selected — the only safe read path for unauthenticated storefront callers. */
  getPublicProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: Omit<Product, 'id'>): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  duplicateProduct(id: string): Promise<Product>;
  
  deleteMultiple(ids: string[]): Promise<void>;
  bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<void>;
  bulkUpdateCategory(ids: string[], category: string): Promise<void>;
}
