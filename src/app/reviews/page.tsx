"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { RatingStars, ReviewCard, fadeUp } from "@/components/ui/PageComponents";
import { AnimatedStars } from "@/components/ui/AnimatedIcon";
import { useNotification } from "@/context/NotificationContext";
import { scrollFadeUp, scrollFadeIn, scrollScaleIn, revealTransition, scrollViewport } from "@/lib/animations";
import { ReviewService } from "@/lib/services/review.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { ContentService } from "@/lib/services/storefront/content.service";

const DEFAULT_HERO = {
  reviews_hero_label:    'صوت عميلاتنا',
  reviews_hero_title:    'آراء عملائنا',
  reviews_hero_subtitle: 'تجارب حقيقية من عميلات دار أورا — كلمات صادقة تعكس شغفنا بالحرفية والتميز.',
};

const ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const toArabicDigits = (n: number) => n.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
const formatArabicDate = (date: Date) => `${ARABIC_MONTHS[date.getMonth()]} ${toArabicDigits(date.getFullYear())}`;
const initialsFromName = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(".") + ".";

/* ── Rating bar ── */
function RatingBar({ star, pct, count }: { star: number; pct: number; count: number }) {
  return (
    <div className="flex items-center gap-3 text-xs font-sans text-text-secondary">
      <span className="w-3 text-right">{star}</span>
      <span className="text-accent">★</span>
      <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={revealTransition(0.2)}
          className="h-full bg-accent rounded-full"
        />
      </div>
      <span className="w-4 text-right text-text-secondary/60">{count}</span>
    </div>
  );
}

type DisplayReview = {
  id: string;
  name: string;
  initials: string;
  rating: number;
  text: string;
  product?: string;
  date: string;
  adminReply?: string;
  verifiedPurchase?: boolean;
};

