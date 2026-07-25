import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, Json } from '@/lib/supabase/database.types';

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

type CollectionRow = Tables<'collections'>;

const supabase = createClient();

function rowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    type: row.type as Collection['type'],
    image: row.image ?? '',
    matchType: row.match_type as Collection['matchType'],
    rules: (row.rules as unknown as CollectionRule[]) ?? [],
    productIds: row.product_ids ?? [],
    status: row.status as Collection['status'],
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const CollectionService = {
  async getCollections(includeDeleted = false): Promise<Collection[]> {
    let query = supabase.from('collections').select('*').order('created_at', { ascending: false });
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToCollection);
  },

  async getCollection(id: string): Promise<Collection | null> {
    const { data, error } = await supabase.from('collections').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data ? rowToCollection(data) : null;
  },

  async createCollection(data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
    const insertRow: TablesInsert<'collections'> = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      type: data.type,
      image: data.image || null,
      match_type: data.matchType,
      rules: data.rules as unknown as Json,
      product_ids: data.productIds,
      status: data.status,
    };
    const { data: row, error } = await supabase.from('collections').insert(insertRow).select().single();
    if (error) throw error;
    return rowToCollection(row);
  },

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
    const patch: Partial<TablesInsert<'collections'>> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.slug !== undefined) patch.slug = updates.slug;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.image !== undefined) patch.image = updates.image || null;
    if (updates.matchType !== undefined) patch.match_type = updates.matchType;
    if (updates.rules !== undefined) patch.rules = updates.rules as unknown as Json;
    if (updates.productIds !== undefined) patch.product_ids = updates.productIds;
    if (updates.status !== undefined) patch.status = updates.status;

    const { data: row, error } = await supabase.from('collections').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Collection not found');
    return rowToCollection(row);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.from('collections').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
