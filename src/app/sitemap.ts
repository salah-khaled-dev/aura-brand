import { MetadataRoute } from 'next';
import { getPublishedProducts } from '@/lib/services/storefront/storefront-product.service';
import { StorefrontJournalService } from '@/lib/services/storefront/storefront-journal.service';
import { SITE_URL } from '@/lib/constants/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

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

  // A Supabase outage shouldn't 500 the whole sitemap — degrade to the static routes only.
  const publishedProducts = await getPublishedProducts().catch((err) => {
    console.error('sitemap: failed to load published products, omitting from sitemap', err);
    return [];
  });
  const productRoutes = publishedProducts.map((product) => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Journal routes — same graceful degradation as products above.
  const publishedArticles = await StorefrontJournalService.getPublishedArticles().catch((err) => {
    console.error('sitemap: failed to load published articles, omitting from sitemap', err);
    return [];
  });
  const journalRoutes = publishedArticles.map((article) => ({
    url: `${baseUrl}/journal/${article.slug}`,
    lastModified: new Date(article.isoDate || new Date().toISOString()),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...routes, ...productRoutes, ...journalRoutes];
}
