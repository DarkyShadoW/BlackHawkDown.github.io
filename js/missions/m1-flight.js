"use strict";
/* ---------- Operation Irene: the assault force flies in from the airfield, over the villages, to the target ---------- */
let FLIGHT = { on:false };
function polyAt(F, s){
  if (s < 0){ const a = F.pts[0], b = F.pts[1], L = Math.hypot(b[0]-a[0], b[1]-a[1]) || 1; return [a[0] + (b[0]-a[0])/L*s, a[1] + (b[1]-a[1])/L*s, Math.atan2(b[0]-a[0], b[1]-a[1])]; }
  let k = 0; while (k < F.cum.length - 2 && F.cum[k+1] < s) k++;
  const a = F.pts[k], b = F.pts[k+1], L = F.cum[k+1] - F.cum[k] || 1, t = clamp((s - F.cum[k]) / L, 0, 1);
  return [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, Math.atan2(b[0]-a[0], b[1]-a[1])];
}
// a smooth curve through the waypoints (Catmull-Rom), resampled every few units
function smoothRoute(P, step){
  const out = [P[0]];
  for (let k=0;k<P.length-1;k++){ const p0 = P[Math.max(0, k-1)], p1 = P[k], p2 = P[k+1], p3 = P[Math.min(P.length-1, k+2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0]-p1[0], p2[1]-p1[1]) / step));
    for (let q=1;q<=n;q++){ const t = q/n, t2 = t*t, t3 = t2*t;
      out.push([0, 1].map(i => .5*((2*p1[i]) + (-p0[i] + p2[i])*t + (2*p0[i] - 5*p1[i] + 4*p2[i] - p3[i])*t2 + (-p0[i] + 3*p1[i] - 3*p2[i] + p3[i])*t3))); } }
  return out;
}
// lift off along the runway, out over the beach and the water, north along the coast, inland over the villages to K-4, and up from the south to the target
const CONVOY_X = [-880, 1067];       // where the formation overflies the convoy on the airport road
function ireneRoute(){
  return smoothRoute([AIRP(-110, -16), AIRP(10, -40), AIRP(150, -100), CONVOY_X, AIRP(560, 60), AIRP(720, 118), [-330, 930], [-150, 640], [60, 540], [220, 450], [262, 372], [264, 300], [265, 262]], 6);
}
/* where each aircraft ends up: the four Black Hawks over the corners of the target, Little Birds in the street in front of the arcade
   and one on the next roof, two Black Hawks circling overhead */
function irenePlan(){
  const T_ = BLDS.find(b => b.ring) || { x:LM.target.x - 6.5, y:LM.target.z - 5, w:13, d:10, top:3.55 };
  const cx = T_.x + T_.w/2, cz = T_.y + T_.d/2, gY = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return inB(i,j) && grid[idx(i,j)] === 1 ? (topH[idx(i,j)] || 3) : 0; };
  const corners = [[T_.x - 4.5, T_.y - 4.5], [T_.x + T_.w + 4.5, T_.y - 4.5], [T_.x - 4.5, T_.y + T_.d + 4.5], [T_.x + T_.w + 4.5, T_.y + T_.d + 4.5]];
  // the street in front of the arcade (west face): room for three Little Birds, nose to tail
  const clear = (x, z, r) => { for (let j=Math.floor(z-r);j<=Math.floor(z+r);j++) for (let i=Math.floor(x-r);i<=Math.floor(x+r);i++) if (!walk(i,j)) return false; return true; };
  const cand = [];
  for (let z=T_.y - 12; z<=T_.y + T_.d + 12; z+=.5) for (let x=T_.x - 12; x<=T_.x - 2.5; x+=.5) if (clear(x, z, 2.2)) cand.push([x, z, Math.abs(x - (T_.x - 5))*.6 + Math.abs(z - cz)]);
  cand.sort((a, b) => a[2] - b[2]);
  const street = [];
  for (const c of cand){ if (street.length >= 3) break; if (street.every(s => Math.hypot(s[0]-c[0], s[1]-c[1]) > 8)) street.push([c[0], c[1]]); }
  while (street.length < 3) street.push([T_.x - 6, cz - 9 + street.length*9]);
  // the roof next door: the nearest decent-sized building that is not the target
  let roof = null, rs = 1e9;
  for (const b of BLDS){ if (b === T_ || b.ring || b.w < 5 || b.d < 5) continue;
    const gx = Math.max(0, T_.x - (b.x + b.w), b.x - (T_.x + T_.w)), gz = Math.max(0, T_.y - (b.y + b.d), b.y - (T_.y + T_.d)), g = Math.max(gx, gz);
    if (g > 6) continue; const sc = g*3 - Math.min(b.w, b.d); if (sc < rs){ rs = sc; roof = b; } }
  const roofP = roof ? [roof.x + roof.w/2, roof.y + roof.d/2, roof.top || 3.2] : [T_.x + T_.w + 8, cz, 0];
  return { cx, cz, top:T_.top || 3.55, corners, street, roof:roofP, gY };
}
/* passengers: Rangers sitting in the Black Hawks' doors with their legs out, Delta on the Little Birds' benches, two a side */
function seatRig(look, parent, x, y, z, ry){
  const rig = buildRig(look, { gun: look === 'delta' ? 'car' : 'm16' }); rig.gun.visible = false;
  rig.root.scale.setScalar(1.5); rig.root.position.set(x, y, z); rig.root.rotation.y = ry; if (rig.model) rig.pelvis.position.y = .52/SOLD_K;
  rig.hipL.rotation.x = rig.hipR.rotation.x = -1.45; rig.knL.rotation.x = 1.25; rig.knR.rotation.x = 1.4;
  rig.hipL.rotation.z = .12; rig.hipR.rotation.z = -.12;
  rig.shR.rotation.x = -.5; rig.elR.rotation.x = -1.0; rig.shL.rotation.x = -.65; rig.elL.rotation.x = -1.1; rig.neck.rotation.y = rr(-.4, .4);
  parent.add(rig.root); return { rig, look, side: Math.sign(x) || 1 };
}
function loadBH(h){
  h.pax = [];
  for (const s of [-1, 1]){ for (const z of [1.82, 2.68]) h.pax.push(seatRig('ranger', h.g, s*.9, -.03, z, s*PH)); h.pax.push(seatRig('ranger', h.g, s*.3, -.03, 2.25, s*PH)); }
}
function loadLB(h){
  h.pax = []; for (const s of [-1, 1]) for (const z of [-.36, -1.3]) h.pax.push(seatRig('delta', h.g, s*1.27, .03, z, s*PH));
}
function smokeColumns(F){
  // two burning-tyre columns in the first streets of the city, right on the line the formation flies
  let s0 = null; for (let s=0;s<F.L;s+=4){ const [x, z] = polyAt(F, s); if (x > 0 && z > 0 && x < W && z < H && cityDs(x, z) > .35){ s0 = s; break; } }
  if (s0 == null) s0 = F.L - 260;
  F.smoke = [];
  for (const [ds, off] of [[25, 4], [120, -5]]){ const [x, z, hd] = polyAt(F, Math.min(F.L - 80, s0 + ds)), c = Math.cos(hd), sn = Math.sin(hd), ex = x + c*off, ez = z - sn*off;
    const i = Math.floor(ex), j = Math.floor(ez), y = inB(i,j) && grid[idx(i,j)] === 1 ? (topH[idx(i,j)] || 3) + .2 : .3;
    const em = { x:ex, z:ez, y, rate:9, life:16, vy:3.6, s0:1.6, s1:7.5, fire:.5, acc:0, sp:.9 }; emitters.push(em); F.smoke.push(em); }
  // let the columns build up before the helicopters get there
  for (let k=0;k<160;k++){ for (const e of F.smoke) emitFrom(e, .1); updParticles(.1); }
}
function blowSmoke(F, h, dt){
  if (!F.smoke || !F.smoke.some(e => Math.hypot(e.x - h.x, e.z - h.z) < 70)) return;
  const R_ = h.lb ? 8 : 11;
  for (let k=0;k<PN;k++){ if (PT[k] >= PL[k] || PE[k]) continue;
    const dx = PX[k] - h.x, dz = PZ[k] - h.z, dy = PY[k] - (h.y + 1.5), d2 = dx*dx + dz*dz + dy*dy*1.8; if (d2 > R_*R_) continue;
    const d = Math.sqrt(d2) || .1, f = 1 - d/R_;
    PVX[k] += dx/d*26*f*dt; PVZ[k] += dz/d*26*f*dt; PVY[k] -= 9*f*dt; PT[k] += dt*3.5*f; }
}
/* the assault force as units: one Ranger chalk per Black Hawk, one Delta team per pair of Little Birds */
function flightUnits(F){
  const bh = F.helis.filter(h => h.role === 'corner'), lb = F.helis.filter(h => h.lb);
  F.units = bh.map((h, k) => ({ name:'Romeo ' + (k + 1) + '-1', role:'Super 6-' + (k + 1) + ' · 6 Rangers', helis:[h] }))
    .concat([{ name:'Kilo 2-1', role:'Star 4-1 y 4-2 · 8 Delta', helis:[lb[0], lb[1]] }, { name:'Kilo 1-1', role:'Star 4-3 y 4-4 · 8 Delta', helis:[lb[2], lb[3]] }]);
  F.units.forEach((u, k) => { for (const h of u.helis) h.unit = k; u.rings = u.helis.map(h => { const r = ovRing(.86, 1, 0xcfe6ff, .9); r.visible = false; return r; }); });
  F.sel = null;
  const box_ = $('flyUnits'); box_.innerHTML = '';
  F.units.forEach((u, k) => {
    const b = document.createElement('button'); b.className = 'card';
    b.innerHTML = `<span class="cn">${L(u.name)}</span><span class="cr">${L(u.role)}</span><span class="bar hp"><i style="width:100%"></i></span><span class="cs"><b>En tierra</b><em></em></span>`;
    b.addEventListener('click', () => flightSelect(k));
    u.el = b; u.st = b.querySelector('.cs b'); u.em = b.querySelector('.cs em'); box_.appendChild(b); });
}
function flightSelect(k){
  const F = FLIGHT; if (!F.on) return;
  F.sel = F.sel === k ? null : k;
  F.units.forEach((u, i) => u.el.classList.toggle('sel', i === F.sel));
  if (F.sel != null){ const u = F.units[F.sel]; cineText(u.name + ' · ' + u.role); F.capT = F.t + 2.5; }
}
function flightTap(cx, cy){
  const F = FLIGHT; if (!F.on) return;
  ndc.set(cx/innerWidth*2-1, -(cy/innerHeight)*2+1); ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObjects(F.helis.filter(h => h.unit != null).map(h => h.g), true)[0];
  if (hit){ let o = hit.object; while (o && !F.helis.some(h => h.g === o)) o = o.parent; const h = F.helis.find(h => h.g === o); if (h) flightSelect(h.unit); }
  else { let best = null, bd = 1.4; for (const m of F.men){ if (m.unit == null) continue; const v = new T.Vector3(m.x, m.y + .8, m.z).project(cam), d = Math.hypot((v.x - ndc.x)*innerWidth, (v.y - ndc.y)*innerHeight)/40; if (d < bd){ bd = d; best = m; } }
    if (best) flightSelect(best.unit); }
}
function unitStatus(F, u){
  const h = u.helis[0], all = s => u.helis.every(s), any = s => u.helis.some(s);
  if (u.helis[0].lb){ if (all(h => h.pax && h.pax.every(p => p.gone))) return 'Desplegados'; if (any(h => h.landed)) return 'Desembarcando'; }
  else { if (h.doneT) return 'Desplegados'; if (h.ropeT) return 'Cuerdas'; }
  if (any(h => h.state === 'approach')) return 'Aproximación';
  if (any(h => h.state === 'form')) return 'En vuelo';
  if (any(h => h.state === 'lift')) return 'Despegando';
  return any(h => h.rs > .05) ? 'Arrancando' : 'En tierra';
}
function updUnits(F, dt){
  for (const u of F.units){ u.helis.forEach((h, i) => { const r = u.rings[i]; r.visible = F.sel === F.units.indexOf(u) && !(h.lb && h.unload);
    if (r.visible){ r.position.set(h.x, h.y + .15, h.z); r.scale.setScalar(h.lb ? 4.6 : 7.2); r.material.opacity = .55 + Math.sin(F.t*5)*.2; } }); }
  F.cardT = (F.cardT || 0) - dt; if (F.cardT > 0) return; F.cardT = .25;
  for (const u of F.units){ const sp = u.helis.reduce((a, h) => a + Math.hypot(h.vx, h.vz), 0)/u.helis.length, alt = u.helis.reduce((a, h) => a + h.y, 0)/u.helis.length;
    u.st.textContent = L(unitStatus(F, u)); u.em.textContent = sp > 1 ? Math.round(sp*1.5*1.944) + ' kn' : ''; }
}
function unitCentre(F, k){
  const u = F.units[k], men = F.men.filter(m => m.unit === k && m.mode !== 'slide');
  const pts = men.length >= (u.helis[0].lb ? 4 : 3) ? men.map(m => [m.x, m.y, m.z]) : u.helis.map(h => [h.x, h.y, h.z]);
  const c = [0, 0, 0]; for (const p of pts){ c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } return c.map(v => v/pts.length);
}
/* Struecker's column leaves the base with the helicopters and takes the airport road; the formation flies over it */
function flightConvoy(F){
  baseConvoyShow(false);
  const pts = [AIRP(91, -106), AIRP(178, -105), AIRP(225, -105)].concat(ROADS[0].pts.slice(2, 5));
  const cum = [0]; for (let k=1;k<pts.length;k++) cum.push(cum[k-1] + Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]));
  F.cpath = { pts, cum };
  F.convoy = [0, 0, 1, 0, 1, 0].map((kind, k) => { const v = irVehicle(kind ? 'm' : 'h'); v.s = 9 + 9*k; return v; });
  F.cv = 0; flightConvoyStep(F, 0);
}
function flightConvoyStep(F, dt){
  F.cv += (clamp((F.t - 3)/6, 0, 1)*7.5 - F.cv)*Math.min(1, dt*1.5);
  for (const v of F.convoy){ v.s += F.cv*dt;
    const [x, z, hd] = polyAt(F.cpath, Math.min(v.s, F.cpath.cum[F.cpath.cum.length-1]));
    v.g.position.set(x, F.cv > .5 ? Math.sin(F.t*14 + v.s)*.02 : 0, z);
    let d = hd - v.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.g.rotation.y += d*Math.min(1, dt*4);
    if (dt === 0) v.g.rotation.y = hd; }
  if (!F.said.cv && F.convoy.some(v => Math.hypot(v.g.position.x - F.helis[0].x, v.g.position.z - F.helis[0].z) < 40)){ F.said.cv = 1;
    say('Sgto. Struecker', 'Columna en la carretera del aeropuerto. Ahí van los pájaros, justo encima.', 'convoy'); }
}
/* plenty of people in the streets round the target, and along the last of the route; when the helicopters come down to a hover everyone runs indoors */
function flightCivs(F){
  const P = F.plan, spots = [];
  for (let n=0;n<600 && spots.length<30;n++){ const a = rnd()*6.283, d = rr(12, 55), i = Math.floor(P.cx + Math.cos(a)*d), j = Math.floor(P.cz + Math.sin(a)*d);
    if (walk(i, j) && !spots.some(s => Math.hypot(s[0]-i, s[1]-j) < 3)) spots.push([i, j]); }
  for (let s=F.L - 430; s<F.L - 40; s+=6){ const [x, z] = polyAt(F, s), i = Math.floor(x + rr(-16, 16)), j = Math.floor(z + rr(-16, 16)); if (walk(i, j)) spots.push([i, j]); }
  for (const [i, j] of spots) civs.push(makeCiv(i, j));
}
function flightPanic(F, dt){
  F.panT = (F.panT || 0) - dt;
  if (F.panT <= 0){ F.panT = .8;
    for (const h of F.helis){ if (h.gone || h.y > 26 || !(h.state === 'approach' || h.state === 'form')) continue;
      const i = Math.floor(h.x), j = Math.floor(h.z); if (!inB(i, j)) continue; addNoise(h.x, h.z, h.state === 'approach' ? 34 : 18); } }
  updCivs(dt);
}
function startFlight(opts){
  const pts = ireneRoute();
  const cum = [0]; for (let k=1;k<pts.length;k++) cum.push(cum[k-1] + Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]));
  const plan = irenePlan(), depYaw = AIR_RY + PH;
  FLIGHT = { on:true, t:0, s:0, pts, cum, L:cum[cum.length-1], helis:[], men:[], ropes:[], plan, hold:0, endT:null, cam:null, used:{ corner:[] }, mis:!!(opts && opts.mis), attract:!!(opts && opts.attract), said:{}, uyaw:0, uz:1, yaw0:AIR_RY + Math.PI + .7, hdU:null };
  // slots in the loose formation: [along the route, to the right, altitude]; the Little Birds lead
  const LBS = [[16,-7,10],[16,7,11],[26,-13,12],[26,13,11]], BHS = [[0,-9,20],[0,9,21],[-13,-17,22],[-13,17,21]];
  const roles = { lb:['street','street','street','roof'], bh:['corner','corner','corner','corner'] };
  let n = 0;
  const mk = (h, lb, k, slot, role) => {
    const u = lb ? LBROW.u + k*LBROW.step : BHROW.u + k*BHROW.step, v = lb ? LBROW.v : BHROW.v, p = AIRP(u, v);
    Object.assign(h, { lb, slot, role, home:p, uv:[u, v], x:p[0], y:0, z:p[1], vx:0, vy:0, vz:0, yaw:AIR_RY, roll:0, pitch:0, rs:0,
      spool: n*.3 + rr(0, .4), lift: (lb ? 5.2 : 7.4) + k*.45 + rr(0, .4), state:'parked', ph:[0,0,0,0,0,0].map(() => rr(0, 6.283)), fq:[rr(.15, .25), rr(.45, .7), rr(.12, .2), rr(.32, .5), rr(.9, 1.3)] });
    h.join = h.lift + 3.2 + rr(0, .6); h.g.position.set(p[0], 0, p[1]); h.g.rotation.set(0, AIR_RY, 0); n++; FLIGHT.helis.push(h); };
  for (let k=0;k<4;k++){ const lb = littleBird(); world.add(lb.g); mk({ g:lb.g, rotor:lb.rotor, tail:lb.tail }, true, k, LBS[k], roles.lb[k]); }
  for (let k=0;k<4;k++) mk(makeHeliObj(), false, k, BHS[k], roles.bh[k]);
  if (FLIGHT.mis) boardSetup(FLIGHT);                                   // the mission opens with the aircraft empty: the chalks run out and board
  else for (const h of FLIGHT.helis){ if (h.lb) loadLB(h); else if (h.role === 'corner') loadBH(h); }
  smokeColumns(FLIGHT);
  flightUnits(FLIGHT);
  if (FLIGHT.mis){ flightConvoy(FLIGHT); flightCivs(FLIGHT); }
  FLIGHT.depYaw = depYaw;
  if (FLIGHT.attract) return;
  $('overlay').hidden = true; document.body.classList.add('cine'); $('bSkip').hidden = false; $('cine').hidden = false;
  const c0 = AIRP(-125, -58); camS.tx = c0[0]; camS.tz = c0[1]; camS.zoomT = camS.zoom = 15; camS.yawT = camS.yaw = FLIGHT.yaw0;
  if (!AC) initAudio(); else if (AC.state === 'suspended') AC.resume(); startRotorSound();
  if (FLIGHT.board){ const c1 = AIRP(-131, -106); camS.tx = c1[0]; camS.tz = c1[1]; camS.zoomT = camS.zoom = 13; cineText('Operación Irene · 15:32 · Rangers y Delta corren a los helicópteros'); }
  else cineText('Operación Irene · 15:32 · arrancan los rotores en el aeródromo');
}
function cineText(t){ $('cine').textContent = t; }
/* ---------- Irene: boarding. The aircraft sit cold and empty on the line; each chalk runs out of its hangar in two loose files
   toward its own Black Hawk, round the tail and in from the side. The chalk leader stands by the door waving them in and boards last;
   the men for the inside seats climb in, the door men turn their backs to the sill and sit down into it. The Delta teams run on
   through the Black Hawk row to the Little Birds and sit straight onto the benches, one pair a side. Then the flight goes as before. */
