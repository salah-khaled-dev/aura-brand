import { mockStorage } from '@/lib/storage/mock-storage';

export interface WorkingHoursDay {
  day: 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  isOpen: boolean;
  openTime: string;  // "10:00"
  closeTime: string; // "22:00"
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface StoreSettings {
  storeNameAr: string;
  storeNameEn: string;
  description: string;
  storeEmail: string;
  storePhone: string;
  whatsapp: string;
  address: string;
  workingHours: WorkingHoursDay[];
  logo: string;
  favicon: string;
  socialLinks: SocialLinks;
}

export interface ManagementSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultCurrency: string;
}

export interface PaymentSettings {
  currencyFormat: string;
  taxRate: number;
  enableCOD: boolean;
  enableVodafoneCash: boolean;
  enableInstapay: boolean;
  shippingCost: number;
  freeShippingThreshold: number;
  estimatedDeliveryDays: string;
}

export interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  googleAnalyticsId: string;
  googleSearchConsoleCode: string;
  robotsTxt: string;
  sitemapEnabled: boolean;
}

export interface Settings {
  store: StoreSettings;
  management: ManagementSettings;
  payment: PaymentSettings;
  seo: SEOSettings;
}

const DEFAULT_WORKING_HOURS: WorkingHoursDay[] = [
  { day: 'saturday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { day: 'sunday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { day: 'monday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { day: 'tuesday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { day: 'wednesday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { day: 'thursday', isOpen: true, openTime: '10:00', closeTime: '22:00' },
  { day: 'friday', isOpen: false, openTime: '10:00', closeTime: '22:00' },
];

export let mockSettings: Settings = {
  store: {
    storeNameAr: 'أورا',
    storeNameEn: 'AURA',
    description: 'أزياء نسائية فاخرة بتصاميم حصرية وجودة عالمية.',
    storeEmail: 'support@aurabrand.com',
    storePhone: '+201000000000',
    whatsapp: '+201000000000',
    address: 'القاهرة، مصر',
    workingHours: DEFAULT_WORKING_HOURS,
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=200&fit=crop',
    favicon: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=32&h=32&fit=crop',
    socialLinks: {
      instagram: '',
      facebook: '',
      tiktok: '',
    },
  },
  management: {
    maintenanceMode: false,
    maintenanceMessage: 'المتجر تحت الصيانة حالياً، سنعود قريباً.',
    defaultCurrency: 'EGP',
  },
  seo: {
    metaTitle: 'AURA | أزياء فاخرة',
    metaDescription: 'تسوق أحدث مجموعات الأزياء الفاخرة من AURA. تصاميم حصرية بجودة عالمية.',
    metaKeywords: 'أزياء, فخامة, ملابس, فساتين, حرير',
    ogImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=630&fit=crop',
    googleAnalyticsId: '',
    googleSearchConsoleCode: '',
    robotsTxt: 'User-agent: *\nAllow: /',
    sitemapEnabled: true,
  },
  payment: {
    currencyFormat: '{value} جنيه',
    taxRate: 14,
    enableCOD: true,
    enableVodafoneCash: false,
    enableInstapay: false,
    shippingCost: 50,
    freeShippingThreshold: 1000,
    estimatedDeliveryDays: '3-5',
  },
};

mockSettings = mockStorage.read('settings', mockSettings);

export const updateMockSettings = (newSettings: Settings) => {
  mockSettings = newSettings;
  mockStorage.write('settings', newSettings);
};
