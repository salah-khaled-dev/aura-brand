import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOrderOwnership } from '@/lib/server/guest-order-auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Given an order number + the contact (email/phone) used at checkout, reports
 * which order lines can be reviewed right now — used by both the tracking
 * page (all items in the order) and the product page's "Write a Review"
 * modal (filtered to one product). Never exposes anything beyond what the
 * order's own guest is entitled to see.
 */
export async function POST(request: Request) {
  if (!checkRateLimit(`reviews:eligibility:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const orderNumber = body?.orderNumber?.trim();
  const contact = body?.contact?.trim();
  const productId = body?.productId?.trim() || null;

  if (!orderNumber || !contact) {
    return NextResponse.json({ error: 'رقم الطلب وبيانات التواصل مطلوبة' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    let order;
    try {
      order = await verifyOrderOwnership(admin, orderNumber, contact);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'حدث خطأ أثناء التحقق من الطلب' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: 'لم يتم العثور على طلب مطابق لهذه البيانات' }, { status: 404 });
    }

    const items = order.status === 'delivered' ? order.order_items : [];
    const itemIds = items.map((i) => i.id);

    const { data: existingReviews, error } = itemIds.length
      ? await admin
          .from('reviews')
          .select('id, order_item_id, rating, title, content, size_fit, recommended, images, status, created_at')
          .in('order_item_id', itemIds)
      : { data: [], error: null };
    if (error) {
      return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تحميل بيانات التقييم' }, { status: 500 });
    }

    const reviewByItemId = new Map((existingReviews ?? []).map((r) => [r.order_item_id as string, r]));

    const result = (order.status === 'delivered' ? order.order_items : [])
      .filter((item) => !productId || item.product_id === productId)
      .map((item) => {
        const review = reviewByItemId.get(item.id);
        const createdAtMs = review ? new Date(review.created_at).getTime() : NaN;
        const editableUntil = review && !Number.isNaN(createdAtMs) ? new Date(createdAtMs + EDIT_WINDOW_MS).toISOString() : null;
        return {
          orderItemId: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.image_url,
          size: item.size,
          color: item.color_name,
          eligible: item.product_id !== null,
          reviewed: !!review,
          review: review
            ? {
                id: review.id,
                rating: review.rating,
                title: review.title,
                content: review.content,
                sizeFit: review.size_fit,
                recommended: review.recommended,
                images: review.images,
                status: review.status,
                createdAt: review.created_at,
                editableUntil,
              }
            : null,
        };
      });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: order.status,
      items: result,
    });
  } catch (err) {
    console.error('[reviews/eligibility] unhandled exception', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
