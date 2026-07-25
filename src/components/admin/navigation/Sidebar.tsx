"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLayoutDashboard, IconChartBar,
  IconShoppingCart, IconUsers,
  IconShoppingBag, IconCategory2, IconStack2, IconAward, IconStar,
  IconPackage, IconArrowsExchange,
  IconTruck, IconFileInvoice,
  IconReportMoney, IconReceipt2, IconCoin, IconBuilding, IconStack, IconChartPie,
  IconTicket, IconBook2,
  IconWorld,
  IconSettings, IconBell, IconUsersGroup, IconShieldCheck, IconHistory,
  IconSparkles, IconChevronDown, IconChevronLeft, IconChevronRight, IconLogout,
} from "@tabler/icons-react";
import { adminAr } from "@/lib/i18n/admin-ar";
import { cn } from "@/utils/cn";
import { IconContainer, IconColor } from "../ui/IconContainer";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import type { FeatureFlags } from "@/types/feature-flags";
import { usePermissions, moduleForSidebarPermission } from "@/lib/auth/PermissionContext";
import { AuthService } from "@/lib/services/auth.service";

interface NavItem {
  nameKey: string;
  icon: React.ElementType;
  path: string;
  color: IconColor;
  /** Feature flag that gates visibility (see useFeatureFlag). */
  flag?: string;
  /**
   * Permission required to see/use this item. Declarative only for now —
   * the next ERP phase will filter `visibleItems` by the current user's
   * permissions alongside the existing feature-flag filter. Plug new
   * modules in here without another sidebar redesign.
   */
  permission?: string;
  subItems?: { nameKey: string; path: string }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Single source of truth for the admin navigation. Every item points to a real
// route — no placeholders, no dead links. Groups map 1:1 to ERP domains.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { nameKey: "dashboard", icon: IconLayoutDashboard, path: "/admin",           color: "purple", permission: "dashboard.view" },
      { nameKey: "analytics", icon: IconChartBar,        path: "/admin/analytics",  color: "pink",   flag: "enableAnalytics", permission: "analytics.view" },
    ]
  },
  {
    label: "المبيعات",
    items: [
      { nameKey: "orders",    icon: IconShoppingCart, path: "/admin/orders",    color: "blue", flag: "enableOrders", permission: "orders.view"    },
      { nameKey: "customers", icon: IconUsers,        path: "/admin/customers", color: "cyan", flag: "enableCRM",    permission: "customers.view" },
    ]
  },
  {
    label: "الكتالوج",
    items: [
      { nameKey: "products",    icon: IconShoppingBag, path: "/admin/products",    color: "emerald", flag: "enableProducts", permission: "products.view" },
      { nameKey: "categories",  icon: IconCategory2,   path: "/admin/categories",  color: "cyan",    flag: "enableProducts", permission: "products.view" },
      { nameKey: "collections", icon: IconStack2,      path: "/admin/collections", color: "indigo",  flag: "enableProducts", permission: "products.view" },
      { nameKey: "brands",      icon: IconAward,       path: "/admin/brands",      color: "orange",  flag: "enableProducts", permission: "products.view" },
      { nameKey: "reviews",     icon: IconStar,        path: "/admin/reviews",     color: "yellow",  flag: "enableReviews",  permission: "reviews.view"  },
    ]
  },
  {
    label: "المخزون",
    items: [
      { nameKey: "inventory",      icon: IconPackage,        path: "/admin/inventory",                 color: "orange",  flag: "enableInventory",   permission: "inventory.view"   },
      { nameKey: "suppliers",      icon: IconTruck,          path: "/admin/business/suppliers",        color: "slate",   flag: "enableProcurement", permission: "procurement.view" },
      { nameKey: "purchaseOrders", icon: IconFileInvoice,    path: "/admin/business/purchase-orders",  color: "indigo",  flag: "enableProcurement", permission: "procurement.view" },
      { nameKey: "stockMovements", icon: IconArrowsExchange, path: "/admin/inventory/stock-movements", color: "warning", flag: "enableInventory",   permission: "inventory.view"   },
    ]
  },
  {
    label: "المالية",
    items: [
      { nameKey: "financeOverview",      icon: IconReportMoney, path: "/admin/business",             color: "purple",  flag: "enableFinance", permission: "finance.view" },
      { nameKey: "businessExpenses",     icon: IconReceipt2,    path: "/admin/business/expenses",    color: "danger",  flag: "enableFinance", permission: "finance.view" },
      { nameKey: "businessCapital",      icon: IconCoin,        path: "/admin/business/capital",     color: "yellow",  flag: "enableFinance", permission: "finance.view" },
      { nameKey: "businessAssets",       icon: IconBuilding,    path: "/admin/business/assets",      color: "blue",    flag: "enableFinance", permission: "finance.view" },
      { nameKey: "businessLiabilities",  icon: IconStack,       path: "/admin/business/liabilities", color: "orange",  flag: "enableFinance", permission: "finance.view" },
      { nameKey: "businessPnL",          icon: IconChartPie,    path: "/admin/business/pnl",         color: "emerald", flag: "enableFinance", permission: "finance.view" },
    ]
  },
  {
    label: "التسويق",
    items: [
      { nameKey: "coupons", icon: IconTicket, path: "/admin/coupons", color: "orange", flag: "enableCoupons", permission: "marketing.view" },
      { nameKey: "journal", icon: IconBook2,  path: "/admin/journal", color: "pink",   flag: "enableBlog",    permission: "marketing.view" },
    ]
  },
  {
    label: "الموقع",
    items: [
      { nameKey: "websiteManager", icon: IconWorld, path: "/admin/website", color: "indigo", flag: "enableCMS", permission: "website.view" },
    ]
  },
  {
    label: "الإدارة",
    items: [
      { nameKey: "users",         icon: IconUsersGroup,  path: "/admin/users",         color: "blue",   flag: "enableRBAC", permission: "admin.view" },
      { nameKey: "roles",         icon: IconShieldCheck, path: "/admin/users/roles",   color: "purple", flag: "enableRBAC", permission: "admin.view" },
      { nameKey: "notifications", icon: IconBell,        path: "/admin/notifications", color: "indigo", permission: "admin.view" },
      { nameKey: "activityLog",   icon: IconHistory,     path: "/admin/activity-log",  color: "slate",  permission: "admin.view" },
      { nameKey: "settings",      icon: IconSettings,    path: "/admin/settings",      color: "slate",  permission: "admin.view" },
    ]
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
}

