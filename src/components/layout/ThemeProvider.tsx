"use client";

import { useEffect, useCallback } from 'react';
import { AppearanceService } from '@/lib/services/storefront/appearance.service';
import { useEventSubscribeMany } from '@/hooks/useEventBus';

/** Maps borderRadius preset → CSS value */
const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  sm:   '4px',
  md:   '8px',
  lg:   '16px',
  full: '9999px',
};

/** Maps containerWidth preset → max-width value */
const CONTAINER_MAP: Record<string, string> = {
  sm:   '960px',
  md:   '1080px',
  lg:   '1280px',
  xl:   '1440px',
  full: '100%',
};

/** Maps animationSpeed preset → CSS transition duration */
const SPEED_MAP: Record<string, string> = {
  slow:   '600ms',
  normal: '300ms',
  fast:   '150ms',
};

/**
 * ThemeProvider — reads AppearanceService and applies theme settings as CSS
 * custom properties on <html>. Tailwind v4 resolves `bg-accent`, `text-accent`
 * etc. through `--color-accent` at runtime, so overriding that var here changes
 * the site color instantly without a build step.
 *
 * Also updates the browser favicon dynamically when faviconUrl changes.
 *
 * Subscribes to 'website.changed' so admin edits reflect in the open storefront
 * tab with no page reload.
 */
export function ThemeProvider() {
  const applyTheme = useCallback(async () => {
    try {
      const s = await AppearanceService.getSettings();
      const root = document.documentElement;

      // Brand color overrides (map to Tailwind CSS custom properties)
      if (s.accentColor)            root.style.setProperty('--color-accent',              s.accentColor);
      if (s.textPrimaryColor)       root.style.setProperty('--color-text-primary',        s.textPrimaryColor);
      if (s.backgroundPrimaryColor) root.style.setProperty('--color-background-primary',  s.backgroundPrimaryColor);

      // Layout / behaviour CSS vars (consumed by --cms-* aware components)
      root.style.setProperty('--cms-radius',           RADIUS_MAP[s.borderRadius]    ?? '8px');
      root.style.setProperty('--cms-container-max',    CONTAINER_MAP[s.containerWidth] ?? '1440px');
      root.style.setProperty('--cms-transition-speed', SPEED_MAP[s.animationSpeed]   ?? '300ms');

      // Favicon — swap the <link rel="icon"> element so admin changes reflect immediately
      if (s.faviconUrl) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = s.faviconUrl;
      }
    } catch {
      // keep browser defaults
    }
  }, []);

  useEffect(() => { applyTheme(); }, [applyTheme]);
  useEventSubscribeMany(['website.changed'], applyTheme);

  return null;
}
