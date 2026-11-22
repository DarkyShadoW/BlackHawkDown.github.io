"use strict";
/* ---------- tactical maps: paper, hatched sea, map squares, names ---------- */
let MAPC = null;
const MAP_INK = '#3a2e1c', MAP_RED = '#a8321e', MAP_BLUE = '#2a5a9a';
function mapLabel(x, t, px, py, o){
  t = L(t);
  o = o || {}; x.save(); x.translate(px, py); if (o.rot) x.rotate(o.rot);
  x.font = (o.it ? 'italic ' : '') + (o.w || 600) + ' ' + (o.size || 15) + 'px "Barlow Condensed", "Arial Narrow", sans-serif';
  x.textAlign = o.align || 'left'; x.textBaseline = 'middle';
  let tx = t; if (o.sp){ tx = t.split('').join(String.fromCharCode(8202)); }
  const w = x.measureText(tx).width;
  if (!o.rot && (!o.align || o.align === 'left')){ const cw = x.canvas.width; if (px + w > cw - 4){ x.translate(-(px + w - (cw - 4)), 0); } }
  if (o.halo !== false){ x.lineWidth = o.hw || 3.5; x.strokeStyle = o.haloC || 'rgba(236,226,196,.92)'; x.lineJoin = 'round'; x.strokeText(tx, 0, 0); }
  x.fillStyle = o.col || MAP_INK; x.fillText(tx, 0, 0); x.restore();
}
function mapSym(x, kind, px, py){
  x.save(); x.lineWidth = 2;
  if (kind === 'crash'){ x.strokeStyle = MAP_RED; x.beginPath(); x.arc(px, py, 9, 0, 6.3); x.stroke(); x.beginPath(); x.moveTo(px-6, py-6); x.lineTo(px+6, py+6); x.moveTo(px+6, py-6); x.lineTo(px-6, py+6); x.stroke(); }
  else if (kind === 'target'){ x.strokeStyle = MAP_RED; x.strokeRect(px-8, py-8, 16, 16); x.beginPath(); x.moveTo(px-12, py); x.lineTo(px+12, py); x.moveTo(px, py-12); x.lineTo(px, py+12); x.stroke(); }
  else if (kind === 'un'){ x.fillStyle = 'rgba(80,140,210,.25)'; x.strokeStyle = MAP_BLUE; x.fillRect(px-11, py-7, 22, 14); x.strokeRect(px-11, py-7, 22, 14); x.fillStyle = MAP_BLUE; x.font = '700 10px "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ONU', px, py+.5); }
  else if (kind === 'base'){ x.fillStyle = 'rgba(80,140,210,.25)'; x.strokeStyle = MAP_BLUE; x.fillRect(px-13, py-8, 26, 16); x.strokeRect(px-13, py-8, 26, 16); x.beginPath(); x.moveTo(px-13, py-8); x.lineTo(px+13, py+8); x.moveTo(px+13, py-8); x.lineTo(px-13, py+8); x.stroke(); }
  else { x.fillStyle = '#e8d8a8'; x.strokeStyle = MAP_INK; x.beginPath(); x.arc(px, py, 5, 0, 6.3); x.fill(); x.stroke(); }
  x.restore();
}
function mapGrid(x, w, h, n, cell, ox, oy){
  x.save(); x.strokeStyle = 'rgba(58,46,28,.38)'; x.lineWidth = 1;
  for (let k=0;k<=n;k++){ x.beginPath(); x.moveTo(ox + k*cell, 0); x.lineTo(ox + k*cell, h); x.stroke(); x.beginPath(); x.moveTo(0, oy + k*cell); x.lineTo(w, oy + k*cell); x.stroke(); }
  x.fillStyle = 'rgba(58,46,28,.75)'; x.font = '700 14px "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let k=0;k<n;k++){ const L = String.fromCharCode(65 + k); x.fillText(L, ox + (k+.5)*cell, 10); x.fillText(String(k+1), 10, oy + (k+.5)*cell); }
  x.restore();
}
function mapNorth(x, px, py, ang){
  x.save(); x.translate(px, py); x.rotate(ang); x.fillStyle = MAP_INK; x.strokeStyle = MAP_INK; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(0, -22); x.lineTo(7, 8); x.lineTo(0, 3); x.closePath(); x.fill(); x.beginPath(); x.moveTo(0, -22); x.lineTo(-7, 8); x.lineTo(0, 3); x.closePath(); x.stroke();
  x.font = '700 15px "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.fillText('N', 0, -30); x.restore();
}
function mapScale(x, px, py, pxPerM, m){
  const L = pxPerM*m; x.save(); x.fillStyle = MAP_INK; x.strokeStyle = MAP_INK; x.lineWidth = 1.5;
  x.strokeRect(px, py, L, 6); x.fillRect(px, py, L/2, 6); x.font = '600 13px "Arial Narrow", sans-serif'; x.textBaseline = 'bottom';
  x.fillText('0', px - 3, py - 2); x.textAlign = 'right'; x.fillText(m >= 1000 ? (m/1000) + ' km' : m + ' m', px + L + 6, py - 2); x.restore();
}
function mapLegend(x, px, py, rows){
  x.save(); const h = rows.length*20 + 30; x.fillStyle = 'rgba(240,232,208,.93)'; x.strokeStyle = MAP_INK; x.lineWidth = 1.2; x.fillRect(px, py, 196, h); x.strokeRect(px, py, 196, h);
  x.fillStyle = MAP_INK; x.font = '700 14px "Arial Narrow", sans-serif'; x.textBaseline = 'middle'; x.fillText('LEYENDA', px + 10, py + 14);
  rows.forEach((r, k) => { const y = py + 34 + k*20; r[0](x, px + 22, y); x.fillStyle = MAP_INK; x.font = '600 13px "Arial Narrow", sans-serif'; x.textAlign = 'left'; x.fillText(L(r[1]), px + 42, y); });
  x.restore();
}
const NORTH_ANG = Math.atan2(COAST_DZ, COAST_DX) + Math.PI/2 - Math.PI/4;   // the coast runs south-west to north-east
function buildMaps(){
  // ---- the city sheet: 2 px per cell
  const CSC = 2, CWp = W*CSC, city = document.createElement('canvas'); city.width = city.height = CWp;
  const cx = city.getContext('2d'), ci = cx.createImageData(CWp, CWp), cd = ci.data;
  const isB = (i, j) => inB(i,j) && grid[idx(i,j)] === 1;
  for (let j=0;j<H;j++) for (let i=0;i<W;i++){
    const k = idx(i,j), g = grid[k], D_ = cityDs(i + .5, j + .5); let c;
    if (g === 3) c = null;
    else if (g === 1) c = (isB(i-1,j) && isB(i+1,j) && isB(i,j-1) && isB(i,j+1)) ? [152,130,100] : [104,86,64];
    else if (STR[k] === 2) c = [248,242,224]; else if (STR[k] === 1) c = [226,210,170];
    else if (ground[k] === 7) c = [170,186,122]; else if (ground[k] === 4) c = [224,186,130]; else if (ground[k] === 11) c = [240,230,198];
    else if (g === 2) c = [150,130,100];
    else if (ground[k] === 2) c = [218,204,166];
    else { const f = sstep(.05, .5, D_); c = [214 + 16*f, 198 + 18*f, 154 + 30*f]; }
    for (let b=0;b<CSC;b++) for (let a=0;a<CSC;a++){
      const px = i*CSC + a, py = j*CSC + b, p = (py*CWp + px)*4; let cc = c;
      if (!cc){ cc = ((px + py) % 7 === 0) ? [118,160,182] : [156,192,206]; }
      else if (!g && !STR[k] && !ground[k] && D_ < .3 && hash2(px*3 + 1, py*5 + 7) < .035) cc = [150,140,96];
      cd[p] = cc[0]; cd[p+1] = cc[1]; cd[p+2] = cc[2]; cd[p+3] = 255;
    }
  }
  cx.putImageData(ci, 0, 0);
  // shoreline ink
  cx.strokeStyle = 'rgba(42,80,104,.9)'; cx.lineWidth = 1.5; cx.beginPath();
  for (let t=-200;t<=900;t+=4){ const x0 = t, z0 = 1500 - (t + 1200)*COAST_NX/COAST_NZ; let x = x0, z = z0;
    for (let it=0;it<4;it++){ const s = coastS(x, z) + 3; x -= s*COAST_NX; z -= s*COAST_NZ; } t === -200 ? cx.moveTo(x*CSC, z*CSC) : cx.lineTo(x*CSC, z*CSC); }
  cx.stroke();
  mapGrid(cx, CWp, CWp, 8, CWp/8, 0, 0);
  for (const [n, X, Z] of DISTRICTS) mapLabel(cx, n, X*CSC, Z*CSC, { size:21, w:700, it:true, col:'rgba(120,70,34,.78)', sp:true, align:'center', hw:4 });
  // streets
  mapLabel(cx, 'CALLE HAWLWADIG', 256*CSC, 128*CSC, { rot:-Math.PI/2, size:15, w:700, align:'center' });
  mapLabel(cx, 'CALLE HAWLWADIG', 256*CSC, 300*CSC, { rot:-Math.PI/2, size:15, w:700, align:'center' });
  mapLabel(cx, 'LA MILLA · AV. DEL ESTADIO', (MILE_X - 6)*CSC, 268*CSC, { rot:-Math.PI/2, size:15, w:700, align:'center', col:'#5a2a14' });
  mapLabel(cx, 'CALLE NACIONAL', 300*CSC, 321*CSC, { size:15, w:700, align:'center' });
  mapLabel(cx, 'CALLE WARSHADAHA', 200*CSC, 168.5*CSC, { size:15, w:700, align:'center' });
  mapLabel(cx, 'AV. 21 DE OCTUBRE', 150*CSC, 255.5*CSC, { size:15, w:700, align:'center' });
  mapLabel(cx, '← CTRA. AFGOOYE', 34*CSC, 255.5*CSC, { size:14, w:700 });
  mapLabel(cx, 'MAKKA AL-MUKARAMA', 352*CSC, 352*CSC, { rot:Math.atan2(300-410, 380-330), size:15, w:700, align:'center' });
  mapLabel(cx, 'CTRA. DEL AEROPUERTO', 180*CSC, 492*CSC, { rot:Math.atan2(512-410, 150-330) + Math.PI, size:15, w:700, align:'center' });
  mapLabel(cx, 'OCÉANO ÍNDICO', 640*CSC, 640*CSC, { size:24, w:700, it:true, col:'#2a5068', sp:true, align:'center', haloC:'rgba(170,204,218,.9)', rot:Math.atan2(COAST_DZ, COAST_DX) });
  mapLabel(cx, 'Playa del Lido', 700*CSC, 392*CSC, { size:14, it:true, col:'#2a5068', haloC:'rgba(200,220,226,.9)' });
  // landmarks
  const SYM = { hotel:'pt', target:'target', cross:'pt', bakara:'pt', s61:null, s64:null, k4:'pt', arch:'pt', stadium:'un', oldtown:null, port:null, air:null, villa:'pt' };
  for (const k in LM){ const m = LM[k]; if (!SYM[k] || m.x < 0 || m.z < 0 || m.x > W || m.z > H) continue; mapSym(cx, SYM[k], m.x*CSC, m.z*CSC);
    mapLabel(cx, m.n, m.x*CSC + 14, m.z*CSC + (k === 'hotel' ? 10 : k === 'target' ? -10 : 0), { size:15, w:700, col:SYM[k] === 'crash' || SYM[k] === 'target' ? MAP_RED : MAP_INK }); }
  mapNorth(cx, CWp - 46, 90, NORTH_ANG); mapScale(cx, CWp - 300, CWp - 64, CSC/1.5, 200);
  mapLegend(cx, 14, CWp - 186, [
    [(x, a, b) => { x.fillStyle = '#f8f2e0'; x.strokeStyle = MAP_INK; x.lineWidth = 1; x.fillRect(a-12, b-4, 24, 8); x.strokeRect(a-12, b-4, 24, 8); }, 'Asfalto en mal estado'],
    [(x, a, b) => { x.fillStyle = '#e2d2aa'; x.fillRect(a-12, b-4, 24, 8); }, 'Calle o pista de tierra'],
    [(x, a, b) => { x.fillStyle = '#987e5c'; x.fillRect(a-10, b-6, 20, 12); x.strokeStyle = '#68563e'; x.strokeRect(a-10, b-6, 20, 12); }, 'Edificios'],
    [(x, a, b) => mapSym(x, 'crash', a, b), 'Black Hawk derribado'],
    [(x, a, b) => mapSym(x, 'target', a, b), 'Objetivo de la misión'],
    [(x, a, b) => mapSym(x, 'un', a, b), 'Fuerzas de la ONU'],
    [(x, a, b) => { x.fillStyle = MAP_BLUE; x.fillRect(a-4, b-4, 8, 8); }, 'Tu escuadra'] ]);
  // ---- the regional sheet
  const RW = 1000, sc = (WB.x1 - WB.x0)/RW, RH = Math.round((WB.z1 - WB.z0)/sc);
  const reg = document.createElement('canvas'); reg.width = RW; reg.height = RH;
  const rx = reg.getContext('2d'), ri_ = rx.createImageData(RW, RH), rd = ri_.data;
  for (let py=0;py<RH;py++) for (let px=0;px<RW;px++){
    const x = WB.x0 + (px+.5)*sc, z = WB.z0 + (py+.5)*sc, s = coastS(x, z), p = (py*RW + px)*4; let c;
    if (s > -3) c = ((px + py) % 7 === 0) ? [118,160,182] : (s > 60 ? [146,184,200] : [160,196,210]);
    else if (s > -24) c = [240,230,198];
    else { const n = fbm(x*.01, z*.01), D_ = cityDs(x, z); c = [222 - n*14, 206 - n*14, 166 - n*12];
      if (x >= 0 && z >= 0 && x < W - 2 && z < H - 2){ let nb = 0, ns = 0; for (let b=0;b<3;b++) for (let a=0;a<3;a++){ const k = idx(Math.floor(x + a*.8), Math.floor(z + b*.8)); if (grid[k] === 1) nb++; else if (STR[k]) ns++; }
        const f = nb/9*.85; c = [c[0]*(1-f) + 120*f, c[1]*(1-f) + 98*f, c[2]*(1-f) + 74*f];
        const sw = ns > 4 ? clamp((D_ - .12)*2.2, 0, .4) : 0; if (sw > 0) c = [c[0]*(1-sw) + 246*sw, c[1]*(1-sw) + 238*sw, c[2]*(1-sw) + 216*sw]; }
      else if (D_ > .03){ const f = sstep(.03, .5, D_)*.3; c = [c[0]*(1-f) + 150*f, c[1]*(1-f) + 124*f, c[2]*(1-f) + 94*f]; }
      if (!(x >= 0 && z >= 0 && x < W - 2 && z < H - 2) && D_ > .03 && hash2(px*13 + 5, py*7 + 3) < D_*.55) c = [112, 92, 70];   // scattered compounds
      if (hash2(px*7 + 3, py*11 + 1) < .02 && D_ < .1) c = [150,140,96]; }
    const [u, v] = airUV(x, z);
    if (Math.abs(u) < RWY.L && Math.abs(v) < RWY.W) c = [96,92,86]; else if (v < APRON.v1 && v > APRON.v0 && u > APRON.u0 && u < APRON.u1) c = [178,172,160]; else if (v <= -RWY.W && v > APRON.v1 - 6 && JOINS.some(J => Math.abs(u - J) < 9)) c = [178,172,160]; else if (u > BASE.u0 && u < BASE.u1 && v > BASE.v0 && v < BASE.v1) c = [200,184,150];
    rd[p] = c[0]; rd[p+1] = c[1]; rd[p+2] = c[2]; rd[p+3] = 255;
  }
  rx.putImageData(ri_, 0, 0);
  const R = (x, z) => [(x - WB.x0)/sc, (z - WB.z0)/sc];
  const poly = (pts, w, col, dash) => { rx.save(); rx.lineCap = 'round'; rx.lineJoin = 'round'; rx.strokeStyle = col; rx.lineWidth = w; if (dash) rx.setLineDash(dash); rx.beginPath(); pts.forEach((p, k) => { const [X, Y] = R(p[0], p[1]); k ? rx.lineTo(X, Y) : rx.moveTo(X, Y); }); rx.stroke(); rx.restore(); };
  for (const t of TRACKS) poly([[t[0], t[1]], [t[2], t[3]]], 1, 'rgba(120,90,50,.35)', [2, 4]);
  for (const r of ROADS){ if (r.paved){ poly(r.pts, 5, MAP_INK); poly(r.pts, 3, '#f4ecd2'); } else poly(r.pts, 2.2, '#8a6a40', [6, 3]); }
  for (const v of VILLAGES){ for (let k=0;k<14;k++){ const a = hash2(k*7 + 1, v.x|0)*6.28, d = Math.sqrt(hash2(k*3, v.z|0))*v.r, [X, Y] = R(v.x + Math.cos(a)*d, v.z + Math.sin(a)*d);
      if (coastS(v.x + Math.cos(a)*d, v.z + Math.sin(a)*d) > -26) continue; rx.fillStyle = '#5a4630'; rx.fillRect(X - 1.5, Y - 1.5, 3, 3); }
    const [X, Y] = R(v.x, v.z); mapLabel(rx, v.nm, X + v.r/sc + 4, Y, { size:15, w:700, it:true }); }
  // the Irene route
  poly(ireneRoute(), 2, 'rgba(42,90,154,.9)', [8, 5]);
  { const pts = ireneRoute(), a = R(pts[pts.length-2][0], pts[pts.length-2][1]), b = R(pts[pts.length-1][0], pts[pts.length-1][1]), ang = Math.atan2(b[1]-a[1], b[0]-a[0]);
    rx.save(); rx.translate(b[0], b[1]); rx.rotate(ang); rx.fillStyle = MAP_BLUE; rx.beginPath(); rx.moveTo(0, 0); rx.lineTo(-10, -5); rx.lineTo(-10, 5); rx.fill(); rx.restore(); }
  { const [X, Y] = R(-520, 1335); mapLabel(rx, 'Ruta de vuelo · Operación Irene', X, Y, { size:14, w:700, it:true, col:MAP_BLUE, rot:-.52, align:'center', haloC:'rgba(200,220,226,.9)' }); }
  const [ax, ay] = R(AIR.x, AIR.z); mapSym(rx, 'base', ax, ay); mapLabel(rx, 'Aeropuerto Int. de Mogadiscio', ax + 18, ay - 8, { size:15, w:700 }); mapLabel(rx, 'base de la Task Force Ranger', ax + 18, ay + 9, { size:13, it:true, col:MAP_BLUE });

  { const [X, Y] = R(LM.stadium.x, LM.stadium.z); mapSym(rx, 'un', X, Y); }
  { const [X, Y] = R(LM.target.x, LM.target.z); mapSym(rx, 'target', X, Y); }
  { const [X, Y] = R(LM.k4.x, LM.k4.z); mapSym(rx, 'pt', X, Y); mapLabel(rx, 'K-4', X + 8, Y + 4, { size:13, w:700 }); }
  { const [X, Y] = R(250, 250); mapLabel(rx, 'MOGADISCIO', X, Y - 40, { size:26, w:800, sp:true, align:'center', col:'#5a3a1c', hw:5 }); }
  { const [X, Y] = R(-500, 352); mapLabel(rx, 'Carretera de Afgooye', X, Y - 9, { size:14, w:700, it:true, rot:Math.atan2(-120, 400), align:'center' }); }
  { const [X, Y] = R(-330, 735); mapLabel(rx, 'Carretera del aeropuerto', X, Y + 12, { size:14, w:700, it:true, rot:Math.atan2(-120, 250), align:'center' }); }
  { const [X, Y] = R(745, 318); mapLabel(rx, 'Playa del Lido', X, Y, { size:13, it:true, col:'#2a5068', haloC:'rgba(200,220,226,.9)' }); }
  { const [X, Y] = R(-60, 1350); mapLabel(rx, 'OCÉANO ÍNDICO', X, Y, { size:28, w:700, it:true, sp:true, col:'#2a5068', haloC:'rgba(170,204,218,.9)', rot:Math.atan2(COAST_DZ, COAST_DX), align:'center' }); }
  const cell = 300/sc; mapGrid(rx, RW, RH, Math.ceil(RW/cell), cell, 0, 0);
  mapNorth(rx, RW - 50, 90, NORTH_ANG); mapScale(rx, 30, RH - 30, 1/(1.5*sc), 1000);
  MAPC = { city, reg, sc, RW, RH, CSC };
}

