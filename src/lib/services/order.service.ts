import { Order, OrderStatus, OrderPaymentStatus, OrderItem } from '@/data/mock/orders';
import { IOrderRepository } from '@/lib/contracts/IOrderRepository';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';
import { InventoryService } from '@/lib/services/inventory.service';
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

type OrderRow = Tables<'orders'>;
type OrderItemRow = Tables<'order_items'>;
type OrderWithItems = OrderRow & { order_items: OrderItemRow[] };

const SELECT_WITH_ITEMS = '*, order_items(*)';

const supabase = createClient();

// --- Row <-> Order mapping ---------------------------------------------------

/** DB `payment_status` has no 'unpaid' value — 'pending' is its equivalent before any payment. */
function dbToPaymentStatus(status: OrderRow['payment_status']): OrderPaymentStatus {
  return status === 'pending' ? 'unpaid' : (status as OrderPaymentStatus);
}
function paymentStatusToDb(status: OrderPaymentStatus): OrderRow['payment_status'] {
  return status === 'unpaid' ? 'pending' : (status as OrderRow['payment_status']);
}

function rowToShippingAddress(value: OrderRow['shipping_address']): string {
  if (value && typeof value === 'object' && 'formatted' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).formatted ?? '');
  }
  return typeof value === 'string' ? value : '';
}

function rowToItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id ?? '',
    variantId: row.variant_id ?? undefined,
    productName: row.product_name,
    name: row.product_name,
    sku: row.sku,
    quantity: row.quantity,
    price: row.unit_price,
    total: row.total_price,
    image: row.image_url ?? undefined,
    size: row.size ?? undefined,
    color: row.color_name ?? undefined,
  };
}

