"use strict";
/* ---------- external 3D models: binary HELI geometry (assets/models/world/*.bin) + textures (assets/textures/models/*.png); glTF uvs, origin top-left ---------- */
const LB_HUB = [.0372, 2.7509, -.9839], LB_TAIL = [.0405, 1.5415, -6.6042];
const MODELS = {};
function loadModel(name, prep, texPrep){
  const M_ = MODELS[name] = { ready:false, waiters:[], geos:null, mat:null };
  const bin = assetBin(name);

  const tex = new Promise((res, rej) => new T.TextureLoader().load(assetPng(name), res, undefined, rej));
  Promise.all([bin, tex]).then(([buf, map]) => {
    const geos = parseHeli(buf); if (prep) prep(geos);
    map.flipY = false; map.magFilter = T.LinearFilter; map.minFilter = T.LinearMipmapLinearFilter; map.generateMipmaps = true; map.anisotropy = 8; if (texPrep) texPrep(map); map.needsUpdate = true;
    M_.geos = geos; M_.mat = new T.MeshPhongMaterial({ map, alphaTest:.5, side:T.DoubleSide, specular:0x202020, shininess:20 });
    M_.ready = true; const w = M_.waiters; M_.waiters = []; for (const f of w) f(M_);
  }).catch(() => {});
}
function withModel(name, fn){ const M_ = MODELS[name]; if (!M_) return; if (M_.ready) fn(M_); else M_.waiters.push(fn); }
loadModel('mh6', g => { g.rotor.translate(-LB_HUB[0], -LB_HUB[1], -LB_HUB[2]); g.tail.translate(-LB_TAIL[0], -LB_TAIL[1], -LB_TAIL[2]); });
loadModel('c130');
loadModel('crane', null, m => { m.magFilter = T.NearestFilter; m.minFilter = T.NearestFilter; m.generateMipmaps = false; });
for (const n of PROP_N) loadModel(n, null, m => { m.anisotropy = 4; });
loadModel('paper', null, m => { m.anisotropy = 4; });
loadModel('trees', null, m => { m.anisotropy = 4; }); treeInit();
loadModel('tent');
loadModel('humvee');
loadModel('crow');
loadModel('kc10');
loadModel('m939');
// the BTR-80 of the UN column (sent by the player): hull and turret, the turret turned about its ring
const BTR_PIV = [.1084, 1.9236, 1.1979];
loadModel('btr', g => { g.turret.translate(-BTR_PIV[0], -BTR_PIV[1], -BTR_PIV[2]); }, m => { m.magFilter = T.LinearFilter; m.minFilter = T.LinearMipmapLinearFilter; m.generateMipmaps = true; });
loadModel('tech', null, m => { m.magFilter = T.LinearFilter; m.minFilter = T.LinearMipmapLinearFilter; m.generateMipmaps = true; });
// the hangar's texture tiles along its length: u was stored squeezed into 0..1 and is stretched back here
for (const t of VEH_T) loadModel(t, null, m => { m.magFilter = T.LinearFilter; m.minFilter = T.LinearMipmapLinearFilter; m.generateMipmaps = true; m.anisotropy = 4; });
loadModel('hangar', null, map => { map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(8, 1); map.offset.set(-3, 0); map.minFilter = T.LinearMipmapLinearFilter; });

