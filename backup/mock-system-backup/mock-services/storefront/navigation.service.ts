import { eventBus } from '@/lib/events/EventBus';
import { mockStorage } from '@/lib/storage/mock-storage';

export interface NavItem {
  id: string;
  label: string;
  url: string;
  order: number;
  icon?: string;
  badge?: string;
  openInNewTab: boolean;
  /** 'primary' = left nav group (shop-facing); 'secondary' = right nav group (brand-info) */
  group: 'primary' | 'secondary';
  visibilityRules: ('public' | 'logged_in' | 'guests')[];
  children?: NavItem[];
}

export interface NavMenu {
  id: string;
  location: 'header' | 'footer' | 'mega_menu';
  items: NavItem[];
}

// Real AURA header navigation — mirrors src/components/layout/Navbar.tsx leftLinks + rightLinks
let mockMenus: NavMenu[] = [
  {
    id: 'menu-header',
    location: 'header',
    items: [
      { id: 'n-home',   label: 'الرئيسية',    url: '/',                     order: 0, group: 'primary',   openInNewTab: false, visibilityRules: ['public'] },
      { id: 'n-winter', label: 'أزياء الشتاء', url: '/shop?category=winter', order: 1, group: 'primary',   openInNewTab: false, visibilityRules: ['public'] },
      { id: 'n-summer', label: 'أزياء الصيف',  url: '/shop?category=summer', order: 2, group: 'primary',   openInNewTab: false, visibilityRules: ['public'] },
      { id: 'n-shop',   label: 'المتجر',       url: '/shop',                 order: 3, group: 'primary',   openInNewTab: false, visibilityRules: ['public'] },
      { id: 'n-about',  label: 'الأتيليه',     url: '/about',                order: 4, group: 'secondary', openInNewTab: false, visibilityRules: ['public'] },
      { id: 'n-track',  label: 'تتبع الطلب',   url: '/tracking',             order: 5, group: 'secondary', openInNewTab: false, visibilityRules: ['public'] },
      { id: 'n-contact',label: 'تواصل معنا',   url: '/contact',              order: 6, group: 'secondary', openInNewTab: false, visibilityRules: ['public'] },
    ]
  }
];

mockMenus = mockStorage.read('storefront.navigation', mockMenus);

export const NavigationService = {
  async getMenus(): Promise<NavMenu[]> {
    return [...mockMenus];
  },

  async getMenuByLocation(location: NavMenu['location']): Promise<NavMenu | undefined> {
    return mockMenus.find(m => m.location === location);
  },

  async updateMenu(id: string, items: NavItem[]): Promise<NavMenu> {
    const idx = mockMenus.findIndex(m => m.id === id);
    if (idx > -1) {
      mockMenus[idx].items = items;
      mockStorage.write('storefront.navigation', mockMenus);
      eventBus.emit('website.changed', { area: 'navigation' });
      return mockMenus[idx];
    }
    throw new Error('Menu not found');
  }
};
