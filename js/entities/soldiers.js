"use strict";
/* ---------- units: articulated soldier rigs ---------- */
const MAGS = { m16:30, car:30, m203:30, dmr:20, saw:100, ak:30 };
const RANGERS = [
  { name:'Sgto. Reyes', role:'Jefe · radio',      gun:'m16',  kit:'radio', acc:.62, burst:3, cool:1.2,  supp:14, ammo:210, skin:0xc48b63 },
  { name:'Cabo Walsh',  role:'Fusilero',          gun:'m16',  kit:'pack',  acc:.6,  burst:3, cool:1.2,  supp:13, ammo:210, skin:0xd8a77f },
  { name:'Soto',        role:'Ametrallador M249', gun:'saw',  kit:'pack',  acc:.46, burst:6, cool:1.5,  supp:28, ammo:600, skin:0xb07a52 },
  { name:'Kim',         role:'Granadero M203',    gun:'m203', kit:'none',  acc:.6,  burst:3, cool:1.2,  supp:13, ammo:210, skin:0xd9ad84 },
  { name:'Doyle',       role:'Tirador',           gun:'dmr',  kit:'pack',  acc:.82, burst:1, cool:1.35, supp:9,  ammo:150, skin:0xe0b38e },
  { name:'Price',       role:'Sanitario',         gun:'car',  kit:'medic', acc:.52, burst:3, cool:1.4,  supp:12, ammo:180, skin:0x8d5a3c, medic:true },
];
const DELTA = [
  { name:'Sgto. 1º Paul Howe',     role:'Jefe de equipo',    gun:'car', kit:'radio',  acc:.76, burst:3, cool:1.0,  supp:14, ammo:240, skin:0xd4a27a },
  { name:'Sgto. 1º Norm Hooten',   role:'Operador',          gun:'car', kit:'hydra',  acc:.74, burst:3, cool:1.0,  supp:13, ammo:240, skin:0xc48b63 },
  { name:'Sgto. 1º John Macejunas', role:'Operador',          gun:'car', kit:'hydra',  acc:.74, burst:4, cool:1.0,  supp:16, ammo:280, skin:0xdcae88 },
  { name:'Sgto. 1º Earl Fillmore', role:'Operador · brecha', gun:'car', kit:'breach', acc:.74, burst:3, cool:1.0,  supp:13, ammo:240, skin:0xe0b38e },
  { name:'Sgto. Brad Hallings',    role:'Tirador',           gun:'car', kit:'hydra',  acc:.84, burst:2, cool:1.0,  supp:11, ammo:240, skin:0xd8a77f },
  { name:'Sgto. 1º Kurt Schmid',   role:'Sanitario',         gun:'car', kit:'medic',  acc:.68, burst:3, cool:1.1,  supp:12, ammo:200, skin:0xa86e48, medic:true },
];
const SQUADS = {
  rangers:{ list:RANGERS, look:'ranger', spd:2.4, supRes:.6,  reload:2.3 },
  delta:  { list:DELTA,   look:'delta',  spd:2.7, supRes:.45, reload:1.8 },
};
let squadType = 'rangers';

const unitMat = new T.MeshPhongMaterial({ vertexColors:true, specular:0x141414, shininess:7 });
const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _sc = new T.Vector3(), _c = new T.Color(), _c2 = new T.Color();
/* printed patterns on soldiers: drawn per pixel from each part's local coordinates, so camo and plaid stick to the cloth as it moves */
const UPT = { NONE:0, DCU:1, WDL:2, CLOTH:3, SKIN:4, GUN:5, LEATHER:6, PLAID:8, STRIPE:9, WOOD:10, WEB:11, RUBBER:12, HAIR:13 };
const UNIT_FS_HEAD = `
uniform float uBumpU;
varying float vPat; varying vec3 vUP;
float uH(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float uN(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(uH(i), uH(i + vec3(1.0,0.0,0.0)), f.x), mix(uH(i + vec3(0.0,1.0,0.0)), uH(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(uH(i + vec3(0.0,0.0,1.0)), uH(i + vec3(1.0,0.0,1.0)), f.x), mix(uH(i + vec3(0.0,1.0,1.0)), uH(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
vec3 uPat(vec3 base, out float h){
  h = 0.0; int p = int(vPat + .5); vec3 q = vUP; vec3 c = base;
  if (p == 0) return c;
  float fold = uN(q * vec3(9.0, 26.0, 9.0) + 4.0);
  if (p == 1){
    float n1 = uN(q * vec3(13.0, 8.0, 13.0) + 3.0), n2 = uN(q * vec3(9.0, 6.0, 9.0) + 17.0), n3 = uN(q * vec3(18.0, 11.0, 18.0) + 31.0);
    if (n2 > .58) c = base * vec3(1.08, 1.08, 1.1) + vec3(.06);
    if (n3 > .66) c = base * vec3(.8, .8, .72);
    if (n1 > .64) c = base * vec3(.66, .58, .5);
    c *= .9 + fold * .16; h = fold * .8;
  } else if (p == 2){
    float n1 = uN(q * vec3(12.0, 8.0, 12.0) + 5.0), n2 = uN(q * vec3(10.0, 7.0, 10.0) + 23.0), n3 = uN(q * vec3(16.0, 9.0, 16.0) + 41.0);
    if (n2 > .6) c = vec3(.47, .44, .28);
    if (n1 > .57) c = vec3(.33, .26, .18);
    if (abs(n3 - .5) < .055) c = vec3(.12, .11, .1);
    c *= .9 + fold * .16; h = fold * .8;
  } else if (p == 3 || p == 11){
    c *= .9 + fold * .16 + (uH(floor(q * 90.0)) - .5) * .05;
    if (p == 11) c *= .95 + .07 * step(.5, fract(q.y * 55.0));
    h = fold * .6;
  } else if (p == 4){
    float n = uN(q * 30.0); c *= .93 + n * .1; h = n * .15;
  } else if (p == 5){
    c *= .85 + uN(q * 45.0) * .2;
    float wear = step(.9, uH(floor(q * 80.0))); c = mix(c, vec3(.42, .42, .4), wear * .45);
  } else if (p == 6){
    float n = uN(q * 36.0); c *= .8 + n * .3; h = n * .5;
  } else if (p == 8){
    float a = fract((q.x + q.z) * 11.0), b = fract(q.y * 11.0);
    c = base * (.7 + .2 * step(.55, a) + .2 * step(.55, b));
    float ln = clamp(step(.9, a) + step(.9, b), 0.0, 1.0);
    c = mix(c, min(base * 1.6 + .12, vec3(1.0)), ln * .7);
    c *= .92 + fold * .12; h = fold * .7;
  } else if (p == 9){
    c = base * (fract((q.x + q.z) * 9.0) > .5 ? 1.15 : .72); c *= .92 + fold * .12; h = fold * .7;
  } else if (p == 10){
    float g = uN(vec3(q.x * 70.0, q.y * 70.0, q.z * 7.0)); c *= .72 + g * .4; h = g * .3;
  } else if (p == 12){
    c *= .9 + uN(q * 50.0) * .15;
  } else if (p == 13){
    float hr = uH(floor(q * 120.0)); c *= .8 + hr * .35; h = hr * .3;
  }
  return c;
}
`;
const UNIT_FS_COLOR = `
#include <color_fragment>
float uHt = 0.0;
#ifdef USE_COLOR
if (vPat < .5 && vUP.y > 50.0) diffuseColor.rgb = mix(diffuseColor.rgb, vColor * diffuse, clamp(vUP.x, 0.0, 1.0));   // a recoloured part of a model soldier
#endif
diffuseColor.rgb = uPat(diffuseColor.rgb, uHt);
`;
const UNIT_FS_BUMP = `
#include <normal_fragment_begin>
if (vPat > .5){
  vec3 dsX = dFdx(-vViewPosition), dsY = dFdy(-vViewPosition);
  float dhx = dFdx(uHt) * uBumpU, dhy = dFdy(uHt) * uBumpU;
  vec3 dR1 = cross(dsY, normal), dR2 = cross(normal, dsX);
  float dDet = dot(dsX, dR1);
  vec3 dN = normalize(abs(dDet) * normal - sign(dDet) * (dhx * dR1 + dhy * dR2));
  normal = normalize(mix(normal, dN, .7));
}
`;
const UNIT_ON = { v:true };
unitMat.extensions = { derivatives:true };
unitMat.onBeforeCompile = sh => {
  if (!UNIT_ON.v) return;
  sh.uniforms.uBumpU = { value:.55 };
  sh.vertexShader = 'attribute float aPat; attribute vec3 aLP; varying float vPat; varying vec3 vUP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPat = aPat; vUP = aLP;');
  let fs = UNIT_FS_HEAD + sh.fragmentShader.replace('#include <color_fragment>', UNIT_FS_COLOR);
  if (fs.indexOf('vViewPosition') >= 0) fs = fs.replace('#include <normal_fragment_begin>', UNIT_FS_BUMP);
  sh.fragmentShader = fs;
};
unitMat.customProgramCacheKey = () => 'unit' + (UNIT_ON.v ? 1 : 0);
detailMats.push(unitMat);
/* the Rangers and the Delta operators are the uploaded models, skinned to the soldiers' skeleton: one atlas for both (and white
   for every man still built from parts, so one material and one batch still serve them all) */
const SOLD_TEX = (() => { const t = new T.TextureLoader().load(assetPng('soldiers')); t.flipY = false; t.anisotropy = 4; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; return t; })();
const SOLD_JM = {"pelvis": [0.0, 0.62, 0.0], "abd": [0.0, 0.0467, 0.0], "chest": [0.0, 0.12, 0.0], "neck": [0.0, 0.2133, -0.0067], "head": [0.0, 0.0433, 0.0], "shL": [0.1333, 0.1533, 0.0], "elL": [0.0, -0.1667, 0.0], "wrL": [0.0, -0.12, 0.0], "shR": [-0.1333, 0.1533, 0.0], "elR": [0.0, -0.1667, 0.0], "wrR": [0.0, -0.12, 0.0], "hipL": [0.0667, -0.0333, 0.0], "knL": [0.0067, -0.26, 0.0], "anL": [0.0, -0.2633, -0.02], "hipR": [-0.0667, -0.0333, 0.0], "knR": [-0.0067, -0.26, 0.0], "anR": [0.0, -0.2633, -0.02]}, SOLD_J = {"pelvis": [0.0, 0.62, -0.0067], "abd": [0.0, 0.0467, 0.0], "chest": [0.0, 0.1133, 0.0], "neck": [0.0, 0.1667, 0.0], "head": [0.0, 0.0467, 0.0], "shL": [0.1267, 0.1087, 0.0], "elL": [0.0, -0.1334, 0.0], "wrL": [0.0, -0.1301, 0.0], "shR": [-0.1267, 0.1087, 0.0], "elR": [0.0, -0.1334, 0.0], "wrR": [0.0, -0.1301, 0.0], "hipL": [0.0667, -0.0333, 0.0], "knL": [0.01, -0.2733, 0.0033], "anL": [0.0, -0.25, -0.0133], "hipR": [-0.0667, -0.0333, 0.0], "knR": [-0.01, -0.2733, 0.0033], "anR": [0.0, -0.25, -0.0133]}, SOLD = {};
// the militia and the men in the street: one model, twelve textures (256 px cells on the right of the atlas); civilians wear the ones
// without ammunition belts. Each man takes the next in a fixed rotation, so nothing is drawn from the game's random stream.
const MIL_ALL = [0, 1, 6, 7, 10, 2, 4, 3, 8, 5, 9, 11], CIV_TEX = [2, 3, 5, 8, 9, 11]; let MIL_N = 0, CIV_N = 0;
function milCell(k){ const e = .5/2048, f = .5/1024; return [.5 + (k % 4)*.125 + e, Math.floor(k/4)*.25 + f, .125 - 2*e, .25 - 2*f]; }
const SOLD_UV0 = [.25, .75], SOLD_K = 1.15;
/* the Ranger model, vertex by vertex: 1 helmet, 2 vest (torso and collar), 3 top of the sleeve, 4 rest of the arm, 5 hand. The UN troops
   wear it with the helmet painted blue; the men at the base without the helmet (cut down to a head of short hair) and without the
   vest (the torso pulled in to a shirt): the privates in an olive T-shirt with bare arms, the officers in the desert blouse */
const RG_CLS = '11111111111111111111111111111111111111101011111110000000011100000011111100000011111100000000000000000000100000000000000000000000000000000222222202200222223222222222233222332222322233222444332223222222222222226666666666666666666600060000000600066343343433433343334444444444444444444444444444444444444444444544444455454555454455555555555555555555555555545555555555555555555555555550000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001100011000000000444445555551111111111111111111111111111111110101111111000000111000000111111000000111111000000000000000000100000000000000000000000000002222202222222223222222233332222323322244334222222000226666662266666666666000000000606600033434334333433343444444444444444444444444444444444444444444444454445454554554455555555555555555555555555545555555555555555555555555555000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000110001100000000444445555556666666666666666666666666666666666666666666622222222222220222222222222222222222224222222222244222222244442222222232322223233222223232222323222222322322222232222222222323222222222232332222222222222222222222222222222222222222222222222222222222222222223323232333323322323333326222222622266666622262222222222222222622622222622266666622262222222222226226222226222666666222622222222222262266222226622224466666622264232332222226226222446622222666666222622242244222462666666666666666666666666666666666666666666666666666666666600006666666666666600066660666600666600066660666666666600000006006666666666666666666666666666666666666666000066666666666666000666606666006666000666606666666666000000060066666666666666666666666666666600066666666600000600600666660066666666222222222222222222222222222222226666666666666622222222222222222222222222222222226666662222222222222222222222222222222200000000000000000000000000000000000000000000000000000000000000000000000044444444441111111111111111110111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111010000011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111000000012200220000000122002222222266666666666666666666666666666666666666666666666666666666666666662226222622262226222622262226222622262226222622262226222662226222622222222222222222222222222222222222222222222222222222222222222222222222222222442222422222222222222222222222222242224422222222222222222222222332222232222222222222222232222232222222222222222232222232222222222222222232222232222222222222222232222232222222222222222223222223322222222222222222232233222222222222223222322222222222222222222222222222222222222222222222322232223223333333333332322232223223333333333332222222222222222222222222222222266666666666666666666666666666666666666666666666666666666666666666666666666666666';
const UN_BLUE = 0x4a8fd6, TEE_OD = 0x56603e, BLOUSE = 0xbcaa86, CREW_HAIR = [0x2a2018, 0x1a1612, 0x3a2a1c, 0x4a3a2a, 0x2a1d14]; let RV_N = 0;
function rgVariant(i, S_, out, nor, col, rv){
  const P_ = S_.P, c = +RG_CLS[i] || 0; let x = P_[i*3], y = P_[i*3+1], z = P_[i*3+2], r = null, n = null;
  // pull a point inside an ellipse round a vertical axis (or an ellipsoid), and give it the normal of that surface
  const ell = (cx, cz, a, b) => { const d = Math.hypot((x - cx)/a, (z - cz)/b); if (d <= 1) return false;
    x = cx + (x - cx)/d; z = cz + (z - cz)/d; n = [(x - cx)/(a*a), 0, (z - cz)/(b*b)]; return true; };
  const elp = (cx, cy, cz, a, b, e) => { const d = Math.hypot((x - cx)/a, (y - cy)/b, (z - cz)/e); if (d <= 1) return false;
    x = cx + (x - cx)/d; y = cy + (y - cy)/d; z = cz + (z - cz)/d; n = [(x - cx)/(a*a), (y - cy)/(b*b), (z - cz)/(e*e)]; return true; };
  if (c === 1){
    if (rv.helmet === 'un') r = UN_BLUE;
    else if (rv.helmet === 'none'){ elp(0, 1.046, -.006, .051, .056, .06); r = rv.hair; }
  } else if (c === 2 && rv.torso){
    if (y > .95) ell(0, -.005, .05, .048); else ell(0, -.004, .116, .078);
    if (y < .95 && !n) n = [x/(.116*.116), 0, (z + .004)/(.078*.078)];
    r = rv.torso === 'tee' ? TEE_OD : BLOUSE;
  } else if ((c === 3 || c === 4) && rv.torso && y > .76){   // the upper arm, pulled in round its bone (the vest's shoulder pads go)
    const ax = x > 0 ? .1267 : -.1267, sy = .8887;
    if (y < sy) ell(ax, -.0067, .042, .042); else elp(ax, sy, -.0067, .05, .062, .05);
    r = rv.torso === 'tee' ? (c === 3 ? TEE_OD : rv.skin) : n ? BLOUSE : null;
  } else if ((c === 4 || c === 5) && rv.torso === 'tee') r = rv.skin;
  else if (c === 6 && rv.torso){ if (ell(0, -.004, .126, .086)) r = 0xb4a07e; if (y > .618) r = 0x3a3a2e; }
  out.push(x, y, z);
  if (n){ const l = Math.hypot(n[0], n[1], n[2]) || 1; nor.push(n[0]/l, n[1]/l, n[2]/l); } else nor.push(S_.N[i*3], S_.N[i*3+1], S_.N[i*3+2]);
  if (r == null){ col.push(1, 1, 1); return 0; }
  tmpCol.setHex(r); col.push(tmpCol.r, tmpCol.g, tmpCol.b); return 1;     // a flat colour in place of the texture (see UNIT_FS_COLOR)
}
const ALICE_AT = { dy:-.02, dz:-.085, sx:.95, sy:.95, sz:.9 };   // where the pack sits on the model soldiers' backs
const SCOPE_Y = .093, SCOPE_R = .079;   // the Delta scope: height of its axis, top of the rail under it   // a white texel
function parseSoldBin(look, buf){
  const u = new Uint8Array(buf);
  const dv = new DataView(buf), nv = dv.getUint32(0, true), ni = dv.getUint32(4, true); let o = 8;
  const P_ = new Float32Array(buf.slice(o, o + nv*12)); o += nv*12;
  const N_ = new Float32Array(nv*3); for (let i=0;i<nv*3;i++) N_[i] = dv.getInt8(o + i)/127; o += nv*3;
  const U_ = new Float32Array(nv*2); for (let i=0;i<nv*2;i++) U_[i] = dv.getUint16(o + i*2, true)/65535; o += nv*4;
  if (look !== 'militia') for (let i=0;i<nv;i++) U_[i*2] *= .5;          // Ranger and Delta sit in the left half of the atlas
  const SI = new Uint16Array(nv*4); for (let i=0;i<nv*4;i++) SI[i] = u[o + i]; o += nv*4;
  const SW = new Float32Array(nv*4); for (let i=0;i<nv*4;i++) SW[i] = u[o + i]/255; o += nv*4; if (o % 2) o++;
  // the weights must add up to exactly one: the batches skin in world coordinates, where 0.4 % short is a metre out of place
  for (let i=0;i<nv;i++){ const k = i*4, t = SW[k] + SW[k+1] + SW[k+2] + SW[k+3]; for (let q=0;q<4;q++) SW[k+q] /= t; }
  const I_ = new Uint16Array(ni); for (let i=0;i<ni;i++) I_[i] = dv.getUint16(o + i*2, true);
  return (SOLD[look] = { nv, P:P_, N:N_, U:U_, SI, SW, I:I_ });
}
function soldMesh(look){ return SOLD[look]; }
const unitSkinMat = new T.MeshPhongMaterial({ vertexColors:true, specular:0x141414, shininess:7, skinning:true, map:SOLD_TEX });
unitSkinMat.extensions = { derivatives:true }; unitSkinMat.onBeforeCompile = unitMat.onBeforeCompile;
unitSkinMat.customProgramCacheKey = () => 'unitS' + (UNIT_ON.v ? 1 : 0); detailMats.push(unitSkinMat);

