import type { Supplier, PurchaseOrder, Expense, Asset, Liability, Capital } from '@/lib/services/business.service';

export interface IBusinessRepository {
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(data: Omit<Supplier, 'id' | 'totalPurchases' | 'outstandingBalance'>): Promise<Supplier>;
  updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  archiveSupplier(id: string): Promise<void>;
  restoreSupplier(id: string): Promise<void>;

  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder>;
  updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(data: Omit<Expense, 'id'>): Promise<Expense>;
  updateExpense(id: string, data: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  archiveExpense(id: string): Promise<void>;

  // Assets
  getAssets(): Promise<Asset[]>;
  createAsset(data: Omit<Asset, 'id'>): Promise<Asset>;
  updateAsset(id: string, data: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: string): Promise<void>;
  archiveAsset(id: string): Promise<void>;

  // Liabilities
  getLiabilities(): Promise<Liability[]>;
  createLiability(data: Omit<Liability, 'id'>): Promise<Liability>;
  updateLiability(id: string, data: Partial<Liability>): Promise<Liability>;
  deleteLiability(id: string): Promise<void>;

  // Capital
  getCapital(): Promise<Capital[]>;
  createCapital(data: Omit<Capital, 'id'>): Promise<Capital>;
  updateCapital(id: string, data: Partial<Capital>): Promise<Capital>;
  deleteCapital(id: string): Promise<void>;

  // Financial Reports
  getFinancialSummary(): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    totalCOGS: number;
    netProfit: number;
    grossProfit: number;
    cashFlow: number;
    totalAssets: number;
    totalLiabilities: number;
    totalCapital: number;
    inventoryValue: number;
    outstandingPayments: number;
    supplierCount: number;
    poCount: number;
  }>;
}
