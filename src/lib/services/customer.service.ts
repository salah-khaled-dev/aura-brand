import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

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

export interface Customer {
  id: string;
  customerNumber: string;
  firstName?: string;
  lastName?: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'unspecified';
  marketingConsent?: boolean;
  status: CustomerStatus;

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
  // No live cart/wishlist attribution is possible without a customer-auth
  // system — guest carts/wishlists aren't linked to any persistent identity.
  // Always 0 until real customer accounts exist.
  wishlistCount: number;
  cartItemsCount?: number;
  reviewsCount: number;

  favoriteCategory?: string;
  favoriteBrand?: string;
  favoriteColor?: string;

  notes: string;
  internalNotes: CustomerInternalNote[];
  tags: string[];
  segments: string[];
  addresses: CustomerAddress[];
  activities: CustomerActivity[];

  wishlistProductIds?: string[];
  usedCouponCodes?: string[];

  registrationDate?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface CustomerFilters {
  search?: string;
  status?: string;
  tags?: string;
  registrationDateRange?: { start: string; end: string };
  minOrders?: number;
  minSpent?: number;
}

type CustomerRow = Tables<'customers'>;
type AddressRow = Tables<'customer_addresses'>;
type NoteRow = Tables<'customer_notes'>;

const supabase = createClient();

function rowToAddress(row: AddressRow): CustomerAddress {
  return {
    id: row.id,
    label: row.label,
    fullName: row.full_name ?? undefined,
    phone: row.phone ?? undefined,
    street: row.street,
    apartment: row.apartment ?? undefined,
    floor: row.floor ?? undefined,
    building: row.building ?? undefined,
    area: row.area ?? undefined,
    city: row.city,
    postalCode: row.postal_code ?? undefined,
    country: row.country,
    isDefault: row.is_default,
  };
}

function rowToNote(row: NoteRow): CustomerInternalNote {
  return { id: row.id, adminName: row.admin_name, text: row.text, date: row.created_at };
}

interface OrderStatsAgg {
  totalOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  couponsUsed: number;
}

const EMPTY_STATS: OrderStatsAgg = {
  totalOrders: 0, cancelledOrders: 0, returnedOrders: 0, totalSpent: 0, averageOrderValue: 0, couponsUsed: 0,
};

function rowToCustomer(row: CustomerRow, stats: OrderStatsAgg, reviewsCount: number): Customer {
  return {
    id: row.id,
    customerNumber: row.customer_number,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    name: row.full_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar_url ?? undefined,
    gender: (row.gender as Customer['gender']) ?? 'unspecified',
    marketingConsent: row.marketing_consent,
    status: row.status as CustomerStatus,

    lifetimeValue: stats.totalSpent,
    totalSpent: stats.totalSpent,
    averagePurchaseValue: stats.averageOrderValue,
    averageOrderValue: stats.averageOrderValue,
    totalOrders: stats.totalOrders,
    ordersCount: stats.totalOrders,
    returnedOrdersCount: stats.returnedOrders,
    cancelledOrdersCount: stats.cancelledOrders,
    totalRefunds: 0,
    couponsUsed: stats.couponsUsed,
    loyaltyPoints: row.loyalty_points,
    wishlistCount: 0,
    cartItemsCount: 0,
    reviewsCount,

    favoriteCategory: row.favorite_category ?? undefined,
    favoriteBrand: row.favorite_brand ?? undefined,
    favoriteColor: row.favorite_color ?? undefined,

    notes: row.notes,
    internalNotes: [],
    tags: row.tags,
    segments: row.segments,
    addresses: [],
    activities: [],

    registrationDate: row.created_at,
    lastLogin: undefined,
    createdAt: row.created_at,
  };
}

/** One grouped query instead of N per-row RPC calls for the list view. */
async function getStatsForCustomers(customerIds: string[]): Promise<Map<string, OrderStatsAgg>> {
  const map = new Map<string, OrderStatsAgg>();
  if (customerIds.length === 0) return map;

  const { data, error } = await supabase
    .from('orders')
    .select('customer_ref_id, status, total, coupon_code')
    .in('customer_ref_id', customerIds);
  if (error) throw error;

  for (const id of customerIds) map.set(id, { ...EMPTY_STATS });

  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const cid = row.customer_ref_id;
    if (!cid) continue;
    const agg = map.get(cid);
    if (!agg) continue;

    if (row.status === 'cancelled') {
      agg.cancelledOrders += 1;
      continue;
    }
    if (row.status === 'returned') agg.returnedOrders += 1;
    agg.totalOrders += 1;
    agg.totalSpent += row.total;
    if (row.coupon_code) agg.couponsUsed += 1;

    const s = sums.get(cid) ?? { sum: 0, count: 0 };
    s.sum += row.total;
    s.count += 1;
    sums.set(cid, s);
  }
  for (const [cid, agg] of map) {
    const s = sums.get(cid);
    agg.averageOrderValue = s && s.count > 0 ? s.sum / s.count : 0;
  }
  return map;
}

