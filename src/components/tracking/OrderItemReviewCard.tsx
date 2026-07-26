"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { IconCheck, IconClock } from "@tabler/icons-react";
import { ReviewSubmissionForm, ReviewFormValues } from "@/components/reviews/ReviewSubmissionForm";
import { RatingStars } from "@/components/ui/PageComponents";
import { ReviewService, OrderReviewEligibilityItem } from "@/lib/services/review.service";

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "تم النشر",
  rejected: "لم يتم قبول التقييم",
  hidden: "مخفي",
};

function buildFormData(fields: Record<string, string>, files: { key: string; files: File[] }[]): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  files.forEach(({ key, files: fileList }) => fileList.forEach((f) => fd.append(key, f)));
  return fd;
}

interface OrderItemReviewCardProps {
  item: OrderReviewEligibilityItem;
  orderNumber: string;
  contact: string;
  onChanged: () => void;
}

export function OrderItemReviewCard({ item, orderNumber, contact, onChanged }: OrderItemReviewCardProps) {
  const [editing, setEditing] = useState(false);

  if (!item.eligible) return null;

  const isEditable = item.review?.editableUntil ? new Date(item.review.editableUntil).getTime() > Date.now() : false;

  const handleSubmit = async (values: ReviewFormValues) => {
    try {
      const fd = buildFormData(
        {
          orderNumber,
          contact,
          orderItemId: item.orderItemId,
          rating: String(values.rating),
          sizeFit: values.sizeFit,
          recommended: String(values.recommended),
          title: values.title,
          comment: values.comment,
        },
        [{ key: "images", files: values.newImageFiles }]
      );
      await ReviewService.submitOrderReview(fd);
      toast.success("شكراً لكِ! تقييمكِ قيد المراجعة الآن.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال التقييم");
    }
  };

  const handleEdit = async (values: ReviewFormValues) => {
    if (!item.review) return;
    try {
      const fd = buildFormData(
        {
          reviewId: item.review.id,
          orderNumber,
          contact,
          rating: String(values.rating),
          sizeFit: values.sizeFit,
          recommended: String(values.recommended),
          title: values.title,
          comment: values.comment,
        },
        [
          { key: "keepImageUrls", files: [] },
          { key: "newImages", files: values.newImageFiles },
        ]
      );
      values.keepImageUrls.forEach((url) => fd.append("keepImageUrls", url));
      await ReviewService.editOrderReview(fd);
      toast.success("تم حفظ تعديلاتكِ، وسيُعاد نشر التقييم بعد المراجعة.");
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التعديلات");
    }
  };

  return (
    <div className="bg-background-secondary border border-brand-border p-5 md:p-6 flex flex-col gap-4" dir="rtl">
      <div className="flex items-center gap-3">
        {item.productImage && (
          <div className="relative w-12 h-16 shrink-0 overflow-hidden border border-brand-border bg-background-primary">
            <Image src={item.productImage} alt={item.productName} fill sizes="48px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-sans text-xs font-bold text-text-primary truncate">{item.productName}</p>
          {(item.size || item.color) && (
            <p className="font-sans text-[10px] text-text-secondary">
              {item.color ? `اللون: ${item.color}` : ""}{item.size && item.color ? " | " : ""}{item.size ? `المقاس: ${item.size}` : ""}
            </p>
          )}
        </div>
      </div>

      {!item.reviewed ? (
        <>
          <div>
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-accent font-bold">✨ شاركينا تجربتكِ</span>
            <p className="font-sans text-xs text-text-secondary mt-1">كيف كانت تجربتكِ مع هذه القطعة؟</p>
          </div>
          <ReviewSubmissionForm onSubmit={handleSubmit} />
        </>
      ) : isEditable && editing ? (
        <ReviewSubmissionForm
          submitLabel="حفظ التعديلات"
          editNotice="يمكنكِ تعديل تقييمكِ خلال 24 ساعة من إرساله. سيُعاد التقييم لحالة المراجعة بعد الحفظ."
          initial={{
            rating: item.review!.rating,
            title: item.review!.title,
            comment: item.review!.content,
            sizeFit: item.review!.sizeFit as ReviewFormValues["sizeFit"],
            recommended: item.review!.recommended,
            existingImages: item.review!.images,
          }}
          onSubmit={handleEdit}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-sans font-semibold text-accent bg-accent/5 border border-accent/20 px-2.5 py-1">
              <IconCheck size={13} /> شكراً لتقييمكِ — {STATUS_LABEL[item.review!.status] ?? item.review!.status}
            </span>
            {isEditable && (
              <button type="button" onClick={() => setEditing(true)} className="text-[11px] font-sans text-accent underline underline-offset-4">
                تعديل التقييم
              </button>
            )}
          </div>
          <RatingStars rating={item.review!.rating} size="sm" />
          {item.review!.title && <p className="font-sans text-xs font-bold text-text-primary">{item.review!.title}</p>}
          <p className="font-sans text-xs text-text-secondary leading-relaxed">{item.review!.content}</p>
          {!isEditable && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary/60">
              <IconClock size={11} /> انتهت مهلة التعديل (24 ساعة)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
