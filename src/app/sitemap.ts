import { MetadataRoute } from 'next';
import { mockProducts } from '@/data/products';
import { mockArticles } from '@/data/journal';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://aura-fashion-virid.vercel.app';

  // Static routes
  const routes = [
    '',
    '/shop',
    '/winter-fashion',
    '/summer-fashion',
    '/about',
    '/journal',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Product routes
  const productRoutes = mockProducts.map((product) => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Journal routes
  const journalRoutes = mockArticles.map((article) => ({
    url: `${baseUrl}/journal/${article.slug}`,
    lastModified: new Date(article.isoDate || new Date().toISOString()),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...routes, ...productRoutes, ...journalRoutes];
}
