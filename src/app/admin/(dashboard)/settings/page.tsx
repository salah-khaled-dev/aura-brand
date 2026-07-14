"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { adminAr } from '@/lib/i18n/admin-ar';
import { SettingsService } from '@/lib/services/settings.service';
import { Settings, StoreSettings, ManagementSettings, PaymentSettings, SEOSettings, WorkingHoursDay } from '@/data/mock/settings';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { validate } from '@/lib/validation/validator';
import { SettingsSchema } from '@/lib/validation/schemas/settings.schema';
import { toast } from 'sonner';

// SaaS UI Components
import { PageHeader, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Button } from '@/components/admin/design-system/Button';
import { Input } from '@/components/admin/design-system/Input';

// Tabler Icons
import {
  IconBuildingStore,
  IconWorld,
  IconTruck,
  IconSettings,
  IconDeviceFloppy,
  IconRestore,
  IconAlertTriangle,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandTiktok,
} from '@tabler/icons-react';

type TabId = 'store' | 'management' | 'payment' | 'seo';

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-4 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] cursor-pointer hover:border-[var(--admin-primary)] transition-colors group">
      <div>
        <span className="font-bold text-[var(--admin-text-base)] block mb-1">{label}</span>
        {description && <span className="text-xs text-[var(--admin-text-muted)] font-medium">{description}</span>}
      </div>
      <div className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${checked ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-border-strong)]'}`}>
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${checked ? '-translate-x-6' : 'translate-x-1'}`}></div>
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const textAreaClass = "w-full px-4 py-2 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] text-sm resize-y";
const fieldLabelClass = "block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('store');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await SettingsService.getSettings();
      setSettings(data);
      setInitialSettings(JSON.parse(JSON.stringify(data)));
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const isDirty = useMemo(() => {
    if (!settings || !initialSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateStore = (patch: Partial<StoreSettings>) => settings && setSettings({ ...settings, store: { ...settings.store, ...patch } });
  const updateManagement = (patch: Partial<ManagementSettings>) => settings && setSettings({ ...settings, management: { ...settings.management, ...patch } });
  const updatePayment = (patch: Partial<PaymentSettings>) => settings && setSettings({ ...settings, payment: { ...settings.payment, ...patch } });
  const updateSeo = (patch: Partial<SEOSettings>) => settings && setSettings({ ...settings, seo: { ...settings.seo, ...patch } });

  const updateWorkingHour = (index: number, patch: Partial<WorkingHoursDay>) => {
    if (!settings) return;
    const next = [...settings.store.workingHours];
    next[index] = { ...next[index], ...patch };
    updateStore({ workingHours: next });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const result = validate(SettingsSchema, settings);
    if (!result.success || !result.data) {
      const nextErrors: Record<string, string> = {};
      result.errors.forEach(err => { nextErrors[err.field] = err.message; });
      setErrors(nextErrors);
      toast.error(adminAr.toasts.fixValidationErrors);

      const firstTab = result.errors[0]?.field.split('.')[0] as TabId | undefined;
      if (firstTab && ['store', 'management', 'payment', 'seo'].includes(firstTab)) {
        setActiveTab(firstTab);
      }
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const saved = await SettingsService.updateSettings(result.data);
      setSettings(saved);
      setInitialSettings(JSON.parse(JSON.stringify(saved)));
      toast.success(adminAr.toasts.dataSaved);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!initialSettings) return;
    setSettings(JSON.parse(JSON.stringify(initialSettings)));
    setErrors({});
    toast.success(adminAr.toasts.changesReverted);
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4 border-b border-[var(--admin-border-light)] pb-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof IconBuildingStore }[] = [
    { id: 'store', label: adminAr.settings.tabs.store, icon: IconBuildingStore },
    { id: 'management', label: adminAr.settings.tabs.management, icon: IconSettings },
    { id: 'payment', label: adminAr.settings.tabs.payment, icon: IconTruck },
    { id: 'seo', label: adminAr.settings.tabs.seo, icon: IconWorld },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <PageHeader
        title={adminAr.settings.title}
        description={adminAr.settings.subtitle}
        badge={isDirty ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--admin-warning)]/10 text-[var(--admin-warning)] text-xs font-semibold">
            <IconAlertTriangle size={12} stroke={2} /> {adminAr.settings.unsavedChanges}
          </span>
        ) : undefined}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={!isDirty || saving}
              leftIcon={<IconRestore size={18} />}
            >
              {adminAr.common.reset}
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saving}
              disabled={!isDirty}
              leftIcon={<IconDeviceFloppy size={18} />}
            >
              {saving ? adminAr.table.loading : adminAr.common.save}
            </Button>
          </>
        }
      />

      <Card className="flex flex-col md:flex-row min-h-[600px] overflow-hidden">

        {/* Tabs Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-l border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] p-4">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--admin-radius-md)] transition-all text-sm font-semibold ${
                    isActive
                      ? 'bg-[var(--admin-bg-base)] text-[var(--admin-primary)] border border-[var(--admin-border-base)] shadow-sm'
                      : 'text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)]'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-[var(--admin-primary)]' : 'text-[var(--admin-text-subtle)]'} stroke={isActive ? 2 : 1.5} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 md:p-8 bg-[var(--admin-bg-base)]">
          <form onSubmit={handleSave} className="space-y-8 max-w-2xl">

            {activeTab === 'store' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[var(--admin-border-light)] pb-4">
                  <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.settings.tabs.store}</h3>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-1">المعلومات الأساسية لمتجرك.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.store.nameAr}</label>
                    <Input type="text" value={settings.store.storeNameAr} onChange={(e) => updateStore({ storeNameAr: e.target.value })} error={errors['store.storeNameAr']} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.store.nameEn}</label>
                    <Input type="text" value={settings.store.storeNameEn} onChange={(e) => updateStore({ storeNameEn: e.target.value })} error={errors['store.storeNameEn']} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={fieldLabelClass}>{adminAr.settings.store.description}</label>
                    <textarea rows={3} value={settings.store.description} onChange={(e) => updateStore({ description: e.target.value })} className={textAreaClass} />
                    {errors['store.description'] && <p className="text-xs text-[var(--admin-danger)] mt-1.5">{errors['store.description']}</p>}
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.store.email}</label>
                    <Input type="email" value={settings.store.storeEmail} onChange={(e) => updateStore({ storeEmail: e.target.value })} error={errors['store.storeEmail']} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.store.phone}</label>
                    <Input type="text" value={settings.store.storePhone} onChange={(e) => updateStore({ storePhone: e.target.value })} error={errors['store.storePhone']} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.store.whatsapp}</label>
                    <Input type="text" value={settings.store.whatsapp} onChange={(e) => updateStore({ whatsapp: e.target.value })} error={errors['store.whatsapp']} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={fieldLabelClass}>{adminAr.settings.store.address}</label>
                    <textarea rows={2} value={settings.store.address} onChange={(e) => updateStore({ address: e.target.value })} className={textAreaClass} />
                    {errors['store.address'] && <p className="text-xs text-[var(--admin-danger)] mt-1.5">{errors['store.address']}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className={fieldLabelClass}>{adminAr.settings.store.logo}</label>
                    <ImageUpload
                      multiple={false}
                      images={settings.store.logo ? [settings.store.logo] : []}
                      onChange={(images) => updateStore({ logo: images[0] || '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={fieldLabelClass}>{adminAr.settings.store.favicon}</label>
                    <ImageUpload
                      multiple={false}
                      images={settings.store.favicon ? [settings.store.favicon] : []}
                      onChange={(images) => updateStore({ favicon: images[0] || '' })}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[var(--admin-border-light)]">
                  <h4 className="font-semibold text-[var(--admin-text-base)] mb-2">{adminAr.settings.store.workingHours}</h4>
                  <div className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] px-4">
                    {settings.store.workingHours.map((wh, idx) => (
                      <div key={wh.day} className="grid grid-cols-[90px_auto_1fr_1fr] items-center gap-3 py-3 border-b border-[var(--admin-border-light)] last:border-0">
                        <span className="text-sm font-semibold text-[var(--admin-text-base)]">{adminAr.settings.store.days[wh.day]}</span>
                        <button
                          type="button"
                          aria-pressed={wh.isOpen}
                          onClick={() => updateWorkingHour(idx, { isOpen: !wh.isOpen })}
                          className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${wh.isOpen ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-border-strong)]'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${wh.isOpen ? '-translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                        <input
                          type="time"
                          disabled={!wh.isOpen}
                          value={wh.openTime}
                          onChange={(e) => updateWorkingHour(idx, { openTime: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <input
                          type="time"
                          disabled={!wh.isOpen}
                          value={wh.closeTime}
                          onChange={(e) => updateWorkingHour(idx, { closeTime: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[var(--admin-border-light)]">
                  <h4 className="font-semibold text-[var(--admin-text-base)] mb-2">{adminAr.settings.store.socialLinks}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={fieldLabelClass}>{adminAr.settings.store.instagram}</label>
                      <Input type="text" leftIcon={<IconBrandInstagram size={18} />} value={settings.store.socialLinks.instagram} onChange={(e) => updateStore({ socialLinks: { ...settings.store.socialLinks, instagram: e.target.value } })} placeholder="https://instagram.com/aura" error={errors['store.socialLinks.instagram']} />
                    </div>
                    <div>
                      <label className={fieldLabelClass}>{adminAr.settings.store.facebook}</label>
                      <Input type="text" leftIcon={<IconBrandFacebook size={18} />} value={settings.store.socialLinks.facebook} onChange={(e) => updateStore({ socialLinks: { ...settings.store.socialLinks, facebook: e.target.value } })} placeholder="https://facebook.com/aura" error={errors['store.socialLinks.facebook']} />
                    </div>
                    <div>
                      <label className={fieldLabelClass}>{adminAr.settings.store.tiktok}</label>
                      <Input type="text" leftIcon={<IconBrandTiktok size={18} />} value={settings.store.socialLinks.tiktok} onChange={(e) => updateStore({ socialLinks: { ...settings.store.socialLinks, tiktok: e.target.value } })} placeholder="https://tiktok.com/@aura" error={errors['store.socialLinks.tiktok']} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'management' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[var(--admin-border-light)] pb-4">
                  <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.settings.tabs.management}</h3>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-1">التحكم في حالة المتجر والعملة الافتراضية.</p>
                </div>

                <ToggleRow
                  label={adminAr.settings.management.maintenanceMode}
                  description={adminAr.settings.management.maintenanceModeHint}
                  checked={settings.management.maintenanceMode}
                  onChange={(v) => updateManagement({ maintenanceMode: v })}
                />

                <div>
                  <label className={fieldLabelClass}>{adminAr.settings.management.maintenanceMessage}</label>
                  <textarea rows={3} value={settings.management.maintenanceMessage} onChange={(e) => updateManagement({ maintenanceMessage: e.target.value })} className={textAreaClass} disabled={!settings.management.maintenanceMode} />
                  {errors['management.maintenanceMessage'] && <p className="text-xs text-[var(--admin-danger)] mt-1.5">{errors['management.maintenanceMessage']}</p>}
                </div>

                <div className="max-w-xs">
                  <label className={fieldLabelClass}>{adminAr.settings.management.defaultCurrency}</label>
                  <select value={settings.management.defaultCurrency} onChange={(e) => updateManagement({ defaultCurrency: e.target.value })} className="w-full px-4 py-2 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] text-sm">
                    <option value="EGP">جنيه مصري (EGP)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[var(--admin-border-light)] pb-4">
                  <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.settings.tabs.payment}</h3>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-1">تكوين طرق الدفع وتكاليف الشحن والضرائب.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.payment.currencyFormat}</label>
                    <Input type="text" value={settings.payment.currencyFormat} onChange={(e) => updatePayment({ currencyFormat: e.target.value })} placeholder="مثال: {value} جنيه" error={errors['payment.currencyFormat']} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.payment.taxRate}</label>
                    <div className="relative">
                      <Input type="number" min={0} max={100} value={settings.payment.taxRate} onChange={(e) => updatePayment({ taxRate: Number(e.target.value) })} error={errors['payment.taxRate']} />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] font-medium">%</span>
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.payment.shippingCost}</label>
                    <Input type="number" min={0} value={settings.payment.shippingCost} onChange={(e) => updatePayment({ shippingCost: Number(e.target.value) })} error={errors['payment.shippingCost']} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.payment.freeShippingThreshold}</label>
                    <Input type="number" min={0} value={settings.payment.freeShippingThreshold} onChange={(e) => updatePayment({ freeShippingThreshold: Number(e.target.value) })} error={errors['payment.freeShippingThreshold']} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.payment.estimatedDeliveryDays}</label>
                    <Input type="text" value={settings.payment.estimatedDeliveryDays} onChange={(e) => updatePayment({ estimatedDeliveryDays: e.target.value })} placeholder="مثال: 3-5" error={errors['payment.estimatedDeliveryDays']} />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[var(--admin-border-light)]">
                  <h4 className="font-semibold text-[var(--admin-text-base)] mb-4">طرق الدفع المدعومة</h4>

                  <ToggleRow
                    label="الدفع عند الاستلام (COD)"
                    description="السماح للعملاء بالدفع نقداً عند استلام الطلب"
                    checked={settings.payment.enableCOD}
                    onChange={(v) => updatePayment({ enableCOD: v })}
                  />
                  <ToggleRow
                    label="فودافون كاش"
                    description="الدفع عبر محفظة فودافون كاش"
                    checked={settings.payment.enableVodafoneCash}
                    onChange={(v) => updatePayment({ enableVodafoneCash: v })}
                  />
                  <ToggleRow
                    label="إنستاباي"
                    description="الدفع عبر تطبيق إنستاباي"
                    checked={settings.payment.enableInstapay}
                    onChange={(v) => updatePayment({ enableInstapay: v })}
                  />
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[var(--admin-border-light)] pb-4">
                  <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.settings.tabs.seo}</h3>
                  <p className="text-sm text-[var(--admin-text-muted)] mt-1">تحسين ظهور المتجر في محركات البحث.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.seo.metaTitle}</label>
                    <Input type="text" value={settings.seo.metaTitle} onChange={(e) => updateSeo({ metaTitle: e.target.value })} error={errors['seo.metaTitle']} />
                    <p className="text-xs text-[var(--admin-text-muted)] mt-1.5">يُنصح بأن لا يتجاوز 60 حرفاً.</p>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.seo.metaDescription}</label>
                    <textarea rows={3} value={settings.seo.metaDescription} onChange={(e) => updateSeo({ metaDescription: e.target.value })} className={textAreaClass} />
                    {errors['seo.metaDescription'] ? (
                      <p className="text-xs text-[var(--admin-danger)] mt-1.5">{errors['seo.metaDescription']}</p>
                    ) : (
                      <p className="text-xs text-[var(--admin-text-muted)] mt-1.5">يُنصح بأن لا يتجاوز 160 حرفاً.</p>
                    )}
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.seo.metaKeywords}</label>
                    <Input type="text" value={settings.seo.metaKeywords} onChange={(e) => updateSeo({ metaKeywords: e.target.value })} placeholder="مفصولة بفواصل، مثل: أزياء، فخامة، حرير" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <label className={fieldLabelClass}>{adminAr.settings.seo.ogImage}</label>
                    <ImageUpload
                      multiple={false}
                      images={settings.seo.ogImage ? [settings.seo.ogImage] : []}
                      onChange={(images) => updateSeo({ ogImage: images[0] || '' })}
                    />
                    <p className="text-xs text-[var(--admin-text-muted)] mt-1.5">الصورة التي تظهر عند مشاركة رابط المتجر (1200x630 بكسل).</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className={fieldLabelClass}>{adminAr.settings.seo.googleAnalyticsId}</label>
                      <Input type="text" value={settings.seo.googleAnalyticsId} onChange={(e) => updateSeo({ googleAnalyticsId: e.target.value })} placeholder="G-XXXXXXX" error={errors['seo.googleAnalyticsId']} />
                    </div>
                    <div>
                      <label className={fieldLabelClass}>{adminAr.settings.seo.googleSearchConsoleCode}</label>
                      <Input type="text" value={settings.seo.googleSearchConsoleCode} onChange={(e) => updateSeo({ googleSearchConsoleCode: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className={fieldLabelClass}>{adminAr.settings.seo.robotsTxt}</label>
                    <textarea rows={4} value={settings.seo.robotsTxt} onChange={(e) => updateSeo({ robotsTxt: e.target.value })} className={`${textAreaClass} font-mono`} />
                  </div>

                  <ToggleRow
                    label={adminAr.settings.seo.sitemapEnabled}
                    checked={settings.seo.sitemapEnabled}
                    onChange={(v) => updateSeo({ sitemapEnabled: v })}
                  />
                </div>
              </div>
            )}

          </form>
        </div>
      </Card>
    </div>
  );
}
