"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Heart, ShoppingBag, User, Menu, X,
  Home, Compass, Star, Package, RotateCcw,
  CreditCard, MessageCircle, HelpCircle,
  MapPin, Phone, Mail, Truck, Check,
  ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
  Sparkles,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

/* ─────────────────────────────────────────────────
   ICON COLOR THEMES — luxury fashion palette
───────────────────────────────────────────────── */
export type IconVariant =
  | "default"   // warm mocha
  | "accent"    // brand gold
  | "muted"     // soft grey-beige
  | "rose"      // rose-champagne
  | "filled"    // filled accent for active states
  | "white"     // for dark backgrounds
  | "ghost";    // very soft, nearly transparent

const variantStyles: Record<IconVariant, string> = {
  default:  "text-[#4A3728]",
  accent:   "text-[#9A7355]",
  muted:    "text-[#A89888]",
  rose:     "text-[#C4927A]",
  filled:   "text-[#9A7355]",
  white:    "text-[#FAF8F5]",
  ghost:    "text-[#C8B9AE]",
};

const hoverVariantStyles: Record<IconVariant, string> = {
  default:  "hover:text-[#9A7355]",
  accent:   "hover:text-[#7A5835]",
  muted:    "hover:text-[#9A7355]",
  rose:     "hover:text-[#A8745C]",
  filled:   "hover:text-[#7A5835]",
  white:    "hover:text-white",
  ghost:    "hover:text-[#9A7355]",
};

/* ─────────────────────────────────────────────────
   SIZE MAP
───────────────────────────────────────────────── */
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<IconSize, { icon: number; stroke: string; touch: string }> = {
  xs: { icon: 16, stroke: "stroke-[1]", touch: "w-8 h-8"   },
  sm: { icon: 20, stroke: "stroke-[1]", touch: "w-9 h-9"   },
  md: { icon: 24, stroke: "stroke-[1]", touch: "w-10 h-10" },
  lg: { icon: 28, stroke: "stroke-[1]", touch: "w-11 h-11" },
  xl: { icon: 32, stroke: "stroke-[1]", touch: "w-12 h-12" },
};

/* ─────────────────────────────────────────────────
   ANIMATION PRESETS
───────────────────────────────────────────────── */
export type IconAnimation =
  | "none"
  | "lift"        // float up on hover
  | "scale"       // gentle scale on hover
  | "pulse"       // subtle pulse
  | "bounce"      // quick bounce
  | "spin"        // rotate on hover
  | "wiggle";     // gentle wiggle

const animationVariants: Record<IconAnimation, object> = {
  none:    {},
  lift:    { whileHover: { y: -3, transition: { duration: 0.25, ease: "easeOut" } } },
  scale:   { whileHover: { scale: 1.15, transition: { duration: 0.2, ease: "easeOut" } } },
  pulse:   { whileHover: { scale: [1, 1.12, 1], transition: { duration: 0.4, times: [0, 0.5, 1] } } },
  bounce:  { animate:   { y: [0, -4, 0] }, transition: { duration: 0.4, ease: "easeOut" } },
  spin:    { whileHover: { rotate: 12, transition: { duration: 0.3, ease: "easeOut" } } },
  wiggle:  { whileHover: { rotate: [-6, 6, -4, 4, 0], transition: { duration: 0.4 } } },
};

/* ─────────────────────────────────────────────────
   BASE ANIMATED ICON
   Wraps any lucide icon with motion + styling
───────────────────────────────────────────────── */
interface AnimatedIconProps {
  icon: React.ComponentType<LucideProps>;
  size?: IconSize;
  variant?: IconVariant;
  animation?: IconAnimation;
  className?: string;
  "aria-label"?: string;
  onClick?: () => void;
  badge?: number;
  asTouchTarget?: boolean; // wraps in a min-44px touch target div
}

export function AnimatedIcon({
  icon: Icon,
  size = "md",
  variant = "default",
  animation = "lift",
  className = "",
  badge,
  asTouchTarget = false,
  ...rest
}: AnimatedIconProps) {
  const { icon: px, stroke, touch } = sizeMap[size];
  const colorClass = variantStyles[variant];
  const hoverClass = hoverVariantStyles[variant];

  const motionProps = animationVariants[animation];

  const iconEl = (
    <motion.span
      {...motionProps}
      className={`inline-flex items-center justify-center relative ${colorClass} ${hoverClass} transition-colors duration-300 ${className}`}
      {...rest}
    >
      <Icon
        style={{ width: px, height: px }}
        className={stroke}
        aria-hidden="true"
      />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-medium text-white leading-none border border-background-secondary shadow-sm">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </motion.span>
  );

  if (asTouchTarget) {
    return (
      <span className={`${touch} flex items-center justify-center`}>
        {iconEl}
      </span>
    );
  }

  return iconEl;
}

/* ─────────────────────────────────────────────────
   ANIMATED HEART (WISHLIST)
   Smooth fill animation on toggle
───────────────────────────────────────────────── */
interface AnimatedHeartProps {
  active?: boolean;
  size?: IconSize;
  onClick?: () => void;
  className?: string;
}

