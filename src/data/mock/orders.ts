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

export let mockOrders: Order[] = [];

mockOrders = mockStorage.read('orders', mockOrders);

export const updateMockOrders = (data: Order[]) => { mockOrders = data; mockStorage.write('orders', data); };
