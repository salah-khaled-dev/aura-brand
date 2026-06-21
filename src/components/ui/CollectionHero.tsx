"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface CollectionHeroProps {
  title: string;
  description: string;
  imageSrc: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export default function CollectionHero({
  title,
  description,
  imageSrc,
  ctaText = "تسوقي الآن",
  onCtaClick,
}: CollectionHeroProps) {
  return (
    <section className="relative w-full h-[60vh] md:h-[80vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageSrc}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1000px] w-full px-6 md:px-12 text-center text-white flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-sans text-xs font-bold uppercase tracking-[0.25em] mb-4 md:mb-6 text-[#EAE3D9]"
        >
          مجموعة حصرية
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-serif text-4xl md:text-6xl lg:text-7xl font-light leading-tight mb-6"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-sans text-sm md:text-base font-light leading-relaxed max-w-2xl text-[#FAF8F5]/90 mb-10"
        >
          {description}
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={() => {
            if (onCtaClick) {
              onCtaClick();
            } else {
              window.scrollTo({
                top: window.innerHeight * 0.8,
                behavior: "smooth",
              });
            }
          }}
          className="px-8 py-3.5 bg-background-primary text-text-primary font-sans text-xs uppercase tracking-wider font-semibold hover:bg-accent hover:text-white transition-all duration-500 min-w-[200px]"
        >
          {ctaText}
        </motion.button>
      </div>
    </section>
  );
}