const BOARD_J = ['body','pelvis','abd','chest','neck','head','shL','elL','wrL','shR','elR','wrR','hipL','knL','anL','hipR','knR','anR'];
function boardSetup(F){
  const B = F.board = { on:true, t:0, men:[], endT:null, said:{} };
  for (const h of F.helis){ h.g.updateMatrixWorld(true); const e = h.g.matrixWorld.elements, sx = Math.hypot(e[0], e[2]) || 1, sz = Math.hypot(e[8], e[10]) || 1;
    h.ex = [e[0]/sx, e[2]/sx]; h.ez = [e[8]/sz, e[10]/sz]; h.pax = []; h.bSide = { '-1':[], '1':[] }; h.yawW = h.g.rotation.y; }
  const HP = (h, a, b) => [h.home[0] + h.ex[0]*a + h.ez[0]*b, h.home[1] + h.ex[1]*a + h.ez[1]*b];        // a: to the aircraft's right, b: toward its nose (world units)
  const bhs = F.helis.filter(h => !h.lb);
  const hangU = u => u < -131 ? -150 : -112;
  const spawn = (h, look, S, seat, wp, o) => {
    const m = addMan(F, look, S[0], 0, S[1], Math.atan2(h.ez[0], h.ez[1]), 'board', Object.assign({ bh:h, seat, wp, wi:0, st:'wait', spdB:0, dir:[h.ez[0], h.ez[1]], mprog:0,
      vmax:rr(3.35, 4.35), vf:rr(.5, 1.1), vp:rr(0, 6.28), ny:rr(-.4, .4) }, o));
    const r = m.m; r.rest = { px:r.pelvis.position.x, py:r.pelvis.position.y, pz:r.pelvis.position.z, bx:r.body.position.x, by:r.body.position.y, bz:r.body.position.z };
    B.men.push(m); return m; };
  B.runIn = true;
  bhs.forEach((h, k) => {
    if (h.role !== 'corner') return;
    const u0 = clamp(h.uv[0], hangU(h.uv[0]) - 10, hangU(h.uv[0]) + 10), sL = k % 2 ? 1 : -1, t0 = k*.45 + rr(0, .3);
    const from = (s, row) => { const q = AIRP(u0, -124.5 - row*1.75 + rr(-.25, .25)); return [q[0] + h.ex[0]*s*(1.05 + rr(-.2, .2)), q[1] + h.ex[1]*s*(1.05 + rr(-.2, .2))]; };
    const route = (s, last) => [HP(h, s*(4.3 + rr(-.5, .5)), -10 + rr(-1, 1)), HP(h, s*(3.3 + rr(-.3, .3)), -1.2 + rr(-.4, .4)), last];
    for (const s of [-1, 1]){
      const seats = [{ lx:s*.3, lz:2.25, inner:true }, { lx:s*.9, lz:1.82 }, { lx:s*.9, lz:2.68 }];
      seats.forEach((st, r) => { st.s = s; st.ly = -.03; st.dur = st.inner ? 2.1 : 1.75;
        st.D = st.inner ? HP(h, s*1.32, 1.5) : HP(h, s*(st.lx*s/1.5 + .78), st.lz/1.5);
        const lead = s === sL && r === 2;
        const hold = lead ? HP(h, s*1.7, 2.9) : r === 0 ? st.D : HP(h, s*(1.95 + .5*r), 1.45 - 1.3*r);
        const m = spawn(h, 'ranger', lead ? (() => { const q = AIRP(u0, -122.6); return [q[0], q[1]]; })() : from(s, r), st, route(s, hold),
          { lead, delay: lead ? t0 : t0 + .35 + r*.32 + rr(0, .25), rank:r });
        if (lead){ m.vmax = rr(4.3, 4.6); m.lookAt = HP(h, s*4.5, -7); }
        h.bSide[s].push(m); });
    }
  });
  F.helis.filter(h => h.lb).forEach((h, k) => {
    const u0 = clamp(h.uv[0], hangU(h.uv[0]) - 10, hangU(h.uv[0]) + 10), t0 = k*.3 + rr(0, .3);
    for (const s of [-1, 1]) [-.36, -1.3].forEach((lz, r) => {
      const st = { lx:s*1.27, lz, ly:.03, s, dur:1.6 }; st.D = HP(h, s*(1.27/1.5 + .74), lz/1.5);
      // through the Black Hawk row by the gap nearest to this man's side of his Little Bird
      let lane = null, bd = 1e9; for (const b of bhs) for (const sg of [-1, 1]){ const L_ = HP(b, sg*6.5, 0), d = Math.abs((L_[0] - st.D[0])*h.ex[0] + (L_[1] - st.D[1])*h.ex[1]); if (d < bd){ bd = d; lane = L_; } }
      const jx = rr(-.9, .9), q = AIRP(u0, -103 - r*1.9 + rr(-.3, .3));
      const wp = [[lane[0] + h.ex[0]*jx - h.ez[0]*7, lane[1] + h.ex[1]*jx - h.ez[1]*7], [lane[0] + h.ex[0]*jx + h.ez[0]*7, lane[1] + h.ex[1]*jx + h.ez[1]*7], HP(h, s*(3.1 + rr(-.3, .3)), -4.6 + rr(-.5, .5)), st.D];
      const m = spawn(h, 'delta', [q[0] + h.ex[0]*s*1.0, q[1] + h.ex[1]*s*1.0], st, wp, { delay:t0 + r*.3 + rr(0, .3), rank:0, solo:true });
      h.bSide[s].push(m); });
  });
  boardRunIn(B);
}
// set them off already running: each man starts at full pace, put back along his first leg by the time he would have waited
function boardRunIn(B){
  const T0 = 1.6;                                                          // they came out of the hangar this long before the mission opened
  for (const m of B.men){
    const tg = m.wp[0], dx = tg[0] - m.x, dz = tg[1] - m.z, d = Math.hypot(dx, dz) || 1, ux = dx/d, uz = dz/d, back = (m.delay - T0)*m.vmax;
    m.x -= ux*back; m.z -= uz*back; m.delay = 0; m.st = 'run'; m.spdB = m.vmax*rr(.85, 1); m.dir = [ux, uz]; m.face = Math.atan2(ux, uz);
    m.vx = ux*m.spdB; m.vz = uz*m.spdB; m.m.root.position.set(m.x, 0, m.z); m.m.root.rotation.y = m.face; m.m.prevYaw = m.face; if (m.m.spd != null) m.m.spd = m.spdB; }
}
function boardReady(m){
  if (m.solo) return true;
  const h = m.bh, side = h.bSide[m.seat.s], ok = (o, p) => o.st === 'done' || (o.st === 'mount' && o.mprog >= p);
  for (const o of side){ if (o === m) break; if (!ok(o, .55)) return false; }
  if (m.lead) for (const o of h.bSide[-m.seat.s]) if (!ok(o, .3)) return false;      // the chalk leader counts the last man in before he gets on
  return true;
}
// key poses for getting in: [progress, { 'joint.axis': angle, py: pelvis height }]; anything not named is at rest
function boardKeys(m){
  const r = m.m, py0 = r.rest.py, sy = r.model ? .52/SOLD_K : py0*.62, ny = m.ny;
  const seat = { 'hipL.x':-1.45, 'hipR.x':-1.45, 'knL.x':1.25, 'knR.x':1.4, 'hipL.z':.12, 'hipR.z':-.12, 'shR.x':-.5, 'elR.x':-1.0, 'shL.x':-.65, 'elL.x':-1.1, 'neck.y':ny, py:sy };
  if (m.seat.inner) return [                                   // up over the sill, a hand on the frame, duck in, turn round and sit
    [.14, { 'chest.x':.18, 'hipL.x':-.5, 'knL.x':.7, 'shL.x':-1.2, 'elL.x':-.5, 'shR.x':-.4, 'elR.x':-1.2, py:py0 - .02 }],
    [.34, { 'chest.x':.4, 'hipL.x':-1.35, 'knL.x':1.55, 'hipR.x':.25, 'knR.x':.25, 'shL.x':-2.1, 'elL.x':-.35, 'shR.x':-.4, 'elR.x':-1.2, 'neck.x':-.2, py:py0 + .04 }],
    [.55, { 'chest.x':.55, 'abd.x':.25, 'hipL.x':-1.0, 'knL.x':1.35, 'hipR.x':-.85, 'knR.x':1.45, 'shL.x':-1.3, 'elL.x':-.8, 'shR.x':-.4, 'elR.x':-1.2, py:py0 - .1 }],
    [.8, { 'chest.x':.3, 'hipL.x':-1.25, 'hipR.x':-1.3, 'knL.x':1.4, 'knR.x':1.45, 'shL.x':.35, 'elL.x':-.3, 'shR.x':-.45, 'elR.x':-1.1, 'neck.y':ny*.5, py:sy + .1 }],
    [.93, Object.assign({}, seat, { py:sy - .025, 'chest.x':.07, 'hipL.x':-1.5, 'hipR.x':-1.5 })], [1, seat]];
  return [                                                     // turn his back to the door, a hand down on the floor, and sit back into it
    [.2, { 'chest.x':.12, 'hipL.x':-.25, 'knL.x':.45, 'hipR.x':-.1, 'knR.x':.3, 'shR.x':-.45, 'elR.x':-1.2, 'shL.x':.2, 'elL.x':-.3, 'neck.y':.5*m.seat.s, py:py0 - .03 }],
    [.42, { 'chest.x':.42, 'abd.x':.15, 'hipL.x':-.85, 'hipR.x':-.85, 'knL.x':1.15, 'knR.x':1.15, 'shR.x':-.45, 'elR.x':-1.25, 'shL.x':.95, 'elL.x':-.25, 'neck.x':-.25, py:py0 - .13 }],
    [.62, { 'chest.x':.3, 'hipL.x':-1.2, 'hipR.x':-1.25, 'knL.x':.8, 'knR.x':.7, 'shR.x':-.45, 'elR.x':-1.2, 'shL.x':.75, 'elL.x':-.5, py:sy + .12 }],
    [.8, { 'chest.x':.1, 'hipL.x':-1.55, 'hipR.x':-1.5, 'knL.x':1.05, 'knR.x':1.2, 'hipL.z':.1, 'hipR.z':-.1, 'shR.x':-.5, 'elR.x':-1.1, 'shL.x':.25, 'elL.x':-.7, py:sy - .03 }],
    [.92, Object.assign({}, seat, { py:sy + .012, 'chest.x':-.06, 'knL.x':1.4, 'knR.x':1.5 })], [1, seat]];
}
function boardMountStart(m){
  const r = m.m, snap = {};
  for (const j of BOARD_J){ const q = r[j].rotation; snap[j + '.x'] = q.x; snap[j + '.y'] = q.y; snap[j + '.z'] = q.z; }
  snap.py = r.pelvis.position.y;
  m.keys = [[0, snap]].concat(boardKeys(m)); m.st = 'mount'; m.mprog = 0; m.moving = false; m.vx = m.vz = 0;
  m.r0 = [m.x, m.z]; m.yaw0 = r.root.rotation.y; m.p0 = [r.pelvis.position.x, r.pelvis.position.z, r.body.position.x, r.body.position.y, r.body.position.z, r.body.rotation.x, r.body.rotation.y, r.body.rotation.z];
}
function boardMount(m, dt){
  const r = m.m, h = m.bh, st = m.seat, ss = t => { t = clamp(t, 0, 1); return t*t*(3 - 2*t); };
  m.mprog = Math.min(1, m.mprog + dt/st.dur); const p = m.mprog;
  // the pose, between the two keys either side of p
  let k = 0; while (k < m.keys.length - 2 && m.keys[k + 1][0] < p) k++;
  const A = m.keys[k], Bk = m.keys[k + 1], f = ss((p - A[0])/Math.max(1e-4, Bk[0] - A[0])), py0 = r.rest.py;
  for (const j of BOARD_J){ const q = r[j].rotation, g = ax => { const n = j + '.' + ax, a = A[1][n] || 0, b = Bk[1][n] || 0; return a + (b - a)*f; }; q.set(g('x'), g('y'), g('z')); }
  const pa = A[1].py != null ? A[1].py : py0, pb = Bk[1].py != null ? Bk[1].py : py0, e0 = 1 - ss(p/.25);
  r.pelvis.position.set(r.rest.px + (m.p0[0] - r.rest.px)*e0, pa + (pb - pa)*f, r.rest.pz + (m.p0[1] - r.rest.pz)*e0);
  r.body.position.set(r.rest.bx + (m.p0[2] - r.rest.bx)*e0, r.rest.by + (m.p0[3] - r.rest.by)*e0, r.rest.bz + (m.p0[4] - r.rest.bz)*e0);
  r.body.rotation.set(m.p0[5]*e0, m.p0[6]*e0, m.p0[7]*e0);
  // where he is: from where he stood, to the sill, into the seat
  const S_ = [h.home[0] + (h.ex[0]*st.lx + h.ez[0]*st.lz)/1.5, h.home[1] + (h.ex[1]*st.lx + h.ez[1]*st.lz)/1.5];
  const sill = st.inner ? [h.home[0] + h.ex[0]*st.s*.66 + h.ez[0]*1.5, h.home[1] + h.ex[1]*st.s*.66 + h.ez[1]*1.5] : [S_[0] + h.ex[0]*st.s*.3, S_[1] + h.ex[1]*st.s*.3];
  const t1 = st.inner ? .36 : .46, t2 = st.inner ? .62 : .8, a1 = ss(p/t1), a2 = ss((p - t1)/(t2 - t1));
  const x = (m.r0[0] + (sill[0] - m.r0[0])*a1)*(1 - a2) + S_[0]*a2, z = (m.r0[1] + (sill[1] - m.r0[1])*a1)*(1 - a2) + S_[1]*a2;
  const yOut = h.yawW + st.s*PH, dAng = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  let yaw;
  if (st.inner){ const yIn = yOut + Math.PI; yaw = p < .46 ? m.yaw0 + dAng(m.yaw0, yIn)*ss(p/.16) : yIn - st.s*Math.PI*ss((p - .46)/.34); }
  else { const d = dAng(m.yaw0, yOut), dd = Math.abs(d) > 2.6 ? st.s*-Math.abs(d) : d; yaw = m.yaw0 + dd*ss(p/.36); }
  m.x = x; m.z = z; m.y = (st.ly/1.5)*ss((p - t1)/(t2 - t1));
  r.root.position.set(x, m.y, z); r.root.rotation.y = yaw;
  if (p >= 1) boardSeat(m);
}
function boardSeat(m){
  const r = m.m, h = m.bh, st = m.seat;
  if (m.st !== 'mount'){ boardMountStart(m); }
  const last = m.keys[m.keys.length - 1][1];
  for (const j of BOARD_J) r[j].rotation.set(last[j + '.x'] || 0, last[j + '.y'] || 0, last[j + '.z'] || 0);
  r.pelvis.position.set(r.rest.px, last.py, r.rest.pz); r.body.position.set(r.rest.bx, r.rest.by, r.rest.bz); r.body.rotation.set(0, 0, 0);
  h.g.add(r.root); r.root.scale.setScalar(1.5); r.root.position.set(st.lx, st.ly, st.lz); r.root.rotation.set(0, st.s*PH, 0); r.gun.visible = false;
  h.pax.push({ rig:r, look:m.look || (h.lb ? 'delta' : 'ranger'), side:st.s });
  m.st = 'done'; m.mprog = 1; const i = FLIGHT.men.indexOf(m); if (i >= 0) FLIGHT.men.splice(i, 1);
}
function boardStep(F, dt){
  const B = F.board; B.t += dt;
  if (!B.warm){ B.warm = 1; for (const m of B.men){ m.moving = true; m.m.spd = m.spdB; for (let k=0;k<6;k++) animRig(m, 1/30); } }
  const act = B.men.filter(m => m.st !== 'done');
  for (const m of act){
    m.bmov = false;
    if (m.st === 'wait'){ if (B.t >= m.delay) m.st = 'run'; continue; }
    if (m.st === 'run' || m.st === 'todoor'){
      const tg = m.wp[m.wi], last = m.wi === m.wp.length - 1, dx = tg[0] - m.x, dz = tg[1] - m.z, d = Math.hypot(dx, dz) || 1e-4;
      const vm = m.st === 'todoor' ? 2.2 : m.vmax*(1 + .07*Math.sin(B.t*m.vf + m.vp)), vt = last ? Math.min(vm, Math.sqrt(2*4.5*d) + .2) : vm;
      m.spdB += clamp(vt - m.spdB, -10*dt, 4.5*dt);
      if (d < (last ? .1 : 1.1)){
        if (!last){ m.wi++; }
        else if (m.st === 'todoor'){ boardMountStart(m); continue; }
        else { m.st = m.lead ? 'lead' : 'hold'; m.spdB = 0; } }
      else { const k = last && d < .7 ? 1 : Math.min(1, dt*5.5); m.dir[0] += (dx/d - m.dir[0])*k; m.dir[1] += (dz/d - m.dir[1])*k; const n = Math.hypot(m.dir[0], m.dir[1]) || 1; m.dir[0] /= n; m.dir[1] /= n;
        const st = Math.min(d, m.spdB*dt); m.x += m.dir[0]*st; m.z += m.dir[1]*st; m.vx = m.dir[0]*m.spdB; m.vz = m.dir[1]*m.spdB; m.face = Math.atan2(m.dir[0], m.dir[1]); m.bmov = m.spdB > .3; }
    }
    if (m.st === 'hold' || m.st === 'lead'){
      const D = m.seat.D, dd = Math.hypot(D[0] - m.x, D[1] - m.z);
      m.face = m.st === 'lead' ? Math.atan2(m.lookAt[0] - m.x, m.lookAt[1] - m.z) : Math.atan2(m.bh.home[0] - m.x, m.bh.home[1] - m.z);
      if (boardReady(m)){ if (dd > .12){ m.st = 'todoor'; m.wp = [D]; m.wi = 0; } else { m.face = Math.atan2(m.bh.home[0] - m.x, m.bh.home[1] - m.z); boardMountStart(m); } }
    }
  }
  // nobody runs through anybody
  for (let i=0;i<act.length;i++){ const a = act[i]; if (a.st !== 'run') continue;
    for (let j=i+1;j<act.length;j++){ const b = act[j]; if (b.st !== 'run') continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < .85 && d > 1e-3){ const q = (.85 - d)*.5*Math.min(1, dt*8); a.x -= dx/d*q; a.z -= dz/d*q; b.x += dx/d*q; b.z += dz/d*q; } } }
  // the crews start the engines on the music's 0:30 (or a few seconds in without it), whoever is still running
  { const go = B.t >= CI_ROT; if (B.t >= CI_ROT - 7) cmusStart();             // the music comes in 7 s before the engines
    if (go && B.rotT == null){ B.rotT = B.t; say('Super 6-1', 'Arrancando motores.', 'air'); cmusStart(); }
    let rsSum = 0;
    for (const h of F.helis){ const x = B.rotT == null ? 0 : clamp((B.t - B.rotT - h.spool)/5.5, 0, 1); h.rs = x*x*(3 - 2*x); rsSum += h.rs;
      h.rotor.rotation.y += dt*(h.lb ? 26 : 17)*h.rs; if (h.tail) h.tail.rotation.x += dt*42*h.rs; if (h.rs > .05) rotorWash(h.x, h.z, 0, dt, (h.lb ? .6 : 1)*h.rs); }
    if (AC && rotorGain) rotorGain.gain.setTargetAtTime(soundOn ? .55*rsSum/F.helis.length : 0, AC.currentTime, .2); }
  updMen(F, dt);
  for (const m of act){
    if (m.st === 'mount') boardMount(m, dt);
    else if (m.st === 'lead'){ const r = m.m, w = Math.sin(B.t*6.5 + m.vp);                 // «¡vamos, vamos!»: the arm on the door side windmills them in
      const sh = m.seat.s > 0 ? r.shL : r.shR, el = m.seat.s > 0 ? r.elL : r.elR; sh.rotation.x = -1.35 + .55*w; sh.rotation.z = (m.seat.s > 0 ? 1 : -1)*.25; el.rotation.x = -.9 - .45*Math.sin(B.t*6.5 + m.vp + 1.2); }
  }
  const once = (k, c, fn) => { if (!B.said[k] && c){ B.said[k] = 1; fn(); } };
  once('a', B.t > .6, () => say('Uniform 6-4', 'Tenemos la palabra clave. ¡Todo el mundo a los helicópteros!', 'hq', true));
  once('b', B.t > 7, () => say('Romeo 6-4', '¡Vamos, vamos! ¡Cada uno a su pájaro, por los lados, lejos del rotor de cola!', 'hq'));
  once('c', B.men.some(m => m.lead && m.st === 'mount'), () => say('Super 6-1', 'Los jefes de equipo cuentan al último y suben. Listos para arrancar.', 'air'));
  // the camera goes with the runners, then settles on the flight line
  { let cx = 0, cz = 0, n = 0; for (const m of act){ cx += m.x; cz += m.z; n++; }
    const hc = AIRP(-134, -62), w = n ? clamp(B.t/16, 0, 1)*.6 : 1; if (n){ cx /= n; cz /= n; } else { cx = hc[0]; cz = hc[1]; }
    const fx = cx*(1 - w) + hc[0]*w, fz = cz*(1 - w) + hc[1]*w, a = Math.min(1, dt*1.8);
    if (F.sel != null){ const c = unitCentre(F, F.sel); camS.tx += (c[0] - camS.tx)*Math.min(1, dt*4); camS.tz += (c[2] - camS.tz)*Math.min(1, dt*4); camS.zoomT = clamp(8*F.uz, 4, 30); }
    else { camS.tx += (fx - camS.tx)*a; camS.tz += (fz - camS.tz)*a; camS.zoomT = clamp(13.5*F.uz, 4, 30); }
    camS.yawT = F.yaw0 + F.uyaw; }
  if (!act.length && B.endT == null) B.endT = B.t;
  if (B.t > 55) for (const m of act) boardSeat(m);                                        // never leave the flight waiting
  if (B.endT != null && B.rotT == null && B.t > B.endT + 20){ B.rotT = B.t; cmusStart(); }
  if (B.endT != null && B.t > B.endT + .9 && B.rotT != null && B.t > B.rotT + 4){ B.on = false;
    // F.t restarts at 0: the rotors keep the speed they already have
    for (const h of F.helis) h.spool -= B.t - B.rotT;
    cineText('Operación Irene · 15:32 · arrancan los rotores en el aeródromo'); }
}
let ROPE_GEO = null, ROPE_MAT = null;
function ropeMesh(){ if (!ROPE_GEO){ ROPE_GEO = new T.CylinderGeometry(.035, .035, 1, 5); ROPE_GEO.translate(0, -.5, 0); ROPE_MAT = new T.MeshLambertMaterial({ color:0x2a2622 }); }
  const r = new T.Mesh(ROPE_GEO, ROPE_MAT); r.castShadow = true; world.add(r); return r; }
