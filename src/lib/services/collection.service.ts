import { mockStorage } from '@/lib/storage/mock-storage';

export interface CollectionRule {
  field: 'title' | 'tag' | 'price' | 'inventory';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: 'manual' | 'automatic';
  image: string;
  matchType: 'all' | 'any';
  rules: CollectionRule[];
  productIds: string[];
  status: 'active' | 'draft' | 'archived';
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

let MOCK_COLLECTIONS: Collection[] = [];

MOCK_COLLECTIONS = mockStorage.read('collections', MOCK_COLLECTIONS);
const persistCollections = () => mockStorage.write('collections', MOCK_COLLECTIONS);

export const CollectionService = {
  async getCollections(includeDeleted = false): Promise<Collection[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return includeDeleted ? [...MOCK_COLLECTIONS] : MOCK_COLLECTIONS.filter(c => !c.deletedAt);
  },

  async getCollection(id: string): Promise<Collection | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const c = MOCK_COLLECTIONS.find(x => x.id === id);
    return (c && !c.deletedAt) ? { ...c } : null;
  },

  async createCollection(data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newCollection: Collection = {
      ...data,
      id: `col_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MOCK_COLLECTIONS = [...MOCK_COLLECTIONS, newCollection];
    persistCollections();
    return newCollection;
  },

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const idx = MOCK_COLLECTIONS.findIndex(x => x.id === id);
    if (idx === -1) throw new Error("Collection not found");
    const updated = { ...MOCK_COLLECTIONS[idx], ...updates, updatedAt: new Date().toISOString() };
    MOCK_COLLECTIONS = [...MOCK_COLLECTIONS.slice(0, idx), updated, ...MOCK_COLLECTIONS.slice(idx + 1)];
    persistCollections();
    return updated;
  },

  async softDelete(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const idx = MOCK_COLLECTIONS.findIndex(x => x.id === id);
    if (idx > -1) { MOCK_COLLECTIONS[idx].deletedAt = new Date().toISOString(); persistCollections(); }
  }
};
