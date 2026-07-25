import { Product, ProductStatus, mockProducts, updateMockProducts } from '@/data/mock/products';
import { IProductRepository } from '@/lib/contracts/IProductRepository';
import { eventBus } from '@/lib/events/EventBus';
import { addTimelineEvent } from '@/data/mock/timeline';

export interface ProductFilters {
  search?: string;
  category?: string;
  collection?: string;
  season?: string;
  status?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

class MockProductRepositoryImpl implements IProductRepository {
  // --- INTEGRITY GUARDS ---

  /**
   * Reject mutations that would corrupt the unified catalog. Throws an Arabic
   * Error (surfaced as an admin toast) on: duplicate SKU/slug, negative
   * price/comparePrice/stock, invalid discount, or a product with no image.
   */
  private assertCatalogIntegrity(candidate: Product): void {
    if (mockProducts.some((p) => p.id !== candidate.id && p.sku === candidate.sku)) {
      throw new Error('رمز التخزين (SKU) مستخدم مسبقاً');
    }
    if (mockProducts.some((p) => p.id !== candidate.id && p.slug === candidate.slug)) {
      throw new Error('الرابط الدائم (Slug) مستخدم مسبقاً');
    }
    if (candidate.price < 0) throw new Error('السعر لا يمكن أن يكون سالباً');
    if (candidate.comparePrice < 0) throw new Error('سعر المقارنة لا يمكن أن يكون سالباً');
    if (candidate.stock < 0) throw new Error('المخزون لا يمكن أن يكون سالباً');
    if (candidate.comparePrice > 0 && candidate.comparePrice < candidate.price) {
      throw new Error('سعر المقارنة يجب أن يكون أكبر من أو يساوي السعر الحالي');
    }
    if (!candidate.images || candidate.images.length === 0) {
      throw new Error('يجب إضافة صورة واحدة على الأقل للمنتج');
    }
  }

  // --- COMPUTED PROPERTIES HELPERS ---
  
  getProfitMargin(price: number, costPrice: number): number {
    if (!price || price <= 0) return 0;
    if (!costPrice || costPrice < 0) return 100;
    const margin = ((price - costPrice) / price) * 100;
    return Number(margin.toFixed(2));
  }

  getDiscountPercentage(price: number, comparePrice: number): number {
    if (!price || !comparePrice || comparePrice <= price) return 0;
    const discount = ((comparePrice - price) / comparePrice) * 100;
    return Number(discount.toFixed(0));
  }

  getStockStatus(stock: number, lowStockLimit: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (stock <= 0) return 'out_of_stock';
    if (stock <= lowStockLimit) return 'low_stock';
    return 'in_stock';
  }

  // --- CRUD OPERATIONS ---

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filtered = [...mockProducts];
        
