"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSearch, IconX, IconLoader2,
  IconShoppingBag, IconShoppingCart, IconUsers, IconCategory2, IconStack2,
  IconTicket, IconBook2, IconStar, IconPhoto, IconSettings,
} from "@tabler/icons-react";
import { SearchService, GroupedSearchResults } from "@/lib/services/search.service";

const TYPE_ICONS: Record<string, React.ElementType> = {
  product:    IconShoppingBag,
  order:      IconShoppingCart,
  customer:   IconUsers,
  category:   IconCategory2,
  collection: IconStack2,
  coupon:     IconTicket,
  article:    IconBook2,
  review:     IconStar,
  media:      IconPhoto,
  cms:        IconSettings,
};

interface ResultGroup {
  label: string;
  key: keyof GroupedSearchResults;
}

const GROUPS: ResultGroup[] = [
  { label: "المنتجات",   key: "products"    },
  { label: "الطلبات",    key: "orders"      },
  { label: "العملاء",    key: "customers"   },
  { label: "المقالات",   key: "articles"    },
  { label: "الأقسام",    key: "categories"  },
  { label: "التشكيلات",  key: "collections" },
  { label: "الكوبونات",  key: "coupons"     },
  { label: "التقييمات",  key: "reviews"     },
  { label: "الوسائط",    key: "media"       },
  { label: "واجهة المتجر", key: "cms"       },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await SearchService.globalSearch(query);
          setResults(res);
        } catch {
          setResults(null);
        } finally {
          setLoading(false);
        }
      } else {
        setResults(null);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const hasResults = results && GROUPS.some(g => (results[g.key] as any[])?.length > 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-[101] flex items-start justify-center px-4 pt-[12vh] pointer-events-none">
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="w-full max-w-xl bg-[var(--admin-bg-card)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-2xl)] shadow-2xl overflow-hidden flex flex-col max-h-[70vh] pointer-events-auto"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-[var(--admin-border-light)]">
                <IconSearch size={16} className="text-[var(--admin-text-subtle)] shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="ابحث عن أي شيء..."
                  className="flex-1 h-12 bg-transparent text-[var(--admin-text-base)] placeholder:text-[var(--admin-text-subtle)] text-sm focus:outline-none"
                />
                {loading && <IconLoader2 size={15} className="animate-spin text-[var(--admin-text-subtle)] shrink-0" />}
                {query && !loading && (
                  <button onClick={() => setQuery("")} className="text-[var(--admin-text-subtle)] hover:text-[var(--admin-text-muted)] transition-colors">
                    <IconX size={15} />
                  </button>
                )}
                <kbd className="text-[10px] font-sans bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] rounded px-1.5 py-0.5 text-[var(--admin-text-subtle)]">ESC</kbd>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
                {!query && (
                  <div className="py-10 text-center text-xs text-[var(--admin-text-subtle)]">
                    ابدأ الكتابة للبحث في كل المنتجات والطلبات والعملاء...
                  </div>
                )}
                {query && !loading && !hasResults && (
                  <div className="py-10 text-center text-xs text-[var(--admin-text-subtle)]">
                    لا توجد نتائج لـ &quot;{query}&quot;
                  </div>
                )}
                {hasResults && GROUPS.map(g => {
                  const items = (results![g.key] as any[]);
                  if (!items?.length) return null;
                  const Icon = TYPE_ICONS[items[0]?.type] ?? IconSettings;
                  return (
                    <div key={g.key} className="mb-3">
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--admin-text-subtle)]">{g.label}</p>
                      {items.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.url)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-bg-elevated)] transition-colors text-start group"
                        >
                          <div className="w-7 h-7 rounded-[var(--admin-radius-sm)] bg-[var(--admin-primary-muted)] flex items-center justify-center text-[var(--admin-primary)] shrink-0">
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[var(--admin-text-base)] font-medium truncate group-hover:text-[var(--admin-primary)] transition-colors">{item.title}</p>
                            {item.subtitle && <p className="text-xs text-[var(--admin-text-subtle)] truncate" dir="ltr">{item.subtitle}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
