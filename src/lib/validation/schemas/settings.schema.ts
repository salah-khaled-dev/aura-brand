import { z } from 'zod';
import { zArabicText, zNonNegativeNumber, zPercent, zEmail } from './base.schema';

export const WorkingHoursDaySchema = z.object({
  day: z.enum(['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت غير صالحة'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت غير صالحة'),
});

export const SocialLinksSchema = z.object({
  instagram: z.string().url('رابط إنستغرام غير صالح').or(z.literal('')),
  facebook: z.string().url('رابط فيسبوك غير صالح').or(z.literal('')),
  tiktok: z.string().url('رابط تيك توك غير صالح').or(z.literal('')),
});

export const StoreSettingsSchema = z.object({
  storeNameAr: zArabicText('اسم المتجر بالعربية'),
  storeNameEn: z.string().min(1, 'اسم المتجر بالإنجليزية مطلوب').trim(),
  description: z.string().max(500, 'الوصف يجب ألا يتجاوز 500 حرف').default(''),
  storeEmail: zEmail(),
  storePhone: z.string().regex(/^[+\d\s\-()]{7,20}$/, 'رقم الهاتف غير صالح'),
  whatsapp: z.string().regex(/^[+\d\s\-()]{7,20}$/, 'رقم الواتساب غير صالح').or(z.literal('')),
  address: zArabicText('عنوان المتجر'),
  workingHours: z.array(WorkingHoursDaySchema).length(7, 'يجب تحديد ساعات العمل لكل أيام الأسبوع'),
  logo: z.string().default(''),
  favicon: z.string().default(''),
  socialLinks: SocialLinksSchema,
});

export const ManagementSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(300, 'رسالة الصيانة يجب ألا تتجاوز 300 حرف').default(''),
  defaultCurrency: z.string().min(1, 'العملة الافتراضية مطلوبة'),
});

export const PaymentSettingsSchema = z.object({
  currencyFormat: z.string().min(1, 'تنسيق العملة مطلوب'),
  taxRate: zPercent(),
  enableCOD: z.boolean(),
  enableVodafoneCash: z.boolean(),
  enableInstapay: z.boolean(),
  shippingCost: zNonNegativeNumber('تكلفة الشحن'),
  freeShippingThreshold: zNonNegativeNumber('حد الشحن المجاني'),
  estimatedDeliveryDays: z.string().min(1, 'مدة التوصيل المتوقعة مطلوبة'),
});

export const SEOSettingsSchema = z.object({
  metaTitle: z.string().max(70, 'عنوان الميتا يجب ألا يتجاوز 70 حرفاً').default(''),
  metaDescription: z.string().max(160, 'وصف الميتا يجب ألا يتجاوز 160 حرفاً').default(''),
  metaKeywords: z.string().default(''),
  ogImage: z.string().default(''),
  googleAnalyticsId: z.string()
    .regex(/^(G|UA|GTM)-[A-Za-z0-9-]+$/, 'معرّف Google Analytics غير صالح (مثال: G-XXXXXXX)')
    .or(z.literal(''))
    .default(''),
  googleSearchConsoleCode: z.string().default(''),
  robotsTxt: z.string().default(''),
  sitemapEnabled: z.boolean(),
});

export const SettingsSchema = z.object({
  store: StoreSettingsSchema,
  management: ManagementSettingsSchema,
  payment: PaymentSettingsSchema,
  seo: SEOSettingsSchema,
});
