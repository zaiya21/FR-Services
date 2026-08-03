import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * Where the "Confirm signup" email's link lands. Password reset for both
 * the platform console and company owners uses a typed one-time code
 * instead (see api/auth/reset-confirm and api/auth/owner/reset-confirm),
 * so this route only ever handles signup confirmation now. Uses
 * Supabase's default "Confirm signup" template unmodified -
 * exchangeCodeForSession(code) needs no dashboard template edit.
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

  return NextResponse.redirect(`${origin}/register?confirm=failed`);
}
