'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconDeviceFloppy as Save, IconArrowRight as ArrowRight, IconShoppingCart as ShoppingCart, IconCurrencyDollar as DollarSign, IconCalendar as Calendar, IconFileText as FileText, IconPlus as Plus, IconTrash as Trash2 } from '@tabler/icons-react';
import { businessService, PurchaseOrder, Supplier } from '@/lib/services/business.service';
import { ProductService } from '@/lib/services/product.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { toast } from 'sonner';

interface PurchaseOrderEditorProps {
  id?: string;
}

export function PurchaseOrderEditor({ id }: PurchaseOrderEditorProps) {
  const router = useRouter();
  const isNew = !id || id === 'new';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; costPrice: number }[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id'>>({
    supplierId: '',
    reference: `PO-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString().split('T')[0],
    expectedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    status: 'draft',
    paymentStatus: 'unpaid',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    businessService.getSuppliers().then(setSuppliers).catch(() => toast.error('فشل تحميل الموردين'));
    ProductService.getProducts()
      .then(list => setProducts(list.map(p => ({ id: p.id, name: p.name, sku: p.sku, costPrice: p.costPrice ?? 0 }))))
      .catch(() => toast.error('فشل تحميل المنتجات'));

    if (!isNew && id) {
      businessService.getPurchaseOrders()
        .then(orders => {
          const order = orders.find(o => o.id === id);
          if (order) {
            setFormData(order);
          } else {
            toast.error('أمر الشراء غير موجود');
            router.push('/admin/business/purchase-orders');
          }
        })
        .catch(() => toast.error('فشل تحميل أمر الشراء'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id, isNew, router]);

  // Recalculate totals when items, tax, or shipping change
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const taxAmount = subtotal * (formData.tax / 100);
    const total = subtotal + taxAmount + formData.shipping;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total,
      items: prev.items.map(item => ({ ...item, total: item.quantity * item.unitCost }))
    }));
  }, [formData.items.length, formData.items.map(i => i.quantity + '-' + i.unitCost).join(','), formData.tax, formData.shipping]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, unitCost: 0, total: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      productId: productId || undefined,
      ...(product ? { name: product.name, unitCost: newItems[index].unitCost || product.costPrice } : {}),
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleReceive = async () => {
    if (!id || isNew) return;
    if (!confirm('سيتم استلام أمر الشراء وزيادة المخزون للمنتجات المرتبطة. هل تريد المتابعة؟')) return;
    setIsReceiving(true);
    try {
      await businessService.receivePurchaseOrder(id);
      toast.success('تم استلام أمر الشراء وتحديث المخزون');
      router.push('/admin/business/purchase-orders');
    } catch (err: any) {
      toast.error(err.message || 'فشل في استلام أمر الشراء');
    } finally {
      setIsReceiving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error('الرجاء اختيار المورد');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('الرجاء إضافة عنصر واحد على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isNew) {
        await businessService.createPurchaseOrder(formData);
        toast.success('تم إنشاء أمر الشراء بنجاح');
      } else {
        await businessService.updatePurchaseOrder(id!, formData);
        toast.success('تم تحديث أمر الشراء بنجاح');
      }
      router.push('/admin/business/purchase-orders');
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
            onClick={() => router.push('/admin/business/purchase-orders')}
            className="p-2 hover:bg-[var(--admin-bg-hover)] rounded-lg transition-colors text-[var(--admin-text-subtle)]"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--admin-text-base)]">
              {isNew ? 'إضافة أمر شراء جديد' : `تعديل أمر شراء: ${formData.reference}`}
            </h1>
            <p className="text-sm text-[var(--admin-text-subtle)]">إدارة تفاصيل أمر الشراء وعناصره</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/business/purchase-orders')}
            className="px-4 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border-base)] text-[var(--admin-text-muted)] font-medium rounded-lg hover:bg-[var(--admin-bg-base)]"
          >
            إلغاء
          </button>
          {!isNew && formData.status !== 'received' && formData.status !== 'cancelled' && (
            <button
              onClick={handleReceive}
              disabled={isReceiving}
              className="px-6 py-2 bg-[var(--admin-success)] text-white font-medium rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isReceiving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShoppingCart size={18} />}
              استلام وتحديث المخزون
            </button>
          )}
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-[var(--admin-primary)] text-white font-medium rounded-lg hover:bg-[var(--admin-primary)]/90 transition-colors flex items-center gap-2"
          >
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            حفظ أمر الشراء
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)] flex items-center gap-2">
              <ShoppingCart size={18} className="text-[var(--admin-primary)]" />
              <h2 className="font-bold text-[var(--admin-text-base)]">تفاصيل الطلب</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">المورد *</label>
                <select 
                  required value={formData.supplierId}
                  onChange={e => setFormData({...formData, supplierId: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                >
                  <option value="" disabled>اختر المورد...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplierCode})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">رقم المرجع (PO Reference) *</label>
                  <input 
                    type="text" required value={formData.reference}
                    onChange={e => setFormData({...formData, reference: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none text-left" dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">تاريخ الطلب *</label>
                  <input 
                    type="date" required value={formData.date.split('T')[0]}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">تاريخ الوصول المتوقع *</label>
                  <input 
                    type="date" required value={formData.expectedArrival.split('T')[0]}
                    onChange={e => setFormData({...formData, expectedArrival: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">تاريخ الاستلام الفعلي</label>
                  <input 
                    type="date" value={formData.receivedDate?.split('T')[0] || ''}
                    onChange={e => setFormData({...formData, receivedDate: e.target.value})}
                    className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[var(--admin-primary)]" />
                <h2 className="font-bold text-[var(--admin-text-base)]">عناصر الطلب</h2>
              </div>
              <button 
                type="button" onClick={handleAddItem}
                className="text-sm font-medium text-[var(--admin-primary)] hover:text-[var(--admin-primary)]/80 flex items-center gap-1"
              >
                <Plus size={16} />
                إضافة عنصر
              </button>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-right">
                <thead className="bg-[var(--admin-bg-base)] text-[var(--admin-text-subtle)]">
                  <tr>
                    <th className="px-6 py-3 font-medium">المنتج / المادة</th>
                    <th className="px-6 py-3 font-medium w-24">الكمية</th>
                    <th className="px-6 py-3 font-medium w-32">سعر الوحدة</th>
                    <th className="px-6 py-3 font-medium w-32">الإجمالي</th>
                    <th className="px-6 py-3 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {formData.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--admin-text-subtle)]">
                        لم يتم إضافة عناصر بعد
                      </td>
                    </tr>
                  )}
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-3">
                        <div className="space-y-1">
                          <select
                            value={item.productId || ''}
                            onChange={e => handleSelectProduct(index, e.target.value)}
                            className="w-full px-2 py-1 border border-[var(--admin-border-base)] rounded focus:ring-2 focus:ring-[var(--admin-primary)] outline-none text-xs bg-[var(--admin-bg-base)]"
                          >
                            <option value="">— منتج من الكتالوج (اختياري) —</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                          <input
                            type="text" required value={item.name} placeholder="اسم المادة..."
                            onChange={e => handleItemChange(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-[var(--admin-border-base)] rounded focus:ring-2 focus:ring-[var(--admin-primary)] outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input 
                          type="number" required min="1" value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-[var(--admin-border-base)] rounded focus:ring-2 focus:ring-[var(--admin-primary)] outline-none"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input 
                          type="number" required min="0" step="0.01" value={item.unitCost}
                          onChange={e => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-[var(--admin-border-base)] rounded focus:ring-2 focus:ring-[var(--admin-primary)] outline-none"
                        />
                      </td>
                      <td className="px-6 py-3 font-medium">
                        {formatCurrency(item.quantity * item.unitCost)}
                      </td>
                      <td className="px-6 py-3">
                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-[var(--admin-danger)] hover:bg-[var(--admin-danger-muted)] p-1 rounded transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Settings & Summary */}
        <div className="space-y-6">
          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)] flex items-center gap-2">
              <DollarSign size={18} className="text-[var(--admin-primary)]" />
              <h2 className="font-bold text-[var(--admin-text-base)]">الملخص المالي</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--admin-text-subtle)]">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-[var(--admin-text-subtle)]">الضريبة (%)</span>
                <input 
                  type="number" min="0" max="100" value={formData.tax}
                  onChange={e => setFormData({...formData, tax: parseFloat(e.target.value) || 0})}
                  className="w-20 px-2 py-1 border border-[var(--admin-border-base)] rounded outline-none text-left" dir="ltr"
                />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-[var(--admin-text-subtle)]">الشحن</span>
                <input 
                  type="number" min="0" value={formData.shipping}
                  onChange={e => setFormData({...formData, shipping: parseFloat(e.target.value) || 0})}
                  className="w-24 px-2 py-1 border border-[var(--admin-border-base)] rounded outline-none text-left" dir="ltr"
                />
              </div>
              <div className="pt-4 border-t border-[var(--admin-border-light)] flex justify-between items-center">
                <span className="font-bold text-[var(--admin-text-base)]">الإجمالي النهائي</span>
                <span className="font-bold text-lg text-[var(--admin-primary)]">{formatCurrency(formData.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--admin-bg-surface)] rounded-xl shadow-sm border border-[var(--admin-border-base)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--admin-border-light)]">
              <h2 className="font-bold text-[var(--admin-text-base)]">حالة الطلب</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">الحالة العامة</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                >
                  <option value="draft">مسودة</option>
                  <option value="sent">تم الإرسال للمورد</option>
                  <option value="partially_received">مستلم جزئياً</option>
                  <option value="received">مستلم بالكامل</option>
                  <option value="cancelled">ملغى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">حالة الدفع</label>
                <select 
                  value={formData.paymentStatus}
                  onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none"
                >
                  <option value="unpaid">غير مدفوع</option>
                  <option value="partial">مدفوع جزئياً</option>
                  <option value="paid">مدفوع بالكامل</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">ملاحظات داخلية</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-lg focus:ring-2 focus:ring-[var(--admin-primary)] focus:border-[var(--admin-primary)] outline-none h-24 resize-none"
                  placeholder="مثال: يجب مراجعة الفاتورة الضريبية عند الاستلام"
                />
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
