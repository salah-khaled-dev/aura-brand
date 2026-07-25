import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, Json } from '@/lib/supabase/database.types';
import { SEOData, defaultSEOData } from '@/data/mock/shared';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  gallery: string[];
  category: string;
  tags: string[];
  author: string;
  readingTime: number;
  status: 'published' | 'draft' | 'archived';
  isFeatured: boolean;
  publishDate: string;
  seo: SEOData;
}

type ArticleRow = Tables<'journal_articles'>;

const supabase = createClient();

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    featuredImage: row.featured_image,
    gallery: row.gallery,
    category: row.category,
    tags: row.tags,
    author: row.author,
    readingTime: row.reading_time_minutes,
    status: row.status as Article['status'],
    isFeatured: row.is_featured,
    publishDate: row.publish_date,
    seo: { ...defaultSEOData, ...(row.seo as unknown as Partial<SEOData>) },
  };
}

export const JournalService = {
  async getArticles(): Promise<Article[]> {
    const { data, error } = await supabase.from('journal_articles').select('*').order('publish_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToArticle);
  },

  async getArticle(id: string): Promise<Article | undefined> {
    const { data, error } = await supabase.from('journal_articles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToArticle(data) : undefined;
  },

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const { data, error } = await supabase.from('journal_articles').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? rowToArticle(data) : undefined;
  },

  async createArticle(data: Partial<Article>): Promise<Article> {
    const insertRow: TablesInsert<'journal_articles'> = {
      title: data.title || 'مقال جديد',
      slug: data.slug || `new-article-${Date.now()}`,
      excerpt: data.excerpt || '',
      content: data.content || '',
      featured_image: data.featuredImage || '',
      gallery: data.gallery || [],
      category: data.category || 'عام',
      tags: data.tags || [],
      author: data.author || 'Admin',
      reading_time_minutes: data.readingTime || 1,
      status: data.status || 'draft',
      is_featured: data.isFeatured || false,
      publish_date: data.publishDate || new Date().toISOString(),
      seo: (data.seo || { ...defaultSEOData }) as unknown as Json,
    };
    const { data: row, error } = await supabase.from('journal_articles').insert(insertRow).select().single();
    if (error) throw error;
    return rowToArticle(row);
  },

  async updateArticle(id: string, data: Partial<Article>): Promise<Article> {
    const patch: Partial<TablesInsert<'journal_articles'>> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.excerpt !== undefined) patch.excerpt = data.excerpt;
    if (data.content !== undefined) patch.content = data.content;
    if (data.featuredImage !== undefined) patch.featured_image = data.featuredImage;
    if (data.gallery !== undefined) patch.gallery = data.gallery;
    if (data.category !== undefined) patch.category = data.category;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.author !== undefined) patch.author = data.author;
    if (data.readingTime !== undefined) patch.reading_time_minutes = data.readingTime;
    if (data.status !== undefined) patch.status = data.status;
    if (data.isFeatured !== undefined) patch.is_featured = data.isFeatured;
    if (data.publishDate !== undefined) patch.publish_date = data.publishDate;
    if (data.seo !== undefined) patch.seo = data.seo as unknown as Json;

    const { data: row, error } = await supabase.from('journal_articles').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Article not found');
    return rowToArticle(row);
  },

  async deleteArticle(id: string): Promise<void> {
    const { error } = await supabase.from('journal_articles').delete().eq('id', id);
    if (error) throw error;
  },

  async duplicateArticle(id: string): Promise<Article> {
    const original = await this.getArticle(id);
    if (!original) throw new Error('Article not found');
    return this.createArticle({
      ...original,
      title: `${original.title} (نسخة)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      status: 'draft',
      publishDate: new Date().toISOString(),
    });
  },
};
