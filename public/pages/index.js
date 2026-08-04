
/* =====================================================================
   ONE filter state. The hero search form, the category panels, the
   toolbar chips and the sort control all write here - nothing filters
   independently, so they can never disagree about what's on screen.
   ===================================================================== */
const FILTERS = {
  cat:null, city:FR_GEO.city, province:FR_GEO.province, type:'', when:'',
  company:'', maxKm:200, availNow:false, operator:false, delivery:false, instant:false,
  sort:'near'
};

const $ = id => document.getElementById(id);
const CAT_LABEL = { vehicles:'Vehicle companies near you',
                    equipment:'Heavy equipment providers near you',
                    towing:'Towing services near you' };
const SORT_LABEL = { near:'sorted by distance', rating:'sorted by rating',
                     price:'sorted by price', avail:'available first' };

$('s-loc').value = FILTERS.city;

/* =====================================================================
   LOCATION PICKER - searches all 1,634 PSGC cities/municipalities.
   Built once and used twice: as a dropdown under the hero search field,
   and as a modal from the geo bar's "Change location".

   Manual override matters as much as auto-detect: someone in Manila
   planning a Boracay trip needs to browse Aklan providers, not the ones
   outside their office. Detection is a convenience, never a cage.
   ===================================================================== */
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hl(text, q){
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? esc(text)
    : esc(text.slice(0,i)) + '<mark>' + esc(text.slice(i,i+q.length)) + '</mark>' + esc(text.slice(i+q.length));
}

const PIN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

function locRow(p, q, n){
  /* Lead with the name people recognise. Boracay is the search term;
     Malay is the municipality it actually belongs to. */
  const title = p.as || p.name;
  const sub = (p.as ? p.name + ', ' : '') + (p.province || '') +
              (!p.region || p.province === p.region ? '' : ' · ' + p.region);
  return `<button type="button" class="copt ${n ? 'has' : ''}" role="option"
      aria-selected="false" data-val="${esc(p.name)}" data-prov="${esc(p.province || '')}">
    <span class="ci">${PIN}</span>
    <span class="ct">
      <b>${hl(title, q)}</b>
      <small>${esc(sub)}</small>
    </span>
    ${n ? `<span class="cnt">${n}</span>` : ''}
  </button>`;
}

/* Build the option list for a query. Empty query shows where we actually
   operate - otherwise the picker is 1,600 dead ends with a dozen live
   ones buried among them. */
function locRows(q){
  /* Resolve a {name, province} to its full PSGC record for display. */
  function resolve(cv){
    const i = PH_PLACES.findIndex(p =>
      normCity(p[0]) === normCity(cv.name) &&
      normCity(PH_PROVINCES[p[1]][0]) === normCity(cv.province));
    return i >= 0 ? { ...phPlace(i), as: cv.as } : { ...cv, region:'' };
  }

  if (!q){
    /* Nothing typed yet. Lead with popular destinations - those are the
       searches that actually happen - then the full covered list, then
       say plainly that the other 1,600 places are searchable too. */
    const popular = FR_POPULAR.map(resolve);
    const seen = new Set(popular.map(p => normCity(p.name) + '|' + normCity(p.province)));
    const pop = popular.map(p => locRow(p, '', providersIn(p.name, p.province)));
    const cov = FR_COVERED.map(resolve)
      .filter(p => !seen.has(normCity(p.name) + '|' + normCity(p.province)))
      .map(p => locRow(p, '', providersIn(p.name, p.province)));
    return '<div class="cgroup">Popular destinations</div>' + pop.join('') +
           '<div class="cgroup">More cities we cover</div>' + cov.join('') +
           `<div class="chint">Type to search all ${PH_PLACES.length.toLocaleString('en-PH')} cities and municipalities in the Philippines</div>`;
  }
  /* Destination nicknames that aren't LGUs - "Boracay" is a barangay of
     Malay, "BGC" is part of Taguig. Surface the containing municipality
     and say why, rather than returning nothing. */
  let html = '', aliasIdx = -1;
  const al = phAlias(q);
  if (al){
    const p = phPlace(al.index);
    aliasIdx = al.index;
    html += `<div class="cgroup">“${esc(al.alias)}” is in ${esc(p.name)}</div>` +
            locRow(p, '', providersIn(p.name, p.province));
  }

  const hits = phSearch(q, 60).map(phPlace)
    .filter(p => !(aliasIdx >= 0 && p.name === phPlace(aliasIdx).name
                                 && p.province === phPlace(aliasIdx).province));
  if (!hits.length && !al)
    return `<div class="cnone"><b>No match for “${esc(q)}”</b>Check the spelling, or try the province name.</div>`;

  const withN = hits.map(p => [p, providersIn(p.name, p.province)]);
  const live  = withN.filter(([, n]) => n > 0);
  const rest  = withN.filter(([, n]) => n === 0);
  if (live.length) html += '<div class="cgroup">Available now</div>' +
    live.map(([p, n]) => locRow(p, q, n)).join('');
  if (rest.length) html += `<div class="cgroup">${live.length ? 'No providers yet' : 'Matching places'}</div>` +
    rest.map(([p]) => locRow(p, q, 0)).join('');
  return html;
}

