'use client';

import React, { useEffect, useState } from 'react';
import { create } from 'zustand';
import { businessService, Capital } from '@/lib/services/business.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { DataTable } from '@/components/admin/design-system/DataTable';
import { adminAr } from '@/lib/i18n/admin-ar';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { toast } from 'sonner';
import { CapitalModal } from '@/components/admin/business/CapitalModal';
import { EntityDeleteDialog } from '@/components/admin/crud/EntityDialogs';
import { Button } from '@/components/admin/design-system/Button';

interface CapitalState {
  data: Capital[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

const useCapitalStore = create<CapitalState>((set) => ({
  data: [],
  isLoading: true,
  fetchData: async () => {
    try {
      const data = await businessService.getCapital();
      set({ data, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));

export default function CapitalPage() {
  const { data, isLoading, fetchData } = useCapitalStore();
  const t = adminAr.business.capital;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCapital, setEditingCapital] = useState<Capital | null>(null);
  
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventSubscribeMany(REFRESH_EVENTS.finance, fetchData);

  const handleSave = async (capitalData: Omit<Capital, 'id'>) => {
    if (editingCapital) {
      await businessService.updateCapital(editingCapital.id, capitalData);
      toast.success('تم التعديل بنجاح', {
        action: { label: 'تراجع', onClick: () => businessService.updateCapital(editingCapital.id, editingCapital).then(fetchData).catch(() => toast.error('فشل التراجع')) }
      });
    } else {
      await businessService.createCapital(capitalData);
      toast.success('تمت الإضافة بنجاح');
    }
    fetchData();
  };

  const handleDuplicate = async (item: Capital) => {
    const { id, ...rest } = item;
    await businessService.createCapital({ ...rest, owner: `${rest.owner} (نسخة)` });
    toast.success('تم التكرار بنجاح');
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    setIsProcessing(true);
    try {
      await businessService.deleteCapital(deleteDialog.id);
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
          onClick={() => { setEditingCapital(null); setIsModalOpen(true); }} 
        >
          + {t.addCapital}
        </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <DataTable<Capital>
          data={data}
          isLoading={isLoading}
          columns={[
            { accessor: 'owner', header: t.owner },
            { accessor: 'type', header: t.type, render: (_, c) => (
              <span className={`px-2 py-1 rounded-[var(--admin-radius-sm)] text-xs font-medium ${c.type === 'increase' ? 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' : 'bg-[var(--admin-danger-muted)] text-[var(--admin-danger)]'}`}>
                {c.type === 'increase' ? t.increase : t.withdrawal}
              </span>
            )},
            { accessor: 'amount', header: t.amount, render: (_, c) => <span className="font-bold tabular-nums">{formatCurrency(c.amount)}</span> },
            { accessor: 'reason', header: t.reason },
            { accessor: 'date', header: t.date, render: (_, c) => new Date(c.date).toLocaleDateString('ar-SA') }
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(item) => { setEditingCapital(item); setIsModalOpen(true); }}
          onDuplicate={(item) => handleDuplicate(item)}
          onDelete={(item) => setDeleteDialog({ isOpen: true, id: item.id })}
        />
      </div>

      <CapitalModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingCapital} 
      />

      <EntityDeleteDialog 
        isOpen={deleteDialog.isOpen} 
        onClose={() => setDeleteDialog({ isOpen: false, id: null })} 
        onConfirm={confirmDelete}
        title="حذف حركة رأس المال"
        description="هل أنت متأكد من رغبتك في حذف هذه الحركة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        isProcessing={isProcessing}
      />
    </div>
  );
}