export function AnimatedHeart({ active = false, size = "md", onClick, className = "" }: AnimatedHeartProps) {
  const { icon: px, stroke } = sizeMap[size];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.88 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`inline-flex items-center justify-center focus:outline-none ${className}`}
      aria-label={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
    >
      <motion.div
        animate={{ scale: active ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Heart
          style={{ width: px, height: px }}
          fill={active ? "#9A7355" : "none"}
          className={`${stroke} transition-colors duration-300 ${active ? "text-[#9A7355]" : "text-[#A89888] hover:text-[#C4927A]"}`}
        />
      </motion.div>
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────
   ANIMATED CART ICON
   Bounce when item added (via key change)
───────────────────────────────────────────────── */
interface AnimatedCartProps {
  count?: number;
  size?: IconSize;
  onClick?: () => void;
  variant?: IconVariant;
  className?: string;
}

export function AnimatedCart({ count = 0, size = "md", onClick, variant = "default", className = "" }: AnimatedCartProps) {
  const { icon: px, stroke } = sizeMap[size];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.18 }}
      className={`relative inline-flex items-center justify-center focus:outline-none ${variantStyles[variant]} ${hoverVariantStyles[variant]} transition-colors duration-300 ${className}`}
      aria-label={`حقيبة التسوق — ${count} قطع`}
    >
      <motion.div
        key={count}            /* re-mounts & bounces when count changes */
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <ShoppingBag
          style={{ width: px, height: px }}
          className={stroke}
          aria-hidden="true"
        />
      </motion.div>
      {count > 0 && (
        <motion.span
          key={`badge-${count}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-medium text-white leading-none border border-background-secondary shadow-sm"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </motion.button>
  );
}

/* ─────────────────────────────────────────────────
   SOCIAL ICON
   Used in footer — SVG + lift + color transition
───────────────────────────────────────────────── */
interface SocialIconProps {
  children: React.ReactNode;
  href?: string;
  label: string;
  size?: IconSize;
}

export function SocialIconButton({ children, href = "#", label, size = "md" }: SocialIconProps) {
  const { touch } = sizeMap[size];
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      whileHover={{ y: -4, transition: { duration: 0.22, ease: "easeOut" } }}
      whileTap={{ scale: 0.9 }}
      className={`${touch} flex items-center justify-center text-[#A89888] hover:text-[#9A7355] transition-colors duration-300`}
    >
      {children}
    </motion.a>
  );
}

/* ─────────────────────────────────────────────────
   ANIMATED STAR RATING
   Used in product cards + reviews page
───────────────────────────────────────────────── */
interface AnimatedStarsProps {
  rating: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function AnimatedStars({ rating, max = 5, size = 16, interactive = false, onChange }: AnimatedStarsProps) {
  const [hovered, setHovered] = useState(0);
  const displayed = interactive && hovered > 0 ? hovered : rating;

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} من ${max} نجوم`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
        const filled = star <= displayed;
        return (
          <motion.button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            whileHover={interactive ? { scale: 1.25 } : {}}
            whileTap={interactive ? { scale: 0.85 } : {}}
            transition={{ duration: 0.15 }}
            className={interactive ? "cursor-pointer focus:outline-none" : "cursor-default"}
            aria-label={interactive ? `${star} نجوم` : undefined}
          >
            <Star
              style={{ width: size, height: size }}
              fill={filled ? "currentColor" : "none"}
              className={`transition-colors duration-200 ${filled ? "text-[#9A7355]" : "text-[#D4C5B8]"}`}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   PAGE FEATURE ICON
   Used in shipping / returns / payment info sections
───────────────────────────────────────────────── */
interface FeatureIconProps {
  icon: React.ComponentType<LucideProps>;
  label: string;
  description?: string;
}

export function FeatureIcon({ icon: Icon, label, description }: FeatureIconProps) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="flex flex-col items-center gap-3 text-center p-6 group"
    >
      <motion.div
        whileHover={{ scale: 1.08 }}
        transition={{ duration: 0.2 }}
        className="w-14 h-14 rounded-full bg-[#F3EDE6] flex items-center justify-center
                   group-hover:bg-[#EAE0D6] transition-colors duration-300"
      >
        <Icon className="w-6 h-6 stroke-[1.25] text-[#9A7355]" aria-hidden="true" />
      </motion.div>
      <p className="font-sans text-xs font-semibold text-text-primary">{label}</p>
      {description && (
        <p className="font-sans text-[11px] font-light text-text-secondary leading-relaxed">{description}</p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────
   ICON EXPORTS — named convenience re-exports
   So other files can import directly from here
───────────────────────────────────────────────── */
export {
  Search, Heart, ShoppingBag, User, Menu, X,
  Home, Compass, Star, Package, RotateCcw,
  CreditCard, MessageCircle, HelpCircle,
  MapPin, Phone, Mail, Truck, Check,
  ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
  Sparkles,
};
