"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RatingStars, ReviewCard } from "@/components/ui/PageComponents";
import { WriteReviewModal } from "@/components/product/WriteReviewModal";
import { ReviewService, Review, ProductReviewStats } from "@/lib/services/review.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { scrollFadeUp, scrollViewport } from "@/lib/animations";

const PAGE_SIZE = 6;
const STAR_OPTIONS = [5, 4, 3, 2, 1];
type SortOrder = "newest" | "highest" | "lowest" | "photos_first";
const SORTS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "highest", label: "الأعلى تقييماً" },
  { value: "lowest", label: "الأقل تقييماً" },
  { value: "photos_first", label: "مع صور أولاً" },
];

const ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const toArabicDigits = (n: number) => n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
const formatArabicDate = (iso: string) => {
  const d = new Date(iso);
  return `${ARABIC_MONTHS[d.getMonth()]} ${toArabicDigits(d.getFullYear())}`;
};
const initialsFromName = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(".") + ".";

function StatBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3 text-xs font-sans text-text-secondary">
      <span className="w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-left text-text-secondary/60">{pct}%</span>
    </div>
  );
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const [stats, setStats] = useState<ProductReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await ReviewService.getProductStats(productId));
    } catch {
      // keep previous stats on transient failure
    }
  }, [productId]);

  const loadReviews = useCallback(
    async (page: number) => {
      const data = await ReviewService.getReviews({
        status: "approved",
        productId,
        rating: starFilter ?? undefined,
        sortOrder,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setHasMore(data.length === PAGE_SIZE);
      return data;
    },
    [productId, starFilter, sortOrder]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setLoading(true);
    loadReviews(0)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [loadReviews]);

  useEventSubscribeMany(["reviews.changed", "review.approved"], () => {
    loadStats();
    loadReviews(0).then(setReviews);
  });

  const loadMore = async () => {
    const next = await loadReviews(Math.floor(reviews.length / PAGE_SIZE));
    setReviews((prev) => [...prev, ...next]);
  };

  const hasReviews = (stats?.reviewCount ?? 0) > 0;

  return (
    <section className="w-full max-w-[1280px] mx-auto px-6 md:px-12 py-14 md:py-20" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-accent font-bold">آراء العميلات</span>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-text-primary mt-2">تقييمات هذا المنتج</h2>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-11 px-8 bg-text-primary text-background-secondary font-sans text-xs font-semibold hover:bg-accent transition-colors duration-500 self-start"
        >
          اكتبي تقييمك
        </button>
      </div>

      {hasReviews ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-20 items-center mb-10">
            <motion.div
              variants={scrollFadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={scrollViewport}
              className="flex flex-col items-center md:items-start gap-2 text-center md:text-right"
            >
              <span className="font-serif text-6xl font-light text-text-primary leading-none">{stats?.averageRating ?? "—"}</span>
              <RatingStars rating={Math.round(stats?.averageRating ?? 0)} />
              <p className="font-sans text-xs text-text-secondary">بناءً على {stats?.reviewCount ?? 0} تقييم</p>
            </motion.div>

            <div className="flex flex-col gap-3 max-w-md w-full">
              {stats?.pctTrueToSize !== null && (
                <>
                  <StatBar label="المقاس مطابق" pct={stats?.pctTrueToSize ?? 0} />
                  <StatBar label="أصغر من المقاس" pct={stats?.pctRunsSmall ?? 0} />
                  <StatBar label="أكبر من المقاس" pct={stats?.pctRunsLarge ?? 0} />
                </>
              )}
              {stats?.pctRecommended !== null && (
                <p className="font-sans text-xs text-text-secondary mt-2">
                  <span className="text-accent font-bold">{stats?.pctRecommended}%</span> من العميلات يوصين بهذا المنتج
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-t border-brand-border pt-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStarFilter(null)}
                className={`h-8 px-3 text-xs font-sans border transition-colors ${starFilter === null ? "border-accent text-accent" : "border-brand-border text-text-secondary"}`}
              >
                الكل
              </button>
              {STAR_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStarFilter(s)}
                  className={`h-8 px-3 text-xs font-sans border transition-colors ${starFilter === s ? "border-accent text-accent" : "border-brand-border text-text-secondary"}`}
                >
                  {s}★
                </button>
              ))}
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="h-8 px-3 text-xs font-sans border border-brand-border bg-background-primary text-text-secondary outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-center text-xs text-text-secondary py-12">جاري التحميل...</p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-xs text-text-secondary py-12">لا توجد تقييمات مطابقة لهذا التصفية.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {reviews.map((r, i) => (
                  <ReviewCard
                    key={r.id}
                    id={r.id}
                    index={i}
                    name={r.customerName}
                    initials={initialsFromName(r.customerName)}
                    rating={r.rating}
                    text={r.content}
                    date={formatArabicDate(r.createdAt)}
                    adminReply={r.adminReply ?? undefined}
                    verifiedPurchase={r.verifiedPurchase}
                    images={r.images}
                    recommended={r.recommended}
                    helpfulCount={r.helpfulCount}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button onClick={loadMore} className="h-11 px-8 border border-brand-border text-xs font-sans text-text-primary hover:border-accent transition-colors">
                    عرض المزيد
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p className="text-center text-sm font-light text-text-secondary py-16">
          لا توجد تقييمات بعد لهذا المنتج. كوني أول من تشارك تجربتها!
        </p>
      )}

      <WriteReviewModal
        productId={productId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onReviewChanged={() => {
          loadStats();
          loadReviews(0).then(setReviews);
        }}
      />
    </section>
  );
}
