import { mockStorage } from '@/lib/storage/mock-storage';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'shipping';
  discountValue: number;
  status: 'active' | 'disabled' | 'archived';
  usageLimit: number | null; // null = unlimited
  usageCount: number;
  perCustomerLimit: number;
  startDate: string;
  expirationDate: string | null;
  minOrderValue: number;
  maxDiscountValue?: number; // Only for percentage
  includedCategories: string[];
  excludedCategories: string[];
  includedProducts: string[];
  excludedProducts: string[];
}

const couponsSeed: Coupon[] = [];

export const getCouponsSeed = (): Coupon[] => couponsSeed;

export let mockCoupons: Coupon[] = mockStorage.read('coupons', couponsSeed);

export const updateMockCoupons = (newCoupons: Coupon[]) => {
  mockCoupons = newCoupons;
  mockStorage.write('coupons', newCoupons);
};

export const getLiveCoupons = (): Coupon[] => mockCoupons;

export const refreshFromStorage = (): boolean => {
  const persisted = mockStorage.read('coupons', couponsSeed);
  if (JSON.stringify(persisted) === JSON.stringify(mockCoupons)) return false;
  mockCoupons = persisted;
  return true;
};
