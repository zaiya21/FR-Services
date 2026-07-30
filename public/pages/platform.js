
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const TODAY = opsToday();
const pct = n => (Math.round(n * 10) / 10) + '%';

/* ---------- tabs ---------- */
const PANES = ['overview','review','companies','reports','monitoring'];
let activeTab = 'overview';

function showTab(id){
  if (!PANES.includes(id)) id = 'overview';
  activeTab = id;
  PANES.forEach(p => { $('pane-' + p).hidden = p !== id; });
  document.querySelectorAll('#tabBar .tabbtn').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === id));
  if (id === 'overview')   paintOverview();
  if (id === 'review')     paintQueue();
  if (id === 'companies')  paintCompanies();
  if (id === 'reports')    paintReports();
  if (id === 'monitoring') paintMonitoring();
  try { history.replaceState(null, '', '#' + id); } catch { /* file:// */ }
  window.scrollTo(0, 0);
}
$('tabBar').addEventListener('click', e => {
  const b = e.target.closest('.tabbtn');
  if (b) showTab(b.dataset.tab);
});

function measureNav(){
  const nav = document.querySelector('nav.top');
  if (nav) document.documentElement.style.setProperty('--navh', nav.offsetHeight + 'px');
}
measureNav();
window.addEventListener('resize', measureNav);

/* ---------- shared ---------- */
const RANGE_LABELS = {
  today:'Today', week:'7 days', month:'This month', lastmo:'Last month',
  '30':'30 days', quarter:'90 days', year:'Year to date', all:'All'
};
function buildChips(hostId, ids, current, onPick){
  const host = $(hostId);
  host.innerHTML = ids.map(id =>
    `<button type="button" data-r="${id}" class="${id === current ? 'on' : ''}">${esc(RANGE_LABELS[id])}</button>`
  ).join('');
  host.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    host.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    onPick(b.dataset.r);
  });
}
function kpiCard(k){
  return `<div class="kpi"><span class="k-lbl">${esc(k.label)}</span>` +
         `<span class="k-val">${esc(k.value)}</span>` +
         (k.note ? `<span class="k-note">${k.note}</span>` : '') + '</div>';
}
function niceScale(max, steps){
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const raw = max / steps, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return { max: top, ticks };
}
function shortMoney(n){
  const v = Number(n) || 0;
  if (v >= 1e9) return '₱' + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'B';
  if (v >= 1e6) return '₱' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e3) return '₱' + Math.round(v / 1e3) + 'k';
  return '₱' + v;
}
const tip = document.createElement('div');
tip.className = 'c-tip'; tip.hidden = true;
document.body.appendChild(tip);
function showTip(html, ev){
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = ev.clientX + 14, y = ev.clientY - r.height - 12;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y < 8) y = ev.clientY + 18;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
const hideTip = () => { tip.hidden = true; };
addEventListener('scroll', hideTip, true);

const SPLIT_HUES = ['#057A2F','#1D4ED8','#B8860B','#0891B2','#C2410C','#7C3AED'];
const OTHER_HUE = '#6B7280';
const PIE_MAX = 6;
const pol = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
function slicePath(cx, cy, r, a0, a1){
  if (a1 - a0 >= 359.999)
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}
/* Same pie the company console uses - see admin.html for the reasoning
   behind the in-slice fit test and the grey remainder. */
