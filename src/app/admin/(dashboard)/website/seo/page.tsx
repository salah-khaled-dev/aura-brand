"use client";

import React, { useState, useEffect } from "react";
import { IconDeviceFloppy, IconBrandGoogle, IconPhoto } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/design-system/Button";
import { FadeIn } from "@/components/admin/ui/motion";
import { SEOService, SEOSettings, SEOPage } from "@/lib/services/storefront/seo.service";

const PAGES: { key: SEOPage; label: string }[] = [
  { key: 'global',    label: 'عام'         },
  { key: 'homepage',  label: 'الرئيسية'    },
  { key: 'shop',      label: 'المتجر'      },
  { key: 'about',     label: 'الأتيليه'    },
  { key: 'winter',    label: 'الشتاء'      },
  { key: 'summer',    label: 'الصيف'       },
  { key: 'contact',   label: 'تواصل'       },
  { key: 'tracking',  label: 'التتبع'      },
  { key: 'reviews',   label: 'التقييمات'   },
  { key: 'journal',   label: 'المجلة'      },
];

const EMPTY: SEOSettings = {
  id: '',
  page: 'global',
  title: '',
  description: '',
  keywords: '',
  ogImage: '',
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
  jsonLd: true,
};

export default function SEOManager() {
  const [allSEO, setAllSEO] = useState<SEOSettings[]>([]);
  const [activePage, setActivePage] = useState<SEOPage>('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    SEOService.getAll()
      .then(setAllSEO)
      .catch(() => toast.error("تعذّر تحميل إعدادات SEO"))
      .finally(() => setLoading(false));
  }, []);

  const currentSEO: SEOSettings =
    allSEO.find(s => s.page === activePage) ??
    { ...EMPTY, id: `seo-${activePage}`, page: activePage };

  const updateField = <K extends keyof SEOSettings>(field: K, value: SEOSettings[K]) => {
    const updated = { ...currentSEO, [field]: value };
    setAllSEO(prev =>
      prev.find(s => s.page === activePage)
        ? prev.map(s => s.page === activePage ? updated : s)
        : [...prev, updated]
    );
  };

  const saveSEO = async () => {
    setSaving(true);
    try {
      await SEOService.update(currentSEO.id || `seo-${activePage}`, currentSEO);
      toast.success("تم حفظ إعدادات SEO");
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const titleLen = currentSEO.title.length;
  const descLen  = currentSEO.description.length;

  if (loading) {
    return <div className="p-8 animate-pulse text-[var(--admin-text-muted)]">جارٍ التحميل...</div>;
  }

  return (
    <FadeIn className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto">

      {/* ── Left: editor ── */}
      <div className="flex-1 space-y-4">
        {/* Save button */}
        <div className="flex items-center justify-end">
          <Button
            variant="primary"
            size="md"
            leftIcon={<IconDeviceFloppy size={18} />}
            onClick={saveSEO}
            loading={saving}
          >
            حفظ الإعدادات
          </Button>
        </div>

        {/* Page tabs */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[var(--admin-border-light)]">
          {PAGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActivePage(key)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap ${
                activePage === key
                  ? "bg-[var(--admin-bg-surface)] text-[var(--admin-primary)] border border-[var(--admin-primary)]"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="bg-[var(--admin-bg-surface)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] p-6 space-y-5">

          {/* Meta Title */}
          <div>
            <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1">عنوان الصفحة (Meta Title)</label>
            <input
              type="text"
              value={currentSEO.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="مثال: AURA | الأزياء المصرية الراقية"
              className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            />
            <p className={`text-xs mt-1 ${titleLen > 60 ? 'text-red-500' : 'text-[var(--admin-text-muted)]'}`}>
              {titleLen}/60 حرف — الموصى به: 50–60
            </p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1">وصف الصفحة (Meta Description)</label>
            <textarea
              value={currentSEO.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
              placeholder="وصف موجز لمحتوى الصفحة..."
              className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)] resize-none"
            />
            <p className={`text-xs mt-1 ${descLen > 160 ? 'text-red-500' : 'text-[var(--admin-text-muted)]'}`}>
              {descLen}/160 حرف — الموصى به: 150–160
            </p>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1">الكلمات المفتاحية (Keywords)</label>
            <input
              type="text"
              value={currentSEO.keywords}
              onChange={e => updateField('keywords', e.target.value)}
              placeholder="أورا, كوتور, أزياء نسائية, ملابس فاخرة"
              className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            />
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1">
              <IconPhoto size={14} className="inline me-1 mb-0.5" />
              صورة المشاركة (OG Image)
            </label>
            <input
              type="text"
              value={currentSEO.ogImage}
              onChange={e => updateField('ogImage', e.target.value)}
              placeholder="/aura_thumbnail.png"
              className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            />
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">المقاس الموصى به: 1200 × 630 بكسل</p>
            {currentSEO.ogImage && (
              <img
                src={currentSEO.ogImage}
                alt="OG preview"
                className="mt-2 h-24 w-auto rounded border border-[var(--admin-border-base)] object-cover"
              />
            )}
          </div>

          {/* Robots + Twitter Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1">Robots Meta</label>
              <select
                value={currentSEO.robots}
                onChange={e => updateField('robots', e.target.value)}
                className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              >
                <option value="index, follow">index, follow</option>
                <option value="noindex, follow">noindex, follow</option>
                <option value="index, nofollow">index, nofollow</option>
                <option value="noindex, nofollow">noindex, nofollow</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1">Twitter Card</label>
              <select
                value={currentSEO.twitterCard}
                onChange={e => updateField('twitterCard', e.target.value as SEOSettings['twitterCard'])}
                className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              >
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
              </select>
            </div>
          </div>

          {/* JSON-LD toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSEO.jsonLd}
              onChange={e => updateField('jsonLd', e.target.checked)}
              className="w-4 h-4 rounded text-[var(--admin-primary)]"
            />
            <span className="text-sm font-bold text-[var(--admin-text-base)]">تضمين JSON-LD Schema</span>
          </label>
        </div>
      </div>

      {/* ── Right: Google SERP preview ── */}
      <div className="w-full md:w-[380px] shrink-0 space-y-4">
        <div className="bg-white border border-gray-200 rounded-[var(--admin-radius-lg)] p-5 shadow-sm font-sans">
          <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm font-medium">
            <IconBrandGoogle size={18} />
            Google SERP Preview
          </div>
          <div className="flex flex-col gap-1 text-left" dir="ltr">
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs shrink-0">A</div>
              <div>
                <p className="text-sm leading-tight font-medium">AURA</p>
                <p className="text-xs text-gray-500 leading-tight">https://aurabrand.com › ...</p>
              </div>
            </div>
            <h3 className="text-[20px] text-[#1a0dab] hover:underline cursor-pointer font-medium leading-snug mt-1 line-clamp-1">
              {currentSEO.title || 'عنوان الصفحة'}
            </h3>
            <p className="text-[14px] text-[#4d5156] line-clamp-2 leading-[1.58]">
              {currentSEO.description || 'أضيفي وصف الصفحة لتظهر هنا كما تبدو في نتائج البحث.'}
            </p>
          </div>
        </div>

        {/* Score badge */}
        <div className="bg-[var(--admin-bg-surface)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] p-4 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            currentSEO.title && currentSEO.description && currentSEO.ogImage
              ? 'bg-green-100 text-green-700'
              : currentSEO.title || currentSEO.description
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-600'
          }`}>
            {currentSEO.title && currentSEO.description && currentSEO.ogImage ? '✓' :
             currentSEO.title || currentSEO.description ? '~' : '!'}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--admin-text-base)]">
              {currentSEO.title && currentSEO.description && currentSEO.ogImage
                ? 'مكتملة' : currentSEO.title || currentSEO.description
                ? 'ناقصة' : 'فارغة'}
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]">
              {!currentSEO.title && 'العنوان مطلوب. '}
              {!currentSEO.description && 'الوصف مطلوب. '}
              {!currentSEO.ogImage && 'صورة OG مطلوبة.'}
              {currentSEO.title && currentSEO.description && currentSEO.ogImage && 'جميع الحقول الأساسية مكتملة.'}
            </p>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
