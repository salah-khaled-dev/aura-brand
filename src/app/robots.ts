import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/profile', '/cart', '/checkout', '/tracking'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