function paintPie(hostId, keyId, rows, total, labelOf, valueOf){
  const host = $(hostId), key = $(keyId);
  const lab = labelOf || (r => r.label), val = valueOf || (r => r.amount);
  if (!rows.length || !total){
    host.innerHTML = '';
    key.innerHTML = '<span class="muted">Nothing in this period.</span>';
    return;
  }
  const head = rows.slice(0, PIE_MAX), tail = rows.slice(PIE_MAX);
  const slices = head.map((r, i) => ({ label:lab(r), amount:val(r), hue:SPLIT_HUES[i] }));
  if (tail.length)
    slices.push({ label:'Other', hue:OTHER_HUE,
                  amount: tail.reduce((n, r) => n + val(r), 0),
                  parts: tail.map(lab) });

  const S = 260, cx = S / 2, cy = S / 2, r = 104;
  let a = 0;
  const arcs = [], inside = [], outside = [];
  slices.forEach((s, i) => {
    const span = s.amount / total * 360, mid = a + span / 2;
    const share = s.amount / total * 100;
    const pctTxt = (Math.round(share * 10) / 10) + '%';
    const valTxt = shortMoney(s.amount);
    arcs.push(`<path d="${slicePath(cx, cy, r, a, a + span)}" fill="${s.hue}"
       stroke="#fff" stroke-width="2" data-i="${i}"></path>`);
    const lr = r * 0.64;
    const chord = 2 * lr * Math.sin(Math.min(span, 180) * Math.PI / 360);
    const need = Math.max(valTxt.length, pctTxt.length) * 5.9 + 10;
    const [lx, ly] = pol(cx, cy, lr, mid);
    if (chord >= need && span >= 26){
      const ink = bestOn(s.hue) === '#ffffff' ? '' : ' dark';
      inside.push(`<text class="pie-in${ink}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">
        <tspan class="v" x="${lx.toFixed(1)}" dy="-1">${esc(valTxt)}</tspan>
        <tspan class="p" x="${lx.toFixed(1)}" dy="11">${esc(pctTxt)}</tspan></text>`);
    } else {
      const [ex, ey] = pol(cx, cy, r + 6, mid);
      const [fx, fy] = pol(cx, cy, r + 18, mid);
      const right = fx >= cx, tx = right ? fx + 4 : fx - 4;
      outside.push(
        `<path class="pie-lead" d="M ${ex.toFixed(1)} ${ey.toFixed(1)} L ${fx.toFixed(1)} ${fy.toFixed(1)} ` +
        `L ${(tx + (right ? 6 : -6)).toFixed(1)} ${fy.toFixed(1)}"></path>` +
        `<text class="pie-out" x="${(tx + (right ? 9 : -9)).toFixed(1)}" y="${(fy + 3.5).toFixed(1)}" ` +
        `text-anchor="${right ? 'start' : 'end'}">${esc(valTxt)} · ${esc(pctTxt)}</text>`);
    }
    a += span;
  });
  host.innerHTML = `<svg class="pie" viewBox="-78 -8 ${S + 156} ${S + 16}" role="img"
      aria-label="Gross booking value by base">${arcs.join('')}${inside.join('')}${outside.join('')}</svg>`;
  host.querySelector('svg').addEventListener('mousemove', e => {
    const p = e.target.closest('path[data-i]');
    if (!p) return hideTip();
    const s = slices[+p.dataset.i];
    showTip(`<b><s style="background:${s.hue}"></s>${esc(s.label)}</b>` +
      `${esc(money(s.amount))} &nbsp;·&nbsp; ${(s.amount / total * 100).toFixed(1)}%` +
      (s.parts ? `<br><span style="opacity:.75">${esc(s.parts.join(', '))}</span>` : ''), e);
  });
  host.querySelector('svg').addEventListener('mouseleave', hideTip);
  key.innerHTML = rows.map((r, i) => {
    const hue = i < PIE_MAX ? SPLIT_HUES[i] : OTHER_HUE;
    return `<span><i style="background:${hue}"></i>${esc(lab(r))}` +
           `<b>${esc(money(val(r)))}</b><u>${(val(r) / total * 100).toFixed(1)}%</u></span>`;
  }).join('') +
  `<span class="tot"><i style="background:transparent"></i>Total` +
  `<b>${esc(money(total))}</b><u>100%</u></span>`;
}

/* =====================================================================
   OVERVIEW
   ===================================================================== */
let ovRangeId = '30';

