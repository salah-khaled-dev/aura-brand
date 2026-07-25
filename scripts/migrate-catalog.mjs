// One-time data migration: mock categories/products -> Supabase.
// Run with: npm run migrate:catalog [path/to/exported-products.json]
//
// Safe to re-run: categories are upserted by slug, products are skipped
// (not duplicated) if a product with the same slug or SKU already exists.
//
// Categories: the 3 real seed rows baked into
// src/lib/services/category.service.ts (mirrored in
// backup/mock-system-backup/seeds/categories.json) are migrated unconditionally.
//
// Products: src/data/products.ts's `storefrontSeed` — the only source the
// mock catalog is built from — is an EMPTY array in this repo (see
// backup/mock-system-backup/sql-seeds/products_seed.sql for why). There is
// therefore nothing to migrate from source control. If real product data
// exists only in a browser's localStorage (key "aura_mock_db:products"),
// export it there first (Application tab > Local Storage) and pass the path
// to that JSON file as the first argument to this script.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'Run this with: node --env-file=.env.local scripts/migrate-catalog.mjs'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const CATEGORIES = [
  {
    name: 'أزياء الشتاء', slug: 'winter',
    description: 'تشكيلة الشتاء الفاخرة — دفء وأناقة في تصاميم شتوية راقية.',
    thumbnail: '/images/campaign/campaign_3.png', banner: '/images/campaign/campaign_3.png',
    isFeatured: true, showOnHomepage: true, showInMenu: true, sortOrder: 1, status: 'active',
    seo: { title: 'أزياء الشتاء | AURA', description: 'تسوقي أحدث تشكيلة الشتاء من دار أورا.' },
  },
  {
    name: 'أزياء الصيف', slug: 'summer',
    description: 'أزياء الصيف المنعشة — تصاميم صيفية حصرية بأقمشة خفيفة.',
    thumbnail: '/images/campaign/campaign_2.png', banner: '/images/campaign/campaign_2.png',
    isFeatured: true, showOnHomepage: true, showInMenu: true, sortOrder: 2, status: 'active',
    seo: { title: 'أزياء الصيف | AURA', description: 'تسوقي أحدث تشكيلة الصيف من دار أورا.' },
  },
  {
    name: 'المتجر', slug: 'shop',
    description: 'كل قطع دار أورا في مكان واحد.',
    thumbnail: '/images/campaign/campaign_1.png', banner: '/images/campaign/campaign_1.png',
    isFeatured: false, showOnHomepage: true, showInMenu: true, sortOrder: 3, status: 'active',
    seo: { title: 'المتجر | AURA', description: 'تصفحي كل تشكيلات دار أورا.' },
  },
];

const summary = { categoriesInserted: 0, categoriesSkipped: 0, productsInserted: 0, productsSkipped: [], imagesSkipped: [] };

