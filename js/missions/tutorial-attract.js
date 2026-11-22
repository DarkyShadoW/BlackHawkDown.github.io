"use strict";
/* ---- tutorial: Romeo 4-1 on the training ground by the beach, across the runway from the TFR hangars ---- */
// airport frame (u along the runway, v toward the sea); the grid slides here for this mission only
const TZ = { u0:-74, u1:-30, v0:22, v1:62, g0:30, g1:36, div:42 };   // the gate (g0..g1, along v) is in the west end, facing the track
// the rutted track from the gate out across the open ground toward the runway
const TZ_TRACK = [[-74.5, 33], [-86, 32.4], [-97, 30], [-106, 25.5], [-112, 19.5], [-115.5, 12.5]];
let TZTRACK = [];
const TZ_START = [-63.5, 33], TZ_STAGE = [-70, 31.6], TZ_BLD = { u:-56.5, v:26, h:2.25, top:1.9 }, TZ_TGT = [[-35.5, 27], [-35.5, 32], [-35.5, 37]], TZ_FWD = [-45.6, 32];
const TZ_SAND = [ [-59, 29.5, 33.5], [-59, 35.5, 39.5], [-51, 26, 30], [-51, 33, 37], [-44, 24.5, 28.5], [-44, 31, 35], [-44, 38, 41] ];   // [u, v0, v1]: sandbag lines across the course
const tzW = (u, v) => { const p = AIRP(u, v); return { x:p[0], z:p[1] }; };
// every grid cell whose centre falls inside a rectangle of the airport frame
function tzCells(u0, u1, v0, v1, fn){
  const c = [AIRP(u0, v0), AIRP(u1, v0), AIRP(u0, v1), AIRP(u1, v1)];
  const x0 = Math.floor(Math.min(...c.map(p => p[0]))), x1 = Math.ceil(Math.max(...c.map(p => p[0]))), z0 = Math.floor(Math.min(...c.map(p => p[1]))), z1 = Math.ceil(Math.max(...c.map(p => p[1])));
  for (let j=z0;j<=z1;j++) for (let i=x0;i<=x1;i++){ const [u, v] = airUV(i + .5, j + .5); if (u >= u0 && u <= u1 && v >= v0 && v <= v1 && inB(i,j)) fn(i, j, idx(i,j)); }
}
const tzBlock = (u0, u1, v0, v1) => tzCells(u0, u1, v0, v1, (i, j, k) => { if (grid[k] === 0) grid[k] = 2; });
function tzCover(u0, u1, v0, v1, kind){
  const o = { kind, val:COVER_VAL[kind], cells:[], i:0, j:0, dir:'x', fuel:false, g:null };
  tzCells(u0, u1, v0, v1, (i, j, k) => { if (grid[k] !== 0) return; grid[k] = 2; cov[k] = o; o.cells.push(k); if (o.cells.length === 1){ o.i = i; o.j = j; } });
  return o;
}
// a wall of sandbags along u (alongU) or along v, three courses high
function tzBags(u0, u1, v0, v1, h){
  const alongU = (u1 - u0) >= (v1 - v0), L = alongU ? u1 - u0 : v1 - v0, n = Math.max(1, Math.round(L/.42)), st = L/n, cu = (u0 + u1)/2, cv = (v0 + v1)/2, rows = h || 3;
  MAT = M.BAG;
  for (let r=0;r<rows;r++) for (let k=0;k<n;k++){ const t = (alongU ? u0 : v0) + st*(k + .5 + (r % 2 ? .5 : 0)); if (t > (alongU ? u1 : v1) - .1) continue;
    const u = alongU ? t : cu, v = alongU ? cv : t, sx = alongU ? st*.96 : .44, sz = alongU ? .44 : st*.96;
    rb(u, v, .1 + r*.19, sx, .2, sz, jit(r % 2 ? 0xa8956a : 0xb4a173, .08), { ry:AIR_RY + rr(-.05, .05) }); }
}
// a camouflage net: leafy patches with holes, sagging between the poles; the roofs button lifts it away
function tzNet(u, v, su, sv, y){
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  for (let k=0;k<400;k++){ c.fillStyle = pick(['#5a6340', '#6b6a46', '#4a5236', '#7d7150', '#575b3a']); c.beginPath();
    const x = rnd()*256, y_ = rnd()*256, r = rr(4, 11); for (let q=0;q<6;q++){ const a = q/6*6.283 + rnd()*.6; c.lineTo(x + Math.cos(a)*r*rr(.5, 1.2), y_ + Math.sin(a)*r*rr(.5, 1.2)); } c.fill(); }
  c.strokeStyle = 'rgba(40,40,30,.9)'; c.lineWidth = 1; for (let k=0;k<=256;k+=16){ c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 256); c.moveTo(0, k); c.lineTo(256, k); c.stroke(); }
  const tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(su/6, sv/6);
  const geo = new T.PlaneGeometry(su, sv, 10, 12); geo.rotateX(-Math.PI/2);
  const P_ = geo.attributes.position; for (let k=0;k<P_.count;k++){ const x = P_.getX(k)/(su/2), z = P_.getZ(k)/(sv/2); P_.setY(k, -.28*(1 - x*x)*(1 - z*z) + (rnd() - .5)*.06); } geo.computeVertexNormals();
  const mat = new T.MeshLambertMaterial({ map:tex, alphaTest:.5, side:T.DoubleSide });
  const m = new T.Mesh(geo, mat); const p = AIRP(u, v); m.position.set(p[0], y, p[1]); m.rotation.y = AIR_RY; m.castShadow = true; m.receiveShadow = true;
  m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking:T.RGBADepthPacking, map:tex, alphaTest:.5 }); world.add(m);
  return m;
}
// concertina: loose loops of razor wire along a line
function tzCoil(a, b, c, alongU){
  MAT = M.METAL;
  for (let t=a + .2; t<b; t+=.42) for (const s of [-1, 1]){ const u = alongU ? t : c, v = alongU ? c : t;
    rb(u, v, .42, .025, .82, .025, 0x6e6e68, alongU ? { rx:s*.72 + rr(-.1, .1), ord:'YXZ' } : { rz:s*.72 + rr(-.1, .1), ord:'YXZ' }); }
  for (const y of [.06, .8]){ const u = alongU ? (a + b)/2 : c, v = alongU ? c : (a + b)/2; rb(u, v, y, alongU ? b - a : .025, .025, alongU ? .025 : b - a, 0x6e6e68); }
}
// the white targets: plywood boards on two stakes, a black silhouette and rings
let TZ_TEX = null;
function tzTex(){
  if (TZ_TEX) return TZ_TEX;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const c = cv.getContext('2d');
  c.fillStyle = '#f2efe6'; c.fillRect(0, 0, 64, 96);
  c.fillStyle = '#1e1e1c'; c.beginPath(); c.arc(32, 22, 10, 0, 6.29); c.fill(); c.fillRect(14, 34, 36, 62); c.fillRect(22, 30, 20, 6);
  c.strokeStyle = '#f2efe6'; c.lineWidth = 2; for (const r of [6, 13, 20]){ c.beginPath(); c.arc(32, 58, r, 0, 6.29); c.stroke(); }
  c.fillStyle = '#c23a2a'; c.beginPath(); c.arc(32, 58, 3, 0, 6.29); c.fill();
  TZ_TEX = new T.CanvasTexture(cv); return TZ_TEX;
}
function tzBoard(parent, y){
  const g = new T.Group(); parent.add(g);
  for (const s of [-1, 1]) box(.07, y + .5, .07, 0x6a5236, s*.36, (y + .5)/2, -.05, g);
  box(.86, 1.12, .04, 0xe8e4d8, 0, y + .2, 0, g);
  const f = new T.Mesh(new T.PlaneGeometry(.82, 1.08), new T.MeshLambertMaterial({ map:tzTex() })); f.position.set(0, y + .2, .025); f.castShadow = true; g.add(f);
  return g;
}
function tzTarget(u, v){
  const p = tzW(u, v), e = foe(p.x, p.z, 'post', 'tg', { name:'Diana', hp:100, acc:0, noFire:true });
  e.x = p.x; e.z = p.z; e.dummy = true; e.stance = 'stand'; e.face = AIR_RY - PH;
  e.m.root.traverse(o => { if (o !== e.m.root && o !== e.m.hb && o !== e.m.mark && o.isMesh) o.visible = false; });
  e.m.tg = tzBoard(e.m.root, .62);
  return e;
}
function tzStatic(u, v, ry){ const p = tzW(u, v), g = new T.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = ry; world.add(g); tzBoard(g, .62); return g; }
function buildTrainingGround(){
  // the grid moves onto the airfield, empty: everything the soldiers need is written in below
  ORX = Math.floor(AIR.x) - 384; ORZ = Math.floor(AIR.z) - 384;
  grid.fill(0); topH.fill(0); cov.fill(null); reserved.fill(0); ground.fill(0); BID.fill(-1); BLDS = []; HG = new Array(W*H);
  for (const A of [STR, SVW, SHW]) A.fill(0); for (const A of [SVX, SHZ]) A.fill(-1);
  const C0 = tzW(-52, 42);
  for (let j=Math.floor(C0.z)-110;j<=C0.z+110;j++) for (let i=Math.floor(C0.x)-110;i<=C0.x+110;i++) if (inB(i,j) && coastS(i + .5, j + .5) > -3) grid[idx(i,j)] = 3;
  TZONE = TZ;
  const Z = TZ;
  // fence: posts, two strands, concertina coiled outside; jersey barriers along the side facing the runway; the gate gap stays open
  const fenceU = (u0, u1, v, out) => { tzBlock(u0, u1, v - .55, v + .55);
    for (let u=u0; u<u1 - .1; u+=4){ const e = Math.min(u + 4, u1); MAT = M.METAL; rb(u, v, .95, .1, 1.9, .1, 0x6a6a64); rb((u + e)/2, v, 1.3, e - u, .04, .04, 0x8a8a84); rb((u + e)/2, v, .65, e - u, .04, .04, 0x8a8a84); }
    MAT = M.METAL; rb(u1, v, .95, .1, 1.9, .1, 0x6a6a64);
    tzCoil(u0, u1, v + out, true); };
  const fenceV = (v0, v1, u, out) => { tzBlock(u - .55, u + .55, v0, v1);
    for (let v=v0; v<v1 - .1; v+=4){ const e = Math.min(v + 4, v1); MAT = M.METAL; rb(u, v, .95, .1, 1.9, .1, 0x6a6a64); rb(u, (v + e)/2, 1.3, .04, .04, e - v, 0x8a8a84); rb(u, (v + e)/2, .65, .04, .04, e - v, 0x8a8a84); }
    MAT = M.METAL; rb(u, v1, .95, .1, 1.9, .1, 0x6a6a64);
    tzCoil(v0, v1, u + out, false); };
  fenceU(Z.u0, Z.u1, Z.v0, -1.3); fenceU(Z.u0, Z.u1, Z.v1, 1.3);
  fenceV(Z.v0, Z.g0, Z.u0, -1.3); fenceV(Z.g1, Z.v1, Z.u0, -1.3); fenceV(Z.v0, Z.v1, Z.u1, 1.3);
  for (let u=Z.u0 + 1.2; u<Z.u1 - 1; u+=2.3){ jersey(u, Z.v0 - 2.6, 1, true); tzBlock(u - 1.1, u + 1.1, Z.v0 - 3, Z.v0 - 2.2); }
  // the gate: a striped lifting barrier on its post, the guard hut, the flag
  const gp = tzW(Z.u0 - .5, Z.g0 - .3), gate = new T.Group(); gate.position.set(gp.x, 0, gp.z); gate.rotation.y = AIR_RY - PH; world.add(gate);
  box(.26, 1.1, .26, 0xd8d4c8, 0, .55, 0, gate); box(.3, .14, .3, 0xb02a1c, 0, 1.05, 0, gate);
  const arm = new T.Group(); arm.position.set(0, .98, 0); gate.add(arm);
  for (let k=0;k<8;k++) box(.74, .1, .1, k % 2 ? 0xb02a1c : 0xf0ece0, .5 + k*.74, 0, 0, arm);
  box(.1, .7, .1, 0x6a6a64, Z.g1 - Z.g0 + .6, .35, 0, gate);
  G.m.arm = arm; G.m.armA = 0; G.m.armT = 0;
  { const hu = -76.1, hv = 38.5;   // the guard hut just outside, beside the gate
    MAT = M.WOOD; rb(hu, hv, 1.15, 2.3, 2.3, 2.3, 0xc8c0aa); MAT = M.TIN; rb(hu, hv, 2.36, 2.8, .12, 2.8, 0x7a7a72);
    MAT = M.GLASS; rb(hu - 1.18, hv, 1.45, .04, .6, 1.2, 0x2b2925); rb(hu, hv - 1.18, 1.45, 1.2, .6, .04, 0x2b2925);
    MAT = M.WOOD; rb(hu, hv + 1.18, .9, .8, 1.7, .05, 0x5a4a38);
    tzBlock(hu - 1.3, hu + 1.3, hv - 1.3, hv + 1.3); }
  { const f = tzW(-75.8, 41.6); makeFlag(f.x, f.z, 6.5, 0, 'us'); tzBlock(-76.2, -75.4, 41.2, 42); }
  MAT = M.BAG; tzBags(-77.2, -76.6, 27, 29.2, 2); tzBlock(-77.4, -76.4, 26.8, 29.4);
  // the track: wheel ruts from the gate out toward the runway, kept clear of scrub
  TZTRACK = []; let pos_ = 0; for (let k=0;k<TZ_TRACK.length-1;k++){ const a = tzW(...TZ_TRACK[k]), b = tzW(...TZ_TRACK[k+1]); TZTRACK.push([a.x, a.z, b.x, b.z, 3.2, false, pos_]); pos_ += Math.hypot(b.x - a.x, b.z - a.z); }

  // Humvees: one parked outside by the wire, one inside by the divider
  humveeAt(-79.6, 27.2, AIR_RY + PH); tzCover(-81.8, -77.4, 26.5, 27.9, 'car');
  humveeAt(-70.6, 39.4, AIR_RY + PH); tzCover(-72.6, -68.6, 38.7, 40.1, 'car');
  // the divider: a sandbag wall down the middle, a gap by the entrance
  tzBags(-71, Z.u1, Z.div - .3, Z.div + .3); tzCover(-71, Z.u1, Z.div - .55, Z.div + .55, 'sandbag');
  // the course side: the grey block with a usable roof, sandbag lines at different distances, three white targets before the berm
  { const B_ = TZ_BLD, h = B_.h, id = BLDS.length, cells = [];
    tzCells(B_.u - h - .2, B_.u + h + .2, B_.v - h - .2, B_.v + h + .2, (i, j, k) => { grid[k] = 1; topH[k] = B_.top + .25; BID[k] = id; cells.push([i, j]); });
    const xs = cells.map(c => c[0]), zs = cells.map(c => c[1]), x0 = Math.min(...xs), z0 = Math.min(...zs);
    const pts = []; for (let a=-h + .6; a<=h - .6 + .01; a+=1.1) for (const [du, dv] of [[a, -h + .55], [a, h - .55], [-h + .55, a], [h - .55, a]]){ const p = tzW(B_.u + du, B_.v + dv); if (!pts.some(q => Math.hypot(q[0] - p.x, q[1] - p.z) < .9)) pts.push([p.x, p.z]); }
    BLDS.push({ id, x:x0, y:z0, w:Math.max(...xs) - x0 + 1, d:Math.max(...zs) - z0 + 1, top:B_.top, pts, name:'Edificio de instrucción' });
    MAT = M.CONC; const g = 0x9c9c96, s = 2*h;
    rb(B_.u, B_.v, B_.top/2, s, B_.top, s, g, { b:id }); rb(B_.u, B_.v, .2, s + .04, .4, s + .04, 0x84847e, { b:id });
    rb(B_.u, B_.v, B_.top + .03, s + .08, .08, s + .08, 0x8a8a84, { b:id });
    for (const [du, dv, su, sv] of [[0, -h + .06, s, .12], [0, h - .06, s, .12], [-h + .06, 0, .12, s], [h - .06, 0, .12, s]]) rb(B_.u + du, B_.v + dv, B_.top + .25, su, .4, sv, 0xa6a6a0, { b:id, roof:1 });
    MAT = M.WOOD; rb(B_.u - h - .02, B_.v + 1, .62, .04, 1.2, .7, 0x4a3a2c, { b:id });
    MAT = M.GLASS; for (const dv of [-1.1, 1.1]) rb(B_.u + h + .02, B_.v + dv, 1.15, .04, .42, .6, 0x2b2925, { b:id }); rb(B_.u, B_.v + h + .02, 1.15, .6, .42, .04, 0x2b2925, { b:id });
    MAT = M.METAL; for (const dv of [-.25, .25]) rb(B_.u - h - .08, B_.v - 1.3 + dv, B_.top/2 + .3, .05, B_.top + .6, .05, 0x5a5a54); for (let y=.3; y<B_.top + .4; y+=.32) rb(B_.u - h - .08, B_.v - 1.3, y, .05, .04, .5, 0x5a5a54);
  }
  for (const [u, a, b] of TZ_SAND){ tzBags(u - .3, u + .3, a, b); tzCover(u - .55, u + .55, a, b, 'sandbag'); }
  MAT = M.STONE; rb(-31.6, 42, .65, 2.6, 1.3, Z.v1 - Z.v0 - 2, 0xc9b38c); rb(-31.6, 42, 1.35, 1.6, .3, Z.v1 - Z.v0 - 2.4, 0xc0a880); tzBlock(-33, -30.6, Z.v0 + 1, Z.v1 - 1);
  G.m.tg = TZ_TGT.map(([u, v]) => tzTarget(u, v));
  // the range side: a camouflage sun-shade net over the firing line, a sandbag bench, three more targets downrange
  MAT = M.METAL; for (const u of [-70.5, -60.5]) for (const v of [45.5, 58.5]) rb(u, v, 1.25, .1, 2.5, .1, 0x5a5a50);
  G.m.net = tzNet(-65.5, 52, 10.8, 13.8, 2.45);
  tzBags(-63.2, -62.6, 46.6, 57.4, 2); tzCover(-63.45, -62.4, 46.6, 57.4, 'sandbag');
  MAT = M.WOOD; rb(-67.6, 56.6, .4, 1.6, .8, .8, 0x6a5a40); MAT = M.METAL; for (let k=0;k<3;k++) rb(-67.9 + k*.38, 56.6, .92, .3, .22, .5, 0x4e5a36); tzBlock(-68.5, -66.7, 56.1, 57.1);
  for (const v of [47.5, 51.5, 55.5]) tzStatic(-34.6, v, AIR_RY - PH);
  // packed earth inside, and nothing grows there
  G.m.zone = true;
}
// the soldiers on the range: two shooting, the sergeant watching; their rounds strike the boards downrange
function tutTick(dt){
  if (!G.m.range) return;
  tzLifeTick(dt);
  for (const u of G.m.range.shoot){ u.rT = (u.rT == null ? rnd()*2 : u.rT) - dt; u.sup = 0; u.stance = 'crouch';
    if (u.rT <= 0){ u.rT = rr(1.4, 3.2); const t = tzW(-34.6, u.lane); u.face = Math.atan2(t.x - u.x, t.z - u.z); u.firing = .6; burstFx(u, t.x + rr(-.25, .25), rr(.7, 1.2), t.z + rr(-.25, .25), false); } }
  const sg = G.m.sgt; if (sg && sg.alive){ sg.sup = 0; if (!sg.path.length) sg.stance = 'stand'; }
  if (G.m.guard){ G.m.guard.sup = 0; G.m.guard.stance = 'stand'; }
  // the barrier arm swings up while the squad goes through, then comes down again
  if (G.m.arm){ const want = G.m.armUp ? 1.35 : 0; G.m.armA += clamp(want - G.m.armA, -dt*1.1, dt*1.1); G.m.arm.rotation.z = G.m.armA; }
  // live rounds here, but no one runs dry on the training ground
  for (const u of us) if (u.alive && !u.npc && u.ammo < u.ammo0*.5) u.ammo = u.ammo0;
}

