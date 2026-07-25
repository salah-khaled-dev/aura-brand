import { Coupon } from '@/data/mock/coupons';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

type CouponRow = Tables<'coupons'>;

const supabase = createClient();

function rowToCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    type: row.type,
    discountValue: row.value,
    status: (row.status as Coupon['status']) ?? 'active',
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    perCustomerLimit: row.per_user_limit ?? 1,
    startDate: row.starts_at ?? '',
    expirationDate: row.expires_at,
    minOrderValue: row.min_order_amount,
    maxDiscountValue: row.max_discount_amount ?? undefined,
    includedCategories: row.included_categories ?? [],
    excludedCategories: row.excluded_categories ?? [],
    includedProducts: row.included_products ?? [],
    excludedProducts: row.excluded_products ?? [],
  };
}

function couponToInsertRow(data: Partial<Coupon>): TablesInsert<'coupons'> {
  return {
    code: (data.code || `PROMO${Math.floor(Math.random() * 1000)}`).toUpperCase(),
    description: data.description || '',
    type: data.type || 'percentage',
    value: data.discountValue || 0,
    status: data.status || 'active',
    usage_limit: data.usageLimit ?? null,
    usage_count: 0,
    per_user_limit: data.perCustomerLimit ?? 1,
    starts_at: data.startDate || new Date().toISOString(),
    expires_at: data.expirationDate ?? null,
    min_order_amount: data.minOrderValue || 0,
    max_discount_amount: data.maxDiscountValue ?? null,
    included_categories: data.includedCategories ?? [],
    excluded_categories: data.excludedCategories ?? [],
    included_products: data.includedProducts ?? [],
    excluded_products: data.excludedProducts ?? [],
  };
}

function couponToUpdateRow(data: Partial<Coupon>): Partial<TablesInsert<'coupons'>> {
  const row: Partial<TablesInsert<'coupons'>> = {};
  if (data.code !== undefined) row.code = data.code.toUpperCase();
  if (data.description !== undefined) row.description = data.description;
  if (data.type !== undefined) row.type = data.type;
  if (data.discountValue !== undefined) row.value = data.discountValue;
  if (data.status !== undefined) row.status = data.status;
  if (data.usageLimit !== undefined) row.usage_limit = data.usageLimit;
  if (data.perCustomerLimit !== undefined) row.per_user_limit = data.perCustomerLimit;
  if (data.startDate !== undefined) row.starts_at = data.startDate;
  if (data.expirationDate !== undefined) row.expires_at = data.expirationDate;
  if (data.minOrderValue !== undefined) row.min_order_amount = data.minOrderValue;
  if (data.maxDiscountValue !== undefined) row.max_discount_amount = data.maxDiscountValue;
  if (data.includedCategories !== undefined) row.included_categories = data.includedCategories;
  if (data.excludedCategories !== undefined) row.excluded_categories = data.excludedCategories;
  if (data.includedProducts !== undefined) row.included_products = data.includedProducts;
  if (data.excludedProducts !== undefined) row.excluded_products = data.excludedProducts;
  return row;
}

/**
 * CouponService — Supabase-backed. Admin CRUD reads/writes the `coupons`
 * table directly (RLS restricts that to admins). Storefront checkout runs as
 * an anonymous guest, which RLS denies direct table access to on purpose
 * (coupon codes must never be enumerable) — `calculateDiscount` and
 * `incrementUsage` route those calls through the `validate_coupon` /
 * `increment_coupon_usage` security-definer RPCs instead (20260714120023).
 * Every mutation still emits the same EventBus events so other surfaces
 * (storefront, reports) stay in sync.
 */
