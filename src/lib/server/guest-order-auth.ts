import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/** Raw shape returned by the `get_guest_order` RPC — DB column names, not the app's camelCase Order type. */
export interface RawOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  sku: string;
  image_url: string | null;
  size: string | null;
  color_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface RawOrder {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  phone: string;
  customer_ref_id: string | null;
  order_items: RawOrderItem[];
  [key: string]: unknown;
}

/**
 * Verifies a guest owns the order they claim to, using the exact same proof
 * every other guest-facing feature in this app requires — order number (or
 * tracking number) + the phone/email used at checkout — via the
 * `get_guest_order` SECURITY DEFINER RPC (see
 * 20260714120022_orders_phase_b_columns.sql, extended by
 * 20260725000008_get_guest_order_by_tracking_number.sql). Never trust
 * order_number alone; it's a sequential, guessable DB counter.
 */
export async function verifyOrderOwnership(
  admin: SupabaseClient<Database>,
  orderNumber: string,
  contact: string
): Promise<RawOrder | null> {
  if (!orderNumber?.trim() || !contact?.trim()) return null;

  const { data, error } = await admin.rpc('get_guest_order', {
    p_order_number: orderNumber.trim(),
    p_contact: contact.trim(),
  });
  if (error) throw error;
  return (data as unknown as RawOrder) ?? null;
}
