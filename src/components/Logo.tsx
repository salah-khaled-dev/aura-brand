"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "hero" | number;
  animated?: boolean;
  variant?: "black" | "white" | "currentColor";
  className?: string;
}

export default function Logo({
  size = "md",
  animated = true,
  variant = "currentColor",
  className = "",
}: LogoProps) {
  // Height mappings for predefined sizes
  const heightMap = {
    sm: "h-5 md:h-7", 
    md: "h-6 md:h-10", 
    lg: "h-6 sm:h-8 md:h-12 lg:h-16", 
    xl: "h-10 md:h-16 lg:h-20", 
    hero: "h-16 md:h-24 lg:h-32",
  };

  const colorMap = {
    black: "text-[#1A1A1A]",
    white: "text-[#FAF9F6]",
    currentColor: "",
  };

  const heightClass = typeof size === "string" ? heightMap[size] : "";
  const colorClass = colorMap[variant];

  // Completely Custom Vector Paths for AURA (Luxury Bodoni/Didot high-contrast style)
  const wordmarkPaths = [
    // A
    "M 59,15 L 20,85 H 22 L 61,15 Z M 59,15 L 80,85 H 94 L 73,15 Z M 35,60 H 83 V 62 H 35 Z M 50,15 H 80 V 17 H 50 Z M 10,85 H 35 V 87 H 10 Z M 70,85 H 105 V 87 H 70 Z",
    // U
    "M 150,15 H 164 V 68 H 150 Z M 206,15 H 208 V 68 H 206 Z M 150,68 C 150,88 170,88 185,88 C 200,88 208,80 208,68 H 206 C 206,78 198,86 185,86 C 172,86 164,78 164,68 Z M 140,15 H 174 V 17 H 140 Z M 196,15 H 218 V 17 H 196 Z",
    // R
    "M 270,15 H 284 V 85 H 270 Z M 284,15 H 315 C 345,15 345,50 315,50 H 284 V 48 H 315 C 332,48 332,17 315,17 H 284 Z M 290,50 C 300,50 310,85 325,85 H 339 C 322,85 312,50 304,50 Z M 260,15 H 294 V 17 H 260 Z M 260,85 H 294 V 87 H 260 Z M 315,85 H 349 V 87 H 315 Z",
    // A
    "M 419,15 L 380,85 H 382 L 421,15 Z M 419,15 L 440,85 H 454 L 433,15 Z M 395,60 H 443 V 62 H 395 Z M 410,15 H 440 V 17 H 410 Z M 370,85 H 395 V 87 H 370 Z M 430,85 H 465 V 87 H 430 Z"
  ];

  // Premium Animation Setups
  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.5,
        ease: [0.33, 1, 0.68, 1] as const,
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  };

  const letterVariants: Variants = {
    hidden: { 
      opacity: 0,
      pathLength: 0,
      fill: "transparent"
    },
    visible: { 
      opacity: 1, 
      pathLength: 1,
      fill: "currentColor",
      transition: {
        opacity: { duration: 0.5, ease: "linear" },
        pathLength: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] as const },
        fill: { duration: 1, delay: 0.8, ease: "easeOut" }
      }
    }
  };

  const styleObj = typeof size === "number" ? { height: `${size}px`, width: "auto" } : {};

  if (!animated) {
    return (
      <svg
        viewBox="0 0 580 100"
        fill="currentColor"
        style={styleObj}
        className={`w-auto ${heightClass} ${colorClass} ${className}`}
      >
        <g transform="translate(0, -20)">
          <image href="/aura-logo.png" x="0" y="0" width="140" height="140" style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0px 4px 6px rgba(212,175,55,0.2))' }} />
        </g>
        <g transform="translate(125, 0)">
          {wordmarkPaths.map((path, idx) => (
            <path key={idx} d={path} />
          ))}
        </g>
      </svg>
    );
  }

  return (
    <motion.svg
      viewBox="0 0 580 100"
      style={styleObj}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`w-auto ${heightClass} ${colorClass} ${className}`}
    >
      <g transform="translate(0, -20)">
        <motion.image 
          href="/aura-logo.png" 
          x="0" 
          y="0" 
          width="140" 
          height="140" 
          style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0px 4px 10px rgba(212,175,55,0.4))' }} 
          initial={{ opacity: 0, scale: 0.7, rotate: -8, y: 15, filter: "blur(10px)" }} 
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0, filter: "blur(0px)" }} 
          transition={{ duration: 1.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} 
        />
      </g>
      <g transform="translate(125, 0)">
        {wordmarkPaths.map((path, idx) => (
          <motion.path
            key={idx}
            d={path}
            stroke="currentColor"
            strokeWidth="0.5"
            variants={letterVariants}
          />
        ))}
      </g>
    </motion.svg>
  );
}
