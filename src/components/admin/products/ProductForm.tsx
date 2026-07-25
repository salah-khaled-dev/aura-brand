"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAr } from '@/lib/i18n/admin-ar';
import { Product, ProductVariant, ProductSeo } from '@/data/mock/products';
import { ProductValidator } from '@/lib/validations/product';
import { ProductService } from '@/lib/services/product.service';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// SaaS UI Components
import { Card } from '@/components/admin/design-system/Card';
import { Input } from '@/components/admin/design-system/Input';
import { Button } from '@/components/admin/design-system/Button';
import { Tabs } from '@/components/admin/design-system/Layout';
import { 
  IconDeviceFloppy, 
  IconArrowRight, 
  IconEye, 
  IconPlus, 
  IconTrash 
} from '@tabler/icons-react';

interface ProductFormProps {
  initialData?: Partial<Product>;
  isEdit?: boolean;
}

const TABS = [
  { key: 'general', label: 'عام' },
  { key: 'images', label: 'الصور' },
  { key: 'variants', label: 'المتغيرات' },
  { key: 'pricing_inventory', label: 'الأسعار والمخزون' },
  { key: 'seo', label: 'تحسين محركات البحث' },
  { key: 'stats', label: 'الإحصائيات' }
];

export function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', slug: '', shortDescription: '', description: '',
    category: 'أزياء الصيف', collection: 'الكولكشن الأساسي', season: 'summer', brand: 'AURA',
    price: 0, comparePrice: 0, costPrice: 0, stock: 0, lowStockLimit: 5,
    barcode: '', material: '', weight: 0, tags: [],
    status: 'draft', featured: false, bestSeller: false, newArrival: false,
    images: [], variants: [],
    seo: { metaTitle: '', metaDescription: '', keywords: '', canonicalUrl: '', ogTitle: '', ogDescription: '' },
    stats: { views: 0, orders: 0, revenue: 0, wishlistCount: 0, cartCount: 0, reviewsCount: 0 },
    ...initialData
  });

  useEffect(() => {
    ProductService.getProducts().then(setAllProducts).catch(console.error);
  }, []);

  const handleChange = (field: keyof Product, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSeoChange = (field: keyof ProductSeo, value: string) => {
    setFormData(prev => ({ ...prev, seo: { ...prev.seo!, [field]: value } }));
  };

  const handleVariantAdd = () => {
    const newVariant: ProductVariant = {
      id: `v_${Date.now()}`,
      sku: `${formData.sku || 'SKU'}-NEW`,
      color: '',
      size: '',
      price: formData.price || 0,
      stock: 0
    };
    handleChange('variants', [...(formData.variants || []), newVariant]);
  };

  const handleVariantUpdate = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...(formData.variants || [])];
    updated[index] = { ...updated[index], [field]: value };
    handleChange('variants', updated);
  };

  const handleVariantRemove = (index: number) => {
    const updated = [...(formData.variants || [])];
    updated.splice(index, 1);
    handleChange('variants', updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = ProductValidator.validate(formData, allProducts);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError);
      return;
    }

    setSaving(true);
    try {
      if (isEdit && formData.id) {
        await ProductService.updateProduct(formData.id, formData);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        await ProductService.createProduct(formData as Omit<Product, 'id'>);
        toast.success('تم إضافة المنتج بنجاح');
      }
      router.push('/admin/products');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : adminAr.toasts.unexpectedError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()} className="px-2" leftIcon={<IconArrowRight size={20} />} />
          <h1 className="text-xl font-bold text-[var(--admin-text-base)]">
            {isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" leftIcon={<IconEye size={18} />}>
            معاينة
          </Button>
          <Button type="submit" isLoading={saving} className="flex-1 sm:flex-none" leftIcon={<IconDeviceFloppy size={18} />}>
            حفظ المنتج
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          
          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} className="mb-4" />

          <Card className="p-6 min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <Input 
                      label="اسم المنتج" 
                      required 
                      value={formData.name || ''} 
                      onChange={(e) => handleChange('name', e.target.value)} 
                      placeholder="أدخل اسم المنتج" 
                    />
                    <Input 
                      label="الرابط الدائم (Slug)" 
                      required 
                      value={formData.slug || ''} 
                      onChange={(e) => handleChange('slug', e.target.value)} 
                      placeholder="product-slug-in-english"
                      className="dir-ltr text-left" 
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--admin-text-muted)]">وصف قصير</label>
                      <textarea 
                        rows={2} 
                        value={formData.shortDescription || ''} 
                        onChange={(e) => handleChange('shortDescription', e.target.value)} 
                        className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] focus:border-[var(--admin-primary)] outline-none resize-y text-sm bg-transparent" 
                        placeholder="وصف يظهر في قوائم المنتجات" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--admin-text-muted)]">الوصف الكامل</label>
                      <textarea 
                        rows={6} 
                        value={formData.description || ''} 
                        onChange={(e) => handleChange('description', e.target.value)} 
                        className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] focus:border-[var(--admin-primary)] outline-none resize-y text-sm bg-transparent" 
                        placeholder="اكتب وصفاً مفصلاً للمنتج..." 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="المادة (Material)" 
                        value={formData.material || ''} 
                        onChange={(e) => handleChange('material', e.target.value)} 
                      />
                      <Input 
                        label="الوزن (كجم)" 
                        type="number" 
                        step="0.01" 
                        value={formData.weight || 0} 
                        onChange={(e) => handleChange('weight', Number(e.target.value))} 
                      />
                    </div>
                  </div>
                )}

                {/* Images Tab */}
                {activeTab === 'images' && (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--admin-text-muted)]">يمكنك رفع حتى 6 صور. الصورة الأولى ستكون الرئيسية.</p>
                    <ImageUpload 
                      multiple 
                      images={formData.images || []} 
                      onChange={(images) => handleChange('images', images.slice(0, 6))} 
                    />
                  </div>
                )}

                {/* Pricing & Inventory Tab */}
                {activeTab === 'pricing_inventory' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input 
                        label="السعر" 
                        required 
                        type="number" 
                        value={formData.price || 0} 
                        onChange={(e) => handleChange('price', Number(e.target.value))} 
                      />
                      <Input 
                        label="سعر المقارنة (قبل الخصم)" 
                        type="number" 
                        value={formData.comparePrice || 0} 
                        onChange={(e) => handleChange('comparePrice', Number(e.target.value))} 
                      />
                      <Input 
                        label="التكلفة (غير معروض للعميل)" 
                        type="number" 
                        value={formData.costPrice || 0} 
                        onChange={(e) => handleChange('costPrice', Number(e.target.value))} 
                      />
                    </div>

                    <div className="bg-[var(--admin-bg-elevated)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-base)] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[var(--admin-text-muted)] mb-1">هامش الربح المتوقع</p>
                        <p className="text-xl font-bold text-[var(--admin-primary)]">
                          {ProductService.getProfitMargin(formData.price || 0, formData.costPrice || 0)}%
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-[var(--admin-text-muted)] mb-1">نسبة الخصم</p>
                        <p className="text-xl font-bold text-[var(--admin-danger)]">
                          {ProductService.getDiscountPercentage(formData.price || 0, formData.comparePrice || 0)}%
                        </p>
                      </div>
                    </div>

                    <hr className="my-6 border-[var(--admin-border-light)]" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="رمز التخزين (SKU)" 
                        required 
                        value={formData.sku || ''} 
                        onChange={(e) => handleChange('sku', e.target.value)} 
                        placeholder="AURA-XXX-01" 
                        className="dir-ltr text-left" 
                      />
                      <Input 
                        label="الباركود" 
                        value={formData.barcode || ''} 
                        onChange={(e) => handleChange('barcode', e.target.value)} 
                        className="dir-ltr text-left" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Input 
                          label="الكمية الإجمالية المتاحة" 
                          type="number" 
                          value={formData.stock || 0} 
                          onChange={(e) => handleChange('stock', Number(e.target.value))} 
                        />
                        <p className="text-[10px] text-[var(--admin-text-muted)]">تستخدم إذا لم يكن هناك متغيرات.</p>
                      </div>
                      <Input 
                        label="حد المخزون المنخفض" 
                        type="number" 
                        value={formData.lowStockLimit || 0} 
                        onChange={(e) => handleChange('lowStockLimit', Number(e.target.value))} 
                      />
                    </div>
                  </div>
                )}

                {/* Variants Tab */}
                {activeTab === 'variants' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-[var(--admin-text-muted)]">أضف متغيرات للمنتج مثل الأحجام والألوان.</p>
                      <Button type="button" variant="secondary" size="sm" onClick={handleVariantAdd} leftIcon={<IconPlus size={16} />}>
                        إضافة متغير
                      </Button>
                    </div>

                    {formData.variants && formData.variants.length > 0 ? (
                      <div className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead className="bg-[var(--admin-bg-elevated)] border-b border-[var(--admin-border-base)]">
                            <tr>
                              <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">اللون</th>
                              <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">الحجم</th>
                              <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">SKU</th>
                              <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">السعر</th>
                              <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">المخزون</th>
                              <th className="px-4 py-3 w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--admin-border-light)]">
                            {formData.variants.map((v, idx) => (
                              <tr key={v.id} className="bg-transparent">
                                <td className="p-2">
                                  <input type="text" value={v.color} onChange={(e)=>handleVariantUpdate(idx, 'color', e.target.value)} className="w-full h-8 px-2 border border-[var(--admin-border-base)] rounded bg-transparent outline-none focus:border-[var(--admin-primary)]" placeholder="مثال: أسود" />
                                </td>
                                <td className="p-2">
                                  <input type="text" value={v.size} onChange={(e)=>handleVariantUpdate(idx, 'size', e.target.value)} className="w-full h-8 px-2 border border-[var(--admin-border-base)] rounded bg-transparent outline-none focus:border-[var(--admin-primary)]" placeholder="S, M, L" />
                                </td>
                                <td className="p-2">
                                  <input type="text" value={v.sku} onChange={(e)=>handleVariantUpdate(idx, 'sku', e.target.value)} className="w-full h-8 px-2 border border-[var(--admin-border-base)] rounded bg-transparent outline-none focus:border-[var(--admin-primary)] dir-ltr text-left" />
                                </td>
                                <td className="p-2">
                                  <input type="number" value={v.price} onChange={(e)=>handleVariantUpdate(idx, 'price', Number(e.target.value))} className="w-full h-8 px-2 border border-[var(--admin-border-base)] rounded bg-transparent outline-none focus:border-[var(--admin-primary)]" />
                                </td>
                                <td className="p-2">
                                  <input type="number" value={v.stock} onChange={(e)=>handleVariantUpdate(idx, 'stock', Number(e.target.value))} className="w-full h-8 px-2 border border-[var(--admin-border-base)] rounded bg-transparent outline-none focus:border-[var(--admin-primary)]" />
                                </td>
                                <td className="p-2 text-center">
                                  <button type="button" onClick={()=>handleVariantRemove(idx)} className="text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 p-1.5 rounded transition-colors">
                                    <IconTrash size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border-strong)]">
                        <p className="text-[var(--admin-text-muted)] text-sm">لا يوجد متغيرات مضافة.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SEO Tab */}
                {activeTab === 'seo' && (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Input 
                        label="عنوان الميتا (Meta Title)" 
                        value={formData.seo?.metaTitle || ''} 
                        onChange={(e) => handleSeoChange('metaTitle', e.target.value)} 
                      />
                      <p className="text-[10px] text-[var(--admin-text-muted)]">يظهر في نتائج محركات البحث. يفضل أن يكون بين 50-60 حرفاً.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--admin-text-muted)]">وصف الميتا (Meta Description)</label>
                      <textarea 
                        rows={3} 
                        value={formData.seo?.metaDescription || ''} 
                        onChange={(e) => handleSeoChange('metaDescription', e.target.value)} 
                        className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-transparent outline-none focus:border-[var(--admin-primary)] resize-y text-sm" 
                      />
                    </div>
                    <Input 
                      label="الكلمات المفتاحية" 
                      value={formData.seo?.keywords || ''} 
                      onChange={(e) => handleSeoChange('keywords', e.target.value)} 
                      placeholder="مفصولة بفاصلة" 
                    />
                    <Input 
                      label="عنوان OpenGraph (للسوشيال ميديا)" 
                      value={formData.seo?.ogTitle || ''} 
                      onChange={(e) => handleSeoChange('ogTitle', e.target.value)} 
                    />
                  </div>
                )}

                {/* Stats Tab (Read-only) */}
                {activeTab === 'stats' && (
                  <div className="space-y-6">
                    {isEdit ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatBox label="المشاهدات" value={formData.stats?.views || 0} />
                        <StatBox label="الطلبات" value={formData.stats?.orders || 0} />
                        <StatBox label="الإيرادات" value={`${formData.stats?.revenue || 0} جنيه`} />
                        <StatBox label="المفضلة" value={formData.stats?.wishlistCount || 0} />
                        <StatBox label="في السلة" value={formData.stats?.cartCount || 0} />
                        <StatBox label="التقييمات" value={formData.stats?.reviewsCount || 0} />
                      </div>
                    ) : (
                      <p className="text-[var(--admin-text-muted)] text-sm">تتوفر الإحصائيات بعد إضافة المنتج ووجود نشاط عليه.</p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold border-b border-[var(--admin-border-light)] pb-2">حالة المنتج</h3>
            <select 
              value={formData.status} 
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 h-10 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            >
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="hidden">مخفي</option>
              <option value="archived">مؤرشف</option>
            </select>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold border-b border-[var(--admin-border-light)] pb-2">التصنيف</h3>
            <div className="space-y-3">
              <Input 
                label="الماركة (Brand)" 
                value={formData.brand || ''} 
                onChange={(e) => handleChange('brand', e.target.value)} 
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--admin-text-muted)]">الفئة (Category)</label>
                <select value={formData.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full px-3 h-10 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]">
                  <option value="أزياء الشتاء">أزياء الشتاء (Winter Collection)</option>
                  <option value="أزياء الصيف">أزياء الصيف (Summer Collection)</option>
                  <option value="المتجر">المتجر (Shop)</option>
                </select>
                <p className="text-[10px] text-[var(--admin-text-muted)]">تطابق فئات المتجر الحقيقية — تُستخدم لتصفية المنتجات في لوحة التحكم.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--admin-text-muted)]">المجموعة (Collection)</label>
                <select value={formData.collection} onChange={(e) => handleChange('collection', e.target.value)} className="w-full px-3 h-10 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]">
                  <option value="الكوتور">الكوتور</option>
                  <option value="الكولكشن الأساسي">الكولكشن الأساسي</option>
                  <option value="خريف وشتاء 2027">خريف وشتاء 2027</option>
                  <option value="ربيع وصيف 2027">ربيع وصيف 2027</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--admin-text-muted)]">الموسم (Season)</label>
                <select value={formData.season || 'summer'} onChange={(e) => handleChange('season', e.target.value)} className="w-full px-3 h-10 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]">
                  <option value="summer">صيف (Summer)</option>
                  <option value="winter">شتاء (Winter)</option>
                </select>
              </div>
              <Input 
                label="الوسوم (Tags)" 
                value={formData.tags?.join('، ') || ''} 
                onChange={(e) => handleChange('tags', e.target.value.split('،').map(t=>t.trim()).filter(Boolean))} 
                placeholder="افصل بينها بفاصلة عربية (،)"
              />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold border-b border-[var(--admin-border-light)] pb-2">علامات المنتج (Flags)</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.featured || false} onChange={(e) => handleChange('featured', e.target.checked)} className="w-4 h-4 rounded border-[var(--admin-border-strong)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)] transition-colors" />
                <span className="text-sm text-[var(--admin-text-base)] group-hover:text-[var(--admin-primary)] transition-colors">منتج مميز</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.bestSeller || false} onChange={(e) => handleChange('bestSeller', e.target.checked)} className="w-4 h-4 rounded border-[var(--admin-border-strong)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)] transition-colors" />
                <span className="text-sm text-[var(--admin-text-base)] group-hover:text-[var(--admin-primary)] transition-colors">الأكثر مبيعاً</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.newArrival || false} onChange={(e) => handleChange('newArrival', e.target.checked)} className="w-4 h-4 rounded border-[var(--admin-border-strong)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)] transition-colors" />
                <span className="text-sm text-[var(--admin-text-base)] group-hover:text-[var(--admin-primary)] transition-colors">وصل حديثاً</span>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] p-4 text-center">
      <p className="text-[10px] uppercase font-bold text-[var(--admin-text-subtle)] mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--admin-text-base)] tabular-nums">{value}</p>
    </div>
  );
}
