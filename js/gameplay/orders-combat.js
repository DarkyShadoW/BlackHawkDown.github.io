"use strict";
/* ---------- game state ---------- */
function newGame(){
  irReset();
  CONVOYS = []; SCRIPTED = []; convSyms = []; RPGS = []; TECHS = []; ROCKETS = []; RPG_CNT = 0; rpgCallT = -99;
  if (CINE.on){ CINE = { on:false }; document.body.classList.remove('cine'); $('bSkip').hidden = true; $('cine').hidden = true; }
  if (FLIGHT.on && FLIGHT.attract){ FLIGHT = { on:false }; FOCUS2 = null; }
  // the game state exists before the world is built: the missions' spawns write into it
  G = { t:0, started:false, paused:true, speed:1, over:false, mode:'move', sel:new Set(), roofs:false,
        kills:0, waveSpawned:false, alert:false, lastKnown:null, ghosts:new Map(), visT:0, hudT:0,
        contactT:-9, fired:0, startHour:missionHour(), startClock:Math.round(missionHour()*3600), sun0:MIS.sunHour != null ? MIS.sunHour : missionHour(), sunShift:0,
        sub:0, subStarted:false, subsDone:[], downs:0, autoP:OPT.autoP, lastAuto:-9, chain:false, noise:[], civT:15, draft:null, nv:false, nvGlare:0,
        m:{}, dt:0, endAt:null, noLose:!!MIS.noLose };
  buildWorld();
  G.sel = new Set(us.filter(u => u.alive && !u.npc));
  $('bAuto').setAttribute('aria-pressed', G.autoP);
  if ($('oNV')) $('oNV').setAttribute('aria-pressed', false);
  resetSupport();
  CRATES = [];
  camS.tx = MIS.cam[0]; camS.tz = MIS.cam[1]; camS.zoom = camS.zoomT = 13; camS.yaw = camS.yawT = -Math.PI*.75;
  camS.zoom = camS.zoomT = MIS.cam[2] || 13;
  $('log').innerHTML = ''; if (MIS.id !== 'irene') clearChat(); mapMode = 'city'; $('oChain').setAttribute('aria-pressed', false);
  $('subs').innerHTML = '';
  FORMS = []; buildCards(); setMode('move'); hint('');
}

/* ---------- commands ---------- */
const alive = () => [...G.sel].filter(u => u.alive);
function setMode(m){
  G.mode = m;
  $('oChain').setAttribute('aria-pressed', m==='move'); G.newRoute = true; $('oAtk').setAttribute('aria-pressed', m==='attack'); $('oSup').setAttribute('aria-pressed', m==='suppress');
  $('oLB').setAttribute('aria-pressed', m==='lb'); $('oFlr').setAttribute('aria-pressed', m==='flare'); $('oSupport').setAttribute('aria-pressed', m==='lb' || m==='flare');
  if (m !== 'lb' && SUP){ SUP.lbA = null; SUP.draft = null; }
  hint(m==='attack' ? 'Toca un enemigo visible' : m==='suppress' ? 'Toca una zona o un enemigo' :
    m==='lb' ? 'Little Bird: arrastra una línea por donde quieres la pasada (o toca el inicio y el final)' : m==='flare' ? 'Bengala: toca la zona que quieres iluminar' : '');
}
function cmdMove(ci, cj, append){
  let sel = alive(); if (!sel.length) return; G.newRoute = false;
  { const F = formOf(sel); if (F) return formMove(F, ci, cj, append); for (const u of sel) if (u.fg) u.fgOff = true; }   // part of a formation sent off on its own leaves it
  if (sel.some(u => u.spent)){ sel = sel.filter(u => !u.spent); hint(sel.length ? 'Los agotados se quedan a cubierto hasta recuperar el aliento' : 'Agotados: necesitan recuperar el aliento a cubierto'); if (!sel.length) return; }
  if (sel.length === 1) sel[0].soloT = G.t;
  else { const ld = sel[0]; ld.sigT = 1.3; ld.sigK = 'point'; }
  if (sel.length >= 2 && sel.length >= us.filter(u => u.alive && !u.npc).length) G.m.allMove = true;
  const cells = []; const seen = new Set(); const q = [[ci,cj]]; seen.add(idx(ci,cj));
  while (q.length && cells.length < sel.length){
    const [i,j] = q.shift(); if (walk(i,j)) cells.push([i,j]);
    for (const [dx,dy] of DIRS){ const ni=i+dx, nj=j+dy; if (!walk(ni,nj)) continue; const k = idx(ni,nj); if (seen.has(k)) continue; seen.add(k); q.push([ni,nj]); }
  }
  sel.sort((a,b) => Math.hypot(a.x-ci,a.z-cj) - Math.hypot(b.x-ci,b.z-cj));
  const solo = sel.length === 1 ? nextRouteCol() : null;   // one man on his own: his route gets its own colour
  sel.forEach((u,k) => { const c = cells[k] || cells[0]; if (!c) return;
    if (u.inB){ leaveB(u); append = false; }
    const last = append && u.path.length ? u.path[u.path.length-1] : null;
    const seg = last ? smoothPath(findPath(last[0], last[1], c[0], c[1]), last[0] + .5, last[1] + .5) : smoothPath(findPath(Math.floor(u.x),Math.floor(u.z),c[0],c[1]), u.x, u.z);
    u.chainN = last ? (u.chainN || 1) + 1 : 1;
    u.order = { type:'move', kneel: sel.length > 1 && k % 2 === 1 }; u.path = last ? u.path.concat(seg || []) : (seg || []); u.stance = 'stand'; u.routeCol = solo; });   // on arrival every other man drops to a knee at once
  moveMark.position.set(ci+.5,.06,cj+.5); moveMark.material.opacity = 1; moveMark.material.color.set(solo || 0x7fb8ff);
}
/* ---------- formations: the point man walks the route, the rest keep their places round him, turned the way he is heading.
   The group keeps its formation until it is split, sent into cover, or men drop out hurt or worn out; once they are sent off
   together again they fall back into it. Places are in map cells, x to the right of the point man and z ahead of him ---------- */
const FORM_SP = 1.55, FORM_N = { col:'Columna', wedge:'Punta de flecha', stag:'Columna escalonada', ech:'Escalón izquierda' };
let FORMS = [];
function formSlot(type, k){ const s = FORM_SP;
  if (type === 'col') return [0, -k*s];
  if (type === 'stag') return [(k % 2 ? 1 : -1)*.7*s, -k*.85*s];
  if (type === 'wedge'){ const r = Math.ceil(k/2); return [(k % 2 ? -1 : 1)*r*.95*s, -r*.95*s]; }
  return [-k*.8*s, -k*.8*s];   // echelon left: each man behind and to the left of the one before
}
const formAble = u => u.alive && !u.spent && !u.npc;
function formOf(sel){ if (sel.length < 2) return null; const F = sel[0].fg; if (!F || sel.some(u => u.fg !== F)) return null;
  return F.m.filter(formAble).every(u => sel.includes(u)) ? F : null; }
function formOfSel(){ const sel = alive(); return sel.length && sel.every(u => u.fg === sel[0].fg) ? sel[0].fg : null; }
function setFormation(type){
  const sel = alive().filter(u => !u.npc); if (sel.length < 2){ hint('Selecciona una unidad de dos o más soldados'); return; }
  for (const u of sel) if (u.fg){ u.fg.m = u.fg.m.filter(o => !sel.includes(o)); }
  FORMS = FORMS.filter(F => F.m.length > 1);
  const F = { type, m:sel.slice(), hd:null, active:false, lead:null, goal:null }; FORMS.push(F);
  for (const u of sel){ u.fg = F; u.fgOff = false; }
  updFormIco();
  hint('Formación: ' + L(FORM_N[type]) + '. La mantendrán en cada ruta que les des juntos');
  if (G.started) radio(sel[0], pick(['En ' + L(FORM_N[type]).toLowerCase() + '.', 'Formación, ' + L(FORM_N[type]).toLowerCase() + '.']));
}
// each unit keeps its own formation: it starts in a staggered column, and the button shows the one of whatever is selected
function formDefaults(groups){
  for (const g of groups){ const live = g.filter(u => !u.npc); if (live.length < 2 || live.some(u => u.fg)) continue;
    const F = { type:'stag', m:live.slice(), hd:null, active:false, lead:null, goal:null }; FORMS.push(F); for (const u of live) u.fg = F; }
}
function updFormIco(){ const F = formOfSel(), b = $('oForm'); if (!b) return;
  const o = document.querySelector('#formMenu .fopt[data-f="' + (F ? F.type : 'stag') + '"] svg'); $('oFormIco').innerHTML = o.innerHTML;
  b.classList.toggle('off', !F); const t = F ? L('Formación') + ': ' + L(FORM_N[F.type]) : L('Formación'); b.title = t; b.setAttribute('aria-label', t); }
