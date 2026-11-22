"use strict";
/* =================== THE CITY AND THE REGION ===================
   A 768 x 768 tactical grid holds the city (1 unit = 1.5 m). Around it the region runs south-west along
   the coast to the airport and the Task Force Ranger base. Everything is planned once (streets, lots,
   landmarks, roads, villages) but only turned into 3D, chunk by chunk, when the camera comes near. */
const CS = 32;                              // chunk size in units
const WB = { x0:-1500, x1:900, z0:-160, z1:1700 };
const COAST_DX = .866, COAST_DZ = -.5, COAST_NX = .5, COAST_NZ = .866;
// signed distance to the shore, positive out to sea (the Indian Ocean lies south-east)
function coastS(x, z){ const u = x*COAST_DX + z*COAST_DZ; return (x+1200)*COAST_NX + (z-1500)*COAST_NZ + 18*Math.sin(u*.006) + 9*Math.sin(u*.017 + 1.0); }
const AIR = { x:-1100, z:1330 }, AIR_RY = Math.PI/6;
const AIRP = (u, v) => [AIR.x + COAST_DX*u + COAST_NX*v, AIR.z + COAST_DZ*u + COAST_NZ*v];
function airUV(x, z){ const dx = x - AIR.x, dz = z - AIR.z; return [dx*COAST_DX + dz*COAST_DZ, dx*COAST_NX + dz*COAST_NZ]; }
const ROADS = [
  { w:7, paved:true, n:'Carretera del aeropuerto', pts:[AIRP(184.7,-105), AIRP(225,-105), [-700,930], [-450,800], [-200,680], [0,590], [150,512], [330,410]] },
  { w:5, pts:[[-1000,1338], [-760,1196], [-500,1050], [-250,905], [0,761], [200,646], [400,530], [530,455]] },
  { w:5, pts:[[0,256], [-300,300], [-700,420], [-1100,500], [-1450,560]] },
  { w:4, pts:[[256,0], [150,-80], [-200,-140]] },
  { w:4, pts:[[-450,800], [-560,660], [-650,500]] },
  { w:4, pts:[[-880,1010], [-1000,760]] },
  { w:4, pts:[[-200,680], [-60,760]] },
];
const VILLAGES = [
  { x:-880, z:1010, r:45, n:30, nm:'Lafoole' }, { x:-560, z:860, r:35, n:22, nm:'Siinka Dheer' }, { x:-330, z:930, r:40, n:26, fish:true, nm:'Jasiira' },
  { x:-150, z:640, r:30, n:18, nm:'Ex Control Afgooye' }, { x:-650, z:500, r:40, n:26, nm:'Garasbaley' }, { x:-320, z:330, r:35, n:22, nm:'Daynile' },
  { x:-1000, z:760, r:35, n:20, nm:'Elasha Biyaha' }, { x:-60, z:760, r:30, n:18, fish:true, nm:'Dharkenley (afueras)' },
];
// districts of Mogadishu, placed as they lie relative to the landmarks of the battle
const DISTRICTS = [['HAWL WADAAG',192,232],['HODAN',105,330],['WARDHIGLEY',265,150],['YAQSHID',330,62],['HELIWA',150,58],['KARAAN',590,80],
  ['ABDIAZIZ',650,215],['SHIBIS',455,205],['BONDHERE',530,300],['SHINGANI',560,372],['HAMAR WEYNE',440,420],['HAMAR JABJAB',372,520],
  ['WABERI',250,470],['WADAJIR',140,570],['DHARKENLEY',60,430]];
const LM = {
  hotel:   { n:'Hotel Olympic', x:OX+40.5, z:OZ+18.5 },
  target:  { n:'Edificio objetivo', x:OX+43.5, z:OZ+5 },
  cross:   { n:'Cruce (misión 1)', x:OX+32, z:OZ+32 },
  bakara:  { n:'Mercado de Bakara', x:180, z:266 },
  s61:     { n:'Super 6-1 derribado', x:377, z:302 },
  s64:     { n:'Super 6-4 derribado', x:271, z:360 },
  k4:      { n:'Rotonda K-4', x:330, z:410 },
  arch:    { n:'El Arco', x:370.5, z:288.6 },
  stadium: { n:'Estadio · base paquistaní', x:415, z:62 },
  oldtown: { n:'Hamar Weyne', x:425, z:385 },
  port:    { n:'Puerto nuevo', x:600, z:428 },
  air:     { n:'Aeropuerto · base TFR', x:AIR.x, z:AIR.z },
  villa:   { n:'Villa Somalia', x:468, z:318 },
};
const STADIUM = { x:415, z:62, rx:38, rz:30 };
const MILE_X = 415;                                // the Mile: from the K-4 road north to the stadium gate
const BAKARA = { x0:140, x1:216, y0:226, y1:306 }, SHANTY = { x0:262, x1:300, y0:336, y1:380 }, OLDTOWN = { x0:370, x1:470, y0:330, y1:430 };
const OLDW = [0xf2eee4, 0xebe4d2, 0xe6dccb, 0xf0e8d8, 0xdfe2dc];

/* ---------- chunks and lazy construction ---------- */
let CHUNKS = new Map(), GEN = [], CUR = null, PLANNING = false, frameStamp = 0, heliWaiters = [];
let STR, SVX, SVW, SHZ, SHW;                 // street raster: 0 none, 1 dirt street, 2 paved; line starts and widths for wheel ruts
function chunkAt(i, j){
  const k = i + ',' + j; let c = CHUNKS.get(k);
  if (!c){ c = { i, j, x0:i*CS, z0:j*CS, BX:[], BXm:[], AW:[], CY:[], DM:[], LF:[], VH:[], PM:[], CR:[], TR:[], PR:[], lz:[], gen:false, group:null }; CHUNKS.set(k, c); }
  return c;
}
const chunkFor = (x, z) => chunkAt(Math.floor(x/CS), Math.floor(z/CS));
function lazyAdd(x, z, fn){ const s = (Math.imul(Math.floor(x*7)|0, 73856093) ^ Math.imul(Math.floor(z*7)|0, 19349663) ^ 0x5bd1e995) >>> 0; chunkFor(x, z).lz.push({ seed:s, fn }); }
const UDOME = new T.SphereGeometry(.5, 12, 6, 0, Math.PI*2, 0, Math.PI/2);
function D(x, y, z, w, h, d, c, o){ const e = inst(x, y, z, w, h, d, c, o); (CUR || chunkFor(x, z)).DM.push(e); }
function Cs(x, y, z, sx, sy, sz, c, o){ const e = inst(x, y, z, sx, sy, sz, c, o); (CUR || chunkFor(x, z)).CY.push(e); }
const GPLANE = new T.PlaneGeometry(CS, CS); GPLANE.rotateX(-Math.PI/2);

