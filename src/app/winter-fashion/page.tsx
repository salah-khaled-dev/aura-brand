import { Metadata } from "next";
import CollectionHero from "@/components/ui/CollectionHero";
import SeasonalProductGrid from "@/components/ui/SeasonalProductGrid";
import { mockProducts } from "@/data/products";

export const metadata: Metadata = {
  title: "أزياء الشتاء الفاخرة | AURA",
  description: "استكشفي أحدث تشكيلات أورا من الأزياء الشتوية النسائية، دفيء وأناقة.",
  openGraph: {
    title: "تشكيلة الشتاء | AURA",
    description: "استكشفي أحدث تشكيلات أورا من الأزياء الشتوية النسائية الفاخرة.",
    url: "https://aura-fashion-virid.vercel.app/winter-fashion",
  },
  alternates: {
    canonical: "https://aura-fashion-virid.vercel.app/winter-fashion",
  },
};

export default function WinterFashionPage() {
  // Filter winter products
  const winterProducts = mockProducts.filter((product) => product.collection === "أزياء الشتاء");

  return (
    <div className="bg-background-primary min-h-screen">
      <CollectionHero
        title="أزياء الشتاء"
        description="تصاميم شتوية تجمع بين الدفء والأناقة. استكشفي مجموعتنا الحصرية المنسوجة من أرقى الخامات الإيطالية الفاخرة التي تعانق قوامكِ برقي ونعومة الكشمير والحرير."
        imageSrc="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2000&auto=format&fit=crop"
        ctaText="اكتشفي التشكيلة"
      />
      
      <div className="py-8 md:py-16 text-center max-w-[800px] mx-auto px-6">
        <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary mb-6">تشكيلة الشتاء الكلاسيكية</h2>
        <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
          انتقينا لكِ قطعاً تتحدى الزمن في أناقتها، من معاطف الكشمير الفاخرة إلى الفساتين الشتوية ذات الطابع الملوكي.
        </p>
      </div>

      <SeasonalProductGrid products={winterProducts} />
    </div>
  );
}