function makeLocPicker({ input, list, onPick, modal, toggle }){
  let items = [], active = -1;
  const wrap = input.closest('.combo');           // null for the modal

  function open(q){
    list.innerHTML = locRows(q === undefined ? input.value.trim() : q);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (wrap) wrap.classList.add('open');         // flips the chevron
    items = [...list.querySelectorAll('.copt')];
    active = -1;
    if (!modal) flip();
  }
  /* drop upward when the field sits too low for a 350px list */
  function flip(){
    list.classList.remove('up');
    const r = input.getBoundingClientRect();
    const need = Math.min(list.scrollHeight + 16, 358);
    if (r.bottom + need > window.innerHeight && r.top > need) list.classList.add('up');
  }
  function close(){
    if (modal) return;                    // the modal's list is always shown
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (wrap) wrap.classList.remove('open');
    items = []; active = -1;
  }
  function move(step){
    if (!items.length) return;
    if (active >= 0) items[active].classList.remove('active');
    active = (active + step + items.length) % items.length;
    items[active].classList.add('active');
    items[active].scrollIntoView({ block:'nearest' });
  }

  input.addEventListener('input', () => open());
  /* focus alone isn't enough: after closing via the button the input is
     still focused, so a second click would fire no focus event */
  input.addEventListener('click', () => { if (list.hidden) open(''); });
  input.addEventListener('focus', () => {
    /* select-all in a timeout so the click's mouseup doesn't undo it -
       typing then replaces the pre-filled city instead of appending */
    setTimeout(() => input.select(), 0);
    open('');
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown'){ e.preventDefault(); if (list.hidden) open(); else move(1); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); move(-1); }
    else if (e.key === 'Enter'){
      e.preventDefault();
      const el = active >= 0 ? items[active] : items[0];
      if (el) onPick(el.dataset.val, el.dataset.prov);
    }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', e => {
    /* mousedown, not click - blur would tear the list down first */
    const o = e.target.closest('.copt');
    if (o){ e.preventDefault(); onPick(o.dataset.val, o.dataset.prov); }
  });

  /* The browse button toggles. It must not fall through to the document
     click handler or to the text zone's focus-the-input handler. */
  if (toggle) toggle.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (list.hidden){ input.focus(); open(''); } else { close(); }
  });

  return { open, close };
}

/* --- instance 1: dropdown under the hero search field --- */
const heroPicker = makeLocPicker({
  input: $('s-loc'), list: $('loc-list'), toggle: $('s-loc-toggle'),
  onPick(val, prov){ setCity(val, prov); heroPicker.close(); }
});
/* clicking the label or the padding around the input focuses it -
   scoped to the text zone so the browse button keeps its own click */
document.querySelector('.combo .ctext')
  .addEventListener('click', () => $('s-loc').focus());
document.addEventListener('click', e => {
  if (!e.target.closest('.combo')) heroPicker.close();
});

/* --- instance 2: modal from the geo bar --- */
const locModal = $('locModal');
const modalPicker = makeLocPicker({
  input: $('lm-input'), list: $('lm-list'), modal: true,
  onPick(val, prov){ setCity(val, prov); closeLocModal(); }
});

/* One place sets the active city, so the geo bar, the hero field and the
   results can never drift out of sync. Province comes along because city
   names repeat across the country. */
