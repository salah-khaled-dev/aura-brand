'use client';

import { Modal } from '@/components/admin/design-system/Modal';
import { Button } from '@/components/admin/design-system/Button';
import { Input } from '@/components/admin/design-system/Input';
import { TextArea } from '@/components/admin/design-system/TextArea';
import React, { useState, useEffect } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Asset } from '@/lib/services/business.service';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Asset, 'id'>) => Promise<void>;
  initialData?: Asset | null;
}

export function AssetModal({ isOpen, onClose, onSave, initialData }: AssetModalProps) {
  const [formData, setFormData] = useState<Omit<Asset, 'id' | 'status'>>({
    name: '',
    type: 'أجهزة',
    purchaseValue: 0,
    currentValue: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    depreciationRate: 0,
  });
  
  const [status, setStatus] = useState<Asset['status']>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        purchaseValue: initialData.purchaseValue,
        currentValue: initialData.currentValue,
        purchaseDate: initialData.purchaseDate,
        depreciationRate: initialData.depreciationRate,
      });
      setStatus(initialData.status);
    } else {
      setFormData({
        name: '',
        type: 'أجهزة',
        purchaseValue: 0,
        currentValue: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        depreciationRate: 0,
      });
      setStatus('active');
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) return setError('اسم الأصل مطلوب');
    if ((formData.purchaseValue ?? 0) <= 0) return setError('قيمة الشراء يجب أن تكون أكبر من صفر');
    if (formData.currentValue < 0) return setError('القيمة الحالية لا يمكن أن تكون سالبة');

    setIsSubmitting(true);
    try {
      await onSave({ ...formData, status });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? 'تعديل أصل' : 'إضافة أصل جديد'} 
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2" dir="rtl">
        {error && (
          <div className="p-3 text-sm text-[var(--admin-danger)] bg-[var(--admin-danger)]/10 border border-[var(--admin-danger)]/20 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input 
              label="اسم الأصل *"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="مثال: أجهزة كمبيوتر للإدارة"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">النوع *</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
              className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
            >
              <option value="معدات">معدات</option>
              <option value="أجهزة">أجهزة</option>
              <option value="أثاث">أثاث</option>
              <option value="مركبات">مركبات</option>
              <option value="عقارات">عقارات</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <Input 
              type="date" 
              label="تاريخ الشراء *"
              required
              value={formData.purchaseDate}
              onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
            />
          </div>

          <div>
            <Input 
              type="number" 
              label="قيمة الشراء *"
              required
              min={0}
              value={formData.purchaseValue}
              onChange={e => setFormData({...formData, purchaseValue: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div>
            <Input 
              type="number" 
              label="القيمة الحالية *"
              required
              min={0}
              value={formData.currentValue}
              onChange={e => setFormData({...formData, currentValue: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div>
            <Input 
              type="number" 
              label="نسبة الإهلاك السنوي (%)"
              min={0}
              max={100}
              value={formData.depreciationRate}
              onChange={e => setFormData({...formData, depreciationRate: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">الحالة</label>
            <select 
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
            >
              <option value="active">نشط</option>
              <option value="maintenance">في الصيانة</option>
              <option value="written_off">مستبعد (تم الإهلاك)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--admin-border-light)] mt-6">
          <Button 
            type="button"
            variant="outline"
            onClick={onClose} 
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button 
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            leftIcon={isSubmitting ? undefined : <IconDeviceFloppy size={16} />}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الأصل'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
