"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconPlus, IconTrash, IconEdit, IconArchive } from '@tabler/icons-react';
import { EntityDeleteDialog } from '@/components/admin/crud/EntityDialogs';
import { ProductService } from '@/lib/services/product.service';
import type { Product } from '@/data/mock/products';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { usePermissions } from '@/lib/auth/PermissionContext';

import { PageHeader, EmptyState } from '@/components/admin/design-system/Layout';
import { Button } from '@/components/admin/design-system/Button';
import { DataTable, Column } from '@/components/admin/design-system/DataTable';
import { Badge } from '@/components/admin/design-system/Badge';

export default function ProductsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canWrite = can('products', 'write');
  const canDelete = can('products', 'delete');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'winter' | 'summer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'hidden' | 'archived'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'featured' | 'bestSeller' | 'newArrival'>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await ProductService.getProducts();
      setProducts(data);
    } catch {
      toast.error("حدث خطأ أثناء تحميل المنتجات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEventSubscribeMany(REFRESH_EVENTS.products, loadProducts);

  const handleDeleteSelected = async () => {
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => ProductService.deleteProduct(String(id))));
      toast.success("تم حذف المنتجات");
      setSelectedIds([]);
      loadProducts();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setIsBulkDeleting(false);
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const confirmRowDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await ProductService.deleteProduct(deleteDialog.id);
      toast.success("تم حذف المنتج");
      loadProducts();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const columns: Column<Product>[] = [
    {
      header: 'صورة',
      accessor: 'images',
      type: 'custom',
      render: (_, row) => (
        <div className="w-12 h-12 rounded-[var(--admin-radius-sm)] overflow-hidden border border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] p-1">
          <img
            src={row.images?.[0] || 'https://via.placeholder.com/100'}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
      )
    },
    { header: 'الاسم', accessor: 'name', sortable: true },
    { header: 'SKU', accessor: 'sku', sortable: true },
    {
      header: 'الحالة',
      accessor: 'status',
      type: 'custom',
      render: (_, row) => (
        <Badge
          variant={row.status === 'published' ? 'success' : row.status === 'draft' ? 'warning' : 'neutral'}
          size="sm"
          animated
        >
          {row.status === 'published' ? 'منشور' : row.status === 'draft' ? 'مسودة' : row.status}
        </Badge>
      )
    },
    {
      header: 'المخزون',
      accessor: 'stock',
      type: 'custom',
      sortable: true,
      render: (_, row) => (
        <span className={`font-semibold ${row.stock < 10 ? 'text-[var(--admin-danger)]' : 'text-[var(--admin-success)]'}`}>
          {row.stock}
        </span>
      )
    },
    {
      header: 'السعر',
      accessor: 'price',
      type: 'price',
      sortable: true,
    },
    {
      header: '',
      accessor: 'id',
      type: 'actions',
      align: 'end',
      render: (_, row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/admin/products/${row.id}`)}>
            <IconEdit size={16} />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10"
              onClick={() => setDeleteDialog({ isOpen: true, id: row.id })}
            >
              <IconTrash size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  const filteredData = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesSeason = seasonFilter === 'all' || p.season === seasonFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesFlag = flagFilter === 'all' || p[flagFilter] === true;
    return matchesSearch && matchesSeason && matchesStatus && matchesFlag;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 fade-in">
      <PageHeader
        title="المنتجات"
        description="إدارة وتعديل المنتجات وأسعارها"
        actions={
          canWrite ? (
            <Button variant="primary" leftIcon={<IconPlus size={18} />} onClick={() => router.push('/admin/products/new')}>
              إضافة منتج
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value as typeof seasonFilter)}
          className="h-10 px-3 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-surface)] text-sm text-[var(--admin-text-base)] outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
        >
          <option value="all">الموسم: الكل</option>
          <option value="winter">أزياء الشتاء</option>
          <option value="summer">أزياء الصيف</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 px-3 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-surface)] text-sm text-[var(--admin-text-base)] outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
        >
          <option value="all">الحالة: الكل</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
          <option value="hidden">مخفي</option>
          <option value="archived">مؤرشف</option>
        </select>

        <div className="flex items-center gap-1.5">
          {([
            ['all', 'الكل'],
            ['featured', 'مميز'],
            ['bestSeller', 'الأكثر مبيعاً'],
            ['newArrival', 'وصل حديثاً'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFlagFilter(value)}
              className={`px-3 h-10 rounded-[var(--admin-radius-md)] text-xs font-semibold transition-colors border ${
                flagFilter === value
                  ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)]'
                  : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-muted)] border-[var(--admin-border-base)] hover:text-[var(--admin-text-base)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && canDelete && (
        <div className="bg-[var(--admin-primary-muted)] border border-[var(--admin-primary)]/20 p-3 px-4 flex items-center justify-between rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-sm)]">
          <span className="text-sm font-bold text-[var(--admin-primary)]">
            تم تحديد {selectedIds.length} منتجات
          </span>
          <Button size="sm" variant="danger" leftIcon={<IconTrash size={16} />} onClick={() => setDeleteDialog({ isOpen: true, id: null })}>
            حذف المحدد
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        searchQuery={search}
        onSearchChange={setSearch}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        pageSize={15}
        emptyState={
          <EmptyState
            icon={<IconArchive size={48} />}
            title="لا توجد منتجات"
            description="لم يتم العثور على أي منتجات مطابقة لبحثك."
            action={
              <Button variant="secondary" onClick={() => router.push('/admin/products/new')}>
                إضافة منتج
              </Button>
            }
          />
        }
      />

      <EntityDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null })}
        onConfirm={deleteDialog.id ? confirmRowDelete : handleDeleteSelected}
        title="حذف المنتج"
        description={
          deleteDialog.id
            ? 'هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'
            : `هل أنت متأكد من رغبتك في حذف ${selectedIds.length} منتجات؟ لا يمكن التراجع عن هذا الإجراء.`
        }
        isProcessing={isBulkDeleting}
      />
    </div>
  );
}