function genChunk(ch){
  const ps = seed, pm = MAT;
  ch.group = new T.Group(); world.add(ch.group);
  CUR = ch;
  for (const e of ch.lz){ seed = e.seed; MAT = 0; e.fn(); }
  seed = (Math.imul(ch.i, 73856093) ^ Math.imul(ch.j, 19349663) ^ 1993) >>> 0; MAT = 0;
  dressChunk(ch); scatterProps(ch);
  CUR = null; seed = ps; MAT = pm;
  const mk = (geo, L, sh) => L.length ? makeInst(geo, L, sh, ch.group) : null;
  ch.box = mk(UBOX, ch.BX, true); ch.bxm = mk(UBOX, ch.BXm, false); ch.aw = mk(UBOX, ch.AW, false);
  ch.cyl = mk(UCYL, ch.CY, true); ch.dome = mk(UDOME, ch.DM, true);
  buildLeaves(ch); buildVeg(ch); buildVeh(ch); buildPalms(ch); buildCranes(ch); buildTrees(ch); buildProps(ch);
  if (G && G.roofs) cutChunk(ch, true);
  ch.gm = new T.Mesh(GPLANE, groundMat());
  ch.gm.position.set(ch.x0 + CS/2, 0, ch.z0 + CS/2); ch.gm.receiveShadow = true; ch.group.add(ch.gm);
  ch.tex = null; ensureGround(ch);
  hgAddChunk(ch);
  ch.gen = true; GEN.push(ch);
}
function cutChunk(ch, on){
  if (ch.box) writeInst(ch.box, ch.BX, on); if (ch.bxm) writeInst(ch.bxm, ch.BXm, on);
  if (ch.cyl) writeInst(ch.cyl, ch.CY, on); if (ch.dome) writeInst(ch.dome, ch.DM, on);
  for (const r of ch.PR) if (r.roof || r.gone || r.y >= CUT) propWrite(r, on);
}
function ensureGround(ch){
  if (ch.tex) return;
  ch.tex = genGroundTex(ch); ch.gm.material.map = ch.tex; ch.gm.material.needsUpdate = true;
}
function hgAddChunk(ch){
  const add = e => {
    e.r = .5*Math.hypot(e.sx, e.sy, e.sz); e.st = 0;
    if (e.rx || e.ry || e.rz){ _e.set(e.rx, e.ry, e.rz, e.ord); e.q = new T.Quaternion().setFromEuler(_e); e.qi = e.q.clone().invert(); }
    const i0 = Math.max(ORX, Math.floor(e.x - e.r)), i1 = Math.min(ORX+W-1, Math.floor(e.x + e.r)), j0 = Math.max(ORZ, Math.floor(e.z - e.r)), j1 = Math.min(ORZ+H-1, Math.floor(e.z + e.r));
    for (let j=j0;j<=j1;j++) for (let i=i0;i<=i1;i++){ const k = idx(i,j); (HG[k] || (HG[k] = [])).push(e); }
  };
  if (ch.x0 + CS < ORX - 8 || ch.z0 + CS < ORZ - 8 || ch.x0 > ORX + W + 8 || ch.z0 > ORZ + H + 8) return;
  for (const L of [ch.BX, ch.BXm, ch.AW, ch.CY, ch.DM]) for (const e of L) add(e);
}
// which chunks the camera can see; generate the nearest missing ones a few per frame
let FOCUS2 = null;
const _wfr = new T.Frustum(), _wfm = new T.Matrix4(), _wbx = new T.Box3(), _wbx2 = new T.Box3();
function updWorld(budget){
  frameStamp++;
  const hh = halfH(), a = innerWidth/innerHeight;
  const att = MIS && MIS.id === 'attract' && !FLIGHT.sel;
  const R = Math.hypot(hh*a, hh/Math.sin(camS.pitch)) + (att ? 4 : 20);
  const pts = [[camS.tx, camS.tz, R]]; if (FOCUS2 && !att) pts.push(FOCUS2);
  if (att){ updCam(); cam.updateMatrixWorld(); _wfr.setFromProjectionMatrix(_wfm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); }
  const want = [];
  for (const [cx, cz, r] of pts){
    const i0 = Math.floor((cx - r)/CS), i1 = Math.floor((cx + r)/CS), j0 = Math.floor((cz - r)/CS), j1 = Math.floor((cz + r)/CS);
    for (let j=j0;j<=j1;j++) for (let i=i0;i<=i1;i++){
      const mx = i*CS + CS/2, mz = j*CS + CS/2;
      if (mx < WB.x0 || mx > WB.x1 || mz < WB.z0 || mz > WB.z1) continue;
      const d = Math.hypot(mx - cx, mz - cz); if (d > r + CS*.72) continue;
      if (att){ _wbx.min.set(i*CS - 12, -1, j*CS - 12); _wbx.max.set(i*CS + CS + 12, 30, j*CS + CS + 12); if (!_wfr.intersectsBox(_wbx)) continue; }
      const ch = chunkAt(i, j); ch.seen = frameStamp;
      if (!ch.gen) want.push([d, ch]); else if (!ch.tex) want.push([d, ch]);
    }
  }
  want.sort((p, q) => p[0] - q[0]);
  for (let k=0; k<want.length && budget > 0; k++){ const ch = want[k][1]; if (!ch.gen) genChunk(ch); else { ensureGround(ch); } budget--; }
  const lod = camS.zoom < 15;
  // drawn only if the chunk (with a margin for the shadows its buildings throw into view) is inside what the camera sees
  updCam(); cam.updateMatrixWorld(); _wfr.setFromProjectionMatrix(_wfm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const sdx = sun.position.x - sun.target.position.x, sdz = sun.position.z - sun.target.position.z, sdy = sun.position.y - sun.target.position.y;
  const mg = clamp(16*Math.hypot(sdx, sdz)/Math.max(sdy, 1e-3), 14, 44);   // a low sun throws long shadows: keep more chunks round the view
  for (const ch of GEN){
    const ex = ch.ext || 0; _wbx.min.set(ch.x0 - mg - ex, -1, ch.z0 - mg - ex); _wbx.max.set(ch.x0 + CS + mg + ex, 26, ch.z0 + CS + mg + ex);
    const vis = ch.seen === frameStamp && _wfr.intersectsBox(_wbx);
    ch.group.visible = vis;
    // a zone kept only because its buildings throw shadows into view goes on layer 1: the sun's shadow camera sees it, the view does not
    if (vis){ const e2 = 1.5 + (ch.ext || 0); _wbx2.min.set(ch.x0 - e2, -1, ch.z0 - e2); _wbx2.max.set(ch.x0 + CS + e2, 26, ch.z0 + CS + e2);   // a hangar reaches past its own chunk
      const scr = _wfr.intersectsBox(_wbx2), nc = ch.group.children.length;
      if (scr !== ch.scr || nc !== ch.layC){ ch.scr = scr; ch.layC = nc; const mk = scr ? 3 : 2; ch.group.traverse(o => { if (!o.isLight) o.layers.mask = mk; }); } }
    if (ch.bxm) ch.bxm.visible = camS.zoom < 24;
    if (ch.veg) ch.veg.visible = camS.zoom < 24; if (ch.vegG) ch.vegG.visible = camS.zoom < 24;
    if (!vis && ch.tex){ const d = Math.hypot(ch.x0 + CS/2 - camS.tx, ch.z0 + CS/2 - camS.tz); if (d > R + CS*(MIS && MIS.id === 'attract' ? 1.2 : 7)){ ch.tex.dispose(); ch.tex = null; ch.gm.material.map = null; ch.gm.material.needsUpdate = true; } }
  }
}
function visibleBoxMeshes(){ const out = []; for (const ch of GEN) if (ch.seen === frameStamp && ch.box) out.push(ch.box); return out; }

/* ---------- ground texture per chunk ---------- */
const GCOL = [[196,178,142],[210,192,156],[186,166,130],[214,202,176],[194,174,138],[204,198,182],[160,144,118],[150,146,96],[0,0,0],[98,95,90],[150,138,112],[224,208,172]];
function roadDist(x, z, segs){
  let best = 1e9, bw = 0, bp = false;
  for (const s of segs){
    const dx = s[2]-s[0], dz = s[3]-s[1], L2 = dx*dx + dz*dz || 1;
    const t = clamp(((x-s[0])*dx + (z-s[1])*dz)/L2, 0, 1), px = s[0]+dx*t - x, pz = s[1]+dz*t - z, d = Math.sqrt(px*px + pz*pz) - s[4]/2;
    if (d < best){ best = d; bw = s[4]; bp = s[5]; }
  }
  return [best, bp];
}
const ROADSEG = [];
for (const r of ROADS) for (let k=1;k<r.pts.length;k++) ROADSEG.push([r.pts[k-1][0], r.pts[k-1][1], r.pts[k][0], r.pts[k][1], r.w, !!r.paved]);
/* ---------- the shape of the city: an organic density field, stretched along the coast, frayed by noise ---------- */
const ROAD0SEG = ROADSEG.slice(0, ROADS[0].pts.length - 1);
function cityD(x, z){
  const sc = coastS(x, z); if (sc > -24) return 0;
  // warp the coordinates so the outline wanders: bays of open ground, tongues of houses
  const wx = x + 70*(fbm(x*.0062 + 11.3, z*.0062 + 2.1) - .5), wz = z + 70*(fbm(x*.0062 + 5.7, z*.0062 + 8.9) - .5);
  const dx = wx - 340, dz = wz - 315;
  const u = dx*COAST_DX + dz*COAST_DZ, v = dx*COAST_NX + dz*COAST_NZ;
  const r = Math.hypot(u/1.75, v < 0 ? v/1.2 : v/1.45);
  const n = fbm(x*.013 + 3.7, z*.013 + 9.1) - .5, n2 = fbm(x*.034 + 1.3, z*.034 + 4.4) - .5;
  let d = 1 - sstep(60, 235, r * (1 + n*.9 + n2*.3));
  d = Math.min(1, d + .32*(1 - sstep(30, 140, -sc))*(1 - sstep(170, 380, r)));   // the old coastal quarters are the densest
  // tongues of building along the main roads out of town: Afgooye road west, the road north, the airport road
  const lobe = (ax, az, bx, bz, w, k) => { const L = Math.hypot(bx-ax, bz-az), t = clamp(((x-ax)*(bx-ax) + (z-az)*(bz-az))/(L*L), 0, 1), px = ax + (bx-ax)*t - x, pz = az + (bz-az)*t - z;
    return (1 - sstep(w*.3, w, Math.hypot(px, pz))) * (1 - t*.85) * k * (1 + n2*1.5); };
  d = Math.max(d, lobe(200, 256, 0, 262, 40, .62), lobe(256, 170, 250, 0, 34, .5), lobe(330, 410, 0, 590, 40, .58), lobe(450, 210, 760, 40, 40, .55));
  // ragged edges: where the town thins out, blocks come and go in patches
  { const n3 = fbm(x*.045 + 21.1, z*.045 + 3.3) - .5; d = clamp(d + n3*1.1*d*(1 - d)*2.2, 0, 1); }
  // the northern quarters: a block of town from the target up to the stadium, either side of the Mile
  { const e = Math.hypot((x - 340)/175, (z - 150)/(z < 150 ? 125 : 160)); d = Math.max(d, (1 - sstep(.6, 1.05, e*(1 + n*.45 + n2*.2)))*.92); }
  d = Math.max(d, lobe(MILE_X, 412, MILE_X, 40, 46, .85));
  // the grid edge: the dense city never touches it, so the town frays out before the map does (the north edge is tighter)
  const ed = Math.min(x, z*3.2, W - x, H - z);
  d = Math.min(d, .14 + .86*sstep(4, 170, ed)*(.75 + .5*fbm(x*.02 + 7.7, z*.02 + 1.9)));
  // a faint halo of scattered compounds well beyond the last streets
  d = Math.max(d, .16*(1 - sstep(220, 560, r))*clamp(.55 + n2*2.2 + n, 0, 1.4));
  // ribbon development along the airport road out of K-4
  const rd = roadDist(x, z, ROAD0SEG)[0], kk = Math.hypot(x - 330, z - 410);
  d = Math.max(d, (1 - sstep(5, 50, rd)) * (1 - sstep(60, 560, kk)) * .36 * (1 + n2*1.4));
  return clamp(d, 0, 1);
}
// coarse cache for per-pixel lookups
let DCACHE = null;
function cityDc(x, z){
  const S = 4, i = Math.floor((x - WB.x0)/S), j = Math.floor((z - WB.z0)/S), NX = Math.ceil((WB.x1 - WB.x0)/S) + 2;
  if (!DCACHE) DCACHE = new Map();
  const k = j*NX + i; let v = DCACHE.get(k);
  if (v === undefined){ v = cityD(WB.x0 + i*S + S/2, WB.z0 + j*S + S/2); DCACHE.set(k, v); }
  return v;
}
function cityDs(x, z){ // smooth, bilinear over the cache
  const S = 4, fx = (x - WB.x0)/S - .5, fz = (z - WB.z0)/S - .5, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const g = (a, b) => cityDc(WB.x0 + (a+.5)*S, WB.z0 + (b+.5)*S);
  return (g(i,j)*(1-tx) + g(i+1,j)*tx)*(1-tz) + (g(i,j+1)*(1-tx) + g(i+1,j+1)*tx)*tz;
}
// ground kinds in the city grid: 0 lot, 1 street, 2 yard, 3 plaza, 4 market, 5 sidewalk, 6 under building, 7 pitch, 9 asphalt, 10 wet sand, 11 beach
function cityKind(i, j){
  const k = idx(i, j), g = grid[k];
  if (g === 3) return 10;
  if (g === 1) return 6;
  if (ground[k] === 5) return 5;
  if (STR[k] === 2) return 9;
  if (STR[k] === 1) return 1;
  if (ground[k]) return ground[k];
  return 0;
}
function landColor(wx, wz, out){
  const s = coastS(wx, wz);
  let r, g, b, h = fbm(wx*1.3+40, wz*1.3+40)*.5;
  const n = fbm(wx*.08, wz*.08), n2 = fbm(wx*.9+7, wz*.9+3);
  if (s > -3){ const f = clamp((s+3)/6, 0, 1); r = 222 - 60*f; g = 206 - 60*f; b = 172 - 52*f; h = .2; }
  else if (s > -24){ r = 224; g = 208; b = 172; const rip = Math.sin(s*1.7 + n2*3); r -= 6*rip; g -= 6*rip; b -= 5*rip; h = rip*.1; }
  else {
    r = 200 - n*18; g = 172 - n*16; b = 128 - n*14;
    if (n2 > .62){ const w = Math.min(1, (n2-.62)*6); r = r*(1-w) + 132*w; g = g*(1-w) + 128*w; b = b*(1-w) + 88*w; }
    if (s > -60){ const w = (s + 60)/36; r = r*(1-w*.4) + 220*w*.4; g = g*(1-w*.4) + 200*w*.4; b = b*(1-w*.4) + 160*w*.4; }
    // where the town thins out the ground is trodden and dusty: blend towards the colour of the city lots
    const cd = wx > WB.x0 && wx < WB.x1 && wz > WB.z0 && wz < WB.z1 ? cityDs(wx, wz) : 0;
    if (cd > .005){ const w = sstep(0, .4, cd)*.75; r = r*(1-w) + 192*w; g = g*(1-w) + 173*w; b = b*(1-w) + 136*w; }
  }
  // villages: packed earth
  for (const v of VILLAGES){ const d = Math.hypot(wx-v.x, wz-v.z); if (d > v.r*1.6) continue; const vr = v.r*1.15*(.8 + .55*fbm(wx*.04 + v.x, wz*.04)); if (d < vr){ const w = clamp(1 - d/vr, 0, 1)*.8; r = r*(1-w) + 172*w; g = g*(1-w) + 146*w; b = b*(1-w) + 112*w; } }
  // roads
  const [rd, paved] = roadDist(wx, wz, ROADSEG_LOCAL);
  if (rd < 0){ if (paved && false){ r = 104; g = 99; b = 90; const pot = vnoise(wx*.6, wz*.6); if (pot > .72){ r = 160; g = 140; b = 108; } if (rd > -.6){ r = 150; g = 138; b = 112; } h = .1; }
    else { r = 186; g = 156; b = 116; const rut = Math.abs(Math.sin((rd)*2.6)); if (rut > .92){ r -= 18; g -= 16; b -= 12; h -= .3; } } }
  else if (rd < 2.2){ const w = 1 - rd/2.2; r = r*(1-w*.3) + 190*w*.3; g = g*(1-w*.3) + 164*w*.3; b = b*(1-w*.3) + 124*w*.3; }
  // airport surfaces: the runway, the links, the apron and the base inside the fence
  const [u, v] = airUV(wx, wz);
  if (TZONE && TZTRACK.length){ let best = null;
    for (const s of TZTRACK){ const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx*dx + dz*dz, L = Math.sqrt(L2), t = clamp(((wx - s[0])*dx + (wz - s[1])*dz)/L2, 0, 1), px = s[0] + dx*t, pz = s[1] + dz*t, d = Math.hypot(wx - px, wz - pz);
      if (!best || d < best[0]) best = [d, ((wx - s[0])*dz - (wz - s[1])*dx)/L, s[6] + t*L]; }
    if (best && best[0] < 2.9){ const SW = 5, across = best[1] + SW/2, pos = best[2];
      const m = sandM(wx, wz, hash2(Math.floor(wx*8)*7 + 5, Math.floor(wz*8)*13 + 9)), rd_ = airRuts(pos, across, [1.6, SW - 1.6], .42);
      let c = [204*m, 184*m, 148*m]; if (rd_ < .2){ const f = .62 + rd_*1.9; c = [c[0]*f, c[1]*f, c[2]*f*.97]; }
      const e = clamp((2.9 - best[0])/.8, 0, 1); out[0] = r*(1-e) + c[0]*e; out[1] = g*(1-e) + c[1]*e; out[2] = b*(1-e) + c[2]*e; out[3] = rd_ < .17 ? -.2 : 0; return; } }
  if (TZONE && u > TZONE.u0 - 1 && u < TZONE.u1 + 1 && v > TZONE.v0 - 4 && v < TZONE.v1 + 1){ const w = sstep(0, 2, Math.min(u - TZONE.u0 + 1, TZONE.u1 + 1 - u, v - TZONE.v0 + 4, TZONE.v1 + 1 - v))*.7, p = fbm(wx*.6 + 3, wz*.6 + 9);
    r = r*(1-w) + (186 - p*22)*w; g = g*(1-w) + (162 - p*20)*w; b = b*(1-w) + (124 - p*16)*w; h = h*(1-w) + .04*w; }
  if (u > -300 && u < 340 && v > -292 && v < 16 && rd >= 0 && airGround(u, v, out)) return;
  out[0] = r; out[1] = g; out[2] = b; out[3] = h;
}
let ROADSEG_LOCAL = ROADSEG;
// clean sand: broad, gentle changes of tone across tens of metres, a little softer shading at metre scale and a fine even grain,
// instead of the old coarse blotches; the ruts, potholes and street edges are drawn on top of this unchanged
function sandM(x, z, fine){ return .965 + (fbm(x*.11 + 13, z*.11 + 7) - .5)*.11 + (fbm(x*.55 + 3, z*.55 + 1) - .5)*.035 + (fine - .5)*.028; }
const GDET_C = rdTex('assets/textures/terrain/gdet-c.jpg', true), GDET_S = rdTex('assets/textures/terrain/gdet-s.jpg', true);
const GDET_U = { c:{ value:GDET_C }, s:{ value:GDET_S } };
const GDET_TILE = 2.6;       // units per repeat (about 4 m)
function groundMat(){
  const m = new T.MeshPhongMaterial({ color:0xffffff, specular:0x000000, shininess:1 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uDetC = GDET_U.c; sh.uniforms.uDetS = GDET_U.s;
    sh.vertexShader = 'varying vec2 vGW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = 'uniform sampler2D uDetC, uDetS; varying vec2 vGW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  float ga = texelColor.a * 255.0, on = smoothstep(108.0, 126.0, ga), wC = clamp((255.0 - ga)/127.0, 0.0, 1.0) * step(120.0, ga);
  texelColor.a = 1.0;
  texelColor = mapTexelToLinear( texelColor );
  vec2 q = vGW / ${GDET_TILE.toFixed(2)};
  // the photo's grain, pebbles and small stains only (divided by a blurred copy of itself), so no big blotches and no visible repeat
  vec2 q2 = mat2(.8, -.6, .6, .8) * q * 1.37 + vec2(.31, .67);
  vec3 dC = texture2D(uDetC, q).rgb / max(texture2D(uDetC, q, 5.0).rgb, vec3(.05)) * .6 + texture2D(uDetC, q2).rgb / max(texture2D(uDetC, q2, 5.0).rgb, vec3(.05)) * .4;
  vec3 dS = texture2D(uDetS, q).rgb / max(texture2D(uDetS, q, 5.0).rgb, vec3(.05)) * .6 + texture2D(uDetS, q2).rgb / max(texture2D(uDetS, q2, 5.0).rgb, vec3(.05)) * .4;
  vec3 det = 1.0 + (mix(dS, dC, wC) - 1.0) * 1.5;
  // and a little of its colour: the city a browner, grittier tone, the country a warmer sand
  vec3 avg = mix(vec3(.603, .451, .321), vec3(.572, .434, .299), wC);
  float lum = dot(texelColor.rgb, vec3(.3, .55, .15));
  vec3 tint = avg / dot(avg, vec3(.3, .55, .15)) * lum;
  texelColor.rgb = mix(texelColor.rgb, mix(texelColor.rgb, tint, .22) * det, on);
  diffuseColor *= texelColor;
#endif`);
  };
  m.customProgramCacheKey = () => 'gdet';
  return m;
}
function genGroundTex(ch){
  const inCity = ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0;
  const S = inCity || airHiRes(ch) ? 8 : 4, N = CS*S;
  ROADSEG_LOCAL = ROADSEG.concat(TRACKS).filter(s => Math.min(s[0],s[2]) - 12 < ch.x0 + CS && Math.max(s[0],s[2]) + 12 > ch.x0 && Math.min(s[1],s[3]) - 12 < ch.z0 + CS && Math.max(s[1],s[3]) + 12 > ch.z0);
  const col = new Float32Array(N*N*3), hgt = new Float32Array(N*N), tmp = [0,0,0,0];
  const occ = (i, j) => inB(i,j) && grid[idx(i,j)] === 1 ? 1 : 0;
  const occAt = (x, z) => { x -= .5; z -= .5; const i = Math.floor(x), j = Math.floor(z), fx = x-i, fz = z-j;
    return (occ(i,j)*(1-fx) + occ(i+1,j)*fx)*(1-fz) + (occ(i,j+1)*(1-fx) + occ(i+1,j+1)*fx)*fz; };
  const ruts = (pos, across, lanes, sep) => { let d = 9;
    for (let l=0;l<lanes.length;l++){ const c = lanes[l] + Math.sin(pos*.21 + l*3.1)*.28 + (vnoise(pos*.35, l*11.3)-.5)*.5;
      d = Math.min(d, Math.abs(across - (c - sep)), Math.abs(across - (c + sep))); }
    return d; };
  // the land colour under the city fringe, sampled four times per unit and cached
  const LC = new Map(), landAt = (wx, wz) => { const a = Math.floor(wx*4), b = Math.floor(wz*4), k = a*65536 + b; let v = LC.get(k);
    if (!v){ landColor((a + .5)/4, (b + .5)/4, tmp); v = [tmp[0], tmp[1], tmp[2], tmp[3]]; LC.set(k, v); } tmp[0] = v[0]; tmp[1] = v[1]; tmp[2] = v[2]; tmp[3] = v[3]; };
  for (let py=0; py<N; py++){
    const wz = ch.z0 + (py+.5)/S;
    for (let px=0; px<N; px++){
      const wx = ch.x0 + (px+.5)/S, p = py*N + px;
      if (!(wx >= 0 && wz >= 0 && wx < W && wz < H)){ landColor(wx, wz, tmp); col[p*3] = tmp[0]; col[p*3+1] = tmp[1]; col[p*3+2] = tmp[2]; hgt[p] = tmp[3]; continue; }
      const oi = Math.floor(wx), oj = Math.floor(wz), own = cityKind(oi, oj);
      const ji = clamp(Math.floor(wx + (vnoise(wx*.9, wz*.9)-.5)*.8), 0, W-1), jj = clamp(Math.floor(wz + (vnoise(wx*.9+31, wz*.9+17)-.5)*.8), 0, H-1);
      let t = cityKind(ji, jj);
      if (own === 5) t = 5; else if (t === 5) t = own === 9 ? 9 : 1;
      if (own === 6 && t !== 6) t = 6; if (t === 6 && own !== 6) t = own === 5 ? 5 : own;
      if (own === 10 || own === 11 || own === 7) t = own;
      if (t === 9) t = 1;
      const c = GCOL[t];
      let m = sandM(wx, wz, hash2(Math.floor(wx*S)*7+1, Math.floor(wz*S)*13+5)), r = c[0]*m, g = c[1]*m, b = c[2]*m;
      let h = fbm(wx*1.4+40, wz*1.4+40) * .07;
      const k = idx(oi, oj);
      if (t === 1 || t === 9){
        let best = 9;
        if (SVX[k] >= 0){ const wide = SVW[k] > 5; best = Math.min(best, ruts(wz, wx - SVX[k], wide ? [2.4, SVW[k]-2.4] : [1.6, SVW[k]-1.6], .42)); }
        if (SHZ[k] >= 0){ const wide = SHW[k] > 5; best = Math.min(best, ruts(wx, wz - SHZ[k], wide ? [2.6, SHW[k]-2.6] : [1.6, SHW[k]-1.6], .42)); }
        if (t === 1){
          if (best < .17){ const f = .8 + best*1.1; r *= f; g *= f; b *= f*.97; h -= (.17-best)*2.2; }
          const pn = fbm(wx*.33+5, wz*.33+9);
          if (pn > .66){ const w = Math.min(1, (pn-.66)*12); r += 18*w; g += 16*w; b += 14*w; }
        } else {
          const cr = Math.abs(vnoise(wx*1.7, wz*1.7) - .5); if (cr < .02){ r *= .7; g *= .7; b *= .7; h -= .3; }
          let ed = 9; if (SVX[k] >= 0) ed = Math.min(wx - SVX[k], SVX[k] + SVW[k] - wx); if (SHZ[k] >= 0) ed = Math.min(ed, wz - SHZ[k], SHZ[k] + SHW[k] - wz);
          const sd = 1 - sstep(.3, 1.6 + fbm(wx*.4, wz*.4)*1.4, ed); if (sd > 0){ r = r*(1-sd) + 196*sd; g = g*(1-sd) + 174*sd; b = b*(1-sd) + 134*sd; }
          const pot = fbm(wx*.5+3, wz*.5+8) + (vnoise(wx*1.3+9, wz*1.3) - .5)*.12; if (pot > .6){ const w = Math.min(1, (pot-.6)*8); r = r*(1-w) + 178*w; g = g*(1-w) + 158*w; b = b*(1-w) + 122*w; h += w*.2; }
          let ctr = 9; if (SVX[k] >= 0 && SVW[k] >= 7) ctr = Math.abs(wx - (SVX[k] + SVW[k]/2)); if (SHZ[k] >= 0 && SHW[k] >= 7) ctr = Math.min(ctr, Math.abs(wz - (SHZ[k] + SHW[k]/2)));
          if (ctr < .08 && ((Math.floor((SVX[k] >= 0 ? wz : wx)*.8)) & 1)){ r = 200; g = 190; b = 160; }
        }
      } else if (t === 3){
        const row = Math.floor(wz/.62), sx = wx/.62 + (row&1)*.5, fx = sx - Math.floor(sx), fz = wz/.62 - row;
        if (fx < .07 || fz < .08){ r *= .82; g *= .82; b *= .8; h -= .15; }
        else { const sv = .94 + hash2(Math.floor(sx), row)*.12; r *= sv; g *= sv; b *= sv; }
      } else if (t === 5){
        const fx = wx - Math.floor(wx), fz = wz - Math.floor(wz);
        if (fx < .04 || fz < .04){ r *= .88; g *= .88; b *= .86; }
        h = .6;
      } else if (t === 4){
        if (hash2(Math.floor(wx*S)*3+11, Math.floor(wz*S)*5+2) > .965){ r = 205; g = 178; b = 96; }
      } else if (t === 7){
        const ex = (wx - STADIUM.x)/(STADIUM.rx*.72), ez = (wz - STADIUM.z)/(STADIUM.rz*.72);
        if (Math.abs(ex) < 1 && Math.abs(ez) < 1){
          const ln = Math.abs(Math.abs(ex) - .98) < .012 || Math.abs(Math.abs(ez) - .98) < .016 || Math.abs(ex) < .006 || Math.abs(Math.hypot(ex*1.3, ez) - .25) < .012;
          if (ln){ r = 214; g = 208; b = 186; }
        }
      } else if (t === 10 || t === 11){ landColor(wx, wz, tmp); r = tmp[0]; g = tmp[1]; b = tmp[2]; h = tmp[3]; }
      if (t !== 6 && t !== 10){ const ao = occAt(wx, wz); const f = 1 - .3*Math.min(1, ao*1.3); r *= f; g *= f; b *= f; }
      // the fringe melts into the bush: lots and dirt streets take on the colour of the land around them
      if (t !== 6 && t !== 9 && t < 7){ const cd = cityDs(wx, wz), f = 1 - sstep(.04, .36, cd);
        if (f > .01){ landAt(wx, wz); const ff = t === 1 ? f*.5 : t === 5 ? f*.3 : f; r = r*(1-ff) + tmp[0]*ff; g = g*(1-ff) + tmp[1]*ff; b = b*(1-ff) + tmp[2]*ff; h = h*(1-ff) + tmp[3]*ff; } }
      col[p*3] = r; col[p*3+1] = g; col[p*3+2] = b; hgt[p] = h;
    }
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), Dd = img.data;
  for (let py=0; py<N; py++) for (let px=0; px<N; px++){
    const p = py*N + px;
    const hx = hgt[p + (px<N-1?1:0)] - hgt[p - (px>0?1:0)], hz = hgt[p + (py<N-1?N:0)] - hgt[p - (py>0?N:0)];
    let s = 1 + (hx*.9 - hz*.35) * 2.2;
    const r_ = hash2(px*17 + ch.i*991, py*29 + ch.j*577);
    if (r_ < .006) s *= .86; else if (r_ < .012) s *= 1.06;
    Dd[p*4] = c255(col[p*3]*s); Dd[p*4+1] = c255(col[p*3+1]*s); Dd[p*4+2] = c255(col[p*3+2]*s);
    // which photo goes on top: the city, open country, or none (the airport and the pitch)
    const wx = ch.x0 + (px+.5)/S, wz = ch.z0 + (py+.5)/S, [au, av] = airUV(wx, wz), gi = Math.floor(wx), gj = Math.floor(wz);
    let a_;
    if ((au > -300 && au < 340 && av > -292 && av < 16) || (TZONE && au > TZONE.u0 - 6 && au < TZONE.u1 + 6 && av > TZONE.v0 - 8 && av < TZONE.v1 + 6) || (inB(gi, gj) && ground[idx(gi, gj)] === 7)) a_ = 100;
    else { const cd = wx > WB.x0 && wx < WB.x1 && wz > WB.z0 && wz < WB.z1 ? cityDs(wx, wz) : 0; a_ = 255 - Math.round(127*sstep(.04, .32, cd)); }
    Dd[p*4+3] = a_;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(cv); tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.anisotropy = 8;
  return tex;
}
/* scatter per chunk: debris in the city, acacias and scrub outside it */
function dressChunk(ch){
  const city = ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0;
  if (city){
    MAT = M.GEN;
    for (let k=0;k<26;k++){ const i = ch.x0 + ri(CS), j = ch.z0 + ri(CS); if (!inB(i,j) || grid[idx(i,j)] === 1 || grid[idx(i,j)] === 3 || ground[idx(i,j)] === 11) continue;
      const g0 = GHOST; GHOST = stadIn(i + .5, j + .5) || g0; B(i+rnd(), .04, j+rnd(), rr(.08,.3), rr(.04,.12), rr(.08,.25), pick([0x6b5a45,0x3a3a36,0x8a7a62,0xd8d0bc,0x9d9484,0x4d6a5a,0xb4aa98]), { ry:rnd()*3 }); GHOST = g0; }
    // loose bricks (the two uploaded kinds) and stones on the open ground
    for (let k=0;k<9;k++){ const i = ch.x0 + ri(CS), j = ch.z0 + ri(CS); if (!inB(i,j) || grid[idx(i,j)] === 1 || grid[idx(i,j)] === 3 || ground[idx(i,j)] === 11 || reserved[idx(i,j)]) continue;
      const bx = i + rnd(), bz = j + rnd(), h = phs(bx, bz, 24), g0 = GHOST; GHOST = stadIn(bx, bz) || g0;
      if (k < 5) prop('kit3', h < .55 ? 'brick0' : 'brick1', bx, 0, bz, h*31 % 6.283, rr(.9, 1.15), h*7 % 1 < .5 ? 0xffd2b8 : 0xffffff, { rx:h*13 % 1 < .25 ? PH : 0, rz:rr(-.12, .12) });
      else prop('kit3', 'st' + Math.floor(h*12), bx, -.01, bz, h*31 % 6.283, rr(.35, .8), 0xffffff); GHOST = g0; }
    // loose planks and posts (the uploaded pack, all but its dark post): a heap here and there, the odd stray piece. Placed from a hash
    // of the chunk, not from the random stream, so nothing else in the city moves
    for (let k=0;k<5;k++){ const h0 = phs(ch.x0 + k*7.3, ch.z0 - k*3.1, 41); if (h0 < .45) continue;
      const cx = ch.x0 + phs(ch.x0, ch.z0 + k, 42)*CS, cz = ch.z0 + phs(ch.z0 + k, ch.x0, 43)*CS, n = h0 > .8 ? 2 + Math.floor(phs(cx, cz, 44)*4) : 1;
      for (let q=0;q<n;q++){ const h = phs(cx + q*1.7, cz - q*2.3, 45), bx = cx + (n > 1 ? (phs(cz, cx + q, 46) - .5)*2.4 : 0), bz = cz + (n > 1 ? (phs(cx + q, cz, 47) - .5)*2.4 : 0);
        const i = Math.floor(bx), j = Math.floor(bz); if (!inB(i,j) || grid[idx(i,j)] === 1 || grid[idx(i,j)] === 3 || ground[idx(i,j)] === 11 || reserved[idx(i,j)] || stadIn(bx, bz)) continue;
        prop('wood', 'wd' + Math.floor(h*7), bx, .003 + q*.012, bz, h*47 % 6.283, .85 + h*13 % .3, 0xffffff, { rz:(h*29 % 1 - .5)*.12, rx:(h*61 % 1 - .5)*.08 }); } }
    for (let k=0;k<7;k++){ const h0 = phs(ch.x0 - k*5.7, ch.z0 + k*4.9, 71); if (h0 < .3) continue;
      const cx = ch.x0 + phs(ch.x0 + k*2.1, ch.z0, 72)*CS, cz = ch.z0 + phs(ch.z0, ch.x0 - k*1.3, 73)*CS, i0 = Math.floor(cx), j0 = Math.floor(cz);
      if (!inB(i0,j0) || grid[idx(i0,j0)] !== 0 || ground[idx(i0,j0)] === 11 || reserved[idx(i0,j0)] || stadIn(cx, cz) || (MIS && MIS.laneFree && MIS.laneFree(i0, j0))) continue;
      // next to a wall if there is one, so the heaps sit against the houses
      let wx = 0, wz = 0; for (const [a, b] of [[1,0],[-1,0],[0,1],[0,-1]]) if (inB(i0+a, j0+b) && grid[idx(i0+a, j0+b)] === 1){ wx = a; wz = b; break; }
      const ry0 = wx || wz ? Math.atan2(wx, wz) : h0*31 % 6.283, bx0 = i0 + .5 + wx*.22, bz0 = j0 + .5 + wz*.22;
      const kind = phs(cx, cz, 74);
      if (kind < .1){ prop('deco9', 'ibc', bx0, 0, bz0, ry0, .95, 0xffffff); continue; }
      const n = kind < .45 ? 1 : 2 + Math.floor(phs(cz, cx, 75)*3);
      for (let q=0;q<n;q++){ const h = phs(cx + q*2.3, cz - q*1.9, 76), ox = q ? (phs(cz + q, cx, 77) - .5)*1.3 : 0, oz = q ? (phs(cx, cz + q, 78) - .5)*1.3 : 0;
        const bx = bx0 + ox - wx*Math.abs(ox)*.3, bz = bz0 + oz - wz*Math.abs(oz)*.3, i = Math.floor(bx), j = Math.floor(bz); if (!inB(i,j) || grid[idx(i,j)] === 1 || grid[idx(i,j)] === 3) continue;
        const pt = q === 0 && kind < .7 ? (h < .7 ? 'can' : 'canlay') : ['tbag', 'tbag', 'tbox', 'litter', 'litter', 'canlay'][Math.floor(h*6)];
        prop('deco9', pt, bx, 0, bz, pt === 'can' ? ry0 + (h - .5)*.6 : h*41 % 6.283, pt === 'litter' ? .9 + h*.4 : .78 + h*.12, 0xffffff); } }
    for (let k=0;k<4;k++){ const i = ch.x0 + ri(CS), j = ch.z0 + ri(CS); if (!inB(i,j) || grid[idx(i,j)] !== 0 || ground[idx(i,j)] === 11 || reserved[idx(i,j)]) continue;
      const bx = i+rnd(), bz = j+rnd(), sx = rr(.15,.35), sy = rr(.08,.2), sz = rr(.15,.35), c = pick([0x9a9468,0xa8a072,0x8e8660]);
      if (!stadIn(bx, bz)) prop('bags', 'bag', bx, 0, bz, phs(bx, bz, 11)*6.283, .8 + sx, { 0x9a9468:0xc8b890, 0xa8a072:0xd2c29a, 0x8e8660:0xbcae86 }[c], { sy:1.5, rz:.1 }); }
  }
  // countryside: acacias, scrub, rocks, away from water, roads, the airfield and village cores; inside the grid only on the empty fringe
  const nT = 16;
  for (let k=0;k<nT;k++){
    const x = ch.x0 + rnd()*CS, z = ch.z0 + rnd()*CS;
    if (x >= -1 && z >= -1 && x < W+1 && z < H+1){ const i = Math.floor(x), j = Math.floor(z);
      if (!inB(i,j) || grid[idx(i,j)] !== 0 || STR[idx(i,j)] || reserved[idx(i,j)] || ground[idx(i,j)]) continue;
      if (rnd() > 1 - sstep(.08, .3, cityDs(x, z))) continue; }
    const s = coastS(x, z); if (s > -28) continue;
    const [u, v] = airUV(x, z); if (u > BASE.u0 - 12 && u < BASE.u1 + 40 && v > BASE.v0 - 12 && v < 30) continue;
    if (TZONE && u > TZONE.u0 - 10 && u < TZONE.u1 + 10 && v > TZONE.v0 - 12 && v < TZONE.v1 + 8) continue;
    if (TZONE && roadDist(x, z, TZTRACK)[0] < 4) continue;
    if (roadDist(x, z, ROADSEG)[0] < 4) continue;
    if (VILLAGES.some(vl => Math.hypot(x - vl.x, z - vl.z) < vl.r*.6)) continue;
    const r = rnd();
    if (r < .22) acacia(x, z, rr(.8,1.3));
    else if (r < .82) shrub(x, z);
    else { MAT = M.STONE; const sx = rr(.3,.8), sy = rr(.2,.4), sz = rr(.3,.7), c = pick([0x9a8a70,0xa89878,0x8a7a62]), ry = rnd()*3; B(x, .12, z, sx, sy, sz, c, { ry, hid:1 });
      const h = phs(x, z, 8), rk = 'r' + Math.floor(h*8); prop('rocks', rk, x, 0, z, ry, (sx + sz)/(rk === 'r4' ? 1.25 : .9), [0xe8d8c0, 0xf0e0c4, 0xd8c8b0][Math.floor(h*24) % 3]);
      if (h > .5) prop('rocks', 'r' + Math.floor(phs(z, x, 9)*8), x + (h - .75)*1.6, 0, z + (phs(z, x, 9) - .5)*1.4, ry*2, .45 + h*.3, 0xe8d8c0); }
    // a few loose stones (the uploaded set) around each spot in the open country
    for (let q=0;q<3;q++){ const h = phs(x + q, z, 25); if (h < .45) continue; prop('kit3', 'st' + Math.floor(h*41 % 12), x + (phs(x, z + q, 26) - .5)*5, -.01, z + (phs(z, x + q, 27) - .5)*5, h*17 % 6.283, rr(.3, .75), 0xffffff); }
  }
  // scattered compounds beyond the street grid, as thick as the density field says
  if (!city || ch.x0 < 0 || ch.z0 < 0 || ch.x0 + CS > W || ch.z0 + CS > H){
    const placed = [];
    for (let k=0;k<7;k++){
      const x = ch.x0 + 3 + rnd()*(CS-6), z = ch.z0 + 3 + rnd()*(CS-6);
      if (placed.some(p => Math.hypot(p[0]-x, p[1]-z) < 10)) continue;
      if (x >= -6 && z >= -6 && x < W+6 && z < H+6) continue;
      const cd = cityDs(x, z); if (rnd() > cd*2.4) continue;
      if (coastS(x, z) > -28 || roadDist(x, z, ROADSEG)[0] < 7) continue;
      const [u, v] = airUV(x, z); if (u > BASE.u0 - 20 && u < BASE.u1 + 45 && v > BASE.v0 - 20 && v < 30) continue;
      placed.push([x, z]); smallHouse(x, z, { rot:true });
    }
  }
}
function acacia(x, z, s){
  MAT = M.WOOD;
  C(x, 1.1*s, z, .13*s, 2.2*s, 0x4a3a2a, { hid:1 });
  const cl = pick([0x5a6a34, 0x667438, 0x4e5e30, 0x707a40]);
  LEAF_OFF = true; leafCanopy(x, 2.42*s, z, 1.85*s, .26*s, 1.55*s, cl, 70); leafCanopy(x+.3*s, 2.7*s, z-.2*s, 1.2*s, .22*s, 1.1*s, shade(cl,1.12), 34); LEAF_OFF = false;
  treeAt(x, z, 3.3*s, false);
}
/* ---------- the trees (the uploaded collection; the palms stay as they are): four models, bark and leaf cards in one texture, swaying
   on the GPU like the palms (the trunk bends, the crown moves more toward its edge, a rotor overhead thrashes it) ---------- */
const TREE_META = [{"c": [-0.02, 2.33, 0.28], "R": 2.17, "h": 4.4, "f": 2.07, "cards": 231, "of": 1760}, {"c": [-0.13, 2.06, 0.07], "R": 1.83, "h": 4.0, "f": 3.2, "cards": 199, "of": 16384}, {"c": [-0.11, 1.81, -0.14], "R": 1.35, "h": 3.2, "f": 3.2, "cards": 118, "of": 2728}, {"c": [0.07, 1.7, 0.08], "R": 1.45, "h": 3.0, "f": 2.64, "cards": 145, "of": 1800}];
const TREES = [];
let TREE_GEO = null, TREE_MAT = null, TREE_DEP = null, treeWait = [];
function treeReady(fn){ if (TREE_GEO) fn(); else treeWait.push(fn); }
function treeAt(x, z, h, small){
  if (PLANNING){ lazyAdd(x, z, () => treeAt(x, z, h, small)); return; }
  if (onRoad(x, z)) return;
  const a = phs(x, z, 21), v = small ? 2 + Math.floor(a*2) : Math.floor(a*4);
  const e = { x, z, v, s:h/TREE_META[v].h*(.92 + phs(x, z, 22)*.16), ry:phs(x, z, 23)*6.283, c:.88 + phs(x, z, 24)*.18 };
  const L_ = CUR || chunkFor(x, z);
  if (CUR || !L_.gen) L_.TR.push(e); else treeReady(() => { if (L_.group) treeMesh([e], v, L_.group); });
}
function treeInit(){ withModel('trees', M_ => {
  TREE_GEO = [0, 1, 2, 3].map(v => {
    const P_ = TREE_META[v], parts = [M_.geos['t' + v + '_trunk'], M_.geos['t' + v + '_leaves']];
    let nv = 0, ni = 0; for (const q of parts){ nv += q.attributes.position.count; ni += q.index.count; }
    const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), uv = new Float32Array(nv*2), ap = new Float32Array(nv*2), idx_ = new Uint32Array(ni);
    let o = 0, oi = 0;
    parts.forEach((q, pi) => {
      const pa = q.attributes.position, na = q.attributes.normal, ua = q.attributes.uv, ia = q.index.array;
      for (let i=0;i<pa.count;i++){
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), k = o + i;
        pos[k*3] = x; pos[k*3+1] = y; pos[k*3+2] = z;
        nor[k*3] = na.getX(i)/127; nor[k*3+1] = na.getY(i)/127; nor[k*3+2] = na.getZ(i)/127;
        uv[k*2] = ua.getX(i)/65535; uv[k*2+1] = ua.getY(i)/65535;
        ap[k*2] = Math.min(1.2, Math.pow(Math.max(0, y)/P_.h, 2))*.55;
        ap[k*2+1] = pi ? .45*Math.pow(Math.min(1, Math.hypot(x - P_.c[0], y - P_.c[1], z - P_.c[2])/P_.R), 1.5) : 0;
      }
      for (let i=0;i<ia.length;i++) idx_[oi + i] = ia[i] + o;
      o += pa.count; oi += ia.length;
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('aPalm', new T.BufferAttribute(ap, 2)); geo.setIndex(new T.BufferAttribute(idx_, 1));
    geo.computeBoundingSphere(); return geo;
  });
  const map = M_.mat.map;
  TREE_MAT = new T.MeshLambertMaterial({ map, alphaTest:.5, side:T.DoubleSide });
  TREE_MAT.onBeforeCompile = sh => palmShader(sh, true); TREE_MAT.customProgramCacheKey = () => 'treeL';
  TREE_DEP = new T.MeshDepthMaterial({ depthPacking:T.RGBADepthPacking, map, alphaTest:.5, side:T.DoubleSide });
  TREE_DEP.onBeforeCompile = sh => palmShader(sh, false); TREE_DEP.customProgramCacheKey = () => 'treeD';
  const w = treeWait; treeWait = []; for (const f of w) f();
}); }
function treeMesh(L_, v, parent){
  const m = new T.InstancedMesh(TREE_GEO[v], TREE_MAT, L_.length);
  m.castShadow = true; m.receiveShadow = true; m.customDepthMaterial = TREE_DEP; m.frustumCulled = false;
  L_.forEach((e, k) => { dummy.position.set(e.x, 0, e.z); dummy.rotation.set(0, e.ry, 0); dummy.scale.setScalar(e.s); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix);
    m.setColorAt(k, tmpCol.setRGB(e.c, e.c*.98, e.c*.93)); });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  parent.add(m); TREES.push(m); return m;
}
function buildTrees(ch){
  if (!ch.TR.length) return;
  treeReady(() => { if (!ch.group) return; for (let v=0;v<4;v++){ const L_ = ch.TR.filter(e => e.v === v); if (L_.length) treeMesh(L_, v, ch.group); } });
}
/* ---------- foliage: canopies are clouds of small pointed leaf cards, merged per chunk into one mesh ---------- */
const LEAF_MAT = new T.MeshLambertMaterial({ vertexColors:true, side:T.DoubleSide });
const _lc = new T.Color();
let LEAF_OFF = false;   // set while a canopy is drawn only for the random sequence (the tree is a model now)
function leafCanopy(x, y, z, rx, ry, rz, col, n){
  const L = LEAF_OFF ? [] : (CUR || chunkFor(x, z)).LF; _lc.setHex(col);
  const sz = clamp((rx + rz)*.16, .2, .42);
  for (let k=0;k<n;k++){
    let px, py, pz; do { px = rr(-1,1); py = rr(-1,1); pz = rr(-1,1); } while (px*px + py*py + pz*pz > 1);
    const top = py*.5 + .5, f = .66 + .44*top + rr(-.08,.08), yel = rnd() < .12 ? .1 : 0;
    L.push(x + px*rx, y + py*ry, z + pz*rz, sz*rr(.75,1.25), rnd()*6.283, rr(-.55,.55) + (1 - top)*.3, _lc.r*f + yel, _lc.g*f + yel*.8, _lc.b*f);
  }
}
function buildLeaves(ch){
  const L = ch.LF, n = L.length/9; if (!n) return;
  const P = new Float32Array(n*12), N = new Float32Array(n*12), Cc = new Float32Array(n*12), I = new Uint32Array(n*6);
  for (let k=0;k<n;k++){
    const o = k*9, x = L[o], y = L[o+1], z = L[o+2], s = L[o+3], a = L[o+4], t = L[o+5];
    const ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(t), st = Math.sin(t);
    const ax = ca*s, az = -sa*s, bx = sa*s*.42*ct, by = st*s*.42, bz = ca*s*.42*ct;
    const V = [[x-ax, y, z-az], [x+bx, y+by, z+bz], [x+ax, y, z+az], [x-bx, y-by, z-bz]];
    const nx = -st*sa*.4, ny = ct + .6, nz = -st*ca*.4, nl = Math.hypot(nx, ny, nz);
    for (let v=0;v<4;v++){ const q = (k*4+v)*3; P[q] = V[v][0]; P[q+1] = V[v][1]; P[q+2] = V[v][2]; N[q] = nx/nl; N[q+1] = ny/nl; N[q+2] = nz/nl;
      const sh = v === 1 ? 1.08 : v === 3 ? .86 : 1; Cc[q] = L[o+6]*sh; Cc[q+1] = L[o+7]*sh; Cc[q+2] = L[o+8]*sh; }
    I.set([k*4, k*4+1, k*4+2, k*4, k*4+2, k*4+3], k*6);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); g.setAttribute('color', new T.BufferAttribute(Cc, 3)); g.setIndex(new T.BufferAttribute(I, 1));
  const m = new T.Mesh(g, LEAF_MAT); m.castShadow = true; m.receiveShadow = true; ch.group.add(m); ch.leaf = m;
}
const VEG_MAT = new T.MeshLambertMaterial({ vertexColors:true, side:T.DoubleSide });
VEG_MAT.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, LAUN_U);
  sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec4 uHeli[3]; attribute vec4 aVeg;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec2 rb = aVeg.xy; float hk = aVeg.z, stiff = aVeg.w;
    vec2 wd = vec2(.92, .39);
    float gust = .5 + .5*sin(uTime*1.25 - dot(rb, wd)*.42 + sin(rb.y*.11)*2.0);
    vec2 off = wd*uWind*(.07 + .2*gust*gust) + vec2(wd.y, -wd.x)*uWind*.035*sin(uTime*3.7 + rb.x*2.9 + rb.y*1.7);
    off += wd*uWind*.05*sin(uTime*6.3 + rb.x*5.1 + rb.y*3.3 + hk*2.0)*hk;
    for (int k=0;k<3;k++){ vec2 d = rb - uHeli[k].xz; float r = length(d) + .001;
      float w = uHeli[k].w*(1.0 - smoothstep(3.0, 18.0, r))*(1.0 - smoothstep(9.0, 32.0, uHeli[k].y));
      off += d/r*w*(.95 + .45*sin(uTime*19.0 + r*2.3 + rb.x*4.0) + .3*sin(uTime*31.0 + rb.y*6.0)); }
    float L = length(off), a = min(L, 1.25)*stiff*(.35 + .65*hk);
    vec2 dir = off/(L + 1e-4); float hy = transformed.y;
    transformed.xz += dir*hy*sin(a); transformed.y = hy*cos(a);`);
  // both faces of a blade take the light of its front, so the far side of a tuft is not black
  sh.fragmentShader = sh.fragmentShader.replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront').replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront');
};
const VEG_DRY = [0xc9b25c, 0xb89c4c, 0xa89048, 0xd4bc6a, 0x9c9446, 0x8f8c44, 0xb6a258], VEG_LUSH = [0x7a8a3a, 0x6c7c34, 0x889646, 0x94943e, 0x7e8c40];
const VEG_TWIG = [0x5a4a38, 0x665440, 0x4e4234, 0x705e48, 0x7a6a56], VEG_LEAF = [0x7e7c40, 0x6c6c36, 0x8c8448, 0x9a8e50, 0x60683a, 0x8e8c58];
const _vc = new T.Color();
function vegTri(V, ax, ay, az, bx, by, bz, cx, cy, cz, rx, rz, ha, hb, hc, st, col, ka, kc, nx, nz){
  const o = V.P.length/3; V.P.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  for (let q=0;q<3;q++) V.N.push(nx, 1, nz);
  _vc.setHex(col); V.C.push(_vc.r*ka, _vc.g*ka, _vc.b*ka, _vc.r*ka, _vc.g*ka, _vc.b*ka, _vc.r*kc, _vc.g*kc, _vc.b*kc);
  V.A.push(rx, rz, ha, st, rx, rz, hb, st, rx, rz, hc, st); V.I.push(o, o + 1, o + 2);
}
// a tuft of grass: one of the uploaded grass clumps (pale texture), turned and scaled, tinted dry or green, darker at the foot
const GRASS_TUFTS = [[-0.014,0.772,0.262,0.574,0.609,-0.165,0.416,0.057,0.497,0.779,-0.174,0.461,0.253,0.584,0.757,-0.022,0.788,0.045,0.479,0.607,0.092,0.815,-0.239,0.342,0.59,-0.165,0.416,0.057,0.497,0.779,0.175,1.0,0.06,0.467,0.499,0.185,0.958,-0.152,0.373,0.52,-0.022,0.788,0.045,0.479,0.607,0.092,0.907,0.273,0.569,0.543,-0.022,0.788,0.045,0.479,0.607,-0.014,0.772,0.262,0.574,0.609,0.175,1.0,0.06,0.467,0.499,-0.022,0.788,0.045,0.479,0.607,0.092,0.907,0.273,0.569,0.543,0.092,0.815,-0.239,0.342,0.59,-0.022,0.788,0.045,0.479,0.607,0.185,0.958,-0.152,0.373,0.52,-0.022,0.788,0.045,0.479,0.607,-0.165,0.416,0.057,0.497,0.779,-0.014,0.772,0.262,0.574,0.609,-0.047,0.429,-0.273,0.336,0.776,-0.165,0.416,0.057,0.497,0.779,0.092,0.815,-0.239,0.342,0.59,-0.185,0.0,0.009,0.468,0.954,-0.047,0.429,-0.273,0.336,0.776,-0.108,0.059,-0.127,0.388,0.934,-0.174,0.085,0.217,0.568,0.926,-0.174,0.461,0.253,0.584,0.757,-0.185,0.0,0.009,0.468,0.954,-0.165,0.416,0.057,0.497,0.779,-0.185,0.0,0.009,0.468,0.954,-0.174,0.461,0.253,0.584,0.757,-0.165,0.416,0.057,0.497,0.779,-0.047,0.429,-0.273,0.336,0.776,-0.185,0.0,0.009,0.468,0.954],[0.167,0.905,-0.046,0.145,0.483,-0.044,0.609,-0.03,0.19,0.652,0.102,1.0,0.106,0.219,0.436,-0.001,0.427,-0.219,0.089,0.748,-0.095,0.415,-0.076,0.176,0.757,0.053,0.591,-0.197,0.091,0.658,-0.022,0.169,-0.231,0.087,0.883,-0.112,0.151,-0.12,0.158,0.896,-0.001,0.427,-0.219,0.089,0.748,-0.164,0.379,0.21,0.329,0.773,-0.112,0.151,-0.12,0.158,0.896,-0.167,0.107,0.092,0.272,0.917,-0.152,0.501,0.231,0.338,0.708,-0.095,0.415,-0.076,0.176,0.757,-0.164,0.379,0.21,0.329,0.773,-0.044,0.609,-0.03,0.19,0.652,-0.095,0.415,-0.076,0.176,0.757,-0.152,0.501,0.231,0.338,0.708,-0.077,0.659,0.195,0.307,0.622,-0.044,0.609,-0.03,0.19,0.652,-0.152,0.501,0.231,0.338,0.708,0.102,1.0,0.106,0.219,0.436,-0.044,0.609,-0.03,0.19,0.652,-0.077,0.659,0.195,0.307,0.622,-0.044,0.609,-0.03,0.19,0.652,0.053,0.591,-0.197,0.091,0.658,-0.095,0.415,-0.076,0.176,0.757,-0.095,0.415,-0.076,0.176,0.757,-0.001,0.427,-0.219,0.089,0.748,-0.112,0.151,-0.12,0.158,0.896,-0.112,0.151,-0.12,0.158,0.896,-0.109,0.035,-0.102,0.167,0.957,-0.167,0.107,0.092,0.272,0.917,0.053,0.591,-0.197,0.091,0.658,-0.044,0.609,-0.03,0.19,0.652,0.167,0.905,-0.046,0.145,0.483,-0.112,0.151,-0.12,0.158,0.896,-0.022,0.169,-0.231,0.087,0.883,-0.109,0.035,-0.102,0.167,0.957,-0.009,0.029,-0.229,0.086,0.954,-0.109,0.035,-0.102,0.167,0.957,-0.022,0.169,-0.231,0.087,0.883,-0.105,0.0,0.022,0.226,0.97,-0.167,0.107,0.092,0.272,0.917,-0.109,0.035,-0.102,0.167,0.957,-0.095,0.415,-0.076,0.176,0.757,-0.112,0.151,-0.12,0.158,0.896,-0.164,0.379,0.21,0.329,0.773],[0.254,0.978,-0.176,0.31,0.038,-0.013,0.614,-0.046,0.28,0.157,0.159,0.914,-0.538,0.423,0.059,0.055,0.586,0.599,0.083,0.165,-0.013,0.614,-0.046,0.28,0.157,0.201,0.923,0.455,0.121,0.058,-0.013,0.614,-0.046,0.28,0.157,0.055,0.586,0.599,0.083,0.165,-0.106,0.34,0.034,0.258,0.243,-0.06,0.0,0.119,0.241,0.344,-0.252,0.087,-0.367,0.385,0.322,-0.106,0.34,0.034,0.258,0.243,-0.06,0.0,0.119,0.241,0.344,-0.106,0.34,0.034,0.258,0.243,0.001,0.16,0.52,0.108,0.295,-0.254,0.035,-0.336,0.375,0.338,-0.252,0.087,-0.367,0.385,0.322,-0.06,0.0,0.119,0.241,0.344,-0.013,0.614,-0.046,0.28,0.157,-0.106,0.34,0.034,0.258,0.243,-0.004,0.555,-0.431,0.396,0.173,0.245,1.0,0.099,0.227,0.032,-0.013,0.614,-0.046,0.28,0.157,0.254,0.978,-0.176,0.31,0.038,0.201,0.923,0.455,0.121,0.058,-0.013,0.614,-0.046,0.28,0.157,0.245,1.0,0.099,0.227,0.032,0.159,0.914,-0.538,0.423,0.059,-0.013,0.614,-0.046,0.28,0.157,0.131,0.874,-0.599,0.442,0.071,0.131,0.874,-0.599,0.442,0.071,-0.013,0.614,-0.046,0.28,0.157,-0.004,0.555,-0.431,0.396,0.173,-0.004,0.555,-0.431,0.396,0.173,-0.106,0.34,0.034,0.258,0.243,-0.08,0.313,-0.307,0.361,0.249,-0.08,0.313,-0.307,0.361,0.249,-0.106,0.34,0.034,0.258,0.243,-0.252,0.087,-0.367,0.385,0.322,0.001,0.16,0.52,0.108,0.295,-0.106,0.34,0.034,0.258,0.243,0.055,0.586,0.599,0.083,0.165],[-0.255,0.772,0.024,0.574,0.609,-0.074,0.416,-0.155,0.497,0.779,-0.27,0.461,-0.135,0.584,0.757,-0.042,0.788,-0.015,0.479,0.607,0.257,0.815,0.055,0.342,0.59,-0.074,0.416,-0.155,0.497,0.779,-0.027,1.0,0.182,0.467,0.499,0.184,0.958,0.16,0.373,0.52,-0.042,0.788,-0.015,0.479,0.607,-0.25,0.907,0.132,0.569,0.543,-0.042,0.788,-0.015,0.479,0.607,-0.255,0.772,0.024,0.574,0.609,-0.027,1.0,0.182,0.467,0.499,-0.042,0.788,-0.015,0.479,0.607,-0.25,0.907,0.132,0.569,0.543,0.257,0.815,0.055,0.342,0.59,-0.042,0.788,-0.015,0.479,0.607,0.184,0.958,0.16,0.373,0.52,-0.042,0.788,-0.015,0.479,0.607,-0.074,0.416,-0.155,0.497,0.779,-0.255,0.772,0.024,0.574,0.609,0.27,0.429,-0.087,0.336,0.776,-0.074,0.416,-0.155,0.497,0.779,0.257,0.815,0.055,0.342,0.59,-0.031,0.0,-0.182,0.468,0.954,0.27,0.429,-0.087,0.336,0.776,0.116,0.059,-0.126,0.388,0.934,-0.234,0.085,-0.14,0.568,0.926,-0.27,0.461,-0.135,0.584,0.757,-0.031,0.0,-0.182,0.468,0.954,-0.074,0.416,-0.155,0.497,0.779,-0.031,0.0,-0.182,0.468,0.954,-0.27,0.461,-0.135,0.584,0.757,-0.074,0.416,-0.155,0.497,0.779,0.27,0.429,-0.087,0.336,0.776,-0.031,0.0,-0.182,0.468,0.954],[0.201,0.823,-0.035,0.695,0.435,0.289,0.614,0.046,0.712,0.545,0.013,0.99,0.079,0.785,0.346,0.289,0.614,0.046,0.712,0.545,0.201,0.823,-0.035,0.695,0.435,0.369,0.548,-0.134,0.616,0.577,0.289,0.614,0.046,0.712,0.545,0.369,0.548,-0.134,0.616,0.577,0.342,0.207,0.143,0.744,0.749,0.342,0.207,0.143,0.744,0.749,0.32,0.0,0.168,0.76,0.848,0.241,0.217,0.255,0.815,0.741,0.342,0.207,0.143,0.744,0.749,0.356,0.178,-0.03,0.665,0.759,0.32,0.0,0.168,0.76,0.848,0.241,0.217,0.255,0.815,0.741,0.32,0.0,0.168,0.76,0.848,0.134,0.16,0.336,0.882,0.763,0.088,0.078,0.344,0.886,0.801,0.134,0.16,0.336,0.882,0.763,0.32,0.0,0.168,0.76,0.848,0.358,0.03,0.015,0.684,0.832,0.32,0.0,0.168,0.76,0.848,0.356,0.178,-0.03,0.665,0.759,0.342,0.207,0.143,0.744,0.749,0.241,0.217,0.255,0.815,0.741,0.289,0.614,0.046,0.712,0.545,0.356,0.178,-0.03,0.665,0.759,0.342,0.207,0.143,0.744,0.749,0.369,0.548,-0.134,0.616,0.577,-0.198,0.75,0.474,0.983,0.465,0.289,0.614,0.046,0.712,0.545,0.241,0.217,0.255,0.815,0.741,0.297,0.815,-0.474,0.481,0.432,0.335,0.685,-0.266,0.564,0.504,0.173,0.981,-0.275,0.594,0.349,0.173,0.981,-0.275,0.594,0.349,0.335,0.685,-0.266,0.564,0.504,0.201,0.823,-0.035,0.695,0.435,0.369,0.548,-0.134,0.616,0.577,0.201,0.823,-0.035,0.695,0.435,0.335,0.685,-0.266,0.564,0.504,0.013,0.99,0.079,0.785,0.346,0.289,0.614,0.046,0.712,0.545,-0.369,1.0,0.367,0.964,0.333,-0.369,1.0,0.367,0.964,0.333,0.289,0.614,0.046,0.712,0.545,-0.198,0.75,0.474,0.983,0.465],[0.238,0.978,0.039,0.31,0.038,-0.043,0.614,-0.055,0.28,0.157,0.424,0.914,-0.286,0.423,0.059,-0.447,0.586,0.452,0.083,0.165,-0.043,0.614,-0.055,0.28,0.157,-0.241,0.923,0.452,0.121,0.058,-0.043,0.614,-0.055,0.28,0.157,-0.447,0.586,0.452,0.083,0.165,-0.166,0.34,-0.064,0.258,0.243,-0.193,0.0,0.029,0.241,0.344,0.011,0.087,-0.452,0.385,0.322,-0.166,0.34,-0.064,0.258,0.243,-0.193,0.0,0.029,0.241,0.344,-0.166,0.34,-0.064,0.258,0.243,-0.431,0.16,0.358,0.108,0.295,-0.012,0.035,-0.432,0.375,0.338,0.011,0.087,-0.452,0.385,0.322,-0.193,0.0,0.029,0.241,0.344,-0.043,0.614,-0.055,0.28,0.157,-0.166,0.34,-0.064,0.258,0.243,0.233,0.555,-0.324,0.396,0.173,0.039,1.0,0.229,0.227,0.032,-0.043,0.614,-0.055,0.28,0.157,0.238,0.978,0.039,0.31,0.038,-0.241,0.923,0.452,0.121,0.058,-0.043,0.614,-0.055,0.28,0.157,0.039,1.0,0.229,0.227,0.032,0.424,0.914,-0.286,0.423,0.059,-0.043,0.614,-0.055,0.28,0.157,0.447,0.874,-0.349,0.442,0.071,0.447,0.874,-0.349,0.442,0.071,-0.043,0.614,-0.055,0.28,0.157,0.233,0.555,-0.324,0.396,0.173,0.233,0.555,-0.324,0.396,0.173,-0.166,0.34,-0.064,0.258,0.243,0.092,0.313,-0.289,0.361,0.249,0.092,0.313,-0.289,0.361,0.249,-0.166,0.34,-0.064,0.258,0.243,0.011,0.087,-0.452,0.385,0.322,-0.431,0.16,0.358,0.108,0.295,-0.166,0.34,-0.064,0.258,0.243,-0.447,0.586,0.452,0.083,0.165],[0.206,0.978,-0.214,0.31,0.038,-0.013,0.614,-0.014,0.28,0.157,0.012,0.914,-0.534,0.423,0.059,0.234,0.586,0.585,0.083,0.165,-0.013,0.614,-0.014,0.28,0.157,0.334,0.923,0.405,0.121,0.058,-0.013,0.614,-0.014,0.28,0.157,0.234,0.586,0.585,0.083,0.165,-0.081,0.34,0.089,0.258,0.243,-0.012,0.0,0.157,0.241,0.344,-0.334,0.087,-0.254,0.385,0.322,-0.081,0.34,0.089,0.258,0.243,-0.012,0.0,0.157,0.241,0.344,-0.081,0.34,0.089,0.258,0.243,0.16,0.16,0.525,0.108,0.295,-0.327,0.035,-0.224,0.375,0.338,-0.334,0.087,-0.254,0.385,0.322,-0.012,0.0,0.157,0.241,0.344,-0.013,0.614,-0.014,0.28,0.157,-0.081,0.34,0.089,0.258,0.243,-0.114,0.555,-0.386,0.396,0.173,0.275,1.0,0.052,0.227,0.032,-0.013,0.614,-0.014,0.28,0.157,0.206,0.978,-0.214,0.31,0.038,0.334,0.923,0.405,0.121,0.058,-0.013,0.614,-0.014,0.28,0.157,0.275,1.0,0.052,0.227,0.032,0.012,0.914,-0.534,0.423,0.059,-0.013,0.614,-0.014,0.28,0.157,-0.032,0.874,-0.585,0.442,0.071,-0.032,0.874,-0.585,0.442,0.071,-0.013,0.614,-0.014,0.28,0.157,-0.114,0.555,-0.386,0.396,0.173,-0.114,0.555,-0.386,0.396,0.173,-0.081,0.34,0.089,0.258,0.243,-0.152,0.313,-0.246,0.361,0.249,-0.152,0.313,-0.246,0.361,0.249,-0.081,0.34,0.089,0.258,0.243,-0.334,0.087,-0.254,0.385,0.322,0.16,0.16,0.525,0.108,0.295,-0.081,0.34,0.089,0.258,0.243,0.234,0.586,0.585,0.083,0.165],[-0.233,0.978,0.033,0.31,0.038,0.06,0.614,0.082,0.28,0.157,-0.366,0.914,0.382,0.423,0.059,0.379,0.586,-0.482,0.083,0.165,0.06,0.614,0.082,0.28,0.157,0.176,0.923,-0.45,0.121,0.058,0.06,0.614,0.082,0.28,0.157,0.379,0.586,-0.482,0.083,0.165,0.182,0.34,0.072,0.258,0.243,0.194,0.0,-0.025,0.241,0.344,0.068,0.087,0.482,0.385,0.322,0.182,0.34,0.072,0.258,0.243,0.194,0.0,-0.025,0.241,0.344,0.182,0.34,0.072,0.258,0.243,0.377,0.16,-0.387,0.108,0.295,0.087,0.035,0.459,0.375,0.338,0.068,0.087,0.482,0.385,0.322,0.194,0.0,-0.025,0.241,0.344,0.06,0.614,0.082,0.28,0.157,0.182,0.34,0.072,0.258,0.243,-0.171,0.555,0.39,0.396,0.173,-0.066,1.0,-0.186,0.227,0.032,0.06,0.614,0.082,0.28,0.157,-0.233,0.978,0.033,0.31,0.038,0.176,0.923,-0.45,0.121,0.058,0.06,0.614,0.082,0.28,0.157,-0.066,1.0,-0.186,0.227,0.032,-0.366,0.914,0.382,0.423,0.059,0.06,0.614,0.082,0.28,0.157,-0.379,0.874,0.448,0.442,0.071,-0.379,0.874,0.448,0.442,0.071,0.06,0.614,0.082,0.28,0.157,-0.171,0.555,0.39,0.396,0.173,-0.171,0.555,0.39,0.396,0.173,0.182,0.34,0.072,0.258,0.243,-0.038,0.313,0.334,0.361,0.249,-0.038,0.313,0.334,0.361,0.249,0.182,0.34,0.072,0.258,0.243,0.068,0.087,0.482,0.385,0.322,0.377,0.16,-0.387,0.108,0.295,0.182,0.34,0.072,0.258,0.243,0.379,0.586,-0.482,0.083,0.165],[0.167,0.823,0.012,0.695,0.435,0.18,0.614,0.13,0.712,0.545,-0.049,0.99,-0.026,0.785,0.346,0.18,0.614,0.13,0.712,0.545,0.167,0.823,0.012,0.695,0.435,0.358,0.548,0.048,0.616,0.577,0.18,0.614,0.13,0.712,0.545,0.358,0.548,0.048,0.616,0.577,0.156,0.207,0.239,0.744,0.749,0.156,0.207,0.239,0.744,0.749,0.123,0.0,0.243,0.76,0.848,0.007,0.217,0.257,0.815,0.741,0.156,0.207,0.239,0.744,0.749,0.281,0.178,0.118,0.665,0.759,0.123,0.0,0.243,0.76,0.848,0.007,0.217,0.257,0.815,0.741,0.123,0.0,0.243,0.76,0.848,-0.128,0.16,0.248,0.882,0.763,-0.167,0.078,0.224,0.886,0.801,-0.128,0.16,0.248,0.882,0.763,0.123,0.0,0.243,0.76,0.848,0.252,0.03,0.153,0.684,0.832,0.123,0.0,0.243,0.76,0.848,0.281,0.178,0.118,0.665,0.759,0.156,0.207,0.239,0.744,0.749,0.007,0.217,0.257,0.815,0.741,0.18,0.614,0.13,0.712,0.545,0.281,0.178,0.118,0.665,0.759,0.156,0.207,0.239,0.744,0.749,0.358,0.548,0.048,0.616,0.577,-0.468,0.75,0.134,0.983,0.465,0.18,0.614,0.13,0.712,0.545,0.007,0.217,0.257,0.815,0.741,0.527,0.815,-0.257,0.481,0.432,0.42,0.685,-0.075,0.564,0.504,0.304,0.981,-0.188,0.594,0.349,0.304,0.981,-0.188,0.594,0.349,0.42,0.685,-0.075,0.564,0.504,0.167,0.823,0.012,0.695,0.435,0.358,0.548,0.048,0.616,0.577,0.167,0.823,0.012,0.695,0.435,0.42,0.685,-0.075,0.564,0.504,-0.049,0.99,-0.026,0.785,0.346,0.18,0.614,0.13,0.712,0.545,-0.527,1.0,-0.059,0.964,0.333,-0.527,1.0,-0.059,0.964,0.333,0.18,0.614,0.13,0.712,0.545,-0.468,0.75,0.134,0.983,0.465],[-0.043,0.0,0.268,0.537,0.34,-0.135,0.327,0.148,0.585,0.237,0.217,0.081,0.474,0.433,0.31,0.22,0.298,0.472,0.433,0.242,-0.135,0.327,0.148,0.585,0.237,0.309,0.525,0.398,0.433,0.163,-0.05,0.577,0.12,0.575,0.153,-0.135,0.327,0.148,0.585,0.237,-0.246,0.671,-0.474,0.762,0.11,0.136,0.844,0.015,0.563,0.056,-0.05,0.577,0.12,0.575,0.153,-0.01,1.0,-0.207,0.648,0.005,0.309,0.525,0.398,0.433,0.163,-0.05,0.577,0.12,0.575,0.153,0.357,0.922,0.261,0.457,0.031,-0.328,0.402,-0.377,0.755,0.202,-0.135,0.327,0.148,0.585,0.237,-0.357,0.052,-0.206,0.718,0.32,-0.165,0.0,0.12,0.598,0.34,-0.135,0.327,0.148,0.585,0.237,-0.043,0.0,0.268,0.537,0.34,0.22,0.298,0.472,0.433,0.242,0.217,0.081,0.474,0.433,0.31,-0.135,0.327,0.148,0.585,0.237,-0.357,0.052,-0.206,0.718,0.32,-0.135,0.327,0.148,0.585,0.237,-0.165,0.0,0.12,0.598,0.34,-0.246,0.671,-0.474,0.762,0.11,-0.135,0.327,0.148,0.585,0.237,-0.328,0.402,-0.377,0.755,0.202,-0.01,1.0,-0.207,0.648,0.005,-0.05,0.577,0.12,0.575,0.153,-0.246,0.671,-0.474,0.762,0.11,0.136,0.844,0.015,0.563,0.056,0.357,0.922,0.261,0.457,0.031,-0.05,0.577,0.12,0.575,0.153,-0.05,0.577,0.12,0.575,0.153,0.309,0.525,0.398,0.433,0.163,-0.135,0.327,0.148,0.585,0.237],[-0.033,0.905,-0.172,0.145,0.483,-0.027,0.609,0.04,0.19,0.652,0.115,1.0,-0.099,0.219,0.436,-0.215,0.427,-0.013,0.089,0.748,-0.077,0.415,0.088,0.176,0.757,-0.189,0.591,-0.066,0.091,0.658,-0.228,0.169,0.007,0.087,0.883,-0.121,0.151,0.102,0.158,0.896,-0.215,0.427,-0.013,0.089,0.748,0.205,0.379,0.172,0.329,0.773,-0.121,0.151,0.102,0.158,0.896,0.088,0.107,0.168,0.272,0.917,0.228,0.501,0.161,0.338,0.708,-0.077,0.415,0.088,0.176,0.757,0.205,0.379,0.172,0.329,0.773,-0.027,0.609,0.04,0.19,0.652,-0.077,0.415,0.088,0.176,0.757,0.228,0.501,0.161,0.338,0.708,0.195,0.659,0.084,0.307,0.622,-0.027,0.609,0.04,0.19,0.652,0.228,0.501,0.161,0.338,0.708,0.115,1.0,-0.099,0.219,0.436,-0.027,0.609,0.04,0.19,0.652,0.195,0.659,0.084,0.307,0.622,-0.027,0.609,0.04,0.19,0.652,-0.189,0.591,-0.066,0.091,0.658,-0.077,0.415,0.088,0.176,0.757,-0.077,0.415,0.088,0.176,0.757,-0.215,0.427,-0.013,0.089,0.748,-0.121,0.151,0.102,0.158,0.896,-0.121,0.151,0.102,0.158,0.896,-0.102,0.035,0.101,0.167,0.957,0.088,0.107,0.168,0.272,0.917,-0.189,0.591,-0.066,0.091,0.658,-0.027,0.609,0.04,0.19,0.652,-0.033,0.905,-0.172,0.145,0.483,-0.121,0.151,0.102,0.158,0.896,-0.228,0.169,0.007,0.087,0.883,-0.102,0.035,0.101,0.167,0.957,-0.225,0.029,-0.006,0.086,0.954,-0.102,0.035,0.101,0.167,0.957,-0.228,0.169,0.007,0.087,0.883,0.021,0.0,0.103,0.226,0.97,0.088,0.107,0.168,0.272,0.917,-0.102,0.035,0.101,0.167,0.957,-0.077,0.415,0.088,0.176,0.757,-0.121,0.151,0.102,0.158,0.896,0.205,0.379,0.172,0.329,0.773],[0.183,0.772,-0.134,0.574,0.609,0.116,0.416,0.111,0.497,0.779,0.275,0.461,-0.003,0.584,0.757,0.018,0.788,0.006,0.479,0.607,-0.275,0.815,0.095,0.342,0.59,0.116,0.416,0.111,0.497,0.779,-0.093,1.0,-0.157,0.467,0.499,-0.265,0.958,-0.032,0.373,0.52,0.018,0.788,0.006,0.479,0.607,0.126,0.907,-0.225,0.569,0.543,0.018,0.788,0.006,0.479,0.607,0.183,0.772,-0.134,0.574,0.609,-0.093,1.0,-0.157,0.467,0.499,0.018,0.788,0.006,0.479,0.607,0.126,0.907,-0.225,0.569,0.543,-0.275,0.815,0.095,0.342,0.59,0.018,0.788,0.006,0.479,0.607,-0.265,0.958,-0.032,0.373,0.52,0.018,0.788,0.006,0.479,0.607,0.116,0.416,0.111,0.497,0.779,0.183,0.772,-0.134,0.574,0.609,-0.215,0.429,0.225,0.336,0.776,0.116,0.416,0.111,0.497,0.779,-0.275,0.815,0.095,0.342,0.59,0.092,0.0,0.157,0.468,0.954,-0.215,0.429,0.225,0.336,0.776,-0.063,0.059,0.182,0.388,0.934,0.247,0.085,0.018,0.568,0.926,0.275,0.461,-0.003,0.584,0.757,0.092,0.0,0.157,0.468,0.954,0.116,0.416,0.111,0.497,0.779,0.092,0.0,0.157,0.468,0.954,0.275,0.461,-0.003,0.584,0.757,0.116,0.416,0.111,0.497,0.779,-0.215,0.429,0.225,0.336,0.776,0.092,0.0,0.157,0.468,0.954],[-0.161,0.978,-0.246,0.31,0.038,-0.055,0.614,0.031,0.28,0.157,-0.53,0.914,-0.183,0.423,0.059,0.593,0.586,0.021,0.083,0.165,-0.055,0.614,0.031,0.28,0.157,0.462,0.923,-0.137,0.121,0.058,-0.055,0.614,0.031,0.28,0.157,0.593,0.586,0.021,0.083,0.165,0.016,0.34,0.132,0.258,0.243,0.105,0.0,0.093,0.241,0.344,-0.396,0.087,0.241,0.385,0.322,0.016,0.34,0.132,0.258,0.243,0.105,0.0,0.093,0.241,0.344,0.016,0.34,0.132,0.258,0.243,0.51,0.16,0.068,0.108,0.295,-0.366,0.035,0.246,0.375,0.338,-0.396,0.087,0.241,0.385,0.322,0.105,0.0,0.093,0.241,0.344,-0.055,0.614,0.031,0.28,0.157,0.016,0.34,0.132,0.258,0.243,-0.438,0.555,-0.011,0.396,0.173,0.113,1.0,-0.213,0.227,0.032,-0.055,0.614,0.031,0.28,0.157,-0.161,0.978,-0.246,0.31,0.038,0.462,0.923,-0.137,0.121,0.058,-0.055,0.614,0.031,0.28,0.157,0.113,1.0,-0.213,0.227,0.032,-0.53,0.914,-0.183,0.423,0.059,-0.055,0.614,0.031,0.28,0.157,-0.593,0.874,-0.161,0.442,0.071,-0.593,0.874,-0.161,0.442,0.071,-0.055,0.614,0.031,0.28,0.157,-0.438,0.555,-0.011,0.396,0.173,-0.438,0.555,-0.011,0.396,0.173,0.016,0.34,0.132,0.258,0.243,-0.321,0.313,0.075,0.361,0.249,-0.321,0.313,0.075,0.361,0.249,0.016,0.34,0.132,0.258,0.243,-0.396,0.087,0.241,0.385,0.322,0.51,0.16,0.068,0.108,0.295,0.016,0.34,0.132,0.258,0.243,0.593,0.586,0.021,0.083,0.165],[-0.085,0.772,0.237,0.574,0.609,-0.164,0.416,-0.005,0.497,0.779,-0.234,0.461,0.178,0.584,0.757,-0.024,0.788,0.029,0.479,0.607,0.173,0.815,-0.206,0.342,0.59,-0.164,0.416,-0.005,0.497,0.779,0.159,1.0,0.105,0.467,0.499,0.234,0.958,-0.094,0.373,0.52,-0.024,0.788,0.029,0.479,0.607,0.013,0.907,0.281,0.569,0.543,-0.024,0.788,0.029,0.479,0.607,-0.085,0.772,0.237,0.574,0.609,0.159,1.0,0.105,0.467,0.499,-0.024,0.788,0.029,0.479,0.607,0.013,0.907,0.281,0.569,0.543,0.173,0.815,-0.206,0.342,0.59,-0.024,0.788,0.029,0.479,0.607,0.234,0.958,-0.094,0.373,0.52,-0.024,0.788,0.029,0.479,0.607,-0.164,0.416,-0.005,0.497,0.779,-0.085,0.772,0.237,0.574,0.609,0.052,0.429,-0.281,0.336,0.776,-0.164,0.416,-0.005,0.497,0.779,0.173,0.815,-0.206,0.342,0.59,-0.168,0.0,-0.056,0.468,0.954,0.052,0.429,-0.281,0.336,0.776,-0.052,0.059,-0.162,0.388,0.934,-0.222,0.085,0.144,0.568,0.926,-0.234,0.461,0.178,0.584,0.757,-0.168,0.0,-0.056,0.468,0.954,-0.164,0.416,-0.005,0.497,0.779,-0.168,0.0,-0.056,0.468,0.954,-0.234,0.461,0.178,0.584,0.757,-0.164,0.416,-0.005,0.497,0.779,0.052,0.429,-0.281,0.336,0.776,-0.168,0.0,-0.056,0.468,0.954],[-0.051,0.772,0.254,0.574,0.609,-0.169,0.416,0.028,0.497,0.779,-0.207,0.461,0.221,0.584,0.757,-0.026,0.788,0.038,0.479,0.607,0.129,0.815,-0.227,0.342,0.59,-0.169,0.416,0.028,0.497,0.779,0.167,1.0,0.082,0.467,0.499,0.207,0.958,-0.127,0.373,0.52,-0.026,0.788,0.038,0.479,0.607,0.053,0.907,0.281,0.569,0.543,-0.026,0.788,0.038,0.479,0.607,-0.051,0.772,0.254,0.574,0.609,0.167,1.0,0.082,0.467,0.499,-0.026,0.788,0.038,0.479,0.607,0.053,0.907,0.281,0.569,0.543,0.129,0.815,-0.227,0.342,0.59,-0.026,0.788,0.038,0.479,0.607,0.207,0.958,-0.127,0.373,0.52,-0.026,0.788,0.038,0.479,0.607,-0.169,0.416,0.028,0.497,0.779,-0.051,0.772,0.254,0.574,0.609,-0.004,0.429,-0.281,0.336,0.776,-0.169,0.416,0.028,0.497,0.779,0.129,0.815,-0.227,0.342,0.59,-0.182,0.0,-0.021,0.468,0.954,-0.004,0.429,-0.281,0.336,0.776,-0.086,0.059,-0.145,0.388,0.934,-0.202,0.085,0.186,0.568,0.926,-0.207,0.461,0.221,0.584,0.757,-0.182,0.0,-0.021,0.468,0.954,-0.169,0.416,0.028,0.497,0.779,-0.182,0.0,-0.021,0.468,0.954,-0.207,0.461,0.221,0.584,0.757,-0.169,0.416,0.028,0.497,0.779,-0.004,0.429,-0.281,0.336,0.776,-0.182,0.0,-0.021,0.468,0.954],[-0.049,0.905,0.201,0.145,0.483,0.012,0.609,-0.003,0.19,0.652,-0.167,1.0,0.086,0.219,0.436,0.174,0.427,0.106,0.089,0.748,0.074,0.415,-0.033,0.176,0.757,0.133,0.591,0.149,0.091,0.658,0.193,0.169,0.091,0.087,0.883,0.121,0.151,-0.033,0.158,0.896,0.174,0.427,0.106,0.089,0.748,-0.168,0.379,-0.201,0.329,0.773,0.121,0.151,-0.033,0.158,0.896,-0.057,0.107,-0.16,0.272,0.917,-0.193,0.501,-0.197,0.338,0.708,0.074,0.415,-0.033,0.176,0.757,-0.168,0.379,-0.201,0.329,0.773,0.012,0.609,-0.003,0.19,0.652,0.074,0.415,-0.033,0.176,0.757,-0.193,0.501,-0.197,0.338,0.708,-0.186,0.659,-0.114,0.307,0.622,0.012,0.609,-0.003,0.19,0.652,-0.193,0.501,-0.197,0.338,0.708,-0.167,1.0,0.086,0.219,0.436,0.012,0.609,-0.003,0.19,0.652,-0.186,0.659,-0.114,0.307,0.622,0.012,0.609,-0.003,0.19,0.652,0.133,0.591,0.149,0.091,0.658,0.074,0.415,-0.033,0.176,0.757,0.074,0.415,-0.033,0.176,0.757,0.174,0.427,0.106,0.089,0.748,0.121,0.151,-0.033,0.158,0.896,0.121,0.151,-0.033,0.158,0.896,0.103,0.035,-0.037,0.167,0.957,-0.057,0.107,-0.16,0.272,0.917,0.133,0.591,0.149,0.091,0.658,0.012,0.609,-0.003,0.19,0.652,-0.049,0.905,0.201,0.145,0.483,0.121,0.151,-0.033,0.158,0.896,0.193,0.169,0.091,0.087,0.883,0.103,0.035,-0.037,0.167,0.957,0.185,0.029,0.102,0.086,0.954,0.103,0.035,-0.037,0.167,0.957,0.193,0.169,0.091,0.087,0.883,-0.014,0.0,-0.077,0.226,0.97,-0.057,0.107,-0.16,0.272,0.917,0.103,0.035,-0.037,0.167,0.957,0.074,0.415,-0.033,0.176,0.757,0.121,0.151,-0.033,0.158,0.896,-0.168,0.379,-0.201,0.329,0.773],[0.021,0.823,-0.192,0.695,0.435,0.136,0.614,-0.225,0.712,0.545,0.02,0.99,0.027,0.785,0.346,0.136,0.614,-0.225,0.712,0.545,0.021,0.823,-0.192,0.695,0.435,0.025,0.548,-0.387,0.616,0.577,0.136,0.614,-0.225,0.712,0.545,0.025,0.548,-0.387,0.616,0.577,0.247,0.207,-0.219,0.744,0.749,0.247,0.207,-0.219,0.744,0.749,0.256,0.0,-0.187,0.76,0.848,0.289,0.217,-0.074,0.815,0.741,0.247,0.207,-0.219,0.744,0.749,0.107,0.178,-0.322,0.665,0.759,0.256,0.0,-0.187,0.76,0.848,0.289,0.217,-0.074,0.815,0.741,0.256,0.0,-0.187,0.76,0.848,0.302,0.16,0.06,0.882,0.763,0.285,0.078,0.103,0.886,0.801,0.302,0.16,0.06,0.882,0.763,0.256,0.0,-0.187,0.76,0.848,0.147,0.03,-0.299,0.684,0.832,0.256,0.0,-0.187,0.76,0.848,0.107,0.178,-0.322,0.665,0.759,0.247,0.207,-0.219,0.744,0.749,0.289,0.217,-0.074,0.815,0.741,0.136,0.614,-0.225,0.712,0.545,0.107,0.178,-0.322,0.665,0.759,0.247,0.207,-0.219,0.744,0.749,0.025,0.548,-0.387,0.616,0.577,0.245,0.75,0.415,0.983,0.465,0.136,0.614,-0.225,0.712,0.545,0.289,0.217,-0.074,0.815,0.741,-0.302,0.815,-0.504,0.481,0.432,-0.106,0.685,-0.427,0.564,0.504,-0.198,0.981,-0.295,0.594,0.349,-0.198,0.981,-0.295,0.594,0.349,-0.106,0.685,-0.427,0.564,0.504,0.021,0.823,-0.192,0.695,0.435,0.025,0.548,-0.387,0.616,0.577,0.021,0.823,-0.192,0.695,0.435,-0.106,0.685,-0.427,0.564,0.504,0.02,0.99,0.027,0.785,0.346,0.136,0.614,-0.225,0.712,0.545,0.065,1.0,0.504,0.964,0.333,0.065,1.0,0.504,0.964,0.333,0.136,0.614,-0.225,0.712,0.545,0.245,0.75,0.415,0.983,0.465],[-0.174,0.978,-0.253,0.31,0.038,-0.047,0.614,0.015,0.28,0.157,-0.537,0.914,-0.162,0.423,0.059,0.598,0.586,-0.045,0.083,0.165,-0.047,0.614,0.015,0.28,0.157,0.456,0.923,-0.193,0.121,0.058,-0.047,0.614,0.015,0.28,0.157,0.598,0.586,-0.045,0.083,0.165,0.031,0.34,0.11,0.258,0.243,0.117,0.0,0.065,0.241,0.344,-0.371,0.087,0.251,0.385,0.322,0.031,0.34,0.11,0.258,0.243,0.117,0.0,0.065,0.241,0.344,0.031,0.34,0.11,0.258,0.243,0.519,0.16,0.008,0.108,0.295,-0.34,0.035,0.253,0.375,0.338,-0.371,0.087,0.251,0.385,0.322,0.117,0.0,0.065,0.241,0.344,-0.047,0.614,0.015,0.28,0.157,0.031,0.34,0.11,0.258,0.243,-0.432,0.555,0.002,0.396,0.173,0.101,1.0,-0.241,0.227,0.032,-0.047,0.614,0.015,0.28,0.157,-0.174,0.978,-0.253,0.31,0.038,0.456,0.923,-0.193,0.121,0.058,-0.047,0.614,0.015,0.28,0.157,0.101,1.0,-0.241,0.227,0.032,-0.537,0.914,-0.162,0.423,0.059,-0.047,0.614,0.015,0.28,0.157,-0.598,0.874,-0.135,0.442,0.071,-0.598,0.874,-0.135,0.442,0.071,-0.047,0.614,0.015,0.28,0.157,-0.432,0.555,0.002,0.396,0.173,-0.432,0.555,0.002,0.396,0.173,0.031,0.34,0.11,0.258,0.243,-0.309,0.313,0.079,0.361,0.249,-0.309,0.313,0.079,0.361,0.249,0.031,0.34,0.11,0.258,0.243,-0.371,0.087,0.251,0.385,0.322,0.519,0.16,0.008,0.108,0.295,0.031,0.34,0.11,0.258,0.243,0.598,0.586,-0.045,0.083,0.165],[0.265,0.0,-0.04,0.537,0.34,0.177,0.327,0.082,0.585,0.237,0.385,0.081,-0.35,0.433,0.31,0.382,0.298,-0.352,0.433,0.242,0.177,0.327,0.082,0.585,0.237,0.286,0.525,-0.415,0.433,0.163,0.125,0.577,0.009,0.575,0.153,0.177,0.327,0.082,0.585,0.237,-0.385,0.671,0.371,0.762,0.11,-0.029,0.844,-0.138,0.563,0.056,0.125,0.577,0.009,0.575,0.153,-0.2,1.0,0.067,0.648,0.005,0.286,0.525,-0.415,0.433,0.163,0.125,0.577,0.009,0.575,0.153,0.14,0.922,-0.421,0.457,0.031,-0.268,0.402,0.421,0.755,0.202,0.177,0.327,0.082,0.585,0.237,-0.097,0.052,0.398,0.718,0.32,0.159,0.0,0.119,0.598,0.34,0.177,0.327,0.082,0.585,0.237,0.265,0.0,-0.04,0.537,0.34,0.382,0.298,-0.352,0.433,0.242,0.385,0.081,-0.35,0.433,0.31,0.177,0.327,0.082,0.585,0.237,-0.097,0.052,0.398,0.718,0.32,0.177,0.327,0.082,0.585,0.237,0.159,0.0,0.119,0.598,0.34,-0.385,0.671,0.371,0.762,0.11,0.177,0.327,0.082,0.585,0.237,-0.268,0.402,0.421,0.755,0.202,-0.2,1.0,0.067,0.648,0.005,0.125,0.577,0.009,0.575,0.153,-0.385,0.671,0.371,0.762,0.11,-0.029,0.844,-0.138,0.563,0.056,0.14,0.922,-0.421,0.457,0.031,0.125,0.577,0.009,0.575,0.153,0.125,0.577,0.009,0.575,0.153,0.286,0.525,-0.415,0.433,0.163,0.177,0.327,0.082,0.585,0.237],[0.257,0.772,0.04,0.574,0.609,0.039,0.416,0.17,0.497,0.779,0.233,0.461,0.198,0.584,0.757,0.041,0.788,0.026,0.479,0.607,-0.232,0.815,-0.114,0.342,0.59,0.039,0.416,0.17,0.497,0.779,0.074,1.0,-0.169,0.467,0.499,-0.136,0.958,-0.198,0.373,0.52,0.041,0.788,0.026,0.479,0.607,0.279,0.907,-0.066,0.569,0.543,0.041,0.788,0.026,0.479,0.607,0.257,0.772,0.04,0.574,0.609,0.074,1.0,-0.169,0.467,0.499,0.041,0.788,0.026,0.479,0.607,0.279,0.907,-0.066,0.569,0.543,-0.232,0.815,-0.114,0.342,0.59,0.041,0.788,0.026,0.479,0.607,-0.136,0.958,-0.198,0.373,0.52,0.041,0.788,0.026,0.479,0.607,0.039,0.416,0.17,0.497,0.779,0.257,0.772,0.04,0.574,0.609,-0.279,0.429,0.021,0.336,0.776,0.039,0.416,0.17,0.497,0.779,-0.232,0.815,-0.114,0.342,0.59,-0.01,0.0,0.185,0.468,0.954,-0.279,0.429,0.021,0.336,0.776,-0.139,0.059,0.096,0.388,0.934,0.197,0.085,0.194,0.568,0.926,0.233,0.461,0.198,0.584,0.757,-0.01,0.0,0.185,0.468,0.954,0.039,0.416,0.17,0.497,0.779,-0.01,0.0,0.185,0.468,0.954,0.233,0.461,0.198,0.584,0.757,0.039,0.416,0.17,0.497,0.779,-0.279,0.429,0.021,0.336,0.776,-0.01,0.0,0.185,0.468,0.954],[-0.238,0.978,-0.019,0.31,0.038,0.048,0.614,0.063,0.28,0.157,-0.409,0.914,0.313,0.423,0.059,0.429,0.586,-0.461,0.083,0.165,0.048,0.614,0.063,0.28,0.157,0.224,0.923,-0.452,0.121,0.058,0.048,0.614,0.063,0.28,0.157,0.429,0.586,-0.461,0.083,0.165,0.17,0.34,0.066,0.258,0.243,0.193,0.0,-0.028,0.241,0.344,0.011,0.087,0.461,0.385,0.322,0.17,0.34,0.066,0.258,0.243,0.193,0.0,-0.028,0.241,0.344,0.17,0.34,0.066,0.258,0.243,0.417,0.16,-0.367,0.108,0.295,0.033,0.035,0.44,0.375,0.338,0.011,0.087,0.461,0.385,0.322,0.193,0.0,-0.028,0.241,0.344,0.048,0.614,0.063,0.28,0.157,0.17,0.34,0.066,0.258,0.243,-0.216,0.555,0.343,0.396,0.173,-0.047,1.0,-0.218,0.227,0.032,0.048,0.614,0.063,0.28,0.157,-0.238,0.978,-0.019,0.31,0.038,0.224,0.923,-0.452,0.121,0.058,0.048,0.614,0.063,0.28,0.157,-0.047,1.0,-0.218,0.227,0.032,-0.409,0.914,0.313,0.423,0.059,0.048,0.614,0.063,0.28,0.157,-0.429,0.874,0.377,0.442,0.071,-0.429,0.874,0.377,0.442,0.071,0.048,0.614,0.063,0.28,0.157,-0.216,0.555,0.343,0.396,0.173,-0.216,0.555,0.343,0.396,0.173,0.17,0.34,0.066,0.258,0.243,-0.077,0.313,0.302,0.361,0.249,-0.077,0.313,0.302,0.361,0.249,0.17,0.34,0.066,0.258,0.243,0.011,0.087,0.461,0.385,0.322,0.417,0.16,-0.367,0.108,0.295,0.17,0.34,0.066,0.258,0.243,0.429,0.586,-0.461,0.083,0.165],[-0.177,0.772,0.142,0.574,0.609,-0.118,0.416,-0.106,0.497,0.779,-0.274,0.461,0.014,0.584,0.757,-0.017,0.788,-0.004,0.479,0.607,0.274,0.815,-0.102,0.342,0.59,-0.118,0.416,-0.106,0.497,0.779,0.1,1.0,0.155,0.467,0.499,0.267,0.958,0.025,0.373,0.52,-0.017,0.788,-0.004,0.479,0.607,-0.117,0.907,0.23,0.569,0.543,-0.017,0.788,-0.004,0.479,0.607,-0.177,0.772,0.142,0.574,0.609,0.1,1.0,0.155,0.467,0.499,-0.017,0.788,-0.004,0.479,0.607,-0.117,0.907,0.23,0.569,0.543,0.274,0.815,-0.102,0.342,0.59,-0.017,0.788,-0.004,0.479,0.607,0.267,0.958,0.025,0.373,0.52,-0.017,0.788,-0.004,0.479,0.607,-0.118,0.416,-0.106,0.497,0.779,-0.177,0.772,0.142,0.574,0.609,0.209,0.429,-0.23,0.336,0.776,-0.118,0.416,-0.106,0.497,0.779,0.274,0.815,-0.102,0.342,0.59,-0.095,0.0,-0.152,0.468,0.954,0.209,0.429,-0.23,0.336,0.776,0.059,0.059,-0.182,0.388,0.934,-0.246,0.085,-0.009,0.568,0.926,-0.274,0.461,0.014,0.584,0.757,-0.095,0.0,-0.152,0.468,0.954,-0.118,0.416,-0.106,0.497,0.779,-0.095,0.0,-0.152,0.468,0.954,-0.274,0.461,0.014,0.584,0.757,-0.118,0.416,-0.106,0.497,0.779,0.209,0.429,-0.23,0.336,0.776,-0.095,0.0,-0.152,0.468,0.954],[0.264,0.772,-0.007,0.574,0.609,0.07,0.416,0.158,0.497,0.779,0.266,0.461,0.153,0.584,0.757,0.049,0.788,0.016,0.479,0.607,-0.244,0.815,-0.077,0.342,0.59,0.07,0.416,0.158,0.497,0.779,0.049,1.0,-0.182,0.467,0.499,-0.164,0.958,-0.176,0.373,0.52,0.049,0.788,0.016,0.479,0.607,0.268,0.907,-0.114,0.569,0.543,0.049,0.788,0.016,0.479,0.607,0.264,0.772,-0.007,0.574,0.609,0.049,1.0,-0.182,0.467,0.499,0.049,0.788,0.016,0.479,0.607,0.268,0.907,-0.114,0.569,0.543,-0.244,0.815,-0.077,0.342,0.59,0.049,0.788,0.016,0.479,0.607,-0.164,0.958,-0.176,0.373,0.52,0.049,0.788,0.016,0.479,0.607,0.07,0.416,0.158,0.497,0.779,0.264,0.772,-0.007,0.574,0.609,-0.268,0.429,0.064,0.336,0.776,0.07,0.416,0.158,0.497,0.779,-0.244,0.815,-0.077,0.342,0.59,0.024,0.0,0.182,0.468,0.954,-0.268,0.429,0.064,0.336,0.776,-0.118,0.059,0.115,0.388,0.934,0.231,0.085,0.155,0.568,0.926,0.266,0.461,0.153,0.584,0.757,0.024,0.0,0.182,0.468,0.954,0.07,0.416,0.158,0.497,0.779,0.024,0.0,0.182,0.468,0.954,0.266,0.461,0.153,0.584,0.757,0.07,0.416,0.158,0.497,0.779,-0.268,0.429,0.064,0.336,0.776,0.024,0.0,0.182,0.468,0.954],[0.216,0.978,0.202,0.31,0.038,0.012,0.614,-0.014,0.28,0.157,0.533,0.914,0.004,0.423,0.059,-0.583,0.586,0.24,0.083,0.165,0.012,0.614,-0.014,0.28,0.157,-0.402,0.923,0.338,0.121,0.058,0.012,0.614,-0.014,0.28,0.157,-0.583,0.586,0.24,0.083,0.165,-0.091,0.34,-0.08,0.258,0.243,-0.159,0.0,-0.011,0.241,0.344,0.248,0.087,-0.338,0.385,0.322,-0.091,0.34,-0.08,0.258,0.243,-0.159,0.0,-0.011,0.241,0.344,-0.091,0.34,-0.08,0.258,0.243,-0.524,0.16,0.166,0.108,0.295,0.219,0.035,-0.331,0.375,0.338,0.248,0.087,-0.338,0.385,0.322,-0.159,0.0,-0.011,0.241,0.344,0.012,0.614,-0.014,0.28,0.157,-0.091,0.34,-0.08,0.258,0.243,0.383,0.555,-0.12,0.396,0.173,-0.05,1.0,0.275,0.227,0.032,0.012,0.614,-0.014,0.28,0.157,0.216,0.978,0.202,0.31,0.038,-0.402,0.923,0.338,0.121,0.058,0.012,0.614,-0.014,0.28,0.157,-0.05,1.0,0.275,0.227,0.032,0.533,0.914,0.004,0.423,0.059,0.012,0.614,-0.014,0.28,0.157,0.583,0.874,-0.041,0.442,0.071,0.583,0.874,-0.041,0.442,0.071,0.012,0.614,-0.014,0.28,0.157,0.383,0.555,-0.12,0.396,0.173,0.383,0.555,-0.12,0.396,0.173,-0.091,0.34,-0.08,0.258,0.243,0.242,0.313,-0.156,0.361,0.249,0.242,0.313,-0.156,0.361,0.249,-0.091,0.34,-0.08,0.258,0.243,0.248,0.087,-0.338,0.385,0.322,-0.524,0.16,0.166,0.108,0.295,-0.091,0.34,-0.08,0.258,0.243,-0.583,0.586,0.24,0.083,0.165]];
const GRASS_TEX = (() => { const t = new T.TextureLoader().load(assetPng('grasst')); t.flipY = false; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; return t; })();
function vegGrass(V, x, z, R, lush){
  const G_ = V.G, tf = GRASS_TUFTS[Math.floor(R()*GRASS_TUFTS.length)], hh = (.26 + R()*.3)*(lush ? 1.25 : 1), wd = hh*(.9 + R()*.45), a = R()*6.283, ca = Math.cos(a), sa = Math.sin(a);
  const pal = lush && R() < .7 ? VEG_LUSH : VEG_DRY, c0 = pal[Math.floor(R()*pal.length)]; _vc.setHex(c0);
  const tip = 1.12 + R()*.2, o = G_.P.length/3;
  for (let q=0;q<tf.length;q+=5){
    const lx = tf[q]*wd, ly = tf[q+1]*hh, lz = tf[q+2]*wd, hk = Math.max(0, tf[q+1]);
    G_.P.push(x + lx*ca + lz*sa, ly, z - lx*sa + lz*ca); G_.U.push(tf[q+3], tf[q+4]); G_.N.push(0, 1, 0);
    const k = .6 + (tip - .6)*Math.min(1, hk); G_.C.push(_vc.r*k, _vc.g*k, _vc.b*k); G_.A.push(x, z, hk, 1);
  }
  for (let q=0;q<tf.length/5;q++) G_.I.push(o + q);
}
// the old blade tufts (kept for nothing: the uploaded ones replace them)
function vegGrassOld(V, x, z, R, lush){
  const nb = 6 + Math.floor(R()*5), hh = (.18 + R()*.24)*(lush ? 1.25 : 1), rad = .04 + R()*.08;
  const pal = lush && R() < .7 ? VEG_LUSH : VEG_DRY, c0 = pal[Math.floor(R()*pal.length)];
  for (let b=0;b<nb;b++){
    const a = R()*6.283, r0 = rad*Math.sqrt(R()), bx = x + Math.cos(a)*r0, bz = z + Math.sin(a)*r0;
    const ld = a + (R() - .5)*.9, lean = .12 + R()*.5, h = hh*(.55 + R()*.65), w = .02 + R()*.018;
    const dx = Math.cos(ld), dz = Math.sin(ld), px = -dz*w, pz = dx*w;
    const col = R() < .2 ? pal[Math.floor(R()*pal.length)] : c0;
    vegTri(V, bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + dx*Math.sin(lean)*h, h*Math.cos(lean), bz + dz*Math.sin(lean)*h, x, z, 0, 0, 1, 1, col, .55, 1.18 + R()*.24, dx*.35, dz*.35);
  }
}
// a dry bush: twigs fanning up from the root with a few dusty leaves and thorns at their ends; or a low tangled clump
function vegShrub(V, x, z, R, clump){
  const H = clump ? .2 + R()*.16 : .32 + R()*.45, nt = clump ? 14 + Math.floor(R()*8) : 8 + Math.floor(R()*6);
  const tw = VEG_TWIG[Math.floor(R()*VEG_TWIG.length)], lf = VEG_LEAF[Math.floor(R()*VEG_LEAF.length)];
  for (let t=0;t<nt;t++){
    const a = R()*6.283, lean = clump ? .5 + R()*.9 : .2 + R()*.65, h = H*(.5 + R()*.6), w = .012 + R()*.01;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz*w, pz = dx*w, bx = x + dx*R()*.04, bz = z + dz*R()*.04;
    const tx = bx + dx*Math.sin(lean)*h, ty = h*Math.cos(lean), tz = bz + dz*Math.sin(lean)*h, hk = ty/H;
    vegTri(V, bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, ty, tz, x, z, 0, 0, hk, .55, tw, .7, 1.05, dx*.3, dz*.3);
    const nl = clump ? 1 : 1 + Math.floor(R()*3);
    for (let l=0;l<nl;l++){
      const f = .45 + R()*.55, lx = bx + (tx - bx)*f, ly = ty*f, lz = bz + (tz - bz)*f, s = (clump ? .05 : .07) + R()*.05, b2 = R()*6.283;
      const ex = Math.cos(b2)*s, ez = Math.sin(b2)*s, up = s*(.4 + R()*.6), lh = ly/H;
      vegTri(V, lx - ex*.5, ly, lz - ez*.5, lx + ex*.5, ly + up*.3, lz + ez*.5, lx + ez*.6, ly + up, lz - ex*.6, x, z, lh, lh, Math.min(1.2, lh + .1), .55,
        R() < .25 ? VEG_TWIG[Math.floor(R()*VEG_TWIG.length)] : lf, .95, 1.18, dx*.4, dz*.4);
    }
  }
}
function vegChunk(ch){
  const V = { P:[], N:[], C:[], A:[], I:[], G:{ P:[], N:[], C:[], A:[], I:[], U:[] } };
  let vs = (Math.imul(ch.i, 2654435761) ^ Math.imul(ch.j, 40503) ^ 0x9e3779b9) >>> 0;   // its own random stream: the city does not move
  const R = () => { vs = (Math.imul(vs, 1664525) + 1013904223) >>> 0; return vs/4294967296; };
  const inGrid = ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0;
  if (inGrid) for (let j=Math.max(0, ch.z0); j<Math.min(H, ch.z0 + CS); j++) for (let i=Math.max(0, ch.x0); i<Math.min(W, ch.x0 + CS); i++){
    const k = idx(i, j); if (grid[k] !== 0 || STR[k] === 2) continue;
    const gk = ground[k]; if (gk === 3 || gk === 4 || gk === 5 || gk === 7 || gk === 10 || gk === 11) continue;
    let wx = 0, wz = 0, nW = 0;
    for (let q=0;q<4;q++){ const di = q === 0 ? 1 : q === 1 ? -1 : 0, dj = q === 2 ? 1 : q === 3 ? -1 : 0, ii = i + di, jj = j + dj;
      if (inB(ii, jj)){ const g = grid[idx(ii, jj)]; if (g === 1 || g === 2){ wx += di; wz += dj; nW++; } } }
    const street = STR[k] === 1; if (street && !nW) continue;
    let pr = street ? .35 : gk === 0 ? (nW ? .85 : .28) : gk === 2 ? (nW ? .6 : .1) : (nW ? .4 : .05);
    pr *= (.7 + (1 - cityDc(i + .5, j + .5))*.9)*(.2 + 1.6*vnoise(i*.13 + 7.1, j*.13 + 3.3));
    if (R() > pr) continue;
    const n = 1 + (R() < .6 ? 1 : 0) + (nW && !street && R() < .6 ? 1 : 0) + (gk === 0 && R() < .4 ? 1 : 0);
    for (let t=0;t<n;t++){
      let x = i + .15 + R()*.7, z = j + .15 + R()*.7;
      if (wx) x = i + .5 + Math.sign(wx)*(.3 + R()*.15);       // hugging the foot of the wall
      if (wz) z = j + .5 + Math.sign(wz)*(.3 + R()*.15);
      const sp = street ? .1 : nW ? .2 : .3;
      if (R() < sp) vegShrub(V, x, z, R, R() < .35); else vegGrass(V, x, z, R, nW > 0);
    }
  }
  // the bush beyond the streets: tufts in drifts, thinning to nothing on the roads, the beach and the airfield
  const tmp = [0, 0, 0, 0];
  for (let k=0;k<300;k++){
    const x = ch.x0 + R()*CS, z = ch.z0 + R()*CS;
    if (x >= 0 && z >= 0 && x < W && z < H) continue;                 // inside the grid the cells decide
    if (R() > .25 + .9*vnoise(x*.08 + 2.3, z*.08 + 5.9)) continue;
    if (coastS(x, z) > -28) continue;
    const [u, v] = airUV(x, z);
    if (u > BASE.u0 - 10 && u < BASE.u1 + 30 && v > BASE.v0 - 10 && v < 30) continue;
    if (u > -300 && u < 340 && v > -292 && v < 16 && airGround(u, v, tmp)) continue;
    if (TZONE && u > TZONE.u0 - 6 && u < TZONE.u1 + 6 && v > TZONE.v0 - 8 && v < TZONE.v1 + 6) continue;
    if (roadDist(x, z, ROADSEG)[0] < 1.5 || roadDist(x, z, TRACKS)[0] < .8) continue;
    if (VILLAGES.some(vl => Math.hypot(x - vl.x, z - vl.z) < vl.r*.7)) continue;
    if (R() < .18) vegShrub(V, x, z, R, R() < .4); else vegGrass(V, x, z, R, false);
  }
  return V;
}
const VEG_GMAT = new T.MeshLambertMaterial({ vertexColors:true, side:T.DoubleSide, map:GRASS_TEX, alphaTest:.32 });
VEG_GMAT.onBeforeCompile = VEG_MAT.onBeforeCompile; VEG_GMAT.customProgramCacheKey = () => 'vegG';
function buildVeg(ch){
  const V = vegChunk(ch), G_ = V.G;
  if (G_.I.length){
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(G_.P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(G_.N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(G_.C, 3)); g.setAttribute('aVeg', new T.Float32BufferAttribute(G_.A, 4)); g.setAttribute('uv', new T.Float32BufferAttribute(G_.U, 2));
    g.setIndex(G_.P.length/3 > 65535 ? new T.Uint32BufferAttribute(G_.I, 1) : new T.Uint16BufferAttribute(G_.I, 1));
    g.computeBoundingSphere(); g.boundingSphere.radius += 1.5;
    const m = new T.Mesh(g, VEG_GMAT); m.receiveShadow = true; m.castShadow = false; ch.group.add(m); ch.vegG = m;
  }
  if (!V.I.length) return;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(V.P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(V.N, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(V.C, 3)); g.setAttribute('aVeg', new T.Float32BufferAttribute(V.A, 4));
  g.setIndex(V.P.length/3 > 65535 ? new T.Uint32BufferAttribute(V.I, 1) : new T.Uint16BufferAttribute(V.I, 1));
  g.computeBoundingSphere(); g.boundingSphere.radius += 1.5;
  const m = new T.Mesh(g, VEG_MAT); m.receiveShadow = true; m.castShadow = false; ch.group.add(m); ch.veg = m;
}
const _vY = new T.Vector3(0, 1, 0);
const VEH_T = ['car_topaz', 'car_kcar', 'car_wreck'], VEH_MAT = {};
function vehMat(t, M_){
  if (VEH_MAT[t]) return VEH_MAT[t];
  const mask = new T.TextureLoader().load(assetPng(t + '_m')); mask.flipY = false; mask.minFilter = T.LinearFilter; mask.magFilter = T.LinearFilter;
  const mat = new T.MeshPhongMaterial({ map:M_.mat.map, specular:0x1c1c1a, shininess:16, side:t === 'car_wreck' ? T.DoubleSide : T.FrontSide });   // the burnt shell is open in places
  mat.onBeforeCompile = sh => {
    sh.uniforms.tPaint = { value:mask };
    sh.fragmentShader = 'uniform sampler2D tPaint;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  texelColor = mapTexelToLinear( texelColor );
  #ifdef USE_COLOR
  texelColor.rgb *= mix( vec3( 1.0 ), vColor, texture2D( tPaint, vUv ).r );
  #endif
  diffuseColor *= texelColor;
#endif`).replace('#include <color_fragment>', '');
  };
  mat.customProgramCacheKey = () => 'vehPaint';
  return (VEH_MAT[t] = mat);
}
function vehWrite(r){
  if (!r.mesh) return;
  dummy.position.set(r.x, 0, r.z); dummy.rotation.set(0, r.ry, 0); dummy.scale.setScalar(r.dead ? 0 : 1); dummy.updateMatrix();
  r.mesh.setMatrixAt(r.k, dummy.matrix); r.mesh.instanceMatrix.needsUpdate = true;
}
function buildVeh(ch){
  if (!ch.VH.length) return;
  for (const t of VEH_T){
    const L_ = ch.VH.filter(r => r.t === t); if (!L_.length) continue;
    withModel(t, M_ => {
      if (!ch.group) return;
      const m = new T.InstancedMesh(M_.geos.body, vehMat(t, M_), L_.length);
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; lodReg(m);
      L_.forEach((r, k) => { r.mesh = m; r.k = k; vehWrite(r); m.setColorAt(k, tmpCol.setHex(r.col)); });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      ch.group.add(m);
    });
  }
}
/* ---------- the main road: old asphalt from the airport through the K-4 roundabout and up the Mile to the stadium. It is a mesh of its own,
   laid just over the ground, so wherever a dirt street or a track crosses it the asphalt stays on top. A seamless worn texture (cracks,
   tar-sealed joints, patches, potholes) repeats in world space; worn markings, oily wheel paths and the broken, sandy edge are drawn
   in the shader from the position across and along the road. The roundabout is a true circle, drawn last, over the roads that meet it. ---------- */
