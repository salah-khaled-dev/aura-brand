"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  IconArrowUpRight, IconArrowDownRight, IconArrowsExchange,
  IconAdjustments, IconChevronRight, IconPencil, IconTrash,
} from '@tabler/icons-react';
import { InventoryService, InventoryMovement } from '@/lib/services/inventory.service';
import { ProductService } from '@/lib/services/product.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/design-system/Card';
import { Badge } from '@/components/admin/design-system/Badge';
import { Button } from '@/components/admin/design-system/Button';
import { Modal } from '@/components/admin/design-system/Modal';
import { Input } from '@/components/admin/design-system/Input';
import { TextArea } from '@/components/admin/design-system/TextArea';
import { PageHeader } from '@/components/admin/design-system/Layout';
import { DataTable, Column } from '@/components/admin/design-system/DataTable';
import { StaggerContainer, StaggerItem } from '@/components/admin/ui/motion';
import { adminAr } from '@/lib/i18n/admin-ar';
import { isUUID } from '@/lib/utils/uuid';

interface ProductOption { id: string; name: string; sku: string }

const TYPE_CONFIG: Record<InventoryMovement['type'], { label: string; variant: 'success' | 'danger' | 'primary' | 'warning' }> = {
  receive:      { label: 'وارد',           variant: 'success'  },
  deduct:       { label: 'منصرف',          variant: 'danger'   },
  return:       { label: 'مرتجع',          variant: 'primary'  },
  adjustment:   { label: 'تسوية',          variant: 'warning'  },
  transfer_in:  { label: 'تحويل وارد',     variant: 'success'  },
  transfer_out: { label: 'تحويل صادر',     variant: 'danger'   },
};