async function upsertCategories() {
  const slugToId = new Map();
  for (const cat of CATEGORIES) {
    const { data: existing, error: findError } = await supabase
      .from('categories').select('id').eq('slug', cat.slug).maybeSingle();
    if (findError) throw findError;

    if (existing) {
      slugToId.set(cat.slug, existing.id);
      summary.categoriesSkipped++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from('categories')
      .insert({
        name_ar: cat.name, name_en: cat.name, slug: cat.slug,
        description_ar: cat.description, description_en: cat.description,
        image_url: cat.thumbnail, banner_url: cat.banner,
        is_featured: cat.isFeatured, show_on_homepage: cat.showOnHomepage, show_in_menu: cat.showInMenu,
        sort_order: cat.sortOrder, status: cat.status,
        seo_title: cat.seo.title, seo_description: cat.seo.description,
      })
      .select('id')
      .single();
    if (error) throw error;

    slugToId.set(cat.slug, inserted.id);
    summary.categoriesInserted++;
  }
  return slugToId;
}

function loadProducts() {
  const explicitPath = process.argv[2];
  const candidatePath = explicitPath
    ? path.resolve(process.cwd(), explicitPath)
    : path.join(repoRoot, 'backup', 'mock-system-backup', 'seeds', 'products.json');

  if (!existsSync(candidatePath)) {
    console.log(`No product source file found at ${candidatePath} — skipping product migration.`);
    return [];
  }
  const products = JSON.parse(readFileSync(candidatePath, 'utf-8'));
  if (!Array.isArray(products) || products.length === 0) {
    console.log(`${candidatePath} has no products — nothing to migrate (this is expected: the repo ships an empty product seed).`);
    return [];
  }
  return products;
}

function seasonToCollection(season) {
  return season === 'winter' || season === 'summer' ? season : 'all_season';
}

function computePriceFields(price, comparePrice) {
  if (comparePrice > 0 && comparePrice > price) return { price: comparePrice, sale_price: price };
  return { price, sale_price: null };
}

function keywordsToArray(keywords) {
  return (keywords ?? '').split(',').map(k => k.trim()).filter(Boolean);
}

async function migrateProduct(product, categoryNameToId) {
  const categoryId = categoryNameToId.get(product.category);
  if (!categoryId) {
    summary.productsSkipped.push({ name: product.name, reason: `category not found: "${product.category}"` });
    return;
  }

  const { data: dup, error: dupError } = await supabase
    .from('products').select('id').or(`slug.eq.${product.slug},sku.eq.${product.sku}`).maybeSingle();
  if (dupError) throw dupError;
  if (dup) {
    summary.productsSkipped.push({ name: product.name, reason: 'duplicate slug/sku (already migrated)' });
    return;
  }

  const usableImages = (product.images ?? []).filter(url => {
    if (typeof url === 'string' && url.startsWith('data:')) {
      summary.imagesSkipped.push({ product: product.name, reason: 'base64 data: URL, needs manual re-upload' });
      return false;
    }
    return true;
  });
  if (usableImages.length === 0) {
    summary.productsSkipped.push({ name: product.name, reason: 'no usable images after filtering data: URLs' });
    return;
  }

  const { price, sale_price } = computePriceFields(product.price, product.comparePrice ?? 0);

  const { data: row, error } = await supabase
    .from('products')
    .insert({
      name_ar: product.name, name_en: product.name, slug: product.slug, sku: product.sku,
      description_ar: product.description, description_en: product.description,
      short_description_ar: product.shortDescription, short_description_en: product.shortDescription,
      category_id: categoryId,
      price, sale_price, stock: product.stock ?? 0,
      is_featured: !!product.featured,
      collection: seasonToCollection(product.season),
      collection_name: product.collection || null,
      seo_title: product.seo?.metaTitle || null,
      seo_description: product.seo?.metaDescription || null,
      seo_keywords: keywordsToArray(product.seo?.keywords),
      canonical_url: product.seo?.canonicalUrl || null,
      og_title: product.seo?.ogTitle || null,
      og_description: product.seo?.ogDescription || null,
      barcode: product.barcode || null,
      low_stock_limit: product.lowStockLimit ?? 5,
      material: product.material || null,
      weight: product.weight || null,
      brand: product.brand || 'AURA',
      tags: product.tags ?? [],
      is_best_seller: !!product.bestSeller,
      is_new_arrival: !!product.newArrival,
      status: product.status || 'draft',
      publish_at: product.publishAt || null,
      hide_at: product.hideAt || null,
      archive_at: product.archiveAt || null,
      hover_image_url: product.hoverImage || null,
      badge: product.badge || null,
      details: product.details ?? [],
      fabric: product.fabric || null,
      packaging: product.packaging || null,
      costing: product.costing ?? {},
      cost_price: product.costPrice || null,
      stats: product.stats ?? {},
      revisions: [],
    })
    .select('id')
    .single();
  if (error) {
    summary.productsSkipped.push({ name: product.name, reason: error.message });
    return;
  }

  const imageRows = usableImages.map((url, index) => ({
    product_id: row.id, url, sort_order: index, is_primary: index === 0,
  }));
  const { error: imgError } = await supabase.from('product_images').insert(imageRows);
  if (imgError) throw imgError;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const variantRows = product.variants.map(v => ({
      product_id: row.id,
      size: v.size || '-',
      color_name: v.color || '-',
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      is_active: v.status !== 'inactive',
    }));
    const { error: varError } = await supabase.from('product_variants').insert(variantRows);
    if (varError) throw varError;
  }

  summary.productsInserted++;
}

async function main() {
  console.log('Migrating categories...');
  const slugToId = await upsertCategories();
  const categoryNameToId = new Map(CATEGORIES.map(c => [c.name, slugToId.get(c.slug)]));

  console.log('Loading products...');
  const products = loadProducts();
  console.log(`Migrating ${products.length} product(s)...`);
  for (const product of products) {
    await migrateProduct(product, categoryNameToId);
  }

  console.log('Media: mockMedia starts empty in this repo (only populated via runtime localStorage) — nothing to migrate.');

  console.log('\n=== Migration summary ===');
  console.log(`Categories inserted: ${summary.categoriesInserted}, already present (skipped): ${summary.categoriesSkipped}`);
  console.log(`Products inserted: ${summary.productsInserted}`);
  if (summary.productsSkipped.length > 0) {
    console.log(`Products skipped (${summary.productsSkipped.length}):`);
    for (const s of summary.productsSkipped) console.log(`  - ${s.name}: ${s.reason}`);
  }
  if (summary.imagesSkipped.length > 0) {
    console.log(`Images skipped (${summary.imagesSkipped.length}), need manual re-upload:`);
    for (const s of summary.imagesSkipped) console.log(`  - ${s.product}: ${s.reason}`);
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