function formLeader(F){ return F.m.find(u => formAble(u) && !u.fgOff && !u.inB) || null; }
function formHolding(F){ return F.active && F.lead && F.lead.alive && F.lead.path.length > 0; }
function formMove(F, ci, cj, append){
  const L_ = formLeader(F); if (!L_) return;
  for (const u of F.m) u.fgOff = false;
  if (L_.inB) leaveB(L_);
  const last = append && F.active && L_.path.length ? L_.path[L_.path.length - 1] : null;
  const seg = last ? smoothPath(findPath(last[0], last[1], ci, cj), last[0] + .5, last[1] + .5) : smoothPath(findPath(Math.floor(L_.x), Math.floor(L_.z), ci, cj), L_.x, L_.z);
  L_.chainN = last ? (L_.chainN || 1) + 1 : 1; L_.order = { type:'move' }; L_.path = last ? L_.path.concat(seg || []) : (seg || []); L_.stance = 'stand'; L_.routeCol = null;
  L_.sigT = 1.3; L_.sigK = 'point';
  if (!last){ const p0 = L_.path[0] || [ci, cj]; F.hd = Math.atan2(p0[0] + .5 - L_.x, p0[1] + .5 - L_.z); }
  F.active = true; F.lead = L_; F.goal = [ci + .5, cj + .5];
  let k = 0; for (const u of F.m){ if (u === L_ || !u.alive) continue; k++;
    if (u.inB) leaveB(u);
    u.chainN = L_.chainN; u.order = { type:'move', form:F, kneel:k % 2 === 1 }; u.fT = k*.05; u.fCell = null; u.stance = 'stand'; u.routeCol = null; }
  if (F.m.filter(u => u.alive).length >= us.filter(u => u.alive && !u.npc).length) G.m.allMove = true;
  moveMark.position.set(ci+.5,.06,cj+.5); moveMark.material.opacity = 1; moveMark.material.color.set(0x7fb8ff);
}
function formStep(dt){
  for (const F of FORMS){ for (const u of F.m) u.fgMul = 1; if (!F.active) continue;
    let L_ = F.lead;
    if (!L_ || !formAble(L_) || L_.fgOff){   // the point man is down or out: the next man takes the point and the rest of the route
      const N = formLeader(F); if (!N){ F.active = false; continue; }
      const rest = L_ && L_.path.length ? L_.path.slice() : null; F.lead = L_ = N;
      if (rest && rest.length){ const g = rest[rest.length - 1]; L_.path = smoothPath(findPath(Math.floor(L_.x), Math.floor(L_.z), g[0], g[1]), L_.x, L_.z); L_.order = { type:'move' }; } }
    const moving = L_.path.length > 0;
    if (moving){ const p = L_.path[Math.min(1, L_.path.length - 1)], want = Math.atan2(p[0] + .5 - L_.x, p[1] + .5 - L_.z);
      if (F.hd == null) F.hd = want; else { let d = want - F.hd; d = Math.atan2(Math.sin(d), Math.cos(d)); F.hd += d*Math.min(1, dt*2.2); } }
    const bx = moving ? L_.x : F.goal[0], bz = moving ? L_.z : F.goal[1], h = F.hd || 0, fx = Math.sin(h), fz = Math.cos(h), rx = -Math.cos(h), rz = Math.sin(h);
    const taken = new Set([idx(Math.floor(bx), Math.floor(bz))]);
    let k = 0, any = false, lag = 0;
    for (const u of F.m){ if (u === L_ || !u.alive) continue; k++;
      if (!u.order || u.order.form !== F) continue;            // given another order: out of it for now
      any = true;
      if (u.spent || u.pinned || u.inB){ continue; }             // worn out or pinned: he stays put and rejoins when he can
      { const [sx, sz] = formSlot(F.type, k), d = Math.hypot(bx + rx*sx + fx*sz - u.x, bz + rz*sx + fz*sz - u.z); lag = Math.max(lag, d); u.fgMul = d > 1.2 ? 1.25 : 1; }   // behind his place: he hurries
      u.fT -= dt; if (u.fT > 0) continue; u.fT = moving ? .45 : 9;
      const [sx, sz] = formSlot(F.type, k), tx = bx + rx*sx + fx*sz, tz = bz + rz*sx + fz*sz;
      let c = nearestFree(Math.floor(tx), Math.floor(tz));
      if (taken.has(idx(c[0], c[1]))){ for (const [dx, dz] of DIRS){ const q = [c[0] + dx, c[1] + dz]; if (walk(q[0], q[1]) && !taken.has(idx(q[0], q[1]))){ c = q; break; } } }
      taken.add(idx(c[0], c[1]));
      if (u.fCell && u.fCell[0] === c[0] && u.fCell[1] === c[1] && u.path.length) continue;
      u.fCell = c; u.path = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z) || [];
      if (!u.path.length && !moving) arrive(u); }
    if (moving) L_.fgMul = lag > 3 ? .5 : lag > 1.8 ? .75 : 1;   // the point man eases off until the rest are in their places
    if (!moving && !any) F.active = false;
  }
}
function cmdAttack(e){
  for (const u of alive()){ u.order = { type:'attack', target:e, rT:0 }; u.path = []; }
  radio(alive()[0], pick(['Fuego sobre el objetivo.','¡Abrid fuego!','Lo tengo, disparando.']));
}
function cmdSuppress(x,z){
  G.m.supUsed = true;
  for (const u of alive()){ u.order = { type:'suppress', x, z, until:G.t+12 }; u.path = []; if (u.stance==='stand') u.stance='crouch'; }
  supMark.position.set(x,.06,z); supMark.material.opacity = .9;
  radio(alive()[0], pick(['¡Fuego de supresión!','Mantened sus cabezas abajo.','Barred esa posición.']));
}
function cmdCover(){
  G.m.covUsed = true; for (const u of alive()) if (u.fg) u.fg.active = false;   // into cover: the formation breaks up until they are sent off together again
  const sel = alive(); if (sel[0]){ sel[0].sigT = 1.2; sel[0].sigK = 'down'; } const taken = new Set(units.filter(u => u.alive && u.team==='us' && !G.sel.has(u)).map(u => idx(Math.floor(u.x),Math.floor(u.z))));
  for (const u of sel){
    if (u.inB) continue;
    const thr = nearestThreat(u);
    const c = findCover(Math.floor(u.x), Math.floor(u.z), thr, 6, taken);
    if (c){ taken.add(idx(c[0],c[1])); u.path = smoothPath(findPath(Math.floor(u.x),Math.floor(u.z),c[0],c[1]), u.x, u.z); }
    else u.path = [];
    u.order = { type:'cover' }; if (!u.path.length){ u.stance = 'crouch'; }
  }
  radio(sel[0], pick(['¡A cubierto!','¡Buscad cobertura!','¡Cubríos, cubríos!']));
}
function cmdStop(){ for (const u of alive()){ u.path = []; u.order = null; if (u.fg) u.fg.active = false; } }
/* treating the wounded is the player's call: the selected men stop, the medic (or whoever is nearest) goes to each man
   down and gets him back up, then the medic patches up the walking wounded; with no medic, each man dresses his own wounds.
   The rest crouch and keep watch. It ends by itself when everyone is seen to. */
const TREAT_R = 18;
let treatN = 0;
function cmdTreat(){
  const sel = alive().filter(u => !u.npc); if (!sel.length){ hint('Selecciona primero a un pelotón'); return; }
  const id = ++treatN;
  for (const u of sel){ if (u.inB) leaveB(u); u.order = { type:'treat', id, until:G.t + 75, rT:0, pat:null }; u.path = []; if (u.stance === 'stand') u.stance = 'crouch'; }
  G.m.medUsed = true; hint('');
  const cx = sel.reduce((a, u) => a + u.x, 0)/sel.length, cz = sel.reduce((a, u) => a + u.z, 0)/sel.length;
  const nDown = us.filter(u => u.down && Math.hypot(u.x - cx, u.z - cz) < TREAT_R).length, med = sel.find(u => u.medic);
  radio(med || sel[0], nDown ? pick(['¡Sanitario! ¡Cubridnos, vamos a por los heridos!', '¡Atended a los heridos! ¡Perímetro!', '¡Vamos a por él, cubridme!'])
    : pick(['Vendaos, rápido. Ojos abiertos.', 'Revisad las heridas. Seguridad alrededor.', 'Aprovechad para atender a los heridos.']));
  $('oMed').setAttribute('aria-pressed', 'true');
}
function treatOrders(dt){
  const groups = new Map();
  for (const u of us) if (u.alive && u.order && u.order.type === 'treat'){ const k = u.order.id; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(u); }
  for (const [, g] of groups){
    const cx = g.reduce((a, u) => a + u.x, 0)/g.length, cz = g.reduce((a, u) => a + u.z, 0)/g.length;
    const downs = us.filter(u => u.down && Math.hypot(u.x - cx, u.z - cz) < TREAT_R && !(u.noReach > G.t)).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    const meds = g.filter(u => u.medic);
    const hurt = g.filter(u => u.hp < (meds.length ? 85 : 60) && !(meds.length === 1 && u === meds[0] && u.hp >= 70));
    for (const u of g) u.order.pat = null;
    // the men down first: the medic takes the nearest, the nearest free man each of the others
    const free = g.slice();
    for (const d of downs){ if (!free.length) break;
      free.sort((a, b) => (dist(a, d) - (a.medic ? 6 : 0)) - (dist(b, d) - (b.medic ? 6 : 0)));
      const c = free.shift(); c.order.pat = d; }
    // then the medic sees to the walking wounded, the nearest first
    for (const m of meds) if (!m.order.pat){ const w = hurt.filter(u => u !== m && !g.some(o => o.order.pat === u)).sort((a, b) => dist(a, m) - dist(b, m))[0]; if (w) m.order.pat = w; }
    for (const u of g){ const o = u.order, pt = o.pat;
      if (G.t > o.until){ u.order = null; continue; }
      if (pt){
        const d = dist(u, pt);
        if (d > 1.35){ o.rT -= dt;
          if ((o.rT <= 0 || !u.path.length) && !u.pinned && !u.spent){ o.rT = 1.6; const c = nearestFree(Math.floor(pt.x), Math.floor(pt.z));
            const pth = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z);
            if (pth && pth.length) { u.path = pth; u.stance = 'stand'; } else if (!pt.alive) pt.noReach = G.t + 10; } }
        else { if (u.path.length) u.path = []; u.stance = 'crouch'; u.face = Math.atan2(pt.x - u.x, pt.z - u.z); u.healing = true;
          if (pt.alive && u.medic){ pt.hp = Math.min(85, pt.hp + 7*dt); } } }
      else if (!u.moving){ if (u.path.length) u.path = [];
        if (!meds.length && u.hp < 60){ u.hp = Math.min(60, u.hp + 2.2*dt); u.healing = true; }       // field dressing on himself
        else if (u.medic && u.hp < 70){ u.hp = Math.min(85, u.hp + 3*dt); u.healing = true; } } }
    const left = downs.length + hurt.filter(u => u.alive).length;
    if (!left && g.every(u => !u.moving)){ for (const u of g) if (u.order && u.order.type === 'treat') u.order = null;
      radio(meds[0] || g[0], pick(['Heridos atendidos. Listos para movernos.', 'Todos vendados. Seguimos.', 'Heridos estabilizados.'])); }
  }
  const on = [...G.sel].some(u => u.alive && u.order && u.order.type === 'treat');
  $('oMed').setAttribute('aria-pressed', on ? 'true' : 'false');
}
/* ---------- life between orders: soldiers with nothing to do do not stand like statues.
   Each takes his own sector and sweeps it, takes a knee or gets up, the leader points, men top up a magazine,
   look over their rifle, or turn to the man beside them and talk with their hands. None of it changes what they can do in a fight. ---------- */