// item: [w,h,d, x,y,z, color, rx,ry,rz, type, topRatio, pattern, order, bulge]
// type: undefined box (rounded when it carries a pattern) | 'c' cylinder (w diameter, h length) | 'e' tapered limb | 's' sphere | 'h' dome
function roundBox(w, h, d, r, seg){
  const g = new T.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal;
  const ix = w/2 - r, iy = h/2 - r, iz = d/2 - r;
  for (let i=0;i<p.count;i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const cx = clamp(x,-ix,ix), cy = clamp(y,-iy,iy), cz = clamp(z,-iz,iz);
    let nx = x-cx, ny = y-cy, nz = z-cz; const L = Math.hypot(nx,ny,nz);
    if (L > 1e-6){ nx /= L; ny /= L; nz /= L; p.setXYZ(i, cx+nx*r, cy+ny*r, cz+nz*r); n.setXYZ(i, nx, ny, nz); }
  }
  return g;
}
// weapon meshes: per triangle 9 int16 (x 1/8000), r, g, b, flags (1 magazine or warhead, 2 wood)
// weapon meshes loaded from assets/models/weapons/*.bin into GUNM
const GUNM = {};
function parseGunBin(k, buf){
  const u = new Uint8Array(buf);
  const dv = new DataView(buf), n = dv.getUint16(0, true), P_ = new Float32Array(n*9), C_ = new Float32Array(n*3), F_ = new Uint8Array(n);
  for (let t=0;t<n;t++){ const o = 2 + t*22; for (let q=0;q<9;q++) P_[t*9 + q] = dv.getInt16(o + q*2, true)/8000; C_[t*3] = u[o+18]/255; C_[t*3+1] = u[o+19]/255; C_[t*3+2] = u[o+20]/255; F_[t] = u[o+21]; }
  return (GUNM[k] = { n, P:P_, C:C_, F:F_ });
}
function gunMesh(k){ return GUNM[k]; }
// an entry for partGeo: the part of model k that is (mag) or is not the magazine, its length scaled by sz, the wood in colour wood
const GmE = (L, k, mag, o) => L.push([0,0,0, 0,0,0, 0, 0,0,0, 'm', 1, UPT.GUN, 'XYZ', undefined, Object.assign({ k, mag }, o || {})]);
function partGeo(list){
  const pos = [], nor = [], col = [], pat = [], lp = [], ind = []; let off = 0;
  for (const b of list){
    const t = b[10], pt = b[12], hasPat = typeof pt === 'number';
    let g, vcol = null, vpat = null;
    if (t === 'm'){
      const o = b[15], G_ = gunMesh(o.k), ps = [], cs = [], pp = [], wc = o.wood != null ? new T.Color(o.wood) : null;
      for (let q=0;q<G_.n;q++){ if (((G_.F[q] & 1) ? 1 : 0) !== (o.mag ? 1 : 0)) continue;
        for (let v=0;v<3;v++){ ps.push(G_.P[q*9 + v*3]*(o.sx || 1), G_.P[q*9 + v*3 + 1]*(o.sy || 1) + (o.dy || 0), G_.P[q*9 + v*3 + 2]*(o.sz || 1) + (o.dz || 0));
          if ((G_.F[q] & 2) && wc) cs.push(wc.r, wc.g, wc.b); else cs.push(G_.C[q*3], G_.C[q*3+1], G_.C[q*3+2]); pp.push((G_.F[q] & 2) ? UPT.WOOD : UPT.GUN); } }
      g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(ps.length ? ps : [0,0,0, 0,0,0, 0,0,0], 3)); g.computeVertexNormals();
      const nv = g.attributes.position.count, ix = []; for (let i=0;i<nv;i++) ix.push(i); g.setIndex(ix);
      vcol = cs.length ? cs : [0,0,0, 0,0,0, 0,0,0]; vpat = pp.length ? pp : [0, 0, 0];
    }
    else if (t === 'c') g = new T.CylinderGeometry(b[0]/2*(b[11]||1), b[0]/2, b[1], hasPat ? 12 : 8);
    else if (t === 'e'){
      g = new T.CylinderGeometry(.5*(b[11]||1), .5, 1, hasPat ? 12 : 8, hasPat ? 4 : 1);
      const bul = b[14] == null ? .08 : b[14], pa = g.attributes.position;
      if (bul) for (let i=0;i<pa.count;i++){ const y = pa.getY(i); if (Math.abs(y) < .499){ const f = 1 + bul*Math.sin(Math.PI*(y+.5)); pa.setX(i, pa.getX(i)*f); pa.setZ(i, pa.getZ(i)*f); } }
      g.computeVertexNormals();
    }
    else if (t === 's') g = new T.SphereGeometry(.5, hasPat ? 12 : 8, hasPat ? 9 : 6);
    else if (t === 'h') g = new T.SphereGeometry(.5, hasPat ? 12 : 8, hasPat ? 5 : 4, 0, Math.PI*2, 0, Math.PI/2);
    else {
      const mn = Math.min(b[0], b[1], b[2]);
      g = hasPat && mn >= .018 ? roundBox(b[0], b[1], b[2], Math.min(.022, mn*.32), Math.max(b[0], b[1], b[2]) > .09 ? 3 : 2) : new T.BoxGeometry(b[0], b[1], b[2]);
    }
    _e.set(b[7]||0, b[8]||0, b[9]||0, b[13]||'XYZ'); _q.setFromEuler(_e); _v.set(b[3], b[4], b[5]);
    if (t === 'e' || t === 's' || t === 'h') _sc.set(b[0], b[1], b[2]); else _sc.set(1,1,1);
    _m4.compose(_v, _q, _sc); g.applyMatrix4(_m4);
    const p = g.attributes.position.array, n = g.attributes.normal.array; _c.setHex(b[6]);
    const pv = hasPat ? pt : 0;
    for (let i=0;i<p.length;i++){ pos.push(p[i]); nor.push(n[i]); lp.push(p[i]); }
    if (vcol) for (let i=0;i<p.length/3;i++){ col.push(vcol[i*3], vcol[i*3+1], vcol[i*3+2]); pat.push(vpat[i]); }
    else for (let i=0;i<p.length/3;i++){ col.push(_c.r, _c.g, _c.b); pat.push(pv); }
    const ix = g.index.array; for (let i=0;i<ix.length;i++) ind.push(ix[i] + off);
    off += p.length/3; g.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('aPat', new T.Float32BufferAttribute(pat, 1));
  geo.setAttribute('aLP', new T.Float32BufferAttribute(lp, 3));
  geo.setIndex(ind); return geo;
}
const PD = v => v == null ? UPT.CLOTH : v;
const Bx = (L,w,h,d,x,y,z,c,pt,rx,ry,rz) => L.push([w,h,d,x,y,z,c,rx||0,ry||0,rz||0,undefined,1,PD(pt)]);
const E  = (L,w,h,d,x,y,z,c,top,pt,rx,ry,rz,bul) => L.push([w,h,d,x,y,z,c,rx||0,ry||0,rz||0,'e',top||1,PD(pt),'XYZ',bul]);
const Sp = (L,w,h,d,x,y,z,c,pt) => L.push([w,h,d,x,y,z,c,0,0,0,'s',1,PD(pt)]);
const SpR = (L,w,h,d,x,y,z,c,pt,rx,ry,rz) => L.push([w,h,d,x,y,z,c,rx||0,ry||0,rz||0,'s',1,PD(pt)]);
const Dm = (L,w,h,d,x,y,z,c,pt,rx) => L.push([w,h,d,x,y,z,c,rx||0,0,0,'h',1,PD(pt)]);
const Cy = (L,dia,len,x,y,z,c,pt,rx,ry,rz) => L.push([dia,len,0,x,y,z,c,rx||0,ry||0,rz||0,'c',1,pt == null ? UPT.GUN : pt]);
const DCU = 0xc8b48c, WDL = 0x56653a;
const BLK = 0x262624, OD = 0x5e5d42, GM = 0x1e1e1d, BOOT = 0xa48760, PH = Math.PI/2;

/* weapons: +z is forward, muzzle at z .5 (M16/M249), .37 (CAR-15) or .38 (AK) */
function gunParts(type){
  const G_ = [], M_ = [];
  if (type === 'rpg'){ // RPG-7 on the shoulder (the uploaded model): the warhead is the 'mag' so it can vanish after the shot
    const wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20]);
    GmE(G_, 'rpg', 0, { wood }); GmE(M_, 'rpg', 1, { wood });
    return [G_, M_];
  }
  if (type === 'rpgOld'){
    const tube = 0x3a3d33, wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20]), Y = .1;
    Cy(G_, .056,.95, 0,Y,.03, tube, UPT.GUN, PH); Cy(G_, .074,.27, 0,Y,.0, wood, UPT.WOOD, PH);
    Cy(G_, .09,.1, 0,Y,-.43, 0x2a2a26, UPT.GUN, PH); Cy(G_, .072,.07, 0,Y,-.35, 0x2e2e2a, UPT.GUN, PH); Cy(G_, .066,.03, 0,Y,.49, 0x2a2a26, UPT.GUN, PH);
    Bx(G_, .032,.085,.04, 0,.02,-.04, 0x2a2826, UPT.GUN, .3); Bx(G_, .03,.075,.035, 0,.025,.13, 0x2a2826, UPT.GUN, .2);
    Bx(G_, .008,.03,.05, 0,.035,.03, GM, UPT.GUN); Bx(G_, .03,.05,.09, -.05,Y+.05,.03, 0x22221f, UPT.GUN); Cy(G_, .03,.02, -.05,Y+.06,-.025, 0x6a8a7a, UPT.NONE, PH);
    Cy(M_, .05,.08, 0,Y,.54, 0x4a5236, UPT.GUN, PH); Cy(M_, .095,.16, 0,Y,.64, 0x58623e, UPT.GUN, PH); Cy(M_, .065,.06, 0,Y,.745, 0x4e5838, UPT.GUN, PH); Cy(M_, .028,.06, 0,Y,.8, 0x8a8a70, UPT.GUN, PH);
    return [G_, M_];
  }
  if (type === 'ak'){ // the uploaded AK-47, its wood in one of a few stains
    const wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20, 0x84522a]);
    GmE(G_, 'ak', 0, { wood }); GmE(M_, 'ak', 1, { wood });
    return [G_, M_];
  }
  if (type === 'akOld'){
    const wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20, 0x84522a]), st = 0x2a2826;
    Bx(G_, .045,.065,.2, 0,.01,.02, st, UPT.GUN); Bx(G_, .04,.022,.18, 0,.05,.015, 0x33312e, UPT.GUN);
    Bx(G_, .04,.07,.21, 0,-.012,-.17, wood, UPT.WOOD, -.13); Bx(G_, .044,.085,.025, 0,-.03,-.275, shade(wood,.8), UPT.WOOD, -.13);
    Bx(G_, .03,.07,.035, 0,-.055,-.04, wood, UPT.WOOD, .38);
    Bx(G_, .05,.045,.13, 0,0,.165, wood, UPT.WOOD); Bx(G_, .04,.026,.1, 0,.042,.15, wood, UPT.WOOD);
    Cy(G_, .022,.12, 0,.045,.21, GM, UPT.GUN, PH); Cy(G_, .02,.18, 0,.018,.29, GM, UPT.GUN, PH);
    Bx(G_, .012,.045,.015, 0,.048,.352, GM, UPT.GUN); Cy(G_, .028,.035, 0,.018,.37, GM, UPT.GUN, PH);
    Bx(G_, .008,.012,.05, 0,-.035,.03, GM, UPT.GUN); Bx(G_, .012,.025,.03, 0,.07,.08, GM, UPT.GUN);
    Bx(M_, .035,.07,.045, 0,-.07,.06, 0x2a2622, UPT.GUN, .3); Bx(M_, .035,.07,.045, 0,-.125,.095, 0x2a2622, UPT.GUN, .7);
    return [G_, M_];
  }
  if (type === 'm16' || type === 'm203'){ // the Rangers' M16A1 (uploaded model), with the M203 under it for the grenadiers
    GmE(G_, 'm16a1', 0); GmE(M_, 'm16a1', 1);
    if (type === 'm203'){ Cy(G_, .045,.19, 0,-.03,.21, 0x2c2c2a, UPT.GUN, PH); Bx(G_, .02,.035,.03, 0,-.055,.12, GM, UPT.GUN); }
    return [G_, M_];
  }
  if (type === 'saw'){ // the Rangers' M249 (uploaded model); its thin barrel drawn here, the box magazine is the 'mag'
    GmE(G_, 'm249', 0); GmE(M_, 'm249', 1);
    Cy(G_, .024,.2, 0,.035,.4, GM, UPT.GUN, PH); Cy(G_, .034,.045, 0,.035,.485, GM, UPT.GUN, PH); Cy(G_, .012,.17, 0,.0,.33, GM, UPT.GUN, PH);
    return [G_, M_];
  }
  if (type === 'car'){ // the Delta CAR-15 (uploaded model: Aimpoint on the carrying handle, Divelight under the handguard)
    const ck = Math.random() < .5 ? 'car15' : 'car15n'; GmE(G_, ck, 0); GmE(M_, ck, 1); Cy(G_, .032,.19, 0,.028,-.12, BLK, UPT.GUN, PH);     // buffer tube between stock and receiver
    return [G_, M_];
  }
  if (type === 'carOld'){
    GmE(G_, 'car15', 0); GmE(M_, 'car15', 1);
    const SY = SCOPE_Y;
    Cy(G_, .012,.075, 0,SY,0, BLK, UPT.GUN, PH);                     // tube
    Cy(G_, .017,.023, 0,SY,.048, BLK, UPT.GUN, PH); Cy(G_, .015,.003, 0,SY,.06, 0x5a7a8a, UPT.NONE, PH);   // objective bell and its glass
    Cy(G_, .015,.018, 0,SY,-.045, BLK, UPT.GUN, PH); Cy(G_, .013,.003, 0,SY,-.055, 0x3a4a52, UPT.NONE, PH);  // eyepiece
    Cy(G_, .015,.015, 0,SY,.003, BLK, UPT.GUN);                              // turret
    Bx(G_, .009,SY - SCOPE_R,.01, 0,(SY + SCOPE_R)/2,-.022, GM, UPT.GUN); Bx(G_, .009,SY - SCOPE_R,.01, 0,(SY + SCOPE_R)/2,.025, GM, UPT.GUN);   // rings
    return [G_, M_];
  }
  if (type === 'dmr'){ // the M16A2 with a scope
    const o = {};
    GmE(G_, 'm16', 0, o); GmE(M_, 'm16', 1, o);
    if (type === 'dmr'){ Cy(G_, .042,.19, 0,.115,.03, BLK, UPT.GUN, PH); Cy(G_, .055,.04, 0,.115,.13, BLK, UPT.GUN, PH); Cy(G_, .05,.035, 0,.115,-.07, BLK, UPT.GUN, PH); }
    return [G_, M_];
  }
  const car = type === 'car', saw = type === 'saw', muz = car ? .37 : .5;
  Bx(G_, .04,.055,.15, 0,-.005,.03, GM, UPT.GUN);
  Bx(G_, saw ? .06 : .045, saw ? .07 : .045, saw ? .2 : .19, 0, saw ? .045 : .04, .05, GM, UPT.GUN);
  Bx(G_, .032,.075,.04, 0,-.06,-.02, GM, UPT.GUN, .35); Bx(G_, .008,.008,.06, 0,-.038,.03, GM, UPT.GUN);
  const hz = .15, hl = car ? .12 : .17;
  Cy(G_, saw ? .05 : .055, hl, 0,.035, hz + hl/2, 0x2a2a28, UPT.GUN, PH);
  for (let k=1;k<4;k++) Cy(G_, (saw ? .05 : .055) + .006, .008, 0,.035, hz + hl*k/4, 0x232321, UPT.GUN, PH);
  const b0 = hz + hl, bl = muz - .025 - b0;
  Cy(G_, .02, bl, 0,.035, b0 + bl/2, GM, UPT.GUN, PH); Cy(G_, .028,.045, 0,.035, muz - .02, GM, UPT.GUN, PH);
  if (!saw){ Bx(G_, .012,.05,.015, 0,.075, b0 + .015, GM, UPT.GUN); Bx(G_, .03,.02,.02, 0,.05, b0 + .015, GM, UPT.GUN); }
  if (car){
    Cy(G_, .022,.14, 0,.03,-.1, GM, UPT.GUN, PH); Bx(G_, .035,.07,.07, 0,-.005,-.18, BLK, UPT.GUN);
    Cy(G_, .036,.075, 0,.088,.05, BLK, UPT.GUN, PH); Bx(G_, .02,.022,.04, 0,.066,.05, GM, UPT.GUN);
    Cy(G_, .03,.004, 0,.088,.09, 0x6a8a7a, UPT.NONE, PH);
  } else {
    Bx(G_, .042,.075,.21, 0,-.002,-.17, GM, UPT.GUN); Bx(G_, .045,.09,.02, 0,-.01,-.282, 0x141414, UPT.RUBBER);
    if (!saw && type !== 'dmr'){ Bx(G_, .018,.03,.12, 0,.08,.03, GM, UPT.GUN); Bx(G_, .014,.03,.02, 0,.072,-.02, GM, UPT.GUN); }
  }
  if (saw){
    Bx(G_, .05,.02,.13, 0,.07,.2, 0x2a2a28, UPT.GUN); Bx(G_, .016,.05,.06, 0,.1,.06, GM, UPT.GUN);
    Bx(G_, .012,.012,.17, .02,-.015,.33, GM, UPT.GUN, .15); Bx(G_, .012,.012,.17, -.02,-.015,.33, GM, UPT.GUN, .15);
    Bx(M_, .085,.1,.1, .045,-.065,.04, OD, UPT.WEB); Bx(M_, .08,.03,.08, .045,-.005,.04, shade(OD,.85), UPT.WEB);
  } else {
    Bx(M_, .03,.08,.05, 0,-.08,.06, GM, UPT.GUN, .12); Bx(M_, .03,.06,.05, 0,-.14,.075, GM, UPT.GUN, .3);
  }
  if (type === 'm203'){ Cy(G_, .045,.19, 0,-.018,.21, 0x2c2c2a, UPT.GUN, PH); Bx(G_, .02,.035,.03, 0,-.045,.12, GM, UPT.GUN); }
  if (type === 'dmr'){ Cy(G_, .042,.19, 0,.095,.03, BLK, UPT.GUN, PH); Cy(G_, .055,.04, 0,.095,.13, BLK, UPT.GUN, PH); Cy(G_, .05,.035, 0,.095,-.07, BLK, UPT.GUN, PH);
    Bx(G_, .02,.03,.02, 0,.07,.08, GM, UPT.GUN); Bx(G_, .02,.03,.02, 0,.07,-.02, GM, UPT.GUN); }
  return [G_, M_];
}
const HAIRS = [0x1a1512, 0x2a1d14, 0x3a2a1c, 0x4a3a2a, 0x6a5038];
function lipCol(c){ const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return (Math.min(255, Math.round(r*.98 + 10)) << 16) | (Math.round(g*.74) << 8) | Math.round(b*.74); }
// a sleeve flag about 5 by 7.5 cm: white field, red stripes, the blue canton at the top, toward the front
function usFlag(L, x, y){
  const W_ = .05, H_ = .034;
  Bx(L, .004,H_ + .004,W_ + .004, x,y,0, 0x3a3a30, UPT.NONE);                       // the stitched edge
  Bx(L, .004,H_,W_, x + .0015,y,0, 0xeeeae0, UPT.NONE);
  for (let k=0;k<4;k++) Bx(L, .002,.0046,W_, x + .0035,y + H_/2 - .0023 - k*.0098,0, 0xb3283a, UPT.NONE);
  Bx(L, .0025,.018,.022, x + .0045,y + H_/2 - .009,W_/2 - .011, 0x2f3468, UPT.NONE);
}
function face(P, skin, hair, opt){
  opt = opt || {};
  const sh = k => shade(skin, k), brow = shade(hair, .82), H_ = P.head;
  Sp(H_, .15,.18,.165, 0,.1,0, skin, UPT.SKIN);                                         // skull
  E(H_, .13,.068,.13, 0,.043,.012, skin, .92, UPT.SKIN);                                // jaw
  Bx(H_, .05,.026,.02, 0,.019,.068, skin, UPT.SKIN);                                    // chin
  for (const s of [-1,1]){
    const ry = s*.42;
    Bx(H_, .044,.026,.012, s*.031,.1,.075, sh(.72), UPT.NONE, 0,ry,0);                  // the eye socket, in shadow
    Bx(H_, .03,.015,.01, s*.031,.0995,.079, 0xf1ebdf, UPT.NONE, 0,ry,0);                // white of the eye
    Bx(H_, .014,.016,.01, s*.029,.0995,.081, 0x17120e, UPT.NONE, 0,ry,0);               // iris and pupil
    Bx(H_, .044,.014,.016, s*.033,.1175,.078, brow, UPT.NONE, 0,ry,-s*.14);             // eyebrow
    Bx(H_, .028,.018,.012, s*.047,.077,.067, sh(1.07), UPT.SKIN, 0,s*.62,0);            // cheekbone catching the light
    Bx(H_, .02,.03,.01, s*.05,.056,.064, sh(.88), UPT.NONE, 0,s*.7,0);                  // hollow of the cheek
    Sp(H_, .026,.052,.04, s*.079,.096,-.005, sh(.93), UPT.SKIN);                        // ear
    Bx(H_, .006,.026,.018, s*.092,.096,-.002, sh(.62), UPT.NONE);
  }
  Bx(H_, .024,.038,.022, 0,.083,.082, sh(.98), UPT.SKIN, -.3);                          // bridge of the nose
  Bx(H_, .032,.018,.024, 0,.067,.087, sh(1.02), UPT.SKIN);                              // tip
  Bx(H_, .03,.007,.014, 0,.0575,.088, sh(.5), UPT.NONE);                                // the shadow under it
  if (opt.beard){ const bc = hair;
    E(H_, .142,.072,.138, 0,.036,.016, bc, .95, UPT.HAIR);                              // along the jaw
    Bx(H_, .064,.044,.03, 0,.02,.071, bc, UPT.HAIR);                                    // chin
    Bx(H_, .062,.016,.018, 0,.0515,.088, bc, UPT.HAIR);                                 // moustache
    for (const s of [-1,1]) Bx(H_, .018,.07,.06, s*.068,.07,.03, bc, UPT.HAIR);         // sideburns
  } else if (opt.stubble){
    E(H_, .134,.062,.134, 0,.04,.014, sh(.74), .92, UPT.HAIR);
    Bx(H_, .052,.013,.012, 0,.0525,.085, sh(.7), UPT.HAIR);
  }
  Bx(H_, .05,.009,.012, 0,.044,.085, sh(.46), UPT.NONE);                                // mouth
  Bx(H_, .036,.01,.012, 0,.0355,.083, lipCol(sh(.92)), UPT.SKIN);                       // lower lip
}
function hand(L, c, glove, side){
  const pt = glove ? UPT.LEATHER : UPT.SKIN;
  Bx(L, .068,.08,.036, 0,-.035,.004, c, pt);
  Bx(L, .064,.05,.034, 0,-.082,.02, shade(c,.95), pt, .55);
  E(L, .026,.055,.026, -side*.03,-.035,.03, c, .9, pt, .7,0,side*.4);
}
function legs(P, cloth, pt, boot, opt){
  opt = opt || {};
  for (const s of ['L','R']){
    const sg = s === 'L' ? 1 : -1;
    E(P['th'+s], .135,.28,.145, 0,-.13,0, cloth, 1.15, pt);
    if (opt.cargo) Bx(P['th'+s], .035,.09,.085, sg*.07,-.15,.0, cloth, pt);
    Sp(P['sh'+s], .12,.11,.125, 0,0,0, cloth, pt);
    E(P['sh'+s], .105,.19,.11, 0,-.1,0, cloth, 1.05, pt);
    if (opt.pads) Sp(P['sh'+s], .12,.1,.08, 0,-.005,.055, BLK, UPT.RUBBER);
    E(P['sh'+s], .12,.04,.124, 0,-.165,0, cloth, 1, pt);
    E(P['sh'+s], .112,.075,.118, 0,-.2,0, boot, 1, UPT.LEATHER, 0,0,0, .02);
    Bx(P['ft'+s], .112,.065,.2, 0,-.022,.04, boot, UPT.LEATHER);
    Sp(P['ft'+s], .11,.062,.08, 0,-.028,.125, boot, UPT.LEATHER);
    Bx(P['ft'+s], .12,.02,.225, 0,-.06,.045, 0x3a3226, UPT.RUBBER);
    Bx(P['ft'+s], .04,.008,.08, 0,.012,.075, shade(boot,.6), UPT.NONE);
  }
}
/* ---------- life on the base: ground crew, men off duty in T-shirts and PT kit, no helmets ---------- */
const BASE_SKINS = [0xe0b08a, 0xd29d76, 0xc48b63, 0xa8704a, 0x7a5038, 0x5e3c28];
function baseLook(P, spec){
  const v = spec.v || 'tee', skin = spec.skin || pick(BASE_SKINS), hair = pick(HAIRS);
  const top = { tee:pick([0x5a4632, 0x4e4030, 0x6a5a40]), tan:0xb8a074, pt:0x8c8e8c, dcu:DCU, boonie:DCU, mech:0x5a6040 }[v];
  const tpt = v === 'dcu' || v === 'boonie' ? UPT.DCU : UPT.CLOTH;
  const low = v === 'pt' ? 0x1e1e22 : v === 'mech' ? 0x5a6040 : DCU, lpt = v === 'pt' || v === 'mech' ? UPT.CLOTH : UPT.DCU;
  const short = v === 'tee' || v === 'tan' || v === 'pt';
  E(P.pelvis, .29,.17,.19, 0,-.01,0, low, 1.06, lpt);
  if (v !== 'pt') Bx(P.pelvis, .31,.04,.21, 0,.06,0, v === 'mech' ? 0x3a3a30 : 0x2a2a24, UPT.WEB);
  E(P.abd, .27,.18,.18, 0,.07,0, top, 1.04, tpt);
  E(P.chest, .3,.24,.2, 0,.08,0, top, 1.1, tpt);
  Sp(P.chest, .12,.12,.12, .185,.175,0, top, tpt); Sp(P.chest, .12,.12,.12, -.185,.175,0, top, tpt);
  if (v === 'pt') Bx(P.chest, .13,.045,.01, 0,.1,.102, 0x2a2a2a, UPT.NONE);                       // ARMY across the chest
  if (v === 'dcu' || v === 'boonie') for (const s of [-1, 1]) Bx(P.chest, .08,.08,.02, s*.075,.11,.1, shade(DCU, .92), UPT.DCU, .15);
  if (v === 'mech'){ Bx(P.chest, .012,.3,.01, 0,.0,.104, 0x3a3a30, UPT.NONE); Bx(P.chest, .07,.06,.02, .08,.12,.1, shade(top, .9), UPT.CLOTH); }
  if (rnd() < .3 && v !== 'pt') Bx(P.chest, .02,.12,.01, -.04,.12,.103, 0xb8b8b0, UPT.GUN, 0,0,.3);    // dog tags chain
  E(P.neck, .075,.08,.075, 0,.03,0, skin, .95, UPT.SKIN);
  face(P, skin, hair, { stubble: rnd() < .45 });
  if (v === 'dcu' || v === 'mech'){ const hc = v === 'mech' ? 0x3a3a34 : DCU;                         // patrol cap / ball cap
    E(P.head, .17,.07,.18, 0,.17,-.005, hc, .95, v === 'dcu' ? UPT.DCU : UPT.CLOTH); Bx(P.head, .13,.016,.07, 0,.145,.1, hc, UPT.CLOTH, -.1); }
  else if (v === 'boonie'){ Cy(P.head, .3,.018, 0,.15,0, DCU, UPT.DCU); Dm(P.head, .18,.1,.19, 0,.15,0, DCU, UPT.DCU); }
  else Dm(P.head, .158,.06,.168, 0,.14,-.006, hair, UPT.HAIR);                                          // high and tight
  if (rnd() < .3) Bx(P.head, .112,.024,.018, 0,.1,.086, 0x101010, UPT.NONE);                          // sunglasses
  for (const s of ['L','R']){
    const sg = s === 'L' ? 1 : -1;
    if (short){ E(P['ua'+s], .108,.11,.112, 0,-.04,0, top, 1.12, tpt); E(P['ua'+s], .088,.2,.092, 0,-.12,0, skin, 1, UPT.SKIN); }
    else { E(P['ua'+s], .102,.25,.107, 0,-.11,0, top, 1.12, tpt); Cy(P['ua'+s], .11,.05, 0,-.2,0, shade(top, .93), tpt); if (s === 'L' && v !== 'mech') usFlag(P.uaL, .059, -.07); }   // sleeves rolled to the elbow
    Sp(P['fa'+s], .08,.08,.08, 0,0,0, skin, UPT.SKIN); E(P['fa'+s], .078,.19,.08, 0,-.095,0, skin, .9, UPT.SKIN);
    if (s === 'L' && rnd() < .5) Cy(P['fa'+s], .085,.025, 0,-.16,0, 0x1a1a1a, UPT.RUBBER);            // watch
    hand(P['hd'+s], v === 'mech' && rnd() < .5 ? 0x2e2a24 : skin, false, sg);
  }
  if (v === 'pt'){
    for (const s of ['L','R']){
      E(P['th'+s], .145,.14,.155, 0,-.06,0, low, 1.1, UPT.CLOTH); E(P['th'+s], .12,.18,.125, 0,-.17,0, skin, 1, UPT.SKIN);
      Sp(P['sh'+s], .105,.1,.11, 0,0,0, skin, UPT.SKIN); E(P['sh'+s], .095,.18,.1, 0,-.09,0, skin, 1, UPT.SKIN);
      E(P['sh'+s], .1,.06,.105, 0,-.18,0, 0xe8e6e0, 1, UPT.CLOTH);
      Bx(P['ft'+s], .105,.065,.2, 0,-.025,.04, 0xd8d6d0, UPT.CLOTH); Bx(P['ft'+s], .112,.022,.215, 0,-.06,.045, 0x3a3a3a, UPT.RUBBER);
    }
  } else legs(P, low, lpt, BOOT, { cargo: v !== 'mech' });
  P.gun = []; P.mag = [[.01,.01,.01, 0,0,0, 0x000000]];
  return P;
}
let CREW = null;
const CREW_NODES = {                                   // walkways across the base, (u, v)
  a1:[-170,-88], a2:[-110,-88], a3:[-40,-88], a4:[0,-88], a5:[60,-88], a6:[130,-90], a7:[175,-90],
  b1:[-170,-116], b2:[-130,-116], b3:[-90,-116], b4:[-53,-116], b5:[0,-116], b6:[25,-120], b7:[60,-118], b8:[100,-117], b9:[175,-116],
  t0:[-53,-145], t1:[-70,-145], t2:[-36,-145], t3:[-53,-128], t4:[-53,-161], g1:[186,-110], c1:[72,-30], c2:[108,-30],
};
const CREW_EDGES = 'a1-a2 a2-a3 a3-a4 a4-a5 a5-a6 a6-a7 b1-b2 b2-b3 b3-b4 b4-b5 b5-b6 b6-b7 b7-b8 b8-b9 a1-b1 a3-b4 a4-b5 a5-b7 a7-b9 b9-g1 b4-t3 t3-t0 t0-t1 t0-t2 t0-t4 a5-c1 c1-c2 a6-c2'.split(' ').map(e => e.split('-'));
function crewPath(from, to){
  const prev = { [from]:null }, q = [from];
  while (q.length){ const n = q.shift(); if (n === to) break;
    for (const [a, b] of CREW_EDGES){ const o = a === n ? b : b === n ? a : null; if (o && !(o in prev)){ prev[o] = n; q.push(o); } } }
  const out = []; for (let n = to; n; n = prev[n]) out.unshift(n); return out;
}
function crewMan(u, v, spec, face){
  const p = AIRP(u + rr(-.3, .3), v + rr(-.3, .3));
  const c = { team:'civ', x:p[0], z:p[1], vx:0, vz:0, face: face == null ? rnd()*6.283 : face, alive:true, down:false, hp:100, hp0:100, sup:0, pinned:false, stance:'stand',
    moving:false, path:[], order:null, auto:null, firing:0, reloading:false, healing:false, talkT:0, role:spec.role || 'idle', waitT:rr(1, 6), spd:spec.spd || rr(1.0, 1.3) };
  const rig = buildRig('base', spec); rig.gun.visible = false; world.add(rig.root); rig.root.position.set(c.x, 0, c.z); rig.root.rotation.y = c.face;
  c.m = rig; CREW.push(c); return c;
}
const AIRF = d => AIR_RY + d;                          // a facing in the base frame: 0 = toward the runway
function spawnCrew(){
  CREW = [];
  const V = ['tee', 'tee', 'tan', 'dcu', 'boonie', 'dcu', 'tee'];
  // walkers going about their business between the tents, the hangars, the terminal and the flight line
  const nodes = Object.keys(CREW_NODES).filter(n => n[0] !== 'g');
  for (let k=0;k<9;k++){ const n = pick(nodes), c = crewMan(CREW_NODES[n][0], CREW_NODES[n][1], { v:pick(V), role:'walk' }); c.node = n; c.waitT = rr(0, 4); }
  // a PT run in file round the inside of the fence
  const loop = [[-186,-178], [186,-178], [186,-122], [-186,-119]];
  for (let k=0;k<4;k++){ const c = crewMan(-150 + k*2.2, -178, { v:'pt', role:'jog', spd:2.7 }); c.loop = loop.map(q => AIRP(q[0], q[1])); c.li = 1; }
  // knots of men talking: by the tents, outside the terminal, by the convoy, under a C-130's wing
  for (const [gu, gv, n, vs] of [[-53,-131,3,['tee','tan','tee']], [40,-118,3,['dcu','dcu','boonie']], [118,-112,4,['dcu','tee','boonie','tan']], [90,-35,2,['mech','dcu']]]){
    const cen = AIRP(gu, gv);
    for (let k=0;k<n;k++){ const a = k/n*6.283 + rr(-.3, .3), q = [gu + Math.cos(a)*1.1, gv + Math.sin(a)*1.1], p = AIRP(q[0], q[1]);
      const c = crewMan(q[0], q[1], { v:vs[k], role:'chat' }, Math.atan2(cen[0] - p[0], cen[1] - p[1])); c.talkT = rnd() < .4 ? rr(.5, 2) : 0; } }
  // mechanics at the helicopters: one kneeling at a wheel, one standing at the cabin door
  for (const k of [6, 7]){ const u = BHROW.u + k*BHROW.step;
    const a = crewMan(u + 2.2, BHROW.v + 2.5, { v:'mech', role:'kneel' }, AIRF(-PH)); a.stance = 'crouch';
    crewMan(u - 2.6, BHROW.v - .5, { v:'mech', role:'still' }, AIRF(PH)); }
  { const a = crewMan(LBROW.u + 5*LBROW.step + 1.8, LBROW.v + 1, { v:'mech', role:'kneel' }, AIRF(-PH)); a.stance = 'crouch'; }
  // the gate guards
  for (const dv of [-4.5, 4.5]) crewMan(BASE.u1 - 1.5, BASE.gateV + dv, { v:'dcu', role:'still' }, AIRF(PH));
}
function updCrew(dt){
  const ctr = AIRP(0, -100), near = Math.hypot(camS.tx - ctr[0], camS.tz - ctr[1]) < 300 || (typeof FLIGHT !== 'undefined' && FLIGHT && FLIGHT.on && FLIGHT.s < 400);
  if (!CREW){ if (!near) return; spawnCrew(); }
  for (const c of CREW) c.m.root.visible = near;
  if (!near || dt <= 0) return;
  for (const c of CREW){
    let tx = null, tz = null;
    if (c.role === 'walk'){
      if (!c.path.length){ c.waitT -= dt; if (c.waitT <= 0){ let to = c.node; while (to === c.node) to = pick(Object.keys(CREW_NODES));
        c.path = crewPath(c.node, to).slice(1).map(n => { const q = CREW_NODES[n]; return { n, p:AIRP(q[0] + rr(-1.2, 1.2), q[1] + rr(-1.2, 1.2)) }; }); c.waitT = rr(2, 9); } }
      if (c.path.length){ tx = c.path[0].p[0]; tz = c.path[0].p[1]; if (Math.hypot(tx - c.x, tz - c.z) < .4){ c.node = c.path[0].n; c.path.shift(); } }
    } else if (c.role === 'jog'){ const q = c.loop[c.li]; tx = q[0]; tz = q[1]; if (Math.hypot(tx - c.x, tz - c.z) < .6) c.li = (c.li + 1) % c.loop.length; }
    else if (c.role === 'chat'){ c.waitT -= dt; if (c.waitT <= 0){ c.waitT = rr(1.5, 5); if (rnd() < .45) c.talkT = rr(1, 2.6); } }
    let moving = false;
    if (tx != null){ const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz) || 1e-4, want = c.role === 'jog' ? c.spd : c.spd*.8, a = 1 - Math.exp(-6*dt);
      c.vx += (dx/d*want - c.vx)*a; c.vz += (dz/d*want - c.vz)*a; c.x += c.vx*dt; c.z += c.vz*dt; moving = true; }
    else { const f = Math.exp(-10*dt); c.vx *= f; c.vz *= f; }
    c.moving = moving; if (moving && Math.hypot(c.vx, c.vz) > .2) c.face = Math.atan2(c.vx, c.vz);
    const r = c.m.root; r.position.set(c.x, 0, c.z);
    let df = c.face - r.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); r.rotation.y += clamp(df*Math.min(1, dt*8), -dt*8, dt*8);
    animRig(c, dt);
    const m = c.m, sp = Math.hypot(c.vx, c.vz), run = clamp((sp - 1.2) / 1.5, 0, 1), w = clamp(sp/.9, 0, 1), s = Math.sin(m.phase);
    m.shR.rotation.x += s*(.35 + .5*run)*w; m.shL.rotation.x -= s*(.35 + .5*run)*w; m.elR.rotation.x -= 1.1*run; m.elL.rotation.x -= 1.1*run;
    if (c.role === 'still' && c.v !== 'mech'){ m.shR.rotation.x -= .15; m.shL.rotation.x -= .15; }
    if (c.role === 'chat' && c.talkT > 0){ m.elR.rotation.x -= .6 + Math.sin(performance.now()/260)*.25; }
  }
}

