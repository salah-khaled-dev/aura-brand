'use client';

import { Modal } from '@/components/admin/design-system/Modal';
import { Button } from '@/components/admin/design-system/Button';
import { Input } from '@/components/admin/design-system/Input';
import { TextArea } from '@/components/admin/design-system/TextArea';
import React, { useState, useEffect } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Expense } from '@/lib/services/business.service';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id'>) => Promise<void>;
  initialData?: Expense | null;
}

export function ExpenseModal({ isOpen, onClose, onSave, initialData }: ExpenseModalProps) {
  const [formData, setFormData] = useState<Omit<Expense, 'id' | 'status'>>({
    name: '',
    category: 'إيجار',
    amount: 0,
    currency: 'EGP',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'تحويل بنكي',
    supplierId: '',
    notes: ''
  });
  
  const [status, setStatus] = useState<Expense['status']>('paid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        category: initialData.category,
        amount: initialData.amount,
        currency: initialData.currency,
        date: initialData.date,
        paymentMethod: initialData.paymentMethod,
        supplierId: initialData.supplierId || '',
        notes: initialData.notes || ''
      });
      setStatus(initialData.status);
    } else {
      setFormData({
        name: '',
        category: 'إيجار',
        amount: 0,
        currency: 'EGP',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'تحويل بنكي',
        supplierId: '',
        notes: ''
      });
      setStatus('paid');
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) return setError('اسم المصروف مطلوب');
    if (formData.amount <= 0) return setError('المبلغ يجب أن يكون أكبر من صفر');

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
      title={initialData ? 'تعديل مصروف' : 'إضافة مصروف جديد'} 
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
              label="اسم المصروف *"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="مثال: إيجار المكتب شهر مارس"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">التصنيف *</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value as any})}
              className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
            >
              <option value="إيجار">إيجار</option>
              <option value="رواتب">رواتب</option>
              <option value="تسويق">تسويق</option>
              <option value="برمجيات">برمجيات</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">المبلغ *</label>
            <div className="flex relative">
              <input 
                type="number" 
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] rounded-r-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
              />
              <span className="inline-flex items-center px-3 border border-r-0 border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-subtle)] rounded-l-lg text-sm h-12">
                {formData.currency}
              </span>
            </div>
          </div>

          <div>
            <Input 
              type="date" 
              label="التاريخ *"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">طريقة الدفع</label>
            <select 
              value={formData.paymentMethod}
              onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
              className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
            >
              <option value="تحويل بنكي">تحويل بنكي</option>
              <option value="بطاقة ائتمانية">بطاقة ائتمانية</option>
              <option value="نقدًا">نقدًا</option>
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">الحالة</label>
            <select 
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
            >
              <option value="paid">مدفوع</option>
              <option value="pending">معلق</option>
              <option value="cancelled">ملغى</option>
            </select>
          </div>

          <div className="col-span-2">
            <TextArea 
              label="ملاحظات"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="أضف أي ملاحظات إضافية هنا..."
            />
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
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ المصروف'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
