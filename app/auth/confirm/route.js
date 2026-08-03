import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * Where both the "Confirm signup" and the owner "Reset password" emails'
 * links land - one generic handler, since both are just a PKCE code to
 * exchange for a session. `next` decides what happens after: confirmation
 * goes to /register/confirmed, reset goes to /reset-password to actually
 * set the new password. Uses Supabase's default email templates
 * unmodified - exchangeCodeForSession(code) needs no dashboard template
 * edit, unlike the platform console's typed-code OTP flow.
 */
export async function GET(request){
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/register/confirmed';

  if (code){
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const failurePage = next === '/reset-password' ? '/forgot-password' : '/register';
  return NextResponse.redirect(`${origin}${failurePage}?confirm=failed`);
}