const RD_TILE = 12;
function rdTex(uri, rep_){ const t = new T.TextureLoader().load(uri); if (rep_){ t.wrapS = t.wrapT = T.RepeatWrapping; }
  t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.anisotropy = 4; return t; }
const ASPH_TEX = rdTex('assets/textures/terrain/asphalt.jpg', true), ISLE_TEX = rdTex('assets/textures/terrain/island.jpg', false);
const RD_NOISE = `
float rdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rdN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(rdH(i), rdH(i + vec2(1.0, 0.0)), f.x), mix(rdH(i + vec2(0.0, 1.0)), rdH(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
const RD_FRAG = `
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv * 4.0 );
  texelColor.rgb *= 0.9 + 0.2 * texture2D( map, vUv * 0.61 + vec2(0.37, 0.61) ).g / 0.414;
  texelColor.rgb *= 0.82;   // packed and oiled: a shade darker than loose rock   // a slow second sample: no visible repeat
  texelColor = mapTexelToLinear( texelColor );
  float across = vRoad.x, along = vRoad.y, hw = vRoad.z;
  float e = hw - abs(across);                                       // how far in from the edge
  float n1 = rdN(vWXZ * 1.3), n2 = rdN(vWXZ * 5.1), n3 = rdN(vWXZ * 17.0);
  float lim = -0.3 + 0.5 * n1 + 0.22 * n2 + 0.08 * n3;              // the edge breaks up into the sand
  if (e < lim) discard;
  // wheel paths: darker, oilier bands in each lane
  float lane = abs(abs(across) - hw * 0.5);
  float track = 1.0 - smoothstep(0.12, 0.42, abs(lane - 0.6));
  texelColor.rgb *= 1.0 - 0.09 * track * (0.6 + 0.4 * n2);
  // markings: a dashed white line down the middle and lines along the edges, almost worn away
  float paint = 0.0;
  if (hw > 2.0 && vRoad.x > -50.0){
    float dash = step(fract(along / 4.8), 0.5);
    paint = max(paint, (1.0 - smoothstep(0.05, 0.085, abs(across))) * dash);
    paint = max(paint, (1.0 - smoothstep(0.035, 0.07, abs(e - 0.45))) * 0.8);
  }
  paint *= smoothstep(0.3, 0.62, rdN(vWXZ * 2.3 + 11.0)) * smoothstep(0.15, 0.5, n3 * 0.6 + n2 * 0.4);
  texelColor.rgb = mix(texelColor.rgb, vec3(0.78, 0.76, 0.68), paint * 0.55);
  // sand blown onto the edges, and dust over everything
  vec3 sand = vec3(0.80, 0.72, 0.57) * (0.93 + 0.12 * n2);
  float sd = 1.0 - smoothstep(lim, lim + 0.7 + 0.9 * n1, e);
  texelColor.rgb = mix(texelColor.rgb, sand, clamp(sd * 0.85 + 0.07 * smoothstep(0.6, 0.95, n1), 0.0, 1.0));
  diffuseColor *= texelColor;
