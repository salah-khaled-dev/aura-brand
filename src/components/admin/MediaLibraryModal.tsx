'use client';

import { useState } from 'react';
import {
  IconX,
  IconUpload,
  IconSearch,
  IconPhoto,
  IconFolder,
  IconTag,
  IconDotsVertical,
  IconLink,
  IconHeart,
} from '@tabler/icons-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: number; // bytes
  dimensions?: { width: number; height: number };
  tags: string[];
  folderId?: string;
  isFavorite: boolean;
  usedBy: { type: string; id: string; name: string }[];
  createdAt: string;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  multiple?: boolean;
}

const mockMedia: MediaItem[] = [];

export function MediaLibraryModal({ isOpen, onClose, onSelect }: MediaLibraryModalProps) {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-[var(--admin-radius-2xl)] bg-[var(--admin-bg-surface)] shadow-[var(--admin-shadow-float)] border border-[var(--admin-border-base)] overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border-base)] p-4 bg-[var(--admin-bg-card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--admin-radius-lg)] bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]">
              <IconPhoto size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text-base)]">مكتبة الوسائط</h2>
              <p className="text-sm text-[var(--admin-text-subtle)]">اختر صورة أو قم برفع صورة جديدة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-10 items-center gap-2 rounded-[var(--admin-radius-md)] bg-[var(--admin-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--admin-primary-hover)] transition-colors">
              <IconUpload size={18} />
              <span>رفع ملف</span>
            </button>
            <button onClick={onClose} className="p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] transition-colors">
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex flex-1 flex-col border-l border-[var(--admin-border-light)]">
            {/* Toolbar */}
            <div className="flex items-center gap-4 p-4 border-b border-[var(--admin-border-light)]">
              <div className="relative flex-1">
                <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-subtle)]" size={18} />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الوسم، أو المجلد..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] text-[var(--admin-text-base)] py-2 pl-4 pr-10 outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] placeholder:text-[var(--admin-text-subtle)]"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-bg-hover)] text-sm text-[var(--admin-text-base)] transition-colors">
                <IconFolder size={16} />
                <span>المجلدات</span>
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {mockMedia.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <IconPhoto size={32} className="text-[var(--admin-text-subtle)]" />
                  <p className="text-sm text-[var(--admin-text-subtle)]">لا توجد ملفات في مكتبة الوسائط بعد</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mockMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "group relative aspect-square rounded-[var(--admin-radius-lg)] border-2 overflow-hidden cursor-pointer transition-all",
                      selectedItem?.id === item.id
                        ? "border-[var(--admin-primary)] ring-2 ring-[var(--admin-primary-muted)]"
                        : "border-[var(--admin-border-base)] hover:border-[var(--admin-primary)]"
                    )}
                  >
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                    {item.isFavorite && (
                      <div className="absolute top-2 right-2 text-[var(--admin-danger)] bg-[var(--admin-bg-card)]/80 rounded-full p-1.5 backdrop-blur-sm">
                        <IconHeart size={14} fill="currentColor" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-xs font-medium text-white truncate" dir="ltr">{item.name}</p>
                      <p className="text-[10px] text-white/70 mt-1">{(item.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Details Sidebar */}
          {selectedItem && (
            <div className="w-80 flex-shrink-0 flex flex-col bg-[var(--admin-bg-base)] overflow-y-auto border-r border-[var(--admin-border-light)]">
              <div className="p-4 border-b border-[var(--admin-border-light)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--admin-text-base)]">تفاصيل الملف</h3>
                <button className="p-1 hover:bg-[var(--admin-bg-hover)] rounded-[var(--admin-radius-sm)] transition-colors">
                  <IconDotsVertical size={16} className="text-[var(--admin-text-muted)]" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                <div className="aspect-video rounded-[var(--admin-radius-md)] border border-[var(--admin-border-base)] overflow-hidden bg-[var(--admin-bg-elevated)]">
                  <img src={selectedItem.url} alt={selectedItem.name} className="h-full w-full object-contain" />
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[var(--admin-border-light)] pb-2">
                    <span className="text-[var(--admin-text-subtle)]">الاسم</span>
                    <span className="font-medium text-[var(--admin-text-base)] truncate max-w-[150px]" dir="ltr">{selectedItem.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--admin-border-light)] pb-2">
                    <span className="text-[var(--admin-text-subtle)]">الحجم</span>
                    <span className="font-medium font-mono text-[var(--admin-text-base)]">{(selectedItem.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--admin-border-light)] pb-2">
                    <span className="text-[var(--admin-text-subtle)]">الأبعاد</span>
                    <span className="font-medium font-mono text-[var(--admin-text-base)]">{selectedItem.dimensions?.width}x{selectedItem.dimensions?.height}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--admin-border-light)] pb-2">
                    <span className="text-[var(--admin-text-subtle)]">تاريخ الرفع</span>
                    <span className="font-medium text-[var(--admin-text-base)]">اليوم</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--admin-text-subtle)]">الوسوم</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] px-2 py-1 rounded-[var(--admin-radius-sm)] text-xs text-[var(--admin-text-base)]">
                        <IconTag size={12} className="text-[var(--admin-text-subtle)]" />
                        {tag}
                      </span>
                    ))}
                    <button className="text-xs text-[var(--admin-primary)] hover:underline">+ إضافة وسم</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--admin-text-subtle)]">مستخدم بواسطة (Used By)</span>
                  {selectedItem.usedBy.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.usedBy.map((usage, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] p-2 rounded-[var(--admin-radius-md)] text-sm">
                          <IconLink size={14} className="text-[var(--admin-primary)]" />
                          <div className="flex flex-col">
                            <span className="font-medium text-[var(--admin-text-base)]">{usage.name}</span>
                            <span className="text-[10px] text-[var(--admin-text-subtle)] uppercase">{usage.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--admin-text-subtle)]">غير مستخدم حالياً</p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      onSelect(selectedItem);
                      onClose();
                    }}
                    className="flex-1 bg-[var(--admin-primary)] text-white rounded-[var(--admin-radius-md)] py-2 text-sm font-medium hover:bg-[var(--admin-primary-hover)] transition-colors"
                  >
                    تحديد الملف
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
