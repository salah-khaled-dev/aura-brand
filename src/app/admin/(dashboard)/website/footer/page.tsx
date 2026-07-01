"use client";

import React, { useState, useEffect } from "react";
import {
  IconLayoutBottombar, IconDeviceFloppy, IconPlus, IconTrash, IconChevronDown, IconChevronUp,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/design-system/Button";
import { CMSPreviewPanel, DeviceView } from "@/components/admin/storefront/CMSPreviewPanel";
import { FadeIn } from "@/components/admin/ui/motion";
import { FooterService, FooterSettings, FooterColumn } from "@/lib/services/storefront/footer.service";

export default function FooterBuilder() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<DeviceView>("desktop");
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set());

  useEffect(() => {
    FooterService.getSettings()
      .then((data) => {
        setSettings(data);
        // expand all columns by default
        setExpandedCols(new Set(data.columns.map((c) => c.id)));
      })
      .catch(() => toast.error("فشل في تحميل إعدادات التذييل"))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) => {
    if (settings) setSettings({ ...settings, [key]: value });
  };

  /* ── Column helpers ─────────────────────────── */
  const patchColumn = (colId: string, patch: Partial<FooterColumn>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      columns: settings.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
    });
  };

  const addLink = (colId: string) => {
    if (!settings) return;
    const newLink = { id: `l-${Date.now()}`, label: 'رابط جديد', url: '/' };
    setSettings({
      ...settings,
      columns: settings.columns.map((c) =>
        c.id === colId ? { ...c, links: [...c.links, newLink] } : c
      ),
    });
  };

  const updateLink = (colId: string, linkId: string, patch: { label?: string; url?: string }) => {
    if (!settings) return;
    setSettings({
      ...settings,
      columns: settings.columns.map((c) =>
        c.id === colId
          ? { ...c, links: c.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) }
          : c
      ),
    });
  };

  const deleteLink = (colId: string, linkId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      columns: settings.columns.map((c) =>
        c.id === colId ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c
      ),
    });
  };

  const addColumn = () => {
    if (!settings) return;
    const newCol: FooterColumn = {
      id: `col-${Date.now()}`,
      title: 'عمود جديد',
      order: settings.columns.length,
      links: [],
    };
    setSettings({ ...settings, columns: [...settings.columns, newCol] });
    setExpandedCols((prev) => new Set([...prev, newCol.id]));
  };

  const deleteColumn = (colId: string) => {
    if (!settings) return;
    setSettings({ ...settings, columns: settings.columns.filter((c) => c.id !== colId) });
    setExpandedCols((prev) => { const s = new Set(prev); s.delete(colId); return s; });
  };

  const toggleCol = (colId: string) => {
    setExpandedCols((prev) => {
      const s = new Set(prev);
      if (s.has(colId)) s.delete(colId); else s.add(colId);
      return s;
    });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await FooterService.updateSettings(settings);
      toast.success("تم حفظ التذييل بنجاح");
    } catch {
      toast.error("فشل في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-8 animate-pulse text-[var(--admin-text-muted)]">جارٍ التحميل...</div>;
  }

  const inputCls = "w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]";

  return (
    <FadeIn className="h-[calc(100vh-180px)] min-h-[560px] flex flex-col md:flex-row bg-[var(--admin-bg-base)] rounded-[var(--admin-radius-xl)] overflow-hidden border border-[var(--admin-border-base)]">

      {/* ── Left panel: settings ── */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-[var(--admin-border-base)] flex flex-col h-full bg-[var(--admin-bg-surface)]">
        <div className="p-4 border-b border-[var(--admin-border-light)] flex items-center justify-between sticky top-0 bg-[var(--admin-bg-surface)] z-10">
          <div className="flex items-center gap-2 text-[var(--admin-text-base)]">
            <IconLayoutBottombar size={20} className="text-[var(--admin-primary)]" />
            <h1 className="font-bold">تذييل الصفحة (Footer)</h1>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<IconDeviceFloppy size={16} />}
            onClick={saveSettings}
            loading={saving}
          >
            حفظ
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">

          {/* Newsletter */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--admin-text-muted)] uppercase">النشرة البريدية</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showNewsletter}
                onChange={(e) => set('showNewsletter', e.target.checked)}
                className="w-4 h-4 rounded text-[var(--admin-primary)]"
              />
              <span className="text-sm font-bold text-[var(--admin-text-base)]">إظهار نموذج الاشتراك</span>
            </label>
            {settings.showNewsletter && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[var(--admin-text-muted)] mb-1">العنوان</label>
                  <input type="text" value={settings.newsletterTitle} onChange={(e) => set('newsletterTitle', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--admin-text-muted)] mb-1">النص الفرعي</label>
                  <input type="text" value={settings.newsletterSubtitle} onChange={(e) => set('newsletterSubtitle', e.target.value)} className={inputCls} />
                </div>
              </>
            )}
          </section>

          {/* Social / Payment */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--admin-text-muted)] uppercase">العناصر الإضافية</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showSocialIcons}
                onChange={(e) => set('showSocialIcons', e.target.checked)}
                className="w-4 h-4 rounded text-[var(--admin-primary)]"
              />
              <span className="text-sm font-bold text-[var(--admin-text-base)]">إظهار أيقونات التواصل الاجتماعي</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showPaymentIcons}
                onChange={(e) => set('showPaymentIcons', e.target.checked)}
                className="w-4 h-4 rounded text-[var(--admin-primary)]"
              />
              <span className="text-sm font-bold text-[var(--admin-text-base)]">إظهار طرق الدفع المدعومة</span>
            </label>
          </section>

          {/* Copyright */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--admin-text-muted)] uppercase">حقوق النشر</h3>
            <div>
              <label className="block text-xs font-bold text-[var(--admin-text-muted)] mb-1">نص حقوق النشر</label>
              <input type="text" value={settings.copyrightText} onChange={(e) => set('copyrightText', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--admin-text-muted)] mb-1">نسب المطور</label>
              <input type="text" value={settings.developerCredit} onChange={(e) => set('developerCredit', e.target.value)} className={inputCls} />
            </div>
          </section>

          {/* Navigation Columns */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--admin-text-muted)] uppercase">أعمدة التنقل</h3>
              <button
                onClick={addColumn}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--admin-primary)] hover:underline"
              >
                <IconPlus size={14} />
                إضافة عمود
              </button>
            </div>

            {settings.columns.length === 0 && (
              <p className="text-sm text-[var(--admin-text-muted)] text-center py-4">لا توجد أعمدة. أضف عموداً للبدء.</p>
            )}

            {settings.columns
              .sort((a, b) => a.order - b.order)
              .map((col) => (
                <div key={col.id} className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] overflow-hidden">
                  {/* Column header */}
                  <div className="flex items-center gap-2 p-3 bg-[var(--admin-bg-elevated)]">
                    <button
                      onClick={() => toggleCol(col.id)}
                      className="p-0.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)]"
                    >
                      {expandedCols.has(col.id) ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    </button>
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => patchColumn(col.id, { title: e.target.value })}
                      className="flex-1 bg-transparent text-sm font-bold text-[var(--admin-text-base)] outline-none border-b border-transparent focus:border-[var(--admin-primary)]"
                    />
                    <button
                      onClick={() => deleteColumn(col.id)}
                      className="p-1 text-[var(--admin-danger-muted)] hover:text-[var(--admin-danger)] rounded"
                      title="حذف العمود"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>

                  {/* Column links */}
                  {expandedCols.has(col.id) && (
                    <div className="p-3 space-y-2">
                      {col.links.map((link) => (
                        <div key={link.id} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-[1fr_1fr] gap-1">
                            <input
                              type="text"
                              value={link.label}
                              onChange={(e) => updateLink(col.id, link.id, { label: e.target.value })}
                              placeholder="الاسم"
                              className="bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
                            />
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => updateLink(col.id, link.id, { url: e.target.value })}
                              placeholder="/shop"
                              className="bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
                              dir="ltr"
                            />
                          </div>
                          <button
                            onClick={() => deleteLink(col.id, link.id)}
                            className="p-1 text-[var(--admin-danger-muted)] hover:text-[var(--admin-danger)] shrink-0"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addLink(col.id)}
                        className="flex items-center gap-1 text-xs text-[var(--admin-primary)] hover:underline mt-1"
                      >
                        <IconPlus size={12} />
                        إضافة رابط
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </section>
        </div>
      </div>

      {/* ── Right panel: live preview ── */}
      <div className="flex-1 min-w-0 h-full p-4 pl-0">
        <CMSPreviewPanel view={view} onViewChange={setView} title="معاينة التذييل" isUpdating={saving}>
          <div className="w-full h-full flex flex-col font-sans bg-[#FAF8F5]" dir="rtl">
            <div className="flex-1 flex items-center justify-center opacity-20 text-sm text-gray-400 font-bold">
              محتوى الصفحة
            </div>

            <footer className="border-t border-[#EAE3D9] bg-[#FAF8F5]">
              {/* Newsletter strip */}
              {settings.showNewsletter && (
                <div className="border-b border-[#EAE3D9] py-8 px-8 text-right">
                  <p className="text-[10px] uppercase tracking-widest text-[#C5A880] font-bold mb-1">{settings.newsletterTitle}</p>
                  <h3 className="text-lg font-light text-[#1C1C1B] mb-4">{settings.newsletterSubtitle}</h3>
                  <div className="flex max-w-xs gap-0">
                    <input type="email" placeholder="بريدكِ الإلكتروني..." className="flex-1 h-10 border border-[#EAE3D9] border-l-0 px-4 text-xs bg-white outline-none" />
                    <button className="h-10 bg-[#1C1C1B] text-[#FAF8F5] px-5 text-xs font-semibold">انضمام</button>
                  </div>
                </div>
              )}

              {/* Navigation columns */}
              <div className="py-8 px-8 grid gap-6" style={{ gridTemplateColumns: `repeat(${settings.columns.length || 1}, 1fr)` }}>
                {settings.columns.sort((a, b) => a.order - b.order).map((col) => (
                  <div key={col.id}>
                    <p className="text-[10px] uppercase tracking-widest text-[#C5A880] font-bold mb-3">{col.title}</p>
                    <ul className="space-y-2">
                      {col.links.map((link) => (
                        <li key={link.id} className="text-xs text-[#8A8070]">{link.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Bottom bar */}
              <div className="border-t border-[#EAE3D9] py-4 px-8 flex items-center justify-between">
                <div className="text-[10px] text-[#8A8070]">{settings.copyrightText}</div>
                {settings.showSocialIcons && (
                  <div className="flex gap-2">
                    {['IG', 'FB', 'TK', 'PIN'].map((s) => (
                      <div key={s} className="w-7 h-7 rounded-full border border-[#EAE3D9] flex items-center justify-center text-[9px] text-[#8A8070]">{s}</div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-[#C5A880]">{settings.developerCredit}</div>
              </div>
            </footer>
          </div>
        </CMSPreviewPanel>
      </div>
    </FadeIn>
  );
}