const IDLE_ACTS = ['kneel', 'kneel', 'point', 'reload', 'inspect', 'inspect', 'talk', 'talk', 'glance', 'glance', 'vest', 'high', 'peek', 'peek', 'shuffle', 'shuffle', 'shuffle', 'shuffle'];
function idleOK(u){
  return u.alive && !u.down && !u.gone && !u.moving && !u.path.length && !u.auto && !(u.firing > 0) && !u.reloading && !u.healing && !u.pinned && u.sup < 30
    && !u.poseName && u.pushup == null && !u.slide && !u.mounted && u.stairT == null && u.stance !== 'prone' && !u.board && u.lane == null && !u.ride && !u.noIdle
    && !(u.order && (u.order.type === 'attack' || u.order.type === 'suppress')) && !(u.inB && u.inB.level === 'ground');
}
const idleMates = (u, r) => us.filter(o => o !== u && o.idl && o.idl.on && Math.hypot(o.x - u.x, o.z - u.z) < r && (o.grp === u.grp || o.unitName === u.unitName || r < 4));
// a man goes over to another, says something, hands him something or taps his shoulder and points, and goes back to his place
function visitStep(u, I, dt){
  const V_ = I.visit, o = V_.o;
  if (CINE.on || !u.alive || u.down || u.order || u.auto || u.sup > 18 || u.inB || !o.alive || o.down || (V_.st !== 'back' && (o.moving || o.auto))){ I.visit = null; if (!u.order) u.path = []; return false; }
  V_.t += dt;
  if (V_.st === 'go'){ if (!u.path.length && !u.moving){ if (Math.hypot(o.x - u.x, o.z - u.z) > 2.2 || V_.t < .3){ I.visit = null; return false; }
      V_.st = 'talk'; V_.t = 0; V_.T = rr(2.6, 4.2); V_.kind = pick(['talk', 'talk', 'give', 'tap']);
      u.chatT = u.talkT = V_.T*.6; u.talkRadio = false; o.listenT = V_.T;
      if (o.idl){ o.idl.to = u; o.idl.lockT = G.t + V_.T; o.idl.next = Math.max(o.idl.next, V_.T + 1); }
      if (V_.kind === 'give'){ sched.push({ at:G.t + .5, fn:() => { if (u.alive && I.visit === V_){ u.giveT = 1.3; o.giveT = 1.1; } } }); }
      if (V_.kind === 'tap'){ u.tapT = .9; sched.push({ at:G.t + 1.0, fn:() => { if (u.alive && I.visit === V_){ const a = Math.atan2(o.x - u.x, o.z - u.z) + rr(-1.3, 1.3); u.sigT = 1.6; u.sigK = 'point'; V_.pA = a; o.glanceA = a; o.glanceT = 2; } } }); } }
    return true; }
  if (V_.st === 'talk'){ u.face = V_.pA != null && u.sigT > 0 ? V_.pA : Math.atan2(o.x - u.x, o.z - u.z); if (o.wall == null && !o.moving) o.face = Math.atan2(u.x - o.x, u.z - o.z);
    if (V_.t > V_.T){ V_.st = 'back'; V_.t = 0; u.path = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), V_.home[0], V_.home[1]), u.x, u.z) || []; }
    return true; }
  if (!u.path.length && !u.moving){ I.visit = null; I.next = rr(3, 7); return false; }
  return true;
}
function idleLife(u, dt){
  const I = u.idl || (u.idl = { on:false, t:0, next:rr(1.5, 4), sector:null, sw:rnd()*6.28, to:null, lockT:0 });
  if (I.visit){ I.visit = null; }
  if (I.shuf){ const q = I.shuf, dx = q.x - u.x, dz = q.z - u.z, d = Math.hypot(dx, dz);
    if (!idleOK(u) || CINE.on || d < .04 || G.t > q.until){ I.shuf = null; u.vx = u.vz = 0; }
    else { const v = Math.min(.75, d*3 + .15); u.vx = dx/d*v; u.vz = dz/d*v; } }
  if (CINE.on || !idleOK(u)){ if (I.on){ I.on = false; I.to = null; u.idleKneel = false; u.chatT = 0; } I.t = 0; I.next = Math.max(I.next, rr(1, 2.5)); return; }
  I.on = true; I.t += dt; I.next -= dt;
  // the sector: away from the middle of the men round him, or toward the threat when he is alone
  if (I.sector == null || (I.t > .8 && I.secT == null) || G.t > (I.secT || 0)){
    const M_ = idleMates(u, 6);
    if (M_.length){ const cx = (M_.reduce((a, o) => a + o.x, 0) + u.x)/(M_.length + 1), cz = (M_.reduce((a, o) => a + o.z, 0) + u.z)/(M_.length + 1);
      I.sector = Math.hypot(u.x - cx, u.z - cz) > .25 ? Math.atan2(u.x - cx, u.z - cz) : u.face + rr(-1.2, 1.2); }
    else { const th = nearestThreat(u); I.sector = Math.atan2(th.x - u.x, th.z - u.z) + rr(-.5, .5); }
    I.secT = G.t + rr(8, 15);
  }
  // facing: a slow sweep of the sector, or toward the man he is talking to, or where he points
  if (u.wall == null){
    let want = I.sector + Math.sin(I.t*.35 + I.sw)*.55 + Math.sin(I.t*.13 + I.sw*2)*.25;
    if (I.to && G.t < I.lockT && I.to.alive) want = Math.atan2(I.to.x - u.x, I.to.z - u.z);
    else if (I.pointA != null && G.t < I.lockT) want = I.pointA;
    else { I.to = null; I.pointA = null; }
    if (I.t > .6) u.face = want;
  }
  if (I.next > 0) return;
  I.next = rr(4, 9);
  const act = pick(IDLE_ACTS);
  if (act === 'kneel'){ u.idleKneel = !u.idleKneel; if (!u.idleKneel) I.next = rr(3, 6); }
  else if (act === 'point'){
    const lead = u.kit === 'radio' || u.name.includes('Sgto') || u.name.includes('Tte') || u.name.includes('Cap') || rnd() < .25; if (!lead){ I.next = 1; return; }
    I.pointA = I.sector + rr(-.9, .9); I.lockT = G.t + 2.2; u.sigT = 1.8; u.sigK = 'point';
    for (const o of idleMates(u, 7)) if (rnd() < .8){ o.glanceA = I.pointA; o.glanceT = rr(1.4, 2.2); }   // the others look where he points
  }
  else if (act === 'reload'){
    if (u.mag < u.magSize && u.ammo > u.mag){ u.reloading = true; u.reloadT = 0; reloadSnd(u); }      // topping up a magazine that is not full
    else if (u.m) u.m.fid = { k:'inspect', t:0, d:rr(2.6, 3.6), dir:rnd() < .5 ? -1 : 1 };
  }
  else if (act === 'inspect'){ if (u.m) u.m.fid = { k:'inspect', t:0, d:rr(2.6, 3.8), dir:rnd() < .5 ? -1 : 1 }; }
  else if (act === 'talk'){
    const o = idleMates(u, 3.4).filter(o => !(o.chatT > 0))[0]; if (!o){ I.next = 1.5; return; }
    const T0 = rr(2.6, 3.8); I.to = o; I.lockT = G.t + T0 + 2.6; o.idl.to = u; o.idl.lockT = G.t + T0 + 2.6; o.idl.next = Math.max(o.idl.next, T0 + 2);
    u.chatT = T0; u.talkT = T0; o.listenT = T0;
    if (rnd() < .65) sched.push({ at:G.t + T0 + .3, fn:() => { if (o.alive && o.idl && o.idl.on && o.idl.to === u){ const T1 = rr(1.6, 2.6); o.chatT = T1; o.talkT = T1; u.listenT = T1; } } });   // and the other answers
  }
  else if (act === 'glance'){ u.glanceA = u.face + (rnd() < .5 ? -1 : 1)*rr(1.1, 1.7); u.glanceT = rr(1.3, 2.2); }
  else if (act === 'vest' || act === 'high'){ if (u.m) u.m.fid = { k:act, t:0, d:act === 'vest' ? rr(2.4, 3.4) : rr(2, 3.2), dir:1 }; }
  else if (act === 'peek'){
    // against a wall with its corner a step away: lean out and look round it
    if (u.wall == null){ I.next = 1; return; }
    const f = u.wall, fx_ = Math.sin(f), fz_ = Math.cos(f), i = Math.floor(u.x), j = Math.floor(u.z); let side = 0;
    for (const sd of rnd() < .5 ? [1, -1] : [-1, 1]){ const li = i + Math.round(Math.cos(f)*sd), lj = j + Math.round(-Math.sin(f)*sd);
      if (walk(li, lj) && bAt(li - Math.round(fx_), lj - Math.round(fz_)) < 0){ side = sd; break; } }
    if (!side){ I.next = 1.5; return; }
    u.peekS = side; u.peekT = rr(1.8, 3); I.next = Math.max(I.next, u.peekT + 2);
  }
  else if (act === 'shuffle'){
    if (u.wall != null || u.stance === 'prone'){ I.next = 1; return; }
    if (I.home == null || Math.hypot(I.home[0] - u.x, I.home[1] - u.z) > 1.2) I.home = [u.x, u.z];
    for (let n=0;n<6;n++){ const a = rnd()*6.283, r = rr(.3, .55); let x = I.home[0] + Math.cos(a)*r, z = I.home[1] + Math.sin(a)*r;
      if (Math.hypot(x - u.x, z - u.z) < .2){ x = I.home[0]; z = I.home[1]; }
      if (!walk(Math.floor(x), Math.floor(z))) continue;
      if (units.some(o => o !== u && o.alive && Math.hypot(o.x - x, o.z - z) < .6)) continue;
      u.idleKneel = false; I.shuf = { x, z, until:G.t + 2.5 }; I.next = Math.max(I.next, rr(2.5, 5)); return; }
    I.next = 1.5; }
  else if (act === 'visit'){
    if (u.wall != null && rnd() < .5){ I.next = 1.5; return; }
    if (G.noise.some(n => G.t - n.t < 12 && Math.hypot(n.x - u.x, n.z - u.z) < 22) || them.some(e => e.alive && e.spotted && Math.hypot(e.x - u.x, e.z - u.z) < 26)){ I.next = 2; return; }
    const o = idleMates(u, 5.5).filter(o => !(o.chatT > 0) && !o.idl.visit && Math.hypot(o.x - u.x, o.z - u.z) > 1.6 && !us.some(q => q.idl && q.idl.visit && q.idl.visit.o === o))[0]; if (!o){ I.next = 1.5; return; }
    let best = null, bd = 1e9; for (const [dx, dz] of DIRS){ const ci = Math.floor(o.x) + dx, cj = Math.floor(o.z) + dz; if (!walk(ci, cj) || units.some(q => q.alive && Math.floor(q.x) === ci && Math.floor(q.z) === cj)) continue; const d = Math.hypot(ci + .5 - u.x, cj + .5 - u.z); if (d < bd){ bd = d; best = [ci, cj]; } }
    if (!best || bd < .8){ I.next = 1.5; return; }
    PF.noVault = true; const pth = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), best[0], best[1]), u.x, u.z); PF.noVault = false;
    if (!pth || !pth.length || pth.length > 9){ I.next = 1.5; return; }
    I.visit = { o, home:[Math.floor(u.x), Math.floor(u.z)], st:'go', t:0 }; u.idleKneel = false; u.path = pth; u.stance = 'stand';
  }
}
/* ---------- the militia are not statues either. Out of a fight they talk among themselves, point down the street, squat and stand;
   in one, a man with a wall or a corner to use ducks behind it between bursts and leans out to shoot. ---------- */
function foeLife(e, dt){
  if (e.rpg || e.dummy || e.tech || e.kind === 'tech') return;
  const L_ = e.fl || (e.fl = { next:rr(2, 8), pop:rr(1, 2.5), out:true, protT:0, prot:false, side:rnd() < .5 ? 1 : -1 });
  if (e.auto && e.auto.alive && !e.moving && !e.pinned){
    if (G.t > L_.protT){ L_.protT = G.t + 1.2; const i = Math.floor(e.x), j = Math.floor(e.z);
      L_.prot = coverProt(e, e.auto.x, e.auto.z).v > .3 || [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dz]) => bAt(i + dx, j + dz) >= 0);
      const f = Math.atan2(e.auto.x - e.x, e.auto.z - e.z), lf_ = walk(i + Math.round(Math.cos(f)), j + Math.round(-Math.sin(f))), rt = walk(i - Math.round(Math.cos(f)), j - Math.round(-Math.sin(f)));
      L_.side = lf_ && !rt ? 1 : rt && !lf_ ? -1 : L_.side; }
    L_.pop -= dt; if (L_.pop <= 0){ L_.out = !L_.out; L_.pop = L_.out ? rr(1.6, 3.4) : rr(.8, 2); }
    e.hide = !L_.out && L_.prot;
    if (e.hide){ e.cool = Math.max(e.cool, .3); if (e.stance === 'stand') e.stance = 'crouch'; }
    else if (L_.prot){ e.peekS = L_.side; e.peekT = .35; }
    return; }
  e.hide = false;
  if (e.moving || e.pinned || e.sup > 15 || e.auto || !e.alive) return;
  L_.next -= dt; if (L_.next > 0) return; L_.next = rr(4, 11);
  const o = them.find(o => o !== e && o.alive && !o.moving && !o.auto && !o.rpg && Math.abs(o.x - e.x) < 3.4 && Math.abs(o.z - e.z) < 3.4), r = rnd();
  if (o && r < .5){ const T0 = rr(2.2, 3.6), f0 = e.face, g0 = o.face; e.face = Math.atan2(o.x - e.x, o.z - e.z); o.face = Math.atan2(e.x - o.x, e.z - o.z);
    e.chatT = e.talkT = T0; e.talkRadio = false; o.listenT = T0; if (o.fl) o.fl.next = Math.max(o.fl.next, T0 + 1.5);
    sched.push({ at:G.t + T0 + .2, fn:() => { if (o.alive && !o.auto && !o.moving && rnd() < .7){ const T1 = rr(1.4, 2.4); o.chatT = o.talkT = T1; o.talkRadio = false; e.listenT = T1; } } });
    sched.push({ at:G.t + T0 + 2.8, fn:() => { if (e.alive && !e.auto && !e.moving) e.face = f0; if (o.alive && !o.auto && !o.moving) o.face = g0; } }); }
  else if (r < .72){ e.sigT = 1.7; e.sigK = 'point'; if (o){ o.glanceA = e.face; o.glanceT = 2; } }
  else if (r < .88){ if (e.kind !== 'post') e.stance = e.stance === 'crouch' ? 'stand' : 'crouch'; }
  else { e.glanceA = e.face + (rnd() < .5 ? -1 : 1)*rr(1.1, 1.6); e.glanceT = rr(1.4, 2.2); }
}
function nearestThreat(u){
  let best = null, bd = 1e9;
  for (const e of them){ if (!e.alive) continue; let p = null;
    if (e.spotted) p = e; else { const g = G.ghosts.get(e); if (g && G.t - g.t < 15) p = g; }
    if (p){ const d = Math.hypot(p.x-u.x, p.z-u.z); if (d < bd){ bd = d; best = { x:p.x, z:p.z }; } } }
  return best || (MIS.threat ? MIS.threat() : { x:u.x + 10, z:u.z });
}