function paintOverview(){
  const r = opsRange(ovRangeId, TODAY);
  const s = platformScan(r.from, r.to, TODAY);
  $('ovRangeLbl').textContent = fmtDate(r.from) + ' – ' + fmtDate(r.to);

  $('ovKpis').innerHTML = [
    { label:'Gross booking value', value:money(s.totals.gmv), note:`${s.totals.bookings} bookings` },
    { label:'Commission earned', value:money(s.totals.commission),
      note:`${s.totals.effectiveRate}% blended across both rates` },
    { label:'Companies', value:String(s.counts.companies), note:`${s.counts.active} took bookings this period` },
    { label:'Badges in good standing', value:String(s.counts.badged),
      note: s.counts.atRisk ? `<b class="down">${s.counts.atRisk} at risk</b>` : 'all clear' },
    { label:'Awaiting document review', value:String(s.docs.pending), note:`${s.docs.total} documents on file` },
    { label:'Open reports', value:String(s.reports.open), note:`${s.reports.reviewing} under review` },
    { label:'Mean utilisation', value:pct(s.totals.utilisation), note:`${s.totals.fleet} units listed` },
    { label:'Average booking', value:money(s.totals.avgValue), note:`mean rating ${s.totals.rating}` }
  ].map(kpiCard).join('');

  /* --- the revenue model, with what each line actually earned --- */
  const earnedFor = key =>
    key === 'towing' ? (s.byCat.find(c => c.cat === 'towing') || {}).commission || 0
  : key === 'rentals' ? s.byCat.filter(c => c.cat !== 'towing')
      .reduce((n, c) => n + (c.commission || 0), 0)
  : 0;
  $('earnRow').innerHTML = PLATFORM_PRICING.map(p => `
    <div class="earncard ${p.key === 'subscription' ? 'free' : ''}">
      <span class="k">${esc(p.label)}</span>
      <span class="v">${esc(p.value)}</span>
      <span class="n">${esc(p.note)}</span>
      ${p.key === 'subscription'
        ? `<span class="earned">${s.counts.companies} companies listed · ${esc(money(0))} in fees</span>`
        : `<span class="earned">${esc(money(earnedFor(p.key)))} this period</span>`}
    </div>`).join('');
  $('earnNote').innerHTML =
    `Across ${s.totals.bookings} bookings this period that works out at a blended ` +
    `<b>${s.totals.effectiveRate}%</b> of gross booking value. ` +
    `Commission is charged on the booking total and only on bookings that were not cancelled.`;

  const alerts = platformAlerts(r.from, r.to, TODAY);
  $('ovAlerts').innerHTML = alerts.length ? alerts.map(a =>
    `<div class="alert ${a.level}"><div><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div>` +
    `<button class="btn btn-w" data-go="${esc(a.go)}">Open</button></div>`).join('')
    : '<div class="alert info"><div><b>Nothing needs attention</b>' +
      '<p>No documents queued, no open reports, no lapsed badges.</p></div></div>';

  /* --- columns --- */
  const b = s.series;
  $('ovSeriesNote').textContent = s.seriesNote;
  const peak = Math.max(0, ...b.map(m => Math.max(m.gmv, m.commission)));
  const { max, ticks } = niceScale(peak, 4);
  $('ovY').innerHTML = ticks.map(v =>
    `<span style="bottom:${(v / max * 100).toFixed(2)}%">${esc(shortMoney(v))}</span>`).join('');
  $('ovPlot').innerHTML =
    ticks.filter(v => v > 0).map(v =>
      `<div class="gl" style="bottom:${(v / max * 100).toFixed(2)}%"></div>`).join('') +
    '<div class="c-cols">' + b.map((m, i) => `
      <div class="c-col" data-i="${i}">
        <i class="gmv" style="height:${(m.gmv / max * 100).toFixed(2)}%"></i>
        <i class="com" style="height:${(m.commission / max * 100).toFixed(2)}%"></i>
      </div>`).join('') + '</div>';
  $('ovX').innerHTML = b.map(m => `<span>${esc(m.label)}</span>`).join('');
  $('ovPlot').onmousemove = e => {
    const col = e.target.closest('.c-col');
    if (!col) return hideTip();
    const m = b[+col.dataset.i];
    showTip(`<b>${esc(m.label)}</b>` +
      `<s style="background:var(--c1)"></s>GBV<em>${esc(money(m.gmv))}</em><br>` +
      `<s style="background:var(--c3)"></s>Commission<em>${esc(money(m.commission))}</em><br>` +
      `<s style="background:transparent"></s>Bookings<em>${m.bookings}</em>`, e);
  };
  $('ovPlot').onmouseleave = hideTip;

  const topG = s.byRegion.length ? s.byRegion[0].gmv : 1;
  $('ovRegions').innerHTML = s.byRegion.length ? s.byRegion.map(g => `
    <div class="rrow">
      <span class="nm" title="${esc(g.key)}">${esc(g.key)}
        <span class="rmeta">${g.companies} compan${g.companies > 1 ? 'ies' : 'y'} · ${g.bookings} bookings</span></span>
      <span class="track"><i style="width:${(g.gmv / topG * 100).toFixed(1)}%"></i></span>
      <span class="val">${esc(money(g.gmv))}</span>
      <span class="shr">${(g.gmv / (s.totals.gmv || 1) * 100).toFixed(1)}%</span>
    </div>`).join('')
   : '<p class="muted">No bookings in this period.</p>';

  $('ovTop').innerHTML = s.companies.slice()
    .sort((x, y) => y.gmv - x.gmv).slice(0, 12).map(c => `
    <tr>
      <td class="strong"><a href="/company?c=${encodeURIComponent(c.id)}" style="text-decoration:underline">${esc(c.name)}</a></td>
      <td>${esc(c.loc)}</td>
      <td class="num">${c.bookings}</td>
      <td class="num strong">${esc(money(c.gmv))}</td>
      <td class="num">${esc(money(c.commission))}</td>
      <td class="num"><span class="miniprog"><i style="width:${c.utilisation}%"></i></span> ${pct(c.utilisation)}</td>
    </tr>`).join('');
}
$('ovAlerts').addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b) showTab(b.dataset.go);
});
buildChips('ovRange', ['today','week','month','lastmo','30','quarter','year','all'], ovRangeId,
  id => { ovRangeId = id; paintOverview(); });

/* =====================================================================
   DOCUMENT REVIEW
   ===================================================================== */
const FILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h7l4 4v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M16 3v5h4"/></svg>';
const REVIEW_PILL = {
  verified: '<span class="st st-ok">Approved</span>',
  pending:  '<span class="st st-warn">Awaiting review</span>',
  rejected: '<span class="st st-off">Rejected</span>'
};
function stPill(d){
  if (d.state === 'expired') return `<span class="st st-off">${esc(d.label)}</span>`;
  if (d.state === 'soon')    return `<span class="st st-warn">${esc(d.label)}</span>`;
  if (d.state === 'none')    return '<span class="st st-off">No expiry</span>';
  return '<span class="st st-live">Current</span>';
}

/* Which companies are expanded. Held outside the render so a verdict does
   not slam the group shut under the operator's cursor. */
const qOpen = new Set();

function queueRows(){
  const q  = $('qSearch').value.trim().toLowerCase();
  const rv = $('qReview').value, st = $('qState').value, pb = $('qPub').value;
  /* Only the three FR Services verifies ever reach this queue. */
  return reviewableDocuments(TODAY).filter(d => {
    if (rv && d.review !== rv) return false;
    if (st && d.state !== st) return false;
    if (pb === '1' && !d.published) return false;
    if (pb === '0' && d.published) return false;
    if (q && !(d.companyName + ' ' + d.name + ' ' + d.issuer).toLowerCase().includes(q)) return false;
    return true;
  });
}

