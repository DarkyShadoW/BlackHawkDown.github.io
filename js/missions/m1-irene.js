"use strict";
/* ---------- Mission 1 · Operación Irene: the raid, from the helicopters to the convoy ---------- */
const IR_BP = [ { x:256.5, z:187, n:'BP 1 · norte-oeste' }, { x:277, z:187, n:'BP 2 · norte-este' }, { x:256.5, z:255, n:'BP 3 · sur-oeste' }, { x:277, z:255, n:'BP 4 · sur-este' } ];
const IR_NAMES = [
  ['Cap. Mike Steele', 'Tte. Larry Perino', 'Soto', 'Kim', 'Doyle', 'Price'],
  ['Tte. Tom DiTomasso', 'Cabo Brennan', 'Ruiz', 'Tanaka', 'Morrow', 'Díaz'],
  ['Sgto. Okafor', 'Cabo Lindqvist', 'Herrera', 'Park', 'Sullivan', 'Moreno'],
  ['Sgto. Matt Eversmann', 'Esp. John Waddell', 'Esp. Shawn Nelson', 'Nakamura', 'Gallagher', 'Vega'],
];
const IR_DELTA_X = [{ name:'Sgto. Mayor Tim Martin', role:'Operador', gun:'car', kit:'hydra', acc:.74, burst:3, cool:1.0, supp:13, ammo:240, skin:0xc89870 },
                    { name:'Sgto. 1º Matt Rierson', role:'Operador', gun:'car', kit:'pack', acc:.74, burst:3, cool:1.0, supp:13, ammo:240, skin:0xe0b38e }];
const IR_HOLD = 300, IR_PRIS = 8, IR_BPR = 8, IR_DR = 13;
let IRN = { groups:null }, AIRBG = null;
const irT = () => BLDS.find(b => b.ring);

/* ---- the militia around the block before the raid ---- */
function irSpawn(){
  // the briefing squad is not part of this raid: the real force arrives by air
  for (const u of us){ world.remove(u.m.root); dropOverlay(u); } units = units.filter(u => u.team !== 'us'); us = [];
  for (const [x, z] of [[252,190],[262,183],[281,192],[271,183],[252,262],[262,258],[282,262],[270,252]]) foe(x, z, 'rifle', 'init');
  for (const [x, z] of [[258,180],[275,180],[257,262],[278,262],[248,222],[287,236],[266,206],[268,250]]) foe(x, z, 'post', 'init');
  for (const [x, z] of [[244,236],[290,222],[262,203],[272,256]]) foe(x, z, 'rifle', 'init');
  IRN = { groups:null };
}

/* ---- vehicles of the convoy (same models as at the base) ---- */
function irVehicle(kind){
  const g = new T.Group(), body = new T.Group(); body.scale.setScalar(1/1.5); g.add(body); world.add(g);
  let piv = null;
  if (kind === 'h'){
    piv = new T.Group(); piv.position.z = HMV_RING.z; body.add(piv);
    const tt = hmvTurret(piv); tt.position.z = 0;
    withModel('humvee', M_ => { const q = lodMesh(humveeBare(M_), M_.mat); q.castShadow = true; q.receiveShadow = true; body.add(q); });
  } else g.add(m939Covered());
  return { g, piv, kind };
}
function irConvoy(){
  const order = ['h', 'm', 'h', 'm', 'h', 'h'], stops = [219, 229, 239, 248, 257, 266];
  IRN.convoy = order.map((k, i) => { const v = irVehicle(k); v.kind = k; v.x = 256.5; v.z = 330 + i*9.5; v.stop = stops[i]; v.v = 0; v.fireT = rr(0, 1); v.aim = 0;
    v.g.position.set(v.x, 0, v.z); v.g.rotation.y = Math.PI; return v; });
}
function irConvoyStep(dt){
  const C = IRN.convoy; if (!C) return;
  let moving = false;
  C.forEach((v, i) => {
    if (IRN.convoyGo){
      const ahead = i ? C[i-1].z + 8.6 : -1e9, lim = Math.max(v.stop, ahead);
      const want = clamp((v.z - lim)*.6, 0, 2.3);
      v.v += clamp(want - v.v, -4*dt, 1.2*dt); v.z = Math.max(lim, v.z - v.v*dt);
      if (v.v > .05) moving = true;
      // pushes through the street clutter in its way
      if (v.v > .3){ const j = Math.floor(v.z - 2.6); for (let i2=Math.floor(v.x - 1.3); i2<=Math.floor(v.x + 1.3); i2++){ const k = idx(i2, j), o = cov[k]; if (o && o.kind !== 'fountain') destroyCover(o); } }
      v.g.position.set(v.x, 0, v.z); v.g.position.y = v.v > .3 ? Math.sin(G.t*13 + i)*.02 : 0;
    }
    // the M2 gunners engage militia they can see
    if (v.piv){
      v.fireT -= dt; let tgt = null, bd = 30;
      for (const e of them){ if (!e.alive) continue; const d = Math.hypot(e.x - v.x, e.z - v.z); if (d < bd && los(v.x, v.z, e.x, e.z)){ bd = d; tgt = e; } }
      if (tgt){ const want = Math.atan2(tgt.x - v.x, tgt.z - v.z) - v.g.rotation.y; let d = want - v.aim; d = Math.atan2(Math.sin(d), Math.cos(d)); v.aim += clamp(d, -dt*2.5, dt*2.5); v.piv.rotation.y = v.aim;
        if (v.fireT <= 0 && Math.abs(d) < .25){ v.fireT = rr(.45, .8);
          const s = Math.sin(v.g.rotation.y + v.aim), c = Math.cos(v.g.rotation.y + v.aim), mx = v.x + s*1.1, mz = v.z + c*1.1;
          for (let k=0;k<3;k++) tracer(mx, 2.15, mz, tgt.x + rr(-.6, .6), .3 + rnd()*.9, tgt.z + rr(-.6, .6), 0xff7a3a, k*.08);
          for (let q=0;q<3;q++) sched.push({ at:G.t + q*.08 + .001, fn:() => { if (q === 0) sfx('m2', v.x, v.z, null, 3); } }); addNoise(v.x, v.z, 30); tgt.sup = Math.min(100, tgt.sup + 30);
          if (rnd() < .3) sched.push({ at:G.t + .15, fn:() => { if (tgt.alive) damage(tgt, 45 + rnd()*30, null); } }); } }
    }
  });
  IRN.convoyMoving = moving;
}