/* ---------- combat ---------- */
function fireAt(s, t){
  addNoise(s.x, s.z, 24);
  const d = dist(s,t); s.mag -= s.burst; s.cool = s.cool0 * (0.8 + rnd()*0.5) * (s.fat != null ? 1.6 - .6*s.fat/100 : 1);
  if (!s.moving) s.face = Math.atan2(t.x - s.x, t.z - s.z); s.firing = .6;
  let p = s.acc * (s.team==='us' ? 1.15 * (.55 + .45*clamp(s.hp/s.hp0, 0, 1)) : 1) * clamp(1 - d/RANGE*0.65, .25, 1) * (1 - s.sup/100*.6) * (s.fat != null ? .55 + .45*s.fat/100 : 1);
  p *= t.stance==='prone' ? .55 : t.stance==='crouch' ? .8 : 1; if (t.hide) p *= .55;
  const pr = coverProt(t, s.x, s.z);
  // running in the open is dangerous: a soldier on the move with nothing between him and the shooter is easier to hit and to pin down
  const exposed = t.team === 'us' && t.path.length > 0 && !t.inB && pr.v < .3;
  if (t.path.length) p *= exposed ? 1.3 : .8;
  t.sup = Math.min(100, t.sup + s.supp*(1 - pr.v*.7)*(t.supRes || 1)*(exposed ? 1.45 : 1));
  for (const o of (t.team==='us'?us:them)) if (o !== t && o.alive && dist(o,t) < 1.8) o.sup = Math.min(100, o.sup + s.supp*.4);
  if (t.team === 'them'){ G.alert = true; G.lastKnown = { x:s.x, z:s.z }; }
  let ix, iy, iz, hit = null;
  if (rnd() < p){
    if (t.inB && rnd() < pr.v){ const wp = wallPoint(t, s); ix = wp[0]; iy = wp[1]; iz = wp[2]; }
    else if (rnd() < pr.v && pr.cell >= 0){ ix = kI(pr.cell) + .5; iz = kJ(pr.cell) + .5; iy = .45; hit = { cover: cov[pr.cell] }; }
    else { ix = t.x; iy = .75; iz = t.z; hit = { unit:t }; }
  } else { ix = t.x + (rnd()-.5)*1.4; iy = .1 + rnd()*1.1; iz = t.z + (rnd()-.5)*1.4; }
  burstFx(s, ix, iy, iz, !!(hit && hit.unit));
  if (!(hit && hit.unit) && rnd() < .8){ t.flinchT = Math.max(t.flinchT || 0, rr(.35, .55)); for (const o of (t.team==='us'?us:them)) if (o !== t && o.alive && rnd() < .5 && dist(o,t) < 2) o.flinchT = Math.max(o.flinchT || 0, rr(.3, .5)); }
  if (hit) sched.push({ at:G.t + .12, fn:() => {
    if (hit.unit && hit.unit.alive && !(s.god && hit.unit.xfire)) damage(hit.unit, s.team==='us' ? 32 + rnd()*36 : 18 + rnd()*24, s);
    if (hit.cover && hit.cover.kind === 'barrel' && cov[hit.cover.cells[0]] === hit.cover) breakBarrel(hit.cover);
  }});
}
function fireSuppress(s, x, z){
  addNoise(s.x, s.z, 24);
  s.mag -= s.burst; s.cool = s.cool0 * .45 * (0.8 + rnd()*.4) * (s.fat != null ? 1.6 - .6*s.fat/100 : 1); s.firing = .6;
  if (!s.moving) s.face = Math.atan2(x - s.x, z - s.z);
  const foes = s.team==='us' ? them : us;
  for (const e of foes){ if (!e.alive) continue; const d = Math.hypot(e.x-x, e.z-z); if (d > 2.6) continue;
    const pr = coverProt(e, s.x, s.z); e.sup = Math.min(100, e.sup + s.supp*1.15*(1 - pr.v*.35));
    if (e.team==='them'){ G.alert = true; G.lastKnown = { x:s.x, z:s.z }; }
    if (rnd() < .05*(1 - pr.v)) sched.push({ at:G.t+.12, fn:() => { if (e.alive) damage(e, 30 + rnd()*30, s); } }); }
  burstFx(s, x + (rnd()-.5)*2.4, .1 + rnd()*.9, z + (rnd()-.5)*2.4);
}
function bleed(u, src, n){
  const dx = src ? u.x - src.x : rr(-1,1), dz = src ? u.z - src.z : rr(-1,1), L = Math.hypot(dx,dz) || 1;
  for (let k=0;k<n;k++) spawnP(u.x + rr(-.1,.1), rr(.5,.95), u.z + rr(-.1,.1), dx/L*rr(.6,2.2) + rr(-.5,.5), rr(.2,1.4), dz/L*rr(.6,2.2) + rr(-.5,.5), rr(.6,1.1), rr(.05,.09), .05, 0xb01810, 0x6a0c08, 1, 0, 9);
  if (rnd() < .6) bloodDecal(u.x + dx/L*rr(.3,.9), u.z + dz/L*rr(.3,.9), rr(.12,.25), 1.2);
}
const bloodMats = [0x6a0d0a, 0x58100c, 0x7a120c].map(c => new T.MeshPhongMaterial({ color:c, specular:0x220000, shininess:30, polygonOffset:true, polygonOffsetFactor:-2 }));
function bloodDecal(x, z, r, grow){
  const n = 9, pts = [];
  for (let k=0;k<n;k++){ const a = k/n*Math.PI*2, rr_ = r*(.65 + rnd()*.5); pts.push(new T.Vector2(Math.cos(a)*rr_, Math.sin(a)*rr_)); }
  const m = new T.Mesh(new T.ShapeGeometry(new T.Shape(pts)), pick(bloodMats));
  m.rotation.x = -Math.PI/2; m.rotation.z = rnd()*6; m.position.set(x, .02 + rnd()*.004, z); m.receiveShadow = true; world.add(m);
  m.scale.setScalar(.15); fx.push({ type:'grow', obj:m, t:0, life:grow, keep:true });
}
function damage(u, dmg, src){
  if (u.medevac){ if (G.m.medHp != null && !G.m.medEnd) w4MedHit(u, dmg, src); return; }
  if (u.dummy){ puff(u.x, .9, u.z, 0xe8e2d0, 2); if (!G.m.live || !u.alive) return; u.hp -= dmg; if (u.hp > 0) return;
    u.hp = 0; u.alive = false; u.deathT = G.t; G.kills++; sfx('hit', u.x, u.z); radio(src && src.team === 'us' ? src : null, pick(['¡Diana abajo!', '¡Blanco!', 'Diana tumbada.'])); return; }
  if (u.god){ bleed(u, src, 2); u.sup = Math.min(70, u.sup + 15); return; }   // mission 8: the men pinned in the plaza cannot fall
  if ((MIS.id === 'attract' || CINE.on) && u.team === 'us'){ bleed(u, src, 3); u.hp = Math.max(50, u.hp - dmg*.3); u.sup = Math.min(100, u.sup + 25); return; }
  bleed(u, src, 8); if (u.m){ u.m.hit = 1; u.m.hitSide = rnd() < .5 ? -1 : 1; }
  u.hp -= dmg; u.sup = Math.min(100, u.sup + 25);
  if (u.hp > 0){ if (u.team==='us') logMsg(`${u.name} herido`, 'bad'); return; }
  u.hp = 0; u.alive = false; u.path = []; u.order = null; G.sel.delete(u); u.reloading = false;
  u.deathT = G.t; u.deadDir = rnd() < .55 ? -1 : 1; u.deadVar = rnd() < .4 ? 2 : 1; u.deadTwist = u.deadVar === 2 ? (rnd() < .5 ? -1.35 : 1.35) : rr(-.6,.6); u.vx = u.vz = 0;
  bleed(u, src, 14); sched.push({ at:G.t+.9, fn:() => bloodDecal(u.x + Math.sin(u.face)*.3*u.deadDir, u.z + Math.cos(u.face)*.3*u.deadDir, rr(.38,.55), 5) });
  if (u.team === 'them'){ G.kills++; if (rnd()<.6) radio(src && src.team==='us' ? src : null, pick(['¡Abatido!','Uno menos.','¡Le di!','Objetivo caído.'])); }
  else { if (u.inB) leaveB(u); u.down = true; u.reviveT = 0; u.deadDir = -1; u.deadTwist = rr(-.3,.3); G.downs++; logMsg(`¡Hombre caído! ${u.name}`, 'bad'); if (!u.npc) hint('Hombre caído: selecciona su pelotón y pulsa Atender heridos (+)'); autoPause('hombre caído'); }
}
function breakBarrel(o){
  destroyCover(o);
  const x = o.i + .5, z = o.j + .5;
  if (!o.fuel){ puff(x,.4,z,0x3a5a7a,6); return; }
  explosion(x, z);
}
function explosion(x, z){
  boom(x, z); sfx('boom', x, z); addNoise(x, z, 40);
  emitters.push({ x, z, y:.5, rate:50, life:7, vy:1.3, s0:.28, s1:1.4, fire:.7, acc:0, sp:.5, until:G.t+25 });
  for (const u of units){ if (!u.alive) continue; const d = Math.hypot(u.x-x, u.z-z); if (d > 2.4) continue;
    u.sup = 100; damage(u, 75*(1 - d/2.4) + 15, null); }
  for (let j=Math.floor(z)-3;j<=Math.floor(z)+3;j++) for (let i=Math.floor(x)-3;i<=Math.floor(x)+3;i++){ if (!inB(i,j)) continue; const k = idx(i,j); const o = cov[k]; if (o && o.kind==='barrel' && Math.hypot(o.i+.5-x, o.j+.5-z) < 2.2){ const oo = o; sched.push({ at:G.t+.35, fn:() => { if (cov[oo.cells[0]]===oo) breakBarrel(oo); } }); } }
}