function paintQueue(){
  const all = reviewableDocuments(TODAY);
  const pending = all.filter(d => d.review === 'pending').length;
  const badPub  = all.filter(d => d.published && d.state === 'expired' && d.review === 'verified').length;
  const exempt  = allDocuments(TODAY).length - all.length;

  $('qKpis').innerHTML = [
    { label:'Awaiting review', value:String(pending), note:'across all companies' },
    { label:'Approved', value:String(all.filter(d => d.review === 'verified').length),
      note:`of ${all.length} registration documents` },
    { label:'Rejected', value:String(all.filter(d => d.review === 'rejected').length) },
    { label:'Approved but expired', value:String(badPub),
      note: badPub ? '<b class="down">our tick is still on them</b>' : 'none' }
  ].map(kpiCard).join('');
  $('qExempt').textContent = exempt;

  /* One entry per company, its matching documents inside. `seen`, not
     `byId` - data.js already exports a byId() and shadowing it here would
     be a trap for the next edit. */
  const rows = queueRows();
  const groups = [];
  const seen = {};
  rows.forEach(d => {
    let g = seen[d.companyId];
    if (!g){
      g = seen[d.companyId] = { id:d.companyId, name:d.companyName, loc:d.companyLoc, docs:[] };
      groups.push(g);
    }
    g.docs.push(d);
  });
  /* Companies with work outstanding come first, then the biggest piles. */
  groups.forEach(g => {
    g.awaiting = g.docs.filter(d => d.review === 'pending').length;
    g.expired  = g.docs.filter(d => d.state === 'expired').length;
    g.approved = g.docs.filter(d => d.review === 'verified').length;
    g.rejected = g.docs.filter(d => d.review === 'rejected').length;
  });
  groups.sort((a, b) => (b.awaiting - a.awaiting) || (b.expired - a.expired) ||
                        (b.docs.length - a.docs.length) || a.name.localeCompare(b.name));

  /* A single match is almost always a deliberate jump from Companies or
     Monitoring - open it rather than making them click twice. */
  if (groups.length === 1) qOpen.add(groups[0].id);

  $('qCount').textContent =
    `${rows.length} document${rows.length === 1 ? '' : 's'} across ` +
    `${groups.length} compan${groups.length === 1 ? 'y' : 'ies'}`;

  $('qList').innerHTML = groups.length ? groups.map(g => {
    const open = qOpen.has(g.id);
    const tally = [
      g.awaiting ? `<span class="st st-warn">${g.awaiting} awaiting</span>` : '',
      g.expired  ? `<span class="st st-off">${g.expired} expired</span>` : '',
      g.approved ? `<span class="st st-ok">${g.approved} approved</span>` : '',
      g.rejected ? `<span class="st st-off">${g.rejected} rejected</span>` : ''
    ].filter(Boolean).join('');

    return `<article class="qgroup ${g.awaiting ? 'needs' : ''} ${open ? 'open' : ''}" data-g="${esc(g.id)}">
      <button class="qhead" type="button" data-toggle="${esc(g.id)}" aria-expanded="${open}">
        <span><span class="nm">${esc(g.name)}</span>
          <span class="loc">${esc(g.loc || '')} · ${g.docs.length} document${g.docs.length === 1 ? '' : 's'} shown</span></span>
        <span class="tally">${tally}</span>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="qbody" ${open ? '' : 'hidden'}>
        ${g.docs.map(d => `
          <div class="qdoc is-${esc(d.review)}">
            <div>
              <h4>${esc(d.name)}</h4>
              <div class="meta">
                ${d.issuer ? `<span>Issuer <b>${esc(d.issuer)}</b></span>` : ''}
                ${d.number ? `<span>No. <b>${esc(d.number)}</b></span>` : ''}
                ${d.issued ? `<span>Issued <b>${esc(fmtDate(d.issued))}</b></span>` : ''}
                ${d.expires ? `<span>Expires <b>${esc(fmtDate(d.expires))}</b></span>` : ''}
                <span>On their page <b>${d.published ? 'Published' : 'Not published'}</b></span>
              </div>
              <div class="pills">${stPill(d)}${REVIEW_PILL[d.review]}</div>
              ${d.file
                ? `<a class="qfile" href="${d.file.data}" target="_blank" rel="noopener noreferrer"
                      download="${esc(d.file.name)}">${FILE_SVG}Open ${esc(d.file.name)}</a>`
                : '<span class="qnofile">No file attached - approving this would be approving a typed claim.</span>'}
              ${d.reviewNote
                ? `<span class="qremark"><b>Remark:</b> ${esc(d.reviewNote)}</span>` : ''}
            </div>
            <div class="side">
              <div class="acts">
                <button class="btn btn-y btn-sm" data-v="verified" data-c="${esc(d.companyId)}" data-d="${esc(d.id)}">Approve</button>
                <button class="btn btn-w btn-sm" data-v="rejected" data-c="${esc(d.companyId)}" data-d="${esc(d.id)}">Reject</button>
                <button class="btn btn-w btn-sm" data-v="pending" data-c="${esc(d.companyId)}" data-d="${esc(d.id)}">Return</button>
              </div>
            </div>
          </div>`).join('')}
        <div class="qdoc" style="background:var(--surface-2)">
          <span class="qnofile">Every verdict here shows on this company's public page.</span>
          <div class="side"><div class="acts">
            <a class="btn btn-w btn-sm" href="/company?c=${encodeURIComponent(g.id)}" target="_blank" rel="noopener">View their page</a>
          </div></div>
        </div>
      </div>
    </article>`;
  }).join('')
   : '<div class="emptyrow">Nothing matches these filters.</div>';

  $('tabQueue').hidden = !pending;
  $('tabQueue').textContent = pending;
}

$('qList').addEventListener('click', e => {
  const head = e.target.closest('[data-toggle]');
  if (head){
    const id = head.dataset.toggle;
    if (qOpen.has(id)) qOpen.delete(id); else qOpen.add(id);
    paintQueue();
    return;
  }
  const b = e.target.closest('[data-v]');
  if (!b) return;
  qOpen.add(b.dataset.c);          // stay where they were working
  openVerdict(b.dataset.c, b.dataset.d, b.dataset.v);
});