/* the column at the door: McKnight gets down from the vehicle beside the entrance, walks to it, and Sanderson comes out to meet him */
function irMckCine(){
  const C = irCourt(), [ax, az] = C.arcade, V = IRN.convoy;
  const v = V.slice().sort((p, q) => (p.kind === 'h' ? 0 : 3) + Math.abs(p.z - az)/4 - ((q.kind === 'h' ? 0 : 3) + Math.abs(q.z - az)/4))[0];
  const side = Math.sign(ax - v.x) || 1, door = [ax - side*.2, az];
  const mk = irDecor(buildRig('ranger', { gun:'m16' }), v.x + side*1.15, v.z + .4, side*PH, { spd:1.25, name:'Tte. Cor. McKnight' }); mk.m.gun.visible = false;
  const sd = irDecor(buildRig('delta', { gun:'car' }), ax + side*1.6, az, -side*PH, { spd:1.4, name:'Sgto. 1º Sanderson' });
  const men = [mk, sd], tk = (d, t) => { d.talkT = 2.8; say(d.name, t, d === mk ? 'convoy' : 'delta', true); };
  const fx = () => [(mk.x + door[0])/2 - side*.6, (mk.z + door[1])/2];
  cineStart({ zoom:5.2, spin:.01, yaw0:camS.yaw, focus:fx,
    keys:[
      { t:.2, fn:() => say('Sgto. Struecker', 'Columna en la puerta del objetivo. Paramos aquí.', 'convoy', true) },
      { t:1.4, fn:() => irGo(mk, door[0] - side*1.5, door[1] + .2) },
      { t:3.2, fn:() => { irGo(sd, door[0] - side*.35, door[1] - .1); sd.then = o => { o.look = -side*PH; }; } },
      { t:6.2, fn:() => { mk.look = side*PH; tk(mk, 'Sanderson, estamos en la puerta. Empezad a sacar a los detenidos ya.'); } },
      { t:9.2, fn:() => tk(sd, 'Todavía no, mi coronel. Nos faltan cinco minutos más ahí dentro.') },
      { t:12.4, fn:() => tk(mk, '¿Cinco? Aquí fuera los cinco minutos nunca se quedan en cinco. Daos prisa.') },
      { t:15.6, fn:() => { irGo(sd, ax + side*1.8, az); sd.then = o => { o.gone = true; world.remove(o.m.root); }; irGo(mk, v.x + side*1.15, v.z + .4); mk.then = o => { o.gone = true; world.remove(o.m.root); }; } },
      { t:16.4, fn:() => say('Uniform 6-4', 'Todos: aguantad cinco minutos más. Que nadie se mueva de su sitio.', 'hq', true) },
    ],
    dur:19,
    tick:(dt) => { for (const d of men) if (!d.gone) irDecorStep(d, dt); },
    onEnd:() => { for (const d of men) if (!d.gone){ d.gone = true; world.remove(d.m.root); } } });
}
/* ---- people without orders: Delta team A in the courtyard, the prisoners ---- */
function irDecor(rig, x, z, face, o){
  if (rig.root.parent !== world) world.add(rig.root);
  rig.root.scale.setScalar(1); rig.root.position.set(x, 0, z); rig.root.rotation.set(0, face, 0); rig.gun.visible = true;
  return Object.assign({ team:'us', x, z, y:0, vx:0, vz:0, face, alive:true, down:false, hp:100, hp0:100, sup:0, pinned:false, stance:'stand', moving:false,
    path:[], order:null, auto:null, firing:0, reloading:false, healing:false, talkT:0, m:rig, spd:1.5, gone:false }, o || {});
}
function irGo(d, x, z){
  const p = findPath(Math.floor(d.x), Math.floor(d.z), Math.floor(x), Math.floor(z)) || [];
  d.path = p.map(c => [c[0] + .5, c[1] + .5]); if (d.path.length) d.path[d.path.length-1] = [x, z]; else d.path = [[x, z]];
}
function irDecorStep(d, dt){
  if (d.gone) return;
  let moving = false;
  if (d.path.length){ const [tx, tz] = d.path[0], dx = tx - d.x, dz = tz - d.z, L = Math.hypot(dx, dz);
    if (L < .2){ d.path.shift(); if (!d.path.length && d.then){ const f = d.then; d.then = null; f(d); } }
    else { const s = Math.min(L, d.spd*dt); d.x += dx/L*s; d.z += dz/L*s; d.vx = dx/L*d.spd; d.vz = dz/L*d.spd; d.face = Math.atan2(dx, dz); moving = true; } }
  if (!moving){ d.vx *= .7; d.vz *= .7; if (d.look != null) d.face = d.look; }
  d.moving = moving;
  const r = d.m.root; r.position.set(d.x, 0, d.z);
  let df = d.face - r.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); r.rotation.y += clamp(df*Math.min(1, dt*8), -dt*8, dt*8);
  animRig(d, dt);
  if (d.pris){ const m = d.m; m.shR.rotation.x = -2.6; m.shL.rotation.x = -2.6; m.elR.rotation.x = -2.0; m.elL.rotation.x = -2.0; }
}
function irPrisoner(x, z){
  const rig = buildRig('civ', { woman:false }); rig.gun.visible = false; world.add(rig.root);
  const p = irDecor(rig, x, z, 0, { team:'civ', pris:true, spd:1.1 }); rig.gun.visible = false; IRN.pris.push(p); return p;
}
// the kneeling row in the courtyard, and the doors the prisoners are brought out of
function irCourt(){
  const T_ = irT(), x0 = T_.x, y0 = T_.y;
  return { row:k => [x0 + 2.5 + k, y0 + 7.0], doors:[[x0 + 2.5, y0 + 2.5], [x0 + 10.5, y0 + 2.5], [x0 + 2.5, y0 + 6.5], [x0 + 10.5, y0 + 4.5]],
    pass:[x0 + 1.5, y0 + 4.5], arcade:[x0 + .5, y0 + 4.5], g1:[x0 + 4.5, y0 + 4.6], g2:[x0 + 8.5, y0 + 4.6] };
}
function irDeltaA(men){
  const C = irCourt(); IRN.dA = []; IRN.pris = []; IRN.captured = 0; IRN.loaded = 0;
  men.forEach((m, i) => {
    const d = irDecor(m.m, m.x, m.z, m.face, { look:null }); d.spd = 2.2; IRN.dA.push(d);
    if (i < 2){ irGo(d, ...[C.g1, C.g2][i]); d.then = o => { o.look = 0; o.role = 'guard'; }; }
    else if (i < 4){ irGo(d, ...C.pass); d.then = o => { o.role = 'handler'; o.spd = 1.3; }; }
    else { irGo(d, ...C.pass); d.then = o => { o.gone = true; world.remove(o.m.root); }; }
  });
}
function irCaptureStep(dt){
  if (!IRN.dA) return;
  const C = irCourt();
  for (const d of IRN.dA) irDecorStep(d, dt);
  for (const p of IRN.pris) irDecorStep(p, dt);
  // every so often a handler brings one more out of the rooms and kneels him in the row
  const holdT = IRN.holdStart != null ? G.t - IRN.holdStart : -1, due = IRN.loadStart ? IR_PRIS : Math.min(IR_PRIS, Math.floor((G.t - IRN.t0)/36) + 1);
  if (!IRN.loadStart && IRN.captured < due && G.t > (IRN.nextPris || 0)){
    const h = IRN.dA.find(d => d.role === 'handler' && !d.path.length && !d.busy);
    if (h){ const k = IRN.captured++, door = C.doors[k % C.doors.length], slot = C.row(k); IRN.nextPris = G.t + 4;
      h.busy = true; irGo(h, door[0], door[1] + .6);
      h.then = o => { const p = irPrisoner(door[0], door[1]); p.slot = k; irGo(p, slot[0], slot[1]); p.then = q => { q.stance = 'crouch'; q.look = Math.PI; };
        irGo(o, slot[0] + .2, slot[1] - 1.1); o.then = q => { q.look = Math.PI; q.busy = false; }; };
      if (k === 0) say('Delta A', 'Tenemos al primero. Seguimos sacándolos de las habitaciones.', 'delta');
      if (k === 4) say('Delta A', 'Van cinco. Hay más gente escondida dentro.', 'delta'); }
  }
  // guards keep their rifles on the row
  for (const d of IRN.dA) if (d.role === 'guard' && !d.moving){ const p = IRN.pris.find(q => !q.gone && q.stance === 'crouch'); d.auto = p && !IRN.loadStart ? p : null; }
  if (holdT < 0) return;
}
function irLoadStep(dt){
  if (!IRN.loadStart || !IRN.convoy) return;
  const truck = IRN.convoy[1], rear = [truck.x + .35, truck.z + 2.8], C = irCourt();
  if (G.t > (IRN.nextLoad || 0)){
    const p = IRN.pris.find(q => !q.gone && !q.walking && q.stance === 'crouch');
    if (p){ IRN.nextLoad = G.t + 2.4; p.walking = true; p.stance = 'stand'; p.look = null; p.spd = 1.4;
      irGo(p, C.pass[0], C.pass[1]); p.then = q => { irGo(q, C.arcade[0], C.arcade[1]); q.then = r => { irGo(r, rear[0], rear[1]); r.then = s => { s.gone = true; world.remove(s.m.root); IRN.loaded++;
        if (IRN.loaded === 4) say('Delta A', 'Cuatro a bordo. Seguid pasándolos.', 'delta'); }; }; }; }
  }
  // the escort: two Delta step out to the arcade to cover the loading
  if (!IRN.escort){ IRN.escort = true; IRN.dA.filter(d => d.role === 'guard').forEach((d, i) => { d.auto = null; d.role = 'escort'; irGo(d, C.arcade[0] - .2, C.arcade[1] + (i ? 2.2 : -2.2)); d.then = o => { o.look = -PH; }; }); }
}

