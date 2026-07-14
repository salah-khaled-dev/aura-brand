import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Resolves whether the request carries a valid Supabase session for an active admin/super_admin profile. */
async function isAuthorizedAdmin(request: NextRequest, response: NextResponse): Promise<boolean> {
  const supabase = createServerClient(
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

export async function middleware(request: NextRequest) {
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

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
