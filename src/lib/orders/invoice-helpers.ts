/**
 * Shared derived-data helpers for the invoice (PDF + HTML views alike), so
 * neither surface reinvents invoice numbering, payment-status badges, or the
 * tracking deep link.
 */
import type { Order } from '@/data/mock/orders';

/**
 * `order.invoiceNumber` is stamped once at creation by a DB trigger
 * (see supabase/migrations/20260725000002_add_invoice_number.sql) and never
 * changes afterwards — independent of order_number. This fallback only
 * matters for orders read before that migration has been applied to the
 * database (the column/trigger won't exist yet), so the UI never shows a
 * blank/undefined invoice number in the meantime.
 */
export function getInvoiceNumber(order: Pick<Order, 'invoiceNumber' | 'id' | 'createdAt'>): string {
  if (order.invoiceNumber) return order.invoiceNumber;
  const year = new Date(order.createdAt).getFullYear();
  const seq = order.id.replace(/-/g, '').slice(-6).toUpperCase();
  return `INV-${year}-${seq}`;
}

export type PaymentBadgeKey = 'paid' | 'pending' | 'cod' | 'refunded' | 'cancelled';

export interface PaymentBadgeMeta {
  key: PaymentBadgeKey;
  label: string;
  bg: string;
  fg: string;
}

/** One badge that folds order status + payment status + payment method into a single, unambiguous label. */
export function getPaymentBadgeMeta(order: Pick<Order, 'status' | 'paymentStatus' | 'paymentMethod'>): PaymentBadgeMeta {
  if (order.status === 'cancelled') {
    return { key: 'cancelled', label: 'ملغي', bg: '#F5E6E6', fg: '#B3261E' };
  }
  if (order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded') {
    return { key: 'refunded', label: 'مسترد', bg: '#EFEAE3', fg: '#5C5A56' };
  }
  if (order.paymentStatus === 'paid') {
    return { key: 'paid', label: 'مدفوعة', bg: '#E7F0E7', fg: '#2F6B3A' };
  }
  if (order.paymentMethod === 'cod') {
    return { key: 'cod', label: 'الدفع عند الاستلام', bg: '#FBF3E3', fg: '#8E6B4B' };
  }
  return { key: 'pending', label: 'بانتظار الدفع', bg: '#FBF3E3', fg: '#8E6B4B' };
}

/** The deep link a QR code / "Track Shipment" button sends the customer to. */
export function getTrackingUrl(orderNumber: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/tracking?order=${encodeURIComponent(orderNumber)}`;
}