/* ---- the force under the player's command: chalks and Delta team B, each a group ---- */
function finishFlightMission(F){
  F.on = false; AIRBG = F; FOCUS2 = null;
  if (AC && rotorGain) rotorGain.gain.setTargetAtTime(soundOn ? .12 : 0, AC.currentTime, .8);
  document.body.classList.remove('cine'); $('bSkip').hidden = true; $('cine').hidden = true; $('flyUnits').innerHTML = '';
  for (const u of F.units || []) for (const r of u.rings) overlay.remove(r);
  for (const v of F.convoy || []) world.remove(v.g); F.convoy = null;
  irBegin(F);
}
function irBegin(F){
  for (const u of us){ world.remove(u.m.root); dropOverlay(u); } units = units.filter(u => u.team !== 'us'); us = [];
  const T_ = irT(), G_ = [];
  const mk = (m, spec, gi) => {
    const u = makeUnit('us', Math.floor(m.x), Math.floor(m.z), Object.assign({ kind:'us', grp:gi }, spec));
    u.x = m.x; u.z = m.z; u.face = m.face; u.m.root.position.set(u.x, 0, u.z); u.m.root.rotation.y = m.face;
    world.remove(m.m.root); G_[gi].members.push(u); return u;
  };
  // chalks: unit k of the flight is the Black Hawk that dropped it; its corner decides its blocking position
  for (let k=0;k<4;k++){
    const fu = F.units[k], h = fu.helis[0], bp = IR_BP[h.corner != null ? h.corner : k];
    G_.push({ name:'Romeo ' + (k + 1) + '-1', role:bp.n, bp, members:[], kind:'chalk', call:'Super 6-' + (1 + k) });
    F.men.filter(m => m.unit === k).forEach((m, i) => mk(m, Object.assign({}, RANGERS[i % 6], { name:IR_NAMES[k][i], look:'ranger', spd:2.4, supRes:.6, reloadDur:2.3 }), k));
  }
  // Delta team B: the four from the street Little Bird and the four on the hotel roof
  G_.push({ name:'Kilo 1-1', role:'Asalto · objetivo', members:[], kind:'delta' });
  const hotel = BLDS.find(b => b !== T_ && F.plan.roof && Math.abs(b.x + b.w/2 - F.plan.roof[0]) < .6 && Math.abs(b.y + b.d/2 - F.plan.roof[1]) < .6);
  F.men.filter(m => m.unit === 5).forEach((m, i) => {
    const spec = i < 6 ? DELTA[i] : IR_DELTA_X[i - 6], u = mk(m, Object.assign({}, spec, { look:'delta', spd:2.7, supRes:.45, reloadDur:1.8 }), 4);
    if (m.y > 1 && hotel){ placeInB(u, hotel, 'roof'); u.onRoof = true; } });
  IRN.groups = G_; IRN.hotel = hotel; IRN.t0 = G.t; IRN.bpDone = [false, false, false, false]; IRN.chatT = 40;
  irDeltaA(F.men.filter(m => m.unit === 4));
  F.men = [];
  irConvoy(); baseConvoyShow(false);
  IRN.bpRings = IR_BP.map(b => { const r = ovRing(7.4, 8, 0x7fb6ff, .8); r.position.set(b.x, .08, b.z); return grounded(r, .08); });
  G.started = true; G.paused = false; G.sel = new Set(); updSupBtns(); updPause();
  buildCards(); renderSubs();
  say('Uniform 6-4', 'Todos en tierra. Romeos: a vuestras posiciones de bloqueo, una calle más afuera. Nadie entra ni sale de la manzana.', 'hq', true);
  say('Delta A', 'Kilo 2-1 dentro del patio. Empezamos con las habitaciones.', 'delta');
  say(G_[4].members[0].name, 'Kilo 1-1: los de la azotea del hotel, abajo. Nos vemos dentro del objetivo.', 'delta');
  say(G_[3].members[0].name, 'Romeo 4-1 en el suelo... nos han dejado lejos de la esquina. Nos movemos.', 'us');
  hint('Toca la tarjeta de una unidad Romeo (o a uno de sus hombres) y llévalo a su anillo azul. Kilo 1-1: baja de la azotea y asegura el anillo naranja del objetivo.');
}
function irCards(){
  const box_ = $('squad'); box_.innerHTML = ''; if (!IRN.groups) return;
  formDefaults(IRN.groups.map(g => g.members));
  IRN.groups.forEach(g => { if (g.hide) return;
    const b = document.createElement('button'); b.className = 'card';
    b.innerHTML = `<span class="cn">${L(g.name)}</span><span class="cr">${L(g.role)}</span><span class="men"></span><span class="cs"><b>Listo</b><em></em></span>`;
    let last = 0;
    b.addEventListener('click', ev => {
      const live = g.members.filter(u => u.alive); if (!live.length) return;
      const now = performance.now();
      if (now - last < 350){ const c = live.reduce((a, u) => [a[0] + u.x/live.length, a[1] + u.z/live.length], [0, 0]); camS.tx = c[0]; camS.tz = c[1]; }
      last = now;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey){ const all = live.every(u => G.sel.has(u)); for (const u of live) all ? G.sel.delete(u) : G.sel.add(u); }
      else G.sel = new Set(live);
      setMode('move'); refreshCards();
    });
    g.card = { el:b, men:b.querySelector('.men'), st:b.querySelector('.cs b'), am:b.querySelector('.cs em'), cells:[] };
    box_.appendChild(b);
  });
  if (MIS.id !== 'irene') return;
  // team A has its hands full: the card only shows how the capture goes, and a tap looks at the courtyard
  const b = document.createElement('button'); b.className = 'card busy';
  b.innerHTML = `<span class="cn">Kilo 2-1</span><span class="cr">${L('Capturando · no disponible')}</span><span class="bar hp"><i></i></span><span class="cs"><b>${L('Dentro')}</b><em></em></span>`;
  b.addEventListener('click', () => { const T_ = irT(); camS.tx = T_.x + T_.w/2; camS.tz = T_.y + T_.d/2; });
  IRN.cardA = { el:b, hp:b.querySelector('.hp i'), st:b.querySelector('.cs b'), am:b.querySelector('.cs em') };
  box_.appendChild(b);
}
// one cell per man: a health column and a stamina column side by side; grey and crossed when he is down, dim when aboard
const MAN_ICON = {
  bleed:'<svg viewBox="0 0 10 10"><path d="M5 .6C3.4 3.4 2 5 2 6.6a3 3 0 0 0 6 0C8 5 6.6 3.4 5 .6z" fill="var(--bad)"/></svg>',
  cover:'<svg viewBox="0 0 10 10"><path d="M5 .7 8.8 2.1v2.7c0 2.3-1.6 3.8-3.8 4.6C2.8 8.6 1.2 7.1 1.2 4.8V2.1z" fill="var(--warn)"/></svg>',
  tired:'<svg viewBox="0 0 10 10"><rect x=".8" y="2.6" width="7.4" height="4.8" rx=".8" fill="none" stroke="var(--warn)" stroke-width="1.1"/><rect x="8.4" y="4" width="1" height="2" fill="var(--warn)"/><rect x="2" y="3.8" width="1.6" height="2.4" fill="var(--warn)"/></svg>' };
