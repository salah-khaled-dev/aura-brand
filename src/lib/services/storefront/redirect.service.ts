import { mockStorage } from '@/lib/storage/mock-storage';

export interface Redirect {
  id: string;
  oldUrl: string;
  newUrl: string;
  type: 301 | 302;
  status: 'active' | 'inactive';
  hits: number;
}

let mockRedirects: Redirect[] = [];

mockRedirects = mockStorage.read('storefront.redirects', mockRedirects);
const persistRedirects = () => mockStorage.write('storefront.redirects', mockRedirects);

export const RedirectService = {
  async getAll(): Promise<Redirect[]> {
    return [...mockRedirects];
  },

  async addRedirect(redirect: Omit<Redirect, 'id' | 'hits'>): Promise<Redirect> {
    const newRedirect: Redirect = { ...redirect, id: `rd-${Date.now()}`, hits: 0 };
    mockRedirects.push(newRedirect);
    persistRedirects();
    return newRedirect;
  },

  async updateRedirect(id: string, updates: Partial<Redirect>): Promise<Redirect> {
    const idx = mockRedirects.findIndex(r => r.id === id);
    if (idx > -1) {
      mockRedirects[idx] = { ...mockRedirects[idx], ...updates };
      persistRedirects();
      return mockRedirects[idx];
    }
    throw new Error('Redirect not found');
  },

  async deleteRedirect(id: string): Promise<void> {
    mockRedirects = mockRedirects.filter(r => r.id !== id);
    persistRedirects();
  }
};
