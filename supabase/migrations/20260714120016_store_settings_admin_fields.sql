-- ============================================================================
-- store_settings — additive columns for the Admin Settings module
-- (store description, working hours, payment method toggles, shipping/delivery
-- estimate, and extended SEO fields). Purely additive: existing columns,
-- indexes, and RLS policies from 20260714120015 are untouched.
-- ============================================================================

alter table public.store_settings
  add column store_description text not null default '',
  add column working_hours jsonb not null default '[
    {"day": "saturday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "sunday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "monday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "tuesday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "wednesday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "thursday", "isOpen": true, "openTime": "10:00", "closeTime": "22:00"},
    {"day": "friday", "isOpen": false, "openTime": "10:00", "closeTime": "22:00"}
  ]'::jsonb,
  add column og_image_url text,
  add column google_analytics_id text,
  add column google_search_console_code text,
  add column robots_txt text not null default 'User-agent: *
Allow: /',
  add column sitemap_enabled boolean not null default true,
  add column enable_cod boolean not null default true,
  add column enable_vodafone_cash boolean not null default false,
  add column enable_instapay boolean not null default false,
  add column estimated_delivery_days text not null default '3-5';

alter table public.store_settings
  add constraint store_settings_working_hours_shape check (jsonb_array_length(working_hours) = 7),
  add constraint store_settings_ga_id_format check (
    google_analytics_id is null or google_analytics_id = '' or google_analytics_id ~ '^(G|UA|GTM)-[A-Za-z0-9-]+$'
  );