/* =====================================================================
   VERDICT DIALOG
   A verdict is a decision that lands on someone else's public page, so it
   gets a confirmation step and a remark rather than firing off a single
   click. The remark is required for a rejection - telling a company "no"
   without saying why leaves them nothing to act on.
   ===================================================================== */
const VERDICTS = {
  verified: {
    title:'Approve this document',
    sub:'Confirm you have seen the original and checked it with the issuing office.',
    button:'Approve document', tone:'ok',
    effect:'The company\'s public page will show <b>Checked by FR Services</b> against this document.',
    quick:[
      'Original sighted and confirmed with the issuing office.',
      'Verified against the issuer\'s online register.',
      'Confirmed by phone with the issuing office.',
      'Renewal of a document we previously approved; details unchanged.'
    ]
  },
  rejected: {
    title:'Reject this document',
    sub:'The company will be told, so say what was wrong with it.',
    button:'Reject document', tone:'bad',
    effect:'The document is marked <b>Not accepted</b> and the company\'s verified badge is withdrawn while it stands.',
    quick:[
      'The scan is unreadable - please re-upload a clearer copy.',
      'The issuing office has no record of this document.',
      'The details entered do not match the attached file.',
      'This document has expired. Upload the current one.',
      'Wrong document type for the category selected.'
    ]
  },
  pending: {
    title:'Return to the queue',
    sub:'Puts it back to unreviewed without a decision either way.',
    button:'Return to queue', tone:'neutral',
    effect:'Renters will see it as <b>Company-submitted</b> again until someone reviews it.',
    quick:[
      'Needs a second reviewer before a decision.',
      'Waiting on confirmation from the issuing office.',
      'Approved in error - returning for a proper check.'
    ]
  }
};

const vModal = $('vModal');
let vTarget = null;   // { companyId, docId, verdict }

function openVerdict(companyId, docId, verdict){
  const spec = VERDICTS[verdict];
  if (!spec) return;
  const doc = loadDocs(companyId).find(d => d.id === docId);
  if (!doc) return;
  const co = byId(companyId);

  vTarget = { companyId, docId, verdict };
  $('vmTitle').textContent = spec.title;
  $('vmSub').textContent   = spec.sub;
  $('vmGo').textContent    = spec.button;
  $('vmDoc').innerHTML =
    `<b>${esc(doc.name)}</b>` +
    `<span>${esc((co && co.name) || companyId)}` +
    (doc.issuer ? ` · ${esc(doc.issuer)}` : '') +
    (doc.expires ? ` · expires ${esc(fmtDate(doc.expires))}` : '') +
    (doc.file ? ` · ${esc(doc.file.name)}` : ' · no file attached') + '</span>';
  $('vmEff').className = 'vm-eff ' + spec.tone;
  $('vmEff').innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="9"/></svg>' +
    `<span>${spec.effect}</span>`;

  const required = REVIEW_NOTE_REQUIRED.includes(verdict);
  $('vmReq').hidden = !required;
  $('vmNote').value = '';
  $('vmNote').placeholder = required
    ? 'Tell the company what was wrong and what to do about it.'
    : 'What did you check, and what did you conclude? (optional)';
  $('vmQuick').innerHTML = spec.quick
    .map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('');
  $('vmErr').textContent = '';
  paintVmCount();

  /* The trail, so a reviewer can see what was decided before and why. */
  const log = (doc.reviewLog || []).slice().reverse();
  $('vmLog').hidden = !log.length;
  $('vmLogList').innerHTML = log.map(e => {
    const v = DOC_REVIEW[e.review] || DOC_REVIEW.pending;
    return `<li><b>${esc(v.label)}</b> · <time>${esc(fmtDate(e.at))}</time>` +
           (e.auto ? ' · automatic' : '') +
           (e.note ? `<br>${esc(e.note)}` : '') + '</li>';
  }).join('');

  vModal.hidden = false;
  setTimeout(() => $('vmNote').focus(), 40);
}
function closeVerdict(){ vModal.hidden = true; vTarget = null; }

function paintVmCount(){
  $('vmCount').textContent = $('vmNote').value.length + ' / 400';
}
$('vmNote').addEventListener('input', paintVmCount);
$('vmQuick').addEventListener('click', e => {
  const b = e.target.closest('[data-q]');
  if (!b) return;
  const box = $('vmNote');
  box.value = box.value.trim() ? box.value.trim() + ' ' + b.dataset.q : b.dataset.q;
  paintVmCount();
  box.focus();
});
vModal.addEventListener('click', e => {
  if (e.target.closest('[data-vm-close]')) closeVerdict();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !vModal.hidden) closeVerdict();
});

$('vmGo').addEventListener('click', () => {
  if (!vTarget) return;
  const out = setDocReview(vTarget.companyId, vTarget.docId, vTarget.verdict, $('vmNote').value);
  if (!out.ok){ $('vmErr').textContent = out.error; $('vmNote').focus(); return; }
  closeVerdict();
  platformScanClear();             // standing and badge counts just changed
  paintQueue();
});
$('qExpand').addEventListener('click', () => {
  queueRows().forEach(d => qOpen.add(d.companyId));
  paintQueue();
});
$('qCollapse').addEventListener('click', () => { qOpen.clear(); paintQueue(); });
['qSearch','qReview','qState','qPub'].forEach(id =>
  $(id).addEventListener('input', paintQueue));

/* =====================================================================
   COMPANIES
   ===================================================================== */
