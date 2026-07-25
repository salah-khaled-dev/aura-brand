import { eventBus } from '@/lib/events/EventBus';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Staff directory + role/permission matrix — backed by Supabase (`profiles`
 * for staff, `roles` for the module → {read, write, delete} matrix). Auth
 * (password storage, sign-in) is entirely owned by Supabase Auth; nothing
 * here stores or checks credentials.
 *
 * Names (`MockStaffMember`, `MockRole`, `UsersService`) are kept as-is even
 * though the backing store is real now — PermissionContext, the users/roles
 * admin pages and profile page all import these directly.
 */

export interface MockStaffMember {
  id: string;
  nameAr: string;
  username: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleNameAr: string;
  roleColor: string;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  isSuperAdmin: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PasswordStrength { ok: boolean; message?: string }
export function validatePasswordStrength(pw: string): PasswordStrength {
  if (!pw || pw.length < 6) return { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  return { ok: true };
}

export interface MockRole {
  id: string;
  nameAr: string;
  nameKey: string;
  descriptionAr: string;
  color: string;
  isSystem: boolean;
  staffCount: number;
  permissions: Record<string, { read: boolean; write: boolean; delete: boolean; [action: string]: boolean }>;
}

export const PERMISSION_MODULES_AR: Record<string, string> = {
  dashboard:  'لوحة التحكم',
  analytics:  'التحليلات',
  products:   'المنتجات',
  inventory:  'المخزون',
  orders:     'الطلبات',
  customers:  'العملاء',
  finance:    'المالية',
  marketing:  'التسويق',
  storefront: 'الواجهة',
  settings:   'الإعدادات',
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type RoleRow = Database['public']['Tables']['roles']['Row'];

const supabase = createClient();

function roleFromRow(row: RoleRow, staffCount: number): MockRole {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameKey: row.name_key,
    descriptionAr: row.description_ar,
    color: row.color,
    isSystem: row.is_system,
    staffCount,
    permissions: row.permissions,
  };
}

/** A staff profile's effective role key — super_admin always maps to 'administrator'. */
function effectiveRoleKey(profile: Pick<ProfileRow, 'role' | 'staff_role_key'>): string | null {
  return profile.role === 'super_admin' ? 'administrator' : profile.staff_role_key;
}

function staffFromRow(row: ProfileRow, roles: RoleRow[]): MockStaffMember {
  const role = roles.find(r => r.name_key === effectiveRoleKey(row));
  return {
    id: row.id,
    nameAr: row.full_name ?? '',
    username: row.username ?? row.email.split('@')[0],
    email: row.email,
    phone: row.phone,
    roleId: role?.id ?? '',
    roleNameAr: role?.name_ar ?? '',
    roleColor: role?.color ?? 'blue',
    avatarUrl: row.avatar_url,
    lastLoginAt: null,
    loginCount: 0,
    isSuperAdmin: row.role === 'super_admin',
    status: row.is_active ? 'active' : 'inactive',
    createdAt: row.created_at,
  };
}

async function fetchStaffRows(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchRoleRows(): Promise<RoleRow[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function countStaffForRole(roleKey: string, staff: ProfileRow[]): number {
  return staff.filter(s => effectiveRoleKey(s) === roleKey).length;
}

export const UsersService = {
  async getStaff(): Promise<MockStaffMember[]> {
    const [staff, roles] = await Promise.all([fetchStaffRows(), fetchRoleRows()]);
    return staff.map(row => staffFromRow(row, roles));
  },

  async getStaffMember(id: string): Promise<MockStaffMember | undefined> {
    const staff = await this.getStaff();
    return staff.find(s => s.id === id);
  },

  async isUsernameTaken(username: string, exceptId?: string): Promise<boolean> {
    const staff = await fetchStaffRows();
    const u = username.trim().toLowerCase();
    return staff.some(s => s.id !== exceptId && (s.username ?? s.email.split('@')[0]).toLowerCase() === u);
  },
  async isEmailTaken(email: string, exceptId?: string): Promise<boolean> {
    const staff = await fetchStaffRows();
    const e = email.trim().toLowerCase();
    return staff.some(s => s.id !== exceptId && s.email.toLowerCase() === e);
  },

  async createStaff(
    data: Omit<MockStaffMember, 'id' | 'loginCount' | 'lastLoginAt' | 'createdAt'>,
    password: string
  ): Promise<MockStaffMember> {
    if (!data.username?.trim()) throw new Error('اسم المستخدم مطلوب');
    if (await this.isUsernameTaken(data.username)) throw new Error('اسم المستخدم مستخدم بالفعل');
    if (await this.isEmailTaken(data.email)) throw new Error('البريد الإلكتروني مستخدم بالفعل');
    const strength = validatePasswordStrength(password);
    if (!strength.ok) throw new Error(strength.message);

    const roles = await fetchRoleRows();
    const role = roles.find(r => r.id === data.roleId);

    // Creates the real Supabase Auth user + profile in one step (service role,
    // since only a trusted server can call auth.admin.createUser).
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password,
        full_name: data.nameAr,
        username: data.username.trim(),
        phone: data.phone,
        avatar_url: data.avatarUrl,
        staff_role_key: role?.name_key ?? null,
        is_active: data.status === 'active',
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? 'فشل إنشاء المستخدم في نظام الدخول');

    eventBus.emit('users.changed');
    return staffFromRow(result.profile as ProfileRow, roles);
  },

  /** Admin sets/resets a user's password (no current-password check). */
  async setPassword(staffId: string, newPassword: string): Promise<void> {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.ok) throw new Error(strength.message);
    const res = await fetch(`/api/admin/staff/${staffId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      const result = await res.json().catch(() => null);
      throw new Error(result?.error ?? 'فشل تحديث كلمة المرور');
    }
  },

  async updateStaff(id: string, data: Partial<MockStaffMember>): Promise<MockStaffMember> {
    if (data.username && (await this.isUsernameTaken(data.username, id))) throw new Error('اسم المستخدم مستخدم بالفعل');
    if (data.email && (await this.isEmailTaken(data.email, id))) throw new Error('البريد الإلكتروني مستخدم بالفعل');

    const roles = await fetchRoleRows();
    const newRole = data.roleId ? roles.find(r => r.id === data.roleId) : undefined;

    const patch: Database['public']['Tables']['profiles']['Update'] = {};
    if (data.nameAr !== undefined) patch.full_name = data.nameAr;
    if (data.username !== undefined) patch.username = data.username;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
    if (data.status !== undefined) patch.is_active = data.status === 'active';
    if (newRole) patch.staff_role_key = newRole.name_key;

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error('Staff not found');

    eventBus.emit('users.changed');
    return staffFromRow(updated, roles);
  },

  async deleteStaff(id: string): Promise<void> {
    const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const result = await res.json().catch(() => null);
      throw new Error(result?.error ?? 'فشل حذف المستخدم');
    }
    eventBus.emit('users.changed');
  },

  async getRoles(): Promise<MockRole[]> {
    const [roles, staff] = await Promise.all([fetchRoleRows(), fetchStaffRows()]);
    return roles.map(r => roleFromRow(r, countStaffForRole(r.name_key, staff)));
  },

  async getRole(id: string): Promise<MockRole | undefined> {
    const roles = await this.getRoles();
    return roles.find(r => r.id === id);
  },

  async createRole(data: Omit<MockRole, 'id' | 'staffCount' | 'isSystem'>): Promise<MockRole> {
    const row: Database['public']['Tables']['roles']['Insert'] = {
      id: `role_${Date.now()}`,
      name_ar: data.nameAr,
      name_key: data.nameKey,
      description_ar: data.descriptionAr,
      color: data.color,
      is_system: false,
      permissions: data.permissions,
    };
    const { data: created, error } = await supabase.from('roles').insert(row).select('*').single();
    if (error) throw new Error(error.message);
    eventBus.emit('users.changed');
    return roleFromRow(created, 0);
  },

  async updateRole(id: string, data: Partial<Omit<MockRole, 'id' | 'isSystem' | 'nameKey'>>): Promise<MockRole> {
    const patch: Database['public']['Tables']['roles']['Update'] = {};
    if (data.nameAr !== undefined) patch.name_ar = data.nameAr;
    if (data.descriptionAr !== undefined) patch.description_ar = data.descriptionAr;
    if (data.color !== undefined) patch.color = data.color;
    if (data.permissions !== undefined) patch.permissions = data.permissions;

    const { data: updated, error } = await supabase.from('roles').update(patch).eq('id', id).select('*').single();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error('Role not found');

    eventBus.emit('users.changed');
    const staff = await fetchStaffRows();
    return roleFromRow(updated, countStaffForRole(updated.name_key, staff));
  },

  async deleteRole(id: string): Promise<void> {
    const [roles, staff] = await Promise.all([fetchRoleRows(), fetchStaffRows()]);
    const role = roles.find(r => r.id === id);
    if (!role) throw new Error('Role not found');
    if (role.is_system) throw new Error('Cannot delete system roles');
    if (countStaffForRole(role.name_key, staff) > 0) throw new Error('Cannot delete a role with active staff');

    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) throw new Error(error.message);
    eventBus.emit('users.changed');
  },
};
