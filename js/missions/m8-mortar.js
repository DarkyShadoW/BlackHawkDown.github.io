"use strict";
/* ---- 8 · Fuego de mortero: Kilo 1-1 comes back from the 6-4 and silences the technical at the Super 6-1;
   mortar shells start falling on the building of the wounded, and Eversmann's Romeo 4-1 goes out in the dark to find the tube ---- */
const M8_TECH = { x:370.7, z:279.8 };                                   // the orange X: the technical, in the street north of the arch
const M8_BARREL = { x:373.4, z:277.4 };                                 // the fire barrel that lights it
const M8_GREEN = [[345.5, 276.4], [369.6, 276.6]];                      // the green street Delta comes down, west to east
const M8_BEHIND = [[369.6, 276.6], [368.3, 276.1], [367.1, 276.8], [365.9, 276.2], [364.7, 276.7]];   // stacked behind the gun
const M8_R22 = [[366.5, 295.5], [366.5, 296.6], [368.6, 295.3], [368.7, 297.2]];       // first blue square: Romeo 2-2
const M8_R31 = [[366.5, 312.4], [366.5, 313.6], [368.6, 311.6], [368.7, 314.2]];       // second blue square: Romeo 3-1
const M8_DPOS = [[374.5, 299.5], [379.5, 299.8], [378.5, 304.5], [384.5, 304.5], [386.5, 300.5]];   // Delta's cover in the plaza, clear of the IR circles
const M8_ZONES = [{ x:387.6, z:250.4, r:9 }, { x:338.3, z:268.4, r:9 }, { x:364.3, z:347.4, r:9 }];   // the red circles: where the mortar may be
const M8_ROOFS = [[380, 286, 9], [397, 298, 9], [397, 309, 9]];         // the three red buildings, militia all over their roofs
const M8_YAW = 2.99;                                                     // the opening camera: looking north up the street of the arch, the technical below
const M8_HOUSE = { x:375.5, z:207.5 };                                  // the building of the wounded (mission 7)
const m8House = () => { const b = bAt(Math.floor(M8_HOUSE.x), Math.floor(M8_HOUSE.z)); return b >= 0 ? BLDS[b] : null; };

