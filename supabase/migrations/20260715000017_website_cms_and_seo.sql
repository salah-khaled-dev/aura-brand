-- ============================================================================
-- Website CMS + SEO — the last remaining mock/localStorage surface.
--
-- Critical fix bundled in here: SEO was entirely client-side
-- (SEOInjector.tsx reads storefront/seo.service.ts's localStorage AFTER
-- hydration) — admin edits never reached search engines or any visitor
-- other than the editing admin's own browser. seo_settings below is read
-- server-side inside generateMetadata() (see seo-helper.ts changes applied
-- alongside this migration), which is the only way SEO metadata actually
-- reaches crawlers.
--
-- All tables here are public-readable (storefront needs this content to
-- render) but admin-write-only.
-- ============================================================================

-- ─── seo_settings — per-page SEO, read server-side ─────────────────────────
create table public.seo_settings (
  page text primary key,
  title text not null default '',
  description text not null default '',
  keywords text not null default '',
  og_image text not null default '',
  twitter_card text not null default 'summary_large_image',
  canonical text,
  robots text not null default 'index, follow',
  json_ld boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger set_seo_settings_updated_at
  before update on public.seo_settings
  for each row execute function public.set_updated_at();

alter table public.seo_settings enable row level security;

create policy "seo_settings_select_public" on public.seo_settings for select to anon, authenticated using (true);
create policy "seo_settings_all_admin" on public.seo_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.seo_settings;
create trigger log_activity
  after insert or update or delete on public.seo_settings
  for each row execute function public.log_entity_activity('إعدادات SEO', 'system', 'true');

insert into public.seo_settings (page, title, description, keywords, og_image, twitter_card, robots, json_ld) values
  ('global', 'AURA | دار الأزياء المصرية الراقية', 'أورا - دار أزياء نسائية مصرية فاخرة تقدم مفهومًا متطورًا للأناقة والأنوثة العصرية بأيدي حرفية متقنة وتفاصيل فريدة.', 'AURA, أورا, أزياء نسائية, كوتور, ملابس فاخرة, أزياء مصرية', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('homepage', 'AURA | الصفحة الرئيسية — تشكيلات الكوتور', 'اكتشفي أحدث تشكيلات دار أورا من الفساتين الراقية والأزياء الكوتور المصنوعة يدوياً.', 'أورا, تشكيلة, كوتور, فساتين فاخرة', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('shop', 'متجر أورا | أزياء نسائية فاخرة', 'تسوقي أحدث تصاميم دار أورا من فساتين ومجموعات راقية مصنوعة من أجود الأقمشة الطبيعية.', 'متجر أورا, فساتين, أزياء نسائية فاخرة, كوتور', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('about', 'الأتيليه | قصة دار أورا الفنية', 'تعرفي على قصة دار أورا وحرفية صنع الأزياء الراقية المستوحاة من الجمال المصري العريق.', 'أتيليه أورا, قصة, حرفية, دار أزياء مصرية', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('winter', 'أزياء الشتاء | دار أورا', 'تشكيلة شتوية حصرية من دار أورا — خامات كشمير وصوف فاخر لأناقة دافئة.', 'أزياء شتاء, كشمير, دار أورا', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('summer', 'أزياء الصيف | دار أورا', 'تشكيلة صيفية من دار أورا — كتان طبيعي بلجيكي وحرير إيطالي لأناقة منعشة.', 'أزياء صيف, كتان, حرير, دار أورا', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('contact', 'تواصل معنا | دار أورا', 'تواصلي مع فريق دار أورا لأي استفسار عن المنتجات أو المقاسات أو الطلبات الخاصة.', 'تواصل, أورا, دعم, استفسار', '/aura_thumbnail.png', 'summary', 'index, follow', false),
  ('tracking', 'تتبع طلبكِ | أورا', 'تتبعي حالة شحنتك من دار أورا بإدخال رقم الطلب.', 'تتبع, طلب, شحن, أورا', '/aura_thumbnail.png', 'summary', 'noindex, nofollow', false),
  ('reviews', 'آراء العملاء | دار أورا', 'اقرئي آراء وتجارب عميلات دار أورا مع تصاميم الكوتور الراقية.', 'آراء, تقييمات, عملاء, أورا', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true),
  ('journal', 'مجلة أورا | الموضة والأناقة', 'اكتشفي مقالات أورا عن الموضة المعاصرة والأناقة الهادئة والحرفية الراقية.', 'مجلة, موضة, أناقة, أورا', '/aura_thumbnail.png', 'summary_large_image', 'index, follow', true)
on conflict (page) do nothing;


-- ─── website_store_info — contact/social/announcement bar (singleton) ─────
-- Distinct from public.store_settings (the real Settings page — currency,
-- tax, payment toggles, maintenance mode). This is the Website→Settings
-- panel's data (contact info shown in the footer/Navbar, social links,
-- announcement bar). Kept as its own table rather than merged into
-- store_settings to avoid touching that already-correct, already-migrated
-- table's schema — consolidating the two overlapping "settings" surfaces
-- into one is a product decision worth making later, not a mechanical part
-- of this migration.
create table public.website_store_info (
  id smallint primary key default 1,
  store_name text not null default 'AURA | أورا',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  support_email text not null default '',
  address text not null default '',
  google_maps_url text not null default '',
  working_hours text not null default '',
  commercial_registration text not null default '',
  tax_number text not null default '',
  social_media jsonb not null default '{}'::jsonb,
  announcement_bar jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),

  constraint website_store_info_singleton check (id = 1)
);

create trigger set_website_store_info_updated_at
  before update on public.website_store_info
  for each row execute function public.set_updated_at();

alter table public.website_store_info enable row level security;

create policy "website_store_info_select_public" on public.website_store_info for select to anon, authenticated using (true);
create policy "website_store_info_all_admin" on public.website_store_info for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.website_store_info;
create trigger log_activity
  after insert or update or delete on public.website_store_info
  for each row execute function public.log_entity_activity('إعدادات المتجر (الموقع)', 'system', 'true');

insert into public.website_store_info (id, store_name, phone, whatsapp, email, support_email, address, google_maps_url, working_hours, social_media, announcement_bar)
values (
  1, 'AURA | أورا', '+20 100 000 0000', '+20 100 000 0000', 'care@aura-brand-virid.vercel.app', 'care@aura-brand-virid.vercel.app',
  'المهندسين، الجيزة، مصر', 'https://maps.google.com/?q=Mohandeseen+Giza+Egypt', 'يوميًا من 11 صباحًا حتى 8 مساءً',
  '{"instagram":"https://www.instagram.com/aurafashionegy/","facebook":"https://www.facebook.com/AuraFashionEgypt","whatsapp":"https://wa.me/201000000000","tiktok":"https://www.tiktok.com/@aurabrand.eg","pinterest":"https://www.pinterest.com/aurabrandeg"}'::jsonb,
  '{"enabled":false,"text":"شحن مجاني لجميع محافظات مصر على الطلبات فوق ٥٠٠ ج.م","link":"/shop","bgColor":"#1C1C1B","textColor":"#FAF8F5"}'::jsonb
) on conflict (id) do nothing;


-- ─── banners ────────────────────────────────────────────────────────────────
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'desktop',
  status text not null default 'disabled',
  priority integer not null default 0,
  schedule_start timestamptz,
  schedule_end timestamptz,
  target_url text not null default '',
  overlay_opacity numeric(3, 2) not null default 0,
  animation text not null default 'fade',
  button_text text,
  media_url text not null default '',
  media_type text not null default 'image',
  device_visibility text[] not null default '{"desktop","tablet","mobile"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint banners_status_valid check (status in ('active', 'scheduled', 'disabled')),
  constraint banners_media_type_valid check (media_type in ('image', 'video'))
);

create index banners_status_idx on public.banners (status);
create index banners_priority_idx on public.banners (priority desc);

create trigger set_banners_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

create policy "banners_select_public" on public.banners for select to anon, authenticated using (status = 'active');
create policy "banners_all_admin" on public.banners for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.banners;
create trigger log_activity
  after insert or update or delete on public.banners
  for each row execute function public.log_entity_activity('بانر', 'system');


-- ─── nav_menus — one row per menu location, items as jsonb ─────────────────
create table public.nav_menus (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),

  constraint nav_menus_location_unique unique (location),
  constraint nav_menus_location_valid check (location in ('header', 'footer', 'mega_menu'))
);

create trigger set_nav_menus_updated_at
  before update on public.nav_menus
  for each row execute function public.set_updated_at();

alter table public.nav_menus enable row level security;

create policy "nav_menus_select_public" on public.nav_menus for select to anon, authenticated using (true);
create policy "nav_menus_all_admin" on public.nav_menus for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.nav_menus;
create trigger log_activity
  after insert or update or delete on public.nav_menus
  for each row execute function public.log_entity_activity('قائمة تنقل', 'system');

insert into public.nav_menus (location, items) values (
  'header',
  '[
    {"id":"n-home","label":"الرئيسية","url":"/","order":0,"group":"primary","openInNewTab":false,"visibilityRules":["public"]},
    {"id":"n-winter","label":"أزياء الشتاء","url":"/shop?category=winter","order":1,"group":"primary","openInNewTab":false,"visibilityRules":["public"]},
    {"id":"n-summer","label":"أزياء الصيف","url":"/shop?category=summer","order":2,"group":"primary","openInNewTab":false,"visibilityRules":["public"]},
    {"id":"n-shop","label":"المتجر","url":"/shop","order":3,"group":"primary","openInNewTab":false,"visibilityRules":["public"]},
    {"id":"n-about","label":"الأتيليه","url":"/about","order":4,"group":"secondary","openInNewTab":false,"visibilityRules":["public"]},
    {"id":"n-track","label":"تتبع الطلب","url":"/tracking","order":5,"group":"secondary","openInNewTab":false,"visibilityRules":["public"]},
    {"id":"n-contact","label":"تواصل معنا","url":"/contact","order":6,"group":"secondary","openInNewTab":false,"visibilityRules":["public"]}
  ]'::jsonb
) on conflict (location) do nothing;


-- ─── footer_settings (singleton) ────────────────────────────────────────────
create table public.footer_settings (
  id smallint primary key default 1,
  show_newsletter boolean not null default true,
  newsletter_title text not null default '',
  newsletter_subtitle text not null default '',
  show_social_icons boolean not null default true,
  show_payment_icons boolean not null default false,
  developer_credit text not null default '',
  copyright_text text not null default '',
  columns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),

  constraint footer_settings_singleton check (id = 1)
);

create trigger set_footer_settings_updated_at
  before update on public.footer_settings
  for each row execute function public.set_updated_at();

alter table public.footer_settings enable row level security;

create policy "footer_settings_select_public" on public.footer_settings for select to anon, authenticated using (true);
create policy "footer_settings_all_admin" on public.footer_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.footer_settings;
create trigger log_activity
  after insert or update or delete on public.footer_settings
  for each row execute function public.log_entity_activity('تذييل الموقع', 'system');

insert into public.footer_settings (id, show_newsletter, newsletter_title, newsletter_subtitle, show_social_icons, show_payment_icons, developer_credit, copyright_text, columns)
values (
  1, true, 'صالون أورا البريدي', 'دعوات خاصة وتحديثات الأتيلييه', true, false, 'صلاح خالد', '© ٢٠٢٦ دار أورا للأزياء الراقية',
  '[
    {"id":"col-shop","title":"المتجر","order":0,"links":[{"id":"l-s1","label":"كل المنتجات","url":"/shop"},{"id":"l-s2","label":"أزياء الشتاء","url":"/shop?category=winter"},{"id":"l-s3","label":"أزياء الصيف","url":"/shop?category=summer"}]},
    {"id":"col-brand","title":"دار أورا","order":1,"links":[{"id":"l-b1","label":"قصتنا وحرفيتنا","url":"/about"},{"id":"l-b2","label":"تتبع طلبكِ","url":"/tracking"},{"id":"l-b3","label":"تواصلي معنا","url":"/contact"}]},
    {"id":"col-service","title":"خدمتكِ","order":2,"links":[{"id":"l-sv1","label":"الشحن والتوصيل","url":"/shipping"},{"id":"l-sv2","label":"الاستبدال والإرجاع","url":"/returns"},{"id":"l-sv3","label":"الشروط والأحكام","url":"/terms"},{"id":"l-sv4","label":"سياسة الخصوصية","url":"/privacy"}]}
  ]'::jsonb
) on conflict (id) do nothing;


