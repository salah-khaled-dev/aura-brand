-- ============================================================================
-- media — admin media library (back-office asset manager, not storefront-facing)
-- ============================================================================

create table public.media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  original_name text not null,
  alt text not null default '',
  mime_type text not null,
  width integer,
  height integer,
  size_bytes bigint not null,
  folder text not null default 'uncategorized',
  bucket_id text not null default 'media',
  storage_path text not null,
  url text not null,
  thumbnail_url text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  used_in text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_storage_path_unique unique (bucket_id, storage_path),
  constraint media_size_bytes_positive check (size_bytes >= 0)
);

create index media_folder_idx on public.media (folder);
create index media_mime_type_idx on public.media (mime_type);
create index media_created_at_idx on public.media (created_at desc);

create trigger set_media_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

alter table public.media enable row level security;

-- Admin-only in both directions — this is a back-office tool, unlike
-- products/categories which are storefront-visible. No anon/public select.
create policy "media_select_admin"
  on public.media for select
  to authenticated
  using (public.is_admin());

create policy "media_insert_admin"
  on public.media for insert
  to authenticated
  with check (public.is_admin());

create policy "media_update_admin"
  on public.media for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "media_delete_admin"
  on public.media for delete
  to authenticated
  using (public.is_admin());