// one cell per man: a dot for how he is (green fit, red down, dark gone, faded aboard) and under it one sign only when he needs a look:
// red drop bleeding, amber shield pinned down in cover, amber flat battery exhausted
function menCells(c, men){
  if (c.cells.length !== men.length){ c.men.innerHTML = ''; c.cells = men.map(u => { const d = document.createElement('i'); d.className = 'man'; d.innerHTML = '<b></b><em></em>'; c.men.appendChild(d); return { d, ic:d.lastChild, k:'', i:'' }; }); }
  men.forEach((u, k) => { const q = c.cells[k], hp = Math.max(0, u.hp)/u.hp0, ft = u.fat == null ? 100 : u.fat;
    const st = u.down ? 'dn' : u.mounted ? 'mt' : !u.alive ? 'dd' : 'ok', sel = G.sel.has(u) ? ' sl' : '';
    if (q.k !== st + sel){ q.k = st + sel; q.d.className = 'man ' + st + sel; }
    const ic = u.down || (!u.alive && !u.mounted) ? '' : hp < .7 ? 'bleed' : u.pinned || (u.alive && u.sup > 55) ? 'cover' : u.spent || ft < 35 ? 'tired' : '';
    if (q.i !== ic){ q.i = ic; q.ic.innerHTML = ic ? MAN_ICON[ic] : ''; }
    const t = trName(u.name) + ' · ' + L(st === 'dn' ? 'Caído' : st === 'mt' ? 'Embarcado' : st === 'dd' ? 'Fuera de combate' : ic === 'bleed' ? 'Herido' : ic === 'cover' ? 'A cubierto' : ic === 'tired' ? 'Agotado' : 'Bien');
    if (q.d.title !== t) q.d.title = t; });
}
function irRefresh(){
  if (!IRN.groups) { $('tally').textContent = L(MIS.id === 'irene' ? 'Fuerza en el aire' : 'Fuerza en camino'); return; }
  for (const g of IRN.groups){ const c = g.card; if (!c) continue;
    const live = g.members.filter(u => u.alive), hp = g.members.reduce((a, u) => a + Math.max(0, u.hp), 0) / g.members.reduce((a, u) => a + u.hp0, 0);
    c.el.classList.toggle('sel', live.some(u => G.sel.has(u))); c.el.classList.toggle('down', !live.length && !g.members.some(u => u.down || u.mounted));
    const worst = live.reduce((m, u) => Math.min(m, u.hp), 100), anyDown = g.members.some(u => u.down);
    c.el.classList.toggle('hurt', !anyDown && worst < 70 && worst >= 40); c.el.classList.toggle('crit', anyDown || worst < 40);
    menCells(c, g.members.filter(u => !u.npc));
    const lead = live[0], pinned = live.some(u => u.pinned), downs = g.members.filter(u => u.down).length;
    const ir = MIS.id === 'irene', mnt = g.members.filter(u => u.mounted).length;
    let st = !live.length ? (mnt ? 'Embarcados' : 'Sin efectivos') : ir && g.kind === 'chalk' && IRN.bpDone && IRN.bpDone[IRN.groups.indexOf(g)] ? 'En posición' : ir && g.kind === 'delta' && irInT(g) >= Math.min(6, live.length) ? 'Asegurando' : lead.status;
    if (downs) st = downs + (downs > 1 ? ' caídos' : ' caído');
    else if (mnt && live.length) st = mnt + ' embarcados';
    c.st.textContent = L(st); c.st.className = pinned || downs ? 'st-pin' : live.some(u => u.sup > 50) ? 'st-sup' : 'st-ok';
    c.am.textContent = (live.length + g.members.filter(u => u.mounted).length) + '/' + g.members.length;
  }
  if (IRN.cardA){ const f = IRN.loadStart ? IRN.loaded/IR_PRIS : IRN.captured/IR_PRIS;
    IRN.cardA.hp.style.width = (f*100) + '%'; IRN.cardA.st.textContent = L(IRN.loadStart ? 'Cargando' : 'Capturando');
    IRN.cardA.am.textContent = (IRN.loadStart ? IRN.loaded : IRN.captured) + '/' + IR_PRIS; }
  const all = IRN.groups.flatMap(g => g.members);
  $('tally').textContent = L(`Fuerza ${all.filter(u => u.alive).length}/${all.length} · Caídos ${all.filter(u => u.down).length} · Abatidos ${G.kills}`);
}
const irInT = g => { const T_ = irT(), cx = T_.x + T_.w/2, cz = T_.y + T_.d/2; return g.members.filter(u => u.alive && Math.hypot(u.x - cx, u.z - cz) < IR_DR && !(u.inB && u.inB.b !== T_.id && u.inB.level === 'roof')).length; };
function irGroupSel(u){
  if (!IRN.groups || u.grp == null) return false;
  const g = IRN.groups[u.grp]; if (!g) return false;
  G.sel = new Set(g.members.filter(o => o.alive)); return g;
}

