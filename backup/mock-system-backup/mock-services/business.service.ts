import { IBusinessRepository } from '@/lib/contracts/IBusinessRepository';
import { 
  mockSuppliers, mockPurchaseOrders, mockExpenses, mockAssets, mockLiabilities, mockCapital,
  updateMockSuppliers, updateMockPurchaseOrders, updateMockExpenses, updateMockAssets, updateMockLiabilities, updateMockCapital,
  Supplier, PurchaseOrder, Expense, Asset, Liability, Capital 
} from '@/data/mock/business';
import { eventBus } from '@/lib/events/EventBus';
import { mockOrders } from '@/data/mock/orders';
import { mockProducts } from '@/data/mock/products';
import { InventoryService } from '@/lib/services/inventory.service';

/** Order states that count toward recognized revenue. */
const REVENUE_STATUSES = ['delivered'];
const NON_REVENUE_STATUSES = ['cancelled', 'refunded', 'returned'];

export class MockBusinessRepository implements IBusinessRepository {
  
  private logAudit(action: string, entity: string, entityId: string, details?: any) {
    console.log(`[AUDIT LOG] ${action} ${entity} (${entityId})`, details);
    eventBus.emit('timeline.event.created', {
      id: Date.now().toString(),
      action,
      entity,
      entityId,
      timestamp: new Date().toISOString(),
      details
    });
    eventBus.emit('business.changed');
  }

  /**
   * Recompute a supplier's financial aggregates from the live purchase-order list.
   * Idempotent (mirrors the order→customer recompute pattern): totals reconcile to
   * the actual received POs, so receiving or paying a PO updates supplier stats
   * automatically. Outstanding balance counts unpaid in full, partial as half.
   */
  private recomputeSupplierStats(supplierId?: string) {
    if (!supplierId) return;
    const sIdx = mockSuppliers.findIndex(s => s.id === supplierId);
    if (sIdx === -1) return;

    const receivedPos = mockPurchaseOrders.filter(
      po => po.supplierId === supplierId && (po.status === 'received' || po.status === 'partially_received')
    );
    const totalPurchases = receivedPos.reduce((sum, po) => sum + po.total, 0);
    const outstandingBalance = receivedPos.reduce(
      (sum, po) => sum + (po.paymentStatus === 'paid' ? 0 : po.paymentStatus === 'partial' ? po.total / 2 : po.total),
      0
    );

    const arr = [...mockSuppliers];
    arr[sIdx] = { ...arr[sIdx], totalPurchases, outstandingBalance };
    updateMockSuppliers(arr);
    eventBus.emit('procurement.payment_recorded', { supplierId });
  }

  // --- Suppliers ---
  async getSuppliers(): Promise<Supplier[]> {
    return new Promise(resolve => setTimeout(() => resolve([...mockSuppliers]), 400));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return new Promise(resolve => setTimeout(() => resolve(mockSuppliers.find(s => s.id === id)), 200));
  }

