"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ui/Card";
import { mockProducts } from "@/data/products";
import Button from "@/components/ui/Button";
import HeroSection from "@/components/HeroSection";
import RecentlyViewed from "@/components/product/RecentlyViewed";

export default function HomePage() {
  // Get first 4 products for Best Sellers
  const bestSellers = mockProducts.slice(0, 4);

  return (
    <div className="w-full bg-background-primary flex flex-col items-center">
      
      {/* 1. HERO CAMPAIGN - New Luxury Layout */}
      <HeroSection />

      {/* 2. NEW COLLECTION SLIDER (Editorial visual story) - Spacing: Desktop 80-120px, Mobile 48-72px */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 py-12 md:py-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12">
          <div>
            <span className="font-sans text-[10px] text-accent font-bold uppercase">نظرة مسبقة</span>
            <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary mt-1">كواليس التشكيلة الحالية</h2>
          </div>
          <Link href="/shop" className="font-sans text-xs text-accent hover:text-text-primary transition-colors underline underline-offset-4 mt-2 md:mt-0">
            مشاهدة كل القطع
          </Link>
        </div>

        {/* 3 Campaign looks - Women's Clothing Only */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/shop?category=dresses" className="relative aspect-[3/4] overflow-hidden border border-brand-border bg-background-secondary block group">
            <Image
              src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
              alt="إطلالة كلاسيكية راقية"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-[1200ms] group-hover:scale-105"
            />
            <div className="absolute bottom-6 right-6 text-background-secondary z-10">
              <span className="font-sans text-[10px] uppercase font-semibold">الإطلالة الأولى</span>
              <h3 className="font-sans text-lg font-light mt-1">فساتين السهرة الكوتور</h3>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-text-primary/60 via-transparent to-transparent pointer-events-none" />
          </Link>

          <Link href="/summer-fashion" className="relative aspect-[3/4] overflow-hidden border border-brand-border bg-background-secondary block group">
            <Image
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
              alt="بدلة عصرية بيضاء"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-[1200ms] group-hover:scale-105"
            />
            <div className="absolute bottom-6 right-6 text-background-secondary z-10">
              <span className="font-sans text-[10px] uppercase font-semibold">تشكيلة حصرية</span>
              <h3 className="font-sans text-lg font-light mt-1">أزياء الصيف المنعشة</h3>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-text-primary/60 via-transparent to-transparent pointer-events-none" />
          </Link>

          <Link href="/winter-fashion" className="relative aspect-[3/4] overflow-hidden border border-brand-border bg-background-secondary block group">
            <Image
              src="https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?q=80&w=800&auto=format&fit=crop"
              alt="أزياء الشتاء"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-[1200ms] group-hover:scale-105"
            />
            <div className="absolute bottom-6 right-6 text-background-secondary z-10">
              <span className="font-sans text-[10px] uppercase font-semibold">دفء وأناقة</span>
              <h3 className="font-sans text-lg font-light mt-1">تشكيلة الشتاء الفاخرة</h3>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-text-primary/60 via-transparent to-transparent pointer-events-none" />
          </Link>
        </div>
      </section>

      {/* 3. FEATURED LOOKS (Contemporary Egyptian Fashion Styling) - Spacing: Desktop 80-120px */}
      <section className="w-full bg-background-secondary border-y border-brand-border py-12 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          <div className="relative aspect-[4/5] w-full overflow-hidden border border-brand-border bg-background-primary">
            <Image
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1000&auto=format&fit=crop"
              alt="تنسيق التشكيلة"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col items-start gap-4 md:pl-8">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">تنسيق مخصص</span>
            <h2 className="font-sans text-3xl md:text-4xl font-light text-text-primary leading-tight">
              أناقة تواكب حضوركِ اليومي والمناسبات
            </h2>
            <p className="font-sans text-xs md:text-sm font-light text-text-secondary leading-relaxed">
              كل قطعة في تشكيلتنا مصممة لتكون حجر زاوية في خزانتكِ. نهتم بدمج الأقمشة الطبيعية عالية الجودة كالكتان المعالج والحرير الطبيعي مع قصات هندسية تمنحكِ الراحة دون التنازل عن فخامة المظهر.
            </p>
            <div className="mt-2">
              <Link href="/shop">
                <Button variant="dark-outline">استكشفي دليل الإطلالات</Button>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 4. EDITORIAL STORY - Text Container Max Width: 720px. Spacing: Desktop 80-120px */}
      <section className="w-full py-16 md:py-28 bg-background-primary">
        <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">حرفية الصنع والأثر</span>
          <h2 className="font-sans text-3xl md:text-4xl font-light text-text-primary leading-tight">
            من أتيلييه الإسكندرية إلى كل محافظات مصر
          </h2>
          <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
            تأسست دار أورا للأزياء في الإسكندرية لنصنع قطعاً تعبّر عن التفرد بعيداً عن خطوط الإنتاج الاستهلاكية المتكررة. نحن نؤمن بالخياطة البطيئة والمدروسة؛ حيث يتم رسم كل تصميم وقصه يدوياً بأيدي أمهر الحرفيين في أتيلييه الإسكندرية، مستعينين بأفضل خامات الكتان والحرير التي ننتقيها بعناية فائقة لتلائم المرأة العصرية التي تبحث عن الجودة الفاخرة والاستدامة.
          </p>
          <Link href="/about" className="font-sans text-xs text-accent hover:text-text-primary transition-colors underline underline-offset-4 font-semibold mt-2">
            اقرئي قصتنا وحكايتنا الفنية
          </Link>
        </div>
      </section>

      {/* 5. BEST SELLERS - Spacing: Desktop 80-120px. Grid: 4-Column */}
      <section className="w-full bg-background-secondary border-t border-brand-border py-12 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          
          <div className="text-center mb-12 flex flex-col items-center gap-2">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">المجموعة الحصرية</span>
            <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary">القطع الأكثر طلباً</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                hoverImage={product.hoverImage}
                collection={product.collection}
              />
            ))}
          </div>

        </div>
      </section>

      {/* 6. CUSTOMER EXPERIENCE & BRAND TRUST - Spacing: Desktop 80-120px */}
      <section className="w-full py-12 md:py-24 bg-background-primary border-t border-brand-border">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-col gap-16">
          
          {/* Top row: Experience details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
            <div className="flex flex-col gap-2 items-start p-6 bg-background-secondary border border-brand-border">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-brand-border mb-4 bg-background-primary">
                <Image src="https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop" alt="شحن أورا" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <h4 className="font-sans text-base font-semibold text-text-primary">توصيل سريع لكل المحافظات</h4>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                تصلكِ قطع أورا أينما كنتِ في مصر، مع خدمة شحن سريع مؤمن وموثوق خلال 2 إلى 5 أيام عمل بحد أقصى.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start p-6 bg-background-secondary border border-brand-border">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-brand-border mb-4 bg-background-primary">
                <Image src="/aura_packaging_mockup.png" alt="تغليف أورا الفاخر" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <h4 className="font-sans text-base font-semibold text-text-primary">تغليف مخملي فاخر كوتور</h4>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                تُسلّم كل شحنة مغلفة بصناديق أورا الفاخرة المخصصة لحفظ خامات الحرير والكتان وجاهزة لتكون هدية راقية.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start p-6 bg-background-secondary border border-brand-border">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-brand-border mb-4 bg-background-primary">
                <Image src="/aura_clothing_label.png" alt="علامة جودة أورا" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <h4 className="font-sans text-base font-semibold text-text-primary">تنسيق وتجهيز القياسات</h4>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                فريق الأتيلييه يتواصل معكِ عبر الواتساب لتأكيد مقاسات القوام الدقيقة قبل البدء بالخياطة والتجهيز.
              </p>
            </div>
          </div>

          {/* Middle row: Brand Trust Grid */}
          <div className="border-t border-brand-border pt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-right">
            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span>✓</span>
                <h5 className="font-sans text-sm font-bold">شحن آمن ومضمون</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                شحن سريع ومؤمن بالكامل لجميع محافظات مصر مع تتبع حي لرحلة مقتنياتكِ الفخمة.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span>✓</span>
                <h5 className="font-sans text-sm font-bold">جودة الخامات الفاخرة</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                نستخدم أفضل خامات الكتان البلجيكي الطبيعي المعالج والحرير الإيطالي الخالص 100%.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span>✓</span>
                <h5 className="font-sans text-sm font-bold">تصميم مصري فاخر</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                تصاميم كوتور أصلية وقطع محدودة الإصدار تُحاك وتُجهّز بكل فخر بأيدي حرفيين مصريين.
              </p>
            </div>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <span>✓</span>
                <h5 className="font-sans text-sm font-bold">دعم عملاء متميز</h5>
              </div>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                تواصل مباشر وتنسيق شخصي عبر الواتساب لتجهيز تفاصيل القياسات وتسهيل عملية الدفع.
              </p>
            </div>
          </div>

          {/* Bottom row: Testimonials & Trust */}
          <div className="border-t border-brand-border pt-16 flex flex-col items-center text-center">
            <span className="font-sans text-[10px] text-accent font-bold uppercase mb-4">آراء وثقة صالون أورا</span>
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
      </section>

      {/* 8. RECENTLY VIEWED */}
      <RecentlyViewed />

    </div>
  );
}
