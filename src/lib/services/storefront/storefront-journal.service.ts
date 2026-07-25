import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  publishDate: string;
  isoDate: string;
  readTime: string;
  image: string;
}

export const journalCategories = [
  'نصائح الموضة',
  'الأقمشة والخامات',
  'تنسيق الإطلالات',
  'اتجاهات الموسم',
  'دليل الأناقة',
];

type ArticleRow = Tables<'journal_articles'>;

const supabase = createClient();

function rowToJournalArticle(row: ArticleRow): JournalArticle {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    publishDate: new Date(row.publish_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    isoDate: row.publish_date,
    readTime: `${row.reading_time_minutes} دقائق قراءة`,
    image: row.featured_image,
  };
}

/** Public, published-only reads for the storefront (/journal, /journal/[slug], sitemap.ts). */
export const StorefrontJournalService = {
  async getPublishedArticles(): Promise<JournalArticle[]> {
    const { data, error } = await supabase
      .from('journal_articles')
      .select('*')
      .eq('status', 'published')
      .order('publish_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToJournalArticle);
  },

  async getPublishedArticleBySlug(slug: string): Promise<JournalArticle | undefined> {
    const { data, error } = await supabase
      .from('journal_articles')
      .select('*')
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToJournalArticle(data) : undefined;
  },
};