#endif
`;
function asphMat(prio){
  const m = new T.MeshPhongMaterial({ map:ASPH_TEX, specular:0x0b0b0a, shininess:5, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-4 - prio*4 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec3 aRoad; varying vec3 vRoad; varying vec2 vWXZ;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = aRoad; vWXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = 'varying vec3 vRoad; varying vec2 vWXZ;\n' + RD_NOISE + sh.fragmentShader.replace('#include <map_fragment>', RD_FRAG);
  };
  m.customProgramCacheKey = () => 'asph';
  return m;
}
// a strip along a polyline: mitred corners, the distance along it carried to the shader
function rdStrip(P, R, I, A, pts, hw, y){
  const n = pts.length, pad = .5; let along = 0;
  for (let k=0;k<n;k++){
    const a = pts[Math.max(0, k-1)], b = pts[k], c = pts[Math.min(n-1, k+1)];
    let d0x = b[0] - a[0], d0z = b[1] - a[1], d1x = c[0] - b[0], d1z = c[1] - b[1];
    const l0 = Math.hypot(d0x, d0z) || 1, l1 = Math.hypot(d1x, d1z) || 1; d0x /= l0; d0z /= l0; d1x /= l1; d1z /= l1;
    if (k === 0){ d0x = d1x; d0z = d1z; } if (k === n-1){ d1x = d0x; d1z = d0z; }
    let tx = d0x + d1x, tz = d0z + d1z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const nx = -tz, nz = tx, miter = 1/Math.max(.35, nx*(-d1z) + nz*d1x);
    if (k) along += Math.hypot(b[0] - a[0], b[1] - a[1]);
    const w = (hw + pad)*miter, o = P.length/3;
    for (const sg of [-1, 1]){ const x = b[0] + nx*w*sg, z = b[1] + nz*w*sg; P.push(x, y, z); A.push(x/RD_TILE, z/RD_TILE); R.push(sg*(hw + pad), along, hw); }
    if (k) I.push(o - 2, o - 1, o, o - 1, o + 1, o);
  }
}
function rdMesh(P, R, I, A, mat){
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(A, 2)); g.setAttribute('aRoad', new T.Float32BufferAttribute(R, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(new Array(P.length).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  g.setIndex(I); g.computeBoundingSphere();
  const m = new T.Mesh(g, mat); m.receiveShadow = true; world.add(m); return m;
}
const K4C = [330, 410], K4_R0 = 10, K4_R1 = 17;
function mainRoad(){
  // the airport road, cut where it reaches the roundabout's ring
  const ap = ROADS[0].pts.map(q => q.slice()), last = ap[ap.length - 1], prev = ap[ap.length - 2];
  { const dx = prev[0] - last[0], dz = prev[1] - last[1], L = Math.hypot(dx, dz); ap[ap.length - 1] = [K4C[0] + dx/L*15.5, K4C[1] + dz/L*15.5]; }
  // the Mile from the stadium gate down to K-4 road, and K-4 road west to the roundabout
  const mile = [[MILE_X + .5, 90.5], [MILE_X + .5, 410.5], [K4C[0] + 15.5, 410.5]];
  let P = [], R = [], I = [], A = [];
  rdStrip(P, R, I, A, ap, ROADS[0].w/2, .006); rdStrip(P, R, I, A, mile, 3.5, .006);
  rdMesh(P, R, I, A, asphMat(0));
  // the ring: a true circle of many segments, drawn over the ends of the roads
  P = []; R = []; I = []; A = [];
  const N = 160, rm = (K4_R0 + K4_R1)/2, hw = (K4_R1 - K4_R0)/2;
  for (let k=0;k<=N;k++){ const a = k/N*Math.PI*2, ca = Math.cos(a), sa = Math.sin(a), o = P.length/3;
    for (const r of [K4_R0 - .05, K4_R1 + .5]){ const x = K4C[0] + ca*r, z = K4C[1] + sa*r; P.push(x, .009, z); A.push(x/RD_TILE, z/RD_TILE); R.push(r - rm, a*rm, hw); }
    if (k) I.push(o - 2, o, o - 1, o - 1, o, o + 1); }
  rdMesh(P, R, I, A, asphMat(1));
  k4Island();
}
// the island: a round raised kerb painted black and white, a radial garden of stone setts, dry grass and paths, and the monument on round steps
function k4Island(){
  const g = new T.Group(); g.position.set(K4C[0], 0, K4C[1]); world.add(g);
  const disc = new T.Mesh(new T.CircleGeometry(K4_R0, 96).rotateX(-Math.PI/2), new T.MeshPhongMaterial({ map:ISLE_TEX, specular:0x080808, shininess:4, polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-12 }));
  disc.position.y = .1; disc.receiveShadow = true; g.add(disc);
  // the kerb: blocks round the circle, alternately white and black
  const NB = 104, r0 = K4_R0 - .32, r1 = K4_R0 + .06, h = .16, P = [], C = [], Nn = [];
  const quad = (a, b, c, d, n, col) => { for (const v of [a, b, c, a, c, d]){ P.push(...v); Nn.push(...n); C.push(...col); } };
  for (let k=0;k<NB;k++){ const a0 = k/NB*Math.PI*2, a1 = (k + .94)/NB*Math.PI*2, col = k % 2 ? [.16, .16, .15] : [.88, .87, .82];
    const p = (r, a, y) => [Math.cos(a)*r, y, Math.sin(a)*r], am = (a0 + a1)/2;
    quad(p(r0, a0, h), p(r0, a1, h), p(r1, a1, h), p(r1, a0, h), [0, 1, 0], col);
    quad(p(r1, a0, h), p(r1, a1, h), p(r1, a1, 0), p(r1, a0, 0), [Math.cos(am), 0, Math.sin(am)], col.map(c => c*.92));
    quad(p(r0, a1, h), p(r0, a0, h), p(r0, a0, 0), p(r0, a1, 0), [-Math.cos(am), 0, -Math.sin(am)], col.map(c => c*.85)); }
  const kg = new T.BufferGeometry(); kg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); kg.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3)); kg.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  const kerb = new T.Mesh(kg, new T.MeshPhongMaterial({ vertexColors:true, specular:0x111111, shininess:10, side:T.DoubleSide })); kerb.castShadow = true; kerb.receiveShadow = true; g.add(kerb);
  // the monument's steps: three round tiers, each with a small moulding
  const stone = new T.MeshPhongMaterial({ color:0xd6cdb6, specular:0x141414, shininess:8 });
  let y = .1;
  for (const [r, th] of [[3.25, .32], [2.55, .32], [1.85, .36]]){
    const prof = [[0, y], [r, y], [r, y + th*.75], [r - .08, y + th*.82], [r - .08, y + th], [0, y + th]].map(q => new T.Vector2(q[0], q[1]));
    const m = new T.Mesh(new T.LatheGeometry(prof, 64), stone); m.castShadow = true; m.receiveShadow = true; g.add(m); y += th; }
  // a low ring of setts edging the planted bed
  const bed = new T.Mesh(new T.TorusGeometry(4.65, .07, 4, 96).rotateX(Math.PI/2), stone); bed.position.y = .12; g.add(bed);
}
function shrub(x, z){ const s = rr(.6, 1.5); D(x, 0, z, s*1.4, s*.8, s*1.2, pick([0x7a7a50, 0x6a6e48, 0x8a8456, 0x5e6440]), { m:M.LEAF }); }

/* ---------- city plan ---------- */
function vline(x0, x1, z0, z1, paved){ for (let z=Math.max(0,z0); z<=Math.min(H-1,z1); z++) for (let x=Math.max(0,x0); x<=Math.min(W-1,x1); x++){ const k = idx(x,z); STR[k] = Math.max(STR[k], paved ? 2 : 1); SVX[k] = x0; SVW[k] = x1-x0+1; } }
function hline(z0, z1, x0, x1, paved){ for (let z=Math.max(0,z0); z<=Math.min(H-1,z1); z++) for (let x=Math.max(0,x0); x<=Math.min(W-1,x1); x++){ const k = idx(x,z); STR[k] = Math.max(STR[k], paved ? 2 : 1); SHZ[k] = z0; SHW[k] = z1-z0+1; } }
function dline(ax, az, bx, bz, w, dirt){ const L = Math.hypot(bx-ax, bz-az); for (let t=0;t<=L;t+=.4){ const x = ax + (bx-ax)*t/L, z = az + (bz-az)*t/L; for (let a=-w/2;a<=w/2;a+=.5) for (let b=-w/2;b<=w/2;b+=.5){ const i = Math.floor(x+a), j = Math.floor(z+b); if (inB(i,j) && Math.hypot(a,b) <= w/2){ const k = idx(i,j); if (dirt){ if (!reserved[k] && grid[k] === 0) STR[k] = Math.max(STR[k], 1); } else STR[k] = 2; } } } }
function genLines(lo, hi, avoid){
  const out = []; let p = lo;
  while (true){ p += Math.round(rr(26, 40)); if (p > hi) break; const w = rnd() < .2 ? 6 : 4 + ri(2); if (avoid.some(a => p + w + 10 > a[0] && p - 10 < a[1])) continue; out.push([p, p + w - 1]); p += w; }
  return out;
}
let VALL = [], HALL = [], TRACKS = [];
function planStreets(){
  STR = new Uint8Array(W*H); SVX = new Int16Array(W*H).fill(-1); SVW = new Uint8Array(W*H); SHZ = new Int16Array(W*H).fill(-1); SHW = new Uint8Array(W*H);
  // district streets carry on through the whole city: Hawlwadig Road north-south, the main avenue east-west
  // every street is beaten earth with wheel ruts; the one asphalt road in town is the battered avenue
  // that runs north from K-4, past the Super 61 crash, to the stadium: the route of the Mogadishu Mile
  const V = [[OX+9, OX+13], [OX+29, OX+35], [OX+51, OX+55], [218, 222], [290, 294], [329, 333], [348, 352], [368, 372], [389, 393], [MILE_X - 3, MILE_X + 3, 'mile']];
  // north of the target a tight run of cross streets climbs to the stadium
  const Hh = [[OZ+10, OZ+14], [OZ+28, OZ+35], [OZ+50, OZ+54], [99, 103], [115, 119], [132, 136], [149, 153], [166, 171], [182, 186], [199, 203], [218, 222], [290, 294], [318, 324], [407, 413, 'k4']];
  const vAll = V.concat(genLines(-30, 214, V), genLines(294, W - 12, V));
  const hAll = Hh.concat(genLines(-30, 214, Hh), genLines(294, H - 12, Hh));
  VALL = vAll; HALL = hAll;
  // streets live and die with the city: paved in the core, dirt at the fringe, gone in the scrub.
  // The great avenues run on as dirt roads almost to the edge; side streets give out at random.
  const lay = (l, vert, main) => {
    const thr = main ? .045 : .14 + rnd()*.14, pv = main ? .22 : .5, c = (l[0] + l[1])/2, N = vert ? H : W;
    for (let t=0;t<N;t++){ const d = vert ? cityDs(c, t + .5) : cityDs(t + .5, c); if (d < thr) continue;
      const paved = (l[2] === 'mile' && t >= STADIUM.z + STADIUM.rz - 2 && t <= 412) || (l[2] === 'k4' && t >= 338 && t <= MILE_X + 3); if (vert) vline(l[0], l[1], t, t, paved); else hline(l[0], l[1], t, t, paved); }
  };
  vAll.forEach((l, k) => lay(l, true, k < V.length)); hAll.forEach((l, k) => lay(l, false, k < Hh.length));
  // tracks: footpaths and pickup trails that wander out of the last streets into the bush
  TRACKS = [];
  for (let n=0;n<26;n++){
    const a0 = n/26*Math.PI*2 + rr(-.1, .1);
    let x = 286, z = 270; for (let st=0; st<60; st++){ x += Math.cos(a0)*5; z += Math.sin(a0)*5; if (cityDs(clamp(x,0,W-1), clamp(z,0,H-1)) < .3 || coastS(x, z) > -30) break; }
    if (coastS(x, z) > -30) continue;
    let a = a0, L = rr(90, 260), px = x, pz = z;
    for (let s=0; s<L; s+=14){
      a += rr(-.35, .35); const nx = px + Math.cos(a)*14, nz = pz + Math.sin(a)*14;
      if (coastS(nx, nz) > -26) break;
      TRACKS.push([px, pz, nx, nz, 2.6, false]); dline(px, pz, nx, nz, 2.6, true); px = nx; pz = nz;
    }
  }
  vline(376, 378, 295, 317, false);                                  // the alley where Super 6-1 came down
  for (const sg of ROADSEG){ if (Math.max(sg[0], sg[2]) < -10 || Math.max(sg[1], sg[3]) < -10 || Math.min(sg[0], sg[2]) > W + 10 || Math.min(sg[1], sg[3]) > H + 10) continue;
    const L = Math.hypot(sg[2]-sg[0], sg[3]-sg[1]), t0 = 0; let a0 = 0, a1 = 1;
    for (let t=0;t<=1;t+=4/L){ const x = sg[0] + (sg[2]-sg[0])*t, z = sg[1] + (sg[3]-sg[1])*t; if (x < -12 || z < -12 || x > W + 12 || z > H + 12){ if (t < .5) a0 = t; else { a1 = t; break; } } }
    dline(sg[0] + (sg[2]-sg[0])*a0, sg[1] + (sg[3]-sg[1])*a0, sg[0] + (sg[2]-sg[0])*a1, sg[1] + (sg[3]-sg[1])*a1, sg[4], !sg[5]); }
  dline(330, 410, 380, 300, 6, true);        // airport road and a diagonal from K-4
  // K-4 roundabout
  for (let j=390;j<=430;j++) for (let i=310;i<=350;i++){ const d = Math.hypot(i+.5-330, j+.5-410); const k = idx(i,j);
    if (d <= 17 && d >= 10){ STR[k] = 2; SVX[k] = -1; SHZ[k] = -1; } else if (d < 10){ STR[k] = 0; SVX[k] = -1; SHZ[k] = -1; reserved[k] = 1; ground[k] = 3; if (d < 2.5) { grid[k] = 1; topH[k] = 3; } } }
  // stadium
  for (let j=STADIUM.z - STADIUM.rz - 3; j<=STADIUM.z + STADIUM.rz + 3; j++) for (let i=STADIUM.x - STADIUM.rx - 3; i<=STADIUM.x + STADIUM.rx + 3; i++){
    const e = Math.hypot((i+.5-STADIUM.x)/STADIUM.rx, (j+.5-STADIUM.z)/STADIUM.rz), k = idx(i,j);
    if (e > 1.08) continue;
    STR[k] = 0; SVX[k] = -1; SHZ[k] = -1; reserved[k] = 1;
    const a = Math.atan2(j+.5-STADIUM.z, i+.5-STADIUM.x), gate = [0, Math.PI, -Math.PI/2, -Math.PI].some(g => Math.abs(a - g) < .07) || Math.abs(a - Math.PI/2) < .16;   // the south gate is wide: the Mile ends in it
    if (e > .78 && e <= 1 && !gate){ grid[k] = 1; topH[k] = 3.2; } else if (e <= .78) ground[k] = 7;
  }
  // sea and beach
  for (let j=0;j<H;j++) for (let i=0;i<W;i++){ const s = coastS(i+.5, j+.5), k = idx(i,j); if (s > -3){ grid[k] = 3; STR[k] = 0; reserved[k] = 1; } else if (s > -24){ reserved[k] = 1; ground[k] = 11; STR[k] = Math.min(STR[k], 1); } }
  // the arch over National Street
  for (const zz of [[313,316],[326,329]]) for (let j=zz[0];j<=zz[1];j++) for (let i=398;i<=403;i++){ const k = idx(i,j); grid[k] = 1; topH[k] = 9; reserved[k] = 1; }
  for (let j=317;j<=325;j++) for (let i=398;i<=403;i++) reserved[idx(i,j)] = 1;
  for (let j=297;j<=307;j++) for (let i=374;i<=380;i++) reserved[idx(i,j)] = 1;
  for (let j=352;j<=368;j++) for (let i=263;i<=279;i++) reserved[idx(i,j)] = 1;
}
function reservePort(){
  // the port yard behind the beach is kept free of city blocks
  const P = LM.port, N_ = [COAST_NX, COAST_NZ], U_ = [COAST_DX, COAST_DZ];
  const at = (du, dn) => [P.x + U_[0]*du + N_[0]*dn, P.z + U_[1]*du + N_[1]*dn];
  { const c = at(0, -38); for (let j=Math.floor(c[1]) - 26; j<=c[1] + 26; j++) for (let i=Math.floor(c[0]) - 30; i<=c[0] + 30; i++){ if (!inB(i,j)) continue;
      const q = [i + .5 - c[0], j + .5 - c[1]], du = q[0]*U_[0] + q[1]*U_[1], dn = q[0]*N_[0] + q[1]*N_[1]; if (Math.abs(du) < 40 && Math.abs(dn) < 16){ reserved[idx(i,j)] = 1; } } }
}
function planBlocks(){
  reservePort();
  const vAll = VALL, hAll = HALL;
  for (let j=OZ;j<OZ+64;j++) for (let i=OX;i<OX+64;i++) reserved[idx(i,j)] = 1;
  // mosques: white, with a dome and a minaret
  for (const [mx, mz] of [[200,190],[350,262],[150,340],[430,362],[300,95],[95,220],[214,430],[470,250],[250,140],[330,470]]) if (cityDs(mx, mz) > .4) placeNear(mx, mz, 8, 8, (x, y) => building(x, y, 8, 8, 2, { force:true, col:pick(OLDW), base:0xd8d2c2, mosque:true }));
  // Villa Somalia: the presidential compound on its rise above the old town
  placeNear(462, 312, 12, 9, (x, y) => { building(x, y, 12, 9, 2, { force:true, col:0xf4f0e6, base:0xd8d2c2, cren:true, arcade:true }); courtyard(x - 3, y - 3, 18, 15); LM.villa.x = x + 6; LM.villa.z = y + 4.5; });
  // blocks between the street lines
  const xs = vAll.map(l => l).sort((a,b) => a[0]-b[0]), zs = hAll.map(l => l).sort((a,b) => a[0]-b[0]);
  const bx = [], bz = [];
  let prev = 0; for (const l of xs){ if (l[0]-1 >= prev) bx.push([prev, l[0]-1]); prev = Math.max(prev, l[1]+1); } if (prev <= W-1) bx.push([prev, W-1]);
  prev = 0; for (const l of zs){ if (l[0]-1 >= prev) bz.push([prev, l[0]-1]); prev = Math.max(prev, l[1]+1); } if (prev <= H-1) bz.push([prev, H-1]);
  for (const xr of bx) for (const zr of bz){
    const cx = (xr[0]+xr[1])/2, cz = (zr[0]+zr[1])/2;
    if (cx >= OX && cx < OX+64 && cz >= OZ && cz < OZ+64) continue;
    if (inR(BAKARA, cx, cz)) bakaraBlock(xr[0], zr[0], xr[1], zr[1]);
    else if (inR(SHANTY, cx, cz)) shantyBlock(xr[0], zr[0], xr[1], zr[1]);
    else fillCityBlock(xr[0], zr[0], xr[1], zr[1], { old: inR(OLDTOWN, cx, cz) });
  }
}
function placeNear(x, y, w, d, fn){
  for (let r=0;r<14;r++) for (let dy=-r;dy<=r;dy++) for (let dx=-r;dx<=r;dx++){ if (Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue; if (freeLot(x+dx, y+dy, w, d)){ fn(x+dx, y+dy); return true; } }
  return false;
}
function fillCityBlock(x0, y0, x1, y1, st){
  st = st || {};
  // each lot reads the density field: tall packed blocks in the core, walled compounds, then a house here and there, then bush
  const tierAt = (x, y) => { let d = cityDs(x, y) + (hash2(x*7 + 3, y*13 + 1) - .5)*.08; if (st.old) d = Math.max(d, .66);
    return d > .62 ? 0 : d > .42 ? 1 : d > .25 ? 2 : d > .1 ? 3 : 4; };
  let x = x0;
  while (x <= x1){
    const tx = tierAt(x + 3, (y0 + y1)/2), lw = [4, 4, 6, 7, 9][tx];
    let w = lw + ri(4); if (x + w - 1 > x1) w = x1 - x + 1; if (x1 - (x+w-1) < 3 && x1 - (x+w-1) > 0) w = x1 - x + 1;
    let y = y0;
    while (y <= y1){
      const tier = tierAt(x + w/2, y + 3), ld = [4, 4, 6, 7, 9][tier];
      let d = ld + ri(4); if (y + d - 1 > y1) d = y1 - y + 1; if (y1 - (y+d-1) < 3 && y1 - (y+d-1) > 0) d = y1 - y + 1;
      const pB = [.72, .55, .34, .16, 0][tier], mxF = [4, 2, 1, 1, 0][tier], r = rnd();
      if (tier < 4 && w >= 2 && d >= 2 && r < pB){
        const fl = Math.min(mxF, 1 + ri(4) + (rnd() < .12 ? 1 : 0));
        if (tier >= 2 && w >= 5 && d >= 5){ const bw = Math.min(w-3, 3 + ri(3)), bd = Math.min(d-3, 3 + ri(2));
          building(x + 1 + ri(Math.max(1, w-2-bw)), y + 1 + ri(Math.max(1, d-2-bd)), bw, bd, 1, { damaged: rnd() < .1 }); if (tier === 2 || rnd() < .5) courtyard(x, y, w, d); }
        else if (tier < 2) building(x, y, w, d, fl, { damaged: rnd() < .18, col: st.old ? pick(OLDW) : undefined, cren: st.old && rnd() < .55, arcade: st.old && rnd() < .35 });
      } else if (tier < 3 && r < pB + (1-pB)*[.6, .55, .3][tier]) courtyard(x, y, w, d);
      else if (tier === 0 && r < .96) ruinLot(x, y, w, d);
      y += d; if (rnd() < .3 && y < y1-3) y += 2;
    }
    x += w; if (rnd() < .3 && x < x1-3) x += 2;
  }
}
function bakaraBlock(x0, y0, x1, y1){
  MKT = MKT_BIG = true; try { bakaraFill(x0, y0, x1, y1); } finally { MKT = MKT_BIG = false; }
}
function bakaraFill(x0, y0, x1, y1){
  for (let j=y0;j<=y1;j++) for (let i=x0;i<=x1;i++) if (inB(i,j) && grid[idx(i,j)] === 0 && !reserved[idx(i,j)]) ground[idx(i,j)] = 4;
  for (let i=x0;i<=x1-2;i+=3){ if (shack(i, y0, 3, 2)) shopFront(i + 1.5, y0 + 2, 0); shack(i, y1-1, 3, 2); }
  for (let j=y0+3;j<=y1-4;j+=3){ shack(x0, j, 2, 3); shack(x1-1, j, 2, 3); }
  for (let j=y0+4;j<=y1-4;j+=3) for (let i=x0+3;i<=x1-3;i+=2) if (rnd() < .78) addCover('stall', i, j);
  for (let k=0;k<(x1-x0)*(y1-y0)/40;k++) addCover(pick(['crates','crates','tires','barrel','rubble']), x0+2+ri(Math.max(1,x1-x0-3)), y0+2+ri(Math.max(1,y1-y0-3)));
  MAT = M.TIN;
  const NB = () => {};   // (the loose tin canopies that floated over the aisles are gone; their draws are kept so the city stays the same)
  for (let j=y0+5;j<=y1-5;j+=6) for (let i=x0+3;i<=x1-6;i+=7) if (rnd() < .5) NB(i+2.5, 2.15, j+.5, rr(4,6), .06, rr(2,3), pick([0x8a5a3c,0x7a7a72,0x9a6a40,0x6a7a7a]), { b:0, roof:1, rx:rr(-.08,.08) });
}
/* the clearing beside the second crash site where Super 6-2 sets Gordon and Shughart down: no shacks there in any mission */
const S62_CLEAR = [[286.3,340.5],[283.9,353.9],[279.7,353.6],[264.5,351.9],[264.6,341.7],[265,335.6],[266.7,335.2],[281.4,337.5]];
function inPoly(P, x, z){ let c = false; for (let a=0, b=P.length-1; a<P.length; b=a++){ const [xa,za] = P[a], [xb,zb] = P[b]; if ((za > z) !== (zb > z) && x < (xb-xa)*(z-za)/(zb-za) + xa) c = !c; } return c; }
// the shacks and junk in the clearing are 'built' as ghosts: same random draws and the same occupied cells while the city is planned,
// so everything else comes out exactly as before; the cells are emptied once planning is over (s62Clear)
let S62_GHOSTS = [];
function shantyBlock(x0, y0, x1, y1){
  for (let j=y0;j<=y1-1;j+=3) for (let i=x0;i<=x1-2;i+=4){ const ii = i + ri(2); let ok = rnd() < .82; for (let jj=j;jj<j+2;jj++) for (let k=ii;k<ii+3;k++) if (!inB(k,jj) || reserved[idx(k,jj)]) ok = false;
    if (ok && inPoly(S62_CLEAR, ii+1.5, j+1)){ GHOST = true; if (shack(ii, j, 3, 2)) for (let jj=j;jj<j+2;jj++) for (let k=ii;k<ii+3;k++) S62_GHOSTS.push(idx(k, jj)); GHOST = false; }
    else if (ok) shack(ii, j, 3, 2); }
  for (let k=0;k<6;k++){ const kd = pick(['rubble','tires','crates','wall']), ci = x0+ri(Math.max(1,x1-x0)), cj = y0+ri(Math.max(1,y1-y0)), dr = rnd()<.5?'x':'z';
    if (inPoly(S62_CLEAR, ci+.5, cj+.5)){ GHOST = true; const o = addCover(kd, ci, cj, dr); GHOST = false; if (o) S62_GHOSTS.push(...o.cells); }
    else addCover(kd, ci, cj, dr); }
}
function s62Clear(){ for (const [o, k] of MKT_WIDE){ const k0 = o.cells[0]; if (grid[k] !== 0 || k0 == null) continue; grid[k] = grid[k0]; topH[k] = topH[k0]; cov[k] = o; o.cells.push(k); } MKT_WIDE = []; for (const k of STAD_GH){ grid[k] = 0; topH[k] = 0; cov[k] = null; } STAD_GH = []; for (const k of S62_GHOSTS){ grid[k] = 0; topH[k] = 0; cov[k] = null; } S62_GHOSTS = []; }
function streetJunk(){
  const spots = [];
  for (let n=0;n<20000;n++){ const i = ri(W), j = ri(H), k = idx(i,j); if (STR[k] && grid[k] === 0 && !reserved[k]) spots.push([i,j]); }
  for (let k=0;k<Math.min(spots.length, 1150);k++){
    const s = spots[k], p = .1 + .75*cityDs(s[0], s[1]);
    if (rnd() > p) continue;
    const kd = pick(['car','car','car','rubble','crates','tires','barrel','pickup','van','wall','bus','rubble','tires']);
    let si = s[0], sj = s[1], sd = rnd() < .5 ? 'x' : 'z'; const burnt = rnd() < .35;
    if (VEH_KIND[kd]){ const k = idx(si, sj), vr = vehRnd(si, sj);
      if (SVX[k] >= 0 && (SHZ[k] < 0 || vr() < .5)){ sd = 'z'; si = vr() < .5 ? SVX[k] : SVX[k] + SVW[k] - 1; }    // along a north-south street, against one side
      else if (SHZ[k] >= 0){ sd = 'x'; sj = vr() < .5 ? SHZ[k] : SHZ[k] + SHW[k] - 1; } }
    addCover(kd, si, sj, sd, { burnt });
  }
}

/* ---------- landmarks ---------- */
function arch(x, z){
  MAT = M.STONE; const S = 0xe8e0cc;
  for (const pz of [z-6.6, z+6.6]){ B(x, 3, pz, 4, 6, 3, S); B(x, .3, pz, 4.8, .6, 3.6, shade(S,.9)); B(x, 5.7, pz, 4.4, .3, 3.3, shade(S,.94));
    B(x, 2.6, pz + (pz < z ? 1.52 : -1.52), 1.2, 3.2, .06, shade(S,.86)); B(x, 3, pz, 4.06, .2, 3.06, shade(S,.92)); }
  B(x, 6.7, z, 4.2, 1.8, 16.2, S); B(x, 7.75, z, 4.6, .3, 16.8, shade(S,.9)); B(x, 8.8, z, 3.6, 1.8, 12.6, S); B(x, 9.8, z, 3.9, .25, 13, shade(S,.9));
  B(x, 6.0, z, 3.9, .25, 10.2, shade(S,.82)); for (let k=-2;k<=2;k++) B(x + 2.12, 8.8, z + k*2.4, .06, 1.1, 1.6, shade(S,.84));
  for (let k=-2;k<=2;k++) B(x - 2.12, 8.8, z + k*2.4, .06, 1.1, 1.6, shade(S,.84));
}
/* the old gate at the mouth of the alley north of the Super 6-1: a thick, worn wall with a tall pointed arch and two blind arches,
   as the Rangers saw it looking through to the crash site */
const ARCH = { x0:367.2, x1:373.8, z0:287.6, z1:289.6, cx:370.5, a:1.55, s:1.75, t:3.05, top:3.9, py:.95 };
function archGate(){
  // it fills the gap between the two houses at the mouth of the alley: its piers are built into their corners, the arch spans the passage
  const A = ARCH, th = A.z1 - A.z0, zc = (A.z0 + A.z1)/2;
  const hole = (cx, a, s, t, x) => { const u = Math.abs(x - cx)/a; return u >= 1 ? 0 : s + (t - s)*Math.pow(1 - u, .55); };
  const pier = x => x < A.x0 + A.py*1.7 || x > A.x1 - A.py*1.7;
  MAT = M.STONE;
  for (let x=A.x0; x<A.x1 - .01; x+=.15){ const xm = x + .075, h = hole(A.cx, A.a, A.s, A.t, xm);
    const top = (pier(xm) ? A.top + .35 : A.top) + (vnoise(xm*1.7, 7.1) - .5)*.28;
    const col = shade(0xb3a284, .9 + vnoise(xm*.9, 3.3)*.2);
    B(xm, (h + top)/2, zc, .16, top - h, pier(xm) ? th + .3 : th, col);
    if (!h) B(xm, .3, zc, .16, .6, th + (pier(xm) ? .46 : .16), shade(col, .78));          // dirty plinth
  }
  for (const f of [A.z0 - (A.py ? .2 : .05), A.z1 + .2]){
    // the arch ring standing proud, a moulded band, worn caps on the piers
    for (let x=A.cx - A.a - .3; x<=A.cx + A.a + .3; x+=.11){ const h = hole(A.cx, A.a + .3, A.s, A.t + .3, x); if (h) B(x, h - .12, f, .12, .28, .12, 0x9c8c6e); }
    B(A.cx, A.top - .45, f, A.x1 - A.x0 - 2.6, .14, .1, 0x9c8c6e);
    for (const px of [A.x0 + .8, A.x1 - .8]){ B(px, A.top + .45, f + (f < zc ? .15 : -.15), 1.75, .2, .5, 0xa89878);
      for (let x=px - .3; x<=px + .3; x+=.1){ const h = hole(px, .3, 1.5, 2.05, x); if (h) B(x, h/2 + .7, f, .11, h - 1.4 + .2, .06, 0x2c2620); } }   // a small blind niche on each pier
    for (let k=0;k<5;k++){ const x = A.x0 + .3 + rnd()*(A.x1 - A.x0 - .6), y = .7 + rnd()*2.8; if (hole(A.cx, A.a + .2, A.s, A.t + .2, x) > y - .4) continue;
      B(x, y, f, rr(.25, .8), rr(.2, .55), .05, pick([0x8a7a5e, 0x7a6a50, 0xc0b090, 0x6a5a44])); }
  }
  MAT = M.CONC; for (let k=0;k<6;k++) B(A.cx + rr(-1.4, 1.4), .1, A.z0 - rr(.6, 2.4), rr(.2, .5), rr(.1, .25), rr(.2, .45), pick([0xa89878, 0x8a7a62, 0xb8aa90]), { ry:rnd()*3 });
  // only the piers inside the alley block the way and the view; the houses either side keep their own height
  for (let j=Math.floor(A.z0); j<=Math.floor(A.z1 - .01); j++) for (const i of [368, 372]){ if (!inB(i,j)) continue; const k = idx(i,j); grid[k] = 1; topH[k] = Math.max(topH[k], A.top); }
}
function k4(){
  MAT = M.STONE;
  B(330, 4.95, 410, 1.1, 7, 1.1, 0xe8e2d2); B(330, 1.3, 410, 1.5, .5, 1.5, 0xd8d0be); B(330, 8.85, 410, 1.5, .8, 1.5, 0xd8d0be); B(330, 9.85, 410, .5, 1.2, .5, 0xc89a40, { m:M.METAL });
  for (let k=0;k<6;k++){ const a = k/6*Math.PI*2; palm(330 + Math.cos(a)*7, 410 + Math.sin(a)*7, rr(3.6,4.6)); }
}
function mosqueTop(x, y, w, d, top){
  MAT = M.PLASTER; const cx = x + w/2, cz = y + d/2;
  C(cx, top + .25, cz, w*.32, .5, 0xe8e2d4, { roof:1, b:0 });
  D(cx, top + .5, cz, w*.62, w*.42, w*.62, pick([0xe8e2d4, 0x5a8a8a, 0xd8c890]), { roof:1, b:0 });
  const mx = x + .9, mz = y + .9;
  C(mx, top + 3.5, mz, .55, 7, 0xf0ece0, { roof:1, b:0 }); C(mx, top + 6.2, mz, .8, .25, 0xe0dace, { roof:1, b:0 });
  C(mx, top + 7.3, mz, .38, 1.8, 0xf0ece0, { roof:1, b:0 }); D(mx, top + 8.2, mz, .8, .7, .8, 0x5a8a8a, { roof:1, b:0 });
}
function stadium(){
  const { x:cx, z:cz, rx, rz } = STADIUM, n = 72;
  MAT = M.CONC;
  for (let k=0;k<n;k++){
    const a = (k+.5)/n*Math.PI*2;
    if ([0, Math.PI, Math.PI*1.5, Math.PI*2].some(g => Math.abs(a - g) < .09) || Math.abs(a - Math.PI/2) < .17) continue;
    const ca = Math.cos(a), sa = Math.sin(a), tx = -sa*rx, tz = ca*rz, tl = Math.hypot(tx, tz), ry = Math.atan2(-tz, tx);
    const seg = tl*Math.PI*2/n*1.04;
    for (let t=0;t<4;t++){ const f = .8 + t*.055; B(cx + ca*rx*f, .45 + t*.75, cz + sa*rz*f, seg, .9 + t*.75 - t*.5, 1.9, shade(0xc4bcaa, 1 - t*.03), { ry }); }
    B(cx + ca*rx*1.0, 1.9, cz + sa*rz*1.0, seg, 3.8, .45, 0xb8b0a0, { ry });
    if (k % 3 === 0) B(cx + ca*rx*.86, 2.4, cz + sa*rz*.86, seg*.8, .08, .9, pick([0x3a6a8a,0xb0a890,0x8a3a2a]), { ry, m:M.GEN });
  }
  for (const [ax, az] of [[.74,.7],[-.74,.7],[.74,-.7],[-.74,-.7]]){ const x = cx + ax*rx, z = cz + az*rz; MAT = M.METAL;
    B(x, 6, z, .5, 12, .5, 0x8a8a84, { hid:1 }); prop('lights', 'flood', x, 0, z, Math.atan2(az, -ax) + Math.PI, 1, 0xffffff); }   // lamps face the pitch
  // Pakistani UN base on the pitch: tents, white vehicles, sandbagged gates
  MAT = M.CLOTH;
  for (let r=0;r<3;r++) for (let c=0;c<5;c++){ const x = cx - 14 + c*6, z = cz - 8 + r*7; B(x, .7, z, 4.2, 1.4, 3, 0xc8b88a, { hid:1 }); B(x, 1.55, z, 4.3, .5, 2.2, 0xb8a87a, { rx:0, hid:1 }); stadTent(x, z, (r + c) % 2); }
  // the vehicle park: the white UN armour and lorries in a row along the east side, a lorry and Humvees by the north stand
  const par = CUR ? CUR.group : world, at = (g, x, z, ry) => { g.position.set(x, 0, z); g.rotation.y = ry; if (g.parent !== par) par.add(g); };
  at(btrVehicle().g, cx + 21, cz - 11.5, -PH); at(unApc().g, cx + 21, cz - 6, -PH); at(m939White(), cx + 21, cz, -PH); at(unApc().g, cx + 21, cz + 5.5, -PH);
  at(m939White(), cx + 6, cz - 15.5, PH);
  stadVeh(cx - 6, cz - 16, 0, Math.PI*.1); stadVeh(cx - 1.5, cz - 16.4, 2, -Math.PI*.06);
  for (const [gx, gz, ax] of [[cx + rx + 1, cz, 'z'], [cx - rx - 1, cz, 'z'], [cx, cz + rz + 1, 'x'], [cx, cz - rz - 1, 'x']]) for (let k=-1;k<=1;k++){
    const i = Math.floor(gx + (ax === 'x' ? k*2 + 3 : 2)), j = Math.floor(gz + (ax === 'z' ? k*2 + 3 : 2)); addCover('sandbag', i, j, ax); }
  rnd(); rnd();   // the two flags that stood here (their draws kept)
}
function stadTent(x, z, r){
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = r ? Math.PI : 0; (CUR ? CUR.group : world).add(g);
  withModel('tent', M_ => { const q = lodMesh(M_.geos.body, M_.mat); q.scale.setScalar(.56/1.5); q.castShadow = true; q.receiveShadow = true; g.add(q); });
}
// the Humvee model with its turret ring and gun cut away (every triangle above the cab roof)
let HMV_BARE = null;
function humveeBare(M_){
  if (HMV_BARE) return HMV_BARE;
  const src = M_.geos.body, P_ = src.attributes.position, I_ = src.index.array, out = [];
  for (let t=0;t<I_.length;t+=3){ const y = Math.max(P_.getY(I_[t]), P_.getY(I_[t+1]), P_.getY(I_[t+2])); if (y < 2.0) out.push(I_[t], I_[t+1], I_[t+2]); }   // keeps the roof, drops only the radio mast
  const g = new T.BufferGeometry(); for (const k in src.attributes) g.setAttribute(k, src.attributes[k]); g.setIndex(out); g.computeBoundingSphere();
  return (HMV_BARE = g);
}
function stadVeh(x, z, k, dry){
  const truck = k === 1 || k === 3, par = CUR ? CUR.group : world;
  if (truck){ const g = m939Covered(); g.position.set(x, 0, z); g.rotation.y = Math.PI/2 + (dry || 0); par.add(g); return; }
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI/2 + (dry || 0); g.scale.setScalar(1/1.5); par.add(g);
  withModel('humvee', M_ => { const q = lodMesh(humveeBare(M_), M_.mat); q.castShadow = true; q.receiveShadow = true; g.add(q); });
}
/* crashed Black Hawks, built from the real model when it is loaded */
let WRECKS = {}, WRECK_G = {};
const crashed = k => !!(MIS && MIS.crashed && MIS.crashed.includes(k)) || !!WRECKS[k];
function wreck(x, z, ry, s64){
  WRECKS[s64 ? 's64' : 's61'] = true;
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
  const inner = new T.Group(); g.add(inner); inner.scale.setScalar(1/1.5); WRECK_G[s64 ? 's64' : 's61'] = { g, inner };
  if (s64){ inner.rotation.set(.06, 0, .1); inner.position.y = -.15; } else { inner.rotation.set(.12, 0, 1.3); inner.position.set(-.4, 1.05, 0); }
  const fill = () => {
    const { geos, mat } = heliAsset;
    for (const n of ['Fuselage', 'Door open']){ const m = lodMesh(geos[n], mat); m.castShadow = m.receiveShadow = true; inner.add(m); }
    const r = new T.Mesh(geos['main rotor prop'], mat); r.castShadow = true;
    if (s64){ r.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]); r.rotation.set(0, .7, 0); inner.add(r); }
    else { r.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]); r.rotation.set(0, .5, 0); inner.add(r); }   // still on its hub, the helicopter lying on its side
    const t = new T.Mesh(geos['TAIL ROTOR'], mat); t.position.set(HELI_TAIL[0], HELI_TAIL[1], HELI_TAIL[2]); t.rotation.x = .6; inner.add(t);
  };
  if (heliAsset) fill(); else heliWaiters.push(fill);
  MAT = M.METAL;
  if (s64) GHOST = true;   // the 6-4 lies among rubble laid out by its mission instead: the plates are drawn for the random sequence only
  for (let k=0;k<14;k++){ const a = rnd()*6.28, d = rr(1.5, 6); B(x + Math.cos(a)*d, .06, z + Math.sin(a)*d, rr(.2,.8), rr(.04,.12), rr(.2,.6), pick([0x3d4235,0x2a2c28,0x1c1c1a,0x6a6a64]), { ry:rnd()*3 }); }
  GHOST = false;
  emitters.push({ x, z, y:1.2, rate:30, life:9, vy:1.2, s0:.35, s1:1.8, fire:s64 ? .25 : .4, acc:0, sp:.6 });
  const cells = [], o = { kind:'wreck', val:.8, cells, i:Math.floor(x), j:Math.floor(z), g:null };
  for (let j=Math.floor(z)-2;j<=Math.floor(z)+2;j++) for (let i=Math.floor(x)-2;i<=Math.floor(x)+2;i++){ if (!walk(i,j)) continue; if (Math.hypot(i+.5-x, j+.5-z) > 2.6) continue; const k = idx(i,j); cells.push(k); grid[k] = 2; cov[k] = o; topH[k] = 1.6; }
}
function parkedHeli(x, z, ry){
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(1/1.5); (CUR ? CUR.group : world).add(g);
  const fill = () => { const { geos, mat } = heliAsset;
    for (const n of ['Fuselage', 'Door open']){ const m = lodMesh(geos[n], mat); m.castShadow = true; g.add(m); }
    const r = new T.Mesh(geos['main rotor prop'], mat); r.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]); r.rotation.y = rnd()*1.5; r.castShadow = true; g.add(r);
    const t = new T.Mesh(geos['TAIL ROTOR'], mat); t.position.set(HELI_TAIL[0], HELI_TAIL[1], HELI_TAIL[2]); g.add(t); };
  if (heliAsset) fill(); else heliWaiters.push(fill);
}
function littleBird(){
  const g = new T.Group(), body = [], K = 0x1a1a1a, proc = new T.Group(); g.add(proc); REFL.push(g);
  body.push([1.5,1.3,2.2, 0,1.15,.2, K, 0,0,0,'s'], [.5,.5,4.2, 0,1.35,-2.6, K, Math.PI/2,0,0,'c'], [1.25,.7,1.3, 0,1.2,1.05, 0x2a3a44, 0,0,0,'s']);
  body.push([.07,.07,2.6, .55,.25,.2, 0x2a2a28], [.07,.07,2.6, -.55,.25,.2, 0x2a2a28], [.05,.6,.05, .5,.55,.7, 0x2a2a28, 0,0,-.4], [.05,.6,.05, -.5,.55,.7, 0x2a2a28, 0,0,.4],
    [.05,.6,.05, .5,.55,-.4, 0x2a2a28, 0,0,-.4], [.05,.6,.05, -.5,.55,-.4, 0x2a2a28, 0,0,.4], [.08,.9,.6, 0,1.9,-4.6, K], [1.1,.06,.4, 0,1.45,-4.4, K]);
  body.push([.12,.12,.9, .9,1.0,.4, 0x3a3a38, Math.PI/2,0,0,'c'], [.12,.12,.9, -.9,1.0,.4, 0x3a3a38, Math.PI/2,0,0,'c'], [.5,.08,.08, .7,1.0,.4, 0x2a2a28], [.5,.08,.08, -.7,1.0,.4, 0x2a2a28]);
  const m = new T.Mesh(partGeo(body), heliMat); m.castShadow = true; proc.add(m);
  const rotor = new T.Group(); rotor.position.set(0, 2.05, .1); g.add(rotor);
  const RB = [[.3,.25,0, 0,0,0, K, 0,0,0,'c']]; for (let k=0;k<5;k++){ const a = k/5*Math.PI*2; RB.push([4.2,.04,.22, Math.cos(a)*2.1,0,-Math.sin(a)*2.1, 0x222222, 0,a,0]); }
  const prm = new T.Mesh(partGeo(RB), heliMat); rotor.add(prm);
  const tail = new T.Group(); g.add(tail);
  g.scale.setScalar(1/1.5);
  // the two pilots in the cockpit: the Delta model, unarmed, hands on the cyclic and the collective
  const pilots = [];
  const seatPilots = () => [-1, 1].forEach(sd => { const r = buildRig('delta', { gun:'car', pilot:true }); r.gun.visible = false;
    r.root.scale.setScalar(1.5); r.root.position.set(sd*.36, .45, -.14); if (r.model) r.pelvis.position.y = .52/SOLD_K;
    r.hipL.rotation.x = r.hipR.rotation.x = -1.62; r.knL.rotation.x = r.knR.rotation.x = 1.32; r.chest.rotation.x = -.08; r.hipL.rotation.z = .08; r.hipR.rotation.z = -.08;
    r.shR.rotation.x = -.75; r.elR.rotation.x = -.85; r.shL.rotation.x = -.55; r.elL.rotation.x = -1.0; r.shL.rotation.z = .12; r.neck.rotation.y = sd*-.12;
    g.add(r.root); pilots.push(r); });
  // the uploaded AH-6 model (miniguns and rocket pods) replaces the stand-in as soon as it loads
  withModel('mh6', M_ => {
    const add = (geo, par) => { const q = lodMesh(geo, M_.mat); q.castShadow = true; q.receiveShadow = true; par.add(q); return q; };
    proc.visible = false; prm.visible = false; seatPilots();   // (here, once the model is in: by then the soldier rigs can be built)
    add(M_.geos.body, g); const gl = add(M_.geos.glass, g);
    gl.material = LB_GLASS || (LB_GLASS = new T.MeshPhongMaterial({ color:0x1e2124, specular:0x5a5e62, shininess:70, side:T.DoubleSide }));
    rotor.position.set(LB_HUB[0], LB_HUB[1], LB_HUB[2]); add(M_.geos.rotor, rotor);
    tail.position.set(LB_TAIL[0], LB_TAIL[1], LB_TAIL[2]); add(M_.geos.tail, tail);
  });
  return { g, rotor, tail, pilots };
}
let LB_GLASS = null;
function rb(u, v, y, su, sy, sv, c, o){ const p = AIRP(u, v); B(p[0], y, p[1], su, sy, sv, c, Object.assign({ ry:AIR_RY }, o || {})); }
/* ---------- small block houses: the outskirts, the villages and the scattered farms share one style ---------- */
function smallHouse(x, z, opt){
  opt = opt || {};
  const w = rr(3, 5.4), d = rr(2.6, 4), h = rr(1.25, 1.7), c = pick(WALLS), ry = pick([0, Math.PI/2]) + (opt.rot ? rr(-.3, .3) : 0);
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const P = (lx, y, lz, sx, sy, sz, col, ex) => B(x + lx*cs + lz*sn, y, z - lx*sn + lz*cs, sx, sy, sz, col, Object.assign({ ry }, ex || {}));
  MAT = M.PLASTER;
  P(0, h/2, 0, w, h, d, c); P(0, h*.17, 0, w + .02, h*.34, d + .02, shade(c, .78));
  if (rnd() < .5) P(0, h + .05, 0, w + .14, .1, d + .14, shade(c, .92), { m:M.CONC });
  else P(0, h + .14, 0, w + .45, .07, d + .55, pick([0x8a5a3c, 0x7a7a72, 0x9a6a40, 0x6a6e70]), { m:M.TIN, rx:.1 });
  P(-w*.2, .52, d/2 + .03, .55, 1.0, .05, pick([0x3a5a6a, 0x5a3a2a, 0x2a4a3a, 0x7a3a2a]), { m:M.WOOD });
  P(w*.24, .9, d/2 + .03, .45, .4, .05, 0x2b2925, { m:M.GLASS }); if (rnd() < .6) P(w/2 + .03, .9, 0, .05, .4, .45, 0x2b2925, { m:M.GLASS });
  if (opt.wall !== false && rnd() < .62){
    const mw = w/2 + rr(1.6, 3), md = d/2 + rr(1.6, 3), wc = shade(pick(WALLS), .95), wh = rr(.8, 1.1);
    P(0, wh/2, -md, mw*2, wh, .2, wc); P(-mw, wh/2, 0, .2, wh, md*2, wc); P(mw, wh/2, 0, .2, wh, md*2, wc);
    P(-mw/2 - .7, wh/2, md, mw - 1.4, wh, .2, wc); P(mw/2 + .7, wh/2, md, mw - 1.4, wh, .2, wc);
    if (rnd() < .35) P(mw - 1, .4, -md + 1, .7, .8, .7, pick([0x3d5a80, 0x5e6b3a, 0x8a3a2a]), { m:M.METAL });
  }
  if (rnd() < .28) acacia(x + rr(-6, 6), z + rr(-6, 6), rr(.7, 1.1));
}

/* ---------- street lamps (few, many broken), fire barrels, lit windows: the city's own light at night ---------- */
let LIGHTSRC = [], GLOWS = [], glowMesh = null;
function lamp(x, z, ry, on){
  MAT = M.METAL; const s = Math.sin(ry), c = Math.cos(ry);
  B(x, 2.6, z, .16, 5.2, .16, 0x5a5a56, { hid:1 });
  prop('lights', 'lamp', x, 0, z, ry, 1, 0xffffff);
  const hx = x + s*.98, hz = z + c*.98;
  if (on){ GLOWS.push([hx, 4.79, hz, 0xffc27a, .2, .05, .34]); LIGHTSRC.push({ x:hx, y:4.4, z:hz, col:0xffb36a, i:2.4, d:12, fl:0, lamp:1 }); }
}
function fireBarrel(i, j){
  if (!walk(i, j)) return;
  const o = addCover('barrel', i, j); if (!o) return;
  const em = { x:i+.5, z:j+.5, y:1.25, rate:16, life:8, vy:1.15, s0:.24, s1:1.8, fire:.45, acc:0, sp:.24 };
  em.lsrc = true; emitters.push(em); const ls = { x:i+.5, y:1.5, z:j+.5, col:0xff7428, i:2.6, d:9, fl:1 }; LIGHTSRC.push(ls);
  o.em = em; o.ls = ls;
}
function planLights(){
  const along = (vert, fixed, a, b, step, side) => { for (let t=a; t<=b; t+=step){ const x = vert ? fixed : t, z = vert ? t : fixed, i = Math.floor(x), j = Math.floor(z);
    if (!inB(i,j) || grid[idx(i,j)] !== 0 || cityDs(x, z) < .4 || coastS(x, z) > -27) continue; lamp(x, z, side, rnd() < .62); } };
  along(true, MILE_X - 3.6, 100, 405, 17, Math.PI/2); along(true, OX + 28.6, 12, H - 12, 22, Math.PI/2); along(false, OZ + 27.6, 12, W - 12, 23, 0); along(false, 317.6, 30, W - 12, 24, 0); along(true, 289.6, 40, 480, 26, Math.PI/2); along(false, 217.6, 20, 500, 26, 0);
  const spots = [];
  for (let n=0;n<6000 && spots.length<130;n++){ const i = 20 + ri(W-40), j = 20 + ri(H-40), k = idx(i,j);
    if (!STR[k] || grid[k] !== 0 || reserved[k] || cityDs(i, j) < .3) continue; if (spots.some(p => Math.hypot(p[0]-i, p[1]-j) < 13)) continue; spots.push([i, j]); }
  for (const [i, j] of spots) fireBarrel(i, j);
  for (const [i, j] of [[39,31],[33,22],[36,41],[20,27]]) fireBarrel(OX + i, OZ + j);
}
function buildGlows(){
  if (!GLOWS.length) return;
  glowMesh = new T.InstancedMesh(new T.BoxGeometry(1,1,1), new T.MeshBasicMaterial({ color:0xffffff, fog:false }), GLOWS.length);
  glowMesh.frustumCulled = false;
  GLOWS.forEach((g, k) => { dummy.position.set(g[0], g[1], g[2]); dummy.rotation.set(0,0,0); dummy.scale.set(g[4], g[5], g[6]); dummy.updateMatrix(); glowMesh.setMatrixAt(k, dummy.matrix); glowMesh.setColorAt(k, tmpCol.setHex(g[3])); });
  world.add(glowMesh);
}

/* ---------- the airport: Task Force Ranger's base ---------- */
let C130_GEO = null;
function c130Geo(){
  if (C130_GEO) return C130_GEO;
  const L = [], gc = 0x7c837f, dk = 0x5a615c;
  L.push([3.2, 15, 0, 0, 2.6, 0, gc, PH, 0, 0, 'c']);
  L.push([3.2, 3.0, 3.6, 0, 2.55, 8.3, gc, 0, 0, 0, 's']);
  L.push([3.2, 6.2, 0, 0, 3.0, -10.6, gc, -PH, 0, 0, 'c', .42]);
  L.push([2.0, .55, 1.1, 0, 3.55, 9.0, 0x1c2830, -.45]);
  L.push([27, .38, 2.9, 0, 4.25, 1.0, gc]); L.push([26, .12, .5, 0, 4.25, -.55, dk]);
  for (const s of [-1, 1]) for (const e of [4.6, 8.7]){
    L.push([1.15, 3.3, 0, s*e, 3.85, 2.7, dk, PH, 0, 0, 'c']); L.push([.5, .5, .5, s*e, 3.85, 4.4, 0x2a2a2a, 0, 0, 0, 's']);
    L.push([3.6, .07, .24, s*e, 3.85, 4.5, 0x232323, 0, 0, .35]); L.push([3.6, .07, .24, s*e, 3.85, 4.5, 0x232323, 0, 0, -1.22]);
  }
  L.push([.35, 4.8, 4.4, 0, 5.6, -11.6, gc]); L.push([10.5, .25, 2.7, 0, 4.0, -12.1, gc]);
  for (const s of [-1, 1]){ L.push([.95, 1.25, 4.8, s*1.85, 1.45, .4, dk]); L.push([.9, .45, 0, s*1.85, .45, -.4, 0x1a1a1a, 0, 0, PH, 'c']); L.push([.9, .45, 0, s*1.85, .45, 1.2, 0x1a1a1a, 0, 0, PH, 'c']); }
  L.push([.6, .5, 0, 0, .35, 7.4, 0x1a1a1a, 0, 0, PH, 'c']); L.push([.12, 1.4, .12, 0, 1.0, 7.4, dk]);
  L.push([2.8, .06, 1.4, 0, 2.6, -13.2, 0x2a2e2c]);
  C130_GEO = partGeo(L); return C130_GEO;
}
function c130(u, v){
  const p = AIRP(u, v), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = AIR_RY; (CUR ? CUR.group : world).add(g);
  const m = new T.Mesh(c130Geo(), heliMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // the uploaded Hercules model (40 m wingspan) replaces the stand-in when it arrives
  if (CUR) CUR.ext = Math.max(CUR.ext || 0, 22);
  withModel('c130', M_ => { m.visible = false; const q = lodMesh(M_.geos.body, M_.mat); q.scale.setScalar(1.39); q.castShadow = true; q.receiveShadow = true; g.add(q); });
}
function truck(u, v, kind){
  MAT = M.METAL; const tan = pick([0xb8a47c, 0xa89a6e, 0x6a6a4a]);
  rb(u, v + 2.6, 1.2, 2.3, 1.5, 1.7, tan); rb(u, v + 3.6, .9, 2.2, .8, .6, shade(tan,.9)); rb(u, v + 3.0, 1.55, 2.0, .5, .08, 0x2c3a44, { m:M.GLASS });
  if (kind === 'fuel'){ const p = AIRP(u, v - 1.2); Cs(p[0], 1.6, p[1], 2.1, 5.2, 2.1, 0xc8c4b8, { rx:PH, ry:AIR_RY, ord:'YXZ', m:M.METAL }); }
  else { rb(u, v - 1.2, .95, 2.3, .3, 5.2, shade(tan,.85)); rb(u, v - 1.2, 1.75, 2.3, 1.3, 5.0, pick([0x6a6448, 0x8a7a54]), { m:M.CLOTH }); }
  for (const k of [3.0, -.4, -2.4]) for (const s of [-1.05, 1.05]){ const q = AIRP(u + s, v + k); C(q[0], .45, q[1], .45, .35, 0x1d1c1a, { rx:PH, ry:AIR_RY + PH, ord:'YXZ', m:M.WHEEL }); }
}
function tentM(u, v, r){
  const p = AIRP(u, v), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = AIR_RY + (r % 2 ? Math.PI : 0); (CUR ? CUR.group : world).add(g);
  withModel('tent', M_ => { const q = lodMesh(M_.geos.body, M_.mat); q.scale.setScalar(1/1.5); q.castShadow = true; q.receiveShadow = true; g.add(q); });
}
function hangarJ(u, v){
  if (CUR) CUR.ext = Math.max(CUR.ext || 0, 30);            // 50 m long: it reaches into the next chunks
  const p = AIRP(u, v), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = AIR_RY; (CUR ? CUR.group : world).add(g);
  // concrete apron in front of the doors while the model streams in
  MAT = M.CONC; rb(u, v + 27, .02, 30, .04, 6, 0x9a968c);
  withModel('hangar', M_ => { M_.mat.color.setRGB(1.38, 1.34, 1.24); const q = lodMesh(M_.geos.body, M_.mat); q.scale.setScalar(1/1.8); q.castShadow = true; q.receiveShadow = true; g.add(q); });
}
function hangar(u, v, L, Wd, col){
  MAT = M.METAL; rb(u, v, 3.2, L, 6.4, Wd, col);
  const p = AIRP(u, v); Cs(p[0], 6.4, p[1], Wd, L, Wd*.55, shade(col, .95), { rx:PH, ry:AIR_RY + PH, ord:'YXZ', m:M.METAL });
  for (let k=-2;k<=2;k++) rb(u + k*L/5.2, v, 6.4 + Wd*.275 - .05, .25, .12, Wd*.5, shade(col, .8));
  rb(u, v + Wd/2 + .02, 3.0, L*.7, 6, .2, 0x1c1c1a, { m:M.GEN }); rb(u, v + Wd/2 + .1, 6.2, L*.74, .4, .4, 0x7a7a74, { m:M.METAL });
}
function guardTower(u, v){   // the uploaded guard tower; hidden boxes give its platform and posts to the bullets
  MAT = M.WOOD; for (const [a, b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) rb(u + a*1.2, v + b*1.2, 2.3, .2, 4.6, .2, 0x5a4a38, { hid:1 });
  rb(u, v, 4.7, 3.2, .3, 3.2, 0x6a5a44, { hid:1 });
  const p = AIRP(u, v); prop('kit3', 'gtow', p[0], 0, p[1], AIR_RY + Math.round(phs(u, v, 23)*4)*PH, 1, 0xffffff);
}
// the base's barriers: lines of filled bastions (the uploaded sandbag barrier), three to each 2.3 m bay, square to the line
function jersey(u, v, n, along){ MAT = M.BAG; for (let k=0;k<n;k++){ const uu = along ? u + k*2.3 : u, vv = along ? v : v + k*2.3;
  rb(uu, vv, .35, along ? 2.2 : .73, .69, along ? .73 : 2.2, 0xa89a7a, { hid:1 });
  for (let q=-1;q<=1;q++){ const pu = uu + (along ? q*.735 : 0), pv = vv + (along ? 0 : q*.735), p = AIRP(pu, pv), h = phs(pu, pv, 72);
    prop('deco8', 'hesco', p[0], 0, p[1], AIR_RY + (h - .5)*.06, 1, 0xffffff); } } }
function wire(u0, u1, v){ MAT = M.METAL; const a = AIRP((u0+u1)/2, v); Cs(a[0], .45, a[1], .8, Math.abs(u1-u0), .8, 0x4a4a46, { rx:PH, ry:AIR_RY + PH, ord:'YXZ' }); }
/* ---------- the Task Force Ranger base, laid out on the user's plan (airport frame: u along the runway, v toward it) ---------- */
const RWY = { L:210, W:12 };                            // runway half length and half width
const BASE = { u0:-195, u1:195, v0:-185, v1:-16, gateV:-105 };
const APRON = { u0:-185, u1:185, v0:-118, v1:-30 };
const JOINS = [-172, 0, 162];                           // taxiway links from the apron to the runway
const BHROW = { u:-155, v:-72, n:8, step:13, fly:4 };   // Black Hawks side by side, noses to the runway, as in the film; the first six fly the mission
const LBROW = { u:-150, v:-46, n:6, step:8, fly:4 };   // Little Birds in a row in front of them
const C130S = [[55,-48],[90,-48],[125,-48]];
const TENTB = [[-70,-145],[-36,-145]];                  // two blocks of four tents
const TENTA = { u0:-92, u1:-14, v0:-172, v1:-118 };      // the tent lines: packed earth and rutted dirt streets
const TAXI_V = -95;                                     // the apron taxilane
function wireV(v0, v1, u){ MAT = M.METAL; const a = AIRP(u, (v0+v1)/2); Cs(a[0], .45, a[1], .8, Math.abs(v1-v0), .8, 0x4a4a46, { rx:PH, ry:AIR_RY, ord:'YXZ' }); }
/* M2 on a ring mount with the gunner standing in the hatch (metres, nose toward +z, roof at 1.70) */
let GUNNER_GEO = null;
function gunnerGeo(){
  if (GUNNER_GEO) return GUNNER_GEO;
  const L = [], R0 = 1.70, z0 = -.35, DCU_ = 0xc8b48c, VEST = 0x56653a, SKIN = 0xb98a62, GUN = 0x22221f;
  L.push([.95, .1, 0, 0, R0 + .05, z0, 0x3a3d30, 0,0,0, 'c']);                         // ring mount
  L.push([.9, .32, .06, 0, R0 + .22, z0 + .5, 0x4a4f3a]);                               // low shield plate
  L.push([.07, .55, .07, 0, R0 + .3, z0 + .32, GUN]);                                   // pedestal
  L.push([.22, .2, .72, 0, R0 + .62, z0 + .38, GUN]);                                   // M2 receiver
  L.push([.09, .24, 0, 0, R0 + .64, z0 + .86, 0x2c2c28, PH,0,0, 'c']);                   // barrel jacket
  L.push([.05, .5, 0, 0, R0 + .64, z0 + 1.2, GUN, PH,0,0, 'c']);                        // barrel (short)
  L.push([.08, .07, .09, 0, R0 + .64, z0 + 1.46, GUN]);                                 // muzzle
  L.push([.18, .2, .3, .2, R0 + .55, z0 + .32, 0x4e5a36]);                              // ammo can
  for (const s of [-1, 1]) L.push([.04, .14, .04, s*.07, R0 + .6, z0 + .0, GUN]);       // spade grips
  // gunner, from the waist up, leaning into the gun
  L.push([.42, .5, .27, 0, R0 + .25, z0 - .22, DCU_, -.12]);                            // torso
  L.push([.46, .4, .3, 0, R0 + .33, z0 - .2, VEST, -.12]);                              // vest
  L.push([.11, .1, .11, 0, R0 + .62, z0 - .17, SKIN]);                                   // neck
  L.push([.22, .26, .24, 0, R0 + .78, z0 - .14, SKIN, 0,0,0, 's']);                      // head
  L.push([.29, .2, .31, 0, R0 + .86, z0 - .15, VEST, 0,0,0, 'h']);                       // helmet
  L.push([.28, .03, .07, 0, R0 + .8, z0 - .02, 0x111111]);                               // goggles
  for (const s of [-1, 1]){ L.push([.1, .38, .1, s*.2, R0 + .44, z0 - .03, DCU_, -.95]); L.push([.09, .32, .09, s*.13, R0 + .52, z0 + .16, DCU_, -1.45]); }
  GUNNER_GEO = partGeo(L); return GUNNER_GEO;
}
const BASE_CONVOY = []; BASE_CONVOY.hide = false;
function baseConvoyShow(on){ BASE_CONVOY.hide = !on; for (const o of BASE_CONVOY) o.visible = on; }
/* the M2 on its turret ring, the whole of it turning, with a Ranger in the hatch: built in the Humvee's own metres, roof at 1.70 */
const HMV_RING = { y:1.70, z:-.35 };
function hmvTurret(par){
  const t = new T.Group(); t.position.set(0, HMV_RING.y + .012, HMV_RING.z); par.add(t);
  withModel('kit3', M_ => { const m = new T.Mesh(M_.geos.m2t, propMat('kit3', M_)); m.castShadow = true; m.receiveShadow = true; t.add(m); });
  const r = buildRig('ranger', { gun:'m16' }); r.gun.visible = false; r.root.scale.setScalar(1.5);
  r.root.position.set(0, -.89, -.32); r.root.rotation.y = 0;
  r.chest.rotation.x = .12; r.neck.rotation.x = -.1;
  r.shR.rotation.x = -1.05; r.shR.rotation.z = -.18; r.elR.rotation.x = -.75;
  r.shL.rotation.x = -1.05; r.shL.rotation.z = .18; r.elL.rotation.x = -.75;
  r.hipL.rotation.x = r.hipR.rotation.x = -.05;
  t.add(r.root); t.userData.rig = r;
  return t;
}
function humveeAt(u, v, ry){
  const p = AIRP(u, v), g = new T.Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = ry; g.scale.setScalar(1/1.5); (CUR ? CUR.group : world).add(g);
  hmvTurret(g);
  withModel('humvee', M_ => { const q = lodMesh(humveeBare(M_), M_.mat); q.castShadow = true; q.receiveShadow = true; g.add(q); });
  return g;
}
/* M813 5-ton cargo truck: long hood, open cab with canvas top, three axles, canvas over the bed (metres, nose toward +z) */
let M813_GEO = null;
function m813Geo(){
  if (M813_GEO) return M813_GEO;
  const L = [], OD_ = 0x4e5638, OD2 = 0x434a30, CAN = 0x6a6a4a, BLK_ = 0x1c1c1a, GL = 0x23292c;
  L.push([.95, .25, 7.2, 0, .95, -.2, 0x2a2a26]);                                        // frame rails
  for (const [z, w] of [[2.55, .34], [-1.55, .62], [-2.95, .62]]) for (const s of [-1, 1]){
    L.push([1.12, w, 0, s*(1.24 - w/2 + .17), .56, z, BLK_, 0,0,PH, 'c']);
    L.push([.55, w + .02, 0, s*(1.24 - w/2 + .17), .56, z, 0x3a3d30, 0,0,PH, 'c']); }
  L.push([2.45, .28, .22, 0, .9, 3.72, OD2]);                                            // bumper
  L.push([.1, .1, .3, -.8, .9, 3.9, BLK_]); L.push([.1, .1, .3, .8, .9, 3.9, BLK_]);     // tow hooks
  L.push([1.25, .85, .08, 0, 1.55, 3.63, 0x2e3226]);                                     // grille
  for (const s of [-1, 1]) L.push([.18, .18, .06, s*.48, 1.55, 3.68, 0xd8d4c0]);         // headlights
  L.push([1.35, .8, 1.25, 0, 1.55, 3.0, OD_]);                                           // hood
  L.push([1.38, .08, 1.28, 0, 1.97, 3.0, OD2]);
  for (const s of [-1, 1]){ L.push([.55, .14, 1.55, s*.95, 1.25, 2.95, OD_, .0]); L.push([.55, .5, .14, s*.95, 1.0, 2.2, OD_]); }   // fenders
  L.push([2.3, 1.05, 1.35, 0, 1.75, 1.7, OD_]);                                          // cab
  L.push([2.0, .55, .05, 0, 2.55, 2.37, GL, -.12]);                                       // windshield
  L.push([2.06, .08, .1, 0, 2.83, 2.38, OD2]);
  L.push([2.34, .45, 1.4, 0, 3.05, 1.7, CAN]);                                            // canvas cab top
  for (const s of [-1, 1]){ L.push([.06, .4, .5, s*1.17, 2.5, 1.7, GL]); L.push([.06, .35, .22, s*1.35, 2.55, 2.3, 0x2a2a28]); }   // side windows, mirrors
  L.push([.5, .5, 0, -1.05, 1.05, .6, OD2, PH,0,0, 'c']);                                 // fuel tank
  L.push([2.45, .2, 4.6, 0, 1.35, -1.55, OD2]);                                           // bed
  for (const s of [-1, 1]) L.push([.08, .6, 4.6, s*1.2, 1.75, -1.55, OD_]);               // sides
  L.push([2.45, .6, .08, 0, 1.75, .72, OD_]); L.push([2.45, .5, .08, 0, 1.7, -3.82, OD_]);
  L.push([2.5, 1.35, 4.55, 0, 2.75, -1.55, CAN]);                                         // canvas
  L.push([2.3, .12, 4.4, 0, 3.47, -1.55, shade(CAN, .9)]);
  for (let k=0;k<5;k++) L.push([2.54, 1.3, .06, 0, 2.75, -3.55 + k*1.0, shade(CAN, .82)]); // bows under the canvas
  L.push([.9, .9, .06, 0, 2.55, -3.86, shade(CAN, .75)]);                                  // rolled rear flap
  M813_GEO = partGeo(L); return M813_GEO;
}
function m813At(u, v, ry){
  const p = AIRP(u, v), m = m939Covered(); m.position.set(p[0], 0, p[1]); m.rotation.y = ry; (CUR ? CUR.group : world).add(m);
  return m;
}
/* the convoy truck: the uploaded M939, with a canvas tilt over the cargo bed — hoops under olive canvas, a closed front, the rear flap rolled half up */
let TARP_GEO = null;
function mergeGeos(list){
  const P = [], N = [], C = [], I = []; let off = 0;
  for (const gm of list){ const n = gm.attributes.position.count;
    P.push(...gm.attributes.position.array); N.push(...gm.attributes.normal.array); C.push(...gm.attributes.color.array);
    const ix = gm.index ? gm.index.array : [...Array(n).keys()]; for (const i of ix) I.push(i + off); off += n; }
  const o = new T.BufferGeometry(); o.setAttribute('position', new T.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); o.setAttribute('color', new T.Float32BufferAttribute(C, 3)); o.setIndex(I); return o;
}
function tarpGeo(){
  if (TARP_GEO) return TARP_GEO;
  const z0 = -2.62, z1 = -.33, hw = .845, y0 = 1.12, yS = 1.72, yT = 2.06, segZ = 26, ring = [];
  // the cross-section: straight sides, then a rounded roof
  ring.push([-hw, y0]); ring.push([-hw, yS]);
  for (let k=1;k<=8;k++){ const a = Math.PI - k/9*Math.PI; ring.push([Math.cos(a)*hw, yS + Math.sin(a)*(yT - yS)]); }
  ring.push([hw, yS]); ring.push([hw, y0]);
  const pos = [], col = [], idx = [], R = ring.length;
  const CAN = [.37, .38, .27];
  for (let s=0;s<=segZ;s++){ const t = s/segZ, z = z0 + (z1 - z0)*t;
    const hoop = Math.abs(((t*5) % 1) - .5) > .44 || s === 0 || s === segZ;          // five hoops show as ridges
    const sag = hoop ? 0 : .035*Math.sin(((t*5) % 1)*Math.PI);                       // the canvas sags a little between them
    for (let r=0;r<R;r++){ const [x, y] = ring[r], top = y > yS - .01 ? (y - yS)/(yT - yS) : 0;
      pos.push(x*(1 - (hoop ? 0 : .012)), y - sag*top*1.4 + (hoop ? .012 : 0), z);
      const f = (hoop ? .86 : 1) * (.94 + .1*Math.sin(z*7.3 + r*1.7)*.5) * (r === 0 || r === R - 1 ? .8 : 1);
      col.push(CAN[0]*f, CAN[1]*f, CAN[2]*f); } }
  for (let s=0;s<segZ;s++) for (let r=0;r<R-1;r++){ const a = s*R + r, b = a + 1, c = a + R, d = c + 1; idx.push(a, c, b, b, c, d); }
  // the front panel, against the cab, closed
  const f0 = pos.length/3; pos.push(0, y0, z1); col.push(...CAN.map(v => v*.8));
  for (let r=0;r<R;r++){ pos.push(ring[r][0], ring[r][1], z1); col.push(...CAN.map(v => v*.8)); }
  for (let r=0;r<R-1;r++) idx.push(f0, f0 + 1 + r, f0 + 2 + r);
  // the rear: the flap closed below, rolled up in a bundle along the top
  const b0 = pos.length/3; pos.push(0, y0, z0); col.push(...CAN.map(v => v*.72));
  for (let r=0;r<R;r++){ const [x, y] = ring[r]; pos.push(x, Math.min(y, 1.62), z0); col.push(...CAN.map(v => v*.72)); }
  for (let r=0;r<R-1;r++) idx.push(b0, b0 + 2 + r, b0 + 1 + r);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const roll = new T.CylinderGeometry(.11, .11, hw*2 - .06, 8); roll.rotateZ(Math.PI/2); roll.translate(0, 1.7, z0 - .06);
  const rc = []; for (let k=0;k<roll.attributes.position.count;k++) rc.push(CAN[0]*.78, CAN[1]*.78, CAN[2]*.78); roll.setAttribute('color', new T.Float32BufferAttribute(rc, 3));
  const geoM = mergeGeos([geo, roll]); TARP_GEO = geoM; return geoM;
}
const TARP_MAT = new T.MeshLambertMaterial({ vertexColors:true, side:T.DoubleSide });
function m939Covered(){
  const g = new T.Group();
  const t = new T.Mesh(tarpGeo(), TARP_MAT); t.castShadow = t.receiveShadow = true; g.add(t);
  withModel('m939', M_ => { if (!M_.lit){ M_.lit = true; M_.mat.color.setRGB(1.8, 1.8, 1.7); } const q = lodMesh(M_.geos.body, M_.mat); q.castShadow = true; q.receiveShadow = true; g.add(q); });
  return g;
}
let M939W = null, TARPW = null;
function whiteMap(src, all){
  const cv = document.createElement('canvas'), tex = new T.CanvasTexture(cv); tex.flipY = typeof ImageBitmap !== 'undefined' && src.image instanceof ImageBitmap ? false : src.flipY;   // an ImageBitmap is never flipped on upload tex.wrapS = src.wrapS; tex.wrapT = src.wrapT; tex.anisotropy = src.anisotropy;
  const draw = () => { const im = src.image; if (!im || !im.width){ setTimeout(draw, 200); return; }
    cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data;
    for (let i=0;i<a.length;i+=4){ const l = (a[i]*.3 + a[i+1]*.59 + a[i+2]*.11)/255; if (l < .13 && !all) continue;   // tyres, glass and the chassis stay dark
      const v = all ? Math.min(238, 176 + l*230) : Math.min(242, 150 + (l - .13)*260); a[i] = v; a[i+1] = v*.985; a[i+2] = v*.95; }
    x.putImageData(d, 0, 0); tex.needsUpdate = true; };
  draw(); return tex;
}
function m939White(){
  const g = new T.Group();
  if (!TARPW){ TARPW = tarpGeo().clone(); const c = TARPW.attributes.color; for (let k=0;k<c.count;k++){ const l = (c.getX(k) + c.getY(k) + c.getZ(k))/3/.34; c.setXYZ(k, .84*l, .82*l, .76*l); } }
  const t = new T.Mesh(TARPW, TARP_MAT); t.castShadow = t.receiveShadow = true; g.add(t);
  withModel('m939', M_ => { if (!M939W){ M939W = M_.mat.clone(); M939W.map = whiteMap(M_.mat.map); M939W.color.setRGB(1.05, 1.05, 1.05); }
    const q = lodMesh(M_.geos.body, M939W); q.castShadow = true; q.receiveShadow = true; g.add(q); });
  return g;
}
function planAirport(){
  const at = (u, v, fn) => { const p = AIRP(u, v); lazyAdd(p[0], p[1], fn); };
  // hangars (the uploaded J-type), doors toward the runway: two side by side to the west, one to the east
  for (const [u, v] of [[-150, -147], [-112, -147], [150, -147]]) at(u, v, () => hangarJ(u, v));
  // terminal and control tower
  at(25, -130, () => { MAT = M.PLASTER; rb(25, -130, 2.6, 42, 5.2, 12, 0xe6dfcc); rb(25, -123.9, 2.6, 38, 2, .1, 0x2b2925, { m:M.GLASS }); rb(25, -130, 5.35, 43, .3, 13, 0xb0a690, { m:M.CONC });
    rb(25, -123.2, 4.4, 43, .18, 2.2, 0xc8c0b0, { m:M.CONC }); });
  at(64, -132, () => { const p = AIRP(64, -132); MAT = M.CONC; rb(64, -132, 7.5, 4.2, 15, 4.2, 0xd8d0c0, { hid:1 }); prop('kit3', 'atct', p[0], 0, p[1], AIR_RY, 1, 0xffffff); });   // the uploaded control tower (WWII style)
  // stacked containers behind the C-130s
  at(100, -140, () => { MAT = M.METAL; const cc = () => pick([0xffffff, 0xf0f0e8, 0xe4e8dc, 0xfff4e0]), H_ = 1.364;
    const box = (u, v, y, rot) => { const p = AIRP(u, v); rb(u, v, y + H_/2, 4, H_, 1.32, 0x4a5236, { hid:1 }); prop('kit3', 'cont', p[0], y, p[1], AIR_RY + (rot ? Math.PI : 0), 1, cc()); };
    for (let k=0;k<5;k++){ box(88 + k*4.6, -136.6, 0, k % 2); box(88 + k*4.6, -138.6, 0, (k + 1) % 2); }
    for (const k of [0, 1, 3]) box(88 + k*4.6, -136.6, H_, k % 2); box(92.6, -138.6, H_, 0); });   // the uploaded military containers, stacked
  // tents in two blocks of four
  for (const [cu, cv] of TENTB) for (const [a, b] of [[-6.5,-6.5],[6.5,-6.5],[-6.5,6.5],[6.5,6.5]]) at(cu + a, cv + b, () => tentM(cu + a, cv + b, b > 0 ? 1 : 0));
  // C-130s
  for (const [u, v] of C130S) at(u, v, () => c130(u, v));
  // the helicopters in line abreast, noses to the runway, the Little Birds in front
  for (let k=BHROW.fly;k<BHROW.n;k++){ const u = BHROW.u + k*BHROW.step, v = BHROW.v;
    at(u, v, () => { const p = AIRP(u, v); parkedHeli(p[0], p[1], AIR_RY); }); }
  for (let k=LBROW.fly;k<LBROW.n;k++){ const u = LBROW.u + k*LBROW.step, v = LBROW.v;
    at(u, v, () => { const p = AIRP(u, v), lb = littleBird(); lb.g.position.set(p[0], 0, p[1]); lb.g.rotation.y = AIR_RY; lb.rotor.rotation.y = k*.7; (CUR ? CUR.group : world).add(lb.g); }); }
  // the convoy, nose to tail toward the gate: Humvees with the M2 manned, M813 trucks
  for (let k=0;k<6;k++){ const u = 100 + k*9, v = -106, kind = [0, 0, 1, 0, 1, 0][k];
    at(u, v, () => { const o = kind ? m813At(u, v, AIR_RY + PH) : humveeAt(u, v, AIR_RY + PH); if (o){ BASE_CONVOY.push(o); o.visible = !BASE_CONVOY.hide; } }); }
  // flags: the base flagpole by the terminal and one by the gate
  at(0, -122, () => { const p = AIRP(0, -122); makeFlag(p[0], p[1], 8, 0, 'us'); });
  at(186, -92, () => { const p = AIRP(186, -92); makeFlag(p[0], p[1], 6, 0, 'us'); });
  // perimeter: fence and concertina, a guarded gate on the road toward the city, watchtowers at the corners
  const B_ = BASE, gv0 = B_.gateV - 6, gv1 = B_.gateV + 6;
  for (let u=B_.u0; u<B_.u1; u+=8) at(u, B_.v0, () => { MAT = M.METAL; rb(u, B_.v0, .9, .1, 1.8, .1, 0x6a6a64); rb(u+4, B_.v0, 1.2, 8, .04, .04, 0x8a8a84); rb(u+4, B_.v0, .6, 8, .04, .04, 0x8a8a84); });
  for (let u=B_.u0; u<B_.u1; u+=24) at(u + 12, B_.v0 - 2, () => wire(u, Math.min(B_.u1, u + 24), B_.v0 - 2));
  for (const us_ of [B_.u0, B_.u1]) for (let v=B_.v0; v<=B_.v1 - 4; v+=8){
    if (us_ === B_.u1 && v + 8 > gv0 && v < gv1) continue;
    at(us_, v, () => { MAT = M.METAL; rb(us_, v, .9, .1, 1.8, .1, 0x6a6a64); rb(us_, v + 4, 1.2, .04, .04, 8, 0x8a8a84); rb(us_, v + 4, .6, .04, .04, 8, 0x8a8a84); });
    at(us_ + (us_ < 0 ? -2 : 2), v + 4, () => wireV(v, v + 8, us_ + (us_ < 0 ? -2 : 2)));
  }
  at(B_.u1, B_.gateV, () => {
    MAT = M.WOOD; rb(B_.u1 - 6, gv0 - 4, 1.2, 2.4, 2.4, 2.4, 0xc8c0aa); rb(B_.u1 - 6, gv0 - 4, 2.5, 2.8, .15, 2.8, 0x7a7a72, { m:M.TIN });   // guard booth
    MAT = M.BAG; rb(B_.u1 - 2, gv0 - 2, .5, 1.4, 1, 3, 0xb4a173); rb(B_.u1 - 2, gv1 + 2, .5, 1.4, 1, 3, 0xb4a173);
    MAT = M.METAL; for (let k=0;k<6;k++) rb(B_.u1, gv0 + 1 + k*1.7, 1.0, .1, .1, 1.7, k % 2 ? 0xd8d4c8 : 0xb02a1c); rb(B_.u1, gv0 + .4, .5, .15, 1.0, .15, 0x6a6a64);
    // jersey barriers lining both sides of the road outside, never across it
    jersey(B_.u1 + 4, B_.gateV - 5.6, 5, true); jersey(B_.u1 + 4, B_.gateV + 5.6, 5, true); });
  for (const [u, v] of [[B_.u0 + 5, B_.v0 + 5], [B_.u1 - 5, B_.v0 + 5], [B_.u0 + 5, B_.v1 - 8], [B_.u1 - 5, B_.v1 - 8]]) at(u, v, () => guardTower(u, v));
  taxiLines();
  // night: runway edge lights, taxiway links, floodlights over the apron and the tents
  for (let u=-RWY.L+10; u<=RWY.L-10; u+=25) for (const s of [-1, 1]){ const p = AIRP(u, s*(RWY.W + .3)); GLOWS.push([p[0], .12, p[1], Math.abs(u) > RWY.L - 20 ? (u > 0 ? 0xff5040 : 0x50ff70) : 0xfff4dc, .3, .14, .3]); }
  for (const J of JOINS) for (const s of [-1, 1]) for (const v of [-18, -27]){ const p = AIRP(J + s*8.6, v); GLOWS.push([p[0], .1, p[1], 0x4a8aff, .22, .12, .22]); }
  for (const [u, v] of [[-172, -90], [-60, -90], [40, -90], [150, -92], [-90, -121], [100, -125], [180, -116]]){ const p = AIRP(u, v);
    lazyAdd(p[0], p[1], () => { MAT = M.METAL; C(p[0], 3.5, p[1], .14, 7, 0x6a6a64); B(p[0], 7.1, p[1], 1.6, .5, .5, 0x3a3a38, { ry:AIR_RY }); B(p[0], .6, p[1], 1.4, 1.2, 1, 0x6a6a4a, { ry:AIR_RY }); });
    GLOWS.push([p[0], 7.05, p[1], 0xfff2d8, 1.4, .3, .3]); LIGHTSRC.push({ x:p[0], y:6.6, z:p[1], col:0xfff0d8, i:2.6, d:24, fl:0, lamp:1 }); }
}
/* ground of the base: runway, taxiway links, the apron (its edge and taxi lines only: nothing painted under the aircraft or the vehicles),
   and round the tents the same rutted dirt streets as in Mogadishu */
function airRuts(pos, across, lanes, sep){ let d = 9;
  for (let l=0;l<lanes.length;l++){ const c = lanes[l] + Math.sin(pos*.21 + l*3.1)*.28 + (vnoise(pos*.35, l*11.3)-.5)*.5;
    d = Math.min(d, Math.abs(across - (c - sep)), Math.abs(across - (c + sep))); }
  return d; }
function airHiRes(ch){ const [u, v] = airUV(ch.x0 + CS/2, ch.z0 + CS/2); if (TZONE && u > TZONE.u0 - 60 - CS && u < TZONE.u1 + CS && v > -CS && v < TZONE.v1 + CS) return true; return u > TENTA.u0 - 24 && u < TENTA.u1 + 24 && v > TENTA.v0 - 24 && v < TENTA.v1 + 24; }
function apronConc(u, v){
  const sl = vnoise(u*.3, v*.3), oil = fbm(u*.15 + 7, v*.15 + 3); let c = [156 - sl*12, 152 - sl*12, 142 - sl*11];
  if (oil > .68){ const w = Math.min(1, (oil - .68)*6)*.25; c = c.map(x => x*(1 - w)); }
  if (((u+400) % 9) < .15 || ((v+400) % 9) < .15) c = [c[0] - 6, c[1] - 6, c[2] - 6];
  return c;
}
/* the yellow taxi lines with their black borders, and the hold-short bars, as a mesh just over the concrete: drawn by a shader from
   the position across and along each strip, so they stay sharp at any zoom. Two passes of the same strips: the black first, then
   the yellow, so where two lines meet the yellow runs on through. */
function taxiLines(){
  const segs = [], add = (u0, v0, u1, v1, type) => segs.push([u0, v0, u1, v1, type]);
  const A = APRON, i = 1.3;
  for (const J of JOINS){
    add(J, -5, J, (J < 0 ? -60 : TAXI_V), 0);                               // centre line: from the runway, down the link, onto the apron
    for (const s of [-1, 1]) add(J + s*8.0, -RWY.W - .6, J + s*8.0, A.v1 - i + .48, 0);   // the link's edges, into the apron edge
    add(J - 6, -RWY.W - 2, J + 6, -RWY.W - 2, 1);                           // hold short of the runway
  }
  add(-40, TAXI_V, A.u1 - 6, TAXI_V, 0);                                     // the taxilane, only where nothing is parked
  // the apron edge, open where the links come in
  add(A.u0 + i, A.v0 + i, A.u1 - i, A.v0 + i, 0); add(A.u0 + i, A.v0 + i, A.u0 + i, A.v1 - i, 0); add(A.u1 - i, A.v0 + i, A.u1 - i, A.v1 - i, 0);
  { let u = A.u0 + i; for (const J of JOINS.slice().sort((a, b) => a - b)){ if (J - 8 > u) add(u, A.v1 - i, J - 8, A.v1 - i, 0); u = J + 8; } if (u < A.u1 - i) add(u, A.v1 - i, A.u1 - i, A.v1 - i, 0); }
  const P = [], L = [], I = [];
  for (const [u0, v0, u1, v1, ty] of segs){
    const len = Math.hypot(u1 - u0, v1 - v0), du = (u1 - u0)/len, dv = (v1 - v0)/len, hw = ty ? .8 : .5, ext = ty ? 0 : .48;
    const o = P.length/3;
    for (const [t, s] of [[-ext, -1], [-ext, 1], [len + ext, -1], [len + ext, 1]]){
      const uu = u0 + du*t - dv*s*hw, vv = v0 + dv*t + du*s*hw, w = AIRP(uu, vv); P.push(w[0], .035, w[1]); L.push(s*hw, t, ty); }
    I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('aL', new T.Float32BufferAttribute(L, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(new Array(P.length).fill(0).map((_, k) => k % 3 === 1 ? 1 : 0), 3)); g.setIndex(I); g.computeBoundingSphere();
  const mk = (pass) => {
    const m = new T.MeshPhongMaterial({ color:0xffffff, specular:0x111111, shininess:8, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-8 - pass*4 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute vec3 aL; varying vec3 vL;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = aL;');
      sh.fragmentShader = 'varying vec3 vL;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
  float a = vL.x, along = vL.y, aw = abs(a);
  #if __VERSION__ >= 300
    float px = max(fwidth(a), .004);
  #else
    float px = .03;
  #endif
  vec3 Y = vec3(.87, .70, .16), K = vec3(.11, .10, .09);
  float wear = .9 + .1 * fract(sin(dot(floor(vec2(along*1.7, a*3.0)), vec2(12.9898, 78.233))) * 43758.5453);
  ${pass === 0 ? `
  float al; vec3 c = K;
  if (vL.z < .5){ al = 1.0 - smoothstep(.48 - px, .48 + px, aw); }
  else {                                       // hold short: two solid bars on the taxiway side, two dashed on the runway side, on black
    al = 1.0 - smoothstep(.8 - px, .8 + px, aw);
    float bar = 0.0;
    for (int k = 0; k < 4; k++){ float c0 = -.6 + float(k)*.4; float b = 1.0 - smoothstep(.09 - px, .09 + px, abs(a - c0));
      if (k >= 2) b *= step(fract(along/1.0), .55); bar = max(bar, b); }
    c = mix(K, Y*wear, bar);
  }
  diffuseColor.rgb = c; diffuseColor.a = al * .96;` : `
  if (vL.z > .5) discard;
  float al = 1.0 - smoothstep(.2 - px, .2 + px, aw);
  if (al <= 0.0) discard;
  diffuseColor.rgb = Y * wear; diffuseColor.a = al;`}
`);
    };
    m.customProgramCacheKey = () => 'taxi' + pass;
    const me = new T.Mesh(g, m); me.receiveShadow = true; me.renderOrder = 2 + pass; world.add(me); return me;
  };
  mk(0); mk(1);
}
function airGround(u, v, out){
  const Y = [222, 178, 40], K = [28, 26, 22];
  const setc = c => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; };
  const ybl = (d, w) => { const a = Math.abs(d); if (a < w) { setc(Y); return true; } if (a < w + .28) { setc(K); return true; } return false; };
  if (Math.abs(v) < RWY.W && Math.abs(u) < RWY.L){
    let r = 78, g = 77, b = 74; const cr = vnoise(u*.4, v*.4); r += cr*10; g += cr*10; b += cr*9;
    if (Math.abs(v) < .45 && (((u/10) % 2) + 2) % 2 < 1.1 && Math.abs(u) < RWY.L - 22) { r = g = b = 225; }
    if (Math.abs(Math.abs(v) - (RWY.W - 1.2)) < .35) { r = g = b = 210; }
    if (Math.abs(u) > RWY.L - 18 && Math.abs(u) < RWY.L - 8 && (((v/2.2) % 2) + 2) % 2 < 1 && Math.abs(v) < RWY.W - 2) { r = g = b = 220; }
    out[0] = r; out[1] = g; out[2] = b; out[3] = 0; return true;
  }
  for (const J of JOINS) if (Math.abs(u - J) < 9 && v <= -RWY.W && v > APRON.v1 - 6){ setc(apronConc(u, v)); out[3] = 0; return true; }   // the links: the apron's concrete
  if (u > APRON.u0 && u < APRON.u1 && v > APRON.v0 && v < APRON.v1){ setc(apronConc(u, v)); out[3] = 0; return true; }   // its lines are a mesh of their own (taxiLines)
  if (u > TENTA.u0 && u < TENTA.u1 && v > TENTA.v0 && v < TENTA.v1){
    const m = sandM(u, v, hash2(Math.floor(u*8)*7 + 3, Math.floor(v*8)*13 + 1));
    // dirt streets five units wide: between the tent columns and rows, and round each block
    let best = 9, onSt = false; const SW = 5;
    const st = (pos, across) => { if (across < 0 || across > SW) return; onSt = true; best = Math.min(best, airRuts(pos, across, [1.6, SW - 1.6], .42)); };
    for (const [cu, cv] of TENTB){ for (const o of [-16.5, 0, 16.5]) st(v, u - (cu + o) + SW/2); for (const o of [-16.5, 0, 16.5]) st(u, v - (cv + o) + SW/2); }
    let c = onSt ? [210*m, 192*m, 156*m] : [196*m, 178*m, 142*m], h = fbm(u*1.4 + 40, v*1.4 + 40)*.07;
    if (onSt){ if (best < .17){ const f = .8 + best*1.1; c = [c[0]*f, c[1]*f, c[2]*f*.97]; h -= (.17 - best)*2.2; }
      const pn = fbm(u*.33 + 5, v*.33 + 9); if (pn > .66){ const w = Math.min(1, (pn - .66)*12); c = [c[0] + 18*w, c[1] + 16*w, c[2] + 14*w]; } }
    // fade into the sand at the edge of the tent lines
    const ed = Math.min(u - TENTA.u0, TENTA.u1 - u, v - TENTA.v0, TENTA.v1 - v), f = clamp(ed/4, 0, 1);
    if (f < 1){ const s = fbm(u*.1, v*.1), sc = [206 - s*14, 186 - s*12, 146 - s*10]; c = c.map((x, i) => x*f + sc[i]*(1 - f)); }
    setc(c); out[3] = h; return true;
  }
  if (u > BASE.u0 && u < BASE.u1 && v > BASE.v0 && v < BASE.v1){ const n = fbm(u*.1, v*.1); setc([206 - n*14, 186 - n*12, 146 - n*10]); out[3] = .15; return true; }
  return false;
}

