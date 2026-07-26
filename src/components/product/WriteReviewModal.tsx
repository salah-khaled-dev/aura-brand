"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { LuxuryInput } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { OrderItemReviewCard } from "@/components/tracking/OrderItemReviewCard";
import { ReviewService, OrderReviewEligibility } from "@/lib/services/review.service";

interface WriteReviewModalProps {
  productId: string;
  open: boolean;
  onClose: () => void;
  onReviewChanged?: () => void;
}

export function WriteReviewModal({ productId, open, onClose, onReviewChanged }: WriteReviewModalProps) {
  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderReviewEligibility | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setOrderNumber("");
    setContact("");
    setResult(null);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !contact.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await ReviewService.getOrderReviewEligibility(orderNumber, contact, productId);
      const eligibleItems = res.items.filter((i) => i.eligible);
      if (eligibleItems.length === 0) {
        setError(
          res.orderStatus !== "delivered"
            ? "لم يتم تسليم هذا الطلب بعد — يمكنكِ تقييم المنتج بعد استلامه."
            : "لم يتم العثور على هذا المنتج ضمن هذا الطلب."
        );
        setResult(null);
      } else {
        setResult({ ...res, items: eligibleItems });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "لم يتم العثور على طلب مطابق لهذه البيانات");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-background-secondary border border-brand-border w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 md:p-8" dir="rtl">
        <button type="button" onClick={handleClose} className="absolute top-4 left-4 text-text-secondary hover:text-accent transition-colors">
          <IconX size={20} />
        </button>

        <h3 className="font-serif text-xl font-light text-text-primary mb-1">كتابة تقييم</h3>
        <p className="font-sans text-xs text-text-secondary leading-relaxed mb-6">
          أدخلي رقم طلبكِ وبيانات التواصل المستخدمة عند الشراء للتحقق من عملية الشراء — التقييمات متاحة فقط للمنتجات المُسلَّمة.
        </p>

        {!result ? (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <LuxuryInput
              label="رقم الطلب *"
              placeholder="مثال: AURA-10025"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
            <LuxuryInput
              label="البريد الإلكتروني أو رقم الهاتف *"
              placeholder="المستخدم عند الطلب"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            {error && <p className="text-[11px] text-red-500">{error}</p>}
            <Button type="submit" variant="primary" className="w-full h-11" disabled={loading}>
              {loading ? "جاري التحقق..." : "التحقق من الطلب"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            {result.items.map((item) => (
              <OrderItemReviewCard
                key={item.orderItemId}
                item={item}
                orderNumber={result.orderNumber}
                contact={contact}
                onChanged={() => onReviewChanged?.()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
