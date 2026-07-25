/**
 * Unified order-status model — the single source of truth for the order lifecycle
 * shared by the storefront (checkout, tracking) and the admin dashboard.
 *
 * Every surface that needs a status label, badge colour, timeline step or customer
 * notification message reads it from here, so the workflow can never drift between
 * the two surfaces. When Supabase lands these strings become an `order_status`
 * enum + a status-history table — the shape stays identical.
 */
import type { Order, OrderStatus, OrderFulfillmentStatus } from '@/data/mock/orders';

export type AdminBadgeVariant =
  | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';

export interface OrderStatusMeta {
  key: OrderStatus;
  /** Admin-facing label. */
  label: string;
  /** Customer-facing timeline step title. */
  timelineLabel: string;
  /** Customer-facing step description. */
  description: string;
  /** Admin Badge variant. */
  badge: AdminBadgeVariant;
  /** Message pushed to the customer notification feed when an order enters this status. */
  notification: string;
}

/** The ordered "happy path" every order moves through, used to render the timeline. */
export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered',
];

/** The full set of statuses an admin can assign (progress path + exceptions). */
export const WORKFLOW_STATUSES: OrderStatus[] = [
  ...ORDER_STATUS_SEQUENCE,
  'cancelled',
  'returned',
];

/** Statuses that take an order off the happy path. */
export const TERMINAL_STATUSES: OrderStatus[] = ['cancelled', 'returned', 'refunded'];

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  pending: {
    key: 'pending',
    label: 'بانتظار المراجعة',
    timelineLabel: 'تم استلام الطلب',
    description: 'وصل طلبكِ إلى أتيلييه أورا وهو بانتظار المراجعة',
    badge: 'warning',
    notification: 'تم استلام طلبكِ بنجاح وهو الآن بانتظار المراجعة من مستشارة أورا.',
  },
  confirmed: {
    key: 'confirmed',
    label: 'تم التأكيد',
    timelineLabel: 'تم تأكيد الطلب',
    description: 'تم تأكيد المقاسات وتوفر القطعة',
    badge: 'info',
    notification: 'تم تأكيد طلبكِ من قبل أتيلييه أورا، وسنبدأ في تجهيزه قريباً.',
  },
  preparing: {
    key: 'preparing',
    label: 'جاري التجهيز',
    timelineLabel: 'جاري التجهيز',
    description: 'يتم تجهيز قطعتكِ بعناية في أتيلييه الجيزة',
    badge: 'primary',
    notification: 'بدأنا في تجهيز قطعتكِ بعناية داخل أتيلييه أورا.',
  },
  ready_to_ship: {
    key: 'ready_to_ship',
    label: 'جاهز للشحن',
    timelineLabel: 'جاهز للشحن',
    description: 'تم تغليف طلبكِ وأصبح جاهزاً للشحن',
    badge: 'primary',
    notification: 'طلبكِ أصبح جاهزاً للشحن وسيُسلّم لمندوب التوصيل قريباً.',
  },
  shipped: {
    key: 'shipped',
    label: 'تم الشحن',
    timelineLabel: 'تم الشحن',
    description: 'الشحنة في طريقها مع مندوب التوصيل السريع',
    badge: 'info',
    notification: 'تم شحن طلبكِ وهو الآن في طريقه إليكِ.',
  },
  out_for_delivery: {
    key: 'out_for_delivery',
    label: 'خرج للتوصيل',
    timelineLabel: 'خرج للتوصيل',
    description: 'مندوب التوصيل في الطريق إلى عنوانكِ',
    badge: 'info',
    notification: 'مندوب التوصيل في الطريق إليكِ الآن لتسليم طلبكِ.',
  },
  delivered: {
    key: 'delivered',
    label: 'تم التسليم',
    timelineLabel: 'تم التسليم',
    description: 'تم تسليم الشحنة بنجاح إلى عنوانكِ',
    badge: 'success',
    notification: 'تم تسليم طلبكِ بنجاح. نتمنى لكِ تجربة استثنائية مع أورا.',
  },
  cancelled: {
    key: 'cancelled',
    label: 'ملغي',
    timelineLabel: 'تم الإلغاء',
    description: 'تم إلغاء هذا الطلب',
    badge: 'danger',
    notification: 'تم إلغاء طلبكِ. للاستفسار يرجى التواصل مع مستشارة أورا.',
  },
  returned: {
    key: 'returned',
    label: 'مرتجع',
    timelineLabel: 'تم الإرجاع',
    description: 'تم تسجيل إرجاع هذا الطلب',
    badge: 'neutral',
    notification: 'تم تسجيل إرجاع طلبكِ. سيتواصل معكِ فريق أورا لاستكمال الإجراءات.',
  },
  refunded: {
    key: 'refunded',
    label: 'مسترد',
    timelineLabel: 'تم الاسترداد',
    description: 'تم استرداد قيمة هذا الطلب',
    badge: 'neutral',
    notification: 'تم استرداد قيمة طلبكِ بالكامل.',
  },
  // Legacy aliases kept so previously-persisted orders never break lookups.
  processing: {
    key: 'processing',
    label: 'جاري التجهيز',
    timelineLabel: 'جاري التجهيز',
    description: 'يتم تجهيز قطعتكِ بعناية في أتيلييه الجيزة',
    badge: 'primary',
    notification: 'بدأنا في تجهيز قطعتكِ بعناية داخل أتيلييه أورا.',
  },
  packed: {
    key: 'packed',
    label: 'جاهز للشحن',
    timelineLabel: 'جاهز للشحن',
    description: 'تم تغليف طلبكِ وأصبح جاهزاً للشحن',
    badge: 'primary',
    notification: 'طلبكِ أصبح جاهزاً للشحن.',
  },
  ready: {
    key: 'ready',
    label: 'جاهز للشحن',
    timelineLabel: 'جاهز للشحن',
    description: 'تم تغليف طلبكِ وأصبح جاهزاً للشحن',
    badge: 'primary',
    notification: 'طلبكِ أصبح جاهزاً للشحن.',
  },
};