// life around the base while Romeo 4-1 heads for the range: PT by the tents, parked vehicles, a KC-10 unloading, a Black Hawk coming in
const TZ_KC10 = { u:-27, v:-91 }, TZ_LAND = { u:-116, v:-72 };
function m939At(u, v, ry){
  const p = AIRP(u, v), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = ry; world.add(g);
  withModel('m939', M_ => { if (!M_.lit){ M_.lit = true; M_.mat.color.setRGB(1.8, 1.8, 1.7); } const q = lodMesh(M_.geos.body, M_.mat); q.castShadow = true; q.receiveShadow = true; g.add(q); });
  return g;
}
function kc10At(u, v, ry){
  const p = AIRP(u, v), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = ry; world.add(g);
  withModel('kc10', M_ => { if (!M_.lit){ M_.lit = true; M_.mat.color.setRGB(1.0, 1.02, 1.05); } const q = lodMesh(M_.geos.body, M_.mat); q.castShadow = true; q.receiveShadow = true; g.add(q); });
  return g;
}
function tzBaseLife(){
  const R = (name, extra) => Object.assign({}, RANGERS[k_ = (k_ + 1) % 6], RSPEC, { name, role:'Fusilero', unitName:'Base TFR' }, extra || {});
  let k_ = 0;
  // PT in the open ground between the two blocks of tents: two rows doing push-ups, a sergeant counting
  G.m.pt = [];
  const PTN = ['Sold. Kowalewski', 'Esp. Thomas', 'Sold. Moynihan', 'Esp. Lycopolus', 'Sold. Rodriguez', 'Esp. Hand', 'Sold. Neathery', 'Esp. Heard'];
  PTN.forEach((n, i) => { const p = tzW(-57.5 + (i % 4)*2.6, -147.5 + (i >> 2)*3.4), u = npcUnit(R(n), p.x, p.z, AIR_RY + Math.PI); u.noFire = true; u.stance = 'prone'; u.pushup = rnd()*6; G.m.pt.push(u); });
  { const p = tzW(-53.6, -151.6); G.m.ptSgt = npcUnit(R('Sgto. Ed Yurek', { kit:'radio' }), p.x, p.z, AIR_RY); G.m.ptSgt.noFire = true; }
  { const f = tzW(-53, -136.5); makeFlag(f.x, f.z, 7, 0, 'us'); }
  // vehicles parked along the front of the tents: Humvees and M939 trucks
  humveeAt(-64, -131, AIR_RY + PH); humveeAt(-60, -131, AIR_RY + PH); humveeAt(-44, -131, AIR_RY - PH);
  m939At(-86, -128.5, AIR_RY + PH); m939At(-79, -128.5, AIR_RY + PH); m939At(-23, -128.5, AIR_RY - PH);
  // the slots of the mission Black Hawks are filled too: nothing has flown yet
  for (let k=0;k<BHROW.fly;k++){ if (k === 3) continue; const p = AIRP(BHROW.u + k*BHROW.step, BHROW.v); parkedHeli(p[0], p[1], AIR_RY); }
  for (let k=0;k<LBROW.fly;k++){ const p = AIRP(LBROW.u + k*LBROW.step, LBROW.v), lb = littleBird(); lb.g.position.set(p[0], 0, p[1]); lb.g.rotation.y = AIR_RY; lb.rotor.rotation.y = k*.9; world.add(lb.g); }
  // a KC-10 on the apron, nose toward the hangars, air stairs at the forward door and men coming down
  const K = TZ_KC10; kc10At(K.u, K.v, AIR_RY);
  const du = K.u - 12.2, top = K.v - 2.1, bot = K.v - 6.6;
  MAT = M.METAL; for (let s=0;s<9;s++){ const f = s/8; rb(du, top + (bot - top)*f, 3.0*(1 - f) + .05, 1.3, .08, .5, 0xd8d4c8); }
  for (const o of [-.68, .68]){ const a = AIRP(du + o, (top + bot)/2); B(a[0], 1.75, a[1], .06, .06, Math.hypot(bot - top, 3)*1.02, 0x9a9a94, { ry:AIR_RY, rx:Math.atan2(3, bot - top), ord:'YXZ' }); rb(du + o, bot, .55, .08, 1.1, .08, 0x9a9a94); rb(du + o, top, 3.4, .08, .9, .08, 0x9a9a94); }
  rb(du, top - .2, 2.95, 1.6, .1, 1.2, 0xc8c4b8);
  G.m.stairs = { top:tzW(du, top - .2), bot:tzW(du, bot - .6), n:0, next:2 };
  G.m.walkers = [];
  G.m.stairNames = ['Esp. Dale Sizemore', 'Esp. Brian Heard', 'Sold. Jason Coleman', 'Sold. Richard Kowalewski', 'Esp. Eric Spalding', 'Esp. Melvin dePriest', 'Sold. Peter Neathery', 'Sold. Jeff Bray', 'Esp. Lorenzo Ruiz'];
}
// a man stepping off the stairs walks to the tents; push-ups go on and on
function tzLifeTick(dt){
  const S = G.m.stairs;
  if (S && S.n < 9 && G.t >= S.next){ S.next = G.t + 1.7; const R = Object.assign({}, RANGERS[S.n % 6], RSPEC, { name:G.m.stairNames[S.n], role:'Fusilero', unitName:'Base TFR', kit:'pack' });
    const u = npcUnit(R, S.top.x, S.top.z, AIR_RY + Math.PI); u.noFire = true; u.stairT = 0; u.elev = 3.1; G.m.walkers.push(u); S.n++; }
  for (const u of G.m.walkers || []){
    if (u.stairT != null){ u.stairT += dt/2.6; const f = Math.min(1, u.stairT); u.x = S.top.x + (S.bot.x - S.top.x)*f; u.z = S.top.z + (S.bot.z - S.top.z)*f; u.elev = 3.1*(1 - f);
      u.vx = (S.bot.x - S.top.x)/2.6; u.vz = (S.bot.z - S.top.z)/2.6; u.face = Math.atan2(u.vx, u.vz); u.path = [];
      if (f >= 1){ u.stairT = null; u.elev = 0; const i = G.m.walkers.indexOf(u), p = tzW(-74 + (i % 5)*1.3 + (i > 4 ? 32 : 0), -133.5 - (i % 2)); goTo(u, p.x, p.z); } }
    u.sup = 0; }
  for (const u of G.m.pt || []){ u.sup = 0; u.stance = 'prone'; u.path = []; }
  // the three by the entrance talk in turns, turning to whoever speaks
  for (const u of G.m.chat || []){ u.sup = 0; u.stance = 'stand'; u.chatT -= dt;
    if (u.chatT <= 0){ u.chatT = rr(2.5, 6); if (rnd() < .6){ u.talkT = rr(1.4, 2.8); for (const o of G.m.chat) if (o !== u) o.face = Math.atan2(u.x - o.x, u.z - o.z); } } }
  // and one man strolls round the open ground by the gate, never into the lanes
  const w = G.m.walk; if (w && w.alive){ w.sup = 0;
    if (!w.path.length){ w.waitT -= dt; if (w.waitT <= 0){ const p = w.wp[w.wi]; w.wi = (w.wi + 1) % w.wp.length; goTo(w, p.x, p.z); w.waitT = rr(1, 4); } } }
  if (G.m.ptSgt){ G.m.ptSgt.sup = 0; G.m.ptSgt.stance = 'stand'; }
}
// the push-up: the whole body tilts about the toes, up and down
function pushupPose(u){
  const r = u.m.root; r.rotation.order = 'YXZ';
  const a = .05 + .26*(.5 + .5*Math.sin(G.t*3.1 + u.pushup));
  r.rotation.x = -a; r.position.y = .78*Math.sin(a);
  if (u.m.gun) u.m.gun.visible = false;
}

