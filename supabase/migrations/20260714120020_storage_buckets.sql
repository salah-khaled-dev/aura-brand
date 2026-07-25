-- ============================================================================
-- storage buckets — products, media, avatars, banners
--
-- File size limit and allowed mime types mirror the client-side validation
-- already enforced in src/lib/utils/image-file.ts (5MB, image/* only) so
-- client and bucket policy agree. All four buckets are public-read (storefront
-- needs to render product/category/banner images without auth) and
-- admin-write-only.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('products', 'products', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('media',    'media',    true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars',  'avatars',  true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners',  'banners',  true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public read on all four buckets.
create policy "public_read_products"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'products');

create policy "public_read_media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "public_read_avatars"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

create policy "public_read_banners"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'banners');

-- Admin-only write (insert/update/delete) on all four buckets.
create policy "admin_insert_products"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products' and public.is_admin());
create policy "admin_update_products"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());
create policy "admin_delete_products"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products' and public.is_admin());

create policy "admin_insert_media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "admin_update_media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "admin_delete_media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

create policy "admin_insert_avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and public.is_admin());
create policy "admin_update_avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and public.is_admin())
  with check (bucket_id = 'avatars' and public.is_admin());
create policy "admin_delete_avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and public.is_admin());

create policy "admin_insert_banners"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'banners' and public.is_admin());
create policy "admin_update_banners"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'banners' and public.is_admin())
  with check (bucket_id = 'banners' and public.is_admin());
create policy "admin_delete_banners"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'banners' and public.is_admin());
