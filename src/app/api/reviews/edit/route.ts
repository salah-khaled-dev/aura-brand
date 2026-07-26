import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOrderOwnership } from '@/lib/server/guest-order-auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { uploadReviewImages, deleteReviewImagesByUrl, MAX_REVIEW_IMAGES } from '@/lib/server/review-images';

const VALID_SIZE_FIT = ['runs_small', 'true_to_size', 'runs_large'];
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Lets a customer edit their own review within 24h of submission. Editing
 * always resets the review to `pending` — edited content hasn't been
 * moderated yet, so it can't stay published/approved as-is.
 */
export async function POST(request: Request) {
  if (!checkRateLimit(`reviews:edit:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً' }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const reviewId = String(formData.get('reviewId') ?? '').trim();
  const orderNumber = String(formData.get('orderNumber') ?? '').trim();
  const contact = String(formData.get('contact') ?? '').trim();
  const rating = Number(formData.get('rating'));
  const sizeFit = String(formData.get('sizeFit') ?? '');
  const recommended = String(formData.get('recommended') ?? '') === 'true';
  const title = String(formData.get('title') ?? '').trim().slice(0, 120);
  const comment = String(formData.get('comment') ?? '').trim();
  const keepImageUrls = formData.getAll('keepImageUrls').map(String);
  const newImages = formData.getAll('newImages').filter((f): f is File => f instanceof File && f.size > 0);

  if (!reviewId || !orderNumber || !contact) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 });
  }
  if (!VALID_SIZE_FIT.includes(sizeFit)) {
    return NextResponse.json({ error: 'يرجى تحديد ملاءمة المقاس' }, { status: 400 });
  }
  if (!comment) {
    return NextResponse.json({ error: 'نص التقييم مطلوب' }, { status: 400 });
  }
  if (keepImageUrls.length + newImages.length > MAX_REVIEW_IMAGES) {
    return NextResponse.json({ error: `يمكن رفع ${MAX_REVIEW_IMAGES} صور كحد أقصى` }, { status: 400 });
  }

  const admin = createAdminClient();

  let order;
  try {
    order = await verifyOrderOwnership(admin, orderNumber, contact);
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء التحقق من الطلب' }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: 'لم يتم العثور على طلب مطابق لهذه البيانات' }, { status: 404 });
  }

  const { data: review, error: fetchError } = await admin
    .from('reviews')
    .select('id, order_id, order_item_id, images, created_at')
    .eq('id', reviewId)
    .maybeSingle();
  if (fetchError || !review || review.order_id !== order.id) {
    return NextResponse.json({ error: 'التقييم غير موجود' }, { status: 404 });
  }

  if (Date.now() - new Date(review.created_at).getTime() > EDIT_WINDOW_MS) {
    return NextResponse.json({ error: 'انتهت مهلة تعديل هذا التقييم (24 ساعة)' }, { status: 403 });
  }

  // Only URLs that were actually on this review can be "kept" — prevents a
  // caller from splicing in arbitrary image URLs via the keepImageUrls field.
  const existingImages: string[] = review.images ?? [];
  const keptImages = existingImages.filter((url) => keepImageUrls.includes(url));
  const droppedImages = existingImages.filter((url) => !keptImages.includes(url));

  let newUrls: string[] = [];
  try {
    newUrls = await uploadReviewImages(admin, newImages, `${order.id}/${review.order_item_id}`);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'فشل رفع الصور' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('reviews')
    .update({
      rating,
      title,
      content: comment,
      size_fit: sizeFit,
      recommended,
      images: [...keptImages, ...newUrls],
      status: 'pending',
      approved_at: null,
      approved_by: null,
    })
    .eq('id', reviewId)
    .select('*')
    .single();

  if (error) {
    await deleteReviewImagesByUrl(admin, newUrls);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ التعديلات' }, { status: 500 });
  }

  if (droppedImages.length) await deleteReviewImagesByUrl(admin, droppedImages);

  return NextResponse.json({ review: updated });
}