  async createSupplier(data: Omit<Supplier, 'id' | 'totalPurchases' | 'outstandingBalance'>): Promise<Supplier> {
    return new Promise(resolve => {
      setTimeout(() => {
        const newSupplier: Supplier = { ...data, id: `sup_${Date.now()}`, totalPurchases: 0, outstandingBalance: 0 };
        updateMockSuppliers([newSupplier, ...mockSuppliers]);
        this.logAudit('created', 'Supplier', newSupplier.id, newSupplier);
        resolve(newSupplier);
      }, 500);
    });
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockSuppliers.findIndex(s => s.id === id);
        if (idx === -1) return reject(new Error('Supplier not found'));
        const updated = { ...mockSuppliers[idx], ...data };
        const arr = [...mockSuppliers];
        arr[idx] = updated;
        updateMockSuppliers(arr);
        this.logAudit('updated', 'Supplier', id, data);
        resolve(updated);
      }, 500);
    });
  }

  async deleteSupplier(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const supplier = mockSuppliers.find(s => s.id === id);
        if (!supplier) return reject(new Error('Supplier not found'));
        if (supplier.status !== 'inactive') {
          return reject(new Error('Cannot permanently delete a supplier that is not archived.'));
        }
        updateMockSuppliers(mockSuppliers.filter(s => s.id !== id));
        this.logAudit('deleted_permanently', 'Supplier', id);
        resolve();
      }, 500);
    });
  }

  async archiveSupplier(id: string): Promise<void> {
    await this.updateSupplier(id, { status: 'inactive' });
    this.logAudit('archived', 'Supplier', id);
  }

  async restoreSupplier(id: string): Promise<void> {
    await this.updateSupplier(id, { status: 'active' });
    this.logAudit('restored', 'Supplier', id);
  }

  // --- Purchase Orders ---
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return new Promise(resolve => setTimeout(() => resolve([...mockPurchaseOrders]), 400));
  }

  async createPurchaseOrder(data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    return new Promise(resolve => {
      setTimeout(() => {
        const newPO: PurchaseOrder = { ...data, id: `po_${Date.now()}` };
        updateMockPurchaseOrders([newPO, ...mockPurchaseOrders]);
        this.recomputeSupplierStats(newPO.supplierId);
        this.logAudit('created', 'PurchaseOrder', newPO.id, newPO);
        resolve(newPO);
      }, 500);
    });
  }

  async updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockPurchaseOrders.findIndex(p => p.id === id);
        if (idx === -1) return reject(new Error('PO not found'));
        const updated = { ...mockPurchaseOrders[idx], ...data };
        const arr = [...mockPurchaseOrders];
        arr[idx] = updated;
        updateMockPurchaseOrders(arr);
        this.recomputeSupplierStats(updated.supplierId);
        this.logAudit('updated', 'PurchaseOrder', id, data);
        resolve(updated);
      }, 500);
    });
  }

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder> {
    const res = await this.updatePurchaseOrder(id, { status });
    this.logAudit('status_changed', 'PurchaseOrder', id, { status });
    return res;
  }

  /**
   * Receive a purchase order: marks it received and increases inventory for every
   * line linked to a catalog product. Each received line creates a `receive`
   * stock movement (referenced to this PO) and raises the inventory value, which
   * the finance dashboard reflects automatically. Lines without a productId are
   * recorded as received but cannot move stock.
   */
  async receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const po = mockPurchaseOrders.find(p => p.id === id);
    if (!po) throw new Error('PO not found');
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
      items: po.items.map(it => ({ ...it, receivedQty: it.quantity })),
    });
    this.recomputeSupplierStats(po.supplierId);
    this.logAudit('received', 'PurchaseOrder', id, { reference: po.reference });
    eventBus.emit('procurement.receipt_created', { purchaseOrderId: po.id });
    eventBus.emit('business.changed');
    return updated;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const po = mockPurchaseOrders.find(p => p.id === id);
        if (!po) return reject(new Error('PO not found'));
        updateMockPurchaseOrders(mockPurchaseOrders.filter(p => p.id !== id));
        this.recomputeSupplierStats(po.supplierId);
        this.logAudit('deleted_permanently', 'PurchaseOrder', id);
        resolve();
      }, 500);
    });
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    return new Promise(resolve => setTimeout(() => resolve([...mockExpenses]), 300));
  }

  async createExpense(data: Omit<Expense, 'id'>): Promise<Expense> {
    return new Promise(resolve => {
      setTimeout(() => {
        const exp: Expense = { ...data, id: `exp_${Date.now()}` };
        updateMockExpenses([exp, ...mockExpenses]);
        this.logAudit('created', 'Expense', exp.id, exp);
        resolve(exp);
      }, 400);
    });
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = mockExpenses.findIndex(e => e.id === id);
        if (idx === -1) return reject(new Error('Expense not found'));
        const updated = { ...mockExpenses[idx], ...data };
        const arr = [...mockExpenses];
        arr[idx] = updated;
        updateMockExpenses(arr);
        this.logAudit('updated', 'Expense', id, data);
        resolve(updated);
      }, 500);
    });
  }

  async deleteExpense(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const exp = mockExpenses.find(e => e.id === id);
        if (!exp) return reject(new Error('Expense not found'));
        if (exp.status !== 'cancelled') return reject(new Error('Must cancel/archive expense first.'));
        updateMockExpenses(mockExpenses.filter(e => e.id !== id));
        this.logAudit('deleted_permanently', 'Expense', id);
        resolve();
      }, 500);
    });
  }

  async archiveExpense(id: string): Promise<void> {
    await this.updateExpense(id, { status: 'cancelled' });
    this.logAudit('archived', 'Expense', id);
  }

  // --- Assets ---
  async getAssets(): Promise<Asset[]> { return new Promise(r => setTimeout(() => r([...mockAssets]), 300)); }
  async createAsset(data: Omit<Asset, 'id'>): Promise<Asset> {
    return new Promise(r => setTimeout(() => {
      const ast = { ...data, id: `ast_${Date.now()}` };
      updateMockAssets([ast, ...mockAssets]);
      this.logAudit('created', 'Asset', ast.id, ast);
      r(ast);
    }, 400));
  }
  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    return new Promise((r, rej) => setTimeout(() => {
      const idx = mockAssets.findIndex(a => a.id === id);
      if(idx === -1) return rej(new Error('Asset not found'));
      const updated = { ...mockAssets[idx], ...data };
      const arr = [...mockAssets]; arr[idx] = updated; updateMockAssets(arr);
      this.logAudit('updated', 'Asset', id, data);
      r(updated);
    }, 400));
  }
  async deleteAsset(id: string): Promise<void> {
    return new Promise((r, rej) => setTimeout(() => {
      const ast = mockAssets.find(a => a.id === id);
      if (!ast) return rej(new Error('Not found'));
      if (ast.status !== 'written_off') return rej(new Error('Must write off before delete'));
      updateMockAssets(mockAssets.filter(a => a.id !== id));
      this.logAudit('deleted_permanently', 'Asset', id);
      r();
    }, 400));
  }
  async archiveAsset(id: string): Promise<void> {
    await this.updateAsset(id, { status: 'written_off' });
    this.logAudit('archived', 'Asset', id);
  }

  // --- Liabilities ---
  async getLiabilities(): Promise<Liability[]> { return new Promise(r => setTimeout(() => r([...mockLiabilities]), 300)); }
  async createLiability(data: Omit<Liability, 'id'>): Promise<Liability> {
    return new Promise(r => setTimeout(() => {
      const lib = { ...data, id: `lib_${Date.now()}` };
      updateMockLiabilities([lib, ...mockLiabilities]);
      this.logAudit('created', 'Liability', lib.id, lib);
      r(lib);
    }, 400));
  }
  async updateLiability(id: string, data: Partial<Liability>): Promise<Liability> {
    return new Promise((r, rej) => setTimeout(() => {
      const idx = mockLiabilities.findIndex(a => a.id === id);
      if(idx === -1) return rej(new Error('Liability not found'));
      const updated = { ...mockLiabilities[idx], ...data };
      const arr = [...mockLiabilities]; arr[idx] = updated; updateMockLiabilities(arr);
      this.logAudit('updated', 'Liability', id, data);
      r(updated);
    }, 400));
  }
  async deleteLiability(id: string): Promise<void> {
    return new Promise((r, rej) => setTimeout(() => {
      const lib = mockLiabilities.find(a => a.id === id);
      if (!lib) return rej(new Error('Not found'));
      updateMockLiabilities(mockLiabilities.filter(a => a.id !== id));
      this.logAudit('deleted_permanently', 'Liability', id);
      r();
    }, 400));
  }

  // --- Capital ---
  async getCapital(): Promise<Capital[]> { return new Promise(r => setTimeout(() => r([...mockCapital]), 300)); }
  async createCapital(data: Omit<Capital, 'id'>): Promise<Capital> {
    return new Promise(r => setTimeout(() => {
      const cap = { ...data, id: `cap_${Date.now()}` };
      updateMockCapital([cap, ...mockCapital]);
      this.logAudit('created', 'Capital', cap.id, cap);
      r(cap);
    }, 400));
  }
  async updateCapital(id: string, data: Partial<Capital>): Promise<Capital> {
    return new Promise((r, rej) => setTimeout(() => {
      const idx = mockCapital.findIndex(a => a.id === id);
      if(idx === -1) return rej(new Error('Capital not found'));
      const updated = { ...mockCapital[idx], ...data };
      const arr = [...mockCapital]; arr[idx] = updated; updateMockCapital(arr);
      this.logAudit('updated', 'Capital', id, data);
      r(updated);
    }, 400));
  }
  async deleteCapital(id: string): Promise<void> {
    return new Promise((r, rej) => setTimeout(() => {
      updateMockCapital(mockCapital.filter(a => a.id !== id));
      this.logAudit('deleted_permanently', 'Capital', id);
      r();
    }, 400));
  }

  // --- Dashboard Summary ---
  /**
   * Live financial read-model. Aggregates across Orders, Inventory, Expenses,
   * Assets, Liabilities and Capital. Every finance-affecting mutation emits
   * `business.changed`, which the dashboard subscribes to — so these figures
   * stay synchronized automatically.
   */
  async getFinancialSummary() {
    const inventoryValue = await InventoryService.getInventoryValue();
    return new Promise<{ totalRevenue: number; totalExpenses: number; totalCOGS: number; netProfit: number; grossProfit: number; cashFlow: number; totalAssets: number; totalLiabilities: number; totalCapital: number; inventoryValue: number; outstandingPayments: number; supplierCount: number; poCount: number; }>((resolve) => {
      setTimeout(() => {
        // Revenue is recognized on delivered orders (excludes cancelled/refunded/returned).
        const revenueOrders = mockOrders.filter(
          o => REVENUE_STATUSES.includes(o.status) && !NON_REVENUE_STATUSES.includes(o.status)
        );
        const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);

        // COGS = cost of the products actually sold in those orders.
        const costOf = (productId: string) => mockProducts.find(p => p.id === productId)?.costPrice ?? 0;
        const totalCOGS = revenueOrders.reduce(
          (sum, o) => sum + o.items.reduce((s, it) => s + costOf(it.productId) * it.quantity, 0),
          0
        );

        // Operating expenses exclude cancelled entries (inventory purchases are
        // capitalized into inventory value, not expensed here).
        const totalExpenses = mockExpenses
          .filter(e => e.status !== 'cancelled')
          .reduce((sum, e) => sum + e.amount, 0);

        const paidPurchases = mockPurchaseOrders
          .filter(po => po.paymentStatus === 'paid')
          .reduce((sum, po) => sum + po.total, 0);

        const totalAssets = mockAssets.reduce((sum, a) => sum + a.currentValue, 0) + inventoryValue;
        const totalLiabilities = mockLiabilities.reduce((sum, l) => sum + l.amount, 0);
        const totalCapital = mockCapital.reduce((sum, c) => c.type === 'increase' ? sum + c.amount : sum - c.amount, 0);
        const outstandingPayments = mockLiabilities.filter(l => l.status !== 'paid').reduce((sum, l) => sum + l.amount, 0);

        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses;
        // Cash basis: cash in from sales + capital, cash out to expenses + inventory purchases.
        const cashFlow = totalRevenue + totalCapital - totalExpenses - paidPurchases;

        resolve({
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
          supplierCount: mockSuppliers.length,
          poCount: mockPurchaseOrders.length
        });
      }, 300);
    });
  }
}

export const businessService = new MockBusinessRepository();
