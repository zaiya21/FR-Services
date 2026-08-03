'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

/* =====================================================================
   Exposes a Supabase client on window for the classic scripts on
   /register and /admin - the same reason _LegacyScripts.jsx exists:
   those pages' logic runs as plain <script> tags, not ES modules, so
   there is no `import` for them to reach @supabase/ssr with directly.

   This is a BROWSER client: it reads the session cookie the sign-in
   routes set (see lib/supabase/server.js for why that cookie is
   deliberately not httpOnly) and every query it makes is authenticated
   as whoever is signed in, subject to RLS - the same as any other
   Supabase client, server or browser. It is not a privilege escalation;
   it is how a signed-in company owner reads and writes their own rows
   without a hand-rolled REST layer in front of every table.
   ===================================================================== */
export default function SupabaseBrowser(){
  useEffect(() => {
    if (window.supabaseBrowser) return;
    window.supabaseBrowser = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    window.dispatchEvent(new Event('supabase-browser-ready'));
  }, []);
  return null;
}
