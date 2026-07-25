'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { businessService, PurchaseOrder } from '@/lib/services/business.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { DataTable } from '@/components/admin/design-system/DataTable';
import { adminAr } from '@/lib/i18n/admin-ar';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { toast } from 'sonner';
import { EntityDeleteDialog } from '@/components/admin/crud/EntityDialogs';
import { Button } from '@/components/admin/design-system/Button';
import { useRouter } from 'next/navigation';

interface PurchaseOrdersState {
  data: PurchaseOrder[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

const usePurchaseOrdersStore = create<PurchaseOrdersState>((set) => ({
  data: [],
  isLoading: true,
  fetchData: async () => {
    try {
      const data = await businessService.getPurchaseOrders();
      set({ data, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));

export default function PurchaseOrdersPage() {
  const { data, isLoading, fetchData } = usePurchaseOrdersStore();
  const t = adminAr.business.purchaseOrders;
  const router = useRouter();

  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventSubscribeMany(REFRESH_EVENTS.suppliers, fetchData);

  const handleDuplicate = async (item: PurchaseOrder) => {
    const { id, ...rest } = item;
    await businessService.createPurchaseOrder({ 
      ...rest, 
      reference: `${rest.reference}-COPY`,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      paymentStatus: 'unpaid'
    });
    toast.success('تم التكرار بنجاح');
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    setIsProcessing(true);
    try {
      await businessService.deletePurchaseOrder(deleteDialog.id);
      toast.success('تم الحذف بنجاح');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setIsProcessing(false);
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">{t.title}</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">{t.subtitle}</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/admin/business/purchase-orders/new')}>
          + {t.addPO}
        </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <DataTable<PurchaseOrder>
          data={data}
          isLoading={isLoading}
          columns={[
            { accessor: 'reference', header: t.poNumber },
            { accessor: 'date', header: adminAr.dashboard.date, render: (_, p) => new Date(p.date).toLocaleDateString('ar-SA') },
            { accessor: 'total', header: t.cost, render: (_, p) => <span className="font-bold tabular-nums">{formatCurrency(p.total)}</span> },
            { accessor: 'status', header: t.status, render: (_, p) => (
              <span className={`px-2 py-1 rounded-[var(--admin-radius-sm)] text-xs font-medium ${
                p.status === 'received' ? 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' : 
                p.status === 'cancelled' ? 'bg-[var(--admin-danger-muted)] text-[var(--admin-danger)]' :
                'bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]'
              }`}>
                {
                  p.status === 'draft' ? 'مسودة' :
                  p.status === 'sent' ? 'مرسل للمورد' :
                  p.status === 'partially_received' ? 'مستلم جزئياً' :
                  p.status === 'received' ? 'مستلم بالكامل' : 'ملغى'
                }
              </span>
            )}
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(item) => router.push(`/admin/business/purchase-orders/${item.id}`)}
          onDuplicate={(item) => handleDuplicate(item)}
          onDelete={(item) => setDeleteDialog({ isOpen: true, id: item.id })}
        />
      </div>

      <EntityDeleteDialog 
        isOpen={deleteDialog.isOpen} 
        onClose={() => setDeleteDialog({ isOpen: false, id: null })} 
        onConfirm={confirmDelete}
        title="حذف أمر الشراء"
        description="هل أنت متأكد من رغبتك في حذف أمر الشراء نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع سجلاته."
        isProcessing={isProcessing}
      />
    </div>
  );
}