/* `explicit` distinguishes a renter picking a city from the first paint
   seeding the fallback one. Both move the origin; only one of them is a
   choice, and the geo bar reports provenance - labelling the default
   "You chose this" on a first visit is a small lie that undermines the
   one part of the bar that is meant to be checkable. */
function setCity(val, prov, opts){
  const explicit = !opts || opts.explicit !== false;
  FR_GEO.city = FILTERS.city = val;
  FILTERS.province = FR_GEO.province = prov || '';

  /* Choosing a city by hand moves the origin to that city, so distances
     and the map follow the choice. Without this the cards would say "2 km"
     while showing companies in a city 900 km away - the distance would
     still be measured from the abandoned GPS fix. */
  const at = cityLatLon(val);
  if (at){
    FR_GEO.lat = at[0]; FR_GEO.lon = at[1];
    FR_GEO.accuracy = null;
    FR_GEO.source = explicit ? 'explicit' : 'default';
    frRedistance();
  }
  paintGeoBar();
  $('s-loc').value = val;
  render();
}

/* ---------------------------------------------------------------------
   The headline numbers.

   Every one of these was hardcoded - "1,900+ registered companies",
   "631 units", "4.86 average rating" - which was fine over a seeded
   dataset and became a straightforward falsehood the moment the
   marketplace was emptied. A listing site inflating its own inventory is
   the exact thing renters are right to distrust, so they are derived, and
   they are allowed to say zero.
   --------------------------------------------------------------------- */
