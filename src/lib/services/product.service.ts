import { Product, ProductStatus, ProductVariant, ProductColorVariant } from '@/data/mock/products';
import { IProductRepository } from '@/lib/contracts/IProductRepository';
import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface ProductFilters {
  search?: string;
  category?: string;
  collection?: string;
  season?: string;
  status?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

type ProductColorRow = Tables<'product_colors'> & {
  product_color_images: Tables<'product_color_images'>[] | null;
};

type ProductRow = Tables<'products'> & {
  product_images: Tables<'product_images'>[] | null;
  product_variants: Tables<'product_variants'>[] | null;
  product_colors: ProductColorRow[] | null;
  categories: { name_ar: string } | null;
};

/** Maps a color's client-side temp id (or its existing DB id) to its saved DB id. */
type ColorIdMap = Map<string, string>;

// `products` now has two FK paths to `product_colors` (product_colors.product_id →
// products.id, and the newer products.default_variant_id → product_colors.id), so
// PostgREST can no longer infer which relationship to embed — the FK constraint
// name must be given explicitly to pick the "colors belonging to this product" side.
const SELECT_WITH_RELATIONS =
  '*, product_images(*), product_variants(*), product_colors!product_colors_product_id_fkey(*, product_color_images(*)), categories(name_ar)';

/**
 * Same shape as SELECT_WITH_RELATIONS but with `cost_price`/`costing`/
 * `revisions` (internal COGS + historical cost snapshots) named out instead
 * of `*`. Required for the anon role: the 20260727120000 migration revokes
 * anon's whole-table SELECT and grants column-level SELECT that excludes
 * those three columns, so a literal `*` would make the whole query fail
 * with a permission error (Postgres expands `*` to every column, including
 * the ones anon can no longer read). This is the query the storefront must
 * use — see storefront-product.service.ts.
 */
const SELECT_PUBLIC_SAFE =
  'id, name_ar, name_en, slug, sku, description_ar, description_en, short_description_ar, short_description_en, category_id, price, sale_price, stock, is_featured, is_active, collection, collection_name, seo_title, seo_description, seo_keywords, barcode, low_stock_limit, material, weight, brand, tags, is_best_seller, is_new_arrival, status, publish_at, hide_at, archive_at, canonical_url, og_title, og_description, hover_image_url, badge, details, fabric, packaging, stats, default_variant_id, created_at, updated_at, product_images(*), product_variants(*), product_colors!product_colors_product_id_fkey(*, product_color_images(*)), categories(name_ar)';

const supabase = createClient();

// --- Row <-> Product mapping ------------------------------------------------

/**
 * DB `price`/`sale_price` are (regular, discounted). Mock `price`/`comparePrice`
 * are (current selling price, pre-discount strike-through price) — the inverse
 * pairing. `sale_price` is only set when there's an active discount.
 */
function computePriceFields(price: number, comparePrice: number): { price: number; sale_price: number | null } {
  if (comparePrice > 0 && comparePrice > price) {
    return { price: comparePrice, sale_price: price };
  }
  return { price, sale_price: null };
}

function reversePriceFields(row: { price: number; sale_price: number | null }): { price: number; comparePrice: number } {
  if (row.sale_price !== null) return { price: row.sale_price, comparePrice: row.price };
  return { price: row.price, comparePrice: 0 };
}

function keywordsToArray(keywords: string | undefined): string[] {
  return (keywords ?? '').split(',').map(k => k.trim()).filter(Boolean);
}

function arrayToKeywords(keywords: string[] | undefined): string {
  return (keywords ?? []).join(', ');
}

function seasonToCollection(season: string | undefined): 'winter' | 'summer' | 'all_season' {
  return season === 'winter' || season === 'summer' ? season : 'all_season';
}

function rowToVariant(row: Tables<'product_variants'>): ProductVariant {
  return {
    id: row.id,
    sku: row.sku,
    color: row.color_name,
    colorId: row.color_id ?? undefined,
    size: row.size,
    price: row.price ?? 0,
    stock: row.stock,
    status: row.is_active ? 'active' : 'inactive',
  };
}

/** `isDefault` is not on this row — it's resolved against `products.default_variant_id` by the caller (rowToProduct), the single source of truth. */
function rowToColorVariant(row: ProductColorRow): ProductColorVariant {
  const images = (row.product_color_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(img => img.url);
  return {
    id: row.id,
    color: row.name_ar,
    colorEn: row.name_en ?? undefined,
    value: row.hex,
    images,
    sortOrder: row.sort_order,
    stock: row.stock ?? undefined,
    skuSuffix: row.sku_suffix ?? undefined,
    priceOverride: row.price_override ?? undefined,
    isActive: row.is_active,
  };
}

function rowToProduct(row: ProductRow): Product {
  const images = (row.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(img => img.url);
  const { price, comparePrice } = reversePriceFields(row);

  const rawColorVariants = (row.product_colors ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(rowToColorVariant);
  // `products.default_variant_id` is the single source of truth for "default" —
  // falls back to the first color only for the near-impossible case a product
  // has colors but no pointer yet (the migration backfill guarantees one exists).
  const defaultVariantId = row.default_variant_id ?? rawColorVariants[0]?.id;
  const colorVariants = rawColorVariants.map(c => ({ ...c, isDefault: c.id === defaultVariantId }));

  // The default color's first image leads the flat gallery, so every cover/OG/
  // JSON-LD surface that already reads `images[0]`/`primaryImage()` picks it up
  // automatically — no changes needed at those call sites.
  const coverImage = colorVariants.find(c => c.isDefault)?.images[0];
  const orderedImages = coverImage
    ? [coverImage, ...images.filter(url => url !== coverImage)]
    : images;

  return {
    id: row.id,
    name: row.name_ar,
    slug: row.slug,
    shortDescription: row.short_description_ar ?? '',
    description: row.description_ar ?? '',
    category: row.categories?.name_ar ?? '',
    collection: row.collection_name ?? '',
    season: row.collection === 'all_season' ? '' : row.collection,
    brand: row.brand,
    tags: row.tags,
    price,
    comparePrice,
    costing: row.costing as unknown as Product['costing'],
    costPrice: row.cost_price ?? 0,
    sku: row.sku,
    barcode: row.barcode ?? '',
    stock: row.stock,
    lowStockLimit: row.low_stock_limit,
    material: row.material ?? '',
    weight: row.weight ?? 0,
    variants: (row.product_variants ?? []).map(rowToVariant),
    featured: row.is_featured,
    bestSeller: row.is_best_seller,
    newArrival: row.is_new_arrival,
    status: row.status as ProductStatus,
    publishAt: row.publish_at ?? undefined,
    hideAt: row.hide_at ?? undefined,
    archiveAt: row.archive_at ?? undefined,
    revisions: row.revisions as unknown as Product['revisions'],
    seo: {
      metaTitle: row.seo_title ?? '',
      metaDescription: row.seo_description ?? '',
      keywords: arrayToKeywords(row.seo_keywords),
      canonicalUrl: row.canonical_url ?? '',
      ogTitle: row.og_title ?? '',
      ogDescription: row.og_description ?? '',
    },
    stats: row.stats as unknown as Product['stats'],
    images: orderedImages,
    hoverImage: row.hover_image_url ?? undefined,
    badge: row.badge ?? undefined,
    details: row.details,
    fabric: row.fabric ?? undefined,
    packaging: row.packaging ?? undefined,
    colors: colorVariants.length > 0 ? colorVariants.map(c => c.color) : undefined,
    colorVariants: colorVariants.length > 0 ? colorVariants : undefined,
    defaultVariantId: row.default_variant_id ?? undefined,
  };
}

/** Arabic is the only authored language in the admin UI — name_en/description_en mirror the Arabic value since the schema requires them non-null. */
function productToRow(data: Omit<Product, 'id'>, categoryId: string): TablesInsert<'products'> {
  const { price, sale_price } = computePriceFields(data.price, data.comparePrice);
  return {
    name_ar: data.name,
    name_en: data.name,
    slug: data.slug,
    sku: data.sku,
    description_ar: data.description,
    description_en: data.description,
    short_description_ar: data.shortDescription,
    short_description_en: data.shortDescription,
    category_id: categoryId,
    price,
    sale_price,
    stock: data.stock,
    is_featured: data.featured,
    collection: seasonToCollection(data.season),
    collection_name: data.collection || null,
    seo_title: data.seo?.metaTitle || null,
    seo_description: data.seo?.metaDescription || null,
    seo_keywords: keywordsToArray(data.seo?.keywords),
    barcode: data.barcode || null,
    low_stock_limit: data.lowStockLimit,
    material: data.material || null,
    weight: data.weight || null,
    brand: data.brand || 'AURA',
    tags: data.tags ?? [],
    is_best_seller: data.bestSeller,
    is_new_arrival: data.newArrival,
    status: data.status,
    publish_at: data.publishAt || null,
    hide_at: data.hideAt || null,
    archive_at: data.archiveAt || null,
    canonical_url: data.seo?.canonicalUrl || null,
    og_title: data.seo?.ogTitle || null,
    og_description: data.seo?.ogDescription || null,
    hover_image_url: data.hoverImage || null,
    badge: data.badge || null,
    details: data.details ?? [],
    fabric: data.fabric || null,
    packaging: data.packaging || null,
    costing: data.costing as unknown as TablesInsert<'products'>['costing'],
    cost_price: data.costPrice || null,
    stats: data.stats as unknown as TablesInsert<'products'>['stats'],
    revisions: data.revisions as unknown as TablesInsert<'products'>['revisions'],
  };
}

function productToUpdateRow(data: Partial<Product>, categoryId: string | undefined): TablesUpdate<'products'> {
  const row: TablesUpdate<'products'> = {};
  if (data.name !== undefined) { row.name_ar = data.name; row.name_en = data.name; }
  if (data.slug !== undefined) row.slug = data.slug;
  if (data.sku !== undefined) row.sku = data.sku;
  if (data.description !== undefined) { row.description_ar = data.description; row.description_en = data.description; }
  if (data.shortDescription !== undefined) { row.short_description_ar = data.shortDescription; row.short_description_en = data.shortDescription; }
  if (categoryId !== undefined) row.category_id = categoryId;
  if (data.price !== undefined || data.comparePrice !== undefined) {
    // Both must be known to compute the (price, sale_price) pair correctly.
    const price = data.price;
    const comparePrice = data.comparePrice;
    if (price !== undefined && comparePrice !== undefined) {
      Object.assign(row, computePriceFields(price, comparePrice));
    }
  }
  if (data.stock !== undefined) row.stock = data.stock;
  if (data.featured !== undefined) row.is_featured = data.featured;
  if (data.season !== undefined) row.collection = seasonToCollection(data.season);
  if (data.collection !== undefined) row.collection_name = data.collection || null;
  if (data.seo !== undefined) {
    row.seo_title = data.seo.metaTitle || null;
    row.seo_description = data.seo.metaDescription || null;
    row.seo_keywords = keywordsToArray(data.seo.keywords);
    row.canonical_url = data.seo.canonicalUrl || null;
    row.og_title = data.seo.ogTitle || null;
    row.og_description = data.seo.ogDescription || null;
  }
  if (data.barcode !== undefined) row.barcode = data.barcode || null;
  if (data.lowStockLimit !== undefined) row.low_stock_limit = data.lowStockLimit;
  if (data.material !== undefined) row.material = data.material || null;
  if (data.weight !== undefined) row.weight = data.weight || null;
  if (data.brand !== undefined) row.brand = data.brand || 'AURA';
  if (data.tags !== undefined) row.tags = data.tags;
  if (data.bestSeller !== undefined) row.is_best_seller = data.bestSeller;
  if (data.newArrival !== undefined) row.is_new_arrival = data.newArrival;
  if (data.status !== undefined) row.status = data.status;
  if (data.publishAt !== undefined) row.publish_at = data.publishAt || null;
  if (data.hideAt !== undefined) row.hide_at = data.hideAt || null;
  if (data.archiveAt !== undefined) row.archive_at = data.archiveAt || null;
  if (data.hoverImage !== undefined) row.hover_image_url = data.hoverImage || null;
  if (data.badge !== undefined) row.badge = data.badge || null;
  if (data.details !== undefined) row.details = data.details;
  if (data.fabric !== undefined) row.fabric = data.fabric || null;
  if (data.packaging !== undefined) row.packaging = data.packaging || null;
  if (data.costing !== undefined) row.costing = data.costing as unknown as TablesUpdate<'products'>['costing'];
  if (data.costPrice !== undefined) row.cost_price = data.costPrice || null;
  if (data.stats !== undefined) row.stats = data.stats as unknown as TablesUpdate<'products'>['stats'];
  if (data.revisions !== undefined) row.revisions = data.revisions as unknown as TablesUpdate<'products'>['revisions'];
  return row;
}

const COSTING_FIELD_LABELS: Record<keyof Product['costing'], string> = {
  fabric: 'تكلفة القماش',
  accessories: 'تكلفة الإكسسوارات',
  manufacturing: 'تكلفة التصنيع',
  printing: 'تكلفة الطباعة',
  packaging: 'تكلفة التغليف',
  photography: 'تكلفة التصوير',
  shipping: 'تكلفة الشحن',
  marketing: 'تكلفة التسويق',
  taxes: 'الضرائب',
  marketplaceFees: 'عمولات المنصات',
  otherExpenses: 'مصاريف أخرى',
};

/** Nothing upstream (Zod schemas in product.schema.ts are unused dead code) rejects a negative cost component before it reaches the DB — a negative entry silently inflates profit/margin/markup. */
function validateCosting(costing: Product['costing'] | undefined): void {
  if (!costing) return;
  for (const key of Object.keys(COSTING_FIELD_LABELS) as (keyof Product['costing'])[]) {
    const value = costing[key];
    if (value !== undefined && value !== null && value < 0) {
      throw new Error(`${COSTING_FIELD_LABELS[key]} لا يمكن أن تكون سالبة`);
    }
  }
}

function mapProductError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    if (error.message.includes('sku')) return new Error('رمز التخزين (SKU) مستخدم مسبقاً');
    if (error.message.includes('slug')) return new Error('الرابط الدائم (Slug) مستخدم مسبقاً');
    return new Error('قيمة مكررة غير مسموح بها');
  }
  return new Error(error.message);
}

function normalizeCategoryValue(value: string): string {
  // NFC-normalize + trim so a differently-composed Arabic Unicode form or
  // stray whitespace (e.g. from manual data entry in the Supabase dashboard)
  // doesn't cause an exact-match query to silently return zero rows.
  return value.normalize('NFC').trim();
}

/**
 * `Product.category` holds the category's display name (see ProductForm's
 * <select>, bound to CategoryService's name list), not its slug/id.
 *
 * Matches client-side (rather than a server-side `.eq('name_ar', ...)`)
 * against a normalized name AND slug, so this is tolerant of Unicode
 * normalization / whitespace differences between how the category was
 * authored (ProductForm's hardcoded options, the migration script, or a
 * manually-entered row) and what's actually stored in `categories`.
 */
async function resolveCategoryId(categoryName: string): Promise<string> {
  const normalizedInput = normalizeCategoryValue(categoryName);

  const { data, error } = await supabase.from('categories').select('id, name_ar, slug');
  if (error) throw mapProductError(error);

  const match = (data ?? []).find(row => {
    const rowName = normalizeCategoryValue(row.name_ar ?? '');
    return (
      rowName === normalizedInput ||
      rowName.toLowerCase() === normalizedInput.toLowerCase() ||
      row.slug === normalizedInput
    );
  });

  if (!match) throw new Error('الفئة المحددة غير موجودة');
  return match.id;
}

/** Replaces all image rows for a product with the given ordered URL list (first = primary). */
async function replaceProductImages(productId: string, urls: string[]): Promise<void> {
  await supabase.from('product_images').delete().eq('product_id', productId);
  if (urls.length === 0) return;
  const rows: TablesInsert<'product_images'>[] = urls.map((url, index) => ({
    product_id: productId,
    url,
    sort_order: index,
    is_primary: index === 0,
  }));
  const { error } = await supabase.from('product_images').insert(rows);
  if (error) throw mapProductError(error);
}

function imageArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((url, i) => url === b[i]);
}

interface ReplaceColorsResult {
  idMap: ColorIdMap;
  /** Resolved DB id of whichever color should become `products.default_variant_id`. */
  defaultColorId: string;
  /** That same color's images, so the caller can mirror them into the flat legacy gallery. */
  defaultImages: string[];
}

/**
 * Upserts a product's color variants and their per-color image galleries.
 *
 * Unlike replaceProductImages/replaceProductVariants (delete-all-reinsert),
 * a color can be referenced by size variants and past orders, so a color
 * removed from the form is only deleted once nothing still points to it —
 * otherwise the whole save is rejected with a clear error naming the color,
 * steering the admin toward deactivating it instead of losing that history.
 * Kept colors are updated in place (never dropped and recreated), and a
 * color's images are only rewritten when they actually changed.
 *
 * Every product must always have at least one color — "default" is resolved
 * here and returned for the caller to write onto `products.default_variant_id`
 * (the single source of truth — nothing on `product_colors` itself tracks it).
 */
async function replaceProductColors(productId: string, colors: ProductColorVariant[]): Promise<ReplaceColorsResult> {
  if (colors.length === 0) {
    throw new Error('يجب أن يحتوي المنتج على لون واحد على الأقل');
  }
  const emptyColor = colors.find(c => c.images.length === 0);
  if (emptyColor) {
    throw new Error(`اللون "${emptyColor.color}" لا يحتوي على أي صورة — أضيفي صورة واحدة على الأقل لهذا اللون`);
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('product_colors')
    .select('id, name_ar')
    .eq('product_id', productId);
  if (fetchError) throw mapProductError(fetchError);

  const existingIds = new Set((existingRows ?? []).map(r => r.id));
  const keptIds = new Set(colors.filter(c => c.id && existingIds.has(c.id)).map(c => c.id!));
  const removedRows = (existingRows ?? []).filter(r => !keptIds.has(r.id));

  for (const removed of removedRows) {
    const [{ count: variantRefs }, { count: orderRefs }] = await Promise.all([
      supabase.from('product_variants').select('id', { count: 'exact', head: true }).eq('color_id', removed.id),
      supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('color_id', removed.id),
    ]);
    if ((variantRefs ?? 0) > 0 || (orderRefs ?? 0) > 0) {
      throw new Error(`لا يمكن حذف اللون "${removed.name_ar}" لأنه مستخدم في متغيرات أو طلبات سابقة — يمكنك تعطيله بدلاً من حذفه`);
    }
  }

  if (removedRows.length > 0) {
    const { error } = await supabase.from('product_colors').delete().in('id', removedRows.map(r => r.id));
    if (error) throw mapProductError(error);
  }

  // Existing images per kept color, so unchanged galleries aren't rewritten.
  const existingImagesByColor = new Map<string, string[]>();
  if (keptIds.size > 0) {
    const { data: existingImageRows, error: imagesFetchError } = await supabase
      .from('product_color_images')
      .select('color_id, url, sort_order')
      .in('color_id', Array.from(keptIds))
      .order('sort_order', { ascending: true });
    if (imagesFetchError) throw mapProductError(imagesFetchError);
    for (const imgRow of existingImageRows ?? []) {
      const arr = existingImagesByColor.get(imgRow.color_id) ?? [];
      arr.push(imgRow.url);
      existingImagesByColor.set(imgRow.color_id, arr);
    }
  }

  const idMap: ColorIdMap = new Map();
  const savedIds: string[] = [];

  for (const color of colors) {
    const payload: TablesInsert<'product_colors'> = {
      product_id: productId,
      name_ar: color.color,
      name_en: color.colorEn || null,
      hex: color.value,
      sort_order: color.sortOrder ?? savedIds.length,
      stock: color.stock ?? null,
      sku_suffix: color.skuSuffix || null,
      price_override: color.priceOverride ?? null,
      is_active: color.isActive !== false,
    };

    let colorId: string;
    const isKept = !!color.id && existingIds.has(color.id);
    if (isKept) {
      colorId = color.id!;
      const { error } = await supabase.from('product_colors').update(payload).eq('id', colorId);
      if (error) throw mapProductError(error);
    } else {
      const { data: inserted, error } = await supabase.from('product_colors').insert(payload).select('id').single();
      if (error) throw mapProductError(error);
      colorId = inserted.id;
    }
    if (color.id) idMap.set(color.id, colorId);
    savedIds.push(colorId);

    const unchanged = isKept && imageArraysEqual(existingImagesByColor.get(colorId) ?? [], color.images);
    if (!unchanged) {
      await supabase.from('product_color_images').delete().eq('color_id', colorId);
      const imageRows: TablesInsert<'product_color_images'>[] = color.images.map((url, index) => ({
        color_id: colorId,
        url,
        sort_order: index,
        is_primary: index === 0,
      }));
      const { error: imagesError } = await supabase.from('product_color_images').insert(imageRows);
      if (imagesError) throw mapProductError(imagesError);
    }
  }

  const defaultIndex = colors.findIndex(c => c.isDefault);
  const resolvedIndex = defaultIndex >= 0 ? defaultIndex : 0;

  return { idMap, defaultColorId: savedIds[resolvedIndex], defaultImages: colors[resolvedIndex].images };
}

/** Replaces all variant rows for a product with the given admin-authored variant list. */
async function replaceProductVariants(productId: string, variants: ProductVariant[], colorIdMap: ColorIdMap): Promise<void> {
  await supabase.from('product_variants').delete().eq('product_id', productId);
  if (variants.length === 0) return;
  const rows: TablesInsert<'product_variants'>[] = variants.map(v => ({
    product_id: productId,
    size: v.size || '-',
    color_name: v.color || '-',
    color_id: v.colorId ? (colorIdMap.get(v.colorId) ?? v.colorId) : null,
    sku: v.sku,
    price: v.price,
    stock: v.stock,
    is_active: v.status !== 'inactive',
  }));
  const { error } = await supabase.from('product_variants').insert(rows);
  if (error) throw mapProductError(error);
}

async function fetchProductRow(id: string): Promise<ProductRow | null> {
  const { data, error } = await supabase.from('products').select(SELECT_WITH_RELATIONS).eq('id', id).maybeSingle();
  if (error) throw mapProductError(error);
  return data as ProductRow | null;
}

class SupabaseProductRepositoryImpl implements IProductRepository {
  // --- COMPUTED PROPERTIES HELPERS (pure, no I/O — unchanged from the mock implementation) ---

  getProfitMargin(price: number, costPrice: number): number {
    if (!price || price <= 0) return 0;
    if (!costPrice || costPrice < 0) return 100;
    const margin = ((price - costPrice) / price) * 100;
    return Number(margin.toFixed(2));
  }

  getDiscountPercentage(price: number, comparePrice: number): number {
    if (!price || !comparePrice || comparePrice <= price) return 0;
    const discount = ((comparePrice - price) / comparePrice) * 100;
    return Number(discount.toFixed(0));
  }

  getStockStatus(stock: number, lowStockLimit: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (stock <= 0) return 'out_of_stock';
    if (stock <= lowStockLimit) return 'low_stock';
    return 'in_stock';
  }

  /**
   * Dashboard low-stock alert card. The threshold is per-product
   * (`low_stock_limit`), which PostgREST can't compare column-to-column in a
   * filter, so this fetches active products sorted by stock ascending and
   * filters in JS — cheaper than the dashboard's old "fetch everything,
   * filter client-side" because it skips out-of-stock/inactive noise via the
   * base query and caps the result.
   */
  async getLowStockProducts(limit = 5): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(SELECT_WITH_RELATIONS)
      .eq('is_active', true)
      .order('stock', { ascending: true })
      .limit(50);
    if (error) throw mapProductError(error);

    const products = (data as ProductRow[]).map(rowToProduct);
    return products
      .filter(p => this.getStockStatus(p.stock, p.lowStockLimit) !== 'in_stock')
      .slice(0, limit);
  }

  /**
   * The only product read allowed for unauthenticated storefront callers.
   * Uses SELECT_PUBLIC_SAFE (never asks Postgres for cost_price/costing/
   * revisions) so internal COGS/profit data can't reach the browser even if
   * the caller's own filtering is skipped or buggy — enforced at the DB
   * grant level (see 20260727120000 migration), not just in JS.
   */
  async getPublicProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(SELECT_PUBLIC_SAFE)
      .order('created_at', { ascending: false });
    if (error) throw mapProductError(error);

    const products = (data as ProductRow[]).map(rowToProduct);
    return products.filter(p => p.status === 'published');
  }

  // --- CRUD OPERATIONS ---

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(SELECT_WITH_RELATIONS)
      .order('created_at', { ascending: false });
    if (error) throw mapProductError(error);

    let products = (data as ProductRow[]).map(rowToProduct);

    if (filters) {
      if (filters.search) {
        const query = filters.search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query)
        );
      }
      if (filters.category && filters.category !== 'all') {
        products = products.filter(p => p.category === filters.category);
      }
      if (filters.collection && filters.collection !== 'all') {
        products = products.filter(p => p.collection === filters.collection);
      }
      if (filters.season && filters.season !== 'all') {
        products = products.filter(p => p.season === filters.season);
      }
      if (filters.status && filters.status !== 'all') {
        products = products.filter(p => p.status === filters.status);
      }
      if (filters.stockStatus && filters.stockStatus !== 'all') {
        products = products.filter(p => this.getStockStatus(p.stock, p.lowStockLimit) === filters.stockStatus);
      }
      if (filters.featured !== undefined) {
        products = products.filter(p => p.featured === filters.featured);
      }
      if (filters.minPrice !== undefined) {
        products = products.filter(p => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        products = products.filter(p => p.price <= filters.maxPrice!);
      }
    }

    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const row = await fetchProductRow(id);
    return row ? rowToProduct(row) : undefined;
  }

  async createProduct(data: Omit<Product, 'id'>): Promise<Product> {
    const colorVariants = data.colorVariants ?? [];
    if (colorVariants.length === 0) {
      throw new Error('يجب إضافة لون واحد على الأقل للمنتج (سيكون هو اللون الافتراضي)');
    }
    if (data.price < 0) throw new Error('السعر لا يمكن أن يكون سالباً');
    if (data.comparePrice < 0) throw new Error('سعر المقارنة لا يمكن أن يكون سالباً');
    if (data.stock < 0) throw new Error('المخزون لا يمكن أن يكون سالباً');
    if (data.comparePrice > 0 && data.comparePrice < data.price) {
      throw new Error('سعر المقارنة يجب أن يكون أكبر من أو يساوي السعر الحالي');
    }
    validateCosting(data.costing);
    if (data.costPrice !== undefined && data.costPrice < 0) throw new Error('سعر التكلفة لا يمكن أن يكون سالباً');

    const categoryId = await resolveCategoryId(data.category);
    const { data: row, error } = await supabase
      .from('products')
      .insert(productToRow(data, categoryId))
      .select('id')
      .single();
    if (error) throw mapProductError(error);

    try {
      const { idMap, defaultColorId, defaultImages } = await replaceProductColors(row.id, colorVariants);
      await replaceProductVariants(row.id, data.variants ?? [], idMap);
      // Mirrors the default color's gallery into the flat legacy table, so any
      // remaining reader of `product_images` directly stays correct — the admin
      // never edits this separately, it's fully derived.
      await replaceProductImages(row.id, defaultImages);
      const { error: defaultError } = await supabase.from('products').update({ default_variant_id: defaultColorId }).eq('id', row.id);
      if (defaultError) throw mapProductError(defaultError);
    } catch (err) {
      // No multi-table transaction over PostgREST — roll back the product row
      // rather than leave an orphaned product with no images/variants.
      await supabase.from('products').delete().eq('id', row.id);
      throw err;
    }

    const created = rowToProduct((await fetchProductRow(row.id))!);

    eventBus.emit('product.created', created);
    eventBus.emit('products.changed');
    eventBus.emit('inventory.changed');

    return created;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const existing = await fetchProductRow(id);
    if (!existing) throw new Error('Product not found');

    if (data.price !== undefined && data.price < 0) throw new Error('السعر لا يمكن أن يكون سالباً');
    if (data.comparePrice !== undefined && data.comparePrice < 0) throw new Error('سعر المقارنة لا يمكن أن يكون سالباً');
    if (data.stock !== undefined && data.stock < 0) throw new Error('المخزون لا يمكن أن يكون سالباً');
    if (data.colorVariants !== undefined && data.colorVariants.length === 0) {
      throw new Error('يجب أن يحتوي المنتج على لون واحد على الأقل');
    }
    validateCosting(data.costing);
    if (data.costPrice !== undefined && data.costPrice < 0) throw new Error('سعر التكلفة لا يمكن أن يكون سالباً');

    const categoryId = data.category !== undefined ? await resolveCategoryId(data.category) : undefined;

    // Revision history (autosave log), same shape/cap as the mock implementation.
    const before = rowToProduct(existing);
    const revision = {
      versionId: `rev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminId: 'admin_1',
      changesSummary: 'Autosave Update',
      snapshot: JSON.parse(JSON.stringify(before)),
    };
    const revisions = [revision, ...(before.revisions || [])].slice(0, 50);

    const updateRow = productToUpdateRow({ ...data, revisions }, categoryId);
    const { error } = await supabase.from('products').update(updateRow).eq('id', id);
    if (error) throw mapProductError(error);

    let colorIdMap: ColorIdMap = new Map();
    if (data.colorVariants !== undefined) {
      const { idMap, defaultColorId, defaultImages } = await replaceProductColors(id, data.colorVariants);
      colorIdMap = idMap;
      await replaceProductImages(id, defaultImages);
      const { error: defaultError } = await supabase.from('products').update({ default_variant_id: defaultColorId }).eq('id', id);
      if (defaultError) throw mapProductError(defaultError);
    }
    if (data.variants !== undefined) await replaceProductVariants(id, data.variants, colorIdMap);

    const updated = rowToProduct((await fetchProductRow(id))!);

    eventBus.emit('product.updated', updated);
    eventBus.emit('products.changed');
    if (before.stock !== updated.stock) eventBus.emit('inventory.changed');

    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await fetchProductRow(id);
    if (!existing) throw new Error('Product not found');

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw mapProductError(error);

    eventBus.emit('product.deleted', id);
    eventBus.emit('products.changed');
    eventBus.emit('inventory.changed');
  }

  async duplicateProduct(id: string): Promise<Product> {
    const existing = await fetchProductRow(id);
    if (!existing) throw new Error('Product not found');

    const source = rowToProduct(existing);
    const suffix = Math.floor(Math.random() * 1000);
    const duplicate: Omit<Product, 'id'> = {
      ...source,
      name: `${source.name} (نسخة)`,
      sku: `${source.sku}-COPY-${suffix}`,
      slug: `${source.slug}-copy-${suffix}`,
      status: 'draft',
      revisions: [],
    };

    const categoryId = await resolveCategoryId(duplicate.category);
    const { data: row, error } = await supabase
      .from('products')
      .insert(productToRow(duplicate, categoryId))
      .select('id')
      .single();
    if (error) throw mapProductError(error);

    try {
      const { idMap, defaultColorId, defaultImages } = await replaceProductColors(row.id, duplicate.colorVariants ?? []);
      await replaceProductVariants(row.id, duplicate.variants ?? [], idMap);
      await replaceProductImages(row.id, defaultImages);
      const { error: defaultError } = await supabase.from('products').update({ default_variant_id: defaultColorId }).eq('id', row.id);
      if (defaultError) throw mapProductError(defaultError);
    } catch (err) {
      await supabase.from('products').delete().eq('id', row.id);
      throw err;
    }

    const created = rowToProduct((await fetchProductRow(row.id))!);

    eventBus.emit('product.created', created);
    eventBus.emit('products.changed');

    return created;
  }

  // --- BULK OPERATIONS ---

  async deleteMultiple(ids: string[]): Promise<void> {
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw mapProductError(error);
    eventBus.emit('products.bulk_deleted', ids);
    eventBus.emit('products.changed');
    eventBus.emit('inventory.changed');
  }

  async bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<void> {
    const { error } = await supabase.from('products').update({ status }).in('id', ids);
    if (error) throw mapProductError(error);
    eventBus.emit('products.bulk_updated', ids);
    eventBus.emit('products.changed');
  }

  async bulkUpdateCategory(ids: string[], category: string): Promise<void> {
    const categoryId = await resolveCategoryId(category);
    const { error } = await supabase.from('products').update({ category_id: categoryId }).in('id', ids);
    if (error) throw mapProductError(error);
    eventBus.emit('products.bulk_updated', ids);
    eventBus.emit('products.changed');
  }
}

export const ProductService = new SupabaseProductRepositoryImpl();
