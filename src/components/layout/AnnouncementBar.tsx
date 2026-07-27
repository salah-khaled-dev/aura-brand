"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IconSpeakerphone as Megaphone, IconX as X } from '@tabler/icons-react';
import { StoreService, AnnouncementBarSettings } from '@/lib/services/storefront/store.service';
import { useEventSubscribeMany } from '@/hooks/useEventBus';

const DISMISS_STORAGE_KEY = 'aura-announcement-dismissed';

/**
 * AnnouncementBar — full-width banner above the Navbar.
 * Controlled entirely by StoreService.announcementBar (set in the admin
 * Store Settings page). Hides itself when disabled or when text is empty.
 */
export function AnnouncementBar() {
  const [bar, setBar] = useState<AnnouncementBarSettings | null>(
    () => StoreService.getInfoSync().announcementBar ?? null
  );
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    try {
      const info = await StoreService.getInfo();
      setBar(info.announcementBar ?? null);
    } catch {
      // keep null — bar stays hidden
    }
  }, []);

  // No synchronous seed is available until the first real fetch completes
  // (unlike the old mockStorage-backed version, there's nothing to read
  // before any network request) — fetch on mount, then again on live CMS edits.
  useEffect(() => { load(); }, [load]);
  useEventSubscribeMany(['website.changed'], load);

  useEffect(() => {
    try {
      setDismissedKey(sessionStorage.getItem(DISMISS_STORAGE_KEY));
    } catch {
      // sessionStorage unavailable — dismiss just won't persist
    }
  }, []);

  const barKey = bar ? `${bar.text}|${bar.link}` : null;
  const isVisible = Boolean(bar?.enabled && bar.text.trim() && barKey !== dismissedKey);

  const handleDismiss = () => {
    if (!barKey) return;
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, barKey);
    } catch {
      // ignore — worst case the bar reappears next render
    }
    setDismissedKey(barKey);
  };

  const hasCta = Boolean(bar?.link?.trim());

  return (
    <AnimatePresence>
      {isVisible && bar && (
        <motion.div
          key="announcement-bar"
          role="region"
          aria-label="إعلان"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          exit={{
            opacity: 0,
            y: reduceMotion ? 0 : -16,
            transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
          }}
          className="relative w-full border-b shadow-[0_1px_12px_rgba(0,0,0,0.06)] [backdrop-filter:blur(6px)]"
          style={{
            backgroundColor: bar.bgColor   || '#0F0F0F',
            color:           bar.textColor || '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="mx-auto flex min-h-11 max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-5 py-2.5 sm:flex-nowrap sm:px-6 md:py-0">
            <Megaphone
              size={16}
              strokeWidth={1.75}
              className="hidden flex-none text-accent sm:block"
              aria-hidden
            />

            <p className="min-w-0 flex-1 text-center text-[13px] font-medium leading-snug tracking-[0.01em] sm:text-xs">
              {bar.text}
            </p>

            {hasCta && (
              <>
                <span className="hidden h-3.5 w-px flex-none bg-accent/40 sm:block" aria-hidden />
                <Link
                  href={bar.link}
                  className="inline-flex flex-none items-center rounded-full border px-3.5 py-1 text-[11px] font-semibold tracking-wide transition-colors duration-300 hover:bg-[var(--cta-fg)] hover:text-[var(--cta-bg)] sm:text-xs"
                  style={{
                    borderColor: `${bar.textColor || '#FFFFFF'}4D`,
                    '--cta-fg': bar.textColor || '#FFFFFF',
                    '--cta-bg': bar.bgColor || '#0F0F0F',
                  } as React.CSSProperties}
                >
                  تسوق الآن
                </Link>
              </>
            )}

            <motion.button
              type="button"
              onClick={handleDismiss}
              aria-label="إغلاق الإعلان"
              whileHover={reduceMotion ? undefined : { rotate: 90, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="flex-none rounded-full p-1 opacity-70 outline-none transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={15} strokeWidth={1.75} aria-hidden />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
