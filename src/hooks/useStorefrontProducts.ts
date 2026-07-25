'use client';

/**
 * Async read of the storefront catalog (Supabase-backed) for client components.
 *
 * Fetches published products on mount and refetches whenever the admin panel
 * mutates the catalog, via the same shared EventBus every other live-refreshing
 * list in this app already uses (see `useEventSubscribeMany`). Bursts of admin
 * events are coalesced into a single refetch.
 *
 * Replaces the old `useSyncExternalStore` + localStorage/mock implementation —
 * there is no synchronous snapshot anymore, so callers must handle `loading`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventSubscribeMany } from '@/hooks/useEventBus';
import { getPublishedProducts } from '@/lib/services/storefront/storefront-product.service';
import type { Product } from '@/data/mock/products';

const CATALOG_EVENTS = [
  'product.created',
  'product.updated',
  'product.deleted',
  'products.changed',
  'products.bulk_updated',
  'products.bulk_deleted',
  'inventory.changed',
] as const;

export interface UseStorefrontProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export function useStorefrontProducts(): UseStorefrontProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(() => {
    let cancelled = false;
    // Only show the loading state for the first fetch — a background refetch
    // triggered by an admin mutation shouldn't flicker already-rendered content.
    if (!loadedOnce.current) setLoading(true);
    getPublishedProducts()
      .then((data) => {
        if (cancelled) return;
        setProducts(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'تعذر تحميل المنتجات، حاولي مرة أخرى');
      })
      .finally(() => {
        if (cancelled) return;
        loadedOnce.current = true;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);
  useEventSubscribeMany(CATALOG_EVENTS, load);

  return { products, loading, error };
}
