"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useNotification } from "@/context/NotificationContext";
import { motion } from "framer-motion";
import { ProductColorVariant } from "@/data/products";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  hoverImage?: string;
  collection?: string;
  variants?: ProductColorVariant[];
}

export const ProductCard = React.memo(function ProductCard({
  id,
  title,
  price,
  image,
  hoverImage,
  collection,
  variants,
}: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useStore();
  const { showNotification } = useNotification();
  const router = useRouter();
  const wishlisted = isInWishlist(id);
  const [currentImage, setCurrentImage] = useState(image);

  useEffect(() => {
    setCurrentImage(image);
  }, [image]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showNotification(
      "يرجى اختيار اللون والمقاس قبل إضافة القطعة إلى الحقيبة",
      "warning"
    );
    router.push(`/product/${id}`);
  };

  const activeVariant = variants?.find((v) => v.images[0] === currentImage);
  const cardHoverImage = activeVariant && activeVariant.images.length > 1
    ? activeVariant.images[1]
    : hoverImage;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "200px" }}
      transition={{ duration: 0.6 }}
      className="group relative flex flex-col w-full bg-transparent cursor-pointer"
    >
      {/* 1. Large Image Frame - Image Dominates */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-background-secondary border border-brand-border/40">
        
        {/* Catalog Image Swapper */}
        <Link href={`/product/${id}`} className="block w-full h-full relative">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 w-full h-full overflow-hidden"
          >
            <Image
              src={currentImage}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
          </motion.div>
          {cardHoverImage && (
            <div className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-[800ms] ease-out group-hover:opacity-100 overflow-hidden">
              <Image
                src={cardHoverImage}
                alt={`${title} - عرض بديل`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
            </div>
          )}
        </Link>

        {/* Hover quick add overlay - Solid Background, No Glassmorphism */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-text-primary flex flex-col gap-2 z-10">
          <div className="flex justify-between items-center text-[10px] text-background-secondary font-sans">
            <span>المقاسات المتوفرة: XS, S, M, L, XL</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist({ id, title, price, image, collection });
              }}
              className="text-background-secondary hover:text-accent transition-colors"
              title="أضيفي للمفضلة"
            >
              <Heart className={`w-4 h-4 stroke-[1.5] ${wishlisted ? "fill-accent text-accent" : "text-background-secondary"}`} />
            </button>
          </div>
          <button
            onClick={handleQuickAdd}
            className="w-full bg-background-secondary text-text-primary text-[10px] font-sans font-semibold py-2.5 hover:bg-accent hover:text-background-secondary transition-colors text-center"
          >
            إضافة سريعة +
          </button>
        </div>
      </div>

      {/* 2. Details Pane - Minimal Editorial Typography */}
      <div className="pt-4 flex flex-col items-start gap-1 w-full">
        <h3 className="font-sans text-xs text-text-primary hover:text-accent font-medium transition-colors leading-snug">
          <Link href={`/product/${id}`}>
            {title}
          </Link>
        </h3>
        <div className="flex justify-between items-center w-full mt-0.5">
          <span className="font-display text-xs text-text-secondary font-medium">
            {price.toLocaleString()} ج.م
          </span>
          {variants && variants.length > 0 && (
            <div className="flex gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              {variants.map((v) => (
                <button
                  key={v.color}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImage(v.images[0]);
                  }}
                  className="w-3.5 h-3.5 rounded-full border transition-all duration-300 bg-background-primary flex items-center justify-center cursor-pointer"
                  style={{
                    borderColor: currentImage === v.images[0] ? "#8E6B4B" : "#E7E1D8",
                    borderWidth: currentImage === v.images[0] ? "1.5px" : "1px",
                    transform: currentImage === v.images[0] ? "scale(1.08)" : "none",
                  }}
                  title={v.color}
                >
                  <span
                    className="w-2 h-2 rounded-full border border-black/5"
                    style={{ backgroundColor: v.value }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

interface StoryCardProps {
  title: string;
  description: string;
  image: string;
  tag?: string;
  reversed?: boolean;
}

export const StoryCard = React.memo(function StoryCard({ title, description, image, tag, reversed = false }: StoryCardProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center ${reversed ? "md:flex-row-reverse" : ""}`}>
      {/* Image frame */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.8 }}
        className={`relative ${reversed ? "md:order-2" : ""}`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-border">
          <Image 
            src={image} 
            alt={title} 
            fill 
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover" 
          />
        </div>
      </motion.div>

      {/* Text frame - Premium Spacing */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`flex flex-col items-start gap-4 max-w-[500px] ${reversed ? "md:order-1" : ""}`}
      >
        {tag && (
          <span className="font-sans text-[10px] text-accent font-bold uppercase">
            {tag}
          </span>
        )}
        <h3 className="font-display text-3xl font-semibold leading-tight text-text-primary">
          {title}
        </h3>
        <p className="font-sans text-sm font-light text-text-secondary leading-relaxed">
          {description}
        </p>
      </motion.div>
    </div>
  );
});

