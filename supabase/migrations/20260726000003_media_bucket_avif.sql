-- ============================================================================
-- Allow AVIF uploads to the media bucket.
--
-- The client-side pipeline (src/lib/utils/image-file.ts) accepts
-- jpg/jpeg/png/webp/avif; the bucket's allowed_mime_types must mirror that
-- list exactly or Storage rejects AVIF uploads with a policy violation even
-- though client-side validation already passed. GIF is dropped from the
-- accepted set (product/media images only — animation isn't needed here).
-- ============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'media';
