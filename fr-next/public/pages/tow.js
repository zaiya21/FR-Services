
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
