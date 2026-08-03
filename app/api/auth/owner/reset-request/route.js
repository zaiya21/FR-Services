import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

/**
 * Sends a real, clickable password-reset link (not a typed code - that's
 * the platform console's flow, chosen there specifically to avoid needing
 * custom SMTP). Owners have custom SMTP now, so the link-based flow Supabase
 * ships by default is simpler: no email template to edit.
 *
 * Uses the cookie-aware @supabase/ssr client, not a bare one - same reason
 * as sign-up: PKCE stores a code_verifier that has to be readable from this
 * visitor's browser when they click the link and land on /auth/confirm,
 * which is a separate request. A verifier from a throwaway client has
 * nowhere to persist to and the exchange fails silently later.
 */
export async function POST(request){
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();

  if (email){
    const origin = new URL(request.url).origin;
    const supabase = await createClient();
    // Errors are swallowed on purpose - this endpoint never confirms
    // whether an address is registered, same discipline as the platform
    // console's reset-request route.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent('/reset-password')}`
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
