import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export type HomepageSectionType =
  | 'hero'
  | 'featured_collections'
  | 'featured_products'
  | 'best_sellers'
  | 'new_arrivals'
  | 'seasonal_collection'
  | 'editorial_banner'
  | 'testimonials'
  | 'instagram'
  | 'newsletter'
  | 'custom_html';

export type ProductSectionSource =
  | 'auto_best_sellers'
  | 'auto_new_arrivals'
  | 'auto_featured'
  | 'auto_summer'
  | 'auto_winter'
  | 'auto_all'
  | 'manual';

export type ProductSectionSort =
  | 'default'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'random';

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  title: string;
  subtitle?: string;
  enabled: boolean;
  order: number;
  settings: Record<string, any>;
}

export interface HeroSlide {
  id: number;
  image: string;
  label: string;
  title: string;
  engTitle: string;
  subtitle: string;
}

export const DEFAULT_SECTION_SETTINGS: Record<HomepageSectionType, Record<string, any>> = {
  hero: {
    slides: [] as HeroSlide[],
    ctaText: 'اكتشفي التشكيلة',
    ctaLink: '/shop',
    secondaryCtaText: 'قصتنا الفنية',
    secondaryCtaLink: '/about',
  },
  featured_collections: {
    limit: 3, layout: 'grid', columns: 3, source: 'auto_all' as ProductSectionSource, sort: 'default' as ProductSectionSort,
    hideOutOfStock: false, showDiscountBadge: true, showWishlistButton: true, manualProductIds: [] as string[],
  },
  featured_products: {
    limit: 4, layout: 'grid', columns: 4, source: 'auto_featured' as ProductSectionSource, sort: 'default' as ProductSectionSort,
    hideOutOfStock: false, showDiscountBadge: true, showWishlistButton: true, manualProductIds: [] as string[],
  },
  best_sellers: {
    limit: 4, layout: 'grid', columns: 4, source: 'auto_best_sellers' as ProductSectionSource, sort: 'default' as ProductSectionSort,
    hideOutOfStock: false, showDiscountBadge: true, showWishlistButton: true, manualProductIds: [] as string[],
  },
  new_arrivals: {
    limit: 4, layout: 'grid', columns: 4, source: 'auto_new_arrivals' as ProductSectionSource, sort: 'default' as ProductSectionSort,
    hideOutOfStock: false, showDiscountBadge: true, showWishlistButton: true, manualProductIds: [] as string[],
  },
  seasonal_collection: {
    season: 'summer', limit: 4, layout: 'grid', columns: 4, source: 'auto_summer' as ProductSectionSource, sort: 'default' as ProductSectionSort,
    hideOutOfStock: false, showDiscountBadge: true, showWishlistButton: true, manualProductIds: [] as string[],
  },
  editorial_banner: {
    image: '/images/campaign/campaign_4.png', title: '', subtitle: '', ctaText: 'استكشفي التشكيلة', ctaLink: '/shop',
    textAlign: 'center', overlayOpacity: 40,
  },
  testimonials: { limit: 3 },
  instagram: { handle: '@aurabrand.eg', limit: 6, gridSize: 3, title: 'أورا على إنستغرام', subtitle: 'تابعينا' },
  newsletter: {
    title: 'انضمي لصالون أورا البريدي', subtitle: 'دعوات خاصة وتحديثات الأتيلييه', placeholder: 'بريدكِ الإلكتروني',
    buttonText: 'انضمي الآن', successMessage: 'شكراً لانضمامكِ! سنتواصل معكِ قريباً.',
    description: 'دعوات حصرية، تحديثات الأتيلييه، وعروض العملاء المميزين — أولاً لأعضاء الصالون البريدي.',
  },
  custom_html: { html: '<div></div>' },
};

export const SECTION_TYPE_LABELS_AR: Record<HomepageSectionType, string> = {
  hero: 'قسم البطل (Hero)',
  featured_collections: 'مجموعات مميزة',
  featured_products: 'منتجات مميزة',
  best_sellers: 'الأكثر مبيعاً',
  new_arrivals: 'وصل حديثاً',
  seasonal_collection: 'تشكيلة موسمية',
  editorial_banner: 'بانر تحريري',
  testimonials: 'آراء العملاء',
  instagram: 'إنستغرام',
  newsletter: 'النشرة البريدية',
  custom_html: 'HTML مخصص',
};

