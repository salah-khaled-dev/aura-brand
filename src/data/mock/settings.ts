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

