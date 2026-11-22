"use strict";
/* ---------- input ---------- */
const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0,1,0), 0), hitP = new T.Vector3();
const ptrs = new Map(); let gest = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
  closeCtx();
  if (ptrs.size === 1){
    gest = { type:'tap', btn:e.button, sx:e.clientX, sy:e.clientY, lx:e.clientX, ly:e.clientY, shift:e.shiftKey||e.ctrlKey||e.metaKey, t0:performance.now(), maxD:0, touch:e.pointerType !== 'mouse' };
    if (G && G.started && !G.over && e.button === 0){
      if (G.mode === 'lb'){ const p = groundPt(e.clientX, e.clientY); if (p) gest.lbA = SUP.lbA || p; }
      // a route is drawn only by pressing on a soldier who is already selected; any other drag moves the camera
      else if (G.mode === 'move' && OPT.draw){ const P_ = pickAt(e.clientX, e.clientY); if (P_.unit && P_.unit.team === 'us' && G.sel.has(P_.unit)) gest.unit = P_.unit; }
      const gg = gest; gest.lpT = setTimeout(() => { if (gest === gg && gg.type === 'tap' && ptrs.size === 1){ gg.type = 'lp'; groundMenu(gg.sx, gg.sy); } }, 520);
    }
  }
  else if (ptrs.size === 2){ if (gest && gest.lpT) clearTimeout(gest.lpT); G.draft = null; G.panT = performance.now(); if (SUP) SUP.draft = null; const [a,b] = [...ptrs.values()]; gest = { type:'pinch', d0:Math.hypot(a.x-b.x,a.y-b.y), a0:Math.atan2(b.y-a.y,b.x-a.x), z0:camS.zoomT, y0:camS.yawT, cx:(a.x+b.x)/2, cy:(a.y+b.y)/2 }; }
});
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if (!gest) return;
  if (gest.type === 'tap') gest.maxD = Math.max(gest.maxD, Math.hypot(e.clientX-gest.sx, e.clientY-gest.sy));
  if (gest.type === 'tap' && gest.maxD > (gest.touch ? 12 : 6)){
    if (gest.lpT) clearTimeout(gest.lpT);
    // drawing needs a deliberate press on the soldier first; a quick swipe is always a pan
    const held = performance.now() - gest.t0 > 160;
    gest.type = gest.btn === 2 ? 'rot' : gest.lbA ? 'lbdraw' : (gest.unit && held) ? 'draw' : 'pan';
    if (gest.type === 'pan' || gest.type === 'rot') G.panT = performance.now();
    if (gest.type === 'draw'){ gest.pts = [[gest.unit.x, gest.unit.z]]; G.draft = gest.pts; }
  }
  if (gest.type === 'lbdraw'){ const p = groundPt(e.clientX, e.clientY); if (p){ SUP.draft = [gest.lbA, lbClamp(gest.lbA, p)]; lbHint(); } }
  else if (gest.type === 'draw'){ const p = groundPt(e.clientX, e.clientY); if (p){ const l = gest.pts[gest.pts.length-1]; if (Math.hypot(p[0]-l[0], p[1]-l[1]) > .7) gest.pts.push(p); } }
  else if (gest.type === 'pan' || (gest.type === 'rot' && (FLIGHT.on || CINE.on))){ if (FLIGHT.on) FLIGHT.uyaw -= (e.clientX-gest.lx)*0.008; else if (CINE.on) CINE.uyaw -= (e.clientX-gest.lx)*0.008; else pan(e.clientX-gest.lx, e.clientY-gest.ly); }
  else if (gest.type === 'rot'){ camS.yawT -= (e.clientX-gest.lx)*0.008; camS.yaw = camS.yawT; }
  else if (gest.type === 'pinch' && ptrs.size >= 2){
    const [a,b] = [...ptrs.values()]; const d = Math.hypot(a.x-b.x,a.y-b.y), an = Math.atan2(b.y-a.y,b.x-a.x);
    const CC = FLIGHT.on ? FLIGHT : CINE.on ? CINE : null;
    if (CC){ if (gest.fuz == null){ gest.fuz = CC.uz; gest.fyw = CC.uyaw; } CC.uz = clamp(gest.fuz * gest.d0 / Math.max(20,d), .3, 1.8); CC.uyaw = gest.fyw - (an - gest.a0); }
    else { camS.zoomT = clamp(gest.z0 * gest.d0 / Math.max(20,d), 4, 22); camS.zoom = camS.zoomT;
    camS.yawT = gest.y0 - (an - gest.a0); camS.yaw = camS.yawT; }
    const cx = (a.x+b.x)/2, cy = (a.y+b.y)/2; pan(cx-gest.cx, cy-gest.cy); gest.cx = cx; gest.cy = cy;
  }
  if (gest) { gest.lx = e.clientX; gest.ly = e.clientY; }
});
function endPtr(e){
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (gest && gest.lpT) clearTimeout(gest.lpT);
  // a tap is short and still; anything that panned, pinched or lasted too long never gives an order
  if (gest && gest.type === 'tap' && e.type === 'pointerup' && performance.now() - gest.t0 < 450 && ptrs.size === 0 && !gest.multi){ if (FLIGHT.on) flightTap(e.clientX, e.clientY); else if (!CINE.on) tap(e.clientX, e.clientY, gest.shift); }
  else if (gest && gest.type === 'lbdraw'){ const p = groundPt(e.clientX, e.clientY) || (SUP.draft && SUP.draft[1]); SUP.draft = null;
    if (e.type === 'pointerup' && p && callLB(gest.lbA, p)){ SUP.lbA = null; setMode('move'); } }
  else if (gest && gest.type === 'draw'){ G.draft = null;
    if (e.type === 'pointerup'){ const u = gest.unit; if (!G.sel.has(u)){ G.sel.clear(); G.sel.add(u); refreshCards(); } drawInto(u, gest.pts); } }
  if (ptrs.size === 0) gest = null;
  else if (gest && gest.type === 'pinch') gest = { type:'dead', multi:true };   // the finger left behind after a pinch does nothing until all are lifted
}
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointermove', e => { if (ptrs.size || !G || G.mode !== 'lb' || !SUP || !SUP.lbA) return; const p = groundPt(e.clientX, e.clientY); if (p){ SUP.draft = [SUP.lbA, lbClamp(SUP.lbA, p)]; lbHint(); } });
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY*0.0012)); }, { passive:false });

