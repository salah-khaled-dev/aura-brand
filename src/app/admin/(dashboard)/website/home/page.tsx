"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  IconPlus, IconTrash, IconEye, IconEyeOff, IconHomeEdit,
  IconCopy, IconChevronLeft, IconChevronDown, IconGripVertical, IconSearch, IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/design-system/Button";
import { CMSPreviewPanel, DeviceView } from "@/components/admin/storefront/CMSPreviewPanel";
import { MediaPickerField } from "@/components/admin/storefront/MediaPickerField";
import { SortableList } from "@/components/admin/dnd/SortableList";
import { SortableItem } from "@/components/admin/dnd/SortableItem";
import { FadeIn } from "@/components/admin/ui/motion";
import {
  HomepageService, HomepageSection, HomepageSectionType,
  SECTION_TYPE_LABELS_AR,
} from "@/lib/services/storefront/homepage.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { REFRESH_EVENTS } from "@/lib/events/refresh-events";
import { cn } from "@/utils/cn";

const ADDABLE_TYPES: HomepageSectionType[] = [
  'hero', 'best_sellers', 'new_arrivals', 'featured_products',
  'seasonal_collection', 'editorial_banner', 'featured_collections',
  'testimonials', 'instagram', 'newsletter', 'custom_html',
];

const PRODUCT_SECTION_TYPES: HomepageSectionType[] = [
  'best_sellers', 'new_arrivals', 'featured_products', 'seasonal_collection', 'featured_collections',
];

const SOURCE_OPTIONS = [
  { value: 'auto_best_sellers', label: 'الأكثر مبيعاً (تلقائي)' },
  { value: 'auto_new_arrivals', label: 'وصل حديثاً (تلقائي)' },
  { value: 'auto_featured',     label: 'مميزة (تلقائي)' },
  { value: 'auto_summer',       label: 'تشكيلة صيف (تلقائي)' },
  { value: 'auto_winter',       label: 'تشكيلة شتاء (تلقائي)' },
  { value: 'auto_all',          label: 'كل المنتجات (تلقائي)' },
  { value: 'manual',            label: 'اختيار يدوي' },
];

const SORT_OPTIONS = [
  { value: 'default',    label: 'افتراضي' },
  { value: 'price_asc',  label: 'السعر: الأرخص أولاً' },
  { value: 'price_desc', label: 'السعر: الأغلى أولاً' },
  { value: 'newest',     label: 'الأحدث أولاً' },
  { value: 'random',     label: 'عشوائي' },
];

