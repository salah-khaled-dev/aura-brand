"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { adminAr } from '@/lib/i18n/admin-ar';
import { OrderService } from '@/lib/services/order.service';
import { Order, OrderStatus, OrderPaymentStatus } from '@/data/mock/orders';
import { getStatusMeta, WORKFLOW_STATUSES } from '@/lib/orders/order-status';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import { StoreService, type StoreInfo } from '@/lib/services/storefront/store.service';
import { downloadInvoicePdf } from '@/lib/pdf/generate-invoice-pdf';
import { usePermissions } from '@/lib/auth/PermissionContext';

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : adminAr.toasts.unexpectedError;
}

// SaaS UI Components
import { PageHeader, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Button } from '@/components/admin/design-system/Button';
import { Badge } from '@/components/admin/design-system/Badge';
import { Input } from '@/components/admin/design-system/Input';

// Tabler Icons
import { 
  IconArrowRight, 
  IconPrinter, 
  IconPackage, 
  IconCreditCard, 
  IconUser, 
  IconMapPin, 
  IconFileText,
  IconTruck,
  IconBan,
  IconTrash,
  IconMessage,
  IconTruckDelivery,
  IconDownload,
  IconLink,
} from '@tabler/icons-react';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const { can } = usePermissions();
  const canDelete = can('orders', 'delete');
  const [order, setOrder] = useState<Order | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  
  // Status Update States
  const [statusValue, setStatusValue] = useState<OrderStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus>('paid');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  
  // Note State
  const [internalNote, setInternalNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Customer-facing update + shipment info
  const [customerUpdate, setCustomerUpdate] = useState('');
  const [addingCustomerUpdate, setAddingCustomerUpdate] = useState(false);
  const [shipping, setShipping] = useState({ shippingCompany: '', trackingNumber: '', courierName: '', estimatedDeliveryDate: '' });
  const [savingShipping, setSavingShipping] = useState(false);

  async function loadOrder(id: string) {
    try {
      const [data, info] = await Promise.all([OrderService.getOrder(id), StoreService.getInfo()]);
      setStoreInfo(info);
      if (data) {
        setOrder(data);
        setStatusValue(data.status);
        setPaymentStatus(data.paymentStatus);
        setShipping({
          shippingCompany: data.shippingCompany ?? '',
          trackingNumber: data.trackingNumber ?? '',
          courierName: data.courierName ?? '',
          estimatedDeliveryDate: data.estimatedDeliveryDate ? data.estimatedDeliveryDate.slice(0, 10) : '',
        });
      } else {
        toast.error(adminAr.toasts.unexpectedError);
      }
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId]);



  const handleUpdateStatus = async () => {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      const updated = await OrderService.updateOrderStatus(order.id, statusValue);
      setOrder(updated);
      setStatusValue(updated.status);
      toast.success(adminAr.toasts.dataSaved);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!order) return;
    setUpdatingPayment(true);
    try {
      const updated = await OrderService.updatePaymentStatus(order.id, paymentStatus);
      setOrder(updated);
      toast.success(adminAr.toasts.dataSaved);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleAddNote = async () => {
    if (!order || !internalNote.trim()) return;
    setAddingNote(true);
    try {
      const updated = await OrderService.addInternalNote(order.id, internalNote);
      setOrder(updated);
      setInternalNote('');
      toast.success('تمت إضافة الملاحظة الداخلية');
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddCustomerUpdate = async () => {
    if (!order || !customerUpdate.trim()) return;
    setAddingCustomerUpdate(true);
    try {
      const updated = await OrderService.addCustomerUpdate(order.id, customerUpdate.trim());
      setOrder(updated);
      setCustomerUpdate('');
      toast.success('تم إرسال التحديث للعميلة');
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setAddingCustomerUpdate(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!order) return;
    setSavingShipping(true);
    try {
      const updated = await OrderService.updateShipping(order.id, {
        shippingCompany: shipping.shippingCompany.trim(),
        trackingNumber: shipping.trackingNumber.trim(),
        courierName: shipping.courierName.trim(),
        estimatedDeliveryDate: shipping.estimatedDeliveryDate?.trim() ? new Date(shipping.estimatedDeliveryDate).toISOString() : null,
      });
      setOrder(updated);
      toast.success(adminAr.toasts.dataSaved);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setSavingShipping(false);
    }
  };

  const handlePreviewInvoice = () => {
    window.open(`/admin/orders/${order?.id}/invoice`, '_blank');
  };

  const handlePrintPackingSlip = () => {
    window.open(`/admin/orders/${order?.id}/packing-slip`, '_blank');
  };

  const handleDownloadInvoice = async () => {
    if (!order || !storeInfo) return;
    setDownloadingInvoice(true);
    try {
      await downloadInvoicePdf(order, storeInfo);
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleCopyInvoiceLink = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/admin/orders/${order.id}/invoice`);
      toast.success('تم نسخ رابط الفاتورة');
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟ سيتم عكس أي خصم من المخزون.')) return;
    setCancelling(true);
    try {
      const updated = await OrderService.cancelOrder(order.id);
      setOrder(updated);
      setStatusValue(updated.status);
      toast.success('تم إلغاء الطلب');
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    if (!confirm('سيتم حذف الطلب نهائياً. هل أنت متأكد؟')) return;
    setDeleting(true);
    try {
      await OrderService.deleteOrder(order.id);
      toast.success('تم حذف الطلب');
      router.push('/admin/orders');
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast.error(getErrorMessage(error));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-10 h-10" />
          <Skeleton className="w-48 h-10" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4 text-[var(--admin-text-base)]">الطلب غير موجود</h2>
        <Button variant="secondary" onClick={() => router.push('/admin/orders')}>العودة إلى الطلبات</Button>
      </div>
    );
  }

  const paymentMethodMap: Record<string, string> = {
    cod: 'الدفع عند الاستلام',
    card: 'بطاقة ائتمان/خصم مباشر',
    vodafone_cash: 'فودافون كاش',
    bank_transfer: 'تحويل بنكي'
  };

  const getPaymentBadge = (status: OrderPaymentStatus) => {
    switch (status) {
      case 'paid': return <Badge variant="success">مدفوع</Badge>;
      case 'unpaid': return <Badge variant="warning">غير مدفوع</Badge>;
      case 'refunded': return <Badge variant="neutral">مسترد</Badge>;
      case 'partially_refunded': return <Badge variant="warning">استرداد جزئي</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <PageHeader
        title={`الطلب ${order.orderNumber}`}
        description={formatDate(order.date)}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={getStatusMeta(order.status).badge}>{getStatusMeta(order.status).label}</Badge>
            {getPaymentBadge(order.paymentStatus)}
          </div>
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push('/admin/orders')} leftIcon={<IconArrowRight size={20} />} className="px-2" />
            <div className="flex-1" />
            <Button variant="secondary" onClick={handlePrintPackingSlip} leftIcon={<IconPackage size={18} />}>
              بوليصة الشحن
            </Button>
            <Button variant="secondary" onClick={handleCopyInvoiceLink} leftIcon={<IconLink size={18} />} className="px-2" />
            <Button variant="secondary" onClick={handlePreviewInvoice} leftIcon={<IconPrinter size={18} />}>
              معاينة الفاتورة
            </Button>
            <Button variant="secondary" onClick={handleDownloadInvoice} isLoading={downloadingInvoice} leftIcon={<IconDownload size={18} />}>
              تحميل PDF
            </Button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <Button variant="warning" onClick={handleCancelOrder} disabled={cancelling} isLoading={cancelling} leftIcon={<IconBan size={18} />}>
                إلغاء الطلب
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={handleDeleteOrder} disabled={deleting} isLoading={deleting} leftIcon={<IconTrash size={18} />}>
                حذف
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Products */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
                <IconPackage size={18} className="text-[var(--admin-text-muted)]" /> 
                المنتجات ({order.items.length})
              </h2>
            </div>
            <div className="divide-y divide-[var(--admin-border-light)] bg-[var(--admin-bg-base)]">
              {order.items.map((item) => (
                <div key={item.id} className="p-5 flex items-center gap-4 hover:bg-[var(--admin-bg-elevated)] transition-colors">
                  <div className="w-16 h-16 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-sm)] overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-[var(--admin-text-base)]">{item.productName}</p>
                    <div className="text-xs text-[var(--admin-text-muted)] mt-1.5 flex gap-3">
                      <span>الرمز: <span className="font-medium text-[var(--admin-text-base)]">{item.sku}</span></span>
                      {item.size && <span>المقاس: <span className="font-medium text-[var(--admin-text-base)]">{item.size}</span></span>}
                      {item.color && <span>اللون: <span className="font-medium text-[var(--admin-text-base)]">{item.color}</span></span>}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-end">
                    <p className="tabular-nums">{formatCurrency(item.price)}</p>
                    <p className="text-xs text-[var(--admin-text-subtle)] mt-1">الكمية: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-bold text-end w-24 tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="bg-[var(--admin-bg-elevated)] p-5 border-t border-[var(--admin-border-strong)]">
              <div className="w-full sm:w-1/2 mr-auto space-y-3 text-sm">
                <div className="flex justify-between text-[var(--admin-text-muted)]">
                  <span>المجموع الفرعي</span>
                  <span className="tabular-nums font-medium text-[var(--admin-text-base)]">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[var(--admin-text-muted)]">
                  <span>تكلفة الشحن</span>
                  <span className="tabular-nums font-medium text-[var(--admin-text-base)]">{formatCurrency(order.shipping)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-[var(--admin-text-muted)]">
                    <span>الضرائب</span>
                    <span className="tabular-nums font-medium text-[var(--admin-text-base)]">{formatCurrency(order.tax)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-[var(--admin-success)] font-medium">
                    <span>الخصم</span>
                    <span className="tabular-nums">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-4 border-t border-[var(--admin-border-strong)] text-[var(--admin-text-base)]">
                  <span>الإجمالي</span>
                  <span className="tabular-nums">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Card */}
          <Card className="p-5 space-y-5">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
              <IconCreditCard size={18} className="text-[var(--admin-text-muted)]" /> 
              الدفع
            </h2>
            
            <div className="flex items-center justify-between p-4 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)]">
              <div>
                <p className="text-xs font-semibold text-[var(--admin-text-muted)] mb-1">طريقة الدفع</p>
                <p className="font-semibold text-[var(--admin-text-base)]">{order.paymentMethod ? (paymentMethodMap[order.paymentMethod] || order.paymentMethod) : '—'}</p>
              </div>
              <div className="text-end">
                <p className="text-xs font-semibold text-[var(--admin-text-muted)] mb-2">حالة الدفع</p>
                {getPaymentBadge(order.paymentStatus)}
              </div>
            </div>

            <div className="flex items-end gap-3 pt-2">
              <div className="flex-1 space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--admin-text-muted)]">تحديث حالة الدفع</label>
                <select 
                  value={paymentStatus} 
                  onChange={(e) => setPaymentStatus(e.target.value as OrderPaymentStatus)} 
                  className="w-full h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                >
                  <option value="paid">مدفوع</option>
                  <option value="unpaid">غير مدفوع</option>
                  <option value="refunded">مسترد بالكامل</option>
                  <option value="partially_refunded">استرداد جزئي</option>
                </select>
              </div>
              <Button 
                onClick={handleUpdatePayment}
                isLoading={updatingPayment}
                disabled={paymentStatus === order.paymentStatus}
              >
                تحديث الدفع
              </Button>
            </div>
          </Card>

          {/* Customer-facing Update */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
                <IconMessage size={18} className="text-[var(--admin-primary)]" />
                تحديث مرئي للعميلة
              </h2>
              <span className="text-xs text-[var(--admin-text-muted)]">تظهر على صفحة تتبع الطلب</span>
            </div>
            {order.customerUpdate && (
              <div className="bg-[var(--admin-primary-muted)] border border-[var(--admin-primary)]/20 p-3 rounded-[var(--admin-radius-md)]">
                <p className="text-sm text-[var(--admin-text-base)]">{order.customerUpdate}</p>
                {order.customerUpdatedAt && (
                  <p className="text-xs text-[var(--admin-text-subtle)] mt-2 tabular-nums">آخر تحديث: {formatDate(order.customerUpdatedAt)}</p>
                )}
              </div>
            )}
            <textarea
              value={customerUpdate}
              onChange={(e) => setCustomerUpdate(e.target.value)}
              placeholder='مثال: "جارٍ تجهيز طلبكِ وسيتم شحنه غداً."'
              className="w-full p-3 text-sm bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] rounded-[var(--admin-radius-md)] outline-none min-h-[72px] resize-y"
            />
            <Button onClick={handleAddCustomerUpdate} isLoading={addingCustomerUpdate} disabled={!customerUpdate.trim()} className="w-full">
              إرسال التحديث للعميلة
            </Button>
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-6 text-[var(--admin-text-base)]">
              <IconFileText size={18} className="text-[var(--admin-text-muted)]" />
              سجل نشاط الطلب (Timeline)
            </h2>
            <div className="space-y-6 relative before:absolute before:inset-y-2 before:right-[15px] before:w-px before:bg-[var(--admin-border-strong)] pr-10">
              {order.timeline.map((event, idx) => {
                const eventMeta = getStatusMeta(event.status);
                const isLatest = idx === 0;
                const isCustomer = event.type === 'customer_update';
                const isShipping = event.type === 'shipping';
                const dotColor = isCustomer
                  ? 'bg-[var(--admin-info)]'
                  : isShipping
                    ? 'bg-[var(--admin-warning)]'
                    : isLatest ? 'bg-[var(--admin-primary)]' : 'bg-[var(--admin-border-strong)]';
                return (
                  <div key={`${event.type ?? 'status'}-${event.timestamp}-${idx}`} className="relative">
                    <div className={`absolute w-3 h-3 rounded-full -right-10 top-1.5 ring-4 ring-[var(--admin-bg-base)] ${dotColor}`}></div>
                    <div className="bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-light)] p-4 rounded-[var(--admin-radius-lg)]">
                      <div className="flex items-center gap-2">
                        {isCustomer ? (
                          <Badge variant="info" size="sm">تحديث للعميلة</Badge>
                        ) : isShipping ? (
                          <Badge variant="warning" size="sm">تحديث الشحن</Badge>
                        ) : (
                          <Badge variant={eventMeta.badge} size="sm">{eventMeta.label}</Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[var(--admin-text-muted)] mt-2">{formatDate(event.timestamp)}</p>
                      {event.note && (
                        <p className="text-sm text-[var(--admin-text-base)] mt-3 bg-[var(--admin-bg-base)] p-3 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)]">{event.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          
          {/* Order Status (unified workflow) */}
          <Card className="p-5 space-y-5">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
              <IconTruck size={18} className="text-[var(--admin-text-muted)]" />
              حالة الطلب
            </h2>
            <div className="space-y-4">
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as OrderStatus)}
                className="w-full h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
              >
                {WORKFLOW_STATUSES.map((s) => (
                  <option key={s} value={s}>{getStatusMeta(s).label}</option>
                ))}
              </select>
              <Button
                onClick={handleUpdateStatus}
                isLoading={updatingStatus}
                disabled={statusValue === order.status}
                className="w-full"
              >
                تحديث حالة الطلب
              </Button>
            </div>
          </Card>

          {/* Customer */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
              <IconUser size={18} className="text-[var(--admin-text-muted)]" /> 
              العميل
            </h2>
            <div className="space-y-1.5 text-sm">
              <p className="font-bold text-base text-[var(--admin-text-base)]">{order.customerName}</p>
              <p className="text-[var(--admin-primary)] font-medium hover:underline cursor-pointer">{order.customerEmail}</p>
              <p dir="ltr" className="text-end text-[var(--admin-text-muted)] tabular-nums">{order.customerPhone}</p>
            </div>
          </Card>

          {/* Shipping Address */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
              <IconMapPin size={18} className="text-[var(--admin-text-muted)]" /> 
              عنوان الشحن
            </h2>
            <p className="text-sm text-[var(--admin-text-base)] leading-relaxed">{order.shippingAddress}</p>
            <div className="text-sm font-semibold mt-3 pt-3 border-t border-[var(--admin-border-light)] text-[var(--admin-text-muted)] flex items-center justify-between">
              طريقة الشحن
              <span className="text-[var(--admin-text-base)]">{order.shippingMethod}</span>
            </div>
          </Card>

          {/* Shipment Information (editable → shown to the customer) */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
              <IconTruckDelivery size={18} className="text-[var(--admin-text-muted)]" />
              معلومات الشحنة
            </h2>
            <div className="space-y-3">
              <Input
                label="شركة الشحن"
                placeholder="مثال: بوسطة"
                value={shipping.shippingCompany}
                onChange={(e) => setShipping({ ...shipping, shippingCompany: e.target.value })}
              />
              <Input
                label="رقم التتبع"
                placeholder="مثال: EG123456789"
                value={shipping.trackingNumber}
                onChange={(e) => setShipping({ ...shipping, trackingNumber: e.target.value })}
              />
              <Input
                label="اسم المندوب"
                placeholder="مثال: محمد علي"
                value={shipping.courierName}
                onChange={(e) => setShipping({ ...shipping, courierName: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--admin-text-muted)]">موعد التسليم المتوقع</label>
                <input
                  type="date"
                  value={shipping.estimatedDeliveryDate}
                  onChange={(e) => setShipping({ ...shipping, estimatedDeliveryDate: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                />
              </div>
              <Button onClick={handleSaveShipping} isLoading={savingShipping} className="w-full">
                حفظ معلومات الشحنة
              </Button>
            </div>
          </Card>

          {/* Billing Address */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
              <IconFileText size={18} className="text-[var(--admin-text-muted)]" /> 
              عنوان الفاتورة
            </h2>
            <p className="text-sm text-[var(--admin-text-base)] leading-relaxed">{order.billingAddress}</p>
          </Card>
          
          {/* Internal Notes */}
          <div className="bg-[var(--admin-warning)]/10 border border-[var(--admin-warning)]/30 rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-sm)] p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-warning)]">
              ملاحظات داخلية
            </h2>
            {order.internalNotes && order.internalNotes.length > 0 && (
              <div className="space-y-3">
                {order.internalNotes.map(note => (
                  <div key={note.id} className="bg-[var(--admin-bg-base)] p-3 rounded-[var(--admin-radius-md)] border text-sm border-[var(--admin-warning)]/20 shadow-sm">
                    <p className="text-[var(--admin-text-base)]">{note.text}</p>
                    <p className="text-xs font-medium text-[var(--admin-text-subtle)] mt-2 tabular-nums">{formatDate(note.date)}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="لن يرى العميل هذه الملاحظة..."
              className="w-full p-3 text-sm bg-[var(--admin-bg-base)] border border-[var(--admin-warning)]/30 focus:border-[var(--admin-warning)] focus:ring-1 focus:ring-[var(--admin-warning)] rounded-[var(--admin-radius-md)] outline-none min-h-[80px] resize-y"
            />
            <Button 
              onClick={handleAddNote}
              isLoading={addingNote}
              disabled={!internalNote.trim()}
              variant="warning"
              className="w-full"
            >
              إضافة ملاحظة
            </Button>
          </div>

          {/* Customer Notes */}
          {order.customerNotes && (
            <Card className="p-5 bg-[var(--admin-bg-elevated)]">
              <h2 className="font-semibold mb-3 text-[var(--admin-text-base)]">ملاحظة من العميل</h2>
              <p className="text-sm text-[var(--admin-text-muted)] italic">&quot;{order.customerNotes}&quot;</p>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