/* ---- tutorial guide: a blue arrow over the button to press (which blinks), or over the spot to tap ---- */
let TUT_EL = null, TUT_ARROW = null;
const _tv = new T.Vector3();
function tutGuide(){
  if (!TUT_ARROW){ TUT_ARROW = document.createElement('div'); TUT_ARROW.id = 'tutArrow'; TUT_ARROW.setAttribute('aria-hidden', 'true');
    TUT_ARROW.innerHTML = '<svg viewBox="0 0 34 42" width="34" height="42"><path d="M10 1h14v20h9L17 41 1 21h9z" fill="#3b8bff" stroke="#0b1d33" stroke-width="2" stroke-linejoin="round"/></svg>'; document.body.appendChild(TUT_ARROW); }
  let el = null, wp = null;
  const on = MIS.id === 'tutorial' && G && G.started && !G.over && !CINE.on && !document.body.classList.contains('menuopen');
  if (on){
    const P = tutPlayers(), all = P.length && P.every(u => G.sel.has(u)), k = G.sub, one = G.sel.size === 1 && P.some(u => G.sel.has(u));
    const at = (u, v) => { const p = tzW(u, v); return [p.x, .2, p.z]; }, onU = u => u ? [u.x, (u.elev || 0) + 2, u.z] : null;
    if (k === 0){ if (!all) wp = onU(P[0]); else if (!G.m.allMove) wp = at(...TZ_START); }
    else if (k === 1){ if (!all) wp = onU(P[0]); else if (!G.m.covUsed) el = 'oCov'; }
    else if (k === 2){ if (!one) wp = onU(P.find(u => !u.inB) || P[0]); else wp = [tzW(TZ_BLD.u, TZ_BLD.v).x, TZ_BLD.top + .4, tzW(TZ_BLD.u, TZ_BLD.v).z]; }
    else if (k === 3){ if (!G.sel.size) wp = onU(P[0]); else if (G.mode !== 'suppress' && !(G.m.supT > 0)) el = 'oSup'; else if (G.mode === 'suppress') wp = at(-35.5, 32); }
    else if (k === 4){ if (!one) wp = onU(P.filter(u => !u.inB && !(u.soloT >= G.m.soloStart)).sort((a, b) => b.x - a.x)[0]); else wp = at(...TZ_FWD); }
    else if (k === 5){ if (!G.sel.size) wp = onU(P[0]); else if (G.mode !== 'attack') el = 'oAtk'; else { const t = (G.m.tg || []).find(e => e.alive); if (t) wp = [t.x, 1.9, t.z]; } }
  }
  const E = el ? $(el) : null;
  if (TUT_EL && TUT_EL !== E) TUT_EL.classList.remove('tut-blink');
  TUT_EL = E; if (E) E.classList.add('tut-blink');
  let x = null, y = null;
  if (E){ const r = E.getBoundingClientRect(); if (r.width > 0){ x = r.left + r.width/2; y = r.top - 6; } }
  else if (wp){ _tv.set(wp[0], wp[1], wp[2]).project(cam); if (_tv.z < 1){ x = (_tv.x + 1)/2*innerWidth; y = (1 - _tv.y)/2*innerHeight; } }
  if (x == null){ TUT_ARROW.style.display = 'none'; return; }
  TUT_ARROW.style.display = 'block'; TUT_ARROW.style.left = x + 'px'; TUT_ARROW.style.top = y + 'px';
}
const tutPlayers = () => us.filter(u => u.alive && !u.npc);
function tutSgt(t){ const s = G.m.sgt; if (s){ s.talkT = 2.4; radio(s, t, true); } }
/* the opening: Romeo 4-1 waits on the training ground; a Humvee brings the new man, Blackburn, and the sergeant who drops him off */
function tzHumvee(){
  const v = irVehicle('h'), inP = [[-100.5, 28.8], [-97, 30], [-92, 31.4], [-88, 32.2], [-81.8, 32.6]].map(q_ => { const w = tzW(...q_); return [w.x, w.z]; });
  const outP = [[-81.8, 32.6], [-84.5, 35.6], [-90, 35.4], [-97, 30.6], [-106, 25.5], [-112, 19.5], [-115.5, 12.5]].map(q_ => { const w = tzW(...q_); return [w.x, w.z]; });
  const H = { v, path:smoothRoute(inP, 1.5), s:0, sp:0, go:true, out:false, done:false };
  H.L = H.path.reduce((a_, p_, k) => k ? a_ + Math.hypot(p_[0] - H.path[k-1][0], p_[1] - H.path[k-1][1]) : 0, 0);
  H.leave = () => { H.path = smoothRoute(outP, 1.5); H.L = H.path.reduce((a_, p_, k) => k ? a_ + Math.hypot(p_[0] - H.path[k-1][0], p_[1] - H.path[k-1][1]) : 0, 0); H.s = 0; H.sp = 0; H.go = true; H.out = true; };
  H.at = s_ => { let k = 0, acc = 0; while (k < H.path.length - 2){ const d = Math.hypot(H.path[k+1][0] - H.path[k][0], H.path[k+1][1] - H.path[k][1]); if (acc + d >= s_) break; acc += d; k++; }
    const a_ = H.path[k], b_ = H.path[k+1], d = Math.hypot(b_[0] - a_[0], b_[1] - a_[1]) || 1, f = clamp((s_ - acc)/d, 0, 1); return [a_[0] + (b_[0] - a_[0])*f, a_[1] + (b_[1] - a_[1])*f, Math.atan2(b_[0] - a_[0], b_[1] - a_[1])]; };
  H.step = dt => { if (!H.go) return; const left = H.L - H.s, vmax = H.out ? 7 : 6.5;
    H.sp = Math.min(vmax, H.out ? H.sp + dt*3.2 : Math.max(H.sp, 4.5) + dt*3.2, H.out ? 99 : Math.sqrt(2*2.6*Math.max(0, left)) + .05); H.s = Math.min(H.L, H.s + H.sp*dt);
    const [x, z, yw] = H.at(H.s); v.g.position.set(x, 0, z); let dy = yw - v.g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); v.g.rotation.y += dy*Math.min(1, dt*5);
    if (H.s >= H.L - .02){ H.go = false; if (H.out){ world.remove(v.g); H.done = true; } } };
  const [x0, z0, y0] = H.at(0); v.g.position.set(x0, 0, z0); v.g.rotation.y = y0;
  return H;
}
function tzDoor(H, side, along){ const g = H.v.g, yw = g.rotation.y, fx = Math.sin(yw), fz = Math.cos(yw), rx = fz, rz = -fx; return [g.position.x + fx*along + rx*side, g.position.z + fz*along + rz*side]; }
function tutIntro(){
  const sq = tutPlayers(), [ev, wa, ne, tw, bl] = sq, gd = G.m.guard, esc = G.m.esc;
  const sayU = (u, t) => { if (u){ u.talkT = 2.4; radio(u, t, true); } };
  const H = G.m.hv = tzHumvee();
  // the two passengers ride inside, out of the world, until the doors open
  for (const u of [bl, esc]) if (u){ world.remove(u.m.root); u.inCar = true; }
  const out = (u, side, along) => { const d = tzDoor(H, side, along), c = findWalk(d[0], d[1]); u.x = d[0]; u.z = d[1]; u.face = H.v.g.rotation.y + (side > 0 ? -PH : PH); world.add(u.m.root); u.inCar = false; u.path = []; };
  const gate = tzW(-74.2, 31.4), focus = () => { const p = H.v.g.position, t = CINE.t, f = sstep(0, 5, t); return [p.x*(1 - f) + gate.x*f, p.z*(1 - f) + gate.z*f]; };
  cineStart({ zoom:10, spin:0, yaw0:-2.75, block:true,
    focus:() => { const t = CINE.t; if (t < 6) return focus(); const f = sstep(33.5, 41.5, t), sg = tzW(-66, 34); return [gate.x*(1 - f) + sg.x*f, gate.z*(1 - f) + sg.z*f]; },
    keys:[
      { t:1, fn:() => tutSgt("Eversmann, en cuanto llegue tu hombre nuevo empezamos. Munición real, así que ojos abiertos.") },
      { t:3, fn:() => sayU(ev, "Recibido, sargento. Lo espero en la puerta.") },
      { t:5.4, fn:() => { if (bl) out(bl, -1.25, -.75); if (esc) out(esc, -1.25, .65); G.m.armUp = true; sayU(gd, "Romeo 4-1, adelante. Barrera arriba."); } },
      { t:6.2, fn:() => { const a_ = tzW(-72.4, 30.4), b_ = tzW(-72.6, 32.0); if (esc) goTo(esc, a_.x, a_.z); if (bl) goTo(bl, b_.x, b_.z); } },
      { t:8.6, fn:() => sayU(ne, "¿Un novato? Justo lo que nos faltaba.") },
      { t:11, fn:() => sayU(tw, "Cállate, Nelson. Todos fuimos nuevos.") },
      { t:13.5, fn:() => sayU(esc, "¿Sargento Eversmann? Le traigo al soldado Blackburn, va a su cargo. Yo estoy buscando al teniente Perino. ¿Se lo puedo dejar a usted?") },
      { t:19.5, fn:() => sayU(ev, "Déjamelo a mí. El teniente estaba en el hangar de operaciones.") },
      { t:23, fn:() => { sayU(esc, "Gracias, sargento. Suerte, chaval."); } },
      { t:24.5, fn:() => { if (esc){ const d = tzDoor(H, -1.25, .65); goTo(esc, d[0], d[1]); } sayU(ev, "¿Cuánto tiempo llevas aquí, Blackburn?"); } },
      { t:27.5, fn:() => sayU(bl, "Acabo de llegar, sargento.") },
      { t:30, fn:() => sayU(ev, "¿Has disparado alguna vez?") },
      { t:33, fn:() => sayU(bl, "No, nunca.") },
      { t:35, fn:() => { sayU(ev, "Pues hoy empiezas. Únete al resto para la práctica, y pegado a Nelson."); if (bl){ const p_ = tzW(TZ_STAGE[0] + 2.6, TZ_STAGE[1] + .1); goTo(bl, p_.x, p_.z); } } },
      { t:38.5, fn:() => sayU(tw, "Bienvenido a la arena, chaval.") },
      { t:41.5, fn:() => { tutSgt("Escuchad. Cinco hombres, un edificio y tres dianas. Os moveréis juntos, os cubriréis, subiréis a un hombre a la azotea, suprimiréis y avanzaréis por puntos, de parapeto en parapeto. Nada de correr en línea recta por campo abierto."); if (ev){ const p_ = tzW(TZ_STAGE[0] + 1.2, TZ_STAGE[1] - .6); goTo(ev, p_.x, p_.z); } } },
      { t:49.5, fn:() => sayU(ev, "Entendido. Romeo 4-1, conmigo.") },
      { t:52.5, fn:() => tutSgt("Eversmann, el ejercicio es tuyo. Empezamos cuando estés listo.") },
    ],
    dur:56,
    tick:() => {
      const dt = G.dt || 1/30; H.step(dt);
      for (const u of sq) if (u.alive) u.sup = 0;
      for (const u of [bl, esc]) if (u && u.inCar){ const p_ = H.v.g.position; u.x = p_.x; u.z = p_.z; }
      // the escort gets back in and the Humvee drives off
      if (esc && !esc.inCar && CINE.t > 25.5 && !esc.path.length && !H.out){ world.remove(esc.m.root); esc.inCar = true; setTimeout(() => {}, 0); H.leave(); }
      if (H.out && CINE.t > 27.5 && (!bl || !bl.path.length || CINE.t > 37.5)) G.m.armUp = false;
      if (CINE.t > 8 && CINE.t < 34.5 && ev && bl && !bl.inCar){ if (!bl.path.length) bl.face = Math.atan2(ev.x - bl.x, ev.z - bl.z); if (!ev.path.length) ev.face = Math.atan2(bl.x - ev.x, bl.z - ev.z);
        if (esc && !esc.inCar && !esc.path.length && CINE.t < 24.5) esc.face = Math.atan2(ev.x - esc.x, ev.z - esc.z); }
    },
    onEnd:() => {
      if (H && !H.done){ world.remove(H.v.g); H.done = true; }
      if (esc){ if (!esc.inCar) world.remove(esc.m.root); esc.inCar = true; dropOverlay(esc); units = units.filter(x => x !== esc); us = us.filter(x => x !== esc); G.m.esc = null; }
      if (bl && bl.inCar){ world.add(bl.m.root); bl.inCar = false; }
      sq.forEach((u, i) => { const p_ = tzW(TZ_STAGE[0] + (i % 2 ? 1.2 : -1.2) + (i === 4 ? 2.6 : 0), TZ_STAGE[1] + (i >> 1)*1.5);
        if (u.path.length || Math.hypot(u.x - p_.x, u.z - p_.z) > 6){ const c = findWalk(p_.x, p_.z); u.x = c[0] + .5; u.z = c[1] + .5; u.path = []; u.order = null; } u.stance = 'stand'; });
      G.m.armUp = false; tzBlock(TZ.u0 - .55, TZ.u0 + .55, TZ.g0, TZ.g1);
      const c = tzW(-62, 31); camS.tx = c.x; camS.tz = c.z; camS.zoomT = 12; camS.yawT = -2.618 - .25;
      G.sel = new Set(); refreshCards(); renderSubs();
      hint(MIS.subs[0].tip);
    } });
}
MISSIONS.tutorial = { id:'tutorial', n:0, title:'Tutorial', hud:'Instrucción en el campo de tiro de la base', phase:'day', hour:9.5, crashed:[], squad:'rangers', noCiv:true,
  place:'Aeropuerto de Mogadiscio · campo de instrucción de la TFR', squadTxt:'Rangers · Romeo 4-1', date:'SEP 1993',
  summary:"Llega Blackburn, el nuevo. Instrucción con munición real: mover la unidad, cubrirse, ocupar una azotea, suprimir, avanzar de uno en uno y por puntos hasta las dianas.",
  text:'Base de la Task Force Ranger, en el aeropuerto. Al otro lado de la pista, junto a la playa, está el campo de instrucción. Los hombres del Romeo 4-1 esperan en el campo para un ejercicio con munición real del sargento Watson. Antes de empezar, un Humvee trae a un recién llegado: el soldado Todd Blackburn. Cada paso te dice qué tocar. El juego se para solo cuando aparece algo nuevo: da tus órdenes con calma y reanuda con Espacio o con el botón de pausa.',
  start:[OX+2, OZ+30], cam:[tzW(-100, 26).x, tzW(-100, 26).z, 10],
  threat:() => tzW(-35.5, 32),
  spawn(){
    G.m.tut = true;
    buildTrainingGround();
    const p0 = tzW(-81, 33);
    spawnForce([{ name:'Romeo 4-1', role:'Rangers · instrucción', kind:'chalk',
      specs:rangerSpecs(['Sgto. Matt Eversmann', 'Esp. John Waddell', 'Esp. Shawn Nelson', 'Esp. Lance Twombly', 'Sold. Todd Blackburn']).map((s, i) => Object.assign(s, i === 0 ? { role:'Jefe · radio' } : i === 4 ? { role:'Recién llegado' } : {})), at:[p0.x, p0.z], face:AIR_RY }]);
    tutPlayers().forEach((u, i) => { const p = i === 0 ? tzW(-70.6, 31.4) : i < 4 ? tzW(TZ_STAGE[0] + 2.6 + (i % 2)*1.6, TZ_STAGE[1] + 1.4 + (i >> 1)*1.4) : tzW(-100.5, 28.8), c = findWalk(p.x, p.z); u.x = c[0] + .5; u.z = c[1] + .5; u.face = i === 0 ? AIR_RY - PH : AIR_RY + PH; if (i > 0 && i < 4) u.stance = 'crouch'; });
    { const g = tzW(-100.5, 28.8); G.m.esc = npcUnit(Object.assign({}, RANGERS[3], RSPEC, { name:'Sgto. Jeff Struecker', role:'Le acompaña', unitName:'Base TFR' }), g.x, g.z, AIR_RY + PH); G.m.esc.noFire = true; }
    const R = (name, role, extra) => Object.assign({}, RANGERS[0], RSPEC, { name, role, unitName:'Instrucción' }, extra || {});
    const sg = tzW(-67.4, 51.5), s1 = tzW(-64.2, 49.5), s2 = tzW(-64.2, 53.5), gd = tzW(-75.3, 29.3);
    G.m.sgt = npcUnit(R('Sgto. 1º Sean Watson', 'Instructor', { kit:'radio' }), sg.x, sg.z, AIR_RY + PH);
    const a = npcUnit(R('Esp. Rob Ruiz', 'Fusilero', { stance:'crouch' }), s1.x, s1.z, AIR_RY + PH); a.lane = 47.5;
    const b = npcUnit(R('Esp. Tom Dawes', 'Fusilero', { stance:'crouch', gun:'saw', burst:6 }), s2.x, s2.z, AIR_RY + PH); b.lane = 51.5;
    G.m.guard = npcUnit(R('Cabo Jamie Smith', 'Puesto de guardia', { unitName:'Base TFR' }), gd.x, gd.z, AIR_RY - PH);
    for (const u of [G.m.sgt, a, b, G.m.guard]) u.noFire = true;
    G.m.range = { shoot:[a, b] };
    tzBaseLife();
    { const C = [tzW(-65.6, 38.2), tzW(-64.2, 37.0), tzW(-64.0, 38.9)], cen = tzW(-64.6, 38.0);
      const specs = [Object.assign({}, RANGERS[1], RSPEC, { name:'Sgto. Aaron Williamson', role:'Jefe de pelotón', unitName:'Romeo 2-1' }),
                     Object.assign({}, RANGERS[0], RSPEC, { name:'Cabo Jim Telscher', role:'Fusilero', unitName:'Romeo 2-1' }),
                     Object.assign({}, DELTA[2], DSPEC, { name:'Sgto. 1º John Macejunas', role:'Operador' })];
      G.m.chat = specs.map((s, i) => { const u = npcUnit(s, C[i].x, C[i].z, Math.atan2(cen.x - C[i].x, cen.z - C[i].z)); u.noFire = true; u.chatT = rr(.5, 3); return u; });
      const wp = [[-72.6, 24.2], [-61.6, 24.2], [-61.6, 26.6], [-72.6, 26.6]].map(q => tzW(...q));
      G.m.walk = npcUnit(Object.assign({}, RANGERS[4], RSPEC, { name:'Esp. Mike Kurth', role:'Fusilero', unitName:'Romeo 3-1' }), wp[0].x, wp[0].z, AIR_RY + PH);
      G.m.walk.noFire = true; G.m.walk.wp = wp; G.m.walk.wi = 1; G.m.walk.waitT = 0; }
  },
  onStart(){ mapMode = 'reg'; tutIntro(); },
  subs:[
    { text:'Mueve a toda la unidad junta hasta la línea de salida', zone:{ x:tzW(...TZ_START).x, z:tzW(...TZ_START).z, r:3.5 },
      tip:'Selecciona a toda la unidad: doble toque en un soldado (o tecla T). Después toca el suelo dentro del anillo naranja.',
      start:() => tutSgt('Primero, la unidad entera hasta la línea de salida. Juntos: nadie se queda atrás.'),
      count:() => { const z = tzW(...TZ_START); return [tutPlayers().filter(u => Math.hypot(u.x - z.x, u.z - z.z) < 4.5).length, tutPlayers().length]; },
      done:() => { const z = tzW(...TZ_START), L_ = tutPlayers(); return G.m.allMove && L_.length && L_.every(u => Math.hypot(u.x - z.x, u.z - z.z) < 4.5 && !u.path.length); }, radio:'Romeo 4-1 en la línea de salida.' },
    { text:'Ordena a la unidad que se cubra tras los sacos', zone:{ x:tzW(-59.6, 34.5).x, z:tzW(-59.6, 34.5).z, r:5 },
      tip:'Con la unidad seleccionada, pulsa Cubrirse (C): cada soldado busca el parapeto más cercano entre él y la amenaza.',
      start:() => { G.m.covUsed = false; tutSgt('¡Contacto al frente! ¡A cubierto, detrás de los sacos!'); },
      count:() => [tutPlayers().filter(u => u.order && u.order.type === 'cover' && !u.path.length).length, tutPlayers().length],
      done:() => G.m.covUsed && tutPlayers().filter(u => u.order && u.order.type === 'cover' && !u.path.length).length >= Math.min(4, tutPlayers().length), radio:'¡A cubierto!' },
    { text:'Manda a un soldado a la azotea del edificio gris', zone:{ x:tzW(TZ_BLD.u, TZ_BLD.v).x, z:tzW(TZ_BLD.u, TZ_BLD.v).z, r:4 },
      tip:'Selecciona a un solo soldado (toca su ficha o tócalo a él), toca el edificio gris y elige Azotea.',
      start:() => tutSgt('Necesito ojos arriba. Un hombre a la azotea de ese edificio, ya.'),
      count:() => [Math.min(1, tutPlayers().filter(u => u.inB && u.inB.level === 'roof').length), 1],
      done:() => tutPlayers().some(u => u.inB && u.inB.level === 'roof'), radio:'Arriba. Tengo las dianas a la vista.' },
    { text:'Fuego de supresión sobre las dianas', zone:{ x:tzW(-35.5, 32).x, z:tzW(-35.5, 32).z, r:6 },
      tip:'Selecciona a la unidad, pulsa Suprimir (S) y toca la zona de las dianas. Mantén el fuego unos segundos.',
      start:() => { G.m.supT = 0; tutSgt('¡Fuego de supresión sobre las dianas! Que no puedan levantar la cabeza.'); },
      tick:() => { const z = tzW(-35.5, 32); if (tutPlayers().some(u => u.order && u.order.type === 'suppress' && Math.hypot(u.order.x - z.x, u.order.z - z.z) < 8 && u.firing > 0)) G.m.supT += G.dt; },
      count:() => [Math.min(4, Math.floor(G.m.supT || 0)), 4],
      done:() => (G.m.supT || 0) >= 4, radio:'¡Suprimiendo! ¡Están clavados!' },
    { text:'Avanza a dos soldados, de uno en uno, hasta los sacos de delante', zone:{ x:tzW(...TZ_FWD).x, z:tzW(...TZ_FWD).z, r:5.5 },
      tip:'Selecciona a un solo soldado y llévalo hasta los sacos del anillo; luego al otro. Los demás pueden seguir suprimiendo mientras.',
      start:() => { G.m.soloStart = G.t; tutSgt('Ahora, dos hombres adelante. De uno en uno: uno se mueve mientras los demás le cubren.'); },
      count:() => [Math.min(2, tzFwd().length), 2],
      done:() => tzFwd().length >= 2, radio:'En posición, en los sacos de delante.' },
    { text:"Avanza por puntos hasta los sacos del fondo", zone:{ x:tzW(-46.2, 39.6).x, z:tzW(-46.2, 39.6).z, r:4.5 },
      tip:"Selecciona a uno o varios soldados, y toca al menos tres puntos seguidos, de parapeto en parapeto, hasta el anillo. Seguirán ese camino parando en cada punto.",
      start:() => { G.m.chainOK = false; tutSgt("Ahora, por puntos. Nada de ir derecho al objetivo: marcad el camino de un parapeto al siguiente y parad en cada uno."); },
      tick:() => { const z = tzW(-46.2, 39.6); for (const u of tutPlayers()) if ((u.chainN || 0) >= 3 && !u.path.length && Math.hypot(u.x - z.x, u.z - z.z) < 5.5) G.m.chainOK = true; },
      count:() => [G.m.chainOK ? 1 : 0, 1],
      done:() => G.m.chainOK, radio:"En los sacos del fondo. Hemos venido por puntos." },
    { text:'Abate las tres dianas', zone:{ x:tzW(-35.5, 32).x, z:tzW(-35.5, 32).z, r:6 },
      tip:'Selecciona soldados y toca una diana (rombo rojo) para disparar sobre ella.',
      start:() => { G.m.live = true; tutSgt('¡Fuego a discreción! Tumbad esas dianas.'); },
      count:() => [G.m.tg.filter(e => !e.alive).length, 3],
      done:() => G.m.tg.every(e => !e.alive), onDone:() => { tutSgt("Buen trabajo, Romeo 4-1. Así es como se hace ahí fuera: juntos, cubiertos y sin prisa. Recoged los casquillos."); setTimeout(() => { const t_ = tutPlayers().find(u => /Twombly/.test(u.name)); if (t_ && G.started) radio(t_, "Nada mal para el primer día, Blackburn.", true); }, 4200); },
      radio:'¡Dianas abatidas!' },
  ],
  endDelay:4,
  opt:[] };
