
/* =====================================================================
   ONE filter state. The hero search form, the category panels, the
   toolbar chips and the sort control all write here — nothing filters
   independently, so they can never disagree about what's on screen.
   ===================================================================== */
const FILTERS = {
  cat:null, city:FR_GEO.city, province:FR_GEO.province, type:'', when:'',
  maxKm:200, availNow:false, operator:false, delivery:false, instant:false,
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
   LOCATION PICKER — searches all 1,634 PSGC cities/municipalities.
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
   operate — otherwise the picker is 1,600 dead ends with a dozen live
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
    /* Nothing typed yet. Lead with popular destinations — those are the
       searches that actually happen — then the full covered list, then
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
  /* Destination nicknames that aren't LGUs — "Boracay" is a barangay of
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
    /* select-all in a timeout so the click's mouseup doesn't undo it —
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
    /* mousedown, not click — blur would tear the list down first */
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
/* clicking the label or the padding around the input focuses it —
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
function setCity(val, prov){
  FR_GEO.city = FILTERS.city = val;
  FILTERS.province = FR_GEO.province = prov || '';
  const n = providersIn(val, prov);
  $('geo-city').textContent = val;
  $('geo-count').textContent = n;
  $('geo-note').textContent = n ? 'within 50 km.' : '— no providers here yet.';
  $('s-loc').value = val;
  render();
}
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
     keep filtering — drop it and tell render() to redraw the chips */
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
  if (FILTERS.maxKm < 200)  chips.push(['maxKm','Within',FILTERS.maxKm + ' km']);
  return chips.map(([k,label,val]) => `
    <span class="achip"><span class="k">${label}</span>${val}
      <button class="x" data-clear="${k}" aria-label="Remove ${label} filter">×</button>
    </span>`).join('');
}

function emptyState(){
  return `<div class="empty">
    <span class="ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M8 11h6"/></svg></span>
    <h3>Walang nahanap na provider</h3>
    <p>No companies match these filters${FILTERS.city ? ' in <b>' + FILTERS.city + '</b>' : ''}.
       Try widening the distance, clearing a filter, or searching a nearby city.</p>
    <button class="btn btn-y" data-clear="all">Clear all filters</button>
  </div>`;
}

function isFiltered(){
  return !!(FILTERS.cat || FILTERS.type || FILTERS.when || FILTERS.maxKm < 200 ||
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
    type:'', when:'', maxKm:200,
    availNow:false, operator:false, delivery:false, instant:false });
  $('s-loc').value = FILTERS.city; $('s-when').value = ''; $('fb-km').value = '200';
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
  if (k === 'maxKm') { FILTERS.maxKm = 200; $('fb-km').value = '200'; }
  render();
});
$('fb-clear').addEventListener('click', clearAll);

/* =====================================================================
   LIVE MAP — Leaflet + OpenStreetMap.
   Reads the same FILTERS object as the results grid, so the pins and the
   cards can never disagree. Each pin is an <a> to the company page.

   To move to Google Maps: keep syncMap()'s shape, replace L.map/L.tileLayer
   with google.maps.Map and the divIcon markers with AdvancedMarkerElement
   (which also takes arbitrary DOM, so .gpin carries over unchanged).
   That path needs an API key + billing — see ARCHITECTURE.md §12.
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
  /* Wheel zoom on, at Leaflet's stock sensitivity — one level per notch,
     the same feel as Google Maps. Measured: raising wheelPxPerZoomLevel
     and setting zoomSnap:0.5 made it *worse*, not smoother, because
     Leaflet snaps with Math.ceil — a gesture jumped 2.5 levels. */
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

  /* the viewer */
  const here = cityLatLon(FILTERS.city) || [FR_GEO.lat, FR_GEO.lon];
  if (here){
    L.marker(here, { icon: pin('<span class="gpin you">You</span>'), interactive: false,
                     zIndexOffset: 1000 }).addTo(PINS);
    pts.push(here);
  }

  /* providers currently in the result set — capped so a nationwide
     search doesn't drop 40 overlapping bubbles on one screen */
  const list = sortCompanies(filterCompanies(FILTERS), 'near')
    .filter(c => typeof c.lat === 'number').slice(0, 24);

  list.forEach(c => {
    const cls = c.cat === 'towing' ? 'gpin tow' : 'gpin';
    /* price is a display string ("12,000"); peso() takes a number */
    const amount = peso(c.price.replace(/,/g, ''));
    const label = c.cat === 'towing' ? 'Tow ' + amount : amount;
    L.marker([c.lat, c.lon], { icon: pin(
      `<a class="${cls}" href="/company?c=${c.id}" title="${c.name} — ${c.loc}">${label}</a>`
    )}).addTo(PINS);
    pts.push([c.lat, c.lon]);
  });

  if (pts.length > 1)      MAP.fitBounds(pts, { padding: [46, 46], maxZoom: 13 });
  else if (pts.length === 1) MAP.setView(pts[0], 12);

  $('fleetmap').nextElementSibling.textContent = list.length
    ? 'Scroll to zoom · tap a price to open that company'
    : 'No providers here yet — try another city';
}

/* Location override — in production this writes the explicit choice that
   outranks every other signal in the geo cascade (ARCHITECTURE.md §2). */
$('geo-change').addEventListener('click', openLocModal);

syncTypeOptions();
// seeds the geo bar counts and does the first render
setCity(FR_GEO.city, FR_GEO.province);
initMap();

/* Shows who is signed in, or the sign-in button when nobody is. */
if (typeof paintAuthNav === 'function') paintAuthNav('authNav');
