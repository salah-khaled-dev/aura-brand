import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * `cookies()` is async in this Next.js version, so this factory is async too.
 * Server Components can't write cookies, so `setAll` failures here are expected
 * and safe to ignore as long as middleware is refreshing the session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — ignore if middleware refreshes sessions.
          }
        },
      },
    }
  );
}