const STAD_GX = [398, 404, 410, 416, 422], STAD_GZ = [50, 57.5, 64.5, 71.5];   // the lanes between the tents
let STADC = null;
function spawnStadCrew(){
  STADC = [];
  const add = (look, x, z, face, role, o) => { const rig = buildRig(look, { gun:'m16' }); rig.gun.visible = !!(o && o.gun); world.add(rig.root); rig.root.position.set(x, 0, z); rig.root.rotation.y = face;
    const c = Object.assign({ team:'civ', x, z, vx:0, vz:0, face, alive:true, down:false, hp:100, hp0:100, sup:0, pinned:false, stance:'stand', moving:false, path:[], order:null, auto:null,
      firing:0, reloading:false, healing:false, talkT:0, role, waitT:rr(1, 6), spd:rr(1.0, 1.25), m:rig }, o || {});
    STADC.push(c); return c; };
  // sentries at the south gate and at the vehicle park
  add('pak', 412.4, 85, 0, 'still', { gun:true }); add('pak', 417.6, 85, 0, 'still', { gun:true }); add('pak', 432.5, 47.5, -PH*.6, 'still', { gun:true });
  // men walking the lanes between the tents
  const walker = (look, n) => { for (let k=0;k<n;k++){ const gi = ri(STAD_GX.length), gj = ri(STAD_GZ.length), c = add(look, STAD_GX[gi] + rr(-.4, .4), STAD_GZ[gj] + rr(-.4, .4), rnd()*6.283, 'walk'); c.gi = gi; c.gj = gj; c.waitT = rr(0, 4); } };
  walker('pak', 7);
  // knots of men talking by the tents and the lorries
  for (const [gx, gz, n] of [[429.3, 61, 3], [416, 47.8, 2], [398.2, 47.5, 2]]) for (let k=0;k<n;k++){ const a = k/n*6.283 + rr(-.3, .3), x = gx + Math.cos(a)*1.0, z = gz + Math.sin(a)*1.0;
    const c = add('pak', x, z, Math.atan2(gx - x, gz - z), 'chat'); c.talkT = rnd() < .4 ? rr(.5, 2) : 0; }
  add('pak', 407, 58.6, PH, 'still').poseName = 'sit';
  // the last night: the Rangers who came in before, bare-headed now, walking about, standing by the dead
  if (MIS && MIS.id === 'mile'){ walker('base', 6);
    for (const [x, z, f] of [[431, 77.6, Math.PI], [433.2, 77.4, Math.PI*1.1], [427.4, 71.4, PH*.4]]) add('base', x, z, f, 'still'); }
}
function updStadCrew(dt){
  const near = Math.hypot(camS.tx - STADIUM.x, camS.tz - STADIUM.z) < 130;
  if (!STADC){ if (!near) return; spawnStadCrew(); }
  for (const c of STADC) c.m.root.visible = near;
  if (!near || dt <= 0) return;
  for (const c of STADC){
    let tx = null, tz = null;
    if (c.role === 'walk'){
      if (c.tx == null){ c.waitT -= dt; if (c.waitT <= 0){
        const opts = [[1,0],[-1,0],[0,1],[0,-1]].map(([a, b]) => [c.gi + a, c.gj + b]).filter(([i, j]) => i >= 0 && i < STAD_GX.length && j >= 0 && j < STAD_GZ.length), [i, j] = pick(opts);
        c.gi = i; c.gj = j; c.tx = STAD_GX[i] + rr(-.45, .45); c.tz = STAD_GZ[j] + rr(-.45, .45); } }
      if (c.tx != null){ tx = c.tx; tz = c.tz; if (Math.hypot(tx - c.x, tz - c.z) < .4){ c.tx = null; c.waitT = rnd() < .6 ? rr(.1, .6) : rr(2, 7); } }
    } else if (c.role === 'chat'){ c.waitT -= dt; if (c.waitT <= 0){ c.waitT = rr(1.5, 5); if (rnd() < .45) c.talkT = rr(1, 2.6); } }
    let moving = false;
    if (tx != null){ const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz) || 1e-4, want = c.spd*.8, a = 1 - Math.exp(-6*dt);
      c.vx += (dx/d*want - c.vx)*a; c.vz += (dz/d*want - c.vz)*a; c.x += c.vx*dt; c.z += c.vz*dt; moving = true; }
    else { const f = Math.exp(-10*dt); c.vx *= f; c.vz *= f; }
    c.moving = moving; if (moving && Math.hypot(c.vx, c.vz) > .2) c.face = Math.atan2(c.vx, c.vz);
    const r = c.m.root; r.position.set(c.x, 0, c.z);
    let df = c.face - r.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); r.rotation.y += clamp(df*Math.min(1, dt*8), -dt*8, dt*8);
    animRig(c, dt);
    const m = c.m, sp = Math.hypot(c.vx, c.vz), w = clamp(sp/.9, 0, 1), s = Math.sin(m.phase);
    m.shR.rotation.x += s*.35*w; m.shL.rotation.x -= s*.35*w;
    if (c.role === 'chat' && c.talkT > 0){ m.elR.rotation.x -= .6 + Math.sin(performance.now()/260)*.25; }
  }
}

