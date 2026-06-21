"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();

  // Smooth out the scroll progress using a spring animation
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] sm:h-[3px] bg-accent z-[100] origin-left"
      style={{ scaleX }}
    />
  );
}