function lbHint(){ if (!SUP.draft) return; const d = SUP.draft, L = Math.hypot(d[1][0]-d[0][0], d[1][1]-d[0][1]); hint('Pasada: ' + Math.round(L*1.5) + ' m × 15 m' + (L >= LB_LEN - .1 ? ' (máximo)' : '') + '. Todo lo que quede dentro, aliado o enemigo, cae.'); }
function groundPt(cx, cy){ ndc.set(cx/innerWidth*2-1, -(cy/innerHeight)*2+1); ray.setFromCamera(ndc, cam); return ray.ray.intersectPlane(plane, hitP) ? [hitP.x, hitP.z] : null; }
let lastUTap = { u:null, t:0 };
function tap(cx, cy, shift){
  if (!G.started || G.over) return;
  if (G.mode === 'lb'){ const p = groundPt(cx, cy); if (!p) return;
    if (!SUP.lbA){ SUP.lbA = p; SUP.draft = null; hint('Arrastra o toca el final de la pasada (máx. 100 m)'); } else if (callLB(SUP.lbA, p)){ SUP.lbA = null; setMode('move'); } return; }
  if (G.mode === 'flare'){ const p = groundPt(cx, cy); if (p && callFlare(p[0], p[1])) setMode('move'); return; }
  ndc.set(cx/innerWidth*2-1, -(cy/innerHeight)*2+1); ray.setFromCamera(ndc, cam);
  const hbs = units.filter(u => (u.team==='us' && u.alive && !u.npc) || (u.team==='them' && u.alive && u.spotted)).map(u => u.m.hb);
  const hit = ray.intersectObjects(hbs, false)[0];
  if (hit){
    const u = hit.object.userData.unit;
    if (u.team === 'us'){
      const now = performance.now();
      if (!shift && lastUTap.u === u && now - lastUTap.t < 380){ if (IRN.groups){ const g = irGroupSel(u); lastUTap.u = null; refreshCards(); if (g) hint(g.name + ' seleccionado'); return; } G.sel = new Set(us.filter(o => o.alive && !o.npc)); lastUTap.u = null; refreshCards(); hint('Toda la escuadra seleccionada'); return; }
      lastUTap = { u, t:now };
      if (shift){ G.sel.has(u) ? G.sel.delete(u) : G.sel.add(u); } else { G.sel.clear(); G.sel.add(u); }
      setMode('move'); refreshCards(); return;
    }
    if (!alive().length){ hint('Selecciona primero a un soldado'); return; }
    if (G.mode === 'suppress') cmdSuppress(u.x, u.z); else cmdAttack(u);
    setMode('move'); return;
  }
  let pt = null;
  const bh = ray.intersectObjects(visibleBoxMeshes(), false).find(h => h.point.y > .15);
  if (bh) pt = bh.point; else if (ray.ray.intersectPlane(plane, hitP)) pt = hitP;
  if (!pt) return;
  if (!alive().length){ hint('Selecciona primero a un soldado'); return; }
  if (G.mode === 'suppress'){ cmdSuppress(pt.x, pt.z); setMode('move'); return; }
  if (G.mode === 'move'){ const bid = bAt(Math.floor(pt.x + ray.ray.direction.x*.06), Math.floor(pt.z + ray.ray.direction.z*.06)); if (bid >= 0){ buildingMenu(cx, cy, bid, pt); return; } }
  if (G.mode === 'attack'){ hint('Toca un enemigo visible, o usa Suprimir sobre una zona'); return; }
  const c = nearestFree(Math.floor(pt.x), Math.floor(pt.z)); cmdMove(c[0], c[1], !G.newRoute);
}

