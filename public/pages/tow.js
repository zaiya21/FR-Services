
/* nearby towing units from shared data */
const tows = inCategory('towing').slice().sort((a,b) => a.km - b.km);
document.getElementById('nearby-list').innerHTML = tows.map(t => `
  <div class="nrow">
    <span class="e">${unitIcon(t.name, "towing")}</span>
    <span>
      <b>${t.name}</b>
      <span>${t.loc} · ${t.km} km</span>
      <span class="standby"><span class="d"></span>${t.status}</span>
    </span>
    <span class="eta"><b>${Math.round(t.km * 2.4 + 6)} min</b><span>est. arrival</span></span>
  </div>`).join('');

/* pickers */
document.querySelectorAll('.vtype').forEach(v => v.addEventListener('click', () => {
  document.querySelectorAll('.vtype').forEach(x => x.classList.remove('on'));
  v.classList.add('on');
}));
document.querySelectorAll('.prob').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('.prob').forEach(x => x.classList.remove('on'));
  p.classList.add('on');
}));
document.getElementById('loc-edit').addEventListener('click', () => {
  const v = prompt('Where are you right now?', document.getElementById('loc-main').textContent);
  if (v && v.trim()) document.getElementById('loc-main').textContent = v.trim();
});

/* dispatch simulation: broadcast -> accept */
function stage(id){
  document.querySelectorAll('.stage').forEach(s => s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('btn-dispatch').addEventListener('click', () => {
  stage('stage-search');
  const list = document.getElementById('ping-list');
  list.innerHTML = '';
  tows.forEach((t, i) => {
    setTimeout(() => {
      const row = document.createElement('div');
      row.className = 'ping';
      row.innerHTML = `<span class="d"></span><span>Pinged <b>${t.name}</b></span><span class="s">${t.km} km away</span>`;
      list.appendChild(row);
    }, 350 + i * 550);
  });
  setTimeout(() => stage('stage-matched'), 350 + tows.length * 550 + 1400);
});

/* =====================================================================
   LIVE MAP - Leaflet + OpenStreetMap, towing companies only.

   Was a decorative, hand-drawn SVG city with six pins at fixed percentage
   positions - not a real map, and not tied to any real company. This is
   the same real-map technique the homepage's #fleetmap already uses (see
   initMap()/syncMap() in public/pages/index.js): real tiles, real
   coordinates, and markers built only from `tows` (above), which is
   already filtered to inCategory('towing') - a vehicle-rental or
   equipment company never appears here, by construction, not by a filter
   bolted on afterward.
   ===================================================================== */
const escMap = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function initTowMap(){
  const host = document.getElementById('towmap');
  const stat = document.getElementById('towMapStat');
  if (!host) return;

  if (!window.L){
    host.insertAdjacentHTML('afterend',
      '<div class="mapempty">Map library unavailable offline.<br>The list below is unaffected.</div>');
    if (stat) stat.remove();
    return;
  }

  const map = L.map(host, { scrollWheelZoom: true, zoomControl: true, attributionControl: true })
    .setView([FR_GEO.lat, FR_GEO.lon], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const pin = html => L.divIcon({ html, className: '', iconSize: [0, 0] });
  const pts = [[FR_GEO.lat, FR_GEO.lon]];
  L.marker([FR_GEO.lat, FR_GEO.lon], {
    icon: pin('<span class="gpin you">You</span>'),
    interactive: false, zIndexOffset: 1000
  }).addTo(map);

  /* Capped the same way the homepage caps its own map (24 there; towing
     is normally a much smaller list, but a nationwide fetch is still
     possible) - dozens of overlapping pins help nobody. */
  const list = tows.filter(t => typeof t.lat === 'number').slice(0, 30);
  list.forEach(t => {
    L.marker([t.lat, t.lon], { icon: pin(
      `<a class="gpin tow" href="/company?c=${encodeURIComponent(t.id)}" title="${escMap(t.name)} - ${escMap(t.loc)} · ${t.km} km">${escMap(t.name)}</a>`
    )}).addTo(map);
    pts.push([t.lat, t.lon]);
  });

  if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
  else map.setView([FR_GEO.lat, FR_GEO.lon], 11);

  if (stat){
    stat.innerHTML = !list.length
      ? 'No towing companies registered near here yet'
      : `<b>${list.length}</b> towing ${list.length === 1 ? 'company' : 'companies'} shown · tap a pin to open it`;
  }
}
initTowMap();
