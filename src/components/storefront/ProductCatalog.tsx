"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ui/Card";
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts";
import { primaryImage, discountOriginalPrice, resolveStockStatus } from "@/data/mock/products";
import { IconSearch as Search, IconAdjustmentsHorizontal as SlidersHorizontal, IconChevronRight, IconChevronLeft } from "@tabler/icons-react";
import CollectionHero from "@/components/ui/CollectionHero";
import { Skeleton, ProductCardSkeleton } from "@/components/ui/Skeleton";

type CategoryLabel = "الكل" | "أزياء الشتاء" | "أزياء الصيف";

interface ProductCatalogProps {
  /** Locks the initial category to a season (used by the dedicated season pages).
   * Users can still switch tabs to browse other categories, matching /shop behavior. */
  lockedSeason?: "summer" | "winter";
}

function seasonToCategory(season?: "summer" | "winter"): CategoryLabel {
  if (season === "summer") return "أزياء الصيف";
  if (season === "winter") return "أزياء الشتاء";
  return "الكل";
}

function ProductCatalogContent({ lockedSeason }: ProductCatalogProps) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const { products, loading } = useStorefrontProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryLabel>(seasonToCategory(lockedSeason));
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const categories: CategoryLabel[] = ["الكل", "أزياء الشتاء", "أزياء الصيف"];
  const sizes = ["XS", "S", "M", "L", "XL"];
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (categoryParam === "winter") {
      setSelectedCategory("أزياء الشتاء");
    } else if (categoryParam === "summer") {
      setSelectedCategory("أزياء الصيف");
    } else if (!lockedSeason) {
      setSelectedCategory("الكل");
    }
  }, [categoryParam, lockedSeason]);

  // Filter items dynamically
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search matching
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.collection.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "الكل" ||
        (selectedCategory === "أزياء الصيف" && product.season === "summer") ||
        (selectedCategory === "أزياء الشتاء" && product.season === "winter");

      // Price matching
      const matchesPrice =
        product.price >= priceRange.min && product.price <= priceRange.max;

      // Size matching
      const matchesSize =
        selectedSizes.length === 0 || (product.sizes && product.sizes.some(s => selectedSizes.includes(s)));

      return matchesSearch && matchesCategory && matchesPrice && matchesSize;
    });
  }, [products, searchQuery, selectedCategory, priceRange, selectedSizes]);

  const sortedProducts = useMemo(() => {
    if (sortBy === "price_asc") {
      return [...filteredProducts].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price_desc") {
      return [...filteredProducts].sort((a, b) => b.price - a.price);
    }
    // "newest" — mock catalog order is already newest-first
    return filteredProducts;
  }, [filteredProducts, sortBy]);

  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, priceRange, selectedSizes, sortBy]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center w-full">

      {/* Dynamic Hero Section */}
      {selectedCategory === "أزياء الشتاء" ? (
        <div className="w-full">
          <CollectionHero
            title="تشكيلة الشتاء الفاخرة"
            description="دفء وأناقة في تصاميم شتوية راقية تعكس فخامة دار أورا."
            imageSrc="/images/campaign/campaign_3.png"
          />
        </div>
      ) : selectedCategory === "أزياء الصيف" ? (
        <div className="w-full">
          <CollectionHero
            title="أزياء الصيف المنعشة"
            description="تصاميم صيفية حصرية بأقمشة مسامية خفيفة تمنحكِ الراحة والتميز."
            imageSrc="/images/campaign/campaign_2.png"
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
              استكشفي أزياء أورا الفاخرة المنسوجة يدوياً في أتيلييه الجيزة، مصر. تصاميم حصرية تُصاغ لتعكس جوهر الأنوثة العصرية بأعداد محدودة.
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
              className={`px-4 py-1.5 font-sans text-xs transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary ${
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
        <div className="flex items-center flex-wrap gap-3 md:gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0 w-full md:w-64">
            <input
              type="text"
              placeholder="ابحثي عن الكوتور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background-secondary text-xs font-sans font-light py-2.5 ps-8 pe-3 border border-brand-border focus:border-accent outline-none"
            />
            <Search className="w-4 h-4 text-text-secondary/50 absolute start-3 top-1/2 -translate-y-1/2" />
          </div>

          <label className="relative shrink-0">
            <span className="sr-only">ترتيب حسب</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none bg-background-secondary text-xs font-sans text-text-secondary border border-brand-border py-2.5 ps-3 pe-8 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              <option value="newest">الأحدث</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
            </select>
          </label>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-brand-border text-xs font-sans text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors shrink-0 bg-background-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>تصفية</span>
          </button>
        </div>

      </section>

      {/* 3. Catalog Content Layout */}
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
                  setSelectedCategory(seasonToCategory(lockedSeason));
                  setPriceRange({ min: 0, max: 10000 });
                  setSearchQuery("");
                  setSelectedSizes([]);
                }}
                className="w-full py-2.5 border border-accent text-[10px] uppercase text-accent hover:bg-accent hover:text-background-secondary transition-colors font-sans font-bold text-center mt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary"
              >
                إعادة ضبط الفلاتر
              </button>

            </aside>
          )}

          {/* Product grid - Spacers/Layout consistent */}
          <div className="flex-grow w-full">
            {loading && sortedProducts.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-20 bg-background-secondary border border-brand-border">
                <p className="font-sans text-lg font-light text-text-primary">لا توجد قطع تتطابق مع الفلاتر المحددة</p>
                <p className="text-xs text-text-secondary font-sans font-light mt-1">تأكدي من تغيير شروط البحث أو التهيئة</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="font-sans text-xs text-text-secondary">
                    {sortedProducts.length.toLocaleString()} قطعة
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Loop products */}
                  {paginatedProducts.map((product, index) => {
                    return (
                      <div key={product.id} className="col-span-1">
                        <ProductCard
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
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                  <nav
                    aria-label="تصفح صفحات المنتجات"
                    className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-brand-border/60"
                  >
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="الصفحة السابقة"
                      className="flex items-center justify-center w-9 h-9 border border-brand-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <IconChevronRight className="w-4 h-4" />
                    </button>

                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        aria-current={p === currentPage ? "page" : undefined}
                        className={`min-w-[36px] h-9 px-2 text-xs font-sans transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          p === currentPage
                            ? "bg-text-primary text-background-secondary font-semibold"
                            : "border border-brand-border text-text-secondary hover:text-text-primary hover:border-text-primary"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                      disabled={currentPage === pageCount}
                      aria-label="الصفحة التالية"
                      className="flex items-center justify-center w-9 h-9 border border-brand-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <IconChevronLeft className="w-4 h-4" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default function ProductCatalog({ lockedSeason }: ProductCatalogProps) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Skeleton className="w-12 h-12 rounded-full" /></div>}>
      <ProductCatalogContent lockedSeason={lockedSeason} />
    </Suspense>
  );
}
