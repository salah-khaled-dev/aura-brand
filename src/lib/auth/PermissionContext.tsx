"use client";

/**
 * RBAC enforcement for the admin dashboard (mock-first).
 *
 * The role/permission matrix lives in UsersService (module → {read, write, delete}).
 * This provider resolves the *current* user's effective permissions and exposes
 * `can(module, action)` + `canAccessModule(module)` used to gate navigation,
 * pages and action buttons.
 *
 * Mock auth logs everyone in as the super-admin (full access), so to make
 * enforcement observable there is a "view as role" override (persisted to
 * localStorage). Switching it re-scopes the whole dashboard to that role's
 * permissions — navigation hides, pages block, and write/delete buttons disable.
 *
 * Supabase migration: replace `loadActualRoleId` with the real session→role lookup;
 * everything else stays identical.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { UsersService, MockRole } from '@/lib/services/users.service';
import { AuthService, AuthenticatedUser } from '@/lib/services/auth.service';
import { eventBus } from '@/lib/events/EventBus';
import { RepositoryProvider } from '@/lib/providers/RepositoryProvider';

export type PermissionAction = 'read' | 'write' | 'delete' | 'impersonation';
export type PermissionModule =
  | 'dashboard' | 'analytics' | 'products' | 'inventory' | 'orders'
  | 'customers' | 'finance' | 'marketing' | 'storefront' | 'settings'
  | 'system';

/** Fallback role when no session is present (should not happen behind the auth guard). */
const DEFAULT_ROLE_ID = 'role_1';
const VIEW_AS_STORAGE_KEY = 'aura_admin_view_as_role';

/** Sidebar `permission` strings → role-matrix module. */
const PERMISSION_TO_MODULE: Record<string, PermissionModule> = {
  'dashboard.view': 'dashboard',
  'analytics.view': 'analytics',
  'orders.view': 'orders',
  'customers.view': 'customers',
  'products.view': 'products',
  'reviews.view': 'products',
  'inventory.view': 'inventory',
  'procurement.view': 'inventory',
  'finance.view': 'finance',
  'marketing.view': 'marketing',
  'website.view': 'storefront',
  'admin.view': 'settings',
};

/** Route prefix → module (most specific first). `null` = always allowed. */
const ROUTE_MODULE: Array<[string, PermissionModule | null]> = [
  ['/admin/profile', null],
  ['/admin/analytics', 'analytics'],
  ['/admin/orders', 'orders'],
  ['/admin/customers', 'customers'],
  ['/admin/products', 'products'],
  ['/admin/categories', 'products'],
  ['/admin/collections', 'products'],
  ['/admin/brands', 'products'],
  ['/admin/reviews', 'products'],
  ['/admin/inventory', 'inventory'],
  ['/admin/business/suppliers', 'inventory'],
  ['/admin/business/purchase-orders', 'inventory'],
  ['/admin/business', 'finance'],
  ['/admin/journal', 'marketing'],
  ['/admin/coupons', 'marketing'],
  ['/admin/website', 'storefront'],
  ['/admin/users', 'settings'],
  ['/admin/notifications', 'settings'],
  ['/admin/settings', 'settings'],
  ['/admin', 'dashboard'],
];

export function moduleForPath(pathname: string): PermissionModule | null {
  const match = ROUTE_MODULE.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/') || pathname === prefix);
  // ROUTE_MODULE is ordered specific→general; find returns the first (most specific) match.
  if (!match) return 'dashboard';
  return match[1];
}

export function moduleForSidebarPermission(permission?: string): PermissionModule | null {
  if (!permission) return null;
  return PERMISSION_TO_MODULE[permission] ?? null;
}

