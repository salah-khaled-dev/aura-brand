import { mockProducts, updateMockProducts, Product } from '@/data/mock/products';
import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

/**
 * InventoryService — canonical stock engine (mock-first, Supabase-last).
 *
 * Source of truth for stock is `Product.stock` in `data/mock/products.ts`
 * (single implicit warehouse `wh_main`). Every stock change is recorded as an
 * immutable StockMovement ledger entry and broadcast over the EventBus so that
 * Finance, Dashboard and Product views stay synchronized.
 *
 * Migration note: the public API mirrors the future
 * `IInventoryRepository` / `IStockMovementRepository` contracts. Swapping to
 * Supabase only requires re-implementing the methods below against the DB —
 * no page, store or business-logic changes. The warehouse-level
 * `InventoryLevel` split (multi-warehouse) is the only deferred shape.
 */

export const DEFAULT_WAREHOUSE_ID = 'wh_main';

export type MovementType =
  | 'receive'        // incoming — from purchase receipt / restock
  | 'deduct'         // outgoing — from order fulfillment
  | 'return'         // restored from a customer return
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment';    // manual correction (signed)

export type MovementReferenceType =
  | 'purchase_receipt'
  | 'order'
  | 'return'
  | 'transfer'
  | 'adjustment'
  | 'initial';

export interface InventoryMovement {
  id: string;
  productId: string;
  productName?: string;
  variantId?: string;
  type: MovementType;
  /** Signed delta applied to stock. Positive adds, negative removes. */
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  warehouseId?: string;
  date: string;
  userId: string;
}

export interface InventoryAlert {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  currentStock: number;
  threshold: number;
}

export interface InventoryStats {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: number;
}

export interface RecordMovementInput {
  productId: string;
  variantId?: string;
  type: MovementType;
  /** Signed delta. Positive adds stock, negative removes it. */
  quantity: number;
  reason: string;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  warehouseId?: string;
  userId?: string;
}

let MOCK_MOVEMENTS: InventoryMovement[] = [];

MOCK_MOVEMENTS = mockStorage.read('inventory.movements', MOCK_MOVEMENTS);
const persistMovements = () => mockStorage.write('inventory.movements', MOCK_MOVEMENTS);

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

function findProduct(productId: string): Product | undefined {
  return mockProducts.find(p => p.id === productId);
}

/** Immutably write a product's stock back into the mock store. */
function commitStock(productId: string, newStock: number): Product | undefined {
  const idx = mockProducts.findIndex(p => p.id === productId);
  if (idx === -1) return undefined;
  const updated: Product = { ...mockProducts[idx], stock: Math.max(0, newStock) };
  const next = [...mockProducts];
  next[idx] = updated;
  updateMockProducts(next);
  return updated;
}

function emitLowStock(product: Product) {
  const limit = product.lowStockLimit ?? 10;
  if (product.stock <= 0) {
    eventBus.emit('product.out_of_stock', { productId: product.id, productName: product.name });
  } else if (product.stock <= limit) {
    eventBus.emit('product.low_stock', {
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      threshold: limit,
    });
  }
}

/** Broadcast that inventory (and therefore finance) changed. */
function broadcast(movement: InventoryMovement, product: Product) {
  eventBus.emit('inventory.movement_recorded', movement);
  eventBus.emit('inventory.adjusted', { productId: product.id, newStock: product.stock });
  eventBus.emit('product.updated', product);
  emitLowStock(product);
  // Finance/inventory value depends on stock × costPrice → trigger recompute.
  eventBus.emit('inventory.changed');
  eventBus.emit('finance.changed');
  // Umbrella event the finance dashboard already listens to.
  eventBus.emit('business.changed');
}

