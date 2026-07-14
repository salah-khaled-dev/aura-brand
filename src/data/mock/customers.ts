import { mockStorage } from '@/lib/storage/mock-storage';

export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'pending' | 'vip';

export interface CustomerAddress {
  id: string;
  label: string;
  fullName?: string;
  phone?: string;
  street: string;
  apartment?: string;
  floor?: string;
  building?: string;
  area?: string;
  city: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

export type CustomerActivityType =
  | 'order' | 'review' | 'login' | 'signup' | 'coupon'
  | 'registration' | 'status_change' | 'note_added'
  | 'tag_added' | 'tag_removed' | 'address_added' | 'address_removed';

export interface CustomerActivity {
  id: string;
  type: CustomerActivityType;
  description: string;
  date: string;
}

export interface CustomerInternalNote {
  id: string;
  adminName: string;
  text: string;
  date: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  customerNumber: string;

  // Name fields
  firstName?: string;
  lastName?: string;
  name: string;
  fullName: string;

  // Contact
  email: string;
  phone: string;
  avatar?: string;

  // Demographics
  gender?: 'male' | 'female' | 'unspecified';
  marketingConsent?: boolean;

  // Status
  status: CustomerStatus;

  // Finance metrics
  lifetimeValue: number;
  totalSpent: number;
  averagePurchaseValue: number;
  averageOrderValue: number;
  totalOrders: number;
  ordersCount: number;
  returnedOrdersCount: number;
  cancelledOrdersCount: number;
  totalRefunds?: number;
  couponsUsed: number;
  loyaltyPoints: number;
  wishlistCount: number;
  cartItemsCount?: number;
  reviewsCount: number;

  // Preferences
  favoriteCategory?: string;
  favoriteBrand?: string;
  favoriteColor?: string;

  // Relationship data
  notes: string;
  internalNotes: CustomerInternalNote[];
  tags: string[];
  segments: string[];
  addresses: CustomerAddress[];
  activities: CustomerActivity[];

  // Relational links (mock-first relationships → resolved against Product/Coupon services)
  wishlistProductIds?: string[];
  usedCouponCodes?: string[];

  // Dates
  registrationDate?: string;
  lastLogin?: string;
  createdAt: string;
}

export let mockCustomers: Customer[] = [];

mockCustomers = mockStorage.read('customers', mockCustomers);

export const updateMockCustomers = (data: Customer[]) => { mockCustomers = data; mockStorage.write('customers', data); };