/* ---------- buildings you can occupy: ground floor (hidden, solid walls) or the roof (parapet, fire over the lower roofs) ---------- */
let BLDS = [], BID = null;
function regB(x, y, w, d, top){
  const id = BLDS.length; BLDS.push({ id, x, y, w, d, top });
  for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (inB(i,j)) BID[idx(i,j)] = id;
  return id;
}
function bAt(i, j){ return inB(i,j) && grid[idx(i,j)] === 1 ? BID[idx(i,j)] : -1; }
function bSlots(b, level){
  if (b.pts) return b.pts;
  // posts along the walls (windows downstairs, the parapet upstairs), half a cell in from the edge
  const pts = [], m = .55, x0 = b.x + m, x1 = b.x + b.w - m, z0 = b.y + m, z1 = b.y + b.d - m;
  const ok = (x, z) => { const k = idx(Math.floor(x), Math.floor(z)); return grid[k] === 1 && BID[k] === b.id; };
  const push = (x, z) => { if (ok(x, z) && !pts.some(p => Math.hypot(p[0]-x, p[1]-z) < .9)) pts.push([x, z]); };
  for (let t=x0; t<=x1+.01; t+=1.1){ push(t, z0); push(t, z1); }
  for (let t=z0; t<=z1+.01; t+=1.1){ push(x0, t); push(x1, t); }
  if (b.ring) for (let t=b.x+b.w/2-3; t<=b.x+b.w/2+3; t+=1.1){ push(t, b.y + 1.5); push(t, b.y + b.d - 1.5); }
  if (!pts.length) pts.push([b.x + b.w/2, b.y + b.d/2]);
  return pts;
}
function bDoors(b){
  const out = [];
  for (let j=b.y-1;j<=b.y+b.d;j++) for (let i=b.x-1;i<=b.x+b.w;i++){
    if (!walk(i,j)) continue;
    if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => bAt(i+dx, j+dy) === b.id)) out.push([i, j]);
  }
  return out;
}
function cmdEnter(bid, level){
  const b = BLDS[bid], sel = alive(); if (!b || !sel.length) return;
  const doors = bDoors(b); if (!doors.length){ hint('No hay acceso a ese edificio'); return; }
  for (const u of sel){
    if (u.inB && u.inB.b === bid){ if (u.inB.level !== level) placeInB(u, b, level); continue; }
    leaveB(u);
    const dd = doors.slice().sort((p, q) => Math.hypot(p[0]+.5-u.x, p[1]+.5-u.z) - Math.hypot(q[0]+.5-u.x, q[1]+.5-u.z))[0];
    const here = Math.floor(u.x) === dd[0] && Math.floor(u.z) === dd[1];
    const pth = here ? [] : findPath(Math.floor(u.x), Math.floor(u.z), dd[0], dd[1]);
    if (!here && !pth) continue;
    u.path = pth; u.order = { type:'enter', b:bid, level, door:dd }; u.stance = 'stand';
    if (here) placeInB(u, b, level);
  }
  radio(sel[0], level === 'roof' ? pick(['¡Arriba, a la azotea!', '¡Todos al tejado!']) : pick(['¡Dentro del edificio, rápido!', '¡Adentro, tomad las ventanas!']));
}
function placeInB(u, b, level){
  const slots = bSlots(b, level);
  const used = new Set(units.filter(o => o !== u && o.alive && o.inB && o.inB.b === b.id && o.inB.level === level).map(o => o.inB.slot));
  const thr = nearestThreat(u); let best = -1, bs = -1e9;
  slots.forEach((s, k) => { if (used.has(k)) return; const sc = -Math.hypot(s[0]-thr.x, s[1]-thr.z)*.25 - Math.hypot(s[0]-u.x, s[1]-u.z)*.05; if (sc > bs){ bs = sc; best = k; } });
  if (best < 0){ hint('Ese edificio ya está lleno'); u.order = null; return; }
  const door = u.order && u.order.door ? u.order.door : nearestFree(Math.floor(u.x), Math.floor(u.z));
  u.inB = { b:b.id, level, slot:best, door };
  u.x = slots[best][0]; u.z = slots[best][1]; u.vx = u.vz = 0; u.path = []; u.order = { type:'hold' }; u.stance = 'crouch';
  u.elev = level === 'roof' ? b.top : 0;
  u.face = Math.atan2(thr.x - u.x, thr.z - u.z);
}
function leaveB(u){
  if (!u.inB) return; const d = u.inB.door;
  u.x = d[0] + .5; u.z = d[1] + .5; u.inB = null; u.elev = 0; u.stance = 'stand';
}
const eyeH = u => (u.elev || 0) + (u.stance === 'prone' ? .25 : u.stance === 'crouch' ? .7 : 1.0);
function losE(ax, az, ha, ba, bx, bz, hb, bb){
  const dx = bx-ax, dz = bz-az, d = Math.hypot(dx,dz), steps = Math.ceil(d*3);
  for (let s=1;s<steps;s++){
    const t = s/steps, i = Math.floor(ax+dx*t), j = Math.floor(az+dz*t);
    if (!inB(i,j)) continue; const k = idx(i,j); if (grid[k] !== 1) continue;
    const bid = BID[k]; if (bid >= 0 && (bid === ba || bid === bb)) continue;
    if (topH[k] < ha + (hb - ha)*t - .15) continue;
    return false;
  }
  return true;
}
function losU(a, b){
  if (!a.inB && !b.inB) return los(a.x, a.z, b.x, b.z);
  return losE(a.x, a.z, eyeH(a), a.inB ? a.inB.b : -1, b.x, b.z, eyeH(b), b.inB ? b.inB.b : -1);
}
function losP(u, x, z){ return u.inB ? losE(u.x, u.z, eyeH(u), u.inB.b, x, z, .4, -1) : los(u.x, u.z, x, z); }
function wallPoint(t, s){
  const b = BLDS[t.inB.b];
  return [clamp(s.x, b.x + .02, b.x + b.w - .02), t.inB.level === 'roof' ? b.top + rr(.1, .45) : rr(.35, 1.1), clamp(s.z, b.y + .02, b.y + b.d - .02)];
}

