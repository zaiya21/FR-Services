import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(){
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ session: null });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  /* Only a platform operator has anything to see here - a real account
     that isn't one reads the same as being signed out, from this gate's
     point of view. */
  if (!profile || profile.role !== 'platform'){
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      user: user.email,
      name: profile.full_name || 'FR Services Admin',
      role: profile.role,
      usingDefaultPassword: !!user.user_metadata?.is_default_password
    }
  });
}