let coRangeId = '30';
/* Full labels stack a three-line company onto a three-line service list;
   the abbreviations stay on one row and the full text is in the title. */
const SHORT_CAT = { vehicles:'Vehicles', equipment:'Heavy', towing:'Towing' };

function paintCompanies(){
  const r = opsRange(coRangeId, TODAY);
  const s = platformScan(r.from, r.to, TODAY);
  const q  = $('coSearch').value.trim().toLowerCase();
  const ct = $('coCat').value, sd = $('coStanding').value, sort = $('coSort').value;

  let rows = s.companies.filter(c => {
    if (ct && !c.cats.includes(ct)) return false;
    if (sd === 'risk'     && c.badgeOk) return false;
    if (sd === 'ok'       && !c.badgeOk) return false;
    if (sd === 'nodocs'   && c.docs.reviewable) return false;
    if (sd === 'reported' && !c.openReports) return false;
    if (q && !(c.name + ' ' + c.loc).toLowerCase().includes(q)) return false;
    return true;
  });

  const risk = c => (c.docs.reviewableExpired * 3) + (c.docs.rejected * 3) +
                    c.docs.pending + (c.badgeGap * 2) + c.openReports * 2;
  rows.sort((a, b) =>
    sort === 'bookings' ? b.bookings - a.bookings
  : sort === 'util'     ? b.utilisation - a.utilisation
  : sort === 'rating'   ? (b.rating || 0) - (a.rating || 0)
  : sort === 'risk'     ? risk(b) - risk(a)
  :                       b.gmv - a.gmv);

  $('coCount').textContent =
    `${rows.length} of ${s.companies.length} companies · ${fmtDate(r.from)} – ${fmtDate(r.to)}`;

  $('coRows').innerHTML = rows.length ? rows.map(c => `
    <tr>
      <td class="strong"><a href="/company?c=${encodeURIComponent(c.id)}" style="text-decoration:underline">${esc(c.name)}</a>
        <span class="sub">since ${c.since} · ★ ${c.rating} (${c.reviews})</span></td>
      <td class="nowrap">${esc(c.region)}</td>
      <td class="nowrap" title="${esc(c.cats.map(x => CAT_LABEL[x] || x).join(', '))}">${
        c.cats.map(x => SHORT_CAT[x] || x).join(' · ')}</td>
      <td class="num">${c.fleetQty}<span class="sub">${c.fleetSize} listings</span></td>
      <td class="num">${c.bookings}${c.pendingBookings ? `<span class="sub">${c.pendingBookings} pending</span>` : ''}</td>
      <td class="num strong">${esc(money(c.gmv))}</td>
      <td class="num">${esc(money(c.commission))}</td>
      <td class="num">${pct(c.utilisation)}</td>
      <td class="nowrap">${c.docs.verified}/${REVIEWABLE_TYPES.length} approved
        <span class="sub">${c.docs.total - c.docs.reviewable} other on file</span>
        ${c.docs.pending ? `<span class="sub">${c.docs.pending} awaiting</span>` : ''}
        ${c.docs.reviewableExpired ? `<span class="sub" style="color:var(--danger)">${c.docs.reviewableExpired} expired</span>` : ''}</td>
      <td>${c.badgeOk ? '<span class="st st-ok">Good standing</span>'
                      : c.docs.reviewable ? '<span class="st st-warn">At risk</span>'
                                          : '<span class="st st-off">No registration</span>'}
        ${c.openReports ? `<span class="sub" style="color:var(--danger)">${c.openReports} open report${c.openReports > 1 ? 's' : ''}</span>` : ''}</td>
      <td class="num"><button class="btn btn-w btn-sm" data-docs="${esc(c.id)}">Documents</button></td>
    </tr>`).join('')
   : '<tr><td colspan="11" class="emptyrow">No companies match these filters.</td></tr>';
}
$('coRows').addEventListener('click', e => {
  const b = e.target.closest('[data-docs]');
  if (!b) return;
  $('qSearch').value = (byId(b.dataset.docs) || {}).name || '';
  $('qReview').value = '';
  showTab('review');
});
['coSearch','coCat','coStanding','coSort'].forEach(id =>
  $(id).addEventListener('input', paintCompanies));
buildChips('coRange', ['today','week','month','lastmo','30','quarter','year','all'], coRangeId,
  id => { coRangeId = id; paintCompanies(); });

/* =====================================================================
   REPORTS
   ===================================================================== */
$('rpReason').innerHTML += Object.keys(REPORT_REASONS)
  .map(k => `<option value="${k}">${esc(REPORT_REASONS[k])}</option>`).join('');

