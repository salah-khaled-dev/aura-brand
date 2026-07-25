import type { Media } from '@/data/mock/media';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';
import { uploadImageFile } from '@/lib/utils/image-file';

export interface MediaFilters {
  search?: string;
  folder?: string;
  type?: string;
}

const BUCKET = 'media';
const supabase = createClient();

function rowToMedia(row: Tables<'media'>): Media {
  return {
    id: row.id,
    fileName: row.file_name,
    originalName: row.original_name,
    alt: row.alt,
    mimeType: row.mime_type,
    width: row.width ?? 0,
    height: row.height ?? 0,
    size: row.size_bytes,
    folder: row.folder,
    url: row.url,
    thumbnail: row.thumbnail_url ?? row.url,
    uploadedAt: row.created_at,
    uploadedBy: row.uploaded_by ?? 'Admin',
    usedIn: row.used_in,
    tags: row.tags,
  };
}

export const MediaService = {
  async getMedia(filters?: MediaFilters): Promise<Media[]> {
    let query = supabase.from('media').select('*').order('created_at', { ascending: false });
    if (filters?.folder && filters.folder !== 'all') query = query.eq('folder', filters.folder);
    if (filters?.type && filters.type !== 'all') query = query.ilike('mime_type', `%${filters.type}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let items = (data ?? []).map(rowToMedia);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(m =>
        m.originalName.toLowerCase().includes(q) ||
        m.alt.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return items;
  },

  /**
   * Uploads `file` to Supabase Storage and records it in the `media` table.
   * `uploadImageFile` converts the file to WebP first (see image-file.ts), so `file_name`,
   * `mime_type`, `size_bytes`, and the dimensions here all describe the *stored* WebP object,
   * not the original picked file — `original_name` is the only field that keeps the source name.
   */
  async uploadMedia(file: File, meta?: { alt?: string; folder?: string; tags?: string[] }): Promise<Media> {
    const folder = meta?.folder || 'uncategorized';
    const { path, publicUrl, fileName, mimeType, width, height, sizeBytes } = await uploadImageFile(file, BUCKET, folder);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertRow: TablesInsert<'media'> = {
      file_name: fileName,
      original_name: file.name,
      alt: meta?.alt || file.name,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      width,
      height,
      folder,
      bucket_id: BUCKET,
      storage_path: path,
      url: publicUrl,
      thumbnail_url: publicUrl,
      uploaded_by: user?.id ?? null,
      tags: meta?.tags ?? [],
    };

    const { data: row, error } = await supabase.from('media').insert(insertRow).select('*').single();
    if (error) {
      // Roll back the uploaded object so it doesn't become an orphaned file.
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(error.message);
    }
    return rowToMedia(row);
  },

  async updateMedia(id: string, data: Partial<Media>): Promise<Media> {
    const update: TablesUpdate<'media'> = {};
    if (data.alt !== undefined) update.alt = data.alt;
    if (data.folder !== undefined) update.folder = data.folder;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.usedIn !== undefined) update.used_in = data.usedIn;

    const { data: row, error } = await supabase.from('media').update(update).eq('id', id).select('*').single();
    if (error) {
      if (error.code === 'PGRST116') throw new Error('Media not found');
      throw new Error(error.message);
    }
    return rowToMedia(row);
  },

  async deleteMedia(id: string): Promise<void> {
    const { data: row, error: fetchError } = await supabase
      .from('media')
      .select('bucket_id, storage_path')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase.from('media').delete().eq('id', id);
    if (error) throw new Error(error.message);

    if (row) await supabase.storage.from(row.bucket_id).remove([row.storage_path]);
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    const { data: rows, error: fetchError } = await supabase
      .from('media')
      .select('bucket_id, storage_path')
      .in('id', ids);
    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase.from('media').delete().in('id', ids);
    if (error) throw new Error(error.message);

    const byBucket = new Map<string, string[]>();
    for (const row of rows ?? []) {
      byBucket.set(row.bucket_id, [...(byBucket.get(row.bucket_id) ?? []), row.storage_path]);
    }
    await Promise.all(
      Array.from(byBucket.entries()).map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths))
    );
  },

  async existsByName(originalName: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('original_name', originalName);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  },

  async getFolders(): Promise<string[]> {
    const { data, error } = await supabase.from('media').select('folder');
    if (error) throw new Error(error.message);
    return Array.from(new Set((data ?? []).map(r => r.folder)));
  },
};
