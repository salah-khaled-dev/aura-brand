import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productColor?: string;
  productSize?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAvatar?: string;
  orderId?: string;
  orderItemId?: string;
  orderNumber?: string;
  rating: number;
  title: string;
  content: string;
  sizeFit?: 'runs_small' | 'true_to_size' | 'runs_large';
  recommended?: boolean;
  images: string[];
  hasImages: boolean;
  helpfulCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  isFeatured: boolean;
  isPinned: boolean;
  verifiedPurchase: boolean;
  adminReply: string | null;
  adminNotes: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewStats {
  averageRating: number | null;
  reviewCount: number;
  pctTrueToSize: number | null;
  pctRunsSmall: number | null;
  pctRunsLarge: number | null;
  pctRecommended: number | null;
}

export interface ReviewAdminStats {
  averageRating: number | null;
  reviewCount: number;
  approvalRate: number | null;
  mostReviewedProducts: { product_id: string; product_name: string; review_count: number }[];
  lowestRatedProducts: { product_id: string; product_name: string; average_rating: number; review_count: number }[];
}

export interface OrderReviewEligibilityItem {
  orderItemId: string;
  productId: string | null;
  productName: string;
  productImage: string | null;
  size: string | null;
  color: string | null;
  eligible: boolean;
  reviewed: boolean;
  review: {
    id: string;
    rating: number;
    title: string;
    content: string;
    sizeFit: string | null;
    recommended: boolean | null;
    images: string[];
    status: string;
    createdAt: string;
    editableUntil: string | null;
  } | null;
}

export interface OrderReviewEligibility {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  items: OrderReviewEligibilityItem[];
}

type ReviewRow = Tables<'reviews'>;

const supabase = createClient();
const HELPFUL_VOTES_KEY = 'aura_helpful_review_ids';

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id ?? '',
    productName: row.product_name,
    productImage: row.product_image ?? '',
    productColor: row.product_color ?? undefined,
    productSize: row.product_size ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone ?? undefined,
    customerAvatar: row.customer_avatar ?? undefined,
    orderId: row.order_id ?? undefined,
    orderItemId: row.order_item_id ?? undefined,
    orderNumber: row.order_number ?? undefined,
    rating: row.rating,
    title: row.title,
    content: row.content,
    sizeFit: (row.size_fit as Review['sizeFit']) ?? undefined,
    recommended: row.recommended ?? undefined,
    images: row.images ?? [],
    hasImages: row.has_images,
    helpfulCount: row.helpful_count,
    status: row.status as Review['status'],
    isFeatured: row.is_featured,
    isPinned: row.is_pinned,
    verifiedPurchase: row.verified_purchase,
    adminReply: row.admin_reply,
    adminNotes: row.admin_notes,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'حدث خطأ غير متوقع');
  return data as T;
}

async function postForm<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'حدث خطأ غير متوقع');
  return data as T;
}

