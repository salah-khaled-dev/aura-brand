import { IBusinessRepository } from '@/lib/contracts/IBusinessRepository';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';
import { OrderService } from '@/lib/services/order.service';
import { ProductService } from '@/lib/services/product.service';
import { InventoryService } from '@/lib/services/inventory.service';

export interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
  contactName: string;
  contactPerson?: string;
  email: string;
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  address: string;
  taxNumber: string;
  commercialRegistration: string;
  paymentTerms: string;
  currency: string;
  materialsProvided: string[];
  totalPurchases: number;
  outstandingBalance: number;
  status: 'active' | 'inactive';
  notes: string;
}

export interface PurchaseOrderItem {
  productId?: string;
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  reference: string;
  date: string;
  expectedArrival: string;
  receivedDate?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes: string;
}

export interface Expense {
  id: string;
  name: string;
  category: 'manufacturing' | 'packaging' | 'shipping' | 'marketing' | 'operational' | 'software' | 'salary' | 'other' | string;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  supplierId?: string;
  description?: string;
  notes?: string;
  receipt?: string;
  referenceId?: string;
  status: 'paid' | 'pending' | 'cancelled';
}

export interface Asset {
  id: string;
  name: string;
  type: 'equipment' | 'property' | 'software' | 'vehicle' | 'other' | string;
  purchaseDate: string;
  purchaseValue?: number;
  currentValue: number;
  depreciation?: number;
  depreciationRate?: number;
  status: 'active' | 'sold' | 'written_off';
  documents?: string[];
}

export interface Liability {
  id: string;
  name: string;
  type: 'loan' | 'invoice' | 'supplier_debt' | 'tax' | string;
  supplierId?: string;
  amount: number;
  dueDate: string;
  status?: 'unpaid' | 'partial' | 'paid';
}

export interface Capital {
  id: string;
  type: 'increase' | 'withdrawal';
  owner: string;
  amount: number;
  reason?: string;
  date: string;
  notes?: string;
}

/** Order states that count toward recognized revenue. */
const REVENUE_STATUSES = ['delivered'];
const NON_REVENUE_STATUSES = ['cancelled', 'refunded', 'returned'];

const supabase = createClient();

function rowToSupplier(row: Tables<'suppliers'>, stats: { totalPurchases: number; outstandingBalance: number }): Supplier {
  return {
    id: row.id,
    name: row.name,
    supplierCode: row.supplier_code,
    contactName: row.contact_name,
    contactPerson: row.contact_person ?? undefined,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    country: row.country,
    city: row.city,
    address: row.address,
    taxNumber: row.tax_number,
    commercialRegistration: row.commercial_registration,
    paymentTerms: row.payment_terms,
    currency: row.currency,
    materialsProvided: row.materials_provided,
    totalPurchases: stats.totalPurchases,
    outstandingBalance: stats.outstandingBalance,
    status: row.status as Supplier['status'],
    notes: row.notes,
  };
}

function rowToPO(row: Tables<'purchase_orders'>): PurchaseOrder {
  return {
    id: row.id,
    supplierId: row.supplier_id ?? '',
    reference: row.reference,
    date: row.date,
    expectedArrival: row.expected_arrival ?? '',
    receivedDate: row.received_date ?? undefined,
    items: (row.items as unknown as PurchaseOrderItem[]) ?? [],
    subtotal: row.subtotal,
    tax: row.tax,
    shipping: row.shipping,
    total: row.total,
    status: row.status as PurchaseOrder['status'],
    paymentStatus: row.payment_status as PurchaseOrder['paymentStatus'],
    notes: row.notes,
  };
}

function rowToExpense(row: Tables<'expenses'>): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    paymentMethod: row.payment_method,
    supplierId: row.supplier_id ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    receipt: row.receipt ?? undefined,
    referenceId: row.reference_id ?? undefined,
    status: row.status as Expense['status'],
  };
}

function rowToAsset(row: Tables<'assets'>): Asset {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    purchaseDate: row.purchase_date,
    purchaseValue: row.purchase_value ?? undefined,
    currentValue: row.current_value,
    depreciation: row.depreciation ?? undefined,
    depreciationRate: row.depreciation_rate ?? undefined,
    status: row.status as Asset['status'],
    documents: row.documents,
  };
}

