/**
 * Client-side image pipeline: validate → convert to WebP → upload to Supabase Storage.
 *
 * Every image that reaches Storage goes through `convertToWebP` first, so the bucket only
 * ever holds WebP files for new uploads (existing JPG/PNG objects from before this pipeline
 * are untouched and keep rendering normally — browsers/next/image don't care what format an
 * already-stored object is in).
 */
import { createClient } from '@/lib/supabase/client';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// 80-85 is the sweet spot for WebP: visually lossless for photography, big size win over
// re-encoded JPEG/PNG. Kept as a constant so it's tunable in one place.
const WEBP_QUALITY = 0.82;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `نوع الملف غير مدعوم: ${file.name}`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `حجم الملف كبير جدًا (الحد الأقصى 5MB): ${file.name}`;
  }
  return null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/** Strips any existing extension and sanitizes the remaining base name. */
function baseNameWithoutExtension(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  return sanitized.replace(/\.[^.]+$/, '');
}

export interface ConvertedImage {
  blob: Blob;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Converts a picked File to WebP on a <canvas>, preserving pixel dimensions (no resize, so
 * aspect ratio is untouched) and alpha (canvas 2D contexts are RGBA by default, and
 * `toBlob('image/webp', q)` encodes the alpha channel — PNG transparency survives).
 *
 * Falls back to the original file if the browser can't produce a WebP blob (very old
 * WebKit, or a format `createImageBitmap` can't decode), so uploads never hard-fail
 * because of the conversion step.
 *
 * Exported as `compressImageForUpload` for callers that need the compressed blob
 * without going through `uploadImageFile`'s Supabase Storage call — e.g. the review-photo
 * forms, which send the compressed blob to a server API route instead.
 */
export async function compressImageForUpload(file: File): Promise<ConvertedImage> {
  const baseName = baseNameWithoutExtension(file.name);

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    );
    if (!webpBlob) throw new Error('canvas could not encode webp');

    return {
      blob: webpBlob,
      fileName: `${baseName}.webp`,
      mimeType: 'image/webp',
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    // Unsupported browser/format — upload the original rather than failing the whole flow.
    const { width, height } = await readDimensions(file);
    return { blob: file, fileName: sanitizeFileName(file.name), mimeType: file.type, width, height };
  }
}

/** Probes a file's pixel dimensions without uploading it anywhere. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Converts `file` to WebP (see `convertToWebP`) and uploads the result to a Supabase Storage
 * bucket. Returns the deterministic file name that was actually stored (timestamp + sanitized
 * base name + `.webp`) so callers can keep their DB row's `file_name` in sync with what's in
 * Storage — the original name/extension is unrelated once conversion runs.
 */
export async function uploadImageFile(
  file: File,
  bucket: string,
  folder = 'uncategorized'
): Promise<{
  path: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  const supabase = createClient();
  const converted = await compressImageForUpload(file);
  const fileName = `${Date.now()}_${converted.fileName}`;
  const path = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, converted.blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: converted.mimeType,
  });
  if (error) throw new Error(`فشل رفع الملف: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    path,
    publicUrl: data.publicUrl,
    fileName,
    mimeType: converted.mimeType,
    width: converted.width,
    height: converted.height,
    sizeBytes: converted.blob.size,
  };
}