function looks(look, spec){
  const P = { pelvis:[], abd:[], chest:[], neck:[], head:[], uaL:[], faL:[], hdL:[], uaR:[], faR:[], hdR:[], thL:[], shL:[], ftL:[], thR:[], shR:[], ftR:[], gun:[], mag:[], cant:[], strap:[], sling:[], tail:[], ant1:[], ant2:[] };
  const skin = spec.skin || 0xc48b63;
  if (look === 'base') return baseLook(P, spec);
  if (look === 'militia' || look === 'civ'){
    const civ = look === 'civ', woman = civ && spec.woman;
    const sk = pick([0x4a3020,0x553624,0x3e281c,0x5e3c26]), hair = 0x151311;
    const shirt = pick([0xc8beaa,0x6c7a86,0x8a5e4e,0x7a805e,0xd6cdb8,0x58566a,0xa8925e,0xb8b0a0,0x5a6a4a,0x9a4a3a]);
    const spt = pick([UPT.CLOTH, UPT.CLOTH, UPT.PLAID, UPT.STRIPE]);
    const pants = pick([0x3a3a36,0x6b5a45,0x2f3a4a,0x5b5040,0x8a7a60,0x4a5236]);
    const kilt = woman || rnd() < .45, lower = woman ? pick([0x8a2a4a,0x2a6a8a,0xc89a2a,0x6a3a8a,0x3a7a5a,0xb04a2a]) : kilt ? pick([0x6a5a7a,0x7a6a4a,0x4a5a6a,0x8a5a4a,0x3a5a5a]) : pants, lpt = kilt ? UPT.PLAID : UPT.CLOTH;
    E(P.pelvis, .28,.16,.18, 0,0,0, lower, 1.05, lpt);
    if (rnd() < .6) Bx(P.pelvis, .3,.035,.2, 0,.06,0, pick([0x3a2a1c,0x4a3a2a,0x1c1c1a]), UPT.LEATHER);
    E(P.abd, .27,.18,.17, 0,.07,0, shirt, 1.04, spt);
    E(P.chest, .29,.24,.18, 0,.08,0, shirt, 1.1, spt);
    Sp(P.chest, .1,.1,.1, .18,.18,0, shirt, spt); Sp(P.chest, .1,.1,.1, -.18,.18,0, shirt, spt);
    const rig = civ ? 1 : rnd();
    if (rig < .35){ const rc = pick([0x6a6a4a,0x5a5a3e,0x7a704e]);
      Bx(P.abd, .26,.11,.065, 0,.12,.1, rc, UPT.CLOTH); for (let k=0;k<3;k++) Bx(P.abd, .07,.08,.03, -.08+k*.08,.12,.14, shade(rc,.9), UPT.CLOTH);
      Bx(P.chest, .04,.03,.27, .1,.18,0, rc, UPT.WEB, -.25); Bx(P.chest, .04,.03,.27, -.1,.18,0, rc, UPT.WEB, -.25);
    } else if (rig < .6){
      Bx(P.chest, .05,.42,.03, 0,.04,.1, 0x3a3428, UPT.LEATHER, 0,0,.62); for (let k=0;k<5;k++) Bx(P.chest, .012,.03,.012, -.1+k*.05,-.08+k*.06,.118, 0xc8a24a, UPT.NONE, 0,0,.62);
    }
    if (rnd() < .3){ const scc = pick([0xd8d0bc,0x9a3a2e,0x3a5a8a,0xc9a24a]); E(P.neck, .17,.05,.16, 0,.02,0, scc, 1, UPT.PLAID);
      Bx(P.tail, .055,.15,.012, 0,-.07,0, scc, UPT.PLAID); Bx(P.tail, .06,.02,.016, 0,-.15,0, shade(scc,.85), UPT.PLAID); P.tailAt = [.03,.03,-.075]; }
    E(P.neck, .075,.08,.075, 0,.03,0, sk, .95, UPT.SKIN);
    face(P, sk, hair, { beard: rnd() < .35, stubble: rnd() < .4 });
    Dm(P.head, .158,.085,.168, 0,.132,-.006, hair, UPT.HAIR);
    const hat = woman ? 2 : rnd();
    if (woman){ const sc = pick([0x2a2a3a,0x6a2a3a,0xd8c8a8,0x3a5a7a,0x8a5a2a]); Dm(P.head, .2,.13,.21, 0,.12,0, sc, UPT.CLOTH); E(P.head, .2,.2,.2, 0,.02,-.01, sc, 1.05, UPT.CLOTH); E(P.neck, .26,.14,.22, 0,-.02,0, sc, 1.2, UPT.CLOTH);
      Bx(P.tail, .13,.22,.014, 0,-.105,0, sc, UPT.CLOTH); P.tailAt = [0,.03,-.1]; }
    if (hat < .25) Dm(P.head, .175,.095,.182, 0,.142,0, pick([0xe6e0d0,0xd8d0bc,0x2a2a28]), UPT.CLOTH);
    else if (hat < .45){ const hc = pick([0xd8d0bc,0x8a3a2a,0x5a6a4a,0xe8e2d0,0x3a5a8a]); E(P.head, .182,.075,.19, 0,.16,0, hc, .88, UPT.PLAID); Bx(P.head, .05,.12,.03, .03,.06,-.09, hc, UPT.PLAID, .3); }
    if (rnd() < .2) Bx(P.head, .112,.024,.018, 0,.1,.086, 0x101010, UPT.NONE);
    const sleeve = rnd() < .5;
    for (const s of ['L','R']){
      const sg = s === 'L' ? 1 : -1;
      E(P['ua'+s], .095,.24,.1, 0,-.11,0, sleeve ? shirt : sk, 1.1, sleeve ? spt : UPT.SKIN);
      Sp(P['fa'+s], .08,.08,.08, 0,0,0, sleeve ? shirt : sk, sleeve ? spt : UPT.SKIN);
      E(P['fa'+s], .078,.19,.08, 0,-.095,0, sk, .9, UPT.SKIN);
      if (rnd() < .2) Cy(P['fa'+s], .085,.02, 0,-.17,0, pick([0xc8a24a,0x8a8a84]), UPT.GUN);
      hand(P['hd'+s], sk, false, sg);
      if (woman){ E(P['th'+s], .17,.27,.18, 0,-.12,0, lower, 1.1, UPT.CLOTH); E(P['sh'+s], .14,.22,.15, 0,-.1,0, lower, 1.15, UPT.CLOTH); }
      else if (kilt){ E(P['th'+s], .15,.26,.16, 0,-.12,0, lower, 1.12, UPT.PLAID); Sp(P['sh'+s], .09,.09,.09, 0,0,0, sk, UPT.SKIN); E(P['sh'+s], .085,.21,.09, 0,-.105,0, sk, 1, UPT.SKIN); }
      else { E(P['th'+s], .125,.27,.13, 0,-.13,0, pants, 1.12, UPT.CLOTH); Sp(P['sh'+s], .11,.1,.11, 0,0,0, pants, UPT.CLOTH); E(P['sh'+s], .1,.21,.1, 0,-.105,0, pants, 1, UPT.CLOTH); }
      if (rnd() < .5){ // sandals
        Bx(P['ft'+s], .095,.045,.18, 0,-.035,.04, sk, UPT.SKIN); Bx(P['ft'+s], .108,.018,.205, 0,-.06,.045, pick([0x2a2622,0x3a3028,0x5a4a3a]), UPT.LEATHER);
        Bx(P['ft'+s], .1,.012,.03, 0,-.012,.07, 0x2a2622, UPT.NONE);
      } else { const sc = pick([0xd8d4c8,0x8a8a84,0x3a3a38]);
        Bx(P['ft'+s], .105,.06,.2, 0,-.03,.04, sc, UPT.CLOTH); Bx(P['ft'+s], .112,.02,.21, 0,-.06,.045, 0xe8e4d8, UPT.RUBBER); }
    }
    const gp = civ ? [[], [[.01,.01,.01, 0,0,0, 0x000000]]] : gunParts(spec.gun === 'rpg' ? 'rpg' : 'ak'); P.gun = gp[0]; P.mag = gp[1];
    if (!civ && spec.gun !== 'rpg'){ const slc = [0x3a2a1c, 0x4a4a32, 0x2a2622][(sk >> 4) % 3];   /* no extra draw from the random stream: the missions play out as before */ Bx(P.sling, .022,.2,.006, 0,-.1,0, slc, UPT.LEATHER); P.slingAt = [0,-.03,-.22]; }
    if (!civ && rnd() < .2){ Cy(P.chest, .06,.7, .08,.12,-.15, 0x4a5a3a, UPT.CLOTH, .9); Cy(P.chest, .09,.12, .1,.42,-.0, 0x3a4a2e, UPT.CLOTH, .9); }
    return P;
  }
  const delta = look === 'delta', pak = look === 'pak', hair = pick(HAIRS);
  const UC = pak ? 0x55603a : DCU, UPU = pak ? UPT.CLOTH : UPT.DCU;   // the Pakistani UN troops: olive green, a sand vest, the blue helmet
  const vest = delta ? BLK : pak ? 0xc3ad80 : WDL, vpt = delta ? UPT.WEB : pak ? UPT.CLOTH : UPT.WDL, pouch = delta ? 0x2e2e2c : pak ? 0xa8956a : OD;
  // pelvis & belt
  E(P.pelvis, .29,.17,.19, 0,-.01,0, UC, 1.06, UPU); Sp(P.pelvis, .16,.1,.14, 0,-.08,0, UC, UPU);
  Bx(P.pelvis, .315,.045,.215, 0,.06,0, delta ? BLK : OD, UPT.WEB); Bx(P.pelvis, .04,.035,.012, 0,.06,.11, 0x6a6a5a, UPT.GUN);
  if (delta){ Bx(P.pelvis, .06,.07,.05, .13,.03,.08, BLK, UPT.WEB); Bx(P.pelvis, .12,.09,.05, 0,.0,-.12, BLK, UPT.WEB); }
  else { for (const s of [-1,1]){ Bx(P.pelvis, .07,.08,.055, s*.1,.02,.1, OD, UPT.WEB); Bx(P.pelvis, .074,.025,.062, s*.1,.065,.1, shade(OD,.85), UPT.WEB); }
    Bx(P.pelvis, .06,.06,.05, .13,.02,-.07, OD, UPT.WEB);
    Cy(P.cant, .085,.13, 0,-.072,0, pak ? 0x4a5236 : OD, UPT.WEB); Cy(P.cant, .03,.02, 0,.004,0, 0x2a2a24, UPT.GUN); Bx(P.cant, .034,.03,.014, 0,-.008,.042, shade(OD,.85), UPT.WEB); P.cantAt = [-.12,.072,-.1]; }
  if (delta){ Bx(P.cant, .085,.1,.05, 0,-.06,0, 0x2e2e2c, UPT.WEB); Bx(P.cant, .088,.022,.054, 0,-.012,0, BLK, UPT.WEB); P.cantAt = [.135,.055,-.07]; }
  Bx(P.strap, .026,.15,.006, 0,-.075,0, delta ? 0x2e2e2c : shade(OD,.8), UPT.WEB); Bx(P.strap, .03,.018,.01, 0,-.15,0, 0x2a2a24, UPT.GUN); P.strapAt = [.158,.045,.035];
  // abdomen
  E(P.abd, .27,.18,.18, 0,.07,0, UC, 1.04, UPU);
  Bx(P.abd, .33,.15,.24, 0,.085,0, vest, vpt);
  for (let k=0;k<3;k++){ Bx(P.abd, .075,.1,.05, -.09+k*.09,.075,.13, k===1 && delta ? 0x3a3a36 : pouch, UPT.WEB); Bx(P.abd, .078,.028,.055, -.09+k*.09,.125,.132, shade(pouch,.85), UPT.WEB); }
  // chest
  E(P.chest, .3,.24,.2, 0,.08,0, UC, 1.1, UPU);
  Sp(P.chest, .12,.12,.12, .185,.175,0, UC, UPU); Sp(P.chest, .12,.12,.12, -.185,.175,0, UC, UPU);
  Bx(P.chest, .35,.2,.25, 0,.075,0, vest, vpt); Bx(P.chest, .3,.05,.24, 0,.18,-.012, shade(vest,.9), vpt);
  for (const s of [-1,1]) Bx(P.chest, .06,.03,.27, s*.1,.19,0, delta ? BLK : OD, UPT.WEB);
  if (delta){ Bx(P.chest, .07,.12,.06, .17,.1,.03, 0x30302c, UPT.WEB); Cy(P.chest, .012,.11, .2,.2,.02, BLK, UPT.GUN); Bx(P.chest, .05,.06,.04, -.11,.12,.13, BLK, UPT.WEB); }
  else { Bx(P.chest, .05,.06,.04, .1,.13,.13, OD, UPT.WEB); Cy(P.chest, .05,.06, -.1,.12,.135, 0x3a4030, UPT.GUN, PH); }
  const kit = spec.kit;
  if (kit === 'radio'){ Bx(P.chest, .2,.27,.11, 0,.07,-.17, OD, UPT.WEB); Bx(P.chest, .18,.06,.1, 0,.22,-.17, 0x4a4a32, UPT.WEB);
    Bx(P.chest, .04,.07,.03, -.16,.16,.1, BLK, UPT.GUN); Bx(P.chest, .03,.03,.03, .05,.25,-.2, 0x3a3a34, UPT.GUN); }
  else if (kit === 'medic'){ Bx(P.chest, .24,.26,.13, 0,.06,-.18, delta ? 0x3a3a34 : OD, UPT.WEB); Bx(P.chest, .06,.02,.01, 0,.1,-.25, 0xd8d0c0, UPT.NONE); Bx(P.chest, .02,.06,.01, 0,.1,-.25, 0xd8d0c0, UPT.NONE); }
  else if (kit === 'pack'){ Bx(P.chest, .22,.22,.1, 0,.06,-.16, rnd()<.5 ? OD : 0x4f5c36, UPT.WEB); Cy(P.chest, .07,.24, 0,.2,-.16, OD, UPT.CLOTH, 0,0,PH); }
  else if (kit === 'hydra'){ Bx(P.chest, .18,.25,.07, 0,.07,-.14, BLK, UPT.WEB); Cy(P.chest, .012,.2, .1,.15,-.08, 0x2a2a2a, UPT.RUBBER, .3); }
  else if (kit === 'breach'){ Bx(P.chest, .18,.25,.07, 0,.07,-.14, BLK, UPT.WEB); Cy(P.chest, .035,.55, .06,.14,-.19, 0x2a2a28, UPT.GUN, .4,0,.3); }
  // neck & head
  E(P.neck, .075,.08,.075, 0,.03,0, skin, .95, UPT.SKIN);
  face(P, skin, hair, { beard: delta && rnd() < .5, stubble: rnd() < .5 });
  if (delta){
    Dm(P.head, .21,.15,.22, 0,.145,0, 0x232322, UPT.RUBBER); E(P.head, .214,.03,.224, 0,.15,0, 0x1c1c1b, 1, UPT.RUBBER);
    for (const s of [-1,1]){ Sp(P.head, .045,.075,.075, s*.1,.1,0, BLK, UPT.RUBBER); Bx(P.head, .012,.08,.012, s*.105,.17,.02, BLK, UPT.NONE); }
    Bx(P.head, .012,.012,.09, .09,.07,.07, BLK, UPT.NONE, 0,-.4,0);
    Bx(P.head, .05,.035,.03, 0,.21,.11, 0x3a3a38, UPT.GUN); Bx(P.head, .075,.05,.065, 0,.255,.135, 0x3e3e3c, UPT.GUN);
    Cy(P.head, .028,.02, .02,.255,.172, 0x55606a, UPT.NONE, PH); Cy(P.head, .028,.02, -.02,.255,.172, 0x55606a, UPT.NONE, PH);
    if (rnd() < .5) Bx(P.head, .118,.026,.016, 0,.1,.088, 0x0e0e0e, UPT.NONE);
  } else if (pak){
    Dm(P.head, .245,.17,.255, 0,.14,0, 0x3c6fb4, UPT.CLOTH, -.07); E(P.head, .252,.03,.265, 0,.152,0, 0x3466a8, 1, UPT.CLOTH, -.07);
    for (const s of [-1,1]) Bx(P.head, .012,.11,.012, s*.068,.08,.035, 0x2a2a24, UPT.NONE, -.35,0,s*.1);
    Bx(P.head, .05,.018,.028, 0,.022,.078, 0x2a2a24, UPT.NONE);
  } else {
    Dm(P.head, .245,.17,.255, 0,.14,0, 0xc2ac80, UPU, -.07); E(P.head, .252,.03,.265, 0,.152,0, 0xb8a276, 1, UPU, -.07);
    Bx(P.head, .18,.018,.04, 0,.162,.124, 0xb8a276, UPU, .1);
    let hn = 7; for (const ch of String(spec.name || '') + (spec.name ? '' : String(skin ^ (hair << 3)))) hn = (Math.imul(hn, 31) + ch.charCodeAt(0)) >>> 0;
    const kitH = /Eversmann/.test(spec.name || '') ? 0 : hn % 20;        // Eversmann wore his goggles on the helmet
    if (kitH < 9){                                                   // goggles pushed up on the helmet
      E(P.head, .236,.016,.246, 0,.172,-.002, 0x1b1b19, .95, UPT.RUBBER, -.07,0,0, 0);       // the elastic strap, level, tight round the helmet
      const tilt = -.42;                                             // they lie on the slope of the helmet's front, just above the brim
      for (const sd of [-1, 1]){
        const x = sd*.037, y = .182, z = .121;
        SpR(P.head, .07,.054,.03, x,y,z, 0x1d1d1b, UPT.RUBBER, tilt, sd*.32, 0);               // rubber eyecup
        SpR(P.head, .056,.04,.014, x + sd*.002,y + .002,z + .011, 0x5a6870, UPT.NONE, tilt, sd*.32, 0);   // smoked lens
        SpR(P.head, .02,.011,.006, x - sd*.01,y + .01,z + .017, 0xb4c0c4, UPT.NONE, tilt, sd*.32, 0);     // glint
      }
      Bx(P.head, .02,.016,.018, 0,.18,.13, 0x1d1d1b, UPT.RUBBER, tilt);                                  // nose bridge
    } else if (kitH < 14){                                           // only an olive elastic band round the helmet
      E(P.head, .236,.012,.245, 0,.172,-.002, 0x4f5236, .94, UPT.CLOTH, -.07,0,0, 0);
    }
    for (const s of [-1,1]) Bx(P.head, .012,.11,.012, s*.068,.08,.035, 0x2a2a24, UPT.NONE, -.35,0,s*.1);
    Bx(P.head, .05,.018,.028, 0,.022,.078, 0x2a2a24, UPT.NONE);
  }
  // arms
  const glove = delta ? 0x5e5e50 : (rnd() < .5 ? 0x2e2a24 : skin);
  for (const s of ['L','R']){
    const sg = s === 'L' ? 1 : -1;
    E(P['ua'+s], .102,.25,.107, 0,-.11,0, UC, 1.12, UPU);
    Sp(P['fa'+s], .092,.092,.092, 0,0,0, UC, UPU);
    E(P['fa'+s], .09,.19,.092, 0,-.095,0, UC, .9, UPU);
    Cy(P['fa'+s], .093,.022, 0,-.18,0, shade(UC,.9), UPU);
    hand(P['hd'+s], glove, glove !== skin, sg);
  }
  Bx(P.uaR, .006,.04,.055, -.055,-.05,0, 0x5a3a3a, UPT.NONE);
  Bx(P.uaL, .006,.03,.045, .056,-.035,0, 0x3a3a2a, UPT.NONE);
  if (!pak) usFlag(P.uaL, .059, -.078);
  legs(P, UC, UPU, BOOT, { cargo:true, pads:delta });
  if (delta){ Bx(P.thR, .04,.13,.09, -.08,-.1,.01, BLK, UPT.WEB); Bx(P.thR, .03,.06,.05, -.1,-.05,.04, GM, UPT.GUN); Bx(P.thL, .04,.1,.09, .075,-.1,0, OD, UPT.WEB); }
  const gp = gunParts(spec.gun || 'm16'); P.gun = gp[0]; P.mag = gp[1];
  P.pistol = [[.026,.115,.034, 0,-.085,.014, 0x1a1a1a],[.024,.045,.05, 0,-.04,-.02, 0x141413]]; P.holster = [[.045,.12,.065, 0,-.05,0, 0x2a2824],[.024,.045,.036, 0,.028,.006, 0x141413]];
  if (spec.gun !== 'rpg'){ Bx(P.sling, .024,.21,.006, 0,-.105,0, delta ? 0x2a2a28 : shade(OD,.85), UPT.WEB); Bx(P.sling, .03,.012,.012, 0,0,0, GM, UPT.GUN); P.slingAt = [0,-.035,(spec.gun === 'car' ? -.2 : -.25)]; }
  return P;
}
/* poses: x rotations are pitch (positive tilts forward / bends the knee back); chest-frame gun offsets */
const POSE_BASE = { py:.52, lie:0, tor:.03, head:.05, rua:[-.25,0,.15], rfa:-1.3, rwr:0, lua:[-.9,0,-.35], lfa:-1.0, lwr:.15, lth:[0,0], lsh:0, lft:0, rth:[0,0], rsh:0, rft:0, gun:[-.1,-.01,.17, .5,.35,0] };
const mkPose = o => { const p = JSON.parse(JSON.stringify(POSE_BASE)); return Object.assign(p, o); };
const POSES = {
  ready: mkPose({}),
  aim:   mkPose({ tor:.07, head:.1, rua:[-.3,0,.25], rfa:-1.7, rwr:.1, lua:[-1.2,0,-.5], lfa:-.35, lwr:-.1, lth:[-.1,0], lsh:.12, rth:[.12,0], rsh:.05, gun:[-.1,.07,.25, 0,0,0] }),
  kneel: mkPose({ py:.33, tor:.1, head:.1, rua:[-.3,0,.25], rfa:-1.7, rwr:.1, lua:[-1.2,0,-.5], lfa:-.35, lwr:-.1, lth:[-1.45,0], lsh:1.45, rth:[.1,0], rsh:1.5, rft:.3, gun:[-.1,.07,.25, 0,0,0] }),
  kneelR:mkPose({ py:.33, tor:.06, lth:[-1.45,0], lsh:1.45, rth:[.1,0], rsh:1.5, rft:.3 }),
  prone: mkPose({ lie:1, tor:0, head:-1.15, rua:[-2.7,0,.25], rfa:-.5, lua:[-2.8,0,-.35], lfa:-.3, lth:[0,.12], lsh:0, rth:[0,-.12], rsh:0, lft:.9, rft:.9, gun:[-.08,.33,.03, -1.5708,0,0] }),
  pushup: mkPose({ lie:1, tor:0, head:-.7, rua:[-1.45,0,.32], rfa:-.1, lua:[-1.45,0,-.32], lfa:-.1, lth:[0,.08], lsh:0, rth:[0,-.08], rsh:0, lft:.9, rft:.9, gun:[-.08,.33,.03, -1.5708,0,0] }),
  cower: mkPose({ lie:1, tor:0, head:-.5, rua:[-2.95,0,.65], rfa:-2.2, rwr:.4, lua:[-2.95,0,-.65], lfa:-2.2, lwr:.4, lth:[-.15,.15], lsh:.35, rth:[0,-.15], rsh:.5, lft:.9, rft:.9, gun:[-.28,.1,.05, -1.3,0,1.3] }),
  treat: mkPose({ py:.33, tor:.5, head:.55, rua:[-.75,0,.12], rfa:-.85, rwr:.3, lua:[-.75,0,-.12], lfa:-.85, lwr:.3, lth:[-1.45,0], lsh:1.45, rth:[.1,0], rsh:1.5, rft:.3, gun:[-.05,.04,-.17, -1.1,0,.5] }),
  blind: mkPose({ py:.33, tor:-.12, head:.25, rua:[-2.55,0,.18], rfa:-.55, lua:[-2.45,0,-.3], lfa:-.45, lth:[-1.45,0], lsh:1.45, rth:[.1,0], rsh:1.5, rft:.3, gun:[-.04,.4,.2, .15,0,0] }),
  collapse: mkPose({ py:.3, tor:.5, head:.6, rua:[.2,0,-.3], rfa:-.4, lua:[.2,0,.3], lfa:-.4, lth:[-1.2,.15], lsh:1.6, rth:[-.9,-.15], rsh:1.7, lft:.5, rft:.5, gun:[-.3,-.04,.2, 1.2,0,.6] }),
  dead:  mkPose({ lie:1, tor:0, head:.35, rua:[-.4,0,-1.3], rfa:-.3, rwr:.5, lua:[-.4,0,1.3], lfa:-.3, lwr:.5, lth:[0,.2], lsh:.2, rth:[0,-.2], rsh:.1, lft:.8, rft:.6, gun:[-.48,.08,-.05, 0,0,1.4] }),
  downed: mkPose({ lie:1, tor:-.1, head:.25, rua:[-1.3,0,.45], rfa:-1.5, rwr:.3, lua:[-.25,0,-1.0], lfa:-.5, lwr:.3, lth:[-.55,.1], lsh:.9, rth:[0,-.15], rsh:.15, lft:.6, rft:.7, gun:[-.5,.05,.1, .2,0,1.3] }),
  carry: mkPose({ tor:.08, head:.05, rua:[-.55,0,.12], rfa:-.35, lua:[-.55,0,-.12], lfa:-.35, gun:[-.3,-.04,.2, 1.2,0,.6] }),
  doorSit: mkPose({ py:.14, tor:.06, head:.2, rua:[-.35,0,.25], rfa:-1.1, lua:[-.7,0,-.35], lfa:-.8, lth:[-1.5,.12], lsh:1.35, rth:[-1.45,-.1], rsh:1.15, lft:.25, rft:.3, gun:[-.12,-.02,.2, .9,.2,.3] }),
  sit:   mkPose({ py:.14, tor:-.18, head:.12, rua:[-.15,0,.25], rfa:-.6, lua:[-.2,0,-.3], lfa:-.6, lth:[-1.5,0], lsh:.05, rth:[-1.5,0], rsh:.08, lft:-.2, rft:-.2, gun:[-.3,-.04,.2, 1.2,0,.6] }),
  civ:   mkPose({ tor:.02, head:.02, rua:[.08,0,-.1], rfa:-.25, rwr:0, lua:[.08,0,.1], lfa:-.25, lwr:0 }),
  dead2: mkPose({ lie:1, tor:.35, head:.5, rua:[-.9,0,.3], rfa:-1.2, rwr:.6, lua:[-.6,0,-.2], lfa:-1.5, lwr:.6, lth:[-1.0,.1], lsh:1.3, rth:[-.6,-.1], rsh:1.0, lft:.5, rft:.4, gun:[-.5,.0,.1, .3,0,1.2] }),
};
const POSE_KEYS = ['py','lie','tor','head','rfa','lfa','lsh','rsh'];
const hitMat = new T.MeshBasicMaterial({ visible:false });
const hitGeo = new T.BoxGeometry(0.9,1.5,0.9);