function rowToLiability(row: Tables<'liabilities'>): Liability {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    supplierId: row.supplier_id ?? undefined,
    amount: row.amount,
    dueDate: row.due_date,
    status: row.status as Liability['status'],
  };
}

function rowToCapital(row: Tables<'capital'>): Capital {
  return {
    id: row.id,
    type: row.type as Capital['type'],
    owner: row.owner,
    amount: row.amount,
    reason: row.reason ?? undefined,
    date: row.date,
    notes: row.notes ?? undefined,
  };
}

/**
 * Live Supabase-backed business/finance repository. Supplier
 * totalPurchases/outstandingBalance are computed on read from
 * purchase_orders (same no-stale-cache approach as customer stats) instead
 * of a stored+recomputed counter — receiving/paying a PO is reflected
 * immediately, nothing to keep in sync.
 */
export class SupabaseBusinessRepository implements IBusinessRepository {
  private async getSupplierStats(supplierIds: string[]): Promise<Map<string, { totalPurchases: number; outstandingBalance: number }>> {
    const map = new Map<string, { totalPurchases: number; outstandingBalance: number }>();
    for (const id of supplierIds) map.set(id, { totalPurchases: 0, outstandingBalance: 0 });
    if (supplierIds.length === 0) return map;

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('supplier_id, total, status, payment_status')
      .in('supplier_id', supplierIds)
      .in('status', ['received', 'partially_received']);
    if (error) throw error;

    for (const po of data ?? []) {
      const agg = po.supplier_id ? map.get(po.supplier_id) : undefined;
      if (!agg) continue;
      agg.totalPurchases += po.total;
      agg.outstandingBalance += po.payment_status === 'paid' ? 0 : po.payment_status === 'partial' ? po.total / 2 : po.total;
    }
    return map;
  }