/* ---------- HUD ---------- */
function buildCards(){
  if (MIS.id === 'irene' || IRN.groups) return irCards();
  formDefaults([us]);
  const box_ = $('squad'); box_.innerHTML = '';
  us.forEach((u,k) => {
    const b = document.createElement('button'); b.className = 'card'; b.id = 'card'+k;
    b.innerHTML = `<span class="cn">${trName(u.name)}</span><span class="cr">${L(u.role)}</span><span class="men"></span><span class="cs"><b>Listo</b><em></em></span>`;
    let lastTap = 0;
    b.addEventListener('click', ev => {
      if (!u.alive) return;
      const now = performance.now();
      if (now - lastTap < 350){ camS.tx = u.x; camS.tz = u.z; }
      lastTap = now;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey){ G.sel.has(u) ? G.sel.delete(u) : G.sel.add(u); } else { G.sel.clear(); G.sel.add(u); }
      G.newRoute = true; refreshCards();
    });
    u.card = { el:b, men:b.querySelector('.men'), st:b.querySelector('.cs b'), am:b.querySelector('.cs em'), cells:[] };
    box_.appendChild(b);
  });
  refreshCards();
}
function refreshCards(){
  updFormIco();
  if (MIS.id === 'irene' || IRN.groups){ irRefresh(); if (G.started) renderSubs(); $('clock').textContent = fmtClock(); return; }
  for (const u of us){
    const c = u.card; if (!c) continue;
    c.el.classList.toggle('sel', G.sel.has(u)); c.el.classList.toggle('down', !u.alive && !u.down);
    // a wounded man's card blinks: amber while his bar is orange or yellow, red when he is badly hit or down
    c.el.classList.toggle('hurt', u.alive && u.hp < 70 && u.hp >= 40); c.el.classList.toggle('crit', u.down || (u.alive && u.hp < 40));
    menCells(c, [u]);
    const st = u.down ? (u.reviveT > 0 ? 'Atendido' : 'Caído') : u.status;
    c.st.textContent = L(st); c.st.className = u.pinned || u.down ? 'st-pin' : u.sup > 50 || u.spent ? 'st-sup' : 'st-ok';
    c.am.textContent = '';
  }
  const ok = us.filter(u => u.alive).length;
  $('tally').textContent = L(`Escuadra ${ok}/6 · Caídos ${us.filter(u => u.down).length} · Abatidos ${G.kills}`);
  if (G.started) renderSubs();
  $('clock').textContent = fmtClock();
}
function fmtClock(){ const s = G.startClock + Math.floor(G.t*TIMESCALE); return [Math.floor(s/3600), Math.floor(s/60)%60, s%60].map(v => String(v).padStart(2,'0')).join(':'); }
function hint(t){ $('hint').textContent = L(t); }
/* ---------- radio chat: every mission's voices in one running conversation ---------- */
const CHAT = { q:[], t:0, hist:[], open:false };
function chatLine(who, text, cls){
  CHAT.hist.push([who, text, cls || 'sys', G && G.started ? fmtClock() : '']); if (CHAT.hist.length > 120) CHAT.hist.shift();
  CHAT.fresh = performance.now(); renderChatLive(); if (CHAT.open) renderChatHist();
}
const chatEl = (w, t, c, ck) => { const el = document.createElement('div'); el.className = 'cl ' + c;
  if (ck){ const i = document.createElement('i'); i.textContent = ck; el.appendChild(i); }
  if (w){ const b = document.createElement('b'); b.textContent = L(w); el.appendChild(b); }
  const s = document.createElement('span'); s.textContent = L(t); el.appendChild(s); return el; };
