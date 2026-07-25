/**
 * WebsiteService — unified CMS facade.
 *
 * Single source of truth for every part of the storefront that is controlled
 * by the Website Management admin section. All individual services are re-
 * exported from here so consumers can import from one place.
 *
 * Persistence: mockStorage (localStorage) — Supabase-ready when the time comes.
 * EventBus:    every mutation emits 'website.changed' so storefront components
 *              update instantly without a page reload.
 */

// ── Individual service re-exports ─────────────────────────────────────────────
export {
  HomepageService,
  DEFAULT_SECTION_SETTINGS,
  SECTION_TYPE_LABELS_AR,
} from './storefront/homepage.service';
export type {
  HomepageSection,
  HomepageSectionType,
  HeroSlide,
} from './storefront/homepage.service';

export { FooterService } from './storefront/footer.service';
export type { FooterSettings, FooterColumn } from './storefront/footer.service';

export { NavigationService } from './storefront/navigation.service';
export type { NavMenu, NavItem } from './storefront/navigation.service';

export { AppearanceService } from './storefront/appearance.service';
export type { StoreAppearance } from './storefront/appearance.service';

export { StoreService } from './storefront/store.service';
export type { StoreInfo, AnnouncementBarSettings } from './storefront/store.service';

export { SEOService } from './storefront/seo.service';
export type { SEOSettings, SEOPage } from './storefront/seo.service';

export { BannerService } from './storefront/banner.service';

// ── Unified configuration type ─────────────────────────────────────────────────
import type { HomepageSection } from './storefront/homepage.service';
import type { FooterSettings } from './storefront/footer.service';
import type { NavMenu } from './storefront/navigation.service';
import type { StoreAppearance } from './storefront/appearance.service';
import type { StoreInfo } from './storefront/store.service';
import type { SEOSettings } from './storefront/seo.service';

import { HomepageService } from './storefront/homepage.service';
import { FooterService } from './storefront/footer.service';
import { NavigationService } from './storefront/navigation.service';
import { AppearanceService } from './storefront/appearance.service';
import { StoreService } from './storefront/store.service';
import { SEOService } from './storefront/seo.service';

/** Full snapshot of everything the CMS controls. */
export interface WebsiteConfiguration {
  store: StoreInfo;
  appearance: StoreAppearance;
  homepage: HomepageSection[];
  navigation: NavMenu[];
  footer: FooterSettings;
  seo: SEOSettings[];
}

/** Fetch the complete website configuration in a single call. */
export const WebsiteService = {
  async getFullConfig(): Promise<WebsiteConfiguration> {
    const [store, appearance, homepage, navigation, footer, seo] = await Promise.all([
      StoreService.getInfo(),
      AppearanceService.getSettings(),
      HomepageService.getSections(),
      NavigationService.getMenus(),
      FooterService.getSettings(),
      SEOService.getAll(),
    ]);
    return { store, appearance, homepage, navigation, footer, seo };
  },
};
