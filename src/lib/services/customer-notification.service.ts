import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import type { Order } from '@/data/mock/orders';
import { eventBus } from '@/lib/events/EventBus';
import { getStatusMeta } from '@/lib/orders/order-status';

export interface CustomerNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
}

type Row = Tables<'customer_notifications'>;

const supabase = createClient();

function rowToNotification(row: Row): CustomerNotification {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    status: row.status,
    title: row.title,
    message: row.message,
    date: row.created_at,
    isRead: row.is_read,
  };
}

/**
 * Generates and serves the storefront customer notification feed. Every order
 * status change funnels through {@link notifyOrderStatus}, which writes a
 * persistent notification and emits `customer.notification` over the
 * EventBus so any mounted storefront surface (toast listener, tracking page)
 * reacts live without a refresh.
 */
export const CustomerNotificationService = {
  /**
   * Requires the same ownership proof as guest order lookup (order number +
   * the phone/email used at checkout) — order_id alone is never accepted.
   * See get_customer_notifications (20260725000002).
   */
  async listForOrder(orderNumber: string, contact: string): Promise<CustomerNotification[]> {
    const { data, error } = await supabase.rpc('get_customer_notifications', {
      p_order_number: orderNumber,
      p_contact: contact,
    });
    if (error) throw error;
    return (data ?? []).map(rowToNotification);
  },

  async markAllRead(orderNumber: string, contact: string): Promise<void> {
    const { error } = await supabase.rpc('mark_customer_notifications_read', {
      p_order_number: orderNumber,
      p_contact: contact,
    });
    if (error) throw error;
    eventBus.emit('customer.notification.read');
  },

  async notifyOrderStatus(order: Order): Promise<CustomerNotification> {
    return this.push(order, getStatusMeta(order.status).notification);
  },

  /** Push a free-text, admin-authored customer update to the feed. */
  async notifyCustom(order: Order, message: string): Promise<CustomerNotification> {
    return this.push(order, message);
  },

  async push(order: Order, message: string): Promise<CustomerNotification> {
    const insertRow: TablesInsert<'customer_notifications'> = {
      order_id: order.id,
      order_number: order.orderNumber,
      status: order.status,
      title: `طلبكِ ${order.orderNumber}`,
      message,
    };
    const { data, error } = await supabase.from('customer_notifications').insert(insertRow).select().single();
    if (error) throw error;
    const notif = rowToNotification(data);
    eventBus.emit('customer.notification', notif);
    return notif;
  },
};