export default function ReviewsPage() {
  const { showNotification } = useNotification();
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [reviews, setReviews] = useState<DisplayReview[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadHero = useCallback(async () => {
    try {
      const blocks = await ContentService.getContentByGroup('pages');
      const map: Record<string, string> = {};
      blocks.forEach(b => { map[b.key] = b.value; });
      setHero(prev => ({ ...prev, ...map }));
    } catch {
      // keep defaults
    }
  }, []);

  const loadReviews = async () => {
    try {
      const data = await ReviewService.getReviews({ status: 'approved' });
      const sorted = [...data].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setReviews(sorted.map(r => ({
        id: r.id,
        name: r.customerName,
        initials: initialsFromName(r.customerName),
        rating: r.rating,
        text: r.content,
        product: r.productName || undefined,
        date: formatArabicDate(new Date(r.createdAt)),
        adminReply: r.adminReply ?? undefined,
        verifiedPurchase: r.verifiedPurchase,
      })));
    } catch {
      // silently fail — empty state shown
    }
  };

  useEffect(() => { loadReviews(); loadHero(); }, [loadHero]);
  useEventSubscribeMany(['reviews.changed', 'review.approved'], loadReviews);
  useEventSubscribeMany(['website.changed'], loadHero);

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? +(reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : 5.0;
  const ratingDist = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
        pct: totalReviews > 0 ? Math.round((reviews.filter((r) => r.rating === star).length / totalReviews) * 100) : 0,
      })),
    [reviews, totalReviews]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !review.trim()) return;
    setSubmitting(true);
    try {
      await ReviewService.createReview({
        productId: '',
        productName: productName.trim(),
        productImage: '',
        customerName: name.trim(),
        customerEmail: '',
        rating,
        title: review.trim().slice(0, 80),
        content: review.trim(),
        status: 'pending',
        verifiedPurchase: false,
      });
      showNotification("شكراً لمشاركتكِ! سيظهر تقييمكِ بعد المراجعة.", "success");
      setName(""); setProductName(""); setReview(""); setRating(5);
    } catch {
      showNotification("حدث خطأ. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-background-primary">

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section className="relative w-full border-b border-brand-border bg-background-secondary overflow-hidden">
        <div className="max-w-[900px] mx-auto px-6 md:px-12 py-20 md:py-32 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            className="flex flex-col items-center gap-4"
          >
            <motion.span
              custom={0} variants={fadeUp}
              className="font-sans text-[10px] uppercase tracking-[0.3em] text-accent font-bold"
            >
              {hero.reviews_hero_label}
            </motion.span>
            <motion.h1
              custom={0.1} variants={fadeUp}
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-text-primary leading-[1.15]"
            >
              {hero.reviews_hero_title}
            </motion.h1>
            <motion.p
              custom={0.2} variants={fadeUp}
              className="font-sans text-sm font-light text-text-secondary leading-relaxed max-w-md"
            >
              {hero.reviews_hero_subtitle}
            </motion.p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-px bg-accent" />
      </section>

      {/* ════════════════════════════════
          RATING SUMMARY
      ════════════════════════════════ */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-20 items-center">

          {/* Big number */}
          <motion.div
            variants={scrollScaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewport}
            className="flex flex-col items-center md:items-start gap-3 text-center md:text-right"
          >
            <span className="font-serif text-[5rem] md:text-[7rem] font-light text-text-primary leading-none">
              {avgRating}
            </span>
            <RatingStars rating={Math.round(avgRating)} />
            <p className="font-sans text-xs text-text-secondary">
              بناءً على {totalReviews} تقييمات حقيقية
            </p>
          </motion.div>

          {/* Bar chart */}
          <motion.div
            variants={scrollFadeIn}
            custom={0.1}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewport}
            className="flex flex-col gap-3 max-w-md w-full"
          >
            {ratingDist.map((d) => (
              <RatingBar key={d.star} {...d} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Separator */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <div className="h-px bg-brand-border" />
      </div>

      {/* ════════════════════════════════
          REVIEWS GRID
      ════════════════════════════════ */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-14 md:py-20">
        <motion.div
          custom={0} variants={fadeUp} initial="hidden"
          whileInView="visible" viewport={{ once: true }}
          className="mb-10"
        >
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-accent font-bold">
            تجارب حقيقية
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-light text-text-primary mt-2">
            ماذا قالت عملاؤنا
          </h2>
        </motion.div>

        {reviews.length === 0 ? (
          <p className="font-sans text-sm font-light text-text-secondary text-center py-12">لا توجد تقييمات منشورة بعد.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {reviews.map((r, i) => (
              <ReviewCard key={r.id} index={i} {...r} />
            ))}
          </div>
        )}
      </section>

      {/* Separator */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <div className="h-px bg-brand-border" />
      </div>

      {/* ════════════════════════════════
          CTA — SUBMIT A REVIEW
      ════════════════════════════════ */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-12 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-start">

          {/* Text */}
          <motion.div
            variants={scrollFadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewport}
            className="flex flex-col gap-4"
          >
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-accent font-bold">
              شاركينا رأيكِ
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-light text-text-primary leading-snug">
              تجربتكِ تُلهم السيدات الأخريات
            </h2>
            <p className="font-sans text-sm font-light text-text-secondary leading-[1.9]">
              كلماتكِ الصادقة تساعدنا على التطور وتساعد عميلاتنا الجدد في اتخاذ قراراتهن. شاركينا رأيكِ في قطعتكِ من دار أورا.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-12 h-px bg-accent" />
              <Link href="/shop" className="font-sans text-xs text-accent hover:text-text-primary transition-colors underline underline-offset-4">
                تسوقي الآن لتشاركي تجربتكِ
              </Link>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            variants={scrollFadeUp}
            custom={0.15}
            initial="hidden"
            whileInView="visible"
            viewport={scrollViewport}
            className="flex flex-col gap-5 bg-background-secondary border border-brand-border p-7 md:p-8"
          >
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">
                تقييمكِ
              </label>
              <AnimatedStars
                rating={rating}
                interactive
                onChange={setRating}
                size={24}
              />
            </div>

            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">
                اسمكِ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سارة أحمد"
                required
                dir="rtl"
                className="h-11 border border-brand-border bg-background-primary px-4 text-sm font-sans
                           text-text-primary outline-none placeholder:text-text-secondary/40
                           focus:border-accent transition-colors duration-300"
              />
            </div>

            {/* Product name */}
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">
                القطعة التي اشتريتِها (اختياري)
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="مثال: بلوزة حرير كريمي"
                dir="rtl"
                className="h-11 border border-brand-border bg-background-primary px-4 text-sm font-sans
                           text-text-primary outline-none placeholder:text-text-secondary/40
                           focus:border-accent transition-colors duration-300"
              />
            </div>

            {/* Review text */}
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-bold">
                تجربتكِ
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="شاركينا رأيكِ في الجودة والتصميم والخدمة..."
                required
                rows={4}
                dir="rtl"
                className="border border-brand-border bg-background-primary px-4 py-3 text-sm font-sans
                           text-text-primary outline-none placeholder:text-text-secondary/40
                           focus:border-accent transition-colors duration-300 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="h-12 bg-text-primary text-background-secondary font-sans text-xs font-semibold
                         hover:bg-accent transition-colors duration-500 w-full mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
            <p className="font-sans text-[10px] text-text-secondary/60 text-center">
              سيظهر تقييمكِ بعد مراجعة فريق دار أورا.
            </p>
          </motion.form>
        </div>
      </section>

    </div>
  );
}