/* overlay markers: drawn after the film grade so blue/red stay vivid */
const overlay = new T.Scene();
{ const rm = overlay.remove.bind(overlay); overlay.remove = (...o) => { for (const x of o) if (x && x.parent && x.parent !== overlay) x.parent.remove(x); return rm(...o); }; }
// a marker drawn flat on the ground: into the world, depth-tested, a hair above the sand, never casting or catching shadow
function grounded(o, y){
  o.traverse(m => { if (m.material){ m.material.depthTest = true; m.material.depthWrite = false; m.material.fog = false; m.material.polygonOffset = true; m.material.polygonOffsetFactor = -4; m.material.polygonOffsetUnits = -4; m.material.needsUpdate = true; } m.castShadow = false; m.receiveShadow = false; });
  if (y != null) o.position.y = y; o.renderOrder = 2; world.add(o); return o;
}
const COL_US = 0x3d8bff, COL_THEM = 0xff3b2e;
// a unit's own rings live in the world, on the ground: thin, soft, and hidden behind the man standing in them
function unitRing(r0, r1, col, op){
  const m = new T.Mesh(new T.RingGeometry(r0, r1, 28), new T.MeshBasicMaterial({ color:col, transparent:true, opacity:op, side:T.DoubleSide, depthWrite:false, fog:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 }));
  m.rotation.x = -Math.PI/2; world.add(m); return m;
}
function ovRing(r0, r1, col, op){
  const m = new T.Mesh(new T.RingGeometry(r0, r1, 32), new T.MeshBasicMaterial({ color:col, transparent:true, opacity:op, side:T.DoubleSide, depthTest:false, depthWrite:false }));
  m.rotation.x = -Math.PI/2; overlay.add(m); return m;
}
function iconTex(kind){
  const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d');
  const px = (i,j,col) => { x.fillStyle = col; x.fillRect(i,j,1,1); };
  if (kind === 'them'){
    for (let j=0;j<24;j++) for (let i=0;i<24;i++){ const d = Math.abs(i-11.5) + Math.abs(j-11.5); if (d <= 10.5) px(i,j, d > 9.5 ? '#000000' : '#ff3b2e'); }
    for (let t=0;t<7;t++){ px(9+t,9+t,'#000000'); px(15-t,9+t,'#000000'); }
  } else {
    const sel = kind === 'sel', down = kind === 'down';
    const fill = down ? '#5a6370' : sel ? '#9cc2ec' : '#5c8fca';
    x.fillStyle = '#000000'; x.fillRect(2,6,20,13);
    x.fillStyle = fill; x.fillRect(3,7,18,11);
    if (sel){ x.fillStyle = '#000000'; x.fillRect(1,5,22,1); x.fillRect(1,19,22,1); x.fillRect(1,5,1,15); x.fillRect(22,5,1,15); }
    for (let t=0;t<18;t++){ const y = 7 + Math.round(t*10/17); px(3+t, y, '#000000'); px(20-t, y, '#000000'); }
  }
  const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; return t;
}
const ICONS = { us:iconTex('us'), sel:iconTex('sel'), down:iconTex('down'), them:iconTex('them') };
function ovIcon(kind){ const s = new T.Sprite(new T.SpriteMaterial({ map:ICONS[kind], depthTest:false, depthWrite:false, transparent:true })); overlay.add(s); return s; }
const ghostGeo = new T.OctahedronGeometry(0.22,0);

// one skinned mesh per soldier: every part is bound rigidly to its joint, so the whole man is a single draw call (and a single shadow call)
function boneVis(b){ let v = true; Object.defineProperty(b, 'visible', { get:() => true, set:x => { v = !!x; b.scale.setScalar(v ? (b.baseS || 1) : 0); }, configurable:true }); Object.defineProperty(b, 'shown', { get:() => v }); }
function buildRig(look, spec){
  const P = looks(look, spec), bones = [], parts = [];
  const MIL = (look === 'militia' || (look === 'civ' && !(spec && spec.woman))) && !(spec && spec.boxes);
  // the UN troops and the men at the base wear the Ranger model too (the old part-built look is still drawn first, so the random stream is unchanged)
  const RV = spec && spec.boxes ? null : look === 'pak' ? { helmet:'un' } : look === 'base' ? { helmet:'none', torso:null,   // the men at the base: the Ranger as he is, vest and long sleeves, only bare-headed
   
    skin: spec.skin || BASE_SKINS[RV_N % BASE_SKINS.length], hair: CREW_HAIR[(RV_N++*3) % CREW_HAIR.length] } : null;
  if ((RV && RV.helmet === 'none') || (spec && spec.pilot)){ P.sling = []; P.holster = []; P.pistol = []; }
  const MOD = ((look === 'ranger' || look === 'delta') && !(spec && spec.boxes)) || MIL || !!RV, SJ = MIL ? SOLD_JM : SOLD_J;
  if (MOD){ for (const k of ['pelvis','abd','chest','neck','head','uaL','faL','hdL','uaR','faR','hdR','thL','shL','ftL','thR','shR','ftR','cant','strap','tail']) P[k] = [];
    if (spec && (spec.medic || spec.kit === 'medic') && !MIL) GmE(P.chest, 'alice', 0, ALICE_AT); }
  const jp = (k, x, y, z) => MOD ? SJ[k] : [x, y, z];
  const J = (parent, x,y,z, list) => { const g = new T.Bone(); g.position.set(x,y,z); parent.add(g); bones.push(g); if (list && list.length) parts.push([g, list]); return g; };
  const root = new T.Group(), body = new T.Bone(); bones.push(body);
  const Jp = (par, k, x, y, z, list) => J(par, ...jp(k, x, y, z), list);
  const pelvis = Jp(body, 'pelvis', 0,.52,0, P.pelvis);
  const abd = Jp(pelvis, 'abd', 0,.05,0, P.abd);
  const chest = Jp(abd, 'chest', 0,.15,0, P.chest);
  const neck = Jp(chest, 'neck', 0,.2,0, P.neck);
  const head = Jp(neck, 'head', 0,.05,0, P.head);
  const shL = Jp(chest, 'shL', .2,.19,0, P.uaL), elL = Jp(shL, 'elL', 0,-.23,0, P.faL), wrL = Jp(elL, 'wrL', 0,-.2,0, P.hdL);
  const shR = Jp(chest, 'shR', -.2,.19,0, P.uaR), elR = Jp(shR, 'elR', 0,-.23,0, P.faR), wrR = Jp(elR, 'wrR', 0,-.2,0, P.hdR);
  const hipL = Jp(pelvis, 'hipL', .085,-.03,0, P.thL), knL = Jp(hipL, 'knL', 0,-.26,0, P.shL), anL = Jp(knL, 'anL', 0,-.21,0, P.ftL);
  const hipR = Jp(pelvis, 'hipR', -.085,-.03,0, P.thR), knR = Jp(hipR, 'knR', 0,-.26,0, P.shR), anR = Jp(knR, 'anR', 0,-.21,0, P.ftR);
  const gun = J(chest, 0,0,0, P.gun);
  const gunMag = J(gun, 0,0,0, P.mag), handMag = J(wrL, 0,.03,.01, P.mag);
  const pistol = J(wrR, 0,-.02,.03, P.pistol || []), holster = J(pelvis, -.155,-.05,.01, P.holster || []);
  const swg = [], hang = (par, at, list, o) => { if (!list.length || !at) return; swg.push(Object.assign({ b:J(par, at[0], at[1], at[2], list), axis:SW_DOWN, rest:SW_DOWN }, o)); };
  hang(pelvis, P.cantAt, P.cant, { L:.075, k:60, c:7, lim:.45, in:.7, zMax:.18 });                  // canteen / pouch, knocking against the hip
  hang(pelvis, P.strapAt, P.strap, { L:.09, k:6, c:5, lim:.8, in:.8, xMin:-.12 });               // a loose strap end
  hang(gun, P.slingAt, P.sling, { L:.11, k:5, c:5, lim:.85, in:.7 });                            // the sling under the rifle
  hang(neck, P.tailAt, P.tail, { L:.09, k:8, c:4.5, lim:.7, in:.8, rest:SW_TAIL, zMax:-.08 });         // the end of a scarf down the back
  if (P.ant1.length && P.antAt){ const a1 = J(chest, P.antAt[0], P.antAt[1], P.antAt[2], P.ant1), a2 = J(a1, 0,.28,0, P.ant2);
    swg.push({ b:a1, b2:a2, axis:SW_UP, rest:SW_ANT, L:.55, k:120, c:4, lim:.45, gs:.3, in:1 }); }      // the whip aerial over the radio
  // merge the parts in the rest pose, each vertex weighted wholly to its own joint
  const mesh = new T.SkinnedMesh(new T.BufferGeometry(), unitSkinMat); mesh.add(body); root.add(mesh); mesh.updateMatrixWorld(true);
  const pos = [], nor = [], col = [], pat = [], lp = [], si = [], sw = [], ind = [], uvs = []; let off = 0; const nm = new T.Matrix3();
  if (MOD){ const S_ = soldMesh(MIL ? 'militia' : RV ? 'ranger' : look);      // the model, already in this rest pose, each vertex on up to four bones
    const tk = !MIL ? -1 : spec && spec.tex != null ? spec.tex : look === 'civ' ? CIV_TEX[(CIV_N++*3) % CIV_TEX.length] : MIL_ALL[MIL_N++ % MIL_ALL.length], cl = tk >= 0 ? milCell(tk) : null;
    for (let i=0;i<S_.nv;i++){
      if (RV){ const fl = rgVariant(i, S_, pos, nor, col, RV); uvs.push(S_.U[i*2], S_.U[i*2+1]); pat.push(0); lp.push(fl, 100, 0); for (let q=0;q<4;q++){ si.push(S_.SI[i*4+q]); sw.push(S_.SW[i*4+q]); } continue; }
      else { pos.push(S_.P[i*3], S_.P[i*3+1], S_.P[i*3+2]); nor.push(S_.N[i*3], S_.N[i*3+1], S_.N[i*3+2]); col.push(1, 1, 1);
      if (cl) uvs.push(cl[0] + S_.U[i*2]*cl[2], cl[1] + S_.U[i*2+1]*cl[3]); else uvs.push(S_.U[i*2], S_.U[i*2+1]); } pat.push(0); lp.push(0, 0, 0); for (let q=0;q<4;q++){ si.push(S_.SI[i*4+q]); sw.push(S_.SW[i*4+q]); } }
    for (let i=0;i<S_.I.length;i++) ind.push(S_.I[i]); off = S_.nv; }
  for (const [b, list] of parts){
    const gg = partGeo(list), bi = bones.indexOf(b); nm.getNormalMatrix(b.matrixWorld);
    const pa = gg.attributes.position, na = gg.attributes.normal;
    for (let i=0;i<pa.count;i++){ _v.fromBufferAttribute(pa, i).applyMatrix4(b.matrixWorld); pos.push(_v.x, _v.y, _v.z); _v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nor.push(_v.x, _v.y, _v.z); si.push(bi, 0, 0, 0); sw.push(1, 0, 0, 0); uvs.push(SOLD_UV0[0], SOLD_UV0[1]); }
    col.push(...gg.attributes.color.array); pat.push(...gg.attributes.aPat.array); lp.push(...gg.attributes.aLP.array);
    const ix = gg.index.array; for (let i=0;i<ix.length;i++) ind.push(ix[i] + off); off += pa.count; gg.dispose();
  }
  const geo = mesh.geometry;
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setAttribute('aPat', new T.Float32BufferAttribute(pat, 1)); geo.setAttribute('aLP', new T.Float32BufferAttribute(lp, 3));
  geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4)); geo.setIndex(ind);
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.boundingSphere = new T.Sphere(new T.Vector3(0, .6, 0), 1.7);
  mesh.bind(new T.Skeleton(bones)); mesh.castShadow = true; mesh.receiveShadow = true;
  for (const q of swg) q.b.quaternion.setFromUnitVectors(q.axis, q.rest);   // bound straight, then set to hang at rest
  for (const b of [gun, gunMag, handMag, pistol]) boneVis(b); handMag.visible = false; pistol.visible = false;
  const rig = { root, body, pelvis, abd, chest, torso:chest, neck, head, shL, elL, wrL, shR, elR, wrR, hipL, knL, anL, hipR, knR, anR, gun, gunMag, handMag, pistol, holster, skin:mesh,
    walk:0, phase:rnd()*6, recoil:0, breathe:rnd()*6, fidT:rr(3,9), fid:null, hitSide:1, talkB:0, prevYaw:null, turnW:0, sw:swg };
  if (MOD){ rig.model = look; rig.body.scale.setScalar(SOLD_K); for (const b of [gun, handMag, pistol]){ b.baseS = 1/SOLD_K; b.scale.multiplyScalar(1/SOLD_K); } rig.L1 = -SJ.elL[1]; rig.L2 = -SJ.wrL[1]; rig.armOut = .16; rig.py0 = SJ.pelvis[1];
    const g = MIL ? (look === 'civ' ? 'none' : spec && spec.gun === 'rpg' ? 'rpg' : 'ak') : (spec && spec.gun) || 'm16';
    rig.gripR = g === 'car' ? [0, -.058, -.05] : g === 'ak' ? [0, -.072, -.115] : g === 'rpg' ? [0, .0, .095] : [0, -.055, -.045];
    rig.gripL = g === 'car' ? [0, -.012, .1] : g === 'm203' ? [0, -.07, .2] : g === 'ak' ? [0, -.014, .235] : g === 'rpg' ? [0, -.035, .25] : [0, -.01, .13];
    if (g === 'none') rig.noGun = true; }
  rig.geo0 = geo; rig.lv = 0;
  if (BATCH_ON){ mesh.visible = false; RIGS.push(rig); }   // drawn by its batch, not on its own
  return rig;
}
/* ---------- mesh simplification for distance: vertices are clustered on a grid (optionally never across bones),
   triangles that collapse are dropped. Used for the soldiers and the big models when they are small on screen. ---------- */
function simplifyGeo(geo, cell, keyAttr){
  const P = geo.attributes.position, n = P.count, pa = P.array, idx = geo.index ? geo.index.array : null;
  const K = keyAttr ? geo.attributes[keyAttr].array : null, ks = keyAttr ? geo.attributes[keyAttr].itemSize : 0;
  const map = new Int32Array(n), keys = new Map(), rep = []; let m = 0;
  // never merge across a texture seam or a hard edge: the texture stays where it was and flat faces stay flat
  const UV = geo.attributes.uv, NR = geo.attributes.normal, uq = UV ? (UV.normalized ? 1/65535 : 1) : 0;
  for (let i=0;i<n;i++){
    let k = Math.floor(pa[i*3]/cell) + ',' + Math.floor(pa[i*3+1]/cell) + ',' + Math.floor(pa[i*3+2]/cell) + (K ? ',' + K[i*ks] : '');
    if (UV) k += ',' + Math.round(UV.array[i*2]*uq*48) + ',' + Math.round(UV.array[i*2+1]*uq*48);
    if (NR && !K){ const f = NR.normalized ? 1/127 : 1; k += ',' + Math.round(NR.array[i*3]*f*2) + Math.round(NR.array[i*3+1]*f*2) + Math.round(NR.array[i*3+2]*f*2); }
    let j = keys.get(k); if (j === undefined){ j = m++; keys.set(k, j); rep.push(i); } map[i] = j; }
  const N = idx ? idx.length : n, tri = [];
  for (let t=0;t<N;t+=3){ const a = map[idx ? idx[t] : t], b = map[idx ? idx[t+1] : t+1], c = map[idx ? idx[t+2] : t+2]; if (a !== b && b !== c && a !== c) tri.push(a, b, c); }
  const out = new T.BufferGeometry();
  for (const name in geo.attributes){ const s = geo.attributes[name], sz = s.itemSize, arr = new s.array.constructor(m*sz);
    for (let j=0;j<m;j++){ const i = rep[j]; for (let q=0;q<sz;q++) arr[j*sz + q] = s.array[i*sz + q]; }
    out.setAttribute(name, new T.BufferAttribute(arr, sz, s.normalized)); }
  out.setIndex(m > 65535 ? new T.Uint32BufferAttribute(tri, 1) : new T.Uint16BufferAttribute(tri, 1));
  if (geo.boundingSphere) out.boundingSphere = geo.boundingSphere.clone();
  return out;
}
/* ---------- atmosphere: the sky at the far edge of the view and the shafts of sunlight between the buildings, both drawn in the
   film pass from the depth buffer and the sun's shadow map; their strength follows the hour (long and golden at dawn and dusk) ---------- */
const SKY_D = new T.Color(.50, .64, .82), SKY_G = new T.Color(.46, .44, .62), SKY_N = new T.Color(.035, .05, .09), _sv = new T.Vector3(), _sr = new T.Vector3(), _su = new T.Vector3();
function atmoFrame(now){
  const U = postMat.uniforms, day = 1 - nightF;
  cam.updateMatrixWorld();
  _ipv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert(); U.uInvPV.value.copy(_ipv);
  cam.getWorldDirection(U.uFwd.value); U.uCamP.value.copy(cam.position);
  U.uFogN.value = scene.fog.near; U.uFogF.value = scene.fog.far; U.uCT.value = (now/1000) % 20000;
  U.uSkyHz.value.copy(scene.fog.color).multiplyScalar(1.04);
  U.uSkyTop.value.copy(SKY_D).lerp(SKY_G, goldF*.8).lerp(SKY_N, nightF).lerp(scene.fog.color, .45);
  _sv.copy(sun.position).sub(sun.target.position).normalize();
  _sr.setFromMatrixColumn(cam.matrixWorld, 0); _su.setFromMatrixColumn(cam.matrixWorld, 1);
  U.uSunScr.value.set(_sv.dot(_sr), _sv.dot(_su)); if (U.uSunScr.value.lengthSq() < 1e-6) U.uSunScr.value.set(0, 1); U.uSunScr.value.normalize();
  U.uSunCol.value.copy(sun.color);
  U.uGlow.value = day*(.45 + goldF*.9);
  U.uCloud.value = .55*day + .25*nightF;
  const map = sun.shadow && sun.shadow.map;
  const on = OPT.rays !== false && !!map && !(G && G.nv && nightF > .25);
  U.tShadow.value = map ? map.texture : null; if (map) U.uShadowM.value.copy(sun.shadow.matrix);
  U.uRay.value = window.__rayF != null ? window.__rayF : on ? Math.min(1.0, day*(.3 + goldF*1.0)) : 0;
}
/* ---------- shadow map: the whole city's shadows are only re-rendered when the camera or the sun has moved;
   with a still view only the moving things (soldiers, vehicles, rotors) need it, so it refreshes every few frames ---------- */
const SHK = { x:NaN, z:NaN, yaw:NaN, zoom:NaN, sx:NaN, sy:NaN, sz:NaN, n:0, k:0 };
function shadowFrame(){
  const s = sun.position, moved = Math.abs(camS.tx - SHK.x) > .02 || Math.abs(camS.tz - SHK.z) > .02 || Math.abs(camS.yaw - SHK.yaw) > .001 || Math.abs(camS.zoom - SHK.zoom) > .01
    || Math.abs(s.x - SHK.sx) > .01 || Math.abs(s.y - SHK.sy) > .01 || Math.abs(s.z - SHK.sz) > .01;
  const live = G && G.started && !G.paused && !G.over;
  // the last test: a model that loads late still gets its shadow
  if (moved || (live && ++SHK.n >= gfxQ().shN) || SHK.force || ++SHK.k % 30 === 0){ renderer.shadowMap.needsUpdate = true; SHK.n = 0; SHK.force = false;
    SHK.x = camS.tx; SHK.z = camS.tz; SHK.yaw = camS.yaw; SHK.zoom = camS.zoom; SHK.sx = s.x; SHK.sy = s.y; SHK.sz = s.z; }
}
/* ---------- model LOD: the KC-10, the helicopters, the trucks and the rest of the loaded models carry two lighter
   versions of their geometry (made once, shared by every copy) and swap to them when they are small on screen ---------- */
let LODS = new Set();
function lodLevels(geo){
  if (geo.userData.lods) return geo.userData.lods;
  if (!geo.boundingBox) geo.computeBoundingBox(); if (!geo.boundingSphere) geo.computeBoundingSphere();
  const d = geo.boundingBox.min.distanceTo(geo.boundingBox.max), tris = (geo.index ? geo.index.count : geo.attributes.position.count)/3;
  if (tris < 600) return (geo.userData.lods = [geo, geo, geo]);
  return (geo.userData.lods = [geo, null, null], geo.userData.lodD = d, geo.userData.lods);
}
function lodGet(geo, lv){ const L_ = lodLevels(geo); if (!L_[lv]) L_[lv] = simplifyGeo(geo, geo.userData.lodD/(lv === 1 ? 110 : 45)); return L_[lv]; }
function lodMesh(geo, mat){ const m = new T.Mesh(geo, mat); m.userData.lodBase = geo; m.userData.lv = 0; LODS.add(m); return m; }
function lodReg(m){ m.userData.lodBase = m.geometry; m.userData.lv = 0; LODS.add(m); return m; }
// small things do not throw a shadow below the preset's size (the shadow pass is drawn as often as the view)
const CASTS = new Set();
function castReg(m, geo, sc){ if (!geo.boundingSphere) geo.computeBoundingSphere(); m.userData.castR = geo.boundingSphere.radius*(sc || 1); m.userData.cast0 = m.castShadow;
  m.castShadow = m.userData.cast0 && m.userData.castR >= gfxQ().castR; CASTS.add(m); }
let lodN = 0; const _lodV = new T.Vector3();
function lodFrame(){
  if (++lodN % 6) return;
  for (let k=CRANEM.length-1;k>=0;k--){ const q = CRANEM[k]; if (!q.parent){ CRANEM.splice(k, 1); continue; } q.visible = !(G && G.roofs); }
  const ppm = lowH/(2*halfH());
  for (const m of LODS){
    if (!m.parent){ LODS.delete(m); continue; }
    const base = m.userData.lodBase; if (!base.boundingSphere) base.computeBoundingSphere();
    const r = base.boundingSphere.radius*m.matrixWorld.getMaxScaleOnAxis(), px = 2*r*ppm;
    const lb = gfxQ().lod; let lv = px > 110*lb ? 0 : px > 45*lb ? 1 : 2;
    if (lv !== m.userData.lv){ m.userData.lv = lv; m.geometry = lv ? lodGet(base, lv) : base; }
  }
}
/* ---------- soldier batches: every man shares one material, so up to BATCH_MAX of them are drawn as one skinned mesh
   with all their skeletons side by side: one draw call (and one shadow call) per batch instead of one per soldier.
   Each rig keeps its own bones and is animated exactly as before; the batch only borrows them. ---------- */