/* ---------- bullet impacts: ray tests against the world, debris, holes ---------- */
let HG = null, hgStamp = 0, trickles = [];
const RH = { ax:0, sg:1 };
const _hv = new T.Vector3(), _hd = new T.Vector3();
function buildHitGrid(){
  HG = []; for (let k=0;k<W*H;k++) HG.push([]);
  const add = e => {
    e.r = .5*Math.hypot(e.sx, e.sy, e.sz); e.st = 0;
    if (e.rx || e.ry || e.rz){ _e.set(e.rx, e.ry, e.rz, e.ord); e.q = new T.Quaternion().setFromEuler(_e); e.qi = e.q.clone().invert(); }
    const i0 = Math.max(ORX, Math.floor(e.x - e.r)), i1 = Math.min(ORX+W-1, Math.floor(e.x + e.r)), j0 = Math.max(ORZ, Math.floor(e.z - e.r)), j1 = Math.min(ORZ+H-1, Math.floor(e.z + e.r));
    for (let j=j0;j<=j1;j++) for (let i=i0;i<=i1;i++) HG[idx(i,j)].push(e);
  };
  for (const e of BX) add(e); for (const e of AW) add(e); for (const e of CY) add(e);
}
function rayEntry(e, ox,oy,oz, dx,dy,dz, tMax){
  if (e.gone) return -1;
  const px = e.x-ox, py = e.y-oy, pz = e.z-oz, tc = px*dx + py*dy + pz*dz;
  if (tc + e.r < 0 || tc - e.r > tMax) return -1;
  if (px*px + py*py + pz*pz - tc*tc > e.r*e.r) return -1;
  if (G && G.roofs && e.b >= 0 && (e.roof || e.y - e.sy/2 >= CUT)) return -1;
  _hv.set(-px, -py, -pz); _hd.set(dx, dy, dz);
  if (e.qi){ _hv.applyQuaternion(e.qi); _hd.applyQuaternion(e.qi); }
  let t0 = -1e9, t1 = 1e9, ax = 0, sg = 1;
  for (let a=0;a<3;a++){
    const o = a===0 ? _hv.x : a===1 ? _hv.y : _hv.z, d = a===0 ? _hd.x : a===1 ? _hd.y : _hd.z, h = (a===0 ? e.sx : a===1 ? e.sy : e.sz) / 2;
    if (Math.abs(d) < 1e-9){ if (Math.abs(o) > h) return -1; continue; }
    let ta = (-h - o) / d, tb = (h - o) / d;
    if (ta > tb){ const t = ta; ta = tb; tb = t; }
    if (ta > t0){ t0 = ta; ax = a; sg = d > 0 ? -1 : 1; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  if (t0 < 0 || t0 > tMax) return -1;
  RH.ax = ax; RH.sg = sg; return t0;
}
function groundCol(x, z){ const i = Math.floor(x), j = Math.floor(z); return isStreet(i,j) ? 0xcdb892 : inR(PLAZA,i,j) ? 0xd6cab0 : 0xbfa784; }
// first thing a bullet from o toward t meets (continuing `extra` units past t); null if nothing
function traceShot(ox,oy,oz, tx,ty,tz, extra){
  let dx = tx-ox, dy = ty-oy, dz = tz-oz; const L = Math.hypot(dx,dy,dz) || 1; dx /= L; dy /= L; dz /= L;
  const st = ++hgStamp, T0 = .9;
  let best = L + extra, be = null, bax = 0, bsg = 1;
  if (dy < -1e-6){ const tg = -oy/dy; if (tg > T0 && tg < best){ best = tg; be = 'ground'; } }
  for (let t = 0; t <= best + .5; t += .4){
    const i = Math.floor(ox + dx*t), j = Math.floor(oz + dz*t); if (!inB(i,j)) continue;
    const k = idx(i,j), list = HG[k] || [];
    for (let n=0;n<list.length;n++){ const e = list[n]; if (e.st === st) continue; e.st = st;
      const th = rayEntry(e, ox,oy,oz, dx,dy,dz, best); if (th > T0 && th < best){ best = th; be = e; bax = RH.ax; bsg = RH.sg; } }
    const o = cov[k];
    if (o && o.hb && o.hb.st !== st){ o.hb.st = st; const th = rayEntry(o.hb, ox,oy,oz, dx,dy,dz, best); if (th > T0 && th < best){ best = th; be = o.hb; bax = RH.ax; bsg = RH.sg; } }
  }
  if (!be) return null;
  const x = ox + dx*best, y = oy + dy*best, z = oz + dz*best;
  if (be === 'ground') return { x, y:0, z, nx:0, ny:1, nz:0, m:-1, c:groundCol(x,z), e:null, dx, dy, dz };
  _hv.set(0,0,0); _hv.setComponent(bax, bsg); if (be.q) _hv.applyQuaternion(be.q);
  return { x, y, z, nx:_hv.x, ny:_hv.y, nz:_hv.z, m:be.m, c:be.c, e:be, dx, dy, dz };
}

/* debris chunks: small boxes that fly, bounce, settle and fade */
const CHN = 1200; let chunkMesh = null, CH = [], chHead = 0;
function initChunks(){
  chunkMesh = new T.InstancedMesh(UBOX, new T.MeshPhongMaterial({ color:0xffffff, specular:0x000000, shininess:1 }), CHN);
  chunkMesh.frustumCulled = false; chunkMesh.castShadow = gfxQ().dsh; chunkMesh.receiveShadow = true;
  chunkMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  CH = []; chHead = 0; dummy.position.set(0,-50,0); dummy.rotation.set(0,0,0); dummy.scale.set(0,0,0); dummy.updateMatrix();
  for (let k=0;k<CHN;k++){ CH.push({ on:false }); chunkMesh.setMatrixAt(k, dummy.matrix); chunkMesh.setColorAt(k, tmpCol.setHex(0xffffff)); }
  world.add(chunkMesh);
}
function spawnChunk(x,y,z,vx,vy,vz,s,col,shape){
  const k = chHead; chHead = (chHead+1) % CHN; const c = CH[k];
  const lng = shape === 'splinter', flat = shape === 'flake';
  Object.assign(c, { on:true, x,y,z,vx,vy,vz, rx:rnd()*6, ry:rnd()*6, rz:rnd()*6, wx:rr(-16,16), wy:rr(-16,16), wz:rr(-16,16),
    sx:s*(lng ? .3 : rr(.6,1.2)), sy:s*(flat ? .22 : lng ? .3 : rr(.5,1)), sz:s*(lng ? rr(2.2,3.4) : rr(.6,1.2)), t:0, life:rr(8,12), rest:false, brass:false, col });
  chunkMesh.setColorAt(k, tmpCol.setHex(col)); chunkMesh.instanceColor.needsUpdate = true;
  return c;
}
function floorAt(x, z, y){
  const i = Math.floor(x), j = Math.floor(z); if (!inB(i,j)) return 0;
  const h = topH[idx(i,j)]; if (h <= 0) return 0;
  return y >= h - .12 ? h : -1;
}
function updChunks(dt){
  if (!chunkMesh) return; let any = false;
  for (let k=0;k<CHN;k++){
    const c = CH[k]; if (!c.on) continue; any = true; c.t += dt;
    const bot = c.sy * .5;
    if (!c.rest){
      c.vy -= 9*dt;
      const nx = c.x + c.vx*dt, nz = c.z + c.vz*dt;
      if (floorAt(nx, nz, c.y - bot) < 0){ c.vx *= -.3; c.vz *= -.3; } else { c.x = nx; c.z = nz; }
      c.y += c.vy*dt;
      const fl = Math.max(0, floorAt(c.x, c.z, c.y - bot + .1));
      if (c.y - bot < fl){
        c.y = fl + bot;
        if (Math.abs(c.vy) < 1.1){ c.vy = 0; c.vx *= .55; c.vz *= .55; c.wx *= .5; c.wy *= .5; c.wz *= .5;
          if (Math.hypot(c.vx, c.vz) < .2){ c.rest = true; c.rx = Math.round(c.rx/1.5708)*1.5708; c.rz = Math.round(c.rz/1.5708)*1.5708; c.life = Math.max(c.life, c.t + 18);
            if (!c.brass && RUB){ addRubble(c); c.on = false; chunkMesh.setMatrixAt(k, ZERO_M); continue; }
            if (c.brass){ addCasing(c.x, c.y, c.z, c.ry, c.sx, c.sz, c.col); impSnd('brass', c.x, c.z); c.on = false; dummy.position.set(0,-50,0); dummy.scale.set(0,0,0); dummy.rotation.set(0,0,0); dummy.updateMatrix(); chunkMesh.setMatrixAt(k, dummy.matrix); continue; } } }
        else { c.vy *= -.3; c.vx *= .6; c.vz *= .6; c.wx *= .6; c.wy *= .6; c.wz *= .6; }
      }
      c.rx += c.wx*dt; c.ry += c.wy*dt; c.rz += c.wz*dt;
    }
    if (c.t >= c.life){ c.on = false; dummy.position.set(0,-50,0); dummy.scale.set(0,0,0); dummy.rotation.set(0,0,0); }
    else { const f = c.t > c.life - 1.5 ? (c.life - c.t)/1.5 : 1; dummy.position.set(c.x, c.y - bot*(1-f), c.z); dummy.rotation.set(c.rx, c.ry, c.rz); dummy.scale.set(c.sx*f, c.sy*f, c.sz*f); }
    dummy.updateMatrix(); chunkMesh.setMatrixAt(k, dummy.matrix);
  }
  if (any) chunkMesh.instanceMatrix.needsUpdate = true;
}

/* bullet holes: instanced pixel-art decals laid on the surface that was hit */
const DECN = 900; let decMesh = null, decHead = 0, DEC = [];
const ZERO_M = new T.Matrix4().makeScale(0,0,0);
const HOLE_TEX = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), img = x.createImageData(16,16), D = img.data;
  let sd = 77; const r = () => { sd = (sd * 1103515245 + 12345) >>> 0; return sd / 4294967296; };
  for (let j=0;j<16;j++) for (let i=0;i<16;i++){
    const a = Math.atan2(j-7.5, i-7.5), d = Math.hypot(i-7.5, j-7.5), w = .9*Math.sin(a*3 + 1) + .6*Math.sin(a*5 + 2), p = (j*16+i)*4;
    let v = -1;
    if (d < 1.9 + w*.3) v = 30; else if (d < 3.6 + w) v = 200 + r()*55; else if (d < 6.2 && r() < .22) v = 225;
    if (v >= 0){ D[p] = D[p+1] = D[p+2] = v; D[p+3] = 255; }
  }
  x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; return t;
})();
function initDecals(){
  decMesh = new T.InstancedMesh(new T.PlaneGeometry(1,1), new T.MeshLambertMaterial({ map:HOLE_TEX, alphaTest:.5, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4 }), DECN);
  decMesh.frustumCulled = false; decMesh.receiveShadow = true; decMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  DEC = []; decHead = 0;
  for (let k=0;k<DECN;k++){ decMesh.setMatrixAt(k, ZERO_M); decMesh.setColorAt(k, tmpCol.setHex(0xffffff)); }
  world.add(decMesh);
}
function decal(h, tint, s){
  const k = decHead; decHead = (decHead+1) % DECN;
  dummy.position.set(h.x + h.nx*.012, h.y + h.ny*.012, h.z + h.nz*.012);
  dummy.scale.set(1,1,1); dummy.rotation.set(0,0,0);
  dummy.lookAt(h.x + h.nx, h.y + h.ny, h.z + h.nz); dummy.rotateZ(rnd()*6.28); dummy.scale.set(s, s, s); dummy.updateMatrix();
  DEC[k] = { m:dummy.matrix.clone(), cut: !!(h.e && h.e.b >= 0 && (h.e.roof || h.y > CUT)), ent:h.e };
  decMesh.setMatrixAt(k, G.roofs && DEC[k].cut ? ZERO_M : DEC[k].m); decMesh.instanceMatrix.needsUpdate = true;
  decMesh.setColorAt(k, tmpCol.setHex(tint)); decMesh.instanceColor.needsUpdate = true;
}
// spent brass on the ground: a ring of instances that keeps the last ones fired; glints in the light
const CASN = 1800; let casMesh = null, casHead = 0, CAS = [];
// soot: explosions blacken the ground and the walls round them
const SCN = 64; let scMesh = null, scHead = 0, SCS = [];
const SOOT_TEX = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), img = x.createImageData(64, 64), D = img.data;
  let sd = 1993; const r = () => { sd = (sd * 1103515245 + 12345) >>> 0; return sd / 4294967296; };
  const lobes = [0, 1, 2, 3, 4, 5, 6].map(() => [r()*6.28, .55 + r()*.45]);
  for (let j=0;j<64;j++) for (let i=0;i<64;i++){
    const dx = (i - 31.5)/31.5, dz = (j - 31.5)/31.5, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    let edge = .8; lobes.forEach(([la, lr], q) => { edge += .07*lr*Math.cos(a*(2 + q % 4) - la); });
    // crisp pixel-art soot: a ragged black blot, browner toward the edge, flecks thrown beyond it
    const k = 1 - Math.min(1, Math.max(0, (d - edge*.45)/(edge*.55))), p = (j*64 + i)*4, on = k > .14 + r()*.26 || (d < 1 && r() < .05);
    const v = 8 + (1 - k)*34 + r()*12; D[p] = v*1.12; D[p+1] = v*.98; D[p+2] = v*.85; D[p+3] = on ? 255 : 0;
  }
  x.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter; return t;
})();
function initMarks(){
  dummy.position.set(0,-50,0); dummy.rotation.set(0,0,0); dummy.scale.set(0,0,0); dummy.updateMatrix();
  casMesh = new T.InstancedMesh(UBOX, new T.MeshPhongMaterial({ color:0xffffff, specular:0x2e2818, shininess:24 }), CASN);
  casMesh.frustumCulled = false; casMesh.receiveShadow = true; casMesh.instanceMatrix.setUsage(T.DynamicDrawUsage); CAS = []; casHead = 0;
  for (let k=0;k<CASN;k++){ casMesh.setMatrixAt(k, dummy.matrix); casMesh.setColorAt(k, tmpCol.setHex(0x8e7c52)); }
  world.add(casMesh);
  scMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshLambertMaterial({ map:SOOT_TEX, alphaTest:.5, polygonOffset:true, polygonOffsetFactor:-6, polygonOffsetUnits:-6 }), SCN);
  scMesh.frustumCulled = false; scMesh.instanceMatrix.setUsage(T.DynamicDrawUsage); SCS = []; scHead = 0;
  for (let k=0;k<SCN;k++){ scMesh.setMatrixAt(k, dummy.matrix); scMesh.setColorAt(k, tmpCol.setHex(0xffffff)); }
  world.add(scMesh);
  initTraces();
}
/* ---------- what a fight leaves behind. Walls keep count of the rounds that hit each stretch: first a crack, then the plaster
   comes away and shows the brick, then a wide breach with a heap of rubble at its foot; a hit near an edge bites a piece out of the
   corner. Low walls, crate stacks and stalls come down for good once they have taken enough. Debris stays where it lands. Boots
   and tyres mark the sand, and the marks fade as the wind fills them. ---------- */
