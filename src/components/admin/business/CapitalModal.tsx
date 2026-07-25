'use client';

import { Modal } from '@/components/admin/design-system/Modal';
import { Button } from '@/components/admin/design-system/Button';
import { Input } from '@/components/admin/design-system/Input';
import { TextArea } from '@/components/admin/design-system/TextArea';
import React, { useState, useEffect } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Capital } from '@/lib/services/business.service';

interface CapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Capital, 'id'>) => Promise<void>;
  initialData?: Capital | null;
}

export function CapitalModal({ isOpen, onClose, onSave, initialData }: CapitalModalProps) {
  const [formData, setFormData] = useState<Omit<Capital, 'id'>>({
    type: 'increase',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    owner: '',
    notes: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type,
        amount: initialData.amount,
        date: initialData.date,
        owner: initialData.owner,
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        type: 'increase',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        owner: '',
        notes: '',
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.owner.trim()) return setError('اسم المستثمر/الشريك مطلوب');
    if (formData.amount <= 0) return setError('المبلغ يجب أن يكون أكبر من صفر');

    setIsSubmitting(true);
    try {
      await onSave(formData);
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
      title={initialData ? 'تعديل حركة رأس المال' : 'تسجيل حركة رأس مال جديدة'} 
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2" dir="rtl">
        {error && (
          <div className="p-3 text-sm text-[var(--admin-danger)] bg-[var(--admin-danger)]/10 border border-[var(--admin-danger)]/20 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">نوع الحركة *</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as any})}
              className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
            >
              <option value="increase">إيداع / زيادة رأس مال</option>
              <option value="withdrawal">سحب / مسحوبات شخصية</option>
            </select>
          </div>

          <div>
            <Input 
              type="text" 
              label="اسم المستثمر / الشريك *"
              required
              value={formData.owner}
              onChange={e => setFormData({...formData, owner: e.target.value})}
              placeholder="مثال: الشريك الأول"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--admin-text-muted)]">المبلغ *</label>
            <div className="flex relative">
              <input 
                type="number" 
                required
                min="0"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] rounded-r-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-12"
              />
              <span className="inline-flex items-center px-3 border border-r-0 border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-subtle)] rounded-l-lg text-sm h-12">
                ج.م
              </span>
            </div>
          </div>

          <div>
            <Input 
              type="date" 
              label="تاريخ الحركة *"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div>
            <TextArea 
              label="ملاحظات والتفاصيل"
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
            variant={formData.type === 'increase' ? 'success' : 'danger'}
            disabled={isSubmitting}
            leftIcon={isSubmitting ? undefined : <IconDeviceFloppy size={16} />}
          >
            {isSubmitting ? 'جاري الحفظ...' : (formData.type === 'increase' ? 'حفظ إيداع' : 'حفظ سحب')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
