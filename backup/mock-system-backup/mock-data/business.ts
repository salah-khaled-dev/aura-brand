import { mockStorage } from '@/lib/storage/mock-storage';

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

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  reference: string;
  date: string;
  expectedArrival: string;
  receivedDate?: string;
  items: {
    productId?: string;       // links the line to a catalog product so receiving updates inventory
    name: string;
    quantity: number;
    unitCost: number;
    total: number;
    receivedQty?: number;
  }[];
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

export let mockSuppliers: Supplier[] = [];

export let mockPurchaseOrders: PurchaseOrder[] = [];

export let mockExpenses: Expense[] = [];

export let mockAssets: Asset[] = [];

export let mockLiabilities: Liability[] = [];

export let mockCapital: Capital[] = [];

mockSuppliers = mockStorage.read('suppliers', mockSuppliers);
mockPurchaseOrders = mockStorage.read('purchase_orders', mockPurchaseOrders);
mockExpenses = mockStorage.read('expenses', mockExpenses);
mockAssets = mockStorage.read('assets', mockAssets);
mockLiabilities = mockStorage.read('liabilities', mockLiabilities);
mockCapital = mockStorage.read('capital', mockCapital);

export const updateMockSuppliers = (data: Supplier[]) => { mockSuppliers = data; mockStorage.write('suppliers', data); };
export const updateMockPurchaseOrders = (data: PurchaseOrder[]) => { mockPurchaseOrders = data; mockStorage.write('purchase_orders', data); };
export const updateMockExpenses = (data: Expense[]) => { mockExpenses = data; mockStorage.write('expenses', data); };
export const updateMockAssets = (data: Asset[]) => { mockAssets = data; mockStorage.write('assets', data); };
export const updateMockLiabilities = (data: Liability[]) => { mockLiabilities = data; mockStorage.write('liabilities', data); };
export const updateMockCapital = (data: Capital[]) => { mockCapital = data; mockStorage.write('capital', data); };