-- ─── appearance_settings (singleton) ────────────────────────────────────────
create table public.appearance_settings (
  id smallint primary key default 1,
  logo_url text not null default '/logo.png',
  favicon_url text not null default '/favicon.ico',
  loading_screen_type text not null default 'logo',
  theme_preset text not null default 'luxury',
  border_radius text not null default 'md',
  container_width text not null default 'xl',
  button_style text not null default 'solid',
  card_radius text not null default 'lg',
  animation_speed text not null default 'normal',
  accent_color text not null default '#C5A880',
  text_primary_color text not null default '#1C1C1B',
  background_primary_color text not null default '#FAF8F5',
  effects jsonb not null default '{"hoverScale":true,"pageTransitions":true}'::jsonb,
  updated_at timestamptz not null default now(),

  constraint appearance_settings_singleton check (id = 1)
);

create trigger set_appearance_settings_updated_at
  before update on public.appearance_settings
  for each row execute function public.set_updated_at();

alter table public.appearance_settings enable row level security;

create policy "appearance_settings_select_public" on public.appearance_settings for select to anon, authenticated using (true);
create policy "appearance_settings_all_admin" on public.appearance_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.appearance_settings;
create trigger log_activity
  after insert or update or delete on public.appearance_settings
  for each row execute function public.log_entity_activity('مظهر الموقع', 'system');

