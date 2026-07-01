"use client";
 
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/ui/Card";
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts";
import { primaryImage, discountOriginalPrice, resolveStockStatus } from "@/data/mock/products";
import Button from "@/components/ui/Button";
import HeroSection from "@/components/HeroSection";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import { heroFadeUp, scrollViewport } from "@/lib/animations";
import { HomepageService, HomepageSection } from "@/lib/services/storefront/homepage.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { ReviewService } from "@/lib/services/review.service";
import DOMPurify from "isomorphic-dompurify";
 
// Code-split: only ever renders for ~3.2s on a visitor's first session visit, never on repeat navigations.
const PremiumLoader = dynamic(() => import("@/components/ui/PremiumLoader"));

const GRID_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2 lg:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

function resolveProductSection(section: HomepageSection, allProducts: any[]): any[] {
  const s = section.settings || {};
  const source = (s.source as string) || 'auto_all';
  const sort   = (s.sort as string) || 'default';
  const limit  = Number(s.limit ?? 4);
  const hideOOS = Boolean(s.hideOutOfStock);

  let pool: any[];
  switch (source) {
    case 'auto_best_sellers': { const f = allProducts.filter((p: any) => p.bestSeller);  pool = f.length ? f : allProducts; break; }
    case 'auto_new_arrivals': { const f = allProducts.filter((p: any) => p.newArrival);  pool = f.length ? f : allProducts; break; }
    case 'auto_featured':     { const f = allProducts.filter((p: any) => p.featured);    pool = f.length ? f : allProducts; break; }
    case 'auto_summer': {
      const f = allProducts.filter((p: any) => /summer|صيف/i.test(p.collection || ''));
      pool = f.length ? f : allProducts; break;
    }
    case 'auto_winter': {
      const f = allProducts.filter((p: any) => /winter|شتاء/i.test(p.collection || ''));
      pool = f.length ? f : allProducts; break;
    }
    case 'manual': {
      const ids: string[] = s.manualProductIds || [];
      const map = new Map(allProducts.map((p: any) => [p.id, p]));
      const picked = ids.map(id => map.get(id)).filter(Boolean) as any[];
      pool = picked.length ? picked : allProducts; break;
    }
    default: pool = allProducts;
  }

  if (hideOOS) pool = pool.filter((p: any) => resolveStockStatus(p) !== 'out_of_stock');

  const sorted = [...pool];
  if (sort === 'price_asc')  sorted.sort((a: any, b: any) => a.price - b.price);
  if (sort === 'price_desc') sorted.sort((a: any, b: any) => b.price - a.price);
  if (sort === 'random')     sorted.sort(() => Math.random() - 0.5);

  return sorted.slice(0, limit);
}

