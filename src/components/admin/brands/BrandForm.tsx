"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconArrowRight, IconDeviceFloppy } from '@tabler/icons-react';
import { Brand, BrandService } from '@/lib/services/brand.service';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { Card } from '@/components/admin/design-system/Card';
import { Input } from '@/components/admin/design-system/Input';
import { Button } from '@/components/admin/design-system/Button';

interface BrandFormProps {
  initialData?: Brand;
}

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9؀-ۿ\s-]/g, '').replace(/\s+/g, '-');

export function BrandForm({ initialData }: BrandFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const [formData, setFormData] = useState<Partial<Brand>>({
    name: '', slug: '', logo: '', description: '', status: 'active',
    ...initialData,
  });

  const handleChange = <K extends keyof Brand>(field: K, value: Brand[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) { toast.error('اسم العلامة التجارية مطلوب'); return; }
    if (!formData.slug?.trim()) { toast.error('الرابط (Slug) مطلوب'); return; }

    setSaving(true);
    try {
      if (isEdit && initialData) {
        await BrandService.updateBrand(initialData.id, formData);
        toast.success('تم تحديث العلامة التجارية بنجاح');
      } else {
        await BrandService.createBrand({
          name: formData.name!,
          slug: formData.slug!,
          logo: formData.logo || '',
          description: formData.description || '',
          status: formData.status || 'active',
        });
        toast.success('تمت إضافة العلامة التجارية بنجاح');
      }
      router.push('/admin/brands');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/admin/brands')}
          className="p-2 hover:bg-[var(--admin-bg-hover)] rounded-full transition-colors text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)]"
        >
          <IconArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">
          {isEdit ? 'تعديل العلامة التجارية' : 'إضافة علامة تجارية جديدة'}
        </h1>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">اسم العلامة التجارية</label>
          <Input value={formData.name || ''} onChange={(e) => handleNameChange(e.target.value)} placeholder="مثال: AURA" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الرابط (Slug)</label>
          <Input
            value={formData.slug || ''}
            onChange={(e) => { setSlugTouched(true); handleChange('slug', e.target.value); }}
            placeholder="aura"
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
            onChange={(e) => handleChange('status', e.target.value as Brand['status'])}
            className="w-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] px-3 py-2 outline-none focus:border-[var(--admin-primary)] text-sm transition-colors"
          >
            <option value="active">نشط</option>
            <option value="draft">مسودة</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--admin-text-base)]">الشعار</h2>
        <ImageUpload
          images={formData.logo ? [formData.logo] : []}
          onChange={(images) => handleChange('logo', images[0] || '')}
        />
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/brands')}>إلغاء</Button>
        <Button type="submit" variant="primary" leftIcon={<IconDeviceFloppy size={18} />} isLoading={saving}>
          {isEdit ? 'حفظ التغييرات' : 'إضافة العلامة'}
        </Button>
      </div>
    </form>
  );
}