  // --- Suppliers ---
  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const statsMap = await this.getSupplierStats(rows.map((r) => r.id));
    return rows.map((row) => rowToSupplier(row, statsMap.get(row.id) ?? { totalPurchases: 0, outstandingBalance: 0 }));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const statsMap = await this.getSupplierStats([id]);
    return rowToSupplier(data, statsMap.get(id) ?? { totalPurchases: 0, outstandingBalance: 0 });
  }

  async createSupplier(data: Omit<Supplier, 'id' | 'totalPurchases' | 'outstandingBalance'>): Promise<Supplier> {
    const insertRow: TablesInsert<'suppliers'> = {
      name: data.name,
      supplier_code: data.supplierCode || `SUP-${Date.now().toString().slice(-6)}`,
      contact_name: data.contactName,
      contact_person: data.contactPerson ?? null,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      country: data.country,
      city: data.city,
      address: data.address,
      tax_number: data.taxNumber,
      commercial_registration: data.commercialRegistration,
      payment_terms: data.paymentTerms,
      currency: data.currency,
      materials_provided: data.materialsProvided,
      status: data.status,
      notes: data.notes,
    };
    const { data: row, error } = await supabase.from('suppliers').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('business.changed');
    return rowToSupplier(row, { totalPurchases: 0, outstandingBalance: 0 });
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const patch: Partial<TablesInsert<'suppliers'>> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.contactName !== undefined) patch.contact_name = data.contactName;
    if (data.contactPerson !== undefined) patch.contact_person = data.contactPerson;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp;
    if (data.country !== undefined) patch.country = data.country;
    if (data.city !== undefined) patch.city = data.city;
    if (data.address !== undefined) patch.address = data.address;
    if (data.taxNumber !== undefined) patch.tax_number = data.taxNumber;
    if (data.commercialRegistration !== undefined) patch.commercial_registration = data.commercialRegistration;
    if (data.paymentTerms !== undefined) patch.payment_terms = data.paymentTerms;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.materialsProvided !== undefined) patch.materials_provided = data.materialsProvided;
    if (data.status !== undefined) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await supabase.from('suppliers').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Supplier not found');
    eventBus.emit('business.changed');
    const statsMap = await this.getSupplierStats([id]);
    return rowToSupplier(row, statsMap.get(id) ?? { totalPurchases: 0, outstandingBalance: 0 });
  }

  async deleteSupplier(id: string): Promise<void> {
    const supplier = await this.getSupplier(id);
    if (!supplier) throw new Error('Supplier not found');
    if (supplier.status !== 'inactive') {
      throw new Error('Cannot permanently delete a supplier that is not archived.');
    }
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('business.changed');
  }

  async archiveSupplier(id: string): Promise<void> {
    await this.updateSupplier(id, { status: 'inactive' });
  }

  async restoreSupplier(id: string): Promise<void> {
    await this.updateSupplier(id, { status: 'active' });
  }

  // --- Purchase Orders ---
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToPO);
  }

  async createPurchaseOrder(data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    const insertRow: TablesInsert<'purchase_orders'> = {
      supplier_id: data.supplierId || null,
      reference: data.reference,
      date: data.date,
      expected_arrival: data.expectedArrival || null,
      received_date: data.receivedDate || null,
      items: data.items as unknown as Json,
      subtotal: data.subtotal,
      tax: data.tax,
      shipping: data.shipping,
      total: data.total,
      status: data.status,
      payment_status: data.paymentStatus,
      notes: data.notes,
    };
    const { data: row, error } = await supabase.from('purchase_orders').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('business.changed');
    return rowToPO(row);
  }

  async updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const patch: Partial<TablesInsert<'purchase_orders'>> = {};
    if (data.supplierId !== undefined) patch.supplier_id = data.supplierId || null;
    if (data.reference !== undefined) patch.reference = data.reference;
    if (data.date !== undefined) patch.date = data.date;
    if (data.expectedArrival !== undefined) patch.expected_arrival = data.expectedArrival || null;
    if (data.receivedDate !== undefined) patch.received_date = data.receivedDate || null;
    if (data.items !== undefined) patch.items = data.items as unknown as Json;
    if (data.subtotal !== undefined) patch.subtotal = data.subtotal;
    if (data.tax !== undefined) patch.tax = data.tax;
    if (data.shipping !== undefined) patch.shipping = data.shipping;
    if (data.total !== undefined) patch.total = data.total;
    if (data.status !== undefined) patch.status = data.status;
    if (data.paymentStatus !== undefined) patch.payment_status = data.paymentStatus;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await supabase.from('purchase_orders').update(patch).eq('id', id).select().single();
    if (error) throw new Error('PO not found');
    eventBus.emit('business.changed');
    return rowToPO(row);
  }

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder> {
    return this.updatePurchaseOrder(id, { status });
  }

  /**
   * Receive a purchase order: marks it received and increases inventory for every
   * line linked to a catalog product. Each received line creates a `receive`
   * stock movement (referenced to this PO) and raises the inventory value, which
   * the finance dashboard reflects automatically. Lines without a productId are
   * recorded as received but cannot move stock.
   */
  async receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const { data: poRow, error } = await supabase.from('purchase_orders').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!poRow) throw new Error('PO not found');
    const po = rowToPO(poRow);
    if (po.status === 'received') throw new Error('أمر الشراء مستلم بالفعل');
    if (po.status === 'cancelled') throw new Error('لا يمكن استلام أمر شراء ملغى');

    for (const item of po.items) {
      if (item.productId) {
        try {
          await InventoryService.receiveStock(
            item.productId,
            item.quantity,
            `استلام أمر شراء ${po.reference}`,
            { type: 'purchase_receipt', id: po.id }
          );
        } catch {
          /* product no longer in catalog — skip line */
        }
      }
    }

    const updated = await this.updatePurchaseOrder(id, {
      status: 'received',
      receivedDate: new Date().toISOString(),
      items: po.items.map((it) => ({ ...it, receivedQty: it.quantity })),
    });
    eventBus.emit('procurement.receipt_created', { purchaseOrderId: po.id });
    eventBus.emit('business.changed');
    return updated;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('business.changed');
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToExpense);
  }

  async createExpense(data: Omit<Expense, 'id'>): Promise<Expense> {
    const insertRow: TablesInsert<'expenses'> = {
      name: data.name,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      payment_method: data.paymentMethod,
      supplier_id: data.supplierId || null,
      description: data.description ?? null,
      notes: data.notes ?? null,
      receipt: data.receipt ?? null,
      reference_id: data.referenceId ?? null,
      status: data.status,
    };
    const { data: row, error } = await supabase.from('expenses').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('business.changed');
    return rowToExpense(row);
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    const patch: Partial<TablesInsert<'expenses'>> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.category !== undefined) patch.category = data.category;
    if (data.amount !== undefined) patch.amount = data.amount;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.date !== undefined) patch.date = data.date;
    if (data.paymentMethod !== undefined) patch.payment_method = data.paymentMethod;
    if (data.supplierId !== undefined) patch.supplier_id = data.supplierId || null;
    if (data.description !== undefined) patch.description = data.description;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.receipt !== undefined) patch.receipt = data.receipt;
    if (data.referenceId !== undefined) patch.reference_id = data.referenceId;
    if (data.status !== undefined) patch.status = data.status;

    const { data: row, error } = await supabase.from('expenses').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Expense not found');
    eventBus.emit('business.changed');
    return rowToExpense(row);
  }

  async deleteExpense(id: string): Promise<void> {
    const { data: exp } = await supabase.from('expenses').select('status').eq('id', id).maybeSingle();
    if (!exp) throw new Error('Expense not found');
    if (exp.status !== 'cancelled') throw new Error('Must cancel/archive expense first.');
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('business.changed');
  }

  async archiveExpense(id: string): Promise<void> {
    await this.updateExpense(id, { status: 'cancelled' });
  }

  // --- Assets ---
  async getAssets(): Promise<Asset[]> {
    const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToAsset);
  }

  async createAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
    const insertRow: TablesInsert<'assets'> = {
      name: data.name,
      type: data.type,
      purchase_date: data.purchaseDate,
      purchase_value: data.purchaseValue ?? null,
      current_value: data.currentValue,
      depreciation: data.depreciation ?? null,
      depreciation_rate: data.depreciationRate ?? null,
      status: data.status,
      documents: data.documents || [],
    };
    const { data: row, error } = await supabase.from('assets').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('business.changed');
    return rowToAsset(row);
  }

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    const patch: Partial<TablesInsert<'assets'>> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.purchaseDate !== undefined) patch.purchase_date = data.purchaseDate;
    if (data.purchaseValue !== undefined) patch.purchase_value = data.purchaseValue;
    if (data.currentValue !== undefined) patch.current_value = data.currentValue;
    if (data.depreciation !== undefined) patch.depreciation = data.depreciation;
    if (data.depreciationRate !== undefined) patch.depreciation_rate = data.depreciationRate;
    if (data.status !== undefined) patch.status = data.status;
    if (data.documents !== undefined) patch.documents = data.documents;

    const { data: row, error } = await supabase.from('assets').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Asset not found');
    eventBus.emit('business.changed');
    return rowToAsset(row);
  }

  async deleteAsset(id: string): Promise<void> {
    const { data: ast } = await supabase.from('assets').select('status').eq('id', id).maybeSingle();
    if (!ast) throw new Error('Not found');
    if (ast.status !== 'written_off') throw new Error('Must write off before delete');
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('business.changed');
  }

  async archiveAsset(id: string): Promise<void> {
    await this.updateAsset(id, { status: 'written_off' });
  }

  // --- Liabilities ---
  async getLiabilities(): Promise<Liability[]> {
    const { data, error } = await supabase.from('liabilities').select('*').order('due_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToLiability);
  }

  async createLiability(data: Omit<Liability, 'id'>): Promise<Liability> {
    const insertRow: TablesInsert<'liabilities'> = {
      name: data.name,
      type: data.type,
      supplier_id: data.supplierId || null,
      amount: data.amount,
      due_date: data.dueDate,
      status: data.status || 'unpaid',
    };
    const { data: row, error } = await supabase.from('liabilities').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('business.changed');
    return rowToLiability(row);
  }

  async updateLiability(id: string, data: Partial<Liability>): Promise<Liability> {
    const patch: Partial<TablesInsert<'liabilities'>> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.supplierId !== undefined) patch.supplier_id = data.supplierId || null;
    if (data.amount !== undefined) patch.amount = data.amount;
    if (data.dueDate !== undefined) patch.due_date = data.dueDate;
    if (data.status !== undefined) patch.status = data.status;

    const { data: row, error } = await supabase.from('liabilities').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Liability not found');
    eventBus.emit('business.changed');
    return rowToLiability(row);
  }

  async deleteLiability(id: string): Promise<void> {
    const { error } = await supabase.from('liabilities').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('business.changed');
  }

  // --- Capital ---
  async getCapital(): Promise<Capital[]> {
    const { data, error } = await supabase.from('capital').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToCapital);
  }

  async createCapital(data: Omit<Capital, 'id'>): Promise<Capital> {
    const insertRow: TablesInsert<'capital'> = {
      type: data.type,
      owner: data.owner,
      amount: data.amount,
      reason: data.reason ?? null,
      date: data.date,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await supabase.from('capital').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('business.changed');
    return rowToCapital(row);
  }

  async updateCapital(id: string, data: Partial<Capital>): Promise<Capital> {
    const patch: Partial<TablesInsert<'capital'>> = {};
    if (data.type !== undefined) patch.type = data.type;
    if (data.owner !== undefined) patch.owner = data.owner;
    if (data.amount !== undefined) patch.amount = data.amount;
    if (data.reason !== undefined) patch.reason = data.reason;
    if (data.date !== undefined) patch.date = data.date;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await supabase.from('capital').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Capital not found');
    eventBus.emit('business.changed');
    return rowToCapital(row);
  }

  async deleteCapital(id: string): Promise<void> {
    const { error } = await supabase.from('capital').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('business.changed');
  }

  // --- Dashboard Summary ---
  /**
   * Live financial read-model. Aggregates across Orders, Inventory, Expenses,
   * Assets, Liabilities and Capital. Every finance-affecting mutation emits
   * `business.changed`, which the dashboard subscribes to — so these figures
   * stay synchronized automatically.
   *
   * COGS previously read a disconnected, always-stale local product array
   * (`mockProducts`) instead of the live Supabase catalog — fixed to look up
   * each sold product's real, current `costPrice` via ProductService.
   */
  async getFinancialSummary() {
    const [allOrders, inventoryValue, allProducts, expenses, purchaseOrders, assets, liabilities, capital, suppliers] = await Promise.all([
      OrderService.getOrders(),
      InventoryService.getInventoryValue(),
      ProductService.getProducts(),
      this.getExpenses(),
      this.getPurchaseOrders(),
      this.getAssets(),
      this.getLiabilities(),
      this.getCapital(),
      this.getSuppliers(),
    ]);

    const costById = new Map(allProducts.map((p) => [p.id, p.costPrice ?? 0]));

    // Revenue is recognized on delivered orders (excludes cancelled/refunded/returned).
    const revenueOrders = allOrders.filter(
      (o) => REVENUE_STATUSES.includes(o.status) && !NON_REVENUE_STATUSES.includes(o.status)
    );
    const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);

    // COGS = cost of the products actually sold in those orders (real, current catalog cost).
    const totalCOGS = revenueOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, it) => s + (costById.get(it.productId) ?? 0) * it.quantity, 0),
      0
    );

    // Operating expenses exclude cancelled entries (inventory purchases are
    // capitalized into inventory value, not expensed here).
    const totalExpenses = expenses.filter((e) => e.status !== 'cancelled').reduce((sum, e) => sum + e.amount, 0);

    const paidPurchases = purchaseOrders.filter((po) => po.paymentStatus === 'paid').reduce((sum, po) => sum + po.total, 0);

    const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0) + inventoryValue;
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const totalCapital = capital.reduce((sum, c) => (c.type === 'increase' ? sum + c.amount : sum - c.amount), 0);
    const outstandingPayments = liabilities.filter((l) => l.status !== 'paid').reduce((sum, l) => sum + l.amount, 0);

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    // Cash basis: cash in from sales + capital, cash out to expenses + inventory purchases.
    const cashFlow = totalRevenue + totalCapital - totalExpenses - paidPurchases;

    return {
      totalRevenue,
      totalExpenses,
      totalCOGS,
      netProfit,
      grossProfit,
      cashFlow,
      totalAssets,
      totalLiabilities,
      totalCapital,
      inventoryValue,
      outstandingPayments,
      supplierCount: suppliers.length,
      poCount: purchaseOrders.length,
    };
  }
}

export const businessService = new SupabaseBusinessRepository();
