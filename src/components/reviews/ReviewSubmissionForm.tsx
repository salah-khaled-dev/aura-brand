"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { IconX, IconCamera } from "@tabler/icons-react";
import { AnimatedStars } from "@/components/ui/AnimatedIcon";
import { validateImageFile, compressImageForUpload } from "@/lib/utils/image-file";

const MAX_REVIEW_IMAGES = 5;
const inputClass =
  "border border-brand-border bg-background-primary px-4 text-sm font-sans text-text-primary outline-none placeholder:text-text-secondary/40 focus:border-accent transition-colors duration-300";

export type SizeFit = "runs_small" | "true_to_size" | "runs_large";

const SIZE_FIT_OPTIONS: { value: SizeFit; label: string }[] = [
  { value: "runs_small", label: "أصغر من المقاس" },
  { value: "true_to_size", label: "المقاس مطابق" },
  { value: "runs_large", label: "أكبر من المقاس" },
];

export interface ReviewFormValues {
  rating: number;
  title: string;
  comment: string;
  sizeFit: SizeFit;
  recommended: boolean;
  keepImageUrls: string[];
  newImageFiles: File[];
}

interface NewImage {
  file: File;
  previewUrl: string;
}

interface ReviewSubmissionFormProps {
  initial?: {
    rating?: number;
    title?: string;
    comment?: string;
    sizeFit?: SizeFit | null;
    recommended?: boolean | null;
    existingImages?: string[];
  };
  onSubmit: (values: ReviewFormValues) => Promise<void>;
  submitLabel?: string;
  editNotice?: string;
}

export function ReviewSubmissionForm({ initial, onSubmit, submitLabel = "إرسال التقييم", editNotice }: ReviewSubmissionFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [sizeFit, setSizeFit] = useState<SizeFit | "">(initial?.sizeFit ?? "");
  const [recommended, setRecommended] = useState<boolean | null>(initial?.recommended ?? null);
  const [keptImages, setKeptImages] = useState<string[]>(initial?.existingImages ?? []);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalImages = keptImages.length + newImages.length;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // snapshot into an array before this clears the FileList
    if (!files.length) return;

    const room = MAX_REVIEW_IMAGES - totalImages;
    if (room <= 0) {
      toast.error(`يمكن إضافة ${MAX_REVIEW_IMAGES} صور كحد أقصى`);
      return;
    }

    setCompressing(true);
    try {
      const accepted: NewImage[] = [];
      for (const file of files.slice(0, room)) {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }
        const converted = await compressImageForUpload(file);
        const compressedFile = new File([converted.blob], converted.fileName, { type: converted.mimeType });
        accepted.push({ file: compressedFile, previewUrl: URL.createObjectURL(converted.blob) });
      }
      if (accepted.length) setNewImages((prev) => [...prev, ...accepted]);
    } finally {
      setCompressing(false);
    }
  };

  const removeKeptImage = (url: string) => setKeptImages((prev) => prev.filter((u) => u !== url));
  const removeNewImage = (idx: number) =>
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sizeFit) return toast.error("يرجى تحديد ملاءمة المقاس");
    if (recommended === null) return toast.error("يرجى تحديد هل توصين بهذا المنتج");
    if (!comment.trim()) return toast.error("يرجى كتابة نص التقييم");

    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        title: title.trim(),
        comment: comment.trim(),
        sizeFit,
        recommended,
        keepImageUrls: keptImages,
        newImageFiles: newImages.map((n) => n.file),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" dir="rtl">
      {editNotice && (
        <p className="font-sans text-[11px] text-accent bg-accent/5 border border-accent/20 px-3 py-2">{editNotice}</p>
      )}

      <div className="flex flex-col gap-2">
        <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">التقييم العام</label>
        <AnimatedStars rating={rating} interactive onChange={setRating} size={26} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">عنوان التقييم (اختياري)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: جودة ممتازة وقصة أنيقة"
          maxLength={120}
          className={`h-11 ${inputClass}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">تجربتكِ مع المنتج</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="شاركينا رأيكِ في الجودة والتصميم والمقاس..."
          rows={4}
          className={`${inputClass} py-3 resize-none`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">كيف كان المقاس؟</label>
        <div className="flex flex-wrap gap-3">
          {SIZE_FIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSizeFit(opt.value)}
              className={`h-10 px-4 border text-xs font-sans transition-colors ${
                sizeFit === opt.value
                  ? "border-accent bg-accent text-background-secondary"
                  : "border-brand-border text-text-secondary hover:border-accent/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">هل توصين بهذا المنتج؟</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRecommended(true)}
            className={`h-10 px-6 border text-xs font-sans transition-colors ${
              recommended === true ? "border-accent bg-accent text-background-secondary" : "border-brand-border text-text-secondary hover:border-accent/50"
            }`}
          >
            نعم
          </button>
          <button
            type="button"
            onClick={() => setRecommended(false)}
            className={`h-10 px-6 border text-xs font-sans transition-colors ${
              recommended === false ? "border-accent bg-accent text-background-secondary" : "border-brand-border text-text-secondary hover:border-accent/50"
            }`}
          >
            لا
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">
          إضافة صور (اختياري، حتى {MAX_REVIEW_IMAGES})
        </label>
        <div className="flex flex-wrap gap-3">
          {keptImages.map((url) => (
            <div key={url} className="relative w-16 h-16 border border-brand-border overflow-hidden shrink-0">
              <Image src={url} alt="صورة التقييم" fill sizes="64px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeKeptImage(url)}
                className="absolute top-0.5 right-0.5 bg-background-secondary/90 rounded-full p-0.5"
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
          {newImages.map((img, idx) => (
            <div key={img.previewUrl} className="relative w-16 h-16 border border-brand-border overflow-hidden shrink-0">
              <Image src={img.previewUrl} alt="صورة جديدة" fill sizes="64px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeNewImage(idx)}
                className="absolute top-0.5 right-0.5 bg-background-secondary/90 rounded-full p-0.5"
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
          {totalImages < MAX_REVIEW_IMAGES && (
            <label className="w-16 h-16 border border-dashed border-brand-border flex items-center justify-center shrink-0 cursor-pointer hover:border-accent/50 transition-colors">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleFilesSelected} disabled={compressing} />
              <IconCamera size={20} className="text-text-secondary" />
            </label>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || compressing}
        className="h-12 bg-text-primary text-background-secondary font-sans text-xs font-semibold hover:bg-accent transition-colors duration-500 w-full mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "جاري الإرسال..." : submitLabel}
      </button>
    </form>
  );
}
