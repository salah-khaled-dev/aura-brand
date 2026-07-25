"use client";

import { useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { SEOService, SEOPage } from '@/lib/services/storefront/seo.service';
import { useEventSubscribeMany } from '@/hooks/useEventBus';

/**
 * Map storefront route → SEO page key.
 * Query-string pages (/shop?category=winter) are handled by checking
 * window.location.search at the time of injection.
 */
function resolvePageKey(pathname: string): SEOPage {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  if (pathname === '/')         return 'homepage';
  if (pathname === '/about')    return 'about';
  if (pathname === '/contact')  return 'contact';
  if (pathname === '/tracking') return 'tracking';
  if (pathname === '/reviews')  return 'reviews';
  if (pathname === '/journal')  return 'journal';
  if (pathname.startsWith('/shop')) {
    if (search.includes('category=winter')) return 'winter';
    if (search.includes('category=summer')) return 'summer';
    return 'shop';
  }
  return 'global';
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, selector.match(/\[(.+?)=/)?.[1] ?? attr);
    document.head.appendChild(el);
  }
  el.content = value;
}

/**
 * SEOInjector — client-side component that dynamically updates `<head>` meta
 * tags from SEOService. Runs on every route change and whenever 'website.changed'
 * is emitted.
 *
 * `generateMetadata()` (src/utils/seo-helper.ts) already reads the same
 * `seo_settings` table server-side — that SSR output is what crawlers/bots
 * and every other visitor see, and it is correct on its own. This component
 * only exists so an admin with the storefront open in another tab sees their
 * edit reflected immediately, without needing a full reload; it is a live-
 * preview convenience layer, not the mechanism SEO depends on.
 */
export function SEOInjector() {
  const pathname = usePathname();

  const inject = useCallback(async () => {
    try {
      const pageKey = resolvePageKey(pathname ?? '/');
      const seo = (await SEOService.getByPage(pageKey)) ?? (await SEOService.getByPage('global'));
      if (!seo) return;

      if (seo.title)       document.title = seo.title;
      if (seo.description) setMeta('meta[name="description"]',         'name',     seo.description);
      if (seo.keywords)    setMeta('meta[name="keywords"]',            'name',     seo.keywords);
      if (seo.robots)      setMeta('meta[name="robots"]',              'name',     seo.robots);
      if (seo.title)       setMeta('meta[property="og:title"]',        'property', seo.title);
      if (seo.description) setMeta('meta[property="og:description"]',  'property', seo.description);
      if (seo.ogImage)     setMeta('meta[property="og:image"]',        'property', seo.ogImage);
      if (seo.title)       setMeta('meta[name="twitter:title"]',       'name',     seo.title);
      if (seo.description) setMeta('meta[name="twitter:description"]', 'name',     seo.description);
      if (seo.ogImage)     setMeta('meta[name="twitter:image"]',       'name',     seo.ogImage);
    } catch {
      // keep existing static metadata
    }
  }, [pathname]);

  useEffect(() => { inject(); }, [inject]);
  useEventSubscribeMany(['website.changed'], inject);

  return null;
}
