import { mockStorage } from '@/lib/storage/mock-storage';

export interface CategorySEO {
  title: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  banner: string;
  parentId?: string;
  isFeatured: boolean;
  showOnHomepage: boolean;
  showInMenu: boolean;
  sortOrder: number;
  status: 'active' | 'draft' | 'archived';
  seo: CategorySEO;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// AURA's real storefront structure has exactly three groupings, mirrored from
// the navbar/shop filters (src/components/layout/Navbar.tsx, src/app/shop/page.tsx):
// "أزياء الشتاء" / "أزياء الصيف" map 1:1 to Product.season, and "المتجر" is the
// all-products view. These slugs ('winter' | 'summer' | 'shop') are the contract
// the Products module filters against — do not rename without updating callers.
let MOCK_CATEGORIES: Category[] = [
  {
    id: "cat_winter",
    name: "أزياء الشتاء",
    slug: "winter",
    description: "تشكيلة الشتاء الفاخرة — دفء وأناقة في تصاميم شتوية راقية.",
    thumbnail: "/images/campaign/campaign_3.png",
    banner: "/images/campaign/campaign_3.png",
    isFeatured: true,
    showOnHomepage: true,
    showInMenu: true,
    sortOrder: 1,
    status: 'active',
    seo: { title: "أزياء الشتاء | AURA", description: "تسوقي أحدث تشكيلة الشتاء من دار أورا." },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "cat_summer",
    name: "أزياء الصيف",
    slug: "summer",
    description: "أزياء الصيف المنعشة — تصاميم صيفية حصرية بأقمشة خفيفة.",
    thumbnail: "/images/campaign/campaign_2.png",
    banner: "/images/campaign/campaign_2.png",
    isFeatured: true,
    showOnHomepage: true,
    showInMenu: true,
    sortOrder: 2,
    status: 'active',
    seo: { title: "أزياء الصيف | AURA", description: "تسوقي أحدث تشكيلة الصيف من دار أورا." },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "cat_shop",
    name: "المتجر",
    slug: "shop",
    description: "كل قطع دار أورا في مكان واحد.",
    thumbnail: "/images/campaign/campaign_1.png",
    banner: "/images/campaign/campaign_1.png",
    isFeatured: false,
    showOnHomepage: true,
    showInMenu: true,
    sortOrder: 3,
    status: 'active',
    seo: { title: "المتجر | AURA", description: "تصفحي كل تشكيلات دار أورا." },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

MOCK_CATEGORIES = mockStorage.read('categories', MOCK_CATEGORIES);
const persistCategories = () => mockStorage.write('categories', MOCK_CATEGORIES);

export const CategoryService = {
  async getCategories(includeDeleted = false): Promise<Category[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const data = includeDeleted ? MOCK_CATEGORIES : MOCK_CATEGORIES.filter(c => !c.deletedAt);
    return [...data].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getCategory(id: string): Promise<Category | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const c = MOCK_CATEGORIES.find(x => x.id === id);
    return (c && !c.deletedAt) ? { ...c } : null;
  },

  async createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newCategory: Category = {
      ...data,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MOCK_CATEGORIES = [...MOCK_CATEGORIES, newCategory];
    persistCategories();
    return newCategory;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const idx = MOCK_CATEGORIES.findIndex(x => x.id === id);
    if (idx === -1) throw new Error("Category not found");
    const updated = { ...MOCK_CATEGORIES[idx], ...updates, updatedAt: new Date().toISOString() };
    MOCK_CATEGORIES = [...MOCK_CATEGORIES.slice(0, idx), updated, ...MOCK_CATEGORIES.slice(idx + 1)];
    persistCategories();
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const idx = MOCK_CATEGORIES.findIndex(x => x.id === id);
    if (idx > -1) { MOCK_CATEGORIES[idx].deletedAt = new Date().toISOString(); persistCategories(); }
  },

  async restore(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const idx = MOCK_CATEGORIES.findIndex(x => x.id === id);
    if (idx > -1) { MOCK_CATEGORIES[idx].deletedAt = undefined; persistCategories(); }
  },

  async hardDelete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    MOCK_CATEGORIES = MOCK_CATEGORIES.filter(x => x.id !== id);
    persistCategories();
  }
};
