import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const SESSION_HOURS = 12;
const REMEMBER_DAYS = 14;

/* The failure message is identical whether the account does not exist, the
   password is wrong, or the account is real but not a platform operator -
   otherwise the form doubles as a way to enumerate who has an account. */
const WRONG = 'That email and password do not match an account.';

export async function POST(request){
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const remember = !!body.remember;

  if (!email || !password){
    return NextResponse.json({ ok: false, error: WRONG }, { status: 400 });
  }

  const maxAge = remember ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600;
  const supabase = await createClient(maxAge);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error){
    const rateLimited = /rate limit/i.test(error.message);
    return NextResponse.json(
      { ok: false, error: rateLimited ? 'Too many attempts. Try again shortly.' : WRONG },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'platform'){
    /* A real account, but not a platform operator. Reject with the same
       generic message and drop the session we just issued. */
    await supabase.auth.signOut();
    return NextResponse.json({ ok: false, error: WRONG }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    session: {
      user: data.user.email,
      name: profile.full_name || 'FR Services Admin',
      role: profile.role,
      usingDefaultPassword: !!data.user.user_metadata?.is_default_password
    }
  });
}
