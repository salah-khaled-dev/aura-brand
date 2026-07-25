'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconDeviceFloppy as Save, IconArrowRight as ArrowRight, IconUser as User, IconMapPin as MapPin, IconBriefcase as Briefcase, IconFileText as FileText } from '@tabler/icons-react';
import { businessService, Supplier } from '@/lib/services/business.service';
import { toast } from 'sonner';

interface SupplierEditorProps {
  id?: string;
}

export function SupplierEditor({ id }: SupplierEditorProps) {
  const router = useRouter();
  const isNew = !id || id === 'new';

  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'totalPurchases' | 'outstandingBalance'>>({
    name: '',
    supplierCode: '',
    contactName: '',
    email: '',
    phone: '',
    whatsapp: '',
    country: 'السعودية',
    city: '',
    address: '',
    taxNumber: '',
    commercialRegistration: '',
    paymentTerms: 'net_30',
    currency: 'EGP',
    materialsProvided: [],
    status: 'active',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      businessService.getSupplier(id)
        .then(supplier => {
          if (supplier) {
            setFormData(supplier);
          } else {
            toast.error('المورد غير موجود');
            router.push('/admin/business/suppliers');
          }
        })
        .catch(() => toast.error('فشل تحميل بيانات المورد'))
        .finally(() => setIsLoading(false));
    }
  }, [id, isNew, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactPerson) {
      toast.error('الرجاء تعبئة الحقول الإلزامية');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isNew) {
        await businessService.createSupplier(formData);
        toast.success('تم إنشاء المورد بنجاح');
      } else {
        await businessService.updateSupplier(id!, formData);
        toast.success('تم تحديث المورد بنجاح');
      }
      router.push('/admin/business/suppliers');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between bg-[var(--admin-bg-surface)] p-4 rounded-xl shadow-sm border border-[var(--admin-border-base)] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/business/suppliers')}
            className="p-2 hover:bg-[var(--admin-bg-hover)] rounded-lg transition-colors text-[var(--admin-text-subtle)]"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--admin-text-base)]">
              {isNew ? 'إضافة مورد جديد' : `تعديل المورد: ${formData.name}`}
            </h1>
            <p className="text-sm text-[var(--admin-text-subtle)]">إدارة تفاصيل وبيانات المورد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push('/admin/business/suppliers')}
            className="px-4 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border-base)] text-[var(--admin-text-muted)] font-medium rounded-lg hover:bg-[var(--admin-bg-base)]"
          >
            إلغاء
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-[var(--admin-primary)] text-white font-medium rounded-lg hover:bg-[var(--admin-primary)]/90 transition-colors flex items-center gap-2"
          >
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            حفظ المورد
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)] flex items-center gap-2">
              <Briefcase size={18} className="text-[var(--admin-primary)]" />
              <h2 className="font-bold text-[var(--admin-text-base)]">المعلومات الأساسية</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">اسم الشركة / المورد *</label>
                  <input 
                    type="text" required value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">رمز المورد</label>
                  <input 
                    type="text" value={formData.supplierCode}
                    onChange={e => setFormData({...formData, supplierCode: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">السجل التجاري</label>
                  <input 
                    type="text" value={formData.commercialRegistration}
                    onChange={e => setFormData({...formData, commercialRegistration: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">الرقم الضريبي</label>
                  <input 
                    type="text" value={formData.taxNumber}
                    onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                    placeholder="اختياري"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)] flex items-center gap-2">
              <User size={18} className="text-[var(--admin-primary)]" />
              <h2 className="font-bold text-[var(--admin-text-base)]">معلومات التواصل</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">اسم المسؤول *</label>
                <input 
                  type="text" required value={formData.contactName}
                  onChange={e => setFormData({...formData, contactName: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">رقم الهاتف *</label>
                <input 
                  type="tel" required value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none text-left" dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">البريد الإلكتروني *</label>
                <input 
                  type="email" required value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none text-left" dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)]">
              <h2 className="font-bold text-[var(--admin-text-base)]">حالة المورد</h2>
            </div>
            <div className="p-6">
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
                className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
              >
                <option value="active">نشط (Active)</option>
                <option value="inactive">غير نشط (Inactive / Archived)</option>
                <option value="blacklisted">قائمة سوداء (Blacklisted)</option>
              </select>
            </div>
          </div>

          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)] flex items-center gap-2">
              <FileText size={18} className="text-[var(--admin-primary)]" />
              <h2 className="font-bold text-[var(--admin-text-base)]">الشروط المالية</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">شروط الدفع</label>
                <select className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg outline-none">
                  <option value="net30">Net 30</option>
                  <option value="net60">Net 60</option>
                  <option value="advance">الدفع مقدماً</option>
                  <option value="delivery">الدفع عند الاستلام</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">العملة المفضلة</label>
                <select className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg outline-none">
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
