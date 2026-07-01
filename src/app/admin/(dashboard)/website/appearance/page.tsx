"use client";

import React, { useState, useEffect } from "react";
import { IconPalette, IconDeviceFloppy } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/design-system/Button";
import { CMSPreviewPanel, DeviceView } from "@/components/admin/storefront/CMSPreviewPanel";
import { FadeIn } from "@/components/admin/ui/motion";
import { AppearanceService, StoreAppearance } from "@/lib/services/storefront/appearance.service";
import { MediaPickerField } from "@/components/admin/storefront/MediaPickerField";

/** Inline colour picker + hex input pair */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-[var(--admin-border-base)] cursor-pointer p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
          dir="ltr"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default function AppearanceManager() {
  const [settings, setSettings] = useState<StoreAppearance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<DeviceView>("desktop");

  useEffect(() => {
    AppearanceService.getSettings()
      .then(setSettings)
      .catch(() => toast.error("تعذّر تحميل إعدادات المظهر"))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof StoreAppearance>(key: K, value: StoreAppearance[K]) => {
    if (settings) setSettings({ ...settings, [key]: value });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await AppearanceService.updateSettings(settings);
      toast.success("تم حفظ إعدادات المظهر");
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-8 animate-pulse text-[var(--admin-text-muted)]">جارٍ التحميل...</div>;
  }

  const accent = settings.accentColor || '#C5A880';
  const bg     = settings.backgroundPrimaryColor || '#FAF8F5';
  const txt    = settings.textPrimaryColor || '#1C1C1B';

  const RADIUS_CSS: Record<string, string> = {
    none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px'
  };

  return (
    <FadeIn className="h-[calc(100vh-180px)] min-h-[560px] flex flex-col md:flex-row bg-[var(--admin-bg-base)] rounded-[var(--admin-radius-xl)] overflow-hidden border border-[var(--admin-border-base)]">

      {/* ── Left panel: settings ── */}
      <div className="w-full md:w-[400px] shrink-0 border-r border-[var(--admin-border-base)] flex flex-col h-full bg-[var(--admin-bg-surface)]">
        <div className="p-4 border-b border-[var(--admin-border-light)] flex items-center justify-between sticky top-0 bg-[var(--admin-bg-surface)] z-10">
          <div className="flex items-center gap-2 text-[var(--admin-text-base)]">
            <IconPalette size={20} className="text-[var(--admin-primary)]" />
            <h1 className="font-bold">المظهر والتصميم</h1>
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

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">

          {/* Brand Colors */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--admin-text-muted)] uppercase">ألوان العلامة التجارية</h3>
            <ColorField
              label="لون الهوية (Accent)"
              value={settings.accentColor}
              onChange={v => update('accentColor', v)}
            />
            <ColorField
              label="لون النص الأساسي"
              value={settings.textPrimaryColor}
              onChange={v => update('textPrimaryColor', v)}
            />
            <ColorField
              label="لون الخلفية الأساسية"
              value={settings.backgroundPrimaryColor}
              onChange={v => update('backgroundPrimaryColor', v)}
            />
            <p className="text-xs text-[var(--admin-text-muted)]">
              ⚠ تغيير الألوان يؤثر على كامل الموقع فور الحفظ. احتفظي بنسخة احتياطية من القيم الأصلية.
            </p>
          </div>

          {/* Visual identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--admin-text-muted)] uppercase">الهوية البصرية</h3>
            <MediaPickerField
              label="الشعار (Logo URL)"
              value={settings.logoUrl}
              onChange={v => update('logoUrl', v)}
            />
            <MediaPickerField
              label="أيقونة المتصفح (Favicon)"
              value={settings.faviconUrl}
              onChange={v => update('faviconUrl', v)}
            />
          </div>

          {/* Layout */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--admin-text-muted)] uppercase">التخطيط العام</h3>
            <div>
              <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1.5">القالب (Theme Preset)</label>
              <select
                value={settings.themePreset}
                onChange={e => update('themePreset', e.target.value as StoreAppearance['themePreset'])}
                className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
              >
                <option value="luxury">Luxury (أسود وعاجي وذهبي)</option>
                <option value="modern">Modern (عصري ومبسط)</option>
                <option value="minimal">Minimal (ألوان هادئة جداً)</option>
                <option value="playful">Playful (ألوان مبهجة)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1.5">الحواف (Border Radius)</label>
              <select
                value={settings.borderRadius}
                onChange={e => update('borderRadius', e.target.value as StoreAppearance['borderRadius'])}
                className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
              >
                <option value="none">بدون حواف (0px)</option>
                <option value="sm">صغير (4px)</option>
                <option value="md">متوسط (8px)</option>
                <option value="lg">كبير (16px)</option>
                <option value="full">دائري (9999px)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1.5">عرض المحتوى (Container Width)</label>
              <select
                value={settings.containerWidth}
                onChange={e => update('containerWidth', e.target.value as StoreAppearance['containerWidth'])}
                className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
              >
                <option value="sm">ضيق (960px)</option>
                <option value="md">متوسط (1080px)</option>
                <option value="lg">كبير (1280px)</option>
                <option value="xl">واسع (1440px)</option>
                <option value="full">عرض كامل</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--admin-text-base)] mb-1.5">سرعة الحركة (Animation Speed)</label>
              <select
                value={settings.animationSpeed}
                onChange={e => update('animationSpeed', e.target.value as StoreAppearance['animationSpeed'])}
                className="w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
              >
                <option value="slow">بطيئة (600ms)</option>
                <option value="normal">عادية (300ms)</option>
                <option value="fast">سريعة (150ms)</option>
              </select>
            </div>
          </div>

          {/* Effects */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--admin-text-muted)] uppercase">التأثيرات</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.effects.hoverScale}
                onChange={e => update('effects', { ...settings.effects, hoverScale: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--admin-primary)]"
              />
              <span className="text-sm font-bold text-[var(--admin-text-base)]">تكبير العناصر عند التمرير (Hover Scale)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.effects.pageTransitions}
                onChange={e => update('effects', { ...settings.effects, pageTransitions: e.target.checked })}
                className="w-4 h-4 rounded text-[var(--admin-primary)]"
              />
              <span className="text-sm font-bold text-[var(--admin-text-base)]">حركة انتقال الصفحات</span>
            </label>
          </div>

        </div>
      </div>

      {/* ── Right panel: live preview ── */}
      <div className="flex-1 min-w-0 h-full p-4 pl-0">
        <CMSPreviewPanel view={view} onViewChange={setView} title="معاينة المظهر" isUpdating={saving}>
          <div
            className="w-full h-full min-h-[600px] flex flex-col font-sans p-8 transition-colors duration-300"
            style={{ backgroundColor: bg, color: txt }}
          >
            {/* Fake navbar */}
            <header className="mb-12 flex justify-between items-center border-b pb-4" style={{ borderColor: `${txt}20` }}>
              <div className="text-xs font-light" style={{ color: accent }}>AURA STORE</div>
              <div className="flex gap-4 text-xs">
                {['المتجر','الأتيليه','تواصل'].map(l => (
                  <span key={l} className="font-medium cursor-pointer" style={{ color: txt }}>{l}</span>
                ))}
              </div>
            </header>

            {/* Fake hero */}
            <div
              className="w-full flex items-center justify-center mb-8 transition-all duration-300 aspect-video"
              style={{
                backgroundColor: `${txt}10`,
                border: `1px solid ${txt}15`,
                borderRadius: RADIUS_CSS[settings.borderRadius] ?? '8px',
              }}
            >
              <span className="text-2xl font-bold opacity-30" style={{ color: txt }}>Hero Section</span>
            </div>

            {/* Fake product grid */}
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`aspect-[3/4] flex items-center justify-center transition-all duration-300 ${settings.effects.hoverScale ? 'hover:scale-105 cursor-pointer' : ''}`}
                  style={{
                    backgroundColor: `${txt}08`,
                    border: `1px solid ${txt}12`,
                    borderRadius: RADIUS_CSS[settings.cardRadius] ?? '8px',
                  }}
                >
                  <span className="text-xs font-semibold opacity-30" style={{ color: txt }}>قطعة {i}</span>
                </div>
              ))}
            </div>

            {/* Fake CTA */}
            <div className="mt-8 flex justify-center">
              <div
                className="px-8 py-3 text-sm font-semibold"
                style={{
                  backgroundColor: accent,
                  color: bg,
                  borderRadius: RADIUS_CSS[settings.borderRadius] ?? '8px',
                }}
              >
                تسوقي الآن
              </div>
            </div>
          </div>
        </CMSPreviewPanel>
      </div>
    </FadeIn>
  );
}