const BATCH_ON = renderer.capabilities.floatVertexTextures && !/batch=0/.test(location.search);
const BATCH_MAX = 12;
let RIGS = [], BATCHES = [];
const _rigHid = [];
function rigInScene(r){ let o = r.root; while (o){ if (o === scene) return true; o = o.parent; } return false; }
function rigShown(r){ let o = r.root; while (o && o !== scene){ if (!o.visible) return false; o = o.parent; } return !!o; }
function batchReset(){ for (const b of BATCHES) batchDrop(b); BATCHES = []; RIGS = []; }
function batchDrop(b){ if (b.mesh){ scene.remove(b.mesh); b.mesh.geometry.dispose(); if (b.mesh.skeleton && b.mesh.skeleton.boneTexture) b.mesh.skeleton.boneTexture.dispose(); b.mesh = null; } }
function batchBuild(b){
  batchDrop(b); if (!b.rigs.length) return;
  const names = ['position', 'normal', 'color', 'aPat', 'aLP', 'skinWeight', 'uv'];
  let nv = 0, ni = 0; for (const r of b.rigs){ const gg = r.skin.geometry; nv += gg.attributes.position.count; ni += gg.index.count; }
  const A = {}; for (const n of names){ const s = b.rigs[0].skin.geometry.attributes[n]; A[n] = new Float32Array(nv*s.itemSize); }
  const SI = new Uint16Array(nv*4), IX = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni), bones = [], inv = [];
  let vo = 0, io = 0;
  for (const r of b.rigs){ const gg = r.skin.geometry, sk = r.skin.skeleton, bo = bones.length, n = gg.attributes.position.count;
    for (const nm of names){ const s = gg.attributes[nm]; A[nm].set(s.array, vo*s.itemSize); }
    const si = gg.attributes.skinIndex.array; for (let k=0;k<n*4;k++) SI[vo*4 + k] = si[k] + bo;
    const ix = gg.index.array; for (let k=0;k<ix.length;k++) IX[io + k] = ix[k] + vo;
    for (let k=0;k<sk.bones.length;k++){ bones.push(sk.bones[k]); inv.push(sk.boneInverses[k]); }
    r.bone0 = bo; vo += n; io += ix.length; }
  const geo = new T.BufferGeometry();
  for (const nm of names) geo.setAttribute(nm, new T.BufferAttribute(A[nm], b.rigs[0].skin.geometry.attributes[nm].itemSize));
  geo.setAttribute('skinIndex', new T.BufferAttribute(SI, 4)); geo.setIndex(new T.BufferAttribute(IX, 1));
  geo.boundingSphere = new T.Sphere(new T.Vector3(), 1e4);
  const mesh = new T.SkinnedMesh(geo, unitSkinMat); mesh.bindMode = 'detached'; mesh.castShadow = mesh.receiveShadow = true;
  mesh.raycast = () => {}; mesh.bind(new T.Skeleton(bones, inv), new T.Matrix4());
  scene.add(mesh); b.mesh = mesh;
}
// once a frame, before drawing: new men join the nearest batch with room, men who wander off move to one near them,
// men taken out of the world leave theirs; each batch is then culled as a whole by a sphere round its men
let batchT = 0;
const rigPos = r => r.root.parent === world ? r.root.position : _rp.setFromMatrixPosition(r.root.matrixWorld);
const _rp = new T.Vector3();
function batchCentre(b){ let x = 0, z = 0; for (const r of b.rigs){ const p = rigPos(r); x += p.x; z += p.z; } b.cx = x/b.rigs.length; b.cz = z/b.rigs.length; }
// soldier detail follows how big a man is on screen: full model up close, lighter ones (same skeleton, same look) further out
let SOLDIER_LV = 0; const LV_CELL = [0, .028, .042];
function soldierLod(){
  const ppm = lowH/(2*halfH()); let lv = SOLDIER_LV;
  if (ppm > 36) lv = 0; else if (lv === 0 && ppm < 31) lv = 1;
  if (ppm < 13) lv = 2; else if (lv === 2 && ppm > 16) lv = 1;
  SOLDIER_LV = lv; let budget = 1;   // at most one new simplified man per frame, and only for men actually on view
  const one = r => { if (!r || r.lv === lv || !r.geo0) return; let geo = lv ? (r.lods && r.lods[lv]) : r.geo0;
    if (!geo && budget > 0 && rigShown(r)){ budget--; (r.lods || (r.lods = {}))[lv] = geo = simplifyGeo(r.geo0, LV_CELL[lv], 'skinIndex'); }
    if (geo){ r.lv = lv; r.skin.geometry = geo; if (r.batch) r.batch.dirty = true; } };
  for (const r of RIGS) one(r); for (const u of them) one(u.m);
}
function batchFrame(){
  soldierLod();
  if (!BATCH_ON) return;
  const pend = [];
  // only men standing in the world are batched; a man riding in a helicopter or a vehicle moves with it and draws himself
  for (const r of RIGS){ const inS = r.root.parent === world && rigInScene(r); r.skin.visible = !inS;
    if (r.batch && !inS){ r.batch.dirty = true; r.batch.rigs.splice(r.batch.rigs.indexOf(r), 1); r.batch = null; }
    else if (!r.batch && inS) pend.push(r); }
  RIGS = RIGS.filter(r => r.batch || r.root.parent);
  for (const b of BATCHES) if (b.rigs.length) batchCentre(b);
  if (performance.now() > batchT){ batchT = performance.now() + 500; let moved = 0;
    for (const b of BATCHES) for (const r of b.rigs.slice()){ if (moved >= 8) break; const p = rigPos(r);
      if (Math.hypot(p.x - b.cx, p.z - b.cz) > 16){ b.rigs.splice(b.rigs.indexOf(r), 1); b.dirty = true; r.batch = null; pend.push(r); moved++; } } }
  for (const r of pend){ const p = rigPos(r); let best = null, bd = 12;
    for (const b of BATCHES){ if (b.rigs.length >= BATCH_MAX || !b.rigs.length) continue; const d = Math.hypot(p.x - b.cx, p.z - b.cz); if (d < bd){ bd = d; best = b; } }
    if (!best){ best = { rigs:[], mesh:null, dirty:true, cx:p.x, cz:p.z }; BATCHES.push(best); }
    best.rigs.push(r); r.batch = best; best.dirty = true; batchCentre(best); }
  for (const b of BATCHES) if (b.dirty){ b.dirty = false; batchBuild(b); }
  BATCHES = BATCHES.filter(b => b.rigs.length || (batchDrop(b), false));
}
// the cull sphere of each batch, from this frame's matrices (called right after the scene's matrices are refreshed)
function batchSpheres(){
  for (const b of BATCHES){ if (!b.mesh) continue; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const r of b.rigs){ const e = r.root.matrixWorld.elements, x = e[12], y = e[13], z = e[14]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    const s = b.mesh.geometry.boundingSphere; s.center.set((x0 + x1)/2, (y0 + y1)/2 + 1, (z0 + z1)/2); s.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0)/2 + 2.5; }
}
// called with the scene's matrices fresh: fold the men who should not be seen, and give their bones back after the frame is drawn
function batchHide(){
  _rigHid.length = 0; if (!BATCH_ON) return;
  for (const b of BATCHES) for (const r of b.rigs) if (!rigShown(r)) for (const bn of r.skin.skeleton.bones){ _rigHid.push(bn, bn.matrixWorld.clone()); bn.matrixWorld.makeScale(0, 0, 0); }
}
function batchRestore(){ for (let k=0;k<_rigHid.length;k+=2) _rigHid[k].matrixWorld.copy(_rigHid[k+1]); _rigHid.length = 0; }
function makeUnit(team, i, j, spec){
  if (team === 'them' && rpgEligible(spec) && ++RPG_CNT % 20 === 12) spec = Object.assign({}, spec, { gun:'rpg', rpg:true, rpgLoaded:true, rpgReady:0, name:'Miliciano · RPG' });
  const u = Object.assign({
    team, x:i+.5, z:j+.5, vx:0, vz:0, face: team==='us' ? Math.PI/2 : -Math.PI/2, hp:100, sup:0, alive:true, down:false,
    path:[], order:null, stance:'stand', pinned:false, scanT:rnd()*.3, auto:null, spotted:false,
    thinkT:rnd(), nextMove:0, reviveT:0, status:'Listo', kind:'us', ammo:200, spd:2.4, supRes:1, gun:'ak', reloadDur:2.8, reloading:false, reloadT:0
  }, spec);
  u.ammo0 = u.ammo; u.hp0 = u.hp; u.cool0 = spec.cool || 1.4; u.cool = rnd()*1.2;
  u.magSize = MAGS[u.gun] || 30; u.mag = Math.min(u.magSize, u.ammo);
  u.hasPistol = team === 'us' && (!spec.look || spec.look === 'ranger' || spec.look === 'delta');
  if (u.gun === 'saw') u.reloadDur *= 1.9;
  const rig = buildRig(spec.look || (team==='us' ? 'ranger' : 'militia'), spec);
  // the militia come and go from sight all the time: each stays its own mesh, culled and hidden on its own
  if (team === 'them' && BATCH_ON){ rig.skin.visible = true; const i = RIGS.indexOf(rig); if (i >= 0) RIGS.splice(i, 1); }
  world.add(rig.root);
  const hb = new T.Mesh(hitGeo, hitMat); hb.position.y = .75; hb.userData.unit = u; rig.root.add(hb);
  const mark = box(0.14,0.14,0.14,0xe05a42,0,1.55,0,rig.root,false); mark.visible = false;
  const ring = unitRing(.36, .42, team==='us' ? 0x5c9cf0 : 0xe8584a, .35);
  const sel = team === 'us' ? unitRing(.45, .52, 0xd8ecff, .75) : null; if (sel) sel.visible = false;
  const icon = ovIcon(team === 'us' ? 'us' : 'them'); icon.visible = false;
  const ghost = new T.Mesh(ghostGeo, new T.MeshBasicMaterial({ color:COL_THEM, transparent:true, opacity:.7, depthTest:false })); ghost.visible = false; overlay.add(ghost);
  u.m = Object.assign(rig, { hb, mark, ring, sel, icon, ghost, iconKind:'' });
  units.push(u); (team==='us' ? us : them).push(u);
  return u;
}
function makeSquad(type){
  const S = SQUADS[type];
  const spawn = [[0,0],[1,1],[1,3],[-1,1],[-1,3],[0,4]], s0 = MIS.start;
  S.list.forEach((sp,k) => { const c = findWalk(s0[0]+spawn[k][0], s0[1]+spawn[k][1]);
    makeUnit('us', c[0], c[1], Object.assign({ kind:'us', look:S.look, spd:S.spd, supRes:S.supRes, reloadDur:S.reload }, sp)); });
}
function dropOverlay(u){ for (const k of ['ring','sel','icon','ghost']) if (u.m[k] && u.m[k].parent) u.m[k].parent.remove(u.m[k]); }
function swapSquad(type){
  squadType = type;
  for (const u of us){ world.remove(u.m.root); dropOverlay(u); }
  units = units.filter(u => u.team !== 'us'); us = [];
  makeSquad(type);
  G.sel = new Set(us); buildCards();
}
function poseFor(u){
  if (u.poseName) return u.poseName;
  if (u.pushup != null) return 'pushup';
  if (u.team === 'civ') return u.stance === 'crouch' ? 'kneelR' : 'civ';
  if (!u.alive) return (G.t - (u.deathT||-9) < .32) ? 'collapse' : u.down ? 'downed' : (u.deadVar === 2 ? 'dead2' : 'dead');
  const firing = u.firing > 0;
  if (u.stance === 'prone') return u.pinned && !firing ? 'cower' : 'prone';
  if (u.healing && !u.moving) return 'treat';
  if (u.idleKneel && u.team === 'us' && u.stance === 'stand' && !u.moving && !(u.firing > 0) && !u.auto) return 'kneelR';
  if (u.team === 'them' && u.stance === 'crouch' && firing && u.sup > 55 && !u.moving) return 'blind';
  const aiming = !u.reloading && (firing || (u.auto && u.auto.alive && !u.moving) || (u.order && (u.order.type==='suppress' || u.order.type==='attack') && !u.moving));
  if (u.stance === 'crouch' && !u.moving) return aiming ? 'kneel' : 'kneelR';
  if (u.reloading && u.team === 'us' && !u.moving && u.sup > 12) return 'kneelR';      // under fire he takes a knee to change magazines
  return aiming && !u.moving ? 'aim' : 'ready';
}
const RL_ARM = [ // reload keyframes for the support arm: [t, lua x, lua z, lfa]
  [0, -.9, -.35, -1.0], [.18, -1.0, -.5, -1.5], [.42, .1, -.15, -.7], [.62, -.95, -.5, -1.5], [.8, -.9, -.35, -1.0], [1, -.9, -.35, -1.0]];
function rlArm(r){ for (let k=1;k<RL_ARM.length;k++){ const a = RL_ARM[k-1], b = RL_ARM[k]; if (r <= b[0]){ const t = (r-a[0])/(b[0]-a[0]), s = t*t*(3-2*t); return [a[1]+(b[1]-a[1])*s, a[2]+(b[2]-a[2])*s, a[3]+(b[3]-a[3])*s]; } } return RL_ARM[RL_ARM.length-1].slice(1); }
/* spring-driven skeleton animation, with procedural layers on top: gait, crouch-run, limp, fidgets, radio, healing, hit reactions */
const PKEYS = [];
(function(){ const p = POSES.ready; for (const k in p){ if (Array.isArray(p[k])) p[k].forEach((_,i) => PKEYS.push(k+i)); else PKEYS.push(k); } })();
const flatPose = {};
for (const n in POSES){ const o = {}; for (const k in POSES[n]){ const v = POSES[n][k]; if (Array.isArray(v)) v.forEach((x,i) => o[k+i] = x); else o[k] = v; } flatPose[n] = o; }
function initAnim(m){ m.c = Object.assign({}, flatPose.ready); m.v = {}; for (const k of PKEYS) m.v[k] = 0; m.tyaw = 0; m.tyawV = 0; m.spd = 0; m.idle = rnd()*10; m.cm = 0; m.limp = 0; m.healB = 0;
  // no two men run alike: stride, knee lift, cadence, lean, sway, bounce, and whether the left arm stays on the rifle
  m.gA = rr(.84, 1.2); m.gK = rr(.8, 1.35); m.gF = rr(.92, 1.1); m.gL = rr(-.02, .12); m.gS = rr(0, .9); m.gB = rr(.7, 1.45); m.gArm = rnd() < .35 ? 1 : 0; m.rdy = rnd() < .3 ? 1 : 0; }
const FIDGETS = ['look','look','adjust','shift','check','stretch','vest','high'];
const sm = (a, b, k) => a + (b - a) * k;
/* ---------- swinging kit: a point mass on a rod of fixed length from the clip it hangs on, pulled by gravity and by a spring
   toward its resting hang, damped against the clip's own motion; so it lags when the man sets off, swings with his stride,
   flies out on a turn and settles when he stops. Kept off the body, and limited in how far it can swing. ---------- */
const SW_DOWN = new T.Vector3(0, -1, 0), SW_UP = new T.Vector3(0, 1, 0), SW_TAIL = new T.Vector3(0, -.97, -.24).normalize(), SW_ANT = new T.Vector3(0, .989, -.149);
const _swP = new T.Vector3(), _swS = new T.Vector3(), _swQ = new T.Quaternion(), _swQi = new T.Quaternion(), _swA = new T.Vector3(), _swB = new T.Vector3(),
  _swD = new T.Vector3(), _swV = new T.Vector3(), _swR = new T.Quaternion(), _swR0 = new T.Quaternion(), _swI = new T.Quaternion(), _swId = new T.Quaternion();
