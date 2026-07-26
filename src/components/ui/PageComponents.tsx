"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { IconThumbUp } from "@tabler/icons-react";
import { scrollFadeUp as fadeUp } from "@/lib/animations";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { ReviewService } from "@/lib/services/review.service";

export { fadeUp };

/* ─────────────────────────────────────────
   LEGAL PAGE LAYOUT
   Shared wrapper for Privacy + Terms pages
───────────────────────────────────────── */
interface LegalPageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  lastUpdated?: string;
}

export function LegalPageLayout({ title, subtitle, children, lastUpdated }: LegalPageLayoutProps) {
  return (
    <div className="w-full bg-background-primary">
      {/* Hero */}
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
              دار أورا — وثائق رسمية
            </motion.span>
            <motion.h1
              custom={0.1} variants={fadeUp}
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-light text-text-primary leading-[1.15]"
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                custom={0.2} variants={fadeUp}
                className="font-sans text-sm font-light text-text-secondary leading-relaxed max-w-md"
              >
                {subtitle}
              </motion.p>
            )}
            {lastUpdated && (
              <motion.span
                custom={0.3} variants={fadeUp}
                className="font-sans text-[10px] text-text-secondary/60 mt-2"
              >
                آخر تحديث: {lastUpdated}
              </motion.span>
            )}
          </motion.div>
        </div>
        {/* Decorative line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-px bg-accent" />
      </section>

      {/* Content */}
      <section className="max-w-[780px] mx-auto px-6 md:px-0 py-16 md:py-24">
        {children}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────
   SECTION TITLE
   Used in both legal pages
───────────────────────────────────────── */
interface SectionTitleProps {
  number?: string;
  title: string;
  className?: string;
}

export function SectionTitle({ number, title, className = "" }: SectionTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "40px" }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as const }}
      className={`flex items-start gap-4 mb-5 mt-12 first:mt-0 ${className}`}
    >
      {number && (
        <span className="font-sans text-[10px] font-bold text-accent/60 mt-1.5 shrink-0">
          {number}
        </span>
      )}
      <h2 className="font-serif text-xl md:text-2xl font-light text-text-primary leading-snug border-b border-brand-border pb-3 w-full">
        {title}
      </h2>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   LEGAL PARAGRAPH
───────────────────────────────────────── */
export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "20px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="font-sans text-sm font-light text-text-secondary leading-[2] mb-4"
    >
      {children}
    </motion.p>
  );
}

/* ─────────────────────────────────────────
   LEGAL LIST
───────────────────────────────────────── */
export function LegalList({ items }: { items: string[] }) {
  return (
    <motion.ul
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "20px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col gap-3 mb-6 pr-2"
    >
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 font-sans text-sm font-light text-text-secondary leading-relaxed">
          <span className="mt-2 w-1 h-1 rounded-full bg-accent shrink-0" />
          {item}
        </li>
      ))}
    </motion.ul>
  );
}

/* ─────────────────────────────────────────
   RATING STARS
───────────────────────────────────────── */
interface RatingStarsProps {
  rating: number; // 1–5
  size?: "sm" | "md";
}

export function RatingStars({ rating, size = "md" }: RatingStarsProps) {
  const sz = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5" aria-label={`تقييم ${rating} من 5 نجوم`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          fill={star <= rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          className={`${sz} ${star <= rating ? "text-accent" : "text-brand-border"}`}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   REVIEW CARD
───────────────────────────────────────── */
interface ReviewCardProps {
  id?: string;
  name: string;
  rating: number;
  text: string;
  product?: string;
  date?: string;
  initials: string;
  index?: number;
  adminReply?: string;
  verifiedPurchase?: boolean;
  images?: string[];
  recommended?: boolean;
  helpfulCount?: number;
}

export function ReviewCard({
  id,
  name,
  rating,
  text,
  product,
  date,
  initials,
  index = 0,
  adminReply,
  verifiedPurchase,
  images,
  recommended,
  helpfulCount = 0,
}: ReviewCardProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [votes, setVotes] = useState(helpfulCount);
  const [voted, setVoted] = useState(() => (id ? ReviewService.hasVotedHelpful(id) : false));

  const handleHelpful = async () => {
    if (!id || voted) return;
    setVoted(true);
    setVotes((v) => v + 1);
    try {
      await ReviewService.markHelpful(id);
    } catch {
      setVoted(false);
      setVotes((v) => v - 1);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "80px" }}
      transition={{ duration: 0.8, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] as const }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className="flex flex-col gap-5 p-7 md:p-8 bg-background-secondary border border-brand-border
                 hover:border-accent/30 hover:shadow-[0_8px_40px_rgba(154,115,85,0.08)]
                 transition-all duration-500 cursor-default"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EAE3D9] flex items-center justify-center shrink-0">
            <span className="font-serif text-xs text-accent font-medium">{initials}</span>
          </div>
          <div>
            <p className="font-sans text-sm font-medium text-text-primary">{name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {date && <p className="font-sans text-[10px] text-text-secondary/60">{date}</p>}
              {verifiedPurchase && (
                <span className="font-sans text-[9px] text-[#4A7C59] font-semibold uppercase tracking-wide bg-[#4A7C59]/10 px-1.5 py-0.5 rounded-sm">
                  مشترٍ موثّق
                </span>
              )}
            </div>
          </div>
        </div>
        <RatingStars rating={rating} size="sm" />
      </div>

      {/* Review text */}
      <p className="font-sans text-sm font-light text-text-secondary leading-[1.9] italic">
        &ldquo;{text}&rdquo;
      </p>

      {/* Photos */}
      {images && images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="relative w-14 h-14 border border-brand-border overflow-hidden shrink-0 hover:border-accent/50 transition-colors"
            >
              <Image src={src} alt="" fill sizes="56px" loading="lazy" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Product tag + recommendation */}
      <div className="flex items-center gap-2 flex-wrap">
        {product && (
          <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-accent font-semibold px-3 py-1 border border-accent/30 bg-accent/5">
            {product}
          </span>
        )}
        {recommended !== undefined && (
          <span className={`font-sans text-[10px] font-semibold px-3 py-1 border ${recommended ? "text-[#4A7C59] border-[#4A7C59]/30 bg-[#4A7C59]/5" : "text-text-secondary border-brand-border"}`}>
            {recommended ? "✓ توصي بهذا المنتج" : "لا توصي بهذا المنتج"}
          </span>
        )}
      </div>

      {/* Admin reply */}
      {adminReply && (
        <div className="border-t border-brand-border/60 pt-4 mt-1">
          <p className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.15em] mb-1.5">
            رد دار أورا
          </p>
          <p className="font-sans text-xs font-light text-text-secondary leading-relaxed italic">
            &ldquo;{adminReply}&rdquo;
          </p>
        </div>
      )}

      {/* Helpful */}
      {id && (
        <button
          type="button"
          onClick={handleHelpful}
          disabled={voted}
          className={`self-start flex items-center gap-1.5 text-[11px] font-sans transition-colors ${
            voted ? "text-accent" : "text-text-secondary hover:text-accent"
          } disabled:cursor-default`}
        >
          <IconThumbUp size={14} className={voted ? "fill-accent/20" : ""} />
          مفيد {votes > 0 ? `(${votes})` : ""}
        </button>
      )}

      {lightboxIndex !== null && images && (
        <ImageLightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndexChange={setLightboxIndex} />
      )}
    </motion.article>
  );
}