function heliTarget(F, h){
  // where this aircraft wants to be now, and how fast that point is moving
  const t = F.t;
  if (h.state === 'parked' || h.state === 'lift'){ return [h.home[0], h.state === 'lift' ? 2.6 : 0, h.home[1], 0, 0, 0]; }
  if (h.state === 'form'){
    const along = h.slot[0] + 3.2*Math.sin(t*h.fq[0] + h.ph[0]) + 1.4*Math.sin(t*h.fq[1] + h.ph[1]);
    const lat = h.slot[1] + 2.6*Math.sin(t*h.fq[2] + h.ph[2]) + 1.1*Math.sin(t*h.fq[1]*1.3 + h.ph[3]);
    const alt = h.slot[2] * clamp((t - h.join)/6, .25, 1) + 1.7*Math.sin(t*h.fq[3] + h.ph[4]) + .7*Math.sin(t*h.fq[4] + h.ph[5]);
    const s = F.s + along, [px, pz, hd] = polyAt(F, s), c = Math.cos(hd), sn = Math.sin(hd);
    return [px + c*lat, alt, pz - sn*lat, sn*F.v, 0, c*F.v];
  }
  if (h.state === 'leave'){ const P = F.plan; return [P.cx + h.leaveDir[0]*600, 36, P.cz + h.leaveDir[1]*600, 0, 0, 0]; }
  const d = h.dest;
  if (h.role === 'orbit'){ const th = d.th0 + d.w*(t - d.t0), R = d.R + 4*Math.sin(t*.21 + h.ph[0]);
    return [d.x + Math.sin(th)*R, d.y + 1.5*Math.sin(t*.37 + h.ph[1]), d.z + Math.cos(th)*R, Math.cos(th)*R*d.w, 0, -Math.sin(th)*R*d.w]; }
  const dh = Math.hypot(d.x - h.x, d.z - h.z);
  const y = d.hover === 0 && dh < 2 ? d.y - .5 : d.y + d.hover + clamp((dh - 5)/45, 0, 1)*(h.lb ? 9 : 8);
  return [d.x, y, d.z, 0, 0, 0];
}
function assignDest(F, h){
  const P = F.plan;
  if (h.role === 'corner'){ let best = -1, bd = 1e9; P.corners.forEach((c, k) => { if (F.used.corner.includes(k)) return; const d = Math.hypot(c[0] - h.x, c[1] - h.z); if (d < bd){ bd = d; best = k; } });
    F.used.corner.push(best); h.corner = best; const c = P.corners[best]; h.dest = { x:c[0], z:c[1], y:P.gY(c[0], c[1]), hover:12.5 + rr(-.6, .6) }; }
  else if (h.role === 'street'){ const c = P.street.shift(); h.dest = { x:c[0], z:c[1], y:0, hover:0 }; }
  else if (h.role === 'roof'){ h.dest = { x:P.roof[0], z:P.roof[1], y:P.roof[2], hover:0 }; }
  else { const k = h.orbitK || 0; h.dest = { x:P.cx, z:P.cz, y:32 + k*4, R:52 + k*10, w:(k ? -1 : 1)*.27, t0:F.t, th0:Math.atan2(h.x - P.cx, h.z - P.cz) + (k ? -.4 : .4) }; }
  h.holdYaw = Math.atan2(h.dest.x - h.x, h.dest.z - h.z);
  if (h.role === 'street') h.holdYaw = Math.PI;                                 // nose up the street, north
}
function addMan(F, look, x, y, z, face, mode, extra, rig){
  if (rig){ rig.gun.visible = true; rig.root.scale.setScalar(1); for (const j of ['hipL','hipR','knL','knR','shL','shR','elL','elR','neck']) rig[j].rotation.set(0, 0, 0); }
  else rig = buildRig(look, { gun: look === 'delta' ? 'car' : 'm16' });
  world.add(rig.root); rig.root.position.set(x, y, z); rig.root.rotation.set(0, face, 0);
  const m = Object.assign({ team:'us', x, z, y, vx:0, vz:0, face, alive:true, down:false, hp:100, hp0:100, sup:0, pinned:false, stance:'stand', moving:false, path:[], order:null, auto:null,
    firing:0, reloading:false, healing:false, talkT:0, m:rig, mode, t:0 }, extra || {});
  F.men.push(m); return m;
}
function updMen(F, dt){
  for (const m of F.men){
    if (m.st === 'mount') continue;                    // boarding: driven by boardMount
    m.t += dt; let moving = false;
    if (m.mode === 'board') moving = !!m.bmov;
    if (m.mode === 'slide'){ m.ropeV = ropeSpeed(m.ropeV, m.y - m.gy, dt); m.y = Math.max(m.gy, m.y - dt*m.ropeV); if (m.y <= m.gy){ m.mode = 'land'; m.t = 0; m.landT = .55; m.ropeV = 0; } }
    else if (m.mode === 'land'){ if (m.t > .5){ m.mode = 'off'; m.t = 0; } }
    else if (m.mode === 'off'){ const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
      if (d > .25){ const s = Math.min(d, dt*2.4); m.vx = dx/d*2.4; m.vz = dz/d*2.4; m.x += dx/d*s; m.z += dz/d*s; moving = true; m.face = Math.atan2(dx, dz); }
      else { m.mode = 'cover'; m.stance = FLIGHT.mis ? 'stand' : 'crouch'; m.face = m.look; } }
    if (!moving){ m.vx *= .8; m.vz *= .8; }
    m.moving = moving;
    const r = m.m.root; r.position.set(m.x, m.y, m.z);
    let df = m.face - r.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); r.rotation.y += clamp(df*Math.min(1, dt*8), -dt*8, dt*8);
    animRig(m, dt);
  }
}
function flightRadio(F){
  const once = (k, c, fn) => { if (!F.said[k] && c){ F.said[k] = 1; fn(); } };
  const [px, pz] = polyAt(F, F.s), arrived = F.helis.some(h => h.state === 'approach'), roping = F.helis.some(h => h.ropeT);
  once('a', F.t > .8, () => say('Uniform 6-4', 'Todas las estaciones, aquí Uniform 6-4. Luz verde. Arrancad.', 'hq'));
  once('b', F.t > 5.5, () => say('Star 4-1', 'Star 4-1, en el aire. Los cuatro pájaros pequeños delante.', 'air'));
  once('c', F.t > 9, () => say('Super 6-1', 'Super 6-1 despegando. Super 6-4 conmigo, a la cola.', 'air'));
  once('d', F.t > 16, () => say('Uniform 6-4', 'Rumbo norte por la costa. Mantened la separación.', 'hq'));
  once('e', VILLAGES.some(v => Math.hypot(px - v.x, pz - v.z) < v.r + 40), () => say('Super 6-2', 'Pasando sobre los pueblos. Hay gente en los tejados mirando hacia arriba.', 'air'));
  once('f', F.smoke && F.smoke.some(e => Math.hypot(e.x - px, e.z - pz) < 110), () => say('Super 6-4', 'Neumáticos ardiendo delante. Saben que venimos.', 'air'));
  once('g', F.L - F.s < 150, () => say('Uniform 6-4', 'Un minuto. Un minuto.', 'hq'));
  once('h', arrived, () => say('Uniform 6-4', '¡Irene! ¡Irene! ¡Irene!', 'hq', true));
  once('i', F.helis.some(h => h.lb && h.landed), () => say('Star 4-1', 'Star 4-1 en el suelo, en la calle frente al objetivo.', 'air'));
  once('j', roping, () => say('Super 6-3', '¡Cuerdas fuera! Romeo en el suelo.', 'air'));
  once('k', F.helis.some(h => h.role === 'roof' && h.landed), () => say('Star 4-4', 'Star 4-4 posado en la azotea del hotel.', 'air'));
  once('l', F.helis.some(h => h.state === 'leave'), () => say('Super 6-1', 'Super 6-1 y 6-4 en órbita sobre el objetivo. Os cubrimos desde arriba.', 'air'));
}
function heliStep(F, h, dt){
  const P = F.plan;
  h.rs = clamp((F.t - h.spool)/5.5, 0, 1); h.rs = h.rs*h.rs*(3 - 2*h.rs);
  if (h.state === 'parked' && F.t >= h.lift) h.state = 'lift';
  if (h.state === 'lift' && F.t >= h.join) h.state = 'form';
  if (h.state === 'form' && (F.s + h.slot[0] > F.L - 45 || F.s >= F.L - .5)){ h.state = 'approach'; assignDest(F, h); }
  const [tx, ty, tz, tvx, tvy, tvz] = heliTarget(F, h);
  if (h.state !== 'parked'){
    const k = h.state === 'approach' ? 1.1 : 1.6, c = h.state === 'approach' ? 2.1 : 2.4, amax = h.lb ? 16 : 12;
    let ax, az, ay = 2.2*(ty - h.y) + 2.8*(tvy - h.vy);
    if ((h.state === 'approach' || h.state === 'leave') && h.role !== 'orbit'){ // arrive: fly at the speed that still lets it stop on the spot
      const dx = tx - h.x, dz = tz - h.z, dd = Math.hypot(dx, dz) || 1e-4, vd = Math.min(F.mis ? 18 : 30, Math.sqrt(2*amax*.55*dd), dd*.9);
      ax = 2.2*(dx/dd*vd - h.vx); az = 2.2*(dz/dd*vd - h.vz); }
    else { ax = k*(tx - h.x) + c*(tvx - h.vx); az = k*(tz - h.z) + c*(tvz - h.vz); }
    const al = Math.hypot(ax, az); if (al > amax){ ax *= amax/al; az *= amax/al; } ay = clamp(ay, -4, 5);
    h.vx += ax*dt; h.vz += az*dt; h.vy += ay*dt;
    const vh = Math.hypot(h.vx, h.vz), vmax = h.state === 'lift' ? 1.5 : F.mis ? 34 : 56; if (vh > vmax){ h.vx *= vmax/vh; h.vz *= vmax/vh; }
    h.x += h.vx*dt; h.y += h.vy*dt; h.z += h.vz*dt;
    if (h.state === 'approach' && h.dest.hover === 0 && Math.hypot(h.dest.x - h.x, h.dest.z - h.z) < 2 && h.y < h.dest.y + .1){ h.landed = true; }
    if (h.landed && h.state === 'approach'){ h.y = h.dest.y; h.vy = 0; h.vx *= .8; h.vz *= .8; }
    if (h.y < 0){ h.y = 0; h.vy = Math.max(0, h.vy); }
    // heading: sideways on the pad first, then the way it is flying, then the hold heading over the target
    const vh2 = Math.hypot(h.vx, h.vz);
    let want = h.state === 'lift' ? F.depYaw : vh2 > 5 ? Math.atan2(h.vx, h.vz) : h.state === 'approach' ? h.holdYaw : h.yaw;
    if (h.role === 'orbit' && h.state === 'approach') want = Math.atan2(h.vx, h.vz);
    let dy = want - h.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const yr = clamp(dy*1.4, -.9, .9) * (h.state === 'lift' ? .7 : 1); h.yaw += yr*dt;
    // nose down to accelerate, bank into the turns
    const c_ = Math.cos(h.yaw), s_ = Math.sin(h.yaw), fwdA = ax*s_ + az*c_, latA = ax*c_ - az*s_, fwdV = h.vx*s_ + h.vz*c_;
    h.pitch += (clamp(.0035*fwdV + .022*fwdA, -.22, .3) - h.pitch)*Math.min(1, dt*2.5);
    h.roll += (clamp(-latA*.045 - yr*.35, -.5, .5) - h.roll)*Math.min(1, dt*2.5);
    if (h.landed && h.state === 'approach'){ h.pitch *= .9; h.roll *= .9; }
  }
  h.g.position.set(h.x, h.y, h.z); h.g.rotation.set(h.pitch, h.yaw, h.roll, 'YXZ');
  h.rotor.rotation.y += dt * (h.lb ? 26 : 17) * h.rs; if (h.tail) h.tail.rotation.x += dt * 42 * h.rs;
  rotorWash(h.x, h.z, h.y - (h.role === 'roof' && h.dest ? h.dest.y : 0), dt, (h.lb ? .6 : 1) * h.rs);
  // fast-rope: once steady over its corner the Black Hawk drops two ropes and the chalk slides down
  if (h.role === 'corner' && h.state === 'approach' && !h.ropeT && Math.hypot(h.dest.x - h.x, h.dest.z - h.z) < 1.4 && Math.hypot(h.vx, h.vz) < 1.6 && Math.abs(h.y - h.dest.y - h.dest.hover) < 1.6){
    h.ropeT = F.t; h.ropes = [-1, 1].map(s => { const r = ropeMesh(); F.ropes.push(r); return { m:r, s }; }); h.sent = 0; }
  if (h.ropes){ h.g.updateMatrixWorld(true);
    for (const r of h.ropes){ const p = new T.Vector3(r.s*1.35, 2.2, 2.25); h.g.localToWorld(p); r.p = p;
      const gy = P.gY(p.x, p.z), full = p.y - gy, L = full*clamp((F.t - h.ropeT)/1.6, .02, 1); r.m.position.copy(p); r.m.scale.set(1, L, 1); r.gy = gy; }
    if (F.t > h.ropeT + 1.8 && h.sent < 6 && F.t > (h.lastMan || 0) + .75){ h.lastMan = F.t; const r = h.ropes[h.sent % 2];
      const ox = r.p.x - P.cx, oz = r.p.z - P.cz, ol = Math.hypot(ox, oz) || 1, sp_ = 1.5 + (h.sent >> 1)*1.1, side = (h.sent >> 1) % 2 ? 1 : -1;
      const pi = h.pax ? h.pax.findIndex(p => !p.gone && p.side === r.s) : -1, pax = pi >= 0 ? h.pax[pi] : null; if (pax) pax.gone = true;
      const mtx = F.mis ? r.p.x + ox/ol*.9 + rr(-1.1, 1.1) : r.p.x + ox/ol*sp_ - oz/ol*side*1.2*(h.sent >> 1), mtz = F.mis ? r.p.z + oz/ol*.9 + rr(-1.1, 1.1) : r.p.z + oz/ol*sp_ + ox/ol*side*1.2*(h.sent >> 1);
      const fc = rnd()*6.283;
      addMan(F, 'ranger', r.p.x - Math.sin(fc)*.13, r.p.y - .9, r.p.z - Math.cos(fc)*.13, fc, 'slide', { gy:r.gy, tx:mtx, tz:mtz, look:Math.atan2(ox, oz) + side*.5, unit:h.unit }, pax && pax.rig);
      h.sent++; if (h.sent === 6) h.doneT = F.t; } }
  // the Little Birds' Delta operators step off the pods and make for the arcade
  if (h.landed && !h.unload && (h.role === 'street' || h.role === 'roof') && h.pax){ h.unload = F.t; h.g.updateMatrixWorld(true); }
  if (h.unload && h.pax && h.pax.some(p => !p.gone)){ const k = Math.floor((F.t - h.unload - .4)/.35);
    h.pax.forEach((p, i) => { if (p.gone || i > k) return; p.gone = true; const w = new T.Vector3(); p.rig.root.getWorldPosition(w);
      const s = p.side, wo = new T.Vector3(s*2.0, 0, 0).applyAxisAngle(new T.Vector3(0, 1, 0), h.yaw);
      const st = h.role === 'street' && !F.mis, tx = st ? w.x + 3.4 + (i % 2)*.9 : w.x + wo.x*(F.mis ? .7 : 1), tz = st ? w.z + (i - 1.5)*1.3 : w.z + wo.z*(F.mis ? .7 : 1);
      addMan(F, 'delta', w.x + wo.x*.35, h.dest.y, w.z + wo.z*.35, h.yaw + s*PH, 'off', { tx, tz, look: st ? PH : Math.atan2(tx - P.cx, tz - P.cz), unit:h.unit }, p.rig); }); }
  blowSmoke(F, h, dt);

  // once the chalk is down the Black Hawk cuts the ropes and leaves; the Little Birds lift off once their benches are empty
  if (h.role === 'corner' && h.doneT && h.state === 'approach' && F.t > h.doneT + 4.6){
    for (const r of h.ropes || []){ world.remove(r.m); const i = F.ropes.indexOf(r.m); if (i >= 0) F.ropes.splice(i, 1); } h.ropes = null;
    F.orbN = F.orbN || 0; if (F.orbN < 2){ h.orbitK = F.orbN++; h.role = 'orbit'; assignDest(F, h); } else heliLeave(F, h); }
  if (h.lb && h.unload && h.state === 'approach' && h.pax && h.pax.every(p => p.gone) && F.t > h.unload + 4.5) heliLeave(F, h);
  if (h.state === 'leave' && Math.hypot(h.x - P.cx, h.z - P.cz) > 330){ world.remove(h.g); h.gone = true; }
}
function heliLeave(F, h){
  const P = F.plan, dx = h.x - P.cx, dz = h.z - P.cz, L = Math.hypot(dx, dz) || 1;
  h.state = 'leave'; h.landed = false; h.leaveDir = [dx/L, dz/L];
}
function updFlight(dt){
  let r = Math.min(dt, .25); while (r > 1e-4 && FLIGHT.on){ const h = Math.min(r, 1/30); flightStep(h); r -= h; }
}
function flightStep(dt){
  const F = FLIGHT; if (F.board && F.board.on){ boardStep(F, dt); return; }
  F.t += dt;
  const P = F.plan, flying = F.helis.filter(h => h.state === 'form');
  // the lead point along the route: it waits for the first aircraft to turn, then speeds up to cruise, and slows over the city
  const go = clamp((F.t - 8.5)/9, 0, 1), sp = (F.mis ? 21 : 34)*go*go*(3 - 2*go)*clamp((F.L - F.s)/90, .3, 1);
  F.v = F.s < F.L ? sp : 0; F.s = Math.min(F.L, F.s + F.v*dt);
  let rsSum = 0;
  for (const h of F.helis){ if (h.gone) continue; heliStep(F, h, dt); rsSum += h.rs; }
  updMen(F, dt);
  if (F.convoy) flightConvoyStep(F, dt);
  if (F.mis) flightPanic(F, dt);
  // camera: the pads at first, then the formation from behind, then the target from above
  const arrived = F.helis.some(h => h.state === 'approach');
  if (arrived && !F.arrT) F.arrT = F.t;
  { const hd = polyAt(F, F.s)[2]; if (F.hdU == null) F.hdU = hd; else { const d = hd - F.hdU; F.hdU += Math.atan2(Math.sin(d), Math.cos(d))*Math.min(1, dt*1.5); } }
  let fx, fy, fz, zoom, yaw;
  if (F.sel != null){ [fx, fy, fz] = unitCentre(F, F.sel); zoom = 11; yaw = F.t < 10 ? F.yaw0 : F.hdU + Math.PI + .55; }
  else if (F.t < 10){ const c0 = AIRP(-120 + F.t*2, -58); fx = c0[0]; fy = 0; fz = c0[1]; zoom = 15; yaw = F.yaw0; }
  else if (!arrived || F.t < F.arrT + 3){ fx = 0; fy = 0; fz = 0; for (const h of F.helis){ fx += h.x; fz += h.z; fy += h.y; } fx /= F.helis.length; fz /= F.helis.length; fy /= F.helis.length;
    zoom = 17; yaw = F.hdU + Math.PI + .55 + Math.sin(F.t*.12)*.25; }
  else { fx = P.cx - 4; fy = 0; fz = P.cz + 2; zoom = 16; if (F.finYaw == null) F.finYaw = F.hdU + Math.PI + .55; F.finYaw += dt*.05; yaw = F.finYaw; }
  if (arrived && F.sel != null && F.finYaw != null) yaw = F.finYaw;
  if (F.attract){ fx = P.cx - 3; fy = 0; fz = P.cz + 4; zoom = 12; F.attYaw = -Math.PI*.75; yaw = F.attYaw - F.uyaw; }
  camS.yawT = yaw + F.uyaw; camS.zoomT = clamp(zoom*F.uz, 4, 30);
  { const k = fy / Math.tan(camS.pitch), wx = fx - Math.sin(camS.yaw)*k, wz = fz - Math.cos(camS.yaw)*k, a = Math.min(1, dt*(F.sel != null ? 4 : 2.5));
    camS.tx += (wx - camS.tx)*a; camS.tz += (wz - camS.tz)*a; }
  updUnits(F, dt);
  // load the ground ahead of the formation only when the camera will follow it there; the title screen never leaves the target
  if (F.attract) FOCUS2 = null; else { const ah = polyAt(F, Math.min(F.L, F.s + 70)); FOCUS2 = [ah[0], ah[1], 46]; }
  if (AC && rotorGain) rotorGain.gain.setTargetAtTime(soundOn ? .55*rsSum/F.helis.length : 0, AC.currentTime, .2);
  const [px, pz] = polyAt(F, F.s), d0 = Math.hypot(px - P.cx, pz - P.cz);
  const vil = VILLAGES.find(v => Math.hypot(px - v.x, pz - v.z) < v.r + 40);
  const roping = F.helis.some(h => h.ropeT);
  if (F.capT && F.t < F.capT) {}
  else if (F.t < 5) cineText('Operación Irene · 15:32 · arrancan los rotores en el aeródromo');
  else if (F.t < 11) cineText('Despegan cuatro Little Bird y cuatro Black Hawk');
  else if (roping) cineText('¡Irene! Cuerdas sobre las cuatro esquinas · dos Black Hawk vigilan en círculo');
  else if (arrived) cineText('Los Little Bird se posan frente al objetivo · uno sobre la azotea de al lado');
  else if (F.s < 230) cineText('Dejan atrás el aeródromo, rumbo a la costa');
  else if (coastS(px, pz) > -26) cineText('Rumbo norte por la costa, sobre la playa y el océano Índico');
  else if (vil) cineText('Sobrevolando ' + vil.nm);
  else if (F.smoke && F.smoke.some(e => Math.hypot(e.x - px, e.z - pz) < 90)) cineText('Humo de neumáticos ardiendo: la milicia avisa de que llegamos');
  else if (d0 > 160 && cityDs(clamp(px, WB.x0, WB.x1), clamp(pz, WB.z0, WB.z1)) < .1) cineText('Tierra adentro, hacia la ciudad');
  else if (d0 > 160) cineText('Entrando en Mogadiscio por la rotonda K-4');
  else cineText('Aproximación al objetivo, junto al Hotel Olympic');
  flightRadio(F);
  if (F.attract){ attractFlight(F, dt); return; }
  if (F.mis){
    const deployed = F.helis.filter(h => h.role === 'corner').every(h => h.doneT) && F.helis.filter(h => h.lb).every(h => h.pax && h.pax.every(p => p.gone)) && !F.men.some(m => m.mode === 'slide');
    if (deployed && !F.depT) F.depT = F.t;
    if ((F.depT && F.t > F.depT + 1.5) || F.t > 260) finishFlightMission(F);
    return;
  }
  const done = F.helis.filter(h => h.role === 'corner').every(h => h.doneT);
  if (done && !F.endT) F.endT = F.t;
  if (F.endT && F.t > F.endT + 7) endFlight();
  if (F.t > 260) endFlight();
}
function endFlight(){
  for (const h of FLIGHT.helis) world.remove(h.g);
  for (const r of FLIGHT.ropes || []) world.remove(r);
  for (const v of FLIGHT.convoy || []) world.remove(v.g); if (FLIGHT.convoy) baseConvoyShow(true);
  for (const e of FLIGHT.smoke || []){ const i = emitters.indexOf(e); if (i >= 0) emitters.splice(i, 1); }
  for (const m of FLIGHT.men || []) world.remove(m.m.root);
  for (const u of FLIGHT.units || []) for (const r of u.rings) overlay.remove(r);
  $('flyUnits').innerHTML = '';
  FLIGHT = { on:false }; FOCUS2 = null;
  document.body.classList.remove('cine'); $('bSkip').hidden = true; $('cine').hidden = true;
  $('overlay').hidden = false;
  camS.tx = OX+31; camS.tz = OZ+30; camS.zoomT = 13; camS.yawT = -Math.PI*.75;
  if (AC && rotorGain) rotorGain.gain.setTargetAtTime(0, AC.currentTime, .3);
}