function paintHeadline(){
  for (const k in FR_CATS){
    const el = $('pc-' + k);
    if (el) el.textContent = FR_CATS[k].units.toLocaleString('en-PH') + ' units';
  }
  const n = FR_COMPANIES.length;
  const cos = $('st-cos');
  if (cos) cos.textContent = n.toLocaleString('en-PH');

  /* Provinces, not regions: with a handful of companies "1 region covered"
     overstates reach far less honestly than the province they are in. */
  const provs = new Set(FR_COMPANIES.map(c => c.province).filter(Boolean));
  const pv = $('st-provinces'), pvl = $('st-provinces-l');
  if (pv)  pv.textContent = provs.size;
  if (pvl) pvl.textContent = provs.size === 1 ? 'Province covered' : 'Provinces covered';

  const rated = FR_COMPANIES.filter(c => c.reviews > 0);
  const avg = $('st-avg');
  if (avg) avg.textContent = rated.length
    ? (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(2)
    : 'None yet';

  /* The "example storefront" links pointed at a demo company that no
     longer exists. Point them at a real one when there is one, and at
     registration when there is not - a link to a 404 is worse than a link
     to the thing that fixes it. */
  const first = FR_COMPANIES[0];
  for (const id of ['sf-link', 'sf-foot']){
    const a = $(id);
    if (a && first) a.href = '/company?c=' + encodeURIComponent(first.id);
  }
}

/* The geo bar states its own provenance. Someone deciding whether to trust
   "3 companies within 50 km" needs to know if the 50 km is measured from a
   GPS fix, from a city they picked, or from a fallback guess. */
function paintGeoBar(){
  const n = providersIn(FILTERS.city, FILTERS.province);
  const tag = $('geo-tag');
  const exact = FR_GEO.source === 'geolocation';

  $('geo-city').textContent = FILTERS.city ||
    (exact ? 'your exact location' : 'the Philippines');
  $('geo-count').textContent = n;
  tag.classList.toggle('exact', exact);
  tag.classList.remove('live');
  tag.textContent = exact ? 'GPS'
                  : FR_GEO.source === 'explicit' ? 'You chose this'
                  : 'Approximate';

  const total = FR_COMPANIES.length;
  $('geo-note').textContent =
    !total                      ? 'because none have registered yet.'
    : n                         ? 'that reach you.'
    : 'because none of the ' + total + ' registered ' +
      (total === 1 ? 'company reaches' : 'companies reach') + ' here yet.';

  /* The accuracy figure is the one number that makes "exact" checkable. */
  $('geo-msg').innerHTML = exact && FR_GEO.accuracy
    ? 'Located to within about <b>' + FR_GEO.accuracy + ' m</b>' +
      (FR_GEO.city ? ', nearest city ' + FR_GEO.city : '') +
      '. Distances below are measured from where you are standing.'
    : '';
}

/* ---------------------------------------------------------------------
   "Use my exact location".

   On an explicit click, never on load. A geolocation prompt that fires by
   itself is the fastest way to get permanently blocked: the browser
   remembers the denial, and the one moment the renter actually wants it -
   a breakdown on the highway, on the tow page - is the moment it silently
   fails. Ask when asking means something.
   --------------------------------------------------------------------- */
async function useMyLocation(){
  const btn = $('geo-locate'), msg = $('geo-msg'), tag = $('geo-tag');
  btn.disabled = true;
  const label = btn.innerHTML;
  tag.classList.add('live');
  tag.textContent = 'Locating…';
  msg.innerHTML = 'Waiting for your device. Your browser will ask for permission, and ' +
                  'nothing is sent anywhere, the coordinates stay in this page.';

  try {
    const fix = await frRequestLocation();
    geoSave(fix);
    FR_GEO.lat = fix.lat; FR_GEO.lon = fix.lon;
    FR_GEO.accuracy = fix.accuracy;
    FR_GEO.source = 'geolocation';
    frNameGeo();

    /* The city label follows the fix, and so does the filter - otherwise
       the search stays pinned to the old city and "exact location" changes
       nothing anyone can see. */
    FILTERS.city = FR_GEO.city;
    FILTERS.province = FR_GEO.province;
    $('s-loc').value = FR_GEO.city;

    frRedistance();
    paintGeoBar();
    render();

    if (fix.outside)
      msg.innerHTML = 'You appear to be outside the Philippines. Your location ' +
        'is set, but every company here operates locally, so pick the Philippine ' +
        'city you need the unit delivered to instead.';
    else if (!FR_GEO.city)
      msg.innerHTML = 'Located to within about <b>' + fix.accuracy + ' m</b>. ' +
        'No city in our table is close enough to name, so distances are ' +
        'measured straight from your coordinates.';
  } catch (err) {
    tag.classList.remove('live');
    tag.textContent = FR_GEO.source === 'geolocation' ? 'GPS' : 'Approximate';
    /* A refusal is an answer. Say what happens next instead of scolding. */
    msg.innerHTML = err.message +
      (err.code === 'denied'
        ? ' Your browser keeps that choice, so to change it use the padlock ' +
          'icon in the address bar and allow location for this site.'
        : '');
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}
$('geo-locate').addEventListener('click', useMyLocation);
function openLocModal(){
  locModal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('lm-input').value = '';
  modalPicker.open('');
  setTimeout(() => $('lm-input').focus(), 30);
}
function closeLocModal(){
  locModal.hidden = true;
  document.body.style.overflow = '';
}
locModal.addEventListener('click', e => { if (e.target.closest('[data-lm-close]')) closeLocModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !locModal.hidden) closeLocModal(); });

/* The real <select> is invisible, so its value has to be painted into the
   field ourselves. */
function paintTypeValue(){
  const el = $('s-type-val');
  el.textContent = FILTERS.type || 'Any type';
  el.classList.toggle('none', !FILTERS.type);
}

function syncTypeOptions(){
  const cats = FILTERS.cat ? [FILTERS.cat] : Object.keys(FR_TYPES);
  const list = [...new Set(cats.flatMap(c => FR_TYPES[c]))].sort();
  const sel = $('s-type'), keep = FILTERS.type;
  sel.innerHTML = '<option value="">Any type</option>' +
    list.map(t => `<option value="${t}">${t}</option>`).join('');
  /* a type that doesn't exist in the new category must not silently
     keep filtering - drop it and tell render() to redraw the chips */
  FILTERS.type = list.includes(keep) ? keep : '';
  sel.value = FILTERS.type;
  paintTypeValue();
}

/* Open the OS date picker from our own button. showPicker() needs a user
   gesture and isn't everywhere yet, so fall back to focusing the input. */
$('s-when-btn').addEventListener('click', () => {
  const el = $('s-when');
  try { el.showPicker(); } catch { el.focus(); }
});

/* ---- applied-filter chips ---- */
function appliedChips(){
  const chips = [];
  if (FILTERS.city)         chips.push(['city','Location',FILTERS.city]);
  if (FILTERS.type)         chips.push(['type','Type',FILTERS.type]);
  if (FILTERS.when)         chips.push(['when','Needed',new Date(FILTERS.when)
                              .toLocaleDateString('en-PH',{day:'numeric',month:'short',year:'numeric'})]);
  if (FILTERS.company)      chips.push(['company','Company',FILTERS.company]);
  if (FILTERS.maxKm < 200)  chips.push(['maxKm','Within',FILTERS.maxKm + ' km']);
  return chips.map(([k,label,val]) => `
    <span class="achip"><span class="k">${label}</span>${val}
      <button class="x" data-clear="${k}" aria-label="Remove ${label} filter">×</button>
    </span>`).join('');
}

const SEARCH_IC = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M8 11h6"/></svg>';

/* Two different nothings, and conflating them is the mistake.
   "No results for your filters" tells someone to widen the search. On an
   empty marketplace that is a lie: widening it finds nothing either,
   because there is nothing. The second state has one useful action, and
   it is not "clear all filters". */
function emptyState(){
  if (!FR_COMPANIES.length){
    return `<div class="empty">
      <span class="ic">${SEARCH_IC}</span>
      <h3>No companies have registered yet</h3>
      <p>FR Services lists rental companies that have signed up and had their
         DTI registration, mayor's permit and BIR 2303 checked. Nobody has
         completed that yet, so there is nothing to show - this is a real
         empty marketplace, not a failed search.</p>
      <a class="btn btn-y" href="/register">List the first company</a>
    </div>`;
  }
  return `<div class="empty">
    <span class="ic">${SEARCH_IC}</span>
    <h3>Walang nahanap na provider</h3>
    <p>None of the ${FR_COMPANIES.length} registered
       compan${FR_COMPANIES.length === 1 ? 'y' : 'ies'} match these
       filters${FILTERS.city ? ' in <b>' + FILTERS.city + '</b>' : ''}.
       Try widening the distance, clearing a filter, or searching a nearby city.</p>
    <button class="btn btn-y" data-clear="all">Clear all filters</button>
  </div>`;
}

function isFiltered(){
  return !!(FILTERS.cat || FILTERS.type || FILTERS.when || FILTERS.company || FILTERS.maxKm < 200 ||
            FILTERS.availNow || FILTERS.operator || FILTERS.delivery || FILTERS.instant ||
            FILTERS.city !== FR_GEO.city);
}

/* ---- the single render path ---- */
function render(){
  const list = sortCompanies(filterCompanies(FILTERS), FILTERS.sort);

  $('r-cards').innerHTML  = list.length ? list.map(companyCard).join('') : emptyState();
  $('r-applied').innerHTML = appliedChips();
  $('fb-count').textContent = list.length;
  $('fb-clear').hidden = !isFiltered();

  $('r-title').textContent = FILTERS.cat ? CAT_LABEL[FILTERS.cat] : 'All fleet providers near you';
  $('r-sub').textContent =
    `${list.length} verified provider${list.length === 1 ? '' : 's'}` +
    `${FILTERS.city ? ' in ' + FILTERS.city : ''} · ${SORT_LABEL[FILTERS.sort]}`;

  document.querySelectorAll('.fchip').forEach(c =>
    c.classList.toggle('on', !!FILTERS[c.dataset.flag]));
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('on', p.dataset.cat === FILTERS.cat));

  syncMap();          // pins follow the same filters as the cards
}

