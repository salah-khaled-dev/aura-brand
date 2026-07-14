"use client";

import React, { useState, useEffect } from 'react';
import { adminAr } from '@/lib/i18n/admin-ar';
import { ProfileService } from '@/lib/services/profile.service';
import { Profile } from '@/data/mock/profile';
import { AuthService } from '@/lib/services/auth.service';
import { usePermissions } from '@/lib/auth/PermissionContext';
import { UsersService, MockStaffMember, MockRole, PERMISSION_MODULES_AR } from '@/lib/services/users.service';
import { AvatarUpload } from '@/components/admin/ui/AvatarUpload';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/formatters';

// SaaS UI Components
import { PageHeader, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Button } from '@/components/admin/design-system/Button';
import { Input } from '@/components/admin/design-system/Input';
import { Badge } from '@/components/admin/design-system/Badge';

// Tabler Icons
import { 
  IconUser, 
  IconShield, 
  IconDevices, 
  IconDeviceFloppy, 
  IconDeviceLaptop, 
  IconDeviceMobile,
  IconTrash,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react';

export default function ProfilePage() {
  const { setTheme } = useTheme();
  const { user } = usePermissions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffRecord, setStaffRecord] = useState<MockStaffMember | null>(null);
  const [roleRecord, setRoleRecord] = useState<MockRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'sessions' | 'preferences'>('personal');

  // Security Form State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile(user);
    }
  }, [user]);

  async function loadProfile(currentUser: any) {
    setLoading(true);
    try {
      const data = await ProfileService.getProfile();
      setProfile(data);
      // Pull the authenticated user's role/account facts for the read-only account panel.
      const [staff, role] = await Promise.all([
        UsersService.getStaffMember(currentUser.id),
        UsersService.getRole(currentUser.roleId),
      ]);
      setStaffRecord(staff ?? null);
      setRoleRecord(role ?? null);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await ProfileService.updateProfile({
        name: profile.name,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        bio: profile.bio,
        avatar: profile.avatar
      });
      // Keep the authenticated Supabase identity (used by auth + RBAC) in sync.
      // The legacy mock staff record (keyed by 'staff_N' ids) no longer tracks
      // the real Supabase user id, so it's best-effort only — never blocks the save.
      if (user) {
        AuthService.updateCurrentUser({
          name: profile.name,
          avatarUrl: profile.avatar || null,
        });
        try {
          await UsersService.updateStaff(user.id, {
            nameAr: profile.name,
            username: profile.username,
            email: profile.email,
            phone: profile.phone || null,
            avatarUrl: profile.avatar || null,
          });
        } catch {
          // No matching legacy mock staff record for this Supabase user — expected, ignore.
        }
      }
      toast.success(adminAr.toasts.dataSaved);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await ProfileService.updatePreferences(profile.preferences);
      setProfile(updated);
      setTheme(updated.preferences.theme);
      toast.success(adminAr.toasts.dataSaved);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    setSaving(true);
    try {
      if (!user) throw new Error('انتهت الجلسة، يرجى تسجيل الدخول من جديد');
      await AuthService.changePassword(currentPass, newPass);
      toast.success('تم تحديث كلمة المرور بنجاح');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      toast.error(err.message || adminAr.toasts.unexpectedError);
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (id: string) => {
    try {
      await ProfileService.terminateSession(id);
      toast.success('تم إنهاء الجلسة بنجاح');
      if (user) loadProfile(user);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="flex gap-4 border-b border-[var(--admin-border-light)] pb-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', label: adminAr.profile.tabs.personalInfo, icon: IconUser },
    { id: 'security', label: adminAr.profile.tabs.security, icon: IconShield },
    { id: 'preferences', label: 'التفضيلات', icon: IconAdjustmentsHorizontal },
    { id: 'sessions', label: adminAr.profile.tabs.sessions, icon: IconDevices },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title={adminAr.profile.title}
        description={adminAr.profile.subtitle}
      />

      <Card className="flex flex-col md:flex-row min-h-[500px] overflow-hidden">
        
        {/* Tabs Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-l border-[var(--admin-border-light)] bg-[var(--admin-bg-elevated)] p-4">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--admin-radius-md)] transition-all text-sm font-semibold ${
                    isActive 
                      ? 'bg-[var(--admin-bg-base)] text-[var(--admin-primary)] border border-[var(--admin-border-base)] shadow-sm' 
                      : 'text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)]'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-[var(--admin-primary)]' : 'text-[var(--admin-text-subtle)]'} stroke={isActive ? 2 : 1.5} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 md:p-8 bg-[var(--admin-bg-base)]">
          
          {activeTab === 'personal' && (
            <form onSubmit={handleSavePersonal} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
              <div className="border-b border-[var(--admin-border-light)] pb-4">
                <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.profile.tabs.personalInfo}</h3>
                <p className="text-sm text-[var(--admin-text-muted)] mt-1">المعلومات الشخصية لحسابك.</p>
              </div>
              
              <AvatarUpload 
                value={profile.avatar} 
                name={profile.name} 
                onChange={async (avatar) => {
                  setProfile(prev => prev ? { ...prev, avatar } : null);
                  if (user) {
                    try {
                      await ProfileService.updateProfile({ avatar });
                      await UsersService.updateStaff(user.id, { avatarUrl: avatar || null });
                      AuthService.updateCurrentUser({ avatarUrl: avatar || null });
                    } catch (err: any) {
                      toast.error(err?.message || 'فشل في تحديث الصورة الشخصية');
                    }
                  }
                }} 
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.personal.name}</label>
                  <Input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">اسم المستخدم</label>
                  <Input type="text" dir="ltr" value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.personal.email}</label>
                  <Input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.personal.phone}</label>
                  <Input type="text" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.personal.role}</label>
                  <Input type="text" value={profile.role} disabled className="bg-[var(--admin-bg-subtle)] text-[var(--admin-text-muted)] cursor-not-allowed opacity-70" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.personal.bio}</label>
                  <textarea rows={3} value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} className="w-full px-4 py-2 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] text-sm resize-y" />
                </div>
              </div>

              {/* Read-only: role, account facts & effective permissions */}
              <div className="rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-elevated)] p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[var(--admin-text-muted)] mb-1">الدور الوظيفي</p>
                    <p className="text-sm font-bold text-[var(--admin-text-base)]">{roleRecord?.nameAr ?? profile.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--admin-text-muted)] mb-1">آخر تسجيل دخول</p>
                    <p className="text-sm font-semibold text-[var(--admin-text-base)] tabular-nums">{staffRecord?.lastLoginAt ? formatDate(staffRecord.lastLoginAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--admin-text-muted)] mb-1">تاريخ الإنشاء</p>
                    <p className="text-sm font-semibold text-[var(--admin-text-base)] tabular-nums">{staffRecord?.createdAt ? formatDate(staffRecord.createdAt) : '—'}</p>
                  </div>
                </div>

                {roleRecord && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--admin-text-subtle)] uppercase tracking-wider mb-2">الصلاحيات الفعّالة</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(PERMISSION_MODULES_AR).map((mod) => {
                        const p = roleRecord.permissions[mod] ?? { read: false, write: false, delete: false };
                        const level = p.delete ? 'كامل' : p.write ? 'تعديل' : p.read ? 'قراءة' : '—';
                        const tone = p.delete ? 'success' : p.write ? 'info' : p.read ? 'neutral' : 'muted';
                        return (
                          <span
                            key={mod}
                            className={`text-[11px] px-2 py-1 rounded-[var(--admin-radius-sm)] border ${
                              tone === 'success' ? 'bg-[var(--admin-success)]/10 text-[var(--admin-success)] border-[var(--admin-success)]/20'
                              : tone === 'info' ? 'bg-[var(--admin-info)]/10 text-[var(--admin-info)] border-[var(--admin-info)]/20'
                              : tone === 'neutral' ? 'bg-[var(--admin-bg-base)] text-[var(--admin-text-muted)] border-[var(--admin-border-base)]'
                              : 'bg-[var(--admin-bg-base)] text-[var(--admin-text-subtle)] border-[var(--admin-border-light)] opacity-60'
                            }`}
                          >
                            {PERMISSION_MODULES_AR[mod]}: {level}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 border-t border-[var(--admin-border-light)]">
                <Button type="submit" isLoading={saving} leftIcon={<IconDeviceFloppy size={18} />}>
                  {saving ? adminAr.table.loading : adminAr.common.save}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSaveSecurity} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl">
              <div className="border-b border-[var(--admin-border-light)] pb-4">
                <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.profile.tabs.security}</h3>
                <p className="text-sm text-[var(--admin-text-muted)] mt-1">تحديث كلمة المرور الخاصة بك.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.security.currentPass}</label>
                  <Input type="password" required value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.security.newPass}</label>
                  <Input type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">{adminAr.profile.security.confirmPass}</label>
                  <Input type="password" required value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-[var(--admin-border-light)]">
                <Button type="submit" isLoading={saving} leftIcon={<IconShield size={18} />}>
                  {saving ? adminAr.table.loading : adminAr.profile.security.updatePass}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handleSavePreferences} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl">
              <div className="border-b border-[var(--admin-border-light)] pb-4">
                <h3 className="text-xl font-bold text-[var(--admin-text-base)]">التفضيلات</h3>
                <p className="text-sm text-[var(--admin-text-muted)] mt-1">اللغة والمظهر وإعدادات الإشعارات.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">اللغة</label>
                  <select
                    value={profile.preferences.language}
                    onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, language: e.target.value as 'ar' | 'en' } })}
                    className="h-10 px-3 w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                  >
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-[var(--admin-text-base)]">المظهر</label>
                  <select
                    value={profile.preferences.theme}
                    onChange={(e) => {
                      const theme = e.target.value as 'light' | 'dark' | 'system';
                      setProfile({ ...profile, preferences: { ...profile.preferences, theme } });
                      setTheme(theme);
                    }}
                    className="h-10 px-3 w-full bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
                  >
                    <option value="light">فاتح</option>
                    <option value="dark">داكن</option>
                    <option value="system">حسب النظام</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] cursor-pointer">
                  <span className="text-sm font-medium text-[var(--admin-text-base)]">إشعارات البريد الإلكتروني</span>
                  <input
                    type="checkbox"
                    checked={profile.preferences.emailNotifications}
                    onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, emailNotifications: e.target.checked } })}
                    className="w-5 h-5 accent-[var(--admin-primary)]"
                  />
                </label>
                <label className="flex items-center justify-between p-4 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] cursor-pointer">
                  <span className="text-sm font-medium text-[var(--admin-text-base)]">الإشعارات الفورية</span>
                  <input
                    type="checkbox"
                    checked={profile.preferences.pushNotifications}
                    onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, pushNotifications: e.target.checked } })}
                    className="w-5 h-5 accent-[var(--admin-primary)]"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-6 border-t border-[var(--admin-border-light)]">
                <Button type="submit" isLoading={saving} leftIcon={<IconDeviceFloppy size={18} />}>
                  {saving ? adminAr.table.loading : adminAr.common.save}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
              <div className="border-b border-[var(--admin-border-light)] pb-4">
                <h3 className="text-xl font-bold text-[var(--admin-text-base)]">{adminAr.profile.tabs.sessions}</h3>
                <p className="text-sm text-[var(--admin-text-muted)] mt-1">هذه قائمة بجميع الأجهزة التي قمت بتسجيل الدخول منها حالياً. قم بإنهاء أي جلسة غير معروفة.</p>
              </div>
              
              <div className="space-y-4">
                {profile.sessions.map((session) => (
                  <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-[var(--admin-border-base)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-bg-elevated)] gap-4 transition-colors hover:border-[var(--admin-border-strong)]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] flex items-center justify-center text-[var(--admin-text-subtle)] border border-[var(--admin-border-light)] shadow-sm shrink-0">
                        {session.device.toLowerCase().includes('iphone') || session.device.toLowerCase().includes('android') ? <IconDeviceMobile size={24} stroke={1.5} /> : <IconDeviceLaptop size={24} stroke={1.5} />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-[var(--admin-text-base)] flex items-center gap-2 mb-0.5">
                          {session.device}
                          {session.isCurrent && <Badge variant="success" className="px-1.5 py-0">الحالي</Badge>}
                        </h4>
                        <div className="text-xs text-[var(--admin-text-muted)] flex items-center gap-2 font-medium">
                          <span>{session.ip}</span>
                          <span className="text-[var(--admin-border-strong)]">&bull;</span>
                          <span>{session.location}</span>
                        </div>
                        <p className="text-xs text-[var(--admin-text-subtle)] mt-1.5 tabular-nums">{adminAr.profile.sessions.lastActive}: {formatDate(session.lastActive)}</p>
                      </div>
                    </div>
                    
                    {!session.isCurrent && (
                      <Button 
                        variant="danger"
                        size="sm"
                        onClick={() => handleTerminateSession(session.id)}
                        leftIcon={<IconTrash size={16} />}
                        className="self-start sm:self-auto"
                      >
                        {adminAr.profile.sessions.terminate}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </Card>
    </div>
  );
}
