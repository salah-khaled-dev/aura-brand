-- ============================================================================
-- store_settings — single-row table holding storefront-wide configuration
-- ============================================================================

create table public.store_settings (
  id integer primary key default 1,

  store_name_ar text not null default '',
  store_name_en text not null default '',
  logo_url text,
  favicon_url text,

  contact_email text,
  contact_phone text,
  whatsapp_number text,
  address jsonb not null default '{}'::jsonb,
  social_links jsonb not null default '{}'::jsonb,

  seo_title text,
  seo_description text,
  seo_keywords text[] not null default '{}',

  currency text not null default 'EGP',
  tax_rate numeric(5, 2) not null default 0,
  shipping_fee numeric(10, 2) not null default 0,
  free_shipping_threshold numeric(10, 2),

  maintenance_mode boolean not null default false,
  maintenance_message text,

  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,

  constraint store_settings_singleton check (id = 1),
  constraint store_settings_tax_rate_valid check (tax_rate >= 0 and tax_rate <= 100),
  constraint store_settings_fees_non_negative check (
    shipping_fee >= 0 and (free_shipping_threshold is null or free_shipping_threshold >= 0)
  )
);

create trigger set_store_settings_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

-- Guests + authenticated: public read (storefront needs logo, socials, SEO, etc).
create policy "store_settings_select_public"
  on public.store_settings for select
  to anon, authenticated
  using (true);

-- Admins: can update operational fields (shipping, taxes, contact info, SEO, etc).
create policy "store_settings_update_admin"
  on public.store_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Super admin: can (re)create the singleton row if it was ever removed.
create policy "store_settings_insert_super_admin"
  on public.store_settings for insert
  to authenticated
  with check (public.is_super_admin());

-- Baseline row so the storefront always has settings to read. Not demo/product
-- data — it's required operational configuration. Admins fill in real values later.
insert into public.store_settings (id) values (1)
on conflict (id) do nothing;