/* ---- the attacks: militia converging on the blocking positions from all over the city ---- */
// one man at a time works his way through the back streets, between the blocking positions, toward the target
function irSneakTick(){
  if (G.t < (IRN.sneakT || 0)) return; IRN.sneakT = G.t + rr(10, 18);
  const T_ = irT(), cx = T_.x + T_.w/2, cz = T_.y + T_.d/2;
  for (let k=0;k<12;k++){ const a = rnd()*6.283, d = rr(30, 42), x = cx + Math.cos(a)*d, z = cz + Math.sin(a)*d;
    if (IR_BP.some(b => Math.hypot(b.x - x, b.z - z) < 14) || us.some(u => u.alive && Math.hypot(u.x - x, u.z - z) < 12)) continue;
    const n = rnd() < .3 ? 2 : 1;
    for (let q=0;q<n;q++){ const e = foe(x + q, z, 'wave', 'sneak', { acc:.32, hp:85 }); e.goal = { x:cx + rr(-8, 8), z:cz + rr(-7, 7) }; }
    if (rnd() < .4) say(pick(['Super 6-1', 'Super 6-4']), 'Un tirador solo se cuela por los callejones hacia el objetivo. Delta, ojo.', 'air');
    return; }
}
function irWave(n){
  const T_ = irT(), cx = T_.x + T_.w/2, cz = T_.y + T_.d/2;
  const ang = IRN.lastAng == null ? rnd()*6.283 : IRN.lastAng + rr(1.4, 4.8); IRN.lastAng = ang;
  const d = rr(48, 58), bx = cx + Math.cos(ang)*d, bz = cz + Math.sin(ang)*d;
  const bp = IR_BP.slice().sort((a, b) => Math.hypot(a.x - bx, a.z - bz) - Math.hypot(b.x - bx, b.z - bz))[0];
  for (let k=0;k<n;k++){ const e = foe(bx + rr(-5, 5), bz + rr(-5, 5), 'wave', 'hold', { acc:.24, hp:85, burst:5 }); e.goal = rnd() < .75 ? { x:bp.x, z:bp.z } : { x:cx, z:cz }; }
  G.alert = true;
  const dir = compass(Math.cos(ang), Math.sin(ang)), who = rnd() < .5 ? 'Super 6-1' : 'Super 6-4';
  say(who, `Grupo de unos ${n} armados por el ${dir}, van hacia ${bp.n.split(' · ')[0]}.`, 'air', true);
  autoPause('ataque desde el ' + dir);
}
const IR_CHAT = [
  ['Super 6-1', 'air', 'Desde aquí arriba se ven barricadas de neumáticos ardiendo por todo el norte.'],
  ['Super 6-4', 'air', 'Mucha gente en las calles. Hay armados mezclados entre los civiles, ojo.'],
  ['Uniform 6-4', 'hq', 'Romeos, mantened el perímetro. Nadie entra en la manzana del objetivo.'],
  ['Tte. Cor. McKnight', 'convoy', 'Columna de tierra en posición. Doce vehículos, motores en marcha.'],
  ['Delta A', 'delta', 'Seguimos dentro. Estamos identificando a los objetivos uno a uno.'],
  ['JOC', 'hq', 'Uniform 6-4, la columna de McKnight está en la calle del hotel. Espera vuestra orden.'],
  ['Super 6-4', 'air', 'Un técnico con ametralladora se mueve dos calles al este. Lo tengo vigilado.'],
  ['Super 6-1', 'air', 'Me disparan desde los tejados. Sigo en el círculo.'],
  ['Uniform 6-4', 'hq', 'Recordad todos: nadie se queda atrás.'],
  ['Delta A', 'delta', 'Tenemos a varios de los lugartenientes. Los estamos maniatando.'],
  ['Sgto. Struecker', 'convoy', 'Seguimos en espera. Nos tirotean de vez en cuando desde los callejones.'],
  ['JOC', 'hq', 'La milicia está usando megáfonos en las mezquitas. Viene más gente.'],
  ['Super 6-4', 'air', 'Mujeres y niños delante de un grupo armado al sur. Cuidado con a quién disparáis.'],
];
function irChatter(dt){
  IRN.chatT -= dt; if (IRN.chatT > 0) return; IRN.chatT = rr(26, 42);
  if (rnd() < .35 && IRN.groups){ const g = pick(IRN.groups.filter(g => g.kind === 'chalk')), u = g.members.find(m => m.alive);
    if (u) return say(u.name, pick(['¡Fuego desde las ventanas de enfrente!', 'Vamos justos de munición en la esquina.', 'Aguantamos. Que se den prisa ahí dentro.', 'Movimiento en el callejón, a la izquierda.', 'Tenemos un herido leve, seguimos.']), 'us'); }
  IRN.chatI = ((IRN.chatI == null ? Math.floor(rnd()*IR_CHAT.length) : IRN.chatI) + 1 + Math.floor(rnd()*3)) % IR_CHAT.length;
  const [w, c, t] = IR_CHAT[IRN.chatI]; say(w, t, c);
}
function irTick(dt){
  if (!IRN.groups) return;
  if (AIRBG){ AIRBG.t += dt; for (const h of AIRBG.helis) if (!h.gone) heliStep(AIRBG, h, dt); }
  // a chalk is in position when most of what is left of it stands inside its ring
  IRN.groups.forEach((g, k) => { if (g.kind !== 'chalk' || IRN.bpDone[k]) return; const live = g.members.filter(u => u.alive);
    const inn = live.filter(u => Math.hypot(u.x - g.bp.x, u.z - g.bp.z) < IR_BPR).length;
    if (!live.length || inn >= Math.min(4, live.length)){ IRN.bpDone[k] = true; if (live.length){ say(live[0].name, `${g.name} en posición de bloqueo.`, 'us'); IRN.bpRings[k].material.color.setHex(0x6fd36a); } } });
  irCaptureStep(dt); irConvoyStep(dt); irLoadStep(dt);
  if (IRN.holdStart != null) irChatter(dt);
}
function irDeltaBCount(){ const g = IRN.groups && IRN.groups[4]; return g ? [irInT(g), g.members.filter(u => u.alive).length] : [0, 8]; }
const IR_WAIT = 120, IR_FIVE = 300;
function irPressure(every, n){
  if (G.t >= G.nextWave){ G.waveN = (G.waveN || 0) + 1; G.nextWave = G.t + rr(every[0], every[1]); irWave(n + Math.min(6, G.waveN >> 1)); }
  irSneakTick();
}
const irTZone = r => { const T_ = irT(); return { x:T_.x + T_.w/2, z:T_.y + T_.d/2, r }; };
const IR_SUBS = [
  { text:'Perímetro: cada unidad Romeo a su anillo azul · Kilo 1-1 asegura el anillo del objetivo', get zone(){ return irTZone(IR_DR); },
    count:() => { const [a, b] = irDeltaBCount(); return `Romeo ${IRN.bpDone ? IRN.bpDone.filter(Boolean).length : 0}/4 · Kilo 1-1 ${a}/${Math.min(6, b)}`; },
    done:() => IRN.bpDone && IRN.bpDone.every(Boolean) && (() => { const [a, b] = irDeltaBCount(); return a >= Math.min(6, b); })(),
    onDone:() => { G.m.bpT = G.t; say('Uniform 6-4', 'Perímetro establecido. Struecker, mantén la columna en espera.', 'hq', true); say('Sgto. Struecker', 'Recibido. Esperando la orden.', 'convoy'); } },
  { text:'Aguantar hasta que llegue la columna de Struecker', get zone(){ return irTZone(30); },
    start:() => { IRN.holdStart = G.t; IRN.orderT = G.t + IR_WAIT; G.nextWave = G.t + 12; G.waveN = 0; IRN.chatT = 22; for (const r of IRN.bpRings) r.material.opacity = .35; },
    tick:() => { irPressure([32, 40], 7);
      if (!IRN.convoyGo && G.t >= IRN.orderT){ IRN.convoyGo = true;
        say('Uniform 6-4', 'Struecker, adelante. A la puerta del objetivo, por la calle del hotel.', 'hq', true); say('Sgto. Struecker', 'Recibido. Columna en marcha, vamos despacio por las calles.', 'convoy'); say('Tte. Cor. McKnight', 'Todos los vehículos, seguidme. Ojo con los tejados.', 'convoy'); }
      if (IRN.convoy && !IRN.saidC && IRN.convoy[0].z < 290){ IRN.saidC = true; say('Sgto. Struecker', 'Nos disparan desde los callejones. Seguimos avanzando.', 'convoy'); } },
    count:() => IRN.convoyGo ? 'columna en marcha · ' + Math.max(0, Math.round((IRN.convoy[0].z - IRN.convoy[0].stop)*1.5)) + ' m' : 'orden en ' + fmtLeft(IRN.orderT - G.t),
    done:() => IRN.convoyGo && IRN.convoy.every(v => v.z <= v.stop + .05),
    onDone:() => irMckCine() },
  { text:'Aguantar cinco minutos mientras Delta termina', get zone(){ return irTZone(30); },
    start:() => { G.holdEnd = G.t + IR_FIVE; G.nextWave = G.t + 15; IRN.chatT = 18; },
    tick:() => { irPressure([28, 36], 8);
      if (G.t > G.holdEnd - 60 && !IRN.said60){ IRN.said60 = true; say('Delta A', 'Un minuto más. Estamos terminando.', 'delta'); say('Cap. Steele', 'Nos están machacando aquí fuera. Daos prisa.', 'hq'); } },
    count:() => 'quedan ' + fmtLeft(G.holdEnd - G.t) + ' · prisioneros ' + (IRN.captured || 0) + '/' + IR_PRIS,
    done:() => G.t >= G.holdEnd && IRN.captured >= IR_PRIS,
    onDone:() => { IRN.loadStart = G.t; say('Delta A', 'Los tenemos a todos. Salimos con ellos. ¡Cubridnos!', 'delta', true); say('Sgto. Struecker', 'Caja del camión abierta. ¡Vamos, vamos!', 'convoy'); } },
  { text:'Cargar a los prisioneros en el camión', get zone(){ return { x:256.5, z:229, r:5 }; },
    tick:() => irPressure([40, 50], 8),
    count:() => [IRN.loaded || 0, IR_PRIS], done:() => IRN.loaded >= IR_PRIS,
    onDone:() => { say('Delta A', 'Prisioneros a bordo. ¡Todo el mundo a los vehículos!', 'delta', true); } },
];
MISSIONS.irene = { id:'irene', n:1, title:'Operación Irene', hud:'Capturar a los objetivos y sacarlos en el convoy', squad:null, phase:'day', hour:15.70, flight:true, crashed:[],
  place:'Edificio objetivo junto al Hotel Olympic', squadTxt:'Delta + Rangers', date:'3 OCT 1993',
  summary:'Establecer el perímetro de seguridad alrededor del edificio objetivo, capturar a los objetivos y sacarlos en el convoy.',
  opt:[{ text:'Todas las unidades Romeo en posición antes de 2 minutos', ok:() => G.m.bpT != null ? G.m.bpT < 120 : G.t < 120 }],
  start:[256, 300], cam:[262, 236, 13], civ:[267, 229],
  card:'Asalto con helicópteros: cuatro unidades Romeo de Rangers aíslan la manzana y Delta captura a los objetivos. La columna de Struecker llega a la puerta y los saca. Unos 15 minutos.',
  text:'3 de octubre de 1993, 15:32. Despegáis del aeródromo con cuatro Black Hawk y cuatro Little Bird. Los Rangers bajan por cuerdas en las esquinas de la manzana y tienen que avanzar hasta sus posiciones de bloqueo. Delta toma el edificio objetivo frente al Hotel Olympic mientras Kilo 2-1 captura a los lugartenientes. La columna de vehículos de Struecker y McKnight sale a la vez que vosotros y espera cerca, en la calle del hotel: aguantad hasta que llegue y cargue a los prisioneros.',
  intro:'', spawn:irSpawn, subs:IR_SUBS,
};
/* Irene always opens with the campaign's text introduction over its own music: the texts run through the first 30 s
   and the mission's first picture (the chalks running for the helicopters) comes up exactly at 0:30 */
