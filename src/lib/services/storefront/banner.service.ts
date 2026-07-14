import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

export interface Banner {
  id: string;
  type: 'desktop' | 'tablet' | 'mobile' | 'popup' | 'announcement' | 'campaign' | 'season';
  status: 'active' | 'scheduled' | 'disabled';
  priority: number;
  schedule?: { start: string; end: string };
  targetUrl: string;
  overlayOpacity: number;
  animation: string;
  buttonText?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  deviceVisibility: ('desktop' | 'tablet' | 'mobile')[];
}

let mockBanners: Banner[] = [];

mockBanners = mockStorage.read('storefront.banners', mockBanners);
const persistBanners = () => mockStorage.write('storefront.banners', mockBanners);

export const BannerService = {
  async getBanners(): Promise<Banner[]> {
    return [...mockBanners].sort((a, b) => b.priority - a.priority);
  },

  async getBanner(id: string): Promise<Banner | undefined> {
    return mockBanners.find(b => b.id === id);
  },

  async addBanner(banner: Omit<Banner, 'id'>): Promise<Banner> {
    const newBanner = { ...banner, id: `bn-${Date.now()}` };
    mockBanners.push(newBanner);
    persistBanners();
    eventBus.emit('website.changed', { area: 'banners' });
    return newBanner;
  },

  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    const idx = mockBanners.findIndex(b => b.id === id);
    if (idx > -1) {
      mockBanners[idx] = { ...mockBanners[idx], ...updates };
      persistBanners();
      eventBus.emit('website.changed', { area: 'banners' });
      return mockBanners[idx];
    }
    throw new Error('Banner not found');
  },

  async deleteBanner(id: string): Promise<void> {
    mockBanners = mockBanners.filter(b => b.id !== id);
    persistBanners();
    eventBus.emit('website.changed', { area: 'banners' });
  }
};
