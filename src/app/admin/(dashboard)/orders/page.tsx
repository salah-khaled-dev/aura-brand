"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAr } from '@/lib/i18n/admin-ar';
import { OrderService, OrderFilters, CreateOrderInput } from '@/lib/services/order.service';
import { Order, OrderPaymentStatus } from '@/data/mock/orders';
import { getStatusMeta, WORKFLOW_STATUSES } from '@/lib/orders/order-status';
import { CustomerService } from '@/lib/services/customer.service';
import { ProductService } from '@/lib/services/product.service';
import { CouponService } from '@/lib/services/coupon.service';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { usePermissions } from '@/lib/auth/PermissionContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// SaaS UI Components
import { PageHeader, EmptyState } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Input } from '@/components/admin/design-system/Input';
import { Button } from '@/components/admin/design-system/Button';
import { Badge } from '@/components/admin/design-system/Badge';
import { DataTable, Column } from '@/components/admin/design-system/DataTable';
import { Modal } from '@/components/admin/design-system/Modal';

// Tabler Icons
import {
  IconSearch,
  IconTrash,
  IconShoppingBag,
  IconCheck,
  IconDownload,
  IconPrinter,
  IconPlus,
  IconX,
} from '@tabler/icons-react';

interface OrderLine { productId: string; quantity: number; }