function buildTacSheet(){
  const S = 3, MW = W*S, MRG = 150, FOOT = 430, CWd = MW + MRG*2, CHt = MRG + MW + 100 + (FOOT - 130) + 70;
  const cv = document.createElement('canvas'); cv.width = CWd; cv.height = CHt; const x = cv.getContext('2d');
  const F = '"Barlow Condensed", "Arial Narrow", sans-serif', FM = '"IBM Plex Mono", monospace';
  const INK = '#2e2618', RED = '#9c2e1c', BLUE = '#24548f', PAPER = '#e9dfc3';
  x.fillStyle = PAPER; x.fillRect(0, 0, CWd, CHt);
  // ---- base: buildings, streets, ground, sea, from the game's own city
  const img = x.createImageData(MW, MW), d = img.data;
  const isB = (i, j) => inB(i,j) && grid[idx(i,j)] === 1;
  for (let j=0;j<H;j++) for (let i=0;i<W;i++){
    const k = idx(i,j), g = grid[k], D_ = cityDs(i + .5, j + .5); let c;
    if (g === 3) c = null;
    else if (g === 1){ const edge = !(isB(i-1,j) && isB(i+1,j) && isB(i,j-1) && isB(i,j+1)); c = edge ? [92,74,54] : [150,126,96]; }
    else if (STR[k] === 2) c = [250,244,226]; else if (STR[k] === 1) c = [228,212,172];
    else if (ground[k] === 7) c = [168,186,118]; else if (ground[k] === 4) c = [226,190,132]; else if (ground[k] === 11) c = [242,232,200];
    else if (g === 2) c = [176,158,124];
    else if (ground[k] === 2) c = [220,206,168];
    else { const f = sstep(.05, .5, D_); c = [212 + 18*f, 198 + 18*f, 156 + 30*f]; }
    for (let b=0;b<S;b++) for (let a=0;a<S;a++){
      const px = i*S + a, py = j*S + b, p = (py*MW + px)*4; let cc = c;
      if (!cc){ const s = coastS(i + .5, j + .5); cc = s > 30 ? [150,186,200] : [166,198,210]; if ((px + py) % 9 === 0) cc = [126,164,184]; }
      else if (g === 1 && (a === 0 || b === 0) && !isB(i - (a === 0 ? 1 : 0), j - (b === 0 ? 1 : 0))) cc = [70,56,40];
      else if (!g && !STR[k] && !ground[k] && D_ < .3 && hash2(px*3 + 1, py*5 + 7) < .02) cc = [146,138,92];
      d[p] = cc[0]; d[p+1] = cc[1]; d[p+2] = cc[2]; d[p+3] = 255;
    }
  }
  x.putImageData(img, MRG, MRG);
  x.save(); x.translate(MRG, MRG); x.beginPath(); x.rect(0, 0, MW, MW); x.clip();
  // shoreline
  x.strokeStyle = 'rgba(30,70,96,.95)'; x.lineWidth = 2.5; x.beginPath();
  for (let t=-200;t<=900;t+=3){ let X = t, Z = 1500 - (t + 1200)*COAST_NX/COAST_NZ; for (let it=0;it<4;it++){ const s = coastS(X, Z) + 3; X -= s*COAST_NX; Z -= s*COAST_NZ; } t === -200 ? x.moveTo(X*S, Z*S) : x.lineTo(X*S, Z*S); }
  x.stroke();
  // grid: 100 m squares (66.7 cells), finer 50 m ticks
  const G100 = 100/1.5*S;
  x.strokeStyle = 'rgba(40,32,20,.55)'; x.lineWidth = 1.6;
  for (let k=0;k*G100<=MW+1;k++){ x.beginPath(); x.moveTo(k*G100, 0); x.lineTo(k*G100, MW); x.stroke(); x.beginPath(); x.moveTo(0, k*G100); x.lineTo(MW, k*G100); x.stroke(); }
  x.strokeStyle = 'rgba(40,32,20,.18)'; x.lineWidth = 1;
  for (let k=0;k*G100<=MW;k++){ const h = (k + .5)*G100; x.beginPath(); x.moveTo(h, 0); x.lineTo(h, MW); x.stroke(); x.beginPath(); x.moveTo(0, h); x.lineTo(MW, h); x.stroke(); }
  const lab = (t, px, py, o) => { t = L(t); o = o || {}; x.save(); x.translate(px, py); if (o.rot) x.rotate(o.rot);
    x.font = (o.it ? 'italic ' : '') + (o.w || 'bold') + ' ' + (o.size || 22) + 'px ' + (o.mono ? FM : F); x.textAlign = o.align || 'center'; x.textBaseline = 'middle';
    let tx = t; if (o.sp) tx = t.split('').join(String.fromCharCode(8201));
    if (o.halo !== false){ x.lineWidth = o.hw || 6; x.strokeStyle = o.haloC || 'rgba(240,232,208,.92)'; x.lineJoin = 'round'; x.strokeText(tx, 0, 0); }
    x.fillStyle = o.col || INK; x.fillText(tx, 0, 0); x.restore(); };
  const P = (X, Z) => [X*S, Z*S];
  // districts
  for (const [n, X, Z] of DISTRICTS) if (X > 10 && Z > 10 && X < W - 10 && Z < H - 10) lab(n, ...P(X, Z), { size:40, it:true, col:'rgba(110,60,28,.8)', sp:true, hw:8 });
  // streets
  const st = (t, X, Z, rot) => lab(t, ...P(X, Z), { size:24, rot, hw:6 });
  st('CALLE HAWLWADIG', 256, 128, -Math.PI/2); st('CALLE HAWLWADIG', 256, 300, -Math.PI/2);
  st('LA MILLA · AV. DEL ESTADIO', MILE_X - 6, 268, -Math.PI/2);
  st('CALLE NACIONAL', 300, 321); st('CALLE WARSHADAHA', 172, 168.5); st('AV. 21 DE OCTUBRE', 150, 255.5);
  st('MAKKA AL-MUKARAMA', 352, 352, Math.atan2(300-410, 380-330));
  st('CTRA. DEL AEROPUERTO', 180, 492, Math.atan2(512-410, 150-330) + Math.PI);
  lab('← CTRA. DE AFGOOYE', ...P(40, 250), { size:22, align:'left' });
  lab('OCÉANO ÍNDICO', ...P(650, 640), { size:46, it:true, col:'#1e4a66', sp:true, haloC:'rgba(170,204,218,.9)', rot:Math.atan2(COAST_DZ, COAST_DX) });
  lab('Playa del Lido', ...P(700, 392), { size:24, it:true, col:'#1e4a66', haloC:'rgba(200,220,226,.9)' });
  // landmarks: places only, no events
  const LMK = [['hotel','Hotel Olympic'],['bakara','Mercado de Bakara'],['k4','Rotonda K-4'],['arch','El Arco'],['stadium','Estadio · base paquistaní (ONU)'],['oldtown','Hamar Weyne'],['villa','Villa Somalia']];
  for (const [k, n] of LMK){ const m = LM[k]; if (!m || m.x < 0 || m.z < 0 || m.x > W || m.z > H) continue; const [px, py] = P(m.x, m.z);
    x.save(); x.lineWidth = 3;
    if (k === 'stadium'){ x.fillStyle = 'rgba(80,140,210,.28)'; x.strokeStyle = BLUE; x.fillRect(px-26, py-17, 52, 34); x.strokeRect(px-26, py-17, 52, 34); x.fillStyle = BLUE; x.font = 'bold 18px ' + F; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(L('ONU'), px, py); }
    else { x.fillStyle = '#f0dca0'; x.strokeStyle = INK; x.beginPath(); x.arc(px, py, 10, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = INK; x.beginPath(); x.arc(px, py, 3, 0, 6.3); x.fill(); }
    x.restore();
    lab(n, px + (k === 'stadium' ? 34 : 18), py, { size:24, align:'left', col:k === 'stadium' ? BLUE : INK }); }

  x.restore();
  // ---- the frame: neat line, margin coordinates
  x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(MRG, MRG, MW, MW); x.lineWidth = 1.5; x.strokeRect(MRG - 14, MRG - 14, MW + 28, MW + 28);
  x.fillStyle = INK; x.font = 'bold 26px ' + FM; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let k=0;k*G100<=MW+1;k++){ const v = String(40 + k).padStart(2, '0'), h = (k*G100) + MRG;
    x.fillText(v, h, MRG - 40); x.fillText(v, h, MRG + MW + 40);
    const n = String(60 - k).padStart(2, '0'); x.fillText(n, MRG - 52, h); x.fillText(n, MRG + MW + 52, h); }
  x.font = 'bold 20px ' + F; x.textAlign = 'left'; x.fillText(L('CUADRÍCULA 100 m'), MRG, MRG - 90);
  x.textAlign = 'right'; x.fillText(L('CUADRÍCULA DE REFERENCIA DEL JUEGO'), MRG + MW, MRG - 90);
  // north arrow and declination
  { const px = MRG + MW - 90, py = MRG + 140; x.save(); x.translate(px, py); x.fillStyle = 'rgba(240,232,208,.92)'; x.beginPath(); x.arc(0, 0, 76, 0, 6.3); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke();
    x.rotate(NORTH_ANG); x.fillStyle = INK; x.beginPath(); x.moveTo(0, -60); x.lineTo(16, 18); x.lineTo(0, 6); x.closePath(); x.fill(); x.beginPath(); x.moveTo(0, -60); x.lineTo(-16, 18); x.lineTo(0, 6); x.closePath(); x.stroke();
    x.font = 'bold 30px ' + F; x.textAlign = 'center'; x.fillText(L('N'), 0, -72 + 8); x.restore(); }
  // ---- the title block and legend
  const y0 = MRG + MW + 100;
  x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(MRG - 14, y0, MW + 28, FOOT - 130);
  x.fillStyle = INK; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = 'bold 22px ' + F; x.fillText(L('PLANO TÁCTICO · USO EN EL JUEGO'), MRG + 16, y0 + 44);
  x.font = 'bold 76px ' + F; x.fillText(L('MOGADISCIO'), MRG + 16, y0 + 128);
  x.font = 'bold 30px ' + F; x.fillText(L('Distritos centrales · Hawl Wadaag, Wardhigley, Hodan, Hamar Weyne'), MRG + 16, y0 + 172);
  x.font = '24px ' + F; x.fillStyle = '#5a4a32'; x.fillText(L('Black Hawk Down · creado y desarrollado por Jesús Navas Aller · plano original, no a escala real'), MRG + 16, y0 + 214);
  x.fillText(L('Plano de situación: unidades, objetivo y contactos se actualizan en tiempo real.'), MRG + 16, y0 + 248);
  // scale bar: 100 m = G100 px
  { const sx = MRG + 16, sy = y0 + 278; x.fillStyle = INK; x.strokeStyle = INK; x.lineWidth = 2;
    for (let k=0;k<5;k++){ (k % 2 ? x.strokeRect : x.fillRect).call(x, sx + k*G100/1, sy - 4, G100, 12); }
    x.font = 'bold 20px ' + F; x.textAlign = 'center'; for (let k=0;k<=5;k++) x.fillText(String(k*100), sx + k*G100, sy - 14); x.textAlign = 'left'; x.fillText(L('metros'), sx + 5*G100 + 20, sy + 8); }
  // legend
  const lx = MRG + MW - 760, ly = y0 + 28; x.font = 'bold 24px ' + F; x.fillStyle = INK; x.fillText(L('LEYENDA'), lx, ly + 10);
  const rows = [
    [(a, b) => { x.fillStyle = '#faf4e2'; x.fillRect(a, b - 10, 56, 20); x.strokeStyle = INK; x.lineWidth = 1.5; x.strokeRect(a, b - 10, 56, 20); }, 'Calle asfaltada (en mal estado)'],
    [(a, b) => { x.fillStyle = '#e4d4ac'; x.fillRect(a, b - 10, 56, 20); }, 'Calle o pista de tierra'],
    [(a, b) => { x.fillStyle = '#967e60'; x.fillRect(a + 8, b - 12, 40, 24); x.strokeStyle = '#463826'; x.lineWidth = 3; x.strokeRect(a + 8, b - 12, 40, 24); }, 'Edificios y muros'],
    [(a, b) => { x.fillStyle = '#e2be84'; x.fillRect(a, b - 10, 56, 20); }, 'Mercado'],
    [(a, b) => { x.fillStyle = '#a6c6d2'; x.fillRect(a, b - 10, 56, 20); x.strokeStyle = '#1e4660'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(a, b - 10); x.lineTo(a + 56, b - 10); x.stroke(); }, 'Mar y línea de costa'],
    [(a, b) => { x.fillStyle = '#f0dca0'; x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(a + 28, b, 10, 0, 6.3); x.fill(); x.stroke(); }, 'Punto de referencia'],
    [(a, b) => { x.strokeStyle = RED; x.lineWidth = 4; x.strokeRect(a + 10, b - 12, 36, 24); x.lineWidth = 3; x.beginPath(); x.moveTo(a + 28, b - 16); x.lineTo(a + 28, b + 16); x.moveTo(a + 4, b); x.lineTo(a + 52, b); x.stroke(); }, 'Objetivo'],
    [(a, b) => { x.strokeStyle = RED; x.lineWidth = 3.5; x.beginPath(); x.arc(a + 28, b, 13, 0, 6.3); x.stroke(); x.beginPath(); x.moveTo(a + 20, b - 8); x.lineTo(a + 36, b + 8); x.moveTo(a + 36, b - 8); x.lineTo(a + 20, b + 8); x.stroke(); }, 'Black Hawk derribado'],
    [(a, b) => { x.strokeStyle = RED; x.lineWidth = 4; x.setLineDash([12, 6]); x.strokeRect(a + 2, b - 12, 52, 24); x.setLineDash([]); }, 'Zona de operaciones'],
    [(a, b) => { x.fillStyle = 'rgba(80,140,210,.28)'; x.strokeStyle = BLUE; x.lineWidth = 3; x.fillRect(a + 6, b - 12, 44, 24); x.strokeRect(a + 6, b - 12, 44, 24); }, 'Fuerzas de la ONU'] ];
  rows.forEach((r, k) => { const col = k < 5 ? 0 : 1, row = k % 5, a = lx + col*390, b = ly + 48 + row*40; r[0](a, b); x.fillStyle = INK; x.font = '22px ' + F; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(r[1], a + 70, b); x.textBaseline = 'alphabetic'; });
  return { cv, S, MRG };
}

