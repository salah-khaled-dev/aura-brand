import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';

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

const supabase = createClient();

function rowToCategory(row: Tables<'categories'>): Category {
  return {
    id: row.id,
    name: row.name_ar,
    slug: row.slug,
    description: row.description_ar ?? '',
    thumbnail: row.image_url ?? '',
    banner: row.banner_url ?? '',
    parentId: row.parent_id ?? undefined,
    isFeatured: row.is_featured,
    showOnHomepage: row.show_on_homepage,
    showInMenu: row.show_in_menu,
    sortOrder: row.sort_order,
    status: row.status,
    seo: { title: row.seo_title ?? '', description: row.seo_description ?? '' },
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Arabic is the only authored language in the admin UI today — name_en/description_en mirror the Arabic value since the schema requires them non-null. */
function categoryToInsertRow(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): TablesInsert<'categories'> {
  return {
    name_ar: data.name,
    name_en: data.name,
    slug: data.slug,
    description_ar: data.description,
    description_en: data.description,
    image_url: data.thumbnail || null,
    banner_url: data.banner || null,
    parent_id: data.parentId ?? null,
    is_featured: data.isFeatured,
    show_on_homepage: data.showOnHomepage,
    show_in_menu: data.showInMenu,
    sort_order: data.sortOrder,
    status: data.status,
    seo_title: data.seo?.title || null,
    seo_description: data.seo?.description || null,
    deleted_at: data.deletedAt ?? null,
  };
}

function categoryToUpdateRow(updates: Partial<Category>): TablesUpdate<'categories'> {
  const row: TablesUpdate<'categories'> = {};
  if (updates.name !== undefined) { row.name_ar = updates.name; row.name_en = updates.name; }
  if (updates.slug !== undefined) row.slug = updates.slug;
  if (updates.description !== undefined) { row.description_ar = updates.description; row.description_en = updates.description; }
  if (updates.thumbnail !== undefined) row.image_url = updates.thumbnail || null;
  if (updates.banner !== undefined) row.banner_url = updates.banner || null;
  if (updates.parentId !== undefined) row.parent_id = updates.parentId ?? null;
  if (updates.isFeatured !== undefined) row.is_featured = updates.isFeatured;
  if (updates.showOnHomepage !== undefined) row.show_on_homepage = updates.showOnHomepage;
  if (updates.showInMenu !== undefined) row.show_in_menu = updates.showInMenu;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.seo !== undefined) {
    row.seo_title = updates.seo.title || null;
    row.seo_description = updates.seo.description || null;
  }
  if (updates.deletedAt !== undefined) row.deleted_at = updates.deletedAt ?? null;
  return row;
}

function mapCategoryError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('يوجد تصنيف آخر بنفس الرابط (slug)');
  if (error.code === '23503') return new Error('لا يمكن حذف الفئة لوجود منتجات مرتبطة بها');
  return new Error(error.message);
}

export const CategoryService = {
  async getCategories(includeDeleted = false): Promise<Category[]> {
    let query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (!includeDeleted) query = query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw mapCategoryError(error);
    return (data ?? []).map(rowToCategory);
  },

  async getCategory(id: string): Promise<Category | null> {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
    if (error) throw mapCategoryError(error);
    if (!data || data.deleted_at) return null;
    return rowToCategory(data);
  },

  async createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const { data: row, error } = await supabase
      .from('categories')
      .insert(categoryToInsertRow(data))
      .select('*')
      .single();
    if (error) throw mapCategoryError(error);
    return rowToCategory(row);
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const { data: row, error } = await supabase
      .from('categories')
      .update(categoryToUpdateRow(updates))
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      if (error.code === 'PGRST116') throw new Error('Category not found');
      throw mapCategoryError(error);
    }
    return rowToCategory(row);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id);
    if (error) throw mapCategoryError(error);
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: null, status: 'active' })
      .eq('id', id);
    if (error) throw mapCategoryError(error);
  },

  /** Hits `on delete restrict` (Postgres 23503) if products still reference this category — an intentional improvement over the mock, which allowed this silently. */
  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw mapCategoryError(error);
  },
};
