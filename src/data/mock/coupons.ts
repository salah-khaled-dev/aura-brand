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