function goResults(){
  $('results').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ---- category panels: click to select, click again to clear ---- */
document.querySelectorAll('.panel').forEach(b => b.addEventListener('click', () => {
  FILTERS.cat = (FILTERS.cat === b.dataset.cat) ? null : b.dataset.cat;
  syncTypeOptions();
  render();
  goResults();
}));

/* ---- hero search form ---- */
$('s-go').addEventListener('click', () => {
  FILTERS.type = $('s-type').value;
  FILTERS.when = $('s-when').value;
  FILTERS.company = $('s-company').value.trim();
  heroPicker.close();
  /* typed free-text has no province, so it matches any same-named city */
  setCity($('s-loc').value.trim(), '');
  goResults();
});
$('s-type').addEventListener('change', () => {
  FILTERS.type = $('s-type').value;
  paintTypeValue();
  render();
});
$('s-company').addEventListener('input', () => {
  FILTERS.company = $('s-company').value.trim();
  render();
});

/* ---- toolbar ---- */
document.querySelectorAll('.fchip').forEach(c => c.addEventListener('click', () => {
  FILTERS[c.dataset.flag] = !FILTERS[c.dataset.flag];
  render();
}));
$('fb-km').addEventListener('change',   e => { FILTERS.maxKm = +e.target.value; render(); });
$('fb-sort').addEventListener('change', e => { FILTERS.sort  = e.target.value;  render(); });

/* ---- clearing: delegated so it works on chips and the empty state ---- */
function clearAll(){
  Object.assign(FILTERS, { cat:null, city:FR_GEO.city, province:FR_GEO.province,
    type:'', when:'', company:'', maxKm:200,
    availNow:false, operator:false, delivery:false, instant:false });
  $('s-loc').value = FILTERS.city; $('s-when').value = ''; $('s-company').value = ''; $('fb-km').value = '200';
  syncTypeOptions();
  render();
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-clear]');
  if (!t) return;
  const k = t.dataset.clear;
  if (k === 'all') { clearAll(); return; }
  if (k === 'city')  { FILTERS.city = ''; FILTERS.province = ''; $('s-loc').value = ''; }
  if (k === 'type')  { FILTERS.type = '';  $('s-type').value = ''; paintTypeValue(); }
  if (k === 'when')  { FILTERS.when = '';  $('s-when').value = ''; }
  if (k === 'company'){ FILTERS.company = ''; $('s-company').value = ''; }
  if (k === 'maxKm') { FILTERS.maxKm = 200; $('fb-km').value = '200'; }
  render();
});
$('fb-clear').addEventListener('click', clearAll);

