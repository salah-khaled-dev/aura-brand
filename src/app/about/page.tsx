"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { mountFadeUp, mountFadeIn } from "@/lib/animations";
import { ContentService } from "@/lib/services/storefront/content.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";

const DEFAULT_CONTENT = {
  about_hero_title:   'قصتنا',
  about_hero_subtitle:'مجموعات حصرية تُصاغ يدوياً للمرأة التي تثق بحضورها وتتحرك بأناقتها الهادئة.',
  about_phil_title:   'الملابس هالة صامتة تروي حضوركِ الفخم',
  about_phil_text:    'نحن نؤمن في أورا بأن الثوب ليس مجرد غطاء زينة خارجي، بل هو تجسيد ملموس لشخصيتكِ وقوتكِ الأنثوية المهيبة. نحن نتفادى خطوط الإنتاج السريع والاستنساخ التجاري، لنصوغ قوالب هندسية راقية من الكتان المعالج والحرير الخالص. كل تصميم نبدأ برسمه يعبّر عن لوحة فنية مستقلة تُنفذ بحرفية استثنائية لتدوم وتُروى عبر الأجيال.',
  about_craft_title:  'تفاصيل تُحاك بعناية في أتيلييه الجيزة',
  about_craft_text:   'من اختيار خيوط الكتان البلجيكي الطبيعي المعالج بنعومة الكشمير، إلى اختيار أورجانزا الحرير الفرنسي، نلتزم في دار أورا بأعلى معايير جودة المواد الخام. يتم رسم وتفصيل كل قطعة يدوياً في أتيلييه الجيزة بمصر، في إطار خياطة بطيئة ومدروسة تضمن إخراج كل غرزة بدقة استثنائية وعمر افتراضي يدوم طويلاً، مما يجعل من ثوبكِ إرثاً حقيقياً.',
  about_vision_quote: 'رؤيتنا أن نقدم للمرأة قطعًا تعكس شخصيتها وتمنحها حضورًا استثنائيًا',
  about_vision_attr:  'منسقو ومصممو أتيلييه أورا الجيزة',
  about_cta_title:    'تصفحي المتجر',
  about_cta_text:     'استكشفي أزياء أورا الفاخرة المنسوجة يدوياً بمقاييس الكوتور الحصرية ومستويات الخياطة الفاخرة.',
  about_cta_button:   'زيارة المتجر الكوتور',
};

const VALUES = [
  { number: "01", title: "الأناقة",  description: "تصاميم هادئة وخالدة لا تتأثر بمرور الزمن، تُصاغ لتعكس جوهر الأنوثة العصرية دون ضجيج." },
  { number: "02", title: "الثقة",   description: "نصمم قطعًا تمنحكِ الهيبة والقوة لتتحركي بكل ثقة في كل مناسبة وحضور." },
  { number: "03", title: "الجودة",  description: "منسوجات طبيعية بالكامل من الكتان المعالج والحرير الطبيعي الإيطالي تم فحصها يدوياً بعناية." },
  { number: "04", title: "التفاصيل",description: "تفاصيل خياطة يدوية دقيقة في أتيلييه الجيزة تُبرز ندرة القطعة وعراقة الصنع." },
];

export default function AboutPage() {
  const [c, setC] = useState(DEFAULT_CONTENT);

  const loadContent = useCallback(async () => {
    try {
      const blocks = await ContentService.getContentByGroup('pages');
      const map: Record<string, string> = {};
      blocks.forEach(b => { map[b.key] = b.value; });
      setC(prev => ({ ...prev, ...map }));
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);
  useEventSubscribeMany(['website.changed'], loadContent);

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center">

      {/* 1. HERO */}
      <section className="w-full max-w-[1440px] relative h-[50vh] md:h-[65vh] flex items-center justify-center overflow-hidden border-b border-brand-border bg-background-secondary">
        <Image
          src="/images/campaign/campaign_1.png"
          alt="حملة أورا الكلاسيكية"
          fill priority sizes="100vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-text-primary/10 pointer-events-none" />
        <div className="relative z-10 text-center px-6 max-w-[720px] text-background-secondary">
          <motion.h1
            variants={mountFadeUp} initial="hidden" animate="visible"
            className="font-sans text-5xl md:text-6xl lg:text-7xl font-light text-background-secondary"
          >
            {c.about_hero_title}
          </motion.h1>
          <motion.p
            variants={mountFadeIn} custom={0.2} initial="hidden" animate="visible"
            className="font-sans text-sm md:text-base font-light text-background-secondary/90 mt-4 leading-relaxed"
          >
            {c.about_hero_subtitle}
          </motion.p>
        </div>
      </section>

      {/* 2. BRAND PHILOSOPHY */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="flex flex-col items-start gap-4">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">فلسفتنا الإبداعية</span>
            <h2 className="font-sans text-3xl md:text-4xl font-light text-text-primary leading-tight">
              {c.about_phil_title}
            </h2>
            <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
              {c.about_phil_text}
            </p>
          </div>
          <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-border bg-background-secondary">
            <Image
              src="/images/campaign/campaign_2.png" alt="فلسفة التصميم"
              fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 3. CRAFTSMANSHIP */}
      <section className="w-full bg-background-secondary border-y border-brand-border py-16 md:py-28 flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">حرفية الصنع والأثر</span>
          <h2 className="font-sans text-3xl font-light text-text-primary leading-tight">
            {c.about_craft_title}
          </h2>
          <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
            {c.about_craft_text}
          </p>
        </div>
      </section>

      {/* 4. BRAND VALUES GRID */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-28">
        <div className="text-center mb-12 flex flex-col items-center gap-2">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">الركائز الأساسية</span>
          <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary">قيم دار أورا للأزياء</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((val) => (
            <div key={val.number} className="p-6 bg-background-secondary border border-brand-border flex flex-col gap-3">
              <span className="font-display text-xl text-accent font-bold">{val.number}</span>
              <h3 className="font-sans text-base font-semibold text-text-primary">{val.title}</h3>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">{val.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOUNDER / VISION QUOTE */}
      <section className="w-full bg-background-secondary border-t border-brand-border py-16 md:py-28">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="flex flex-col items-start gap-4 text-right">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">رؤية الدار</span>
            <blockquote className="font-sans text-2xl md:text-3xl lg:text-4xl font-light italic text-text-primary leading-snug">
              &quot;{c.about_vision_quote}&quot;
            </blockquote>
            <span className="font-sans text-xs text-text-secondary font-bold block mt-2">
              — {c.about_vision_attr}
            </span>
          </div>
          <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-border bg-background-primary">
            <Image
              src="/images/campaign/campaign_3.png" alt="رؤية مصممينا"
              fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 6. CTA */}
      <section className="w-full py-16 md:py-28 bg-background-primary border-t border-brand-border flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">زيارة صالة العرض</span>
          <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary">{c.about_cta_title}</h2>
          <p className="font-sans text-xs md:text-sm font-light text-text-secondary leading-relaxed">
            {c.about_cta_text}
          </p>
          <div className="mt-2">
            <Link href="/shop">
              <Button variant="primary">{c.about_cta_button}</Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
