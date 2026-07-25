'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { businessService, Supplier } from '@/lib/services/business.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { DataTable } from '@/components/admin/design-system/DataTable';
import { adminAr } from '@/lib/i18n/admin-ar';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { toast } from 'sonner';
import { EntityDeleteDialog, EntityArchiveDialog } from '@/components/admin/crud/EntityDialogs';
import { Button } from '@/components/admin/design-system/Button';
import { useRouter } from 'next/navigation';

interface SuppliersState {
  data: Supplier[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

const useSuppliersStore = create<SuppliersState>((set) => ({
  data: [],
  isLoading: true,
  fetchData: async () => {
    try {
      const data = await businessService.getSuppliers();
      set({ data, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));

export default function SuppliersPage() {
  const { data, isLoading, fetchData } = useSuppliersStore();
  const t = adminAr.business.suppliers;
  const router = useRouter();

  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [archiveDialog, setArchiveDialog] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventSubscribeMany(REFRESH_EVENTS.suppliers, fetchData);

  const handleDuplicate = async (item: Supplier) => {
    const { id, totalPurchases, outstandingBalance, ...rest } = item;
    await businessService.createSupplier({ ...rest, name: `${rest.name} (نسخة)`, supplierCode: `${rest.supplierCode}-COPY` });
    toast.success('تم التكرار بنجاح');
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    setIsProcessing(true);
    try {
      await businessService.deleteSupplier(deleteDialog.id);
      toast.success('تم الحذف بنجاح');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setIsProcessing(false);
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const confirmArchive = async () => {
    if (!archiveDialog.id) return;
    setIsProcessing(true);
    try {
      await businessService.archiveSupplier(archiveDialog.id);
      toast.success('تمت الأرشفة بنجاح');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setIsProcessing(false);
      setArchiveDialog({ isOpen: false, id: null });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">{t.title}</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">{t.subtitle}</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/admin/business/suppliers/new')}>
          + {t.addSupplier}
        </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <DataTable<Supplier>
          data={data}
          isLoading={isLoading}
          columns={[
            { accessor: 'supplierCode', header: t.supplierCode },
            { accessor: 'name', header: t.companyName },
            { accessor: 'contactName', header: t.contactPerson },
            { accessor: 'phone', header: t.phone },
            { accessor: 'totalPurchases', header: 'إجمالي المشتريات', render: (_, s) => <span className="tabular-nums">{formatCurrency(s.totalPurchases)}</span> },
            { accessor: 'status', header: t.status, render: (_, s) => (
              <span className={`px-2 py-1 rounded-[var(--admin-radius-sm)] text-xs font-medium ${
                s.status === 'active' ? 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' : 'bg-[var(--admin-bg-hover)] text-[var(--admin-text-muted)]'
              }`}>
                {s.status === 'active' ? adminAr.status.active : adminAr.status.inactive}
              </span>
            )}
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(item) => router.push(`/admin/business/suppliers/${item.id}`)}
          onDuplicate={(item) => handleDuplicate(item)}
          onArchive={(item) => setArchiveDialog({ isOpen: true, id: item.id })}
          onDelete={(item) => setDeleteDialog({ isOpen: true, id: item.id })}
        />
      </div>

      <EntityDeleteDialog 
        isOpen={deleteDialog.isOpen} 
        onClose={() => setDeleteDialog({ isOpen: false, id: null })} 
        onConfirm={confirmDelete}
        title="حذف المورد"
        description="هل أنت متأكد من رغبتك في حذف هذا المورد نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع سجلاته."
        isProcessing={isProcessing}
      />

      <EntityArchiveDialog 
        isOpen={archiveDialog.isOpen} 
        onClose={() => setArchiveDialog({ isOpen: false, id: null })} 
        onConfirm={confirmArchive}
        title="أرشفة المورد"
        description="هل أنت متأكد من رغبتك في إيقاف / أرشفة هذا المورد؟ سيتم إخفاؤه من النشط."
        isProcessing={isProcessing}
      />
    </div>
  );
}
