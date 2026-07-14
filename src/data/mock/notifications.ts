import { mockStorage } from '@/lib/storage/mock-storage';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'customer' | 'system' | 'review';
  date: string;
  isRead: boolean;
  link?: string;
}

export let mockNotifications: Notification[] = [];

mockNotifications = mockStorage.read('notifications', mockNotifications);

export const updateMockNotifications = (newNotifs: Notification[]) => {
  mockNotifications = newNotifs;
  mockStorage.write('notifications', newNotifs);
};
