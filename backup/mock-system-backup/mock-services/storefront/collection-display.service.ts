import { eventBus } from "@/lib/events/EventBus";
import { CollectionService, Collection } from "@/lib/services/collection.service";
import { mockStorage } from "@/lib/storage/mock-storage";

/**
 * Storefront merchandising state for a collection — how it is presented on the
 * public site. This is intentionally separate from the catalog CRUD data
 * (CollectionService): the catalog owns the collection's name/products/rules,
 * while this layer owns presentation (visibility, featured, display order).
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

// Mock-first persistence keyed by collection id. When Supabase lands, only the
// reads/writes below change (swap this map for a repository) — the public
// interface and the consuming UI stay identical.
const displayState: Record<string, CollectionDisplay> = {};
Object.assign(displayState, mockStorage.read<Record<string, CollectionDisplay>>("storefront.collectionDisplay", {}));
const persistDisplay = () => mockStorage.write("storefront.collectionDisplay", displayState);

function ensureDefaults(collections: Collection[]) {
  let changed = false;
  collections.forEach((c, idx) => {
    if (!displayState[c.id]) {
      displayState[c.id] = {
        collectionId: c.id,
        visible: c.status === "active",
        featured: false,
        order: idx,
      };
      changed = true;
    }
  });
  if (changed) persistDisplay();
}

export const CollectionDisplayService = {
  async getMerchandised(): Promise<MerchandisedCollection[]> {
    const collections = await CollectionService.getCollections();
    ensureDefaults(collections);
    return collections
      .map((c) => ({ ...c, display: displayState[c.id] }))
      .sort((a, b) => a.display.order - b.display.order);
  },

  async setVisibility(collectionId: string, visible: boolean): Promise<void> {
    if (displayState[collectionId]) {
      displayState[collectionId].visible = visible;
      persistDisplay();
      eventBus.emit("storefront.collections.updated", { collectionId, visible });
    }
  },

  async setFeatured(collectionId: string, featured: boolean): Promise<void> {
    if (displayState[collectionId]) {
      displayState[collectionId].featured = featured;
      persistDisplay();
      eventBus.emit("storefront.collections.updated", { collectionId, featured });
    }
  },

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, idx) => {
      if (displayState[id]) displayState[id].order = idx;
    });
    persistDisplay();
    eventBus.emit("storefront.collections.reordered", { orderedIds });
  },
};
