import { Order, OrderStatus, OrderPaymentStatus, OrderItem, mockOrders, updateMockOrders } from '@/data/mock/orders';
import { IOrderRepository } from '@/lib/contracts/IOrderRepository';
import { eventBus } from '@/lib/events/EventBus';
import { addTimelineEvent } from '@/data/mock/timeline';
import { InventoryService } from '@/lib/services/inventory.service';
import { CustomerService } from '@/lib/services/customer.service';
import { CustomerNotificationService } from '@/lib/services/customer-notification.service';
import { fulfillmentForStatus, normalizeOrderNumber } from '@/lib/orders/order-status';

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateOrderInput {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: Array<{ productId: string; productName: string; sku: string; quantity: number; price: number; variantId?: string; image?: string; size?: string; color?: string }>;
  shippingAddress?: string;
  shipping?: number;
  taxRate?: number;       // e.g. 0.15
  discount?: number;
  couponCode?: string | null;
  couponId?: string | null;
  discountValue?: number;
  discountType?: 'percentage' | 'fixed' | 'shipping';
  paymentMethod?: string;
  notes?: string;
  /** Where the order originated, used to tailor the customer-facing note. */
  source?: 'storefront' | 'admin';
}

/** A delivered order is the "completed" state that recognizes revenue & deducts stock. */
const COMPLETED_STATUS: OrderStatus = 'delivered';
const REVERSING_STATUSES: OrderStatus[] = ['cancelled', 'returned', 'refunded'];

const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

function persist(next: Order[]) {
  updateMockOrders(next);
}

function replaceOrder(updated: Order) {
  const next = mockOrders.map(o => (o.id === updated.id ? updated : o));
  persist(next);
}

/** Recompute a customer's order aggregates from the live order list (idempotent). */
async function recomputeCustomerStats(customerId: string): Promise<void> {
  if (!customerId) return;
  const customerOrders = mockOrders.filter(o => o.customerId === customerId);
  const delivered = customerOrders.filter(o => o.status === COMPLETED_STATUS);
  const cancelled = customerOrders.filter(o => o.status === 'cancelled');
  const returned = customerOrders.filter(o => o.status === 'returned' || o.status === 'refunded');
  const totalSpent = delivered.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = delivered.length;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  try {
    await CustomerService.updateCustomer(customerId, {
      totalOrders,
      ordersCount: totalOrders,
      totalSpent,
      lifetimeValue: totalSpent,
      averageOrderValue,
      averagePurchaseValue: averageOrderValue,
      cancelledOrdersCount: cancelled.length,
      returnedOrdersCount: returned.length,
    } as Partial<import('@/data/mock/customers').Customer>);
  } catch {
    /* customer may not exist for guest orders — ignore */
  }
}

/** Deduct stock for every line in a completed order, recording order-referenced movements. */
async function deductInventoryForOrder(order: Order): Promise<void> {
  for (const item of order.items) {
    try {
      await InventoryService.deductStock(
        item.productId,
        item.quantity,
        `بيع - طلب ${order.orderNumber}`,
        { type: 'order', id: order.id }
      );
    } catch {
      /* product missing from catalog — skip that line */
    }
  }
}

/** Restore stock for a previously-completed order that is now cancelled/returned. */
async function restoreInventoryForOrder(order: Order): Promise<void> {
  for (const item of order.items) {
    try {
      await InventoryService.receiveStock(
        item.productId,
        item.quantity,
        `إرجاع مخزون - طلب ${order.orderNumber}`,
        { type: 'order', id: order.id }
      );
    } catch {
      /* product missing — skip */
    }
  }
}

class MockOrderRepositoryImpl implements IOrderRepository {
  async getOrder(id: string): Promise<Order | undefined> {
    await delay(200);
    return mockOrders.find(o => o.id === id);
  }

