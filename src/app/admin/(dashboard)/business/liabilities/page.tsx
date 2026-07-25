'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { businessService, Liability } from '@/lib/services/business.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { DataTable } from '@/components/admin/design-system/DataTable';
import { adminAr } from '@/lib/i18n/admin-ar';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { toast } from 'sonner';
import { LiabilityModal } from '@/components/admin/business/LiabilityModal';
import { EntityDeleteDialog } from '@/components/admin/crud/EntityDialogs';
import { Button } from '@/components/admin/design-system/Button';

interface LiabilitiesState {
  data: Liability[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

const useLiabilitiesStore = create<LiabilitiesState>((set) => ({
  data: [],
  isLoading: true,
  fetchData: async () => {
    try {
      const data = await businessService.getLiabilities();
      set({ data, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));

export default function LiabilitiesPage() {
  const { data, isLoading, fetchData } = useLiabilitiesStore();
  const t = adminAr.business.liabilities;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventSubscribeMany(REFRESH_EVENTS.finance, fetchData);

  const handleSave = async (liabilityData: Omit<Liability, 'id'>) => {
    if (editingLiability) {
      await businessService.updateLiability(editingLiability.id, liabilityData);
      toast.success('تم التعديل بنجاح', {
        action: { label: 'تراجع', onClick: () => businessService.updateLiability(editingLiability.id, editingLiability).then(fetchData).catch(() => toast.error('فشل التراجع')) }
      });
    } else {
      await businessService.createLiability({ ...liabilityData, status: 'unpaid' });
      toast.success('تمت الإضافة بنجاح');
    }
    fetchData();
  };

  const handleDuplicate = async (item: Liability) => {
    const { id, ...rest } = item;
    await businessService.createLiability({ ...rest, name: `${rest.name} (نسخة)` });
    toast.success('تم التكرار بنجاح');
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    setIsProcessing(true);
    try {
      await businessService.deleteLiability(deleteDialog.id);
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
        <Button 
          variant="primary"
          onClick={() => { setEditingLiability(null); setIsModalOpen(true); }} 
        >
          + {t.addLiability}
        </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <DataTable<Liability>
          data={data}
          isLoading={isLoading}
          columns={[
            { accessor: 'name', header: t.name },
            { accessor: 'type', header: t.type },
            { accessor: 'dueDate', header: t.dueDate, render: (_, l) => new Date(l.dueDate).toLocaleDateString('ar-SA') },
            { accessor: 'amount', header: t.amount, render: (_, l) => <span className="font-bold text-[var(--admin-danger)] tabular-nums">{formatCurrency(l.amount)}</span> },
            { accessor: 'status', header: t.status, render: (_, l) => (
              <span className={`px-2 py-1 rounded-[var(--admin-radius-sm)] text-xs font-medium ${l.status === 'paid' ? 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' : 'bg-[var(--admin-danger-muted)] text-[var(--admin-danger)]'}`}>
                {l.status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
              </span>
            )}
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(item) => { setEditingLiability(item); setIsModalOpen(true); }}
          onDuplicate={(item) => handleDuplicate(item)}
          onDelete={(item) => setDeleteDialog({ isOpen: true, id: item.id })}
        />
      </div>

      <LiabilityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingLiability} 
      />

      <EntityDeleteDialog 
        isOpen={deleteDialog.isOpen} 
        onClose={() => setDeleteDialog({ isOpen: false, id: null })} 
        onConfirm={confirmDelete}
        title="حذف الالتزام"
        description="هل أنت متأكد من رغبتك في حذف هذا الالتزام نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        isProcessing={isProcessing}
      />
    </div>
  );
}