export default function OrdersPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canWrite = can('orders', 'write');
  const canDelete = can('orders', 'delete');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<OrderFilters>({ search: '', status: 'all', paymentStatus: 'all', paymentMethod: 'all' });

  // --- Create Order modal state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [custList, setCustList] = useState<{ id: string; name: string; email: string; phone?: string }[]>([]);
  const [prodList, setProdList] = useState<{ id: string; name: string; sku: string; price: number }[]>([]);
  const [form, setForm] = useState<{ customerId: string; shippingAddress: string; lines: OrderLine[] }>({ customerId: '', shippingAddress: '', lines: [{ productId: '', quantity: 1 }] });

  // Coupon state for the create-order modal
  const [couponCode, setCouponCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const openCreate = async () => {
    setForm({ customerId: '', shippingAddress: '', lines: [{ productId: '', quantity: 1 }] });
    setCouponCode(''); setAppliedCode(null); setCouponDiscount(0); setCouponMsg('');
    setCreateOpen(true);
    try {
      const [customers, products] = await Promise.all([CustomerService.getCustomers(), ProductService.getProducts()]);
      setCustList(customers.map(c => ({ id: c.id, name: c.fullName || c.name, email: c.email, phone: c.phone })));
      setProdList(products.map(p => ({ id: p.id, name: p.name, sku: p.sku, price: p.price })));
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const orderTotal = form.lines.reduce((sum, l) => {
    const p = prodList.find(pr => pr.id === l.productId);
    return sum + (p ? p.price * l.quantity : 0);
  }, 0);
  const orderNet = Math.max(0, orderTotal - (appliedCode ? couponDiscount : 0));

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) { setCouponMsg('أدخل رمز الكوبون'); return; }
    setCouponLoading(true);
    setCouponMsg('');
    try {
      const res = await CouponService.calculateDiscount(code, orderTotal);
      if (!res.valid) {
        setAppliedCode(null);
        setCouponDiscount(0);
        setCouponMsg(res.error || 'كوبون غير صالح');
      } else {
        setAppliedCode(code.toUpperCase());
        setCouponDiscount(res.discountAmount);
        setCouponMsg('');
        toast.success('تم تطبيق الكوبون');
      }
    } catch {
      setCouponMsg('تعذر التحقق من الكوبون');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    const customer = custList.find(c => c.id === form.customerId);
    const lines = form.lines.filter(l => l.productId && l.quantity > 0);
    if (!customer) { toast.error('اختر العميل'); return; }
    if (lines.length === 0) { toast.error('أضف منتجاً واحداً على الأقل'); return; }
    setCreating(true);
    try {
      const input: CreateOrderInput = {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingAddress: form.shippingAddress,
        discount: appliedCode ? couponDiscount : 0,
        couponCode: appliedCode,
        items: lines.map(l => {
          const p = prodList.find(pr => pr.id === l.productId)!;
          return { productId: p.id, productName: p.name, sku: p.sku, quantity: l.quantity, price: p.price };
        }),
      };
      const created = await OrderService.createOrder(input);
      // Record coupon redemption (auto-disables at limit; emits coupon.used → coupons list live-updates).
      if (appliedCode) await CouponService.incrementUsage(appliedCode, created.id);
      toast.success(`تم إنشاء الطلب ${created.orderNumber}`);
      setCreateOpen(false);
      loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : adminAr.toasts.unexpectedError);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filters]);

  useEventSubscribeMany(REFRESH_EVENTS.orders, loadOrders);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await OrderService.getOrders(filters);
      setOrders(data);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(adminAr.common.confirmDelete)) return;
    try {
      await OrderService.deleteMultiple(selectedIds);
      toast.success(adminAr.toasts.itemsDeleted);
      setSelectedIds([]);
      loadOrders();
    } catch (error) {
      console.error('Failed to delete orders:', error);
      toast.error(error instanceof Error && error.message ? error.message : adminAr.toasts.unexpectedError);
    }
  };

  const handleMarkPaidSelected = async () => {
    if (!confirm('هل أنت متأكد من تغيير حالة الدفع إلى مدفوع؟')) return;
    try {
      await OrderService.markAsPaidMultiple(selectedIds);
      toast.success(adminAr.toasts.dataSaved);
      setSelectedIds([]);
      loadOrders();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const handleExportSelected = () => {
    toast.success('تم التصدير بنجاح (محاكاة)');
  };

  const handlePrintSelected = () => {
    toast.success('تم إرسال الفواتير للطباعة (محاكاة)');
  };

  const paymentStatusMap: Record<OrderPaymentStatus, { label: string, variant: any }> = {
    paid: { label: 'مدفوع', variant: 'success' },
    unpaid: { label: 'غير مدفوع', variant: 'warning' },
    refunded: { label: 'مسترد', variant: 'neutral' },
    partial: { label: 'جزئي', variant: 'warning' },
    partially_refunded: { label: 'استرداد جزئي', variant: 'warning' }
  };

  const columns: Column<Order>[] = [
    { 
      header: adminAr.orders.orderNumber, 
      accessor: 'orderNumber', 
      sortable: true,
      render: (val) => <span className="font-semibold text-[var(--admin-text-base)]">{String(val)}</span>
    },
    { header: adminAr.orders.customer, accessor: 'customerName', sortable: true },
    { header: adminAr.orders.date, accessor: 'date', type: 'date', sortable: true },
    { header: adminAr.orders.total, accessor: 'total', type: 'price', sortable: true },
    {
      header: adminAr.orders.status,
      accessor: 'status',
      render: (_, row) => {
        const config = getStatusMeta(row.status);
        return <Badge variant={config.badge}>{config.label}</Badge>;
      }
    },
    { 
      header: adminAr.orders.paymentStatus, 
      accessor: 'paymentStatus', 
      render: (_, row) => {
        const config = paymentStatusMap[row.paymentStatus];
        return <Badge variant={config?.variant || 'neutral'}>{config?.label}</Badge>;
      }
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={adminAr.orders.title}
        description={adminAr.orders.subtitle}
        actions={
          canWrite ? (
            <Button variant="primary" leftIcon={<IconPlus size={18} />} onClick={openCreate}>
              إضافة طلب
            </Button>
          ) : undefined
        }
      />

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] p-3 rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-lg)] sticky top-20 z-20"
          >
            <div className="flex items-center gap-4">
              <Badge variant="primary">{selectedIds.length} محدد</Badge>
              <div className="hidden sm:block h-4 w-px bg-[var(--admin-border-strong)]" />
              {canWrite && (
                <Button size="sm" variant="ghost" onClick={handleMarkPaidSelected} leftIcon={<IconCheck size={16} />} className="text-[var(--admin-success)] hover:bg-[var(--admin-success)]/10">
                  مدفوع
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleExportSelected} leftIcon={<IconDownload size={16} />} className="text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)]">
                تصدير
              </Button>
              <Button size="sm" variant="ghost" onClick={handlePrintSelected} leftIcon={<IconPrinter size={16} />} className="text-[var(--admin-info)] hover:bg-[var(--admin-info)]/10">
                طباعة
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {canDelete && (
                <Button size="sm" variant="danger" leftIcon={<IconTrash size={16} />} onClick={handleDeleteSelected}>
                  حذف المحدد
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                إلغاء
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-4 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto flex-1">
            <Input 
              icon={<IconSearch size={18} />}
              placeholder={adminAr.common.search}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full sm:w-64"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)] w-full sm:w-auto"
            >
              <option value="all">حالة الطلب (الكل)</option>
              {WORKFLOW_STATUSES.map((key) => (
                <option key={key} value={key}>{getStatusMeta(key).label}</option>
              ))}
            </select>
            <select 
              value={filters.paymentStatus} 
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              className="h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)] w-full sm:w-auto"
            >
              <option value="all">حالة الدفع (الكل)</option>
              {Object.entries(paymentStatusMap).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select 
              value={filters.paymentMethod} 
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)] w-full sm:w-auto"
            >
              <option value="all">طريقة الدفع (الكل)</option>
              <option value="cod">الدفع عند الاستلام</option>
              <option value="card">بطاقة</option>
              <option value="vodafone_cash">فودافون كاش</option>
              <option value="bank_transfer">تحويل بنكي</option>
            </select>
          </div>
        </div>

        <div className="mt-2">
          <DataTable 
            columns={columns}
            data={orders as any[]}
            isLoading={loading}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(ids as string[])}
            onRowClick={(row: any) => router.push(`/admin/orders/${row.id}`)}
            emptyState={
              <EmptyState 
                icon={<IconShoppingBag size={24} />}
                title={adminAr.table.noData}
                description="لم يتم العثور على أي طلبات تطابق بحثك."
                action={
                  <Button variant="secondary" onClick={() => setFilters({ search: '', status: 'all', paymentStatus: 'all', paymentMethod: 'all' })}>
                    مسح الفلاتر
                  </Button>
                }
              />
            }
          />
        </div>
      </Card>

      {/* Create Order Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="إضافة طلب جديد"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <div className="text-sm">
              {appliedCode && couponDiscount > 0 && (
                <span className="text-[var(--admin-success)] font-medium me-2">خصم {couponDiscount.toLocaleString()} ج.م</span>
              )}
              <span className="font-bold text-[var(--admin-text-base)]">
                الإجمالي قبل الضريبة: {orderNet.toLocaleString()} ج.م
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>إلغاء</Button>
              <Button variant="primary" onClick={handleCreateOrder} disabled={creating} isLoading={creating}>إنشاء الطلب</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">العميل</label>
            <select
              value={form.customerId}
              onChange={e => setForm({ ...form, customerId: e.target.value })}
              className="h-10 px-3 w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
            >
              <option value="">— اختر العميل —</option>
              {custList.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)]">المنتجات</label>
            {form.lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={line.productId}
                  onChange={e => {
                    const lines = [...form.lines]; lines[idx] = { ...lines[idx], productId: e.target.value }; setForm({ ...form, lines });
                  }}
                  className="h-10 px-3 flex-1 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                >
                  <option value="">— اختر المنتج —</option>
                  {prodList.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()} ج.م</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={e => {
                    const lines = [...form.lines]; lines[idx] = { ...lines[idx], quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }; setForm({ ...form, lines });
                  }}
                  className="h-10 px-3 w-20 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm text-center outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}
                  disabled={form.lines.length === 1}
                >
                  <IconX size={16} />
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" leftIcon={<IconPlus size={14} />} onClick={() => setForm({ ...form, lines: [...form.lines, { productId: '', quantity: 1 }] })}>
              إضافة منتج
            </Button>
          </div>

          <Input
            label="عنوان الشحن"
            placeholder="عنوان التسليم..."
            value={form.shippingAddress}
            onChange={e => setForm({ ...form, shippingAddress: e.target.value })}
          />

          {/* Coupon */}
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">كوبون الخصم</label>
            {appliedCode ? (
              <div className="flex items-center justify-between bg-[var(--admin-success)]/10 border border-[var(--admin-success)]/30 rounded-[var(--admin-radius-md)] px-3 py-2">
                <span className="text-sm font-bold text-[var(--admin-success)]">{appliedCode} — خصم {couponDiscount.toLocaleString()} ج.م</span>
                <button type="button" onClick={() => { setAppliedCode(null); setCouponDiscount(0); setCouponCode(''); }} className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)] underline">إزالة</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponMsg(''); }}
                  placeholder="رمز الكوبون"
                  className="h-10 px-3 flex-1 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)] uppercase"
                />
                <Button variant="secondary" onClick={handleApplyCoupon} disabled={couponLoading || orderTotal <= 0} isLoading={couponLoading}>تطبيق</Button>
              </div>
            )}
            {couponMsg && <p className="text-xs text-[var(--admin-danger)] mt-1">{couponMsg}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