  /** Tolerant lookup by order number (case/symbol-insensitive) for the tracking page. */
  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    await delay(300);
    const target = normalizeOrderNumber(orderNumber);
    if (!target) return undefined;
    return mockOrders.find(o => normalizeOrderNumber(o.orderNumber) === target);
  }

  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    await delay(300);
    let result = [...mockOrders];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(o => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q));
    }
    if (filters?.status && filters.status !== 'all') result = result.filter(o => o.status === filters.status);
    if (filters?.fulfillmentStatus && filters.fulfillmentStatus !== 'all') result = result.filter(o => o.fulfillmentStatus === filters.fulfillmentStatus);
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') result = result.filter(o => o.paymentStatus === filters.paymentStatus);
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') result = result.filter(o => o.paymentMethod === filters.paymentMethod);
    return result;
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    await delay(500);
    const items: OrderItem[] = input.items.map((it, idx) => ({
      id: `item_${Date.now()}_${idx}`,
      productId: it.productId,
      variantId: it.variantId,
      productName: it.productName,
      name: it.productName,
      sku: it.sku,
      quantity: it.quantity,
      price: it.price,
      total: it.price * it.quantity,
      image: it.image,
      size: it.size,
      color: it.color,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const discount = input.discount ?? 0;
    const shipping = input.shipping ?? 0;
    const tax = Math.round((subtotal - discount) * (input.taxRate ?? 0.15));
    const total = subtotal - discount + tax + shipping;
    const now = new Date().toISOString();
    const seq = mockOrders.length + 10025;

    const order: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: `AURA-${seq}`,
      customerId: input.customerId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerNotes: input.couponCode ? `كوبون مستخدم: ${input.couponCode}` : undefined,
      couponId: input.couponId ?? null,
      couponCode: input.couponCode ?? null,
      discountValue: input.discountValue ?? 0,
      discountType: input.discountType,
      items,
      subtotal,
      discount,
      tax,
      shipping,
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'new',
      paymentMethod: input.paymentMethod ?? 'cod',
      shippingAddress: input.shippingAddress ?? '',
      internalNotes: [],
      timeline: [{ status: 'pending', timestamp: now, adminId: 'admin_1', note: input.notes || 'تم إنشاء الطلب', type: 'created' }],
      date: now,
      createdAt: now,
      updatedAt: now,
    };

    persist([order, ...mockOrders]);
    eventBus.emit('order.created', order);
    CustomerNotificationService.notifyOrderStatus(order);
    addTimelineEvent({
      entityType: 'order',
      entityId: order.id,
      action: 'created',
      description: `تم إنشاء الطلب ${order.orderNumber}`,
      adminId: 'admin_1',
      adminName: 'مدير النظام',
    });
    eventBus.emit('business.changed');
    return order;
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    await delay(400);
    const existing = mockOrders.find(o => o.id === id);
    if (!existing) throw new Error('Order not found');
    const updated: Order = { ...existing, ...data, id: existing.id, updatedAt: new Date().toISOString() };
    if (updated.items) {
      updated.subtotal = updated.items.reduce((sum, it) => sum + it.total, 0);
      updated.total = updated.subtotal - (updated.discount ?? 0) + (updated.tax ?? 0) + (updated.shipping ?? 0);
    }
    replaceOrder(updated);
    eventBus.emit('order.updated', updated);
    eventBus.emit('business.changed');
    return updated;
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    await delay(450);
    const oldOrder = mockOrders.find(o => o.id === id);
    if (!oldOrder) throw new Error('Order not found');

    const updatedOrder: Order = {
      ...oldOrder,
      status,
      fulfillmentStatus: fulfillmentForStatus(status),
      timeline: [
        { status, timestamp: new Date().toISOString(), adminId: 'admin_1', note: note || `تم تغيير حالة الطلب إلى ${status}`, type: 'status' },
        ...oldOrder.timeline,
      ],
      updatedAt: new Date().toISOString(),
    };
    replaceOrder(updatedOrder);

    // Notify the customer of the new status (persistent feed + live EventBus push).
    if (status !== oldOrder.status) {
      CustomerNotificationService.notifyOrderStatus(updatedOrder);
    }

    const wasCompleted = oldOrder.status === COMPLETED_STATUS;
    const nowCompleted = status === COMPLETED_STATUS;

    // Entering "completed": deduct inventory, recompute customer stats, recognize revenue.
    if (nowCompleted && !wasCompleted) {
      await deductInventoryForOrder(updatedOrder);
      await recomputeCustomerStats(updatedOrder.customerId);
      eventBus.emit('order.completed', updatedOrder);
    }
    // Leaving "completed" into a reversing state: restore inventory, recompute stats.
    else if (wasCompleted && REVERSING_STATUSES.includes(status)) {
      await restoreInventoryForOrder(updatedOrder);
      await recomputeCustomerStats(updatedOrder.customerId);
    }
    // Cancelled/returned from a non-completed state still affects customer counters.
    else if (REVERSING_STATUSES.includes(status)) {
      await recomputeCustomerStats(updatedOrder.customerId);
    }

    eventBus.emit('order.updated', updatedOrder);
    addTimelineEvent({
      entityType: 'order',
      entityId: id,
      action: 'status_changed',
      description: `تم تغيير حالة الطلب ${updatedOrder.orderNumber} من ${oldOrder.status} إلى ${status}`,
      diff: { status: { before: oldOrder.status, after: status } },
      adminId: 'admin_1',
      adminName: 'مدير النظام',
    });

    if (status === 'shipped') {
      eventBus.emit('email.send', { to: updatedOrder.customerEmail, type: 'order_shipped', orderId: id });
    }
    // Finance/revenue depends on delivered orders → refresh dashboard.
    eventBus.emit('business.changed');
    return updatedOrder;
  }

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    return this.updateOrderStatus(id, 'cancelled', reason || 'تم إلغاء الطلب');
  }

  async deleteOrder(id: string): Promise<void> {
    await delay(400);
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    // If a completed order is deleted, restore its stock first.
    if (order.status === COMPLETED_STATUS) {
      await restoreInventoryForOrder(order);
    }
    persist(mockOrders.filter(o => o.id !== id));
    if (order.customerId) await recomputeCustomerStats(order.customerId);
    eventBus.emit('order.deleted', id);
    eventBus.emit('business.changed');
  }

  async updatePaymentStatus(id: string, paymentStatus: OrderPaymentStatus): Promise<Order> {
    await delay(400);
    const existing = mockOrders.find(o => o.id === id);
    if (!existing) throw new Error('Order not found');
    const updated: Order = { ...existing, paymentStatus, updatedAt: new Date().toISOString() };
    replaceOrder(updated);
    eventBus.emit('order.updated', updated);
    eventBus.emit('business.changed');
    return updated;
  }

  async addInternalNote(id: string, note: string): Promise<Order> {
    await delay(300);
    const existing = mockOrders.find(o => o.id === id);
    if (!existing) throw new Error('Order not found');
    const noteEntry = { id: `note_${Date.now()}`, adminName: 'Admin', text: note, date: new Date().toISOString() };
    const updated: Order = { ...existing, internalNotes: [...(existing.internalNotes ?? []), noteEntry] };
    replaceOrder(updated);
    return updated;
  }

  /** Update shipment information (company, tracking number, courier, ETA) — appears on the customer tracking page. */
  async updateShipping(
    id: string,
    data: { shippingCompany?: string; trackingNumber?: string; courierName?: string; estimatedDeliveryDate?: string }
  ): Promise<Order> {
    await delay(350);
    const existing = mockOrders.find(o => o.id === id);
    if (!existing) throw new Error('Order not found');

    const changes: string[] = [];
    if (data.trackingNumber && data.trackingNumber !== existing.trackingNumber) changes.push(`رقم التتبع: ${data.trackingNumber}`);
    if (data.shippingCompany && data.shippingCompany !== existing.shippingCompany) changes.push(`شركة الشحن: ${data.shippingCompany}`);
    if (data.courierName && data.courierName !== existing.courierName) changes.push(`المندوب: ${data.courierName}`);
    if (data.estimatedDeliveryDate && data.estimatedDeliveryDate !== existing.estimatedDeliveryDate) changes.push('تم تحديث موعد التسليم المتوقع');

    const now = new Date().toISOString();
    const updated: Order = {
      ...existing,
      ...data,
      timeline: changes.length
        ? [{ status: existing.status, timestamp: now, adminId: 'admin_1', note: `تحديث الشحن — ${changes.join(' • ')}`, type: 'shipping' }, ...existing.timeline]
        : existing.timeline,
      updatedAt: now,
    };
    replaceOrder(updated);
    eventBus.emit('order.updated', updated);
    eventBus.emit('business.changed');
    return updated;
  }

  /** Post a customer-facing update: shown on tracking, pushed as a notification, recorded in history. */
  async addCustomerUpdate(id: string, text: string): Promise<Order> {
    await delay(300);
    const existing = mockOrders.find(o => o.id === id);
    if (!existing) throw new Error('Order not found');
    const now = new Date().toISOString();
    const updated: Order = {
      ...existing,
      customerUpdate: text,
      customerUpdatedAt: now,
      timeline: [{ status: existing.status, timestamp: now, adminId: 'admin_1', note: text, type: 'customer_update' }, ...existing.timeline],
      updatedAt: now,
    };
    replaceOrder(updated);
    CustomerNotificationService.notifyCustom(updated, text);
    eventBus.emit('order.updated', updated);
    return updated;
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    await delay(500);
    // Restore stock for any completed orders being deleted.
    for (const order of mockOrders.filter(o => ids.includes(o.id) && o.status === COMPLETED_STATUS)) {
      await restoreInventoryForOrder(order);
    }
    const affectedCustomers = new Set(mockOrders.filter(o => ids.includes(o.id)).map(o => o.customerId));
    persist(mockOrders.filter(o => !ids.includes(o.id)));
    for (const cid of affectedCustomers) await recomputeCustomerStats(cid);
    eventBus.emit('orders.bulk_deleted', ids);
    eventBus.emit('business.changed');
  }

  async markAsPaidMultiple(ids: string[]): Promise<void> {
    await delay(500);
    persist(mockOrders.map(o => (ids.includes(o.id) ? { ...o, paymentStatus: 'paid' as OrderPaymentStatus } : o)));
    eventBus.emit('orders.bulk_updated', ids);
    eventBus.emit('business.changed');
  }
}

export const OrderService = new MockOrderRepositoryImpl();
