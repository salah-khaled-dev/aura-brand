import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';

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

type BrandRow = Tables<'brands'>;

const supabase = createClient();

function rowToBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? '',
    description: row.description,
    status: row.status as Brand['status'],
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const BrandService = {
  async getBrands(includeDeleted = false): Promise<Brand[]> {
    let query = supabase.from('brands').select('*').order('created_at', { ascending: false });
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToBrand);
  },

  async getBrand(id: string): Promise<Brand | null> {
    const { data, error } = await supabase.from('brands').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data ? rowToBrand(data) : null;
  },

  async createBrand(data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Brand> {
    const insertRow: TablesInsert<'brands'> = {
      name: data.name,
      slug: data.slug,
      logo: data.logo || null,
      description: data.description,
      status: data.status,
    };
    const { data: row, error } = await supabase.from('brands').insert(insertRow).select().single();
    if (error) throw error;
    return rowToBrand(row);
  },

  async updateBrand(id: string, updates: Partial<Brand>): Promise<Brand> {
    const patch: Partial<TablesInsert<'brands'>> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.slug !== undefined) patch.slug = updates.slug;
    if (updates.logo !== undefined) patch.logo = updates.logo || null;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = updates.status;

    const { data: row, error } = await supabase.from('brands').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Brand not found');
    return rowToBrand(row);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.from('brands').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
