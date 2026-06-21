"use client";

import { useState, useEffect, useCallback } from 'react';

const RECENTLY_VIEWED_KEY = 'aura_recently_viewed_ids';
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  // Load on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewedIds(parsed);
      }
    } catch (error) {
      console.warn("Failed to parse recently viewed items", error);
    }
  }, []);

  const addViewedItem = useCallback((productId: string) => {
    setViewedIds((prev) => {
      // Remove if it exists to push it to the front
      const filtered = prev.filter(id => id !== productId);
      // Add to front
      const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
      
      try {
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn("Failed to save recently viewed items", error);
      }
      
      return updated;
    });
  }, []);

  return { viewedIds, addViewedItem };
}
