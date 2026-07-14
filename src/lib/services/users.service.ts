import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

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

// ─── Mock password hashing ───────────────────────────────────────────────────
// Passwords are stored hashed + salted, SEPARATELY from the staff profile, in
// MOCK_CREDENTIALS. This is a mock (djb2) — swap `hashPassword`/`verifyPassword`
// for bcrypt/Supabase Auth later without touching call sites.
function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
export function hashPassword(plain: string): string {
  const salt = Math.random().toString(36).slice(2, 10);
  return `mock$${salt}$${djb2(salt + plain)}`;
}
export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [, salt, hash] = parts;
  return djb2(salt + plain) === hash;
}

export interface PasswordStrength { ok: boolean; message?: string }
export function validatePasswordStrength(pw: string): PasswordStrength {
  if (!pw || pw.length < 6) return { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  return { ok: true };
}

/** Password credential store — keyed by staff id, kept apart from profile data. */
let MOCK_CREDENTIALS: Record<string, string> = {
  staff_1: hashPassword('123456'),
  staff_2: hashPassword('manager123'),
  staff_3: hashPassword('inventory123'),
  staff_4: hashPassword('finance123'),
  staff_5: hashPassword('marketing123'),
};

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

const FULL  = { read: true,  write: true,  delete: true  };
const RW    = { read: true,  write: true,  delete: false };
const RO    = { read: true,  write: false, delete: false };
const NONE  = { read: false, write: false, delete: false };

let MOCK_ROLES: MockRole[] = [
  {
    id: 'role_1', nameAr: 'المسؤول الأول', nameKey: 'administrator',
    descriptionAr: 'صلاحية كاملة على جميع أجزاء النظام', color: 'purple', isSystem: true, staffCount: 1,
    permissions: {
      dashboard: FULL, analytics: FULL, products: FULL, inventory: FULL,
      orders: FULL, customers: FULL, finance: FULL, marketing: FULL, storefront: FULL, settings: FULL,
      system: { read: true, write: true, delete: true, impersonation: true },
    },
  },
  {
    id: 'role_2', nameAr: 'مدير المتجر', nameKey: 'store_manager',
    descriptionAr: 'إدارة المنتجات والطلبات والعملاء دون الوصول للمالية والإعدادات',
    color: 'blue', isSystem: true, staffCount: 1,
    permissions: {
      dashboard: RO, analytics: RO, products: FULL, inventory: RW,
      orders: RW, customers: RW, finance: RO, marketing: RW, storefront: RW, settings: NONE,
    },
  },
  {
    id: 'role_3', nameAr: 'مدير المخزون', nameKey: 'inventory_manager',
    descriptionAr: 'إدارة المخزون والموردين وأوامر الشراء فقط',
    color: 'emerald', isSystem: true, staffCount: 1,
    permissions: {
      dashboard: RO, analytics: NONE, products: RO, inventory: FULL,
      orders: RO, customers: NONE, finance: NONE, marketing: NONE, storefront: NONE, settings: NONE,
    },
  },
  {
    id: 'role_4', nameAr: 'المحاسب المالي', nameKey: 'finance_manager',
    descriptionAr: 'الوصول الكامل للتقارير المالية والمصروفات والأصول',
    color: 'orange', isSystem: true, staffCount: 1,
    permissions: {
      dashboard: RO, analytics: RO, products: RO, inventory: RO,
      orders: RO, customers: RO, finance: FULL, marketing: NONE, storefront: NONE, settings: NONE,
    },
  },
  {
    id: 'role_5', nameAr: 'مدير التسويق', nameKey: 'marketing_manager',
    descriptionAr: 'إدارة الكوبونات والمقالات والمحتوى والواجهة',
    color: 'pink', isSystem: true, staffCount: 1,
    permissions: {
      dashboard: RO, analytics: RO, products: RW, inventory: RO,
      orders: NONE, customers: RO, finance: NONE, marketing: FULL, storefront: FULL, settings: NONE,
    },
  },
  {
    id: 'role_6', nameAr: 'خدمة العملاء', nameKey: 'customer_support',
    descriptionAr: 'الرد على العملاء ومعالجة الطلبات والمرتجعات',
    color: 'cyan', isSystem: true, staffCount: 0,
    permissions: {
      dashboard: RO, analytics: NONE, products: RO, inventory: RO,
      orders: RW, customers: RW, finance: NONE, marketing: NONE, storefront: NONE, settings: NONE,
    },
  },
];

let MOCK_STAFF: MockStaffMember[] = [
  {
    id: 'staff_1', nameAr: 'أحمد العدوي', username: 'admin', email: 'admin@aura.com',
    phone: '+20 100 000 0001', roleId: 'role_1', roleNameAr: 'المسؤول الأول', roleColor: 'purple',
    avatarUrl: null, lastLoginAt: new Date().toISOString(), loginCount: 42,
    isSuperAdmin: true, status: 'active', createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'staff_2', nameAr: 'فاطمة محمود', username: 'manager', email: 'manager@aura.com',
    phone: '+20 100 000 0002', roleId: 'role_2', roleNameAr: 'مدير المتجر', roleColor: 'blue',
    avatarUrl: null, lastLoginAt: new Date(Date.now() - 86400000).toISOString(), loginCount: 28,
    isSuperAdmin: false, status: 'active', createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'staff_3', nameAr: 'مريم حسن', username: 'inventory', email: 'inventory@aura.com',
    phone: '+20 100 000 0003', roleId: 'role_3', roleNameAr: 'مدير المخزون', roleColor: 'emerald',
    avatarUrl: null, lastLoginAt: new Date(Date.now() - 86400000 * 3).toISOString(), loginCount: 15,
    isSuperAdmin: false, status: 'active', createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'staff_4', nameAr: 'سارة علي', username: 'finance', email: 'finance@aura.com',
    phone: '+20 100 000 0004', roleId: 'role_4', roleNameAr: 'المحاسب المالي', roleColor: 'orange',
    avatarUrl: null, lastLoginAt: new Date(Date.now() - 86400000 * 7).toISOString(), loginCount: 9,
    isSuperAdmin: false, status: 'active', createdAt: '2024-04-01T00:00:00Z',
  },
  {
    id: 'staff_5', nameAr: 'نور إبراهيم', username: 'marketing', email: 'marketing@aura.com',
    phone: null, roleId: 'role_5', roleNameAr: 'مدير التسويق', roleColor: 'pink',
    avatarUrl: null, lastLoginAt: null, loginCount: 0,
    isSuperAdmin: false, status: 'inactive', createdAt: '2024-05-01T00:00:00Z',
  },
];

// ─── Persistence ─────────────────────────────────────────────────────────────
// Staff, roles and credentials are loaded from (and written back to) the mock
// storage layer so that newly created users — and their passwords, roles and
// sessions — survive a browser refresh and can log in immediately.
MOCK_STAFF = mockStorage.read('users.staff', MOCK_STAFF);
MOCK_ROLES = mockStorage.read('users.roles', MOCK_ROLES);
MOCK_CREDENTIALS = mockStorage.read('users.credentials', MOCK_CREDENTIALS);

function persistUsers() {
  mockStorage.write('users.staff', MOCK_STAFF);
  mockStorage.write('users.roles', MOCK_ROLES);
  mockStorage.write('users.credentials', MOCK_CREDENTIALS);
}

export const UsersService = {
  async getStaff(): Promise<MockStaffMember[]> {
    await new Promise(r => setTimeout(r, 400));
    return [...MOCK_STAFF];
  },

  async getStaffMember(id: string): Promise<MockStaffMember | undefined> {
    await new Promise(r => setTimeout(r, 200));
    return MOCK_STAFF.find(s => s.id === id);
  },

  /** Username/email uniqueness checks (case-insensitive). */
  isUsernameTaken(username: string, exceptId?: string): boolean {
    const u = username.trim().toLowerCase();
    return MOCK_STAFF.some(s => s.id !== exceptId && s.username.toLowerCase() === u);
  },
  isEmailTaken(email: string, exceptId?: string): boolean {
    const e = email.trim().toLowerCase();
    return MOCK_STAFF.some(s => s.id !== exceptId && s.email.toLowerCase() === e);
  },

  async createStaff(
    data: Omit<MockStaffMember, 'id' | 'loginCount' | 'lastLoginAt' | 'createdAt'>,
    password: string
  ): Promise<MockStaffMember> {
    await new Promise(r => setTimeout(r, 500));

    if (!data.username?.trim()) throw new Error('اسم المستخدم مطلوب');
    if (this.isUsernameTaken(data.username)) throw new Error('اسم المستخدم مستخدم بالفعل');
    if (this.isEmailTaken(data.email)) throw new Error('البريد الإلكتروني مستخدم بالفعل');
    const strength = validatePasswordStrength(password);
    if (!strength.ok) throw new Error(strength.message);

    const role = MOCK_ROLES.find(r => r.id === data.roleId);
    const member: MockStaffMember = {
      ...data,
      username: data.username.trim(),
      roleNameAr: role?.nameAr ?? data.roleNameAr,
      roleColor: role?.color ?? data.roleColor,
      id: `staff_${Date.now()}`,
      loginCount: 0,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };
    MOCK_STAFF = [member, ...MOCK_STAFF];
    MOCK_CREDENTIALS[member.id] = hashPassword(password);
    if (role) {
      MOCK_ROLES = MOCK_ROLES.map(r => r.id === role.id ? { ...r, staffCount: r.staffCount + 1 } : r);
    }
    persistUsers();
    eventBus.emit('users.changed');
    return member;
  },

  /** Stamp last-login + increment login count (called after a successful sign-in). */
  async recordLogin(staffId: string): Promise<void> {
    const idx = MOCK_STAFF.findIndex(s => s.id === staffId);
    if (idx === -1) return;
    MOCK_STAFF = MOCK_STAFF.map(s => s.id === staffId
      ? { ...s, lastLoginAt: new Date().toISOString(), loginCount: s.loginCount + 1 }
      : s);
    persistUsers();
    eventBus.emit('users.changed');
  },

  /** Admin sets/resets a user's password (no current-password check). */
  async setPassword(staffId: string, newPassword: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const strength = validatePasswordStrength(newPassword);
    if (!strength.ok) throw new Error(strength.message);
    if (!MOCK_STAFF.some(s => s.id === staffId)) throw new Error('Staff not found');
    MOCK_CREDENTIALS[staffId] = hashPassword(newPassword);
    persistUsers();
  },

  /** Self-service password change — verifies the current password first. */
  async changePassword(staffId: string, currentPassword: string, newPassword: string): Promise<void> {
    await new Promise(r => setTimeout(r, 400));
    const hash = MOCK_CREDENTIALS[staffId];
    if (!hash || !verifyPassword(currentPassword, hash)) throw new Error('كلمة المرور الحالية غير صحيحة');
    const strength = validatePasswordStrength(newPassword);
    if (!strength.ok) throw new Error(strength.message);
    MOCK_CREDENTIALS[staffId] = hashPassword(newPassword);
    persistUsers();
  },

  async updateStaff(id: string, data: Partial<MockStaffMember>): Promise<MockStaffMember> {
    await new Promise(r => setTimeout(r, 500));
    const idx = MOCK_STAFF.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Staff not found');
    if (data.username && this.isUsernameTaken(data.username, id)) throw new Error('اسم المستخدم مستخدم بالفعل');
    if (data.email && this.isEmailTaken(data.email, id)) throw new Error('البريد الإلكتروني مستخدم بالفعل');
    if (data.roleId && data.roleId !== MOCK_STAFF[idx].roleId) {
      const oldRole = MOCK_ROLES.find(r => r.id === MOCK_STAFF[idx].roleId);
      const newRole = MOCK_ROLES.find(r => r.id === data.roleId);
      if (oldRole) MOCK_ROLES = MOCK_ROLES.map(r => r.id === oldRole.id ? { ...r, staffCount: Math.max(0, r.staffCount - 1) } : r);
      if (newRole) {
        MOCK_ROLES = MOCK_ROLES.map(r => r.id === newRole.id ? { ...r, staffCount: r.staffCount + 1 } : r);
        data = { ...data, roleNameAr: newRole.nameAr, roleColor: newRole.color };
      }
    }
    const updated = { ...MOCK_STAFF[idx], ...data };
    MOCK_STAFF = MOCK_STAFF.map(s => s.id === id ? updated : s);
    persistUsers();
    eventBus.emit('users.changed');
    return updated;
  },

  async deleteStaff(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 500));
    const member = MOCK_STAFF.find(s => s.id === id);
    if (!member) throw new Error('Staff not found');
    if (member.isSuperAdmin) throw new Error('Cannot delete the super admin');
    const role = MOCK_ROLES.find(r => r.id === member.roleId);
    if (role) MOCK_ROLES = MOCK_ROLES.map(r => r.id === role.id ? { ...r, staffCount: Math.max(0, r.staffCount - 1) } : r);
    MOCK_STAFF = MOCK_STAFF.filter(s => s.id !== id);
    delete MOCK_CREDENTIALS[id];
    persistUsers();
    eventBus.emit('users.changed');
  },

  async getRoles(): Promise<MockRole[]> {
    await new Promise(r => setTimeout(r, 300));
    return [...MOCK_ROLES];
  },

  async getRole(id: string): Promise<MockRole | undefined> {
    await new Promise(r => setTimeout(r, 200));
    return MOCK_ROLES.find(r => r.id === id);
  },

  async createRole(data: Omit<MockRole, 'id' | 'staffCount' | 'isSystem'>): Promise<MockRole> {
    await new Promise(r => setTimeout(r, 500));
    const role: MockRole = { ...data, id: `role_${Date.now()}`, staffCount: 0, isSystem: false };
    MOCK_ROLES = [...MOCK_ROLES, role];
    persistUsers();
    eventBus.emit('users.changed');
    return role;
  },

  async updateRole(id: string, data: Partial<Omit<MockRole, 'id' | 'isSystem' | 'nameKey'>>): Promise<MockRole> {
    await new Promise(r => setTimeout(r, 500));
    const idx = MOCK_ROLES.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Role not found');
    const updated = { ...MOCK_ROLES[idx], ...data };
    MOCK_ROLES = MOCK_ROLES.map(r => r.id === id ? updated : r);
    persistUsers();
    eventBus.emit('users.changed');
    return updated;
  },

  async deleteRole(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 500));
    const role = MOCK_ROLES.find(r => r.id === id);
    if (!role) throw new Error('Role not found');
    if (role.isSystem) throw new Error('Cannot delete system roles');
    if (role.staffCount > 0) throw new Error('Cannot delete a role with active staff');
    MOCK_ROLES = MOCK_ROLES.filter(r => r.id !== id);
    persistUsers();
    eventBus.emit('users.changed');
  },
};