// shots for show: the burst, the tracers, the impacts on the walls, no damage (the crossfire round the plaza, the technical in the opening scene)
function m8Shot(s, t){
  if (!s || !s.alive || !t) return;
  s.face = Math.atan2(t.x - s.x, t.z - s.z); s.firing = .6; s.cool = (s.cool0 || 1)*rr(.8, 1.3); addNoise(s.x, s.z, 24);
  let ix, iy, iz;
  if (t.inB && t.inB.level === 'roof'){ [ix, iy, iz] = wallPoint(t, s); } else { ix = t.x + rr(-.9, .9); iy = rr(.15, 1.1); iz = t.z + rr(-.9, .9); }
  burstFx(s, ix, iy, iz, false);
  t.sup = Math.min(t.god ? 70 : 100, (t.sup || 0) + 6);
}
// the plaza and the roofs trade fire all the time: the Rangers and Delta there cannot die, and their fire never empties those roofs
function m8Xfire(dt, rate){
  G.m.xfT = (G.m.xfT || 0) - dt;
  while (G.m.xfT <= 0){ G.m.xfT += rr(.2, .45)/(rate || 1);
    const R = them.filter(e => e.alive && e.tag === 'roof'), P = us.filter(u => u.alive && u.god && u.m8in); if (!R.length || !P.length) return;
    if (rnd() < .55) m8Shot(pick(R), pick(P)); else m8Shot(pick(P), pick(R)); }
  for (const u of us) if (u.god) u.sup = Math.min(u.sup, 70);
}
// an endless exchange for show: Rangers in cover who cannot fall, militia on the roofs (and a few in the streets) whose numbers never run out
function xfSpots(cx, cz, n, r0, r1, sep, avoid){
  const cand = [];
  for (let j=Math.floor(cz - r1);j<=cz + r1;j++) for (let i=Math.floor(cx - r1);i<=cx + r1;i++){ const d = Math.hypot(i + .5 - cx, j + .5 - cz); if (d < r0 || d > r1 || !walk(i, j) || reserved[idx(i, j)]) continue;
    if (avoid && avoid(i + .5, j + .5)) continue;
    let wall = 0; for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) if (inB(i+a, j+b) && (grid[idx(i+a, j+b)] === 1 || cov[idx(i+a, j+b)])) wall++;
    if (wall) cand.push([i + .5, j + .5, wall + phs(i, j, 91)*2]); }
  cand.sort((p, q) => q[2] - p[2]); const out = [];
  for (const c of cand){ if (out.every(o => Math.hypot(o[0] - c[0], o[1] - c[1]) >= sep)) out.push(c); if (out.length >= n) break; }
  return out;
}
function xfMake(cx, cz, o){
  const X = { t:0, rate:o.rate || 1.2, us:[], them:[], roofs:[], streets:o.streets || 0, tag:o.tag || 'xr', cx, cz, r1:o.r1 || 34 };
  const names = ['Sgto. Bales', 'Esp. Mayo', 'Cabo Hart', 'Esp. Lowe', 'Sgto. Dorn', 'Esp. Kerr', 'Cabo Pratt', 'Esp. Wade', 'Sgto. Cole', 'Esp. Ruano'];
  xfSpots(cx, cz, o.n || 0, o.r0 || 3, o.rr || 15, 2.6, o.avoid).forEach(([x, z], k) => {
    const u = npcUnit(Object.assign({}, RANGERS[k % 6], RSPEC, { name:names[k % names.length], role:'A cubierto', unitName:o.unit || 'Romeo 2-2', gun:k % 4 === 2 ? 'saw' : 'm16' }), x, z, 0);
    u.stance = 'crouch'; u.order = { type:'hold' }; X.us.push(u); });
  for (const u of o.men || []) X.us.push(u);
  for (const u of X.us){ u.npc = true; u.god = true; u.m8in = true; if (o.cine) u.cine = true; }
  // the roofs that look onto the place: the nearest tall ones, a few men on each
  const near = BLDS.filter(b => !b.ring && b.top > 3 && b.w >= 3 && b.d >= 3).map(b => [Math.hypot(b.x + b.w/2 - cx, b.y + b.d/2 - cz), b])
    .filter(p => p[0] > (o.br0 || 12) && p[0] < X.r1 && !(o.skipB || []).includes(p[1])).sort((p, q) => p[0] - q[0]).slice(0, o.nb || 5);
  for (const [, b] of near) X.roofs.push({ b, n:o.perRoof || 3 });
  xfRefill(X, true);
  for (const u of X.us){ const t = X.them.filter(e => e.alive).sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0]; if (t) u.face = Math.atan2(t.x - u.x, t.z - u.z); }
  return X;
}
function xfRefill(X, all){
  X.them = X.them.filter(e => e.alive);
  for (const R of X.roofs){ const slots = bSlots(R.b, 'roof'); if (!slots.length) continue;
    const on = X.them.filter(e => e.inB && e.inB.b === R.b.id), used = new Set(on.map(e => e.inB.slot));
    for (let q=on.length; q<R.n; q++){ const k = Math.floor((q + .5)*slots.length/R.n); let kk = k; while (used.has(kk) && kk < slots.length - 1) kk++; if (used.has(kk)) break; used.add(kk);
      const e = foe(slots[kk][0], slots[kk][1], 'post', X.tag, CAMP_ESPEC); if (!e) continue;
      e.inB = { b:R.b.id, level:'roof', slot:kk, door:nearestFree(Math.floor(slots[kk][0]), Math.floor(slots[kk][1])) }; e.x = slots[kk][0]; e.z = slots[kk][1]; e.elev = R.b.top; e.stance = 'crouch'; e.roof = true;
      e.xfire = true; e.noFire = true; e.spotted = true; e.face = Math.atan2(X.cx - e.x, X.cz - e.z); X.them.push(e); if (!all) break; } }
  const st = X.them.filter(e => !e.roof).length;
  for (let q=st; q<X.streets; q++){ const a = phs(q, G.t, 93)*6.283, d = 18 + phs(G.t, q, 94)*10, c = findWalk(X.cx + Math.cos(a)*d, X.cz + Math.sin(a)*d);
    const e = foe(c[0] + .5, c[1] + .5, 'post', X.tag, CAMP_ESPEC); if (!e) continue; e.xfire = true; e.noFire = true; e.spotted = true; e.stance = 'crouch'; e.face = Math.atan2(X.cx - e.x, X.cz - e.z); X.them.push(e); if (!all) break; }
}
function xfStep(X, dt){
  if (!X) return;
  X.t -= dt; X.rf = (X.rf || 0) - dt; if (X.rf <= 0){ X.rf = 4; xfRefill(X, false); }
  while (X.t <= 0){ X.t += rr(.15, .4)/X.rate;
    const R = X.them.filter(e => e.alive), P = X.us.filter(u => u.alive && !u.inside); if (!R.length || !P.length) break;
    const u = pick(P), near = R.filter(e => Math.hypot(e.x - u.x, e.z - u.z) < 40), e = near.length ? pick(near) : pick(R);
    if (rnd() < .5) m8Shot(e, u); else m8Shot(u, e); }
  for (const u of X.us) if (u.alive) u.sup = Math.min(u.sup, 60);
}
function xfClear(X){
  if (!X) return;
  for (const e of X.them){ if (!e.alive) continue; e.alive = false; if (e.m && e.m.root.parent) e.m.root.parent.remove(e.m.root); dropOverlay(e); }
  X.roofs = []; X.streets = 0; X.them = [];
}
// a roof filled with militia, slot by slot along the parapet
function m8RoofFill(b, n){
  const slots = bSlots(b, 'roof');
  for (let k=0;k<Math.min(n, slots.length);k++){ const s = slots[Math.floor(k*slots.length/n)], door = nearestFree(Math.floor(s[0]), Math.floor(s[1]));
    const e = foe(s[0], s[1], 'post', 'roof', CAMP_ESPEC);
    e.inB = { b:b.id, level:'roof', slot:Math.floor(k*slots.length/n), door }; e.x = s[0]; e.z = s[1]; e.elev = b.top; e.stance = 'crouch'; e.roof = true; e.xfire = true;
    e.face = Math.atan2(S61.x - e.x, S61.z - e.z); }
}
// pickets in the streets: alone, in twos or in threes, never on Delta's street or by the house door
function m8Streets(){
  const keepOut = [[S61.x, S61.z, 16], [M8_HOUSE.x, M8_HOUSE.z, 14]].concat(M8_ZONES.map(z => [z.x, z.z, 12]));
  const cand = [];
  for (let j=214;j<=356;j++) for (let i=334;i<=405;i++){ const k = idx(i, j); if (!walk(i, j) || !STR[k]) continue;
    const x = i + .5, z = j + .5; if (x > 338 && x < 375 && z > 271 && z < 282) continue;   // the green street and the technical's crossing
    if (keepOut.some(([a, b, r]) => Math.hypot(x - a, z - b) < r)) continue; cand.push([x, z]); }
  for (let k=cand.length-1;k>0;k--){ const q = Math.floor(Math.random()*(k + 1)); [cand[k], cand[q]] = [cand[q], cand[k]]; }
  const sizes = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3], spots = [];
  for (const p of cand){ if (spots.length >= sizes.length) break; if (spots.some(s => Math.hypot(s[0] - p[0], s[1] - p[1]) < 13)) continue; spots.push(p); }
  spots.forEach((p, n) => { for (let q=0;q<sizes[n];q++){ const e = foe(p[0] + (q ? rr(-1.6, 1.6) : 0), p[1] + (q ? rr(-1.6, 1.6) : 0), 'post', 'calle', CAMP_ESPEC); e.face = rnd()*6.283; } });
}
// the mortar: a tube on its baseplate, a bipod, ammunition, and its three men; in one of the three zones, chosen at random
function m8Mortar(){
  const Z = M8_ZONES[Math.floor(Math.random()*M8_ZONES.length)], c = findWalk(Z.x, Z.z), x = c[0] + .5, z = c[1] + .5;
  const yaw = Math.atan2(M8_HOUSE.x - x, M8_HOUSE.z - z), g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; world.add(g);
  const dk = new T.MeshLambertMaterial({ color:0x2e3128 }), ol = new T.MeshLambertMaterial({ color:0x484b36 }), wd = new T.MeshLambertMaterial({ color:0x6a5434 });
  const bx = (mat, sx, sy, sz, px, py, pz, rx) => { const m = new T.Mesh(UBOX, mat); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); if (rx) m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  bx(dk, .62, .06, .62, 0, .03, 0);
  const a = .78, len = 1.15, tube = new T.Mesh(new T.CylinderGeometry(.06, .065, len, 8), ol); tube.castShadow = true;
  tube.rotation.x = a; tube.position.set(0, .08 + Math.cos(a)*len/2, Math.sin(a)*len/2); g.add(tube);
  for (const s of [-1, 1]){ const leg = bx(dk, .035, .78, .035, s*.2, .33, .62, -.35); leg.rotation.z = s*.28; }
  bx(wd, .5, .22, .3, .75, .11, -.35); bx(wd, .5, .22, .3, .78, .33, -.33); bx(wd, .42, .2, .28, -.7, .1, -.5);
  const mz = [x + Math.sin(yaw)*Math.sin(a)*len, .08 + Math.cos(a)*len, z + Math.cos(yaw)*Math.sin(a)*len];
  const crew = [[-.85, -.45], [.85, -.35], [.1, -1.25]].map(([lx, lz]) => { const wx = x + lx*Math.cos(yaw) + lz*Math.sin(yaw), wz = z - lx*Math.sin(yaw) + lz*Math.cos(yaw);
    const e = foe(wx, wz, 'post', 'mortar', Object.assign({}, CAMP_ESPEC, { name:'Mortero · sirviente' })); e.x = wx; e.z = wz; e.face = yaw; e.stance = 'crouch'; return e; });
  G.m.mort = { x, z, g, mz, zone:Z, crew, shots:0 };
}
// a whistle falling in pitch, just before the shell lands
function m8Whistle(x, z){
  if (!AC || !soundOn) return; const now = AC.currentTime, d = Math.hypot(x - camS.tx, z - camS.tz), v = Math.max(.02, 1 - d/45)*.07;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1500, now); o.frequency.exponentialRampToValueAtTime(420, now + 1.1);
  g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(v, now + .25); g.gain.exponentialRampToValueAtTime(.0001, now + 1.15);
  o.connect(g); g.connect(SND && SND.gate ? SND.gate : AC.destination); o.start(now); o.stop(now + 1.2);
}
// the tube fires: a flash and a thump at the mortar, its men show themselves for a moment
function m8Launch(){
  const M_ = G.m.mort; if (!M_) return; M_.shots++;
  const [x, y, z] = M_.mz; lightFlash(x, y + .3, z, 0xffd8a0, 6, 18, .25); sfx('boom', x, z); addNoise(x, z, 30);
  for (let k=0;k<14;k++) spawnP(x, y, z, rr(-.5, .5), rr(1, 2.4), rr(-.5, .5), rr(1.2, 2.2), rr(.15, .3), rr(.8, 1.4), 0x8a8478, 0x5a5650, .7, 0, 0);
  for (const e of M_.crew) if (e.alive){ e.firing = .8; e.stance = 'crouch'; }
  const roof = rnd() < .45;
  sched.push({ at:G.t + 2.2, fn:() => m8Whistle(M8_HOUSE.x, M8_HOUSE.z) });
  sched.push({ at:G.t + 3.3, fn:() => m8Impact(roof) });
  // Steele, on the roof of the house, sees the flash
  if ([2, 5, 9, 14, 20].includes(M_.shots)){ const dir = compass(M_.x - M8_HOUSE.x, M_.z - M8_HOUSE.z);
    sched.push({ at:G.t + 1.2, fn:() => say('Cap. Steele', `¡Fogonazo al ${dir}!`, 'us', true) }); }
}
// a shell lands: on the roof of the house (the building loses strength) or in the streets round it
function m8Impact(roof){
  if (G.over) return; const b = m8House();
  if (roof && b){
    const x = b.x + rr(.7, b.w - .7), z = b.y + rr(.7, b.d - .7), y = b.top + .1;
    lightFlash(x, y + 1, z, 0xffa040, 8, 14, .8); sfx('boom', x, z); addNoise(x, z, 40);
    for (let k=0;k<60;k++){ const a = rnd()*6.28, s = rr(1, 4.5); spawnP(x, y + .3, z, Math.cos(a)*s, rr(1, 4), Math.sin(a)*s, rr(.25, .6), rr(.25, .5), .08, pick([0xffe7a0, 0xffc050, 0xff9030]), 0xc0301a, 1, 1, 0); }
    for (let k=0;k<50;k++){ const a = rnd()*6.28, s = rr(.3, 1.6); spawnP(x + rr(-.4, .4), y + rr(.2, .8), z + rr(-.4, .4), Math.cos(a)*s, rr(.6, 2.2), Math.sin(a)*s, rr(2.5, 5), rr(.3, .5), rr(.9, 1.6), 0x1e1b18, 0x6a6258, 1, 0, 0); }
    for (let k=0;k<18;k++) spawnChunk(x + rr(-.5, .5), y + .3, z + rr(-.5, .5), rr(-5, 5), rr(3, 8), rr(-5, 5), rr(.08, .25), pick([0xcfc4a8, 0xbfae8e, 0x8f866f, 0x6a5a48]));
    for (const u of units) if (u.alive && u.inB && u.inB.level === 'roof' && Math.hypot(u.x - x, u.z - z) < 2) damage(u, 60, null);
    const was = G.m.bHp; G.m.bHp = Math.max(CINE.on ? 86 : 0, G.m.bHp - rr(4, 6.5)); G.m.bFlash = 1;
    if (was > 70 && G.m.bHp <= 70){ emitters.push({ x:b.x + b.w*.3, z:b.y + b.d*.6, y:b.top + .2, rate:14, life:7, vy:1.1, s0:.3, s1:1.6, fire:.15, acc:0, sp:.3 }); }
    if (was > 40 && G.m.bHp <= 40){ emitters.push({ x:b.x + b.w*.7, z:b.y + b.d*.35, y:b.top + .2, rate:24, life:7, vy:1.3, s0:.3, s1:1.9, fire:.55, acc:0, sp:.4 }); }
    if (!CINE.on) for (const [lim, who, t] of [[75, 'Cap. Steele', '¡Otro en el tejado! ¡Se está abriendo el techo!'], [50, 'Esp. Lance Twombly', '¡Ha caído medio techo sobre la sala! ¡Daos prisa!'], [25, 'Cap. Steele', '¡Las vigas no aguantan más! ¡Un par más y se nos viene abajo!']])
      if (was > lim && G.m.bHp <= lim) say(who, t, 'us', true);
    if (G.m.bHp <= 0 && !G.m.collapsed) m8Collapse();
    return;
  }
  // in the street: a spot five to fifteen metres from the house
  let x = M8_HOUSE.x, z = M8_HOUSE.z;
  for (let n=0;n<30;n++){ const a = rnd()*6.283, d = rr(5, 15), i = Math.floor(M8_HOUSE.x + Math.cos(a)*d), j = Math.floor(M8_HOUSE.z + Math.sin(a)*d); if (walk(i, j)){ x = i + .5; z = j + .5; break; } }
  boom(x, z); sfx('boom', x, z); addNoise(x, z, 40);
  for (const u of units){ if (!u.alive) continue; const d = Math.hypot(u.x - x, u.z - z); if (d > 6) continue;
    u.sup = Math.min(100, u.sup + 80*(1 - d/6)); if (d < 1.9 && !(u.inB && u.inB.level === 'ground')) damage(u, 55*(1 - d/1.9) + 15, null); }
}
function m8Collapse(){
  G.m.collapsed = true; const b = m8House(); if (!b) return;
  const cx = b.x + b.w/2, cz = b.y + b.d/2;
  for (let k=0;k<6;k++) sched.push({ at:G.t + k*.25, fn:() => { const x = cx + rr(-2, 2), z = cz + rr(-2, 2); lightFlash(x, 3, z, 0xffa040, 6, 16, .6); sfx('boom', x, z);
    for (let q=0;q<70;q++){ const a = rnd()*6.28, s = rr(1, 6); spawnP(x, rr(.5, b.top), z, Math.cos(a)*s, rr(.2, 2.5), Math.sin(a)*s, rr(2, 4), rr(.4, .8), rr(1.5, 3), 0x8a7a62, 0x5a5048, .85, 0, 0); } } });
  say('Cap. Steele', '¡El techo se viene abajo! ¡Los heridos! ¡Sacadlos de ahí!', 'us', true);
  sched.push({ at:G.t + 3, fn:() => { say('Uniform 6-4', 'Romeo 4-1, el edificio de los heridos se ha derrumbado.', 'hq', true); endGame(false); } });
}
// the opening scene
function m8Intro(){
  const r22 = G.m.r22, r31 = G.m.r31, D = G.m.delta, hoot = D[0], T_ = G.m.tech, gun = T_.gunner, crew = G.m.techCrew, R41 = gLive(grpN('Romeo 4-1'));
  const sayU = (u, t) => { if (u){ u.talkT = 2.6; radio(u, t, true); } };
  const evm = R41[0], wad = R41[1], twb = { name:'Esp. Lance Twombly' };
  G.m.cf = [S61.x - 6, S61.z - 9]; G.alert = true;
  for (const e of them) if (e.tag === 'roof' || e.tag === 'calle' || e.tag === 'mortar') e.noFire = true;
  camS.yaw = camS.yawT = M8_YAW;
  cineStart({ zoom:9, spin:0, yaw0:M8_YAW, focus:() => G.m.cf,
    text:L('Super 6-1 · 19:40 · una técnica clava al suelo a los Rangers que quedan junto al helicóptero'),
    keys:[
      { t:1.5, fn:() => sayU(r22[0], '¡Esa ametralladora nos tiene clavados! ¡No puedo ni asomar la cabeza!') },
      { t:5.5, fn:() => sayU(r31[0], '¡Está en la calle del arco! ¡No llegamos a ella!') },
      { t:9, text:L('De las sombras de la calle llega Kilo 1-1, de vuelta del Super 6-4'), fn:() => { G.m.dGo = true; CINE.zoom = 7.5;
          D.forEach((u, i) => { u.path = pathThrough([[u.x, u.z], M8_BEHIND[i]]).map(p => [Math.floor(p[0]), Math.floor(p[1])]); u.order = { type:'move' }; u.stance = 'stand'; u.sneak = true; u.spd = 3.0; }); } },
      { t:26, fn:() => { sayU(hoot, '¡Hey, adiga!'); sched.push({ at:G.t + .6, fn:() => say('Kilo 1-1', '(«¡Eh, tú!», en somalí)', 'delta', true) }); G.m.turn = true; } },
      { t:27.4, fn:() => { const tg = [gun].concat(crew);
          D.forEach((u, i) => { const t = tg[i % tg.length]; sched.push({ at:G.t + i*.12, fn:() => m8Shot(u, t) }); sched.push({ at:G.t + .35 + i*.12, fn:() => m8Shot(u, t) }); });
          for (const t of tg) sched.push({ at:G.t + .25 + rnd()*.4, fn:() => { if (t.alive) damage(t, 999, hoot); } });
          G.m.techDead = true; } },
      { t:30, fn:() => { sayU(hoot, 'Romeo 2-2, aquí Kilo 1-1. La técnica está fuera. Kilo 1-1 acercándose por la esquina norte, por el arco. ¡No disparéis!');
          D.forEach((u, i) => { u.sneak = false; u.spd = 2.7; goTo(u, M8_DPOS[i][0], M8_DPOS[i][1]); }); CINE.zoom = 9; } },
      { t:36, fn:() => { G.m.cf = [S61.x - 3, S61.z - 6]; sayU(r22[0], 'Kilo 1-1, os tenemos. Gracias, nos habéis salvado el pellejo.') } },
      { t:41, fn:() => sayU(r31[0], 'Os debemos una. Cuidado con las azoteas del norte y del este: están llenas de tiradores.') },
      { t:45.5, text:L('El edificio de los heridos, calle arriba: empiezan a caer granadas de mortero'), fn:() => { G.m.cf = [M8_HOUSE.x - 2, M8_HOUSE.z + 3]; CINE.zoom = 10.5; G.m.shell = true; G.m.csT = G.t + .6; } },
      { t:49, fn:() => sayU(evm, '¡Morteros! ¡Nos están cayendo morteros encima!') },
      { t:53, fn:() => say('Cap. Steele', '¡Han dado en el tejado! ¡Los heridos están justo debajo!', 'us', true) },
      { t:57.5, fn:() => sayU(evm, 'Uniform 6-4, aquí Romeo 4-1. Nos castigan con morteros desde una posición desconocida.') },
      { t:63, fn:() => say('Uniform 6-4', 'Recibido, Romeo 4-1. No tenemos ojos sobre el tubo. Por los disparos está en una de tres zonas al sur de vuestro edificio. Os las marco en el mapa.', 'hq', true) },
      { t:70.5, fn:() => say(twb.name, 'Como no hagamos algo, el edificio se nos cae encima con todos los heridos dentro.', 'us', true) },
      { t:75, fn:() => { sayU(evm, 'Romeo 4-1, conmigo. Vamos a buscar ese mortero.');
          R41.forEach((u, i) => { leaveB(u); goTo(u, 369.2 + (i % 2)*1.6, 205.5 + (i >> 1)*1.6); u.stance = 'stand'; }); G.m.cf = [M8_HOUSE.x - 5, M8_HOUSE.z + 1]; } },
      { t:79, fn:() => sayU(wad, 'Sin visores no se ve nada ahí fuera, sargento.') },
      { t:82.5, fn:() => sayU(evm, 'Pues mirad los fogonazos. Cada vez que dispare, nos dirá dónde está.') },
    ],
    dur:87,
    tick:(dt) => {
      if (G.m.dGo && hoot.alive) G.m.cf = G.m.techDead ? G.m.cf : [hoot.x + 2.5, hoot.z + 1.5];
      if (G.m.dGo && !G.m.techDead && hoot.alive && Math.hypot(hoot.x - M8_TECH.x, hoot.z - M8_TECH.z) < 9){ G.m.cf = [M8_TECH.x - 2, M8_TECH.z - 1]; if (!G.m.dZoom){ G.m.dZoom = true; CINE.zoom = 5.8; } }
      if (G.m.turn){ for (const e of [gun].concat(crew)) if (e.alive){ e.face = Math.atan2(hoot.x - e.x, hoot.z - e.z); e.firing = Math.max(e.firing || 0, .2); } }
      // until Delta hits it, the gun hammers the first blue square through the arch
      if (!G.m.techDead && !G.m.turn && gun.alive){ G.m.tgT = (G.m.tgT || 0) - dt; if (G.m.tgT <= 0){ G.m.tgT = rr(.28, .45); m8Shot(gun, rnd() < .75 ? pick(r22) : pick(r31)); }
        G.m.tcT = (G.m.tcT || 0) - dt; if (G.m.tcT <= 0){ G.m.tcT = rr(.9, 1.6); const c = pick(crew); if (c.alive) m8Shot(c, pick(r22)); }
        G.m.trT = (G.m.trT || 0) - dt; if (G.m.trT <= 0){ G.m.trT = rr(1.6, 3); m8Shot(pick(r22.concat(r31)), gun); } }
      for (const u of D) if (u.alive && !u.m8in && G.m.techDead && Math.hypot(u.x - S61.x, u.z - S61.z) < 26 && !u.path.length){ u.m8in = true; u.stance = 'crouch'; }
      m8Xfire(dt, .6);
      if (G.m.shell && G.t >= G.m.csT){ G.m.csT = G.t + rr(1.8, 2.8); const roof = rnd() < .5; m8Whistle(M8_HOUSE.x, M8_HOUSE.z); sched.push({ at:G.t + 1.1, fn:() => m8Impact(roof) }); }
      for (const u of us) if (u.alive && !u.god) u.sup = Math.min(u.sup, 25);
    },
    onEnd:() => m8Go() });
}
// the hunt begins: Romeo 4-1 in the street, the three zones on the ground and on the map
function m8Go(){
  const R41 = gLive(grpN('Romeo 4-1'));
  R41.forEach((u, i) => { if (u.inB) leaveB(u); if (!u.path.length && Math.hypot(u.x - M8_HOUSE.x, u.z - M8_HOUSE.z) < 4){ const c = findWalk(369.2 + (i % 2)*1.6, 205.5 + (i >> 1)*1.6); u.x = c[0] + .5; u.z = c[1] + .5; } u.stance = 'crouch'; });
  for (const u of G.m.delta){ u.noFire = false; u.sneak = false; u.m8in = true; if (u.path.length){ const p = u.path[u.path.length - 1]; u.x = p[0] + .5; u.z = p[1] + .5; u.path = []; } u.stance = 'crouch'; u.order = { type:'hold' }; }
  for (const u of G.m.r22.concat(G.m.r31)) u.noFire = false;
  for (const e of them) if (e.tag === 'roof' || e.tag === 'calle' || e.tag === 'mortar') e.noFire = false;
  G.m.shell = false; G.m.mortT = G.t + 7;
  camS.tx = M8_HOUSE.x - 6; camS.tz = M8_HOUSE.z + 6; camS.zoomT = 12;
  G.sel = new Set(R41); buildCards(); refreshCards(); renderSubs();
  hint('El mortero está en una de las tres zonas naranjas. Cada disparo deja un fogonazo. Usa bengalas para ver en la oscuridad y acaba con sus tres sirvientes antes de que se hunda el edificio.');
}
function m8Tick(dt){
  m8Xfire(dt, 1);
  const M_ = G.m.mort; if (!M_) return;
  const live = M_.crew.filter(e => e.alive).length;
  if (live && G.t >= G.m.mortT){ G.m.mortT = G.t + rr(10, 14)*(live < 3 ? 1.35 : 1); m8Launch(); }
  // found: the other two zones go
  if (!G.m.found && (M_.crew.some(e => e.alive && e.spotted) || us.some(u => u.alive && !u.npc && Math.hypot(u.x - M_.x, u.z - M_.z) < 10))){
    G.m.found = true; for (const r of G.m.zr || []) overlay.remove(r); G.m.zr = [ringAt(M_.x, M_.z, 4, 0xff6a3a)]; G.m.mzMap = [{ x:M_.x, z:M_.z, r:4 }];
    const sp = us.filter(u => u.alive && !u.npc).sort((a, b) => Math.hypot(a.x - M_.x, a.z - M_.z) - Math.hypot(b.x - M_.x, b.z - M_.z))[0];
    if (sp) radio(sp, '¡Ahí está el mortero! ¡Tres hombres junto al tubo!'); autoPause('mortero localizado'); }
}
/* ---- 8 · second phase: the plaza asks for help, the Little Birds cannot tell friend from foe, Romeo 4-1 marks the roofs with IR ---- */
const M8_IR = [{ x:380.9, z:293.3, r:4.2, roofs:[[380, 286]], run:[[358, 286], [398, 286]], dir:'oeste', name:'la azotea del norte' },
               { x:397.0, z:303.9, r:4.2, roofs:[[397, 298], [397, 309]], run:[[397, 284], [397, 322]], dir:'norte', name:'las azoteas del este' }];
