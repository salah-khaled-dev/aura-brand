-- Snapshot of the 3 real category rows (winter/summer/shop) as they exist in
-- src/lib/services/category.service.ts's MOCK_CATEGORIES at the time of this
-- backup. These are the ONLY category rows the mock system ships with — no
-- others have been seeded in source control (any additional categories exist
-- only in a live browser's localStorage, which this static seed cannot capture).
--
-- Written against the Phase A schema (public.categories + the new columns
-- added by supabase/migrations/*_products_categories_phase_a_columns.sql).
-- Do not run this until that migration has been applied.
--
-- These 3 slugs ('winter' | 'summer' | 'shop') are a storefront contract
-- (see src/components/layout/Navbar.tsx, src/app/shop/page.tsx) — do not
-- rename them.

insert into public.categories (
  id, name, slug, description, image_url, banner_url,
  is_featured, show_on_homepage, show_in_menu, sort_order, status, is_active,
  seo_title, seo_description
) values
(
  gen_random_uuid(), 'أزياء الشتاء', 'winter',
  'تشكيلة الشتاء الفاخرة — دفء وأناقة في تصاميم شتوية راقية.',
  '/images/campaign/campaign_3.png', '/images/campaign/campaign_3.png',
  true, true, true, 1, 'active', true,
  'أزياء الشتاء | AURA', 'تسوقي أحدث تشكيلة الشتاء من دار أورا.'
),
(
  gen_random_uuid(), 'أزياء الصيف', 'summer',
  'أزياء الصيف المنعشة — تصاميم صيفية حصرية بأقمشة خفيفة.',
  '/images/campaign/campaign_2.png', '/images/campaign/campaign_2.png',
  true, true, true, 2, 'active', true,
  'أزياء الصيف | AURA', 'تسوقي أحدث تشكيلة الصيف من دار أورا.'
),
(
  gen_random_uuid(), 'المتجر', 'shop',
  'كل قطع دار أورا في مكان واحد.',
  '/images/campaign/campaign_1.png', '/images/campaign/campaign_1.png',
  false, true, true, 3, 'active', true,
  'المتجر | AURA', 'تصفحي كل تشكيلات دار أورا.'
)
on conflict (slug) do nothing;
