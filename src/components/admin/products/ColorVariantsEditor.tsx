"use client";

import React, { useState } from 'react';
import { ProductColorVariant, ProductVariant } from '@/data/mock/products';
import { ImageUpload } from '@/components/admin/ui/ImageUpload';
import { Button } from '@/components/admin/design-system/Button';
import { Input } from '@/components/admin/design-system/Input';
import { toast } from 'sonner';
import { IconPlus, IconTrash, IconPhoto, IconCopy, IconPencil, IconChevronUp } from '@tabler/icons-react';

interface ColorVariantsEditorProps {
  colors: ProductColorVariant[];
  variants: ProductVariant[];
  onChange: (colors: ProductColorVariant[]) => void;
}

export function ColorVariantsEditor({ colors, variants, onChange }: ColorVariantsEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const id = `color_${Date.now()}`;
    onChange([
      ...colors,
      {
        id,
        color: '',
        colorEn: '',
        value: '#000000',
        images: [],
        sortOrder: colors.length,
        isDefault: colors.length === 0,
        isActive: true,
      },
    ]);
    setExpandedIds(prev => new Set(prev).add(id));
  };

  const handleDuplicate = (index: number) => {
    const source = colors[index];
    const clone: ProductColorVariant = {
      ...source,
      id: `color_${Date.now()}`,
      color: source.color ? `${source.color} (نسخة)` : '',
      isDefault: false,
    };
    const updated = [...colors];
    updated.splice(index + 1, 0, clone);
    onChange(updated);
    setExpandedIds(prev => new Set(prev).add(clone.id!));
  };

  const handleUpdate = <K extends keyof ProductColorVariant>(index: number, field: K, value: ProductColorVariant[K]) => {
    const updated = [...colors];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleSetDefault = (index: number) => {
    if (colors[index].isDefault) return;
    onChange(colors.map((c, i) => ({ ...c, isDefault: i === index })));
  };

  const deleteBlockedReason = (color: ProductColorVariant): string | null => {
    if (colors.length <= 1) return 'لا يمكن حذف اللون الوحيد المتبقي — يجب أن يحتوي المنتج على لون واحد على الأقل';
    if (color.isDefault) return 'لا يمكن حذف اللون الافتراضي — اختاري لوناً آخر كافتراضي أولاً';
    if (color.id && variants.some(v => v.colorId === color.id)) return 'لا يمكن حذف هذا اللون لأنه مستخدم في جدول المتغيرات — أعيدي ربط تلك الصفوف بلون آخر أولاً';
    return null;
  };

  const handleRemove = (index: number) => {
    const blocked = deleteBlockedReason(colors[index]);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    const updated = [...colors];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--admin-text-muted)]">
          كل لون له معرض صوره الخاص — سيظهر للعميلة فقط صور اللون الذي تختاره. اللون الافتراضي هو ما يظهر أولاً في المتجر وبطاقات المنتج.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={handleAdd} leftIcon={<IconPlus size={16} />}>
          إضافة لون
        </Button>
      </div>

      <div className="space-y-3">
        {colors.map((color, index) => {
          const isExpanded = !!color.id && expandedIds.has(color.id);
          const blocked = deleteBlockedReason(color);

          return (
            <div
              key={color.id ?? index}
              className="border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] overflow-hidden"
            >
              {/* Collapsed row */}
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => handleSetDefault(index)}
                  disabled={color.isDefault}
                  title={color.isDefault ? 'اللون الافتراضي' : 'تعيين كافتراضي'}
                  className="shrink-0 text-lg leading-none disabled:cursor-default"
                  style={{ color: color.isDefault ? 'var(--admin-primary)' : 'var(--admin-text-subtle)' }}
                >
                  {color.isDefault ? '●' : '○'}
                </button>

                <div className="relative w-10 h-10 shrink-0 rounded-[var(--admin-radius-md)] overflow-hidden border border-[var(--admin-border-base)] bg-[var(--admin-bg-subtle)] flex items-center justify-center">
                  {color.images[0] ? (
                    <img src={color.images[0]} alt={color.color || 'لون'} className="w-full h-full object-cover" />
                  ) : (
                    <IconPhoto size={16} className="text-[var(--admin-text-subtle)]" />
                  )}
                </div>

                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(color.value) ? color.value : '#000000' }}
                />

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--admin-text-base)] truncate">
                      {color.color || 'بدون اسم'}
                    </span>
                    {color.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] font-medium">
                        افتراضي
                      </span>
                    )}
                    {color.isActive === false && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--admin-bg-hover)] text-[var(--admin-text-subtle)] font-medium">
                        معطّل
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-subtle)]">الصور ({color.images.length})</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => color.id && toggleExpanded(color.id)}
                    title="تعديل"
                    className="p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] rounded transition-colors"
                  >
                    {isExpanded ? <IconChevronUp size={16} /> : <IconPencil size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(index)}
                    title="نسخ اللون"
                    className="p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] rounded transition-colors"
                  >
                    <IconCopy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    title={blocked ?? 'حذف اللون'}
                    className="p-1.5 text-[var(--admin-danger)] hover:bg-[var(--admin-danger)]/10 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!!blocked}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-[var(--admin-border-base)] p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="اسم اللون (عربي)"
                      required
                      value={color.color}
                      onChange={(e) => handleUpdate(index, 'color', e.target.value)}
                      placeholder="مثال: أسود"
                    />
                    <Input
                      label="اسم اللون (إنجليزي)"
                      value={color.colorEn || ''}
                      onChange={(e) => handleUpdate(index, 'colorEn', e.target.value)}
                      placeholder="Black"
                      className="dir-ltr text-left"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--admin-text-muted)]">كود اللون (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(color.value) ? color.value : '#000000'}
                          onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                          className="w-9 h-9 border border-[var(--admin-border-base)] rounded cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={color.value || ''}
                          onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                          className="flex-grow h-9 px-2 border border-[var(--admin-border-base)] rounded bg-transparent outline-none focus:border-[var(--admin-primary)] dir-ltr text-left text-sm"
                          placeholder="#111111"
                        />
                      </div>
                    </div>
                    <Input
                      label="ترتيب العرض"
                      type="number"
                      value={color.sortOrder ?? index}
                      onChange={(e) => handleUpdate(index, 'sortOrder', Number(e.target.value))}
                    />
                    <Input
                      label="المخزون (اختياري)"
                      type="number"
                      value={color.stock ?? ''}
                      onChange={(e) => handleUpdate(index, 'stock', e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="اتركيه فارغاً لاستخدام مخزون المقاسات"
                    />
                    <Input
                      label="إضافة SKU (اختياري)"
                      value={color.skuSuffix || ''}
                      onChange={(e) => handleUpdate(index, 'skuSuffix', e.target.value)}
                      placeholder="BLK"
                      className="dir-ltr text-left"
                    />
                    <Input
                      label="سعر مخصص لهذا اللون (اختياري)"
                      type="number"
                      value={color.priceOverride ?? ''}
                      onChange={(e) => handleUpdate(index, 'priceOverride', e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="اتركيه فارغاً لاستخدام سعر المنتج"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={color.isActive !== false}
                      onChange={(e) => handleUpdate(index, 'isActive', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span>مفعّل</span>
                  </label>

                  <div>
                    <label className="text-xs font-semibold text-[var(--admin-text-muted)] block mb-2">صور هذا اللون</label>
                    <ImageUpload multiple images={color.images} onChange={(images) => handleUpdate(index, 'images', images)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
