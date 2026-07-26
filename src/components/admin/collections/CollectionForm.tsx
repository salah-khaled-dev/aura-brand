"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconArrowRight, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { Collection, CollectionRule, CollectionService } from '@/lib/services/collection.service';
import { ProductService } from '@/lib/services/product.service';
import type { Product } from '@/data/mock/products';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { Card } from '@/components/admin/design-system/Card';
import { Input } from '@/components/admin/design-system/Input';
import { Button } from '@/components/admin/design-system/Button';

interface CollectionFormProps {
  initialData?: Collection;
}

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9؀-ۿ\s-]/g, '').replace(/\s+/g, '-');

const RULE_FIELDS: { value: CollectionRule['field']; label: string }[] = [
  { value: 'title', label: 'اسم المنتج' },
  { value: 'tag', label: 'الوسم (Tag)' },
  { value: 'price', label: 'السعر' },
  { value: 'inventory', label: 'المخزون' },
];

const RULE_OPERATORS: { value: CollectionRule['operator']; label: string }[] = [
  { value: 'equals', label: 'يساوي' },
  { value: 'not_equals', label: 'لا يساوي' },
  { value: 'greater_than', label: 'أكبر من' },
  { value: 'less_than', label: 'أصغر من' },
  { value: 'contains', label: 'يحتوي على' },
];

