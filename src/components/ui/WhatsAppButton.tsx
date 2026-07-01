"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { StoreService } from "@/lib/services/storefront/store.service";
import { getWhatsAppUrl } from "@/config/whatsapp";
import { useEventSubscribeMany } from "@/hooks/useEventBus";

interface WhatsAppButtonProps {
  message?: string;
}

export default function WhatsAppButton({ message }: WhatsAppButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [href, setHref] = useState(getWhatsAppUrl(message));

  const loadHref = useCallback(async () => {
    try {
      const info = await StoreService.getInfo();
      const waUrl = info.socialMedia?.whatsapp;
      if (waUrl) setHref(waUrl);
    } catch {
      // keep default from config
    }
  }, [message]);

  useEffect(() => {
    setMounted(true);
    loadHref();
  }, [loadHref]);

  useEventSubscribeMany(['website.changed'], loadHref);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      <motion.a
        key="whatsapp-btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصلي مع مستشارة AURA عبر واتساب"
        initial={{ opacity: 0, scale: 0.88, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 0.6 },
          scale: { duration: 0.5, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ y: -5, scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-20 right-4 z-40 md:bottom-8 md:right-8 flex h-12 w-12 md:h-13 md:w-13 items-center justify-center rounded-full bg-background-secondary border border-brand-border text-accent shadow-[0_8px_24px_rgba(154,115,85,0.12)] transition-all duration-300 hover:border-[#25D366] hover:text-[#25D366] hover:shadow-[0_8px_24px_rgba(37,211,102,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 group"
      >
        {/* Premium gold pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-accent/20 opacity-20 animate-ping pointer-events-none [animation-duration:3s] group-hover:bg-[#25D366]/20 transition-colors duration-300" />

        {/* Official WhatsApp SVG Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6.5 w-6.5 relative z-10 transition-colors duration-300"
          aria-hidden="true"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.419 1.451 5.628 0 10.208-4.579 10.211-10.207.002-2.727-1.058-5.291-2.985-7.222-1.928-1.93-4.495-2.993-7.225-2.995-5.637 0-10.22 4.582-10.223 10.21-.001 1.925.504 3.807 1.464 5.419l-.993 3.628 3.742-.981zm11.367-7.643c-.31-.155-1.837-.907-2.122-1.01-.285-.102-.492-.153-.7.155-.207.31-.8 1.01-.98 1.216-.18.207-.36.233-.67.078-2.617-1.303-3.414-2.245-4.127-3.48-.18-.311-.018-.479.137-.634.14-.139.31-.362.466-.543.155-.181.207-.31.31-.517.104-.207.052-.389-.026-.543-.078-.155-.7-1.688-.96-2.315-.25-.605-.506-.523-.688-.533l-.587-.007c-.207 0-.543.078-.827.389-.285.31-1.087 1.062-1.087 2.59s1.111 2.997 1.266 3.204c.155.207 2.185 3.336 5.291 4.678.739.32 1.317.511 1.767.653.743.237 1.419.203 1.954.123.597-.089 1.837-.751 2.095-1.474.258-.724.258-1.345.181-1.474-.078-.129-.285-.207-.595-.362z" />
        </svg>
      </motion.a>
    </AnimatePresence>
  );
}
