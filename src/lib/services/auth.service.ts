import { createClient } from '@/lib/supabase/client';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import { UsersService } from '@/lib/services/users.service';
import { eventBus } from '@/lib/events/EventBus';

/**
 * Authentication service — the single seam between the admin UI and the auth backend.
 *
 * Backed by Supabase Auth (`supabase.auth.signInWithPassword` / `signOut` / `getUser`).
 * Only `public.profiles` rows with `role` in ('admin', 'super_admin') and
 * `is_active = true` are allowed through — everyone else is signed back out
 * immediately. The granular module-permission matrix (dashboard/products/...)
 * still lives in `UsersService`'s role table; `profiles.staff_role_key` says
 * which of those roles a given profile has, and `super_admin` always maps to
 * the full-access "administrator" role.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_inactive'
  | 'not_authorized'
  | 'email_not_confirmed'
  | 'network'
  | 'session_expired'
  | 'unknown';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  name: string;
  roleId: string;
  roleNameAr: string;
  isSuperAdmin: boolean;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: AuthenticatedUser;
  /** Epoch ms when the underlying Supabase access token expires. */
  expiresAt: number;
}

export interface SignInCredentials {
  /** Supabase Auth signs in by email; usernames aren't modeled in `profiles`. */
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

const supabase = createClient();

const DEFAULT_ROLE_ID = 'role_1';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Last session built by this tab, used so sync-ish callers (updateCurrentUser) have something to merge into. */
let cachedSession: AuthSession | null = null;

async function resolveRole(staffRoleKey: string | null, isSuperAdmin: boolean): Promise<{ roleId: string; roleNameAr: string }> {
  const roles = await UsersService.getRoles();

  if (isSuperAdmin) {
    const administrator = roles.find(r => r.nameKey === 'administrator');
    return { roleId: administrator?.id ?? DEFAULT_ROLE_ID, roleNameAr: administrator?.nameAr ?? 'المسؤول الأول' };
  }

  const matched = staffRoleKey ? roles.find(r => r.nameKey === staffRoleKey) : undefined;
  if (matched) return { roleId: matched.id, roleNameAr: matched.nameAr };

  const fallback = roles.find(r => r.id === DEFAULT_ROLE_ID);
  return { roleId: DEFAULT_ROLE_ID, roleNameAr: fallback?.nameAr ?? 'المسؤول الأول' };
}

function mapSupabaseAuthError(message: string | undefined): AuthErrorCode {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'invalid_credentials';
  if (m.includes('email not confirmed')) return 'email_not_confirmed';
  if (m.includes('failed to fetch') || m.includes('network')) return 'network';
  return 'unknown';
}

/** Loads the profile for a just-authenticated Supabase user and enforces the admin/super_admin gate. */
async function buildSessionFromUserId(userId: string, fallbackEmail: string | null): Promise<AuthSession> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, is_active, staff_role_key')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    await supabase.auth.signOut();
    throw new AuthError('invalid_credentials');
  }
  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    await supabase.auth.signOut();
    throw new AuthError('not_authorized');
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new AuthError('account_inactive');
  }

  const isSuperAdmin = profile.role === 'super_admin';
  const { roleId, roleNameAr } = await resolveRole(profile.staff_role_key, isSuperAdmin);
  const email = profile.email ?? fallbackEmail ?? '';

  const {
    data: { session: supabaseSession },
  } = await supabase.auth.getSession();

  const user: AuthenticatedUser = {
    id: profile.id,
    username: email.split('@')[0] || 'admin',
    email,
    name: profile.full_name || email || 'مستخدم',
    roleId,
    roleNameAr,
    isSuperAdmin,
    avatarUrl: profile.avatar_url,
  };

  return {
    user,
    expiresAt: supabaseSession?.expires_at ? supabaseSession.expires_at * 1000 : Date.now() + DAY_MS,
  };
}

export const AuthService = {
  /** Authenticate with email + password against Supabase Auth. Throws {@link AuthError}. */
  async signInWithPassword({ identifier, password }: SignInCredentials): Promise<AuthSession> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new AuthError('network');
    }
    const email = identifier?.trim();
    if (!email || !password) {
      throw new AuthError('invalid_credentials');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new AuthError(mapSupabaseAuthError(error?.message));
    }

    try {
      const session = await buildSessionFromUserId(data.user.id, data.user.email ?? null);
      cachedSession = session;
      eventBus.emit('user.updated', session.user);
      return session;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('unknown');
    }
  },

  /** Optimistic local update of the cached user (e.g. after saving profile fields), best-effort persisted to `profiles`. */
  updateCurrentUser(userData: Partial<AuthenticatedUser>): AuthenticatedUser | null {
    if (!cachedSession) return null;
    cachedSession = { ...cachedSession, user: { ...cachedSession.user, ...userData } };
    eventBus.emit('user.updated', cachedSession.user);

    const patch: TablesUpdate<'profiles'> = {};
    if (userData.name !== undefined) patch.full_name = userData.name;
    if (userData.avatarUrl !== undefined) patch.avatar_url = userData.avatarUrl;
    if (Object.keys(patch).length > 0) {
      void supabase.from('profiles').update(patch).eq('id', cachedSession.user.id);
    }

    return cachedSession.user;
  },

  async signOut(): Promise<void> {
    cachedSession = null;
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('aura_admin_view_as_role');
      window.sessionStorage.removeItem('aura_admin_view_as_role');
      window.sessionStorage.removeItem('viewAsRole');
      window.sessionStorage.removeItem('impersonate');
      document.cookie = 'aura_admin_view_as_role=; Max-Age=-99999999; path=/';
      document.cookie = 'viewAsRole=; Max-Age=-99999999; path=/';
      document.cookie = 'impersonate=; Max-Age=-99999999; path=/';
    }
  },

  /** The current session if a valid, authorized Supabase session exists; null (and signed out) otherwise. */
  async getSession(): Promise<AuthSession | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      cachedSession = null;
      return null;
    }
    try {
      const session = await buildSessionFromUserId(user.id, user.email ?? null);
      cachedSession = session;
      return session;
    } catch {
      cachedSession = null;
      return null;
    }
  },

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  },

  /** Re-verifies the current password via sign-in, then updates it. Throws a plain Error with an Arabic message on failure. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const email = cachedSession?.user.email;
    if (!email) throw new Error('انتهت الجلسة، يرجى تسجيل الدخول من جديد');

    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) throw new Error('كلمة المرور الحالية غير صحيحة');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },
};
