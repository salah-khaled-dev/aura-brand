"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Stunning high-end fashion stock imagery for the luxury slider
const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=2000&auto=format&fit=crop",
    label: "AURA ATELIER",
    title: "AURA صُممت لأجلك",
    subtitle: "تصميمات محدودة من أتيلييه AURA. قطع نسائية راقية تُراجع بعناية في المقاس والخامة قبل اعتماد الطلب."
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2000&auto=format&fit=crop",
    label: "NEW COLLECTION",
    title: "أناقة بلا حدود",
    subtitle: "اكتشفي التشكيلة الجديدة التي تجمع بين الفخامة الكلاسيكية واللمسات العصرية الجريئة."
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000&auto=format&fit=crop",
    label: "HAUTE COUTURE",
    title: "تفاصيل تخطف الأنظار",
    subtitle: "كل قطعة هي عمل فني يُصنع بحب، لتتألقي في كل مناسباتك الخاصة."
  }
];

export default function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // GPU-optimized scroll progress tracking
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // Extremely subtle, luxurious parallax depth
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-4%"]);

  // Auto-play interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 10000); // 10 seconds
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  return (
    <section ref={ref} className="relative w-full h-[100dvh] min-h-[600px] overflow-hidden bg-[#E9E8E4] flex items-end justify-center">
      
      {/* Background Image Slider */}
      <motion.div
        className="absolute inset-0 w-full h-full origin-[50%_40%] will-change-transform"
        style={{ y: backgroundY }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentIndex}
            className="absolute inset-0 w-full h-full"
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Image
              src={HERO_SLIDES[currentIndex].image}
              alt={HERO_SLIDES[currentIndex].title}
              fill
              priority={currentIndex === 0}
              quality={100}
              className="object-cover object-[center_20%] sm:object-[center_25%]"
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Refined gradient overlay: deep contrast only at the bottom text area */}
        <div className="absolute inset-0 bg-black/10 z-10" />
        <div className="absolute inset-x-0 bottom-0 h-[60vh] md:h-[70vh] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-10" />
      </motion.div>

      {/* Navigation Controls */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-between px-4 md:px-8 pointer-events-none">
        {/* Right Arrow (RTL previous) */}
        <button 
          onClick={prevSlide}
          className="pointer-events-auto w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-white text-white hover:text-black backdrop-blur-sm border border-white/20 transition-all duration-500 ease-out"
          aria-label="Previous slide"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        {/* Left Arrow (RTL next) */}
        <button 
          onClick={nextSlide}
          className="pointer-events-auto w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-white text-white hover:text-black backdrop-blur-sm border border-white/20 transition-all duration-500 ease-out"
          aria-label="Next slide"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 md:bottom-8 z-20 flex gap-3">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1 transition-all duration-500 rounded-full ${idx === currentIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Foreground Content */}
      <motion.div 
        className="relative z-10 flex flex-col items-center text-center w-full max-w-[1440px] px-6 sm:px-12 pb-[12vh] md:pb-[14vh] will-change-transform"
        style={{ y: contentY }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center"
          >
            {/* Label */}
            <div className="flex items-center justify-center gap-3 mb-5 md:mb-6">
              <span className="font-english text-[9px] md:text-[10px] text-white/90 tracking-[0.4em] uppercase">
                {HERO_SLIDES[currentIndex].label}
              </span>
              <span className="text-white/60 text-[10px]">|</span>
              <span className="font-sans text-[10px] md:text-[11px] text-white/90 font-medium">
                تشكيلة محدودة
              </span>
            </div>

            {/* Main Headline */}
            <h1
              className="font-serif text-4xl sm:text-6xl md:text-8xl lg:text-[7.5rem] text-white font-light leading-[1.2] mb-5 md:mb-8"
              style={{ 
                textShadow: "0 2px 20px rgba(0,0,0,0.15)",
                wordSpacing: "0.05em"
              }}
            >
              {HERO_SLIDES[currentIndex].title}
            </h1>

            {/* Supporting text */}
            <p className="font-sans text-xs sm:text-sm md:text-base text-white/85 max-w-[280px] sm:max-w-md md:max-w-xl leading-[1.8] md:leading-[2] mb-10 md:mb-14 font-light">
              {HERO_SLIDES[currentIndex].subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Buttons (Static to prevent jumping) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto mt-2">
          <Link href="/shop" className="w-full sm:w-auto">
            <button className="relative overflow-hidden w-full sm:w-auto px-10 py-[14px] md:px-14 md:py-4 bg-white text-[#1a1a1a] border-[0.5px] border-white font-sans text-[10px] md:text-[11px] uppercase transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-transparent hover:text-white hover:border-white/60 group">
              <span className="relative z-10 transition-transform duration-700 group-hover:scale-105 inline-block">تسوقي التشكيلة</span>
            </button>
          </Link>
          <Link href="/shop" className="w-full sm:w-auto">
            <button className="relative overflow-hidden w-full sm:w-auto px-10 py-[14px] md:px-14 md:py-4 bg-transparent text-white border-[0.5px] border-white/60 font-sans text-[10px] md:text-[11px] uppercase transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-white hover:text-[#1a1a1a] hover:border-white group">
              <span className="relative z-10 transition-transform duration-700 group-hover:scale-105 inline-block">تسوقي الآن</span>
            </button>
          </Link>
        </div>

      </motion.div>
    </section>
  );
}
