"use client";

import React, { useState, use, useEffect } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Check, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useNotification } from "@/context/NotificationContext";
import { mockProducts } from "@/data/products";
import { ProductCard } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { analytics } from "@/utils/analytics";
import Image from "next/image";
import CompleteTheLook from "@/components/product/CompleteTheLook";
import SizeRecommendation from "@/components/product/SizeRecommendation";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailClient({ params }: PageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const { showNotification } = useNotification();

  const product = mockProducts.find((p) => p.id === id);

  // States
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImage, setActiveImage] = useState(product?.image || "");
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const { addViewedItem } = useRecentlyViewed();

  useEffect(() => {
    if (product) {
      analytics.trackProductView(product.id, product.title, product.price);
      addViewedItem(product.id);
    }
  }, [product, addViewedItem]);

  if (!product) {
    return (
      <div className="max-w-[720px] mx-auto py-24 text-center">
        <h2 className="font-sans text-3xl font-light text-text-primary">القطعة غير متوفرة في الأتيلييه</h2>
        <p className="text-xs text-text-secondary mt-2">يرجى التحقق من الكود أو زيارة المتجر</p>
        <Link href="/shop" className="mt-6 inline-block">
          <Button variant="primary">الرجوع للمتجر الكوتور</Button>
        </Link>
      </div>
    );
  }

  // Find matching variant
  const selectedVariant = product.variants?.find((v) => v.color === selectedColor);

  // Gallery images array (fallback to defaults if no variant is selected)
  const defaultImages = [
    product.image,
    product.hoverImage || product.image,
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
  ];

  const galleryImages = selectedVariant && selectedVariant.images && selectedVariant.images.length > 0
    ? selectedVariant.images
    : defaultImages;

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    const variant = product.variants?.find((v) => v.color === color);
    if (variant && variant.images && variant.images.length > 0) {
      setActiveImage(variant.images[0]);
    }
  };

  const handleAddToBag = () => {
    if (!selectedColor || !selectedSize) {
      showNotification(
        "يرجى اختيار اللون والمقاس قبل إضافة القطعة إلى الحقيبة",
        "warning"
      );
      return;
    }
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: activeImage || product.image,
      size: selectedSize,
      color: selectedColor,
      collection: product.collection,
      variantImages: galleryImages,
    });
    analytics.trackAddToCart(product.id, product.title, product.price, selectedSize, selectedColor, quantity);
    showNotification(
      "تمت إضافة القطعة إلى حقيبتكِ بنجاح",
      "success"
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const wishlisted = isInWishlist(product.id);
  const relatedProducts = mockProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="bg-background-primary min-h-screen pb-20 md:pb-0 flex flex-col items-center">
      
      {/* Breadcrumbs */}
      <nav className="w-full max-w-[1280px] px-6 md:px-12 py-6 text-xs text-text-secondary font-sans font-light flex items-center gap-2 border-b border-brand-border/40">
        <Link href="/">الرئيسية</Link> / 
        <Link href="/shop">المتجر</Link> / 
        <span className="text-text-primary font-medium">{product.title}</span>
      </nav>

      {/* Main product display section */}
      <main className="w-full max-w-[1280px] px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 md:gap-16 items-start">
          
          {/* Right Column: Visual Gallery */}
          <div className="flex gap-4">
            
            {/* Gallery Thumbnails List */}
            <div className="flex flex-col gap-3 w-16 md:w-20 shrink-0">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative aspect-[3/4] border transition-all duration-300 ${
                    activeImage === img ? "border-accent" : "border-brand-border/60 hover:border-text-primary"
                  } bg-background-secondary`}
                >
                  <Image src={img} alt={`عرض مصغر ${idx}`} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>

            {/* Big Main Image Preview */}
            <div className="flex-grow aspect-[3/4] overflow-hidden border border-brand-border/60 bg-background-secondary relative">
              <Image
                key={activeImage || product.image}
                src={activeImage || product.image}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="absolute inset-0 w-full h-full object-cover animate-fade-in"
              />
            </div>

          </div>

          {/* Left Column: Product Option Config Panel - SOLID BACKGROUNDS, NO GLASS */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-24 bg-background-secondary border border-brand-border p-6 md:p-8 w-full text-right" dir="rtl">
            
            <div>
              <span className="text-xs text-accent font-sans font-semibold block mb-1">
                {product.collection}
              </span>
              <h1 className="font-sans text-2xl font-light text-text-primary leading-snug">
                {product.title}
              </h1>
              {product.badge && (
                <span className="inline-block bg-accent text-background-secondary text-[9px] font-sans font-bold px-2 py-0.5 mt-2">
                  {product.badge}
                </span>
              )}
            </div>

            <div className="font-display text-2xl font-semibold text-accent">
              {product.price.toLocaleString()} ج.م
            </div>

            <p className="font-sans text-xs md:text-sm font-light text-text-secondary leading-relaxed">
              {product.description}
            </p>

            {/* Colors Swatch Choice */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-sans font-bold text-text-secondary">
                اللون: {selectedColor || "اختاري اللون"}
              </label>
              <div className="flex gap-3">
                {(product.variants || [
                  { color: "برونزي", value: "#8E6B4B" },
                  { color: "أسود", value: "#111111" },
                  { color: "عاجي", value: "#FAF8F5" }
                ]).map((col) => (
                  <button
                    key={col.color}
                    onClick={() => handleColorSelect(col.color)}
                    className="relative w-8 h-8 rounded-full border transition-all duration-300 bg-background-primary flex items-center justify-center animate-fade-in"
                    style={{
                      borderColor: selectedColor === col.color ? "#8E6B4B" : "#E7E1D8",
                      borderWidth: selectedColor === col.color ? "2px" : "1px",
                      transform: selectedColor === col.color ? "scale(1.05)" : "none",
                    }}
                    title={col.color}
                  >
                    <span
                      className="absolute inset-1 rounded-full border border-black/5 shadow-sm"
                      style={{ backgroundColor: col.value }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes Box Choice */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-sans font-bold text-text-secondary w-full">
                <span>المقاس: {selectedSize || "اختاري المقاس"}</span>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-accent hover:underline text-[10px] font-bold"
                  type="button"
                >
                  دليل المقاسات
                </button>
              </div>
              <div className="flex gap-2">
                {(product.sizes || ["XS", "S", "M", "L", "XL"]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className="text-xs px-4 py-2 border transition-all duration-300 bg-background-primary"
                    style={{
                      borderColor: selectedSize === sz ? "#8E6B4B" : "#E7E1D8",
                      backgroundColor: selectedSize === sz ? "rgba(142, 107, 75, 0.08)" : "transparent",
                      color: selectedSize === sz ? "#8E6B4B" : "#555555",
                      fontWeight: selectedSize === sz ? "bold" : "normal",
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Premium Size Recommendation Form */}
            <SizeRecommendation />

            {/* Quantity select */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-sans font-bold text-text-secondary">الكمية</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-20 bg-background-primary border border-brand-border text-xs p-2 outline-none focus:border-accent text-center font-display"
              />
            </div>

            {/* Add to cart / wishlist actions */}
            <div className="flex gap-4 mt-4 w-full">
              <Button
                variant="primary"
                onClick={handleAddToBag}
                className="flex-grow h-12"
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4 text-background-secondary" />
                    <span>تمت الإضافة لحقيبتكِ</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-background-secondary" />
                    <span>إضافة لحقيبة التسوق</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => toggleWishlist(product)}
                className={`h-12 w-1/3 ${wishlisted ? "border-accent text-accent" : ""}`}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-accent text-accent" : ""}`} />
                <span>المفضلة</span>
              </Button>
            </div>

            {/* Trust Micro-copy below Action buttons */}
            <div className="flex flex-row justify-between items-center text-[10px] text-text-secondary border-t border-b border-brand-border py-3 my-2 font-sans w-full">
              <span className="flex items-center gap-1">✓ صنع بعناية في أتيلييه AURA</span>
              <span className="flex items-center gap-1">✓ خامات مختارة بعناية</span>
              <span className="flex items-center gap-1">✓ استبدال سهل</span>
            </div>

            {/* Collapsible Details */}
            <div className="border-t border-brand-border mt-8">
              <details className="border-b border-brand-border py-4 group" open>
                <summary className="font-sans text-xs font-bold text-text-primary flex justify-between items-center cursor-pointer list-none">
                  <span>تفاصيل المنسوجات والأثر</span>
                  <span className="text-accent group-open:rotate-180 transition-transform duration-300">↓</span>
                </summary>
                <div className="text-xs text-text-secondary font-light mt-3 flex flex-col gap-2 leading-relaxed">
                  <p>{product.fabric}</p>
                  <ul className="list-disc pr-4 flex flex-col gap-1 mt-2 mb-4">
                    {product.details.map((det, idx) => (
                      <li key={idx}>{det}</li>
                    ))}
                  </ul>
                  <Image src="/aura_clothing_label.png" alt="أتيلييه أورا" width={320} height={160} className="w-full max-w-xs border border-brand-border mt-2" />
                </div>
              </details>

              <details className="border-b border-brand-border py-4 group">
                <summary className="font-sans text-xs font-bold text-text-primary flex justify-between items-center cursor-pointer list-none">
                  <span>التغليف الفاخر والشحن</span>
                  <span className="text-accent group-open:rotate-180 transition-transform duration-300">↓</span>
                </summary>
                <div className="text-xs text-text-secondary font-light mt-3 leading-relaxed">
                  <p>{product.packaging}</p>
                  <p className="mt-2 mb-4 text-accent">شحن سريع ومؤمن خلال 2-5 أيام عمل لجميع محافظات مصر.</p>
                  <Image src="/aura_packaging_mockup.png" alt="علبة أورا الفاخرة" width={320} height={160} className="w-full max-w-xs border border-brand-border mt-2" />
                </div>
              </details>
            </div>

          </div>

        </div>
      </main>

      {/* Related Products Grid */}
      <section className="w-full bg-background-secondary border-t border-brand-border py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <span className="font-sans text-xs text-accent font-bold uppercase">اختيارات منسقة لكِ</span>
            <h2 className="font-sans text-2xl md:text-3xl font-light text-text-primary mt-1">
              قد يعجبكِ أيضاً
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                id={rel.id}
                title={rel.title}
                price={rel.price}
                image={rel.image}
                hoverImage={rel.hoverImage}
                collection={rel.collection}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Complete The Look Section */}
      <CompleteTheLook currentProduct={product} />

      {/* Recently Viewed Section */}
      <RecentlyViewed />

      {/* STICKY BOTTOM PURCHASE PANEL - Solid Background, No Blur */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 h-16 bg-background-secondary border-t border-brand-border z-30 flex items-center shadow-md">
        <div className="max-w-[1280px] mx-auto w-full px-6 md:px-12 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-12 shrink-0 border border-brand-border bg-background-primary">
              <Image src={product.image} alt="" fill sizes="40px" className="object-cover" />
            </div>
            <div className="hidden sm:block">
              <h5 className="font-sans text-xs font-bold truncate max-w-xs">{product.title}</h5>
              <span className="text-[10px] text-text-secondary font-light">المقاس: {selectedSize || "لم يحدد"} | اللون: {selectedColor || "لم يحدد"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-display text-sm text-accent font-semibold">{product.price.toLocaleString()} ج.م</span>
            <Button
              variant="primary"
              onClick={handleAddToBag}
              className="h-10 px-6 text-[10px]"
            >
              {isAdded ? "تمت الإضافة" : "أضيفي للحقيبة"}
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Size Guide Drawer Modal - Premium AURA Aesthetics */}
      <AnimatePresence>
        {isSizeGuideOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeGuideOpen(false)}
              className="fixed inset-0 bg-text-primary/45 z-[999]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-6 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-[500px] sm:h-auto bg-background-secondary border border-brand-border z-[1000] p-6 flex flex-col gap-6 text-right"
              dir="rtl"
            >
              <div className="flex justify-between items-center border-b border-brand-border pb-4">
                <h3 className="font-sans text-lg font-bold text-text-primary">دليل مقاسات أورا كوتور</h3>
                <button
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="p-1 hover:text-accent transition-colors"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border bg-background-primary">
                      <th className="py-2 px-3 text-right text-text-primary font-bold">المقاس</th>
                      <th className="py-2 px-3 text-right text-text-primary font-bold">الصدر (سم)</th>
                      <th className="py-2 px-3 text-right text-text-primary font-bold">الخصر (سم)</th>
                      <th className="py-2 px-3 text-right text-text-primary font-bold">الورك (سم)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-brand-border/60">
                      <td className="py-2.5 px-3 font-semibold text-accent">XS</td>
                      <td className="py-2.5 px-3 text-text-secondary">80-84</td>
                      <td className="py-2.5 px-3 text-text-secondary">60-64</td>
                      <td className="py-2.5 px-3 text-text-secondary">86-90</td>
                    </tr>
                    <tr className="border-b border-brand-border/60">
                      <td className="py-2.5 px-3 font-semibold text-accent">S</td>
                      <td className="py-2.5 px-3 text-text-secondary">84-88</td>
                      <td className="py-2.5 px-3 text-text-secondary">64-68</td>
                      <td className="py-2.5 px-3 text-text-secondary">90-94</td>
                    </tr>
                    <tr className="border-b border-brand-border/60">
                      <td className="py-2.5 px-3 font-semibold text-accent">M</td>
                      <td className="py-2.5 px-3 text-text-secondary">88-92</td>
                      <td className="py-2.5 px-3 text-text-secondary">68-72</td>
                      <td className="py-2.5 px-3 text-text-secondary">94-98</td>
                    </tr>
                    <tr className="border-b border-brand-border/60">
                      <td className="py-2.5 px-3 font-semibold text-accent">L</td>
                      <td className="py-2.5 px-3 text-text-secondary">92-96</td>
                      <td className="py-2.5 px-3 text-text-secondary">72-76</td>
                      <td className="py-2.5 px-3 text-text-secondary">98-102</td>
                    </tr>
                    <tr className="border-b border-brand-border/60">
                      <td className="py-2.5 px-3 font-semibold text-accent">XL</td>
                      <td className="py-2.5 px-3 text-text-secondary">96-100</td>
                      <td className="py-2.5 px-3 text-text-secondary">76-80</td>
                      <td className="py-2.5 px-3 text-text-secondary">102-106</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-background-primary p-3 border border-brand-border text-[10px] text-text-secondary leading-relaxed">
                * جميع المقاسات أعلاه بالسنتمتر. في حال رغبتكِ بضبط القياسات الفردية بدقة، سيتواصل معكِ خياطو الأتيلييه عبر الواتساب فور استلام الطلب لتسجيل أبعاد قوامكِ الدقيقة.
              </div>

              <Button
                variant="primary"
                onClick={() => setIsSizeGuideOpen(false)}
                className="w-full h-10 mt-2"
              >
                موافق
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