const MARKL = []; let CRACKS = null, PATCHES = null, RUB = null, RUBS = [], rubHead = 0, CHIPS = null, CHIPL = [], chipHead = 0, WDMG = new Map(), WID = 0, FPL = null, TKL = null, TRT = 0;
const RUBN = 2600, CHIPN = 420; let TKH = new Map();
const CRACK_TEX = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); let sd = 4107; const r = () => { sd = (sd * 1103515245 + 12345) >>> 0; return sd / 4294967296; };
  x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineCap = 'round';
  for (let b=0;b<6;b++){ let a = b/6*6.283 + r()*.7, px = 32, py = 32, w = 2.6; const n = 5 + (r()*4 | 0);
    for (let q=0;q<n;q++){ const L = 3.5 + r()*4; a += (r() - .5)*1.1; const ex = px + Math.cos(a)*L, ey = py + Math.sin(a)*L; x.lineWidth = Math.max(1, w); x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke(); px = ex; py = ey; w *= .82;
      if (r() < .3){ let ba = a + (r() < .5 ? 1 : -1)*(.6 + r()*.5), bx = px, by = py; for (let k=0;k<3;k++){ const l2 = 2.5 + r()*3, fx_ = bx + Math.cos(ba)*l2, fy = by + Math.sin(ba)*l2; x.lineWidth = 1; x.beginPath(); x.moveTo(bx, by); x.lineTo(fx_, fy); x.stroke(); bx = fx_; by = fy; ba += (r() - .5)*.8; } } } }
  x.beginPath(); x.arc(32, 32, 3, 0, 7); x.fill();
  const img = x.getImageData(0, 0, 64, 64), D = img.data; for (let k=0;k<D.length;k+=4){ const on = D[k+3] > 110; D[k] = D[k+1] = D[k+2] = 255; D[k+3] = on ? 255 : 0; } x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter; return t;
})();
const PATCH_TEX = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), img = x.createImageData(64, 64), D = img.data;
  let sd = 2281; const r = () => { sd = (sd * 1103515245 + 12345) >>> 0; return sd / 4294967296; };
  const lobes = [0, 1, 2, 3, 4, 5].map(() => [r()*6.28, .5 + r()*.5]), bc = []; for (let k=0;k<80;k++) bc.push([150 + r()*30 - 15, 92 + r()*20 - 10, 66 + r()*16 - 8]);
  for (let j=0;j<64;j++) for (let i=0;i<64;i++){
    const dx = (i - 31.5)/31.5, dz = (j - 31.5)/31.5, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    let edge = .82; lobes.forEach(([la, lr], q) => { edge += .09*lr*Math.cos(a*(2 + q % 4) - la); });
    const k = edge - d, p = (j*64 + i)*4; if (k < 0 && !(k > -.12 && r() < .12)){ D[p+3] = 0; continue; }
    const row = Math.floor(j/6), bx = Math.floor((i + (row % 2)*6)/12), mortar = j % 6 === 0 || (i + (row % 2)*6) % 12 === 0;
    let col = mortar ? [176, 160, 140] : bc[(row*7 + bx) % 80];
    if (k < .09) col = [92, 72, 56]; else if (k < .16 && dz < 0) col = [70, 56, 44];                        // the broken edge of the plaster, darker under its upper lip
    const n = .9 + r()*.2; D[p] = col[0]*n; D[p+1] = col[1]*n; D[p+2] = col[2]*n; D[p+3] = 255;
  }
  x.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter; return t;
})();
const BOOT_TEX = (function(){
  const c = document.createElement('canvas'); c.width = 16; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 32);
  x.fillStyle = 'rgb(150,138,122)'; x.beginPath(); x.ellipse(8, 11, 5.2, 9, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(8, 26, 4.2, 4.6, 0, 0, 7); x.fill();
  x.fillStyle = 'rgb(118,106,92)'; for (let j=4;j<19;j+=3) x.fillRect(4, j, 8, 1); x.fillRect(5, 25, 6, 1); x.fillRect(5, 28, 6, 1);
  const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter; return t;
})();
const TREAD_TEX = (function(){
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = 'rgb(200,190,174)'; x.fillRect(2, 0, 12, 16); x.fillStyle = 'rgb(160,148,130)';
  for (let j=0;j<16;j+=4){ for (let i=0;i<5;i++){ x.fillRect(3 + i, j + i % 4, 1, 2); x.fillRect(12 - i, j + i % 4, 1, 2); } }
  x.fillStyle = 'rgb(226,218,204)'; x.fillRect(1, 0, 1, 16); x.fillRect(14, 0, 1, 16);
  const t = new T.CanvasTexture(c); t.wrapT = T.RepeatWrapping; t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter; return t;
})();
function markLayer(tex, n, off){
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshLambertMaterial({ map:tex, alphaTest:.5, polygonOffset:true, polygonOffsetFactor:off, polygonOffsetUnits:off }), n);
  mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k=0;k<n;k++){ mesh.setMatrixAt(k, ZERO_M); mesh.setColorAt(k, tmpCol.setHex(0xffffff)); }
  world.add(mesh); const L_ = { mesh, n, head:0, list:[] }; MARKL.push(L_); return L_;
}
function markAdd(L_, h, size, tint){
  const e0 = h.e;
  if (e0 && e0.sx != null && !e0.rx && !e0.rz && Math.abs(h.ny) < .5){
    _hv.set(h.x - e0.x, h.y - e0.y, h.z - e0.z); if (e0.qi) _hv.applyQuaternion(e0.qi);
    const hx = e0.sx/2, hy = e0.sy/2, hz = e0.sz/2, fx = Math.abs(Math.abs(_hv.x) - hx) < .05, fz = Math.abs(Math.abs(_hv.z) - hz) < .05;
    if (fx || fz){ const hu = fx ? hz : hx, lo = Math.max(-hy, -e0.y); size = Math.min(size, hu*2, hy - lo); const r = size/2;
      if (fx) _hv.z = clamp(_hv.z, -hu + r, hu - r); else _hv.x = clamp(_hv.x, -hu + r, hu - r); _hv.y = clamp(_hv.y, lo + r, hy - r);
      if (e0.q) _hv.applyQuaternion(e0.q); h = { x:e0.x + _hv.x, y:e0.y + _hv.y, z:e0.z + _hv.z, nx:h.nx, ny:h.ny, nz:h.nz, e:e0 }; }
  }
  const k = L_.head; L_.head = (k + 1) % L_.n;
  dummy.position.set(h.x + h.nx*.018, h.y + h.ny*.018, h.z + h.nz*.018); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0);
  if (Math.abs(h.ny) > .9) dummy.rotation.set(-Math.PI/2, 0, rnd()*6.28); else { dummy.lookAt(h.x + h.nx, h.y + h.ny, h.z + h.nz); dummy.rotateZ(rnd()*6.28); }
  dummy.scale.set(size, size, 1); dummy.updateMatrix();
  L_.list[k] = { m:dummy.matrix.clone(), cut:!!(h.e && h.e.b >= 0 && (h.e.roof || h.y > CUT)), ent:h.e };
  L_.mesh.setMatrixAt(k, G && G.roofs && L_.list[k].cut ? ZERO_M : L_.list[k].m); L_.mesh.instanceMatrix.needsUpdate = true;
  L_.mesh.setColorAt(k, tmpCol.setHex(tint)); L_.mesh.instanceColor.needsUpdate = true;
}
// a layer of marks pressed into the ground: each darkens what is under it and lightens away as it ages
function fadeLayer(tex, n, life){
  const mat = new T.MeshBasicMaterial({ map:tex, transparent:true, depthWrite:false, blending:T.MultiplyBlending, fog:false, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3 });
  mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.rgb = mix(vec3(1.0), diffuseColor.rgb, vColor.r);'); };
  mat.customProgramCacheKey = () => 'fadeMul';
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, n); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.renderOrder = 1;
  for (let k=0;k<n;k++){ mesh.setMatrixAt(k, ZERO_M); mesh.setColorAt(k, tmpCol.setRGB(0, 0, 0)); }
  world.add(mesh); return { mesh, n, head:0, t:new Float32Array(n).fill(-1e9), life };
}
function fadeAdd(L_, x, z, yaw, w, len, y){
  const k = L_.head; L_.head = (k + 1) % L_.n;
  dummy.position.set(x, y, z); dummy.rotation.set(-Math.PI/2, yaw + Math.PI, 0, 'YXZ'); dummy.scale.set(w, len, 1); dummy.updateMatrix(); dummy.rotation.order = 'XYZ';
  L_.mesh.setMatrixAt(k, dummy.matrix); L_.mesh.instanceMatrix.needsUpdate = true; L_.t[k] = G ? G.t : 0;
  L_.mesh.setColorAt(k, tmpCol.setRGB(1, 1, 1)); L_.mesh.instanceColor.needsUpdate = true;
}
function fadeTick(L_){
  const now = G.t; let any = false;
  for (let k=0;k<L_.n;k++){ const t0 = L_.t[k]; if (t0 < -1e8) continue; const a = (now - t0)/L_.life; any = true;
    if (a >= 1 || a < 0){ L_.t[k] = -1e9; L_.mesh.setMatrixAt(k, ZERO_M); L_.mesh.instanceMatrix.needsUpdate = true; continue; }
    const v = Math.min(1, (1 - a)*1.7); L_.mesh.setColorAt(k, tmpCol.setRGB(v, v, v)); }
  if (any) L_.mesh.instanceColor.needsUpdate = true;
}
function initTraces(){
  MARKL.length = 0; WDMG = new Map(); RUBS = []; rubHead = 0; CHIPL = []; chipHead = 0;
  CRACKS = markLayer(CRACK_TEX, 420, -5); PATCHES = markLayer(PATCH_TEX, 200, -3);
  RUB = new T.InstancedMesh(UBOX, new T.MeshLambertMaterial({ color:0xffffff }), RUBN); RUB.frustumCulled = false; RUB.receiveShadow = true; RUB.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k=0;k<RUBN;k++){ RUB.setMatrixAt(k, ZERO_M); RUB.setColorAt(k, tmpCol.setHex(0xffffff)); } world.add(RUB);
  CHIPS = new T.InstancedMesh(UBOX, new T.MeshLambertMaterial({ color:0xffffff }), CHIPN); CHIPS.frustumCulled = false; CHIPS.receiveShadow = true; CHIPS.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k=0;k<CHIPN;k++){ CHIPS.setMatrixAt(k, ZERO_M); CHIPS.setColorAt(k, tmpCol.setHex(0xffffff)); } world.add(CHIPS);
  initLife();
  FPL = fadeLayer(BOOT_TEX, 900, 46); TKL = fadeLayer(TREAD_TEX, 1100, 110); TRT = 0; TKH = new Map();
}
function rubbleAt(x, y, z, rx, ry, rz, sx, sy, sz, col){
  if (!RUB) return; const k = rubHead; rubHead = (rubHead + 1) % RUBN;
  dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
  RUBS[k] = { m:dummy.matrix.clone(), cut:y > CUT };
  RUB.setMatrixAt(k, G && G.roofs && RUBS[k].cut ? ZERO_M : RUBS[k].m); RUB.instanceMatrix.needsUpdate = true;
  RUB.setColorAt(k, tmpCol.setHex(col)); RUB.instanceColor.needsUpdate = true;
}
function addRubble(c){ rubbleAt(c.x, c.y, c.z, c.rx, c.ry, c.rz, c.sx, c.sy, c.sz, c.col); }
// stones and broken block thrown down round a point (an explosion in the street)
function blastRubble(x, z, n){
  for (let k=0;k<n;k++){ const a = rnd()*6.283, d = rr(.3, 2.4), px = x + Math.cos(a)*d, pz = z + Math.sin(a)*d, i = Math.floor(px), j = Math.floor(pz);
    if (inB(i, j) && grid[idx(i, j)] === 1) continue; const s = rr(.05, .17), fl = inB(i, j) ? Math.max(0, topH[idx(i, j)] < 1 ? topH[idx(i, j)] : 0) : 0;
    rubbleAt(px, fl + s*.3, pz, rr(-.3, .3), rnd()*3, rr(-.3, .3), s*rr(1, 1.7), s*rr(.5, .9), s*rr(1, 1.5), jit(pick([0x8a7c68, 0x6a5e50, 0x9d9484, 0x4a4038, 0xa0644a]), .08)); }
}
function clearMarksOf(set){
  for (const L_ of MARKL){ let any = false; for (let k=0;k<L_.list.length;k++){ const d = L_.list[k]; if (d && d.ent && set.has(d.ent)){ L_.list[k] = null; L_.mesh.setMatrixAt(k, ZERO_M); any = true; } } if (any) L_.mesh.instanceMatrix.needsUpdate = true; }
  if (decMesh){ let any = false; for (let k=0;k<DEC.length;k++){ const d = DEC[k]; if (d && d.ent && set.has(d.ent)){ DEC[k] = null; decMesh.setMatrixAt(k, ZERO_M); any = true; } } if (any) decMesh.instanceMatrix.needsUpdate = true; }
  if (scMesh){ let any = false; for (let k=0;k<SCS.length;k++){ const d = SCS[k]; if (d && d.ent && set.has(d.ent)){ SCS[k] = null; scMesh.setMatrixAt(k, ZERO_M); any = true; } } if (any) scMesh.instanceMatrix.needsUpdate = true; }
  for (let k=0;k<CHIPL.length;k++){ const d = CHIPL[k]; if (d && set.has(d.ent)){ CHIPL[k] = null; CHIPS.setMatrixAt(k, ZERO_M); CHIPS.instanceMatrix.needsUpdate = true; } }
}
function coverDmg(o, d){
  if (!o || !o.es || !o.es.length || o.dead || o.barricade || o.falling || TZONE) return;
  o.dm = (o.dm || 0) + d; if (o.dm < (COVER_HP[o.kind] || 1e9)) return;
  o.falling = true; sched.push({ at:G.t + .06, fn:() => collapseCover(o) });
}
function blastCover(x, z, R){
  for (let j=Math.floor(z - R); j<=Math.floor(z + R); j++) for (let i=Math.floor(x - R); i<=Math.floor(x + R); i++){ if (!inB(i, j)) continue; const o = cov[idx(i, j)];
    if (o && o.es && Math.hypot(i + .5 - x, j + .5 - z) < R) coverDmg(o, 99); }
}
function collapseCover(o){
  if (o.dead || !cov || cov[o.cells[0]] !== o) return;
  let cx = 0, cz = 0;
  for (const e of o.es){ cx += e.x/o.es.length; cz += e.z/o.es.length;
    const wood = e.m === M.WOOD, n = clamp(Math.round(e.sx*e.sy*e.sz*38), 1, 9);
    for (let k=0;k<n;k++) spawnChunk(e.x + rr(-.45, .45)*Math.max(e.sx, e.sz), Math.max(.1, e.y + rr(-.4, .4)*e.sy), e.z + rr(-.2, .2), rr(-1.2, 1.2), rr(.4, 2.2), rr(-1.2, 1.2), wood ? rr(.07, .14) : rr(.09, .26), jit(shade(e.c, rr(.8, 1)), .08), wood ? 'splinter' : null);
    for (let k=0;k<n*2;k++) spawnChunk(e.x + rr(-.45, .45)*Math.max(e.sx, e.sz), Math.max(.1, e.y + rr(-.4, .4)*e.sy), e.z + rr(-.2, .2), rr(-1.8, 1.8), rr(.6, 3), rr(-1.8, 1.8), rr(.035, .07), jit(shade(e.c, rr(.75, 1.05)), .1), rnd() < .3 ? 'flake' : null); }
  const dc = o.kind === 'wall' ? 0xcbbfa6 : 0xb8a888;
  for (let k=0;k<26;k++) spawnP(cx + rr(-.5, .5), rr(.1, .7), cz + rr(-.5, .5), rr(-.9, .9), rr(.2, 1.1), rr(-.9, .9), rr(1.4, 3), rr(.2, .34), rr(.8, 1.5), jit(dc, .05), shade(dc, 1.06), rr(.5, .8), 0, 0);
  impSnd('thud', cx, cz); if (typeof sfx === 'function') sfx('crash', cx, cz);
  destroyCover(o);
}
// wear on a wall: h is the hit; chunks and dust are the caller's own throwers, so the pieces are the wall's colour
function wallWear(h, col, brick, chunks, dust, dc){
  const e = h.e; if (!e || !CRACKS || Math.abs(h.ny) > .5) return;
  if (!(e.m === M.PLASTER || e.m === M.CONC || e.m === M.STONE || e.m === M.BRICK)) return;
  if (e.sy < .5 || Math.max(e.sx, e.sz) < .5) return;
  const id = e.wid || (e.wid = ++WID), key = id + ':' + Math.round(h.x/.7) + ':' + Math.round(h.y/.7) + ':' + Math.round(h.z/.7);
  let w = WDMG.get(key); if (!w){ if (WDMG.size > 4000) WDMG.clear(); w = { n:0, h:{ x:h.x, y:h.y, z:h.z, nx:h.nx, ny:h.ny, nz:h.nz, e } }; WDMG.set(key, w); }
  w.n++; const c0 = w.h, dark = shade(col, .4);
  const foot = n => { for (let k=0;k<n;k++){ const s = rr(.06, .16); rubbleAt(c0.x + c0.nx*rr(.1, .7) + c0.nz*rr(-.6, .6), s*.3, c0.z + c0.nz*rr(.1, .7) + c0.nx*rr(-.6, .6), rr(-.3, .3), rnd()*3, rr(-.3, .3), s*rr(1, 1.7), s*rr(.5, .9), s*rr(1, 1.5), rnd() < .35 ? jit(0xa0644a, .1) : jit(shade(col, rr(.78, .98)), .08)); } };
  if (w.n === 3) markAdd(CRACKS, c0, rr(.45, .6), dark);
  else if (w.n === 6){ markAdd(CRACKS, c0, rr(.85, 1.05), dark); markAdd(PATCHES, c0, rr(.42, .55), brick ? 0xb09a86 : 0xffffff); chunks(4, () => jit(shade(col, .95), .08), .1, 2.6); dust(4, dc, 1.1); if (c0.y < 2.2) foot(3); }
  else if (w.n === 10){ markAdd(PATCHES, c0, rr(.85, 1.05), brick ? 0xb09a86 : 0xffffff); markAdd(CRACKS, { x:c0.x, y:c0.y + rr(.1, .3), z:c0.z, nx:c0.nx, ny:c0.ny, nz:c0.nz, e }, rr(1.2, 1.5), dark);
    chunks(7, () => rnd() < .4 ? jit(0xa0644a, .1) : jit(shade(col, .92), .08), .15, 3); dust(8, dc, 1.3); if (c0.y < 3) foot(8); }
  else if (w.n > 10 && w.n % 5 === 0){ markAdd(PATCHES, { x:c0.x + c0.nz*rr(-.4, .4), y:c0.y + rr(-.35, .35), z:c0.z + c0.nx*rr(-.4, .4), nx:c0.nx, ny:c0.ny, nz:c0.nz, e }, rr(.4, .6), brick ? 0xb09a86 : 0xffffff); chunks(3, () => jit(0xa0644a, .1), .12, 2.6); if (c0.y < 3) foot(3); }
  // near a vertical edge of the block: a bite out of the corner
  if (e.rx || e.rz) return;
  _hv.set(h.x - e.x, h.y - e.y, h.z - e.z); if (e.qi) _hv.applyQuaternion(e.qi);
  const hx = e.sx/2, hz = e.sz/2, onX = Math.abs(Math.abs(_hv.x) - hx) < .03, onZ = Math.abs(Math.abs(_hv.z) - hz) < .03;
  const near = onX ? hz - Math.abs(_hv.z) : onZ ? hx - Math.abs(_hv.x) : 9; if (near > .16 || (e.chips || 0) >= 16) return;
  const sgx = _hv.x < 0 ? -1 : 1, sgz = _hv.z < 0 ? -1 : 1, ck = id + 'c' + sgx + sgz + ':' + Math.round(h.y/.22); if (WDMG.has(ck)) return; WDMG.set(ck, 1); e.chips = (e.chips || 0) + 1;
  const s = rr(.1, .19); _hd.set(sgx*(hx - s*.2), _hv.y, sgz*(hz - s*.2)); if (e.q) _hd.applyQuaternion(e.q);
  const k = chipHead; chipHead = (chipHead + 1) % CHIPN;
  dummy.position.set(e.x + _hd.x, e.y + _hd.y, e.z + _hd.z); dummy.rotation.set(rr(-.25, .25), (e.ry || 0) + Math.PI/4 + rr(-.3, .3), rr(-.25, .25)); dummy.scale.set(s, s*rr(.8, 1.5), s); dummy.updateMatrix();
  CHIPL[k] = { ent:e }; CHIPS.setMatrixAt(k, dummy.matrix); CHIPS.instanceMatrix.needsUpdate = true;
  CHIPS.setColorAt(k, tmpCol.setHex(brick || rnd() < .6 ? jit(0x7a4a38, .1) : shade(col, .5))); CHIPS.instanceColor.needsUpdate = true;
  chunks(3, () => rnd() < .5 ? jit(0xa0644a, .1) : jit(shade(col, .95), .08), .11, 3); if (h.y < 2.5) foot(2);
}
// a rocket on a wall: the plaster goes in one blow and the rubble lies at its foot
function wallBlast(h){
  const e = h.e; if (!CRACKS || !(e.m === M.PLASTER || e.m === M.CONC || e.m === M.STONE || e.m === M.BRICK) || Math.abs(h.ny) > .5 || e.sy < .5) return;
  const col = h.c == null ? 0xb0a080 : h.c;
  markAdd(PATCHES, h, rr(1.1, 1.4), e.m === M.BRICK ? 0xb09a86 : 0xffffff); markAdd(CRACKS, h, rr(1.7, 2.1), shade(col, .38));
  for (let k=0;k<14;k++){ const s = rr(.07, .2); rubbleAt(h.x + h.nx*rr(.1, 1.3) + h.nz*rr(-1, 1), s*.3, h.z + h.nz*rr(.1, 1.3) + h.nx*rr(-1, 1), rr(-.3, .3), rnd()*3, rr(-.3, .3), s*rr(1, 1.7), s*rr(.5, .9), s*rr(1, 1.5), rnd() < .4 ? jit(0xa0644a, .1) : jit(shade(col, rr(.75, .98)), .08)); }
}
// boots and tyres on the sand
const _trkOK = (x, z) => { const i = Math.floor(x), j = Math.floor(z); if (!inB(i, j)) return false; const k = idx(i, j); return grid[k] !== 1 && STR[k] !== 2; };
function stepMark(o, x, z, face, dt, sp){
  if (sp < .25) return; o.fpD = (o.fpD || 0) + sp*dt; const stride = sp > 2 ? .62 : .44; if (o.fpD < stride) return; o.fpD = 0; o.fpS = -(o.fpS || 1);
  if (!_trkOK(x, z)) return;
  fadeAdd(FPL, x + Math.cos(face)*.075*o.fpS, z - Math.sin(face)*.075*o.fpS, face + o.fpS*.12, .1, .19, .013);
}
function tyreMark(v, hw){
  const g = v.g; if (!g || !g.visible) return; const x = g.position.x, z = g.position.z;
  if (!v.trk){ v.trk = [x, z]; return; } const dx = x - v.trk[0], dz = z - v.trk[1], d = Math.hypot(dx, dz); if (d < .5) return;
  const tkk = (px_, pz_) => Math.floor(px_/.34) + ':' + Math.floor(pz_/.34), seen = TKH.get(tkk(x, z)); if (TKH.size > 9000) TKH.clear();
  if (d < 3 && _trkOK(x, z) && !(seen != null && G.t - seen < 45 && G.t >= seen)){ for (let q=0;q<=d;q+=.17) TKH.set(tkk(v.trk[0] + dx*q/d, v.trk[1] + dz*q/d), G.t); TKH.set(tkk(x, z), G.t); const yaw = Math.atan2(dx, dz), mx = (x + v.trk[0])/2, mz = (z + v.trk[1])/2, px = Math.cos(yaw)*hw, pz = -Math.sin(yaw)*hw;
    fadeAdd(TKL, mx + px, mz + pz, yaw, .2, d + .04, .011); fadeAdd(TKL, mx - px, mz - pz, yaw, .2, d + .04, .011); }
  v.trk[0] = x; v.trk[1] = z;
}
function updTraces(dt){
  if (!FPL || !G || dt <= 0 || (MIS && MIS.id === 'attract')) return;
  for (const u of units){ if (!u.alive || !u.moving || u.mounted || u.inB || (u.elev || 0) > .05 || u.ride) continue; stepMark(u, u.x, u.z, u.face, dt, Math.hypot(u.vx, u.vz)); }
  for (const c of civs){ if (c.gone || !c.moving) continue; stepMark(c, c.x, c.z, c.face, dt, Math.hypot(c.vx, c.vz)); }
  if (typeof CONVOYS !== 'undefined') for (const C of CONVOYS){ if (MIS.id === 'mile' && C === G.m.C && G.m.phase === 'B') continue; for (const v of C.veh) tyreMark(v, .56); }
  if (typeof TECHS !== 'undefined') for (const t of TECHS) tyreMark(t, .46);
  if (typeof IRN !== 'undefined' && IRN.convoy) for (const v of IRN.convoy) tyreMark(v, .56);
  TRT -= dt; if (TRT <= 0){ TRT = .4; fadeTick(FPL); fadeTick(TKL); }
}
function addCasing(x, y, z, ry, sx, sz, col){
  if (!casMesh) return; const k = casHead; casHead = (casHead + 1) % CASN;
  dummy.position.set(x, Math.max(y, .012), z); dummy.rotation.set(0, ry, 0); dummy.scale.set(.017, .014, Math.max(.042, sz)); dummy.updateMatrix();
  CAS[k] = { m:dummy.matrix.clone(), cut:y > CUT };
  casMesh.setMatrixAt(k, G && G.roofs && CAS[k].cut ? ZERO_M : CAS[k].m); casMesh.instanceMatrix.needsUpdate = true;
  casMesh.setColorAt(k, tmpCol.setHex(jit(col || 0x8e7c52, .06))); casMesh.instanceColor.needsUpdate = true;
}
function scorch(h, size){
  if (!scMesh) return; const k = scHead; scHead = (scHead + 1) % SCN;
  dummy.position.set(h.x + h.nx*.02, h.y + h.ny*.02, h.z + h.nz*.02); dummy.scale.set(1,1,1); dummy.rotation.set(0,0,0);
  if (Math.abs(h.ny) > .9) dummy.rotation.set(-Math.PI/2, 0, rnd()*6.28);     // flat on the ground (lookAt is undefined straight up)
  else { dummy.lookAt(h.x + h.nx, h.y + h.ny, h.z + h.nz); dummy.rotateZ(rnd()*6.28); }
  dummy.scale.set(size, size*rr(.8, 1.15), 1); dummy.updateMatrix();
  SCS[k] = { m:dummy.matrix.clone(), cut:!!(h.e && h.e.b >= 0 && (h.e.roof || h.y > CUT)) || (h.ny > .5 && h.y > CUT), ent:h.e };
  scMesh.setMatrixAt(k, G && G.roofs && SCS[k].cut ? ZERO_M : SCS[k].m); scMesh.instanceMatrix.needsUpdate = true;
  scMesh.setColorAt(k, tmpCol.setHex(jit(0xffffff, .06))); scMesh.instanceColor.needsUpdate = true;
}
// an explosion in the street: a black blot on the ground and soot up the walls that were close enough
function scorchAround(x, y, z, size){
  scorch({ x, y:Math.max(.03, y), z, nx:0, ny:1, nz:0, e:null }, size);
  for (let k=0;k<8;k++){ const a = k/8*6.283 + rnd()*.4, R = size*1.1;
    const h = traceShot(x, .7, z, x + Math.cos(a)*R, .7 + rr(-.1, .3), z + Math.sin(a)*R, 0);
    if (h && h.m !== -1 && Math.hypot(h.x - x, h.z - z) < R) scorch(h, size*rr(.55, .8)); }
}
function refreshDecals(){
  if (casMesh){ for (let k=0;k<CAS.length;k++) if (CAS[k]) casMesh.setMatrixAt(k, G.roofs && CAS[k].cut ? ZERO_M : CAS[k].m); casMesh.instanceMatrix.needsUpdate = true; }
  if (scMesh){ for (let k=0;k<SCS.length;k++) if (SCS[k]) scMesh.setMatrixAt(k, G.roofs && SCS[k].cut ? ZERO_M : SCS[k].m); scMesh.instanceMatrix.needsUpdate = true; }
  if (RUB){ for (let k=0;k<RUBS.length;k++) if (RUBS[k]) RUB.setMatrixAt(k, G.roofs && RUBS[k].cut ? ZERO_M : RUBS[k].m); RUB.instanceMatrix.needsUpdate = true; }
  for (const L_ of MARKL){ for (let k=0;k<L_.list.length;k++) if (L_.list[k]) L_.mesh.setMatrixAt(k, G.roofs && L_.list[k].cut ? ZERO_M : L_.list[k].m); L_.mesh.instanceMatrix.needsUpdate = true; }
  if (!decMesh) return;
  for (let k=0;k<DEC.length;k++) if (DEC[k]) decMesh.setMatrixAt(k, G.roofs && DEC[k].cut ? ZERO_M : DEC[k].m);
  decMesh.instanceMatrix.needsUpdate = true;
}