export const ReviewService = {
  async getReviews(filters?: {
    status?: Review['status'];
    productId?: string;
    isFeatured?: boolean;
    orderNumber?: string;
    sizeFit?: Review['sizeFit'];
    rating?: number;
    sortOrder?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'photos_first';
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    let query = supabase.from('reviews').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.productId) query = query.eq('product_id', filters.productId);
    if (filters?.isFeatured !== undefined) query = query.eq('is_featured', filters.isFeatured);
    if (filters?.orderNumber) query = query.eq('order_number', filters.orderNumber);
    if (filters?.sizeFit) query = query.eq('size_fit', filters.sizeFit);
    if (filters?.rating) query = query.eq('rating', filters.rating);

    switch (filters?.sortOrder) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'highest':
        query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'photos_first':
        query = query.order('has_images', { ascending: false }).order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    if (filters?.limit !== undefined) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

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

  async getProductStats(productId: string): Promise<ProductReviewStats> {
    const { data, error } = await supabase.rpc('get_product_review_stats', { p_product_id: productId });
    if (error) throw error;
    const row = data?.[0];
    return {
      averageRating: row?.average_rating ?? null,
      reviewCount: row?.review_count ?? 0,
      pctTrueToSize: row?.pct_true_to_size ?? null,
      pctRunsSmall: row?.pct_runs_small ?? null,
      pctRunsLarge: row?.pct_runs_large ?? null,
      pctRecommended: row?.pct_recommended ?? null,
    };
  },

  async getAdminStats(): Promise<ReviewAdminStats> {
    const { data, error } = await supabase.rpc('get_review_admin_stats');
    if (error) throw error;
    const row = data?.[0];
    return {
      averageRating: row?.average_rating ?? null,
      reviewCount: row?.review_count ?? 0,
      approvalRate: row?.approval_rate ?? null,
      mostReviewedProducts: (row?.most_reviewed_products as ReviewAdminStats['mostReviewedProducts']) ?? [],
      lowestRatedProducts: (row?.lowest_rated_products as ReviewAdminStats['lowestRatedProducts']) ?? [],
    };
  },

  /** Order-verified submission flow (tracking page + product page "Write a Review"). Server-validated — see /api/reviews/submit. */
  async submitOrderReview(formData: FormData): Promise<Review> {
    const { review } = await postForm<{ review: ReviewRow }>('/api/reviews/submit', formData);
    return rowToReview(review);
  },

  /** Edit a just-submitted review within its 24h window — see /api/reviews/edit. */
  async editOrderReview(formData: FormData): Promise<Review> {
    const { review } = await postForm<{ review: ReviewRow }>('/api/reviews/edit', formData);
    return rowToReview(review);
  },

  async getOrderReviewEligibility(orderNumber: string, contact: string, productId?: string): Promise<OrderReviewEligibility> {
    return postJson<OrderReviewEligibility>('/api/reviews/eligibility', { orderNumber, contact, productId });
  },

  async markHelpful(id: string): Promise<number> {
    const { data, error } = await supabase.rpc('mark_review_helpful', { p_review_id: id });
    if (error) throw error;

    try {
      const voted = JSON.parse(localStorage.getItem(HELPFUL_VOTES_KEY) ?? '[]') as string[];
      if (!voted.includes(id)) localStorage.setItem(HELPFUL_VOTES_KEY, JSON.stringify([...voted, id]));
    } catch {
      // localStorage unavailable — the vote itself still succeeded server-side.
    }

    return data as number;
  },

  hasVotedHelpful(id: string): boolean {
    try {
      const voted = JSON.parse(localStorage.getItem(HELPFUL_VOTES_KEY) ?? '[]') as string[];
      return voted.includes(id);
    } catch {
      return false;
    }
  },

  /** Free-text testimonial submission (the standalone /reviews page) — unrelated to the verified-purchase flow above. */
  async createReview(
    data: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'isFeatured' | 'isPinned' | 'adminReply' | 'adminNotes' | 'images' | 'hasImages' | 'helpfulCount'>
  ): Promise<Review> {
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
    const patch: Partial<TablesUpdate<'reviews'>> = { status };
    if (status === 'approved') {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      patch.approved_at = new Date().toISOString();
      patch.approved_by = user?.id ?? null;
    } else {
      patch.approved_at = null;
      patch.approved_by = null;
    }

    const { data, error } = await supabase.from('reviews').update(patch).eq('id', id).select('*').single();
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

  async updateAdminNotes(id: string, notes: string | null): Promise<Review> {
    const { data, error } = await supabase.from('reviews').update({ admin_notes: notes }).eq('id', id).select('*').single();
    if (error) throw error;

    const review = rowToReview(data);
    eventBus.emit('reviews.changed');
    return review;
  },

  /** Removes one image from a review's gallery without deleting the review itself. Admin-only (RLS: reviews_update_admin). */
  async removeReviewImage(id: string, imageUrl: string): Promise<Review> {
    const current = await this.getReview(id);
    if (!current) throw new Error('Review not found');

    const nextImages = current.images.filter((url) => url !== imageUrl);
    const { data, error } = await supabase.from('reviews').update({ images: nextImages }).eq('id', id).select('*').single();
    if (error) throw error;

    // Best-effort: the object is only removed from the row above; also drop it from
    // Storage so it doesn't linger as an orphaned file. Non-fatal if this fails.
    try {
      const marker = '/object/public/reviews/';
      const idx = imageUrl.indexOf(marker);
      if (idx !== -1) await supabase.storage.from('reviews').remove([imageUrl.slice(idx + marker.length)]);
    } catch {
      // orphaned storage object — acceptable, doesn't affect correctness
    }

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