/* ---------- light at night: who stands in it can be seen ---------- */
function lightAt(x, z){
  let L = 0;
  if (SUP) for (const f of SUP.flares){ const d = Math.hypot(f.x - x, f.z - z); if (d < FLARE_R*.85) L = Math.max(L, f.lit * (1 - d/(FLARE_R*.85)) * 1.6); }
  for (const s of LIGHTSRC){ if (s.off || (s.lamp && nightF < .15)) continue; const r = s.lamp ? s.d*.7 : 6; const d = Math.hypot(s.x - x, s.z - z); if (d < r) L = Math.max(L, 1 - d/r); }
  for (const e of emitters){ if (!e.fire || e.lsrc) continue; const r = 3 + 7*e.fire, d = Math.hypot(e.x - x, e.z - z); if (d < r) L = Math.max(L, 1 - d/r); }
  if (nightF > .3) L = Math.max(L, vestLit(x, z));
  return L;
}
function updLit(){
  for (const u of units) u.lit = u.alive ? lightAt(u.x, u.z) > .22 : false;
  // a flare burning inside a goggle wearer's field whites out the tubes
  for (const u of us){ u.nvBlind = 0; if (!u.alive || u.look !== 'delta' || !G.nv || !SUP) continue;
    for (const f of SUP.flares){ const d = Math.hypot(f.x - u.x, f.z - u.z); if (d < NV_R) u.nvBlind = Math.max(u.nvBlind, f.lit * clamp(1.35 - d/NV_R, 0, 1)); } }
}
const NV_R = 33;
function setNV(on){
  if (on && !us.some(u => u.alive && u.look === 'delta')){ hint('Los Rangers dejaron los visores nocturnos en la base: solo Delta los lleva'); on = false; }
  else if (on && nightF <= .25){ hint('El visor nocturno solo sirve de noche'); on = false; }
  G.nv = on; $('oNV').setAttribute('aria-pressed', on);
  if (on) radio(us.find(u => u.alive), pick(['Bajad visores.', 'Visores abajo, ojos abiertos.', 'NODs puestos.']));
}

/* ---------- noise: gunfire and blasts that send civilians running ---------- */
function addNoise(x, z, r){ if (!G) return; G.noise.push({ x, z, r:r || 22, t:G.t }); if (G.noise.length > 40) G.noise.shift(); }