function planRegion(){
  for (const v of VILLAGES){
    const pts = [];
    for (let k=0;k<v.n*4 && pts.length<v.n;k++){
      const a = rnd()*6.28, d = Math.sqrt(rnd())*v.r, x = v.x + Math.cos(a)*d, z = v.z + Math.sin(a)*d;
      if (coastS(x, z) > -26 || roadDist(x, z, ROADSEG)[0] < 5 || pts.some(p => Math.hypot(p[0]-x, p[1]-z) < 9)) continue;
      pts.push([x, z]);
      lazyAdd(x, z, () => smallHouse(x, z, { rot:true }));
    }
    // the well in the middle of each village
    lazyAdd(v.x, v.z, () => { MAT = M.STONE; C(v.x, .35, v.z, 1.0, .7, 0x9a9484); MAT = M.WOOD; B(v.x, 1.2, v.z, 1.8, .08, .08, 0x5a4a3a); B(v.x-.8, .9, v.z, .08, 1.0, .08, 0x5a4a3a); B(v.x+.8, .9, v.z, .08, 1.0, .08, 0x5a4a3a);
      if (v.n >= 22) pick([0, 0]); });   // no village mosque any more (the draw is kept so the rest of the village stays the same)
  }
  // lone compounds along the airport road
  const r0 = ROADS[0];
  for (let k=1;k<r0.pts.length-2;k++){ const a = r0.pts[k], b = r0.pts[k+1];
    for (let t=.1;t<1;t+=.13){ const x = a[0] + (b[0]-a[0])*t, z = a[1] + (b[1]-a[1])*t, side = rnd() < .5 ? -1 : 1, L = Math.hypot(b[0]-a[0], b[1]-a[1]);
      const off = rr(12, 30), hx = x - (b[1]-a[1])/L*side*off, hz = z + (b[0]-a[0])/L*side*off;
      if (rnd() < .55 && coastS(hx, hz) < -28 && !(hx >= -6 && hz >= -6 && hx < W+6 && hz < H+6)) lazyAdd(hx, hz, () => smallHouse(hx, hz, { rot:true })); } }
}
/* ---------- the ocean: pixel-art water. Colour in depth bands on a world-space pixel grid, sets of breakers rolling in,
   a swash sheet that runs up the sand and slides back leaving it wet, and sun (or moon) glints on the moving facets ---------- */
