import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

export interface FooterColumn {
  id: string;
  title: string;
  links: { id: string; label: string; url: string }[];
  order: number;
}

export interface FooterSettings {
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterSubtitle: string;
  showSocialIcons: boolean;
  showPaymentIcons: boolean;
  developerCredit: string;
  copyrightText: string;
  columns: FooterColumn[];
}

// Real AURA footer — mirrors src/components/layout/Footer.tsx navData
let mockFooter: FooterSettings = {
  showNewsletter: true,
  newsletterTitle: 'صالون أورا البريدي',
  newsletterSubtitle: 'دعوات خاصة وتحديثات الأتيلييه',
  showSocialIcons: true,
  showPaymentIcons: false,
  developerCredit: 'صلاح خالد',
  copyrightText: '© ٢٠٢٦ دار أورا للأزياء الراقية',
  columns: [
    {
      id: 'col-shop',
      title: 'المتجر',
      order: 0,
      links: [
        { id: 'l-s1', label: 'كل المنتجات',       url: '/shop' },
        { id: 'l-s2', label: 'أزياء الشتاء',      url: '/shop?category=winter' },
        { id: 'l-s3', label: 'أزياء الصيف',       url: '/shop?category=summer' },
      ]
    },
    {
      id: 'col-brand',
      title: 'دار أورا',
      order: 1,
      links: [
        { id: 'l-b1', label: 'قصتنا وحرفيتنا', url: '/about' },
        { id: 'l-b2', label: 'تتبع طلبكِ',     url: '/tracking' },
        { id: 'l-b3', label: 'تواصلي معنا',    url: '/contact' },
      ]
    },
    {
      id: 'col-service',
      title: 'خدمتكِ',
      order: 2,
      links: [
        { id: 'l-sv1', label: 'الشحن والتوصيل',    url: '/shipping' },
        { id: 'l-sv2', label: 'الاستبدال والإرجاع', url: '/returns' },
        { id: 'l-sv3', label: 'الشروط والأحكام',   url: '/terms' },
        { id: 'l-sv4', label: 'سياسة الخصوصية',   url: '/privacy' },
      ]
    }
  ]
};

mockFooter = mockStorage.read('storefront.footer', mockFooter);

export const FooterService = {
  async getSettings(): Promise<FooterSettings> {
    return { ...mockFooter };
  },

  async updateSettings(updates: Partial<FooterSettings>): Promise<FooterSettings> {
    mockFooter = { ...mockFooter, ...updates };
    mockStorage.write('storefront.footer', mockFooter);
    eventBus.emit('website.changed', { area: 'footer' });
    return { ...mockFooter };
  }
};
