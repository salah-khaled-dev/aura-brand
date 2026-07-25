"use client";

import React, { useState, useEffect, useCallback, use } from 'react';
import { OrderService } from '@/lib/services/order.service';
import { ProductService } from '@/lib/services/product.service';
import { ReviewService } from '@/lib/services/review.service';
import { CouponService } from '@/lib/services/coupon.service';
import { CustomerService, Customer, CustomerStatus, CustomerAddress } from '@/lib/services/customer.service';
import { Order } from '@/data/mock/orders';
import { Modal } from '@/components/admin/design-system/Modal';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// SaaS UI Components
import { PageHeader, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Button } from '@/components/admin/design-system/Button';
import { Badge } from '@/components/admin/design-system/Badge';
import { Input } from '@/components/admin/design-system/Input';

// Tabler Icons
import { 
  IconArrowRight, 
  IconShield, 
  IconShieldCheck, 
  IconEdit, 
  IconCurrencyDollar, 
  IconShoppingBag, 
  IconStar, 
  IconHeart, 
  IconTicket, 
  IconClock, 
  IconMapPin, 
  IconTag, 
  IconFileText 
} from '@tabler/icons-react';

export default function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Note State
  const [internalNote, setInternalNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  
  // Tag State
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  // Edit-profile modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Address modal (add / edit)
  const emptyAddress = { label: '', street: '', building: '', floor: '', apartment: '', area: '', city: '', country: 'مصر', isDefault: false };
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  const loadCustomerData = useCallback(async (id: string) => {
    try {
      const custData = await CustomerService.getCustomer(id);
      if (custData) {
        setCustomer(custData);

        // Real relations resolved against the live services (no fabricated data).
        const [allOrders, allProducts, allReviews, allCoupons] = await Promise.all([
          OrderService.getOrders(),
          ProductService.getProducts(),
          ReviewService.getReviews(),
          CouponService.getCoupons()
        ]);

        const wishlistIds = custData.wishlistProductIds ?? [];
        const usedCodes = custData.usedCouponCodes ?? [];

        setOrders(allOrders.filter(o => o.customerEmail === custData.email).slice(0, 5));
        setWishlistProducts(allProducts.filter(p => wishlistIds.includes(p.id)));
        setReviews(allReviews.filter(r => r.customerEmail === custData.email));
        setCoupons(allCoupons.filter(c => usedCodes.includes(c.code)));
      } else {
        toast.error('لم يتم العثور على العميل');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      loadCustomerData(customerId);
    }
  }, [customerId, loadCustomerData]);

  // Live refresh when this customer (or their orders) change anywhere in the app.
  useEventSubscribeMany(REFRESH_EVENTS.customers, () => { if (customerId) loadCustomerData(customerId); });

  const openEditProfile = () => {
    if (!customer) return;
    setProfileForm({
      firstName: customer.firstName ?? customer.fullName.split(' ')[0] ?? '',
      lastName: customer.lastName ?? customer.fullName.split(' ').slice(1).join(' ') ?? '',
      email: customer.email,
      phone: customer.phone,
    });
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!customer) return;
    if (!profileForm.firstName.trim()) { toast.error('الاسم الأول مطلوب'); return; }
    setSavingProfile(true);
    try {
      const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
      const updated = await CustomerService.updateCustomer(customer.id, {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        name: fullName,
        fullName,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      setCustomer(updated);
      setProfileModalOpen(false);
      toast.success('تم تحديث بيانات العميل');
    } catch {
      toast.error('خطأ في تحديث البيانات');
    } finally {
      setSavingProfile(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddress);
    setAddressModalOpen(true);
  };

  const openEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label ?? '', street: addr.street ?? '', building: addr.building ?? '',
      floor: addr.floor ?? '', apartment: addr.apartment ?? '', area: addr.area ?? '',
      city: addr.city ?? '', country: addr.country ?? 'مصر', isDefault: addr.isDefault ?? false,
    });
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!customer) return;
    if (!addressForm.street.trim() || !addressForm.city.trim()) { toast.error('الشارع والمدينة مطلوبان'); return; }
    setSavingAddress(true);
    try {
      const updated = editingAddressId
        ? await CustomerService.updateAddress(customer.id, editingAddressId, addressForm)
        : await CustomerService.addAddress(customer.id, addressForm);
      setCustomer(updated);
      setAddressModalOpen(false);
      toast.success(editingAddressId ? 'تم تعديل العنوان' : 'تمت إضافة العنوان');
    } catch {
      toast.error('خطأ في حفظ العنوان');
    } finally {
      setSavingAddress(false);
    }
  };


  const handleBlockCustomer = async () => {
    if (!customer) return;
    try {
      const updated = await CustomerService.blockCustomer(customer.id);
      setCustomer(updated);
      toast.success('تم حظر العميل');
    } catch {
      toast.error('خطأ في حظر العميل');
    }
  };

  const handleActivateCustomer = async () => {
    if (!customer) return;
    try {
      const updated = await CustomerService.activateCustomer(customer.id);
      setCustomer(updated);
      toast.success('تم تنشيط العميل');
    } catch {
      toast.error('خطأ في تنشيط العميل');
    }
  };

  const handleAddNote = async () => {
    if (!customer || !internalNote.trim()) return;
    setAddingNote(true);
    try {
      const updated = await CustomerService.addInternalNote(customer.id, internalNote);
      setCustomer(updated);
      setInternalNote('');
      toast.success('تمت إضافة الملاحظة');
    } catch {
      toast.error('خطأ في إضافة الملاحظة');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !newTag.trim()) return;
    setAddingTag(true);
    try {
      const updated = await CustomerService.addTag(customer.id, newTag.trim());
      setCustomer(updated);
      setNewTag('');
      toast.success('تمت إضافة التصنيف');
    } catch {
      toast.error('خطأ في إضافة التصنيف');
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!customer) return;
    try {
      const updated = await CustomerService.removeTag(customer.id, tag);
      setCustomer(updated);
      toast.success('تمت إزالة التصنيف');
    } catch {
      toast.error('خطأ في إزالة التصنيف');
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!customer) return;
    if (confirm('هل أنت متأكد من حذف هذا العنوان؟')) {
      try {
        const updated = await CustomerService.deleteAddress(customer.id, addrId);
        setCustomer(updated);
        toast.success('تم حذف العنوان');
      } catch {
        toast.error('خطأ في حذف العنوان');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-10 h-10" />
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-48 h-10" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="w-full h-48" />
            <Skeleton className="w-full h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4 text-[var(--admin-text-base)]">العميل غير موجود</h2>
        <Button variant="secondary" onClick={() => router.push('/admin/customers')}>العودة للعملاء</Button>
      </div>
    );
  }

  const getStatusBadge = (status: CustomerStatus) => {
    const statusMap: Record<CustomerStatus, { label: string, variant: any }> = {
      active:   { label: 'نشط', variant: 'success' },
      inactive: { label: 'غير نشط', variant: 'neutral' },
      blocked:  { label: 'محظور', variant: 'danger' },
      pending:  { label: 'معلق', variant: 'warning' },
      vip:      { label: 'مميز (VIP)', variant: 'primary' }
    };
    const s = statusMap[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/customers')} leftIcon={<IconArrowRight size={20} />} className="px-2" />
        <div className="flex-1 flex items-center gap-4">
          {customer.avatar ? (
            <img src={customer.avatar} alt={customer.fullName} className="w-14 h-14 rounded-full border border-[var(--admin-border-base)] bg-[var(--admin-bg-elevated)] object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 flex items-center justify-center font-bold text-xl">
              {customer.fullName.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">{customer.fullName}</h1>
              {getStatusBadge(customer.status)}
            </div>
            <p className="text-sm text-[var(--admin-text-muted)] mt-1">{customer.customerNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {customer.status !== 'blocked' ? (
            <Button variant="danger" onClick={handleBlockCustomer} leftIcon={<IconShield size={16} />}>
              حظر العميل
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleActivateCustomer} leftIcon={<IconShieldCheck size={16} />} className="text-[var(--admin-success)]">
              تنشيط العميل
            </Button>
          )}
          <Button leftIcon={<IconEdit size={16} />} onClick={openEditProfile}>
            تعديل البيانات
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'إجمالي الإنفاق', value: formatCurrency(customer.totalSpent), icon: IconCurrencyDollar, color: 'text-[var(--admin-success)]', bg: 'bg-[var(--admin-success)]/10' },
          { label: 'متوسط الطلب', value: formatCurrency(customer.averageOrderValue), icon: IconCurrencyDollar, color: 'text-[var(--admin-info)]', bg: 'bg-[var(--admin-info)]/10' },
          { label: 'الطلبات', value: customer.totalOrders, icon: IconShoppingBag, color: 'text-[var(--admin-primary)]', bg: 'bg-[var(--admin-primary-muted)]' },
          { label: 'نقاط الولاء', value: customer.loyaltyPoints, icon: IconStar, color: 'text-[var(--admin-warning)]', bg: 'bg-[var(--admin-warning)]/10' },
          { label: 'المفضلة', value: customer.wishlistCount, icon: IconHeart, color: 'text-[var(--admin-danger)]', bg: 'bg-[var(--admin-danger)]/10' },
          { label: 'التقييمات', value: customer.reviewsCount, icon: IconStar, color: 'text-[var(--admin-warning)]', bg: 'bg-[var(--admin-warning)]/10' },
          { label: 'الكوبونات', value: customer.couponsUsed, icon: IconTicket, color: 'text-[var(--admin-info)]', bg: 'bg-[var(--admin-info)]/10' },
          { label: 'آخر تسجيل', value: customer.lastLogin ? new Date(customer.lastLogin).toLocaleDateString('ar-EG') : '—', icon: IconClock, color: 'text-[var(--admin-text-base)]', bg: 'bg-[var(--admin-bg-hover)]' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 flex flex-col items-center justify-center text-center">
            <div className={`w-8 h-8 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon size={16} />
            </div>
            <p className="text-lg font-bold text-[var(--admin-text-base)] tabular-nums">{stat.value}</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Orders History */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
                <IconShoppingBag size={18} className="text-[var(--admin-text-muted)]" /> 
                سجل الطلبات
              </h2>
              <Link href={`/admin/orders?customer=${customer.email}`} className="text-sm text-[var(--admin-primary)] hover:underline font-medium">عرض الكل</Link>
            </div>
            <div className="divide-y divide-[var(--admin-border-light)] bg-[var(--admin-bg-base)]">
              {orders.length > 0 ? orders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-[var(--admin-bg-elevated)] cursor-pointer transition-colors" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                  <div>
                    <p className="font-bold text-sm text-[var(--admin-text-base)]">{order.orderNumber}</p>
                    <p className="text-xs text-[var(--admin-text-muted)] mt-1 tabular-nums">{formatDate(order.date)}</p>
                  </div>
                  <div>
                    <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}>
                      {order.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                    </Badge>
                  </div>
                  <div className="text-end font-bold text-sm tabular-nums text-[var(--admin-text-base)]">
                    {formatCurrency(order.total)}
                  </div>
                </div>
              )) : (
                <p className="p-8 text-center text-[var(--admin-text-muted)] text-sm">لم يقم العميل بأي طلبات بعد.</p>
              )}
            </div>
          </Card>

          {/* Addresses */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-text-base)]">
                <IconMapPin size={18} className="text-[var(--admin-text-muted)]" /> 
                العناوين المحفوظة ({customer.addresses.length})
              </h2>
              <button onClick={openAddAddress} className="text-sm text-[var(--admin-primary)] hover:underline font-medium">إضافة عنوان</button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--admin-bg-base)]">
              {customer.addresses.length > 0 ? customer.addresses.map((addr) => (
                <div key={addr.id} className={`p-4 border rounded-[var(--admin-radius-lg)] relative transition-colors ${addr.isDefault ? 'border-[var(--admin-border-strong)] bg-[var(--admin-bg-elevated)]' : 'border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] hover:border-[var(--admin-border-strong)]'}`}>
                  {addr.isDefault && <span className="absolute top-4 left-4 text-[10px] font-bold bg-[var(--admin-text-base)] text-[var(--admin-bg-base)] px-2 py-0.5 rounded uppercase">افتراضي</span>}
                  <p className="font-semibold text-sm mb-1 text-[var(--admin-text-base)]">{addr.fullName}</p>
                  <p className="text-xs text-[var(--admin-text-muted)] mb-3 tabular-nums" dir="ltr">{addr.phone}</p>
                  <p className="text-sm text-[var(--admin-text-subtle)] leading-relaxed">
                    {addr.apartment} {addr.floor} {addr.building} {addr.street}<br/>
                    {addr.area} - {addr.city}<br/>
                    {addr.country} {addr.postalCode}
                  </p>
                  <div className="mt-4 pt-3 border-t border-[var(--admin-border-light)] flex justify-end gap-3">
                    <button onClick={() => openEditAddress(addr)} className="text-xs text-[var(--admin-primary)] hover:underline font-medium">تعديل</button>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-xs text-[var(--admin-danger)] hover:underline font-medium">حذف</button>
                  </div>
                </div>
              )) : (
                <p className="col-span-full text-center text-[var(--admin-text-muted)] text-sm py-4">لا توجد عناوين محفوظة.</p>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Wishlist Mock */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--admin-border-light)] flex justify-between items-center bg-[var(--admin-bg-elevated)]">
                <h2 className="font-semibold text-sm flex items-center gap-2 text-[var(--admin-text-base)]">
                  <IconHeart size={16} className="text-[var(--admin-danger)]" /> 
                  المفضلة ({customer.wishlistCount})
                </h2>
              </div>
              <div className="divide-y divide-[var(--admin-border-light)] bg-[var(--admin-bg-base)]">
                {wishlistProducts.map(p => (
                  <div key={p.id} className="p-3 flex items-center gap-3 hover:bg-[var(--admin-bg-elevated)] transition-colors">
                    <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-[var(--admin-radius-sm)] border border-[var(--admin-border-light)] object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-[var(--admin-text-base)]">{p.name}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] tabular-nums">{formatCurrency(p.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Coupons Mock */}
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--admin-border-light)] flex justify-between items-center bg-[var(--admin-bg-elevated)]">
                <h2 className="font-semibold text-sm flex items-center gap-2 text-[var(--admin-text-base)]">
                  <IconTicket size={16} className="text-[var(--admin-info)]" /> 
                  الكوبونات المستخدمة
                </h2>
              </div>
              <div className="divide-y divide-[var(--admin-border-light)] bg-[var(--admin-bg-base)]">
                {coupons.map(c => (
                  <div key={c.id} className="p-3 flex justify-between items-center hover:bg-[var(--admin-bg-elevated)] transition-colors">
                    <div>
                      <p className="text-sm font-bold uppercase text-[var(--admin-text-base)]">{c.code}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] tabular-nums">{c.type === 'shipping' ? 'شحن مجاني' : `خصم ${c.discountValue}${c.type === 'percentage' ? '%' : ' جنيه'}`}</p>
                    </div>
                    <Badge variant="neutral">تم الاستخدام</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          
          {/* Tags */}
          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-4 text-[var(--admin-text-base)]">
              <IconTag size={18} className="text-[var(--admin-text-muted)]" /> 
              التصنيفات (Tags)
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {customer.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--admin-radius-sm)] bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] text-xs font-semibold">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)] transition-colors">&times;</button>
                </span>
              ))}
              {customer.tags.length === 0 && <span className="text-xs text-[var(--admin-text-muted)]">لا توجد تصنيفات</span>}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2">
              <Input 
                value={newTag} 
                onChange={e => setNewTag(e.target.value)} 
                placeholder="إضافة تصنيف..."
                className="flex-1"
              />
              <Button type="submit" disabled={addingTag || !newTag.trim()}>
                إضافة
              </Button>
            </form>
          </Card>

          {/* Internal Notes */}
          <div className="bg-[var(--admin-warning)]/10 border border-[var(--admin-warning)]/30 rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-sm)] p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--admin-warning)]">
              <IconFileText size={18} /> ملاحظات داخلية
            </h2>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {customer.internalNotes.map(note => (
                <div key={note.id} className="bg-[var(--admin-bg-base)] p-3 rounded-[var(--admin-radius-md)] border text-sm border-[var(--admin-warning)]/20 shadow-sm">
                  <p className="text-[var(--admin-text-base)]">{note.text}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs font-medium text-[var(--admin-text-subtle)] tabular-nums">{formatDate(note.date)}</p>
                    <p className="text-xs font-semibold text-[var(--admin-warning)]">{note.adminName}</p>
                  </div>
                </div>
              ))}
              {customer.internalNotes.length === 0 && (
                <p className="text-xs text-[var(--admin-warning)]/70 text-center py-2">لا توجد ملاحظات داخلية.</p>
              )}
            </div>
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

          {/* CRM Timeline */}
          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-6 text-[var(--admin-text-base)]">
              <IconClock size={18} className="text-[var(--admin-text-muted)]" /> 
              سجل نشاط العميل (Timeline)
            </h2>
            <div className="space-y-6 relative before:absolute before:inset-y-2 before:right-[15px] before:w-px before:bg-[var(--admin-border-strong)] pr-10">
              {customer.activities.slice().reverse().map((activity) => (
                <div key={activity.id} className="relative">
                  <div className={`absolute w-3 h-3 rounded-full -right-10 top-1.5 ring-4 ring-[var(--admin-bg-base)] ${activity.type === 'note_added' ? 'bg-[var(--admin-warning)]' : activity.type === 'status_change' ? 'bg-[var(--admin-danger)]' : 'bg-[var(--admin-primary)]'}`}></div>
                  <div className="bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-light)] p-3 rounded-[var(--admin-radius-lg)]">
                    <p className="font-semibold text-sm text-[var(--admin-text-base)]">{activity.description}</p>
                    <p className="text-xs font-medium text-[var(--admin-text-muted)] mt-1 tabular-nums">{formatDate(activity.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="تعديل بيانات العميل"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setProfileModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSaveProfile} isLoading={savingProfile}>حفظ</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الاسم الأول</label>
            <Input value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">اسم العائلة</label>
            <Input value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">البريد الإلكتروني</label>
            <Input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الهاتف</label>
            <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={editingAddressId ? 'تعديل العنوان' : 'إضافة عنوان'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAddressModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSaveAddress} isLoading={savingAddress}>{editingAddressId ? 'حفظ التعديل' : 'إضافة'}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">التسمية (المنزل / العمل)</label>
            <Input value={addressForm.label} onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الشارع</label>
            <Input value={addressForm.street} onChange={e => setAddressForm(f => ({ ...f, street: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">المبنى</label>
            <Input value={addressForm.building} onChange={e => setAddressForm(f => ({ ...f, building: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الشقة</label>
            <Input value={addressForm.apartment} onChange={e => setAddressForm(f => ({ ...f, apartment: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">المنطقة</label>
            <Input value={addressForm.area} onChange={e => setAddressForm(f => ({ ...f, area: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">المدينة</label>
            <Input value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-[var(--admin-primary)]" />
            <span className="text-sm text-[var(--admin-text-base)]">تعيين كعنوان افتراضي</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
