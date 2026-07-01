import { Coupon, mockCoupons, updateMockCoupons, refreshFromStorage } from '@/data/mock/coupons';
import { eventBus } from '@/lib/events/EventBus';

/**
 * CouponService — marketing/coupon seam (mock-first, Supabase-last).
 * The public surface mirrors the future `ICouponRepository`; swapping to
 * Supabase only re-implements these methods. Every mutation emits an EventBus
 * event so other surfaces (storefront, reports) stay in sync.
 */
export const CouponService = {
  async getCoupons(): Promise<Coupon[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        refreshFromStorage();
        resolve([...mockCoupons]);
      }, 300);
    });
  },

  async getCoupon(id: string): Promise<Coupon | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        refreshFromStorage();
        resolve(mockCoupons.find(c => c.id === id));
      }, 200);
    });
  },

  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    return new Promise((resolve) => {
      setTimeout(() => {
        refreshFromStorage();
        const newCoupon: Coupon = {
          id: `coup_${Date.now()}`,
          code: (data.code || `PROMO${Math.floor(Math.random() * 1000)}`).toUpperCase(),
          description: data.description || '',
          type: data.type || 'percentage',
          discountValue: data.discountValue || 0,
          status: data.status || 'active',
          usageLimit: data.usageLimit || null,
          usageCount: 0,
          perCustomerLimit: data.perCustomerLimit || 1,
          startDate: data.startDate || new Date().toISOString(),
          expirationDate: data.expirationDate || null,
          minOrderValue: data.minOrderValue || 0,
          maxDiscountValue: data.maxDiscountValue,
          includedCategories: data.includedCategories || [],
          excludedCategories: data.excludedCategories || [],
          includedProducts: data.includedProducts || [],
          excludedProducts: data.excludedProducts || []
        };
        updateMockCoupons([...mockCoupons, newCoupon]);
        eventBus.emit('coupon.created', newCoupon);
        eventBus.emit('coupon.changed', newCoupon);
        resolve(newCoupon);
      }, 500);
    });
  },

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        refreshFromStorage();
        const index = mockCoupons.findIndex(c => c.id === id);
        if (index === -1) return reject(new Error('Coupon not found'));
        
        const updated = { ...mockCoupons[index], ...data };
        if (updated.code) updated.code = updated.code.toUpperCase();
        
        const newArray = [...mockCoupons];
        newArray[index] = updated;
        updateMockCoupons(newArray);
        eventBus.emit('coupon.updated', updated);
        eventBus.emit('coupon.changed', updated);
        resolve(updated);
      }, 300);
    });
  },

  async deleteCoupon(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        refreshFromStorage();
        updateMockCoupons(mockCoupons.filter(c => c.id !== id));
        eventBus.emit('coupon.deleted', id);
        eventBus.emit('coupon.changed', { id });
        resolve();
      }, 400);
    });
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
   */
  async incrementUsage(code: string): Promise<Coupon | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        refreshFromStorage();
        const index = mockCoupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
        if (index === -1) return resolve(undefined);
        const coupon = mockCoupons[index];
        const usageCount = coupon.usageCount + 1;
        const reachedLimit = coupon.usageLimit !== null && usageCount >= coupon.usageLimit;
        const updated: Coupon = { ...coupon, usageCount, status: reachedLimit ? 'disabled' : coupon.status };
        const newArray = [...mockCoupons];
        newArray[index] = updated;
        updateMockCoupons(newArray);
        eventBus.emit('coupon.used', updated);
        eventBus.emit('coupon.changed', updated);
        resolve(updated);
      }, 200);
    });
  },

  /** True when a coupon is past its expiration date. */
  isExpired(coupon: Coupon): boolean {
    return !!coupon.expirationDate && new Date(coupon.expirationDate) < new Date();
  },

  async duplicateCoupon(id: string): Promise<Coupon> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        refreshFromStorage();
        const original = mockCoupons.find(c => c.id === id);
        if (!original) return reject(new Error('Coupon not found'));

        const copy: Coupon = {
          ...original,
          id: `coup_${Date.now()}`,
          code: `${original.code}_COPY`.toUpperCase(),
          usageCount: 0,
          status: 'disabled'
        };

        updateMockCoupons([...mockCoupons, copy]);
        eventBus.emit('coupon.created', copy);
        eventBus.emit('coupon.changed', copy);
        resolve(copy);
      }, 400);
    });
  },

  // Example of business logic encapsulation
  async calculateDiscount(code: string, orderSubtotal: number): Promise<{ valid: boolean; discountAmount: number; error?: string; coupon?: Coupon }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        refreshFromStorage();
        const coupon = mockCoupons.find(c => c.code.toUpperCase() === code.toUpperCase());
        if (!coupon) return resolve({ valid: false, discountAmount: 0, error: 'الكوبون غير موجود' });
        
        if (coupon.status !== 'active') return resolve({ valid: false, discountAmount: 0, error: 'الكوبون غير فعال' });
        
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
          return resolve({ valid: false, discountAmount: 0, error: 'تم تجاوز الحد الأقصى لاستخدام الكوبون' });
        }

        if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
          return resolve({ valid: false, discountAmount: 0, error: 'الكوبون منتهي الصلاحية' });
        }

        if (orderSubtotal < coupon.minOrderValue) {
          return resolve({ valid: false, discountAmount: 0, error: `الحد الأدنى للطلب هو ${coupon.minOrderValue}` });
        }

        let amount = 0;
        if (coupon.type === 'fixed') {
          amount = coupon.discountValue;
        } else if (coupon.type === 'percentage') {
          amount = (orderSubtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountValue && amount > coupon.maxDiscountValue) {
            amount = coupon.maxDiscountValue;
          }
        } else if (coupon.type === 'shipping') {
          // Shipping cost is offset (handled as discount amount)
          amount = 0; 
        }

        resolve({ valid: true, discountAmount: amount, coupon });
      }, 300);
    });
  }
};
