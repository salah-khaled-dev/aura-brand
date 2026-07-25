"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { cn } from "@/utils/cn";
import { IconContainer, IconColor } from "../ui/IconContainer";

// A simple animated counter
function AnimatedCounter({ value }: { value: string | number }) {
  // Simple version: just animate opacity/y when value changes
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0 }}
    >
      {value}
    </motion.span>
  );
}

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string; isPositive: boolean };
  className?: string;
  accentColor?: IconColor;
}

export function KpiCard({ title, value, icon, trend, className, accentColor = "primary" }: KpiCardProps) {
  const ref = React.useRef(null);
  
  return (
    <motion.div
      ref={ref}
      whileHover="hover"
      initial="initial"
      animate="animate"
      className={cn(
        "relative rounded-[var(--admin-radius-2xl)]",
        "p-6 flex flex-col gap-5 group border",
        "transition-all duration-300 shadow-[var(--admin-shadow-sm)] hover:shadow-[var(--admin-shadow-lg)] hover:-translate-y-1 hover:border-[var(--admin-border-strong)]",
        accentColor === 'purple' && "bg-purple-500/5 hover:bg-purple-500/10 border-purple-500/10",
        accentColor === 'blue' && "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/10",
        accentColor === 'emerald' && "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10",
        accentColor === 'cyan' && "bg-cyan-500/5 hover:bg-cyan-500/10 border-cyan-500/10",
        accentColor === 'orange' && "bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/10",
        accentColor === 'yellow' && "bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-500/10",
        accentColor === 'pink' && "bg-pink-500/5 hover:bg-pink-500/10 border-pink-500/10",
        accentColor === 'indigo' && "bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/10",
        accentColor === 'primary' && "bg-[var(--admin-primary-muted)] hover:bg-[var(--admin-primary)]/10 border-[var(--admin-primary)]/10",
        className
      )}
    >
      {/* Glow Effect on Hover */}
      <motion.div
        variants={{
          initial: { opacity: 0 },
          hover: { opacity: 1 }
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          "absolute -inset-px rounded-[var(--admin-radius-2xl)] -z-10 blur-md transition-all duration-300",
          accentColor === 'purple' && "bg-purple-500/20",
          accentColor === 'blue' && "bg-blue-500/20",
          accentColor === 'emerald' && "bg-emerald-500/20",
          accentColor === 'orange' && "bg-orange-500/20",
          accentColor === 'pink' && "bg-pink-500/20",
          accentColor === 'indigo' && "bg-indigo-500/20",
          accentColor === 'primary' && "bg-[var(--admin-primary-muted)]"
        )}
      />

      <div className="flex items-start justify-between relative z-10">
        <IconContainer
          icon={icon}
          color={accentColor}
          size="lg"
          isAnimated={false}
          className="group-hover:scale-105 transition-transform duration-300"
        />
        
        {trend && (
          <div className="flex flex-col items-end gap-1">
            <div className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
              trend.isPositive
                ? "bg-[var(--admin-success-muted)] text-[var(--admin-success)]"
                : "bg-[var(--admin-danger-muted)] text-[var(--admin-danger)]"
            )}>
              {trend.isPositive
                ? <IconTrendingUp size={14} stroke={2.5} />
                : <IconTrendingDown size={14} stroke={2.5} />}
              {trend.value}%
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1 relative z-10">
        <p className="text-sm font-semibold text-[var(--admin-text-subtle)] uppercase tracking-wider">{title}</p>
        <div className="text-3xl font-bold text-[var(--admin-text-base)] tracking-tight tabular-nums admin-text-number">
          <AnimatedCounter value={value} />
        </div>
        {trend && (
          <p className="text-xs font-medium text-[var(--admin-text-muted)]">{trend.label}</p>
        )}
      </div>
      
      {/* Border gradient hover effect */}
      <motion.div
        variants={{
          initial: { opacity: 0 },
          hover: { opacity: 1 }
        }}
        className="absolute inset-0 rounded-[var(--admin-radius-2xl)] border-2 border-[var(--admin-primary)]/10 pointer-events-none"
      />
    </motion.div>
  );
}
