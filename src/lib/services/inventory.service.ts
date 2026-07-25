import { Product } from '@/data/mock/products';
import { ProductService } from '@/lib/services/product.service';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

/**
 * InventoryService — canonical stock engine, Supabase-backed.
 *
 * Source of truth for stock is `products.stock` (single implicit warehouse
 * `wh_main`), same as the mock model it replaces. Every stock change is
 * recorded as an immutable `stock_movements` ledger row via the
 * `record_stock_movement` / `update_stock_movement` / `delete_stock_movement`
 * RPCs (see 20260715000004_stock_movements.sql), which apply the stock delta
 * and write the ledger row atomically, and broadcast over the EventBus so
 * that Finance, Dashboard and Product views stay synchronized.
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

const supabase = createClient();

type MovementRow = Tables<'stock_movements'> & { products: { name_ar: string } | null };

const SELECT_WITH_PRODUCT = '*, products(name_ar)';

function rowToMovement(row: MovementRow): InventoryMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.products?.name_ar ?? undefined,
    variantId: row.variant_id ?? undefined,
    type: row.type as MovementType,
    quantity: row.quantity,
    balanceBefore: row.balance_before,
    balanceAfter: row.balance_after,
    reason: row.reason,
    referenceType: (row.reference_type as MovementReferenceType | null) ?? undefined,
    referenceId: row.reference_id ?? undefined,
    warehouseId: row.warehouse_id,
    date: row.created_at,
    userId: row.admin_id ?? 'admin_1',
  };
}

async function fetchMovementRow(id: string): Promise<MovementRow> {
  const { data, error } = await supabase.from('stock_movements').select(SELECT_WITH_PRODUCT).eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as MovementRow;
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
    let query = supabase.from('stock_movements').select(SELECT_WITH_PRODUCT).order('created_at', { ascending: false });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as MovementRow[]).map(rowToMovement);
  },

  async getMovement(id: string): Promise<InventoryMovement | undefined> {
    const { data, error } = await supabase.from('stock_movements').select(SELECT_WITH_PRODUCT).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToMovement(data as MovementRow) : undefined;
  },

  async getMovementsByReference(referenceType: MovementReferenceType, referenceId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(SELECT_WITH_PRODUCT)
      .eq('reference_type', referenceType)
      .eq('reference_id', referenceId);
    if (error) throw new Error(error.message);
    return (data as MovementRow[]).map(rowToMovement);
  },

  // ─── Core write: record a movement and mutate stock ──────────────────────────

  /**
   * Records a stock movement and applies the signed delta to the product.
   * This is the single entry point every other module uses to touch stock.
   */
  async recordMovement(input: RecordMovementInput): Promise<InventoryMovement> {
    const { data, error } = await supabase.rpc('record_stock_movement', {
      p_product_id: input.productId,
      p_variant_id: input.variantId ?? null,
      p_type: input.type,
      p_quantity: input.quantity,
      p_reason: input.reason,
      p_reference_type: input.referenceType ?? null,
      p_reference_id: input.referenceId ?? null,
      p_warehouse_id: input.warehouseId ?? null,
    });
    if (error) throw new Error(error.message);
    const created = data?.[0];
    if (!created) throw new Error('Product not found');

    const movement = rowToMovement(await fetchMovementRow(created.id));
    const product = await ProductService.getProduct(movement.productId);
    if (product) broadcast(movement, product);
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

  // ─── Ledger correction ────────────────────────────────────────────────────

  /**
   * Edit a recorded movement's quantity/reason. Re-applies the *difference*
   * between the old and new quantity to the product's current stock.
   */
  async updateMovement(id: string, changes: { quantity?: number; reason?: string }): Promise<InventoryMovement> {
    const { data, error } = await supabase.rpc('update_stock_movement', {
      p_movement_id: id,
      p_quantity: changes.quantity ?? null,
      p_reason: changes.reason ?? null,
    });
    if (error) throw new Error(error.message);
    const updated = data?.[0];
    if (!updated) throw new Error('Movement not found');

    const movement = rowToMovement(await fetchMovementRow(updated.id));
    const product = await ProductService.getProduct(movement.productId);
    if (product) broadcast(movement, product);
    return movement;
  },

  /**
   * Delete a movement, reversing its stock effect.
   * Only adjustments are deletable — system movements (orders, receipts) are
   * immutable and must be reversed through their owning module.
   */
  async deleteMovement(id: string): Promise<void> {
    const before = await fetchMovementRow(id);
    const { error } = await supabase.rpc('delete_stock_movement', { p_movement_id: id });
    if (error) throw new Error(error.message);

    const product = await ProductService.getProduct(before.product_id);
    if (product) {
      eventBus.emit('product.updated', product);
      emitLowStock(product);
    }
    eventBus.emit('inventory.changed');
    eventBus.emit('finance.changed');
    eventBus.emit('business.changed');
  },

  // ─── Derived reads ───────────────────────────────────────────────────────────

  async getLowStockAlerts(threshold?: number): Promise<InventoryAlert[]> {
    const { data, error } = await supabase.from('products').select('id, name_ar, stock, low_stock_limit');
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { id: string; name_ar: string; stock: number; low_stock_limit: number }[];
    return rows
      .filter(p => (p.stock ?? 0) <= (threshold ?? p.low_stock_limit ?? 10))
      .map(p => ({
        productId: p.id,
        productName: p.name_ar,
        currentStock: p.stock ?? 0,
        threshold: threshold ?? p.low_stock_limit ?? 10,
      }));
  },

  /** Total inventory valuation at cost (stock × costPrice). */
  async getInventoryValue(): Promise<number> {
    const { data, error } = await supabase.from('products').select('stock, cost_price');
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { stock: number; cost_price: number | null }[];
    return rows.reduce((sum, p) => sum + (p.stock ?? 0) * (p.cost_price ?? 0), 0);
  },

  async getStats(threshold = 10): Promise<InventoryStats> {
    const { data, error } = await supabase.from('products').select('stock, low_stock_limit, cost_price');
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { stock: number; low_stock_limit: number; cost_price: number | null }[];

    let inStock = 0, lowStock = 0, outOfStock = 0, inventoryValue = 0;
    for (const p of rows) {
      const limit = p.low_stock_limit ?? threshold;
      const s = p.stock ?? 0;
      if (s <= 0) outOfStock++;
      else if (s <= limit) lowStock++;
      else inStock++;
      inventoryValue += s * (p.cost_price ?? 0);
    }
    return {
      totalProducts: rows.length,
      inStock,
      lowStock,
      outOfStock,
      inventoryValue,
    };
  },
};
