"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { IconChevronRight as ChevronRight, IconChevronLeft as ChevronLeft, IconArrowLeft as ArrowLeft } from "@tabler/icons-react";
import { HomepageService, HeroSlide } from "@/lib/services/storefront/homepage.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 1,
    image: "/images/campaign/campaign_4.png",
    label: "AURA HAUTE COUTURE",
    title: "أناقة الأثر والمعنى",
    engTitle: "THE SIGNATURE COUTURE",
    subtitle: "تصاميم كوتور راقية تُصاغ يدوياً للمرأة المعاصرة التي تقدر تميز التفاصيل وعراقة الصنع الفاخر."
  },
  {
    id: 2,
    image: "/images/campaign/campaign_5.png",
    label: "EDITORIAL CAMPAIGN",
    title: "تفاصيل تروي حضوركِ",
    engTitle: "LUNA & SILK ESSENCE",
    subtitle: "أزياء نسائية صممت بهيبة الحضور وقوة الشخصية منسوجة من الكتان الطبيعي البلجيكي والحرير الطبيعي."
  },
  {
    id: 3,
    image: "/images/campaign/campaign_6.png",
    label: "THE EDITORIAL SERIES",
    title: "الفخامة الهادئة والخلود",
    engTitle: "QUIET LUXURY 2026",
    subtitle: "خطوط كلاسيكية مبسطة وخامات كشمير إيطالية تنساب بنعومة بالغة لتتجاوز بريق صيحات الموضة المؤقتة."
  }
];