        if (filters) {
          if (filters.search) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
              p.name.toLowerCase().includes(query) || 
              p.sku.toLowerCase().includes(query) ||
              p.barcode.toLowerCase().includes(query)
            );
          }
          if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(p => p.category === filters.category);
          }
          if (filters.collection && filters.collection !== 'all') {
            filtered = filtered.filter(p => p.collection === filters.collection);
          }
          if (filters.season && filters.season !== 'all') {
            filtered = filtered.filter(p => p.season === filters.season);
          }
          if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(p => p.status === filters.status);
          }
          if (filters.stockStatus && filters.stockStatus !== 'all') {
            filtered = filtered.filter(p => this.getStockStatus(p.stock, p.lowStockLimit) === filters.stockStatus);
          }
          if (filters.featured !== undefined) {
            filtered = filtered.filter(p => p.featured === filters.featured);
          }
          if (filters.minPrice !== undefined) {
            filtered = filtered.filter(p => p.price >= filters.minPrice!);
          }
          if (filters.maxPrice !== undefined) {
            filtered = filtered.filter(p => p.price <= filters.maxPrice!);
          }
        }
        
        filtered.sort((a, b) => b.id.localeCompare(a.id));
        resolve(filtered);
      }, 500);
    });
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProducts.find(p => p.id === id)), 300);
    });
  }

  async createProduct(data: Omit<Product, 'id'>): Promise<Product> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const newProduct: Product = {
          ...data,
          id: `prod_${Date.now()}`
        };
        try {
          this.assertCatalogIntegrity(newProduct);
        } catch (err) {
          return reject(err);
        }
        updateMockProducts([newProduct, ...mockProducts]);

        eventBus.emit('product.created', newProduct);
        eventBus.emit('products.changed');
        eventBus.emit('inventory.changed');
        addTimelineEvent({
          entityType: 'product',
          entityId: newProduct.id,
          action: 'created',
          description: `تم إنشاء المنتج: ${newProduct.name}`,
          adminId: 'admin_1',
          adminName: 'مدير النظام'
        });

        resolve(newProduct);
      }, 500);
    });
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockProducts.findIndex(p => p.id === id);
        if (index === -1) return reject(new Error('Product not found'));
        
        const oldProduct = mockProducts[index];
        const updated = { ...oldProduct, ...data };

        try {
          this.assertCatalogIntegrity(updated);
        } catch (err) {
          return reject(err);
        }

        // Handle Revisions Logging
        const revision = {
          versionId: `rev_${Date.now()}`,
          timestamp: new Date().toISOString(),
          adminId: 'admin_1',
          changesSummary: 'Autosave Update',
          snapshot: JSON.parse(JSON.stringify(oldProduct)) // Deep copy
        };
        
        updated.revisions = [revision, ...(oldProduct.revisions || [])].slice(0, 50); // Keep last 50
        
        const newArray = [...mockProducts];
        newArray[index] = updated;
        updateMockProducts(newArray);

        eventBus.emit('product.updated', updated);
        eventBus.emit('products.changed');
        if (oldProduct.stock !== updated.stock) {
          eventBus.emit('inventory.changed');
        }
        addTimelineEvent({
          entityType: 'product',
          entityId: id,
          action: 'updated',
          description: `تم تحديث المنتج: ${updated.name}`,
          adminId: 'admin_1',
          adminName: 'مدير النظام'
        });

        resolve(updated);
      }, 500);
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockProducts.findIndex(p => p.id === id);
        if (index === -1) return reject(new Error('Product not found'));
        
        const product = mockProducts[index];
        updateMockProducts(mockProducts.filter(p => p.id !== id));
        
        eventBus.emit('product.deleted', id);
        eventBus.emit('products.changed');
        eventBus.emit('inventory.changed');
        addTimelineEvent({
          entityType: 'product',
          entityId: id,
          action: 'deleted',
          description: `تم حذف المنتج: ${product.name}`,
          adminId: 'admin_1',
          adminName: 'مدير النظام'
        });
        
        resolve();
      }, 500);
    });
  }

  async duplicateProduct(id: string): Promise<Product> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const product = mockProducts.find(p => p.id === id);
        if (!product) return reject(new Error('Product not found'));
        
        const duplicated: Product = {
          ...product,
          id: `prod_${Date.now()}`,
          name: `${product.name} (نسخة)`,
          sku: `${product.sku}-COPY-${Math.floor(Math.random() * 1000)}`,
          slug: `${product.slug}-copy-${Math.floor(Math.random() * 1000)}`,
          status: 'draft',
          revisions: [] // Clear revisions for the copy
        };
        
        updateMockProducts([duplicated, ...mockProducts]);

        eventBus.emit('product.created', duplicated);
        eventBus.emit('products.changed');
        addTimelineEvent({
          entityType: 'product',
          entityId: duplicated.id,
          action: 'created',
          description: `تم نسخ المنتج من: ${product.name}`,
          adminId: 'admin_1',
          adminName: 'مدير النظام'
        });
        
        resolve(duplicated);
      }, 500);
    });
  }

  // --- BULK OPERATIONS ---

  async deleteMultiple(ids: string[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        updateMockProducts(mockProducts.filter(p => !ids.includes(p.id)));
        eventBus.emit('products.bulk_deleted', ids);
        eventBus.emit('products.changed');
        eventBus.emit('inventory.changed');
        resolve();
      }, 500);
    });
  }

  async bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newArray = mockProducts.map(p => 
          ids.includes(p.id) ? { ...p, status } : p
        );
        updateMockProducts(newArray);
        eventBus.emit('products.bulk_updated', ids);
        eventBus.emit('products.changed');
        resolve();
      }, 500);
    });
  }

  async bulkUpdateCategory(ids: string[], category: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newArray = mockProducts.map(p => 
          ids.includes(p.id) ? { ...p, category } : p
        );
        updateMockProducts(newArray);
        eventBus.emit('products.bulk_updated', ids);
        eventBus.emit('products.changed');
        resolve();
      }, 500);
    });
  }
}

export const ProductService = new MockProductRepositoryImpl();
