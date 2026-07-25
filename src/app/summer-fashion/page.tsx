"use client";

import CollectionHero from "@/components/ui/CollectionHero";
import SeasonalProductGrid from "@/components/ui/SeasonalProductGrid";
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts";

export default function SummerFashionPage() {
  const { products, loading } = useStorefrontProducts();
  const summerProducts = products.filter((p) => p.season === "summer");

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center w-full">
      <CollectionHero
        title="أزياء الصيف المنعشة"
        description="تصاميم صيفية حصرية بأقمشة مسامية خفيفة تمنحكِ الراحة والتميز في أيام الصيف المشرقة."
        imageSrc="/images/campaign/campaign_2.png"
      />
      <SeasonalProductGrid products={summerProducts} loading={loading} />
    </div>
  );
}