function paintReports(){
  const all = loadReports(TODAY);
  const q  = $('rpSearch').value.trim().toLowerCase();
  const st = $('rpState').value, rs = $('rpReason').value;

  $('rpKpis').innerHTML = [
    { label:'Open', value:String(all.filter(r => r.state === 'open').length), note:'not yet triaged' },
    { label:'Under review', value:String(all.filter(r => r.state === 'reviewing').length) },
    { label:'Upheld', value:String(all.filter(r => r.state === 'upheld').length), note:'action taken' },
    { label:'Dismissed', value:String(all.filter(r => r.state === 'dismissed').length) }
  ].map(kpiCard).join('');

  const rows = all.filter(r => {
    if (st && r.state !== st) return false;
    if (rs && r.reason !== rs) return false;
    const co = byId(r.company);
    const hay = ((co && co.name) || r.company) + ' ' + REPORT_REASONS[r.reason] + ' ' + r.detail;
    if (q && !hay.toLowerCase().includes(q)) return false;
    return true;
  });

  $('rpCount').textContent = `${rows.length} report${rows.length === 1 ? '' : 's'}`;
  $('rpList').innerHTML = rows.length ? rows.map(r => {
    const co = byId(r.company);
    const s = REPORT_STATES[r.state];
    return `<article class="repcard">
      <div class="rephead">
        <h4>${esc(REPORT_REASONS[r.reason])}</h4>
        <span class="st st-${s.tone}">${esc(s.label)}</span>
        <span class="when">${esc(fmtDate(r.at))}</span>
      </div>
      <div class="repmeta">
        <span>Company: <a href="/company?c=${encodeURIComponent(r.company)}" target="_blank" rel="noopener" style="text-decoration:underline"><b>${esc((co && co.name) || r.company)}</b></a></span>
        ${r.ref ? `<span>Booking: <b>${esc(r.ref)}</b></span>` : ''}
        <span>Reporter: <b>${r.anon ? 'Anonymous to the company' : 'Named'}</b></span>
      </div>
      ${r.detail ? `<p class="body">${esc(r.detail)}</p>` : ''}
      ${r.note ? `<p class="small muted">Operator note: ${esc(r.note)}</p>` : ''}
      <div class="repacts">
        <button class="btn btn-w btn-sm" data-rs="reviewing" data-id="${esc(r.id)}">Take for review</button>
        <button class="btn btn-y btn-sm" data-rs="upheld" data-id="${esc(r.id)}">Uphold</button>
        <button class="btn btn-w btn-sm" data-rs="dismissed" data-id="${esc(r.id)}">Dismiss</button>
        <button class="btn btn-w btn-sm" data-rs="open" data-id="${esc(r.id)}">Reopen</button>
      </div>
    </article>`;
  }).join('')
   : '<div class="emptyrow">No reports match these filters.</div>';

  const open = all.filter(r => r.state === 'open').length;
  $('tabReports').hidden = !open;
  $('tabReports').textContent = open;
}
$('rpList').addEventListener('click', e => {
  const b = e.target.closest('[data-rs]');
  if (!b) return;
  setReportState(b.dataset.id, b.dataset.rs);
  platformScanClear();
  paintReports();
});
['rpSearch','rpState','rpReason'].forEach(id =>
  $(id).addEventListener('input', paintReports));

/* =====================================================================
   MONITORING
   ===================================================================== */
function paintMonitoring(){
  const r = opsRange('quarter', TODAY);
  const s = platformScan(r.from, r.to, TODAY);
  const docs = allDocuments(TODAY);

  const soon = docs
    .filter(d => d.published && d.expires && d.daysLeft !== null && d.daysLeft <= 90)
    .sort((a, b) => a.expires.localeCompare(b.expires));

  $('mnKpis').innerHTML = [
    { label:'Documents on file', value:String(docs.length),
      note:`${s.docs.reviewable} we verify · ${s.docs.exempt} owner-supplied` },
    { label:'Expiring in 90 days', value:String(soon.filter(d => d.daysLeft >= 0).length),
      note:`${soon.filter(d => d.daysLeft < 0).length} already expired` },
    { label:'Badges at risk', value:String(s.counts.atRisk), note:`of ${s.counts.companies} companies` },
    { label:'No registration on file', value:String(s.companies.filter(c => !c.docs.reviewable).length) }
  ].map(kpiCard).join('');

  $('mnExpiring').innerHTML = soon.length ? soon.slice(0, 60).map(d => `
    <tr>
      <td class="strong">${esc(d.companyName)}</td>
      <td>${esc(d.name)}</td>
      <td>${esc(d.issuer || '-')}</td>
      <td class="nowrap">${esc(fmtDate(d.expires))}</td>
      <td class="num">${stPill(d)}</td>
    </tr>`).join('')
   : '<tr><td colspan="5" class="emptyrow">Nothing published expires in the next 90 days.</td></tr>';

  const risky = s.companies.filter(c => !c.badgeOk && c.docs.reviewable)
    .sort((a, b) => (b.docs.reviewableExpired + b.docs.rejected + b.badgeGap) -
                    (a.docs.reviewableExpired + a.docs.rejected + a.badgeGap));
  $('mnBadges').innerHTML = risky.length ? risky.map(c => `
    <tr>
      <td class="strong">${esc(c.name)}</td>
      <td>${esc(c.region)}</td>
      <td class="num">${c.docs.verified} / ${REVIEWABLE_TYPES.length}</td>
      <td class="num">${c.docs.reviewableExpired || '-'}</td>
      <td class="num">${c.docs.rejected || '-'}</td>
      <td class="num">${c.docs.pending || '-'}</td>
      <td class="num"><button class="btn btn-w btn-sm" data-docs2="${esc(c.id)}">Review</button></td>
    </tr>`).join('')
   : '<tr><td colspan="7" class="emptyrow">Every badge is currently justified.</td></tr>';

  const totalG = s.totals.gmv || 1;
  $('mnRegions').innerHTML = s.byRegion.map(g => `
    <tr>
      <td class="strong">${esc(g.key)}</td>
      <td class="num">${g.companies}</td>
      <td class="num">${g.bookings}</td>
      <td class="num">${esc(money(g.gmv))}</td>
      <td class="num">${(g.gmv / totalG * 100).toFixed(1)}%</td>
    </tr>`).join('');

  /* Prototype diagnostics - honest about what they are. */
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      used += (k.length + String(localStorage.getItem(k) || '').length) * 2;
    }
  } catch { used = -1; }
  const scanMs = (() => { const t = performance.now(); platformScan(r.from, r.to, TODAY); return Math.round(performance.now() - t); })();

  $('mnHealth').innerHTML = [
    ['Companies registered', s.counts.companies],
    ['Listings across the marketplace', s.totals.listings],
    ['Physical units', s.totals.fleet],
    ['Browser storage in use', used < 0 ? 'unavailable' : (used / 1024).toFixed(0) + ' KB of ~5 MB'],
    ['Cached scan lookup', scanMs + ' ms'],
    ['Data source', 'Generated fixtures, seeded per company']
  ].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
}
$('mnBadges').addEventListener('click', e => {
  const b = e.target.closest('[data-docs2]');
  if (!b) return;
  $('qSearch').value = (byId(b.dataset.docs2) || {}).name || '';
  $('qReview').value = '';
  showTab('review');
});

