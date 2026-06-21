"use client";

import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getWhatsAppUrl } from "@/config/whatsapp";

interface WhatsAppButtonProps {
  message?: string;
}

export default function WhatsAppButton({ message }: WhatsAppButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const href = getWhatsAppUrl(message);

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
        whileHover={{ y: -5, scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-24 right-5 z-40 md:bottom-10 md:right-8 flex h-14 w-14 items-center justify-center rounded-full bg-background-secondary border border-brand-border shadow-[0_8px_30px_rgba(154,115,85,0.25)] transition-colors duration-300 hover:border-accent hover:bg-[#F4EFE8] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <MessageCircle className="h-6 w-6 stroke-[1.6] text-accent" aria-hidden="true" />
      </motion.a>
    </AnimatePresence>
  );
}