export default function HomePage() {
  const products = useStorefrontProducts();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [testimonialReviews, setTestimonialReviews] = useState<{ id: string; name: string; text: string; rating: number }[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  useEffect(() => {
    HomepageService.getSections().then(setSections).catch(() => {});
  }, []);
  useEventSubscribeMany(['website.changed'], () => {
    HomepageService.getSections().then(setSections).catch(() => {});
  });

  // Derive product grids from enabled HomepageService sections + live product flags
  const bestSellersSection  = sections.find(s => s.type === 'best_sellers' && s.enabled);
  const newArrivalsSection  = sections.find(s => s.type === 'new_arrivals' && s.enabled);
  const featuredSection     = sections.find(s => s.type === 'featured_products' && s.enabled);
  const seasonalSection     = sections.find(s => s.type === 'seasonal_collection' && s.enabled);
  const editorialSection    = sections.find(s => s.type === 'editorial_banner' && s.enabled);
  const newsletterSection   = sections.find(s => s.type === 'newsletter' && s.enabled);
  const instagramSection    = sections.find(s => s.type === 'instagram' && s.enabled);
  const testimonialsSection = sections.find(s => s.type === 'testimonials' && s.enabled);

  useEffect(() => {
    if (!testimonialsSection) return;
    const limit = testimonialsSection.settings?.limit ?? 3;
    ReviewService.getReviews({ status: 'approved' })
      .then(data => {
        const sorted = [...data]
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return 0;
          })
          .slice(0, limit);
        setTestimonialReviews(sorted.map(r => ({ id: r.id, name: r.customerName, text: r.content, rating: r.rating })));
      })
      .catch(() => {});
  }, [testimonialsSection]);

  const bestSellers    = bestSellersSection ? resolveProductSection(bestSellersSection, products) : products.filter((p: any) => p.bestSeller).slice(0, 4);
  const newArrivals    = newArrivalsSection ? resolveProductSection(newArrivalsSection, products) : [];
  const featuredProducts = featuredSection  ? resolveProductSection(featuredSection, products)    : [];
  const seasonalProducts = seasonalSection  ? resolveProductSection(seasonalSection, products)    : [];

  return (
    <div className="w-full bg-background-primary flex flex-col items-center">
      {/* 0. Elegant Preloader */}
      <PremiumLoader />

      {/* 1. DYNAMIC HOMEPAGE SECTIONS - Rendered in CMS-defined order */}
      {sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map((section) => {
        switch (section.type) {
          case 'hero':
            return (
              <React.Fragment key={section.id}>
                {/* Asymmetrical Magazine Layout Hero */}
                <HeroSection />

                {/* 2. NEW ARRIVALS SLIDER (Editorial visual story) - Reveal Entrance */}
                <motion.section 
                  variants={heroFadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={scrollViewport}
                  className="w-full max-w-[1280px] px-6 md:px-12 py-12 md:py-24"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12">
                    <div>
                      <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">نظرة مسبقة</span>
                      <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary mt-2">وصل حديثاً</h2>
                    </div>
                    <Link href="/shop" className="font-sans text-xs text-accent hover:text-text-primary transition-colors underline underline-offset-4 mt-2 md:mt-0">
                      مشاهدة كل القطع
                    </Link>
                  </div>

                  {/* 3 Campaign looks - Women's Clothing Only */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/shop" className="relative aspect-[3/4] overflow-hidden border border-brand-border bg-background-secondary block group">
                      <Image
                        src="/images/campaign/campaign_1.png"
                        alt="إطلالة كلاسيكية راقية"
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                      />
                      <div className="absolute bottom-6 right-6 text-background-secondary z-10 text-right" dir="rtl">
                        <span className="font-sans text-[10px] uppercase tracking-wider opacity-90">الإطلالة الأولى</span>
                        <h3 className="font-serif text-lg font-light mt-1 text-white">فساتين السهرة الكوتور</h3>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-text-primary/65 via-transparent to-transparent pointer-events-none" />
                    </Link>

                    <Link href="/shop?category=summer" className="relative aspect-[3/4] overflow-hidden border border-brand-border bg-background-secondary block group">
                      <Image
                        src="/images/campaign/campaign_2.png"
                        alt="بدلة عصرية بيضاء"
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                      />
                      <div className="absolute bottom-6 right-6 text-background-secondary z-10 text-right" dir="rtl">
                        <span className="font-sans text-[10px] uppercase tracking-wider opacity-90">تشكيلة حصرية</span>
                        <h3 className="font-serif text-lg font-light mt-1 text-white">أزياء الصيف المنعشة</h3>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-text-primary/65 via-transparent to-transparent pointer-events-none" />
                    </Link>

                    <Link href="/shop?category=winter" className="relative aspect-[3/4] overflow-hidden border border-brand-border bg-background-secondary block group">
                      <Image
                        src="/images/campaign/campaign_3.png"
                        alt="أزياء الشتاء"
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                      />
                      <div className="absolute bottom-6 right-6 text-background-secondary z-10 text-right" dir="rtl">
                        <span className="font-sans text-[10px] uppercase tracking-wider opacity-90">دفء وأناقة</span>
                        <h3 className="font-serif text-lg font-light mt-1 text-white">تشكيلة الشتاء الفاخرة</h3>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-text-primary/65 via-transparent to-transparent pointer-events-none" />
                    </Link>
                  </div>
                </motion.section>

                {/* 3. FEATURED LOOKS (Contemporary Egyptian Fashion Styling) - Reveal Entrance */}
                <motion.section 
                  variants={heroFadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={scrollViewport}
                  className="w-full bg-background-secondary border-y border-brand-border py-12 md:py-24"
                >
                  <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="relative aspect-[4/5] w-full overflow-hidden border border-brand-border bg-background-primary group">
                      <Image
                        src="/images/campaign/campaign_4.png"
                        alt="تنسيق التشكيلة"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-col items-start gap-4 md:pl-8 text-right" dir="rtl">
                      <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">تنسيق مخصص</span>
                      <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary leading-snug">
                        أناقة تواكب حضوركِ اليومي والمناسبات
                      </h2>
                      <p className="font-sans text-xs md:text-sm font-light text-text-secondary leading-relaxed mt-2">
                        كل قطعة في تشكيلتنا مصممة لتكون حجر زاوية في خزانتكِ. نهتم بدمج الأقمشة الطبيعية عالية الجودة كالكتان المعالج والحرير الطبيعي مع قصات هندسية تمنحكِ الراحة دون التنازل عن فخامة المظهر.
                      </p>
                      <div className="mt-4">
                        <Link href="/shop">
                          <Button variant="dark-outline">استكشفي دليل الإطلالات</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* 4. EDITORIAL STORY - Reveal Entrance */}
                <motion.section 
                  variants={heroFadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={scrollViewport}
                  className="w-full py-20 md:py-32 bg-background-primary"
                >
                  <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6" dir="rtl">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">Contemporary Couture</span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary leading-tight">
                      حياكة إبداعية ترسم ملامح حضورك الفخم
                    </h2>
                    <p className="font-sans text-xs md:text-sm font-light text-text-secondary leading-relaxed mt-2">
                      تأسست دار أورا في الجيزة لنقدم مفهوماً جديداً للأناقة المعاصرة وجماليات الحياكة الفاخرة. نؤمن بالحياكة البطيئة والمدروسة؛ حيث يُقَص ويُحاك كل تصميم يدوياً بأيدي أمهر الحرفيين في أتيلييه الجيزة، مستلهمين تفاصيلنا من الأنسجة الطبيعية الراقية والخطوط الهندسية البسيطة التي تعبر عن قوة حضور المرأة العصرية.
                    </p>
                    <Link href="/about" className="font-sans text-xs text-accent hover:text-text-primary transition-colors underline underline-offset-4 font-semibold mt-4">
                      اقرئي قصتنا وحكايتنا الفنية
                    </Link>
                  </div>
                </motion.section>
              </React.Fragment>
            );

          case 'best_sellers': {
            const sectionProducts = resolveProductSection(section, products);
            if (sectionProducts.length === 0) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full bg-background-secondary border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-12 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || 'المجموعة الحصرية'}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title || 'القطع الأكثر طلباً'}
                    </h2>
                  </div>
                  <div className={`grid grid-cols-1 ${GRID_COLS[section.settings?.columns ?? 4] ?? 'sm:grid-cols-2 lg:grid-cols-4'} gap-8`}>
                    {sectionProducts.map((product, index) => (
                      <ProductCard key={product.id} id={product.id} title={product.name} price={product.price}
                        originalPrice={discountOriginalPrice(product)} image={primaryImage(product)}
                        hoverImage={product.hoverImage} collection={product.collection}
                        badge={product.badge} stockStatus={resolveStockStatus(product)} index={index} />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          }

          case 'new_arrivals': {
            const sectionProducts = resolveProductSection(section, products);
            if (sectionProducts.length === 0) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-12 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || 'نظرة مسبقة'}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title || 'وصل حديثاً'}
                    </h2>
                  </div>
                  <div className={`grid grid-cols-1 ${GRID_COLS[section.settings?.columns ?? 4] ?? 'sm:grid-cols-2 lg:grid-cols-4'} gap-8`}>
                    {sectionProducts.map((product, index) => (
                      <ProductCard key={product.id} id={product.id} title={product.name} price={product.price}
                        originalPrice={discountOriginalPrice(product)} image={primaryImage(product)}
                        hoverImage={product.hoverImage} collection={product.collection}
                        badge={product.badge} stockStatus={resolveStockStatus(product)} index={index} />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          }

          case 'featured_products': {
            const sectionProducts = resolveProductSection(section, products);
            if (sectionProducts.length === 0) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full bg-background-secondary border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-12 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || 'تشكيلة مختارة'}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title || 'منتجات مميزة'}
                    </h2>
                  </div>
                  <div className={`grid grid-cols-1 ${GRID_COLS[section.settings?.columns ?? 4] ?? 'sm:grid-cols-2 lg:grid-cols-4'} gap-8`}>
                    {sectionProducts.map((product, index) => (
                      <ProductCard key={product.id} id={product.id} title={product.name} price={product.price}
                        originalPrice={discountOriginalPrice(product)} image={primaryImage(product)}
                        hoverImage={product.hoverImage} collection={product.collection}
                        badge={product.badge} stockStatus={resolveStockStatus(product)} index={index} />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          }

          case 'featured_collections': {
            const sectionProducts = resolveProductSection(section, products);
            if (sectionProducts.length === 0) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-12 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || 'مجموعات مميزة'}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title || 'تشكيلة المجموعات'}
                    </h2>
                  </div>
                  <div className={`grid grid-cols-1 ${GRID_COLS[section.settings?.columns ?? 3] ?? 'sm:grid-cols-2 lg:grid-cols-3'} gap-8`}>
                    {sectionProducts.map((product, index) => (
                      <ProductCard key={product.id} id={product.id} title={product.name} price={product.price}
                        originalPrice={discountOriginalPrice(product)} image={primaryImage(product)}
                        hoverImage={product.hoverImage} collection={product.collection}
                        badge={product.badge} stockStatus={resolveStockStatus(product)} index={index} />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          }

          case 'seasonal_collection': {
            const sectionProducts = resolveProductSection(section, products);
            if (sectionProducts.length === 0) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-12 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || (section.settings?.season === 'winter' ? 'تشكيلة الشتاء' : 'تشكيلة الصيف')}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title}
                    </h2>
                  </div>
                  <div className={`grid grid-cols-1 ${GRID_COLS[section.settings?.columns ?? 4] ?? 'sm:grid-cols-2 lg:grid-cols-4'} gap-8`}>
                    {sectionProducts.map((product, index) => (
                      <ProductCard key={product.id} id={product.id} title={product.name} price={product.price}
                        originalPrice={discountOriginalPrice(product)} image={primaryImage(product)}
                        hoverImage={product.hoverImage} collection={product.collection}
                        badge={product.badge} stockStatus={resolveStockStatus(product)} index={index} />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          }

          case 'editorial_banner':
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border"
              >
                <div className="relative w-full aspect-[21/9] overflow-hidden bg-background-secondary">
                  {section.settings?.image && (
                    <Image
                      src={section.settings.image}
                      alt={section.title}
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: `rgba(0,0,0,${(section.settings?.overlayOpacity ?? 40) / 100})` }}
                  />
                  <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-white text-center`}>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                      {section.subtitle}
                    </span>
                    <h2 className="font-serif text-3xl md:text-5xl font-light leading-tight drop-shadow-lg">
                      {section.title}
                    </h2>
                    {section.settings?.ctaText && (
                      <Link href={section.settings.ctaLink || '/shop'} className="mt-2">
                        <Button variant="secondary">{section.settings.ctaText}</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.section>
            );

          case 'testimonials':
            if (testimonialReviews.length === 0) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-12 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || 'آراء وثقة'}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title || 'ماذا قالت عملاؤنا'}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonialReviews.slice(0, section.settings?.limit ?? 3).map(r => (
                      <div key={r.id} className="bg-background-secondary border border-brand-border p-6 flex flex-col gap-4 text-right" dir="rtl">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={`text-base ${i < r.rating ? 'text-accent' : 'text-brand-border'}`}>★</span>
                          ))}
                        </div>
                        <p className="font-sans text-xs font-light text-text-secondary leading-relaxed italic">&quot;{r.text}&quot;</p>
                        <span className="font-sans text-[10px] text-accent font-bold">— {r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            );

          case 'newsletter':
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full bg-background-secondary border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6">
                  <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                    {section.subtitle || 'الصالون البريدي'}
                  </span>
                  <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                    {section.title || 'انضمي لصالون أورا البريدي'}
                  </h2>
                  <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
                    {section.settings?.description || 'دعوات حصرية، تحديثات الأتيلييه، وعروض العملاء المميزين — أولاً لأعضاء الصالون البريدي.'}
                  </p>
                  {newsletterSubmitted ? (
                    <div className="border border-accent/40 bg-accent/5 px-8 py-4 text-sm font-sans text-text-primary">
                      {section.settings?.successMessage || 'شكراً لانضمامكِ! سنتواصل معكِ قرويباً.'}
                    </div>
                  ) : (
                    <form
                      className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
                      onSubmit={e => { e.preventDefault(); if (newsletterEmail.trim()) setNewsletterSubmitted(true); }}
                    >
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={e => setNewsletterEmail(e.target.value)}
                        placeholder={section.settings?.placeholder || 'بريدكِ الإلكتروني'}
                        dir="rtl"
                        className="flex-1 h-12 border border-brand-border bg-background-primary px-4 text-sm font-sans text-text-primary outline-none placeholder:text-text-secondary/40 focus:border-accent transition-colors duration-300"
                      />
                      <Button type="submit" variant="primary" className="h-12 px-6 shrink-0">
                        {section.settings?.buttonText || 'انضمي الآن'}
                      </Button>
                    </form>
                  )}
                </div>
              </motion.section>
            );

          case 'instagram':
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12">
                  <div className="text-center mb-10 flex flex-col items-center gap-2">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em]">
                      {section.subtitle || 'تابعينا'}
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
                      {section.title || 'أورا على إنستغرام'}
                    </h2>
                    {section.settings?.handle && (
                      <a
                        href={`https://instagram.com/${section.settings.handle.replace('@', '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-sans text-xs text-accent hover:text-text-primary transition-colors underline underline-offset-4 mt-1"
                      >
                        {section.settings.handle}
                      </a>
                    )}
                  </div>
                  <div className={`grid gap-2 ${(section.settings?.gridSize ?? 3) >= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    {Array.from({ length: section.settings?.limit ?? 6 }).map((_, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden border border-brand-border bg-background-secondary group cursor-pointer">
                        <Image
                          src={`/images/campaign/campaign_${(i % 6) + 1}.png`}
                          alt={`صورة إنستغرام ${i + 1}`}
                          fill sizes="(max-width: 768px) 33vw, 25vw"
                          className="object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-text-primary/0 group-hover:bg-text-primary/20 transition-colors duration-300 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-background-secondary font-sans text-[10px] font-bold uppercase tracking-widest">
                            {section.settings?.handle || '@aurabrand.eg'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            );

          case 'custom_html':
            if (!section.settings?.html) return null;
            return (
              <motion.section
                key={section.id}
                variants={heroFadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={scrollViewport}
                className="w-full border-t border-brand-border py-12 md:py-24"
              >
                <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-right">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(section.settings.html, {
                        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'strong', 'em', 'span', 'div', 'br'],
                        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel']
                      })
                    }}
                  />
                </div>
              </motion.section>
            );

          default:
            return null;
        }
      })}

      {/* 6. CUSTOMER EXPERIENCE & BRAND TRUST - Reveal Entrance */}
      <motion.section 
        variants={heroFadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={scrollViewport}
        className="w-full py-12 md:py-24 bg-background-primary border-t border-brand-border"
      >
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col gap-16">
          
          {/* Top row: Experience details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right" dir="rtl">
            <div className="flex flex-col gap-2 items-start p-6 bg-background-secondary border border-brand-border group">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-brand-border mb-4 bg-background-primary">
                <Image 
                  src="/images/flatlay/flatlay_1.png" 
                  alt="شحن أورا" 
                  fill 
                  sizes="(max-width: 768px) 100vw, 33vw" 
                  className="object-cover transition-transform duration-[1200ms] group-hover:scale-105" 
                />
              </div>
              <h4 className="font-serif text-base font-semibold text-text-primary">توصيل سريع لكل المحافظات</h4>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                تصلكِ قطع أورا أينما كنتِ في مصر، مع خدمة شحن سريع مؤمن وموثوق خلال 2 إلى 5 أيام عمل بحد أقصى.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start p-6 bg-background-secondary border border-brand-border group">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-brand-border mb-4 bg-background-primary">
                <Image 
                  src="/aura_packaging_mockup.png" 
                  alt="تغليف أورا الفاخر" 
                  fill 
                  sizes="(max-width: 768px) 100vw, 33vw" 
                  className="object-cover transition-transform duration-[1200ms] group-hover:scale-105" 
                />
              </div>
              <h4 className="font-serif text-base font-semibold text-text-primary">تغليف مخملي فاخر كوتور</h4>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                تُسلّم كل شحنة مغلفة بصناديق أورا الفاخرة المخصصة لحفظ خامات الحرير والكتان وجاهزة لتكون هدية راقية.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start p-6 bg-background-secondary border border-brand-border group">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-brand-border mb-4 bg-background-primary">
                <Image 
                  src="/aura_clothing_label.png" 
                  alt="علامة جودة أورا" 
                  fill 
                  sizes="(max-width: 768px) 100vw, 33vw" 
                  className="object-cover transition-transform duration-[1200ms] group-hover:scale-105" 
                />
              </div>
              <h4 className="font-serif text-base font-semibold text-text-primary">تنسيق وتجهيز القياسات</h4>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                فريق الأتيلييه يتواصل معكِ عبر الواتساب لتأكيد مقاسات القوام الدقيقة قبل البدء بالخياطة والتجهيز.
              </p>
            </div>
          </div>

          {/* Middle row: Brand Trust Grid */}
          <div className="border-t border-brand-border pt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-right" dir="rtl">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span className="text-accent">✓</span>
                <h5 className="font-serif text-sm font-bold">شحن آمن ومضمون</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                شحن سريع ومؤمن بالكامل لجميع محافظات مصر مع تتبع حي لرحلة مقتنياتكِ الفخمة.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span className="text-accent">✓</span>
                <h5 className="font-serif text-sm font-bold">جودة الخامات الفاخرة</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                نستخدم أفضل خامات الكتان البلجيكي الطبيعي المعالج والحرير الإيطالي الخالص 100%.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span className="text-accent">✓</span>
                <h5 className="font-serif text-sm font-bold">تصميم مصري فاخر</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                تصاميم كوتور أصلية وقطع محدودة الإصدار تُحاك وتُجهّز بكل فخر بأيدي حرفيين مصريين.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span className="text-accent">✓</span>
                <h5 className="font-serif text-sm font-bold">دعم عملاء متميز</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed mt-1">
                تواصل مباشر وتنسيق شخصي عبر الواتساب لتجهيز تفاصيل القياسات وتسهيل عملية الدفع.
              </p>
            </div>
          </div>

          {/* Bottom row: Testimonials & Trust */}
          <div className="border-t border-brand-border pt-16 flex flex-col items-center text-center">
            <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-[0.2em] mb-4">آراء وثقة صالون أورا</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] w-full mt-2" dir="rtl">
              <div className="bg-background-secondary p-6 border border-brand-border flex flex-col gap-3 justify-center text-right">
                <p className="font-sans text-xs text-text-secondary font-light italic leading-relaxed">
                  &quot;تصاميم دار أورا تعبر عن الأناقة الهادئة والفريدة. الكتان المعالج مريح للغاية والقصات الهندسية تمنح حضورًا راقيًا وثقة عالية في كل مناسبة.&quot;
                </p>
                <span className="font-sans text-[10px] text-accent font-bold">— ياسمين الشافعي، عميلة صالون أورا الخاص</span>
              </div>
              <div className="bg-background-secondary p-6 border border-brand-border flex flex-col gap-3 justify-center text-right">
                <p className="font-sans text-xs text-text-secondary font-light italic leading-relaxed">
                  &quot;تفاصيل الخياطة اليدوية دقيقة للغاية في فستان الحرير الذي اقتنيته. إنه تجسيد للحرفية والموضة البطيئة الراقية بكل فخر في مصر.&quot;
                </p>
                <span className="font-sans text-[10px] text-accent font-bold">— نورة آل سعود، عضو صالون أورا البريدي</span>
              </div>
            </div>
          </div>

        </div>
      </motion.section>

      {/* 8. RECENTLY VIEWED */}
      <RecentlyViewed />
    </div>
  );
}