interface PermissionContextValue {
  loaded: boolean;
  roles: MockRole[];
  actualRoleId: string;
  viewAsRoleId: string;
  effectiveRole: MockRole | null;
  isViewingAs: boolean;
  setViewAsRoleId: (id: string) => void;
  can: (module: PermissionModule, action?: PermissionAction) => boolean;
  canAccessModule: (module: PermissionModule | null) => boolean;
  canImpersonate: boolean;
  user: AuthenticatedUser | null;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<MockRole[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [actualRoleId, setActualRoleId] = useState<string>(DEFAULT_ROLE_ID);
  const [viewAsRoleId, setViewAsRoleIdState] = useState<string>(DEFAULT_ROLE_ID);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  const loadRoles = useCallback(async () => {
    const data = await UsersService.getRoles();
    setRoles(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // The effective role comes from the authenticated user's role.
    (async () => {
      const currentUser = await AuthService.getCurrentUser();
      if (cancelled) return;
      setUser(currentUser);
      const roleId = currentUser?.roleId ?? DEFAULT_ROLE_ID;
      setActualRoleId(roleId);
      // Restore any "view as" override chosen earlier, else mirror the real role.
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_AS_STORAGE_KEY) : null;
      setViewAsRoleIdState(saved || roleId);
      loadRoles();
    })();
    // Re-scope live when roles/permissions are edited anywhere.
    const unsub = eventBus.subscribe('users.changed', () => { loadRoles(); });
    return () => { cancelled = true; unsub(); };
  }, [loadRoles]);

  // Synchronize authenticated user profile updates in real-time
  useEffect(() => {
    const handleUserUpdated = (updatedUser: AuthenticatedUser) => {
      setUser(updatedUser);
      setActualRoleId(updatedUser.roleId);
    };
    const unsub = eventBus.subscribe('user.updated', handleUserUpdated);
    return () => unsub();
  }, []);

  const actualRole = roles.find(r => r.id === actualRoleId) ?? null;
  const currentUser = user;
  const isPrimaryAdmin = actualRoleId === 'role_1' && currentUser?.isSuperAdmin === true;

  const modules: PermissionModule[] = [
    'dashboard', 'analytics', 'products', 'inventory', 'orders',
    'customers', 'finance', 'marketing', 'storefront', 'settings'
  ];
  const hasFullSystemPermissions = !!(actualRole && modules.every(m => {
    const perm = actualRole.permissions[m];
    return perm && perm.read && perm.write && perm.delete;
  }));
  const canManageRoles = !!(actualRole && actualRole.permissions['settings']?.write && actualRole.permissions['settings']?.delete);
  const hasImpersonationPermission = !!(actualRole && actualRole.permissions['system']?.impersonation);

  const canImpersonate = loaded && isPrimaryAdmin && hasImpersonationPermission && hasFullSystemPermissions && canManageRoles;

  const resetImpersonation = useCallback(() => {
    setViewAsRoleIdState(actualRoleId);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
      window.sessionStorage.removeItem(VIEW_AS_STORAGE_KEY);
      window.sessionStorage.removeItem('viewAsRole');
      window.sessionStorage.removeItem('impersonate');
      
      document.cookie = 'aura_admin_view_as_role=; Max-Age=-99999999; path=/';
      document.cookie = 'viewAsRole=; Max-Age=-99999999; path=/';
      document.cookie = 'impersonate=; Max-Age=-99999999; path=/';

      const url = new URL(window.location.href);
      let searchChanged = false;
      const paramsToClear = ['viewAsRole', 'view-as-role', 'impersonate', 'role', 'roleId'];
      paramsToClear.forEach(p => {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          searchChanged = true;
        }
      });
      if (searchChanged) {
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    }
  }, [actualRoleId]);

  const setViewAsRoleId = useCallback((id: string) => {
    if (!canImpersonate) {
      return;
    }
    setViewAsRoleIdState(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_AS_STORAGE_KEY, id);
  }, [canImpersonate]);

