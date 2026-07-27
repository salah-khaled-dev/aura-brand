-- ============================================================================
-- Seed data for brands/collections.
--
-- Both admin CRUD pages (/admin/brands, /admin/collections) and their
-- underlying services (BrandService, CollectionService) were audited and
-- verified working correctly (create/edit/soft-delete all confirmed live) —
-- the Product Editor's "Brand"/"Collection" dropdowns were empty purely
-- because both tables had zero rows, not because of any code defect.
-- This seeds a small starting dataset so those dropdowns have real options.
-- ============================================================================

insert into public.brands (name, slug, description, status)
values
  ('AURA', 'aura', '', 'active'),
  ('Nike', 'nike', '', 'active'),
  ('Adidas', 'adidas', '', 'active'),
  ('Zara', 'zara', '', 'active'),
  ('H&M', 'hm', '', 'active')
on conflict (slug) do nothing;

insert into public.collections (name, slug, description, type, match_type, rules, product_ids, status)
values
  ('Summer 2027', 'summer-2027', '', 'manual', 'all', '[]'::jsonb, '{}'::uuid[], 'active'),
  ('Winter 2027', 'winter-2027', '', 'manual', 'all', '[]'::jsonb, '{}'::uuid[], 'active'),
  ('Essentials', 'essentials', '', 'manual', 'all', '[]'::jsonb, '{}'::uuid[], 'active'),
  ('Premium', 'premium', '', 'manual', 'all', '[]'::jsonb, '{}'::uuid[], 'active'),
  ('Limited Edition', 'limited-edition', '', 'manual', 'all', '[]'::jsonb, '{}'::uuid[], 'active')
on conflict (slug) do nothing;
