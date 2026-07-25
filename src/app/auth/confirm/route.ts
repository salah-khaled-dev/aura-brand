import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Exchanges the `token_hash` from a Supabase auth email link for a session, then
 * forwards the browser to `next`. This route (not the Supabase-hosted verify
 * endpoint) must be the link target — see the Reset Password email template,
 * which builds the link around this exact path.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/admin/login';

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = '';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }
    // GoTrue returns the same "Token has expired or is invalid" message for
    // expired, malformed, and already-used tokens alike, so there's no
    // reliable way to tell those cases apart from the error text.
    redirectTo.pathname = '/auth/reset-password';
    redirectTo.searchParams.set('error', 'invalid_link');
    return NextResponse.redirect(redirectTo);
  }

  redirectTo.pathname = '/auth/reset-password';
  redirectTo.searchParams.set('error', 'missing_token');
  return NextResponse.redirect(redirectTo);
}
