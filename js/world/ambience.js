"use strict";
/* ---- washing on the rooftops: sheets and clothes on a line, moving with the wind and thrashing under a rotor ---- */
const LAUN_N = 6000;
let laundry = null, launN = 0;
const LAUN_U = { uTime:{ value:0 }, uWind:{ value:1 }, uHeli:{ value:[new T.Vector4(0, -99, 0, 0), new T.Vector4(0, -99, 0, 0), new T.Vector4(0, -99, 0, 0)] } };
function makeLaundry(){
  const geo = new T.PlaneGeometry(1, 1, 5, 6); geo.translate(0, -.5, 0);
  const mat = new T.MeshLambertMaterial({ side:T.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, LAUN_U);
    sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec4 uHeli[3];\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float ph = ip.x*1.7 + ip.z*2.3;
      float hang = clamp(-position.y, 0.0, 1.0);
      float wash = 0.0;
      for (int k=0;k<3;k++){ vec3 d = ip - uHeli[k].xyz; float r = length(d.xz); wash += uHeli[k].w * (1.0 - smoothstep(4.0, 16.0, r)) * (1.0 - smoothstep(6.0, 22.0, max(0.0, -d.y))); }
      float sway = uWind*(.2 + .12*sin(uTime*.7 + ph)) * sin(uTime*2.6 + ph + position.x*2.5) + uWind*.06*sin(uTime*5.3 + ph*1.7 + position.x*4.0);
      float flap = wash * (.55*sin(uTime*17.0 + ph + position.x*5.0) + .3*sin(uTime*23.0 + position.y*7.0));
      transformed.z += hang*(sway + flap) + hang*hang*(.15*uWind + wash*.6);
      transformed.x += hang*flap*.25;`);
  };
  laundry = new T.InstancedMesh(geo, mat, LAUN_N); laundry.count = 0; laundry.instanceColor = new T.InstancedBufferAttribute(new Float32Array(LAUN_N*3).fill(1), 3); laundry.castShadow = true; laundry.receiveShadow = true; laundry.frustumCulled = false;
  laundry.instanceMatrix.setUsage(T.DynamicDrawUsage); world.add(laundry); launN = 0;
}
const LAUN_COL = [0xdcd6c8, 0xd2c9b4, 0xc8bb9c, 0xbfb092, 0xe2dccd, 0xb6a888, 0xd6ccb4, 0xcabfa6, 0xc2b494, 0xddd5c2, 0xb8aa8c, 0xd0c6ae];   // dirty whites, beige and sand
// extra washing uses its own random stream, so adding it never moves anything else in the city
let lseed = 4417; const lrnd = () => { lseed = (lseed * 1664525 + 1013904223) >>> 0; return lseed / 4294967296; };
function hangLine(x0, z0, x1, z1, y, wall){
  if (!laundry) return;
  const Rn = wall ? lrnd : rnd, rr_ = (a, b) => a + Rn()*(b - a), pk = a => a[Math.floor(Rn()*a.length)];
  const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
  MAT = M.METAL; for (const [px, pz] of [[x0, z0], [x1, z1]]) if (wall) B(px, y, pz, .05, .05, .5, 0x5a5a54, { ry }); else B(px, y - .45, pz, .05, .9, .05, 0x5a5a54);
  B((x0 + x1)/2, y, (z0 + z1)/2, L, .015, .015, 0x3a3a36, { ry });
  let t = .15;
  while (t < L - .3 && launN < LAUN_N){
    const w = rr_(.32, .85), h = w > .6 ? rr_(.55, .85) : rr_(.3, .55); if (t + w > L - .1) break;
    const f = (t + w/2)/L; dummy.position.set(x0 + (x1 - x0)*f, y - .01, z0 + (z1 - z0)*f); dummy.rotation.set(0, ry, 0); dummy.scale.set(w*.96, h, 1); dummy.updateMatrix();
    laundry.setMatrixAt(launN, dummy.matrix); laundry.setColorAt(launN, tmpCol.setHex(pk(LAUN_COL)).multiplyScalar(rr_(.85, 1)));
    launN++; t += w + rr_(.04, .25);
  }
  laundry.count = launN; laundry.instanceMatrix.needsUpdate = true; if (laundry.instanceColor) laundry.instanceColor.needsUpdate = true;
}
function updLaundry(t){
  if (!laundry) return;
  LAUN_U.uTime.value = t; LAUN_U.uWind.value = windAt(t);
  const H = [];
  for (const S of SCRIPTED) if (!S.gone) H.push([S.x, S.y, S.z]);
  if (FLIGHT.on) for (const h of FLIGHT.helis) if (!h.gone) H.push([h.g.position.x, h.g.position.y, h.g.position.z]);
  for (const o of ORBITS || []) H.push([o.h.g.position.x, o.h.g.position.y, o.h.g.position.z]);
  H.sort((a, b) => Math.hypot(a[0] - camS.tx, a[2] - camS.tz) - Math.hypot(b[0] - camS.tx, b[2] - camS.tz));
  for (let k=0;k<3;k++){ const h = H[k], v = LAUN_U.uHeli.value[k]; if (h) v.set(h[0], h[1], h[2], 1); else v.set(0, -99, 0, 0); }
  HELI_NEAR = H;
}
/* ---------- litter: sheets of paper, plastic bags and wrappers lying in the streets. The wind slides and flips them now and then;
   under a low helicopter they are thrown up and spun outwards from the rotor. Pieces far from the view are moved back near it. ---------- */
let HELI_NEAR = [], litter = null, litterB = null, LIT = [];
const litSet = (o, k, mx) => { if (o.bot){ if (litterB) litterB.setMatrixAt(o.bi, mx); } else litter.setMatrixAt(k, mx); };
const LIT_N = 1100, _lm = new T.Object3D(), _lc2 = new T.Color();
const LIT_COL = [0xf4f3f0, 0xeceae6, 0xe2e0dc, 0xd6d4d0, 0xc8c6c2, 0xb8b6b2, 0xa6a4a0, 0x949290, 0x82807e, 0x6e6c6a, 0x5a5856, 0xfafaf8];   // whites and greys only
function litterSpot(o, cx, cz, R){
  for (let k=0;k<12;k++){ const x = cx + rr(-R, R), z = cz + rr(-R, R), i = Math.floor(x), j = Math.floor(z);
    if (inB(i, j) && grid[idx(i, j)] !== 1 && grid[idx(i, j)] !== 3 && !(coastS(x, z) > -3)){ o.x = x; o.z = z; o.y = .02; o.vx = o.vz = o.vy = 0; o.air = 0; return true; } }
  return false;
}
function makeLitter(){
  const geo = new T.PlaneGeometry(1, 1); geo.rotateX(-Math.PI/2);
  litter = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ side:T.DoubleSide }), LIT_N);
  litter.instanceMatrix.setUsage(T.DynamicDrawUsage); litter.frustumCulled = false; litter.receiveShadow = true; world.add(litter);
  LIT = [];
  const LB_ = MIS && MIS.litter && MIS.litter.big ? 1.45 : 1;   // a mission can ask for more and bigger rubbish (paper, bags, cardboard)
  for (let k=0;k<LIT_N;k++){ const bag = rnd() < .25, o = { sx:(bag ? rr(.22,.34) : rr(.13,.24))*LB_, sz:(bag ? rr(.2,.3) : rr(.17,.3))*LB_, ry:rnd()*6.28, rx:0, rz:0, wr:rr(-6,6), x:0, y:-50, z:0, vx:0, vy:0, vz:0, air:0, gust:rr(0, 9), bag };
    LIT.push(o); litter.setColorAt(k, _lc2.setHex(bag ? pick([0x4a4a4a, 0x6a6a6a, 0x8c8c8c, 0xd8d8d8, 0xf0f0f0]) : pick(LIT_COL))); }
  litter.instanceColor.needsUpdate = true; LIT.placed = false;
  // only every other piece is used (the draws for all of them are kept): one in four of the unused ones is a plastic bottle
  let nb = 0; LIT.forEach((o, k) => { litter.setMatrixAt(k, ZERO_M); if (k % 2){ if (k % 16 === 1){ o.bot = true; o.bi = nb++; o.bag = false; o.sx = o.sz = .9 + (k % 5)*.06; } else o.skip = true; } });
  litterB = null; const NB = nb, lmB = litter;
  withModel('junk2', M_ => { if (lmB !== litter) return; const m = new T.InstancedMesh(M_.geos.bottle, new T.MeshLambertMaterial({ map:M_.mat.map }), NB);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true;
    for (let k=0;k<NB;k++){ m.setMatrixAt(k, ZERO_M); m.setColorAt(k, tmpCol.setHex([0xffffff, 0xe6f2ec, 0xdce6f2, 0xf2ead6][k % 4])); }
    m.instanceColor.needsUpdate = true; world.add(m); litterB = m; });
  const lm = litter;
  withModel('paper', M_ => { if (lm !== litter) return; const g = M_.geos.paper.clone(); g.scale(1/.18, 1, 1/.24); g.setAttribute('normal', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).map((v, i) => i % 3 === 1 ? 1 : 0), 3));
    { const P_ = g.attributes.position, I_ = g.index.array; for (let t=0;t<I_.length;t+=3){ const a = I_[t], b = I_[t+1], c = I_[t+2];   // every face up: no dark backs
      const ux = P_.getX(b) - P_.getX(a), uz = P_.getZ(b) - P_.getZ(a), vx = P_.getX(c) - P_.getX(a), vz = P_.getZ(c) - P_.getZ(a); if (uz*vx - ux*vz < 0){ I_[t+1] = c; I_[t+2] = b; } } g.index.needsUpdate = true; } lm.geometry = g; lm.material.map = M_.mat.map; lm.material.needsUpdate = true; });
}
function updLitter(dt, t){
  if (MIS && MIS.id === 'attract') return;
  updLife(dt, t);
  if (!litter || !world || litter.parent !== world || dt <= 0) return;
  const hh = halfH(), R = hh*1.7, cx = camS.tx, cz = camS.tz, wnd = windAt(t), wx = .9, wz = .35;
  if (LIT.blast){ LIT.blast.t += dt; if (LIT.blast.t > 2) LIT.blast = null; }
  if (!LIT.placed){ LIT.placed = true; const F = MIS && MIS.litter; LIT.forEach((o, k) => { if (F && k % 3 !== 0) litterSpot(o, F.x, F.z, F.r); else litterSpot(o, cx, cz, R); }); }
  const act = Math.round(LIT_N*clamp((R/37)*(R/37), .45, 1));
  for (let k=0;k<LIT_N;k++){ const o = LIT[k];
    if (o.skip) continue;
    if (k >= act){ if (!o.off){ o.off = true; litSet(o, k, ZERO_M); } continue; }
    if (o.off){ o.off = false; if (!litterSpot(o, cx, cz, R)) o.y = -50; }
    if (Math.abs(o.x - cx) > R*1.25 || Math.abs(o.z - cz) > R*1.25){ if (!litterSpot(o, cx, cz, R)) o.y = -50; }
    // wind: every few seconds a gust lifts the lighter pieces and slides them downwind, flipping them over
    o.gust -= dt*(.6 + wnd);
    if (o.gust <= 0){ o.gust = rr(3, 11); if (rnd() < .55*wnd){ const f = (o.bag ? 1.6 : 1)*rr(.8, 2.2)*wnd; o.vx += wx*f; o.vz += wz*f + rr(-.4, .4); o.vy += rr(.3, 1.2)*(o.bag ? 1.5 : 1); o.wr = rr(-9, 9); } }
    // the sand front passing: a shove downwind and a little lift as it reaches the piece, then a steady push while the dust goes over
    const SW = sandWave; if (SW){ const d = (o.x - SW.cx)*SW_DX + (o.z - SW.cz)*SW_DZ - SW.p;
      const ac = (o.x - SW.cx)*(-SW_DZ) + (o.z - SW.cz)*SW_DX;
      if (d < 0 && d > -10 && Math.abs(ac) < SW.W + .5){
        if (o.sw !== SW.id && d > -2.5){ o.sw = SW.id; const f = rr(1.6, 3.4)*(o.bag ? 1.5 : 1)*(o.bot ? .55 : 1); o.vx += SW_DX*f; o.vz += SW_DZ*f + rr(-.3, .3); o.vy += rr(.25, .9)*(o.bot ? .35 : 1)*(o.bag ? 1.4 : 1); o.wr = rr(-12, 12); }
        const a = dt*(o.bot ? 1.2 : 2.4)*(1 + d/10); o.vx += SW_DX*a; o.vz += SW_DZ*a; } }
    // a blast wave passing: thrown up and outwards as the ring reaches the piece
    const bl = LIT.blast; if (bl && o.bh !== bl.id){ const dx = o.x - bl.x, dz = o.z - bl.z, d = Math.hypot(dx, dz);
      if (d < 38 && d < bl.t*26){ o.bh = bl.id; const f = (1 - d/38); o.vx += dx/(d + .3)*f*rr(10, 16); o.vz += dz/(d + .3)*f*rr(10, 16); o.vy += f*rr(3, 7); o.wr = rr(-30, 30); } }
    // rotor wash: blown hard outwards and up from below any low helicopter
    for (const h of HELI_NEAR){ const dx = o.x - h[0], dz = o.z - h[2], d = Math.hypot(dx, dz), alt = h[1];
      if (alt > 26 || d > 22) continue;
      const s = (1 - alt/26)*(1 - d/22); if (s <= 0) continue;
      const a = s*dt*(o.bag ? 34 : 26); o.vx += dx/(d + .3)*a; o.vz += dz/(d + .3)*a; o.vy += a*rr(.3, .9); o.wr += rr(-30, 30)*s*dt*4; }
    // wake of a moving vehicle: thrown up, out to the sides and dragged along behind it
    for (const C of CONVOYS){ if (C.v < .4) continue; const sp = Math.min(1.5, C.v/2.2);
      for (const v of C.veh){ const dx = o.x - v.x, dz = o.z - v.z, d = Math.hypot(dx, dz); if (d > 4.5) continue;
        const ry = v.g ? v.g.rotation.y : 0, s = (1 - d/4.5)*sp, a = s*dt*22, fx = v.fx || 0, fz = v.fz || 0;
        o.vx += (dx/(d + .3)*.8 + fx*.9)*a; o.vz += (dz/(d + .3)*.8 + fz*.9)*a; o.vy += a*rr(.35, .8); o.wr += rr(-30, 30)*s*dt*3; } }
    // flight and settling
    if (o.y > .021 || o.vy > 0 || Math.abs(o.vx) + Math.abs(o.vz) > .02){
      o.vy -= (o.bag ? 2.2 : 3.4)*dt; o.vy *= 1 - 1.2*dt; o.vx *= 1 - (o.y > .05 ? .6 : 3.5)*dt; o.vz *= 1 - (o.y > .05 ? .6 : 3.5)*dt;
      o.vy = Math.min(o.vy, 5.5); o.vx = clamp(o.vx, -13, 13); o.vz = clamp(o.vz, -13, 13);
      const nx = o.x + o.vx*dt, nz = o.z + o.vz*dt; const i = Math.floor(nx), j = Math.floor(nz);
      if (inB(i, j) && grid[idx(i, j)] === 1 && o.y < (topH[idx(i, j)] || 3)){ o.vx *= -.3; o.vz *= -.3; } else { o.x = nx; o.z = nz; }
      o.y += o.vy*dt; if (o.y < .02){ o.y = .02; o.vy = 0; }
      o.ry += o.wr*dt*.4; o.rx = o.y > .05 ? Math.sin(t*o.wr*.7 + k)*1.1 : o.rx*.9; o.rz = o.y > .05 ? Math.cos(t*o.wr*.5 + k)*.8 : o.rz*.9; o.wr *= 1 - .5*dt;
    }
    _lm.position.set(o.x, o.y, o.z); _lm.rotation.set(o.rx, o.ry, o.rz); _lm.scale.set(o.sx, o.bot ? o.sx : 1, o.sz); _lm.updateMatrix(); litSet(o, k, _lm.matrix);
  }
  litter.instanceMatrix.needsUpdate = true; if (litterB) litterB.instanceMatrix.needsUpdate = true;
}
/* ---------- dynamic ambience: wind, palms, awnings, flags, birds, helicopter ---------- */
let palms = [], flags = [], birds = [], AW = [], awMesh = null, wireGeo = null, wireBase = null, wireMeta = null, heli = null;
const windAt = t => .65 + .35*Math.sin(t*.21) + .15*Math.sin(t*.77+1.3) + (typeof sandBoost === 'number' ? sandBoost : 0);
// a street cell with no wall beside it (the middle of a street), the asphalt, or a track out of town
function onRoad(x, z){
  const i = Math.floor(x), j = Math.floor(z);
  if (inB(i, j)){ if (!STR[idx(i, j)]) return false;
    for (let dj=-1; dj<=1; dj++) for (let di=-1; di<=1; di++){ if (!inB(i + di, j + dj)) continue; const g = grid[idx(i + di, j + dj)]; if (g === 1 || g === 3) return false; }
    return true; }
  return roadDist(x, z, ROADSEG)[0] < 4.2 || roadDist(x, z, TRACKS)[0] < 1.6;
}
function palm(x, z, h){
  if (PLANNING){ lazyAdd(x, z, () => palm(x, z, h)); return; }
  h = h || rr(3.2,4.6);
  for (let k=0;k<234;k++) rnd();
  let hs = Math.imul(Math.round(x*16), 73856093) ^ Math.imul(Math.round(z*16), 19349663) ^ 0x2c1b3c6d;
  const R = () => { hs = (hs + 0x9e3779b9) | 0; let q = Math.imul(hs ^ (hs >>> 16), 0x85ebca6b); q = Math.imul(q ^ (q >>> 13), 0xc2b2ae35); return ((q ^ (q >>> 16)) >>> 0) / 4294967296; };
  const v = Math.floor(R()*3) % 3;
  const e = { x, z, v, s:h*1.4/PALM_META[v].top*(.94 + R()*.12), ry:R()*Math.PI*2, c:.84 + R()*.2 };
  if (onRoad(x, z) || GHOST || stadIn(x, z)) return;
  if (CUR) CUR.PM.push(e); else palmReady(() => palmMesh([e], v, world));
}
/* ---------- the palms: three models (trunk, root bulb and 42 frond cards each) sharing one texture. They move on the GPU: the trunk
   bends with the wind and leans away from a rotor overhead, the fronds bob and stream, and under a helicopter they thrash and press down. */
const PALM_META = [{c:[-0.165,5.834,-0.298],R:1.596,top:6.449},{c:[0.231,5.26,0.004],R:1.593,top:6.079},{c:[0.214,6.648,-0.245],R:1.516,top:7.378}];
let PALM_GEO = null, PALM_MAT = null, PALM_DEP = null, palmWait = [];
function palmReady(fn){ if (PALM_GEO) fn(); else palmWait.push(fn); }
const PALM_VS = `
  #ifdef USE_INSTANCING
  mat4 pm_ = modelMatrix * instanceMatrix;
  #else
  mat4 pm_ = modelMatrix;
  #endif
  vec3 ip_ = pm_[3].xyz; mat3 im_ = mat3(pm_); float sc_ = length(im_[0]);
  float ph_ = ip_.x*1.7 + ip_.z*2.3;
  vec2 wd_ = vec2(.92, .39);
  vec2 bend_ = wd_*uWind*(.03 + .018*sin(uTime*.9 + ph_)) + vec2(-wd_.y, wd_.x)*uWind*.012*sin(uTime*.63 + ph_*1.3);
  float wash_ = 0.0; vec2 away_ = vec2(0.0);
  for (int k=0;k<3;k++){ vec2 d = ip_.xz - uHeli[k].xz; float r = length(d) + .001;
    float w = uHeli[k].w*(1.0 - smoothstep(4.0, 22.0, r))*(1.0 - smoothstep(12.0, 40.0, uHeli[k].y - ip_.y));
    wash_ += w; away_ += d/r*w; }
  wash_ = min(wash_, 1.0);
  bend_ += away_*(.08 + .045*sin(uTime*6.0 + ph_));
  transformed += (vec3(bend_.x, 0.0, bend_.y) * im_) / sc_ * transformed.y * aPalm.x;
  if (aPalm.y > 0.0){
    float f = aPalm.y, q = position.x*1.3 + position.z*1.1;
    vec3 wdL = (vec3(wd_.x, 0.0, wd_.y) * im_) / sc_, awL = (vec3(away_.x, 0.0, away_.y) * im_) / sc_;
    transformed.y += f*(uWind*.08*sin(uTime*2.3 + ph_ + q) + wash_*(.28*sin(uTime*15.0 + ph_ + q*2.0) - .32));
    transformed += f*(wdL*uWind*(.09 + .05*sin(uTime*1.7 + ph_ + q)) + awL*(.26 + .12*sin(uTime*11.0 + q*1.7)));
  }`;
function palmShader(sh, lit){
  Object.assign(sh.uniforms, LAUN_U);
  sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec4 uHeli[3]; attribute vec2 aPalm;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + PALM_VS);
  // the far side of a frond takes the light of its near side, so the crown does not show black cards
  if (lit) sh.fragmentShader = sh.fragmentShader.replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront').replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront');
}
(function(){
  const bin = n => assetBin(n);
  const tex = new Promise((res, rej) => new T.TextureLoader().load(assetPng('palms'), res, undefined, rej));
  Promise.all([bin('palm1'), bin('palm2'), bin('palm3'), tex]).then(([b1, b2, b3, map]) => {
    map.flipY = false; map.magFilter = T.LinearFilter; map.minFilter = T.LinearMipmapLinearFilter; map.generateMipmaps = true; map.anisotropy = 4; map.needsUpdate = true;
    PALM_GEO = [b1, b2, b3].map((b, v) => {
      const P_ = PALM_META[v], g = parseHeli(b), parts = [g.trunk, g.fronds];
      let nv = 0, ni = 0; for (const q of parts){ nv += q.attributes.position.count; ni += q.index.count; }
      const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), uv = new Float32Array(nv*2), ap = new Float32Array(nv*2), idx = new Uint16Array(ni);
      let o = 0, oi = 0;
      parts.forEach((q, pi) => {
        const pa = q.attributes.position, na = q.attributes.normal, ua = q.attributes.uv, ia = q.index.array;
        for (let i=0;i<pa.count;i++){
          const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), k = o + i;
          pos[k*3] = x; pos[k*3+1] = y; pos[k*3+2] = z;
          nor[k*3] = na.getX(i)/127; nor[k*3+1] = na.getY(i)/127; nor[k*3+2] = na.getZ(i)/127;     // stored as bytes and shorts: getX gives the raw values
          uv[k*2] = ua.getX(i)/65535; uv[k*2+1] = ua.getY(i)/65535;
          ap[k*2] = Math.min(1.4, Math.pow(Math.max(0, y)/P_.c[1], 2));                         // how far the trunk's bend carries this point
          ap[k*2+1] = pi ? Math.pow(Math.min(1, Math.hypot(x - P_.c[0], y - P_.c[1], z - P_.c[2])/P_.R), 1.5) : 0;   // how free a frond is here
        }
        for (let i=0;i<ia.length;i++) idx[oi + i] = ia[i] + o;
        o += pa.count; oi += ia.length;
      });
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('aPalm', new T.BufferAttribute(ap, 2)); geo.setIndex(new T.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      return geo;
    });
    PALM_MAT = new T.MeshLambertMaterial({ map, alphaTest:.5, side:T.DoubleSide });
    PALM_MAT.onBeforeCompile = sh => palmShader(sh, true); PALM_MAT.customProgramCacheKey = () => 'palmL';
    PALM_DEP = new T.MeshDepthMaterial({ depthPacking:T.RGBADepthPacking, map, alphaTest:.5, side:T.DoubleSide });
    PALM_DEP.onBeforeCompile = sh => palmShader(sh, false); PALM_DEP.customProgramCacheKey = () => 'palmD';
    const w = palmWait; palmWait = []; for (const f of w) f();
  }).catch(() => {});
})();
function palmMesh(L_, v, parent){
  const m = new T.InstancedMesh(PALM_GEO[v], PALM_MAT, L_.length);
  m.castShadow = true; m.receiveShadow = true; m.customDepthMaterial = PALM_DEP; m.frustumCulled = false;
  L_.forEach((e, k) => {
    dummy.position.set(e.x, 0, e.z); dummy.rotation.set(0, e.ry, 0); dummy.scale.setScalar(e.s); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix);
    m.setColorAt(k, tmpCol.setRGB(e.c, e.c*.985, e.c*.955));
  });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  parent.add(m); return m;
}
// no palm grows out of a building: the trunk and a little room around it must be clear of any built cell
function palmFree(x, z){
  for (const [dx, dz] of [[0,0],[.45,0],[-.45,0],[0,.45],[0,-.45],[.32,.32],[-.32,.32],[.32,-.32],[-.32,-.32]]){
    const i = Math.floor(x + dx), j = Math.floor(z + dz); if (inB(i, j) && grid[idx(i, j)] === 1) return false; }
  return true;
}
function buildPalms(ch){
  ch.PM = ch.PM.filter(e => palmFree(e.x, e.z));
  if (!ch.PM.length) return;
  palmReady(() => { if (!ch.group) return; for (let v=0;v<3;v++){ const L_ = ch.PM.filter(e => e.v === v); if (L_.length) palmMesh(L_, v, ch.group); } });
}
function makeFlag(x, z, poleH, base, kind){
  B(x, base + poleH/2, z, .06, poleH, .06, 0x8a8a84);
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 32; const c = cv.getContext('2d');
  if (kind === 'us'){
    for (let k=0;k<13;k++){ c.fillStyle = k % 2 ? '#f4f0e8' : '#b22234'; c.fillRect(0, k*32/13, 48, 32/13 + .5); }
    c.fillStyle = '#3c3b6e'; c.fillRect(0, 0, 20, 17.2); c.fillStyle = '#f4f0e8';
    for (let r=0;r<5;r++) for (let q=0;q<6;q++) c.fillRect(1.6 + q*3.1 + (r%2)*1.5, 1.6 + r*3.2, 1, 1);
  } else {
  c.fillStyle = '#4a8ad0'; c.fillRect(0,0,48,32); c.fillStyle = '#ffffff'; c.beginPath();
  for (let k=0;k<10;k++){ const a = -Math.PI/2 + k*Math.PI/5, r = k%2 ? 4 : 10; c.lineTo(24 + Math.cos(a)*r, 16 + Math.sin(a)*r); } c.closePath(); c.fill(); }
  const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter;
  const fs_ = kind === 'us' ? 1.6 : 1, geo = new T.PlaneGeometry(1.4*fs_, .9*fs_, 12, 4); geo.translate(.7*fs_, 0, 0);
  const m = new T.Mesh(geo, new T.MeshPhongMaterial({ map:tex, side:T.DoubleSide, specular:0x000000, shininess:1 }));
  m.position.set(x+.03, base + poleH - .5, z); m.castShadow = true; world.add(m);
  flags.push({ m, base:Float32Array.from(geo.attributes.position.array), ph:rnd()*6 });
}
/* ---------- the birds: the uploaded crow, one instanced mesh for all of them. The wings bend on the GPU: the shoulder and the wrist
   turn about the body's axis, the wrist a little behind the shoulder so each beat runs out to the tips, and a sitting bird has
   them folded back along its flanks. Per bird: shoulder angle, wrist angle, how far folded. ---------- */
const BIRD_N = 240; let BIRD = null;
const BIRD_GLSL = `
attribute vec3 aWing;
vec2 bRot(vec2 d, float a){ float c = cos(a), s = sin(a); return vec2(c*d.x - s*d.y, s*d.x + c*d.y); }
vec3 birdP(vec3 p, vec3 w){
  float sx = p.x < 0.0 ? -1.0 : 1.0, ax = abs(p.x);
  float w1 = smoothstep(0.012, 0.03, ax), w2 = smoothstep(0.1, 0.13, ax);
  vec2 q = vec2(ax, p.y);
  q = vec2(0.12, 0.113) + bRot(q - vec2(0.12, 0.113), w.y*w2);
  q = vec2(0.019, 0.116) + bRot(q - vec2(0.019, 0.116), w.x*w1);
  vec3 o = vec3(sx*q.x, q.y, p.z);
  float s = clamp((ax - 0.02)/0.28, 0.0, 1.0);
  vec3 f = vec3(sx*(0.03 + 0.008*(1.0 - s)), 0.112 + (p.z - 0.01)*0.33 - s*0.02, 0.025 - s*0.14 + (p.z - 0.01)*0.12);
  return mix(o, f, w.z*w1);
}
vec3 birdN(vec3 n, vec3 p, vec3 w){
  float sx = p.x < 0.0 ? -1.0 : 1.0, ax = abs(p.x), w1 = smoothstep(0.012, 0.03, ax);
  float a = w.x*w1 + w.y*smoothstep(0.1, 0.13, ax);
  vec2 q = bRot(vec2(n.x*sx, n.y), a);
  return normalize(mix(vec3(q.x*sx, q.y, n.z), vec3(sx*0.8, 0.5, 0.0), w.z*w1*0.7));
}
`;
function birdIM(){
  if (BIRD && BIRD.m.parent === world) return BIRD;
  const M_ = MODELS.crow; if (!M_ || !M_.ready) return null;
  const geo = M_.geos.crow, wa = new T.InstancedBufferAttribute(new Float32Array(BIRD_N*3), 3); wa.setUsage(T.DynamicDrawUsage); geo.setAttribute('aWing', wa);
  const mat = new T.MeshLambertMaterial({ map:M_.mat.map, side:T.DoubleSide });
  mat.onBeforeCompile = sh => { sh.vertexShader = BIRD_GLSL + sh.vertexShader
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = birdN(objectNormal, position, aWing);')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = birdP(position, aWing);'); };
  mat.customProgramCacheKey = () => 'bird';
  const m = new T.InstancedMesh(geo, mat, BIRD_N); m.frustumCulled = false; m.receiveShadow = true; m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k=0;k<BIRD_N;k++) m.setMatrixAt(k, ZERO_M);
  world.add(m); BIRD = { m, wa, free:[], dirty:true }; for (let k=BIRD_N-1;k>=0;k--) BIRD.free.push(k);
  for (const bd of birds) bd.k = -1;
  return BIRD;
}
function birdTake(n){ const B = birdIM(); if (!B || B.free.length < n) return null; const a = []; for (let k=0;k<n;k++) a.push(B.free.pop()); return a; }
function birdFree(a){ if (!BIRD || !a) return; for (const k of a){ BIRD.m.setMatrixAt(k, ZERO_M); BIRD.free.push(k); } BIRD.dirty = true; }
function birdHide(k){ BIRD.m.setMatrixAt(k, ZERO_M); BIRD.dirty = true; }
function birdPut(k, x, y, z, yaw, pitch, roll, a1, a2, fold, sc){
  dummy.position.set(x, y, z); dummy.rotation.set(pitch, yaw, roll, 'YXZ'); dummy.scale.setScalar(sc); dummy.updateMatrix(); BIRD.m.setMatrixAt(k, dummy.matrix); dummy.rotation.order = 'XYZ';
  const a = BIRD.wa.array; a[k*3] = a1; a[k*3+1] = a2; a[k*3+2] = fold; BIRD.dirty = true;
}
function birdFlush(){ if (BIRD && BIRD.dirty){ BIRD.m.instanceMatrix.needsUpdate = true; BIRD.wa.needsUpdate = true; BIRD.dirty = false; } }
// one wing beat: the shoulder sweeps, the wrist follows a little later; the downstroke is the quicker half. amp 0 = gliding, wings held in a shallow V
function wingBeat(ph, amp){
  const c = ph % 6.2832, d = c < 2.6 ? Math.cos(c/2.6*Math.PI) : -Math.cos((c - 2.6)/3.6832*Math.PI);   // +1 top of the beat, -1 bottom
  const c2 = (ph - .8) % 6.2832, cc = c2 < 0 ? c2 + 6.2832 : c2, d2 = cc < 2.6 ? Math.cos(cc/2.6*Math.PI) : -Math.cos((cc - 2.6)/3.6832*Math.PI);
  return [.1 + amp*(.12 + .72*d), .04 + amp*(.1 + .5*d2)];
}
function makeBirds(){
  for (let k=0;k<16;k++){
    pick([0x2a2622, 0x3a3228, 0x4a3e30]);   // (the draw the old box birds made for their colour: the random stream stays the same)
    birds.push({ k:-1, cx:OX+rr(8,56), cz:OZ+rr(8,56), r:rr(3,8), y:rr(15,23), w:rr(.25,.45)*(rnd()<.5?1:-1), a:rnd()*6, ph:rnd()*6, amp:1, wp:0, sc:1.05 + (k % 5)*.05 });
  }
}
