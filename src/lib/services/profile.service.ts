import { createClient } from '@/lib/supabase/client';
import type { TablesUpdate, Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface Session {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface ProfilePreferences {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar: string;
  phone: string;
  bio: string;
  preferences: ProfilePreferences;
  sessions: Session[];
}

const supabase = createClient();

const DEFAULT_PREFERENCES: ProfilePreferences = { language: 'ar', theme: 'system', emailNotifications: true, pushNotifications: false };

/**
 * Real Supabase Auth exposes only the caller's own current session
 * client-side — there is no client API to list every device/session for an
 * account (that requires the Admin API, server-side, with the service-role
 * key). So unlike the old mock (which showed a fabricated 2-device list),
 * this always returns at most one real entry: the session actually making
 * this request, with its real user agent — no invented devices/locations.
 */
async function getCurrentSessionEntry(): Promise<Session[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];
  return [
    {
      id: session.access_token.slice(0, 12),
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'غير معروف',
      location: 'غير معروف',
      ip: 'غير متاح',
      lastActive: new Date().toISOString(),
      isCurrent: true,
    },
  ];
}

export const ProfileService = {
  async getProfile(): Promise<Profile> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: row, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, phone, avatar_url, role, bio, preferences')
      .eq('id', user.id)
      .single();
    if (error) throw error;

    const sessions = await getCurrentSessionEntry();

    return {
      id: row.id,
      name: row.full_name ?? '',
      username: row.username ?? row.email.split('@')[0],
      email: row.email,
      role: row.role,
      avatar: row.avatar_url ?? '',
      phone: row.phone ?? '',
      bio: row.bio,
      preferences: { ...DEFAULT_PREFERENCES, ...(row.preferences as unknown as Partial<ProfilePreferences>) },
      sessions,
    };
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const patch: TablesUpdate<'profiles'> = {};
    if (data.name !== undefined) patch.full_name = data.name;
    if (data.username !== undefined) patch.username = data.username;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatar !== undefined) patch.avatar_url = data.avatar;
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.preferences !== undefined) {
      const current = await this.getProfile();
      patch.preferences = { ...current.preferences, ...data.preferences } as unknown as Json;
    }

    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) throw error;

    const updated = await this.getProfile();
    eventBus.emit('profile.updated', updated);
    return updated;
  },

  async updatePreferences(prefs: Partial<ProfilePreferences>): Promise<Profile> {
    return this.updateProfile({ preferences: prefs as ProfilePreferences });
  },

  /** Verifies the current password via a real re-auth, then sets the new one through Supabase Auth. */
  async updatePassword(currentPass: string, newPass: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('Not authenticated');

    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPass });
    if (verifyError) throw new Error('كلمة المرور الحالية غير صحيحة');

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  },

  /** Only ever one real session to terminate (see getCurrentSessionEntry) — signs the current session out. */
  async terminateSession(_id: string): Promise<void> {
    await supabase.auth.signOut();
  },
};
