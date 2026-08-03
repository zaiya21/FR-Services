import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const RESET_MINUTES = 10;

export async function POST(request){
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();

  if (email){
    const supabase = await createClient();
    /* Errors are swallowed on purpose - Supabase itself does not confirm
       whether an address is registered, and neither does this endpoint.
       The response is identical either way. */
    await supabase.auth.resetPasswordForEmail(email).catch(() => {});
  }

  return NextResponse.json({ ok: true, minutes: RESET_MINUTES });
}
