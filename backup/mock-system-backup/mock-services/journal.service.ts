import { Article, mockArticles, updateMockArticles } from '@/data/mock/journal';
import { defaultSEOData } from '@/data/mock/shared';

export const JournalService = {
  async getArticles(): Promise<Article[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockArticles].sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()));
      }, 300);
    });
  },

  async getArticle(id: string): Promise<Article | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockArticles.find(a => a.id === id)), 200);
    });
  },

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockArticles.find(a => a.slug === slug)), 200);
    });
  },

  async createArticle(data: Partial<Article>): Promise<Article> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newArticle: Article = {
          id: `art_${Date.now()}`,
          title: data.title || 'مقال جديد',
          slug: data.slug || `new-article-${Date.now()}`,
          excerpt: data.excerpt || '',
          content: data.content || '',
          featuredImage: data.featuredImage || '',
          gallery: data.gallery || [],
          category: data.category || 'عام',
          tags: data.tags || [],
          author: data.author || 'Admin',
          readingTime: data.readingTime || 1,
          status: data.status || 'draft',
          isFeatured: data.isFeatured || false,
          publishDate: data.publishDate || new Date().toISOString(),
          seo: data.seo || { ...defaultSEOData }
        };
        updateMockArticles([...mockArticles, newArticle]);
        resolve(newArticle);
      }, 500);
    });
  },

  async updateArticle(id: string, data: Partial<Article>): Promise<Article> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockArticles.findIndex(a => a.id === id);
        if (index === -1) return reject(new Error('Article not found'));
        
        const updated = { ...mockArticles[index], ...data };
        const newArray = [...mockArticles];
        newArray[index] = updated;
        updateMockArticles(newArray);
        resolve(updated);
      }, 400);
    });
  },

  async deleteArticle(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        updateMockArticles(mockArticles.filter(a => a.id !== id));
        resolve();
      }, 400);
    });
  },

  async duplicateArticle(id: string): Promise<Article> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const original = mockArticles.find(a => a.id === id);
        if (!original) return reject(new Error('Article not found'));

        const copy: Article = {
          ...original,
          id: `art_${Date.now()}`,
          title: `${original.title} (نسخة)`,
          slug: `${original.slug}-copy`,
          status: 'draft',
          publishDate: new Date().toISOString()
        };

        updateMockArticles([...mockArticles, copy]);
        resolve(copy);
      }, 500);
    });
  }
};