export const CouponService = {
  async getCoupons(): Promise<Coupon[]> {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToCoupon);
  },

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const { data, error } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCoupon(data) : undefined;
  },

  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    const { data: row, error } = await supabase.from('coupons').insert(couponToInsertRow(data)).select().single();
    if (error) throw error;
    const newCoupon = rowToCoupon(row);
    eventBus.emit('coupon.created', newCoupon);
    eventBus.emit('coupon.changed', newCoupon);
    return newCoupon;
  },

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
    const { data: row, error } = await supabase.from('coupons').update(couponToUpdateRow(data)).eq('id', id).select().single();
    if (error) throw new Error('Coupon not found');
    const updated = rowToCoupon(row);
    eventBus.emit('coupon.updated', updated);
    eventBus.emit('coupon.changed', updated);
    return updated;
  },

  async deleteCoupon(id: string): Promise<void> {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('coupon.deleted', id);
    eventBus.emit('coupon.changed', { id });
  },

  /** Activate a coupon. */
  async activateCoupon(id: string): Promise<Coupon> {
    return this.updateCoupon(id, { status: 'active' });
  },

  /** Disable a coupon. */
  async disableCoupon(id: string): Promise<Coupon> {
    return this.updateCoupon(id, { status: 'disabled' });
  },

  /**
   * Increment usage count after a coupon is redeemed on an order.
   * Auto-disables the coupon once its usage limit is reached.
   * Runs as a guest during storefront checkout, so this always goes through
   * the security-definer RPC rather than a direct table update (RLS would
   * reject the latter for anon). Requires the id of an order that actually
   * references this code — the RPC verifies that server-side and silently
   * no-ops otherwise, so an anonymous caller can't spam this to exhaust or
   * disable a coupon without ever placing an order.
   */
  async incrementUsage(code: string, orderId: string): Promise<Coupon | undefined> {
    const normalized = code.toUpperCase();
    const { error } = await supabase.rpc('increment_coupon_usage', { p_code: normalized, p_order_id: orderId });
    if (error) return undefined;
    // Only resolves to a full row for an admin session (RLS); guests get a
    // successful increment with no row back, which every call site already
    // tolerates (`Coupon | undefined`).
    const { data: row } = await supabase.from('coupons').select('*').eq('code', normalized).maybeSingle();
    const updated = row ? rowToCoupon(row) : undefined;
    eventBus.emit('coupon.used', updated ?? { code: normalized });
    eventBus.emit('coupon.changed', updated ?? { code: normalized });
    return updated;
  },

  /** True when a coupon is past its expiration date. */
  isExpired(coupon: Coupon): boolean {
    return !!coupon.expirationDate && new Date(coupon.expirationDate) < new Date();
  },

  async duplicateCoupon(id: string): Promise<Coupon> {
    const { data: original, error: fetchError } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
    if (fetchError || !original) throw new Error('Coupon not found');

    const copyRow: TablesInsert<'coupons'> = {
      ...couponToInsertRow(rowToCoupon(original)),
      code: `${original.code}_COPY`.toUpperCase(),
      usage_count: 0,
      status: 'disabled',
    };
    const { data: row, error } = await supabase.from('coupons').insert(copyRow).select().single();
    if (error) throw error;
    const copy = rowToCoupon(row);
    eventBus.emit('coupon.created', copy);
    eventBus.emit('coupon.changed', copy);
    return copy;
  },

  /**
   * Validate a coupon code against an order subtotal and compute its discount.
   *
   * RLS only grants direct `coupons` SELECT to admins, so a direct read only
   * succeeds when called from an authenticated admin session (e.g. the admin
   * "new order" form) — and gives the same precise error messages as before.
   * For every other caller (storefront checkout, running as an anonymous
   * guest) the direct read returns nothing under RLS, so this falls back to
   * the `validate_coupon` security-definer RPC, which can only confirm
   * validity/invalidity — not the specific reason — so guests get one
   * consolidated error message instead of the admin's detailed ones.
   */
  async calculateDiscount(code: string, orderSubtotal: number): Promise<{ valid: boolean; discountAmount: number; error?: string; coupon?: Coupon }> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { valid: false, discountAmount: 0, error: 'أدخل رمز الكوبون' };

    const { data: row } = await supabase.from('coupons').select('*').eq('code', normalized).maybeSingle();
    if (row) {
      const coupon = rowToCoupon(row);
      if (coupon.status !== 'active') return { valid: false, discountAmount: 0, error: 'الكوبون غير فعال' };
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, discountAmount: 0, error: 'تم تجاوز الحد الأقصى لاستخدام الكوبون' };
      }
      if (this.isExpired(coupon)) return { valid: false, discountAmount: 0, error: 'الكوبون منتهي الصلاحية' };
      if (orderSubtotal < coupon.minOrderValue) {
        return { valid: false, discountAmount: 0, error: `الحد الأدنى للطلب هو ${coupon.minOrderValue}` };
      }
      let amount = 0;
      if (coupon.type === 'fixed') {
        amount = coupon.discountValue;
      } else if (coupon.type === 'percentage') {
        amount = (orderSubtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountValue && amount > coupon.maxDiscountValue) amount = coupon.maxDiscountValue;
      }
      return { valid: true, discountAmount: amount, coupon };
    }

    const { data: rpcRows } = await supabase.rpc('validate_coupon', { p_code: normalized, p_order_amount: orderSubtotal });
    const match = rpcRows?.[0];
    if (!match) {
      return { valid: false, discountAmount: 0, error: 'الكوبون غير موجود أو غير صالح لهذا الطلب' };
    }
    let amount = 0;
    if (match.type === 'fixed') {
      amount = match.value;
    } else if (match.type === 'percentage') {
      amount = (orderSubtotal * match.value) / 100;
      if (match.max_discount_amount && amount > match.max_discount_amount) amount = match.max_discount_amount;
    }
    return { valid: true, discountAmount: amount };
  }
};
