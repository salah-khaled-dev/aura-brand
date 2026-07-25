import { mockStorage } from '@/lib/storage/mock-storage';

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

export let mockProfile: Profile = {
  id: 'admin_1',
  name: 'Admin User',
  username: 'admin',
  email: 'admin@aurabrand.com',
  role: 'Administrator',
  avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Admin',
  phone: '+201000000000',
  bio: 'مدير النظام لمتجر AURA. مسؤول عن إدارة المنتجات والطلبات والعملاء.',
  preferences: {
    language: 'ar',
    theme: 'system',
    emailNotifications: true,
    pushNotifications: false,
  },
  sessions: [
    {
      id: 'sess_1',
      device: 'MacBook Pro - Chrome',
      location: 'القاهرة، مصر',
      ip: '192.168.1.1',
      lastActive: new Date().toISOString(),
      isCurrent: true
    },
    {
      id: 'sess_2',
      device: 'iPhone 14 - Safari',
      location: 'الإسكندرية، مصر',
      ip: '192.168.1.5',
      lastActive: new Date(Date.now() - 86400000 * 2).toISOString(),
      isCurrent: false
    }
  ]
};

mockProfile = mockStorage.read('profile', mockProfile);

export const updateMockProfile = (newProfile: Profile) => {
  mockProfile = newProfile;
  mockStorage.write('profile', newProfile);
};
