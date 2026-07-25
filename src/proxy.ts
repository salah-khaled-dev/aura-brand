import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
}

/** Resolves whether the request carries a valid Supabase session for an active admin/super_admin profile. */
async function isAuthorizedAdmin(request: NextRequest, response: NextResponse): Promise<boolean> {
  const supabase = getSupabaseClient(request, response);

  // getUser() revalidates the JWT against Supabase Auth — required for a
  // trustworthy check in middleware, unlike getSession() which only reads
  // the (possibly stale/tampered) cookie payload.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  return !!profile && profile.is_active && (profile.role === 'admin' || profile.role === 'super_admin');
}

/** Whether the storefront is currently in maintenance mode, per `store_settings`. */
async function isMaintenanceModeOn(request: NextRequest, response: NextResponse): Promise<boolean> {
  const supabase = getSupabaseClient(request, response);
  const { data } = await supabase
    .from('store_settings')
    .select('maintenance_mode')
    .eq('id', 1)
    .single();
  return !!data?.maintenance_mode;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const authorized = await isAuthorizedAdmin(request, response);

    if (pathname === '/admin/login') {
      return authorized ? NextResponse.redirect(new URL('/admin', request.url)) : response;
    }

    if (!authorized) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // API routes (admin-only, self-authorizing) and the maintenance page itself
  // are never gated — gating /maintenance would redirect it into a loop.
  if (pathname.startsWith('/api') || pathname === '/maintenance') {
    return response;
  }

  if (await isMaintenanceModeOn(request, response)) {
    const authorized = await isAuthorizedAdmin(request, response);
    if (!authorized) {
      // A `rewrite` leaves the browser URL (and client-side `usePathname()`,
      // which StorefrontLayoutWrapper keys off of to hide the Navbar/Footer)
      // pointed at the original path, so the maintenance message rendered
      // wrapped in full site chrome instead of standing alone. `redirect`
      // changes the actual URL, so the client-side pathname check works.
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
