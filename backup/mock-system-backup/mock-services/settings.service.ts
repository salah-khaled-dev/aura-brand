import { Settings, mockSettings, updateMockSettings } from '@/data/mock/settings';

export const SettingsService = {
  async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockSettings), 300);
    });
  },

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updated: Settings = {
          store: { ...mockSettings.store, ...data.store },
          management: { ...mockSettings.management, ...data.management },
          payment: { ...mockSettings.payment, ...data.payment },
          seo: { ...mockSettings.seo, ...data.seo },
        };
        updateMockSettings(updated);
        resolve(updated);
      }, 600);
    });
  }
};