export function CollectionForm({ initialData }: CollectionFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState<Partial<Collection>>({
    name: '', slug: '', description: '', image: '',
    type: 'manual', matchType: 'all', rules: [], productIds: [],
    status: 'active',
    ...initialData,
  });

  useEffect(() => {
    ProductService.getProducts().then(setAllProducts).catch(() => {});
  }, []);

  const handleChange = <K extends keyof Collection>(field: K, value: Collection[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const toggleProduct = (productId: string) => {
    setFormData(prev => {
      const current = prev.productIds || [];
      const next = current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId];
      return { ...prev, productIds: next };
    });
  };

  const addRule = () => {
    const newRule: CollectionRule = { field: 'title', operator: 'contains', value: '' };
    handleChange('rules', [...(formData.rules || []), newRule]);
  };

  const updateRule = (index: number, patch: Partial<CollectionRule>) => {
    const updated = [...(formData.rules || [])];
    updated[index] = { ...updated[index], ...patch };
    handleChange('rules', updated);
  };

  const removeRule = (index: number) => {
    const updated = [...(formData.rules || [])];
    updated.splice(index, 1);
    handleChange('rules', updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) { toast.error('اسم التشكيلة مطلوب'); return; }
    if (!formData.slug?.trim()) { toast.error('الرابط (Slug) مطلوب'); return; }

    setSaving(true);
    try {
      const payload = {
        name: formData.name!,
        slug: formData.slug!,
        description: formData.description || '',
        type: formData.type || 'manual',
        image: formData.image || '',
        matchType: formData.matchType || 'all',
        rules: formData.type === 'automatic' ? (formData.rules || []) : [],
        productIds: formData.type === 'manual' ? (formData.productIds || []) : [],
        status: formData.status || 'active',
      };

      if (isEdit && initialData) {
        await CollectionService.updateCollection(initialData.id, payload);
        toast.success('تم تحديث التشكيلة بنجاح');
      } else {
        await CollectionService.createCollection(payload);
        toast.success('تمت إضافة التشكيلة بنجاح');
      }
      router.push('/admin/collections');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/admin/collections')}
          className="p-2 hover:bg-[var(--admin-bg-hover)] rounded-full transition-colors text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)]"
        >
          <IconArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">
          {isEdit ? 'تعديل التشكيلة' : 'إضافة تشكيلة جديدة'}
        </h1>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">اسم التشكيلة</label>
          <Input value={formData.name || ''} onChange={(e) => handleNameChange(e.target.value)} placeholder="مثال: تشكيلة الصيف" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الرابط (Slug)</label>
          <Input
            value={formData.slug || ''}
            onChange={(e) => { setSlugTouched(true); handleChange('slug', e.target.value); }}
            placeholder="summer-collection"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الوصف</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-4 py-2 outline-none focus:border-[var(--admin-primary)] min-h-[100px] transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الحالة</label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as Collection['status'])}
            className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors"
          >
            <option value="active">نشط</option>
            <option value="draft">مسودة</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--admin-text-base)]">الصورة</h2>
        <ImageUpload
          images={formData.image ? [formData.image] : []}
          onChange={(images) => handleChange('image', images[0] || '')}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--admin-text-base)]">نوع التشكيلة</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleChange('type', 'manual')}
            className={`flex-1 px-4 py-3 rounded-[var(--admin-radius-md)] border text-sm font-semibold transition-colors ${
              formData.type === 'manual'
                ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)]'
                : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-muted)] border-[var(--admin-border-base)]'
            }`}
          >
            يدوي (اختيار المنتجات)
          </button>
          <button
            type="button"
            onClick={() => handleChange('type', 'automatic')}
            className={`flex-1 px-4 py-3 rounded-[var(--admin-radius-md)] border text-sm font-semibold transition-colors ${
              formData.type === 'automatic'
                ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)]'
                : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-muted)] border-[var(--admin-border-base)]'
            }`}
          >
            تلقائي (شروط)
          </button>
        </div>

        {formData.type === 'manual' ? (
          <div className="space-y-3">
            <Input
              placeholder="بحث عن منتج..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] divide-y divide-[var(--admin-border-light)]">
              {filteredProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--admin-bg-hover)] transition-colors">
                  <input
                    type="checkbox"
                    checked={(formData.productIds || []).includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="w-4 h-4 accent-[var(--admin-primary)]"
                  />
                  <img src={p.images?.[0] || 'https://via.placeholder.com/40'} alt="" className="w-8 h-8 rounded object-cover border border-[var(--admin-border-light)]" />
                  <span className="text-sm text-[var(--admin-text-base)]">{p.name}</span>
                </label>
              ))}
              {filteredProducts.length === 0 && (
                <p className="p-4 text-center text-sm text-[var(--admin-text-muted)]">لا توجد منتجات مطابقة.</p>
              )}
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">
              تم اختيار {(formData.productIds || []).length} منتج
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--admin-text-subtle)]">مطابقة</span>
              <select
                value={formData.matchType}
                onChange={(e) => handleChange('matchType', e.target.value as Collection['matchType'])}
                className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-2 py-1 text-sm outline-none focus:border-[var(--admin-primary)]"
              >
                <option value="all">كل الشروط</option>
                <option value="any">أي شرط</option>
              </select>
            </div>

            {(formData.rules || []).map((rule, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(index, { field: e.target.value as CollectionRule['field'] })}
                  className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-2 py-1.5 text-sm outline-none focus:border-[var(--admin-primary)]"
                >
                  {RULE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(index, { operator: e.target.value as CollectionRule['operator'] })}
                  className="border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-2 py-1.5 text-sm outline-none focus:border-[var(--admin-primary)]"
                >
                  {RULE_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => updateRule(index, { value: e.target.value })}
                  className="flex-1 min-w-[120px] border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-1.5 text-sm outline-none focus:border-[var(--admin-primary)]"
                />
                <button type="button" onClick={() => removeRule(index)} className="p-1.5 text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 rounded transition-colors">
                  <IconTrash size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRule}
              className="flex items-center gap-1 text-sm text-[var(--admin-primary)] hover:underline font-medium"
            >
              <IconPlus size={14} /> إضافة شرط
            </button>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/collections')}>إلغاء</Button>
        <Button type="submit" variant="primary" leftIcon={<IconDeviceFloppy size={18} />} isLoading={saving}>
          {isEdit ? 'حفظ التغييرات' : 'إضافة التشكيلة'}
        </Button>
      </div>
    </form>
  );
}