insert into public.appearance_settings (id) values (1) on conflict (id) do nothing;


-- ─── content_blocks ─────────────────────────────────────────────────────────
create table public.content_blocks (
  id text primary key,
  "group" text not null default 'general',
  key text not null,
  value text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now(),

  constraint content_blocks_key_unique unique (key),
  constraint content_blocks_group_valid check ("group" in ('general', 'checkout', 'order_tracking', 'emails', 'pages'))
);

create index content_blocks_group_idx on public.content_blocks ("group");

create trigger set_content_blocks_updated_at
  before update on public.content_blocks
  for each row execute function public.set_updated_at();

alter table public.content_blocks enable row level security;

create policy "content_blocks_select_public" on public.content_blocks for select to anon, authenticated using (true);
create policy "content_blocks_all_admin" on public.content_blocks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.content_blocks;
create trigger log_activity
  after insert or update or delete on public.content_blocks
  for each row execute function public.log_entity_activity('محتوى الصفحة', 'system');

insert into public.content_blocks (id, "group", key, value, description) values
  ('cnt-3', 'order_tracking', 'status_received', 'تم استلام طلبك بنجاح — يجهزه فريق أورا بعناية.', 'رسالة: تم الاستلام'),
  ('cnt-4', 'order_tracking', 'status_processing', 'طلبك قيد التحضير في أتيلييه أورا — الخياطة والتغليف الفاخر.', 'رسالة: قيد التحضير'),
  ('cnt-5', 'order_tracking', 'status_shipped', 'تم شحن طلبك وهو في طريقه إليكِ — يصلكِ خلال 2-5 أيام عمل.', 'رسالة: تم الشحن'),
  ('cnt-6', 'order_tracking', 'status_delivered', 'وصل طلبك بنجاح! نتمنى أن تستمتعي بكل قطعة من دار أورا.', 'رسالة: تم التسليم'),
  ('cnt-7', 'general', 'announcement_bar', 'الشحن مجاني لجميع محافظات مصر | التغليف الفاخر مجاني', 'نص شريط الإعلان العلوي'),
  ('cnt-about-hero-title', 'pages', 'about_hero_title', 'قصتنا', 'صفحة من نحن — عنوان البطل'),
  ('cnt-about-hero-subtitle', 'pages', 'about_hero_subtitle', 'مجموعات حصرية تُصاغ يدوياً للمرأة التي تثق بحضورها وتتحرك بأناقتها الهادئة.', 'صفحة من نحن — وصف البطل'),
  ('cnt-about-phil-title', 'pages', 'about_phil_title', 'الملابس هالة صامتة تروي حضوركِ الفخم', 'صفحة من نحن — عنوان فلسفة الدار'),
  ('cnt-about-phil-text', 'pages', 'about_phil_text', 'نحن نؤمن في أورا بأن الثوب ليس مجرد غطاء زينة خارجي، بل هو تجسيد ملموس لشخصيتكِ وقوتكِ الأنثوية المهيبة.', 'صفحة من نحن — نص فلسفة الدار'),
  ('cnt-about-craft-title', 'pages', 'about_craft_title', 'تفاصيل تُحاك بعناية في أتيلييه الجيزة', 'صفحة من نحن — عنوان الحرفية'),
  ('cnt-about-craft-text', 'pages', 'about_craft_text', 'من اختيار خيوط الكتان البلجيكي الطبيعي المعالج بنعومة الكشمير، إلى اختيار أورجانزا الحرير الفرنسي.', 'صفحة من نحن — نص الحرفية'),
  ('cnt-about-vision-quote', 'pages', 'about_vision_quote', 'رؤيتنا أن نقدم للمرأة قطعًا تعكس شخصيتها وتمنحها حضورًا استثنائيًا', 'صفحة من نحن — اقتباس الرؤية'),
  ('cnt-about-vision-attr', 'pages', 'about_vision_attr', 'منسقو ومصممو أتيلييه أورا الجيزة', 'صفحة من نحن — نسب الاقتباس'),
  ('cnt-about-cta-title', 'pages', 'about_cta_title', 'تصفحي المتجر', 'صفحة من نحن — عنوان قسم الدعوة'),
  ('cnt-about-cta-text', 'pages', 'about_cta_text', 'استكشفي أزياء أورا الفاخرة المنسوجة يدوياً بمقاييس الكوتور الحصرية.', 'صفحة من نحن — نص قسم الدعوة'),
  ('cnt-about-cta-button', 'pages', 'about_cta_button', 'زيارة المتجر الكوتور', 'صفحة من نحن — نص زر الدعوة'),
  ('cnt-tracking-hero-title', 'pages', 'tracking_hero_title', 'تتبع طلبكِ', 'صفحة تتبع الطلب — عنوان البطل'),
  ('cnt-tracking-hero-label', 'pages', 'tracking_hero_label', 'مسار مقتنياتكِ', 'صفحة تتبع الطلب — تصنيف البطل'),
  ('cnt-tracking-hero-subtitle', 'pages', 'tracking_hero_subtitle', 'تابعي رحلة تصميم وتجهيز قطع أورا الفاخرة خطوة بخطوة.', 'صفحة تتبع الطلب — وصف البطل'),
  ('cnt-tracking-support-title', 'pages', 'tracking_support_title', 'هل تحتاجين إلى مساعدة؟', 'صفحة تتبع الطلب — عنوان قسم الدعم'),
  ('cnt-tracking-support-text', 'pages', 'tracking_support_text', 'منسقو أتيلييه أورا جاهزون للتواصل معكِ وتحديثكِ بتفاصيل المقاسات الدقيقة.', 'صفحة تتبع الطلب — نص قسم الدعم'),
  ('cnt-tracking-support-btn', 'pages', 'tracking_support_btn', 'تواصلي معنا', 'صفحة تتبع الطلب — نص زر الدعم'),
  ('cnt-reviews-hero-label', 'pages', 'reviews_hero_label', 'صوت عميلاتنا', 'صفحة التقييمات — تصنيف البطل'),
  ('cnt-reviews-hero-title', 'pages', 'reviews_hero_title', 'آراء عملائنا', 'صفحة التقييمات — عنوان البطل'),
  ('cnt-reviews-hero-subtitle', 'pages', 'reviews_hero_subtitle', 'تجارب حقيقية من عميلات دار أورا — كلمات صادقة تعكس شغفنا بالحرفية والتميز.', 'صفحة التقييمات — وصف البطل'),
  ('cnt-wishlist-empty-title', 'pages', 'wishlist_empty_title', 'مفضلتكِ فارغة', 'صفحة المفضلة — عنوان الحالة الفارغة'),
  ('cnt-wishlist-empty-text', 'pages', 'wishlist_empty_text', 'ابدئي بحفظ القطع المفضلة لديكِ بالضغط على رمز القلب أثناء التصفح', 'صفحة المفضلة — نص الحالة الفارغة'),
  ('cnt-wishlist-empty-btn', 'pages', 'wishlist_empty_btn', 'زيارة المتجر الكوتور', 'صفحة المفضلة — نص زر الحالة الفارغة'),
  ('cnt-cart-empty-title', 'pages', 'cart_empty_title', 'حقيبتكِ فارغة حالياً', 'صفحة السلة — عنوان الحالة الفارغة'),
  ('cnt-cart-empty-text', 'pages', 'cart_empty_text', 'تصفحي الكولكشن واختاري قطعكِ المفضلة.', 'صفحة السلة — نص الحالة الفارغة'),
  ('cnt-cart-empty-btn', 'pages', 'cart_empty_btn', 'زيارة المتجر الكوتور', 'صفحة السلة — نص زر الحالة الفارغة')
