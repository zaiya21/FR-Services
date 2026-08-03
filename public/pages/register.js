
if (typeof paintRealAuthNav === 'function') paintRealAuthNav('authNav');

/* ---------- wizard navigation ---------- */
let step = 1;
const LAST = 4;
function goto(n){
  step = n;
  document.querySelectorAll('.wpane').forEach(p => p.classList.remove('on'));
  document.getElementById('p' + n).classList.add('on');
  document.querySelectorAll('.wstep').forEach(s => {
    const i = +s.dataset.s;
    s.classList.toggle('on',   i === n);
    s.classList.toggle('done', i <  n);
    s.classList.toggle('todo', i >  n);
  });
  document.getElementById('w-back').style.display = n === 1 ? 'none' : 'inline-flex';
  document.getElementById('w-next').textContent =
    n === LAST ? 'Submit for verification' : 'Continue →';
  window.scrollTo({ top: document.getElementById('start').offsetTop - 90, behavior:'smooth' });
}
document.getElementById('w-next').addEventListener('click', () => {
  /* Step 2 is a gate, not a page. A company without DTI, a mayor's permit
     and BIR 2303 on file is not a registrable business, and letting the
     wizard run past it only moves the rejection to somewhere less useful. */
  if (step === 2 && !docsComplete()){
    showDocError();
    return;
  }
  /* Step 3 is the second gate. Without coordinates the company registers
     into a marketplace that can never surface it - every search is a
     distance query - so this cannot be deferred to "later in settings"
     any more than the permits can. */
  if (step === 3 && !coordsSet()){
    coordMsg('err', 'Your coordinates are needed before you continue. Paste them ' +
                    'above, tap “I am at the yard now”, or open the guide, because it takes ' +
                    'about thirty seconds in Google Maps.');
    document.getElementById('coordSec').scrollIntoView({ block:'center', behavior:'smooth' });
    return;
  }
  if (step < LAST) { goto(step + 1); return; }
  submitRegistration();
});
document.getElementById('w-back').addEventListener('click', () => goto(step - 1));
document.querySelectorAll('.wstep').forEach(s =>
  s.addEventListener('click', () => {
    /* The step strip is a shortcut, not a bypass. */
    const want = +s.dataset.s;
    if (want > 2 && step <= 2 && !docsComplete()){ goto(2); showDocError(); return; }
    if (want > 3 && step <= 3 && !coordsSet()){
      goto(3);
      coordMsg('err', 'Your coordinates are needed before you continue.');
      return;
    }
    goto(want);
  }));

/* =====================================================================
   SUBMIT - creates a real account and a real company row.

   Everything server-side, in one request: the owner's Supabase Auth
   account (which is what sends the real confirmation email), the company
   and its child rows, and the three required documents, uploaded to
   Storage for real. Nothing here is trusted - app/api/companies/register
   re-validates every field, the same discipline as the platform sign-in.

   Unlisted until FR Services approves it (see /platform's Registrations
   view) - registering no longer means instantly appearing in search.
   ===================================================================== */