/* ---------- particles: smoke, fire, dust ---------- */
const PN = 16000;
let PX, PY, PZ, PVX, PVY, PVZ, PT, PL, PS0, PS1, PA, PC, PE, PG, pHead = 0, pGeo, pMat, aPos, aSize, aAlpha, aCol, aEmi;
const PVS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aEmi;
uniform float uScale; uniform vec3 uTint; uniform float fNear; uniform float fFar;
varying float vA; varying vec3 vC; varying float vFog; varying float vE; varying float vS;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize > 0.0 ? max(1.0, aSize * uScale) : 0.0; vE = aEmi; vS = gl_PointSize;
  vA = aAlpha; vC = mix(aColor * uTint, aColor, aEmi);
  vFog = smoothstep(fNear, fFar, -mv.z) * (1.0 - aEmi * 0.7);
}`;
const PFS = `
uniform vec3 fCol; varying float vA; varying vec3 vC; varying float vFog; varying float vE; varying float vS;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);
  if (d > 0.25) discard;
  // a round puff, thick in the middle and gone at the rim; specks of a pixel or two and anything that glows stay solid
  float big = smoothstep(2.0, 7.0, vS);
  float a = clamp(vA * (1.25 - d * 2.6), 0.0, 1.0) * mix(1.0, smoothstep(0.25, 0.1, d), big) * mix(1.0, 0.5, big * (1.0 - vE));
  if (a < 0.015) discard;
  gl_FragColor = vec4(mix(vC, fCol, vFog), a);
}`;
function initParticles(){
  const F = n => new Float32Array(n);
  PX=F(PN); PY=F(PN); PZ=F(PN); PVX=F(PN); PVY=F(PN); PVZ=F(PN); PT=F(PN).fill(1); PL=F(PN).fill(1); PS0=F(PN); PS1=F(PN); PA=F(PN); PC=F(PN*6); PE=F(PN); PG=F(PN);
  aPos = F(PN*3); aSize = F(PN); aAlpha = F(PN); aCol = F(PN*3); aEmi = F(PN);
  pGeo = new T.BufferGeometry();
  const at = (a,n) => { const b = new T.BufferAttribute(a,n); b.setUsage(T.DynamicDrawUsage); return b; };
  pGeo.setAttribute('position', at(aPos,3)); pGeo.setAttribute('aSize', at(aSize,1)); pGeo.setAttribute('aAlpha', at(aAlpha,1));
  pGeo.setAttribute('aColor', at(aCol,3)); pGeo.setAttribute('aEmi', at(aEmi,1));
  pMat = new T.ShaderMaterial({ vertexShader:PVS, fragmentShader:PFS, transparent:true, depthWrite:false,
    uniforms:{ uScale:{ value:10 }, uTint:{ value:new T.Color(1,1,1) }, fNear:{ value:100 }, fFar:{ value:150 }, fCol:{ value:new T.Color(HAZE) } } });
  const pts = new T.Points(pGeo, pMat); pts.frustumCulled = false; pts.renderOrder = 3; world.add(pts);
}
const hexRGB = c => [((c>>16)&255)/255, ((c>>8)&255)/255, (c&255)/255];
function spawnP(x,y,z,vx,vy,vz,life,s0,s1,c0,c1,a0,emi,grav){
  const k = pHead; pHead = (pHead+1) % PN;
  PX[k]=x; PY[k]=y; PZ[k]=z; PVX[k]=vx; PVY[k]=vy; PVZ[k]=vz; PT[k]=0; PL[k]=life; PS0[k]=s0; PS1[k]=s1; PA[k]=a0; PE[k]=emi||0; PG[k]=grav||0;
  const A = hexRGB(c0), Bc = hexRGB(c1); PC.set(A, k*6); PC.set(Bc, k*6+3);
}
const SMK0 = 0x1b1917, SMK1 = 0x6c665d;
function emitFrom(e, dt){
  e.acc += dt * e.rate;
  while (e.acc > 1){ e.acc -= 1; const sp = e.sp || .35;
    spawnP(e.x+rr(-sp,sp), e.y+rnd()*.2, e.z+rr(-sp,sp), rr(-.15,.15), e.vy*rr(.7,1.3), rr(-.15,.15), e.life*rr(.7,1.2), e.s0*rr(.7,1.3), e.s1*rr(.7,1.3), jit(SMK0,.1), jit(SMK1,.08), rr(.9,1), 0, 0); }
  if (e.fire){
    e.facc = (e.facc||0) + dt * 34 * e.fire;
    while (e.facc > 1){ e.facc -= 1; const f = e.fire;
      spawnP(e.x+rr(-.45,.45)*f, e.y-.35+rnd()*.25, e.z+rr(-.35,.35)*f, rr(-.2,.2), rr(1.0,2.4)*f, rr(-.2,.2), rr(.3,.75), rr(.22,.38)*f, .05, pick([0xffe7a0,0xffd060,0xffb040]), pick([0xd8401a,0xb02a10]), 1, 1, 0); }
  }
}
function updParticles(dt){
  for (let k=0;k<PN;k++){
    if (PT[k] >= PL[k]){ if (aSize[k] !== 0){ aSize[k] = 0; aAlpha[k] = 0; } continue; }
    PT[k] += dt; const u = Math.min(1, PT[k]/PL[k]);
    if (PE[k] && !PG[k]){ PVY[k] += .6*dt; }
    else if (PG[k]){ PVY[k] -= PG[k]*dt; if (PY[k] < .02 && PVY[k] < 0){ PVY[k] = 0; PVX[k] *= .5; PVZ[k] *= .5; PY[k] = .02; } }
    else { PVX[k] += ((.55 * u + .1) - PVX[k]) * .6 * dt + (Math.random()-.5) * .8 * dt; PVZ[k] += ((.2 * u) - PVZ[k]) * .6 * dt + (Math.random()-.5) * .8 * dt; PVY[k] *= (1 - .12*dt); }
    PX[k] += PVX[k]*dt; PY[k] += PVY[k]*dt; PZ[k] += PVZ[k]*dt;
    aPos[k*3] = PX[k]; aPos[k*3+1] = PY[k]; aPos[k*3+2] = PZ[k];
    aSize[k] = u >= 1 ? 0 : PS0[k] + (PS1[k]-PS0[k]) * Math.sqrt(u);
    aAlpha[k] = PA[k] * (u < .08 ? u/.08 : 1) * (1 - u*u);
    const c = k*6; aCol[k*3] = PC[c] + (PC[c+3]-PC[c])*u; aCol[k*3+1] = PC[c+1] + (PC[c+4]-PC[c+1])*u; aCol[k*3+2] = PC[c+2] + (PC[c+5]-PC[c+2])*u;
    aEmi[k] = PE[k];
  }
  const A = pGeo.attributes; A.position.needsUpdate = A.aSize.needsUpdate = A.aAlpha.needsUpdate = A.aColor.needsUpdate = A.aEmi.needsUpdate = true;
}
let dustAcc = 0, gustAcc = 0;
function updAmbient(dt){
  const hh = halfH(), att = MIS && MIS.id === 'attract', eR = att ? hh*1.25 + 6 : hh*2.2 + 30;
  for (const e of emitters) if (Math.abs(e.x - camS.tx) < eR && Math.abs(e.z - camS.tz) < eR) emitFrom(e, att ? dt*.6 : dt);   // smoke and fire out of view cost nothing
  dustAcc += dt * 26; gustAcc += dt * 2.2;
  while (dustAcc > 1){ dustAcc -= 1; spawnP(camS.tx + rr(-hh*1.6, hh*1.6), rr(.1,2.5), camS.tz + rr(-hh*1.6, hh*1.6), rr(.2,.6), rr(-.05,.08), rr(-.1,.2), rr(4,8), .05, .1, 0xd8ccb0, 0xc8bca0, rr(.35,.6), 0, 0); }
  while (gustAcc > 1){ gustAcc -= 1; const x = camS.tx + rr(-hh*1.5, hh*1.5), z = camS.tz + rr(-hh*1.5, hh*1.5);
    for (let k=0;k<6;k++) spawnP(x+rr(-1,1), rr(.05,.5), z+rr(-1,1), rr(.5,1.1), rr(.02,.15), rr(.0,.3), rr(5,9), rr(.6,1), rr(1.8,3.2), 0xc9bb9c, 0xd2c6aa, rr(.18,.3), 0, 0); }
  paperAcc += dt * 3.5;
  while (paperAcc > 1){ paperAcc -= 1; spawnP(camS.tx + rr(-hh*1.4, hh*1.4), rr(.05,.6), camS.tz + rr(-hh*1.4, hh*1.4), rr(.9,2.2)*windAt(ambT), rr(.4,1.4), rr(.1,.8), rr(3,6), rr(.06,.1), .07, pick([0xf0f0ee,0xdcdcda,0xc4c4c2,0xa8a8a6,0xe8e8e6]), 0xd0d0ce, 1, 0, 2.2); }
  sandWaveFrame(dt, hh, att);
  updParticles(dt); updLoops(dt);
}
let paperAcc = 0;
/* a gust front off the desert: a low sheet of sand racing over the ground ahead of a wall of dust, sweeping across the view
   downwind; it streams the sand in snaking lines, lifts the litter and bends the grass as it goes */
const SW_DX = .932, SW_DZ = .362;            // downwind, the same as the litter's drift
let sandWave = null, sandWaveT = 14, sandWaveN = 0, sandBoost = 0;
function sandWaveFrame(dt, hh, att){
  sandWaveT -= dt;
  if (!sandWave && sandWaveT <= 0 && !att){ sandWaveT = rr(38, 70);
    const L = hh*1.9 + 12, off = rr(-hh*.6, hh*.6); sandWave = { id:++sandWaveN, cx:camS.tx - SW_DZ*off, cz:camS.tz + SW_DX*off, p:-L, end:L, v:rr(6.5, 8.5), W:rr(2.5, 4.5), sAcc:0, dAcc:0, wl:rr(0, 6) }; }
  const w = sandWave; if (!w){ sandBoost = sm(sandBoost, 0, 1 - Math.exp(-1.5*dt)); return; }
  w.p += w.v*dt;
  const fade = clamp((w.end - w.p)/10, 0, 1)*clamp((w.p + w.end)/8, 0, 1);
  sandBoost = sm(sandBoost, .3*fade, 1 - Math.exp(-2*dt));
  const nx = -SW_DZ, nz = SW_DX;              // along the front
  const at = (back, across) => [w.cx + SW_DX*(w.p - back) + nx*across, w.cz + SW_DZ*(w.p - back) + nz*across];
  // the sand sheet: fine grains streaming fast along the ground in lines that meander, thickest right behind the front
  w.sAcc += dt*30*w.W*fade;
  while (w.sAcc > 1){ w.sAcc -= 1;
    const lane = Math.round(rr(-w.W, w.W)/1.1)*1.1, a = lane + Math.sin(lane*.9 + w.p*.15 + w.wl)*.6 + rr(-.2, .2), back = Math.pow(rnd(), 1.8)*7;
    const [x, z] = at(back, a), sp = w.v*rr(.95, 1.35);
    spawnP(x, rr(.02, .22), z, SW_DX*sp + rr(-.3, .3), rr(-.05, .25), SW_DZ*sp + rr(-.3, .3), rr(.45, .9), rr(.06, .1), rr(.08, .14), 0xf3e6c4, 0xe2cfa4, rr(.5, .8), 0, 0); }
  // the dust: a rolling lip at the front, then a wall of haze that thins and climbs behind it
  w.dAcc += dt*14*w.W*fade;
  while (w.dAcc > 1){ w.dAcc -= 1;
    const lip = rnd() < .45, back = lip ? rr(-.5, 2) : 1.5 + Math.pow(rnd(), 1.4)*9, [x, z] = at(back, rr(-w.W, w.W)*.85), sp = w.v*(lip ? rr(.8, 1.0) : rr(.55, .85));
    spawnP(x, lip ? rr(.05, .4) : rr(.15, .9 + back*.06), z, SW_DX*sp, lip ? rr(.3, .9) : rr(.15, .6), SW_DZ*sp, lip ? rr(1.0, 1.8) : rr(2.0, 3.6),
      lip ? rr(.6, 1.1) : rr(1.2, 2.0), lip ? rr(1.8, 2.8) : rr(2.8, 4.4), lip ? 0x9c7c50 : 0xa98b5f, 0xc2a77c, lip ? rr(.42, .6) : rr(.26, .4), 0, 0); }
  if (w.p > w.end + 18) sandWave = null;
}

/* ---------- dynamic lights ---------- */
const FLASH_N = 6, AMB_N = 8, TRL_N = 4, MZ_N = 4;
let RPG_CNT = 0, ROCKETS = [], rpgCallT = -99;
const flashL = [], ambL = []; let flashHead = 0, ambPickT = 0, ambSrc = [];
for (let k=0;k<FLASH_N;k++){ const L = new T.PointLight(0xffc070, 0, 5, 2); scene.add(L); flashL.push({ L, t:1, life:1, i0:0 }); }
for (let k=0;k<AMB_N;k++){ const L = new T.PointLight(0xff8a3a, 0, 8, 2); scene.add(L); ambL.push(L); }
// lights that ride on a share of the tracers, so a burst throws moving light along the walls
const trL = []; let trHead = 0; for (let k=0;k<TRL_N;k++){ const L = new T.PointLight(0xff9a50, 0, 4, 2); scene.add(L); trL.push(L); }
// muzzle flashes: short, hard, flickering light for the shots closest to the camera; the walls and the men round the gun light up
const mzL = []; let mzHead = 0; for (let k=0;k<MZ_N;k++){ const L = new T.PointLight(0xffb45a, 0, 6, 2); scene.add(L); mzL.push({ L, t:1, life:1, i0:0 }); }
function muzzleLight(x, y, z, big){
  if (Math.hypot(x - camS.tx, z - camS.tz) > halfH()*2.4) return;
  let f = mzL[0]; for (const q of mzL) if (q.t/q.life > f.t/f.life) f = q;     // the one closest to finishing
  f.L.position.set(x, y + .15, z); f.L.color.setHex(big ? 0xffb860 : 0xffa850);
  f.i0 = (big ? 4.4 : 3.1)*(.5 + nightF*1.0); f.L.distance = (big ? 9 : 6.5)*(1 + nightF*.55); f.t = 0; f.life = big ? .1 : .075; f.L.intensity = f.i0;
}
const NIGHTG = { value:0 };
function lightFlash(x,y,z,col,int,distc,life){
  const f = flashL[flashHead]; flashHead = (flashHead+1) % FLASH_N;
  f.L.position.set(x,y,z); f.L.color.setHex(col); f.L.distance = distc; f.i0 = int; f.t = 0; f.life = life; f.L.intensity = int;
}
/* vest lights: at night three Rangers of each team (fire team, squad or chalk) carry a white light on the chest. A pool of six spot lights
   (15 m, a 60 degree cone, no shadows) goes to the carriers nearest the view, pointed where the man faces or aims; anyone standing in
   a beam counts as lit, so it shows the enemy as much as it lights the way */
const VEST_N = 6, VEST_R = 10, VEST_A = Math.PI/6, vestL = [];
for (let k=0;k<VEST_N;k++){ const L = new T.SpotLight(0xfff1dc, 0, VEST_R, VEST_A, .5, 1.3); L.castShadow = false; scene.add(L); scene.add(L.target); vestL.push(L); }
let VEST_MIS = null;
function vestCarriers(){
  if (VEST_MIS !== MIS){ VEST_MIS = MIS; for (const u of units || []) u.vest = false; }
  if (!us || nightF < .3) return [];
  const cnt = {};
  for (const u of us) if (u.vest){ const t = u.grp != null ? 'g' + u.grp : (u.unitName || 'all'); cnt[t] = (cnt[t] || 0) + 1; }
  for (const u of us){ if (u.vest || u.vestNo || !u.alive || u.look !== 'ranger') continue; const t = u.grp != null ? 'g' + u.grp : (u.unitName || 'all');
    if ((cnt[t] || 0) < 3){ u.vest = true; cnt[t] = (cnt[t] || 0) + 1; } else u.vestNo = true; }
  return us.filter(u => u.vest && u.alive && !u.down);
}
function vestDir(u){ const a = u.m && u.m.root ? u.m.root.rotation.y : u.face; return [Math.sin(a), Math.cos(a)]; }
function vestLit(x, z){
  let L = 0; if (!VEST_C.length) return 0;
  for (const u of VEST_C){ const dx = x - u.x, dz = z - u.z, d = Math.hypot(dx, dz); if (d > VEST_R || d < .3) continue; const [fx, fz] = vestDir(u);
    if ((dx*fx + dz*fz)/d < Math.cos(VEST_A)) continue; L = Math.max(L, (1 - d/VEST_R)*1.1); }
  return L;
}
let VEST_C = [];
function updVest(){
  VEST_C = vestCarriers();
  const cx = camS.tx, cz = camS.tz, on = VEST_C.filter(u => Math.abs(u.x - cx) < 60 && Math.abs(u.z - cz) < 60).sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
  for (let k=0;k<VEST_N;k++){ const L = vestL[k], u = on[k];
    if (!u){ L.intensity = 0; continue; }
    const [fx, fz] = vestDir(u), y = (u.elev || 0) + (u.stance === 'prone' ? .3 : u.stance === 'crouch' ? .75 : 1.0);
    L.position.set(u.x + fx*.18, y, u.z + fz*.18); L.target.position.set(u.x + fx*VEST_R, (u.elev || 0) + .15, u.z + fz*VEST_R);
    L.intensity = 3.2*sstep(.3, .7, nightF); L.updateMatrixWorld(); L.target.updateMatrixWorld(); }
}
function updLights(dt, now){
  updVest();
  for (const f of flashL){ if (f.t >= f.life){ f.L.intensity = 0; continue; } f.t += dt; f.L.intensity = f.i0 * Math.max(0, 1 - f.t/f.life); }
  for (const f of mzL){ if (f.t >= f.life){ f.L.intensity = 0; continue; } f.t += dt; const u = f.t/f.life; f.L.intensity = f.i0 * (u < .4 ? 1 : .55) * Math.max(0, 1 - u*u); }
  // every few tenths of a second, hand the light pool to the nearest sources: fires, fire barrels and (at night) the working lamps
  ambPickT -= dt;
  if (ambPickT <= 0){ ambPickT = .3; const cx = camS.tx, cz = camS.tz, cand = [];
    for (const e of emitters){ if (!e.fire || e.lsrc) continue; const d = Math.hypot(e.x - cx, e.z - cz); if (d < 60) cand.push([d - e.fire*6, { x:e.x, y:e.y + .5, z:e.z, col:0xff8a3a, fire:e.fire, fl:1, em:e }]); }
    for (const s of LIGHTSRC){ if (s.off || (s.lamp && nightF < .15)) continue; const d = Math.hypot(s.x - cx, s.z - cz); if (d < 60) cand.push([d, s]); }
    cand.sort((p, q) => p[0] - q[0]); ambSrc = cand.slice(0, AMB_N).map(c => c[1]); }
  for (let k=0;k<AMB_N;k++){
    const L = ambL[k], s = ambSrc[k];
    if (!s){ L.intensity = 0; continue; }
    const fl = s.fl ? .72 + .18*Math.sin(now*.017 + k*2) + .1*Math.sin(now*.041 + k) : 1;
    L.position.set(s.x, s.y, s.z); L.color.setHex(s.col);
    if (s.em){ L.intensity = (1.2 + nightF*2.4) * s.em.fire * fl; L.distance = (6 + 4*s.em.fire) * (1 + nightF*.7); }
    else if (s.lamp){ L.intensity = s.i * nightF * fl; L.distance = s.d; }
    else { L.intensity = s.i * (.35 + nightF*.9) * fl; L.distance = s.d * (.7 + nightF*.5); }
  }
  NIGHTG.value = sstep(.25, .8, nightF);
  if (glowMesh) glowMesh.visible = nightF > .12;
  updFlareLights(now);
}

/* ---------- sun and time of day ---------- */
let nightF = 0, goldF = 0; const goldT = new T.Vector3(1,1,1);
const C_SUN_HI = new T.Color(0xffe4c0), C_SUN_LO = new T.Color(0xff8a48), C_MOON = new T.Color(0x8a9ac8);
const C_SKY_D = new T.Color(0xfff0d0), C_SKY_DUSK = new T.Color(0xd8a0a0), C_SKY_N = new T.Color(0x3a4a78);
const C_GR_D = new T.Color(0x6a5638), C_GR_N = new T.Color(0x1a1a22);
const C_HAZE_D = new T.Color(HAZE), C_HAZE_DUSK = new T.Color(0xb88a66), C_HAZE_N = new T.Color(0x1d2232);
const C_SUN_DAWN = new T.Color(0xffa585), C_SKY_DAWN = new T.Color(0xc8a8c8), C_HAZE_DAWN = new T.Color(0xb49aa0);
const tc = new T.Color(), tc2 = new T.Color();
const sstep = (a,b,x) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const _sl = new T.Vector3(), _sr2 = new T.Vector3(), _su2 = new T.Vector3(), _st = new T.Vector3(), _sUp = new T.Vector3(0, 1, 0);
function setSun(hour){
  hour = ((hour % 24) + 24) % 24;
  // sun rises in the east (+x) about 05:55 and sets in the west (-x) about 17:57
  const e = (hour - 5.9) / 12.05 * Math.PI, se = Math.sin(e), day = sstep(-.12, .2, se), low = 1 - sstep(.05, .45, se);
  const morn = hour < 12 ? 1 : 0;
  nightF = 1 - day; goldF = low * day;
  if (morn) goldT.set(1.12, .92, .98); else goldT.set(1.13, .97, .8);
  const ce = Math.cos(Math.asin(clamp(se, .05, 1))), hx = .93*Math.cos(e), hz = .37;
  { const hh = halfH(), a = innerWidth/innerHeight, need = Math.hypot(hh*a, hh/Math.sin(camS.pitch)) + 20;
    const ext = [50, 62, 78, 98, 122, 150].find(v => v >= need) || 150, sc = sun.shadow.camera;
    if (sc.right !== ext){ sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.updateProjectionMatrix(); sun.shadow.bias = -.0016*ext/50; SHK.force = true; } }
  let sx0 = camS.tx, sz0 = camS.tz;
  if (day > .02) _sl.set(hx*ce, Math.max(se, .05), hz*ce).normalize(); else _sl.set(30, 70, -40).normalize();
  { const ext = sun.shadow.camera.right, tx = 2*ext/sun.shadow.mapSize.x;
    _sr2.crossVectors(_sUp, _sl).normalize(); _su2.crossVectors(_sl, _sr2);
    const a = sx0*_sr2.x + sz0*_sr2.z, b = sx0*_su2.x + sz0*_su2.z, da = Math.round(a/tx)*tx - a, db = Math.round(b/tx)*tx - b;
    _st.set(sx0, 0, sz0).addScaledVector(_sr2, da).addScaledVector(_su2, db); }
  sun.target.position.copy(_st); sun.target.updateMatrixWorld();
  sun.position.copy(_st).addScaledVector(_sl, day > .02 ? 80 : 86);
  tc.copy(C_SUN_HI).lerp(morn ? C_SUN_DAWN : C_SUN_LO, low);
  sun.color.copy(tc).lerp(C_MOON, nightF);
  sun.intensity = .9*day*(1 - low*.3) + .34*nightF;
  tc.copy(C_SKY_D).lerp(morn ? C_SKY_DAWN : C_SKY_DUSK, low*.6).lerp(C_SKY_N, nightF); hemi.color.copy(tc);
  hemi.groundColor.copy(C_GR_D).lerp(C_GR_N, nightF);
  hemi.intensity = .74 - .36*nightF;
  tc.copy(C_HAZE_D).lerp(morn ? C_HAZE_DAWN : C_HAZE_DUSK, low*.7).lerp(C_HAZE_N, nightF);
  scene.fog.color.copy(tc); scene.background.copy(tc);
  if (pMat){ pMat.uniforms.fCol.value.copy(tc); tc2.setRGB(1,1,1).lerp(new T.Color(.25,.28,.4), nightF); pMat.uniforms.uTint.value.copy(tc2); }
}