export const InventoryService = {
  // ─── Ledger reads ──────────────────────────────────────────────────────────

  async getMovements(productId?: string): Promise<InventoryMovement[]> {
    await delay(300);
    const data = productId ? MOCK_MOVEMENTS.filter(m => m.productId === productId) : [...MOCK_MOVEMENTS];
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getMovement(id: string): Promise<InventoryMovement | undefined> {
    await delay(150);
    return MOCK_MOVEMENTS.find(m => m.id === id);
  },

  async getMovementsByReference(referenceType: MovementReferenceType, referenceId: string): Promise<InventoryMovement[]> {
    await delay(150);
    return MOCK_MOVEMENTS.filter(m => m.referenceType === referenceType && m.referenceId === referenceId);
  },

  // ─── Core write: record a movement and mutate stock ──────────────────────────

  /**
   * Records a stock movement and applies the signed delta to the product.
   * This is the single entry point every other module uses to touch stock.
   */
  async recordMovement(input: RecordMovementInput): Promise<InventoryMovement> {
    await delay(350);
    const product = findProduct(input.productId);
    if (!product) throw new Error('Product not found');

    const balanceBefore = product.stock ?? 0;
    const balanceAfter = Math.max(0, balanceBefore + input.quantity);
    const updated = commitStock(input.productId, balanceAfter);
    if (!updated) throw new Error('Product not found');

    const movement: InventoryMovement = {
      id: `inv_mov_${Date.now()}`,
      productId: input.productId,
      productName: product.name,
      variantId: input.variantId,
      type: input.type,
      quantity: balanceAfter - balanceBefore,
      balanceBefore,
      balanceAfter,
      reason: input.reason,
      referenceType: input.referenceType ?? (input.type === 'adjustment' ? 'adjustment' : undefined),
      referenceId: input.referenceId,
      warehouseId: input.warehouseId ?? DEFAULT_WAREHOUSE_ID,
      date: new Date().toISOString(),
      userId: input.userId ?? 'admin_1',
    };
    MOCK_MOVEMENTS = [movement, ...MOCK_MOVEMENTS];
    persistMovements();
    broadcast(movement, updated);
    return movement;
  },

  /** Convenience: incoming stock. */
  async receiveStock(productId: string, quantity: number, reason: string, ref?: { type: MovementReferenceType; id: string }): Promise<InventoryMovement> {
    return this.recordMovement({
      productId,
      type: 'receive',
      quantity: Math.abs(quantity),
      reason,
      referenceType: ref?.type,
      referenceId: ref?.id,
    });
  },

  /** Convenience: outgoing stock (e.g. order fulfillment). */
  async deductStock(productId: string, quantity: number, reason: string, ref?: { type: MovementReferenceType; id: string }): Promise<InventoryMovement> {
    return this.recordMovement({
      productId,
      type: 'deduct',
      quantity: -Math.abs(quantity),
      reason,
      referenceType: ref?.type,
      referenceId: ref?.id,
    });
  },

  /**
   * Manual adjustment. `quantityChange` is signed (e.g. +10 or -5).
   * Kept for backwards-compatibility with existing pages.
   */
  async adjustStock(productId: string, variantId: string | undefined, quantityChange: number, reason: string): Promise<InventoryMovement> {
    return this.recordMovement({
      productId,
      variantId,
      type: 'adjustment',
      quantity: quantityChange,
      reason,
      referenceType: 'adjustment',
    });
  },

  // ─── Ledger correction (mock-only conveniences) ──────────────────────────────

  /**
   * Edit a recorded movement's quantity/reason, re-applying the stock delta.
   * In a real ledger this would post a correcting entry; for the mock we mutate
   * the row and reconcile stock by the difference.
   */
  async updateMovement(id: string, changes: { quantity?: number; reason?: string }): Promise<InventoryMovement> {
    await delay(300);
    const idx = MOCK_MOVEMENTS.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Movement not found');
    const movement = MOCK_MOVEMENTS[idx];
    const product = findProduct(movement.productId);
    if (!product) throw new Error('Product not found');

    const newQty = changes.quantity ?? movement.quantity;
    const diff = newQty - movement.quantity;

    const balanceBefore = product.stock ?? 0;
    const balanceAfter = Math.max(0, balanceBefore + diff);
    const updatedProduct = commitStock(movement.productId, balanceAfter)!;

    const updated: InventoryMovement = {
      ...movement,
      quantity: newQty,
      reason: changes.reason ?? movement.reason,
      balanceAfter: movement.balanceBefore + newQty,
    };
    const next = [...MOCK_MOVEMENTS];
    next[idx] = updated;
    MOCK_MOVEMENTS = next;
    persistMovements();
    broadcast(updated, updatedProduct);
    return updated;
  },

  /**
   * Delete a movement, reversing its stock effect.
   * Only adjustments are deletable — system movements (orders, receipts) are
   * immutable and must be reversed through their owning module.
   */
  async deleteMovement(id: string): Promise<void> {
    await delay(300);
    const movement = MOCK_MOVEMENTS.find(m => m.id === id);
    if (!movement) throw new Error('Movement not found');
    if (movement.type !== 'adjustment') {
      throw new Error('Only manual adjustments can be deleted');
    }
    const product = findProduct(movement.productId);
    if (product) {
      const reversed = commitStock(movement.productId, (product.stock ?? 0) - movement.quantity);
      if (reversed) {
        eventBus.emit('product.updated', reversed);
        emitLowStock(reversed);
      }
    }
    MOCK_MOVEMENTS = MOCK_MOVEMENTS.filter(m => m.id !== id);
    persistMovements();
    eventBus.emit('inventory.changed');
    eventBus.emit('finance.changed');
    eventBus.emit('business.changed');
  },

  // ─── Derived reads ───────────────────────────────────────────────────────────

  async getLowStockAlerts(threshold?: number): Promise<InventoryAlert[]> {
    await delay(300);
    return mockProducts
      .filter(p => {
        const limit = threshold ?? p.lowStockLimit ?? 10;
        return (p.stock ?? 0) <= limit;
      })
      .map(p => ({
        productId: p.id,
        productName: p.name,
        currentStock: p.stock ?? 0,
        threshold: threshold ?? p.lowStockLimit ?? 10,
      }));
  },

  /** Total inventory valuation at cost (stock × costPrice). */
  getInventoryValue(): number {
    return mockProducts.reduce((sum, p) => sum + (p.stock ?? 0) * (p.costPrice ?? 0), 0);
  },

  getStats(threshold = 10): InventoryStats {
    let inStock = 0, lowStock = 0, outOfStock = 0;
    for (const p of mockProducts) {
      const limit = p.lowStockLimit ?? threshold;
      const s = p.stock ?? 0;
      if (s <= 0) outOfStock++;
      else if (s <= limit) lowStock++;
      else inStock++;
    }
    return {
      totalProducts: mockProducts.length,
      inStock,
      lowStock,
      outOfStock,
      inventoryValue: this.getInventoryValue(),
    };
  },
};
