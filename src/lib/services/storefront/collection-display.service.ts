import { createClient } from '@/lib/supabase/client';
import { eventBus } from '@/lib/events/EventBus';
import { CollectionService, Collection } from '@/lib/services/collection.service';

/**
 * Storefront merchandising state for a collection — how it is presented on the
 * public site. Folded directly onto `public.collections` (is_visible/
 * is_featured/display_order columns, 20260715000017) rather than a separate
 * table — same entity, this is just its presentation slice.
 */
export interface CollectionDisplay {
  collectionId: string;
  visible: boolean;
  featured: boolean;
  order: number;
}

export interface MerchandisedCollection extends Collection {
  display: CollectionDisplay;
}

const supabase = createClient();

export const CollectionDisplayService = {
  async getMerchandised(): Promise<MerchandisedCollection[]> {
    const collections = await CollectionService.getCollections();
    const { data, error } = await supabase.from('collections').select('id, is_visible, is_featured, display_order');
    if (error) throw error;

    const displayById = new Map((data ?? []).map((row) => [row.id, { collectionId: row.id, visible: row.is_visible, featured: row.is_featured, order: row.display_order }]));

    return collections
      .map((c) => ({ ...c, display: displayById.get(c.id) ?? { collectionId: c.id, visible: c.status === 'active', featured: false, order: 0 } }))
      .sort((a, b) => a.display.order - b.display.order);
  },

  async setVisibility(collectionId: string, visible: boolean): Promise<void> {
    const { error } = await supabase.from('collections').update({ is_visible: visible }).eq('id', collectionId);
    if (error) throw error;
    eventBus.emit('storefront.collections.updated', { collectionId, visible });
  },

  async setFeatured(collectionId: string, featured: boolean): Promise<void> {
    const { error } = await supabase.from('collections').update({ is_featured: featured }).eq('id', collectionId);
    if (error) throw error;
    eventBus.emit('storefront.collections.updated', { collectionId, featured });
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await Promise.all(orderedIds.map((id, idx) => supabase.from('collections').update({ display_order: idx }).eq('id', id)));
    eventBus.emit('storefront.collections.reordered', { orderedIds });
  },
};