/* =====================================================================
   LIVE MAP - Leaflet + OpenStreetMap.
   Reads the same FILTERS object as the results grid, so the pins and the
   cards can never disagree. Each pin is an <a> to the company page.

   To move to Google Maps: keep syncMap()'s shape, replace L.map/L.tileLayer
   with google.maps.Map and the divIcon markers with AdvancedMarkerElement
   (which also takes arbitrary DOM, so .gpin carries over unchanged).
   That path needs an API key + billing - see ARCHITECTURE.md §12.
   ===================================================================== */
let MAP = null, PINS = null;

function initMap(){
  const host = $('fleetmap');
  if (!host) return;
  if (!window.L){                       // CDN blocked or offline
    host.insertAdjacentHTML('afterend',
      '<div class="mapempty">Map library unavailable offline.<br>' +
      'The provider list below is unaffected.</div>');
    return;
  }
  /* Wheel zoom on, at Leaflet's stock sensitivity - one level per notch,
     the same feel as Google Maps. Measured: raising wheelPxPerZoomLevel
     and setting zoomSnap:0.5 made it *worse*, not smoother, because
     Leaflet snaps with Math.ceil - a gesture jumped 2.5 levels. */
  MAP = L.map(host, {
    scrollWheelZoom: true,
    zoomControl: true,
    attributionControl: true
  }).setView([FR_GEO.lat, FR_GEO.lon], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(MAP);

  PINS = L.layerGroup().addTo(MAP);
  syncMap();
}

function syncMap(){
  if (!MAP || !PINS) return;
  PINS.clearLayers();

  const pin = (html) => L.divIcon({ html, className: '', iconSize: [0, 0] });
  const pts = [];

  /* The viewer, at the real origin - FR_GEO, not the chosen city's centre.
     Those are the same thing when a city was picked by hand (setCity moves
     FR_GEO to it) and very different after a GPS fix, where the whole point
     is the actual spot rather than the middle of the city. */
  const here = [FR_GEO.lat, FR_GEO.lon];
  const exact = FR_GEO.source === 'geolocation';

  /* Only drawn for a real GPS fix - "You are here" pointing at a city-
     centre guess is a claim the pin can't back up. The accuracy circle
     is the same honesty check one level further: a ±2 km fix drawn as a
     12-pixel dot is a lie told with a marker, so it only appears once it
     is big enough to mean something at this zoom - a 20 m circle is
     smaller than the pin over it. `here` still counts toward fitBounds
     below either way, fix or not, so the view still centres on the
     user's area even with nothing drawn there yet. */
  if (exact){
    if (FR_GEO.accuracy > 40){
      L.circle(here, {
        radius: FR_GEO.accuracy,
        color: '#057A2F', weight: 1.5, opacity: .5,
        fillColor: '#057A2F', fillOpacity: .10, interactive: false
      }).addTo(PINS);
    }
    L.marker(here, {
      icon: pin('<span class="gpin you"><img src="/logo.png" alt="You are here" /></span>'),
      interactive: false, zIndexOffset: 1000
    }).addTo(PINS);
  }
  pts.push(here);

  /* Providers currently in the result set - capped so a nationwide search
     doesn't drop dozens of overlapping bubbles on one screen. */
  const all = sortCompanies(filterCompanies(FILTERS), 'near')
    .filter(c => typeof c.lat === 'number');
  const list = all.slice(0, 24);

  list.forEach(c => {
    const cls = c.cat === 'towing' ? 'gpin tow' : 'gpin';
    const n = +String(c.price).replace(/,/g, '');
    /* A company that has not set a rate gets its name, not "₱0" - which
       would read as free rather than as unpriced. */
    const label = !n ? escPin(c.name)
                : c.cat === 'towing' ? 'Tow ' + peso(n)
                : peso(n);
    const km = distanceKm(c);
    L.marker([c.lat, c.lon], { icon: pin(
      `<a class="${cls}" href="/company?c=${c.id}" title="${escPin(c.name)} - ${escPin(c.loc)}${
        km == null ? '' : ' · ' + kmLabel(km)}">${label}</a>`
    )}).addTo(PINS);
    pts.push([c.lat, c.lon]);
  });

  /* One point is the viewer alone. Fitting bounds to it zooms to the max,
     which on an empty marketplace lands you on a street corner with no
     context at all - hold a city-wide view instead. */
  if (pts.length > 1)        MAP.fitBounds(pts, { padding: [46, 46], maxZoom: exact ? 15 : 13 });
  else                       MAP.setView(here, exact ? 14 : 11);

  const note = $('fleetmap').nextElementSibling;
  note.textContent =
      !FR_COMPANIES.length ? 'No companies registered yet, and the map fills in as they join'
    : !all.length           ? 'No providers reach here yet, so try another city'
    : all.length > list.length
        ? `Showing the ${list.length} nearest of ${all.length} · tap a price to open that company`
        : 'Scroll to zoom · tap a price to open that company';
}

/* Company names reach the map inside an attribute and as link text, and
   they are owner-supplied. Escaped at the point of use. */
function escPin(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Location override - in production this writes the explicit choice that
   outranks every other signal in the geo cascade (ARCHITECTURE.md §2). */
$('geo-change').addEventListener('click', openLocModal);

syncTypeOptions();
paintHeadline();

/* First paint. A fix kept from a previous visit was already adopted by
   data.js, so honour it rather than resetting to the fallback city -
   setCity() would overwrite the coordinates with the city centre and throw
   away accuracy the renter already granted us. */
if (FR_GEO.source === 'geolocation'){
  FILTERS.city = FR_GEO.city;
  FILTERS.province = FR_GEO.province;
  $('s-loc').value = FR_GEO.city;
  paintGeoBar();
  render();
} else {
  setCity(FR_GEO.city, FR_GEO.province, { explicit:false });
}
initMap();

/* Shows who is signed in, or the sign-in button when nobody is. This first
   call paints the marketplace's own client-only demo session (favourites);
   the real check right after it overrides that with whoever actually holds
   a real Supabase session - a platform operator or a registered company
   owner - so this page never shows "Sign in" to someone who plainly isn't
   signed out. */
if (typeof paintAuthNav === 'function') paintAuthNav('authNav');
if (typeof paintRealAuthNav === 'function') paintRealAuthNav('authNav');

/* nav.top and .filterbar (page.css) are both position:sticky and stack
   when scrolled, covering the top of the viewport with both, not just the
   nav - #how's scroll-margin-top needs their combined height or the "How
   it works" link still lands the section half-covered by the filter bar.
   Measured, not hardcoded: .filterbar's chips wrap to a second row on
   narrow viewports, which changes its height. */
function measureStickyTop(){
  const nav = document.querySelector('nav.top');
  const bar = document.querySelector('.filterbar');
  const h = (nav ? nav.offsetHeight : 0) + (bar ? bar.offsetHeight : 0);
  document.documentElement.style.setProperty('--stickytop', h + 'px');
}
measureStickyTop();
window.addEventListener('resize', measureStickyTop);
