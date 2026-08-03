import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Refreshes the Supabase session cookie on every request. Access tokens are
 * short-lived; without this, a signed-in operator would get silently signed
 * out whenever the access token expired between visits, since nothing else
 * in the request cycle rotates it.
 *
 * This is the standard @supabase/ssr Next.js middleware pattern - it does
 * not itself gate any route. Route Handlers decide what a missing or
 * non-platform session means for the request they're serving.
 */
export async function updateSession(request){
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll(){ return request.cookies.getAll(); },
        setAll(cookiesToSet){
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        }
      }
    }
  );

  /* Touching auth.getUser() is what actually triggers the refresh when the
     access token is stale - a bare cookie read would not. */
  await supabase.auth.getUser();

  return response;
}
