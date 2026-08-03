import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

const SESSION_HOURS = 12;
const REMEMBER_DAYS = 14;

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
    const unconfirmed = /confirm/i.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        error: unconfirmed
          ? 'Confirm your email first - check your inbox for the link we sent when you registered.'
          : WRONG,
        unconfirmed
      },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .single();

  return NextResponse.json({
    ok: true,
    session: {
      id: data.user.id,
      email: data.user.email,
      name: (profile && profile.full_name) || '',
      role: (profile && profile.role) || 'renter',
      emailConfirmed: !!data.user.email_confirmed_at
    }
  });
}
