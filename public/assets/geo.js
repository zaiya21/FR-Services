/* =====================================================================
   FR SERVICES - real location.
   Loaded before data.js, because data.js reads FR_GEO at parse time.

   Two jobs that look like one:

     1. WHERE THE RENTER IS. Browser geolocation, on an explicit gesture,
        with the refusal treated as a normal outcome rather than an error.
     2. WHERE THE COMPANY IS. Coordinates typed or pasted by an owner
        during registration, which is a completely different problem -
        the input is untrusted, arrives in half a dozen notations, and is
        wrong in ways that are silent unless we check.

   Both end up as the same pair of numbers, so they live together.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Distance.

   Haversine on a sphere, not an ellipsoid. The error against WGS84 is
   about 0.3% - around 150 m over 50 km - which is far below the accuracy
   of the inputs: a phone GPS fix is ±10–50 m and an owner pinning their
   own yard on a map is lucky to be within 100 m. Vincenty would compute
   a more precise answer to a less precise question.
   --------------------------------------------------------------------- */
const EARTH_KM = 6371.0088;                    // mean radius, IUGG

function haversineKm(lat1, lon1, lat2, lon2){
  if (![lat1, lon1, lat2, lon2].every(n => typeof n === 'number' && isFinite(n))) return null;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* One decimal below 10 km, whole kilometres above. Reporting "23.7 km"
   from a ±50 m fix is false precision; reporting "0 km" for a company
   across the street is worse. */
function kmLabel(km){
  if (km == null) return '';
  if (km < 0.1) return 'under 100 m';
  if (km < 10)  return km.toFixed(1) + ' km';
  return Math.round(km) + ' km';
}

/* ---------------------------------------------------------------------
   The Philippines, as a box.

   Batanes in the north, Tawi-Tawi in the south, Balabac in the west,
   the Pacific edge of Davao Oriental in the east, each with a small
   margin. A box, not a polygon: the point is to catch the mistakes that
   actually happen - a swapped pair, a dropped minus sign, a decimal
   comma, someone pasting a location from the wrong country - not to
   adjudicate whether a pin is over water.
   --------------------------------------------------------------------- */
const PH_BOUNDS = { minLat: 4.2, maxLat: 21.5, minLon: 116.7, maxLon: 126.8 };

const inPH = (lat, lon) =>
  lat >= PH_BOUNDS.minLat && lat <= PH_BOUNDS.maxLat &&
  lon >= PH_BOUNDS.minLon && lon <= PH_BOUNDS.maxLon;

/* ---------------------------------------------------------------------
   Reading coordinates a human supplied.

   Everything an owner might paste, because telling someone their
   correctly-copied coordinates are "invalid format" is how a
   registration gets abandoned:

     7.0731, 125.6128           what Google Maps' right-click gives you
     7.0731 125.6128            spaces, tabs, newlines
     7,0731, 125,6128           decimal comma (PH keyboards, Excel exports)
     7.0731N 125.6128E          hemisphere letters
     7°04'23.2"N 125°36'46.1"E  degrees/minutes/seconds, Maps' share text
     7° 4.387' N, 125° 36.768'  degrees and decimal minutes
     https://maps.google.com/…@7.0731,125.6128,17z
     https://maps.app.goo.gl/…  a short link - cannot be read, say so

   Returns { lat, lon, note } or { error }. `note` carries a correction
   that was applied, so the form can say what it did instead of silently
   changing the owner's numbers.
   --------------------------------------------------------------------- */
function parseCoords(raw){
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return { error: 'Paste or type your coordinates.' };

  /* A shortened share link resolves server-side; the browser cannot
     follow it to read the target without being blocked by CORS. Better
     to name the problem and give the fix than to fail vaguely. */
  if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(s))
    return { error: 'That is a short link, which hides the numbers. Open it, ' +
                    'then copy the coordinates out of the address bar, or ' +
                    'right-click the pin in Google Maps and copy from there.' };

  let note = '';

  /* A Google Maps URL. @lat,lon is the map centre - where the view is
     pointing. !3d/!4d is the *place* the pin is on, which is what an
     owner means, so it wins when both are present. */
  if (/^https?:\/\//i.test(s) || /google\.[a-z.]+\/maps/i.test(s)){
    const place  = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    const query  = s.match(/[?&](?:q|query|ll|daddr)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
    const centre = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    const hit = place || query || centre;
    if (!hit) return { error: 'No coordinates in that link. Right-click your ' +
                              'pin in Google Maps and choose the numbers at the top of the menu.' };
    if (hit === centre && !place)
      note = 'Read from the map centre in that link, so check the pin is where you want it.';
    s = hit[1] + ', ' + hit[2];
  }

  /* Degrees/minutes/seconds, in either notation, before the plain-number
     path - 7°04'23.2"N would otherwise read as the three numbers 7, 4
     and 23.2. */
  const dms = matchDMS(s);
  if (dms) return finish(dms.lat, dms.lon, note, dms.swapped);

  /* Decimal comma: "7,0731 125,6128". Only when it cannot be a
     thousands separator or a pair delimiter - i.e. exactly two commas,
     each with digits either side and a plausible run of decimals after.
     "7.0731, 125.6128" must not be touched. */
  if (/^[^.]*$/.test(s) && (s.match(/,/g) || []).length === 2)
    s = s.replace(/(\d),(\d)/g, '$1.$2').replace(/\.(\s)/g, '$1');

  /* Hemisphere letters, kept as signs before the letters are dropped. */
  let latSign = 1, lonSign = 1, hadNS = false, hadEW = false;
  if (/[NS]/i.test(s) && /[EW]/i.test(s)){
    hadNS = hadEW = true;
    if (/S/i.test(s)) latSign = -1;
    if (/W/i.test(s)) lonSign = -1;
    s = s.replace(/[NSEW]/gi, ' ');
  }

  const nums = (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  if (nums.length < 2)
    return { error: 'That does not look like a pair of coordinates. ' +
                    'Expected two numbers, like 7.0731, 125.6128.' };
  if (nums.length > 2)
    return { error: 'Found ' + nums.length + ' numbers there. Paste just the ' +
                    'latitude and longitude, like 7.0731, 125.6128.' };

  return finish(Math.abs(nums[0]) * (hadNS ? latSign : Math.sign(nums[0]) || 1),
                Math.abs(nums[1]) * (hadEW ? lonSign : Math.sign(nums[1]) || 1),
                note, false);

  /* ----- shared tail: order, range, precision ----- */
  function finish(lat, lon, note0, alreadySwapped){
    let n = note0, swapped = alreadySwapped;

    /* Latitude and longitude the wrong way round is the single most
       common paste error, and in the Philippines it is unambiguous:
       every valid latitude here is below 21.5 and every valid longitude
       above 116.7, so the ranges cannot overlap. Fix it and say so -
       silently accepting 125°N puts the yard in the Arctic Ocean. */
    if (!inPH(lat, lon) && inPH(lon, lat)){
      const t = lat; lat = lon; lon = t;
      swapped = true;
    }
    if (swapped) n = (n ? n + ' ' : '') +
      'Latitude and longitude were the other way round, so they have been swapped.';

    if (!isFinite(lat) || !isFinite(lon))
      return { error: 'Those numbers could not be read.' };
    if (Math.abs(lat) > 90)
      return { error: 'Latitude has to be between -90 and 90. Got ' + lat + '.' };
    if (Math.abs(lon) > 180)
      return { error: 'Longitude has to be between -180 and 180. Got ' + lon + '.' };
    if (!inPH(lat, lon))
      return { error: 'That point is outside the Philippines (' +
                      lat.toFixed(4) + ', ' + lon.toFixed(4) + '). ' +
                      'Check for a missing digit or a dropped minus sign.' };

    /* Whole degrees is a 111 km square. It is not a location, and it is
       what you get by typing "7, 125" - accepting it would put a pin
       somewhere in the sea off Davao and call it a yard. */
    if (Number.isInteger(lat) && Number.isInteger(lon))
      return { error: 'Those are whole degrees, which covers about 111 km. ' +
                      'Copy the full number, which should have four or more decimals.' };

    return { lat: round6(lat), lon: round6(lon), note: n };
  }
}

/* 7°04'23.2"N 125°36'46.1"E, and the degrees-decimal-minutes variant.
   Requires a degree mark so it cannot swallow plain decimal pairs. */
function matchDMS(s){
  if (!/[°º]/.test(s)) return null;
  const part = /(-?\d+(?:\.\d+)?)\s*[°º]\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:"|''|″)\s*)?\s*([NSEW])?/gi;
  const found = [];
  let m;
  while ((m = part.exec(s)) !== null && found.length < 3){
    const deg = Math.abs(+m[1]), min = +(m[2] || 0), sec = +(m[3] || 0);
    if (min >= 60 || sec >= 60) return null;
    let v = deg + min / 60 + sec / 3600;
    const hemi = (m[4] || '').toUpperCase();
    if (+m[1] < 0 || hemi === 'S' || hemi === 'W') v = -v;
    found.push({ v, hemi });
  }
  if (found.length !== 2) return null;

  /* Hemisphere letters, when present, say which is which regardless of
     the order they were written in. */
  const ns = found.find(f => f.hemi === 'N' || f.hemi === 'S');
  const ew = found.find(f => f.hemi === 'E' || f.hemi === 'W');
  if (ns && ew) return { lat: ns.v, lon: ew.v, swapped: found[0] !== ns };
  return { lat: found[0].v, lon: found[1].v, swapped: false };
}

const round6 = n => Math.round(n * 1e6) / 1e6;

/* Five decimals is about 1.1 m at the equator - past the accuracy of
   anything upstream, and short enough to read back over the phone. */
const formatCoords = (lat, lon) =>
  (lat == null || lon == null) ? '' : lat.toFixed(5) + ', ' + lon.toFixed(5);

/* ---------------------------------------------------------------------
   Where the renter is.

   navigator.geolocation only resolves on a secure origin - https, or
   localhost during development. On plain http Chrome rejects it with a
   generic PERMISSION_DENIED, which reads as "the user said no" and sends
   you looking in the wrong place, so that case is separated out first.
   --------------------------------------------------------------------- */
const GEO_STORE = 'fr.geo';

function geoAvailable(){
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}
function geoSecureOrigin(){
  return typeof window === 'undefined' ? false
    : window.isSecureContext || location.hostname === 'localhost'
                             || location.hostname === '127.0.0.1';
}

/* Resolves { lat, lon, accuracy, at }. Rejects with { code, message } -
   a refusal is a normal answer here, not an exception to swallow. */
function frRequestLocation(opts){
  const o = opts || {};
  return new Promise((resolve, reject) => {
    if (!geoAvailable())
      return reject({ code:'unsupported',
        message:'This browser cannot report a location.' });
    if (!geoSecureOrigin())
      return reject({ code:'insecure',
        message:'Location needs a secure connection (https). This page is on ' +
                location.protocol + ', so the browser blocks it before asking you.' });

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude:lat, longitude:lon, accuracy } = pos.coords;
        const fix = { lat: round6(lat), lon: round6(lon),
                      accuracy: Math.round(accuracy || 0), at: Date.now() };
        /* Outside the Philippines is not an error - someone abroad may be
           arranging a hire here - but it must not silently reset the
           search to a place with no coverage, so it is flagged. */
        fix.outside = !inPH(fix.lat, fix.lon);
        resolve(fix);
      },
      err => {
        const map = {
          1: { code:'denied',      message:'Location permission was declined. ' +
               'You can still choose your city by hand.' },
          2: { code:'unavailable', message:'Your device could not get a fix. ' +
               'Indoors and on desktop this is common, so try again near a window, ' +
               'or choose your city by hand.' },
          3: { code:'timeout',     message:'Getting a location took too long. Try again.' }
        };
        reject(map[err && err.code] ||
               { code:'error', message:(err && err.message) || 'Location failed.' });
      },
      /* High accuracy on: the whole point is the exact spot, and on a
         phone this is the difference between the GPS chip and a cell
         tower triangulation several kilometres wide. It costs battery
         and a few seconds, which is the right trade for a one-off. */
      { enableHighAccuracy: o.highAccuracy !== false,
        timeout: o.timeout || 12000,
        maximumAge: o.maximumAge == null ? 60000 : o.maximumAge }
    );
  });
}

