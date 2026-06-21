import { Metadata } from "next";
import CollectionHero from "@/components/ui/CollectionHero";
import SeasonalProductGrid from "@/components/ui/SeasonalProductGrid";
import { mockProducts } from "@/data/products";

export const metadata: Metadata = {
  title: "أزياء الصيف الفاخرة | AURA",
  description: "اكتشفي مجموعة أورا لأزياء الصيف. تصاميم صيفية تتميز بالخفة، الأنوثة، واللمسات العصرية الراقية.",
  openGraph: {
    title: "أزياء الصيف | AURA",
    description: "اكتشفي مجموعة أورا لأزياء الصيف النسائية الفاخرة.",
    url: "https://aura-fashion-virid.vercel.app/summer-fashion",
  },
  alternates: {
    canonical: "https://aura-fashion-virid.vercel.app/summer-fashion",
  },
};

export default function SummerFashionPage() {
  // Filter summer products
  const summerProducts = mockProducts.filter((product) => product.collection === "أزياء الصيف");

  return (
    <div className="bg-background-primary min-h-screen">
      <CollectionHero
        title="أزياء الصيف"
        description="استقبلي نسيم الصيف بتصاميم تجمع بين الخفة والأنوثة. قطع مصممة بعناية من القطن والكتان والحرير لتمنحكِ شعوراً بالانتعاش والحرية في كل خطوة."
        imageSrc="https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2000&auto=format&fit=crop"
        ctaText="تسوقي الآن"
      />
      
      <div className="py-8 md:py-16 text-center max-w-[800px] mx-auto px-6">
        <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary mb-6">تألقي بروح الصيف</h2>
        <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
          تشكيلة صيفية مفعمة بالحيوية والنعومة، تناسب أوقات النهار المنعشة وسهرات الصيف الراقية.
        </p>
      </div>

      <SeasonalProductGrid products={summerProducts} />
    </div>
  );
}
