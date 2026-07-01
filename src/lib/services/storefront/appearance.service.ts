import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

export interface StoreAppearance {
  logoUrl: string;
  faviconUrl: string;
  loadingScreenType: 'spinner' | 'logo' | 'pulse';
  themePreset: 'luxury' | 'modern' | 'minimal' | 'playful';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  containerWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  buttonStyle: 'solid' | 'outline' | 'ghost';
  cardRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animationSpeed: 'slow' | 'normal' | 'fast';
  /** Runtime color overrides — map to Tailwind CSS custom properties */
  accentColor: string;
  textPrimaryColor: string;
  backgroundPrimaryColor: string;
  effects: {
    hoverScale: boolean;
    pageTransitions: boolean;
  };
}

let mockAppearance: StoreAppearance = {
  logoUrl: '/logo.png',
  faviconUrl: '/favicon.ico',
  loadingScreenType: 'logo',
  themePreset: 'luxury',
  borderRadius: 'md',
  containerWidth: 'xl',
  buttonStyle: 'solid',
  cardRadius: 'lg',
  animationSpeed: 'normal',
  accentColor: '#C5A880',
  textPrimaryColor: '#1C1C1B',
  backgroundPrimaryColor: '#FAF8F5',
  effects: {
    hoverScale: true,
    pageTransitions: true,
  }
};

mockAppearance = mockStorage.read('storefront.appearance', mockAppearance);

export const AppearanceService = {
  async getSettings(): Promise<StoreAppearance> {
    return { ...mockAppearance };
  },

  async updateSettings(updates: Partial<StoreAppearance>): Promise<StoreAppearance> {
    mockAppearance = { ...mockAppearance, ...updates };
    mockStorage.write('storefront.appearance', mockAppearance);
    eventBus.emit('website.changed', { area: 'appearance' });
    return { ...mockAppearance };
  }
};