function swingRig(m, dt, lie){
  if (!m.sw || !m.sw.length || !(dt > 0)) return;
  const e = m.root.matrixWorld.elements, far = Math.hypot(e[12] - camS.tx, e[14] - camS.tz) > halfH()*2.6 + 6;
  if (far || SOLDIER_LV > 1) return;
  m.chest.updateWorldMatrix(true, false); m.neck.updateWorldMatrix(false, false); m.gun.updateWorldMatrix(false, false);
  const g0 = 9.8*(1 - lie*.85);
  for (const s of m.sw){
    const par = s.b.parent; par.matrixWorld.decompose(_swP, _swQ, _swS);
    if (_swS.x < .01) continue;                                   // the rifle is put away
    const piv = _swA.copy(s.b.position).applyMatrix4(par.matrixWorld), restW = _swB.copy(s.rest).applyQuaternion(_swQ);
    // the swing is followed relative to the clip: what moves it is the clip's acceleration (smoothed, and scaled by how
    // free the piece hangs), gravity, a spring back to its resting hang and damping
    if (!s.r || s.pv.distanceToSquared(piv) > 2.25){ s.r = (s.r || new T.Vector3()).copy(restW).multiplyScalar(s.L); s.rv = (s.rv || new T.Vector3()).set(0, 0, 0);
      s.pv = (s.pv || new T.Vector3()).copy(piv); s.vp = (s.vp || new T.Vector3()).set(0, 0, 0); s.ap = (s.ap || new T.Vector3()).set(0, 0, 0); s.fresh = 2; }
    _swV.copy(piv).sub(s.pv).divideScalar(dt); s.pv.copy(piv);
    if (s.fresh > 0){ s.fresh--; s.vp.copy(_swV); }
    _swS.copy(_swV).sub(s.vp).divideScalar(dt); s.vp.copy(_swV);
    const al = _swS.length(); if (al > 28) _swS.multiplyScalar(28/al);
    s.ap.lerp(_swS, 1 - Math.exp(-dt*22));
    const n = dt > 1/45 ? 3 : dt > 1/90 ? 2 : 1, h = Math.min(dt, .06)/n, g = g0*(s.gs == null ? 1 : s.gs), fi = s.in == null ? 1 : s.in;
    for (let k=0;k<n;k++){
      s.rv.x += (s.k*(restW.x*s.L - s.r.x) - s.c*s.rv.x - s.ap.x*fi)*h;
      s.rv.y += (s.k*(restW.y*s.L - s.r.y) - s.c*s.rv.y - s.ap.y*fi - g)*h;
      s.rv.z += (s.k*(restW.z*s.L - s.r.z) - s.c*s.rv.z - s.ap.z*fi)*h;
      s.r.addScaledVector(s.rv, h);
      const l = s.r.length() || 1e-5; s.r.multiplyScalar(s.L/l);
      _swD.copy(s.r).multiplyScalar(1/s.L); s.rv.addScaledVector(_swD, -s.rv.dot(_swD));
    }
    // into the frame of the joint it hangs from; it cannot swing into the body, nor further than its strap allows
    _swQi.copy(_swQ).invert(); _swD.copy(s.r).normalize().applyQuaternion(_swQi);
    if (s.zMax != null && _swD.z > s.zMax) _swD.z = s.zMax;
    if (s.xMin != null && _swD.x < s.xMin) _swD.x = s.xMin;
    _swD.normalize();
    const a = s.rest.angleTo(_swD);
    if (a > 1e-4){ const a2 = s.lim*Math.tanh(a/s.lim); if (a2 < a - 1e-4){ _swR.setFromUnitVectors(s.rest, _swD); _swI.copy(_swId).slerp(_swR, a2/a); _swD.copy(s.rest).applyQuaternion(_swI); } }
    if (!s.b2){ s.b.quaternion.setFromUnitVectors(s.axis, _swD); continue; }
    // the aerial bends along its length: the lower half takes a little more than half the swing, the upper half the rest
    _swR0.setFromUnitVectors(s.axis, s.rest); _swR.setFromUnitVectors(s.rest, _swD);
    _swI.copy(_swId).slerp(_swR, .58); s.b.quaternion.copy(_swI).multiply(_swR0);
    s.b2.quaternion.copy(_swId).slerp(_swR, .5);
  }
}
function animRig(u, dt){
  const m = u.m; if (!m.c) initAnim(m);
  const c = m.c, v = m.v, P = flatPose[poseFor(u)];
  const K = u.alive ? 115 : 60, D = 2 * (u.alive ? .86 : 1) * Math.sqrt(K);
  const steps = dt > 1/45 ? 2 : 1, h = Math.min(dt, .05) / steps;
  for (let s=0;s<steps;s++) for (const k of PKEYS){ const a = K*(P[k] - c[k]) - D*v[k]; v[k] += a*h; c[k] += v[k]*h; }
  c.lie = clamp(c.lie, 0, 1);
  const ek = 1 - Math.exp(-8*dt);
  // turning on the spot makes the feet shuffle
  const yaw = m.root.rotation.y;
  if (m.prevYaw == null) m.prevYaw = yaw;
  let dy = yaw - m.prevYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.prevYaw = yaw;
  m.turnW = sm(m.turnW, dt > 0 ? clamp(Math.abs(dy)/dt/3, 0, 1) : 0, ek);
  const spRaw = Math.hypot(u.vx||0, u.vz||0), spPrev = m.spd;
  m.spd += (spRaw - m.spd) * (1 - Math.exp(-10*dt));
  const sp = u.alive ? m.spd : 0;
  const turnRate = dt > 0 ? dy/dt : 0;
  m.bank = sm(m.bank || 0, u.alive ? clamp(-turnRate*sp*.075, -.24, .24) : 0, 1 - Math.exp(-6*dt));            // leaning into a curve
  m.accL = sm(m.accL || 0, u.alive && dt > 0 ? clamp((m.spd - spPrev)/dt*.06, -.18, .2) : 0, 1 - Math.exp(-5*dt));   // setting off / pulling up
  m.fat = clamp((m.fat || 0) + dt*(sp > 1.6 ? .12 : -.045), 0, 1);                                              // out of breath after a run
  m.cm = sm(m.cm, u.alive && u.moving && (u.sup > 25 || u.pinned || u.sneak) ? 1 : 0, ek);
  m.limp = sm(m.limp, u.alive && u.hp < u.hp0*.5 ? 1 : 0, ek);
  const wWalk = clamp(sp / .9, 0, 1), wTurn = (1 - wWalk) * m.turnW * .45;
  const w = Math.max(wWalk, wTurn) * (1 - c.lie), run = clamp((sp - 1.4) / 1.0, 0, 1) * (1 - m.cm*.6);
  // the direction of travel in the body's frame (left +x, ahead +z), and the step: longer the faster he goes, shorter sideways, crouched or limping
  const KS = m.body.scale.x || 1, spB = sp/KS;
  { const vx = u.vx || 0, vz = u.vz || 0, q = Math.hypot(vx, vz), cy = Math.cos(yaw), sy = Math.sin(yaw), kd = 1 - Math.exp(-10*dt);
    if (q > .05){ m.gdx = sm(m.gdx || 0, (vx*cy - vz*sy)/q, kd); m.gdz = sm(m.gdz == null ? 1 : m.gdz, (vx*sy + vz*cy)/q, kd); } else if (m.gdz == null){ m.gdx = 0; m.gdz = 1; } }
  const side_ = Math.abs(m.gdx || 0), back_ = Math.max(0, -(m.gdz == null ? 1 : m.gdz));
  m.stepLen = clamp(.33 + .2*spB, .26, .92) * clamp(m.gA || 1, .9, 1.12) * (1 - .22*m.cm) * (1 - .2*m.limp) * (1 - .5*side_) * (1 - .35*back_);
  m.phase += dt * (Math.PI*spB/m.stepLen + m.turnW * 5 * (1 - wWalk));
  // how far a planted foot can be left behind before the leg runs out: that sets how long each foot stays down (the rest is flight)
  legInit(m); const Lr = (m.lgL1 + m.lgL2)*.997, dropG = .04 + .035*run + .03*side_, offG = .07 + .04*run;
  const hLow = m.lgL1 + m.lgL2 - dropG - Math.abs(.016 - .05*run)*(m.gB || 1) - m.cm*.09;
  const aMax = Math.max(.05, Math.min(Math.sqrt(Math.max(1e-4, Lr*Lr - hLow*hLow)) + .04, Math.sqrt(Math.max(1e-4, Lr*Lr - (hLow - offG)*(hLow - offG))) - .04));
  const duty = Math.min(.64 - .26*run, aMax/m.stepLen), fL = ((m.phase/(2*Math.PI) + .25) % 1 + 1) % 1;   // the left foot lands at fL = 0 and stays down for 'duty'
  m.gOff = offG;
  const wLeg = Math.max(clamp(sp/.3, 0, 1), wTurn) * (1 - c.lie) * (u.alive ? 1 : 0);
  m.recoil = Math.max(0, m.recoil - dt*9); m.hit = Math.max(0, (m.hit||0) - dt*4.5);
  m.breathe += dt * (1.5 + clamp(u.sup/60, 0, 1.5) + m.fat*1.8); m.idle += dt;
  const ph = m.phase, sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
  const still = (1 - w) * (u.alive ? 1 : 0) * (1 - c.lie);
  const br = Math.sin(m.breathe) * (.018 + m.fat*.03) * (u.alive ? 1 : 0) * (1 - c.lie*.5);
  // aim yaw: upper body tracks the target independently of the legs
  let want = 0;
  const tgt = (u.order && u.order.type === 'attack' && u.order.target.alive) ? u.order.target : (u.auto && u.auto.alive ? u.auto : null);
  const busy = u.reloading || u.firing > 0 || !!tgt || u.healing || !!u.pist;
  // layers on top of the pose: a flinch when rounds land close, a stumble, a vault over a low wall, a lean round a corner, the sidearm
  u.flinchT = Math.max(0, (u.flinchT || 0) - dt); m.flB = sm(m.flB || 0, u.alive && u.flinchT > 0 && c.lie < .3 ? 1 : 0, 1 - Math.exp(-(u.flinchT > 0 ? 22 : 7)*dt));
  const stum = u.alive && u.stumT > 0 ? Math.sin(Math.PI*clamp(1 - u.stumT/.8, 0, 1)) : 0;
  let V_ = 0;
  if (u.vault){ const q = u.vault, sv = (u.x - q.cx)*q.dx + (u.z - q.cz)*q.dz; q.t = (q.t || 0) + dt; if (sv > .95 || q.t > 2.2 || !u.alive){ u.vault = null; if (u.alive) u.landT = Math.max(u.landT || 0, .42); } else { m.vP = clamp((sv + .95)/1.9, 0, 1); V_ = Math.pow(Math.sin(Math.PI*m.vP), .8); } }
  m.vB = sm(m.vB || 0, V_, 1 - Math.exp(-14*dt)); const vB = m.vB;
  const vwin = c0 => { const q = clamp(1 - Math.abs((m.vP || 0) - c0)/.42, 0, 1); return q*q*(3 - 2*q); };
  m.vL = sm(m.vL || 0, V_ > 0 ? vwin(.36) : 0, 1 - Math.exp(-16*dt)); m.vR = sm(m.vR || 0, V_ > 0 ? vwin(.62) : 0, 1 - Math.exp(-16*dt));
  u.peekT = Math.max(0, (u.peekT || 0) - dt); { const tp = u.alive && u.peekT > 0 && c.lie < .3 ? (u.peekS || 1) : 0, hh = Math.min(dt, .04);
    m.pkV = (m.pkV || 0) + (70*(tp - (m.pkB || 0)) - 13*(m.pkV || 0))*hh; m.pkB = (m.pkB || 0) + m.pkV*hh; m.pkH = sm(m.pkH || 0, tp, 1 - Math.exp(-11*dt)); }
  const pisT = u.alive && u.pist ? (u.pist.st === 0 ? clamp(u.pist.t/.5, 0, 1) : u.pist.st === 1 ? 1 : 1 - clamp(u.pist.t/.45, 0, 1)) : 0;
  m.pisB = sm(m.pisB || 0, pisT, 1 - Math.exp(-12*dt)); const pis = m.pisB, pisA = clamp((pis - .45)/.55, 0, 1);
  u.giveT = Math.max(0, (u.giveT || 0) - dt); u.tapT = Math.max(0, (u.tapT || 0) - dt);
  m.gvB = sm(m.gvB || 0, u.alive && u.giveT > 0 ? 1 : 0, 1 - Math.exp(-8*dt)); m.tpB = sm(m.tpB || 0, u.alive && u.tapT > 0 ? 1 : 0, 1 - Math.exp(-9*dt));
  if (u.alive && tgt && !u.reloading){ let d = Math.atan2(tgt.x - u.x, tgt.z - u.z) - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) > 2.3 && m.tyaw*d < 0) d = Math.sign(m.tyaw || 1)*2.3;   // a target right behind: keep turning the way he already is, never flick across
    want = clamp(d, -1.1, 1.1); }
  else if (still > .5 && u.alive) want = Math.sin(m.idle * .35 + m.phase) * .3 * still;
  // the trunk's turn toward the target: small steps, so a big frame step (units off screen or far away are animated less often) cannot blow the spring up
  { const n = Math.ceil(Math.min(dt, .25)/.02), h = Math.min(dt, .25)/n;
    for (let k=0;k<n;k++){ m.tyawV += (60*(want - m.tyaw) - 14*m.tyawV) * h; m.tyaw += m.tyawV * h; }
    if (!isFinite(m.tyaw) || !isFinite(m.tyawV)){ m.tyaw = 0; m.tyawV = 0; }
    m.tyaw = clamp(m.tyaw, -1.3, 1.3); m.tyawV = clamp(m.tyawV, -12, 12); }
  // idle fidgets
  if (u.alive && still > .8 && !busy && !u.moving && c.lie < .1){
    if (!m.fid){ m.fidT -= dt; if (m.fidT <= 0){ m.fid = { k:pick(FIDGETS), t:0, d:rr(1.6,2.8), dir:rnd() < .5 ? -1 : 1 }; m.fidT = rr(5,11); } }
  } else if (m.fid && (busy || u.moving)) m.fid = null;
  let fk = '', fs = 0, fdir = 1;
  if (m.fid){ m.fid.t += dt; fk = m.fid.k; fdir = m.fid.dir; fs = Math.sin(Math.PI * clamp(m.fid.t / m.fid.d, 0, 1)); fs = fs*fs*(3-2*fs); if (m.fid.t >= m.fid.d) m.fid = null; }
  u.talkT = Math.max(0, (u.talkT||0) - dt); u.chatT = Math.max(0, (u.chatT||0) - dt); u.listenT = Math.max(0, (u.listenT||0) - dt); u.glanceT = Math.max(0, (u.glanceT||0) - dt);
  m.glB = sm(m.glB || 0, u.alive && u.glanceT > 0 && !busy ? 1 : 0, 1 - Math.exp(-5*dt));
  let glY = 0; if (m.glB > .01 && u.glanceA != null){ glY = u.glanceA - yaw; glY = clamp(Math.atan2(Math.sin(glY), Math.cos(glY)), -1.5, 1.5)*m.glB; }
  m.lsB = sm(m.lsB || 0, u.alive && u.listenT > 0 && !busy ? 1 : 0, 1 - Math.exp(-6*dt));
  m.talkB = sm(m.talkB, u.alive && u.talkT > 0 && !u.reloading && u.firing <= 0 && c.lie < .3 ? 1 : 0, 1 - Math.exp(-7*dt));
  m.healB = sm(m.healB, u.healing ? 1 : 0, ek);
  // body: lying, dead twist, hit stagger
  const ld = !u.alive && u.deadDir ? u.deadDir : 1;
  m.body.rotation.x = c.lie * Math.PI/2 * ld; m.body.rotation.y = !u.alive ? c.lie * (u.deadTwist||0) : 0; m.body.rotation.z = u.alive ? m.bank*(1 - c.lie) : 0;
  m.body.position.set(m.hit * .05 * m.hitSide * (u.alive ? 1 : 0) + m.pkB*.12, c.lie * .13 + vB*.6 - stum*.1 - m.flB*.07, -c.lie * .5 * ld);
  m.body.rotation.z += -m.pkB*.06 + vB*.4; m.body.rotation.x += vB*.3; m.body.rotation.y += -vB*.3;
  const bounce = (.028 + .045*run) * wWalk * (1 - c.lie) * (m.gB || 1);
  const limpDip = m.limp * wWalk * Math.max(0, Math.sin(ph)) * .03;
  m.pelvis.position.y = (m.model ? c.py + (m.py0 - .52)*clamp((c.py - .14)/.38, 0, 1) : c.py) - wLeg*dropG + wLeg*(.016 - .05*run)*(m.gB || 1)*Math.cos(4*Math.PI*(fL - duty/2)) + Math.sin(m.idle*.5) * .006 * still - m.cm * .09 * (1 - c.lie) - limpDip - Math.abs(m.pkB)*.025;
  m.pelvis.position.x = wLeg*(.02 - .012*run)*Math.cos(2*Math.PI*(fL - duty/2));
  m.pelvis.rotation.set(0, w * sL * (.1 + .06*run) * (1 + (m.gS || 0)*.6), w * Math.cos(ph) * .045 * (1 + (m.gS || 0)) + Math.sin(m.idle*.45) * .02 * still + (fk === 'shift' ? fs*.07*fdir : 0) + m.limp * .05 * wWalk);
  const lean = (.08 + .22*run + .3*m.cm + (m.gL || 0)*run) * wWalk + m.limp * .06 * wWalk + stum*.75 + m.flB*.3;
  const tor = c.tor + lean + m.accL*(1 - c.lie) - m.recoil*.14 + br - m.hit*.32 - (m.wallB || 0)*.14 + (fk === 'stretch' ? -.16*fs : 0) + (fk === 'check' ? .08*fs : 0);
  const twist = -m.pelvis.rotation.y*1.1 + m.tyaw*.85;
  const strike = wLeg*run*.035*Math.cos(4*Math.PI*(fL - duty/2));                    // the trunk gives a little as each foot lands
  m.abd.rotation.set(tor*.4 - strike, twist*.4, -m.pelvis.rotation.z*.4 + m.hit*m.hitSide*.12 - m.pkB*.13);
  m.chest.rotation.set(tor*.6 - strike*.6, twist*.6, -m.pelvis.rotation.z*.4 + m.hit*m.hitSide*.15 - m.pkB*.15 + w*run*sL*.035);
  const lookYaw = m.tyaw*.25 - m.bank*1.6 + (m.pkH || 0)*.95 + (m.wallB || 0)*(u.wallLook || .9) + Math.sin(m.idle*.6 + 1)*.12*still + (fk === 'look' ? fdir * .85 * fs : 0) + glY;
  const headP = c.head - lean*.7 - br*.5 + (u.reloading ? .3 : 0) + (fk === 'check' ? .35*fs : 0) + (fk === 'vest' ? .42*fs : 0) + (fk === 'inspect' ? .42*fs : 0) + m.flB*.4 + stum*.25 + m.healB*.15 + m.lsB*Math.sin(m.idle*3.4)*.09;
  m.neck.rotation.set(headP*.4, lookYaw*.4, 0);
  m.head.rotation.set(headP*.6 - m.hit*.25 + (bounce - Math.abs(Math.cos(ph))*bounce)*1.2, lookYaw*.6, m.hit*m.hitSide*.25 + m.talkB*.12 - m.bank*.5);
  const gunBob = Math.abs(Math.sin(ph)) * .025 * wWalk;
  let lx = c.lua0, ly = c.lua1, lz = c.lua2, lf = c.lfa, lw = c.lwr, gx = c.gun3, gy = c.gun4, gz = c.gun5;
  let rx = c.rua0, rz = c.rua2, rf = c.rfa;
  m.gunMag.visible = true; m.handMag.visible = false;
  if (u.reloading && u.alive){
    const r = clamp(u.reloadT / u.reloadDur, 0, 1), a = rlArm(r), b0 = Math.min(1, Math.min(r, 1-r) * 6), blend = b0*b0*(3 - 2*b0);
    const seat = Math.exp(-Math.pow((r - .68)/.035, 2)), rack = Math.exp(-Math.pow((r - .86)/.04, 2));
    lx += (a[0] - lx) * blend; lz += (a[1] - lz) * blend; lf += (a[2] - lf) * blend;
    gx += .35 * blend - .14*seat + .06*rack; gy += .45 * blend; gz += -.35 * blend - .1*rack;
    m.rlB = blend; m.rlK = rack;
    m.chest.rotation.x += .1*blend; m.abd.rotation.x += .05*blend; m.neck.rotation.y += .22*blend; m.head.rotation.z += -.1*blend;
    m.gunMag.visible = r < .16 || r > .66; m.handMag.visible = r > .3 && r < .66;
  }
  else { m.rlB = 0; m.rlK = 0; }
  if (u.rpg){ m.handMag.visible = false; m.gunMag.visible = u.alive ? (u.rpgLoaded || (u.reloading && u.reloadT/u.reloadDur > .6)) : false; }
  // left hand to the ear for the radio, to the helmet when fidgeting, onto the wound when hurt
  const tb = m.talkB;
  if (tb > .01){
    if ((u.kit === 'radio' || u.talkRadio) && !(u.chatT > 0)){ lx = sm(lx, -2.3, tb); lz = sm(lz, -.75, tb); lf = sm(lf, -2.25, tb); lw = sm(lw, .3, tb); }
    else { const t = m.idle;   // talking face to face: the free hand moves with the words
      lx = sm(lx, -1.05 + Math.sin(t*4.3)*.28, tb); lz = sm(lz, -.25 + Math.sin(t*2.7)*.15, tb); lf = sm(lf, -1.35 + Math.sin(t*5.1 + 1)*.3, tb); lw = sm(lw, Math.sin(t*3.3)*.3, tb); } }
  // hand signals: arm out toward where the squad is going, or a flat hand pushed down for cover
  u.sigT = Math.max(0, (u.sigT || 0) - dt); m.sigB = sm(m.sigB || 0, u.alive && u.sigT > 0 && c.lie < .3 && !u.reloading ? 1 : 0, 1 - Math.exp(-9*dt));
  if (m.sigB > .01){ const sb = m.sigB, dn = u.sigK === 'down', fist = u.sigK === 'fist';
    if (fist){ lx = sm(lx, -2.75, sb); lz = sm(lz, -.42, sb); lf = sm(lf, -1.95, sb); lw = sm(lw, .15, sb); }
    else { const ch = dn ? 0 : Math.max(0, Math.sin(m.idle*7.5))*sb;
      lx = sm(lx, dn ? -1.3 + Math.sin(m.idle*9)*.25 : -1.5 - ch*.12, sb); lz = sm(lz, dn ? -.2 : -.12, sb); lf = sm(lf, dn ? -.25 : -.42 + ch*.4, sb); lw = sm(lw, dn ? .9 : 0, sb); }
    m.chest.rotation.y += .14*sb; m.chest.rotation.x += (dn ? .1 : .04)*sb; }
  // back against a wall: lean on it, look along it
  m.wallB = sm(m.wallB || 0, u.alive && u.wall != null && !busy && !u.moving ? (u.wallVar === 1 ? .35 : 1) : 0, 1 - Math.exp(-5*dt));
  if (fk === 'adjust'){ lx = sm(lx, -2.6, fs); lz = sm(lz, -.35, fs); lf = sm(lf, -2.0, fs); }
  if (fk === 'vest'){ lx = sm(lx, -.95 + Math.sin(m.idle*2.2)*.12, fs); lz = sm(lz, -.6, fs); lf = sm(lf, -2.0 + Math.sin(m.idle*8)*.2, fs); lw = sm(lw, .4, fs); }     // patting down the pouches on his vest
  if (fk === 'high'){ rf = sm(rf, rf - .35, fs); lx = sm(lx, lx - .25, fs); }
  if (m.gvB > .01){ lx = sm(lx, -1.45, m.gvB); lz = sm(lz, -.08, m.gvB); lf = sm(lf, -.22, m.gvB); lw = sm(lw, .45, m.gvB); }                                      // handing something across
  if (m.tpB > .01){ lx = sm(lx, -1.62, m.tpB); lz = sm(lz, -.12, m.tpB); lf = sm(lf, -.5 + Math.sin(m.idle*15)*.14, m.tpB); }                                     // a tap on the other man's shoulder
  if (m.flB > .01 && !busy){ lx = sm(lx, -2.2, m.flB*.8); lz = sm(lz, -.5, m.flB*.8); lf = sm(lf, -2.0, m.flB*.8); }                                               // an arm up over the head
  if (stum > .01){ lx = sm(lx, -1.7, stum); lf = sm(lf, -.5, stum); rx = sm(rx, rx - .5, stum); }
  if (vB > .01){ lx = sm(lx, -.55, vB); lz = sm(lz, -.9, vB); lf = sm(lf, -.2 - .3*(1 - vB), vB); gx += .25*vB; gy += .35*vB; }                                                                             // the left hand on the top of the wall
  if ((m.noGun || u.team === 'civ') && !u.poseName){ const sw = w*(1 - tb)*(1 - (m.sigB || 0))*(1 - m.flB);
    lx -= sL*(.5 + .45*run)*sw; rx -= sR*(.5 + .45*run)*sw; lf -= sw*(.18 + .95*run + .3*Math.max(0, sL)); rf -= sw*(.18 + .95*run + .3*Math.max(0, sR)); }
  m.carB = sm(m.carB || 0, run*w*(busy || m.sigB > .1 || u.rpg ? 0 : 1), 1 - Math.exp(-5*dt));
  if (m.carB > .01 && !m.noGun){ gx += .28*m.carB; gy += .42*m.carB; gz += Math.sin(ph)*.07*m.carB; }
  const pump = (m.gArm || 0)*run*w*(busy || m.sigB > .1 ? 0 : 1);                                                                                                  // some run with the rifle in one hand
  if (pump > .01){ lx = sm(lx, .15 + sL*.8, pump); lz = sm(lz, -.12, pump); lf = sm(lf, -1.25, pump); gx += .32*pump; gy += .22*pump; }
  if (pis > .01){ const d0 = Math.min(1, pis*2.2);        // the rifle hangs on its sling; the right hand goes to the holster and comes up with the pistol, the left closes on it
    rx = sm(sm(rx, .28, d0), -1.42, pisA); rz = sm(sm(rz, .22, d0), .2, pisA); rf = sm(sm(rf, -.95, d0), -.14, pisA);
    lx = sm(lx, -1.22, pisA); lz = sm(lz, -.6, pisA); lf = sm(lf, -.6, pisA);
    gx = sm(gx, 1.3, pis); gy = sm(gy, .1, pis); gz = sm(gz, .32, pis); }
  if (m.pistol) m.pistol.visible = pis > .42;
  if (fk === 'inspect'){ lx = sm(lx, -1.15, fs); lz = sm(lz, -.42, fs); lf = sm(lf, -1.75, fs); lw = sm(lw, .5, fs); rx = sm(rx, -.55, fs); rf = sm(rf, -1.55, fs); }
  if (fk === 'stretch'){ rx = sm(rx, -.6, fs*.5); lx = sm(lx, -.6, fs*.5); }
  const hurtIdle = m.limp * still * (busy ? 0 : 1) * (1 - tb);
  if (hurtIdle > .01){ lx = sm(lx, -.45, hurtIdle); lz = sm(lz, -.75, hurtIdle); lf = sm(lf, -1.5, hurtIdle); }
  if (m.healB > .01){ const t = m.idle; rf += Math.sin(t*6.5)*.22*m.healB; lf += Math.cos(t*5.3)*.22*m.healB; rx += Math.sin(t*3.1)*.08*m.healB; }
  if (u.down){ rx += Math.sin(m.idle*2.1)*.3; lx += Math.cos(m.idle*1.6)*.22; }
  const calm = u.alive && !busy && u.sup < 15 && !m.sigB ? 1 : 0;                                                  // no threat: rifle at low ready
  m.lowB = sm(m.lowB || 0, calm*(1 - c.lie)*(1 - pis), 1 - Math.exp(-3*dt));
  const aO = (m.armOut || 0)*(1 - c.lie*.6);
  m.shR.rotation.set(rx + w*sR*(.1 + .06*run) + m.lowB*.12, c.rua1, rz - aO); m.elR.rotation.x = rf - m.recoil*.1 + w*Math.sin(ph*2)*.05; m.wrR.rotation.set(c.rwr, 0, 0);
  m.shL.rotation.set(lx + w*sL*(.1 + .08*run) + m.lowB*.1, ly, lz + aO + w*Math.cos(ph)*.04); m.elL.rotation.x = lf + w*Math.sin(ph*2 + 1)*.06; m.wrL.rotation.set(lw, 0, 0);
  // legs: gait with crouch-run and limp, ankles keep the feet flat with toe-off and heel strike
  const lim = 1 - m.limp*.45;
  const amp = (.42 + .36*run) * (1 - m.cm*.2) * (m.gA || 1), kAmp = (.75 + .75*run) * (m.gK || 1), kBase = .08 + .14*run + .45*m.cm*wWalk + m.flB*.3 + stum*.35;
  const hipL = c.lth0 + w*(sL*amp - .05*run) - m.cm*.35*wWalk, kneeL = c.lsh + w*(Math.max(0, -Math.cos(ph + .35))*kAmp + kBase) + m.cm*.25*wWalk;
  const hipR = c.rth0 + w*(sR*amp*lim - .05*run) - m.cm*.35*wWalk, kneeR = c.rsh + w*(Math.max(0, -Math.cos(ph + Math.PI + .35))*kAmp*lim + kBase) + m.cm*.25*wWalk;
  const vL = m.vL || 0, vR = m.vR || 0, pkL = Math.max(0, m.pkB), pkR = Math.max(0, -m.pkB);
  m.hipL.rotation.set(sm(hipL, -1.5, vL) - stum*.3, 0, c.lth1 + vL*.3 + pkL*.2); m.knL.rotation.x = sm(kneeL, 1.7, vL) + stum*.5 + pkR*.22;
  m.hipR.rotation.set(sm(hipR, -1.2, vR), 0, c.rth1 + vR*.3 - pkR*.2); m.knR.rotation.x = sm(kneeR, 1.8, vR) + pkL*.22;
  const flat = (hp, kn) => clamp(-(hp + kn), -.9, .8) * (1 - c.lie);
  m.anL.rotation.x = flat(hipL, kneeL) + c.lft + w*(Math.max(0, sL)*.45 - Math.max(0, -sL)*.2);
  m.anR.rotation.x = flat(hipR, kneeR) + c.rft + w*(Math.max(0, sR)*.45*lim - Math.max(0, -sR)*.2);
  legGait(u, m, c, wLeg*(1 - vB), fL, duty, run, spB);
  { const cr = c.lie*clamp(sp/.2, 0, 1)*(u.alive && !u.down ? 1 : 0);        // crawling: knee up on one side as the other elbow reaches
    if (cr > .01){ const a = Math.max(0, sL), b = Math.max(0, sR);
      m.hipL.rotation.z += cr*a*.55; m.hipL.rotation.x += -cr*a*.5; m.knL.rotation.x += cr*a*1.0; m.hipR.rotation.z += -cr*b*.55; m.hipR.rotation.x += -cr*b*.5; m.knR.rotation.x += cr*b*1.0;
      m.chest.rotation.y += cr*sL*.14; m.pelvis.rotation.y += -cr*sL*.12; m.body.position.x += cr*sL*.02; } }
  m.gun.position.set(c.gun0 + pis*.03 + (m.carB || 0)*(.03 + Math.sin(ph)*.012) + (m.pkH || 0)*.03, c.gun1 + br*.3 + gunBob - pis*.2 - (m.carB || 0)*.035 + (m.rlB || 0)*.02, c.gun2 - m.recoil*.05*(1 - pis) - pis*.06 - (m.rlB || 0)*.035 - (m.rlK || 0)*.02);
  const insp = fk === 'inspect' ? fs : 0, turnG = insp ? Math.sin(m.fid ? m.fid.t*2.1 : 0)*.55 : 0;
  if (insp) m.gun.position.y += .1*insp, m.gun.position.z += .06*insp;
  if (m.model) m.gun.position.z -= .025*(1 - pis);         // the models' arms are a man's length: the rifle is held a little closer
  m.gun.rotation.set(gx - m.recoil*.08*(1 - pis) + w*run*.15 + m.lowB*(m.rdy ? -.28 : .22) + (fk === 'check' ? -.35*fs : 0) + (fk === 'high' ? -.8*fs : 0) - .55*insp, gy + (fk === 'check' ? .4*fs : 0) + (.5*fdir + turnG)*insp, gz + (fk === 'check' ? .7*fs : 0) + (.9 + turnG*.6)*insp);
  // the rope, a wounded man on the ground, the landing at the foot of the rope
  animRope(u, m, dt, c); animDowned(u, m, dt, c);
  aimGun(u, m, dt, tgt, pis, insp);
  // the hands on the weapon: the right on the grip, the left under the handguard, whatever the body does (two-bone IK)
  if (m.model && !m.noGun){
    const pd = Math.min(1, pis*2.2), carryG = u.poseName && !/^kneel/.test(u.poseName) ? 1 : 0, shown = m.gun.scale.x > .5 ? 1 : 0;
    const baseR = (u.alive && !u.down ? 1 : 0)*shown*(1 - carryG)*(1 - pd)*(1 - insp)*(1 - (fk === 'stretch' ? fs : 0))*(1 - m.healB)*(1 - (m.ropeB || 0));
    let rb = 0; if (u.reloading && u.alive){ const r = clamp(u.reloadT/u.reloadDur, 0, 1); rb = Math.min(1, Math.min(r, 1 - r)*8); }
    const freeL = Math.max(rb, tb, m.sigB || 0, fk === 'adjust' || fk === 'vest' || fk === 'high' ? fs : 0, m.gvB || 0, m.tpB || 0, busy ? 0 : m.flB || 0, stum, vB, pump, pisA, hurtIdle, u.rpg ? 0 : 0);
    m.ikR = sm(m.ikR == null ? baseR : m.ikR, baseR, 1 - Math.exp(-14*dt)); m.ikL = sm(m.ikL == null ? baseR : m.ikL, baseR*(1 - freeL), 1 - Math.exp(-14*dt));
    if (m.ikR > .01 || m.ikL > .01){ m.gun.updateMatrix();
      armIK(m, -1, m.gripR, m.ikR, _IK_PR); armIK(m, 1, m.gripL, m.ikL, _IK_PL); }
  }
  swingRig(m, dt, c.lie);
}
/* the legs by where the feet are: each foot stays where it landed while the body passes over it (so the legs keep pace with the ground
   covered, in whatever direction he moves: ahead, backwards, sideways), then lifts, swings through and lands a step ahead. The heel
   comes off first, the toe last; running, the foot comes up behind and the knee drives through. Two-bone IK from hip to ankle. */
