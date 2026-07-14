import { mockStorage } from '@/lib/storage/mock-storage';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

let MOCK_BRANDS: Brand[] = [];

MOCK_BRANDS = mockStorage.read('brands', MOCK_BRANDS);
const persistBrands = () => mockStorage.write('brands', MOCK_BRANDS);

export const BrandService = {
  async getBrands(includeDeleted = false): Promise<Brand[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return includeDeleted ? [...MOCK_BRANDS] : MOCK_BRANDS.filter(c => !c.deletedAt);
  },

  async getBrand(id: string): Promise<Brand | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const c = MOCK_BRANDS.find(x => x.id === id);
    return (c && !c.deletedAt) ? { ...c } : null;
  },

  async createBrand(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newBrand: Brand = {
      ...data,
      id: `brand_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MOCK_BRANDS = [...MOCK_BRANDS, newBrand];
    persistBrands();
    return newBrand;
  },

  async updateBrand(id: string, updates: Partial<Brand>): Promise<Brand> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const idx = MOCK_BRANDS.findIndex(x => x.id === id);
    if (idx === -1) throw new Error("Brand not found");
    const updated = { ...MOCK_BRANDS[idx], ...updates, updatedAt: new Date().toISOString() };
    MOCK_BRANDS = [...MOCK_BRANDS.slice(0, idx), updated, ...MOCK_BRANDS.slice(idx + 1)];
    persistBrands();
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const idx = MOCK_BRANDS.findIndex(x => x.id === id);
    if (idx > -1) { MOCK_BRANDS[idx].deletedAt = new Date().toISOString(); persistBrands(); }
  }
};