  // Security and Manual bypass listener
  useEffect(() => {
    if (!loaded) return;

    const checkSecurity = () => {
      if (typeof window === 'undefined') return;

      const saved = window.localStorage.getItem(VIEW_AS_STORAGE_KEY);
      const sessionSaved = window.sessionStorage.getItem(VIEW_AS_STORAGE_KEY) || 
                            window.sessionStorage.getItem('viewAsRole') || 
                            window.sessionStorage.getItem('impersonate');
      
      const hasCookieOverride = document.cookie.includes('aura_admin_view_as_role') || 
                                document.cookie.includes('viewAsRole') || 
                                document.cookie.includes('impersonate');

      const urlParams = new URLSearchParams(window.location.search);
      const hasURLParam = ['viewAsRole', 'view-as-role', 'impersonate', 'role', 'roleId'].some(p => urlParams.has(p));

      // 1. If user is NOT allowed to impersonate, check for any override/manipulation
      if (!canImpersonate) {
        if (saved !== null || sessionSaved || hasCookieOverride || hasURLParam || viewAsRoleId !== actualRoleId) {
          resetImpersonation();
        }
      } else {
        // 2. If user IS allowed to impersonate, check if the saved/URL role ID is valid
        if (saved && !roles.some(r => r.id === saved)) {
          resetImpersonation();
        }
        
        // Handle URL parameter impersonation triggering for Super Admin
        const urlRoleId = urlParams.get('viewAsRole') || urlParams.get('view-as-role') || urlParams.get('impersonate') || urlParams.get('role') || urlParams.get('roleId');
        if (urlRoleId && roles.some(r => r.id === urlRoleId) && urlRoleId !== viewAsRoleId) {
          setViewAsRoleId(urlRoleId);
          const url = new URL(window.location.href);
          ['viewAsRole', 'view-as-role', 'impersonate', 'role', 'roleId'].forEach(p => url.searchParams.delete(p));
          window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        }
      }
    };

    checkSecurity();
    window.addEventListener('storage', checkSecurity);
    const interval = setInterval(checkSecurity, 500);

    return () => {
      window.removeEventListener('storage', checkSecurity);
      clearInterval(interval);
    };
  }, [loaded, canImpersonate, viewAsRoleId, actualRoleId, roles, resetImpersonation, setViewAsRoleId]);

  // Log impersonation events
  const prevViewAsRoleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (prevViewAsRoleIdRef.current === null) {
      prevViewAsRoleIdRef.current = viewAsRoleId;
      return;
    }

    if (prevViewAsRoleIdRef.current !== viewAsRoleId) {
      const fromRole = roles.find(r => r.id === prevViewAsRoleIdRef.current)?.nameAr || prevViewAsRoleIdRef.current;
      const toRole = roles.find(r => r.id === viewAsRoleId)?.nameAr || viewAsRoleId;
      const originalUser = user;

      if (originalUser) {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        let platform = 'Unknown';
        if (ua.includes('Windows')) platform = 'Windows';
        else if (ua.includes('Macintosh')) platform = 'macOS';
        else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS';
        else if (ua.includes('Android')) platform = 'Android';
        
        let browser = 'Unknown';
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        let device = 'Desktop';
        if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
          device = 'Mobile';
        }

        RepositoryProvider.activityLog().create({
          staffId: originalUser.id,
          module: 'settings',
          action: 'status_change',
          entityType: 'Impersonation',
          entityId: viewAsRoleId,
          entityLabel: `تغيير عرض الدور من ${fromRole} إلى ${toRole}`,
          changes: {
            role: { before: prevViewAsRoleIdRef.current, after: viewAsRoleId }
          },
          ipAddress: '127.0.0.1',
          device,
          platform,
          browser,
          source: 'web',
          userAgent: ua
        }).catch(err => console.error('Failed to write impersonation log:', err));
      }

      prevViewAsRoleIdRef.current = viewAsRoleId;
    }
  }, [loaded, viewAsRoleId, roles, user]);

  const effectiveRole = roles.find(r => r.id === viewAsRoleId) ?? null;
  const isViewingAs = viewAsRoleId !== actualRoleId;

  const can = useCallback(
    (module: PermissionModule, action: PermissionAction = 'read'): boolean => {
      // Before roles load, don't block (avoids a flash of denied UI).
      if (!loaded || !effectiveRole) return true;
      const perm = effectiveRole.permissions[module];
      if (!perm) return false;
      if (action in perm) {
        return !!perm[action];
      }
      return action === 'read' ? perm.read : action === 'write' ? perm.write : perm.delete;
    },
    [loaded, effectiveRole]
  );

  const canAccessModule = useCallback(
    (module: PermissionModule | null): boolean => {
      if (module === null) return true; // unguarded route (e.g. profile)
      return can(module, 'read');
    },
    [can]
  );

  return (
    <PermissionContext.Provider
      value={{
        loaded,
        roles,
        actualRoleId,
        viewAsRoleId,
        effectiveRole,
        isViewingAs,
        setViewAsRoleId,
        can,
        canAccessModule,
        canImpersonate,
        user,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return ctx;
}