const tzFwd = () => { const z = tzW(...TZ_FWD); return tutPlayers().filter(u => u.soloT != null && u.soloT >= (G.m.soloStart || 0) && Math.hypot(u.x - z.x, u.z - z.z) < 6.5 && !u.path.length); };

/* ---- the title screen: a fight at the target, forever ---- */
MISSIONS.attract = { id:'attract', n:-1, hidden:true, title:'Black Hawk Down', hud:'', phase:'day', hour:15.7, crashed:[],
  start:[258, 236], cam:[264, 234, 15], civ:[256, 256], summary:'', text:'',
  spawn(){
    spawnForce([]);
    for (const [x, z, k] of [[250,214,'post'],[247,222,'rifle'],[280,238,'post'],[276,214,'rifle'],[252,252,'post'],[266,252,'rifle'],[244,236,'rifle'],[284,226,'post'],[257,200,'post'],[290,230,'rifle']]) foe(x, z, k, 'a', { acc:.12 });
    G.alert = true;
  },
  subs:[{ text:'', zone:{ x:267.5, z:229, r:1 }, tick:() => attractTick(), done:() => false }], opt:[] };
/* the title screen replays the Irene insertion over the target, again and again, while the militia fights the men who land */
function launchAttractFlight(){
  startFlight({ attract:true });
  let n = 0; while (FLIGHT.on && FLIGHT.L - FLIGHT.s > 230 && n++ < 4000) updFlight(.25);
  for (let k=0;k<8 && FLIGHT.on;k++) updFlight(3*.65/8);
}
function attractFlight(F, dt){
  // a man who is down and in position becomes a soldier who fights
  for (let k=F.men.length-1; k>=0; k--){ const m = F.men[k]; if (m.mode !== 'cover' || m.y > 1) continue;
    const delta = m.unit >= 4, sp = delta ? Object.assign({}, DELTA[k % 6], DSPEC) : Object.assign({}, RANGERS[k % 6], RSPEC);
    const c = nearestFree(Math.floor(m.x), Math.floor(m.z)), u = makeUnit('us', c[0], c[1], Object.assign({ kind:'us' }, sp)); u.face = m.face; u.stance = 'crouch';
    world.remove(m.m.root); F.men.splice(k, 1); }
  // the militia shoots at the helicopters as they come in low
  F.aT = (F.aT || 0) - dt;
  if (F.aT <= 0){ F.aT = .35; const H_ = F.helis.filter(h => !h.gone && h.y > 2 && h.y < 34);
    if (H_.length){ const h = pick(H_), E = them.filter(e => e.alive && Math.hypot(e.x - h.x, e.z - h.z) < 50);
      if (E.length){ const e = pick(E); e.face = Math.atan2(h.x - e.x, h.z - e.z); e.firing = .5; tracer(e.x, 1.2, e.z, h.x + rr(-2, 2), h.y + rr(0, 2), h.z + rr(-2, 2), 0xffd27a, 0); } } }
  const down = F.helis.filter(h => !h.lb).every(h => h.doneT) && F.helis.filter(h => h.lb).every(h => !h.pax || h.pax.every(p => p.gone));
  if (down && !F.cycT) F.cycT = F.t;
  if (F.cycT && F.t > F.cycT + 55) restartAttractFlight();
}
function restartAttractFlight(){
  const F = FLIGHT;
  for (const h of F.helis) world.remove(h.g); for (const r of F.ropes || []) world.remove(r);
  for (const e of F.smoke || []){ const i = emitters.indexOf(e); if (i >= 0) emitters.splice(i, 1); }
  for (const m of F.men) world.remove(m.m.root);
  for (const u of us){ world.remove(u.m.root); dropOverlay(u); } units = units.filter(u => u.team !== 'us'); us = [];
  const yaw = F.attYaw; FLIGHT = { on:false }; launchAttractFlight(); FLIGHT.attYaw = yaw;
}
function attractTick(){
  const T_ = irT(), cx = T_ ? T_.x + T_.w/2 : 267.5, cz = T_ ? T_.y + T_.d/2 : 229;
  if (them.filter(e => e.alive).length < 10 && G.t > (G.m.nextW || 0)){ G.m.nextW = G.t + 7; const a = rnd()*6.283;
    for (let k=0;k<3;k++){ const e = foe(cx + Math.cos(a)*30 + rr(-3, 3), cz + Math.sin(a)*30 + rr(-3, 3), 'wave', 'a', { acc:.1 }); e.goal = { x:cx + rr(-10, 10), z:cz + rr(-6, 14) }; } }
  for (const e of them) if (!e.alive && G.t - (e.deathT || 0) > 25 && e.m.root.parent){ world.remove(e.m.root); dropOverlay(e); }
  them = them.filter(e => e.alive || G.t - (e.deathT || 0) < 26); units = units.filter(u => u.team !== 'them' || them.includes(u));
  for (const u of us){ if (u.down){ u.down = false; u.alive = true; u.hp = 80; } if (u.hp < 60) u.hp = 80; if (u.ammo < 60) u.ammo = u.ammo0; }
  if (!FLIGHT.on){ camS.tx += (cx - 3 - camS.tx)*.02; camS.tz += (cz + 4 - camS.tz)*.02; }
}
const CAMPAIGN = ['irene', 'hawl', 's61', 'wolcott', 'convoy', 's64', 'perim', 'night', 'mile'];
let missionSel = 'attract', MIS = MISSIONS.attract;
function setHudTitle(){ document.querySelector('.mission .eyebrow').textContent = (MIS.n > 0 ? L('Misión') + ' ' + MIS.n + ' · ' : '') + L(MIS.title); $('obj').textContent = L(MIS.hud); }
function setMission(id){
  missionSel = id; MIS = MISSIONS[id];
  phaseSel = MIS.phase || 'day';
  if (MIS.squad) squadType = MIS.squad;
  newGame();
  setPhase(phaseSel);
  setHudTitle();
}

