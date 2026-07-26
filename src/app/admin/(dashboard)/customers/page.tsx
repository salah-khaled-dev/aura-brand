"use client";

import React, { useState, useEffect } from 'react';
import { CustomerService, CustomerFilters, Customer, CustomerStatus } from '@/lib/services/customer.service';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { REFRESH_EVENTS } from '@/lib/events/refresh-events';
import { adminAr } from '@/lib/i18n/admin-ar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
  IconPlus, 
  IconTrash, 
  IconDownload, 
  IconTag, 
  IconShield, 
  IconShieldCheck,
  IconUsers
} from '@tabler/icons-react';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: 'all',
  });

  const emptyNewCustomer = { firstName: '', lastName: '', email: '', phone: '' };
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(emptyNewCustomer);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await CustomerService.getCustomers(filters);
      setCustomers(data);
    } catch (error) {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [filters]);

  useEventSubscribeMany(REFRESH_EVENTS.customers, loadCustomers);

  const handleDelete = async () => {
    if (!selectedIds.length) return;
    if (confirm(adminAr.toasts.confirmDelete)) {
      try {
        await CustomerService.deleteMultiple(selectedIds);
        toast.success(adminAr.toasts.itemsDeleted);
        setSelectedIds([]);
        loadCustomers();
      } catch (error) {
        toast.error(adminAr.toasts.unexpectedError);
      }
    }
  };

  const handleBlock = async () => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(selectedIds.map(id => CustomerService.blockCustomer(id)));
      toast.success('تم حظر العملاء المحددين');
      setSelectedIds([]);
      loadCustomers();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const handleActivate = async () => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(selectedIds.map(id => CustomerService.activateCustomer(id)));
      toast.success('تم تنشيط العملاء المحددين');
      setSelectedIds([]);
      loadCustomers();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.firstName.trim()) { toast.error('الاسم الأول مطلوب'); return; }
    if (!newCustomerForm.email.trim()) { toast.error('البريد الإلكتروني مطلوب'); return; }
    setCreatingCustomer(true);
    try {
      await CustomerService.createCustomer({
        firstName: newCustomerForm.firstName,
        lastName: newCustomerForm.lastName,
        email: newCustomerForm.email,
        phone: newCustomerForm.phone,
      });
      toast.success('تمت إضافة العميل بنجاح');
      setNewCustomerModalOpen(false);
      setNewCustomerForm(emptyNewCustomer);
      loadCustomers();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setCreatingCustomer(false);
    }
  };

  const columns: Column<Customer>[] = [
    { 
      header: 'العميل', 
      accessor: 'fullName', 
      render: (_, c) => (
        <div className="flex items-center gap-3">
          {c.avatar ? (
            <img src={c.avatar} alt={c.fullName} className="w-10 h-10 rounded-full bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 flex items-center justify-center font-bold">
              {c.fullName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-[var(--admin-text-base)]">{c.fullName}</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{c.customerNumber}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'معلومات التواصل', 
      accessor: 'email',
      render: (_, c) => (
        <div className="text-sm">
          <p className="text-[var(--admin-text-base)]">{c.email}</p>
          <p className="text-[var(--admin-text-muted)] mt-0.5 tabular-nums" dir="ltr">{c.phone}</p>
        </div>
      )
    },
    { 
      header: 'الطلبات', 
      accessor: 'totalOrders',
      render: (_, c) => (
        <div className="text-sm">
          <p className="font-bold text-[var(--admin-text-base)]">{c.totalOrders} طلب</p>
          <p className="text-[var(--admin-text-muted)] mt-0.5 tabular-nums">{c.totalSpent.toLocaleString()} جنيه</p>
        </div>
      )
    },
    { header: 'تاريخ التسجيل', accessor: 'registrationDate', type: 'date' as const },
    { 
      header: 'الحالة', 
      accessor: 'status', 
      render: (_, c) => {
        const statusMap: Record<CustomerStatus, { label: string, variant: any }> = {
          active:   { label: 'نشط', variant: 'success' },
          inactive: { label: 'غير نشط', variant: 'neutral' },
          blocked:  { label: 'محظور', variant: 'danger' },
          pending:  { label: 'معلق', variant: 'warning' },
          vip:      { label: 'مميز (VIP)', variant: 'primary' }
        };
        const s = statusMap[c.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      }
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="إدارة العملاء"
        description="تتبع نشاطات عملائك، وتحديث بياناتهم أو حظرهم."
        actions={
          <Button leftIcon={<IconPlus size={18} />} onClick={() => setNewCustomerModalOpen(true)}>
            عميل جديد
          </Button>
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
              <Button size="sm" variant="ghost" onClick={handleActivate} leftIcon={<IconShieldCheck size={16} />} className="text-[var(--admin-success)] hover:bg-[var(--admin-success)]/10">
                تنشيط
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBlock} leftIcon={<IconShield size={16} />} className="text-[var(--admin-warning)] hover:bg-[var(--admin-warning)]/10">
                حظر
              </Button>
              <Button size="sm" variant="ghost" leftIcon={<IconTag size={16} />} className="text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)]">
                تصنيف
              </Button>
              <Button size="sm" variant="ghost" leftIcon={<IconDownload size={16} />} className="text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)]">
                تصدير
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="danger" leftIcon={<IconTrash size={16} />} onClick={handleDelete}>
                حذف المحدد
              </Button>
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
              placeholder="البحث بالاسم، البريد، الهاتف..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full sm:w-64"
            />
            <select 
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)] w-full sm:w-auto"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="vip">مميز (VIP)</option>
              <option value="blocked">محظور</option>
            </select>
            <select 
              value={filters.tags || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value || undefined }))}
              className="h-10 px-3 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)] w-full sm:w-auto"
            >
              <option value="">جميع التصنيفات (Tags)</option>
              <option value="VIP">VIP</option>
              <option value="عميل دائم">عميل دائم</option>
              <option value="Influencer">Influencer</option>
              <option value="High Risk">عالي الخطورة</option>
            </select>
          </div>
        </div>

        <div className="mt-2">
          <DataTable 
            columns={columns}
            data={customers as any[]}
            isLoading={loading}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(ids as string[])}
            onRowClick={(row: any) => router.push(`/admin/customers/${row.id}`)}
            emptyState={
              <EmptyState 
                icon={<IconUsers size={24} />}
                title="لا يوجد عملاء"
                description="لم يتم العثور على أي عملاء يطابقون الفلاتر الحالية."
                action={
                  <Button variant="secondary" onClick={() => setFilters({ search: '', status: 'all' })}>
                    مسح الفلاتر
                  </Button>
                }
              />
            }
          />
        </div>
      </Card>

      <Modal
        isOpen={newCustomerModalOpen}
        onClose={() => setNewCustomerModalOpen(false)}
        title="عميل جديد"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setNewCustomerModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleCreateCustomer} isLoading={creatingCustomer}>إضافة</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الاسم الأول</label>
            <Input value={newCustomerForm.firstName} onChange={e => setNewCustomerForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">اسم العائلة</label>
            <Input value={newCustomerForm.lastName} onChange={e => setNewCustomerForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">البريد الإلكتروني</label>
            <Input type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-subtle)] mb-1.5">الهاتف</label>
            <Input value={newCustomerForm.phone} onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
      </Modal>

    </div>
  );
}
