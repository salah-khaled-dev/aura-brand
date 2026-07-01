"use client";

import React, { useState } from "react";
import { IconPhoto, IconX, IconUpload } from "@tabler/icons-react";
import { cn } from "@/utils/cn";

const GALLERY_IMAGES = [
  { src: "/images/campaign/campaign_1.png",  label: "حملة 1" },
  { src: "/images/campaign/campaign_2.png",  label: "حملة 2" },
  { src: "/images/campaign/campaign_3.png",  label: "حملة 3" },
  { src: "/images/campaign/campaign_4.png",  label: "حملة 4" },
  { src: "/images/campaign/campaign_5.png",  label: "حملة 5" },
  { src: "/images/campaign/campaign_6.png",  label: "حملة 6" },
  { src: "/images/flatlay/flatlay_1.png",    label: "فلات لاي 1" },
  { src: "/images/flatlay/flatlay_2.png",    label: "فلات لاي 2" },
  { src: "/images/detail/detail_fabric.png", label: "تفصيل القماش" },
  { src: "/images/lifestyle/lifestyle_interior.png", label: "لايف ستايل" },
  { src: "/images/products/product_evening_gown.png", label: "فستان سهرة" },
  { src: "/images/products/product_linen_set.png",    label: "طقم كتان" },
  { src: "/images/products/product_silk_blouse.png",  label: "بلوزة حرير" },
  { src: "/images/products/product_winter_coat.png",  label: "معطف شتاء" },
  { src: "/aura_hero_campaign.png",          label: "Hero Campaign" },
  { src: "/aura_packaging_mockup.png",       label: "التغليف" },
  { src: "/aura-logo.png",                   label: "شعار أورا" },
  { src: "/logo.svg",                        label: "SVG الشعار" },
];

interface MediaPickerFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function MediaPickerField({ label, value, onChange, className }: MediaPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState("");

  const inputCls =
    "flex-1 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] px-3 py-2 text-sm text-[var(--admin-text-base)] outline-none focus:border-[var(--admin-primary)] transition-colors";
  const labelCls = "block text-xs font-semibold text-[var(--admin-text-muted)] mb-1";

  return (
    <div className={className}>
      {label && <label className={labelCls}>{label}</label>}

      <div className="flex items-center gap-2">
        {/* Thumbnail preview */}
        <div className="w-10 h-10 shrink-0 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <IconPhoto size={16} className="text-[var(--admin-text-subtle)]" />
          )}
        </div>

        {/* URL text input */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
          dir="ltr"
          placeholder="/images/..."
        />

        {/* Browse button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--admin-text-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-elevated)] hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary)] transition-colors"
        >
          <IconPhoto size={14} />
          اختر
        </button>

        {/* Clear */}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 p-2 text-[var(--admin-text-subtle)] hover:text-[var(--admin-danger)] rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-danger)]/10 transition-colors"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col bg-[var(--admin-bg-surface)] rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-lg)] border border-[var(--admin-border-base)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-border-light)] shrink-0">
              <div className="flex items-center gap-2">
                <IconPhoto size={18} className="text-[var(--admin-primary)]" />
                <h2 className="font-bold text-sm text-[var(--admin-text-base)]">مكتبة الوسائط</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-bg-hover)] text-[var(--admin-text-muted)]"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Image gallery */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-3">
                الصور المتاحة في المشروع
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {GALLERY_IMAGES.map(img => (
                  <button
                    key={img.src}
                    type="button"
                    onClick={() => { onChange(img.src); setOpen(false); }}
                    className={cn(
                      "relative group aspect-square rounded-[var(--admin-radius-md)] overflow-hidden border-2 transition-all",
                      value === img.src
                        ? "border-[var(--admin-primary)] shadow-[0_0_0_2px_var(--admin-primary)]/20"
                        : "border-[var(--admin-border-base)] hover:border-[var(--admin-primary)]"
                    )}
                    title={img.label}
                  >
                    <img src={img.src} alt={img.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {value === img.src && (
                      <div className="absolute inset-0 bg-[var(--admin-primary)]/20 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-[var(--admin-primary)] rounded-full px-2 py-0.5">✓</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate text-center">
                      {img.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL input */}
            <div className="shrink-0 border-t border-[var(--admin-border-light)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--admin-text-muted)]">أو أدخلي رابطاً مخصصاً</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://... أو /path/to/image.png"
                  className={inputCls + " flex-1"}
                  dir="ltr"
                  onKeyDown={e => {
                    if (e.key === "Enter" && customUrl.trim()) {
                      onChange(customUrl.trim());
                      setOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!customUrl.trim()}
                  onClick={() => { if (customUrl.trim()) { onChange(customUrl.trim()); setOpen(false); } }}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[var(--admin-primary)] text-white rounded-[var(--admin-radius-md)] disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <IconUpload size={14} />
                  استخدام
                </button>
              </div>
              <p className="text-[10px] text-[var(--admin-text-subtle)]">
                رفع الصور من الجهاز متاح بعد دمج Supabase Storage
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