var CMUS = { el:null, on:false, fade:0 };
const CI_AT = 30.0;                                      // the engines start on the music's 0:30
function cmusEl(){
  if (CMUS.el) return CMUS.el;
  try { const a = new Audio('assets/audio/music/intro.mp3'); a.preload = 'none'; CMUS.el = a; } catch(e){ return null; }


  return CMUS.el;
}
function cmusStart(){ const a = CMUS.el; if (!a || !CMUS.on || a.dataset.st) return; a.dataset.st = 1; try { a.currentTime = 0; a.volume = cmusVol(); } catch(e){} const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); }
function cmusVol(){ return soundOn && OPT.music !== false ? .85 : 0; }
var CINTRO = null;
const CI_ROT = 25;                                     // seconds after the first picture that the crews start the engines (and the music comes in)                                     // without music: seconds after the first picture that the crews start the engines
const CI_PRE = 0;                                      // the music starts with the first picture of the mission
function campIntro(go){
  const lines = INTRO[LANG], el = $('introLine'), a = cmusEl();
  // the texts as they always were: a fade, then 1.8 s plus the time to read each one
  const sch = []; let acc = 0; for (const t of lines){ const a0 = acc + .45; acc = a0 + 1.8 + t.length*.048; sch.push([a0, acc]); }
  const D = acc, mAt = Infinity;                                  // no music over the texts: it starts with the engines
  CINTRO = { go, k:-1, sch, lines, a, t0:performance.now(), fired:false, D, mAt, mOn:false };
  el.classList.remove('on'); el.textContent = '';
  showScreen('scrIntro');
  CMUS.on = true; CMUS.fade = 0; CMUS.cut = null;
  if (a){ try { a.pause(); a.currentTime = 0; } catch(e){} a.volume = cmusVol(); delete a.dataset.st; }
  const tick = () => {
    const C = CINTRO; if (!C) return;
    const t = (performance.now() - C.t0)/1000;
    if (!C.mOn && t >= C.mAt && C.a){ C.mOn = true; try { C.a.currentTime = Math.min(5, t - C.mAt); } catch(e){} const pr = C.a.play(); if (pr && pr.catch) pr.catch(() => {}); }
    let k = -1; for (let i=0;i<C.sch.length;i++) if (t >= C.sch[i][0] - .45) k = i;
    if (k !== C.k){ C.k = k; el.classList.remove('on'); if (k >= 0) setTimeout(() => { if (CINTRO === C && C.k === k){ el.textContent = C.lines[k]; el.classList.add('on'); } }, 450); }
    if (t >= C.D){ campIntroGo(); return; }
    C.raf = setTimeout(tick, 40);
  };
  tick();
}
// how far the music is past 0:30 (negative before); with no music playing, a plain clock from the cut
function cmusRot(){ return CMUS.cut != null ? (performance.now() - CMUS.cut)/1000 - CI_ROT : null; }
function campIntroGo(skip){
  const C = CINTRO; if (!C || C.fired) return; C.fired = true; clearTimeout(C.raf); CINTRO = null;
  $('introLine').classList.remove('on'); introSeen = true; markIntro();
  if (C.a){ try { C.a.pause(); C.a.currentTime = 0; } catch(e){} }
  CMUS.cut = performance.now();
  C.go();
}
function irStartMission(){
  if (!CMUS.introOK){ CMUS.introOK = true; campIntro(() => { irStartMission(); }); return; }
  CMUS.introOK = false;
  $('overlay').hidden = true; $('overlay').classList.remove('peek'); $('brief').classList.remove('peek');
  if (!AC) initAudio(); else if (AC.state === 'suspended') AC.resume();
  for (const u of us){ world.remove(u.m.root); dropOverlay(u); } units = units.filter(u => u.team !== 'us'); us = [];
  clearChat(); startFlight({ mis:true });
}
function irReset(){
  if (AIRBG){ for (const h of AIRBG.helis) if (!h.gone) world.remove(h.g); for (const r of AIRBG.ropes || []) world.remove(r); for (const e of AIRBG.smoke || []){ const i = emitters.indexOf(e); if (i >= 0) emitters.splice(i, 1); } AIRBG = null; }
  if (IRN.convoy) for (const v of IRN.convoy) world.remove(v.g);
  if (typeof baseConvoyShow === 'function') baseConvoyShow(true);
  for (const d of (IRN.dA || []).concat(IRN.pris || [])) if (!d.gone) world.remove(d.m.root);
  for (const r of IRN.bpRings || []) overlay.remove(r);
  IRN = { groups:null };
}

