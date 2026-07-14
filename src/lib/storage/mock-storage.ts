/**
 * MockStorageService — the single persistence seam for the mock backend.
 *
 * Every mock store (the `data/mock/*.ts` arrays and the in-service `MOCK_*`
 * stores) loads its initial value through {@link mockStorage.read} and writes
 * back through {@link mockStorage.write}. All data lives in localStorage under
 * one namespace, so the whole mock database can be inspected, exported or reset
 * as a unit. When Supabase lands, this file is deleted and the stores read/write
 * the database instead — no page or component changes required.
 *
 * SSR-safe: on the server (no `window`) reads return the in-memory seed and
 * writes are no-ops, so importing a store during server rendering never throws
 * and never leaks one request's data into another.
 */
const NAMESPACE = 'aura_mock_db';
const VERSION_KEY = `${NAMESPACE}:__schema_version`;

/** Bump to wipe all persisted mock data on the next load (schema migration). */
const SCHEMA_VERSION = 5;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function storageKey(key: string): string {
  return `${NAMESPACE}:${key}`;
}

function namespacedKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(`${NAMESPACE}:`)) keys.push(k);
  }
  return keys;
}

let versionEnsured = false;

/** Wipe the namespace once per session when the persisted schema is outdated. */
function ensureVersion(): void {
  if (versionEnsured || !hasWindow()) return;
  versionEnsured = true;
  try {
    const stored = window.localStorage.getItem(VERSION_KEY);
    if (stored !== String(SCHEMA_VERSION)) {
      namespacedKeys().forEach(k => window.localStorage.removeItem(k));
      window.localStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
    }
  } catch {
    /* localStorage unavailable (private mode / quota) — stay in-memory. */
  }
}

export const mockStorage = {
  /**
   * Returns the persisted value for `key`, or seeds storage with `seed` (and
   * returns it) on first access. On the server, returns `seed` without writing.
   */
  read<T>(key: string, seed: T): T {
    if (!hasWindow()) return seed;
    ensureVersion();
    try {
      const raw = window.localStorage.getItem(storageKey(key));
      if (raw === null) {
        window.localStorage.setItem(storageKey(key), JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw) as T;
    } catch {
      /* corrupt JSON or read error — fall back to the seed. */
      return seed;
    }
  },

  /** Persists `value` under `key`. No-op on the server. */
  write<T>(key: string, value: T): void {
    if (!hasWindow()) return;
    ensureVersion();
    try {
      window.localStorage.setItem(storageKey(key), JSON.stringify(value));
    } catch {
      /* quota exceeded or unavailable — mock data simply won't persist. */
    }
  },

  /** Removes a single persisted key. No-op on the server. */
  remove(key: string): void {
    if (!hasWindow()) return;
    try {
      window.localStorage.removeItem(storageKey(key));
    } catch {
      /* ignore — key may not exist. */
    }
  },

  /** Clears the entire mock-DB namespace (reset tooling / tests). */
  reset(): void {
    if (!hasWindow()) return;
    try {
      namespacedKeys().forEach(k => window.localStorage.removeItem(k));
    } catch {
      /* ignore — nothing to clear. */
    }
  },
};
