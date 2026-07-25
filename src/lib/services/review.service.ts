import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  rating: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  isFeatured: boolean;
  isPinned: boolean;
  verifiedPurchase: boolean;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
}

type ReviewRow = Tables<'reviews'>;

const supabase = createClient();

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id ?? '',
    productName: row.product_name,
    productImage: row.product_image ?? '',
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerAvatar: row.customer_avatar ?? undefined,
    rating: row.rating,
    title: row.title,
    content: row.content,
    status: row.status as Review['status'],
    isFeatured: row.is_featured,
    isPinned: row.is_pinned,
    verifiedPurchase: row.verified_purchase,
    adminReply: row.admin_reply,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ReviewService = {
  async getReviews(filters?: { status?: Review['status']; productId?: string; isFeatured?: boolean }): Promise<Review[]> {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.productId) query = query.eq('product_id', filters.productId);
    if (filters?.isFeatured !== undefined) query = query.eq('is_featured', filters.isFeatured);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToReview);
  },

  /**
   * Kept for callers that seed initial render state synchronously (avoids a
   * delayed pop-in of storefront testimonials). Real reviews now live in
   * Supabase, so this can no longer return data synchronously — it returns an
   * empty array and callers are expected to follow up with `getReviews()`
   * (every current call site already does, via a `useEffect`).
   */
  getReviewsSync(_filters?: { status?: Review['status']; productId?: string; isFeatured?: boolean }): Review[] {
    return [];
  },

  async getReview(id: string): Promise<Review | null> {
    const { data, error } = await supabase.from('reviews').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToReview(data) : null;
  },

  async createReview(data: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'isFeatured' | 'isPinned' | 'adminReply'>): Promise<Review> {
    const { data: created, error } = await supabase
      .from('reviews')
      .insert({
        product_id: data.productId || null,
        product_name: data.productName,
        product_image: data.productImage || null,
        customer_id: data.customerId || null,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_avatar: data.customerAvatar || null,
        rating: data.rating,
        title: data.title,
        content: data.content,
        status: data.status,
        verified_purchase: data.verifiedPurchase,
      })
      .select('*')
      .single();
    if (error) throw error;

    const review = rowToReview(created);
    eventBus.emit('review.submitted', review);
    eventBus.emit('reviews.changed');
    return review;
  },

  async updateReviewStatus(id: string, status: Review['status']): Promise<Review> {
    const { data, error } = await supabase.from('reviews').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;

    const review = rowToReview(data);
    if (status === 'approved') eventBus.emit('review.approved', review);
    if (status === 'rejected') eventBus.emit('review.rejected', review);
    eventBus.emit('reviews.changed');
    return review;
  },

  async updateAdminReply(id: string, reply: string | null): Promise<Review> {
    const { data, error } = await supabase.from('reviews').update({ admin_reply: reply }).eq('id', id).select('*').single();
    if (error) throw error;

    const review = rowToReview(data);
    eventBus.emit('reviews.changed');
    return review;
  },

  async toggleFeatured(id: string): Promise<Review> {
    const current = await this.getReview(id);
    if (!current) throw new Error('Review not found');

    const { data, error } = await supabase
      .from('reviews')
      .update({ is_featured: !current.isFeatured })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const review = rowToReview(data);
    eventBus.emit('reviews.changed');
    return review;
  },

  async togglePinned(id: string): Promise<Review> {
    const current = await this.getReview(id);
    if (!current) throw new Error('Review not found');

    const { data, error } = await supabase
      .from('reviews')
      .update({ is_pinned: !current.isPinned })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const review = rowToReview(data);
    eventBus.emit('reviews.changed');
    return review;
  },

  async updateReview(id: string, updates: Partial<Pick<Review, 'title' | 'content' | 'customerAvatar' | 'verifiedPurchase'>>): Promise<Review> {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.content !== undefined && { content: updates.content }),
        ...(updates.customerAvatar !== undefined && { customer_avatar: updates.customerAvatar }),
        ...(updates.verifiedPurchase !== undefined && { verified_purchase: updates.verifiedPurchase }),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const review = rowToReview(data);
    eventBus.emit('reviews.changed');
    return review;
  },

  async deleteReview(id: string): Promise<void> {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('reviews.changed');
  },
};