// collapsed: the last two or three lines, fewer when they are long
function renderChatLive(){
  const L = $('chatLive'); if (!L) return; L.innerHTML = '';
  const out = []; let budget = 190;
  for (let k=CHAT.hist.length-1; k>=0 && out.length<3; k--){ const len = CHAT.hist[k][1].length + 30; if (out.length >= 1 && (budget -= len) < 0) break; if (!out.length) budget -= len; out.unshift(CHAT.hist[k]); }
  out.forEach((h, i) => { const el = chatEl(h[0], h[1], h[2]); if (i === out.length - 1) el.classList.add('new'); L.appendChild(el); });
  $('chat').classList.toggle('empty', !CHAT.hist.length);
}
// lines queue up so a conversation reads like one: a pause between them, longer after a long line
const SPK = {
  'Delta A':'Cap. Scott Miller · Kilo 2-1',
  'Uniform 6-4':'Tte. Cor. Tom Matthews · Uniform 6-4 · Mando aéreo (C2)',
  'JOC':'Gen. William Garrison · JOC',
  'Sgto. Struecker':'Sgto. Jeff Struecker · Ranger · Columna McKnight',
  'Cap. Steele':'Cap. Mike Steele · Juliet 6-4 · Ranger · Romeo 1-1',
  'Tte. Cor. McKnight':'Tte. Cor. McKnight · Ranger · Jefe de la columna',
  'Maddox':'Esp. Maddox · Conductor · Columna McKnight',
  'Cabo Ottie':'Cabo Ottie · Ranger · Columna McKnight',
  'Super 6-1':'CW3 Cliff Wolcott · Super 6-1 · 160º SOAR',
  'Super 6-2':'CW3 Mike Goffena · Super 6-2 · 160º SOAR',
  'Super 6-4':'CW4 Mike Durant · Super 6-4 · 160º SOAR',
  'Super 6-3':'Super 6-3 · 160º SOAR',
  'Super 6-8':'CW3 Dan Jollota · Super 6-8 · CSAR',
  'Star 4-1':'CW3 Keith Jones · Star 4-1 · 160º SOAR', 'Star 4-4':'Star 4-4 · 160º SOAR',
  'Gordon':'Sgto. Mayor Gary Gordon · Kilo 4-1',
  'Shughart':'Sgto. 1º Randy Shughart · Kilo 4-1',
  'PJ':'Sgto. Tim Wilkinson · PJ · CSAR · Super 6-8',
  'Base':'Base TFR · Aeropuerto',
  'Romeo 6-4':'Romeo 6-4 · Columna de vehículos',
  'ONU':'Columna de la ONU · 10ª Div. de Montaña',
};
// the label on a soldier's own lines: who he is, Delta or Ranger, and which unit he belongs to
function unitLabel(u){
  if (!u) return '';
  const g = IRN.groups && u.grp != null ? IRN.groups[u.grp] : null;
  // the unit's real callsign: Kilo 1-1, or Ranger · Romeo 2-1
  const unit = u.unitName || (g ? g.name : u.look === 'delta' ? 'Kilo 1-1' : 'Escuadra');
  const force = /^Delta/.test(unit) ? null : u.pj ? 'PJ' : u.look === 'delta' ? 'Delta' : 'Ranger';
  return [u.name, /Steele/.test(u.name || '') ? 'Juliet 6-4' : null, force, unit].filter(Boolean).join(' · ');
}
function say(who, text, cls, pri){
  if (!text || (MIS && MIS.id === 'attract')) return;
  if (SPK[who]) who = SPK[who];
  else if (who && !who.includes(' · ')){ const u = us.find(o => o.name === who); if (u) who = unitLabel(u); }
  if (!pri && CHAT.q.length > 6) return;
  if (pri) CHAT.q.unshift([who, text, cls]); else CHAT.q.push([who, text, cls]);
}
function updChat(rdt){
  CHAT.t -= rdt; if (CHAT.t > 0 || !CHAT.q.length) return;
  const [w, t, c] = CHAT.q.shift(); chatLine(w, t, c); CHAT.t = 1.1 + Math.min(2.6, t.length/36);
}
function clearChat(){ CHAT.q = []; CHAT.hist = []; CHAT.t = 0; renderChatLive(); if (CHAT.open) renderChatHist(); }
function renderChatHist(){
  const H = $('chatHist'); H.innerHTML = '';
  for (const [w, t, cl, ck] of CHAT.hist.slice(-80)) H.appendChild(chatEl(w, t, cl, ck));
  H.scrollTop = H.scrollHeight;
}
function toggleChat(on){ CHAT.open = on == null ? !CHAT.open : on; $('chatHist').hidden = !CHAT.open; $('chatLive').hidden = CHAT.open; $('chat').classList.toggle('open', CHAT.open); $('chatHead').setAttribute('aria-expanded', CHAT.open); if (CHAT.open) renderChatHist(); placeChat(); }
// the radio hangs just under the mission panel, whatever its height
function placeChat(){
  const ch = $('chat'), m = document.querySelector('.mission'); if (!ch) return;
  if (document.body.classList.contains('cine') || !m || !m.offsetParent){ ch.style.top = ''; return; }
  const mb = m.getBoundingClientRect().bottom, tb = document.querySelector('#top .topbtns'), r = tb && tb.getBoundingClientRect();
  ch.style.top = Math.round((r && r.top >= mb - 4 ? r.bottom : mb) + 6) + 'px'; ch.style.width = Math.max(260, Math.round(m.getBoundingClientRect().width)) + 'px';
}
function logMsg(t, cls){
  if (CINE.on) return;
  const m = /^Radio: (.*)$/.exec(t);
  if (m) say('Radio', m[1], 'bad', true);
  else chatLine(null, t, cls === 'bad' ? 'bad' : cls === 'us' ? 'us' : 'sys');
}
function radio(u, t, force){ if (!u || !t || (CINE.on && !force)) return; if (u.alive){ u.talkT = 1.8; u.talkRadio = !CINE.on; } say(u.team === 'us' ? unitLabel(u) : u.name, t, u.team === 'us' ? (u.look === 'delta' ? 'delta' : 'us') : 'bad'); }

