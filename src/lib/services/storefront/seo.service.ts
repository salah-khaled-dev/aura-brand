import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export type SEOPage =
  | 'global' | 'homepage' | 'shop' | 'about'
  | 'winter' | 'summer' | 'contact' | 'tracking'
  | 'reviews' | 'journal';

export interface SEOSettings {
  id: string;
  page: SEOPage;
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  twitterCard: 'summary' | 'summary_large_image';
  canonical?: string;
  robots: string;
  jsonLd: boolean;
}

type SEORow = Tables<'seo_settings'>;

const supabase = createClient();

function rowToSEO(row: SEORow): SEOSettings {
  return {
    id: `seo-${row.page}`,
    page: row.page as SEOPage,
    title: row.title,
    description: row.description,
    keywords: row.keywords,
    ogImage: row.og_image,
    twitterCard: row.twitter_card as SEOSettings['twitterCard'],
    canonical: row.canonical ?? undefined,
    robots: row.robots,
    jsonLd: row.json_ld,
  };
}

/**
 * Admin CRUD over `public.seo_settings`. This is READ server-side by
 * generateMetadata() (see src/utils/seo-helper.ts) — that's the only read
 * path that actually reaches search engines/social crawlers. This service is
 * for the admin panel only.
 */
export const SEOService = {
  async getAll(): Promise<SEOSettings[]> {
    const { data, error } = await supabase.from('seo_settings').select('*').order('page');
    if (error) throw error;
    return (data ?? []).map(rowToSEO);
  },

  async getByPage(page: SEOPage): Promise<SEOSettings | undefined> {
    const { data, error } = await supabase.from('seo_settings').select('*').eq('page', page).maybeSingle();
    if (error) throw error;
    return data ? rowToSEO(data) : undefined;
  },

  async update(id: string, updates: Partial<SEOSettings>): Promise<SEOSettings> {
    const page = id.replace(/^seo-/, '');
    return this.upsert(page as SEOPage, updates);
  },

  async upsert(page: SEOPage, updates: Partial<SEOSettings>): Promise<SEOSettings> {
    const patch: TablesInsert<'seo_settings'> = { page };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.keywords !== undefined) patch.keywords = updates.keywords;
    if (updates.ogImage !== undefined) patch.og_image = updates.ogImage;
    if (updates.twitterCard !== undefined) patch.twitter_card = updates.twitterCard;
    if (updates.canonical !== undefined) patch.canonical = updates.canonical;
    if (updates.robots !== undefined) patch.robots = updates.robots;
    if (updates.jsonLd !== undefined) patch.json_ld = updates.jsonLd;

    const { data, error } = await supabase.from('seo_settings').upsert(patch, { onConflict: 'page' }).select().single();
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'seo' });
    return rowToSEO(data);
  },

  async getSEOScore(): Promise<{ score: number; brokenLinks: number }> {
    const all = await this.getAll();
    if (all.length === 0) return { score: 0, brokenLinks: 0 };
    const filled = all.filter((s) => s.title && s.description && s.ogImage).length;
    return { score: Math.round((filled / all.length) * 100), brokenLinks: 0 };
  },
};
