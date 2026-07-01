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

const couponsSeed: Coupon[] = [
  {
    id: 'coup_1',
    code: 'WELCOME2027',
    description: 'خصم ترحيبي للعملاء الجدد',
    type: 'percentage',
    discountValue: 15,
    status: 'active',
    usageLimit: null,
    usageCount: 450,
    perCustomerLimit: 1,
    startDate: '2026-01-01T00:00:00Z',
    expirationDate: '2027-12-31T23:59:59Z',
    minOrderValue: 500,
    maxDiscountValue: 300,
    includedCategories: [],
    excludedCategories: [],
    includedProducts: [],
    excludedProducts: []
  },
  {
    id: 'coup_2',
    code: 'RAMADAN500',
    description: 'خصم ثابت بمناسبة شهر رمضان',
    type: 'fixed',
    discountValue: 500,
    status: 'active',
    usageLimit: 1000,
    usageCount: 850,
    perCustomerLimit: 1,
    startDate: '2026-03-01T00:00:00Z',
    expirationDate: '2026-04-30T23:59:59Z',
    minOrderValue: 2000,
    includedCategories: ['cat_1', 'cat_2'],
    excludedCategories: [],
    includedProducts: [],
    excludedProducts: []
  },
  {
    id: 'coup_3',
    code: 'FREESHIP',
    description: 'شحن مجاني للطلبات الكبيرة',
    type: 'shipping',
    discountValue: 0,
    status: 'disabled',
    usageLimit: null,
    usageCount: 120,
    perCustomerLimit: 5,
    startDate: '2026-01-01T00:00:00Z',
    expirationDate: null,
    minOrderValue: 3000,
    includedCategories: [],
    excludedCategories: [],
    includedProducts: [],
    excludedProducts: []
  }
];

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
