import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

const RESET_MINUTES = 10;

/**
 * Sends a real emailed one-time code - same mechanism as the platform
 * console's reset flow (app/api/auth/reset-request), now that custom SMTP
 * means the "Reset Password" template can show {{ .Token }} instead of a
 * link. No redirectTo needed: nobody's browser has to land anywhere,
 * they're typing the code into the form they're already on.
 */
export async function POST(request){
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();

  if (email){
    const supabase = await createClient();
    // Errors are swallowed on purpose - this endpoint never confirms
    // whether an address is registered.
    await supabase.auth.resetPasswordForEmail(email).catch(() => {});
  }

  return NextResponse.json({ ok: true, minutes: RESET_MINUTES });
}