/* sand pouring out of a holed sandbag */
function updTrickles(dt){
  for (let k=trickles.length-1;k>=0;k--){
    const t = trickles[k]; t.t += dt; t.acc += dt * 34 * (1 - t.t/t.life);
    while (t.acc > 1){ t.acc -= 1; spawnP(t.x + rr(-.02,.02), t.y, t.z + rr(-.02,.02), t.nx*rr(.2,.5), rr(-.2,.1), t.nz*rr(.2,.5), rr(.5,.9), rr(.035,.055), .03, pick([0xc8b080,0xb8a070,0xd2bc8c]), 0xb09868, 1, 0, 9); }
    if (t.t > t.life) trickles.splice(k,1);
  }
}

/* what a hit throws off depends on what it hits */
function impactFx(h){
  const { x, y, z, nx, ny, nz, m } = h, col = h.c == null ? 0xb0a080 : h.c;
  if (h.e && h.e.cv) coverDmg(h.e.cv, 1);
  const px = x + nx*.04, py = y + ny*.04, pz = z + nz*.04;
  const spray = (n, c0, c1, sp, life, s0, s1, grav, cone, emi, up) => {
    for (let k=0;k<n;k++){ const v = sp*rr(.35,1);
      spawnP(px, py, pz, (nx + rr(-cone,cone))*v - h.dx*.15*v, (ny + rr(-cone,cone)*.6 + (up == null ? .3 : up))*v, (nz + rr(-cone,cone))*v - h.dz*.15*v,
        life*rr(.6,1.25), s0*rr(.7,1.3), s1, typeof c0 === 'function' ? c0() : c0, c1, rr(.75,1), emi||0, grav); }
  };
  const dust = (n, c, sp) => { for (let k=0;k<n;k++){ const v = (sp||.9)*rr(.3,1);
    spawnP(px, py, pz, (nx + rr(-.5,.5))*v, (ny*.6 + rr(.1,.6))*v, (nz + rr(-.5,.5))*v, rr(.9,1.8), rr(.05,.1), rr(.3,.55), c, shade(c,1.08), rr(.55,.85), 0, 0); } };
  const chunks = (n, c, s, sp, shape) => { for (let k=0;k<n;k++){ const v = sp*rr(.4,1);
    spawnChunk(px, py, pz, (nx + rr(-.6,.6))*v - h.dx*.2*v, (ny*.5 + rr(.2,.9))*v, (nz + rr(-.6,.6))*v - h.dz*.2*v, s*rr(.6,1.3), typeof c === 'function' ? c() : c, shape); } };
  const sparks = n => { spray(n, () => pick([0xfff4c0,0xffe080,0xffc050]), 0xff6a20, 5.5, .28, .045, .02, 7, .7, 1, .4); lightFlash(px, py, pz, 0xffd080, 1.4, 2.6, .07); };
  if (m === -1){ // ground
    spray(12, () => jit(0x8a7454,.1), 0x7a6648, 3.4, .75, .05, .04, 9, .45, 0, .9); dust(4, shade(col,1.02), .7);
    chunks(2, () => jit(shade(col,.78),.1), .055, 2.2); decal(h, shade(col,.95), .1); impSnd('dirt', x, z);
  } else if (m === M.METAL || m === M.TIN || m === M.SHUTTER){
    sparks(9 + ri(5)); dust(1, 0x9a948a, .5); chunks(1 + ri(2), shade(col,1.05), .045, 2.6, 'flake');
    decal(h, 0xd8d6cc, .08); impSnd(rnd() < .45 ? 'ric' : 'metal', x, z);
  } else if (m === M.BURNT){
    sparks(4); dust(4, 0x2c2824, .8); chunks(2, () => pick([0x1e1c1a,0x3a2a20,0x5a3a24]), .05, 2.2, 'flake');
    decal(h, 0x8a7a6a, .08); impSnd('metal', x, z);
  } else if (m === M.GLASS){
    spray(16, () => pick([0xf2fbff,0xcfe6ee,0xa8c8d4]), 0x9ab8c4, 3.2, .7, .035, .025, 9, .7, 0, .1);
    chunks(3 + ri(3), () => pick([0xbcd4dc,0x9ab4bf,0xd8ecf0]), .06, 2.4, 'flake');
    decal(h, 0xeaf2f4, .16); if (CRACKS) markAdd(CRACKS, h, rr(.3, .52), 0xeef6f8); impSnd('glass', x, z);
  } else if (m === M.WOOD){
    chunks(3 + ri(3), () => jit(shade(col,1.15),.1), .07, 3.2, 'splinter'); spray(6, shade(col,1.1), shade(col,.9), 2.6, .6, .04, .03, 9, .6);
    dust(3, shade(col,1.35), .7); decal(h, shade(col,1.35), .085); impSnd('wood', x, z);
  } else if (m === M.BAG){
    spray(14, () => pick([0xc8b080,0xb8a070,0xd2bc8c]), 0xb09868, 2.2, .8, .045, .03, 9, .5, 0, .4); dust(5, 0xcbb890, .8);
    chunks(1, shade(col,1.05), .05, 1.8, 'flake'); decal(h, 0x6a5a40, .08);
    if (trickles.length < 24) trickles.push({ x:px, y:py, z:pz, nx, nz, t:0, life:rr(1.4,2.6), acc:0 });
    impSnd('soft', x, z);
  } else if (m === M.CLOTH){
    spray(7, shade(col,1.1), shade(col,.9), 1.4, 1.4, .04, .035, 1.6, .9); dust(1, 0xc8bca4, .5); decal(h, shade(col,.6), .06); impSnd('soft', x, z);
  } else if (m === M.WHEEL || m === M.TIRE){
    spray(5, 0x1c1b1a, 0x2a2826, 2.2, .6, .05, .04, 9, .6); chunks(1, 0x1a1918, .05, 2, 'flake'); dust(2, 0x4a4642, .5); impSnd('soft', x, z);
  } else if (m === M.LEAF){
    spray(8, () => pick([0x5d7a3c,0x6b7a3a,0x4f6a34,0x8a8a44]), 0x6a6a3a, 1.2, 2.4, .06, .05, 1.0, 1.1, 0, .2); impSnd('soft', x, z);
  } else { // plaster, brick, concrete, stone, misc
    const brick = m === M.BRICK, base = brick ? 0xa0644a : col;
    const dc = brick ? 0xb08060 : shade(col, 1.12);
    dust(6 + ri(3), dc, 1.0);
    spray(9, () => jit(base,.12), shade(base,.85), 3.2, .7, .045, .03, 9, .55);
    chunks(2 + ri(3), () => rnd() < .25 && !brick && m === M.PLASTER ? jit(0xa0644a,.1) : jit(shade(base,.95),.1), .065, 2.8);
    const cx_ = (MIS && MIS.chipX) || 0;   // streets where the walls are being chewed apart: more and bigger pieces
    if (cx_){ chunks(Math.round(cx_*(2 + ri(3))), () => jit(shade(base, rr(.85, 1.02)), .1), .085, 3.4); chunks(ri(2) + (cx_ > 1 ? 1 : 0), () => jit(shade(base,.9),.08), .16, 2.4); dust(3, dc, 1.2); }
    decal(h, brick ? 0xc89070 : shade(col, 1.18), .1); impSnd(m === M.STONE || m === M.CONC ? 'stone' : 'thud', x, z);
    wallWear(h, col, brick, chunks, dust, dc);
  }
}
