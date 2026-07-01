import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

export interface AnnouncementBarSettings {
  enabled: boolean;
  text: string;
  link: string;
  bgColor: string;
  textColor: string;
}

export interface StoreInfo {
  storeName: string;
  phone: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  address: string;
  googleMapsUrl: string;
  workingHours: string;
  commercialRegistration: string;
  taxNumber: string;
  socialMedia: {
    instagram: string;
    facebook: string;
    whatsapp: string;
    tiktok: string;
    pinterest: string;
  };
  announcementBar: AnnouncementBarSettings;
}

// Real AURA Egypt contact data — matches src/app/contact/page.tsx + src/config/whatsapp.ts
let mockStoreInfo: StoreInfo = {
  storeName: 'AURA | أورا',
  phone: '+20 100 000 0000',
  whatsapp: '+20 100 000 0000',
  email: 'care@aura-fashion-virid.vercel.app',
  supportEmail: 'care@aura-fashion-virid.vercel.app',
  address: 'المهندسين، الجيزة، مصر',
  googleMapsUrl: 'https://maps.google.com/?q=Mohandeseen+Giza+Egypt',
  workingHours: 'يوميًا من 11 صباحًا حتى 8 مساءً',
  commercialRegistration: '',
  taxNumber: '',
  socialMedia: {
    facebook:  'https://www.facebook.com/AuraFashionEgypt',
    instagram: 'https://www.instagram.com/aurafashionegy/',
    whatsapp:  'https://wa.me/201000000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D9%85%D9%86%D8%AA%D8%AC%D8%A7%D8%AA%20AURA',
    tiktok:    'https://www.tiktok.com/@aurabrand.eg',
    pinterest: 'https://www.pinterest.com/aurabrandeg',
  },
  announcementBar: {
    enabled: false,
    text: 'شحن مجاني لجميع محافظات مصر على الطلبات فوق ٥٠٠ ج.م',
    link: '/shop',
    bgColor: '#1C1C1B',
    textColor: '#FAF8F5',
  },
};

mockStoreInfo = mockStorage.read('storefront.store', mockStoreInfo);

// Backfill announcementBar for stores saved before this field existed
if (!mockStoreInfo.announcementBar) {
  mockStoreInfo.announcementBar = {
    enabled: false,
    text: 'شحن مجاني لجميع محافظات مصر على الطلبات فوق ٥٠٠ ج.م',
    link: '/shop',
    bgColor: '#1C1C1B',
    textColor: '#FAF8F5',
  };
}

export const StoreService = {
  async getInfo(): Promise<StoreInfo> {
    return { ...mockStoreInfo };
  },

  async updateInfo(updates: Partial<StoreInfo>): Promise<StoreInfo> {
    mockStoreInfo = { ...mockStoreInfo, ...updates };
    mockStorage.write('storefront.store', mockStoreInfo);
    eventBus.emit('website.changed', { area: 'store' });
    return { ...mockStoreInfo };
  }
};
