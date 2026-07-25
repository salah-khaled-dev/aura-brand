import {
  CustomerNotification,
  mockCustomerNotifications,
  updateMockCustomerNotifications,
} from '@/data/mock/customer-notifications';
import type { Order } from '@/data/mock/orders';
import { eventBus } from '@/lib/events/EventBus';
import { getStatusMeta } from '@/lib/orders/order-status';

/**
 * Generates and serves the storefront customer notification feed. Every order
 * status change funnels through {@link notifyOrderStatus}, which writes a persistent
 * notification and emits `customer.notification` over the EventBus so any mounted
 * storefront surface (toast listener, tracking page) reacts live without a refresh.
 */
export const CustomerNotificationService = {
  list(): CustomerNotification[] {
    return [...mockCustomerNotifications].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  listForOrder(orderNumber: string): CustomerNotification[] {
    return this.list().filter((n) => n.orderNumber === orderNumber);
  },

  unreadCount(): number {
    return mockCustomerNotifications.filter((n) => !n.isRead).length;
  },

  markAllRead(): void {
    updateMockCustomerNotifications(mockCustomerNotifications.map((n) => ({ ...n, isRead: true })));
    eventBus.emit('customer.notification.read');
  },

  notifyOrderStatus(order: Order): CustomerNotification {
    return this.push(order, getStatusMeta(order.status).notification);
  },

  /** Push a free-text, admin-authored customer update to the feed. */
  notifyCustom(order: Order, message: string): CustomerNotification {
    return this.push(order, message);
  },

  push(order: Order, message: string): CustomerNotification {
    const notif: CustomerNotification = {
      id: `cnotif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      title: `طلبكِ ${order.orderNumber}`,
      message,
      date: new Date().toISOString(),
      isRead: false,
    };
    updateMockCustomerNotifications([notif, ...mockCustomerNotifications]);
    eventBus.emit('customer.notification', notif);
    return notif;
  },
};
