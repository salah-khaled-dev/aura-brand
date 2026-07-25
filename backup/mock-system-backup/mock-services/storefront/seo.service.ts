import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

export type SEOPage =
  | 'global' | 'homepage' | 'shop' | 'about'
  | 'winter' | 'summer' | 'contact' | 'tracking'
  | 'reviews' | 'journal';

export interface SEOSettings {
  id: string;
  page: SEOPage;
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  twitterCard: 'summary' | 'summary_large_image';
  canonical?: string;
  robots: string;
  jsonLd: boolean;
}

const DEFAULT_SEO: SEOSettings[] = [
  {
    id: 'seo-global',
    page: 'global',
    title: 'AURA | دار الأزياء المصرية الراقية',
    description: 'أورا - دار أزياء نسائية مصرية فاخرة تقدم مفهومًا متطورًا للأناقة والأنوثة العصرية بأيدي حرفية متقنة وتفاصيل فريدة.',
    keywords: 'AURA, أورا, أزياء نسائية, كوتور, ملابس فاخرة, أزياء مصرية',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-homepage',
    page: 'homepage',
    title: 'AURA | الصفحة الرئيسية — تشكيلات الكوتور',
    description: 'اكتشفي أحدث تشكيلات دار أورا من الفساتين الراقية والأزياء الكوتور المصنوعة يدوياً.',
    keywords: 'أورا, تشكيلة, كوتور, فساتين فاخرة',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-shop',
    page: 'shop',
    title: 'متجر أورا | أزياء نسائية فاخرة',
    description: 'تسوقي أحدث تصاميم دار أورا من فساتين ومجموعات راقية مصنوعة من أجود الأقمشة الطبيعية.',
    keywords: 'متجر أورا, فساتين, أزياء نسائية فاخرة, كوتور',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-about',
    page: 'about',
    title: 'الأتيليه | قصة دار أورا الفنية',
    description: 'تعرفي على قصة دار أورا وحرفية صنع الأزياء الراقية المستوحاة من الجمال المصري العريق.',
    keywords: 'أتيليه أورا, قصة, حرفية, دار أزياء مصرية',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-winter',
    page: 'winter',
    title: 'أزياء الشتاء | دار أورا',
    description: 'تشكيلة شتوية حصرية من دار أورا — خامات كشمير وصوف فاخر لأناقة دافئة.',
    keywords: 'أزياء شتاء, كشمير, دار أورا',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-summer',
    page: 'summer',
    title: 'أزياء الصيف | دار أورا',
    description: 'تشكيلة صيفية من دار أورا — كتان طبيعي بلجيكي وحرير إيطالي لأناقة منعشة.',
    keywords: 'أزياء صيف, كتان, حرير, دار أورا',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-contact',
    page: 'contact',
    title: 'تواصل معنا | دار أورا',
    description: 'تواصلي مع فريق دار أورا لأي استفسار عن المنتجات أو المقاسات أو الطلبات الخاصة.',
    keywords: 'تواصل, أورا, دعم, استفسار',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary',
    robots: 'index, follow',
    jsonLd: false,
  },
  {
    id: 'seo-tracking',
    page: 'tracking',
    title: 'تتبع طلبكِ | أورا',
    description: 'تتبعي حالة شحنتك من دار أورا بإدخال رقم الطلب.',
    keywords: 'تتبع, طلب, شحن, أورا',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
    jsonLd: false,
  },
  {
    id: 'seo-reviews',
    page: 'reviews',
    title: 'آراء العملاء | دار أورا',
    description: 'اقرئي آراء وتجارب عميلات دار أورا مع تصاميم الكوتور الراقية.',
    keywords: 'آراء, تقييمات, عملاء, أورا',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
  {
    id: 'seo-journal',
    page: 'journal',
    title: 'مجلة أورا | الموضة والأناقة',
    description: 'اكتشفي مقالات أورا عن الموضة المعاصرة والأناقة الهادئة والحرفية الراقية.',
    keywords: 'مجلة, موضة, أناقة, أورا',
    ogImage: '/aura_thumbnail.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: true,
  },
];

let mockSEO: SEOSettings[] = [...DEFAULT_SEO];
mockSEO = mockStorage.read('storefront.seo', mockSEO);

// Backfill any pages added after the first save
for (const def of DEFAULT_SEO) {
  if (!mockSEO.find(s => s.page === def.page)) {
    mockSEO.push({ ...def });
  }
}

const persistSEO = () => mockStorage.write('storefront.seo', mockSEO);

export const SEOService = {
  async getAll(): Promise<SEOSettings[]> {
    return [...mockSEO];
  },

  async getByPage(page: SEOPage): Promise<SEOSettings | undefined> {
    return mockSEO.find(s => s.page === page);
  },

  async update(id: string, updates: Partial<SEOSettings>): Promise<SEOSettings> {
    const idx = mockSEO.findIndex(s => s.id === id);
    if (idx > -1) {
      mockSEO[idx] = { ...mockSEO[idx], ...updates };
      persistSEO();
      eventBus.emit('website.changed', { area: 'seo' });
      return mockSEO[idx];
    }
    const newSettings: SEOSettings = { id, ...updates } as SEOSettings;
    mockSEO.push(newSettings);
    persistSEO();
    eventBus.emit('website.changed', { area: 'seo' });
    return newSettings;
  },

  async upsert(page: SEOPage, updates: Partial<SEOSettings>): Promise<SEOSettings> {
    const idx = mockSEO.findIndex(s => s.page === page);
    if (idx > -1) {
      mockSEO[idx] = { ...mockSEO[idx], ...updates };
      persistSEO();
      eventBus.emit('website.changed', { area: 'seo' });
      return mockSEO[idx];
    }
    const newEntry: SEOSettings = {
      id: `seo-${page}`,
      page,
      title: '',
      description: '',
      keywords: '',
      ogImage: '',
      twitterCard: 'summary_large_image',
      robots: 'index, follow',
      jsonLd: false,
      ...updates,
    };
    mockSEO.push(newEntry);
    persistSEO();
    eventBus.emit('website.changed', { area: 'seo' });
    return newEntry;
  },

  async getSEOScore(): Promise<{ score: number; brokenLinks: number }> {
    const filled = mockSEO.filter(s => s.title && s.description && s.ogImage).length;
    const score = Math.round((filled / mockSEO.length) * 100);
    return { score, brokenLinks: 0 };
  },
};
