"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Image from "next/image";

export default function AboutPage() {
  const values = [
    {
      number: "01",
      title: "الأناقة",
      description: "تصاميم هادئة وخالدة لا تتأثر بمرور الزمن، تُصاغ لتعكس جوهر الأنوثة العصرية دون ضجيج."
    },
    {
      number: "02",
      title: "الثقة",
      description: "نصمم قطعًا تمنحكِ الهيبة والقوة لتتحركي بكل ثقة في كل مناسبة وحضور."
    },
    {
      number: "03",
      title: "الجودة",
      description: "منسوجات طبيعية بالكامل من الكتان المعالج والحرير الطبيعي الإيطالي تم فحصها يدوياً بعناية."
    },
    {
      number: "04",
      title: "التفاصيل",
      description: "تفاصيل خياطة يدوية دقيقة في أتيلييه الإسكندرية تُبرز ندرة القطعة وعراقة الصنع."
    }
  ];

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center">
      
      {/* 1. HERO SECTION - Full-width campaign image, large elegant headline */}
      <section className="w-full max-w-[1440px] relative h-[50vh] md:h-[65vh] flex items-center justify-center overflow-hidden border-b border-brand-border bg-background-secondary">
        <Image
          src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1600&auto=format&fit=crop"
          alt="حملة أورا الكلاسيكية"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-text-primary/10 pointer-events-none" />
        
        <div className="relative z-10 text-center px-6 max-w-[720px] text-background-secondary">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-sans text-5xl md:text-6xl lg:text-7xl font-light text-background-secondary"
          >
            قصتنا
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-sans text-sm md:text-base font-light text-background-secondary/90 mt-4 leading-relaxed"
          >
            مجموعات حصرية تُصاغ يدوياً للمرأة التي تثق بحضورها وتتحرك بأناقتها الهادئة.
          </motion.p>
        </div>
      </section>

      {/* 2. BRAND PHILOSOPHY SECTION - Luxury Split Layout. Spacing: py-20 to py-32 */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          
          {/* Right Text */}
          <div className="flex flex-col items-start gap-4">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">فلسفتنا الإبداعية</span>
            <h2 className="font-sans text-3xl md:text-4xl font-light text-text-primary leading-tight">
              الملابس هالة صامتة تروي حضوركِ الفخم
            </h2>
            <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
              نحن نؤمن في أورا بأن الثوب ليس مجرد غطاء زينة خارجي، بل هو تجسيد ملموس لشخصيتكِ وقوتكِ الأنثوية المهيبة. نحن نتفادى خطوط الإنتاج السريع والاستنساخ التجاري، لنصوغ قوالب هندسية راقية من الكتان المعالج والحرير الخالص. كل تصميم نبدأ برسمه يعبّر عن لوحة فنية مستقلة تُنفذ بحرفية استثنائية لتدوم وتُروى عبر الأجيال.
            </p>
          </div>

          {/* Left Tall Image */}
          <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-border bg-background-secondary">
            <Image
              src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
              alt="فلسفة التصميم"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

        </div>
      </section>

      {/* 3. CRAFTSMANSHIP & QUALITY - Spacing: py-20 to py-32, Text Container: max-w-[720px] */}
      <section className="w-full bg-background-secondary border-y border-brand-border py-16 md:py-28 flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">حرفية الصنع والأثر</span>
          <h2 className="font-sans text-3xl font-light text-text-primary leading-tight">
            تفاصيل تُحاك بعناية في أتيلييه الإسكندرية
          </h2>
          <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
            من اختيار خيوط الكتان البلجيكي الطبيعي المعالج بنعومة الكشمير، إلى اختيار أورجانزا الحرير الفرنسي، نلتزم في دار أورا بأعلى معايير جودة المواد الخام. يتم رسم وتفصيل كل قطعة يدوياً في أتيلييه الإسكندرية بمصر، في إطار خياطة بطيئة ومدروسة تضمن إخراج كل غرزة بدقة استثنائية وعمر افتراضي يدوم طويلاً، مما يجعل من ثوبكِ إرثاً حقيقياً.
          </p>
        </div>
      </section>

      {/* 4. BRAND VALUES GRID - Spacing: py-20 to py-32. Minimal, No Shadows, Solid Secondary */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-28">
        <div className="text-center mb-12 flex flex-col items-center gap-2">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">الركائز الأساسية</span>
          <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary">قيم دار أورا للأزياء</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((val) => (
            <div key={val.number} className="p-6 bg-background-secondary border border-brand-border flex flex-col gap-3">
              <span className="font-display text-xl text-accent font-bold">{val.number}</span>
              <h3 className="font-sans text-base font-semibold text-text-primary">{val.title}</h3>
              <p className="font-sans text-xs text-text-secondary font-light leading-relaxed">
                {val.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOUNDER / VISION QUOTE SECTION - Spacing: py-20 to py-32 */}
      <section className="w-full bg-background-secondary border-t border-brand-border py-16 md:py-28">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          
          {/* Quote side */}
          <div className="flex flex-col items-start gap-4 text-right">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">رؤية الدار</span>
            <blockquote className="font-sans text-2xl md:text-3xl lg:text-4xl font-light italic text-text-primary leading-snug">
              &quot;رؤيتنا أن نقدم للمرأة قطعًا تعكس شخصيتها وتمنحها حضورًا استثنائيًا&quot;
            </blockquote>
            <span className="font-sans text-xs text-text-secondary font-bold block mt-2">
              — منسقو ومصممو أتيلييه أورا الإسكندرية
            </span>
          </div>

          {/* Portrait side */}
          <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-border bg-background-primary">
            <Image
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
              alt="رؤية مصممينا"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

        </div>
      </section>

      {/* 6. CLOSING CTA SECTION - Spacing: py-20 to py-32 */}
      <section className="w-full py-16 md:py-28 bg-background-primary border-t border-brand-border flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">زيارة صالة العرض</span>
          <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary">اكتشفي التشكيلة الجديدة</h2>
          <p className="font-sans text-xs md:text-sm font-light text-text-secondary leading-relaxed">
            استكشفي أزياء أورا الفاخرة المنسوجة يدوياً بمقاييس الكوتور الحصرية ومستويات الخياطة الفاخرة.
          </p>
          <div className="mt-2">
            <Link href="/shop">
              <Button variant="primary">زيارة المتجر الكوتور</Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