const _lgQ = new T.Quaternion(), _lgV = new T.Vector3(), _lgH = new T.Vector3();
function legInit(m){ if (m.lgL1 == null){ m.lgL1 = m.knL.position.length(); m.lgL2 = m.anL.position.length();
  m.lgY = (m.model ? m.py0 : flatPose.ready.py) + m.hipL.position.y - m.lgL1 - m.lgL2; m.lgW = Math.abs(m.hipL.position.x) + .012; } }
function legGait(u, m, c, wI, fL, duty, run, spB){
  if (wI < .01) return;
  const L1 = m.lgL1, L2 = m.lgL2, dx = m.gdx || 0, dz = m.gdz == null ? 1 : m.gdz, mv = clamp(spB/.3, 0, 1);
  const a = duty*m.stepLen*mv, lim = 1 - m.limp*.3, hSw = (.045 + .075*run + .03*m.cm)*(m.gK || 1), off = m.gOff || .07;
  _lgQ.copy(m.pelvis.quaternion).invert();
  for (let k=0;k<2;k++){ const sd = k ? -1 : 1, f = k ? (fL + .5) % 1 : fL, hip = k ? m.hipR : m.hipL, kn = k ? m.knR : m.knL, an = k ? m.anR : m.anL;
    let al, y, pt;
    if (f < duty){ const q = f/duty, o = clamp((q - .62)/.38, 0, 1); al = a*(1 - 2*q); y = o*o*off; pt = o*(.5 + .25*run) - clamp(1 - q/.14, 0, 1)*.22; }
    else { const q = (f - duty)/(1 - duty), e = .5 - .5*Math.cos(Math.PI*q), kick = Math.sin(Math.PI*Math.min(1, q*1.55));
      al = a*(2*e - 1); y = off*(1 - q)*(1 - q) + hSw*Math.sin(Math.PI*q)*(k && m.limp ? lim : 1) + run*.12*kick*kick;
      pt = (.5 + .25*run)*(1 - q)*(1 - q) + run*.45*Math.sin(Math.PI*q) - clamp((q - .68)/.32, 0, 1)*.22; }
    _lgH.copy(hip.position).applyQuaternion(m.pelvis.quaternion).add(m.pelvis.position);
    _lgV.set(sd*(m.lgW + .012*m.cm) + dx*(al - .04*mv), m.lgY + y*mv + (1 - mv)*y*.5, dz*(al - .04*mv)).sub(_lgH).applyQuaternion(_lgQ);
    const D = clamp(_lgV.length(), .14, (L1 + L2)*.997); _lgV.setLength(D);
    const kx = Math.PI - Math.acos(clamp((L1*L1 + L2*L2 - D*D)/(2*L1*L2), -1, 1));
    const ay = -L1 - L2*Math.cos(kx), az = -L2*Math.sin(kx), psi = Math.asin(clamp(_lgV.x/(-ay), -.7, .7));
    let th = Math.atan2(_lgV.z, _lgV.y) - Math.atan2(az, ay*Math.cos(psi)); th = Math.atan2(Math.sin(th), Math.cos(th));
    hip.rotation.x = sm(hip.rotation.x, th, wI); hip.rotation.z = sm(hip.rotation.z, psi, wI); kn.rotation.x = sm(kn.rotation.x, kx, wI);
    an.rotation.x = sm(an.rotation.x, clamp(-(th + kx), -1.1, .9) + pt*mv + (k ? c.rft : c.lft), wI); }
}
/* the rifle on the target: when he is shooting, or has a target, the barrel is turned (about the rifle's own pivot, in the chest's
   frame) so that it points at the place the rounds go: the last shot's aim point, else the target's chest. The hands follow by IK. */
const _agA = new T.Vector3(), _agO = new T.Vector3(), _agF = new T.Vector3(), _agQ = new T.Quaternion(), _agP = new T.Quaternion(), _agI = new T.Quaternion(), _agZ = new T.Vector3(0, 0, 1);
function aimGun(u, m, dt, tgt, pis, insp){
  let P = null;
  if (u.aimP && G && G.t - u.aimP[3] < 1.4 && (u.firing > 0 || tgt)) P = _agA.set(u.aimP[0], u.aimP[1], u.aimP[2]);
  else if (tgt && tgt.x != null) P = _agA.set(tgt.x, (tgt.elev || 0) + (tgt.stance === 'prone' ? .2 : tgt.stance === 'crouch' ? .55 : .78), tgt.z);
  const on = !!(P && u.alive && !u.down && !u.reloading && !u.mounted && pis < .2 && !insp && !(m.ropeB > .05) && m.gun.scale.x > .5);
  m.agB = sm(m.agB || 0, on ? 1 : 0, 1 - Math.exp(-(on ? 12 : 6)*dt));
  if (on) m.agP = [P.x, P.y, P.z]; else if (!m.agP) return;
  if (m.agB < .01) return;
  m.root.updateMatrixWorld(true);
  m.gun.getWorldPosition(_agO); _agF.copy(_agZ).transformDirection(m.gun.matrixWorld);
  _agA.set(m.agP[0], m.agP[1], m.agP[2]).sub(_agO); const d = _agA.length(); if (d < .5) return; _agA.divideScalar(d);
  let ang = Math.acos(clamp(_agF.dot(_agA), -1, 1)); if (ang < .002) return;
  _agQ.setFromUnitVectors(_agF, _agA); if (ang > 1.3){ _agQ.slerp(_agI.identity(), 1 - 1.3/ang); }
  m.gun.parent.getWorldQuaternion(_agP);                                                  // world correction -> the chest's frame
  _agQ.premultiply(_agI.copy(_agP).invert()).multiply(_agP);
  _agI.identity().slerp(_agQ, m.agB); m.gun.quaternion.premultiply(_agI);
  const pit = clamp(Math.asin(clamp(_agA.y, -1, 1)), -.7, .9)*m.agB;                     // the head goes up or down with the barrel, his eye behind the sights
  m.neck.rotation.x -= pit*.35; m.head.rotation.x -= pit*.45; m.chest.rotation.x -= pit*.2;
}
/* two-bone IK in the chest's frame: the shoulder turns the upper arm toward the target, the elbow bends (forward, about its own x
   axis, as every pose does) so that the hand ends on it; the elbow is kept toward a pole (down and out). Blended over the pose by w. */
const _IK_PR = new T.Vector3(-.55, -1, -.35).normalize(), _IK_PL = new T.Vector3(.25, -1, .05).normalize();
const _ikT = new T.Vector3(), _ikD = new T.Vector3(), _ikP = new T.Vector3(), _ikU = new T.Vector3(), _ikF = new T.Vector3(), _ikZ = new T.Vector3(), _ikX = new T.Vector3(), _ikY = new T.Vector3(),
  _ikM = new T.Matrix4(), _ikQ = new T.Quaternion();
function armIK(m, side, grip, w, pole){
  if (w < .01) return;
  const sh = side > 0 ? m.shL : m.shR, el = side > 0 ? m.elL : m.elR, L1 = m.L1, L2 = m.L2 + .035;
  _ikT.set(grip[0], grip[1], grip[2]).applyMatrix4(m.gun.matrix);                        // the grip, in the chest's frame
  _ikD.copy(_ikT).sub(sh.position); let d = _ikD.length(); if (d < 1e-4) return;
  _ikD.divideScalar(d); d = clamp(d, Math.abs(L1 - L2) + .01, (L1 + L2)*.995);
  const ca = clamp((L1*L1 + d*d - L2*L2)/(2*L1*d), -1, 1), sa = Math.sqrt(1 - ca*ca);
  _ikP.copy(pole).addScaledVector(_ikD, -pole.dot(_ikD)); if (_ikP.lengthSq() < 1e-6) _ikP.set(0, -1, 0); _ikP.normalize();
  _ikU.copy(_ikD).multiplyScalar(ca).addScaledVector(_ikP, sa);                        // the upper arm
  _ikF.copy(_ikD).multiplyScalar(d).addScaledVector(_ikU, -L1).normalize();             // the forearm
  const cf = clamp(_ikU.dot(_ikF), -1, 1);
  _ikZ.copy(_ikF).addScaledVector(_ikU, -cf); if (_ikZ.lengthSq() < 1e-8) _ikZ.copy(_ikP).negate(); _ikZ.normalize();
  _ikY.copy(_ikU).negate(); _ikX.crossVectors(_ikY, _ikZ).normalize(); _ikZ.crossVectors(_ikX, _ikY);
  _ikM.makeBasis(_ikX, _ikY, _ikZ); _ikQ.setFromRotationMatrix(_ikM);
  sh.quaternion.slerp(_ikQ, w); el.rotation.x = sm(el.rotation.x, -Math.acos(cf), w); el.rotation.y = sm(el.rotation.y, 0, w); el.rotation.z = sm(el.rotation.z, 0, w);
  const wr = side > 0 ? m.wrL : m.wrR; wr.rotation.x = sm(wr.rotation.x, side > 0 ? .25 : -.15, w);
}
/* fast-rope: both hands on the rope over the head (one above the other, closing and opening as he brakes), the legs wrapped round
   it, the head down to watch the ground, the rifle slung; a slow turn and a sway on the rope; and a deep knee bend as he lands */
function animRope(u, m, dt, c){
  const on = !!(u.slide || u.mode === 'slide');
  m.ropeB = sm(m.ropeB || 0, on ? 1 : 0, 1 - Math.exp(-(on ? 18 : 6)*dt));
  u.landT = Math.max(0, (u.landT || 0) - dt);
  m.landB = sm(m.landB || 0, u.landT > 0 ? Math.sin(Math.PI*clamp(1 - u.landT/.55, 0, 1)) : 0, 1 - Math.exp(-25*dt));
  const b = m.ropeB, t = m.idle, v = clamp((u.ropeV || 4)/5.5, 0, 1);
  if (b > .01){
    const grip = Math.sin(t*(4 + 5*v))*.1*(.4 + v), brake = 1 - v;
    m.shR.rotation.set(sm(m.shR.rotation.x, -2.95 + grip + brake*.2, b), sm(m.shR.rotation.y, 0, b), sm(m.shR.rotation.z, .3, b)); m.elR.rotation.x = sm(m.elR.rotation.x, -.45 - brake*.3, b);
    m.shL.rotation.set(sm(m.shL.rotation.x, -2.4 - grip, b), sm(m.shL.rotation.y, 0, b), sm(m.shL.rotation.z, -.35, b)); m.elL.rotation.x = sm(m.elL.rotation.x, -1.05 + brake*.2, b);
    m.wrR.rotation.x = sm(m.wrR.rotation.x, .4, b); m.wrL.rotation.x = sm(m.wrL.rotation.x, .5, b);
    m.hipL.rotation.set(sm(m.hipL.rotation.x, -.55 - brake*.25, b), 0, sm(m.hipL.rotation.z, -.2, b)); m.knL.rotation.x = sm(m.knL.rotation.x, .85 + brake*.3, b);
    m.hipR.rotation.set(sm(m.hipR.rotation.x, -.3, b), 0, sm(m.hipR.rotation.z, .24, b)); m.knR.rotation.x = sm(m.knR.rotation.x, .6, b);
    m.anL.rotation.x = sm(m.anL.rotation.x, .45, b); m.anR.rotation.x = sm(m.anR.rotation.x, .2, b);
    m.abd.rotation.x = sm(m.abd.rotation.x, .05, b); m.chest.rotation.x = sm(m.chest.rotation.x, -.12, b); m.chest.rotation.y = sm(m.chest.rotation.y, 0, b);
    m.neck.rotation.x = sm(m.neck.rotation.x, .35, b); m.head.rotation.x = sm(m.head.rotation.x, .45 + Math.sin(t*1.3)*.06, b); m.head.rotation.y = sm(m.head.rotation.y, Math.sin(t*.7)*.35, b);
    m.body.rotation.z = sm(m.body.rotation.z, Math.sin(t*1.9)*.07, b); m.body.rotation.x = sm(m.body.rotation.x, Math.sin(t*1.3 + 1)*.05, b);
    m.pelvis.position.y = sm(m.pelvis.position.y, (m.py0 || .52) + .02, b);
    m.gun.position.set(sm(m.gun.position.x, -.17, b), sm(m.gun.position.y, -.05, b), sm(m.gun.position.z, -.13, b));
    m.gun.rotation.set(sm(m.gun.rotation.x, 1.35, b), sm(m.gun.rotation.y, 0, b), sm(m.gun.rotation.z, .25, b));
  }
  const l = m.landB;
  if (l > .01){
    m.pelvis.position.y -= .16*l; m.hipL.rotation.x -= .75*l; m.hipR.rotation.x -= .6*l; m.knL.rotation.x += 1.2*l; m.knR.rotation.x += 1.0*l;
    m.anL.rotation.x -= .4*l; m.anR.rotation.x -= .35*l; m.chest.rotation.x += .35*l; m.abd.rotation.x += .2*l; m.neck.rotation.x -= .25*l;
  }
}
/* a man down: on his back, one knee drawn up and rocking, the other leg pushing at the ground; one hand pressed on the wound and
   shaking, the other lifted for help every few seconds; his head comes up to look at the wound and drops back; fast shallow breaths */
function animDowned(u, m, dt, c){
  const on = !!(u.down && !u.alive && c.lie > .5);
  m.dnB = sm(m.dnB || 0, on ? 1 : 0, 1 - Math.exp(-(on ? 2.2 : 8)*dt));
  const b = m.dnB; if (b < .01) return;
  const t = m.idle + (u.dnSeed || (u.dnSeed = rnd()*20));
  const n = (f, p) => (Math.sin(t*f + p) + .5*Math.sin(t*f*2.13 + p*1.7 + 1.3) + .25*Math.sin(t*f*.47 + p*.6 + 4))/1.75;      // a slow wandering value, -1..1
  const pain = .5 + .5*n(.21, 0), sp_ = Math.pow(Math.max(0, n(.33, 2.2)), 4)*1.6;                                           // waves of pain; now and then a spasm
  const breath = t*(4.2 + 2.6*pain) + Math.sin(t*.9)*.6, heave = Math.sin(breath)*(.035 + .03*pain) + Math.max(0, Math.sin(breath*.5))*.02;
  const rock = n(.42, 1), roll = n(.17, 3)*(.7 + .3*pain), call = Math.pow(Math.max(0, n(.19, 5)), 2)*1.3, callC = Math.min(1, call);
  const lift = Math.pow(Math.max(0, n(.26, 7)), 2)*1.2, push = Math.max(0, n(.2, 4)), trem = Math.sin(t*23)*.02*(.3 + pain) + Math.sin(t*31)*.012*sp_;
  m.body.rotation.y += b*(roll*.28 + sp_*.08); m.body.position.x += b*roll*.03;
  // the leg he can still move draws up and rocks; the other pushes at the ground, heel dragging
  m.hipL.rotation.set(sm(m.hipL.rotation.x, -.95 - .3*rock - .35*sp_, b), 0, sm(m.hipL.rotation.z, .14 + .12*rock - roll*.2, b)); m.knL.rotation.x = sm(m.knL.rotation.x, 1.5 + .35*rock + .3*sp_, b);
  m.anL.rotation.x = sm(m.anL.rotation.x, -.3 + .3*rock, b);
  m.hipR.rotation.set(sm(m.hipR.rotation.x, -.08 - .42*push + trem, b), 0, sm(m.hipR.rotation.z, -.1 - roll*.12, b)); m.knR.rotation.x = sm(m.knR.rotation.x, .12 + .75*push, b);
  m.anR.rotation.x = sm(m.anR.rotation.x, .5 - .3*push + n(1.1, 2)*.08, b);
  // one hand pressed on the wound, shaking; the other gropes at the ground, comes up to call for help, falls back
  m.shR.rotation.set(sm(m.shR.rotation.x, -.45 + trem*1.5 - sp_*.12, b), 0, sm(m.shR.rotation.z, .6 + heave*.6, b)); m.elR.rotation.x = sm(m.elR.rotation.x, -1.85 + trem, b);
  m.wrR.rotation.x = sm(m.wrR.rotation.x, .6, b);
  m.shL.rotation.set(sm(m.shL.rotation.x, sm(-.3 + n(.5, 9)*.18, -1.7 + n(.9, 1)*.2, callC), b), 0, sm(m.shL.rotation.z, sm(-.8 + n(.37, 6)*.25, -.12 + n(1.2, 3)*.2, callC), b));
  m.elL.rotation.x = sm(m.elL.rotation.x, sm(-1.3 + n(.6, 2)*.35, -.4 + n(1.4, 8)*.15, callC), b); m.wrL.rotation.x = sm(m.wrL.rotation.x, .3 + n(1.3, 4)*.3, b);
  // the chest heaving, the back arching in a spasm, the trunk twisting from side to side
  m.abd.rotation.x = sm(m.abd.rotation.x, heave + .12*lift - sp_*.14, b); m.chest.rotation.x = sm(m.chest.rotation.x, heave*1.5 + .2*lift - sp_*.2, b);
  m.abd.rotation.y = sm(m.abd.rotation.y, rock*.12 + roll*.1, b); m.chest.rotation.y = sm(m.chest.rotation.y, roll*.14, b); m.pelvis.rotation.y = sm(m.pelvis.rotation.y, -rock*.1, b);
  // the head rolls slowly, lifts to look at the wound, drops back; thrown back in a spasm
  const hy = n(.23, 11)*.6*(1 - Math.min(1, lift));
  m.neck.rotation.set(sm(m.neck.rotation.x, .08 + .45*lift - .25*sp_, b), sm(m.neck.rotation.y, hy, b), 0);
  m.head.rotation.set(sm(m.head.rotation.x, .08 + .35*lift - .2*sp_, b), sm(m.head.rotation.y, hy*.7, b), sm(m.head.rotation.z, roll*.15, b));
  m.gun.position.set(sm(m.gun.position.x, -.42, b), sm(m.gun.position.y, .05, b), sm(m.gun.position.z, .12, b));
  m.gun.rotation.set(sm(m.gun.rotation.x, .25, b), sm(m.gun.rotation.y, 0, b), sm(m.gun.rotation.z, 1.35, b));
}

