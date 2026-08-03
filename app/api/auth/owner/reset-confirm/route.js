import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { passwordProblem } from '../../../../../lib/password-rules';

/**
 * Sets a new password for whoever is signed in right now. Reachable in
 * practice only after /auth/confirm has already exchanged a recovery
 * link's code for a real session - there is no email/code to check here,
 * because holding that session already proves they clicked the emailed
 * link. Leaves them signed in: they just proved ownership of the email
 * and are mid-flow, so making them log in again is friction with no
 * security benefit.
 */
export async function POST(request){
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || '');

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user){
    return NextResponse.json(
      { ok: false, error: 'Your reset link has expired. Request a new one.' },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
    data: { is_default_password: false }
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