function ownerFieldsProblem(){
  const val = id => (document.getElementById(id) || {}).value || '';
  const name = val('r-owner-name').trim();
  const email = val('r-owner-email').trim();
  const pass = val('r-owner-pass');
  const pass2 = val('r-owner-pass2');
  if (name.length < 2) return { field:1, msg:'Your full name is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { field:1, msg:'Enter a valid email address.' };
  if (pass !== pass2) return { field:1, msg:'The two passwords do not match.' };
  const problem = (typeof companyPasswordProblem === 'function') ? companyPasswordProblem(pass) : null;
  if (problem) return { field:1, msg: problem };
  return null;
}

async function submitRegistration(){
  const val = id => (document.getElementById(id) || {}).value || '';
  const cats = [...document.querySelectorAll('.cpick.on')].map(c => c.dataset.c);

  const ownerProblem = ownerFieldsProblem();
  if (ownerProblem){
    document.getElementById('ownerErr').textContent = ownerProblem.msg;
    goto(1);
    document.getElementById('ownerErr').scrollIntoView({ block:'center', behavior:'smooth' });
    return;
  }

  const company = {
    name:     val('r-name').trim(),
    slug:     val('r-slug').trim() || val('r-name').trim(),
    cats,
    lat: COORD.lat, lon: COORD.lon,
    radius:   +val('rad') || 25,
    base:     val('r-base').trim(),
    city:     val('r-city').trim(),
    province: val('r-prov').trim(),
    since:    +val('r-since') || undefined,
    phone:    val('r-phone').trim(),
    email:    val('r-email').trim(),
    about:    val('r-addr').trim(),
    brand, accent
  };

  const fd = new FormData();
  fd.append('ownerName', val('r-owner-name').trim());
  fd.append('ownerEmail', val('r-owner-email').trim());
  fd.append('ownerPassword', val('r-owner-pass'));
  fd.append('company', JSON.stringify(company));
  for (const type of Object.keys(regFiles)) fd.append('doc_' + type, regFiles[type]);

  const submitBtn = document.getElementById('w-next');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  let out;
  try {
    const res = await fetch('/api/companies/register', { method:'POST', body: fd });
    out = await res.json();
  } catch (e) {
    out = { ok:false, error:'Could not reach the server. Check your connection and try again.' };
  }
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit for verification';

  if (!out.ok){
    const err = document.getElementById('docErr');
    if (err) err.textContent = 'Could not complete registration: ' + out.error;
    coordMsg('err', 'Could not complete registration: ' + out.error);
    if (/coordinate/i.test(out.error || '')) goto(3);
    else if (out.field === 1 || /email|password|name/i.test(out.error || '')){
      document.getElementById('ownerErr').textContent = out.error;
      goto(1);
    } else goto(1);
    return;
  }

  document.getElementById('done-ref').textContent = out.id.slice(0, 4).toUpperCase();
  const ph = company.phone;
  if (ph) document.getElementById('done-phone').textContent = ph;

  const done = document.getElementById('r-done');
  const extra = document.createElement('div');
  extra.className = 'row gap3';
  extra.style.cssText = 'flexWrap:wrap;justifyContent:center';
  extra.innerHTML =
    '<a class="btn btn-i btn-lg" href="/">Browse the marketplace</a>' +
    '<a class="btn btn-w btn-lg" href="/">Back to home</a>';

  const note = document.createElement('p');
  note.className = 'small muted mt3';
  note.style.lineHeight = '1.6';
  note.textContent =
    'We\'ve emailed ' + out.ownerEmail + ' a confirmation link. Click it, then sign in at ' +
    '/admin to reach your dashboard - that\'s also where our team\'s document review shows up. ' +
    'Your company will not appear on the marketplace until both your email is confirmed and ' +
    'your documents are verified.';
  done.insertBefore(note, done.querySelector('.timeline'));

  if (out.docFailures && out.docFailures.length){
    const warn = document.createElement('p');
    warn.className = 'small mt3';
    warn.style.cssText = 'line-height:1.6;color:var(--danger, #B91C1C);font-weight:600';
    warn.textContent =
      (out.docFailures.length === 1 ? 'One document' : out.docFailures.length + ' documents') +
      ' did not save (' + out.docFailures.map(f => f.type).join(', ') + '). ' +
      'Everything else about your registration went through - sign in at /admin once your ' +
      'email is confirmed and re-upload it there.';
    done.insertBefore(warn, done.querySelector('.timeline'));
  }

  const oldLinks = done.querySelector('.row.gap3');
  if (oldLinks) oldLinks.replaceWith(extra); else done.appendChild(extra);

  document.getElementById('wiz').style.display = 'none';
  done.classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================================
   STEP 2 - VERIFICATION DOCUMENTS
   Three required, with a file each. Everything else is optional and says
   so. The list is built from DOC_TYPES in ops.js rather than typed here,
   so "what FR Services verifies" has exactly one definition.
   ===================================================================== */
const REQ_HINT = {
  dti:    'Certificate of business name registration.',
  permit: 'Current year, from your city or municipal hall.',
  bir:    'Certificate of registration, Form 2303.'
};
const OPT_TYPES = [
  { id:'insurance', label:'Insurance certificate',        hint:'Comprehensive or CTPL cover.' },
  { id:'lto',       label:'LTO registration (OR/CR)',     hint:'For vehicles you list. One file is fine to start.' },
  { id:'ltfrb',     label:'Tow operator accreditation',   hint:'If you offer emergency towing.' },
  { id:'pcab',      label:'PCAB contractor licence',      hint:'If you rent out heavy equipment.' },
  { id:'tesda',     label:'Operator certifications',      hint:'TESDA NC II for machine operators.' },
  { id:'other',     label:'Anything else',                hint:'Awards, accreditations, safety records.' }
];

/* id -> { name, size, type }. Files are held in memory only; this wizard
   does not persist anything until a real backend exists. */
const regFiles = {};

const UP_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';
const OK_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>';
const escR = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function uploadRow(id, label, hint, required){
  const f = regFiles[id];
  const cls = f ? 'done' : (required && docTouched ? 'missing' : '');
  return `<label class="upl ${cls}" data-doc="${id}">
    <span class="ic">${f ? OK_SVG : UP_SVG}</span>
    <span><b>${escR(label)}<span class="${required ? 'req' : 'opt'}">${required ? 'Required' : 'Optional'}</span></b>
      <span>${f ? escR(f.name) + ' · ' + (f.size / 1024).toFixed(0) + ' KB' : escR(hint)}</span></span>
    <span class="drop">
      ${f ? `<button type="button" class="clr" data-clr="${id}">Remove</button>` : ''}
      <span class="act">${f ? 'Replace' : 'Upload'}</span>
    </span>
    <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" data-file="${id}">
  </label>`;
}

/* Has the operator tried to move on yet? Before that, an empty required
   row is just an empty row - flagging it red on arrival is nagging. */
let docTouched = false;

function requiredTypes(){
  /* REVIEWABLE_TYPES is the same list the platform reviews against. */
  return (typeof DOC_TYPES !== 'undefined' ? DOC_TYPES.filter(t => t.reviewable) : [])
    .map(t => ({ id:t.id, label:t.label, hint:REQ_HINT[t.id] || '' }));
}
const missingRequired = () => requiredTypes().filter(t => !regFiles[t.id]);
const docsComplete = () => missingRequired().length === 0;

function paintDocs(){
  const req = requiredTypes();
  document.getElementById('reqUploads').innerHTML =
    req.map(t => uploadRow(t.id, t.label, t.hint, true)).join('');
  document.getElementById('optUploads').innerHTML =
    OPT_TYPES.map(t => uploadRow(t.id, t.label, t.hint, false)).join('');

  const have = req.length - missingRequired().length;
  const bar  = document.getElementById('reqBar');
  bar.className = 'reqbar ' + (docsComplete() ? 'ok' : docTouched ? 'no' : '');
  bar.innerHTML =
    `<span class="cnt">${have} / ${req.length}</span>` +
    `<span class="msg">${docsComplete()
      ? '<b>All three are attached.</b>You can continue. We will check each one with the office that issued it.'
      : `<b>${missingRequired().map(t => t.label).join(', ')} still needed.</b>` +
        'Registration cannot be completed until all three have a file attached.'}</span>`;

  /* The button stays clickable and explains itself. A disabled button that
     never says why is the most common way to strand someone in a form. */
  const next = document.getElementById('w-next');
  if (step === 2) next.textContent = docsComplete() ? 'Continue →' : 'Continue →';
}

function showDocError(){
  docTouched = true;
  paintDocs();
  const err = document.getElementById('docErr');
  err.textContent =
    'Attach a file for ' + missingRequired().map(t => t.label).join(', ') +
    ' before continuing. These three are what we verify, and without them there is nothing to check.';
  document.getElementById('reqBar').scrollIntoView({ block:'center', behavior:'smooth' });
}

document.getElementById('p2').addEventListener('change', e => {
  const input = e.target.closest('[data-file]');
  if (!input) return;
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  const problem = (typeof docFileProblem === 'function') ? docFileProblem(f) : null;
  if (problem){ document.getElementById('docErr').textContent = problem; return; }
  /* The actual File, not just its metadata - submitRegistration() uploads
     these bytes for real now that there is somewhere real to put them. */
  regFiles[input.dataset.file] = f;
  document.getElementById('docErr').textContent = '';
  paintDocs();
});
document.getElementById('p2').addEventListener('click', e => {
  const b = e.target.closest('[data-clr]');
  if (!b) return;
  e.preventDefault();
  delete regFiles[b.dataset.clr];
  paintDocs();
});
paintDocs();

/* ---------- what it costs, from the one rate table ---------- */
(() => {
  const host = document.getElementById('costTiles');
  if (!host || typeof PLATFORM_RATES === 'undefined') return;
  const pc = n => Math.round(n * 100) + '%';
  const tile = (k, v, last) =>
    `<div class="tile"${last ? ' style="margin-bottom:0"' : ''}>` +
    `<span class="small muted">${escR(k)}</span><b>${escR(v)}</b></div>`;
  host.innerHTML =
    tile('Listing your company', PLATFORM_SUBSCRIPTION ? '₱' + PLATFORM_SUBSCRIPTION : 'Free') +
    tile('Monthly fee', '₱' + PLATFORM_SUBSCRIPTION) +
    tile('Commission per completed booking', pc(PLATFORM_RATES.vehicles)) +
    tile('Emergency tow dispatch', pc(PLATFORM_RATES.towing), true);
})();

/* ---------- step 1: categories ---------- */
const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>';
function syncCats(){
  const on = [...document.querySelectorAll('.cpick.on')]
    .map(c => FR_CATS[c.dataset.c].label);
  document.getElementById('pv-cats').innerHTML =
    (on.length ? on : ['Select a category']).map(l => `<span class="t">${l}</span>`).join('');
}
document.querySelectorAll('.cpick').forEach(c => c.addEventListener('click', () => {
  c.classList.toggle('on');
  c.querySelector('.tick').innerHTML = c.classList.contains('on') ? TICK : '';
  syncCats();
}));
syncCats();

document.getElementById('r-name').addEventListener('input', e => {
  document.getElementById('pv-name').textContent = e.target.value.trim() || 'Your Company Name';
});
document.getElementById('r-city').addEventListener('input', syncLoc);

/* ---------- step 2: uploads ---------- */
document.querySelectorAll('.upl').forEach(u => u.addEventListener('click', e => {
  e.preventDefault();
  u.classList.toggle('done');
  const done = u.classList.contains('done');
  u.querySelector('.act').textContent = done ? 'Uploaded' : 'Upload';
  u.querySelector('.ic').innerHTML = done
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';
}));

/* =====================================================================
   STEP 3 - WHERE THE YARD IS

   The coordinate pair is the only piece of this form the marketplace
   cannot work without: matching is by distance, so a company with no pin
   is invisible to every search. Three ways in, because owners arrive with
   different things in hand - a pasted string, a phone standing in the
   yard, or a finger on a map - and all three converge on the same two
   numbers.
   ===================================================================== */
let COORD = { lat:null, lon:null, accuracy:null, source:null };
let coordMap = null, coordPin = null, coordRing = null;

function coordMsg(kind, html){
  const el = document.getElementById('coordMsg');
  el.className = 'coordmsg' + (kind ? ' ' + kind : '');
  el.innerHTML = html || '';
  document.getElementById('coordSec').classList.toggle('bad', kind === 'err');
  document.getElementById('coordSec').classList.toggle('ok', kind === 'good');
}

const coordsSet = () => typeof COORD.lat === 'number' && typeof COORD.lon === 'number';

/* One place writes the coordinate state, so the two number fields, the
   paste box, the map pin and the preview can never disagree about where
   the yard is. `from` says which input caused it, and that input is the
   one field NOT written back - retyping a value into the box someone is
   still typing in moves their cursor. */
function setCoords(lat, lon, opts){
  const o = opts || {};
  COORD.lat = lat; COORD.lon = lon;
  COORD.accuracy = o.accuracy == null ? null : o.accuracy;
  COORD.source = o.source || 'typed';

  if (o.from !== 'fields'){
    document.getElementById('r-lat').value = lat.toFixed(5);
    document.getElementById('r-lon').value = lon.toFixed(5);
  }
  if (o.from !== 'paste')
    document.getElementById('r-coord').value = formatCoords(lat, lon);

  showCoordMap(lat, lon, o.zoom);
  /* The radius panel is measured from this point, so it is stale until the
     coordinates land. Guarded because setCoords can fire from the paste box
     before syncRadius is defined further down this script. */
  if (typeof syncRadius === 'function') syncRadius();
  syncLoc();
  return COORD;
}

/* The map appears only once there is something to show. An empty map above
   an empty field is furniture; the same map with a pin on it is the only
   check an owner can actually perform on their own numbers. */
function showCoordMap(lat, lon, zoom){
  const wrap = document.getElementById('coordMapWrap');
  wrap.hidden = false;
  document.getElementById('coordNote').hidden = false;

  if (!window.L){
    wrap.innerHTML = '<p class="coordnote" style="padding:14px">Map unavailable, but ' +
      'the coordinates above are still saved.</p>';
    return;
  }

  const at = [lat, lon];
  if (!coordMap){
    coordMap = L.map('coordMap', { scrollWheelZoom:true, zoomControl:true })
                .setView(at, zoom || 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(coordMap);

    coordPin = L.marker(at, {
      draggable: true,
      icon: L.divIcon({ html:'<span class="ypin"></span>', className:'', iconSize:[0,0] })
    }).addTo(coordMap);

    /* Dragging is the fix for a pin that landed on the wrong side of the
       road, which is the common case with a pasted coordinate. */
    coordPin.on('dragend', () => {
      const p = coordPin.getLatLng();
      applyPoint(p.lat, p.lng, 'map');
    });
    coordMap.on('click', e => applyPoint(e.latlng.lat, e.latlng.lng, 'map'));

    /* Leaflet measures the container when the map is created. This one is
       created inside a `hidden` wrapper on a wizard pane that may itself be
       display:none, so the first measurement can be zero and the tiles come
       out stacked in the corner. Re-measure once laid out. */
    setTimeout(() => coordMap.invalidateSize(), 60);
  } else {
    coordPin.setLatLng(at);
    coordMap.setView(at, zoom || Math.max(coordMap.getZoom(), 15));
    setTimeout(() => coordMap.invalidateSize(), 30);
  }

  /* The GPS accuracy circle, same reasoning as the marketplace map: a
     ±800 m fix drawn as a pin is a precise-looking lie. */
  if (coordRing){ coordMap.removeLayer(coordRing); coordRing = null; }
  if (COORD.source === 'gps' && COORD.accuracy > 40){
    coordRing = L.circle(at, { radius: COORD.accuracy, color:'#057A2F',
      weight:1.5, opacity:.5, fillColor:'#057A2F', fillOpacity:.10,
      interactive:false }).addTo(coordMap);
  }
}

/* Shared tail for a point that arrived already parsed - from the map, or
   from the device. Still range-checked: a dragged pin can leave the
   country as easily as a typed one. */
function applyPoint(lat, lon, from){
  const r = parseCoords(lat.toFixed(6) + ', ' + lon.toFixed(6));
  if (r.error){ coordMsg('err', r.error); return false; }
  setCoords(r.lat, r.lon, { source: from === 'map' ? 'map' : 'typed', from });
  coordMsg('good', from === 'map'
    ? 'Pin moved to <b>' + formatCoords(r.lat, r.lon) + '</b>.'
    : 'Set to <b>' + formatCoords(r.lat, r.lon) + '</b>.');
  return true;
}

/* ---- the paste box ---- */
function readPaste(){
  const raw = document.getElementById('r-coord').value;
  if (!raw.trim()){ coordMsg('', ''); return; }
  const r = parseCoords(raw);
  if (r.error){ coordMsg('err', r.error); return; }
  setCoords(r.lat, r.lon, { source:'typed', from:'paste' });
  /* A correction that was applied silently is a correction the owner
     cannot check. Say what changed and show the result. */
  coordMsg(r.note ? 'warn' : 'good',
    (r.note ? r.note + ' ' : '') +
    'Pin placed at <b>' + formatCoords(r.lat, r.lon) + '</b>. ' +
    'Check the map below before continuing.');
}
document.getElementById('r-coord').addEventListener('change', readPaste);
document.getElementById('r-coord').addEventListener('paste', () => setTimeout(readPaste, 0));
document.getElementById('r-coord').addEventListener('blur', readPaste);

/* ---- the two number fields ---- */
function readFields(){
  const la = document.getElementById('r-lat').value.trim();
  const lo = document.getElementById('r-lon').value.trim();
  if (!la || !lo) return;
  const r = parseCoords(la + ', ' + lo);
  if (r.error){ coordMsg('err', r.error); return; }
  setCoords(r.lat, r.lon, { source:'typed', from:'fields' });
  coordMsg('good', 'Pin placed at <b>' + formatCoords(r.lat, r.lon) + '</b>.');
}
document.getElementById('r-lat').addEventListener('change', readFields);
document.getElementById('r-lon').addEventListener('change', readFields);

/* ---- "I am at the yard now" ----
   The most accurate of the three by a wide margin, and the only one with
   no transcription step, so it is offered first. */
document.getElementById('r-gps').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  coordMsg('', 'Asking your device for a location…');
  try {
    const fix = await frRequestLocation();
    COORD.source = 'gps';
    setCoords(fix.lat, fix.lon, { accuracy:fix.accuracy, source:'gps', zoom:17 });
    coordMsg(fix.accuracy > 100 ? 'warn' : 'good',
      'Your device reports <b>' + formatCoords(fix.lat, fix.lon) + '</b>, accurate to ' +
      'about <b>' + fix.accuracy + ' m</b>.' +
      (fix.accuracy > 100
        ? ' That is a wide fix, probably a wifi or cell estimate rather than GPS. ' +
          'Drag the pin onto your gate, or step outside and try again.'
        : ' Check the pin is on your gate and drag it if not.'));
  } catch (err) {
    coordMsg('err', err.message + ' You can still paste your coordinates above.');
  } finally { btn.disabled = false; }
});

/* ---- the guide ---- */
const guide = document.getElementById('coordGuide');
const guideBtn = document.getElementById('r-guide-open');
function toggleGuide(open){
  guide.hidden = !open;
  guideBtn.setAttribute('aria-expanded', String(open));
  guideBtn.textContent = open ? 'Hide the guide' : 'How do I find my coordinates?';
  if (open) guide.scrollIntoView({ block:'nearest', behavior:'smooth' });
}
guideBtn.addEventListener('click', () => toggleGuide(guide.hidden));
document.getElementById('r-guide-close').addEventListener('click', () => {
  toggleGuide(false);
  guideBtn.focus();
});

/* ---------- step 3: radius ----------
   This used to read from a hardcoded table of Davao-area tiers, with an
   "est. N renters" figure computed as km × 248. Both were fixtures, and
   both became false the moment coordinates were real: a company in Cebu
   was shown a list of cities in Davao Region, and the renter estimate was
   a number with no source at all. Now it is measured - from the owner's
   own pin, against the same coordinate table the marketplace searches.  */
function reachedCities(lat, lon, km){
  if (typeof CITY_XY === 'undefined' || typeof haversineKm !== 'function') return [];
  const out = [];
  for (const key in CITY_XY){
    const [cy, cx] = CITY_XY[key];
    const d = haversineKm(lat, lon, cy, cx);
    if (d != null && d <= km) out.push({ key, km: d });
  }
  return out.sort((a, b) => a.km - b.km);
}

/* CITY_XY keys are normalised ("davao"), so resolve back to the PSGC
   spelling for display rather than showing the lookup key. */
function cityLabel(key){
  if (typeof PH_PLACES !== 'undefined' && typeof phPlace === 'function'){
    const i = PH_PLACES.findIndex(p => normCity(p[0]) === key);
    if (i >= 0) return phPlace(i).name;
  }
  return key.replace(/\b\w/g, c => c.toUpperCase());
}

function syncRadius(){
  const km = +document.getElementById('rad').value;
  document.getElementById('rad-v').textContent = km + ' km';
  document.getElementById('pv-rad').textContent = km + 'km';

  const host = document.getElementById('rad-cities');
  const note = document.getElementById('rad-r');

  if (!coordsSet()){
    note.textContent = 'set your coordinates to see what this reaches';
    host.innerHTML = '<span class="small muted">Your service area is measured ' +
      'from your pin, so it appears once your coordinates are set.</span>';
    syncLoc();
    return;
  }

  const hits = reachedCities(COORD.lat, COORD.lon, km);
  /* Honest about its own limits: this is measured against the 40 cities we
     hold coordinates for, not all 1,634 places in the country, and saying
     "reaches 7 cities" without that caveat overstates a partial answer. */
  note.textContent = hits.length
    ? 'reaches ' + hits.length + ' of the major cities we track'
    : 'no major city we track is within ' + km + ' km';
  host.innerHTML = hits.length
    ? hits.slice(0, 14).map(h =>
        `<span class="t">${cityLabel(h.key)} · ${Math.round(h.km)} km</span>`).join('') +
      (hits.length > 14 ? `<span class="t">+${hits.length - 14} more</span>` : '')
    : '<span class="small muted">Renters searching those cities will not see ' +
      'you. Widen the radius if you are willing to travel further.</span>';
  syncLoc();
}
function syncLoc(){
  const city = document.getElementById('r-city').value.trim() || 'Your city';
  const km = document.getElementById('rad').value;
  document.getElementById('pv-loc').textContent = `${city} · ${km} km radius`;
}
document.getElementById('rad').addEventListener('input', syncRadius);
syncRadius();

/* ---------- step 4: theme ---------- */
let brand = '#057A2F', accent = '#F2B705';
function paint(){
  document.getElementById('pv-hero').style.background =
    `linear-gradient(115deg,${brand},${accent})`;
  document.getElementById('pv-logo').style.background = accent;
  document.getElementById('pv-btn').style.background = brand;
}
function group(id, fn){
  document.querySelectorAll('#' + id + ' .swatch, #' + id + ' .lay')
    .forEach(s => s.addEventListener('click', () => {
      document.querySelectorAll('#' + id + ' .swatch, #' + id + ' .lay')
        .forEach(x => x.classList.remove('on'));
      s.classList.add('on');
      fn(s.dataset.c || s.dataset.l);
    }));
}
group('sw-p', v => { brand = v;  paint(); });
group('sw-a', v => { accent = v; paint(); });
group('sw-l', () => {});
document.getElementById('r-slug').addEventListener('input', e => {
  const s = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-') || 'your-company';
  document.getElementById('pv-slug').textContent = s;
});
paint();