export default function HomepageBuilder() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<DeviceView>("desktop");
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [realProducts, setRealProducts] = useState<any[]>([]);

  const loadSections = useCallback(async () => {
    try {
      const data = await HomepageService.getSections();
      setSections(data);
    } catch {
      toast.error("فشل في تحميل أقسام الصفحة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
    import("@/lib/services/product.service").then((mod) => {
      mod.ProductService.getProducts().then(setRealProducts);
    });
  }, [loadSections]);

  // Live-sync with any other Website Manager tab editing the same content.
  useEventSubscribeMany(REFRESH_EVENTS.website, loadSections);

  const activeSection = sections.find((s) => s.id === activeSectionId) || null;

  const handleReorder = async (newSections: HomepageSection[]) => {
    const ordered = newSections.map((s, idx) => ({ ...s, order: idx }));
    setSections(ordered);
    setIsUpdating(true);
    try {
      await HomepageService.updateSections(ordered);
    } catch {
      toast.error("فشل في إعادة الترتيب");
      loadSections();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddSection = async (type: HomepageSectionType) => {
    setAddMenuOpen(false);
    setIsUpdating(true);
    try {
      const created = await HomepageService.addSection(type);
      await loadSections();
      setActiveSectionId(created.id);
      toast.success("تمت إضافة القسم");
    } catch {
      toast.error("فشل في إضافة القسم");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setIsUpdating(true);
    try {
      const copy = await HomepageService.duplicateSection(id);
      await loadSections();
      setActiveSectionId(copy.id);
      toast.success("تم تكرار القسم");
    } catch {
      toast.error("فشل في تكرار القسم");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSection = async (id: string, currentStatus: boolean) => {
    setIsUpdating(true);
    try {
      await HomepageService.updateSection(id, { enabled: !currentStatus });
      setSections((s) => s.map((sec) => (sec.id === id ? { ...sec, enabled: !currentStatus } : sec)));
      toast.success(currentStatus ? "تم إخفاء القسم" : "تم تفعيل القسم");
    } catch {
      toast.error("فشل في تحديث القسم");
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSection = async (id: string) => {
    setIsUpdating(true);
    try {
      await HomepageService.deleteSection(id);
      setSections((s) => s.filter((sec) => sec.id !== id));
      if (activeSectionId === id) setActiveSectionId(null);
      toast.success("تم حذف القسم");
    } catch {
      toast.error("فشل في حذف القسم");
    } finally {
      setIsUpdating(false);
    }
  };

  // Patch a section's top-level fields, persisting + updating local state for a live preview.
  const patchSection = async (id: string, updates: Partial<HomepageSection>) => {
    setSections((s) => s.map((sec) => (sec.id === id ? { ...sec, ...updates } : sec)));
    try {
      await HomepageService.updateSection(id, updates);
    } catch {
      toast.error("فشل في حفظ التعديل");
      loadSections();
    }
  };

  const patchSettings = (id: string, settingsPatch: Record<string, any>) => {
    const sec = sections.find((s) => s.id === id);
    if (!sec) return;
    patchSection(id, { settings: { ...sec.settings, ...settingsPatch } });
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-[var(--admin-text-muted)]">جاري تحميل المُنشئ...</div>;
  }

  return (
    <FadeIn className="h-[calc(100vh-180px)] min-h-[560px] flex flex-col md:flex-row bg-[var(--admin-bg-base)] rounded-[var(--admin-radius-xl)] overflow-hidden border border-[var(--admin-border-base)]">
      {/* Left Panel: Editor Controls */}
      <div className="w-full md:w-[400px] shrink-0 border-r border-[var(--admin-border-base)] flex flex-col h-full bg-[var(--admin-bg-surface)]">

        {activeSection ? (
          /* ── Section property editor ── */
          <SectionEditor
            section={activeSection}
            products={realProducts}
            onBack={() => setActiveSectionId(null)}
            onPatch={(updates) => patchSection(activeSection.id, updates)}
            onPatchSettings={(patch) => patchSettings(activeSection.id, patch)}
          />
        ) : (
          <>
            <div className="p-4 border-b border-[var(--admin-border-light)] flex items-center justify-between relative">
              <div className="flex items-center gap-2 text-[var(--admin-text-base)]">
                <IconHomeEdit size={20} className="text-[var(--admin-primary)]" />
                <h1 className="font-bold">مُنشئ الصفحة الرئيسية</h1>
              </div>
              <div className="relative">
                <Button variant="primary" size="sm" leftIcon={<IconPlus size={16} />} rightIcon={<IconChevronDown size={14} />} onClick={() => setAddMenuOpen((o) => !o)}>
                  إضافة قسم
                </Button>
                {addMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                    <div className="absolute end-0 mt-2 w-56 z-20 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] shadow-[var(--admin-shadow-lg)] py-1 max-h-72 overflow-y-auto">
                      {ADDABLE_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleAddSection(type)}
                          className="w-full text-start px-4 py-2 text-sm text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)] transition-colors"
                        >
                          {SECTION_TYPE_LABELS_AR[type]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {sections.length === 0 ? (
                <div className="text-center py-12 text-[var(--admin-text-muted)] text-sm">
                  لا توجد أقسام بعد. أضف قسماً للبدء.
                </div>
              ) : (
                <SortableList
                  items={sections}
                  keyExtractor={(s) => s.id}
                  onReorder={handleReorder}
                  renderItem={(section) => (
                    <SortableItem id={section.id} key={section.id} className="group">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setActiveSectionId(section.id)}>
                          <IconGripVertical size={16} className="text-[var(--admin-text-subtle)] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--admin-text-base)] truncate">{section.title}</p>
                            <p className="text-xs text-[var(--admin-text-muted)] font-medium mt-0.5">{SECTION_TYPE_LABELS_AR[section.type]}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => toggleSection(section.id, section.enabled)} title={section.enabled ? "إخفاء" : "إظهار"} className="p-1.5 text-[var(--admin-text-subtle)] hover:text-[var(--admin-text-base)] rounded-md hover:bg-[var(--admin-bg-hover)]">
                            {section.enabled ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                          </button>
                          <button onClick={() => handleDuplicate(section.id)} title="تكرار" className="p-1.5 text-[var(--admin-text-subtle)] hover:text-[var(--admin-info)] rounded-md hover:bg-[var(--admin-bg-hover)]">
                            <IconCopy size={16} />
                          </button>
                          <button onClick={() => deleteSection(section.id)} title="حذف" className="p-1.5 text-[var(--admin-danger-muted)] hover:text-[var(--admin-danger)] rounded-md hover:bg-[var(--admin-danger)]/10">
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    </SortableItem>
                  )}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Live Preview */}
      <div className="flex-1 min-w-0 h-full p-4 pl-0">
        <CMSPreviewPanel view={view} onViewChange={setView} title="معاينة المتجر" isUpdating={isUpdating}>
          <div className="flex flex-col gap-8 pb-20 w-full min-h-full font-sans">
            {sections.filter((s) => s.enabled).length === 0 && (
              <div className="py-20 text-center text-slate-400">لا توجد أقسام مفعّلة للعرض</div>
            )}
            {sections.filter((s) => s.enabled).map((section) => (
              <div
                key={section.id}
                className={cn("relative border-2 border-transparent transition-colors cursor-pointer", activeSectionId === section.id && "border-blue-500 rounded-lg p-2")}
                onClick={() => setActiveSectionId(section.id)}
              >
                <SectionPreview section={section} products={realProducts} />
                {activeSectionId === section.id && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">يتم التحرير</div>
                )}
              </div>
            ))}
          </div>
        </CMSPreviewPanel>
      </div>
    </FadeIn>
  );
}

/* ───────────────────────── Section property editor ───────────────────────── */
function SectionEditor({
  section, products, onBack, onPatch, onPatchSettings,
}: {
  section: HomepageSection;
  products: any[];
  onBack: () => void;
  onPatch: (updates: Partial<HomepageSection>) => void;
  onPatchSettings: (patch: Record<string, any>) => void;
}) {
  const inputCls = "w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] px-3 py-2 text-sm text-[var(--admin-text-base)] outline-none focus:border-[var(--admin-primary)] transition-colors";
  const selectCls = inputCls;
  const labelCls = "block text-xs font-semibold text-[var(--admin-text-muted)] mb-1";
  const toggleCls = "flex items-center justify-between p-3 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-elevated)] cursor-pointer";
  const s = section.settings || {};
  const isProductSection = PRODUCT_SECTION_TYPES.includes(section.type);
  const isManualSource = s.source === 'manual';

  const restoreDefaults = () => {
    onPatch({
      title: SECTION_TYPE_LABELS_AR[section.type],
      subtitle: '',
      settings: HomepageService.getDefaultSettings(section.type),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--admin-border-light)] flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-md hover:bg-[var(--admin-bg-hover)] text-[var(--admin-text-muted)]">
          <IconChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[var(--admin-text-base)] truncate">{section.title}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">{SECTION_TYPE_LABELS_AR[section.type]}</p>
        </div>
        <button
          onClick={restoreDefaults}
          title="استعادة الإعدادات الافتراضية"
          className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)] border border-[var(--admin-border-base)] rounded-md px-2 py-1 transition-colors shrink-0"
        >
          إعادة تعيين
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

        {/* ── Common: title / subtitle / enabled ── */}
        <div>
          <label className={labelCls}>العنوان</label>
          <input className={inputCls} value={section.title} onChange={(e) => onPatch({ title: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>العنوان الفرعي</label>
          <input className={inputCls} value={section.subtitle || ""} onChange={(e) => onPatch({ subtitle: e.target.value })} />
        </div>
        <label className={toggleCls}>
          <span className="text-sm font-medium text-[var(--admin-text-base)]">مفعّل (يظهر في الصفحة)</span>
          <input type="checkbox" checked={section.enabled} onChange={(e) => onPatch({ enabled: e.target.checked })} className="w-5 h-5 accent-[var(--admin-primary)]" />
        </label>

        {/* ── Hero ── */}
        {section.type === "hero" && (
          <>
            <div>
              <label className={labelCls}>نص الزر الرئيسي</label>
              <input className={inputCls} value={s.ctaText || ""} onChange={(e) => onPatchSettings({ ctaText: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>رابط الزر الرئيسي</label>
              <input className={inputCls} value={s.ctaLink || ""} onChange={(e) => onPatchSettings({ ctaLink: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>نص الزر الثانوي</label>
              <input className={inputCls} value={s.secondaryCtaText || ""} onChange={(e) => onPatchSettings({ secondaryCtaText: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>رابط الزر الثانوي</label>
              <input className={inputCls} value={s.secondaryCtaLink || ""} onChange={(e) => onPatchSettings({ secondaryCtaLink: e.target.value })} />
            </div>
            <hr className="border-[var(--admin-border-light)]" />
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase">الشرائح</p>
            {((s.slides as any[]) || []).map((slide: any, idx: number) => (
              <div key={slide.id ?? idx} className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] p-3 space-y-2">
                <p className="text-xs font-bold text-[var(--admin-text-base)]">الشريحة {idx + 1}</p>
                {(['title', 'engTitle', 'label'] as const).map((field) => (
                  <div key={field}>
                    <label className={labelCls}>{field === 'title' ? 'العنوان العربي' : field === 'engTitle' ? 'العنوان الإنجليزي' : 'التسمية'}</label>
                    <input className={inputCls} value={slide[field] || ""} onChange={(e) => {
                      const updated = [...(s.slides || [])];
                      updated[idx] = { ...updated[idx], [field]: e.target.value };
                      onPatchSettings({ slides: updated });
                    }} />
                  </div>
                ))}
                <div>
                  <label className={labelCls}>النص التوضيحي</label>
                  <textarea className={inputCls + " min-h-[60px] resize-y"} value={slide.subtitle || ""} onChange={(e) => {
                    const updated = [...(s.slides || [])];
                    updated[idx] = { ...updated[idx], subtitle: e.target.value };
                    onPatchSettings({ slides: updated });
                  }} />
                </div>
                <MediaPickerField
                  label="صورة الشريحة"
                  value={slide.image || ""}
                  onChange={(url) => {
                    const updated = [...(s.slides || [])];
                    updated[idx] = { ...updated[idx], image: url };
                    onPatchSettings({ slides: updated });
                  }}
                />
              </div>
            ))}
          </>
        )}

        {/* ── Editorial Banner ── */}
        {section.type === "editorial_banner" && (
          <>
            <MediaPickerField
              label="صورة البانر"
              value={s.image || ""}
              onChange={(url) => onPatchSettings({ image: url })}
            />
            <div>
              <label className={labelCls}>نص الزر</label>
              <input className={inputCls} value={s.ctaText || ""} onChange={(e) => onPatchSettings({ ctaText: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>رابط الزر</label>
              <input className={inputCls} value={s.ctaLink || ""} onChange={(e) => onPatchSettings({ ctaLink: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>شفافية الطبقة (0–100)</label>
              <input type="number" min={0} max={100} className={inputCls} value={s.overlayOpacity ?? 40} onChange={(e) => onPatchSettings({ overlayOpacity: Number(e.target.value) })} />
            </div>
          </>
        )}

        {/* ── Seasonal Collection ── */}
        {section.type === "seasonal_collection" && (
          <div>
            <label className={labelCls}>الموسم</label>
            <select className={selectCls} value={s.season || "summer"} onChange={(e) => onPatchSettings({ season: e.target.value, source: e.target.value === 'summer' ? 'auto_summer' : 'auto_winter' })}>
              <option value="summer">تشكيلة الصيف</option>
              <option value="winter">تشكيلة الشتاء</option>
            </select>
          </div>
        )}

        {/* ── Product sections: source / sort / count / columns / filters ── */}
        {isProductSection && (
          <>
            <hr className="border-[var(--admin-border-light)]" />
            <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wide">إعدادات المنتجات</p>

            <div>
              <label className={labelCls}>مصدر المنتجات</label>
              <select className={selectCls} value={s.source || 'auto_best_sellers'} onChange={(e) => onPatchSettings({ source: e.target.value })}>
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Manual Product Picker — shown only when source = 'manual' */}
            {isManualSource && (
              <ManualProductPicker
                products={products}
                selected={(s.manualProductIds as string[]) || []}
                onSelect={(ids) => onPatchSettings({ manualProductIds: ids })}
              />
            )}

            {!isManualSource && (
              <>
                <div>
                  <label className={labelCls}>الترتيب</label>
                  <select className={selectCls} value={s.sort || 'default'} onChange={(e) => onPatchSettings({ sort: e.target.value })}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>عدد المنتجات</label>
                  <input type="number" min={1} max={12} className={inputCls} value={s.limit ?? 4} onChange={(e) => onPatchSettings({ limit: Number(e.target.value) })} />
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>أعمدة الشبكة</label>
              <select className={selectCls} value={s.columns ?? 4} onChange={(e) => onPatchSettings({ columns: Number(e.target.value) })}>
                <option value={2}>2 أعمدة</option>
                <option value={3}>3 أعمدة</option>
                <option value={4}>4 أعمدة (افتراضي)</option>
              </select>
            </div>

            <label className={toggleCls}>
              <span className="text-sm text-[var(--admin-text-base)]">إخفاء المنتجات غير المتوفرة</span>
              <input type="checkbox" checked={s.hideOutOfStock ?? false} onChange={(e) => onPatchSettings({ hideOutOfStock: e.target.checked })} className="w-5 h-5 accent-[var(--admin-primary)]" />
            </label>

            <label className={toggleCls}>
              <span className="text-sm text-[var(--admin-text-base)]">إظهار شارة الخصم</span>
              <input type="checkbox" checked={s.showDiscountBadge ?? true} onChange={(e) => onPatchSettings({ showDiscountBadge: e.target.checked })} className="w-5 h-5 accent-[var(--admin-primary)]" />
            </label>

            <label className={toggleCls}>
              <span className="text-sm text-[var(--admin-text-base)]">إظهار زر المفضلة</span>
              <input type="checkbox" checked={s.showWishlistButton ?? true} onChange={(e) => onPatchSettings({ showWishlistButton: e.target.checked })} className="w-5 h-5 accent-[var(--admin-primary)]" />
            </label>
          </>
        )}

        {/* ── Instagram ── */}
        {section.type === "instagram" && (
          <>
            <div>
              <label className={labelCls}>حساب إنستغرام</label>
              <input className={inputCls} value={s.handle || ""} onChange={(e) => onPatchSettings({ handle: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>عدد الصور</label>
              <input type="number" min={3} max={12} className={inputCls} value={s.limit ?? 6} onChange={(e) => onPatchSettings({ limit: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>أعمدة الشبكة</label>
              <select className={selectCls} value={s.gridSize ?? 3} onChange={(e) => onPatchSettings({ gridSize: Number(e.target.value) })}>
                <option value={3}>3 أعمدة</option>
                <option value={4}>4 أعمدة</option>
              </select>
            </div>
          </>
        )}

        {/* ── Newsletter ── */}
        {section.type === "newsletter" && (
          <>
            <div>
              <label className={labelCls}>نص التوضيح</label>
              <textarea className={inputCls + " min-h-[60px] resize-y"} value={s.description || ""} onChange={(e) => onPatchSettings({ description: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>نص placeholder</label>
              <input className={inputCls} value={s.placeholder || ""} onChange={(e) => onPatchSettings({ placeholder: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>نص الزر</label>
              <input className={inputCls} value={s.buttonText || ""} onChange={(e) => onPatchSettings({ buttonText: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>رسالة النجاح</label>
              <input className={inputCls} value={s.successMessage || ""} onChange={(e) => onPatchSettings({ successMessage: e.target.value })} />
            </div>
          </>
        )}

        {/* ── Testimonials ── */}
        {section.type === "testimonials" && (
          <div>
            <label className={labelCls}>عدد التقييمات</label>
            <input type="number" min={1} max={9} className={inputCls} value={s.limit ?? 3} onChange={(e) => onPatchSettings({ limit: Number(e.target.value) })} />
          </div>
        )}

        {/* ── Custom HTML ── */}
        {section.type === "custom_html" && (
          <div>
            <label className={labelCls}>HTML مخصص</label>
            <textarea className={inputCls + " min-h-[140px] font-mono text-xs"} value={s.html || ""} onChange={(e) => onPatchSettings({ html: e.target.value })} />
          </div>
        )}

      </div>
    </div>
  );
}

/* ───────────────────────── Manual Product Picker ───────────────────────── */
function ManualProductPicker({
  products,
  selected,
  onSelect,
}: {
  products: any[];
  selected: string[];
  onSelect: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState<"all" | "summer" | "winter">("all");

  const inputCls = "w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] px-3 py-2 text-sm text-[var(--admin-text-base)] outline-none focus:border-[var(--admin-primary)] transition-colors";

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const nameMatch = !q || (p.name || p.title || "").toLowerCase().includes(q);
    const skuMatch  = !q || (p.sku  || p.id  || "").toLowerCase().includes(q);
    if (!nameMatch && !skuMatch) return false;
    if (season === "all") return true;
    return new RegExp(season === "summer" ? "summer|صيف" : "winter|شتاء", "i").test(p.collection || "");
  });

  const toggle = (id: string) => {
    onSelect(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectedProducts = selected
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-elevated)] p-3 space-y-3">
        <p className="text-xs font-bold text-[var(--admin-primary)] uppercase tracking-wide">اختيار يدوي للمنتجات</p>

        {/* Search */}
        <div className="relative">
          <IconSearch size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-subtle)]" />
          <input
            className={inputCls + " ps-8"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحثي باسم المنتج أو SKU..."
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--admin-text-subtle)]">
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Season filter */}
        <div className="flex gap-1.5">
          {(["all", "summer", "winter"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={cn(
                "flex-1 py-1 text-xs font-semibold rounded-[var(--admin-radius-md)] transition-colors border",
                season === s
                  ? "bg-[var(--admin-primary)] text-white border-[var(--admin-primary)]"
                  : "bg-[var(--admin-bg-base)] text-[var(--admin-text-muted)] border-[var(--admin-border-base)] hover:border-[var(--admin-primary)]"
              )}
            >
              {s === "all" ? "الكل" : s === "summer" ? "صيف" : "شتاء"}
            </button>
          ))}
        </div>

        {/* Product list with checkboxes */}
        <div className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] max-h-48 overflow-y-auto divide-y divide-[var(--admin-border-light)] custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--admin-text-muted)]">لا توجد منتجات مطابقة</div>
          ) : (
            filtered.map((p) => {
              const isSelected = selected.includes(p.id);
              const thumb = p.media?.[0]?.url || p.images?.[0] || p.image;
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[var(--admin-bg-hover)]",
                    isSelected && "bg-[var(--admin-primary)]/5"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 accent-[var(--admin-primary)] shrink-0"
                  />
                  {thumb && (
                    <img src={thumb} alt="" className="w-8 h-10 object-cover shrink-0 rounded border border-[var(--admin-border-light)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--admin-text-base)] truncate">{p.name || p.title}</p>
                    {p.sku && <p className="text-[10px] text-[var(--admin-text-muted)]">SKU: {p.sku}</p>}
                    {p.collection && <p className="text-[10px] text-[var(--admin-text-subtle)]">{p.collection}</p>}
                  </div>
                  <span className="text-xs font-medium text-[var(--admin-text-muted)] shrink-0">{p.price} ج.م</span>
                </label>
              );
            })
          )}
        </div>

        <p className="text-[10px] text-[var(--admin-text-muted)]">
          {selected.length === 0 ? "لم يُختر أي منتج بعد" : `${selected.length} منتج مختار`}
        </p>
      </div>

      {/* Selected order with drag & drop reorder */}
      {selectedProducts.length > 0 && (
        <div className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-elevated)] p-3 space-y-2">
          <p className="text-xs font-bold text-[var(--admin-text-muted)] uppercase tracking-wide">
            ترتيب العرض — اسحب لإعادة الترتيب
          </p>
          <SortableList
            items={selectedProducts}
            keyExtractor={(p: any) => p.id}
            onReorder={(reordered: any[]) => onSelect(reordered.map((p: any) => p.id))}
            renderItem={(p: any) => (
              <SortableItem id={p.id} key={p.id}>
                <div className="flex items-center gap-2 py-1">
                  <IconGripVertical size={14} className="text-[var(--admin-text-subtle)] shrink-0" />
                  {(p.media?.[0]?.url || p.images?.[0] || p.image) && (
                    <img src={p.media?.[0]?.url || p.images?.[0] || p.image} alt="" className="w-7 h-9 object-cover shrink-0 rounded border border-[var(--admin-border-light)]" />
                  )}
                  <span className="text-xs text-[var(--admin-text-base)] truncate flex-1">{p.name || p.title}</span>
                  <button
                    onClick={() => onSelect(selected.filter((id) => id !== p.id))}
                    className="shrink-0 text-[var(--admin-text-subtle)] hover:text-[var(--admin-danger)] transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </SortableItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Storefront preview renderer ───────────────────────── */
function SectionPreview({ section, products }: { section: HomepageSection; products: any[] }) {
  const s = section.settings || {};

  if (section.type === "hero") {
    const slides = (s.slides as any[]) || [];
    const slide = slides[0];
    return (
      <div className="relative w-full aspect-[21/9] min-h-[280px] bg-slate-200 overflow-hidden flex items-center justify-center rounded-xl mx-auto">
        {slide?.image && <img src={slide.image} alt={section.title} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black" style={{ opacity: (s.overlayOpacity ?? 0) / 100 }} />
        <div className="relative z-10 text-center text-white px-4">
          {slide?.label && <p className="text-[10px] uppercase tracking-widest opacity-80 mb-2">{slide.label}</p>}
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{slide?.title || section.title}</h2>
          {slide?.subtitle && <p className="text-sm opacity-80 mb-4 max-w-md mx-auto">{slide.subtitle}</p>}
          <div className="flex gap-2 justify-center">
            {s.ctaText && <button className="px-6 py-2 bg-white text-black text-xs font-semibold rounded-full">{s.ctaText}</button>}
            {s.secondaryCtaText && <button className="px-6 py-2 border border-white text-white text-xs font-semibold rounded-full">{s.secondaryCtaText}</button>}
          </div>
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_: any, i: number) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (section.type === "editorial_banner") {
    return (
      <div className="relative w-full aspect-[21/9] min-h-[200px] bg-slate-200 overflow-hidden flex items-center justify-center">
        {s.image && <img src={s.image} alt={section.title} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black" style={{ opacity: (s.overlayOpacity ?? 40) / 100 }} />
        <div className="relative z-10 text-center text-white px-4">
          {section.subtitle && <p className="text-[10px] uppercase tracking-widest opacity-80 mb-1">{section.subtitle}</p>}
          <h2 className="text-2xl font-bold mb-3">{section.title}</h2>
          {s.ctaText && <button className="px-6 py-2 border border-white text-white text-xs font-semibold">{s.ctaText}</button>}
        </div>
      </div>
    );
  }

  if (section.type === "newsletter") {
    return (
      <div className="px-4 md:px-8 py-14 mx-auto w-full max-w-3xl text-center">
        <h3 className="text-2xl font-bold mb-2">{section.title}</h3>
        {section.subtitle && <p className="text-gray-500 mb-2 text-sm">{section.subtitle}</p>}
        {s.description && <p className="text-gray-400 text-xs mb-6 max-w-md mx-auto">{s.description}</p>}
        <div className="flex max-w-md mx-auto">
          <input className="flex-1 border border-slate-300 px-4 py-3 text-sm" placeholder={s.placeholder || "بريدكِ الإلكتروني..."} disabled />
          <button className="bg-black text-white px-6 text-sm font-semibold">{s.buttonText || "انضمي"}</button>
        </div>
      </div>
    );
  }

  if (section.type === "custom_html") {
    // Sandboxed iframe — no allow-scripts, no same-origin; prevents XSS from admin-authored HTML.
    const html = s.html || "<p style='color:#94a3b8'>HTML مخصص</p>";
    return (
      <div className="px-4 md:px-8 py-8 mx-auto w-full max-w-7xl">
        <iframe
          title={`custom-html-${section.id}`}
          sandbox=""
          srcDoc={`<!doctype html><html dir="rtl"><head><meta charset="utf-8"></head><body style="margin:0;font-family:sans-serif">${html}</body></html>`}
          className="w-full min-h-[140px] border-0 bg-white"
        />
      </div>
    );
  }

  // Product / collection / testimonials / instagram grids
  const limit = s.limit || 4;
  const cols  = s.columns || 4;
  const gridCols = cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4";

  // Resolve product list for preview
  let previewProducts: any[] = [];
  if (s.source === 'manual') {
    const ids: string[] = s.manualProductIds || [];
    const map = new Map(products.map((p: any) => [p.id, p]));
    previewProducts = ids.map(id => map.get(id)).filter(Boolean);
  } else {
    previewProducts = products.slice(0, limit);
  }

  return (
    <div className="px-4 md:px-8 py-12 mx-auto w-full max-w-7xl">
      <h3 className="text-2xl font-bold text-center mb-2">{section.title}</h3>
      {section.subtitle && <p className="text-gray-500 text-center mb-10 text-sm">{section.subtitle}</p>}
      <div className={`grid ${gridCols} gap-4`}>
        {(previewProducts.length > 0 ? previewProducts : Array.from({ length: limit })).map((p: any, i: number) => (
          p ? (
            <div key={p.id} className="relative aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              <img src={p.media?.[0]?.url || p.images?.[0] || p.image || "https://placehold.co/400x533"} className="absolute inset-0 w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="font-bold truncate text-sm">{p.title || p.name}</p>
                <p className="text-xs opacity-90">{p.price} ج.م</p>
              </div>
            </div>
          ) : (
            <div key={i} className="aspect-[3/4] bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
              <span className="text-slate-400 font-medium text-sm">عنصر {i + 1}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
