"use client";

import React, { useRef, useState } from 'react';
import { MediaPicker } from './MediaPicker';
import { Media } from '@/data/mock/media';
import { MediaService } from '@/lib/services/media.service';
import { validateImageFile } from '@/lib/utils/image-file';
import { toast } from 'sonner';
import { Button } from '@/components/admin/design-system/Button';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
}

export function ImageUpload({ images, onChange, multiple = false }: ImageUploadProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (media: Media | Media[]) => {
    if (Array.isArray(media)) {
      if (multiple) {
        onChange([...images, ...media.map(m => m.url)]);
      }
    } else {
      if (multiple) {
        onChange([...images, media.url]);
      } else {
        onChange([media.url]);
      }
    }
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const files = (multiple ? Array.from(fileList) : Array.from(fileList).slice(0, 1));
    if (files.length === 0 || uploading) return;

    setUploading(true);
    const uploadedUrls: string[] = [];
    try {
      // Each file is uploaded in isolation so one failure (bad network, RLS, etc.)
      // can never discard the URLs already uploaded earlier in the same batch.
      for (const file of files) {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          continue;
        }
        try {
          const media = await MediaService.uploadMedia(file, { alt: file.name, folder: 'uncategorized' });
          uploadedUrls.push(media.url);
        } catch (err) {
          toast.error(err instanceof Error ? `فشل رفع "${file.name}": ${err.message}` : `فشل رفع "${file.name}"`);
        }
      }

      if (uploadedUrls.length > 0) {
        onChange(multiple ? [...images, ...uploadedUrls] : [uploadedUrls[0]]);
        toast.success(uploadedUrls.length === 1 ? 'تم رفع الصورة بنجاح' : `تم رفع ${uploadedUrls.length} صور بنجاح`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Snapshot into a plain array before resetting the input's value — resetting
    // `value` clears the live FileList too, so grabbing a bare reference to
    // `e.target.files` (instead of copying it first) makes it empty by the time
    // `processFiles` reads it, silently no-op'ing the whole upload. Same fix
    // already applied in MediaPicker.tsx's equivalent handler.
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file again later
    if (files.length > 0) processFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4 w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[var(--admin-radius-lg)] p-8 text-center transition-colors bg-[var(--admin-bg-elevated)] ${
          isDragging ? 'border-[var(--admin-primary)] bg-[var(--admin-primary-muted)]' : 'border-[var(--admin-border-strong)]'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <IconPhoto size={36} className="text-[var(--admin-text-subtle)]" stroke={1.5} />
          <p className="text-sm font-semibold text-[var(--admin-text-base)]">
            اسحب الصور هنا أو اختر إحدى الطريقتين
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<IconPhoto size={16} />}
              onClick={() => setMediaPickerOpen(true)}
              disabled={uploading}
            >
              اختيار من مكتبة الوسائط
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<IconUpload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              isLoading={uploading}
            >
              رفع من الجهاز
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
          {images.map((src, idx) => (
            <div key={idx} className="relative aspect-square rounded-[var(--admin-radius-md)] overflow-hidden border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)] group bg-[var(--admin-bg-subtle)]">
              { }
              <img src={src} alt="Upload preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-[var(--admin-bg-base)]/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                  className="p-2 bg-[var(--admin-danger)] text-white rounded-[var(--admin-radius-md)] shadow-[var(--admin-shadow-md)] hover:bg-[#b91c1c] transition-colors hover:scale-105 active:scale-95"
                >
                  <IconX size={18} stroke={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        multiple={multiple}
        allowedTypes={['image']}
      />
    </div>
  );
}
