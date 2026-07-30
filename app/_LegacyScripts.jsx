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
function loadOne(src){
  return new Promise((resolve, reject) => {
    /* A remount (React Strict Mode in dev runs effects twice) must not
       evaluate a script a second time - these declare top-level consts,
       and a second run would throw on every one of them. */
    if (document.querySelector(`script[data-legacy="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.dataset.legacy = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('failed to load ' + src));
    document.body.appendChild(el);
  });
}

export default function LegacyScripts({ srcs }){
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of srcs){
        if (cancelled) return;
        try { await loadOne(src); }
        catch (e){ console.error(e); return; }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
