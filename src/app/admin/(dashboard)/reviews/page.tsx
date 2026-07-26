"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  IconStar, IconTrash, IconCheck, IconX, IconArchive, IconMessage,
  IconEyeOff, IconPinFilled, IconPin, IconUserCheck, IconPhoto, IconNotes
} from '@tabler/icons-react';
import { ReviewService, Review, ReviewAdminStats } from '@/lib/services/review.service';
import { EntityDeleteDialog } from '@/components/admin/crud/EntityDialogs';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

import { PageHeader, EmptyState } from '@/components/admin/design-system/Layout';
import { Button } from '@/components/admin/design-system/Button';
import { DataTable, Column } from '@/components/admin/design-system/DataTable';
import { Badge } from '@/components/admin/design-system/Badge';
import { Modal } from '@/components/admin/design-system/Modal';

const STATUS_LABELS: Record<Review['status'], string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
  hidden: 'مخفي'
};

const STATUS_VARIANTS: Record<Review['status'], 'success' | 'danger' | 'warning' | 'neutral'> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'warning',
  hidden: 'neutral'
};

const SIZE_FIT_LABELS: Record<string, string> = {
  runs_small: 'أصغر من المقاس',
  true_to_size: 'المقاس مطابق',
  runs_large: 'أكبر من المقاس',
};

