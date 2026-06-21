"use client";

import React from "react";
import { ProductCard } from "@/components/ui/Card";
import { Product, mockProducts } from "@/data/products";
import { motion } from "framer-motion";

interface CompleteTheLookProps {
  currentProduct: Product;
}

export default function CompleteTheLook({ currentProduct }: CompleteTheLookProps) {
  // Logic to determine matching categories based on current product collection
  const getMatchingCategories = () => {
    const col = currentProduct.collection || "";
    
    // Dresses -> Bags, Heels, Jewelry
    if (col.includes("فستان") || col.includes("فساتين") || col.includes("المساء")) {
      return ["حقائب", "أحذية", "مجوهرات"];
    }
    // Sets -> Handbags, Jewelry
    if (col.includes("طقم") || col.includes("أطقم")) {
      return ["حقائب", "مجوهرات"];
    }
    // Blazers / Coats -> Pants, Bags
    if (col.includes("بليزر") || col.includes("معطف") || col.includes("شتاء")) {
      return ["بنطلونات", "حقائب"];
    }
    // Default fallback (Shirts, Pants, etc.)
    return ["حقائب", "مجوهرات", "أحذية"];
  };

  const matchingCategories = getMatchingCategories();

  // Find products that match the categories AND are not the current product
  const recommendedProducts = mockProducts
    .filter((p) => p.id !== currentProduct.id && matchingCategories.some(c => p.collection.includes(c)))
    .slice(0, 4);

  // If no specific recommendations are found, don't show the section or fallback to random
  if (recommendedProducts.length === 0) return null;

  return (
    <section className="w-full bg-background-primary border-t border-brand-border py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="font-sans text-xs text-accent font-bold uppercase block mb-2">
            اختيارات منسقة خصيصاً لكِ
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-light text-text-primary">
            أكملي إطلالتك
          </h2>
        </motion.div>

        {/* Mobile: Horizontal scroll, Desktop: Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex overflow-x-auto md:grid md:grid-cols-4 gap-6 pb-8 md:pb-0 hide-scrollbar"
        >
          {recommendedProducts.map((product) => (
            <div key={product.id} className="min-w-[260px] md:min-w-0 flex-shrink-0">
              <ProductCard
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                hoverImage={product.hoverImage}
                collection={product.collection}
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