type SectionRow = Tables<'homepage_sections'>;

const supabase = createClient();

function rowToSection(row: SectionRow): HomepageSection {
  return {
    id: row.id,
    type: row.type as HomepageSectionType,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    enabled: row.enabled,
    order: row.display_order,
    settings: (row.settings as Record<string, any>) ?? {},
  };
}

/** In-memory cache of the last fetch, for callers seeding initial render state (see getSectionsSync doc). */
let cache: HomepageSection[] = [];

export const HomepageService = {
  async getSections(): Promise<HomepageSection[]> {
    const { data, error } = await supabase.from('homepage_sections').select('*').order('display_order');
    if (error) throw error;
    cache = (data ?? []).map(rowToSection);
    return cache;
  },

  /**
   * Best-effort synchronous read for seeding initial render state. Unlike the
   * old mockStorage-backed version, there is nothing to read before the first
   * real fetch completes — returns the last fetched value (empty on the very
   * first render), so callers should still follow up with `getSections()`
   * (every current call site already does).
   */
  getSectionsSync(): HomepageSection[] {
    return [...cache].sort((a, b) => a.order - b.order);
  },

  async updateSections(sections: HomepageSection[]): Promise<HomepageSection[]> {
    await Promise.all(
      sections.map((s) =>
        supabase.from('homepage_sections').update({ title: s.title, subtitle: s.subtitle ?? null, enabled: s.enabled, display_order: s.order, settings: s.settings as unknown as Json }).eq('id', s.id)
      )
    );
    eventBus.emit('website.changed', { area: 'homepage' });
    return this.getSections();
  },

  async addSection(type: HomepageSectionType, title?: string): Promise<HomepageSection> {
    const maxOrder = cache.reduce((m, s) => Math.max(m, s.order), -1);
    const insertRow: TablesInsert<'homepage_sections'> = {
      type,
      title: title || SECTION_TYPE_LABELS_AR[type],
      subtitle: '',
      enabled: true,
      display_order: maxOrder + 1,
      settings: { ...DEFAULT_SECTION_SETTINGS[type] } as unknown as Json,
    };
    const { data, error } = await supabase.from('homepage_sections').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'homepage' });
    return rowToSection(data);
  },

  async duplicateSection(id: string): Promise<HomepageSection> {
    const { data: original, error: fetchError } = await supabase.from('homepage_sections').select('*').eq('id', id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!original) throw new Error('Section not found');
    const maxOrder = cache.reduce((m, s) => Math.max(m, s.order), -1);

    const insertRow: TablesInsert<'homepage_sections'> = {
      type: original.type,
      title: `${original.title} (نسخة)`,
      subtitle: original.subtitle,
      enabled: original.enabled,
      display_order: maxOrder + 1,
      settings: original.settings,
    };
    const { data, error } = await supabase.from('homepage_sections').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'homepage' });
    return rowToSection(data);
  },

  async updateSection(id: string, updates: Partial<HomepageSection>): Promise<HomepageSection> {
    const patch: Partial<TablesInsert<'homepage_sections'>> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.subtitle !== undefined) patch.subtitle = updates.subtitle;
    if (updates.enabled !== undefined) patch.enabled = updates.enabled;
    if (updates.order !== undefined) patch.display_order = updates.order;
    if (updates.settings !== undefined) patch.settings = updates.settings as unknown as Json;

    const { data, error } = await supabase.from('homepage_sections').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Section not found');
    eventBus.emit('website.changed', { area: 'homepage' });
    return rowToSection(data);
  },

  async deleteSection(id: string): Promise<void> {
    const { error } = await supabase.from('homepage_sections').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'homepage' });
  },

  getDefaultSettings(type: HomepageSectionType): Record<string, any> {
    return { ...DEFAULT_SECTION_SETTINGS[type] };
  },
};