function NavItemComponent({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(isActive);
  const Icon = item.icon;
  const hasSubItems = !!item.subItems?.length;
  const pathname = usePathname();

  React.useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  const toggleOpen = (e: React.MouseEvent) => {
    if (hasSubItems) { e.preventDefault(); setIsOpen(!isOpen); }
  };

  const content = (
    <div
      className={cn(
        "relative flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--admin-radius-lg)] transition-all duration-200 select-none cursor-pointer",
        isCollapsed && "justify-center px-1.5",
        isActive && !hasSubItems
          ? "bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] shadow-sm"
          : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-active)] hover:shadow-[var(--admin-shadow-sm)]"
      )}
    >
      {isActive && !isCollapsed && !hasSubItems && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute -left-1 top-2 bottom-2 w-1.5 rounded-full bg-[var(--admin-primary)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {isActive && isCollapsed && (
        <motion.span
          layoutId="sidebar-active-pill-col"
          className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-[var(--admin-primary)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <IconContainer
        icon={<Icon stroke={isActive && !hasSubItems ? 2.5 : 1.75} />}
        color={item.color}
        size={isCollapsed ? "sm" : "xs"}
        className={cn(
          !(isActive && !hasSubItems) && "group-hover:shadow-[var(--admin-shadow-sm)] group-hover:scale-110 transition-transform"
        )}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[13.5px] font-medium whitespace-nowrap overflow-hidden flex-1 flex items-center justify-between"
          >
            <span>{(adminAr.sidebar as Record<string, string>)[item.nameKey] ?? item.nameKey}</span>
            {hasSubItems && (
              <IconChevronDown
                size={16}
                className={cn("transition-transform duration-200", isOpen && "rotate-180")}
              />
            )}
          </motion.span>
        )}
      </AnimatePresence>

      {isCollapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--admin-bg-surface)] border border-[var(--admin-border-base)] text-[var(--admin-text-base)] font-medium text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-[var(--admin-shadow-lg)]">
          {(adminAr.sidebar as Record<string, string>)[item.nameKey] ?? item.nameKey}
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-1">
      {hasSubItems ? (
        <div onClick={toggleOpen} className="block group">{content}</div>
      ) : (
        <Link href={item.path} className="block group">{content}</Link>
      )}

      {hasSubItems && !isCollapsed && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 ml-[11px] pl-[15px] border-l-2 border-[var(--admin-border-base)] flex flex-col gap-1">
                {item.subItems!.map((sub) => {
                  const basePath = sub.path.split('?')[0];
                  const isSubActive = pathname === basePath || pathname.startsWith(basePath + '/');
                  return (
                    <Link key={sub.nameKey} href={sub.path} className="block group/sub">
                      <div className={cn(
                        "py-1.5 px-2 rounded-md text-[12.5px] font-medium transition-colors",
                        isSubActive
                          ? "text-[var(--admin-primary)] bg-[var(--admin-primary-muted)]/50"
                          : "text-[var(--admin-text-subtle)] hover:text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-active)]"
                      )}>
                        {(adminAr.sidebar as Record<string, string>)[sub.nameKey] ?? sub.nameKey}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function SidebarContent({
  isCollapsed,
  setIsCollapsed,
  onClose,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { isEnabled } = useFeatureFlag();
  const { canAccessModule, roles, viewAsRoleId, setViewAsRoleId, isViewingAs, canImpersonate, user } = usePermissions();

  const handleLogout = async () => {
    await AuthService.signOut();
    window.location.href = "/admin/login";
  };

  return (
    <div className="flex h-full flex-col bg-[var(--admin-bg-sidebar)] overflow-hidden relative">
      {/* Brand header */}
      <div className={cn(
        "flex items-center gap-3 h-[64px] shrink-0 px-4",
        isCollapsed && "justify-center px-2"
      )}>
        <div className="w-8 h-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-primary)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--admin-primary)]/30">
          <IconSparkles size={18} stroke={2} className="text-white" />
        </div>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-[var(--admin-text-base)] font-bold text-[15px] tracking-tight whitespace-nowrap leading-tight">AURA Admin</p>
              <p className="text-[var(--admin-primary)] font-medium text-[10px] whitespace-nowrap">Enterprise ERP</p>
            </motion.div>
          )}
        </AnimatePresence>
        {!isCollapsed && (
          <button
            onClick={() => { setIsCollapsed(true); onClose?.(); }}
            className="hidden md:flex ms-auto p-1.5 rounded-[var(--admin-radius-md)] text-[var(--admin-text-subtle)] hover:text-[var(--admin-text-base)] bg-[var(--admin-bg-surface)] hover:bg-[var(--admin-bg-active)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)] transition-all hover:shadow-[var(--admin-shadow-md)]"
          >
            <IconChevronRight size={18} stroke={2} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="hidden md:flex justify-center pb-4 pt-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-[var(--admin-radius-md)] text-[var(--admin-text-subtle)] hover:text-[var(--admin-text-base)] bg-[var(--admin-bg-surface)] hover:bg-[var(--admin-bg-active)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)] transition-all hover:shadow-[var(--admin-shadow-md)]"
          >
            <IconChevronLeft size={18} stroke={2} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        {NAV_GROUPS.map((group, groupIdx) => {
          const visibleItems = group.items.filter(
            item =>
              (!item.flag || isEnabled(item.flag as keyof FeatureFlags)) &&
              canAccessModule(moduleForSidebarPermission(item.permission))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className={cn("mb-6", isCollapsed && "mb-4")}>
              <AnimatePresence initial={false}>
                {!isCollapsed && group.label && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-2 mb-1.5 text-[10px] font-semibold text-[var(--admin-text-subtle)] uppercase tracking-wider overflow-hidden whitespace-nowrap"
                  >
                    {group.label}
                  </motion.div>
                )}
              </AnimatePresence>
              {isCollapsed && group.label && (
                <div className="mx-auto mb-3 mt-1 w-5 h-px bg-[var(--admin-border-light)]" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavItemComponent
                    key={item.nameKey}
                    item={item}
                    isActive={
                      item.path === '/admin'
                        ? pathname === '/admin'
                        : pathname === item.path || pathname.startsWith(item.path + '/')
                    }
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--admin-border-light)] shrink-0 bg-[var(--admin-bg-surface)] space-y-2">
        {user && (
          isCollapsed ? (
            <div className="flex justify-center py-1">
              <img
                src={user.avatarUrl || "https://api.dicebear.com/7.x/notionists/svg?seed=Admin"}
                alt={user.name}
                className="w-7.5 h-7.5 rounded-full bg-[var(--admin-primary-muted)] border border-[var(--admin-border-base)]"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)]">
              <img
                src={user.avatarUrl || "https://api.dicebear.com/7.x/notionists/svg?seed=Admin"}
                alt={user.name}
                className="w-7.5 h-7.5 rounded-full bg-[var(--admin-primary-muted)] border border-[var(--admin-border-base)] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--admin-text-base)] truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-[var(--admin-text-muted)] truncate mt-0.5">@{user.username}</p>
              </div>
            </div>
          )
        )}

        {/* RBAC "view as role" switch — lets you preview the dashboard under any role's permissions */}
        {!isCollapsed && roles.length > 0 && canImpersonate && (
          <div className={cn("rounded-[var(--admin-radius-md)] border px-2 py-1.5", isViewingAs ? "border-[var(--admin-warning)] bg-[var(--admin-warning-muted)]" : "border-[var(--admin-border-base)] bg-[var(--admin-bg-base)]")}>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--admin-text-subtle)] uppercase tracking-wider mb-1">
              <IconShieldCheck size={12} /> العرض كدور
            </label>
            <select
              value={viewAsRoleId}
              onChange={(e) => setViewAsRoleId(e.target.value)}
              className="w-full bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-base)] rounded text-xs text-[var(--admin-text-base)] px-2 py-1 outline-none focus:border-[var(--admin-primary)]"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nameAr}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--admin-radius-lg)] text-[var(--admin-text-muted)]",
            "hover:bg-[var(--admin-danger-muted)] hover:text-[var(--admin-danger)] transition-all duration-200 group",
            isCollapsed && "justify-center px-1.5"
          )}
        >
          <IconLogout size={18} stroke={1.75} className="shrink-0" />
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden"
              >
                {adminAr.sidebar.logout}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 76 : 250 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="hidden md:block h-screen sticky top-0 z-40 shrink-0 p-3 pe-0"
      >
        <div className="h-full w-full rounded-[var(--admin-radius-2xl)] overflow-hidden shadow-[var(--admin-shadow-float)] border border-[var(--admin-border-base)] relative">
          <SidebarContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B1220]/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-y-0 end-0 w-[260px] z-50 md:hidden shadow-[var(--admin-shadow-float)]"
          >
            <div className="h-full w-full bg-[var(--admin-bg-sidebar)] border-l border-[var(--admin-border-base)]">
              <SidebarContent
                isCollapsed={false}
                setIsCollapsed={() => {}}
                onClose={() => setIsMobileOpen(false)}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
