'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ProductService } from '@/lib/services/product.service';
import { CategoryService } from '@/lib/services/category.service';
import { CollectionService } from '@/lib/services/collection.service';
import { BrandService } from '@/lib/services/brand.service';
import { Product, ProductStatus, ProductVariant, ProductColorVariant } from '@/data/mock/products';
import { formatCurrency } from '@/lib/utils/formatters';
import { useProtectedAutosave } from '@/hooks/useProtectedAutosave';
import { toast } from 'sonner';
import { IconArrowRight, IconDeviceFloppy, IconCloud, IconCloudOff, IconRefresh, IconEye, IconCalendar, IconPlus, IconTrash, IconHistory } from '@tabler/icons-react';
import { ActivityTimeline } from '@/components/admin/ActivityTimeline';
import { ActivityLogService, ActivityLogEntry } from '@/lib/services/activity-log.service';
import { ColorVariantsEditor } from '@/components/admin/products/ColorVariantsEditor';

/** Every product must always have exactly one default color — created automatically so the admin can upload photos immediately. */
function createDefaultColorScaffold(): ProductColorVariant {
  return { id: `color_${Date.now()}`, color: 'افتراضي', colorEn: 'Default', value: '#000000', images: [], sortOrder: 0, isDefault: true, isActive: true };
}

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const isNew = id === 'new';

  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'colors' | 'costing' | 'variants' | 'timeline' | 'revisions'>('general');
  const [showPreview, setShowPreview] = useState(false);

  const [productData, setProductData] = useState<Product | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (isNew) return;
    ActivityLogService.getEntriesForEntity('products', id).then(setTimelineEvents).catch(() => {});
  }, [id, isNew]);

  // Dynamic metadata options (single source of truth → Category/Collection/Brand services)
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [collectionNames, setCollectionNames] = useState<string[]>([]);
  const [brandNames, setBrandNames] = useState<string[]>([]);

  useEffect(() => {
    CategoryService.getCategories().then(list => setCategoryNames(list.map(c => c.name)));
    CollectionService.getCollections().then(list => setCollectionNames(list.map(c => c.name)));
    BrandService.getBrands().then(list => setBrandNames(list.map(b => b.name)));
  }, []);

  // Keep the product's current value selectable even if it predates the managed lists.
  const withCurrent = (names: string[], current: string) =>
    current && !names.includes(current) ? [current, ...names] : names;

  const [manualSaving, setManualSaving] = useState(false);

  const { data, updateData, status, isDirty } = useProtectedAutosave<Product | null>(productData, {
    debounceMs: 1500,
    onSave: async (currentData) => {
      if (!currentData || isNew) return;
      try {
        await ProductService.updateProduct(currentData.id, currentData);
      } catch (err) {
        // Surface the reason (duplicate SKU/slug, invalid discount, no image, …)
        // instead of failing silently; rethrow so the autosave status shows error.
        toast.error(err instanceof Error ? err.message : 'تعذّر الحفظ التلقائي');
        throw err;
      }
    }
  });

  useEffect(() => {
    if (isNew) {
      const empty: Product = {
        id: '', name: '', slug: '', shortDescription: '', description: '',
        category: '', collection: '', season: '', brand: '', tags: [],
        price: 0, comparePrice: 0, costPrice: 0, sku: '', barcode: '',
        stock: 0, lowStockLimit: 5, material: '', weight: 0, variants: [],
        featured: false, bestSeller: false, newArrival: false,
        status: 'draft', revisions: [], images: [], colorVariants: [createDefaultColorScaffold()],
        seo: { metaTitle: '', metaDescription: '', keywords: '', canonicalUrl: '', ogTitle: '', ogDescription: '' },
        stats: { views: 0, orders: 0, revenue: 0, wishlistCount: 0, cartCount: 0, reviewsCount: 0 },
        costing: { fabric: 0, accessories: 0, manufacturing: 0, printing: 0, packaging: 0, photography: 0, shipping: 0, marketing: 0, taxes: 0, marketplaceFees: 0, otherExpenses: 0 }
      };
      setProductData(empty);
      setInitialLoading(false);
    } else {
      ProductService.getProduct(id).then(res => {
        if (res) {
          setProductData(res);
          updateData(res);
        }
        setInitialLoading(false);
      });
    }
  }, [id, isNew]);

  const handleManualSave = async () => {
    if (!data) return;
    const colorWithoutImages = (data.colorVariants || []).find((c) => c.images.length === 0);
    if (colorWithoutImages) {
      toast.error(`اللون "${colorWithoutImages.color || ''}" لا يحتوي على أي صورة — أضيفي صورة واحدة على الأقل لكل لون`);
      return;
    }
    setManualSaving(true);
    try {
      if (isNew) {
        const created = await ProductService.createProduct(data);
        toast.success('تم إنشاء المنتج بنجاح');
        router.push(`/admin/products/${created.id}`);
      } else {
        await ProductService.updateProduct(data.id, data);
        toast.success('تم حفظ التغييرات بنجاح');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر حفظ المنتج');
    } finally {
      setManualSaving(false);
    }
  };

  const handleCostingChange = (field: keyof Product['costing'], value: number) => {
    updateData((prev) => {
      if (!prev) return prev;
      const newCosting = { ...prev.costing, [field]: value };
      const totalCost = Object.values(newCosting).reduce((acc, val) => acc + (val || 0), 0);
      return { ...prev, costing: newCosting, costPrice: totalCost };
    });
  };

  // --- Variant CRUD (persisted through the autosave → ProductService.updateProduct) ---
  const addVariant = () => {
    updateData((prev) => {
      if (!prev) return prev;
      const defaultColor = (prev.colorVariants || [])[0];
      const newVariant: ProductVariant = {
        id: `var_${Date.now()}`,
        sku: `${prev.sku || 'SKU'}-${prev.variants.length + 1}`,
        color: defaultColor?.color || '',
        colorId: defaultColor?.id,
        size: '',
        price: prev.price,
        stock: 0,
        status: 'active',
      };
      return { ...prev, variants: [...prev.variants, newVariant] };
    });
  };

  const updateVariant = (id: string, patch: Partial<ProductVariant>) => {
    updateData((prev) =>
      prev ? { ...prev, variants: prev.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) } : prev
    );
  };

  const updateVariantColor = (id: string, colorId: string) => {
    updateData((prev) => {
      if (!prev) return prev;
      const colorObj = (prev.colorVariants || []).find((c) => c.id === colorId);
      return { ...prev, variants: prev.variants.map((v) => (v.id === id ? { ...v, colorId: colorId || undefined, color: colorObj?.color || '' } : v)) };
    });
  };

  const removeVariant = (id: string) => {
    updateData((prev) =>
      prev ? { ...prev, variants: prev.variants.filter((v) => v.id !== id) } : prev
    );
  };

  if (initialLoading) {
    return <div className="p-8 text-center text-[var(--admin-text-muted)]">جاري التحميل...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-[var(--admin-danger)]">لم يتم العثور على المنتج.</div>;
  }

  const margin = ProductService.getProfitMargin(data.price, data.costPrice);
  const netProfit = data.price - data.costPrice;
  const roi = data.costPrice > 0 ? ((netProfit / data.costPrice) * 100).toFixed(2) : 0;

  const cardClass = "bg-[var(--admin-bg-card)] p-6 rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)]";
  const inputClass = "w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-4 py-2 outline-none focus:border-[var(--admin-primary)] transition-colors";
  const labelClass = "block text-sm font-medium text-[var(--admin-text-muted)] mb-1";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24" dir="rtl">
      {/* Header & Autosave Status */}
      <div className="sticky top-0 z-40 bg-[var(--admin-bg-surface)]/90 backdrop-blur-md border-b border-[var(--admin-border-base)] pb-4 pt-2 -mx-4 px-4 sm:-mx-8 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin/products')} className="p-2 hover:bg-[var(--admin-bg-hover)] rounded-full transition-colors text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)]">
              <IconArrowRight size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">{isNew ? 'إضافة منتج جديد' : data.name || 'بدون اسم'}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  data.status === 'published'
                    ? 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]'
                    : 'bg-[var(--admin-warning-muted)] text-[var(--admin-warning)]'
                }`}>
                  {data.status === 'published' ? 'منشور' : data.status === 'draft' ? 'مسودة' : data.status}
                </span>
                {!isNew && (
                  <div className="flex items-center gap-1.5 text-[var(--admin-text-subtle)] font-mono text-xs">
                    {status === 'saving' && <><IconRefresh size={12} className="animate-spin" /> جاري الحفظ...</>}
                    {status === 'saved' && <><IconCloud size={12} className="text-[var(--admin-success)]" /> تم الحفظ</>}
                    {status === 'error' && <><IconCloudOff size={12} className="text-[var(--admin-danger)]" /> فشل الحفظ</>}
                    {status === 'idle' && !isDirty && <><IconCloud size={12} /> محفوظ</>}
                    {isDirty && status === 'idle' && <><span className="w-2 h-2 rounded-full bg-[var(--admin-warning)]" /> تغييرات غير محفوظة</>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-bg-elevated)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] text-sm font-medium hover:bg-[var(--admin-bg-hover)] border border-[var(--admin-border-base)]" onClick={() => setShowPreview(true)}>
              <IconEye size={16} /> معاينة المتجر
            </button>
            <div className="h-8 w-px bg-[var(--admin-border-base)] mx-1" />
            <select
              className="bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] text-sm px-3 py-2 outline-none focus:border-[var(--admin-primary)] transition-colors"
              value={data.status}
              onChange={(e) => updateData({ status: e.target.value as ProductStatus })}
            >
              <option value="draft">مسودة</option>
              <option value="published">نشر فوراً</option>
              <option value="scheduled">جدولة النشر</option>
              <option value="hidden">إخفاء</option>
              <option value="archived">أرشفة</option>
            </select>
            <button onClick={handleManualSave} disabled={manualSaving} className="flex items-center gap-2 px-6 py-2 bg-[var(--admin-primary)] text-white rounded-[var(--admin-radius-md)] text-sm font-medium hover:bg-[var(--admin-primary-hover)] shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {manualSaving ? <IconRefresh size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />}
              {manualSaving ? 'جاري الحفظ...' : isNew ? 'إنشاء المنتج' : 'حفظ'}
            </button>
          </div>
        </div>
      </div>

      {/* Scheduler UI */}
      {data.status === 'scheduled' && (
        <div className="bg-[var(--admin-info-muted)] border border-[var(--admin-info)]/20 text-[var(--admin-text-base)] p-4 rounded-[var(--admin-radius-xl)] flex items-center gap-4 animate-in fade-in zoom-in-95">
          <IconCalendar size={20} className="text-[var(--admin-info)]" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">جدولة النشر والأرشفة</h4>
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm">
                نشر في: <input type="datetime-local" className="bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] rounded px-2 py-1 outline-none text-xs focus:border-[var(--admin-primary)]" value={data.publishAt || ''} onChange={(e) => updateData({ publishAt: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                إخفاء في: <input type="datetime-local" className="bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] rounded px-2 py-1 outline-none text-xs focus:border-[var(--admin-primary)]" value={data.hideAt || ''} onChange={(e) => updateData({ hideAt: e.target.value })} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-reverse space-x-2 border-b border-[var(--admin-border-base)]">
        {[
          { id: 'general', label: 'البيانات الأساسية' },
          { id: 'colors', label: 'الألوان' },
          { id: 'costing', label: 'محرك التكلفة والأسعار' },
          { id: 'variants', label: 'الخيارات والمتغيرات' },
          { id: 'timeline', label: 'سجل النشاطات' },
          { id: 'revisions', label: 'النسخ السابقة (Revisions)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]'
                : 'border-transparent text-[var(--admin-text-subtle)] hover:text-[var(--admin-text-base)] hover:border-[var(--admin-border-strong)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={cardClass + " space-y-4"}>
                <h2 className="text-lg font-bold text-[var(--admin-text-base)]">المعلومات الأساسية</h2>
                <div>
                  <label className={labelClass}>اسم المنتج</label>
                  <input type="text" className={inputClass} value={data.name} onChange={(e) => updateData({ name: e.target.value })} placeholder="مثال: فستان سهرة حريري" />
                </div>
                <div>
                  <label className={labelClass}>الوصف القصير</label>
                  <input type="text" className={inputClass} value={data.shortDescription} onChange={(e) => updateData({ shortDescription: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>الوصف التفصيلي (CMS Rich Text Mock)</label>
                  <textarea className={inputClass + " min-h-[150px]"} value={data.description} onChange={(e) => updateData({ description: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* COLORS TAB */}
          {activeTab === 'colors' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={cardClass}>
                <h2 className="text-lg font-bold text-[var(--admin-text-base)] mb-4">الألوان وصور المنتج</h2>
                <ColorVariantsEditor
                  colors={data.colorVariants || []}
                  variants={data.variants}
                  onChange={(colorVariants) => updateData({ colorVariants })}
                />
              </div>
            </div>
          )}

          {/* COSTING TAB */}
          {activeTab === 'costing' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={cardClass}>
                <h2 className="text-lg font-bold text-[var(--admin-text-base)] mb-6">محرك احتساب التكاليف (ERP Linked)</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 p-6 bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-light)]">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[var(--admin-text-subtle)]">إجمالي التكلفة</span>
                    <span className="text-2xl font-bold text-[var(--admin-text-base)]">{formatCurrency(data.costPrice)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[var(--admin-text-subtle)]">سعر البيع</span>
                    <input type="number" className="text-2xl font-bold text-[var(--admin-primary)] bg-transparent outline-none border-b border-[var(--admin-primary)]/30 focus:border-[var(--admin-primary)] w-full transition-colors" value={data.price} onChange={(e) => updateData({ price: Number(e.target.value) })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[var(--admin-text-subtle)]">سعر المقارنة (قبل الخصم)</span>
                    <input type="number" className="text-2xl font-bold text-[var(--admin-text-subtle)] line-through bg-transparent outline-none border-b border-[var(--admin-border-base)] focus:border-[var(--admin-border-strong)] w-full transition-colors" value={data.comparePrice} onChange={(e) => updateData({ comparePrice: Number(e.target.value) })} />
                  </div>

                  <div className="flex flex-col gap-1 mt-4">
                    <span className="text-sm font-medium text-[var(--admin-text-subtle)]">صافي الربح</span>
                    <span className={`text-2xl font-bold ${netProfit > 0 ? 'text-[var(--admin-success)]' : 'text-[var(--admin-danger)]'}`}>{formatCurrency(netProfit)}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-4">
                    <span className="text-sm font-medium text-[var(--admin-text-subtle)]">هامش الربح (Margin)</span>
                    <span className={`text-2xl font-bold ${margin >= 40 ? 'text-[var(--admin-success)]' : margin > 20 ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-danger)]'}`}>{margin}%</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-4">
                    <span className="text-sm font-medium text-[var(--admin-text-subtle)]">العائد على الاستثمار (ROI)</span>
                    <span className={`text-2xl font-bold ${Number(roi) > 100 ? 'text-[var(--admin-success)]' : 'text-[var(--admin-warning)]'}`}>{roi}%</span>
                  </div>
                </div>

                <h3 className="font-semibold text-[var(--admin-text-base)] mb-4">تفصيل التكاليف</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'fabric', label: 'القماش والمواد الخام' },
                    { key: 'accessories', label: 'الإكسسوارات والملحقات' },
                    { key: 'manufacturing', label: 'تكلفة التصنيع والخياطة' },
                    { key: 'printing', label: 'الطباعة والتطريز' },
                    { key: 'packaging', label: 'التغليف والعلب' },
                    { key: 'photography', label: 'التصوير والميديا' },
                    { key: 'shipping', label: 'الشحن والجمارك' },
                    { key: 'marketing', label: 'التسويق المخصص' },
                    { key: 'taxes', label: 'الضرائب والرسوم' },
                    { key: 'marketplaceFees', label: 'عمولات البوابات' },
                    { key: 'otherExpenses', label: 'مصاريف أخرى' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex flex-col">
                      <label className="text-xs font-medium text-[var(--admin-text-muted)] mb-1">{label}</label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-4 py-2 outline-none focus:border-[var(--admin-primary)] pr-12 font-mono text-left transition-colors"
                          value={data.costing[key as keyof Product['costing']] || 0}
                          onChange={(e) => handleCostingChange(key as keyof Product['costing'], Number(e.target.value))}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--admin-text-subtle)] text-sm">ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VARIANTS TAB */}
          {activeTab === 'variants' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--admin-text-base)]">منشئ المتغيرات (Variant Generator)</h2>
                    <p className="text-sm text-[var(--admin-text-subtle)] mt-1">يولد الخيارات تلقائياً بناءً على الخصائص المحددة</p>
                  </div>
                  <button onClick={addVariant} className="px-4 py-2 bg-[var(--admin-primary)] text-white text-sm font-medium rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-primary-hover)] transition-colors flex items-center gap-1">
                    <IconPlus size={16} /> إضافة متغير
                  </button>
                </div>

                {data.variants.length > 0 ? (
                  <div className="overflow-x-auto rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)]">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-[var(--admin-bg-elevated)] text-[var(--admin-text-subtle)] border-b border-[var(--admin-border-base)]">
                        <tr>
                          <th className="px-3 py-3 font-medium">المقاس</th>
                          <th className="px-3 py-3 font-medium">اللون</th>
                          <th className="px-3 py-3 font-medium">رمز الـ SKU</th>
                          <th className="px-3 py-3 font-medium">السعر</th>
                          <th className="px-3 py-3 font-medium">المخزون</th>
                          <th className="px-3 py-3 font-medium">الحالة</th>
                          <th className="px-3 py-3 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.variants.map((v) => (
                          <tr key={v.id} className="border-b border-[var(--admin-border-light)] last:border-0 hover:bg-[var(--admin-bg-hover)] transition-colors">
                            <td className="px-3 py-2">
                              <input type="text" placeholder="M / 40" className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 w-20 text-xs outline-none focus:border-[var(--admin-primary)] transition-colors" value={v.size} onChange={(e) => updateVariant(v.id, { size: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              {(data.colorVariants || []).length > 0 ? (
                                <select
                                  value={v.colorId || ''}
                                  onChange={(e) => updateVariantColor(v.id, e.target.value)}
                                  className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--admin-primary)] transition-colors min-w-[110px]"
                                >
                                  <option value="">اختر لوناً</option>
                                  {(data.colorVariants || []).map((c) => (
                                    <option key={c.id} value={c.id}>{c.color || 'بدون اسم'}</option>
                                  ))}
                                </select>
                              ) : (
                                <input type="text" placeholder="أحمر" className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 w-20 text-xs outline-none focus:border-[var(--admin-primary)] transition-colors" value={v.color} onChange={(e) => updateVariant(v.id, { color: e.target.value })} />
                              )}
                            </td>
                            <td className="px-3 py-2"><input type="text" className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 w-full min-w-[120px] text-xs font-mono outline-none focus:border-[var(--admin-primary)] transition-colors" value={v.sku} onChange={(e) => updateVariant(v.id, { sku: e.target.value })} /></td>
                            <td className="px-3 py-2"><input type="number" min={0} className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 w-24 text-xs outline-none focus:border-[var(--admin-primary)] transition-colors" value={v.price} onChange={(e) => updateVariant(v.id, { price: Number(e.target.value) })} /></td>
                            <td className="px-3 py-2"><input type="number" min={0} className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 w-20 text-xs outline-none focus:border-[var(--admin-primary)] transition-colors" value={v.stock} onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })} /></td>
                            <td className="px-3 py-2">
                              <select className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--admin-primary)] transition-colors" value={v.status ?? 'active'} onChange={(e) => updateVariant(v.id, { status: e.target.value as ProductVariant['status'] })}>
                                <option value="active">نشط</option>
                                <option value="inactive">معطل</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => removeVariant(v.id)} title="حذف المتغير" className="p-1.5 text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 rounded transition-colors">
                                <IconTrash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--admin-text-subtle)] bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-md)] border border-dashed border-[var(--admin-border-base)]">
                    لا توجد متغيرات. اضغط «إضافة متغير» لإنشاء أول خيار (مقاس، لون، الخ).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={cardClass}>
                <h2 className="text-lg font-bold text-[var(--admin-text-base)] mb-6">سجل نشاطات المنتج (Audit Log)</h2>
                <ActivityTimeline events={timelineEvents} />
              </div>
            </div>
          )}

          {/* REVISIONS TAB */}
          {activeTab === 'revisions' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={cardClass}>
                <h2 className="text-lg font-bold text-[var(--admin-text-base)] mb-6">النسخ السابقة (Revisions)</h2>
                {data.revisions && data.revisions.length > 0 ? (
                  <div className="space-y-4">
                    {data.revisions.map((rev, idx) => (
                      <div key={rev.versionId} className="flex items-center justify-between p-4 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] hover:bg-[var(--admin-bg-card)] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] flex items-center justify-center">
                            <IconHistory size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-[var(--admin-text-base)]">تحديث {idx === 0 ? '(أحدث نسخة)' : ''}</p>
                            <p className="text-xs text-[var(--admin-text-subtle)] mt-1">{new Date(rev.timestamp).toLocaleString('ar-SA')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من رغبتك في استعادة هذه النسخة؟')) {
                              updateData(rev.snapshot);
                            }
                          }}
                          className="px-4 py-2 bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] text-[var(--admin-primary)] text-sm font-medium rounded-[var(--admin-radius-md)] hover:border-[var(--admin-primary)] hover:bg-[var(--admin-primary-muted)] transition-colors"
                        >
                          استعادة
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--admin-text-subtle)] bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-md)] border border-dashed border-[var(--admin-border-base)]">
                    لا توجد نسخ سابقة محفوظة بعد.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Organization / SEO */}
        <div className="space-y-6">
          <div className="bg-[var(--admin-bg-card)] p-5 rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)] space-y-4">
            <h3 className="font-bold text-[var(--admin-text-base)] border-b border-[var(--admin-border-light)] pb-2">التصنيف والتنظيم</h3>

            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">القسم (Category)</label>
              <select className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors" value={data.category} onChange={(e) => updateData({ category: e.target.value })}>
                <option value="">اختر القسم...</option>
                {withCurrent(categoryNames, data.category).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">المجموعة (Collection)</label>
              <select className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors" value={data.collection} onChange={(e) => updateData({ collection: e.target.value })}>
                <option value="">اختر المجموعة...</option>
                {withCurrent(collectionNames, data.collection).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">الماركة (Brand)</label>
              <select className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors" value={data.brand} onChange={(e) => updateData({ brand: e.target.value })}>
                <option value="">اختر الماركة...</option>
                {withCurrent(brandNames, data.brand).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">الوسوم (Tags)</label>
              <input type="text" placeholder="مفصول بفاصلة" className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors" value={data.tags.join(', ')} onChange={(e) => updateData({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
          </div>

          <div className="bg-[var(--admin-bg-card)] p-5 rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)] space-y-4">
            <h3 className="font-bold text-[var(--admin-text-base)] border-b border-[var(--admin-border-light)] pb-2">محركات البحث (SEO)</h3>

            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">عنوان الصفحة</label>
              <input type="text" className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors" value={data.seo.metaTitle} onChange={(e) => updateData({ seo: { ...data.seo, metaTitle: e.target.value }})} />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">وصف الصفحة</label>
              <textarea className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm min-h-[80px] transition-colors" value={data.seo.metaDescription} onChange={(e) => updateData({ seo: { ...data.seo, metaDescription: e.target.value }})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
