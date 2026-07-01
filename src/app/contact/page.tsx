import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { getWhatsAppUrl } from "@/config/whatsapp";
import { ContactItems } from "./ContactItems";
import { generatePageMetadata } from "@/utils/seo-helper";

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'contact',
    'تواصل معنا | دار أورا',
    'تواصلي مع فريق دار أورا لأي استفسار عن المنتجات أو المقاسات أو الطلبات الخاصة.'
  );
}

export default function ContactPage() {
  return (
    <div className="bg-background-primary min-h-screen">
      <section className="w-full bg-background-secondary border-b border-brand-border py-16 md:py-24 text-center">
        <div className="mx-auto max-w-[760px] px-6">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-accent">عناية AURA الخاصة</span>
          <h1 className="mt-3 font-serif text-4xl md:text-6xl font-light text-text-primary">تواصلي معنا</h1>
          <p className="mx-auto mt-4 max-w-xl font-sans text-sm font-light leading-relaxed text-text-secondary">
            فريق AURA يرافقكِ في اختيار المقاس، تفاصيل الخامة، تنسيق الإطلالة، ومتابعة الطلب حتى لحظة الاستلام.
          </p>
        </div>
      </section>

      <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-14 md:grid-cols-[1fr_0.9fr] md:px-12 md:py-24">
        <ContactItems />

        <section className="border border-brand-border bg-background-secondary p-7 md:p-8 text-right" dir="rtl">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-accent">خدمة المقاسات</span>
          <h2 className="mt-3 font-serif text-2xl font-light text-text-primary">هل تحتاجين مساعدة قبل الطلب؟</h2>
          <p className="mt-4 font-sans text-sm font-light leading-[1.9] text-text-secondary">
            أرسلي لنا اسم القطعة أو صورة المنتج، وسنساعدكِ في اختيار المقاس الأنسب وتأكيد مدة التجهيز والتسليم قبل الدفع.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
              <Button variant="primary">بدء محادثة واتساب</Button>
            </a>
            <Link href="/shop">
              <Button variant="secondary">استكشاف التشكيلة</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}