function rowToOrder(row: OrderWithItems): Order {
  const status = row.status as OrderStatus;
  return {
    id: row.id,
    orderNumber: row.order_number,
    invoiceNumber: row.invoice_number ?? undefined,
    customerId: row.customer_ref_id ?? '',
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.phone || undefined,
    customerNotes: row.customer_notes ?? undefined,
    couponId: row.coupon_id,
    couponCode: row.coupon_code,
    discountValue: row.discount_value ?? undefined,
    discountType: (row.discount_type as Order['discountType']) ?? undefined,
    items: (row.order_items ?? []).map(rowToItem),
    subtotal: row.subtotal,
    discount: row.discount_amount,
    tax: row.tax_amount,
    shipping: row.shipping_fee,
    total: row.total,
    status,
    paymentStatus: dbToPaymentStatus(row.payment_status),
    fulfillmentStatus: fulfillmentForStatus(status),
    paymentMethod: row.payment_method,
    shippingAddress: rowToShippingAddress(row.shipping_address),
    shippingCompany: row.shipping_company ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    courierName: row.courier_name ?? undefined,
    estimatedDeliveryDate: row.estimated_delivery_date ?? undefined,
    customerUpdate: row.customer_update ?? undefined,
    customerUpdatedAt: row.customer_updated_at ?? undefined,
    billingAddress: row.billing_address ?? undefined,
    internalNotes: (row.internal_notes as unknown as Order['internalNotes']) ?? [],
    timeline: (row.timeline as unknown as Order['timeline']) ?? [],
    date: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Egyptian numbers pass the checkout form's own regex already; this only strips
 *  incidental formatting (spaces/dashes) from admin-entered numbers so the DB's
 *  `orders_phone_format` check doesn't reject otherwise-valid input. */
function sanitizePhone(phone: string | undefined): string {
  return (phone ?? '').replace(/[\s-]/g, '');
}

async function fetchOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await supabase.from('orders').select(SELECT_WITH_ITEMS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as OrderWithItems | null;
}

/**
 * Runs `apply` for every order line, tolerating only the one expected
 * failure (the line's product was since deleted from the catalog — nothing
 * left to move stock on). Any other failure (RLS "access denied", a DB/RPC
 * error, network failure, etc.) is a real inventory-integrity problem: the
 * order's status changes regardless, so a silently-skipped deduction/restore
 * leaves `products.stock` permanently out of sync with what was actually
 * sold — silent overselling risk. Those are logged and re-thrown after every
 * line has been attempted, so the caller's existing error handling surfaces
 * them to the admin instead of reporting success.
 */
async function applyInventoryForOrder(order: Order, apply: (item: Order['items'][number]) => Promise<unknown>): Promise<void> {
  const failures: unknown[] = [];
  for (const item of order.items) {
    try {
      await apply(item);
    } catch (err) {
      if (err instanceof Error && err.message === 'Product not found') continue;
      console.error(`Inventory update failed for order ${order.orderNumber}, product ${item.productId}:`, err);
      failures.push(err);
    }
  }
  if (failures.length > 0) {
    throw new Error(`تعذّر تحديث المخزون لـ ${failures.length} من عناصر الطلب ${order.orderNumber}`);
  }
}

/** Deduct stock for every line in a completed order, recording order-referenced movements. */
async function deductInventoryForOrder(order: Order): Promise<void> {
  await applyInventoryForOrder(order, item =>
    InventoryService.deductStock(item.productId, item.quantity, `بيع - طلب ${order.orderNumber}`, { type: 'order', id: order.id })
  );
}

/** Restore stock for a previously-completed order that is now cancelled/returned. */
async function restoreInventoryForOrder(order: Order): Promise<void> {
  await applyInventoryForOrder(order, item =>
    InventoryService.receiveStock(item.productId, item.quantity, `إرجاع مخزون - طلب ${order.orderNumber}`, { type: 'order', id: order.id })
  );
}

class SupabaseOrderRepositoryImpl implements IOrderRepository {
  async getOrder(id: string): Promise<Order | undefined> {
    const row = await fetchOrderWithItems(id);
    return row ? rowToOrder(row) : undefined;
  }

  /**
   * Tolerant lookup by order number OR tracking number (case/symbol-insensitive)
   * for the tracking page — customers only ever have the order number until the
   * order ships, so the same input box must accept either. `contact` (the phone
   * or email used at checkout) is required for guest orders — order_number
   * alone is a sequential, guessable DB counter, not a secret (see
   * 20260715000007_harden_guest_checkout_and_coupons.sql's get_guest_order).
   */
  async getOrderByNumberOrTracking(query: string, contact: string): Promise<Order | undefined> {
    const target = normalizeOrderNumber(query);
    if (!target) return undefined;

    // Guest orders (user_id is null): scoped server-side via a SECURITY
    // DEFINER RPC that returns only the one matching order, never a blanket
    // anon SELECT on the table (see 20260714120022's get_guest_order, extended
    // by 20260725000008 to also match tracking_number).
    const { data: guestOrder, error: guestError } = await supabase.rpc('get_guest_order', {
      p_order_number: target,
      p_contact: contact,
    });
    if (guestError) throw guestError;
    if (guestOrder) return rowToOrder(guestOrder as unknown as OrderWithItems);

    // Not a guest order — fall back to the caller's own RLS-scoped rows
    // (authenticated customer's own order, or admin lookup).
    const { data, error } = await supabase.from('orders').select(SELECT_WITH_ITEMS);
    if (error) throw error;
    const match = (data as unknown as OrderWithItems[] | null)?.find(o =>
      normalizeOrderNumber(o.order_number) === target ||
      (o.tracking_number && normalizeOrderNumber(o.tracking_number) === target)
    );
    return match ? rowToOrder(match) : undefined;
  }

  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    let query = supabase.from('orders').select(SELECT_WITH_ITEMS).order('created_at', { ascending: false });

    if (filters?.search) {
      // Escape PostgREST .or() metacharacters (comma/parens split filter clauses,
      // backslash escapes, % and _ are ilike wildcards) so admin search input
      // can't inject additional filter conditions.
      const q = filters.search.trim().replace(/[,()\\%_]/g, '\\$&');
      query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%`);
    }
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status as OrderRow['status']);
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatusToDb(filters.paymentStatus as OrderPaymentStatus));
    }
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') query = query.eq('payment_method', filters.paymentMethod);

    const { data, error } = await query;
    if (error) throw error;
    let result = (data as unknown as OrderWithItems[]).map(rowToOrder);

    // fulfillmentStatus is derived, not a DB column — filter after mapping.
    if (filters?.fulfillmentStatus && filters.fulfillmentStatus !== 'all') {
      result = result.filter(o => o.fulfillmentStatus === filters.fulfillmentStatus);
    }
    return result;
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
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

    // Every order here has `user_id: null` (guest checkout, and also
    // admin-created orders — no customer-login system exists to link to).
    // Postgres RLS gates a RETURNING clause the same as SELECT, and anon has
    // no SELECT policy on `orders`/`order_items` at all (see get_guest_order
    // in 20260714120022) — so a plain `.insert().select()` would write
    // successfully but come back empty. create_guest_order does the whole
    // order+items insert as a SECURITY DEFINER RPC instead, sidestepping
    // that: its internal INSERTs run as the function owner, and the jsonb it
    // returns is data, not a policy-gated table row. `id`/`order_number` are
    // left to the table's own defaults/trigger inside the function.
    const orderPayload = {
      payment_method: input.paymentMethod ?? 'cod',
      subtotal,
      discount_amount: discount,
      shipping_fee: shipping,
      tax_amount: tax,
      total,
      coupon_id: input.couponId ?? null,
      coupon_code: input.couponCode ?? null,
      phone: sanitizePhone(input.customerPhone) || '00000000',
      shipping_address: { formatted: input.shippingAddress ?? '' },
      notes: input.notes ?? null,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_ref_id: input.customerId || null,
      customer_notes: input.couponCode ? `كوبون مستخدم: ${input.couponCode}` : null,
      discount_type: input.discountType ?? null,
      discount_value: input.discountValue ?? null,
      timeline: [{ status: 'pending', timestamp: now, adminId: 'admin_1', note: input.notes || 'تم إنشاء الطلب', type: 'created' }],
    };
    const itemsPayload = items.map(it => ({
      product_id: it.productId || null,
      variant_id: it.variantId || null,
      product_name: it.productName,
      sku: it.sku,
      image_url: it.image ?? null,
      size: it.size ?? null,
      color_name: it.color ?? null,
      quantity: it.quantity,
      unit_price: it.price,
      total_price: it.total,
    }));

    const { data: created, error: createError } = await supabase.rpc('create_guest_order', {
      p_order: orderPayload,
      p_items: itemsPayload,
    });
    if (createError) throw createError;

    const order = rowToOrder(created as unknown as OrderWithItems);

    eventBus.emit('order.created', order);
    CustomerNotificationService.notifyOrderStatus(order).catch((err) => console.error('notifyOrderStatus failed:', err));
    eventBus.emit('business.changed');
    return order;
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');

    const patch: Partial<TablesInsert<'orders'>> = {};
    if (data.customerNotes !== undefined) patch.customer_notes = data.customerNotes ?? null;
    if (data.discount !== undefined) patch.discount_amount = data.discount;
    if (data.shipping !== undefined) patch.shipping_fee = data.shipping;
    if (data.tax !== undefined) patch.tax_amount = data.tax;
    if (data.shippingAddress !== undefined) patch.shipping_address = { formatted: data.shippingAddress };
    if (data.billingAddress !== undefined) patch.billing_address = data.billingAddress ?? null;

    const nextSubtotal = data.items ? data.items.reduce((sum, it) => sum + it.total, 0) : existingRow.subtotal;
    if (data.items) patch.subtotal = nextSubtotal;
    const nextDiscount = patch.discount_amount ?? existingRow.discount_amount;
    const nextTax = patch.tax_amount ?? existingRow.tax_amount;
    const nextShipping = patch.shipping_fee ?? existingRow.shipping_fee;
    if (data.items || data.discount !== undefined || data.tax !== undefined || data.shipping !== undefined) {
      patch.total = nextSubtotal - nextDiscount + nextTax + nextShipping;
    }

    const { data: updatedRow, error } = await supabase.from('orders').update(patch).eq('id', id).select().single();
    if (error) throw error;

    const updated = rowToOrder({ ...updatedRow, order_items: existingRow.order_items });
    eventBus.emit('order.updated', updated);
    eventBus.emit('business.changed');
    return updated;
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');
    const oldOrder = rowToOrder(existingRow);

    const now = new Date().toISOString();
    const newTimeline = [
      { status, timestamp: now, adminId: 'admin_1', note: note || `تم تغيير حالة الطلب إلى ${status}`, type: 'status' },
      ...oldOrder.timeline,
    ];

    const { data: updatedRow, error } = await supabase
      .from('orders')
      .update({
        status: status as unknown as OrderRow['status'],
        timeline: newTimeline as unknown as TablesInsert<'orders'>['timeline'],
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const updatedOrder = rowToOrder({ ...updatedRow, order_items: existingRow.order_items });

    // Notify the customer of the new status (persistent feed + live EventBus push).
    if (status !== oldOrder.status) {
      CustomerNotificationService.notifyOrderStatus(updatedOrder).catch((err) => console.error('notifyOrderStatus failed:', err));
    }

    const wasCompleted = oldOrder.status === COMPLETED_STATUS;
    const nowCompleted = status === COMPLETED_STATUS;

    // Entering "completed": deduct inventory, recognize revenue. Customer
    // stats (totalSpent/ordersCount/etc.) are computed live from `orders` in
    // get_customer_stats() — nothing to recompute/cache here anymore.
    if (nowCompleted && !wasCompleted) {
      await deductInventoryForOrder(updatedOrder);
      eventBus.emit('order.completed', updatedOrder);
    }
    // Leaving "completed" into a reversing state: restore inventory.
    else if (wasCompleted && REVERSING_STATUSES.includes(status)) {
      await restoreInventoryForOrder(updatedOrder);
    }

    eventBus.emit('order.updated', updatedOrder);

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
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');
    const order = rowToOrder(existingRow);
    // If a completed order is deleted, restore its stock first.
    if (order.status === COMPLETED_STATUS) {
      await restoreInventoryForOrder(order);
    }
    // Requires super_admin per RLS (orders_delete_super_admin) — a regular
    // admin's delete is silently filtered to zero rows by Postgres RLS.
    const { data, error } = await supabase.from('orders').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('غير مصرح لك بحذف هذا الطلب');
    eventBus.emit('order.deleted', id);
    eventBus.emit('business.changed');
  }

  async updatePaymentStatus(id: string, paymentStatus: OrderPaymentStatus): Promise<Order> {
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');
    const { data: updatedRow, error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatusToDb(paymentStatus) })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const updated = rowToOrder({ ...updatedRow, order_items: existingRow.order_items });
    eventBus.emit('order.updated', updated);
    eventBus.emit('business.changed');
    return updated;
  }

  async addInternalNote(id: string, note: string): Promise<Order> {
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');
    const existing = rowToOrder(existingRow);
    const noteEntry = { id: `note_${Date.now()}`, adminName: 'Admin', text: note, date: new Date().toISOString() };
    const nextNotes = [...(existing.internalNotes ?? []), noteEntry];
    const { data: updatedRow, error } = await supabase
      .from('orders')
      .update({ internal_notes: nextNotes as unknown as TablesInsert<'orders'>['internal_notes'] })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToOrder({ ...updatedRow, order_items: existingRow.order_items });
  }

  /** Update shipment information (company, tracking number, courier, ETA) — appears on the customer tracking page. */
  async updateShipping(
    id: string,
    data: { shippingCompany?: string; trackingNumber?: string; courierName?: string; estimatedDeliveryDate?: string | null }
  ): Promise<Order> {
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');
    const existing = rowToOrder(existingRow);

    // A timestamptz column rejects '' outright (Postgres 22007) — an empty/blank
    // input means "clear the date", which Postgres only accepts as null.
    const nextEta = data.estimatedDeliveryDate === undefined
      ? (existing.estimatedDeliveryDate ?? null)
      : (data.estimatedDeliveryDate?.trim() ? data.estimatedDeliveryDate : null);

    const changes: string[] = [];
    if (data.trackingNumber && data.trackingNumber !== existing.trackingNumber) changes.push(`رقم التتبع: ${data.trackingNumber}`);
    if (data.shippingCompany && data.shippingCompany !== existing.shippingCompany) changes.push(`شركة الشحن: ${data.shippingCompany}`);
    if (data.courierName && data.courierName !== existing.courierName) changes.push(`المندوب: ${data.courierName}`);
    if (nextEta !== (existing.estimatedDeliveryDate ?? null)) changes.push('تم تحديث موعد التسليم المتوقع');

    const now = new Date().toISOString();
    const nextTimeline = changes.length
      ? [{ status: existing.status, timestamp: now, adminId: 'admin_1', note: `تحديث الشحن — ${changes.join(' • ')}`, type: 'shipping' }, ...existing.timeline]
      : existing.timeline;

    const { data: updatedRow, error } = await supabase
      .from('orders')
      .update({
        shipping_company: data.shippingCompany ?? existing.shippingCompany ?? null,
        tracking_number: data.trackingNumber ?? existing.trackingNumber ?? null,
        courier_name: data.courierName ?? existing.courierName ?? null,
        estimated_delivery_date: nextEta,
        timeline: nextTimeline as unknown as TablesInsert<'orders'>['timeline'],
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const updated = rowToOrder({ ...updatedRow, order_items: existingRow.order_items });
    eventBus.emit('order.updated', updated);
    eventBus.emit('business.changed');
    return updated;
  }

  /** Post a customer-facing update: shown on tracking, pushed as a notification, recorded in history. */
  async addCustomerUpdate(id: string, text: string): Promise<Order> {
    const existingRow = await fetchOrderWithItems(id);
    if (!existingRow) throw new Error('Order not found');
    const existing = rowToOrder(existingRow);
    const now = new Date().toISOString();
    const nextTimeline = [{ status: existing.status, timestamp: now, adminId: 'admin_1', note: text, type: 'customer_update' }, ...existing.timeline];

    const { data: updatedRow, error } = await supabase
      .from('orders')
      .update({
        customer_update: text,
        customer_updated_at: now,
        timeline: nextTimeline as unknown as TablesInsert<'orders'>['timeline'],
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const updated = rowToOrder({ ...updatedRow, order_items: existingRow.order_items });
    CustomerNotificationService.notifyCustom(updated, text).catch((err) => console.error('notifyCustom failed:', err));
    eventBus.emit('order.updated', updated);
    return updated;
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    const { data } = await supabase.from('orders').select(SELECT_WITH_ITEMS).in('id', ids);
    const orders = ((data ?? []) as unknown as OrderWithItems[]).map(rowToOrder);
    // Restore stock for any completed orders being deleted.
    for (const order of orders.filter(o => o.status === COMPLETED_STATUS)) {
      await restoreInventoryForOrder(order);
    }
    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) throw error;
    eventBus.emit('orders.bulk_deleted', ids);
    eventBus.emit('business.changed');
  }

  async markAsPaidMultiple(ids: string[]): Promise<void> {
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).in('id', ids);
    if (error) throw error;
    eventBus.emit('orders.bulk_updated', ids);
    eventBus.emit('business.changed');
  }
}

export const OrderService = new SupabaseOrderRepositoryImpl();
