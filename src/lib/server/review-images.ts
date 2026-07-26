import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { validateImageFile } from '@/lib/utils/image-file';

const BUCKET = 'reviews';
export const MAX_REVIEW_IMAGES = 5;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/**
 * Validates and uploads review photos via the service-role client (guests
 * have no direct write access to the `reviews` bucket — see
 * 20260726000004_review_order_verification.sql). Rolls back every file
 * already uploaded in this call if any later step fails, mirroring the
 * rollback-on-DB-failure pattern in media.service.ts.
 */
export async function uploadReviewImages(
  admin: SupabaseClient<Database>,
  files: File[],
  folder: string
): Promise<string[]> {
  if (files.length > MAX_REVIEW_IMAGES) {
    throw new Error(`يمكن رفع ${MAX_REVIEW_IMAGES} صور كحد أقصى`);
  }

  const uploadedPaths: string[] = [];
  const urls: string[] = [];

  try {
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) throw new Error(validationError);

      const path = `${folder}/${Date.now()}_${sanitizeFileName(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw new Error(error.message);

      uploadedPaths.push(path);
      const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  } catch (err) {
    if (uploadedPaths.length) await admin.storage.from(BUCKET).remove(uploadedPaths);
    throw err;
  }
}

/** Best-effort removal — used when an image is dropped during an edit, or the DB write after upload fails. */
export async function deleteReviewImagesByUrl(admin: SupabaseClient<Database>, urls: string[]): Promise<void> {
  if (!urls.length) return;
  const marker = `/object/public/${BUCKET}/`;
  const paths = urls
    .map((url) => {
      const idx = url.indexOf(marker);
      return idx === -1 ? null : url.slice(idx + marker.length);
    })
    .filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(BUCKET).remove(paths);
}
