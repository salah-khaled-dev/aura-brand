"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Product } from "@/data/products";
import Link from "next/link";
import { ShoppingBag, Eye } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { AnimatedHeart } from "@/components/ui/AnimatedIcon";
import { useNotification } from "@/context/NotificationContext";

interface SeasonalProductGridProps {
  products: Product[];
}

export default function SeasonalProductGrid({ products }: SeasonalProductGridProps) {
  const { addToCart, toggleWishlist, setCartOpen, isInWishlist } = useStore();
  const { showNotification } = useNotification();

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    // Default to first size and color
    const size = product.sizes?.[0] || "";
    const color = product.colors?.[0] || "";
    addToCart({ ...product, size, color });
    setCartOpen(true);
    showNotification("تمت الإضافة إلى حقيبة التسوق", "success");
  };

  const handleWishlist = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({ 
      id: product.id, 
      title: product.title, 
      price: product.price, 
      image: product.image, 
      collection: product.collection 
    });
  };

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
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "50px" }}
            transition={{ duration: 0.7, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="group flex flex-col"
          >
            {/* Image Container */}
            <Link href={`/product/${product.id}`} className="relative aspect-[3/4] w-full overflow-hidden bg-[#FAF8F5] mb-5 flex-shrink-0">
              {/* Badges */}
              {product.badge && (
                <div className="absolute top-3 right-3 z-20 bg-background-primary text-text-primary text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-1 shadow-sm">
                  {product.badge}
                </div>
              )}
              
              {/* Wishlist Button */}
              <div
                onClick={(e) => handleWishlist(e, product)}
                className="absolute top-3 left-3 z-20 p-2 rounded-full bg-background-primary/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background-primary shadow-sm cursor-pointer"
                aria-label="إضافة للمفضلة"
                role="button"
                tabIndex={0}
              >
                <AnimatedHeart active={isInWishlist(product.id)} size="sm" />
              </div>

              {/* Main Image */}
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-1000 ease-[0.25,0.1,0.25,1] group-hover:scale-105"
              />
              
              {/* Hover Image */}
              {product.hoverImage && (
                <Image
                  src={product.hoverImage}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-opacity duration-700 ease-[0.25,0.1,0.25,1] opacity-0 group-hover:opacity-100"
                />
              )}

              {/* Overlay Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex justify-center gap-3">
                <div
                  onClick={(e) => handleAddToCart(e, product)}
                  className="bg-background-primary text-text-primary w-10 h-10 flex items-center justify-center hover:bg-accent hover:text-white transition-colors duration-300 shadow-lg cursor-pointer"
                  aria-label="إضافة للسلة"
                  role="button"
                  tabIndex={0}
                >
                  <ShoppingBag className="w-[18px] h-[18px]" />
                </div>
                <div className="bg-background-primary text-text-primary w-10 h-10 flex items-center justify-center hover:bg-accent hover:text-white transition-colors duration-300 shadow-lg cursor-pointer">
                  <Eye className="w-[18px] h-[18px]" />
                </div>
              </div>
            </Link>

            {/* Product Info */}
            <div className="flex flex-col flex-grow text-right" dir="rtl">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary/70 mb-2">
                {product.collection}
              </span>
              <Link href={`/product/${product.id}`} className="flex-grow">
                <h3 className="font-serif text-base font-light text-text-primary leading-snug group-hover:text-accent transition-colors duration-300 line-clamp-2">
                  {product.title}
                </h3>
              </Link>
              <div className="mt-3 font-display text-sm font-semibold text-[#4A3728]">
                {product.price.toLocaleString()} ج.م
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
