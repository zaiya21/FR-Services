import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export async function GET(){
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ session: null });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    session: {
      id: user.id,
      email: user.email,
      name: (profile && profile.full_name) || '',
      role: (profile && profile.role) || 'renter',
      emailConfirmed: !!user.email_confirmed_at
    }
  });
}
