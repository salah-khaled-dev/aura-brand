import { SEOData } from './shared';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage?: string;
  banner?: string;
  season?: string;
  priority: number;
  isFeatured: boolean;
  status: 'published' | 'draft' | 'archived';
  publishDate?: string;
  seo: SEOData;
  productsCount: number;
}

export let mockCollections: Collection[] = [];

export const updateMockCollections = (newCollections: Collection[]) => {
  mockCollections = newCollections;
};