export default function StockMovementsPage() {
  const t = adminAr.inventory;
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryMovement | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editReason, setEditReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InventoryMovement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMovements(await InventoryService.getMovements());
    } catch {
      toast.error('فشل في تحميل حركات المخزون');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    ProductService.getProducts()
      .then(list => setProducts(list.map(p => ({ id: p.id, name: p.name, sku: p.sku }))))
      .catch(console.error);
  }, []);

  const handleAdjust = async () => {
    const qty = parseInt(adjustQty, 10);
    if (!adjustProductId)     { toast.error('اختر المنتج'); return; }
    if (!isUUID(adjustProductId)) { toast.error('معرّف المنتج غير صالح'); return; }
    if (isNaN(qty))               { toast.error('أدخل كمية صحيحة'); return; }
    if (!adjustReason.trim())     { toast.error('أدخل سبب التسوية'); return; }
    setSaving(true);
    try {
      await InventoryService.adjustStock(adjustProductId, undefined, qty, adjustReason);
      toast.success('تم تسجيل تسوية المخزون');
      setAdjustModal(false);
      setAdjustProductId(''); setAdjustQty(''); setAdjustReason('');
      load();
    } catch {
      toast.error('فشل في تسوية المخزون');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty === 0) { toast.error('أدخل كمية صحيحة'); return; }
    if (!editReason.trim()) { toast.error('أدخل سبب الحركة'); return; }
    setSaving(true);
    try {
      await InventoryService.updateMovement(editTarget.id, { quantity: qty, reason: editReason });
      toast.success('تم تعديل الحركة');
      setEditTarget(null);
      load();
    } catch {
      toast.error('فشل في تعديل الحركة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await InventoryService.deleteMovement(deleteTarget.id);
      toast.success('تم حذف التسوية وعكس أثرها على المخزون');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل في حذف الحركة');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<InventoryMovement>[] = [
    {
      header: 'المنتج / المتغير',
      accessor: 'productId',
      type: 'custom',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--admin-text-base)]">{row.productId}</span>
          {row.variantId && <span className="text-xs text-[var(--admin-text-subtle)] font-mono">{row.variantId}</span>}
        </div>
      ),
    },
    {
      header: 'النوع',
      accessor: 'type',
      type: 'custom',
      render: (_, row) => (
        <Badge variant={TYPE_CONFIG[row.type].variant} size="sm">
          {TYPE_CONFIG[row.type].label}
        </Badge>
      ),
    },
    {
      header: 'الكمية',
      accessor: 'quantity',
      type: 'custom',
      render: (_, row) => (
        <div className={`flex items-center gap-1 font-bold tabular-nums ${row.quantity > 0 ? 'text-[var(--admin-success)]' : 'text-[var(--admin-danger)]'}`}>
          {row.quantity > 0 ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
          {Math.abs(row.quantity)}
        </div>
      ),
    },
    { header: 'السبب', accessor: 'reason' },
    {
      header: 'التاريخ',
      accessor: 'date',
      type: 'custom',
      render: (_, row) => (
        <span className="text-[var(--admin-text-muted)] text-xs">
          {new Date(row.date).toLocaleString('ar-SA')}
        </span>
      ),
    },
    {
      header: 'المسؤول',
      accessor: 'userId',
      type: 'custom',
      render: (_, row) => (
        <span className="text-xs text-[var(--admin-text-subtle)] font-mono">{row.userId}</span>
      ),
    },
    {
      header: 'الإجراءات',
      accessor: 'id',
      type: 'custom',
      render: (_, row) => (
        row.type === 'adjustment' ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<IconPencil size={14} />}
              onClick={() => { setEditTarget(row); setEditQty(String(row.quantity)); setEditReason(row.reason); }}
            >
              تعديل
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<IconTrash size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              حذف
            </Button>
          </div>
        ) : (
          <span className="text-xs text-[var(--admin-text-subtle)]">حركة نظام</span>
        )
      ),
    },
  ];

  const filtered = movements.filter(m =>
    !search ||
    m.productId.toLowerCase().includes(search.toLowerCase()) ||
    m.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <StaggerContainer className="space-y-6 pb-12">
      <StaggerItem>
        <div className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)] mb-2">
          <Link href="/admin/inventory" className="hover:text-[var(--admin-primary)] transition-colors">المخزون</Link>
          <IconChevronRight size={14} />
          <span className="text-[var(--admin-text-base)] font-medium">{t.stockMovements}</span>
        </div>
        <PageHeader
          title={t.stockMovements}
          description={t.stockMovementsSubtitle}
          actions={
            <Button
              variant="primary"
              size="md"
              leftIcon={<IconAdjustments size={18} />}
              onClick={() => { setAdjustModal(true); setAdjustProductId(''); setAdjustQty(''); setAdjustReason(''); }}
            >
              تسوية يدوية
            </Button>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)] pb-4">
            <div className="flex items-center gap-3">
              <IconArrowsExchange size={20} className="text-[var(--admin-primary)]" />
              <CardTitle>سجل حركات المخزون</CardTitle>
            </div>
            <span className="text-sm font-medium text-[var(--admin-text-muted)] bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] px-3 py-1 rounded-full">
              {filtered.length} حركة
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filtered}
              isLoading={loading}
              searchQuery={search}
              onSearchChange={setSearch}
              pageSize={20}
              className="border-0 shadow-none rounded-none [&_th]:bg-[var(--admin-bg-surface)]"
            />
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Manual Adjustment Modal */}
      <Modal
        isOpen={adjustModal}
        onClose={() => setAdjustModal(false)}
        title="تسوية مخزون يدوية"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAdjustModal(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleAdjust} disabled={saving} isLoading={saving}>تأكيد التسوية</Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">المنتج</label>
            <select
              required
              value={adjustProductId}
              onChange={e => setAdjustProductId(e.target.value)}
              className="w-full h-12 px-4 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)] focus:ring-4 focus:ring-[var(--admin-primary-muted)] focus:border-[var(--admin-primary)] outline-none"
            >
              <option value="" disabled>اختر المنتج...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <Input
            label={adminAr.inventory.adjustmentQty}
            type="number"
            placeholder="قيمة موجبة للإضافة، سالبة للخصم"
            value={adjustQty}
            onChange={e => setAdjustQty(e.target.value)}
          />
          <TextArea
            label={adminAr.inventory.adjustmentReason}
            placeholder="سبب التسوية..."
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* Edit Adjustment Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="تعديل تسوية المخزون"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button variant="primary" onClick={handleEdit} disabled={saving} isLoading={saving}>حفظ التعديل</Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <p className="text-sm text-[var(--admin-text-muted)] mb-1">المنتج</p>
            <p className="font-semibold text-[var(--admin-text-base)]">{editTarget?.productName ?? editTarget?.productId}</p>
          </div>
          <Input
            label={adminAr.inventory.adjustmentQty}
            type="number"
            placeholder="قيمة موجبة للإضافة، سالبة للخصم"
            value={editQty}
            onChange={e => setEditQty(e.target.value)}
          />
          <TextArea
            label={adminAr.inventory.adjustmentReason}
            placeholder="سبب التسوية..."
            value={editReason}
            onChange={e => setEditReason(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* Delete Adjustment Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف تسوية المخزون"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="danger" onClick={handleDelete} disabled={saving} isLoading={saving}>تأكيد الحذف</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--admin-text-muted)] py-2">
          سيتم حذف هذه التسوية وعكس أثرها على رصيد المخزون. لا يمكن التراجع عن هذا الإجراء.
        </p>
      </Modal>
    </StaggerContainer>
  );
}