/* The last fix, so a reload does not re-prompt. Deliberately not used to
   answer "where are you now" beyond a day - a stale fix quietly showing
   yesterday's city is worse than asking again. */
function geoLoad(){
  try {
    const v = JSON.parse(localStorage.getItem(GEO_STORE) || 'null');
    if (!v || typeof v.lat !== 'number' || typeof v.lon !== 'number') return null;
    if (Date.now() - (v.at || 0) > 864e5) return null;          // 24 h
    return v;
  } catch { return null; }
}
function geoSave(fix){
  try { localStorage.setItem(GEO_STORE, JSON.stringify(fix)); return true; }
  catch { return false; }
}
function geoForget(){
  try { localStorage.removeItem(GEO_STORE); return true; } catch { return false; }
}

/* ---------------------------------------------------------------------
   Naming a point.

   Nearest entry in the coordinate table, which is a label for the fix,
   not a reverse geocode - and it is only allowed to speak when it is
   close enough to be true. Beyond 60 km it returns nothing and the UI
   says "your location" instead of naming a city two provinces away.

   A real reverse geocode (Nominatim, or Google's) would give the actual
   barangay. It also adds a network call on the critical path, a rate
   limit, and a usage policy - deliberately skipped while this runs on
   fixtures. CITY_XY lives in data.js, which loads after this file, so
   the lookup is late-bound.
   --------------------------------------------------------------------- */
function nearestCity(lat, lon, maxKm){
  if (typeof CITY_XY === 'undefined') return null;
  let best = null, bestKm = Infinity;
  for (const key in CITY_XY){
    const [cy, cx] = CITY_XY[key];
    const km = haversineKm(lat, lon, cy, cx);
    if (km != null && km < bestKm){ bestKm = km; best = key; }
  }
  if (!best || bestKm > (maxKm == null ? 60 : maxKm)) return null;
  return { key: best, km: bestKm };
}
