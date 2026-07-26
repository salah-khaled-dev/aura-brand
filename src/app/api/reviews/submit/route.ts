import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOrderOwnership } from '@/lib/server/guest-order-auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { uploadReviewImages, deleteReviewImagesByUrl } from '@/lib/server/review-images';

const VALID_SIZE_FIT = ['runs_small', 'true_to_size', 'runs_large'];

export async function POST(request: Request) {
  if (!checkRateLimit(`reviews:submit:${getClientIp(request)}`)) {
    return NextResponse.json({ error: 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً' }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const orderNumber = String(formData.get('orderNumber') ?? '').trim();
  const contact = String(formData.get('contact') ?? '').trim();
  const orderItemId = String(formData.get('orderItemId') ?? '').trim();
  const rating = Number(formData.get('rating'));
  const sizeFit = String(formData.get('sizeFit') ?? '');
  const recommended = String(formData.get('recommended') ?? '') === 'true';
  const title = String(formData.get('title') ?? '').trim().slice(0, 120);
  const comment = String(formData.get('comment') ?? '').trim();
  const images = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);

  if (!orderNumber || !contact || !orderItemId) {
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
  if (order.status !== 'delivered') {
    return NextResponse.json({ error: 'يمكن تقييم المنتجات بعد تسليم الطلب فقط' }, { status: 403 });
  }

  const item = order.order_items.find((i) => i.id === orderItemId);
  if (!item || !item.product_id) {
    return NextResponse.json({ error: 'المنتج غير موجود ضمن هذا الطلب' }, { status: 404 });
  }

  const { data: existing } = await admin.from('reviews').select('id').eq('order_item_id', orderItemId).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'لقد قمتِ بتقييم هذا المنتج مسبقاً' }, { status: 409 });
  }

  let imageUrls: string[] = [];
  try {
    imageUrls = await uploadReviewImages(admin, images, `${order.id}/${orderItemId}`);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'فشل رفع الصور' }, { status: 400 });
  }

  const { data: created, error } = await admin
    .from('reviews')
    .insert({
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.image_url,
      product_color: item.color_name,
      product_size: item.size,
      customer_id: order.customer_ref_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.phone,
      order_id: order.id,
      order_item_id: orderItemId,
      order_number: order.order_number,
      rating,
      title,
      content: comment,
      size_fit: sizeFit,
      recommended,
      images: imageUrls,
      status: 'pending',
      verified_purchase: true,
    })
    .select('*')
    .single();

  if (error) {
    await deleteReviewImagesByUrl(admin, imageUrls);
    // One review per order_item is enforced by a DB unique index — surface a
    // friendly message on that specific race instead of a raw constraint error.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'لقد قمتِ بتقييم هذا المنتج مسبقاً' }, { status: 409 });
    }
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ التقييم' }, { status: 500 });
  }

  return NextResponse.json({ review: created });
}