/* =====================================================================
   SIGN-IN GATE
   The console is not painted until there is a session - locking a page
   whose data is already in the DOM would be theatre.
   ===================================================================== */
const gate = $('gate');
const STEPS = { in:'stepIn', ask:'stepAsk', new:'stepNew' };
let resetFor = '';

function gateStep(name){
  Object.entries(STEPS).forEach(([k, id]) => { $(id).hidden = k !== name; });
  ['inErr','inOk','askErr','newErr'].forEach(id => { $(id).textContent = ''; });
  const focus = { in:'inUser', ask:'askUser', new:'newCodeIn' }[name];
  setTimeout(() => { const el = $(focus); if (el) el.focus(); }, 40);
}

function lockConsole(){
  document.body.classList.add('locked');
  gate.hidden = false;
  gateStep('in');
  $('credLine').innerHTML =
    `${esc(FR_DEFAULT_ADMIN.user)}<br>${esc(FR_DEFAULT_ADMIN.password)}`;
}

function unlockConsole(session){
  gate.hidden = true;
  document.body.classList.remove('locked');
  $('whoami').innerHTML =
    `Signed in as <b>${esc(session.name)}</b>` +
    (session.usingDefaultPassword
      ? ' <span class="pwnote">Still on the shipped password</span>' : '');
  showTab((location.hash || '').replace('#', '') || 'overview');
}

/* Peek buttons */
document.querySelectorAll('[data-peek]').forEach(b => b.addEventListener('click', () => {
  const el = $(b.dataset.peek);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  b.textContent = show ? 'Hide' : 'Show';
  el.focus();
}));
document.querySelectorAll('[data-back]').forEach(b =>
  b.addEventListener('click', () => gateStep('in')));
$('toReset').addEventListener('click', () => {
  $('askUser').value = $('inUser').value;
  gateStep('ask');
});

/* --- sign in --- */
$('inForm').addEventListener('submit', async () => {
  const err = $('inErr');
  err.textContent = '';
  $('inGo').disabled = true;
  try {
    const r = await authSignIn($('inUser').value, $('inPass').value, $('inKeep').checked);
    if (!r.ok){ err.textContent = r.error; $('inPass').select(); return; }
    $('inPass').value = '';
    unlockConsole(r.session);
  } finally {
    $('inGo').disabled = false;
  }
});

/* --- request a code --- */
$('askForm').addEventListener('submit', () => {
  const user = $('askUser').value.trim();
  if (!user){ $('askErr').textContent = 'Enter the email on the account.'; return; }
  const r = authStartReset(user);
  resetFor = user;
  gateStep('new');
  $('newSub').textContent =
    `If ${user} has an account, a code has been issued for it. Codes last ${RESET_MINUTES} minutes and work once.`;
  /* No mail server exists, so the code is shown rather than sent. Saying
     so is better than leaving the operator waiting for an email. */
  $('newCode').innerHTML = r.sent
    ? `Your code is <b style="letter-spacing:.2em">${esc(r.code)}</b>.<br>` +
      `<span style="font-weight:500">Shown here because this prototype has no mail server - in production it would be emailed and never displayed.</span>`
    : `<span style="font-weight:500">If that address is registered, a code has been issued. ` +
      `We don't confirm either way, so this form can't be used to find out who has an account.</span>`;
});

/* --- set the new password --- */
$('newForm').addEventListener('submit', async () => {
  const err = $('newErr');
  err.textContent = '';
  const a = $('newPass').value, b = $('newPass2').value;
  if (a !== b){ err.textContent = 'The two passwords do not match.'; return; }
  const problem = passwordProblem(a);
  if (problem){ err.textContent = problem; return; }

  $('newGo').disabled = true;
  try {
    const r = await authCompleteReset(resetFor, $('newCodeIn').value, a);
    if (!r.ok){ err.textContent = r.error; return; }
    $('newPass').value = $('newPass2').value = $('newCodeIn').value = '';
    gateStep('in');
    $('inUser').value = resetFor;
    $('inOk').textContent = 'Password changed. Sign in with the new one.';
  } finally {
    $('newGo').disabled = false;
  }
});

$('signOut').addEventListener('click', () => {
  authSignOut();
  location.reload();
});

/* ---------- boot ---------- */
(async () => {
  await authEnsureDefault();
  const session = authSession();
  if (session) unlockConsole(session);
  else lockConsole();
})();
