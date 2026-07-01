"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrowUp } from "@tabler/icons-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ── Scroll listener — passive for 60fps ── */
  const onScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Appear after approximately 50% page scroll
    setVisible(docHeight > 0 && scrollY > docHeight * 0.45);
    setProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── SVG circle progress values ── */
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference - progress * circumference;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-top"
          onClick={scrollToTop}
          aria-label="العودة للأعلى"
          initial={{ opacity: 0, y: 20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.85 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const }}
          whileHover={{ scale: 1.08, y: -3 }}
          whileTap={{ scale: 0.93 }}
          className="
            fixed bottom-20 left-4 z-50
            md:bottom-8 md:left-8
            w-12 h-12 md:w-[54px] md:h-[54px]
            flex items-center justify-center
            bg-background-secondary
            shadow-[0_4px_24px_rgba(154,115,85,0.18)]
            hover:shadow-[0_8px_32px_rgba(154,115,85,0.28)]
            transition-shadow duration-400
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
          "
        >
          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 54 54"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx="27" cy="27" r={radius}
              fill="none"
              stroke="#EAE3D9"
              strokeWidth="1.5"
            />
            {/* Progress arc */}
            <motion.circle
              cx="27" cy="27" r={radius}
              fill="none"
              stroke="#C5A880"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDash }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </svg>

          {/* Arrow icon */}
          <motion.span
            animate={{ y: visible ? 0 : 4 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex items-center justify-center"
          >
            <IconArrowUp
              className="w-[15px] h-[15px] md:w-4 md:h-4 text-[#4A3728] stroke-[1.75]"
              aria-hidden="true"
            />
          </motion.span>

          {/* Gold dot accent — top center */}
          <span className="absolute top-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#C5A880] opacity-80" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
