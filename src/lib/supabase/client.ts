import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Supabase client for use in Client Components ("use client").
 * Reads only NEXT_PUBLIC_ env vars, which are safe to ship to the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
