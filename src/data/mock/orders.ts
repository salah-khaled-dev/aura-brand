import { mockStorage } from '@/lib/storage/mock-storage';

export type OrderStatus =
  // Canonical unified workflow (storefront + admin share these)
  | 'pending' | 'confirmed' | 'preparing' | 'ready_to_ship'
  | 'shipped' | 'out_for_delivery' | 'delivered'
  | 'cancelled' | 'returned' | 'refunded'
  // Legacy aliases kept for backward-compat with previously persisted data
  | 'processing' | 'packed' | 'ready';
export type OrderPaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partial' | 'partially_refunded';
export type OrderFulfillmentStatus = 'new' | 'unfulfilled' | 'partial' | 'fulfilled' | 'returned' | 'confirmed' | 'processing' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';

export type OrderTimelineEventType = 'created' | 'status' | 'customer_update' | 'shipping';

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  adminId?: string;
  note?: string;
  /** Distinguishes status changes from customer-facing updates and shipping edits in the history log. */
  type?: OrderTimelineEventType;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  image?: string;
  size?: string;
  color?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;

  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  paymentMethod?: string;
  shippingMethod?: string;

  shippingAddress: string;
  shippingCompany?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDeliveryDate?: string;
  /** Latest customer-facing update message (shown on the tracking page). */
  customerUpdate?: string;
  customerUpdatedAt?: string;

  internalNotes?: Array<{ id: string; adminName: string; text: string; date: string }>;
  activities?: Array<{ id: string; type: string; description: string; date: string; isInternal?: boolean; status?: string; note?: string }>;
  billingAddress?: string;
  timeline: OrderTimelineEvent[];

  couponId?: string | null;
  couponCode?: string | null;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed' | 'shipping';

  date: string;
  createdAt: string;
  updatedAt: string;
}

export let mockOrders: Order[] = [
  {
    id: 'ord_1',
    orderNumber: '#10024',
    customerId: 'cust_1',
    customerName: 'سارة محمد',
    customerEmail: 'sara@example.com',
    customerPhone: '+966501234567',
    customerNotes: 'يرجى التغليف بعناية',
    items: [
      {
        id: 'item_1',
        productId: 'prod_1',
        variantId: 'v_1',
        productName: 'فستان سهرة حريري',
        name: 'فستان سهرة حريري',
        sku: 'AURA-SEG-01-S-BLK',
        quantity: 1,
        price: 12500,
        total: 12500,
        image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=400',
        size: 'M',
        color: 'أسود'
      }
    ],
    subtotal: 12500,
    discount: 0,
    tax: 1875,
    shipping: 100,
    total: 14475,
    status: 'pending',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    paymentMethod: 'بطاقة ائتمانية',
    shippingMethod: 'توصيل سريع',
    shippingAddress: 'الرياض، حي الياسمين، شارع العليا',
    internalNotes: [],
    timeline: [
      { status: 'pending', timestamp: new Date().toISOString(), note: 'تم إنشاء الطلب بواسطة العميل' }
    ],
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ord_2',
    orderNumber: '#10023',
    customerId: 'cust_2',
    customerName: 'نورا أحمد',
    customerEmail: 'noura@example.com',
    customerPhone: '+966502345678',
    customerNotes: '',
    items: [
      {
        id: 'item_2',
        productId: 'prod_1',
        variantId: 'v_2',
        productName: 'فستان سهرة حريري',
        name: 'فستان سهرة حريري',
        sku: 'AURA-SEG-01-M-BLK',
        quantity: 2,
        price: 12500,
        total: 25000,
        image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=400',
        size: 'L',
        color: 'بيج'
      }
    ],
    subtotal: 25000,
    discount: 2500,
    tax: 3375,
    shipping: 0,
    total: 25875,
    status: 'delivered',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    paymentMethod: 'تحويل بنكي',
    shippingMethod: 'توصيل عادي',
    shippingAddress: 'جدة، حي النزهة، شارع التحلية',
    internalNotes: [{ id: 'note_1', adminName: 'Admin', text: 'تم التوصيل بدون مشاكل', date: new Date(Date.now() - 2 * 86400000).toISOString() }],
    timeline: [
      { status: 'pending',   timestamp: new Date(Date.now() - 7 * 86400000).toISOString() },
      { status: 'confirmed', timestamp: new Date(Date.now() - 6 * 86400000).toISOString() },
      { status: 'shipped',   timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
      { status: 'delivered', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() }
    ],
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

mockOrders = mockStorage.read('orders', mockOrders);

export const updateMockOrders = (data: Order[]) => { mockOrders = data; mockStorage.write('orders', data); };
