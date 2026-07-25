import { Profile, mockProfile, updateMockProfile } from '@/data/mock/profile';
import { eventBus } from '@/lib/events/EventBus';

export const ProfileService = {
  async getProfile(): Promise<Profile> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProfile), 300);
    });
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = { ...mockProfile, ...data, preferences: { ...mockProfile.preferences, ...(data.preferences ?? {}) } };
        updateMockProfile(updated);
        eventBus.emit('profile.updated', updated);
        resolve(updated);
      }, 500);
    });
  },

  async updatePreferences(prefs: Partial<Profile['preferences']>): Promise<Profile> {
    return this.updateProfile({ preferences: { ...mockProfile.preferences, ...prefs } });
  },

  async updatePassword(currentPass: string, _newPass: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock password check
        if (currentPass !== 'password123') {
          return reject(new Error('كلمة المرور الحالية غير صحيحة'));
        }
        resolve();
      }, 600);
    });
  },

  async terminateSession(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated = {
          ...mockProfile,
          sessions: mockProfile.sessions.filter(s => s.id !== id)
        };
        updateMockProfile(updated);
        resolve();
      }, 300);
    });
  }
};