function leader(){ return us.find(u => u.alive); }
// the force and the mission's plain values, kept in memory
function cpSave(say){
  if (!G || !G.started || G.over || MIS.id === 'attract' || MIS.id === 'tutorial') return;
  const keep = {}; for (const k in G.m){ const v = G.m[k]; if (v == null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') keep[k] = v; }
  G.cp = { mis:MIS.id, t:G.t, sub:G.sub, subsDone:G.subsDone.slice(), downs:G.downs, m:keep,
    men:us.filter(u => !u.npc).map(u => ({ u, x:u.x, z:u.z, hp:Math.max(u.hp, u.down ? 35 : 0), down:u.down, mounted:u.mounted, alive:u.alive, fat:u.fat, stance:u.stance, inB:u.inB ? { b:u.inB.b, level:u.inB.level } : null })) };
  G.cpT = G.t;
  if (say){ logMsg(L('Punto de control guardado'), 'us'); cpToast(); }
}
function cpToast(){ const el = $('cpToast'); if (!el) return; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
function cpTick(){
  if (!G || !G.started || G.over || CINE.on || FLIGHT.on) return;
  if (G.cpT == null){ if (G.t > 2) cpSave(false); return; }
  const pl = us.filter(u => !u.npc);
  if (G.t - G.cpT > 120 && pl.every(u => !u.down && !u.pinned && (!u.alive || u.hp > 45)) && !pl.some(u => u.alive && u.sup > 30)) cpSave(true);
}
function cpRestore(){
  const C = G.cp; if (!C || C.mis !== MIS.id) return false;
  showScreen(null); G.over = false; G.endAt = null; G.paused = true;
  sched = sched.filter(e => !/endGame/.test(String(e.fn)));
  Object.assign(G.m, C.m); G.sub = C.sub; G.subsDone = C.subsDone.slice(); G.subStarted = true;
  for (const r of C.men){ const u = r.u; if (u.mounted || r.mounted) { u.hp = Math.max(u.hp, r.hp); continue; }
    u.down = false; u.alive = true; u.hp = Math.max(r.hp, 35); u.reviveT = 0; u.sup = 0; u.pinned = false; u.path = []; u.order = null; u.fat = Math.max(60, r.fat || 100); u.spent = false;
    u.vx = u.vz = 0; u.deathT = null; u.stance = r.stance === 'prone' ? 'crouch' : r.stance || 'crouch'; if (u.inB) leaveB(u);
    if (r.inB && BLDS[r.inB.b]) placeInB(u, BLDS[r.inB.b], r.inB.level); else { u.x = r.x; u.z = r.z; }
    if (!units.includes(u)) units.push(u); if (u.m && u.m.root && !u.m.root.parent) world.add(u.m.root); }
  // the men who pressed in on them are pushed back: nobody close enough to finish them before they get their bearings
  for (const e of them){ if (!e.alive || e.tech) continue; if (us.some(u => u.alive && Math.hypot(u.x - e.x, u.z - e.z) < 13)){ e.alive = false; e.hp = 0; if (e.m) world.remove(e.m.root); dropOverlay(e); } }
  G.sel = new Set(); updPause(); refreshCards(); renderSubs();
  hint('Punto de control: la misión sigue desde aquí. Da órdenes y reanuda con Espacio.'); cpToast();
  return true;
}
function updMission(){
  const s = MIS.subs[G.sub]; if (!s || G.over || (CINE.on && CINE.block)) return;
  if (!G.subStarted && s.tip && G.sub === 0) hint(s.tip);
  if (!G.subStarted){
    G.subStarted = true; if (s.start) s.start();
    objRing.position.set(s.zone.x, .08, s.zone.z); objRing.scale.setScalar(s.zone.r / OBJ.r);
    if (G.sub > 0){ logMsg('Nuevo objetivo: ' + s.text, 'us'); autoPause('nuevo objetivo'); }
    renderSubs();
  }
  if (s.tick) s.tick();
  if (s.done()){
    G.subsDone.push(G.sub); if (s.onDone) s.onDone(); radio(leader(), s.radio);
    G.sub++; G.subStarted = false; renderSubs();
    if (G.sub < MIS.subs.length) cpSave(true);
    if (G.sub >= MIS.subs.length) G.endAt = G.t + (MIS.endDelay || 1.5);
    else if (MIS.subs[G.sub].tip) hint(MIS.subs[G.sub].tip);
  }
}
const lowFirst = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
function renderSubs(){
  const el = $('subs'); if (!el || !G) return;
  const items = [];
  if (G.sub > 0) items.push(`<li class="done">${L(MIS.subs[G.sub-1].text)}</li>`);
  const s = MIS.subs[G.sub];
  if (s){ const c = s.count && G.subStarted ? s.count() : null; items.push(`<li>${L(s.text)}${c ? ` <em>${typeof c === 'string' ? L(c) : c[0] + '/' + c[1]}</em>` : ''}</li>`); }
  items.push(`<li class="opt${G.downs ? ' fail' : ''}">${L('Opcional')}: ${lowFirst(L('Que nadie caiga'))}</li>`);
  for (const o of MIS.opt || []) items.push(`<li class="opt${o.ok() ? '' : ' fail'}">${L('Opcional')}: ${lowFirst(L(o.text))}</li>`);
  const html = items.join('');
  if (el.innerHTML !== html) el.innerHTML = html;
}
function autoPause(why){
  if (CINE.on) return;
  if (!G || !G.autoP || G.paused || G.over || !G.started || G.t - G.lastAuto < 4) return;
  G.lastAuto = G.t; G.paused = true; updPause();
  hint('Pausa automática: ' + why + '. Da órdenes y reanuda con Espacio');
}
function checkEnd(){
  const pl = us.filter(u => !u.npc);
  if (G.over || G.noLose || !pl.length || CINE.on) return;
  if (IRN.groups) for (const g of IRN.groups){ const m = g.members.filter(u => !u.npc && !u.medevac); if (m.length && !m.some(u => u.alive || u.mounted)){ endGame(false, L(g.name) + ' ' + L('ha caído')); return; } }
  if (!pl.some(u => u.alive || u.mounted)) endGame(false, L('Toda la fuerza ha caído'));
}
function endGame(win, why){
  if (G.over) return;
  G.over = true; G.paused = true; closeCtx(); openMap(false);
  const secs = Math.floor(G.t), mm = Math.floor(secs/60), ss = secs % 60;
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]);
  // the objectives exactly as they read during play: done, failed where the mission ended, or never reached
  const mains = MIS.subs.map((s, k) => `<li class="${G.subsDone.includes(k) ? 'ok' : k === G.sub ? 'no' : 'na'}"><span>${esc(L(s.text))}</span><em>${L(G.subsDone.includes(k) ? 'Conseguido' : k === G.sub ? 'No conseguido' : 'Sin alcanzar')}</em></li>`).join('');
  const opts = [{ text:'Que nadie caiga', ok:() => !G.downs }].concat(MIS.opt || [])
    .map(o => { const ok = win && o.ok(); return `<li class="${ok ? 'ok' : 'no'}"><span>${esc(L(o.text))}</span><em>${L(ok ? 'Conseguido' : 'No conseguido')}</em></li>`; }).join('');
  const all = us; const wounded = all.filter(u => !u.mounted && u.hp < u.hp0).length;
  $('endScr').innerHTML = `
    <span class="date">${MIS.date || '3 OCT 1993'} · ${fmtClock()} · ${L('Tiempo de misión')} ${mm}:${String(ss).padStart(2, '0')}</span>
    <span class="eyebrow">${MIS.n > 0 ? L('Misión') + ' ' + MIS.n : L('Instrucción')}</span>
    <b class="endname">${esc(L(MIS.title))}</b>
    <h1 class="${win ? 'win' : 'lose'}">${L(win ? 'Objetivo cumplido' : 'Objetivo no cumplido')}</h1>${!win && why ? `<b class="why">${esc(why)}</b>` : ''}
    <p>${esc(L(MIS.summary || ''))}</p>
    <div class="objs"><span class="picklabel">${L('Objetivos principales')}</span><ul>${mains}</ul></div>
    <div class="objs"><span class="picklabel">${L('Objetivos secundarios')}</span><ul>${opts}</ul></div>
    <div class="stats"><span>${L('Milicianos abatidos')}</span><b>${G.kills}</b><span>${L('Veces que cayó alguien')}</span><b>${G.downs}</b><span>${L('Heridos al final')}</span><b>${wounded}</b><span>${L('Cartuchos disparados')}</span><b>${G.fired}</b></div>
    <div class="gorow">${win && nextMission() ? `<button class="go" id="eNext">${L('Siguiente misión')}</button>` : ''}${!win && G.cp && G.cp.mis === MIS.id ? `<button class="go" id="eCp">${L('Volver al punto de control')}</button>` : ''}<button class="${win && nextMission() || (!win && G.cp && G.cp.mis === MIS.id) ? '' : 'go'}" id="eRetry">${L('Repetir misión')}</button><button id="eMenu">${L('Menú principal')}</button></div>`;
  if (win){ const ol = [{ ok:() => !G.downs }].concat(MIS.opt || []); markDone(MIS.id, { opt:ol.filter(o => { try { return o.ok(); } catch(e){ return false; } }).length, of:ol.length, secs, downs:G.downs }); }
  showScreen('endScr');
  const n = $('eNext'); if (n) n.onclick = () => openMission(nextMission());
  $('eRetry').onclick = () => openMission(MIS.id, true);
  const cpb = $('eCp'); if (cpb) cpb.onclick = () => cpRestore();
  $('eMenu').onclick = () => goMenu();
}