/** Real activity feed: audit-log entries for this customer's own record, plus one entry per order they've placed. */
async function getActivitiesForCustomer(customerId: string): Promise<CustomerActivity[]> {
  const [logResult, ordersResult] = await Promise.all([
    supabase
      .from('activity_log')
      .select('id, action, created_at')
      .eq('entity_type', 'customer')
      .eq('entity_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('orders')
      .select('id, order_number, status, created_at')
      .eq('customer_ref_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const activities: CustomerActivity[] = [];

  for (const row of logResult.data ?? []) {
    const type: CustomerActivityType = row.action === 'created' ? 'registration' : 'status_change';
    const description = row.action === 'created' ? 'تم إنشاء سجل العميل' : 'تم تعديل بيانات العميل';
    activities.push({ id: row.id, type, description, date: row.created_at });
  }
  for (const row of ordersResult.data ?? []) {
    activities.push({
      id: `order_${row.id}`,
      type: 'order',
      description: `طلب ${row.order_number} — ${row.status}`,
      date: row.created_at,
    });
  }

  return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Best-effort — ReviewService is still mock-backed until the Reviews module is migrated; starts returning real counts automatically once it isn't. */
async function getReviewsCountByEmail(email: string): Promise<number> {
  if (!email) return 0;
  try {
    const { ReviewService } = await import('@/lib/services/review.service');
    const reviews = await ReviewService.getReviews();
    return reviews.filter((r) => r.customerEmail?.toLowerCase() === email.toLowerCase()).length;
  } catch {
    return 0;
  }
}

export const CustomerService = {
  async getCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (filters?.search) {
      const q = filters.search.trim().replace(/[,()\\%_]/g, '\\$&');
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,customer_number.ilike.%${q}%`);
    }
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.tags) query = query.contains('tags', [filters.tags]);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const statsMap = await getStatsForCustomers(rows.map((r) => r.id));
    let customers = rows.map((row) => rowToCustomer(row, statsMap.get(row.id) ?? EMPTY_STATS, 0));

    if (filters?.minOrders !== undefined) customers = customers.filter((c) => c.totalOrders >= filters.minOrders!);
    if (filters?.minSpent !== undefined) customers = customers.filter((c) => c.totalSpent >= filters.minSpent!);

    return customers;
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    const { data: row, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!row) return undefined;

    const [statsMap, { data: addressRows }, { data: noteRows }, reviewsCount, activities] = await Promise.all([
      getStatsForCustomers([id]),
      supabase.from('customer_addresses').select('*').eq('customer_id', id).order('is_default', { ascending: false }),
      supabase.from('customer_notes').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      getReviewsCountByEmail(row.email),
      getActivitiesForCustomer(id),
    ]);

    const customer = rowToCustomer(row, statsMap.get(id) ?? EMPTY_STATS, reviewsCount);
    customer.addresses = (addressRows ?? []).map(rowToAddress);
    customer.internalNotes = (noteRows ?? []).map(rowToNote);
    customer.activities = activities;
    return customer;
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || '';
    const insertRow: TablesInsert<'customers'> = {
      customer_number: `CUS-${Date.now().toString().slice(-6)}`,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      full_name: fullName,
      email: data.email || '',
      phone: data.phone || '',
      gender: data.gender || 'unspecified',
      status: data.status || 'active',
      marketing_consent: data.marketingConsent || false,
      notes: data.notes || '',
      tags: data.tags || [],
      segments: data.segments || [],
    };
    const { data: row, error } = await supabase.from('customers').insert(insertRow).select().single();
    if (error) throw error;

    const newCustomer = rowToCustomer(row, EMPTY_STATS, 0);
    eventBus.emit('customer.created', newCustomer);
    return newCustomer;
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const patch: Partial<TablesInsert<'customers'>> = {};
    if (data.firstName !== undefined) patch.first_name = data.firstName;
    if (data.lastName !== undefined) patch.last_name = data.lastName;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.gender !== undefined) patch.gender = data.gender;
    if (data.status !== undefined) patch.status = data.status;
    if (data.marketingConsent !== undefined) patch.marketing_consent = data.marketingConsent;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.segments !== undefined) patch.segments = data.segments;
    if (data.favoriteCategory !== undefined) patch.favorite_category = data.favoriteCategory;
    if (data.favoriteBrand !== undefined) patch.favorite_brand = data.favoriteBrand;
    if (data.favoriteColor !== undefined) patch.favorite_color = data.favoriteColor;
    if (data.loyaltyPoints !== undefined) patch.loyalty_points = data.loyaltyPoints;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      patch.full_name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.name || undefined;
    }

    const { data: row, error } = await supabase.from('customers').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Customer not found');

    const updated = await this.getCustomer(row.id);
    eventBus.emit('customer.updated', updated);
    return updated!;
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    const { error } = await supabase.from('customers').delete().in('id', ids);
    if (error) throw error;
    eventBus.emit('customer.deleted', ids);
  },

  async blockCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { status: 'blocked' });
  },

  async activateCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { status: 'active' });
  },

  async addInternalNote(id: string, note: string): Promise<Customer> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const adminName = user?.email ?? 'Admin';

    const { error } = await supabase.from('customer_notes').insert({ customer_id: id, admin_id: user?.id ?? null, admin_name: adminName, text: note });
    if (error) throw error;

    const updated = await this.getCustomer(id);
    if (!updated) throw new Error('Customer not found');
    return updated;
  },

  async addTag(id: string, tag: string): Promise<Customer> {
    const customer = await this.getCustomer(id);
    if (!customer) throw new Error('Customer not found');
    if (customer.tags.includes(tag)) return customer;

    const { error } = await supabase.from('customers').update({ tags: [...customer.tags, tag] }).eq('id', id);
    if (error) throw error;

    const updated = await this.getCustomer(id);
    return updated!;
  },

  async removeTag(id: string, tag: string): Promise<Customer> {
    const customer = await this.getCustomer(id);
    if (!customer) throw new Error('Customer not found');

    const { error } = await supabase.from('customers').update({ tags: customer.tags.filter((t) => t !== tag) }).eq('id', id);
    if (error) throw error;

    const updated = await this.getCustomer(id);
    return updated!;
  },

  async addAddress(customerId: string, address: Omit<CustomerAddress, 'id'>): Promise<Customer> {
    const existing = await this.getCustomer(customerId);
    if (!existing) throw new Error('Customer not found');

    const isDefault = address.isDefault || existing.addresses.length === 0;
    if (isDefault) {
      await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', customerId);
    }

    const { error } = await supabase.from('customer_addresses').insert({
      customer_id: customerId,
      label: address.label,
      full_name: address.fullName ?? null,
      phone: address.phone ?? null,
      street: address.street,
      apartment: address.apartment ?? null,
      floor: address.floor ?? null,
      building: address.building ?? null,
      area: address.area ?? null,
      city: address.city,
      postal_code: address.postalCode ?? null,
      country: address.country,
      is_default: isDefault,
    });
    if (error) throw error;

    const updated = await this.getCustomer(customerId);
    eventBus.emit('customer.updated', updated);
    return updated!;
  },

  async updateAddress(customerId: string, addressId: string, updates: Partial<CustomerAddress>): Promise<Customer> {
    if (updates.isDefault) {
      await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', customerId);
    }
    const patch: Partial<AddressRow> = {};
    if (updates.label !== undefined) patch.label = updates.label;
    if (updates.fullName !== undefined) patch.full_name = updates.fullName;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.street !== undefined) patch.street = updates.street;
    if (updates.apartment !== undefined) patch.apartment = updates.apartment;
    if (updates.floor !== undefined) patch.floor = updates.floor;
    if (updates.building !== undefined) patch.building = updates.building;
    if (updates.area !== undefined) patch.area = updates.area;
    if (updates.city !== undefined) patch.city = updates.city;
    if (updates.postalCode !== undefined) patch.postal_code = updates.postalCode;
    if (updates.country !== undefined) patch.country = updates.country;
    if (updates.isDefault !== undefined) patch.is_default = updates.isDefault;

    const { error } = await supabase.from('customer_addresses').update(patch).eq('id', addressId).eq('customer_id', customerId);
    if (error) throw error;

    const updated = await this.getCustomer(customerId);
    if (!updated) throw new Error('Customer not found');
    eventBus.emit('customer.updated', updated);
    return updated;
  },

  async deleteAddress(customerId: string, addressId: string): Promise<Customer> {
    const { error } = await supabase.from('customer_addresses').delete().eq('id', addressId).eq('customer_id', customerId);
    if (error) throw error;

    const remaining = await supabase.from('customer_addresses').select('*').eq('customer_id', customerId);
    if (remaining.data && remaining.data.length > 0 && !remaining.data.some((a) => a.is_default)) {
      await supabase.from('customer_addresses').update({ is_default: true }).eq('id', remaining.data[0].id);
    }

    const updated = await this.getCustomer(customerId);
    if (!updated) throw new Error('Customer not found');
    eventBus.emit('customer.updated', updated);
    return updated;
  },
};