const OCEAN_FS = `
uniform float uTime; uniform vec3 uSunDir; uniform float uNightO; varying vec3 vWPo;
uniform sampler2D uRefl; uniform mat4 uRVP; uniform float uReflOn;
float oSpark = 0.0;
float coastG(vec2 p){ float u = p.x*.866 - p.y*.5; return (p.x+1200.0)*.5 + (p.y-1500.0)*.866 + 18.0*sin(u*.006) + 9.0*sin(u*.017 + 1.0); }
float oH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float oN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(oH(i), oH(i+vec2(1,0)), f.x), mix(oH(i+vec2(0,1)), oH(i+vec2(1,1)), f.x), f.y); }
float waves(vec2 p, float t, out vec2 gr){
  float h = 0.0; gr = vec2(0.0);
  vec2 D[5]; D[0] = vec2(-.50,-.866); D[1] = vec2(-.30,-.95); D[2] = vec2(-.72,-.69); D[3] = vec2(.20,-.98); D[4] = vec2(-.90,-.43);
  float F[5]; F[0] = .21; F[1] = .43; F[2] = .77; F[3] = 1.31; F[4] = 2.2;
  float A[5]; A[0] = .32; A[1] = .16; A[2] = .09; A[3] = .05; A[4] = .03;
  for (int k=0;k<5;k++){ float ph = dot(D[k], p)*F[k] + t*sqrt(F[k]*9.8)*.55 + float(k)*1.7; h += A[k]*sin(ph); gr += A[k]*F[k]*cos(ph)*D[k]; }
  return h;
}
// 4x4 ordered (Bayer) dither, for crisp pixel-art transitions
float bay2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y*.75))); }
float bay4(vec2 a){ return bay2(.5*a)*.25 + bay2(a); }
`;
function makeOcean(){
  const mat = new T.MeshPhongMaterial({ color:0x2a6a78, specular:0x000000, shininess:1, transparent:true });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = { value:0 }; sh.uniforms.uSunDir = { value:new T.Vector3(.5, .8, .3) }; sh.uniforms.uNightO = { value:0 }; sh.uniforms.uRefl = REFL_U.tex; sh.uniforms.uRVP = REFL_U.vp; sh.uniforms.uReflOn = REFL_U.on; mat.userData.sh = sh;
    sh.vertexShader = 'varying vec3 vWPo;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPo = (modelMatrix * vec4(position, 1.0)).xyz;');
    let fs = OCEAN_FS + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      const float PX = 6.0;                                   // water pixels per unit
      vec2 cell = floor(vWPo.xz * PX), P = (cell + .5) / PX;
      float s = coastG(P), along = P.x*.866 - P.y*.5;
      vec2 gr; float wv = waves(P, uTime, gr);
      float bz = bay4(cell);
      // swash: each wave runs up the sand and slides back, out of step along the shore
      float ph = uTime*.55 + oN(vec2(along*.02, 3.0))*6.0;
      float up = -.8 - 3.2*smoothstep(-.3, 1.0, sin(ph)) + (oN(vec2(along*.45, uTime*.35)) - .5)*.7;
      float edge = s - up;
      const float WET = -4.6;
      if (edge < 0.0){
        // sand the water just left: dark and glossy, drying in a dither toward the top of the run-up
        if (s < WET) discard;
        float k = clamp((s - WET) / max(up - WET, .25), 0.0, 1.0);
        if (k < bz*.85 + .08) discard;
        diffuseColor = vec4(.29, .25, .18, .32);
      } else {
        // colour by depth: sand showing through the shallows, turquoise, then the deep blue; no hard bands
        float d = clamp(s/90.0, 0.0, 1.0) + (oN(P*.05 + uTime*.012) - .5)*.09 + (bz - .5)*.025;
        vec3 col = d < .3 ? mix(vec3(.38,.80,.74), vec3(.11,.56,.68), smoothstep(0.0, .3, d)) : mix(vec3(.11,.56,.68), vec3(.03,.25,.47), smoothstep(.3, 1.0, d));
        col = mix(col, vec3(.80,.77,.60), (1.0 - smoothstep(0.0, 4.5, edge))*.7);
        // the surface: the swell, wind ripples drifting across it, and the rollers coming in to the beach
        vec2 dr = vec2(uTime*.55, -uTime*.38), q1 = P*.8 + dr, q2 = P*1.9 - dr*1.3;
        vec2 rip = vec2(oN(q1 + vec2(.4, 0.0)) - oN(q1 - vec2(.4, 0.0)), oN(q1 + vec2(0.0, .4)) - oN(q1 - vec2(0.0, .4)))*.5
                 + vec2(oN(q2 + vec2(.4, 0.0)) - oN(q2 - vec2(.4, 0.0)), oN(q2 + vec2(0.0, .4)) - oN(q2 - vec2(0.0, .4)))*.22;
        float crestPh = s*.34 + uTime*1.0 + oN(vec2(along*.03, 1.0))*2.5, cr = fract(crestPh/6.2832);     // 0 at the crest, growing out to sea behind it
        float near = 1.0 - smoothstep(4.0, 36.0, s), set_ = oN(vec2(along*.3, floor(crestPh/6.2832)*1.7));
        float roll = .1 + .55*near;
        vec2 g2 = gr*1.1 + rip + vec2(.5, .866)*sin(crestPh)*.34*roll;
        vec3 nw = normalize(vec3(-g2.x*1.7, 1.0, -g2.y*1.7)), Ls = normalize(uSunDir), V = normalize(cameraPosition - vec3(P.x, 0.0, P.y)), Hh = normalize(Ls + V);
        // light on the facets, the sky mirrored at a slant
        col *= clamp(.94 + .4*(dot(nw, Ls) - Ls.y), .8, 1.16);
        float fr = pow(1.0 - max(dot(nw, V), 0.0), 3.0);
        col = mix(col, mix(vec3(.74,.84,.88), vec3(.07,.09,.15), uNightO), fr*.32);
        // the face of a roller is dark and green before it breaks
        col *= 1.0 - .16*roll*smoothstep(.82, 1.0, cr);
        // foam: the breaking crest, the lace it leaves behind, the lip of the swash and its lace, a few whitecaps far out
        float brk = smoothstep(.42, .6, near + set_*.6 - .12) * step(.8, s);
        float line = (1.0 - smoothstep(0.0, .03 + .09*near, cr)) * brk;
        float lace = (1.0 - smoothstep(0.0, .1 + .32*near, cr)) * brk * step(.42 + cr*1.5, oN(P*1.6 + vec2(uTime*.25, uTime*.1)) + (bz - .5)*.2);
        float lip = step(edge, .5 + bz*.45) + step(edge, 2.2) * step(.56 + edge*.08, oN(P*2.0 + vec2(uTime*.8, 0.0)));
        float foam = clamp(max(max(lip, line), lace*.85), 0.0, 1.0);
        col = mix(col, vec3(.95, .97, .95), foam);
        if (uReflOn > .5){       // the helicopters overhead, broken up by the ripples
          vec2 dP = rip*.7 + vec2(sin(P.y*1.4 + uTime*2.3), cos(P.x*1.2 + uTime*1.9))*.1;
          vec4 rc = uRVP * vec4(P.x + dP.x, .04, P.y + dP.y, 1.0); vec2 ruv = rc.xy/rc.w*.5 + .5;
          if (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0){
            vec4 rf = texture2D(uRefl, ruv);
            col = mix(col, rf.rgb*vec3(.66,.8,.84) + col*.22, rf.a*(.55 + .3*fr)*(1.0 - foam)*(1.0 - .4*near));
          }
        }
        // the sun (or the moon) on the water: a soft sheen and a field of glints that come and go
        float sh1 = pow(max(dot(nw, Hh), 0.0), 30.0), sp = pow(max(dot(nw, Hh), 0.0), 160.0);
        col += vec3(1.0, .95, .82)*sh1*.12*(1.0 - foam)*(1.0 - .7*uNightO);
        oSpark = sp*1.5*(1.0 - foam)*step(.3, oH(cell + floor(uTime*7.0)*.37));
        diffuseColor.rgb = col;
        diffuseColor.a = foam > .5 ? 1.0 : edge < 1.2 ? .82 : 1.0;
      }
      vec2 oGr = gr;`);
    fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); }`);
    fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += oSpark * mix(vec3(1.0, .95, .8), vec3(.55, .62, .8), uNightO) * mix(1.4, .5, uNightO);`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'ocean5';
  const m = new T.Mesh(new T.PlaneGeometry(5200, 4200, 1, 1), mat);
  m.rotation.x = -Math.PI/2; m.position.set(-300, .04, 900); m.receiveShadow = true; m.renderOrder = 1;
  world.add(m); return m;
}
let ocean = null;
/* reflections on the sea: only the helicopters (layer 2), drawn from a camera mirrored in the water plane into a small
   target after the main frame; the ocean samples it on the next one */
const reflRT = new T.WebGLRenderTarget(64, 64, { minFilter:T.NearestFilter, magFilter:T.NearestFilter });
const REFL_U = { tex:{ value:reflRT.texture }, vp:{ value:new T.Matrix4() }, on:{ value:0 } };
const reflCam = new T.OrthographicCamera(-1,1,1,-1,.1,400); reflCam.matrixAutoUpdate = false; reflCam.layers.set(2);
const _rM = new T.Matrix4().set(1,0,0,0, 0,-1,0,.08, 0,0,1,0, 0,0,0,1), _rCC = new T.Color();
let reflN = 0;
function reflOnScene(g){ for (let o = g; o; o = o.parent) if (o === scene) return true; return false; }
function reflFrame(){
  const U = REFL_U; U.on.value = 0;
  if (!ocean || !ocean.visible || gfxQ() === GFXQ.low) return;
  let any = false;
  for (let i = REFL.length - 1; i >= 0; i--){ const g = REFL[i];
    if (!g.parent){ if ((g.userData.rfDead = (g.userData.rfDead || 0) + 1) > 300) REFL.splice(i, 1); continue; }
    g.userData.rfDead = 0;
    if (g.visible && reflOnScene(g)){ any = true; g.traverse(o => o.layers.enable(2)); } }
  if (!any) return;
  if (reflN++ % 30 === 0) scene.traverse(o => { if (o.isLight) o.layers.enable(2); });
  const w = rt.width, h = rt.height;
  if (reflRT.width !== w || reflRT.height !== h) reflRT.setSize(w, h);
  reflCam.copy(cam, false); reflCam.matrixAutoUpdate = false; reflCam.layers.set(2);
  reflCam.projectionMatrix.elements[0] *= -1; reflCam.projectionMatrix.elements[4] *= -1; reflCam.projectionMatrix.elements[8] *= -1; reflCam.projectionMatrix.elements[12] *= -1;
  reflCam.projectionMatrixInverse.copy(reflCam.projectionMatrix).invert();
  reflCam.matrixWorld.multiplyMatrices(_rM, cam.matrixWorld); reflCam.matrixWorldInverse.copy(reflCam.matrixWorld).invert(); reflCam.matrixWorldNeedsUpdate = false;
  const bg = scene.background, fog = scene.fog; renderer.getClearColor(_rCC); const ca = renderer.getClearAlpha();
  const fn = fog ? fog.near : 0, ff = fog ? fog.far : 0; if (fog){ fog.near = 1e5; fog.far = 1e5 + 1; }   // no haze on the mirrored path (keeps the same shaders)
  scene.background = null; renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(reflRT); renderer.render(scene, reflCam);
  scene.background = bg; renderer.setClearColor(_rCC, ca); if (fog){ fog.near = fn; fog.far = ff; }
  U.vp.value.multiplyMatrices(reflCam.projectionMatrix, reflCam.matrixWorldInverse); U.on.value = 1;
}