function buildRegSheet(){
  const PXU = 1.05, MWd = Math.round((WB.x1 - WB.x0)*PXU), MHt = Math.round((WB.z1 - WB.z0)*PXU), MRG = 150, FOOT = 330;
  const CWd = MWd + MRG*2, CHt = MHt + MRG + 100 + FOOT + 60;
  const cv = document.createElement('canvas'); cv.width = CWd; cv.height = CHt; const x = cv.getContext('2d');
  const F = '"Barlow Condensed", "Arial Narrow", sans-serif', FM = '"IBM Plex Mono", monospace';
  const INK = '#2e2618', RED = '#9c2e1c', BLUE = '#24548f', PAPER = '#e9dfc3';
  x.fillStyle = PAPER; x.fillRect(0, 0, CWd, CHt);
  const img = x.createImageData(MWd, MHt), d = img.data, out = [0,0,0,0];
  for (let py=0;py<MHt;py++) for (let px=0;px<MWd;px++){
    const X = WB.x0 + (px + .5)/PXU, Z = WB.z0 + (py + .5)/PXU, s = coastS(X, Z), p = (py*MWd + px)*4; let c;
    if (s > -3){ c = s > 60 ? [140,178,196] : s > 15 ? [154,190,204] : [168,200,212]; if ((px + py) % 9 === 0) c = [126,164,184]; }
    else if (s > -24) c = [242,232,200];
    else {
      const n = fbm(X*.01, Z*.01), D_ = cityDs(X, Z); c = [220 - n*16, 204 - n*15, 162 - n*12];
      if (X >= 0 && Z >= 0 && X < W && Z < H){ const i = Math.floor(X), j = Math.floor(Z), k = idx(i, j);
        if (grid[k] === 1) c = [118,96,72]; else if (STR[k] === 2) c = [248,242,224]; else if (STR[k] === 1) c = [230,214,176];
        else if (ground[k] === 7) c = [168,186,118]; else if (ground[k] === 4) c = [226,190,132];
        else if (D_ > .05){ const f = sstep(.05, .5, D_)*.25; c = [c[0]*(1-f) + 236*f, c[1]*(1-f) + 222*f, c[2]*(1-f) + 186*f]; } }
      else { if (D_ > .03 && hash2(Math.floor(X/3)*13 + 5, Math.floor(Z/3)*7 + 3) < D_*.5) c = [124,102,78];
        else if (hash2(Math.floor(X/4)*7 + 3, Math.floor(Z/4)*11 + 1) < .012 && s < -40) c = [128,140,86]; }
      const [u, v] = airUV(X, Z);
      if (u > -300 && u < 340 && v > -292 && v < 16 && airGround(u, v, out)) c = [out[0], out[1], out[2]];
    }
    d[p] = c[0]; d[p+1] = c[1]; d[p+2] = c[2]; d[p+3] = 255;
  }
  x.putImageData(img, MRG, MRG);
  x.save(); x.translate(MRG, MRG); x.beginPath(); x.rect(0, 0, MWd, MHt); x.clip();
  const R = (X, Z) => [(X - WB.x0)*PXU, (Z - WB.z0)*PXU];
  const poly = (pts, w, col, dash) => { x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = col; x.lineWidth = w; if (dash) x.setLineDash(dash); x.beginPath(); pts.forEach((q, k) => { const [a, b] = R(q[0], q[1]); k ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke(); x.restore(); };
  const lab = (t, px, py, o) => { t = L(t); o = o || {}; x.save(); x.translate(px, py); if (o.rot) x.rotate(o.rot);
    x.font = (o.it ? 'italic ' : '') + (o.w || 'bold') + ' ' + (o.size || 22) + 'px ' + F; x.textAlign = o.align || 'center'; x.textBaseline = 'middle';
    let tx = t; if (o.sp) tx = t.split('').join(String.fromCharCode(8201));
    if (o.halo !== false){ x.lineWidth = o.hw || 6; x.strokeStyle = o.haloC || 'rgba(240,232,208,.92)'; x.lineJoin = 'round'; x.strokeText(tx, 0, 0); }
    x.fillStyle = o.col || INK; x.fillText(tx, 0, 0); x.restore(); };
  // shoreline
  x.strokeStyle = 'rgba(30,70,96,.95)'; x.lineWidth = 2.5; x.beginPath();
  for (let t=-1700;t<=1100;t+=4){ let X = t, Z = 1500 - (t + 1200)*COAST_NX/COAST_NZ; for (let it=0;it<5;it++){ const s = coastS(X, Z) + 3; X -= s*COAST_NX; Z -= s*COAST_NZ; } const [a, b] = R(X, Z); t === -1700 ? x.moveTo(a, b) : x.lineTo(a, b); }
  x.stroke();
  // tracks and roads
  for (const t of TRACKS) poly([[t[0], t[1]], [t[2], t[3]]], 2, 'rgba(110,80,44,.5)', [4, 6]);
  for (const r of ROADS){ if (r.paved){ poly(r.pts, 9, INK); poly(r.pts, 5.5, '#f6eed4'); } else { poly(r.pts, 5, 'rgba(90,64,36,.85)'); poly(r.pts, 2.6, '#e6d4a8'); } }
  // the base perimeter
  { const B_ = BASE, pts = [[B_.u0, B_.v0], [B_.u1, B_.v0], [B_.u1, B_.v1], [B_.u0, B_.v1], [B_.u0, B_.v0]].map(q => AIRP(q[0], q[1])); poly(pts, 3, BLUE, [12, 6]); }
  { const T_ = TZ, pts = [[T_.u0, T_.v0], [T_.u1, T_.v0], [T_.u1, T_.v1], [T_.u0, T_.v1], [T_.u0, T_.v0]].map(q => AIRP(q[0], q[1])); poly(pts, 2.5, BLUE, [6, 4]); }
  // villages
  for (const v of VILLAGES){ for (let k=0;k<v.n;k++){ const a = hash2(k*7 + 1, v.x|0)*6.28, dd = Math.sqrt(hash2(k*3, v.z|0))*v.r, X = v.x + Math.cos(a)*dd, Z = v.z + Math.sin(a)*dd;
      if (coastS(X, Z) > -26) continue; const [a_, b_] = R(X, Z); x.fillStyle = '#5a4630'; x.fillRect(a_ - 3, b_ - 3, 6, 5); }
    const [X, Y] = R(v.x, v.z); lab(v.nm, X + v.r*PXU + 10, Y, { size:24, it:true, align:'left' }); }
  // grid: 500 m squares
  const G5 = 500/1.5*PXU;
  x.strokeStyle = 'rgba(40,32,20,.5)'; x.lineWidth = 1.6;
  for (let k=0;k*G5<=MWd+1;k++){ x.beginPath(); x.moveTo(k*G5, 0); x.lineTo(k*G5, MHt); x.stroke(); }
  for (let k=0;k*G5<=MHt+1;k++){ x.beginPath(); x.moveTo(0, k*G5); x.lineTo(MWd, k*G5); x.stroke(); }
  // labels and places, no events
  const sym = (X, Z, kind) => { const [a, b] = R(X, Z); x.save(); x.lineWidth = 3;
    if (kind === 'un' || kind === 'base'){ x.fillStyle = 'rgba(80,140,210,.3)'; x.strokeStyle = BLUE; x.fillRect(a - 24, b - 15, 48, 30); x.strokeRect(a - 24, b - 15, 48, 30);
      if (kind === 'un'){ x.fillStyle = BLUE; x.font = 'bold 17px ' + F; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(L('ONU'), a, b); } else { x.beginPath(); x.moveTo(a - 24, b - 15); x.lineTo(a + 24, b + 15); x.moveTo(a + 24, b - 15); x.lineTo(a - 24, b + 15); x.stroke(); } }
    else { x.fillStyle = '#f0dca0'; x.strokeStyle = INK; x.beginPath(); x.arc(a, b, 9, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = INK; x.beginPath(); x.arc(a, b, 3, 0, 6.3); x.fill(); }
    x.restore(); return [a, b]; };
  { const [a, b] = R(300, 230); lab('MOGADISCIO', a, b - 70, { size:64, sp:true, col:'#5a3a1c', hw:9 }); lab('Muqdisho', a, b - 22, { size:28, it:true, col:'#5a3a1c', hw:6 }); }
  { const q = AIRP(60, -250), [a, b] = sym(q[0], q[1], 'base'); lab('Aeropuerto Internacional de Mogadiscio', a + 40, b - 14, { size:26, align:'left' }); lab('Base de la Task Force Ranger', a + 40, b + 18, { size:22, it:true, col:BLUE, align:'left' }); }
  { const p = AIRP(-80, 40), [a, b] = R(p[0], p[1]); lab('Campo de instrucción', a - 14, b, { size:19, it:true, col:BLUE, align:'right' }); }
  { const [a, b] = sym(LM.stadium.x, LM.stadium.z, 'un'); lab('Estadio · base paquistaní', a + 34, b, { size:22, align:'left', col:BLUE }); }
  for (const [k, n] of [['k4', 'Rotonda K-4'], ['villa', 'Villa Somalia'], ['bakara', 'Mercado de Bakara']]){ const [a, b] = sym(LM[k].x, LM[k].z, 'pt'); lab(n, a + 16, b, { size:21, align:'left' }); }
  { const [a, b] = R(-560, 345); lab('Carretera de Afgooye', a, b - 16, { size:22, it:true, rot:Math.atan2(-120, 400) }); }
  { const [a, b] = R(-360, 750); lab('Carretera del aeropuerto', a, b + 22, { size:22, it:true, rot:Math.atan2(-120, 250) }); }
  { const [a, b] = R(760, 330); lab('Playa del Lido', a, b, { size:22, it:true, col:'#1e4a66', haloC:'rgba(200,220,226,.9)' }); }
  { const [a, b] = R(-100, 1420); lab('OCÉANO ÍNDICO', a, b, { size:60, it:true, sp:true, col:'#1e4a66', haloC:'rgba(170,204,218,.9)', rot:Math.atan2(COAST_DZ, COAST_DX) }); }
  x.restore();
  // frame and coordinates
  x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(MRG, MRG, MWd, MHt); x.lineWidth = 1.5; x.strokeRect(MRG - 14, MRG - 14, MWd + 28, MHt + 28);
  x.fillStyle = INK; x.font = 'bold 26px ' + FM; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let k=0;k*G5<=MWd+1;k++){ const v = String(30 + k*5).padStart(2, '0'), h = k*G5 + MRG; x.fillText(v, h, MRG - 40); x.fillText(v, h, MRG + MHt + 40); }
  for (let k=0;k*G5<=MHt+1;k++){ const v = String(95 - k*5).padStart(2, '0'), h = k*G5 + MRG; x.fillText(v, MRG - 56, h); x.fillText(v, MRG + MWd + 56, h); }
  x.font = 'bold 20px ' + F; x.textAlign = 'left'; x.fillText(L('CUADRÍCULA 500 m'), MRG, MRG - 90); x.textAlign = 'right'; x.fillText(L('CUADRÍCULA DE REFERENCIA DEL JUEGO'), MRG + MWd, MRG - 90);
  { const px = MRG + MWd - 100, py = MRG + 130; x.save(); x.translate(px, py); x.fillStyle = 'rgba(240,232,208,.92)'; x.beginPath(); x.arc(0, 0, 76, 0, 6.3); x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke();
    x.rotate(NORTH_ANG); x.fillStyle = INK; x.beginPath(); x.moveTo(0, -60); x.lineTo(16, 18); x.lineTo(0, 6); x.closePath(); x.fill(); x.beginPath(); x.moveTo(0, -60); x.lineTo(-16, 18); x.lineTo(0, 6); x.closePath(); x.stroke();
    x.font = 'bold 30px ' + F; x.textAlign = 'center'; x.fillText(L('N'), 0, -64); x.restore(); }
  // title block
  const y0 = MRG + MHt + 100; x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(MRG - 14, y0, MWd + 28, FOOT);
  x.fillStyle = INK; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = 'bold 22px ' + F; x.fillText(L('PLANO REGIONAL · USO EN EL JUEGO'), MRG + 16, y0 + 44);
  x.font = 'bold 76px ' + F; x.fillText(L('MOGADISCIO Y ALREDEDORES'), MRG + 16, y0 + 128);
  x.font = 'bold 30px ' + F; x.fillText(L('La ciudad, el aeropuerto con la base de la TFR, la costa y los pueblos del interior'), MRG + 16, y0 + 172);
  x.font = '24px ' + F; x.fillStyle = '#5a4a32'; x.fillText(L('Black Hawk Down · creado y desarrollado por Jesús Navas Aller · plano original, no a escala real'), MRG + 16, y0 + 214);
  x.fillText(L('Plano de situación: unidades, objetivo y contactos se actualizan en tiempo real.'), MRG + 16, y0 + 248);
  { const sx = MRG + 16, sy = y0 + 290, k1 = 1000/1.5*PXU/2; x.fillStyle = INK; x.strokeStyle = INK; x.lineWidth = 2;
    for (let k=0;k<4;k++) (k % 2 ? x.strokeRect : x.fillRect).call(x, sx + k*k1, sy - 4, k1, 12);
    x.font = 'bold 20px ' + F; x.textAlign = 'center'; for (let k=0;k<=4;k++) x.fillText(String(k*500), sx + k*k1, sy - 14); x.textAlign = 'left'; x.fillText(L('metros'), sx + 4*k1 + 20, sy + 8); }
  const lx = MRG + MWd - 800, ly = y0 + 30; x.font = 'bold 24px ' + F; x.fillStyle = INK; x.fillText(L('LEYENDA'), lx, ly + 10);
  const rows = [
    [(a, b) => { x.strokeStyle = INK; x.lineWidth = 9; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 56, b); x.stroke(); x.strokeStyle = '#f6eed4'; x.lineWidth = 5.5; x.stroke(); }, 'Carretera asfaltada'],
    [(a, b) => { x.strokeStyle = 'rgba(90,64,36,.85)'; x.lineWidth = 5; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 56, b); x.stroke(); x.strokeStyle = '#e6d4a8'; x.lineWidth = 2.6; x.stroke(); }, 'Carretera de tierra'],
    [(a, b) => { x.strokeStyle = 'rgba(110,80,44,.6)'; x.lineWidth = 2; x.setLineDash([4, 6]); x.beginPath(); x.moveTo(a, b); x.lineTo(a + 56, b); x.stroke(); x.setLineDash([]); }, 'Pista o sendero'],
    [(a, b) => { x.fillStyle = '#76604a'; x.fillRect(a + 12, b - 10, 32, 20); }, 'Edificios y caseríos'],
    [(a, b) => { x.fillStyle = '#5a4630'; for (const [p, q] of [[10, -6], [24, 4], [38, -4], [30, -10]]) x.fillRect(a + p, b + q, 6, 5); }, 'Pueblo'],
    [(a, b) => { x.fillStyle = '#5e5c56'; x.fillRect(a, b - 7, 56, 14); x.fillStyle = '#fff'; x.fillRect(a + 6, b - 1, 10, 2); x.fillRect(a + 24, b - 1, 10, 2); x.fillRect(a + 42, b - 1, 10, 2); }, 'Pista de aterrizaje'],
    [(a, b) => { x.strokeStyle = BLUE; x.lineWidth = 3; x.setLineDash([12, 6]); x.strokeRect(a + 2, b - 11, 52, 22); x.setLineDash([]); }, 'Perímetro de la base'],
    [(a, b) => { x.fillStyle = 'rgba(80,140,210,.3)'; x.strokeStyle = BLUE; x.lineWidth = 3; x.fillRect(a + 6, b - 12, 44, 24); x.strokeRect(a + 6, b - 12, 44, 24); }, 'Fuerzas de EE. UU. y ONU'] ];
  rows.forEach((r, k) => { const col = k < 4 ? 0 : 1, row = k % 4, a = lx + col*400, b = ly + 52 + row*44; r[0](a, b); x.fillStyle = INK; x.font = '22px ' + F; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(r[1], a + 70, b); x.textBaseline = 'alphabetic'; });
  return { cv, PXU, MRG };
}

