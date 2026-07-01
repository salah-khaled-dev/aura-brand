import type { Metadata } from 'next';
import { SEOService, SEOPage } from '@/lib/services/storefront/seo.service';

export async function generatePageMetadata(
  pageKey: SEOPage,
  defaultTitle: string,
  defaultDesc: string
): Promise<Metadata> {
  try {
    const seo = await SEOService.getByPage(pageKey);
    const global = await SEOService.getByPage('global');

    const title = seo?.title || global?.title || defaultTitle;
    const description = seo?.description || global?.description || defaultDesc;
    const keywords = seo?.keywords || global?.keywords || '';
    const robots = seo?.robots || global?.robots || 'index, follow';
    const ogImage = seo?.ogImage || global?.ogImage || '/aura_thumbnail.png';
    const twitterCard = seo?.twitterCard || global?.twitterCard || 'summary_large_image';

    return {
      title,
      description,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      robots,
      openGraph: {
        title,
        description,
        url: seo?.canonical || `https://aura-fashion-virid.vercel.app/${pageKey === 'homepage' ? '' : pageKey}`,
        siteName: 'AURA',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        locale: 'ar_EG',
        type: 'website',
      },
      twitter: {
        card: twitterCard,
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDesc,
    };
  }
}
