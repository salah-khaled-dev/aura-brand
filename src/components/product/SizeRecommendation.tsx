"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

export default function SizeRecommendation() {
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [fit, setFit] = useState<"ضيق" | "عادي" | "واسع">("عادي");
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!height || !weight) return;

    setIsCalculating(true);
    setRecommendedSize(null);

    // Simple pseudo-algorithm for luxury sizing
    setTimeout(() => {
      const h = parseInt(height);
      const w = parseInt(weight);
      
      let size = "M"; // default

      if (w < 50 || (h < 160 && w < 55)) size = "XS";
      else if (w >= 50 && w < 60) size = "S";
      else if (w >= 60 && w < 72) size = "M";
      else if (w >= 72 && w < 85) size = "L";
      else size = "XL";

      // Adjust based on fit preference
      if (fit === "ضيق") {
        if (size === "S") size = "XS";
        if (size === "M") size = "S";
        if (size === "L") size = "M";
        if (size === "XL") size = "L";
      } else if (fit === "واسع") {
        if (size === "XS") size = "S";
        if (size === "S") size = "M";
        if (size === "M") size = "L";
        if (size === "L") size = "XL";
      }

      setRecommendedSize(size);
      setIsCalculating(false);
    }, 800);
  };

  return (
    <div className="w-full bg-background-primary border border-brand-border p-6 mt-8 shadow-sm" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-6 h-[1px] bg-accent/40 block"></span>
        <h3 className="font-sans text-base font-bold text-text-primary uppercase tracking-wide">
          مساعد المقاس
        </h3>
      </div>

      <form onSubmit={calculateSize} className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-[10px] font-sans font-bold text-text-secondary">الطول (سم)</label>
            <input
              type="number"
              min="140"
              max="200"
              required
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full bg-background-secondary border border-brand-border/60 text-xs p-3 outline-none focus:border-accent text-right font-display transition-colors"
              placeholder="مثال: 165"
            />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-[10px] font-sans font-bold text-text-secondary">الوزن (كجم)</label>
            <input
              type="number"
              min="40"
              max="150"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-background-secondary border border-brand-border/60 text-xs p-3 outline-none focus:border-accent text-right font-display transition-colors"
              placeholder="مثال: 60"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-sans font-bold text-text-secondary">القياس المفضل</label>
          <div className="flex gap-3">
            {(["ضيق", "عادي", "واسع"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFit(option)}
                className={`flex-1 py-2 text-xs font-sans transition-all duration-300 border ${
                  fit === option 
                    ? "border-accent bg-accent/5 text-accent font-bold" 
                    : "border-brand-border/60 text-text-secondary hover:border-text-primary/40"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <Button 
          type="submit" 
          variant="dark-outline" 
          className="w-full h-12 mt-2"
          disabled={isCalculating}
        >
          {isCalculating ? "جاري الحساب..." : "اعرفي مقاسك"}
        </Button>
      </form>

      <AnimatePresence>
        {recommendedSize && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="bg-accent/5 border border-accent/20 p-5 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <span className="text-[10px] text-text-secondary font-sans uppercase mb-1">المقاس المقترح لكِ</span>
            <span className="font-display text-4xl text-accent font-bold my-2">{recommendedSize}</span>
            <span className="text-[10px] font-light text-text-secondary/80 flex items-center gap-1">
              ✓ هذا المقاس مقترح بناءً على البيانات المدخلة
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
