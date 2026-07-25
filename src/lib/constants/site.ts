/**
 * Single source of truth for the site's canonical origin. Every metadata URL
 * (canonical, OpenGraph, JSON-LD, sitemap, robots) must be built from this
 * constant instead of a hardcoded domain string, so repointing the
 * deployment only requires updating NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://aura-brand-virid.vercel.app').replace(/\/$/, '');
