"use client";

import { type Product, primaryImage, discountOriginalPrice, resolveStockStatus } from "@/data/mock/products";
import { ProductCard } from "@/components/ui/Card";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";

interface SeasonalProductGridProps {
  products: Product[];
  loading?: boolean;
}

export default function SeasonalProductGrid({ products, loading = false }: SeasonalProductGridProps) {
  if (loading && products.length === 0) {
    return (
      <section className="py-16 md:py-24 max-w-[1440px] mx-auto px-4 md:px-12 bg-background-primary">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center px-6">
        <h3 className="font-serif text-2xl font-light mb-2">لا توجد منتجات حالياً</h3>
        <p className="font-sans text-sm text-text-secondary">سنقوم بإضافة تشكيلة جديدة قريباً.</p>
      </div>
    );
  }

  return (
    <section className="py-16 md:py-24 max-w-[1440px] mx-auto px-4 md:px-12 bg-background-primary">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.name}
            price={product.price}
            originalPrice={discountOriginalPrice(product)}
            image={primaryImage(product)}
            hoverImage={product.hoverImage}
            collection={product.collection}
            variants={product.colorVariants}
            badge={product.badge}
            stockStatus={resolveStockStatus(product)}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