/** Map a workflow status onto the closest legacy `fulfillmentStatus` value. */
const STATUS_TO_FULFILLMENT: Record<OrderStatus, OrderFulfillmentStatus> = {
  pending: 'new',
  confirmed: 'confirmed',
  preparing: 'processing',
  ready_to_ship: 'ready_to_ship',
  shipped: 'shipped',
  out_for_delivery: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'returned',
  refunded: 'returned',
  processing: 'processing',
  packed: 'ready_to_ship',
  ready: 'ready_to_ship',
};

export function getStatusMeta(status: OrderStatus): OrderStatusMeta {
  return ORDER_STATUS_META[status] ?? ORDER_STATUS_META.pending;
}

/** True once an order has left the atelier for delivery (shipped, out for delivery, or delivered). */
export function hasShipped(status: OrderStatus): boolean {
  const index = ORDER_STATUS_SEQUENCE.indexOf(getStatusMeta(status).key);
  return index >= ORDER_STATUS_SEQUENCE.indexOf('shipped');
}

export function fulfillmentForStatus(status: OrderStatus): OrderFulfillmentStatus {
  return STATUS_TO_FULFILLMENT[status] ?? 'new';
}

/** Position of a status on the happy path, or -1 if it is off-path (cancelled/returned). */
export function getStatusStepIndex(status: OrderStatus): number {
  const meta = getStatusMeta(status);
  return ORDER_STATUS_SEQUENCE.indexOf(meta.key === status ? status : meta.key);
}

export type TimelineStepState = 'done' | 'current' | 'upcoming';

export interface CustomerTimelineStep {
  key: OrderStatus;
  label: string;
  description: string;
  date: string | null;
  state: TimelineStepState;
}

/**
 * Build the customer-facing shipment timeline for an order: every happy-path step,
 * each marked done / current / upcoming, with the timestamp drawn from the order's
 * own status history when available.
 */
export function buildCustomerTimeline(order: Pick<Order, 'status' | 'timeline'>): CustomerTimelineStep[] {
  const currentMeta = getStatusMeta(order.status);
  const currentKey = currentMeta.key;
  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(currentKey);
  const isOffPath = currentIndex === -1; // cancelled / returned / refunded

  // Newest-first history → map each happy-path status to its most recent timestamp.
  // Only status/created events count; customer-update & shipping events are skipped.
  const dateForStatus = (key: OrderStatus): string | null => {
    const entry = order.timeline?.find(
      (t) => (!t.type || t.type === 'status' || t.type === 'created') && getStatusMeta(t.status).key === key
    );
    return entry?.timestamp ?? null;
  };

  return ORDER_STATUS_SEQUENCE.map((key, index): CustomerTimelineStep => {
    const meta = ORDER_STATUS_META[key];
    let state: TimelineStepState;
    if (isOffPath) {
      // Steps reached before the order left the happy path stay "done".
      state = dateForStatus(key) ? 'done' : 'upcoming';
    } else if (index < currentIndex) {
      state = 'done';
    } else if (index === currentIndex) {
      state = 'current';
    } else {
      state = 'upcoming';
    }
    return {
      key,
      label: meta.timelineLabel,
      // Never surface a date for an upcoming step — a stray timestamp (e.g. an
      // admin correction that reverted a "delivered" order back a stage) would
      // otherwise make a future step read as already completed.
      date: state === 'upcoming' ? null : dateForStatus(key),
      description: meta.description,
      state,
    };
  });
}

/** Estimated delivery window: 5 business-ish days from creation, formatted in Arabic. */
export function estimateDelivery(order: Pick<Order, 'createdAt' | 'date'>): string {
  const base = new Date(order.createdAt || order.date || Date.now());
  base.setDate(base.getDate() + 5);
  return base.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Normalise an order number for tolerant lookup (case/symbol-insensitive). */
export function normalizeOrderNumber(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
