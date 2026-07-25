import { SEOData } from './shared';
import { mockStorage } from '@/lib/storage/mock-storage';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Rich Text HTML
  featuredImage: string;
  gallery: string[];
  category: string;
  tags: string[];
  author: string;
  readingTime: number; // in minutes
  status: 'published' | 'draft' | 'archived';
  isFeatured: boolean;
  publishDate: string;
  seo: SEOData;
}

export let mockArticles: Article[] = [];

mockArticles = mockStorage.read('articles', mockArticles);

export const updateMockArticles = (newArticles: Article[]) => {
  mockArticles = newArticles;
  mockStorage.write('articles', newArticles);
};