on conflict (key) do nothing;


-- ─── homepage_sections ──────────────────────────────────────────────────────
create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null default '',
  subtitle text,
  enabled boolean not null default true,
  display_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index homepage_sections_order_idx on public.homepage_sections (display_order);

create trigger set_homepage_sections_updated_at
  before update on public.homepage_sections
  for each row execute function public.set_updated_at();

alter table public.homepage_sections enable row level security;

create policy "homepage_sections_select_public" on public.homepage_sections for select to anon, authenticated using (enabled = true);
create policy "homepage_sections_all_admin" on public.homepage_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists log_activity on public.homepage_sections;
create trigger log_activity
  after insert or update or delete on public.homepage_sections
  for each row execute function public.log_entity_activity('قسم الصفحة الرئيسية', 'system');

-- Same defaults the mock version shipped with — without these the storefront
-- homepage renders nothing until an admin manually adds sections.
insert into public.homepage_sections (type, title, subtitle, enabled, display_order, settings) values
  (
    'hero', 'Hero — أورا كوتور', 'تصاميم كوتور تُصاغ يدوياً للمرأة المعاصرة', true, 0,
    '{
      "slides": [
        {"id":1,"image":"/images/campaign/campaign_4.png","label":"AURA HAUTE COUTURE","title":"أناقة الأثر والمعنى","engTitle":"THE SIGNATURE COUTURE","subtitle":"تصاميم كوتور راقية تُصاغ يدوياً للمرأة المعاصرة التي تقدر تميز التفاصيل وعراقة الصنع الفاخر."},
        {"id":2,"image":"/images/campaign/campaign_5.png","label":"EDITORIAL CAMPAIGN","title":"تفاصيل تروي حضوركِ","engTitle":"LUNA & SILK ESSENCE","subtitle":"أزياء نسائية صممت بهيبة الحضور وقوة الشخصية منسوجة من الكتان الطبيعي البلجيكي والحرير الطبيعي."},
        {"id":3,"image":"/images/campaign/campaign_6.png","label":"THE EDITORIAL SERIES","title":"الفخامة الهادئة والخلود","engTitle":"QUIET LUXURY 2026","subtitle":"خطوط كلاسيكية مبسطة وخامات كشمير إيطالية تنساب بنعومة بالغة لتتجاوز بريق صيحات الموضة المؤقتة."}
      ],
      "ctaText": "اكتشفي التشكيلة", "ctaLink": "/shop", "secondaryCtaText": "قصتنا الفنية", "secondaryCtaLink": "/about"
    }'::jsonb
  ),
  (
    'best_sellers', 'القطع الأكثر طلباً', 'المجموعة الحصرية', true, 1,
    '{"limit":4,"layout":"grid","columns":4,"source":"auto_best_sellers","sort":"default","hideOutOfStock":false,"showDiscountBadge":true,"showWishlistButton":true,"manualProductIds":[]}'::jsonb
  ),
  (
    'new_arrivals', 'وصل حديثاً', 'نظرة مسبقة', true, 2,
    '{"limit":4,"layout":"grid","columns":4,"source":"auto_new_arrivals","sort":"default","hideOutOfStock":false,"showDiscountBadge":true,"showWishlistButton":true,"manualProductIds":[]}'::jsonb
  ),
  (
    'newsletter', 'انضمي لصالون أورا البريدي', 'دعوات خاصة وتحديثات الأتيلييه', false, 3,
    '{"title":"انضمي لصالون أورا البريدي","subtitle":"دعوات خاصة وتحديثات الأتيلييه","placeholder":"بريدكِ الإلكتروني","buttonText":"انضمي الآن","successMessage":"شكراً لانضمامكِ! سنتواصل معكِ قريباً.","description":"دعوات حصرية، تحديثات الأتيلييه، وعروض العملاء المميزين — أولاً لأعضاء الصالون البريدي."}'::jsonb
  );


-- ─── collections: add display columns instead of a separate table ─────────
-- Folds storefront/collection-display.service.ts (visible/featured/order,
-- keyed by collection id in its own mockStorage blob) directly onto the
-- collections table this app already has (20260715000014) — same entity,
-- no reason for a second table just for its storefront presentation state.
alter table public.collections
  add column is_visible boolean not null default true,
  add column is_featured boolean not null default false,
  add column display_order integer not null default 0;
