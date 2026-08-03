import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { passwordProblem } from '../../../../lib/password-rules';

export async function POST(request){
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  const password = String(body.password || '');

  if (!email || !code){
    return NextResponse.json({ ok: false, error: 'That code is not right.' }, { status: 400 });
  }
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400 });

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (verifyError){
    return NextResponse.json(
      { ok: false, error: 'That code is wrong or has expired. Request a new one.' },
      { status: 401 }
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
    data: { is_default_password: false }
  });
  await supabase.auth.signOut();

  if (updateError){
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
