import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * A Supabase client for use in Route Handlers and Server Components.
 * Reads/writes the session as cookies via Next's cookies() store.
 *
 * NOT httpOnly - that's @supabase/ssr's own default (see
 * node_modules/@supabase/ssr/dist/module/utils/constants.js), and it has
 * to stay that way here: app/_SupabaseBrowser.jsx's browser client reads
 * this same cookie to make authenticated, RLS-scoped queries directly from
 * /admin and /register. The actual boundary is RLS plus a short-lived,
 * auto-refreshed access token - not cookie secrecy - which is the standard
 * @supabase/ssr posture, not a gap specific to this app.
 *
 * `secure` is set explicitly rather than left to a framework default,
 * since @supabase/ssr does not set it itself.
 *
 * `maxAge` lets a route control "remember me": a longer-lived cookie for a
 * remembered session, a session-only cookie (no maxAge) otherwise. Supabase
 * itself still governs the underlying token's validity; this only controls
 * how long the browser holds on to it.
 */
export async function createClient(maxAge){
  const cookieStore = await cookies();
  const cookieOptions = { secure: process.env.NODE_ENV === 'production' };
  if (maxAge) cookieOptions.maxAge = maxAge;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions,
      cookies: {
        getAll(){ return cookieStore.getAll(); },
        setAll(cookiesToSet){
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {
            /* Called from a Server Component render, which cannot set
               cookies. Harmless as long as middleware.js is also running -
               it performs the equivalent refresh on the response. */
          }
        }
      }
    }
  );
}
