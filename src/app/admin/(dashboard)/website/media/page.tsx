"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MediaService } from '@/lib/services/media.service';
import { Media } from '@/data/mock/media';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { validateImageFile } from '@/lib/utils/image-file';

// SaaS UI Components
import { PageHeader, EmptyState, Skeleton } from '@/components/admin/design-system/Layout';
import { Button } from '@/components/admin/design-system/Button';
import { Badge } from '@/components/admin/design-system/Badge';
import { Input } from '@/components/admin/design-system/Input';

// Tabler Icons
import {
  IconSearch,
  IconUpload,
  IconFolder,
  IconFile,
  IconCheck,
  IconTrash,
  IconLink,
  IconDownload,
  IconPhoto
} from '@tabler/icons-react';

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState({
    search: '',
    folder: 'all'
  });

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await MediaService.getMedia(filters);
      setMediaItems(data);
    } catch {
      toast.error('فشل في تحميل الوسائط');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const f = await MediaService.getFolders();
      setFolders(f);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMedia();
    loadFolders();
  }, [filters]);

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === mediaItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mediaItems.map(m => m.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`تأكيد حذف ${selectedIds.size} ملف؟`)) {
      setLoading(true);
      await MediaService.deleteMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success('تم الحذف بنجاح');
      loadMedia();
    }
  };

  const handleUploadClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file again later
    if (files.length === 0 || uploading) return;

    setUploading(true);
    let successCount = 0;
    try {
      for (const file of files) {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }
        if (await MediaService.existsByName(file.name)) {
          toast.warning(`تم تجاهل "${file.name}" لوجود ملف بنفس الاسم مسبقًا`);
          continue;
        }
        await MediaService.uploadMedia(file, {
          alt: file.name,
          folder: filters.folder !== 'all' ? filters.folder : 'uncategorized',
        });
        successCount++;
      }
      if (successCount > 0) {
        toast.success(successCount === 1 ? 'تم رفع الملف بنجاح' : `تم رفع ${successCount} ملفات بنجاح`);
        loadMedia();
        loadFolders();
      }
    } catch {
      toast.error('حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ الرابط');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="مكتبة الوسائط"
        description="الإدارة المركزية للصور والملفات (Media Library)."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <Button leftIcon={<IconUpload size={18} />} onClick={handleUploadClick} isLoading={uploading}>
              رفع جديد
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] p-3 rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-lg)] sticky top-20 z-20"
          >
            <div className="flex items-center gap-4">
              <Badge variant="primary">{selectedIds.size} محدد</Badge>
              <div className="hidden sm:block h-4 w-px bg-[var(--admin-border-strong)]" />
              <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                تحديد الكل
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="danger" leftIcon={<IconTrash size={16} />} onClick={handleDelete}>
                حذف المحدد
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                إلغاء
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-sm)] flex flex-col min-h-[600px] overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Input
                icon={<IconSearch size={18} />}
                placeholder="البحث في الملفات..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <select
              value={filters.folder}
              onChange={e => setFilters(prev => ({ ...prev, folder: e.target.value }))}
              className="px-4 py-2 border border-[var(--admin-border-base)] bg-[var(--admin-bg-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] min-w-[150px]"
            >
              <option value="all">جميع المجلدات</option>
              {folders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--admin-text-muted)] tabular-nums">{mediaItems.length} عنصر</span>
          </div>
        </div>

        {/* Grid */}
        <div className="p-6 flex-1 bg-[var(--admin-bg-subtle)] relative">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="aspect-square w-full rounded-[var(--admin-radius-md)]" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <EmptyState
                icon={<IconPhoto size={48} />}
                title="لا توجد ملفات مطابقة"
                description="لم يتم العثور على أي ملفات في هذا المجلد أو تطابق بحثك."
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {mediaItems.map(media => {
                const isSelected = selectedIds.has(media.id);
                return (
                  <div
                    key={media.id}
                    className={`relative group bg-[var(--admin-bg-base)] rounded-[var(--admin-radius-lg)] border-2 transition-all flex flex-col overflow-hidden ${isSelected ? 'border-[var(--admin-primary)] shadow-md shadow-[var(--admin-primary)]/10' : 'border-[var(--admin-border-light)] hover:border-[var(--admin-border-strong)]'}`}
                  >
                    <div className="aspect-square bg-[var(--admin-bg-elevated)] relative cursor-pointer" onClick={() => handleSelect(media.id)}>
                      {media.mimeType.includes('image') ? (
                        <img src={media.thumbnail || media.url} alt={media.alt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconFile size={40} className="text-[var(--admin-text-subtle)]" stroke={1} />
                        </div>
                      )}

                      {/* Select Checkbox Overlay */}
                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-[var(--admin-radius-sm)] border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--admin-primary)] border-[var(--admin-primary)] text-[var(--admin-bg-base)]' : 'border-[var(--admin-border-strong)] bg-[var(--admin-bg-base)]/50 opacity-0 group-hover:opacity-100'}`}>
                        {isSelected && <IconCheck size={14} stroke={3} />}
                      </div>
                    </div>

                    <div className="p-3 border-t border-[var(--admin-border-light)] bg-[var(--admin-bg-base)] flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[var(--admin-text-base)] line-clamp-1 truncate" title={media.originalName}>{media.originalName}</p>
                        <p className="text-[10px] text-[var(--admin-text-muted)] flex items-center gap-1 mt-1 font-medium"><IconFolder size={12} className="shrink-0"/> {media.folder}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--admin-text-subtle)] font-sans font-medium">
                        <span className="tabular-nums">{formatSize(media.size)}</span>
                        <span className="tabular-nums">{formatDate(media.uploadedAt).split(' ')[0]}</span>
                      </div>
                    </div>

                    {/* Actions Overlay on hover */}
                    <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5 z-10">
                      <button onClick={(e) => { e.stopPropagation(); copyUrl(media.url); }} className="p-1.5 bg-[var(--admin-bg-base)]/90 backdrop-blur-sm text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] shadow-[var(--admin-shadow-sm)] hover:bg-[var(--admin-bg-hover)] border border-[var(--admin-border-light)]" title="نسخ الرابط">
                        <IconLink size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); window.open(media.url, '_blank'); }} className="p-1.5 bg-[var(--admin-bg-base)]/90 backdrop-blur-sm text-[var(--admin-text-base)] rounded-[var(--admin-radius-md)] shadow-[var(--admin-shadow-sm)] hover:bg-[var(--admin-bg-hover)] border border-[var(--admin-border-light)]" title="فتح">
                        <IconDownload size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
