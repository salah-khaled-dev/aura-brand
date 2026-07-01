"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome, IconFileText, IconStack2, IconSlideshow, IconSitemap,
  IconPhoto, IconSearch, IconArrowsRightLeft, IconPalette,
  IconLayoutBottombar, IconBuildingStore,
} from "@tabler/icons-react";
import { adminAr } from "@/lib/i18n/admin-ar";
import { cn } from "@/utils/cn";

interface WebsiteTab {
  key: string;
  path: string;
  icon: React.ElementType;
}

// Tab order is fixed by product spec. Each tab is a real nested route under
// /admin/website — add a new storefront surface by adding one entry + page.
const TABS: WebsiteTab[] = [
  { key: "home",         path: "/admin/website/home",        icon: IconHome },
  { key: "pages",        path: "/admin/website/pages",       icon: IconFileText },
  { key: "navigation",   path: "/admin/website/navigation",  icon: IconSitemap },
  { key: "media",        path: "/admin/website/media",       icon: IconPhoto },
  { key: "seo",          path: "/admin/website/seo",         icon: IconSearch },
  { key: "appearance",   path: "/admin/website/appearance",  icon: IconPalette },
  { key: "footer",       path: "/admin/website/footer",      icon: IconLayoutBottombar },
  { key: "storeSettings", path: "/admin/website/settings",   icon: IconBuildingStore },
];

const labels = adminAr.sidebar as Record<string, string>;

export function WebsiteManagerTabs() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pt-1 pb-2 bg-[var(--admin-bg-base)]/85 backdrop-blur-md border-b border-[var(--admin-border-base)]">
      <nav className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2 rounded-[var(--admin-radius-lg)] text-[13px] font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "text-[var(--admin-primary)] bg-[var(--admin-primary-muted)]"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-active)]"
              )}
            >
              <Icon size={17} stroke={isActive ? 2.4 : 1.8} className="shrink-0" />
              <span>{labels[tab.key] ?? tab.key}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