// a ring of dashes on the ground
function m8DashRing(x, z, r, col){
  const g = new T.Group(), mat = new T.MeshBasicMaterial({ color:col, transparent:true, opacity:.9, side:T.DoubleSide, depthTest:false, depthWrite:false }), n = Math.max(14, Math.round(r*5)), st = 6.283/n;
  for (let k=0;k<n;k++){ const geo = new T.RingGeometry(r - .32, r, 4, 1, k*st, st*.58); geo.rotateX(-Math.PI/2); g.add(new T.Mesh(geo, mat)); }
  g.position.set(x, .06, z); return grounded(g, .08);
}
// the grenade: a small arc from the hand to the roof, then the strobe blinking on the parapet
function m8Throw(u, tx, ty, tz){
  const m = new T.Mesh(new T.CylinderGeometry(.05, .05, .14, 6), new T.MeshLambertMaterial({ color:0x3a3d30 })); world.add(m);
  u.face = Math.atan2(tx - u.x, tz - u.z); u.stance = 'stand'; u.firing = .5;
  (G.m.proj = G.m.proj || []).push({ m, x0:u.x, y0:1.5, z0:u.z, tx, ty, tz, t:0, T:1.1 });
}
function m8Fx(dt){
  for (const p of G.m.proj || []){ if (p.done) continue; p.t += dt; const f = Math.min(1, p.t/p.T);
    p.m.position.set(p.x0 + (p.tx - p.x0)*f, p.y0 + (p.ty - p.y0)*f + Math.sin(f*Math.PI)*3.2, p.z0 + (p.tz - p.z0)*f); p.m.rotation.x += dt*12;
    if (f >= 1){ p.done = true; p.m.rotation.set(Math.PI/2, 0, 0); p.m.position.y = p.ty + .05;
      const s = new T.Sprite(FLARE_CORE); s.scale.set(.6, .6, 1); s.position.set(p.tx, p.ty + .25, p.tz); world.add(s); (G.m.strobes = G.m.strobes || []).push(s); } }
  // an IR strobe: invisible to the naked eye, it only blinks through the goggles
  const nvOn = !!((G.nv || G.nvAt) && nightF > .25);
  for (const s of G.m.strobes || []) s.visible = nvOn && (G.t*2.6 % 1) < .22;
}
// a gun run flown on the marked roof: every shot on the roof, only the men up there are hit
function m8Run(k){
  const Z = M8_IR[k], [a, b] = Z.run, B_ = Z.roofs.map(([x, z]) => BLDS[bAt(x, z)]).filter(Boolean), ids = new Set(B_.map(b_ => b_.id));
  const only = new Set(them.filter(e => e.alive && e.inB && ids.has(e.inB.b)));
  let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz); dx /= L; dz /= L;
  const S = [a[0] - dx*70, a[1] - dz*70], E = [b[0] + dx*110, b[1] + dz*110];
  const lb = littleBird(); world.add(lb.g); lb.g.visible = false;
  SUP.runs.push({ a, b, d:[dx, dz], L, pts:[S, a, b, E], cum:[0, 70, 70 + L, 180 + L], s:0, delay:.5, lb, fireAcc:0, rk:99, sup:false, hit:new Set(), x:S[0], z:S[1], alt:22, only, roofB:B_, noMark:true });
  G.m.run = SUP.runs[SUP.runs.length - 1];
  return only;
}
// the plaza calls for help; the Little Birds, high up; Eversmann offers to mark
function m8AirIntro(){
  const r22 = G.m.r22, r31 = G.m.r31, R41 = gLive(grpN('Romeo 4-1')), evm = R41.find(u => /Eversmann/.test(u.name)) || R41[0];
  const sayU = (u, t) => { if (u){ u.talkT = 2.6; radio(u, t, true); } };
  const lbAt = () => { const o = ORBITS[0]; if (!o) return [S61.x, S61.z]; const p = o.h.g.position; return [p.x, p.z, p.y]; };
  G.m.cf = [S61.x - 2, S61.z - 6];
  cineStart({ zoom:10, spin:.012, yaw0:camS.yaw, focus:() => G.m.cf === 'lb' ? lbAt() : G.m.cf,
    text:L('Super 6-1 · los tejados del norte y del este no dejan de disparar'),
    keys:[
      { t:1, fn:() => sayU(r22[0], '¡Uniform 6-4, aquí Romeo 2-2! ¡Estamos recibiendo mucho fuego desde las azoteas! ¡Necesitamos apoyo!') },
      { t:6.5, fn:() => sayU(r31[0], '¡Nos tienen cogidos entre tres tejados! ¡No podemos movernos de aquí!') },
      { t:11, fn:() => say('Uniform 6-4', 'Star 4-1, Star 4-4: apoyo de fuego en la zona de impacto del 6-1.', 'hq', true) },
      { t:14.5, text:L('Dos Little Birds sobrevuelan la zona, altos, con visores nocturnos'), fn:() => { G.m.cf = 'lb'; CINE.zoom = 13; } },
      { t:16, text:L('Visión nocturna · Star 4-1'), fn:() => { const p = lbAt(); G.nvAt = [[p[0], 0, p[1]]]; G.nvR = 999; say('Star 4-1', 'Aquí Star 4-1, sobre la zona. Hay mucha actividad ahí abajo. No puedo distinguir a los buenos de los malos.', 'air', true); } },
      { t:22, fn:() => say('Star 4-1', 'Necesito que me marquéis los objetivos con infrarrojo. Marcadme los tejados con IR.', 'air', true) },
      { t:27, fn:() => { G.nvAt = null; G.nvR = 0; if (evm) G.m.cf = [evm.x, evm.z]; CINE.zoom = 9; sayU(evm, 'Star 4-1, aquí Romeo 4-1. Estamos en una de las calles que dan a la zona de impacto. Os marcamos nosotros los dos edificios.') } },
      { t:33.5, fn:() => say('Star 4-1', 'Recibido, Romeo 4-1. Esperando vuestras luces.', 'air', true) },
    ],
    dur:37, tick:(dt) => { m8Xfire(dt, 1.3); m8Fx(dt); for (const u of us) if (u.alive && !u.god) u.sup = Math.min(u.sup, 25); },
    onEnd:() => { G.nvAt = null; G.nvR = 0; G.m.air = true; G.m.irR = M8_IR.map(z => m8DashRing(z.x, z.z, z.r, 0x4a8cff)); G.m.mzMap = M8_IR.map(z => ({ x:z.x, z:z.z, r:z.r, col:'#2a5a9a', lab:'Marcar IR' }));
      G.sel = new Set(gLive(grpN('Romeo 4-1'))); refreshCards(); renderSubs(); camS.zoomT = 13;
      hint('Lleva al Romeo 4-1 a los dos círculos azules de la zona de impacto. En cada uno, tu equipo marcará con IR el tejado de al lado para el Little Bird.'); } });
}
// one circle reached: under the goggles, a man throws the IR grenade onto the roof, Star 4-1 makes its run
function m8IR(k){
  const Z = M8_IR[k], R41 = gLive(grpN('Romeo 4-1')), evm = R41.find(u => /Eversmann/.test(u.name)) || R41[0];
  const B0 = BLDS[bAt(Z.roofs[0][0], Z.roofs[0][1])], tx = B0.x + B0.w/2, tz = B0.y + B0.d/2, ty = B0.top;
  const thr = R41.slice().sort((a, b) => Math.hypot(a.x - tx, a.z - tz) - Math.hypot(b.x - tx, b.z - tz))[0];
  const sayU = (u, t) => { if (u){ u.talkT = 2.6; radio(u, t, true); } };
  G.m.irBusy = true; for (const u of R41){ u.path = []; u.order = null; u.stance = 'crouch'; }
  G.m.cf = [thr.x, thr.z]; G.nvAt = [[thr.x, 0, thr.z], [tx, ty, tz]]; let only = null;
  const runAt = () => { const r = G.m.run, p = r && r.lb && r.lb.g.position; return p && r.lb.g.visible && SUP.runs.includes(r) ? [p.x, p.z, p.y] : null; };
  cineStart({ zoom:6.5, spin:.01, yaw0:camS.yaw, focus:() => (G.m.cf === 'run' && runAt()) || (G.m.cf === 'run' ? [tx, tz, ty] : G.m.cf),
    text:L('Visión nocturna · marcando ' + Z.name + ' con infrarrojo'),
    keys:[
      { t:.6, fn:() => sayU(thr, '¡Granada IR! ¡Marcando!') },
      { t:1.6, fn:() => m8Throw(thr, tx + rr(-.8, .8), ty, tz + rr(-.8, .8)) },
      { t:3.4, fn:() => { G.m.cf = [tx, tz, ty]; CINE.zoom = 9; } },
      { t:4.2, fn:() => sayU(evm, `Star 4-1, objetivo marcado. Estroboscopio IR en ${Z.name}.`) },
      { t:8.5, fn:() => { say('Star 4-1', `Veo vuestra luz. Entro desde el ${Z.dir}. ¡Cabezas abajo!`, 'air', true); only = m8Run(k); G.m.cf = 'run'; CINE.zoom = 12; } },
      { t:24, fn:() => { G.m.cf = [tx, tz, ty]; CINE.zoom = 10; say('Star 4-1', 'Objetivo batido. Saliendo de la pasada.', 'air', true); } },
      { t:27.5, fn:() => sayU(k ? G.m.r31[0] : G.m.r22[0], k ? '¡Buen tiro! ¡El este está limpio!' : '¡Buen tiro! ¡Esa azotea ya no dispara!') },
    ],
    dur:31, tick:(dt) => { m8Xfire(dt, 1); m8Fx(dt); if (thr.alive) G.nvAt[0] = [thr.x, 0, thr.z]; { const p = runAt(); G.nvAt[2] = p ? [p[0], 0, p[1]] : [0, -999, 0]; } for (const u of us) if (u.alive && !u.god) u.sup = Math.min(u.sup, 25); },
    onEnd:() => { G.nvAt = null; G.m.irBusy = false; if (only) for (const e of only) if (e.alive) damage(e, 9999, null);
      G.m.irDone[k] = true; if (G.m.irR && G.m.irR[k]){ overlay.remove(G.m.irR[k]); G.m.irR[k] = null; }
      G.m.mzMap = M8_IR.filter((z, q) => !G.m.irDone[q]).map(z => ({ x:z.x, z:z.z, r:z.r, col:'#2a5a9a', lab:'Marcar IR' }));
      G.sel = new Set(gLive(grpN('Romeo 4-1'))); refreshCards(); renderSubs(); } });
}
function m8IRTick(dt){
  m8Xfire(dt, 1); m8Fx(dt);
  if (!G.m.air || G.m.irBusy || CINE.on) return;
  const g = grpN('Romeo 4-1');
  M8_IR.forEach((Z, k) => { if (!G.m.irDone[k] && !G.m.irBusy && gReady(g, Z.x, Z.z, Z.r + .4, 3)) m8IR(k); });
}
// the end: thanks from the plaza and the air, and Garrison on the radio to Steele
function m8Final(){
  const r22 = G.m.r22, sayU = (u, t) => { if (u){ u.talkT = 2.6; radio(u, t, true); } };
  G.m.cf = [S61.x - 2, S61.z - 5]; G.m.mzMap = null;
  cineStart({ zoom:10, spin:.015, yaw0:camS.yaw, focus:() => G.m.cf,
    keys:[
      { t:1, fn:() => say('Star 4-1', 'Romeo 4-1, los tejados están limpios. Buen trabajo con las marcas.', 'air', true) },
      { t:6, fn:() => sayU(r22[0], '¡Gracias, Romeo 4-1! ¡Gracias, Star 4-1! Nos habéis quitado de encima a esos tiradores.') },
      { t:11.5, fn:() => say('Star 4-1', 'Aguantad un poco más ahí abajo. La ayuda está en camino.', 'air', true) },
      { t:16, text:L('Joint Operations Center · aeropuerto de Mogadiscio'), fn:() => { G.m.cf = [M8_HOUSE.x - 2, M8_HOUSE.z + 2]; CINE.zoom = 11; } },
      { t:17, fn:() => say('JOC', 'Capitán Steele, aquí Garrison. Hemos conseguido que los paquistaníes y la 10ª de Montaña organicen un convoy para sacaros de ahí.', 'hq', true) },
      { t:24, fn:() => say('Cap. Steele', 'Recibido, señor. ¿Cuánto les queda?', 'us', true) },
      { t:27.5, fn:() => say('JOC', 'Están formando la columna en el estadio. Aguantad. No vamos a dejar a nadie atrás.', 'hq', true) },
      { t:33.5, fn:() => say('Cap. Steele', 'Recibido. Aguantaremos hasta que lleguen aquí.', 'us', true) },
    ],
    dur:37, tick:(dt) => { m8Fx(dt); },
    onEnd:() => { G.m.fin = true; } });
}
MISSIONS.night = { id:'night', n:8, title:'Resistir de noche', hud:'Destruir el mortero y marcar con IR las azoteas para los Little Birds', phase:'night', hour:19.667, sunHour:21, crashed:['s61', 's64'],
  orbits:[{ lb:true, x:381, z:296, rx:30, rz:24, alt:24, w:2*Math.PI/46 }, { lb:true, x:381, z:296, rx:22, rz:30, alt:27, w:-2*Math.PI/58 }],
  place:'Del Super 6-1 a el edificio de los heridos', squadTxt:'Rangers · Romeo 4-1', date:'3 OCT 1993', noCiv:true, noObjRing:true, endDelay:1.5,
  summary:'Kilo 1-1 vuelve del Super 6-4 y silencia la técnica que tiene clavados a los Rangers del 6-1. Un mortero castiga el edificio de los heridos: el Romeo 4-1 sale de noche a buscarlo y después marca con IR las azoteas para los Little Birds.',
  text:'19:40. Es noche cerrada. Junto al Super 6-1, el Romeo 2-2 y el Romeo 3-1 siguen a cubierto bajo el fuego de una técnica y de las azoteas. Kilo 1-1 vuelve del Super 6-4. En el edificio de los heridos, calle arriba, empiezan a caer granadas de mortero: hay que encontrar el tubo antes de que el edificio se venga abajo.',
  start:[M8_HOUSE.x - 6, M8_HOUSE.z], cam:[S61.x - 6, S61.z - 9, 9], civ:[S61.x, S61.z],
  spawn(){
    // Romeo 4-1, under the player's orders: inside the house with the wounded
    spawnForce([{ name:'Romeo 4-1', role:'Rangers · cazar el mortero', kind:'chalk', specs:chalkSpecs(3).map((s, i) => Object.assign(s, i === 0 ? { role:'Jefe · radio', kit:'radio' } : {})), at:[M8_HOUSE.x - 5, M8_HOUSE.z] }]);
    const hb = m8House(); if (hb) for (const u of gLive(grpN('Romeo 4-1'))) placeInB(u, hb, 'ground');
    // the two Ranger units at the crash: they cannot die, they cannot be ordered
    const R = (name, unit, k) => Object.assign({}, RANGERS[k % 6], RSPEC, { name, role:'A cubierto en el 6-1', unitName:unit, medic:false });
    const mk = (L_, pts, unit, face) => L_.map((n, k) => { const u = npcUnit(R(n, unit, k), pts[k][0], pts[k][1], face);
      u.stance = 'crouch'; u.god = true; u.m8in = true; u.noFire = true; u.order = { type:'hold' }; return u; });
    G.m.r22 = mk(['Tte. Larry Perino', 'Esp. Phipps', 'Esp. Rodriguez', 'Cabo Goodale'], M8_R22, 'Romeo 2-2', 2.85);
    G.m.r31 = mk(['Sgto. Okafor', 'Cabo Lindqvist', 'Herrera', 'Park'], M8_R31, 'Romeo 3-1', 1.4);
    // Kilo 1-1, back from the 6-4: in the dark at the west end of the green street
    const hoot = Object.assign({}, DELTA[1], DSPEC, { name:'Sgto. 1º Hoot Gibson', role:'Jefe de equipo', kit:'radio' });
    G.m.delta = [hoot].concat(deltaSpecs(6).slice(2)).map((s, i) => { const u = npcUnit(Object.assign({}, s, { unitName:'Kilo 1-1' }), M8_GREEN[0][0] - i*1.25, M8_GREEN[0][1] + (i % 2 ? .5 : -.3), PH);
      u.god = true; u.noFire = true; u.stance = 'crouch'; return u; });
    // the technical at the orange cross, lit by a burning barrel, and two men with it
    G.m.tech = techSpawn([[M8_TECH.x, M8_TECH.z - 1], [M8_TECH.x, M8_TECH.z]], 'tech', { vmax:.1 }); G.m.tech.gunner.noFire = true;
    G.m.techCrew = [[368.9, 278.6], [372.4, 279.2]].map(([x, z]) => { const e = foe(x, z, 'post', 'tech', CAMP_ESPEC); e.x = x; e.z = z; e.noFire = true; e.face = 0; e.stance = 'stand'; return e; });
    { const g = new T.Mesh(new T.CylinderGeometry(.3, .3, .85, 10), new T.MeshLambertMaterial({ color:0x5a3a26 })); g.position.set(M8_BARREL.x, .43, M8_BARREL.z); g.castShadow = true; world.add(g);
      emitters.push({ x:M8_BARREL.x, z:M8_BARREL.z, y:.95, rate:16, life:8, vy:1.15, s0:.24, s1:1.8, fire:.45, acc:0, sp:.24, lsrc:true });
      LIGHTSRC.push({ x:M8_BARREL.x, y:1.3, z:M8_BARREL.z, col:0xff7428, i:3.2, d:11, fl:1 }); }
    // the wreck still smoulders and lights the plaza a little
    emitters.push({ x:S61.x + .8, z:S61.z - .4, y:.9, rate:16, life:8, vy:1.15, s0:.24, s1:1.8, fire:.45, acc:0, sp:.24, lsrc:true });
    LIGHTSRC.push({ x:S61.x + .8, y:1.2, z:S61.z - .4, col:0xff7a30, i:2.6, d:10, fl:1 });
    // the three roofs, the pickets in the streets, the mortar
    for (const [x, z, n] of M8_ROOFS){ const b = bAt(x, z); if (b >= 0) m8RoofFill(BLDS[b], n); }
    m8Streets(); m8Mortar();
    G.m.bHp = 100;
    G.m.syms = [{ label:'ROMEO 2-2', pts:() => G.m.r22.filter(u => u.alive).map(u => [u.x, u.z]) },
                { label:'ROMEO 3-1', pts:() => G.m.r31.filter(u => u.alive).map(u => [u.x, u.z]) },
                { label:'KILO 1-1', pts:() => G.m.delta.filter(u => u.alive && u.m8in).map(u => [u.x, u.z]) }];
  },
  onStart(){ m8Intro(); },
  subs:[
    { text:'Encontrar el mortero y acabar con sus tres sirvientes', zone:{ x:M8_HOUSE.x, z:M8_HOUSE.z, r:5 },
      start:() => { G.m.zr = M8_ZONES.map(z => ringAt(z.x, z.z, z.r, 0xe7a63d)); G.m.mzMap = M8_ZONES; },
      tick:() => m8Tick(G.dt || 1/30),
      count:() => 'edificio ' + Math.round(G.m.bHp) + ' %',
      done:() => tagDone('mortar'),
      onDone:() => { G.m.mDone = true; for (const r of G.m.zr || []) overlay.remove(r); G.m.zr = []; G.m.mzMap = null;
        sched.push({ at:G.t + 2, fn:() => say('Cap. Steele', 'Ha dejado de caer. Buen trabajo, Romeo 4-1.', 'us', true) });
        sched.push({ at:G.t + 4.5, fn:() => say('Uniform 6-4', 'Recibido, Romeo 4-1. Mortero fuera de combate.', 'hq', true) }); },
      radio:'¡Mortero neutralizado! ¡Ya no dispara!' },
    { text:'Marcar con IR las azoteas para los Little Birds (círculos azules)', zone:{ x:389, z:298.6, r:6 },
      start:() => { G.m.irDone = [false, false]; sched.push({ at:G.t + 7, fn:() => m8AirIntro() }); },
      tick:() => m8IRTick(G.dt || 1/30),
      count:() => [G.m.irDone.filter(Boolean).length, 2],
      done:() => G.m.irDone.every(Boolean) && !CINE.on },
    { text:'Aguantar: la ayuda está en camino', zone:{ x:S61.x, z:S61.z, r:8 },
      start:() => m8Final(), tick:() => m8Fx(G.dt || 1/30), done:() => !!G.m.fin },
  ],
  opt:[{ text:'Que el edificio aguante por encima del 50 %', ok:() => (G.m.bHp || 0) >= 50 }] };