/* ---------- air support: Little Bird gun runs and illumination flares ---------- */
let SUP = null;
const LB_SPEED = 28, LB_PASS = 11, LB_LEN = 66.7, LB_HW = 5, FLARE_R = 66, LB_CD = 40, FL_CD = 8;   // the gun run: 100 m long, 15 m wide, flown slowly
function lbClamp(a, b){ const dx = b[0]-a[0], dz = b[1]-a[1], L = Math.hypot(dx, dz); return L > LB_LEN ? [a[0] + dx/L*LB_LEN, a[1] + dz/L*LB_LEN] : b; }
const flareL = []; for (let k=0;k<2;k++){ const L = new T.PointLight(0xeef2ff, 0, FLARE_R, 1.1); scene.add(L); flareL.push(L); }
function glowTex(stops){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32,32,0,32,32,32);
  stops.forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0,0,64,64);
  return new T.CanvasTexture(c);
}
const FLARE_GLOW = new T.SpriteMaterial({ map:glowTex([[0,'rgba(255,255,255,1)'],[.18,'rgba(255,252,236,.85)'],[.45,'rgba(255,240,210,.25)'],[1,'rgba(255,230,200,0)']]), transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog:false });
const FLARE_CORE = new T.SpriteMaterial({ map:glowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,1)'],[1,'rgba(255,255,255,0)']]), transparent:true, depthWrite:false, fog:false });
function resetSupport(){ SUP = { lbN:3, lbCd:0, flN:4, flCd:0, runs:[], rockets:[], flares:[], lbA:null, draft:null }; updSupBtns(); }
function updSupBtns(){
  if (!SUP || !$('oLB')) return;
  const lbOk = SUP.lbN > 0 && SUP.lbCd <= 0, flOk = SUP.flN > 0 && SUP.flCd <= 0 && nightF > .25;
  $('oLB').querySelector('em').textContent = SUP.lbCd > 0 && SUP.lbN > 0 ? Math.ceil(SUP.lbCd) + 's' : '×' + SUP.lbN;
  $('oFlr').querySelector('em').textContent = nightF <= .25 ? L('noche') : SUP.flCd > 0 && SUP.flN > 0 ? Math.ceil(SUP.flCd) + 's' : '×' + SUP.flN;
  $('oLB').classList.toggle('off', !lbOk); $('oFlr').classList.toggle('off', !flOk); $('oSupport').classList.toggle('ready', lbOk || flOk);
  if ($('oNV')){ $('oNV').classList.toggle('off', !us.some(u => u.alive && u.look === 'delta') || nightF <= .25); if (G.nv && nightF <= .25) setNV(false); }
}
const segDist = (x, z, a, b) => { const dx = b[0]-a[0], dz = b[1]-a[1], L2 = dx*dx + dz*dz || 1, t = clamp(((x-a[0])*dx + (z-a[1])*dz)/L2, 0, 1); return Math.hypot(a[0] + dx*t - x, a[1] + dz*t - z); };
function compass(dx, dz){ const ang = Math.atan2(dx, -dz) * 180/Math.PI, n = ['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste']; return n[((Math.round(ang/45) % 8) + 8) % 8]; }
function callLB(a, b){
  if (!SUP || SUP.lbN <= 0){ hint('No quedan pasadas de Little Bird'); return false; }
  if (SUP.lbCd > 0){ hint('Star 4-2 está rearmando: ' + Math.ceil(SUP.lbCd) + ' s'); return false; }
  let dx = b[0]-a[0], dz = b[1]-a[1], L = Math.hypot(dx, dz);
  if (L < 5){ hint('Traza una línea más larga: la pasada va de un punto a otro'); return false; }
  dx /= L; dz /= L; if (L > LB_LEN){ L = LB_LEN; b = [a[0] + dx*L, a[1] + dz*L]; }
  SUP.lbN--; SUP.lbCd = LB_CD;
  const S = [a[0] - dx*110, a[1] - dz*110], E = [b[0] + dx*110, b[1] + dz*110];
  const lb = littleBird(); world.add(lb.g); lb.g.visible = false;
  SUP.runs.push({ a, b, d:[dx, dz], L, pts:[S, a, b, E], cum:[0, 110, 110 + L, 220 + L], s:0, delay:1, lb, fireAcc:0, rk:0, sup:false, hit:new Set(), x:S[0], z:S[1], alt:22 });
  radio(leader(), 'Star 4-2, pasada de fuego sobre la línea marcada. ¡Cabezas abajo!');
  sched.push({ at:G.t + 1.4, fn:() => logMsg('Star 4-2: recibido, entro desde el ' + compass(-dx, -dz) + '. En camino.', 'us') });
  updSupBtns(); return true;
}
function lbShot(r, x, y, z){
  const p = clamp(r.s - r.cum[1] + 9 + rr(-1.6, 1.6), 0, r.L), lat = rr(-LB_HW, LB_HW);
  let tx = r.a[0] + r.d[0]*p - r.d[1]*lat, tz = r.a[1] + r.d[1]*p + r.d[0]*lat;
  if (r.roofB && r.roofB.length){ const B_ = r.roofB.slice().sort((q, w) => Math.hypot(q.x + q.w/2 - tx, q.y + q.d/2 - tz) - Math.hypot(w.x + w.w/2 - tx, w.y + w.d/2 - tz))[0]; tx = B_.x + rr(.3, B_.w - .3); tz = B_.y + rr(.3, B_.d - .3); }
  const i = Math.floor(tx), j = Math.floor(tz), roof = inB(i,j) && grid[idx(i,j)] === 1, ty = roof ? topH[idx(i,j)] : .04;
  const side = (r.fireAcc*7 | 0) % 2 ? -1 : 1, gx = x - r.d[1]*side*.8 + r.d[0]*.7, gz = z + r.d[0]*side*.8 + r.d[1]*.7, gy = y - .45;
  tracer(gx, gy, gz, tx, ty, tz, 0xffb24a, 0);
  sched.push({ at:G.t + Math.hypot(tx-gx, ty-gy, tz-gz)/65, fn:() => lbImpact(tx, ty, tz, roof) });
  sfx('mini', gx, gz);
}
function lbImpact(x, y, z, roof){
  const c0 = roof ? 0xc8c0b0 : 0xbcaa88;
  for (let k=0;k<4;k++) spawnP(x + rr(-.15,.15), y + .03, z + rr(-.15,.15), rr(-.7,.7), rr(.8,2.4), rr(-.7,.7), rr(.5,1.1), rr(.08,.14), rr(.35,.65), c0, 0xd6caae, rr(.6,.9), 0, 2);
  if (rnd() < .35) for (let k=0;k<3;k++) spawnP(x, y + .1, z, rr(-2,2), rr(1,3), rr(-2,2), rr(.15,.3), .05, .03, 0xffe0a0, 0xff9040, 1, 1, 9);
  if (rnd() < .25) spawnChunk(x, y + .1, z, rr(-1.5,1.5), rr(1.5,3), rr(-1.5,1.5), rr(.03,.07), roof ? 0xb4aa98 : 0x8a7a62, 'chip');
  addNoise(x, z, 30);
  if (roof) { for (const u of units){ if (u.alive && u.inB && u.inB.level === 'roof' && Math.hypot(u.x-x, u.z-z) < 1.1 && rnd() < .3) damage(u, 30 + rnd()*30, null); } return; }
  for (const u of units){
    if (!u.alive || u.inB) continue;
    const d = Math.hypot(u.x - x, u.z - z); if (d > 1.15) continue;
    if (rnd() < (u.stance === 'prone' ? .3 : .55)) damage(u, (u.team === 'them' ? 45 : 32) + rnd()*35, null);
  }
}
function lbRocket(r, x, y, z, side){
  const p = clamp(r.s - r.cum[1] + 15 + rr(-2, 2), 0, r.L), tx = r.a[0] + r.d[0]*p + r.d[1]*side*rr(0, LB_HW*.8), tz = r.a[1] + r.d[1]*p - r.d[0]*side*rr(0, LB_HW*.8);
  const gx = x - r.d[1]*side*.9, gz = z + r.d[0]*side*.9, gy = y - .4;
  const m = new T.Mesh(UBOX, trM(0xfff2c8)); m.scale.set(.12, .12, .5); world.add(m);
  SUP.rockets.push({ x:gx, y:gy, z:gz, tx, ty:.2, tz, t:0, T:Math.hypot(tx-gx, gy, tz-gz)/55, sx:gx, sy:gy, sz:gz, m });
  sfx('boom', gx, gz);
}
function rocketHit(x, z){
  boom(x, z); sfx('boom', x, z); addNoise(x, z, 40);
  for (const u of units){ if (!u.alive) continue; const d = Math.hypot(u.x-x, u.z-z); if (d > 6) continue;
    u.sup = Math.min(100, u.sup + 85*(1 - d/6));
    if (d < 2.3 && !(u.inB && u.inB.level === 'ground')) damage(u, 85*(1 - d/2.3) + 20, null); }
  for (let j=Math.floor(z)-2;j<=Math.floor(z)+2;j++) for (let i=Math.floor(x)-2;i<=Math.floor(x)+2;i++){ if (!inB(i,j)) continue; const o = cov[idx(i,j)]; if (o && o.kind === 'barrel' && cov[o.cells[0]] === o) breakBarrel(o); }
}
function updRuns(dt){
  if (!SUP) return;
  SUP.lbCd = Math.max(0, SUP.lbCd - dt); SUP.flCd = Math.max(0, SUP.flCd - dt);
  for (let k=SUP.runs.length-1;k>=0;k--){
    const r = SUP.runs[k];
    if (r.delay > 0){ r.delay -= dt; if (r.delay > 0) continue; r.lb.g.visible = true; }
    r.s += LB_PASS*dt;   // one steady speed for the whole run: in, over the strip, and away
    if (r.s >= r.cum[3]){ world.remove(r.lb.g); SUP.runs.splice(k,1); continue; }
    const seg = r.s < r.cum[1] ? 0 : r.s < r.cum[2] ? 1 : 2, f = (r.s - r.cum[seg]) / (r.cum[seg+1] - r.cum[seg] || 1), A = r.pts[seg], Bp = r.pts[seg+1];
    const x = A[0] + (Bp[0]-A[0])*f, z = A[1] + (Bp[1]-A[1])*f;
    const toA = r.cum[1] - r.s, fromB = r.s - r.cum[2];
    let alt = 6.5; if (toA > 0) alt = 6.5 + Math.min(1, toA/80)*15; else if (fromB > 0) alt = 6.5 + Math.min(1, fromB/90)*18;
    r.x = x; r.z = z; r.alt = alt;
    r.lb.g.position.set(x, alt, z); r.lb.g.rotation.set(toA > 0 && toA < 80 ? .14 : fromB > 0 ? -.08 : .1, Math.atan2(r.d[0], r.d[1]), 0, 'YXZ');
    r.lb.rotor.rotation.y += dt*32; if (r.lb.tail) r.lb.tail.rotation.x += dt*55;
    const inPass = r.s > r.cum[1] - 12 && r.s < r.cum[2] - 5;
    if (inPass){
      r.fireAcc += dt*38; while (r.fireAcc > 1){ r.fireAcc -= 1; lbShot(r, x, alt, z); }
      // everyone inside the marked strip dies as the fire sweeps over them: friend or foe, in the open or under a roof
      const sweep = r.s - r.cum[1] + 9;
      for (const u of units){ if (!u.alive || r.hit.has(u)) continue;
        const qx = u.x - r.a[0], qz = u.z - r.a[1], t = qx*r.d[0] + qz*r.d[1], lat = Math.abs(qx*r.d[1] - qz*r.d[0]);
        if (t < -.5 || t > r.L + .5 || lat > LB_HW || t > sweep || (r.only && !r.only.has(u))) continue;
        r.hit.add(u); damage(u, 9999, null); }
      if (r.rk < Math.ceil(r.L/11) && r.s > r.cum[1] - 10 + r.rk*11){ r.rk++; lbRocket(r, x, alt, z, -1); lbRocket(r, x, alt, z, 1); }
      if (!r.sup && !r.only){ r.sup = true; for (const u of units){ if (!u.alive) continue; if (segDist(u.x, u.z, r.a, r.b) < LB_HW + 6) u.sup = Math.min(100, u.sup + (u.team === 'them' ? 70 : 30)); }
        if (rnd() < .7) sched.push({ at:G.t + 2.5, fn:() => logMsg('Star 4-2: ¡fuera! Saliendo de la pasada.', 'us') }); }
    }
  }
  for (let k=SUP.rockets.length-1;k>=0;k--){
    const q = SUP.rockets[k]; q.t += dt; const u = Math.min(1, q.t/q.T);
    const nx = q.sx + (q.tx-q.sx)*u, ny = q.sy + (q.ty-q.sy)*u, nz = q.sz + (q.tz-q.sz)*u;
    q.m.position.set(nx, ny, nz); q.m.lookAt(q.tx, q.ty, q.tz);
    spawnP(nx, ny, nz, rr(-.2,.2), rr(.1,.5), rr(-.2,.2), rr(.8,1.6), .12, rr(.5,.9), 0xd8d4cc, 0xa8a49c, .7, 0, 0);
    if (u >= 1){ world.remove(q.m); SUP.rockets.splice(k,1); rocketHit(q.tx, q.tz); }
  }
  updFlares(dt);
}
function callFlare(x, z){
  if (!SUP || SUP.flN <= 0){ hint('No quedan bengalas'); return false; }
  if (nightF <= .25){ hint('Las bengalas solo están disponibles de noche'); return false; }
  if (SUP.flCd > 0){ hint('Siguiente bengala en ' + Math.ceil(SUP.flCd) + ' s'); return false; }
  SUP.flN--; SUP.flCd = FL_CD;
  radio(leader(), 'Pido iluminación sobre la zona marcada.');
  sched.push({ at:G.t + 2.2, fn:() => {
    const sp = new T.Sprite(FLARE_GLOW), core = new T.Sprite(FLARE_CORE); sp.scale.set(3.4, 3.4, 1); core.scale.set(.55, .55, 1); world.add(sp); world.add(core);
    SUP.flares.push({ x:x + rr(-2,2), y:30, z:z + rr(-2,2), t:0, sp, core, vx:rr(-.25,.25), vz:rr(-.25,.25), acc:0, lit:0 });
    lightFlash(x, 30, z, 0xffffff, 6, 60, .4); logMsg('Bengala en el aire.', 'us'); updSupBtns();
  }});
  updSupBtns(); return true;
}
function updFlares(dt){
  for (let k=SUP.flares.length-1;k>=0;k--){
    const f = SUP.flares[k]; f.t += dt; const w = windAt(ambT);
    f.y -= (f.fall || .6)*dt; f.x += (f.vx + w*.3)*dt; f.z += f.vz*dt + Math.sin(f.t*.7)*.12*dt;
    f.lit = Math.min(1, f.t*2) * clamp(f.y/3, 0, 1) * (.88 + .12*Math.sin(f.t*23) * Math.sin(f.t*7.3));
    f.sp.position.set(f.x, f.y, f.z); f.core.position.set(f.x, f.y, f.z); f.sp.material.opacity = f.lit;
    // smoke trail left above it as it sinks, and a few dripping sparks
    f.acc += dt*12; while (f.acc > 1){ f.acc -= 1; spawnP(f.x + rr(-.08,.08), f.y + .25, f.z + rr(-.08,.08), rr(-.08,.08) + w*.25, rr(.02,.18), rr(-.08,.08), rr(5,8), .12, rr(1,1.8), 0xe8e8e2, 0xa8a8a2, .4, 0, 0); }
    if (rnd() < dt*14) spawnP(f.x, f.y - .1, f.z, rr(-.5,.5), rr(-1,-.3), rr(-.5,.5), rr(.3,.7), .05, .02, 0xffffff, 0xfff0c0, 1, 1, 4);
    if (f.y <= .4){ world.remove(f.sp); world.remove(f.core); SUP.flares.splice(k,1); }
  }
}
function updFlareLights(now){
  const fl = SUP ? SUP.flares.slice().sort((a, b) => Math.hypot(a.x-camS.tx, a.z-camS.tz) - Math.hypot(b.x-camS.tx, b.z-camS.tz)) : [];
  flareL.forEach((L, k) => { const f = fl[k]; if (!f){ L.intensity = 0; return; } L.position.set(f.x, f.y, f.z); L.intensity = 2.1 * f.lit * (.35 + .65*nightF); });
}
/* rotor wash: a ring of dust thrown out under a low helicopter */
function rotorWash(x, z, alt, dt, k){
  if (alt > 24 || dt <= 0) return;
  washLvl = Math.max(washLvl, (1 - alt/24)*(k || 1)*Math.max(0, 1 - Math.hypot(x - camS.tx, z - camS.tz)/42));
  const s = (1 - alt/24) * (k || 1), wet = coastS(x, z) > -2, n = Math.floor(s*dt*70 + rnd());
  for (let q=0;q<n;q++){ const a = rnd()*6.283, r0 = rr(1.0, 3.0), v = rr(2.5, 5.5)*s + 1;
    spawnP(x + Math.cos(a)*r0, rr(.05, .3), z + Math.sin(a)*r0, Math.cos(a)*v, rr(.1, .5), Math.sin(a)*v, rr(.7, 1.5), rr(.2, .4), rr(.8, 1.6),
      wet ? 0xe8f0f0 : 0xc4b494, wet ? 0xd8e4e8 : 0xd8caa8, (wet ? .5 : .4)*s + .08, 0, 0); }
}

