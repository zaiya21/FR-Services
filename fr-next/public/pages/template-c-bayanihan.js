
const C_DATA={
  vehicles:[
    {n:"Mindanao Auto Rentals",loc:"Poblacion, Davao City · 2.4 km",r:4.92,c:341,p:"2,800",u:"/ day",em:"🚐",bg:"#EEF2FF",tags:["Self-drive","32 units","Instant book"],st:"Available now",stc:"now"},
    {n:"SouthPoint Van Hire",loc:"Matina, Davao City · 4.1 km",r:4.87,c:198,p:"3,500",u:"/ day",em:"🚌",bg:"#ECFDF5",tags:["With driver","15-seater","Airport run"],st:"Verified",stc:"ok"},
    {n:"Bagumbayan Motors",loc:"Buhangin, Davao City · 6.8 km",r:4.74,c:126,p:"1,900",u:"/ day",em:"🚗",bg:"#FEF9C3",tags:["Sedan · SUV","Monthly rate"],st:"Available now",stc:"now"},
    {n:"Davao Fleet Solutions",loc:"Toril, Davao City · 11.2 km",r:4.95,c:512,p:"4,200",u:"/ day",em:"🚙",bg:"#FFF1EC",tags:["Corporate","Long-term","GPS tracked"],st:"Verified",stc:"ok"}
  ],
  equipment:[
    {n:"Davao Heavy Lift Corp.",loc:"Talomo, Davao City · 3.9 km",r:4.90,c:218,p:"12,000",u:"/ day",em:"🏗️",bg:"#FEF9C3",tags:["Excavator 20T","Operator incl.","Crane 25T"],st:"3 available",stc:"now"},
    {n:"Mount Apo Equipment",loc:"Calinan, Davao City · 18.4 km",r:4.81,c:94,p:"8,400",u:"/ day",em:"🚜",bg:"#F1F5F9",tags:["Backhoe","Loader 3cbm","Delivery incl."],st:"5 available",stc:"now"},
    {n:"Sta. Ana Builders Rental",loc:"Agdao, Davao City · 5.2 km",r:4.68,c:73,p:"6,000",u:"/ day",em:"⛏️",bg:"#FEF3C7",tags:["Bulldozer D6","Compactor","Weekly rate"],st:"Verified",stc:"ok"},
    {n:"Panabo Machinery Hub",loc:"Panabo, Davao del Norte · 32.7 km",r:4.77,c:141,p:"9,800",u:"/ day",em:"🏗️",bg:"#ECFEFF",tags:["Crane 25T","Boom lift","Certified crew"],st:"Book 24h ahead",stc:"ok"}
  ],
  towing:[
    {n:"Rapid Response Towing",loc:"Bajada, Davao City · 1.8 km",r:4.96,c:604,p:"1,500",u:"/ call-out",em:"🛻",bg:"#FFF1EC",tags:["24/7","Flatbed","ETA 12 min"],st:"On standby",stc:"now"},
    {n:"Davao Roadside Assist",loc:"Lanang, Davao City · 5.6 km",r:4.83,c:287,p:"1,800",u:"/ call-out",em:"🚨",bg:"#F1F5F9",tags:["Heavy duty","Winch-out","Jumpstart"],st:"On standby",stc:"now"},
    {n:"Bukidnon Tow Express",loc:"Mintal, Davao City · 9.3 km",r:4.71,c:112,p:"2,200",u:"/ call-out",em:"🛞",bg:"#EFF6FF",tags:["Long-haul","Truck recovery"],st:"1 unit busy",stc:"ok"},
    {n:"Sasa 24H Wrecker",loc:"Sasa, Davao City · 12.1 km",r:4.88,c:355,p:"1,650",u:"/ call-out",em:"🔧",bg:"#F5F3FF",tags:["24/7","Motorcycle tow","Port area"],st:"On standby",stc:"now"}
  ]
};
const C_T={vehicles:["Vehicle companies near you","147 verified providers in Davao City"],equipment:["Heavy equipment providers near you","63 verified providers in Davao City"],towing:["Towing services near you","41 verified providers in Davao City"]};
const cstar='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

function cRender(cat){
  document.getElementById('c-cards').innerHTML=C_DATA[cat].map(x=>`
    <article class="co" tabindex="0">
      <div class="cotop" style="background:${x.bg}">
        ${x.em}
        <span class="cotag ${x.stc}">${x.stc==='ok'?'✓ ':'● '}${x.st}</span>
        <button class="cofav" aria-label="Save ${x.n}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20.8 8.6c0 5-8.8 9.9-8.8 9.9s-8.8-4.9-8.8-9.9a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7z"/></svg>
        </button>
      </div>
      <div class="cobody">
        <div class="coname">
          <h3>${x.n}</h3>
          <span class="corate">${cstar}${x.r.toFixed(2)}</span>
        </div>
        <p class="coloc">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          ${x.loc}
        </p>
        <div class="cotags">${x.tags.map(t=>`<span class="t">${t}</span>`).join('')}</div>
        <div class="cofoot">
          <div class="coprice"><span class="p">₱${x.p}</span> <span class="u">${x.u}</span></div>
          <button class="cobtn">Book</button>
        </div>
      </div>
    </article>`).join('');
}
cRender('vehicles');

document.querySelectorAll('.catcard').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.catcard').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  const c=b.dataset.cat; cRender(c);
  document.getElementById('c-title').textContent=C_T[c][0];
  document.getElementById('c-sub').textContent=C_T[c][1]+' · sorted by distance';
  document.querySelector('.section').scrollIntoView({behavior:'smooth',block:'start'});
}));
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(z=>z.classList.remove('on')); t.classList.add('on');
}));
document.querySelectorAll('.mpin:not(.you)').forEach(p=>p.addEventListener('click',()=>{
  document.querySelectorAll('.mpin').forEach(z=>z.classList.remove('on')); p.classList.add('on');
}));