function readHeroSettings() {
  const heroSection = HomepageService.getSectionsSync().find(s => s.type === 'hero');
  return heroSection?.settings ?? null;
}

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  // Seeded synchronously (settings are already in memory) so the hero never
  // renders defaults and then swaps to CMS content after mount — that swap
  // can reflow the mobile layout, which has no fixed height.
  const initialSettings = readHeroSettings();
  const [slides, setSlides] = useState<HeroSlide[]>(
    Array.isArray(initialSettings?.slides) && initialSettings.slides.length > 0 ? initialSettings.slides : DEFAULT_SLIDES
  );
  const [ctaText, setCtaText] = useState(initialSettings?.ctaText || 'اكتشفي التشكيلة');
  const [ctaLink, setCtaLink] = useState(initialSettings?.ctaLink || '/shop');
  const [secondaryCtaText, setSecondaryCtaText] = useState(initialSettings?.secondaryCtaText || 'قصتنا الفنية');
  const [secondaryCtaLink, setSecondaryCtaLink] = useState(initialSettings?.secondaryCtaLink || '/about');
  // True until the first live fetch resolves; getSectionsSync() has nothing to
  // read before that, so this covers the gap where slides show DEFAULT_SLIDES
  // rather than the real CMS content.
  const [isLoadingHero, setIsLoadingHero] = useState(true);

  const loadHeroData = async () => {
    try {
      const sections = await HomepageService.getSections();
      const heroSection = sections.find(s => s.type === 'hero');
      if (heroSection?.settings) {
        const s = heroSection.settings;
        if (Array.isArray(s.slides) && s.slides.length > 0) setSlides(s.slides);
        if (s.ctaText) setCtaText(s.ctaText);
        if (s.ctaLink) setCtaLink(s.ctaLink);
        if (s.secondaryCtaText) setSecondaryCtaText(s.secondaryCtaText);
        if (s.secondaryCtaLink) setSecondaryCtaLink(s.secondaryCtaLink);
      }
    } catch {
      // keep defaults
    } finally {
      setIsLoadingHero(false);
    }
  };

  useEffect(() => {
    loadHeroData();
  }, []);

  useEventSubscribeMany(['website.changed'], loadHeroData);

  // Parallax effects
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

  // Auto-play and progress bar
  useEffect(() => {
     
    setProgress(0);
    const intervalTime = 100; // Update progress every 100ms
    const totalTime = 8000;  // 8 seconds per slide
    const step = (intervalTime / totalTime) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((prevIdx) => (prevIdx + 1) % slides.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <section 
      ref={ref}
      className="relative w-full h-auto lg:h-[100vh] lg:min-h-[650px] overflow-hidden bg-background-primary flex flex-col lg:flex-row items-stretch border-b border-brand-border/40"
    >
      {isLoadingHero && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/50 animate-pulse z-30" aria-hidden="true" />
      )}

      {/* Magazine Grid Layout (Desktop: Split Screen; Mobile: Stacked Layout) */}
      <div className="w-full h-full flex flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch relative">
        
        {/* LEFT COLUMN: Clean Editorial Panel (Text & Story) */}
        <motion.div 
          style={{ y: contentY }}
          className="relative z-20 w-full lg:h-full flex flex-col justify-between p-8 sm:p-12 md:p-16 lg:p-24 bg-background-primary text-right order-2 lg:order-1 select-none pointer-events-none lg:pointer-events-auto"
        >
          {/* Subtle Campaign Counter */}
          <div className="hidden lg:flex justify-between items-center text-[10px] uppercase font-sans tracking-[0.2em] text-text-secondary border-b border-brand-border/60 pb-4">
            <span>AURA ATELIER / COUTURE EDITION</span>
            <span>0{currentIndex + 1} &mdash; 0{slides.length}</span>
          </div>

          <div className="my-auto py-12 flex flex-col items-start text-right w-full max-w-xl self-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full flex flex-col items-start gap-4 md:gap-6"
              >
                {/* Campaign Subtitle Badge */}
                <div className="flex items-center gap-2">
                  <span className="font-sans text-[10px] md:text-[11px] text-accent tracking-[0.3em] font-bold uppercase">
                    {slides[currentIndex].label}
                  </span>
                </div>

                {/* Big Editorial Title */}
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-text-primary font-light leading-[1.25] tracking-wide">
                  {slides[currentIndex].title}
                </h1>
                
                {/* Secondary English Title */}
                <span className="font-serif text-[11px] text-text-secondary tracking-[0.4em] uppercase block border-b border-accent/40 pb-2">
                  {slides[currentIndex].engTitle}
                </span>

                {/* Supporting Copy */}
                <p className="font-sans text-xs md:text-sm text-text-secondary max-w-lg leading-[1.8] font-light mt-2">
                  {slides[currentIndex].subtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* CTA Actions */}
            <div className="flex flex-row items-center gap-4 w-full mt-8 md:mt-12 pointer-events-auto">
              <Link href={ctaLink} className="group flex items-center gap-3 px-8 py-3.5 bg-text-primary text-background-primary font-sans text-[10px] md:text-[11px] uppercase tracking-wider transition-all duration-500 hover:bg-accent hover:text-text-primary">
                <span>{ctaText}</span>
                <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-500 group-hover:-translate-x-1.5" />
              </Link>
              <Link href={secondaryCtaLink} className="px-8 py-3.5 border border-brand-border text-text-primary font-sans text-[10px] md:text-[11px] uppercase tracking-wider transition-all duration-500 hover:border-accent hover:text-accent">
                {secondaryCtaText}
              </Link>
            </div>
          </div>

          {/* Bottom Progress Bar & Nav Links */}
          <div className="flex justify-between items-center w-full pt-4 border-t border-brand-border/40 pointer-events-auto">
            {/* Slide Navigation Links */}
            <div className="flex gap-4 items-center">
              <motion.button
                onClick={prevSlide}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-8 h-8 rounded-full border border-brand-border/80 flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer"
                aria-label="السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={nextSlide}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-8 h-8 rounded-full border border-brand-border/80 flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer"
                aria-label="التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Luxury Linear Progress Indicator */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-sans text-text-secondary font-bold">حياكة يدوية دقيقة</span>
              <div className="w-24 md:w-36 h-[1.5px] bg-brand-border/40 relative overflow-hidden">
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-accent transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Asymmetrical Art Gallery Image Container */}
        <div className="relative w-full h-[50vh] sm:h-[55vh] lg:h-auto overflow-hidden order-1 lg:order-2">
          {/* Continuous slow zoom background wrapper */}
          <motion.div 
            className="absolute inset-0 w-full h-full origin-center select-none"
            style={{ y: backgroundY }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={currentIndex}
                className="absolute inset-0 w-full h-full"
                initial={{ scale: 1.08, opacity: 0 }}
                animate={{ scale: 1.01, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Image
                  src={slides[currentIndex].image}
                  alt={slides[currentIndex].title}
                  fill
                  priority
                  className="object-cover object-[center_35%] lg:object-[center_30%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </motion.div>
            </AnimatePresence>

            {/* Luxury visual overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-text-primary/70 via-text-primary/10 to-transparent pointer-events-none lg:hidden" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background-primary/20 to-transparent pointer-events-none hidden lg:block" />
          </motion.div>
        </div>

      </div>

      {/* Elegant Vertical Scroll Storyteller Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:left-8 lg:-translate-x-0 z-30 hidden md:flex flex-col items-center gap-3 pointer-events-none">
        <span className="text-[9px] font-sans text-text-secondary tracking-[0.35em] uppercase vertical-text">
          SCROLL
        </span>
        <div className="w-[1px] h-12 bg-brand-border/40 relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 right-0 w-full bg-accent"
            animate={{ 
              top: ["0%", "100%"],
              height: ["0%", "50%", "0%"]
            }}
            transition={{ 
              duration: 2.2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        </div>
      </div>
      
    </section>
  );
}

