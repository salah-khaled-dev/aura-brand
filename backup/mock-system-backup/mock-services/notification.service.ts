import { Notification, mockNotifications, updateMockNotifications } from '@/data/mock/notifications';

export const NotificationService = {
  async getNotifications(): Promise<Notification[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const sorted = [...mockNotifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(sorted);
      }, 300);
    });
  },

  async getUnreadCount(): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockNotifications.filter(n => !n.isRead).length), 100);
    });
  },

  async markAsRead(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = mockNotifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        updateMockNotifications(updated);
        resolve();
      }, 300);
    });
  },

  async markAllAsRead(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = mockNotifications.map(n => ({ ...n, isRead: true }));
        updateMockNotifications(updated);
        resolve();
      }, 400);
    });
  },

  async deleteNotification(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        updateMockNotifications(mockNotifications.filter(n => n.id !== id));
        resolve();
      }, 300);
    });
  }
};
