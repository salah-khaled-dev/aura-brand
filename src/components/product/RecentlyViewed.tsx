"use client";

import React, { useEffect, useState } from "react";
import { ProductCard } from "@/components/ui/Card";
import { useStorefrontProducts } from "@/hooks/useStorefrontProducts";
import { primaryImage, discountOriginalPrice, resolveStockStatus } from "@/data/mock/products";
import { motion } from "framer-motion";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

export default function RecentlyViewed() {
  const { viewedIds } = useRecentlyViewed();
  const { products } = useStorefrontProducts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
       
      setMounted(true);
    }
    return () => { isMounted = false; };
  }, []);

  if (!mounted) return null;
  if (viewedIds.length === 0) return null;

  // Map IDs to actual products, filtering out any that might have been deleted
  const viewedProducts = viewedIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean); // removes undefined

  if (viewedProducts.length === 0) return null;

  return (
    <section className="w-full bg-background-secondary border-t border-brand-border py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="font-sans text-xs text-accent font-bold uppercase block mb-2">
            سجل التصفح
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
            شاهدتي مؤخراً
          </h2>
        </motion.div>

        {/* Mobile: Horizontal scroll, Desktop: Grid/Carousel */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex overflow-x-auto md:grid md:grid-cols-4 gap-6 pb-8 md:pb-0 hide-scrollbar"
        >
          {viewedProducts.map((product, index) => product && (
            <div key={product.id} className="min-w-[260px] md:min-w-0 flex-shrink-0">
              <ProductCard
                id={product.id}
                title={product.name}
                price={product.price}
                originalPrice={discountOriginalPrice(product)}
                image={primaryImage(product)}
                hoverImage={product.hoverImage}
                collection={product.collection}
                badge={product.badge}
                stockStatus={resolveStockStatus(product)}
                index={index}
              />
            </div>
          ))}
        </motion.div>
      </div>
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
