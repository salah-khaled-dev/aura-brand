'use client';

import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { businessService, Expense } from '@/lib/services/business.service';
import { DataTable } from '@/components/admin/design-system/DataTable';
import { adminAr } from '@/lib/i18n/admin-ar';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { toast } from 'sonner';
import { Button } from '@/components/admin/design-system/Button';
import { ExpenseModal } from '@/components/admin/business/ExpenseModal';
import { EntityDeleteDialog } from '@/components/admin/crud/EntityDialogs';

interface CostsState {
  data: Expense[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

const useCostsStore = create<CostsState>((set) => ({
  data: [],
  isLoading: true,
  fetchData: async () => {
    try {
      const data = await businessService.getExpenses();
      set({ data, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));

export default function ManufacturingCostsPage() {
  const { data, isLoading, fetchData } = useCostsStore();
  const t = adminAr.business.manufacturingCosts;
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventSubscribeMany(REFRESH_EVENTS.finance, fetchData);

  const filteredData = useMemo(() => data.filter(e => e.category === 'manufacturing'), [data]);

  const handleSave = async (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      await businessService.updateExpense(editingExpense.id, expenseData);
      toast.success(adminAr.toasts.dataSaved, {
        action: { label: 'تراجع', onClick: () => businessService.updateExpense(editingExpense.id, editingExpense).then(fetchData).catch(() => toast.error('فشل التراجع')) }
      });
    } else {
      await businessService.createExpense({ ...expenseData, category: 'manufacturing' });
      toast.success(adminAr.toasts.dataSaved);
    }
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    setIsProcessing(true);
    try {
      await businessService.deleteExpense(deleteDialog.id);
      toast.success(adminAr.toasts.itemsDeleted);
      fetchData();
    } catch (e) {
      toast.error(adminAr.toasts.unexpectedError);
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
        <Button variant="primary" onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>
          + {t.addCost}
        </Button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <DataTable<Expense>
          data={filteredData}
          isLoading={isLoading}
          columns={[
            { accessor: 'name', header: adminAr.business.expenses.expenseName },
            { accessor: 'amount', header: adminAr.business.expenses.amount, render: (_, e) => <span className="font-bold text-[var(--admin-danger)] tabular-nums">{e.amount.toLocaleString()} {e.currency}</span> },
            { accessor: 'date', header: adminAr.business.expenses.date, render: (_, e) => new Date(e.date).toLocaleDateString('ar-SA') },
            { accessor: 'status', header: adminAr.business.expenses.status, render: (_, e) => (
              <span className={`px-2 py-1 rounded-[var(--admin-radius-sm)] text-xs font-medium ${e.status === 'paid' ? 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' : 'bg-[var(--admin-warning-muted)] text-[var(--admin-warning)]'}`}>
                {e.status === 'paid' ? adminAr.status.paid : adminAr.status.pending}
              </span>
            )}
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(item) => { setEditingExpense(item); setIsModalOpen(true); }}
          onDelete={(item) => setDeleteDialog({ isOpen: true, id: item.id as string })}
        />
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingExpense}
      />

      <EntityDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="حذف تكلفة التصنيع"
        description="هل أنت متأكد من رغبتك في حذف هذه التكلفة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        isProcessing={isProcessing}
      />
    </div>
  );
}