/* ---------- buttons & keys ---------- */
function updPause(){ $('bPause').innerHTML = G.paused ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>'; $('bPause').setAttribute('aria-label', L(G.paused ? 'Reanudar' : 'Pausa')); $('bPause').title = L(G.paused ? 'Reanudar' : 'Pausa') + (LANG === 'en' ? ' (Space)' : ' (Espacio)'); $('bPause').setAttribute('aria-pressed', G.paused && G.started && !G.over); }
$('bPause').onclick = () => { if (!G.started || G.over) return; G.paused = !G.paused; updPause(); if (!G.paused) hint(''); };
$('bMap').onclick = () => openMap(true); $('bMap2').onclick = () => openMap(true);
$('mpClose').onclick = () => openMap(false);
$('mpCity').onclick = () => { mapMode = 'city'; openMap(true); };
$('mpReg').onclick = () => { mapMode = 'reg'; openMap(true); };
$('cMap').onclick = () => openMap(true);
$('bSkip').onclick = () => { if (CINE.on){ cineSkip(); return; } if (FLIGHT.mis){ let n = 0; while (FLIGHT.on && n++ < 1600) updFlight(.25); } else endFlight(); };
{ const mp = document.querySelector('.mission'), tg = () => { mp.classList.toggle('open'); mp.setAttribute('aria-expanded', mp.classList.contains('open')); placeChat(); };
  mp.addEventListener('click', tg); mp.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.stopPropagation(); tg(); } }); }
$('chatHead').onclick = () => toggleChat(); $('chatLive').onclick = () => toggleChat(true);
$('fZin').onclick = () => zoomBy(1/1.25); $('fZout').onclick = () => zoomBy(1.25);
$('fRotL').onclick = () => { if (FLIGHT.on) FLIGHT.uyaw -= Math.PI/4; else if (CINE.on) CINE.uyaw -= Math.PI/4; };
$('fRotR').onclick = () => { if (FLIGHT.on) FLIGHT.uyaw += Math.PI/4; else if (CINE.on) CINE.uyaw += Math.PI/4; };
addEventListener('keydown', e => { if (CINE.on && SCREEN == null){ const k = e.key.toLowerCase(); if (k === 'q') CINE.uyaw -= Math.PI/4; else if (k === 'e') CINE.uyaw += Math.PI/4; else if (k === '+' || k === '=') zoomBy(1/1.25); else if (k === '-') zoomBy(1.25); return; }
  if (!FLIGHT.on || FLIGHT.attract) return; const k = e.key.toLowerCase(); if (k === 'q') FLIGHT.uyaw -= Math.PI/4; else if (k === 'e') FLIGHT.uyaw += Math.PI/4; else if (k === '+' || k === '=') zoomBy(1/1.25); else if (k === '-') zoomBy(1.25); else if (k >= '1' && k <= '6') flightSelect(+k - 1); });
