"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ui/Card";
import { mockProducts } from "@/data/products";
import { Search, SlidersHorizontal } from "lucide-react";
import CollectionHero from "@/components/ui/CollectionHero";
import { Skeleton } from "@/components/ui/Skeleton";

function ShopContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  const categories = ["الكل", "مجموعة المساء الكوتور", "أطقم قطعتين", "أطقم", "بلوزات", "فساتين كاجوال", "قمصان", "بنطلونات", "أزياء الشتاء", "أزياء الصيف"];
  const sizes = ["XS", "S", "M", "L", "XL"];

  useEffect(() => {
    if (categoryParam === "sets") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategory("أطقم");
    } else if (categoryParam === "dresses") {
      setSelectedCategory("مجموعة المساء الكوتور");
    } else if (categoryParam === "linen") {
      setSelectedCategory("أطقم قطعتين");
    }
  }, [categoryParam]);

  // Filter items dynamically
  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      // Search matching
      const matchesSearch =
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.collection.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category matching
      const matchesCategory =
        selectedCategory === "الكل" || product.collection === selectedCategory || (selectedCategory === "أطقم" && product.collection === "أطقم قطعتين");
      
      // Price matching
      const matchesPrice =
        product.price >= priceRange.min && product.price <= priceRange.max;

      // Size matching
      const matchesSize =
        selectedSizes.length === 0 || (product.sizes && product.sizes.some(s => selectedSizes.includes(s)));

      return matchesSearch && matchesCategory && matchesPrice && matchesSize;
    });
  }, [searchQuery, selectedCategory, priceRange, selectedSizes]);

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center w-full">
      
      {/* Dynamic Hero Section */}
      {selectedCategory === "أطقم" ? (
        <div className="w-full">
          <CollectionHero
            title="مجموعة الأطقم"
            description="أطقم راقية مصممة لتوفر لكِ إطلالة متكاملة بجهد أقل. خامات طبيعية وتصاميم هندسية دقيقة."
            imageSrc="https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2000&auto=format&fit=crop"
          />
        </div>
      ) : selectedCategory === "مجموعة المساء الكوتور" ? (
        <div className="w-full">
          <CollectionHero
            title="فساتين السهرة الكوتور"
            description="فساتين صُممت لتعكس فخامة دار أورا الراقية، منسوجة من الحرير الطبيعي الخالص."
            imageSrc="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=2000&auto=format&fit=crop"
          />
        </div>
      ) : (
        <section className="w-full bg-background-secondary py-12 md:py-16 border-b border-brand-border flex flex-col items-center">
          <div className="max-w-[720px] mx-auto px-6 text-center">
            <span className="font-sans text-[10px] text-accent font-bold uppercase">
              كتالوج الكولكشن الحصري
            </span>
            <h1 className="font-sans text-3xl font-light text-text-primary mt-2">
              معرض تصاميم الكوتور
            </h1>
            <p className="font-sans text-xs text-text-secondary font-light mt-3 leading-relaxed">
              استكشفي أزياء أورا الفاخرة المنسوجة يدوياً في أتيلييه الإسكندرية، مصر. قطع فردية نادرة تصدر بكميات محدودة لعملائنا الأكثر تميزاً في مصر.
            </p>
          </div>
        </section>
      )}

      {/* 2. Controls & Search block */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-brand-border/60">
        
        {/* Category list */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 font-sans text-xs transition-colors shrink-0 ${
                selectedCategory === cat
                  ? "text-accent border-b-2 border-accent font-semibold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input & Filter toggle */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0 w-full md:w-64">
            <input
              type="text"
              placeholder="ابحثي عن الكوتور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background-secondary text-xs font-sans font-light py-2.5 pl-8 pr-3 border border-brand-border focus:border-accent outline-none"
            />
            <Search className="w-4 h-4 text-text-secondary/50 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-brand-border text-xs font-sans text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors shrink-0 bg-background-secondary"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>تصفية</span>
          </button>
        </div>

      </section>

      {/* 3. Shop Content Layout */}
      <main className="w-full max-w-[1280px] px-6 md:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 items-start">
          
          {/* Sidebar filters (Solid Panel, No Glassmorphism) */}
          {showFilters && (
            <aside className="bg-background-secondary border border-brand-border p-6 flex flex-col gap-6 lg:sticky lg:top-24">
              
              {/* Filter 1: Size list */}
              <div>
                <div className="flex items-center justify-between border-b border-brand-border pb-2 mb-4">
                  <h3 className="font-sans text-xs font-bold text-text-primary">المقاسات المتاحة</h3>
                  {selectedSizes.length > 0 && (
                    <button 
                      onClick={() => setSelectedSizes([])}
                      className="text-[10px] text-text-secondary hover:text-accent font-sans underline underline-offset-2"
                    >
                      مسح
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((sz) => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSizes(selectedSizes.filter(s => s !== sz));
                          } else {
                            setSelectedSizes([...selectedSizes, sz]);
                          }
                        }}
                        className={`min-w-[40px] text-xs px-3 py-1.5 border transition-all duration-300 font-sans ${
                          isSelected 
                            ? "border-accent bg-accent text-white font-semibold shadow-sm" 
                            : "border-brand-border text-text-secondary bg-background-primary hover:border-accent/50 hover:text-accent"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter 2: Price range limits */}
              <div>
                <h3 className="font-sans text-xs font-bold text-text-primary border-b border-brand-border pb-2 mb-3">نطاق السعر (ج.م)</h3>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    placeholder="من"
                    value={priceRange.min || ""}
                    onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                    className="w-full bg-background-primary border border-brand-border text-xs p-2.5 outline-none focus:border-accent font-display"
                  />
                  <span className="text-xs font-sans text-text-secondary">إلى</span>
                  <input
                    type="number"
                    placeholder="إلى"
                    value={priceRange.max || ""}
                    onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                    className="w-full bg-background-primary border border-brand-border text-xs p-2.5 outline-none focus:border-accent font-display"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCategory("الكل");
                  setPriceRange({ min: 0, max: 10000 });
                  setSearchQuery("");
                  setSelectedSizes([]);
                }}
                className="w-full py-2.5 border border-accent text-[10px] uppercase text-accent hover:bg-accent hover:text-background-secondary transition-colors font-sans font-bold text-center mt-2"
              >
                إعادة ضبط الفلاتر
              </button>

            </aside>
          )}

          {/* Product grid - Spacers/Layout consistent */}
          <div className="flex-grow w-full">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-background-secondary border border-brand-border">
                <p className="font-sans text-lg font-light text-text-primary">لا توجد قطع تتطابق مع الفلاتر المحددة</p>
                <p className="text-xs text-text-secondary font-sans font-light mt-1">تأكدي من تغيير شروط البحث أو التهيئة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* Loop products */}
                {filteredProducts.map((product) => {
                  return (
                    <div key={product.id} className="col-span-1">
                      <ProductCard
                        id={product.id}
                        title={product.title}
                        price={product.price}
                        image={product.image}
                        hoverImage={product.hoverImage}
                        collection={product.collection}
                        variants={product.variants}
                      />
                    </div>
                  );
                })}

              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}



export default function ShopPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Skeleton className="w-12 h-12 rounded-full" /></div>}>
      <ShopContent />
    </Suspense>
  );
}
