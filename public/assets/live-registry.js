/* =====================================================================
   LIVE-REGISTRY - makes a real (Supabase-backed) company resolvable by
   the rest of the app, which otherwise only knows about
   localStorage['fr.companies'].

   Loaded between theme.js and data.js (deliberately after theme.js,
   which exposes the seed*Local()/*FromDb() helpers this file calls -
   see seedTheme/seedFleet below), and - unlike every other script in
   this app - the loader (see app/_LegacyScripts.jsx's `waitEvents`)
   blocks on this one before letting data.js run, because data.js builds
   FR_COMPANIES from localStorage synchronously at parse time. This is
   the one place in the whole app where that matters: an async Supabase
   fetch has to land in localStorage *before* the next script reads it,
   not just before the user notices.

   Also seeds the local fleet/theme cache (seedFleet/seedTheme) so
   `loadFleet`/`loadTheme` - both still synchronous, on purpose - see
   real data for a live company without either of them ever making a
   network call themselves. What it does not do: touch bookings or
   expenses - those stay wherever they already were until a later stage.
   Fleet/theme *writes* are real too now (see theme.js's saveFleet/
   saveTheme), but this file only ever reads and caches, never writes
   Supabase.
   ===================================================================== */
(async () => {
  const done = () => window.dispatchEvent(new Event('live-registry-ready'));

  if (typeof regUpsertMany !== 'function'){ done(); return; }

  let sb = window.supabaseBrowser;
  if (!sb){
    /* Not just "may have already fired" - if it never fires at all, this
       used to wait forever, holding up every script after it (including,
       on /admin, the gate that decides whether anything is shown at all).
       5 seconds, then give up and let the page fall back to whatever
       localStorage already had. */
    sb = await new Promise(resolve => {
      window.addEventListener('supabase-browser-ready', () => resolve(window.supabaseBrowser), { once:true });
      setTimeout(() => resolve(window.supabaseBrowser || null), 5000);
    });
  }
  if (!sb){ done(); return; }

  const SELECT = 'id,name,about,city,province,lat,lon,service_radius_km,' +
    'operating_since,listed,created_at,' +
    'company_lines(line),company_service_areas(city,province),company_themes(*),units(*)';

  function adapt(row){
    const cats = (row.company_lines || []).map(l => l.line);
    return regHydrate({
      id: row.id,
      live: true,
      name: row.name,
      slug: row.id,
      cats,
      lat: row.lat, lon: row.lon,
      radius: row.service_radius_km,
      base: [row.city, row.province].filter(Boolean).join(', '),
      city: row.city, province: row.province,
      since: row.operating_since,
      about: row.about,
      registeredAt: row.created_at ? Date.parse(row.created_at) : Date.now()
    });
  }

  /* Both of these write straight to the local cache via theme.js's
     seed*Local() helpers, never through saveTheme()/saveFleet() - those
     two now write real Supabase rows for a live company, and calling
     them here would turn "cache what we just read" into a pointless
     write-back to the same table on every single page load. Only
     reachable at all because theme.js is deliberately loaded before
     this script (see this file's own script-order note in every
     page.jsx) - the opposite order left seedTheme() silently doing
     nothing since the day it shipped, because saveTheme didn't exist
     yet when this ran. */
  function seedTheme(row){
    if (typeof seedThemeLocal !== 'function' || typeof themeFromDb !== 'function') return;
    const t = (row.company_themes && row.company_themes[0]) || null;
    seedThemeLocal(row.id, themeFromDb(t, sb));
  }

  function seedFleet(row){
    if (typeof seedFleetLocal !== 'function' || typeof unitFromDb !== 'function') return;
    const units = (row.units || []).map(u => unitFromDb(u, sb)).filter(Boolean);
    seedFleetLocal(row.id, units);
  }

  try {
    const path = location.pathname;
    let rows = [];

    if (path === '/'){
      const { data } = await sb.from('companies').select(SELECT).eq('listed', true);
      rows = data || [];
    } else if (path === '/company' || path === '/booking' || path === '/admin'){
      const wantId = new URLSearchParams(location.search).get('c');
      if (wantId){
        const { data } = await sb.from('companies').select(SELECT).eq('id', wantId).maybeSingle();
        if (data) rows = [data];
      }
    }

    if (rows.length){
      regUpsertMany(rows.map(adapt));
      rows.forEach(seedTheme);
      rows.forEach(seedFleet);
    }
  } catch (e) {
    /* A failed hydration must not block the page - it just means this
       visit falls back to whatever localStorage already had. */
    console.error('live-registry:', e);
  }

  done();
})();
