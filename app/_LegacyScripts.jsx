'use client';

import { useEffect } from 'react';

/* =====================================================================
   Loads the application's classic scripts, in order, after the markup is
   in the DOM.

   Why not <Script> from next/script: those are not guaranteed to execute
   in the order they are declared, and this code depends on it absolutely
   - data.js reads globals from theme.js, ops.js reads both, and every
   page script reads all of them. One script tag at a time, each awaiting
   the last, is the browser's own ordering guarantee and the only one
   worth relying on here.

   The scripts themselves are untouched. They still query the same DOM ids
   and attach the same listeners; React renders the markup and then gets
   out of the way. Nothing in assets/ knows this is a Next.js app.
   ===================================================================== */
function loadOne(src, waitEvent){
  return new Promise((resolve, reject) => {
    /* A remount (React Strict Mode in dev runs effects twice) must not
       evaluate a script a second time - these declare top-level consts,
       and a second run would throw on every one of them. */
    if (document.querySelector(`script[data-legacy="${src}"]`)) return resolve();

    /* The waitEvent listener must be armed BEFORE the script can possibly
       run, not inside onload. onload fires once the script's own top-level
       synchronous code has run - but if that code has no real await left
       to reach (e.g. live-registry.js on a bare /admin visit, where
       window.supabaseBrowser is already set and there's no ?c= to fetch),
       its whole body runs synchronously and it can dispatch its ready
       event *during* that same synchronous run, before onload even fires.
       Attaching the listener in onload would then be listening for an
       event that already happened - a permanent, silent hang. Tracking
       both flags and resolving once both are true handles either order. */
    let scriptLoaded = false;
    let eventFired = false;
    if (waitEvent){
      window.addEventListener(waitEvent, () => {
        eventFired = true;
        if (scriptLoaded) resolve();
      }, { once:true });
    }

    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.legacy = src;
    el.onload = () => {
      scriptLoaded = true;
      if (!waitEvent || eventFired) resolve();
    };
    el.onerror = () => reject(new Error('failed to load ' + src));
    document.body.appendChild(el);
  });
}

export default function LegacyScripts({ srcs, waitEvents }){
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of srcs){
        if (cancelled) return;
        try { await loadOne(src, waitEvents && waitEvents[src]); }
        catch (e){ console.error(e); return; }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