$('bAuto').onclick = () => { G.autoP = !G.autoP; OPT.autoP = G.autoP; saveOpt(); $('bAuto').setAttribute('aria-pressed', G.autoP); };
$('oChain').onclick = () => { setMode('move'); hint(alive().length ? 'Ruta nueva: toca el suelo punto a punto' : 'Selecciona una unidad y toca el suelo punto a punto'); };
/* formation picker: works like the support menu. The choice sticks to the men selected */
function formMenu(on){ const m = $('formMenu'); on = on == null ? m.hidden : on; m.hidden = !on; $('oForm').setAttribute('aria-expanded', on);
  if (on){ const cur = formOfSel(); for (const b of m.querySelectorAll('.fopt')) b.setAttribute('aria-pressed', !!cur && cur.type === b.dataset.f);
    const r = $('oForm').getBoundingClientRect(), w = m.offsetWidth; m.style.left = Math.round(clamp(r.left, 8, innerWidth - w - 8)) + 'px'; m.style.bottom = Math.round(innerHeight - r.top + 6) + 'px'; } }
$('oForm').onclick = e => { e.stopPropagation(); formMenu(); };
addEventListener('pointerdown', e => { if (!$('formWrap').contains(e.target)) formMenu(false); });
for (const b of document.querySelectorAll('#formMenu .fopt')) b.onclick = () => { formMenu(false); setFormation(b.dataset.f); };
function missionHour(){ return MIS && MIS.hour != null ? MIS.hour : PHASES[phaseSel].h; }
function setPhase(ph){
  phaseSel = ph;
  const hr = missionHour(); G.startHour = hr; G.startClock = Math.round(hr*3600); G.sun0 = MIS.sunHour != null ? MIS.sunHour : hr; setSun(G.sun0); updSupBtns();
}
$('bPeek').onclick = () => {
  const on = !$('overlay').classList.contains('peek');
  $('overlay').classList.toggle('peek', on); $('brief').classList.toggle('peek', on);
  $('bPeek').textContent = L(on ? 'Volver al briefing' : 'Ver escenario'); $('bPeek').setAttribute('aria-pressed', on);
};
function startMission(){
  showScreen(null); $('overlay').classList.remove('peek'); $('brief').classList.remove('peek'); $('bPeek').textContent = L('Ver escenario');
  if (MIS.flight) return irStartMission();
  G.started = true; G.paused = false; G.speed = 1; $('bSpeed').textContent = '1×'; updSupBtns();
  camS.tx = MIS.cam[0]; camS.tz = MIS.cam[1]; camS.zoomT = MIS.cam[2]; camS.yawT = -Math.PI*.75;
  if (!AC) initAudio(); else if (AC.state === 'suspended') AC.resume(); startRotorSound(); updPause();
  renderSubs(); refreshCards();
  if (MIS.intro && us[0]) radio(us[0], MIS.intro);
  for (const [w, t, c] of MIS.introSay || []){ const g = grpN(w); if (g && gLive(g)[0]) radio(gLive(g)[0], t); else say(w, t, c); }
  hint((MIS.subs[0] && MIS.subs[0].tip) || 'Selecciona y toca el suelo: la línea marca la ruta. Espacio pausa.');
  if (MIS.onStart) MIS.onStart();
}
$('bSpeed').onclick = () => { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? .5 : 1; $('bSpeed').textContent = (G.speed===.5?'½':G.speed) + '×'; };
const setSound = on => { soundOn = on; OPT.sound = on; saveOpt(); $('bSound').setAttribute('aria-pressed', !soundOn); $('bSound').innerHTML = soundOn ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>'; $('bSound').setAttribute('aria-label', L(soundOn ? 'Sonido' : 'Silencio')); if (AC && rotorGain && !on) rotorGain.gain.setTargetAtTime(0, AC.currentTime, .1); renderOpts(); };
$('bSound').onclick = () => setSound(!soundOn);
$('cRotL').onclick = () => { camS.yawT -= Math.PI/2; };
$('cRotR').onclick = () => { camS.yawT += Math.PI/2; };
$('cZin').onclick = () => zoomBy(1/1.25);
$('cZout').onclick = () => zoomBy(1.25);


function selectAll(){ G.sel = new Set(us.filter(u => u.alive && !u.npc)); refreshCards(); }
$('oMed').onclick = () => cmdTreat();
$('oAtk').onclick = () => setMode(G.mode === 'attack' ? 'move' : 'attack');
$('oSup').onclick = () => setMode(G.mode === 'suppress' ? 'move' : 'suppress');
$('oCov').onclick = () => { if (alive().length) cmdCover(); };
$('oStop').onclick = () => cmdStop();
$('oNV').onclick = () => { setNV(!G.nv); supMenu(false); };
function supMenu(on){ const m = $('supMenu'); on = on == null ? m.hidden : on; m.hidden = !on; $('oSupport').setAttribute('aria-expanded', on);
  if (on){ const r = $('oSupport').getBoundingClientRect(), w = m.offsetWidth; m.style.left = Math.round(clamp(r.right - w, 8, innerWidth - w - 8)) + 'px'; m.style.bottom = Math.round(innerHeight - r.top + 6) + 'px'; } }
$('oSupport').onclick = e => { e.stopPropagation(); supMenu(); };
addEventListener('pointerdown', e => { if (!$('supWrap').contains(e.target)) supMenu(false); });
$('oLB').onclick = () => { supMenu(false); if (!SUP || SUP.lbN <= 0){ hint('No quedan pasadas de Little Bird'); return; } setMode(G.mode === 'lb' ? 'move' : 'lb'); };
$('oFlr').onclick = () => { supMenu(false); if (nightF <= .25){ hint('Las bengalas solo están disponibles de noche'); return; } if (!SUP || SUP.flN <= 0){ hint('No quedan bengalas'); return; } setMode(G.mode === 'flare' ? 'move' : 'flare'); };
$('bStart').onclick = () => startMission();
// development build: play only the closing cinematic of the mission in the briefing
const FINALES = {
  hawl(){ const C = G.m.conv; for (const e of them) if (e.alive && e.tag !== 'rpg'){ e.alive = false; world.remove(e.m.root); dropOverlay(e); }
    C.go = false; C.s = C.limit = routeS(C, 256.5, HW_STOP[2]); convoyStep(C, 0);
    G.subsDone = [0, 1, 2]; G.sub = 3; G.subStarted = false; renderSubs(); },
  s61(){ for (const e of them) if (e.alive){ e.alive = false; world.remove(e.m.root); dropOverlay(e); }
    const C = G.m.conv; if (C){ for (const v of C.veh) world.remove(v.g); C.veh = []; }
    for (const g of G.m.routes || []) overlay.remove(g); for (const r of [G.m.rb, G.m.rg]) if (r) overlay.remove(r);
    const put = (g, P_) => gLive(g).forEach((u, i) => { const c = findWalk(P_.x + (i % 3) - 1, P_.z + (i / 3 | 0)); u.x = c[0] + .5; u.z = c[1] + .5; u.path = []; u.order = null; u.stance = 'crouch'; });
    put(grpN(D_B), S61_BX); put(grpN('Romeo 4-1'), S61_GX);
    G.subsDone = [0, 1]; G.sub = 2; G.subStarted = false; renderSubs(); s61Star(); },
};
FINALES.wolcott = () => { for (const e of them) if (e.alive){ e.alive = false; world.remove(e.m.root); dropOverlay(e); }
  w4Clear(); G.m.meds = w4MedSpecs().map((sp, k) => { const u = npcUnit(sp, W4_MED[k][0], W4_MED[k][1]); u.medSpot = W4_MED[k]; u.atWreck = true; return u; });
  W4P.forEach(p => gLive(grpN(p.g)).forEach((u, i) => { u.path = []; u.order = null; u.stance = 'crouch';
    if (p.roof){ const b = w4Bld(p); if (b){ placeInB(u, b, 'roof'); return; } }
    const c = findWalk(p.x + (i % 3) - 1, p.z + (i / 3 | 0)); u.x = c[0] + .5; u.z = c[1] + .5; }));
  G.m.medHp = 100; G.m.medEnd = true; G.subsDone = [0, 1, 2]; G.sub = 3; G.subStarted = false; renderSubs(); };
FINALES.convoy = () => { for (const e of them) if (e.alive){ e.alive = false; world.remove(e.m.root); dropOverlay(e); }
  const C = G.m.conv; cvMountAll(); C.s = C.limit = cvS(C, 1); C.go = false; convoyStep(C, 0);
  G.subsDone = [0, 1, 2, 3, 4]; G.sub = 5; G.subStarted = false; renderSubs(); };
FINALES.perim = () => { if (G.m.pmG) dropGuide(G.m.pmG); G.m.pmG = null; pmNight();
  gLive(grpN(D_B)).forEach((u, i) => { const c = findWalk(PM_BLUE[PM_BLUE.length - 2][0] - 2 + (i % 3), PM_BLUE[PM_BLUE.length - 2][1] + 1 + (i/3|0)); u.x = c[0] + .5; u.z = c[1] + .5; goTo(u, S64.x + 6, S64.z); });
  G.subsDone = [0]; G.sub = 1; G.subStarted = false; renderSubs(); };
// 8 · the mortar is down and the roofs are marked: straight to the last stand and its ending
FINALES.night = () => { for (const e of them) if (e.alive && !e.tech){ e.alive = false; world.remove(e.m.root); dropOverlay(e); }
  G.m.mDone = true; G.m.irDone = [true, true]; for (const r of G.m.zr || []) overlay.remove(r); G.m.zr = []; G.m.mzMap = null;
  G.subsDone = [0, 1]; G.sub = 2; G.subStarted = false; renderSubs(); };
// 9 · everyone at the crowd before the stadium, the column ahead of them: the walk in, the wounded, the fade
FINALES.mile = () => { for (const e of them) if (e.alive){ e.alive = false; world.remove(e.m.root); dropOverlay(e); }
  for (const S of G.m.str || []) m9StrGone(S);
  const C = G.m.C; G.m.phase = 'B'; C.go = true; C.vmax = 3.0; C.s = C.limit = routeS(C, MILE_X, 104); C.limit = C.L; convoyStep(C, 0);
  const all = us.filter(u => u.alive && !u.gone);
  all.forEach((u, k) => { if (u.inB) leaveB(u); const c = findWalk(MILE_X - 1.4 + (k % 3)*1.4, 124 + (k/3|0)*1.3); u.x = c[0] + .5; u.z = c[1] + .5; u.path = []; u.order = null; u.stance = 'stand'; u.m8in = false; });
  G.m.fol = (G.m.fol || []).concat(G.m.r41 || []); camS.tx = MILE_X; camS.tz = 118;
  G.subsDone = [0]; G.sub = 1; G.subStarted = false; renderSubs(); m9FinalCine(); };
FINALES.s64 = () => { if (!G.m.dg) return; for (const u of gLive(G.m.dg)) damage(u, 9999, null); };
function playFinale(){
  const f = FINALES[MIS.id]; if (!f) return;
  startMission(); if (CINE.on) cineSkip(); if (FLIGHT.on) return; clearChat(); sched = sched.filter(s => !s.say);
  G.autoP = false; f(); G.paused = false; updPause();
}
$('bFinale').onclick = () => playFinale();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (SCREEN === 'scrTitle'){ e.preventDefault(); leaveTitle(); return; }
  if (SCREEN === 'scrIntro'){ e.preventDefault(); stopIntro(); return; }
  if (SCREEN === 'scrPause' && k === 'escape'){ resumeGame(); return; }
  if (!G || !G.started || MIS.id === 'attract' || SCREEN) return;
  if (CINE.on){ if (k === ' '){ e.preventDefault(); $('bPause').click(); } else if (k === 'escape') pauseMenu(); return; }
  if (k === 'escape' && !(G.mode !== 'move' || !$('ctx').hidden || !$('mapPanel').hidden)){ pauseMenu(); return; }
  if (k === 'escape' && !$('mapPanel').hidden){ openMap(false); return; }
  if (k === ' '){ e.preventDefault(); $('bPause').click(); }
  else if (k === 'q') $('cRotL').click(); else if (k === 'e') $('cRotR').click();
  else if (k === 't') selectAll(); else if (k === 'h') cmdTreat();
  else if (k === 'm') $('oChain').click(); else if (k === 'g') formMenu(); else if (k === 'a') $('oAtk').click(); else if (k === 's') $('oSup').click();
  else if (k === 'c') $('oCov').click(); else if (k === 'x') cmdStop();
  else if (k === 'l') $('oLB').click(); else if (k === 'f') $('oFlr').click(); else if (k === 'v') $('oNV').click(); else if (k === 'escape'){ closeCtx(); setMode('move'); }
  else if (k === 'n') openMap($('mapPanel').hidden);
  else if (k >= '1' && k <= '9' && IRN.groups){ const g = IRN.groups[+k-1]; if (g){ const live = g.members.filter(u => u.alive); if (live.length){ G.sel = new Set(live); refreshCards(); } } }
  else if (k >= '1' && k <= '6'){ const u = us[+k-1]; if (u && u.alive){ if (e.shiftKey) G.sel.add(u); else { G.sel.clear(); G.sel.add(u); } refreshCards(); } }
  else if (k === 'arrowleft') pan(60,0); else if (k === 'arrowright') pan(-60,0); else if (k === 'arrowup') pan(0,60); else if (k === 'arrowdown') pan(0,-60);
});

