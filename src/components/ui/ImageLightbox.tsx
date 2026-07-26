"use client";

import { useEffect } from "react";
import Image from "next/image";
import { IconX, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface ImageLightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

/** Minimal shared full-screen image viewer — used by both the storefront review gallery and the admin review detail modal. */
export function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [index, images.length, onClose, onIndexChange]);

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 left-5 text-white/80 hover:text-white transition-colors"
        aria-label="إغلاق"
      >
        <IconX size={26} />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
          className="absolute right-4 md:right-10 text-white/70 hover:text-white transition-colors"
          aria-label="السابقة"
        >
          <IconChevronRight size={32} />
        </button>
      )}

      <div className="relative w-full max-w-3xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <Image src={images[index]} alt="" fill sizes="90vw" className="object-contain" />
      </div>

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % images.length);
          }}
          className="absolute left-4 md:left-10 text-white/70 hover:text-white transition-colors"
          aria-label="التالية"
        >
          <IconChevronLeft size={32} />
        </button>
      )}
    </div>
  );
}