type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <IconStar key={s} size={14} className={s <= rating ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-border-strong)]'} fill={s <= rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover border border-[var(--admin-border-light)]" />;
  return (
    <div className="w-9 h-9 rounded-full bg-[var(--admin-primary-muted)] border border-[var(--admin-primary)]/20 flex items-center justify-center text-xs font-bold text-[var(--admin-primary)]">
      {initials}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-light)] rounded-[var(--admin-radius-lg)] p-4">
      <p className="text-[10px] uppercase font-bold text-[var(--admin-text-subtle)] mb-1">{label}</p>
      <p className="text-lg font-bold text-[var(--admin-text-base)] tabular-nums">{value}</p>
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Review['status']>('all');
  const [productFilter, setProductFilter] = useState('all');
  const [starFilter, setStarFilter] = useState<'all' | number>('all');
  const [sizeFitFilter, setSizeFitFilter] = useState<'all' | Review['sizeFit']>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [detailReview, setDetailReview] = useState<Review | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await ReviewService.getReviews();
      setReviews(data);
    } catch (err) {
      toast.error("حدث خطأ أثناء تحميل التقييمات");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStats(await ReviewService.getAdminStats());
    } catch {
      // stats strip stays hidden on failure — non-critical
    }
  };

  useEffect(() => { loadReviews(); loadStats(); }, []);
  useEventSubscribeMany(['reviews.changed', 'review.submitted', 'review.approved', 'review.rejected'], () => { loadReviews(); loadStats(); });

  const openDetail = (review: Review) => {
    setDetailReview(review);
    setReplyDraft(review.adminReply ?? '');
    setNotesDraft(review.adminNotes ?? '');
  };

  const saveReply = async () => {
    if (!detailReview) return;
    setSavingReply(true);
    try {
      const updated = await ReviewService.updateAdminReply(detailReview.id, replyDraft.trim() || null);
      setDetailReview(updated);
      toast.success('تم حفظ الرد');
      loadReviews();
    } catch {
      toast.error("حدث خطأ أثناء حفظ الرد");
    } finally {
      setSavingReply(false);
    }
  };

  const saveNotes = async () => {
    if (!detailReview) return;
    setSavingNotes(true);
    try {
      const updated = await ReviewService.updateAdminNotes(detailReview.id, notesDraft.trim() || null);
      setDetailReview(updated);
      toast.success('تم حفظ الملاحظات الداخلية');
      loadReviews();
    } catch {
      toast.error("حدث خطأ أثناء حفظ الملاحظات");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (id: string, status: Review['status']) => {
    try {
      await ReviewService.updateReviewStatus(id, status);
      toast.success(STATUS_LABELS[status]);
      if (detailReview?.id === id) setDetailReview(prev => prev ? { ...prev, status } : null);
      loadReviews();
      loadStats();
    } catch { toast.error("حدث خطأ"); }
  };

  const toggleFeatured = async (id: string) => {
    try {
      const updated = await ReviewService.toggleFeatured(id);
      if (detailReview?.id === id) setDetailReview(updated);
      loadReviews();
    } catch { toast.error("حدث خطأ"); }
  };

  const togglePinned = async (id: string) => {
    try {
      const updated = await ReviewService.togglePinned(id);
      if (detailReview?.id === id) setDetailReview(updated);
      loadReviews();
    } catch { toast.error("حدث خطأ"); }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!detailReview) return;
    try {
      const updated = await ReviewService.removeReviewImage(detailReview.id, imageUrl);
      setDetailReview(updated);
      toast.success('تم حذف الصورة');
      loadReviews();
    } catch { toast.error("حدث خطأ أثناء حذف الصورة"); }
  };

  const handleDeleteSelected = async () => {
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => ReviewService.deleteReview(String(id))));
      toast.success("تم حذف التقييمات");
      setSelectedIds([]);
      loadReviews();
    } catch { toast.error("حدث خطأ أثناء الحذف"); } finally {
      setIsBulkDeleting(false);
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const confirmRowDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await ReviewService.deleteReview(deleteDialog.id);
      toast.success("تم حذف التقييم");
      if (detailReview?.id === deleteDialog.id) setDetailReview(null);
      loadReviews();
    } catch { toast.error("حدث خطأ أثناء الحذف"); } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const productOptions = Array.from(new Set(reviews.map(r => r.productName).filter(Boolean))).sort();

  const columns: Column<Review>[] = [
    {
      header: 'العميل',
      accessor: 'customerName',
      type: 'custom',
      render: (_, row) => (
        <div className="flex items-center gap-2.5 min-w-[170px]">
          <Avatar name={row.customerName} src={row.customerAvatar} />
          <div>
            <p className="font-bold text-sm text-[var(--admin-text-base)]">{row.customerName}</p>
            <p className="text-[11px] text-[var(--admin-text-subtle)]">{row.customerEmail}</p>
            {row.customerPhone && <p className="text-[11px] text-[var(--admin-text-subtle)]" dir="ltr">{row.customerPhone}</p>}
            {row.orderNumber && <p className="text-[10px] text-[var(--admin-primary)] font-semibold mt-0.5">{row.orderNumber}</p>}
          </div>
        </div>
      )
    },
    {
      header: 'التقييم',
      accessor: 'rating',
      type: 'custom',
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <StarRating rating={row.rating} />
          {row.verifiedPurchase && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--admin-success)] font-medium">
              <IconUserCheck size={11} /> مشترٍ موثّق
            </span>
          )}
          {row.sizeFit && (
            <span className="text-[10px] text-[var(--admin-text-subtle)]">{SIZE_FIT_LABELS[row.sizeFit]}</span>
          )}
          {row.recommended !== undefined && (
            <span className={`text-[10px] font-semibold ${row.recommended ? 'text-[var(--admin-success)]' : 'text-[var(--admin-text-subtle)]'}`}>
              {row.recommended ? '✓ توصي' : '✗ لا توصي'}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'المحتوى',
      accessor: 'content',
      type: 'custom',
      render: (_, row) => (
        <div className="max-w-[260px]">
          <p className="font-bold text-sm truncate text-[var(--admin-text-base)]">{row.title}</p>
          <p className="text-xs text-[var(--admin-text-subtle)] truncate mt-0.5">{row.content}</p>
          {row.adminReply && (
            <p className="text-[10px] text-[var(--admin-primary)] mt-1 truncate">↩ رد المشرف</p>
          )}
        </div>
      )
    },
    {
      header: 'المنتج',
      accessor: 'productName',
      type: 'custom',
      render: (_, row) => (
        <div className="flex items-center gap-2 min-w-[130px]">
          {row.productImage && (
            <img src={row.productImage} alt="" className="w-8 h-10 object-cover rounded border border-[var(--admin-border-light)] shrink-0" />
          )}
          <div>
            <p className="text-xs text-[var(--admin-text-base)] line-clamp-2">{row.productName}</p>
            {(row.productColor || row.productSize) && (
              <p className="text-[10px] text-[var(--admin-text-subtle)]">
                {row.productColor}{row.productColor && row.productSize ? ' / ' : ''}{row.productSize}
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'الصور',
      accessor: 'images',
      type: 'custom',
      render: (_, row) => row.images.length === 0 ? (
        <span className="text-[10px] text-[var(--admin-text-subtle)]">—</span>
      ) : (
        <button
          type="button"
          onClick={() => setLightbox({ images: row.images, index: 0 })}
          className="relative w-9 h-9 rounded border border-[var(--admin-border-light)] overflow-hidden"
        >
          <img src={row.images[0]} alt="" className="w-full h-full object-cover" />
          {row.images.length > 1 && (
            <span className="absolute inset-0 bg-black/40 text-white text-[10px] font-bold flex items-center justify-center">
              +{row.images.length - 1}
            </span>
          )}
        </button>
      )
    },
    {
      header: 'الحالة',
      accessor: 'status',
      type: 'custom',
      render: (_, row) => (
        <Badge variant={STATUS_VARIANTS[row.status]} size="sm" animated>
          {STATUS_LABELS[row.status]}
        </Badge>
      )
    },
    {
      header: 'علامات',
      accessor: 'isFeatured',
      type: 'custom',
      render: (_, row) => (
        <div className="flex gap-1.5">
          <button onClick={() => toggleFeatured(row.id)} title="مميز" className={`transition-colors ${row.isFeatured ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-border-strong)]'}`}>
            <IconStar size={18} fill={row.isFeatured ? "currentColor" : "none"} />
          </button>
          <button onClick={() => togglePinned(row.id)} title="مثبت" className={`transition-colors ${row.isPinned ? 'text-[var(--admin-primary)]' : 'text-[var(--admin-border-strong)]'}`}>
            {row.isPinned ? <IconPinFilled size={18} /> : <IconPin size={18} />}
          </button>
        </div>
      )
    },
    {
      header: 'التاريخ',
      accessor: 'createdAt',
      type: 'custom',
      render: (_, row) => (
        <span className="text-xs text-[var(--admin-text-subtle)] whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      header: '',
      accessor: 'id',
      type: 'actions',
      align: 'end',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" title="رد وتفاصيل" onClick={() => openDetail(row)}>
            <IconMessage size={16} />
          </Button>
          {row.status !== 'approved' && (
            <Button variant="ghost" size="icon-sm" className="text-[var(--admin-success)]" onClick={() => handleStatusChange(row.id, 'approved')}>
              <IconCheck size={16} />
            </Button>
          )}
          {row.status !== 'rejected' && (
            <Button variant="ghost" size="icon-sm" className="text-[var(--admin-danger)]" onClick={() => handleStatusChange(row.id, 'rejected')}>
              <IconX size={16} />
            </Button>
          )}
          {row.status !== 'hidden' && (
            <Button variant="ghost" size="icon-sm" className="text-[var(--admin-text-muted)]" title="إخفاء" onClick={() => handleStatusChange(row.id, 'hidden')}>
              <IconEyeOff size={16} />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" className="text-[var(--admin-danger)]" onClick={() => setDeleteDialog({ isOpen: true, id: row.id })}>
            <IconTrash size={16} />
          </Button>
        </div>
      )
    }
  ];

  const filteredData = reviews
    .filter(r => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        r.customerName.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        (r.orderNumber ?? '').toLowerCase().includes(q) ||
        (r.customerPhone ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesProduct = productFilter === 'all' || r.productName === productFilter;
      const matchesStars = starFilter === 'all' || r.rating === starFilter;
      const matchesSizeFit = sizeFitFilter === 'all' || r.sizeFit === sizeFitFilter;
      return matchesSearch && matchesStatus && matchesProduct && matchesStars && matchesSizeFit;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest': return b.rating - a.rating;
        case 'lowest': return a.rating - b.rating;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 fade-in">
      <PageHeader title="إدارة التقييمات" description="مراجعة واعتماد تقييمات العملاء، الردود الإدارية، وإدارة الظهور" />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="متوسط التقييم" value={stats.averageRating ?? '—'} />
          <StatCard label="إجمالي التقييمات" value={stats.reviewCount} />
          <StatCard label="نسبة القبول" value={stats.approvalRate !== null ? `${stats.approvalRate}%` : '—'} />
          <StatCard
            label="الأكثر تقييماً"
            value={stats.mostReviewedProducts[0] ? `${stats.mostReviewedProducts[0].product_name} (${stats.mostReviewedProducts[0].review_count})` : '—'}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {(['all', 'pending', 'approved', 'rejected', 'hidden'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 h-9 rounded-[var(--admin-radius-md)] text-xs font-semibold border transition-colors ${
              statusFilter === s
                ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)]'
                : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-muted)] border-[var(--admin-border-base)] hover:text-[var(--admin-text-base)]'
            }`}
          >
            {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="h-9 px-3 rounded-[var(--admin-radius-md)] text-xs border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)]">
          <option value="all">كل المنتجات</option>
          {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={starFilter} onChange={e => setStarFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="h-9 px-3 rounded-[var(--admin-radius-md)] text-xs border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)]">
          <option value="all">كل التقييمات</option>
          {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} نجوم</option>)}
        </select>
        <select value={sizeFitFilter ?? 'all'} onChange={e => setSizeFitFilter(e.target.value === 'all' ? 'all' : e.target.value as Review['sizeFit'])} className="h-9 px-3 rounded-[var(--admin-radius-md)] text-xs border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)]">
          <option value="all">كل المقاسات</option>
          {Object.entries(SIZE_FIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)} className="h-9 px-3 rounded-[var(--admin-radius-md)] text-xs border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] text-[var(--admin-text-base)]">
          <option value="newest">الأحدث</option>
          <option value="oldest">الأقدم</option>
          <option value="highest">الأعلى تقييماً</option>
          <option value="lowest">الأقل تقييماً</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-[var(--admin-primary-muted)] border border-[var(--admin-primary)]/20 p-3 px-4 flex items-center justify-between rounded-[var(--admin-radius-xl)]">
          <span className="text-sm font-bold text-[var(--admin-primary)]">تم تحديد {selectedIds.length} تقييمات</span>
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
          <EmptyState icon={<IconArchive size={48} />} title="لا توجد تقييمات" description="لم يتم العثور على أي تقييمات مطابقة." />
        }
      />

      {/* Detail + Admin Reply Modal */}
      <Modal
        isOpen={!!detailReview}
        onClose={() => setDetailReview(null)}
        title="تفاصيل التقييم"
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {detailReview && detailReview.status !== 'approved' && (
                <Button size="sm" variant="secondary" className="text-[var(--admin-success)]" onClick={() => handleStatusChange(detailReview.id, 'approved')}>
                  <IconCheck size={15} className="me-1" /> قبول
                </Button>
              )}
              {detailReview && detailReview.status !== 'rejected' && (
                <Button size="sm" variant="secondary" className="text-[var(--admin-danger)]" onClick={() => handleStatusChange(detailReview.id, 'rejected')}>
                  <IconX size={15} className="me-1" /> رفض
                </Button>
              )}
            </div>
            <Button variant="primary" isLoading={savingReply} onClick={saveReply}>حفظ الرد</Button>
          </div>
        }
      >
        {detailReview && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar name={detailReview.customerName} src={detailReview.customerAvatar} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-[var(--admin-text-base)]">{detailReview.customerName}</p>
                  {detailReview.verifiedPurchase && (
                    <Badge variant="success" size="sm"><IconUserCheck size={11} className="me-1 inline" />مشترٍ موثّق</Badge>
                  )}
                  <Badge variant={STATUS_VARIANTS[detailReview.status]} size="sm">{STATUS_LABELS[detailReview.status]}</Badge>
                </div>
                <p className="text-xs text-[var(--admin-text-subtle)]">{detailReview.customerEmail}</p>
                {detailReview.customerPhone && <p className="text-xs text-[var(--admin-text-subtle)]" dir="ltr">{detailReview.customerPhone}</p>}
                {detailReview.orderNumber && <p className="text-xs text-[var(--admin-primary)] font-semibold">الطلب: {detailReview.orderNumber}</p>}
                <StarRating rating={detailReview.rating} />
              </div>
              <span className="text-xs text-[var(--admin-text-subtle)] shrink-0">
                {new Date(detailReview.createdAt).toLocaleDateString('ar-EG')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {detailReview.sizeFit && <Badge variant="neutral" size="sm">{SIZE_FIT_LABELS[detailReview.sizeFit]}</Badge>}
              {detailReview.recommended !== undefined && (
                <Badge variant={detailReview.recommended ? 'success' : 'neutral'} size="sm">
                  {detailReview.recommended ? '✓ توصي بالمنتج' : '✗ لا توصي بالمنتج'}
                </Badge>
              )}
            </div>

            <div className="p-4 bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-light)]">
              <p className="font-bold text-sm text-[var(--admin-text-base)] mb-1">{detailReview.title}</p>
              <p className="text-sm text-[var(--admin-text-muted)] leading-relaxed">{detailReview.content}</p>
            </div>

            {detailReview.images.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--admin-text-base)] flex items-center gap-1.5"><IconPhoto size={16} /> الصور المرفقة</label>
                <div className="flex flex-wrap gap-2">
                  {detailReview.images.map((url, idx) => (
                    <div key={url} className="relative w-16 h-16 rounded border border-[var(--admin-border-light)] overflow-hidden group">
                      <button type="button" onClick={() => setLightbox({ images: detailReview.images, index: idx })} className="w-full h-full">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(url)}
                        title="حذف هذه الصورة"
                        className="absolute top-0.5 right-0.5 bg-[var(--admin-danger)] text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-md)] border border-[var(--admin-border-light)]">
              {detailReview.productImage && (
                <img src={detailReview.productImage} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
              )}
              <div>
                <p className="text-xs text-[var(--admin-text-muted)]">المنتج المراجَع</p>
                <p className="text-sm font-semibold text-[var(--admin-text-base)]">{detailReview.productName}</p>
                {(detailReview.productColor || detailReview.productSize) && (
                  <p className="text-xs text-[var(--admin-text-subtle)]">
                    {detailReview.productColor}{detailReview.productColor && detailReview.productSize ? ' / ' : ''}{detailReview.productSize}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--admin-text-base)]">رد المشرف (يظهر أمام التقييم في المتجر)</label>
              <textarea
                rows={3}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="اكتب رداً على هذا التقييم..."
                className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] outline-none focus:border-[var(--admin-primary)] resize-y text-sm text-[var(--admin-text-base)]"
              />
              {replyDraft.trim() && (
                <button onClick={() => setReplyDraft('')} className="text-xs text-[var(--admin-danger)] hover:underline">مسح الرد</button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--admin-border-light)]">
              <label className="text-sm font-bold text-[var(--admin-text-base)] flex items-center gap-1.5"><IconNotes size={16} /> ملاحظات داخلية (لا تظهر للعميل)</label>
              <textarea
                rows={2}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="ملاحظات لفريق العمل فقط..."
                className="w-full px-3 py-2 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] outline-none focus:border-[var(--admin-primary)] resize-y text-sm text-[var(--admin-text-base)]"
              />
              <Button size="sm" variant="secondary" isLoading={savingNotes} onClick={saveNotes}>حفظ الملاحظات</Button>
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-[var(--admin-border-light)]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={detailReview.isFeatured} onChange={() => toggleFeatured(detailReview.id)} className="w-4 h-4 rounded text-[var(--admin-primary)]" />
                <span className="text-sm text-[var(--admin-text-base)]">تقييم مميز</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={detailReview.isPinned} onChange={() => togglePinned(detailReview.id)} className="w-4 h-4 rounded text-[var(--admin-primary)]" />
                <span className="text-sm text-[var(--admin-text-base)]">تثبيت في الأعلى</span>
              </label>
            </div>
          </div>
        )}
      </Modal>

      <EntityDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null })}
        onConfirm={deleteDialog.id ? confirmRowDelete : handleDeleteSelected}
        title="حذف التقييم"
        description={
          deleteDialog.id
            ? 'هل أنت متأكد من رغبتك في حذف هذا التقييم نهائياً؟'
            : `هل أنت متأكد من رغبتك في حذف ${selectedIds.length} تقييمات؟`
        }
        isProcessing={isBulkDeleting}
      />

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
        />
      )}
    </div>
  );
}
