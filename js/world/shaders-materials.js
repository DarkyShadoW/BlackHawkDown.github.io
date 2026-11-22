"use strict";
const M = { GEN:0, PLASTER:1, CONC:2, METAL:3, GLASS:4, WOOD:5, CLOTH:6, WHEEL:7, BAG:8, TIN:9, STONE:10, LEAF:11, SHUTTER:12, BURNT:13, BRICK:14, TIRE:15 };
let MAT = 0;
/* ---------- surface detail: procedural per-material texturing for the instanced world ----------
   Material ids: 0 gen 1 plaster 2 concrete 3 metal 4 glass 5 wood 6 cloth 7 wheel 8 sandbag 9 tin
                 10 stone 11 leaves 12 shutter 13 burnt 14 brick 15 tyre stack */
const DET_VS_HEAD = `
#ifdef USE_INSTANCING
attribute float aMat;
#endif
uniform float uMat; uniform vec3 uExt;
varying vec3 vLP; varying vec3 vLN; varying vec3 vSc; varying vec3 vWP; varying vec3 vWN; varying vec3 vSeed; varying float vMat;
`;
const DET_VS_BODY = `
{
#ifdef USE_INSTANCING
  mat4 dIM = instanceMatrix;
  vMat = aMat;
#else
  mat4 dIM = mat4(1.0);
  vMat = uMat;
#endif
  vec3 dS = vec3(length(dIM[0].xyz), length(dIM[1].xyz), length(dIM[2].xyz));
  vSc = dS * uExt;
  vLP = position * dS;
  vLN = normal;
  vWP = (modelMatrix * dIM * vec4(position, 1.0)).xyz;
  vWN = normalize(mat3(modelMatrix) * (mat3(dIM) * (normal / max(dS * dS, vec3(1e-6)))));
  vSeed = (modelMatrix * dIM[3]).xyz;
}
`;
const DET_FS_HEAD = `
uniform float uCyl; uniform float uBump;
varying vec3 vLP; varying vec3 vLN; varying vec3 vSc; varying vec3 vWP; varying vec3 vWN; varying vec3 vSeed; varying float vMat;
float dHash(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float dNoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i), dHash(i + vec3(1.0,0.0,0.0)), f.x), mix(dHash(i + vec3(0.0,1.0,0.0)), dHash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(dHash(i + vec3(0.0,0.0,1.0)), dHash(i + vec3(1.0,0.0,1.0)), f.x), mix(dHash(i + vec3(0.0,1.0,1.0)), dHash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
float dFbm(vec3 p){ return dNoise(p) * .5 + dNoise(p * 2.07 + 3.1) * .3 + dNoise(p * 4.13 + 7.7) * .2; }
vec3 dBrick(vec2 q, float sd, out float hb){
  vec2 bu = q / vec2(.15, .07); float row = floor(bu.y); bu.x += mod(row, 2.0) * .5; vec2 f = fract(bu);
  float mort = max(step(f.x, .12), step(f.y, .2));
  vec3 bc = vec3(.6, .33, .23) * (.78 + dHash(vec3(floor(bu.x), row, sd)) * .42);
  hb = 1.0 - mort;
  return mix(bc, vec3(.66, .62, .54), mort);
}
vec3 dDetail(vec3 base, out float h){
  h = 0.0;
  int m = int(vMat + .5);
  vec3 an = abs(vLN);
  float side = 1.0 - step(.5, abs(vWN.y));
  vec2 uv; vec2 ex;
  if (an.y > .5){ uv = vLP.xz; ex = vSc.xz; } else if (an.x > .5){ uv = vLP.zy; ex = vSc.zy; } else { uv = vLP.xy; ex = vSc.xy; }
  bool uDom = ex.x >= ex.y;
  float dom = uDom ? uv.x : uv.y;
  float crs = uDom ? uv.y : uv.x;
  float hx = abs(vWN.x) > .5 ? vWP.z : vWP.x;
  float sd = dHash(floor(vSeed * 7.3) + .5);
  float b = dFbm(vWP * 1.4 + sd * 9.0);
  float g = dHash(floor(vWP * 11.0));
  float lowY = 1.0 - smoothstep(0.0, 0.8, vWP.y);
  vec3 dust = vec3(.62, .54, .42);
  vec3 c = base;
  if (m == 1 || m == 14){
    c *= .84 + b * .3; c *= .97 + g * .05;
    float st = smoothstep(.5, .9, dNoise(vec3(hx * 5.0, vWP.y * .4, sd * 13.0)));
    c *= 1.0 - st * .16 * side;
    c = mix(c, c * dust * 1.3, lowY * .55 * side);
    float cr = abs(dNoise(vWP * 2.6 + 11.0) - .5);
    float crack = (1.0 - smoothstep(0.0, .016, cr)) * smoothstep(.72, .82, dNoise(vWP * .6 + 5.0)) * side;
    c *= 1.0 - crack * .5; h -= crack * .6;
    float exB = smoothstep(.64, .67, dFbm(vWP * .55 + 17.0 + sd * 3.0)) * side;
    if (m == 14) exB = 1.0;
    if (exB > 0.0){
      float hb; vec3 bc = dBrick(side > .5 ? vec2(hx, vWP.y) : vWP.xz, sd, hb);
      c = mix(c, bc * (.9 + b * .2), exB); h += exB * (hb * .6 - .7);
    }
    h += b * .5;
  } else if (m == 2){
    c *= .85 + b * .25; c *= .96 + g * .06;
    float pore = step(.985, dHash(floor(vWP * 16.0) + 3.0)); c *= 1.0 - pore * .18; h -= pore * .3;
    float form = side * step(fract(vWP.y / .42), .04); c *= 1.0 - form * .12; h -= form * .3;
    c = mix(c, c * dust * 1.25, lowY * .4 * side);
    h += b * .4;
  } else if (m == 3){
    c *= .93 + dFbm(vWP * 3.0 + sd * 5.0) * .12;
    float seam = side * step(fract(dom / .58 + sd), .035);
    c *= 1.0 - seam * .35; h -= seam * .6;
    float rust = smoothstep(.7, .8, dFbm(vWP * 2.4 + sd * 7.0) + lowY * .2);
    c = mix(c, vec3(.42, .24, .12) * (.8 + g * .4), rust * .85); h += rust * .3;
    float scr = (1.0 - smoothstep(0.0, .02, abs(dNoise(vec3(dom * 1.5, crs * 28.0, sd * 9.0)) - .5))) * step(.6, dNoise(vWP * 1.3 + 2.0));
    c += scr * .1;
    c = mix(c, dust * .9, lowY * .45 * smoothstep(.3, .7, dNoise(vWP * 4.0)));
    if (uCyl > .5){ float rb = step(fract((vLP.y / max(vSc.y, .01) + .5) * 3.0), .07); c *= 1.0 - rb * .22; h += rb * .7; }
  } else if (m == 4){
    float vt = clamp(vLP.y / max(vSc.y, .01) + .5, 0.0, 1.0);
    c = mix(base * .6, base * 1.35 + vec3(.1, .12, .13), vt * vt);
    float refl = smoothstep(0.0, .05, .1 - abs(fract((hx + vWP.y) * 1.1 + sd) - .5));
    c += refl * vec3(.22, .25, .27) * side;
    c = mix(c, dust, (1.0 - vt) * .22 + g * .06);
    if (sd > .8){ float ck = 1.0 - smoothstep(0.0, .03, abs(dNoise(vWP * 9.0 + sd) - .5)); c = mix(c, vec3(.8, .85, .85), ck * .7); }
  } else if (m == 5){
    float gr = dNoise(vec3(dom * 1.8, crs * 26.0, sd * 11.0));
    c *= .78 + .3 * smoothstep(.2, .8, gr);
    float plank = step(fract(crs / .16 + sd), .07); c *= 1.0 - plank * .4; h -= plank * .7;
    float knot = step(.965, dHash(floor(vec3(dom * 6.0, crs * 6.0, sd * 5.0)))); c *= 1.0 - knot * .35;
    c = mix(c, c * .75 + dust * .15, b * .4);
    h += gr * .25;
  } else if (m == 6){
    float weave = dHash(floor(vec3(uv * 24.0, sd))); c *= .95 + weave * .07;
    if (sd > .45){ float s = step(.5, fract(dom / .2)); c = mix(c, vec3(.88, .85, .76) * (.9 + b * .1), s * .8); }
    c = mix(c, c * .7 + vec3(.22), b * .35);
    float fold = dNoise(vec3(dom * 3.0, crs * .5, sd * 3.0)); h += fold * .8; c *= .9 + fold * .15;
  } else if (m == 7 || m == 15){
    c = base * (.94 + g * .1);
    if (uCyl > .5){
      float r = length(vLP.xz) / max(.5 * vSc.x, .01);
      if (an.y > .5){
        if (m == 7){ float hub = 1.0 - step(.56, r); c = mix(c, vec3(.5, .5, .47) * (.8 + b * .3), hub); h += hub * .6;
          float nut = hub * step(.3, r) * step(.9, dHash(floor(vLP * 70.0))); c *= 1.0 - nut * .5; }
        else { float hole = 1.0 - step(.5, r); c *= 1.0 - hole * .65; h -= hole; }
        c *= .85 + .2 * smoothstep(.6, 1.0, r);
      } else { float tread = step(.5, fract(atan(vLP.z, vLP.x) * 3.82)); c *= .8 + tread * .25; h += tread * .5; }
    }
    c = mix(c, dust * .7, lowY * .3);
  } else if (m == 8){
    float e = max(abs(uv.x) / max(ex.x * .5, .01), abs(uv.y) / max(ex.y * .5, .01));
    float puff = 1.0 - e * e;
    c *= .76 + puff * .32;
    float wv = dHash(floor(vec3(uv * 25.0, 1.0))); c *= .96 + wv * .06;
    float tie = step(.9, e) * step(fract(dom * 9.0), .5); c *= 1.0 - tie * .15;
    c = mix(c, dust, lowY * .25 + b * .15);
    h += puff * 1.6;
  } else if (m == 9){
    float u = side > .5 ? hx : vWP.x;
    float cor = sin(u * 70.0);
    float pan = dHash(vec3(floor(u / .55), floor(vWP.y / .9), sd * 4.0));
    c *= .85 + pan * .25; c *= .92 + cor * .06; h += cor * .5;
    float rs = smoothstep(.45, .75, dNoise(vec3(u * 6.0, vWP.y * .7, sd * 8.0)) + (pan > .7 ? .25 : 0.0));
    c = mix(c, vec3(.45, .27, .15) * (.8 + g * .3), rs * .8);
  } else if (m == 10){
    vec2 q = (side > .5 ? vec2(hx, vWP.y) : vWP.xz) / vec2(.32, .2); float row = floor(q.y); q.x += mod(row, 2.0) * .5; vec2 f = fract(q);
    float mort = max(step(f.x, .06), step(f.y, .1));
    c *= .88 + dHash(vec3(floor(q.x), row, 2.0)) * .14; c *= .94 + b * .12; c *= 1.0 - mort * .14; h += (1.0 - mort) * .5;
  } else if (m == 11){
    float lv = dNoise(vWP * 9.0); c *= .62 + lv * .6 + b * .2; h += lv * .8;
  } else if (m == 12){
    float sl = fract(vWP.y / .07); c *= .82 + .22 * smoothstep(.1, .5, sl); h += smoothstep(0.0, .5, sl) * .6;
    float rs = smoothstep(.62, .8, dFbm(vWP * 2.0 + sd * 6.0) + lowY * .2); c = mix(c, vec3(.44, .26, .14), rs * .7);
    if (sd > .55){ float gf = smoothstep(.6, .64, dFbm(vWP * 2.8 + sd * 20.0));
      vec3 gc = normalize(vec3(dHash(vec3(sd, 1.0, 2.0)), dHash(vec3(sd, 3.0, 4.0)), dHash(vec3(sd, 5.0, 6.0))) + .05) * .95;
      c = mix(c, gc, gf * .85); }
  } else if (m == 13){
    c = vec3(.09, .085, .08) * (.85 + g * .3);
    float rs = smoothstep(.5, .7, dFbm(vWP * 2.2 + sd * 4.0)); c = mix(c, vec3(.36, .2, .11) * (.8 + g * .3), rs);
    float ash = smoothstep(.65, .8, dNoise(vWP * 5.0)); c = mix(c, vec3(.42, .4, .37), ash * .6 * (1.0 - side * .5));
    h += rs * .5 + b * .3;
  } else {
    c *= .9 + b * .15 + g * .04;
  }
  return clamp(c, 0.0, 1.5);
}
`;
const DET_FS_COLOR = `
#include <color_fragment>
float dH = 0.0;
diffuseColor.rgb = dDetail(diffuseColor.rgb, dH);
`;
const DET_FS_BUMP = `
#include <normal_fragment_begin>
{
  vec3 dsX = dFdx(-vViewPosition), dsY = dFdy(-vViewPosition);
  float dhx = dFdx(dH) * uBump, dhy = dFdy(dH) * uBump;
  vec3 dR1 = cross(dsY, normal), dR2 = cross(normal, dsX);
  float dDet = dot(dsX, dR1);
  vec3 dGrad = sign(dDet) * (dhx * dR1 + dhy * dR2);
  vec3 dN = normalize(abs(dDet) * normal - dGrad);
  normal = normalize(mix(normal, dN, .85));
}
`;
const DETAIL_ON = { v:true };
const detailMats = [];
function patchDetail(mat, opt){
  opt = opt || {};
  mat.extensions = Object.assign(mat.extensions || {}, { derivatives:true });
  mat.onBeforeCompile = sh => {
    if (!DETAIL_ON.v) return;
    sh.uniforms.uMat = { value:opt.m || 0 }; sh.uniforms.uCyl = { value:opt.cyl ? 1 : 0 };
    sh.uniforms.uExt = { value:new T.Vector3().fromArray(opt.ext || [1,1,1]) }; sh.uniforms.uBump = { value:opt.bump || .9 };
    sh.vertexShader = DET_VS_HEAD + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + DET_VS_BODY);
    let fs = DET_FS_HEAD + sh.fragmentShader.replace('#include <color_fragment>', DET_FS_COLOR);
    if (fs.indexOf('#include <normal_fragment_begin>') >= 0 && fs.indexOf('vViewPosition') >= 0) fs = fs.replace('#include <normal_fragment_begin>', DET_FS_BUMP);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'det' + (DETAIL_ON.v ? 1 : 0) + (opt.cyl ? 'c' : 'b') + (opt.m || 0);
  detailMats.push(mat);
  return mat;
}
function checkDetailShaders(){
  if (!DETAIL_ON.v) return;
  const bad = (renderer.info.programs || []).some(p => p.diagnostics && p.diagnostics.runnable === false);
  if (bad){ DETAIL_ON.v = false; UNIT_ON.v = false; for (const m of detailMats) m.needsUpdate = true; }
}


/* ---------- instanced world parts ---------- */
let BX, CY, FAR;
let GHOST = false;   // while set, geometry is not kept: used to 'build' things that must not appear without changing the random sequence
let COVREC = null;
function B(x,y,z,sx,sy,sz,c,o){ if (GHOST) return; const e = inst(x,y,z,sx,sy,sz,c,o), L = CUR || chunkFor(x, z); (o && o.awn ? L.AW : e.mn ? L.BXm : L.BX).push(e); if (COVREC){ COVREC.push(e); e.chL = L; } }
function C(x,y,z,r,h,c,o){ if (GHOST) return; const e = inst(x,y,z,r*2,h,r*2,c,o); (CUR || chunkFor(x, z)).CY.push(e); }
function inst(x,y,z,sx,sy,sz,c,o){
  o = o || {};
  return { x,y,z,sx,sy,sz,c, mn: Math.max(sx,sy,sz) < .3 && !o.awn, m:o.m != null ? o.m : MAT, rx:o.rx||0, ry:o.ry||0, rz:o.rz||0, ord:o.ord||'XYZ', b:o.b==null?-1:o.b, roof:o.roof?1:0, awn:o.awn||0, ph:o.awn ? Math.random()*6 : 0, inv:o.hid ? 1 : 0 };
}
const dummy = new T.Object3D(), tmpCol = new T.Color();
function writeInst(mesh, list, cut){
  for (let k=0;k<list.length;k++){
    const e = list[k]; let y = e.y, sy = e.sy, hide = !!e.gone || !!e.inv;
    if (cut && e.b >= 0){
      if (e.roof) hide = true;
      else { const bot = e.y - e.sy/2, top = e.y + e.sy/2; if (bot >= CUT) hide = true; else if (top > CUT){ sy = CUT - bot; y = bot + sy/2; } }
    }
    dummy.position.set(e.x, y, e.z); dummy.rotation.set(e.rx, e.ry, e.rz, e.ord);
    if (hide) dummy.scale.set(0,0,0); else dummy.scale.set(e.sx, sy, e.sz);
    dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
function makeInst(geo, list, shadow, parent){
  const n = Math.max(1,list.length), g = geo.clone(), am = new Float32Array(n);
  list.forEach((e,k) => am[k] = e.m || 0);
  g.setAttribute('aMat', new T.InstancedBufferAttribute(am, 1));
  const m = new T.InstancedMesh(g, patchDetail(new T.MeshPhongMaterial({ color:0xffffff, specular:0x000000, shininess:1 }), { cyl: geo === UCYL }), n);
  m.frustumCulled = false;
  list.forEach((e,k) => { tmpCol.setHex(e.c); m.setColorAt(k, tmpCol); });
  writeInst(m, list, false);
  m.receiveShadow = true; if (shadow) m.castShadow = true;
  (parent || world).add(m); return m;
}

/* ---------- map ---------- */
let topH, grid, cov, reserved, ground, world, units, us, them, fx, sched, nBld, emitters, poles;
// the tactical grid normally lies over the city; a mission can slide it elsewhere (the tutorial moves it onto the airfield)
let ORX = 0, ORZ = 0, TZONE = null;
const idx = (i,j) => (j-ORZ)*W + (i-ORX);
const inB = (i,j) => i>=ORX && j>=ORZ && i<ORX+W && j<ORZ+H;
const kI = k => k % W + ORX, kJ = k => ((k / W) | 0) + ORZ;
const walk = (i,j) => inB(i,j) && grid[idx(i,j)] === 0;
const PLAZA = { x0:OX+36, x1:OX+50, y0:OZ+22, y1:OZ+27 }, MARKET = { x0:OX+36, x1:OX+50, y0:OZ+36, y1:OZ+49 };
const inR = (r,i,j) => i>=r.x0 && i<=r.x1 && j>=r.y0 && j<=r.y1;
const isStreet = (i,j) => inB(i,j) && STR[idx(i,j)] > 0;
const openArea = (i,j) => !inB(i,j) || isStreet(i,j) || inR(PLAZA,i,j);

const WALLS = [0xe6dfcc,0xd9c7a0,0xc9cfc0,0xdcb487,0xd0a688,0xb8c3c4,0xece2cc,0xcfc4a8,0xbfae8e,0xd8cfb8];
const BASES = [0x5d876a,0x4c7a82,0x86684a,0x95493a,0x6a6a5c,0x7a8a5a];
const ROOFS = [0xa79e8c,0x9a9282,0x8f866f,0xb0a690];
const AWN = [0x4f6a52,0x7e4a3e,0x4a5c72,0x8e7a4e,0x46625e];
const SIGN = [0x4a5e74,0xa89a62,0x7e4a3e,0x52684e,0xd8d2c2];

const COVER_H = { sandbag:.58, barrier:.83, wall:.9, car:.85, van:.85, pickup:.85, bus:.85, barrel:.72, rubble:.3, crates:.6, tires:.55, stall:.76, tree:0, fountain:.6 };
function setTop(x,y,w,d,h){ for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (inB(i,j)) topH[idx(i,j)] = h; }
const barrelMats = {};
function barrelMat(c){ return barrelMats[c] || (barrelMats[c] = patchDetail(new T.MeshPhongMaterial({ color:c, specular:0x111111, shininess:8 }), { m:M.METAL, cyl:true, ext:[.52,.72,.52] })); }
function markB(x,y,w,d){ for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (inB(i,j)) grid[idx(i,j)] = 1; }
function freeLot(x,y,w,d){ for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (!inB(i,j) || grid[idx(i,j)] !== 0 || reserved[idx(i,j)] || openArea(i,j)) return false; return true; }

/* facade helper: face 0 N(z=y) 1 S(z=y+d) 2 W(x=x) 3 E(x=x+w) */
// an outdoor air-conditioning unit on a facade (the uploaded pack): its back against the wall, the fans looking out
function acUnit(F, t, y0){
  const f = F.face, h = phs(F.x + t*1.3, F.y + y0*7.1, 31), part = 'ac' + (1 + Math.floor(h*4) % 4), o = .012;
  let x, z, ry;
  if (f === 0){ x = F.x + t; z = F.y - o; ry = Math.PI; } else if (f === 1){ x = F.x + t; z = F.y + F.d + o; ry = 0; }
  else if (f === 2){ x = F.x - o; z = F.y + t; ry = -Math.PI/2; } else { x = F.x + F.w + o; z = F.y + t; ry = Math.PI/2; }
  prop('junk2', part, x, y0, z, ry, 1, [0xffffff, 0xf2ece0, 0xe4dccc][Math.floor(h*37) % 3]);
}
function FB(F, t, yy, o, along, h, depth, c, b, extra){
  const f = F.face; let x, z, sx, sz;
  if (f===0){ x = F.x + t; z = F.y - o; sx = along; sz = depth; }
  else if (f===1){ x = F.x + t; z = F.y + F.d + o; sx = along; sz = depth; }
  else if (f===2){ x = F.x - o; z = F.y + t; sx = depth; sz = along; }
  else { x = F.x + F.w + o; z = F.y + t; sx = depth; sz = along; }
  B(x, yy, z, sx, h, sz, c, Object.assign({ b }, extra || {}));
}
function faceOpen(x,y,w,d,f){
  const cells = [];
  if (f===0) for (let i=x;i<x+w;i++) cells.push([i,y-1]);
  if (f===1) for (let i=x;i<x+w;i++) cells.push([i,y+d]);
  if (f===2) for (let j=y;j<y+d;j++) cells.push([x-1,j]);
  if (f===3) for (let j=y;j<y+d;j++) cells.push([x+w,j]);
  return cells.filter(c => openArea(c[0],c[1])).length > cells.length/2;
}

function building(x,y,w,d,floors,o){
  o = o || {};
  if (PLANNING){
    if (!o.force && !freeLot(x,y,w,d)) return false;
    markB(x,y,w,d);
    const sF = (!!o.damaged && floors >= 2) ? floors-1 : floors;
    setTop(x,y,w,d, sF*FH + .1 + (o.mosque ? 2 : 0)); regB(x, y, w, d, sF*FH + .1);
    lazyAdd(x + w/2, y + d/2, () => building(x,y,w,d,floors,Object.assign({}, o, { force:true })));
    return true;
  }
  if (!o.force && !freeLot(x,y,w,d)) return false;
  markB(x,y,w,d); MAT = M.PLASTER;
  const b = nBld++;
  const wall = o.col || jit(pick(WALLS), .05);
  const damaged = !!o.damaged && floors >= 2;
  const solidF = damaged ? floors-1 : floors;
  const h = floors*FH, hs = solidF*FH, cx = x+w/2, cz = y+d/2;
  setTop(x,y,w,d,hs+.1);
  const base = o.base || (rnd() < .5 ? pick(BASES) : shade(wall,.78));
  const ledge = shade(wall, rnd()<.5 ? .86 : 1.06);
  B(cx, hs/2, cz, w-0.04, hs, d-0.04, wall, { b });
  B(cx, 0.45, cz, w+0.01, 0.9, d+0.01, base, { b });
  for (let f=1; f<solidF; f++) B(cx, f*FH, cz, w+0.08, 0.07, d+0.08, ledge, { b });
  // roof
  const roofC = pick(ROOFS);
  B(cx, hs+0.05, cz, w+0.06, 0.1, d+0.06, roofC, { b, m:M.CONC });
  if (!damaged){
    const ph = o.hotel ? .5 : rr(.25,.45), pc = shade(wall,.95);
    B(cx, hs+ph/2+0.1, y+0.06, w, ph, 0.12, pc, { b, roof:1 }); B(cx, hs+ph/2+0.1, y+d-0.06, w, ph, 0.12, pc, { b, roof:1 });
    B(x+0.06, hs+ph/2+0.1, cz, 0.12, ph, d, pc, { b, roof:1 }); B(x+w-0.06, hs+ph/2+0.1, cz, 0.12, ph, d, pc, { b, roof:1 });
    if (o.cren || rnd() < .25){
      for (let t=0.3; t<w-0.1; t+=0.6){ B(x+t, hs+ph+0.22, y+0.06, 0.24, 0.24, 0.14, pc, { b, roof:1 }); B(x+t, hs+ph+0.22, y+d-0.06, 0.24, 0.24, 0.14, pc, { b, roof:1 }); }
      for (let t=0.3; t<d-0.1; t+=0.6){ B(x+0.06, hs+ph+0.22, y+t, 0.14, 0.24, 0.24, pc, { b, roof:1 }); B(x+w-0.06, hs+ph+0.22, y+t, 0.14, 0.24, 0.24, pc, { b, roof:1 }); }
    }
    roofProps(x, y, w, d, hs+0.1, wall, b, o.hotel);
    lseed = (Math.imul(x|0, 7919) ^ Math.imul(y|0, 104729) ^ 0x2545f491) >>> 0; lrnd();
    const xtraW = Math.hypot(x + w/2 - LM.s61.x, y + d/2 - LM.s61.z) > 48;   // the Super 6-1 crash site keeps its look: no extra washing there
    if (!o.hotel && w >= 3 && d >= 3 && rnd() < .38){ const top = hs + 1.0, along = w >= d;   // a washing line across the roof
      if (along){ const z = y + .7 + rnd()*(d - 1.4); hangLine(x + .35, z, x + w - .35, z, top); } else { const xx = x + .7 + rnd()*(w - 1.4); hangLine(xx, y + .35, xx, y + d - .35, top); } }
    else if (xtraW && !o.hotel && w >= 3 && d >= 3 && lrnd() < .3){ const top = hs + 1.0;   // a second chance of washing on the roof
      if (lrnd() < .5) hangLine(x + .35, y + d*.5, x + w - .35, y + d*.5, top, true); else hangLine(x + w*.5, y + .35, x + w*.5, y + d - .35, top, true); }
    // washing strung out of the windows along a street-facing wall
    if (xtraW && !o.hotel && solidF >= 2 && lrnd() < .4){ const f = lrnd() < .5 ? 0 : 1 + Math.floor(lrnd()*3), fl = 1 + Math.floor(lrnd()*(solidF - 1)), yy = fl*FH + FH*.72;
      const ff = [0, 1, 2, 3].map(k => (f + k) % 4).find(k => faceOpen(x, y, w, d, k));
      if (ff === 0 && w >= 3) hangLine(x + .5, y - .42, x + w - .5, y - .42, yy, true);
      else if (ff === 1 && w >= 3) hangLine(x + .5, y + d + .42, x + w - .5, y + d + .42, yy, true);
      else if (ff === 2 && d >= 3) hangLine(x - .42, y + .5, x - .42, y + d - .5, yy, true);
      else if (ff === 3 && d >= 3) hangLine(x + w + .42, y + .5, x + w + .42, y + d - .5, yy, true); }
    if (o.mosque) mosqueTop(x, y, w, d, hs+.1);
  } else {
    // ruined top floor: corner pillars, broken walls, rubble on the slab
    const top = hs + FH;
    for (const [px,pz] of [[x+.2,y+.2],[x+w-.2,y+.2],[x+.2,y+d-.2],[x+w-.2,y+d-.2]]) if (rnd() < .8){ const ph = rr(.5,FH); B(px, hs+ph/2, pz, .3, ph, .3, wall, { b }); }
    const sides = [[cx, y+0.08, w*rr(.3,.7), 0.16],[cx, y+d-0.08, w*rr(.3,.7), 0.16]];
    sides.forEach(([sx_,sz_,len,th]) => { if (rnd()<.7){ const ph = rr(.4, FH*.8); B(x + len/2 + rnd()*(w-len), hs+ph/2, sz_, len, ph, th, wall, { b }); } });
    for (let k=0;k<10;k++) B(x+rr(.3,w-.3), hs+0.1+rnd()*.15, y+rr(.3,d-.3), rr(.2,.6), rr(.12,.3), rr(.2,.6), pick([0xb4aa98,0x9d9484,0xa0644a]), { b, ry:rnd()*3, m:M.CONC });
    for (let k=0;k<3;k++){ rr(0,1); rr(0,1); rr(0,1); rr(0,1); }   // (the loose rebars are gone: the draws are kept so the rest stays the same)
  }
  // facades
  const wc = rnd()<.4 ? pick([0x3e6b6a,0x5a7d9a,0x6f8a4a,0x7a5a3a]) : 0x2b2925;
  const frame = shade(wall, rnd()<.5 ? 1.12 : .82);
  const arcade = o.arcade || rnd() < .18;
  const balc = rnd() < .4;
  for (let face=0; face<4; face++){
    const F = { face, x, y, w, d }, L = face<2 ? w : d;
    const street = faceOpen(x,y,w,d,face);
    const n = Math.max(1, Math.floor((L-0.3)/1.15)), step = L/n;
    const arc = arcade && street && face<2;
    if (arc){
      FB(F, L/2, 0.47, 0.012, L-0.2, 0.92, 0.02, shade(wall,.42), b);
      for (let k=0;k<=n;k++) FB(F, Math.min(L-.12, Math.max(.12, k*step)), 0.5, 0.2, 0.22, 1.0, 0.22, shade(wall,1.05), b);
      FB(F, L/2, 1.08, 0.2, L, 0.22, 0.32, shade(wall,.97), b);
    }
    for (let f=0; f<solidF + (damaged?1:0); f++){
      const yy = f*FH + 0.72;
      for (let k=0;k<n;k++){
        const t = step*(k+.5);
        if (damaged && f === solidF) continue;
        if (f === 0 && street && !arc){
          if (rnd() < .65){
            FB(F, t, 0.47, 0.03, Math.min(.92, step*.82), 0.9, 0.05, pick([0x6b6f70,0x5a6a6a,0x4a5a52,0x7a6a52]), b, { m:M.SHUTTER });
            if (rnd() < .55){ const tilt = .38; const ex = face===0?{rx:-tilt,awn:1}:face===1?{rx:tilt,awn:1}:face===2?{rz:tilt,awn:1}:{rz:-tilt,awn:1}; ex.m = M.CLOTH;
              FB(F, t, 1.1, 0.36, step*.95, 0.05, 0.72, pick(AWN), b, ex); }
            else if (rnd() < .6){ const sc = pick(SIGN); FB(F, t, 1.12, 0.04, step*.9, 0.3, 0.05, sc, b, { m:M.METAL }); FB(F, t, 1.12, 0.05, step*.6, 0.08, 0.05, shade(sc,.5), b, { m:M.METAL }); }
            continue;
          }
        }
        if (f === 0 && arc) continue;
        if (rnd() < .06) continue;
        FB(F, t, yy, 0.02, 0.56, 0.68, 0.04, frame, b);
        const boarded = rnd() < .1;
        FB(F, t, yy, 0.035, 0.4, 0.5, 0.05, boarded ? 0x7a5a3a : (o.hotel ? 0x5f8aa8 : wc), b, { m: boarded ? M.WOOD : M.GLASS });
        if (!boarded && rnd() < .25){ const sh = pick([0x3e6b6a,0x6a5236,0x5a7d9a,0x8a8a7a]); FB(F, t-0.3, yy, 0.05, 0.16, 0.52, 0.04, sh, b, { m:M.WOOD }); FB(F, t+0.3, yy, 0.05, 0.16, 0.52, 0.04, sh, b, { m:M.WOOD }); }
        if (rnd() < .16){ FB(F, t, yy-0.46, 0.1, 0.42, 0.28, 0.17, 0xd6d2c6, b, { m:M.METAL, hid:1 }); acUnit(F, t, yy-0.46-0.14); }
        if (balc && street && f >= 1 && k % 2 === 0 && rnd() < .7){
          FB(F, t, yy-0.38, 0.26, Math.min(1.05, step*.95), 0.07, 0.52, shade(wall,.9), b, { m:M.CONC });
          FB(F, t, yy-0.05, 0.5, Math.min(1.05, step*.95), 0.04, 0.04, 0x3a3630, b, { m:M.METAL });
          FB(F, t-0.45, yy-0.2, 0.5, 0.04, 0.32, 0.04, 0x3a3630, b, { m:M.METAL }); FB(F, t+0.45, yy-0.2, 0.5, 0.04, 0.32, 0.04, 0x3a3630, b, { m:M.METAL });
          if (rnd() < .4) FB(F, t, yy-0.15, 0.48, Math.min(.9, step*.8), 0.24, 0.02, pick([0xd8d1c1,0xc9bc9f,0xbcad8c,0xe2dccd]), b, { m:M.CLOTH });
        }
      }
    }
    if (damaged || rnd() < .25){ // shell holes and exposed brick
      const holes = damaged ? 3 : 1;
      for (let k=0;k<holes;k++){ const t = rr(.6, L-.6), yy = rr(.9, Math.max(1, hs-.4));
        FB(F, t+.08, yy+.05, 0.015, rr(.6,1.1), rr(.5,.8), 0.03, 0xa0644a, b, { m:M.BRICK });
        FB(F, t, yy, 0.03, rr(.35,.6), rr(.3,.5), 0.04, 0x221f1b, b, { m:M.BURNT }); }
    }
  }
  if (damaged || rnd() < .15) rubbleAround(x,y,w,d);
  if (o.hotel){ // entrance canopy and the rooftop sign
    hotelSign(x, y, w, d, hs + .1, b);
    FB({ face:1, x, y, w, d }, w/2, 1.2, 0.6, 2.4, 0.1, 1.2, 0xe8e2d0, b);
    FB({ face:1, x, y, w, d }, w/2-1.1, 0.6, 1.1, 0.1, 1.2, 0.1, 0xd9d2c0, b); FB({ face:1, x, y, w, d }, w/2+1.1, 0.6, 1.1, 0.1, 1.2, 0.1, 0xd9d2c0, b);
  }
  return true;
}
function roofProps(x,y,w,d,top,wall,b,hotel){
  const P = (px,py,pz,sx,sy,sz,c,ex) => B(px,py,pz,sx,sy,sz,c,Object.assign({ b, roof:1 }, ex||{}));
  const tanks = rnd() < .6 ? 1 + ri(2) : 0;
  for (let k=0;k<tanks;k++){
    const tx = x+rr(.8,w-.8), tz = y+rr(.8,d-.8), tc = pick([0x7a776c,0x8a6446,0x56697a,0xb4a280,0x4a4640]);   // sand, brown, blue, dark: all dusty
    const tall = rnd() < .5 ? .5 : 0;
    if (tall) for (const [a,c] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]) P(tx+a, top+.25, tz+c, .06, .5, .06, 0x3a3630, { m:M.METAL });   // the legs well in under the tank
    C(tx, top+tall+.38, tz, .42, .75, tc, { b, roof:1, m:M.METAL }); C(tx, top+tall+.78, tz, .3, .06, shade(tc,.8), { b, roof:1, m:M.METAL });
  }
  if (rnd() < .5){ const sx = x+rr(.9,w-.9), sz = y+rr(.9,d-.9); P(sx, top+.45, sz, 1.1, .9, 1.0, shade(wall,.95)); P(sx, top+.95, sz, 1.2, .08, 1.1, 0x8f866f, { m:M.TIN }); }
  if (rnd() < .3 || hotel){ const dx = x+rr(.6,w-.6), dz = y+rr(.6,d-.6); P(dx, top+.25, dz, .06, .5, .06, 0x6a6a64, { m:M.METAL }); C(dx, top+.55, dz, .32, .05, 0xdedad0, { b, roof:1, rx:.9, ry:rnd()*6, ord:'YXZ', m:M.METAL }); }
  if (rnd() < .35 || hotel){ const ax = x+rr(.4,w-.4), az = y+rr(.4,d-.4), ah = hotel ? 3.2 : rr(1.2,2.2);
    if (hotel){ P(ax, top+ah/2, az, .05, ah, .05, 0x4a4844, { m:M.METAL }); for (let k=0;k<3;k++) P(ax, top+ah*(.55+k*.15), az, .5-k*.12, .03, .03, 0x4a4844, { m:M.METAL }); }
    else { const h = phs(ax, az, 61); prop('deco9', 'ant', ax, top, az, h*6.283, .85 + (ah - 1.2)*.45, 0xffffff, { roof:1 }); } }
  if (rnd() < .5) for (let k=0;k<2+ri(3);k++){ const bx = x+rr(.5,w-.5), bz = y+rr(.5,d-.5), sx = rr(.25,.5), sy = rr(.2,.35), sz = rr(.25,.5), bc = pick([0x8b6a42,0x6b6f70,0xa79e8c,0x3a5a7a]), bry = rnd()*3;
    roofBox(bx, top, bz, sx, sy, sz, bc, bry, b); }
  if (rnd() < .22){ const lx = x+rr(.5,w-1.5), lz = y+rr(.6,d-.6); P(lx, top+.35, lz, .04, .7, .04, 0x3a3630, { m:M.METAL }); P(lx+1.2, top+.35, lz, .04, .7, .04, 0x3a3630, { m:M.METAL });
    for (let k=0;k<4;k++) P(lx+.15+k*.28, top+.36, lz, .2, .3, .02, pick([0xd8d1c1,0xc9bc9f,0xbcad8c,0xe2dccd,0xb2a283]), { awn:2, m:M.CLOTH }); }
  if (rnd() < .2){ const sx = x+rr(.8,w-.8), sz = y+rr(.8,d-.8); P(sx, top+.12, sz, 1.2, .05, .7, 0x2a3a5a, { rx:-.3, m:M.GLASS }); }
}
function rubbleAround(x,y,w,d){
  for (let k=0;k<14;k++){
    let i, j; const f = ri(4);
    if (f===0){ i = x+ri(w); j = y-1; } else if (f===1){ i = x+ri(w); j = y+d; } else if (f===2){ i = x-1; j = y+ri(d); } else { i = x+w; j = y+ri(d); }
    if (!inB(i,j) || grid[idx(i,j)] === 1) continue;
    if (rnd() < .3){ const bx = i + rnd(), bz = j + rnd(); prop('kit3', rnd() < .55 ? 'brick0' : 'brick1', bx, 0, bz, rnd()*6.283, rr(.9, 1.15), rnd() < .5 ? 0xffd2b8 : 0xffffff, { rx:rnd() < .3 ? PH : 0, rz:rr(-.15, .15) }); continue; }
    B(i+rnd(), rr(.05,.15), j+rnd(), rr(.15,.55), rr(.1,.3), rr(.15,.5), pick([0xb4aa98,0x9d9484,0x8a8070]), { ry:rnd()*3, rx:rr(-.3,.3), m:M.CONC });
  }
}
// a shop's wares set out by its door, against the wall, either side of it
function shopFront(cx, z, face){
  const h = mkH(cx, z, 64), L_ = [[-.85, 'vb3a'], [-.55, 'msack1'], [.6, 'vb3b'], [.9, 'mpot4'], [.75, 'vb2'], [-.75, 'mstack']];
  const a = L_[Math.floor(h*3)], b = L_[3 + Math.floor(h*7 % 1*3)];
  for (const [lx, q] of [a, b]) mkP(q, cx, z, face, lx, .28, 0, (h*13 % 1 - .5)*.2, q === 'mstack' ? .75 : .85);
}
function shack(x,y,w,d){
  for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (!inB(i,j) || grid[idx(i,j)] !== 0) return false;
  markB(x,y,w,d); const b = nBld++; MAT = M.TIN;
  const c = pick([0x8a5a3c,0x5a7a8a,0x9a8a6a,0x7a6a52,0x6a8a6a,0xa86a3a]);
  const h = rr(1.0,1.3); setTop(x,y,w,d,h+.1);
  B(x+w/2, h/2, y+d/2, w-.05, h, d-.05, c, { b });
  for (let t=0.2; t<w; t+=0.35) B(x+t, h/2, y+d+0.005, 0.03, h, 0.03, shade(c,.75), { b });
  B(x+w/2, h+0.1, y+d/2, w+.3, .06, d+.4, pick([0x8a5a3c,0x7a7a72,0x9a6a40]), { b, rx:.12 });
  B(x+w/2, .5, y+d+.03, .6, .9, .05, 0x3a3028, { b, m:M.WOOD });
  return true;
}
function constructionSite(x,y,w,d,floors){
  markB(x,y,w,d); const b = nBld++; const cc = 0xb9b3a6; MAT = M.CONC; setTop(x,y,w,d,FH*1.1+.08);
  for (let f=0; f<floors; f++){
    const yy = f*FH*1.1;
    for (let i=0; i<=w; i+=2) for (let j=0; j<=d; j+=2){ if (f===floors-1 && rnd()<.4) continue; B(x+Math.min(i,w-.15)+.075, yy+FH*.55, y+Math.min(j,d-.15)+.075, .22, FH*1.1, .22, cc, { b }); }
    if (f < floors-1 || rnd()<.5) B(x+w/2, yy+FH*1.1, y+d/2, w, .16, d, shade(cc,.95), { b });
  }
  for (let k=0;k<14;k++) B(x+rr(.2,w-.2), floors*FH*1.1+.4, y+rr(.2,d-.2), .03, rr(.5,1.1), .03, 0x5a3a2a, { b, roof:1, rz:rr(-.2,.2), m:M.METAL });
  for (let i=0;i<w;i+=1) B(x+i+.5, .45, y+d-.15, .95, .9, .25, 0xa0644a, { b, m:M.BRICK });
}
// the tower crane: the uploaded model, its jib swung to its own angle; the cell under the mast is solid, and a few plain boxes
// along the mast stop bullets (they are not drawn)
function crane(i,j){
  markB(i,j,1,1); const b = nBld++, x = i+.5, z = j+.5;
  const L_ = CUR || chunkFor(x, z); L_.CR.push({ x, z, ry:-.35 });
  for (let y=1; y<21; y+=4) B(x, y + 2, z, 1.1, 4, 1.1, 0xd8a428, { b, m:M.METAL, hid:1 });
}
function buildCranes(ch){
  if (!ch.CR.length) return;
  withModel('crane', M_ => { if (!ch.group) return; for (const e of ch.CR){ const q = lodMesh(M_.geos.body, M_.mat); q.position.set(e.x, 0, e.z); q.rotation.y = e.ry; q.castShadow = true; q.receiveShadow = true; ch.group.add(q); CRANEM.push(q); } });
}
const CRANEM = [];

/* ---------- props from the uploaded models (rocks, crates and cardboard, barrels, sandbags, tyres, roof tanks and dishes): instanced per
   chunk and per model part, tinted per instance. Bullets meet invisible boxes laid where the old ones were; the random sequence that
   builds the city is drawn exactly as before, so nothing else moves. ---------- */
const PROP_N = ['rocks', 'crates', 'barrels', 'bags', 'tires', 'junk2', 'lights', 'kit3', 'wood', 'market', 'deco8', 'deco9'];
const PROP_MAT = {};
function propMat(n, M_){ return PROP_MAT[n] || (PROP_MAT[n] = new T.MeshPhongMaterial({ map:M_.mat.map, side:T.DoubleSide, specular:n === 'barrels' || n === 'tank' || n === 'dish' ? 0x161616 : 0x050505, shininess:n === 'barrels' ? 14 : 4 })); }
// a stream of its own for each spot, so choosing a model and its turn moves nothing else
const phs = (x, z, k) => hash2(Math.round(x*97) + k*7919, Math.round(z*89) - k*104729);
function prop(n, part, x, y, z, ry, sc, col, o){
  if (GHOST) return null;
  const L_ = CUR || chunkFor(x, z);
  const r = { n, p:part, x, y, z, ry:ry || 0, rx:o && o.rx || 0, rz:o && o.rz || 0, s:sc || 1, sy:o && o.sy || 1, col:col == null ? 0xffffff : col, roof:o && o.roof ? 1 : 0, mesh:null, k:0, dead:false };
  L_.PR.push(r);
  if (COVREC){ COVREC.push(r); r.chL = L_; r.isProp = 1; }
  if (!CUR && L_.gen) withModel(n, M_ => { if (!L_.group) return; const m = new T.InstancedMesh(M_.geos[part], propMat(n, M_), 1); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; castReg(m, M_.geos[part], r.s); lodReg(m);
    r.mesh = m; r.k = 0; propWrite(r); m.setColorAt(0, tmpCol.setHex(r.col)); m.instanceColor.needsUpdate = true; L_.group.add(m); });
  return r;
}
function propWrite(r, cut){
  if (!r.mesh) return;
  if (cut == null) cut = !!(G && G.roofs);
  const hide = r.dead || r.gone || (cut && (r.roof || r.y >= CUT));
  dummy.position.set(r.x, r.y, r.z); dummy.rotation.set(r.rx, r.ry, r.rz, 'YXZ');
  if (hide) dummy.scale.set(0, 0, 0); else dummy.scale.set(r.s, r.s*r.sy, r.s);
  dummy.updateMatrix(); r.mesh.setMatrixAt(r.k, dummy.matrix); r.mesh.instanceMatrix.needsUpdate = true; dummy.rotation.order = 'XYZ';
}
function buildProps(ch){
  if (!ch.PR.length) return;
  const by = new Map();
  for (const r of ch.PR){ if (r.mesh) continue; const k = r.n + '|' + r.p; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  for (const [k, L_] of by){ const [n, part] = k.split('|');
    withModel(n, M_ => {
      if (!ch.group || !M_.geos[part]) return;
      const m = new T.InstancedMesh(M_.geos[part], propMat(n, M_), L_.length);
      m.castShadow = n !== 'paper'; m.receiveShadow = true; m.frustumCulled = false;
      L_.forEach((r, q) => { r.mesh = m; r.k = q; propWrite(r); m.setColorAt(q, tmpCol.setHex(r.col)); });
      castReg(m, M_.geos[part], L_.reduce((a, r) => a + r.s, 0)/L_.length); lodReg(m);
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      ch.group.add(m);
    });
  }
}
// tints: the textures carry the wear; these only shift the hue a little
const TANK_TINT = { 0x6c6f6a:0x7c7a70, 0x9a4a2e:0x96704e, 0x3d5f7a:0x6a88a0, 0x8a8a80:0xd0bc94, 0x2c2c2a:0x5c5a54 };
const SAND_T = [0xffffff, 0xf4ecdc, 0xe8dcc4, 0xfff6e6];
function roofTank(tx, y, tz, tc, b){
  const col = TANK_TINT[tc] != null ? TANK_TINT[tc] : 0xb8a888;
  prop('tank', 'tank', tx, y, tz, phs(tx, tz, 1)*6.283, 1.02*(.95 + phs(tx, tz, 2)*.1), col, { roof:1 });
}
function roofBox(bx, top, bz, sx, sy, sz, bc, bry, b){
  B(bx, top + .15, bz, sx, sy, sz, bc, { b, roof:1, ry:bry, m:M.WOOD, hid:1 });
  const h = phs(bx, bz, 3);
  if (bc === 0x8b6a42) prop('crates', h < .55 ? 'wood' : 'huacal', bx, top, bz, bry, h < .55 ? Math.min(sx, sz)/.58*1.1 : 1.1, 0xffffff, { roof:1 });
  else if (bc === 0x6b6f70 && h < .5) prop('crates', 'ammo', bx, top, bz, bry, 1.2, 0xffffff, { roof:1 });
  else { const cb = ['cb0', 'cb1', 'cb2', 'cb4', 'cb6', 'cb7', 'cb8'][Math.floor(h*7)]; prop('crates', cb, bx, top, bz, bry, cb === 'cb8' ? .45 : .8 + h*.3, SAND_T[Math.floor(h*13) % 4], { roof:1 }); }
}
// loose things laid by hand: cardboard (closed, open, flattened), fruit crates, a lone tyre, a barrel on its side, the odd ammunition box.
// Only against walls and in yards, never in the middle of a street, and from a stream of their own
function scatterProps(ch){
  if (!(ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0)) return;
  let vs = (Math.imul(ch.i, 1103515245) ^ Math.imul(ch.j, 12345) ^ 0x51ed27) >>> 0;
  const R = () => { vs = (Math.imul(vs, 1664525) + 1013904223) >>> 0; return vs/4294967296; };
  const BX = ['cb0', 'cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6', 'cb7', 'cb8'];
  for (let n=0;n<40;n++){
    const i = ch.x0 + Math.floor(R()*CS), j = ch.z0 + Math.floor(R()*CS), r1 = R(), r2 = R(), r3 = R(), r4 = R();
    if (!inB(i, j)) continue; const k = idx(i, j);
    if (grid[k] !== 0 || reserved[k] || ground[k] === 11 || (MIS && MIS.laneFree && MIS.laneFree(i, j))) continue;
    let wx = 0, wz = 0;
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) if (inB(i + di, j + dj) && grid[idx(i + di, j + dj)] === 1){ wx = di; wz = dj; }
    if (!wx && !wz && (STR[k] || r4 > .25)) continue;
    if (r1 > .3 + .5*cityDs(i + .5, j + .5)) continue;
    const x = i + .5 + (wx ? wx*.28 : (r2 - .5)*.6), z = j + .5 + (wz ? wz*.28 : (r3 - .5)*.6), ry = wx ? (r2 < .5 ? 0 : Math.PI) + (r3 - .5)*.5 : wz ? Math.PI/2 + (r2 < .5 ? 0 : Math.PI) + (r3 - .5)*.5 : r2*6.283;
    const q = R();
    if (q > .86 && q < .96){ prop('junk2', 'pallet', x, 0, z, ry + (R() - .5)*.4, .95 + R()*.1, [0xffffff, 0xe8e0d0, 0xd8ccb8][Math.floor(R()*3)]);
      if (R() < .3) prop('junk2', 'pallet', x + (R() - .5)*.06, .095, z + (R() - .5)*.06, ry + (R() - .5)*.3, .95, 0xf0e8d8); continue; }
    if (q < .44){ const cb = BX[Math.floor(R()*BX.length)]; prop('crates', cb, x, 0, z, ry, cb === 'cb8' ? .5 + R()*.2 : .7 + R()*.35, SAND_T[Math.floor(R()*4)]);
      if (cb !== 'cb8' && cb !== 'cb5' && R() < .3) prop('crates', BX[Math.floor(R()*5)], x + (R() - .5)*.1, cb === 'cb3' ? .54 : cb === 'cb0' ? .39 : .19, z, ry + (R() - .5)*.6, .6, SAND_T[Math.floor(R()*4)]); }
    else if (q < .56) prop('crates', 'huacal', x, 0, z, ry, 1.1 + R()*.2, 0xffffff);
    else if (q < .68) prop('tires', 'one', x, 0, z, R()*6.283, .85 + R()*.15, 0xffffff);
    else if (q < .78) prop('barrels', 'lying', x, 0, z, ry + Math.PI/2*(R() < .5 ? 1 : 0), .9, [0xffffff, 0xd8c8b0, 0xb8c0c8][Math.floor(R()*3)]);
    else if (q < .86) prop('crates', 'wood', x, 0, z, ry, .9 + R()*.25, 0xffffff);
    else prop('crates', 'ammo', x, 0, z, ry, 1.25, 0xffffff);
  }
  // specks: chips of concrete, brick, glass, cloth and plastic a few pixels across, over every open cell
  const DEB = [0xb4aa98, 0x9d9484, 0xa0644a, 0x8a8070, 0x6b5a45, 0x3a3a36, 0xd8d0bc, 0x4d6a5a, 0x7a7466, 0xc8c0ae, 0x2c2a26, 0x8a5a3c];
  for (let n=0;n<170;n++){
    const x = ch.x0 + R()*CS, z = ch.z0 + R()*CS, i = Math.floor(x), j = Math.floor(z), a = R(), b = R(), c = R(), d = R();
    if (!inB(i, j)) continue; const k = idx(i, j); if (grid[k] === 1 || grid[k] === 3 || ground[k] === 11) continue;
    if (d > .35 + .6*cityDs(x, z)) continue;
    MAT = M.CONC; B(x, .015, z, .04 + a*.1, .02 + b*.03, .04 + c*.09, DEB[Math.floor(d*977) % DEB.length], { ry:a*6.283 });
  }
}
function tower(i,j){
  markB(i,j,2,2); MAT = M.METAL; const b = nBld++, G = 0x8f8e86, x = i+1, z = j+1, h = 16;
  for (const [a,c] of [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]]) B(x+a*.75, h/2, z+c*.75, .1, h, .1, G, { b, rz:-a*.03, rx:c*.03 });
  for (let y=1; y<h; y+=1.4){ const s = 1.1 - y/h*.4; B(x, y, z-s*.55, s*1.1, .05, .05, G, { b }); B(x, y, z+s*.55, s*1.1, .05, .05, G, { b });
    B(x-s*.55, y, z, .05, .05, s*1.1, G, { b }); B(x+s*.55, y, z, .05, .05, s*1.1, G, { b });
    B(x, y+.7, z-s*.55, .04, 1.5, .04, G, { b, rz:.75 }); B(x+s*.55, y+.7, z, .04, 1.5, .04, G, { b, rx:.75 }); }
  B(x, h+.05, z, 1.0, .08, 1.0, G, { b });
  for (let k=0;k<4;k++){ const a = k*Math.PI/2+.4; C(x+Math.cos(a)*.45, h-1.5-k*.8, z+Math.sin(a)*.45, .35, .12, 0xdedad0, { b, rz:Math.PI/2, ry:a, ord:'YXZ' }); }
  for (let k=0;k<3;k++) B(x+(k-1)*.3, h-3+k*.6, z+.5, .18, .9, .1, 0xcfcac0, { b });
  B(x, h+1.2, z, .05, 2.2, .05, G, { b }); B(x, h+2.35, z, .12, .12, .12, 0x6a6a64, { b });
}

/* ---------- cover objects ---------- */
const COVER_HP = { wall:40, crates:18, stall:18 };   // rifle hits a low wall, a stack of crates or a market stall takes before it comes down
const COVER_VAL = { sandbag:.72, barrier:.75, wall:.6, car:.5, van:.55, pickup:.5, bus:.6, barrel:.35, rubble:.55, crates:.55, tires:.4, stall:.35, tree:.3, fountain:.7 };
const LEN = { car:3, van:3, pickup:3, bus:3 };
function vpart(cx,cz,rot,lx,ly,lz,sx,sy,sz,c,ex){ const cs = Math.cos(rot), sn = Math.sin(rot); B(cx+lx*cs+lz*sn, ly, cz-lx*sn+lz*cs, sx,sy,sz,c, Object.assign({ ry:rot }, ex||{})); }
function vwheel(cx,cz,rot,lx,lz,r){ const cs = Math.cos(rot), sn = Math.sin(rot); C(cx+lx*cs+lz*sn, r, cz-lx*sn+lz*cs, r, .16, 0x1d1c1a, { rx:Math.PI/2, ry:rot, ord:'YXZ', m:M.WHEEL }); }
const VEH_KIND = { car:1, van:1, pickup:1, bus:1 };
let NOVEH = null;
function noVehPlan(){
  NOVEH = new Uint8Array(W*H);
  const lines = [[[256.5, 180], [256.5, 500]],                               // Hawlwadig: the columns of missions 1 to 3 and Irene's
    CV_RT, M9_ROUTE,                                                          // the lost convoy and the rescue column
    [[MILE_X + .5, 85], [MILE_X + .5, 410.5], [338, 410.5]],                  // the Mile and the K-4 road: the whole of the asphalt
    ROADS[0].pts,                                                             // the airport road (Struecker's column)
    [[380, 320.5], [318, 320.5]], [[438, 168.5], [425, 168.5]]];              // where the technicals drive
  const HW_ = 4.3;
  for (const L_ of lines) for (let k=1;k<L_.length;k++){ const a = L_[k-1], b = L_[k];
    const i0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - HW_ - 1)), i1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0]) + HW_ + 1));
    const j0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - HW_ - 1)), j1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1]) + HW_ + 1));
    for (let j=j0;j<=j1;j++) for (let i=i0;i<=i1;i++) if (segDist(i + .5, j + .5, a, b) < HW_) NOVEH[idx(i, j)] = 1; }
  const disc = (x, z, r) => { for (let j=Math.floor(z - r);j<=z + r;j++) for (let i=Math.floor(x - r);i<=x + r;i++) if (inB(i, j) && Math.hypot(i + .5 - x, j + .5 - z) < r) NOVEH[idx(i, j)] = 1; };
  disc(330, 410, 21);                                                         // the roundabout
  disc(LM.s64.x, LM.s64.z, 16); disc(274.5, 345, 15);                         // Durant's crash, and where Super 6-2 puts Shughart and Gordon down
  for (let j=330;j<=360;j++) for (let i=258;i<=292;i++) if (inPoly(S62_CLEAR, i + .5, j + .5)) NOVEH[idx(i, j)] = 1;
}
// each car draws from a stream of its own (seeded by where it stands), so the choice of model and paint moves nothing else in the city
function vehRnd(i, j){ let v = (Math.imul(i, 2654435761) ^ Math.imul(j, 40503) ^ 0x2545f491) >>> 0; return () => { v = (Math.imul(v, 1664525) + 1013904223) >>> 0; return v/4294967296; }; }
const VEH_DIM = { car_topaz:[2.9, 1.19, .92], car_kcar:[2.95, 1.14, .84], car_wreck:[2.84, 1.28, 1.0] };   // length, width, height
// only worn colours: dirty and yellowed whites, faded greys and dark browns; nothing bright
const VEH_PAINT = [0xeae5d9, 0xdfd9cb, 0xd2cbbb, 0xe4ded0, 0xc9c2b2, 0xa3a19a, 0x8d8b85, 0x77756f, 0xb6b4ac, 0x5c4434, 0x4c382b, 0x664c3a];
/* ---------- the markets: stalls, tables and goods from the uploaded packs, laid out as a market is: a counter to the aisle, the
   stock behind it and at its feet, crates stacked square to the stall. All placed from a hash of the spot, never from the random
   stream. Each model's front is +z, so 'face' turns it to its aisle ---------- */
let MKT = false, MKT_BIG = false, MKT_WIDE = [];   // (big: the Bakara blocks, where the butchers and the fruit stall set up too)
const mkH = (a, b, k) => { const v = Math.sin(a*127.1 + b*311.7 + k*74.7)*43758.5453; return v - Math.floor(v); };   // a hash that does not run smooth from one cell to the next
function mkP(part, cx, cz, face, lx, lz, y, ry, sc, col, o){ const c = Math.cos(face), s = Math.sin(face);
  return prop('market', part, cx + lx*c + lz*s, y || 0, cz - lx*s + lz*c, face + (ry || 0), sc || 1, col == null ? 0xffffff : col, o); }
const MK_FOOD = ['vb3b', 'vb2', 'vb3a', 'vb1', 'vb3c'], MK_BOX = ['fb0', 'fb1', 'fb2', 'fb3', 'fb4', 'fb5'];
function mkStackFruit(cx, cz, face, lx, lz, h, n){   // empty fruit boxes, stacked crosswise
  const H = [.167, .167, .133, .202, .134, .2]; let y = 0, b = Math.floor(h*37) % 6;
  for (let k=0;k<n;k++){ mkP(MK_BOX[b], cx, cz, face, lx, lz, y, (h*11 % 1 - .5)*.08 + (k % 2 ? .05 : 0), 1, 0xffffff); y += H[b] - .004; }   // the same box, one on another
}
function marketStall(cx, cz, face, h, wide){
  const v = Math.floor(h*(MKT_BIG ? 7 : 5)), hh = h*97 % 1, side = hh < .5 ? -1 : 1, W = wide ? .78 : .45;
  const aw = ['', '_b', '_c'][Math.floor(h*311 % 1*3)];   // the cloth: olive, khaki, sand, bone or stone, all dusty
  if (v === 0){        // the dressed counter: awning, produce, pots and baskets on it; sacks at its foot
    mkP('mstall' + aw, cx, cz, face, 0, -.05, 0, 0, wide ? .86 : .62);
    mkP(hh < .5 ? 'msack1' : 'msack2', cx, cz, face, side*(W - .05), .48, 0, hh*3, .9);
    if (wide) mkP(hh < .3 ? 'mpot4' : 'mbucket', cx, cz, face, -side*(W - .12), .42, 0, hh*5, 1);
  } else if (v === 1){ // the stall with the tomato and potato crates, more crates of greens at its foot
    mkP('stall14' + aw, cx, cz, face, 0, -.08, 0, 0, wide ? .95 : .62);
    mkP(MK_FOOD[Math.floor(hh*5)], cx, cz, face, side*(W - .3), .55, 0, (hh - .5)*.2, .9);
    if (wide) mkStackFruit(cx, cz, face, -side*(W - .12), .5, hh, 2);
  } else if (v === 2){ // the cloth tent over a table: two crates of produce on the table, empty boxes stacked at the side
    mkP('tent' + aw, cx, cz, face, 0, -.12, 0, 0, wide ? .95 : .6);
    mkP('stand', cx, cz, face, 0, -.2, 0, 0, wide ? .95 : .62);
    const ty = wide ? .62 : .41;
    mkP(MK_FOOD[Math.floor(hh*5)], cx, cz, face, wide ? -.32 : -.15, -.2, ty, (hh - .5)*.15, wide ? .85 : .6);
    mkP(MK_FOOD[Math.floor(hh*5 + 2) % 5], cx, cz, face, wide ? .32 : .15, -.2, ty, (.5 - hh)*.15, wide ? .85 : .6);
    if (wide) mkStackFruit(cx, cz, face, side*(W - .1), .3, hh, 3);
  } else if (v === 3){ // a cloth on the ground with crates of food on it, the seller's stool behind
    mkP('rug', cx, cz, face, 0, 0, .002, 0, wide ? .95 : .58, 0xffffff);
    const L_ = wide ? [[-.45, .15, 'vb3b'], [.05, .2, 'vb3a'], [.5, .1, 'vb2'], [-.15, -.35, 'vb1'], [.4, -.35, 'vb3c']] : [[-.2, .1, 'vb3b'], [.2, .12, 'vb2'], [0, -.3, 'vb1']];
    for (const [lx, lz, q] of L_) mkP(q, cx, cz, face, lx, lz, .02, (hh*7 % 1 - .5)*.3, wide ? .9 : .65);
    mkP('stool', cx, cz, face, side*(W - .15), -.5, 0, hh*2, .8);
  } else if (v === 5){ // the butcher: meat on the counter and hanging from the rail, a crate at his side
    mkP(hh < .5 ? 'meat1' : 'meat2', cx, cz, face, 0, -.05, 0, 0, wide ? .88 : .6);
    if (wide) mkP(['rc1', 'rc3'][Math.floor(hh*2)], cx, cz, face, side*(W - .05), .45, 0, hh*3, .8);
  } else if (v === 6){ // the fruit stall: apples, bananas and grapes in trays under a cloth awning
    mkP('fstall', cx, cz, face, 0, -.1, 0, 0, wide ? .85 : .58);
    if (wide) mkStackFruit(cx, cz, face, side*(W - .08), .55, hh, 2);
  } else {             // the leather seller: hides on a rack, a stool, his crates
    mkP('rug', cx, cz, face, 0, .1, .002, 0, wide ? .9 : .55, 0xffffff);
    mkP('hanger', cx, cz, face, 0, -.25, 0, Math.PI/2, wide ? .9 : .6);
    mkP('stool', cx, cz, face, side*(W - .2), .35, 0, hh*2, .8);
    if (wide) for (let k=0;k<2;k++) mkP(['rc1', 'rc2', 'rc3'][Math.floor(hh*3 + k) % 3], cx, cz, face, -side*(W - .25), .25 - k*.45, 0, (hh*13 % 1 - .5)*.3, .8);
  }
}
// the goods that stand about in a market aisle: one heap, chosen by the spot
function marketGoods(x, z, h, tall){
  const f = h*6.283, v = Math.floor(h*7);
  if (tall || v === 0) return mkP('mstack', x, z, f, 0, 0, 0, 0, .95);
  if (v === 1){ const r = mkP('msack1', x, z, f, -.15, 0, 0, 0, .95); mkP('msack2', x, z, f, .2, .1, 0, 1.3, .95); return r; }
  if (v === 2){ const r = mkP('mpot4', x, z, f, -.12, .05, 0, 0, 1); mkP('mpot3', x, z, f, .18, -.08, 0, 1, 1); mkP('mbucket', x, z, f, .05, .25, 0, 2, 1); return r; }
  if (v === 3){ const r = mkP('rc1', x, z, f, 0, 0, 0, 0, .95); mkP('rc2', x, z, f, .02, .02, .31, .4, .85); return r; }
  if (v === 4){ const r = mkP('vb3b', x, z, f, -.18, 0, 0, 0, .85); mkP('vb3a', x, z, f, .22, .05, 0, .1, .8); return r; }
  if (v === 5){ const r = mkP('fb3', x, z, f, 0, 0, 0, 0, 1.15); mkStackFruit(x, z, f, .3, 0, h, 3); return r; }
  const r = mkP('rc3', x, z, f, 0, 0, 0, 0, .95); mkP('vb1', x, z, f, 0, 0, .32, .3, .8); return r;
}
// the stadium pitch keeps only its camp: anything the city would lay there is drawn for the random sequence only, and its cells are freed after
const stadIn = (x, z) => ((x - STADIUM.x)/(STADIUM.rx*.8))**2 + ((z - STADIUM.z)/(STADIUM.rz*.8))**2 < 1;
let STAD_GH = [];
function addCover(kind, i, j, dir, opt){
  if (kind === 'sandbag' || kind === 'fountain' || !stadIn(i + .5, j + .5)) return addCover0(kind, i, j, dir, opt);
  const g0 = GHOST; GHOST = true; let o = null; try { o = addCover0(kind, i, j, dir, opt); } finally { GHOST = g0; }
  if (o) STAD_GH.push(...o.cells); return o;
}
function addCover0(kind, i, j, dir, opt){
  opt = opt || {};
  if (!walk(i,j)) return null;
  const n = LEN[kind] || 1, cells = [];
  for (let k=0;k<n;k++){ const ci = dir==='x' ? i+k : i, cj = dir==='x' ? j : j+k; if (!walk(ci,cj)) return null; if (MIS && MIS.laneFree && MIS.laneFree(ci, cj)) return null; if (VEH_KIND[kind] && NOVEH && NOVEH[idx(ci, cj)]) return null; cells.push(idx(ci,cj)); }
  const o = { kind, val:COVER_VAL[kind], cells, i, j, dir, fuel:!!opt.fuel, g:null };
  COVREC = COVER_HP[kind] ? [] : null;
  const x = i+.5, z = j+.5;
  const rot = dir==='z' ? Math.PI/2 : 0;
  const cx = dir==='x' ? i + n/2 : x, cz = dir==='z' ? j + n/2 : z;
  const burnt = !!opt.burnt;
  MAT = M.GEN;
  // bumpers, lamps, plate and mirrors; vehicles face -x in local space
  const vdet = (hl, hw, ly, mirY, c) => {
    const bm = burnt ? M.BURNT : M.METAL, bc = burnt ? 0x1e1c1a : 0x2c2c2a;
    vpart(cx,cz,rot,-hl-.03,ly-.13,0,.07,.1,hw*2+.06,bc,{ m:bm }); vpart(cx,cz,rot,hl+.03,ly-.13,0,.07,.1,hw*2+.06,bc,{ m:bm });
    if (!burnt){
      for (const s of [-1,1]){
        vpart(cx,cz,rot,-hl-.01,ly,s*(hw-.13),.04,.08,.15,0xf4eed4,{ m:M.GLASS });
        vpart(cx,cz,rot,hl+.01,ly,s*(hw-.12),.04,.07,.12,0xb02a1c,{ m:M.GLASS });
        if (mirY) vpart(cx,cz,rot,-hl*.42,mirY,s*(hw+.06),.05,.06,.1,c,{ m:M.METAL });
      }
      vpart(cx,cz,rot,hl+.02,ly-.05,0,.02,.07,.24,0xe6e0c4,{ m:M.METAL });
      vpart(cx,cz,rot,-hl-.02,ly-.05,0,.02,.07,.24,0xe6e0c4,{ m:M.METAL });
    }
  };
  if (kind === 'sandbag'){
    MAT = M.BAG;
    const HB = { hid:1 }, cs_ = Math.cos(rot), sn_ = Math.sin(rot);
    const bag = (lx, ly, lz, c, k) => { const h = phs(x + lx, z + lz, k); prop('bags', 'bag', x + lx*cs_ + lz*sn_, ly, z - lx*sn_ + lz*cs_, rot + Math.PI/2 + (h - .5)*.22, 1.02 + h*.06, c, { sy:1.65, rz:(h - .5)*.08 }); };
    for (let k=0;k<3;k++){ const c = jit(0xb4a173,.08); vpart(x,z,rot,-0.34+k*0.34,0.1,0,0.32,0.2,0.46,c,HB); bag(-0.34+k*0.34, 0, 0, c, k); }
    for (let k=0;k<3;k++){ const c = jit(0xa8956a,.08); vpart(x,z,rot,-0.34+k*0.34,0.3,0.02,0.32,0.2,0.44,c,HB); bag(-0.34+k*0.34 + .02, .19, .02, c, k + 3); }
    { const c = jit(0xb4a173,.08); vpart(x,z,rot,-0.17,0.49,0,0.32,0.18,0.4,c,HB); bag(-0.17, .38, 0, c, 6); }
    { const c = jit(0xb4a173,.08); vpart(x,z,rot,0.17,0.49,0,0.32,0.18,0.4,c,HB); bag(0.17, .38, 0, c, 7); }
    if (phs(x, z, 9) < .18 && !GHOST) prop('crates', 'ammo', x + (dir === 'z' ? .42 : 0)*(phs(x, z, 10) < .5 ? 1 : -1), 0, z + (dir === 'x' ? .42 : 0)*(phs(x, z, 10) < .5 ? 1 : -1), rot + .3, 1.2, 0xffffff);
  } else if (kind === 'barrier'){
    MAT = M.CONC;
    vpart(x,z,rot,0,.12,0,.96,.24,.6,0xbab4a6); vpart(x,z,rot,0,.5,0,.96,.55,.3,0xc4beb0); vpart(x,z,rot,0,.8,0,.96,.06,.2,0xb0aa9c);
    if (rnd()<.4) vpart(x,z,rot,0,.5,.16,.5,.25,.01,pick([0x9a3a2e,0xe8e2d0]));
  } else if (kind === 'wall'){
    MAT = M.PLASTER;
    const c = jit(pick(WALLS), .06); vpart(x,z,rot,0,.42,0,1.0,.84,.3,c); vpart(x,z,rot,0,.87,0,1.02,.07,.36,shade(c,.85));
  } else if (kind === 'barrel'){
    const col = o.fuel ? 0xa33a26 : pick([0x3d5a80,0x5e6b3a,0x4b5a63]), h = phs(x, z, 4);
    const tint = { 0xa33a26:0xd07050, 0x3d5a80:0x8aa0c0, 0x5e6b3a:0xa8b080, 0x4b5a63:0xa8b0b4 }[col];
    if (MKT && !o.fuel){ o.pr = marketGoods(x, z, mkH(x, z, 66), false); o.hb = { x, y:.3, z, sx:.6, sy:.6, sz:.6, r:.5, rx:0, ry:0, rz:0, m:M.WOOD, c:0x8b6a42, b:-1, st:0 }; }
    else {
    o.pr = prop('barrels', !o.fuel && h < .4 ? 'rust' : 'drum', x, 0, z, h*6.283, .98 + h*.04, !o.fuel && h < .4 ? 0xffffff : tint);
    o.hb = { x, y:.36, z, sx:.52, sy:.72, sz:.52, r:.5, rx:0, ry:0, rz:0, m:M.METAL, c:col, b:-1, st:0 }; }
  } else if (VEH_KIND[kind]){
    if (!burnt) rnd(); if (kind === 'van') rnd();                         // the draws the old box vehicles made, so the rest of the city stays where it was
    const vr = vehRnd(i, j), t = burnt ? 'car_wreck' : vr() < .62 ? 'car_topaz' : 'car_kcar', D_ = VEH_DIM[t];
    const ry = rot + (vr() < .5 ? Math.PI : 0) + (vr() - .5)*.14;
    let col = 0xffffff;
    if (!burnt){ col = VEH_PAINT[Math.floor(vr()*VEH_PAINT.length)]; if (t === 'car_kcar') col = shade(col, .82); }   // a stripped car has lost its shine
    const rec = { t, x:cx, z:cz, ry, col, o, mesh:null, k:0, dead:false };
    if (!GHOST) (CUR || chunkFor(cx, cz)).VH.push(rec);
    o.vr = rec;
    const q = new T.Quaternion().setFromAxisAngle(_vY, ry);
    o.hb = { x:cx, y:D_[2]*.47, z:cz, sx:D_[0]*.94, sy:D_[2]*.9, sz:D_[1]*.9, r:.5*Math.hypot(D_[0], D_[1], D_[2]), rx:0, ry, rz:0, q, qi:q.clone().invert(),
      m:burnt ? M.BURNT : M.METAL, c:burnt ? 0x2e2a26 : col, b:-1, st:0 };
  } else if (kind === 'rubble'){
    MAT = M.CONC; const BR = MKT ? () => {} : B;   // in a market the heap is its goods instead (the draws are made all the same)
    for (let k=0;k<12;k++) BR(x+rr(-.45,.45), rr(.08,.45)*(1-k/16), z+rr(-.45,.45), rr(.18,.5), rr(.12,.35), rr(.18,.5), pick([0xb4aa98,0x9d9484,0xa0644a,0x8a8070,0xc8c0ae]), { ry:rnd()*3, rx:rr(-.4,.4), rz:rr(-.4,.4) });
    for (let k=0;k<2;k++) BR(x+rr(-.3,.3), .5, z+rr(-.3,.3), .03, rr(.5,.9), .03, 0x4a3a30, { rz:rr(-.6,.6), m:M.METAL });
    if (MKT) marketGoods(x, z, mkH(x, z, 65), false);
  } else if (kind === 'crates'){
    MAT = M.WOOD;
    const nn = 1 + ri(3);
    for (let k=0;k<nn;k++){ const s = rr(.55,.8), cx_ = x+rr(-.12,.12), cy_ = s/2 + k*.62, cz_ = z+rr(-.12,.12), c = jit(0x8b6a42,.12), ry = rnd()*.4, hs = Math.min(s,.62);
      B(cx_, cy_, cz_, s, hs, s, c, { ry, hid:1 });
      const h = phs(cx_, cz_, 5 + k), y0 = k*.62;
      if (MKT) continue;
      if (h < .58) prop('crates', 'wood', cx_, y0, cz_, ry, hs/.58, 0xffffff);
      else if (h < .82) prop('crates', 'cb0', cx_, y0, cz_, ry, hs/.468*1.0, SAND_T[k % 4], { sy:1 });
      else prop('crates', 'huacal', cx_, y0, cz_, ry + Math.PI/2, s/.5, 0xffffff, { sy:hs/(.278*s/.5) }); }
    if (MKT) marketGoods(x, z, mkH(x, z, 62), nn > 1);
  } else if (kind === 'tires'){
    MAT = M.TIRE;
    const pile = phs(x, z, 6) < .35;   // the loop's bound is drawn again each turn, as it always was
    for (let k=0;k<3+ri(2);k++){ const tx = x+rr(-.05,.05), ty = .09+k*.17, tz = z+rr(-.05,.05); C(tx, ty, tz, .34, .16, 0x1f1e1c, { hid:1 });
      if (!pile && !MKT) prop('tires', 'one', tx, ty - .09, tz, phs(tx, tz, k)*6.283, 1.0, 0xffffff, { sy:.8, rx:(phs(tz, tx, k) - .5)*.08 }); }
    if (pile && !MKT) prop('tires', 'pile', x, 0, z, phs(x, z, 7)*6.283 + rot, .92, 0xffffff);
    if (MKT) marketGoods(x, z, mkH(x, z, 63), false);
  } else if (kind === 'stall'){
    for (let k=0;k<19;k++) rnd();   // (the draws the old box stall made: the rest of the city stays where it was)
    MAT = M.WOOD;
    // two cells wide where there is room: the stalls of a row stand shoulder to shoulder, each facing its aisle
    const wide = walk(i+1, j) && !cov[idx(i+1, j)]; if (wide) MKT_WIDE.push([o, idx(i+1, j)]);   // its second cell is only taken once the city is laid out, so nothing else moves
    marketStall(wide ? i + 1 : x, z, Math.floor(j/3) % 2 ? 0 : Math.PI, mkH(i, j, 61), wide);
  } else if (kind === 'tree'){
    MAT = M.WOOD; C(x, .75, z, .12, 1.5, 0x5d4630, { hid:1 });
    LEAF_OFF = true; leafCanopy(x+.1, 1.7, z, 1.15, .42, 1.0, 0x6b7a3a, 64); leafCanopy(x-.15, 1.98, z+.1, .75, .3, .7, 0x7c8a44, 30); LEAF_OFF = false;
    treeAt(x, z, 2.5, true);
  } else if (kind === 'fountain'){   // the uploaded fountain (a scan of the one at San Francisco): lobed basins on two steps, a cup on a baluster
    MAT = M.STONE; let fx = cx, fz = cz;
    const ex = [[i+1, j], [i, j+1], [i+1, j+1]]; if (ex.every(c => walk(c[0], c[1]) && !cov[idx(c[0], c[1])])){ for (const c of ex) o.cells.push(idx(c[0], c[1])); fx = i + 1; fz = j + 1; }
    C(fx, .32, fz, .9, .64, 0xb8b0a0, { hid:1 });
    prop('deco8', 'fount', fx, 0, fz, phs(i, j, 71)*6.283, .95, 0xffffff);
  }
  for (const k of o.cells){ grid[k] = 2; cov[k] = o; topH[k] = Math.max(topH[k], COVER_H[kind] || 0); }
  if (COVREC){ o.es = COVREC; for (const e of COVREC) e.cv = o; COVREC = null; }
  return o;
}
function fountain(i,j){ // 2x2
  const cells = [[i,j],[i+1,j],[i,j+1],[i+1,j+1]];
  if (!cells.every(c => walk(c[0],c[1]))) return;
  const o = { kind:'fountain', val:.7, cells:cells.map(c=>idx(c[0],c[1])), i, j, g:null };
  const cx = i+1, cz = j+1; MAT = M.STONE;
  C(cx, .3, cz, 1.0, .6, 0xc8c0ae); C(cx, .65, cz, .5, .2, 0xb8b0a0); C(cx, 1.7, cz, .2, 2.0, 0xd8d0be); B(cx, 2.8, cz, .55, .35, .55, 0xb8b0a0);
  for (const k of o.cells){ grid[k] = 2; cov[k] = o; topH[k] = .6; }
}
function destroyCover(o){
  if (o.g) world.remove(o.g);
  if (o.pr){ o.pr.dead = true; propWrite(o.pr); }
  if (o.es) for (const e of o.es) if (e.isProp && !o.dead){ e.gone = true; propWrite(e); }
  if (o.es && o.es.length && !o.dead){ o.dead = true; const chs = new Set(); for (const e of o.es){ e.gone = true; if (e.chL) chs.add(e.chL); }
    for (const ch of chs) if (ch.gen) cutChunk(ch, !!(G && G.roofs)); if (typeof clearMarksOf === 'function') clearMarksOf(new Set(o.es)); }
  if (o.vr){ o.vr.dead = true; vehWrite(o.vr); }
  if (o.em) o.em.until = Math.max(.001, G ? G.t : .001); if (o.ls) o.ls.off = true;
  for (const k of o.cells){ if (cov[k] === o){ grid[k] = 0; cov[k] = null; topH[k] = 0; } }
}
const POLE_WY = 4.34;   // the wires hang from the crossarms
function pole(x, z, ry){
  MAT = M.WOOD; B(x, 2.2, z, .16, 4.4, .16, 0x6a5236, { hid:1 });
  const h = phs(x, z, 21), k = h < .42 ? 'tpole0' : h < .84 ? 'tpole1' : 'epole';
  prop('kit3', k, x, 0, z, (ry || 0) + (h*7 % 1 < .5 ? 0 : Math.PI), k === 'epole' ? .92 : 1, [0xffffff, 0xf2eadc, 0xe6ddd0][Math.floor(h*31) % 3], { rz:(phs(z, x, 22) - .5)*.05 });
  poles.push([x, POLE_WY, z]);
}
function poleLine(list){
  for (let k=0;k<list.length;k++){ const a = list[Math.max(0, k - 1)], b = list[Math.min(list.length - 1, k + 1)]; pole(list[k][0], list[k][1], Math.atan2(b[0] - a[0], b[1] - a[1])); }
  wires.push(list.map(p => [p[0], POLE_WY, p[1]])); }
let wires;

function courtyard(x,y,w,d){
  const gh = stadIn(x + w/2, y + d/2), g0 = GHOST; if (gh) GHOST = true;
  try { courtyard0(x, y, w, d, gh); } finally { GHOST = g0; }
}
function courtyard0(x,y,w,d,gh){
  if (!gh) for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (inB(i,j) && grid[idx(i,j)]===0) ground[idx(i,j)] = 2;
  for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++){
    const edge = (i===x || i===x+w-1 || j===y || j===y+d-1);
    if (!edge || openArea(i,j)) continue;
    if (rnd() < .55) addCover('wall', i, j, (j===y || j===y+d-1) ? 'x' : 'z');
  }
  if (w>=3 && d>=3){
    const r = rnd();
    if (r < .35) addCover('tree', x+Math.floor(w/2), y+Math.floor(d/2));
    else if (r < .6) palm(x+w/2, y+d/2);
    if (rnd() < .5) addCover(pick(['crates','tires','rubble']), x+1+ri(Math.max(1,w-2)), y+1+ri(Math.max(1,d-2)));
  }
  for (let k=0;k<w*d/3;k++) B(x+rr(.3,w-.3), .06, y+rr(.3,d-.3), rr(.1,.25), rr(.06,.18), rr(.1,.25), pick([0x8a8a4a,0x9a9a5a,0x7a7a42]), { m:M.LEAF });
}
function ruinLot(x,y,w,d){
  if (!stadIn(x + w/2, y + d/2)) for (let j=y;j<y+d;j++) for (let i=x;i<x+w;i++) if (inB(i,j) && grid[idx(i,j)]===0) ground[idx(i,j)] = 2;
  const n = Math.max(2, Math.floor(w*d/5));
  for (let k=0;k<n;k++) addCover('rubble', x+ri(w), y+ri(d));
  for (let k=0;k<2;k++){ const i = x+ri(w), j = y+ri(d); if (walk(i,j)) addCover('wall', i, j, rnd()<.5?'x':'z'); }
}
function fillBlock(x0,y0,x1,y1){
  let x = x0;
  while (x <= x1){
    let w = 4 + ri(4); if (x + w - 1 > x1) w = x1 - x + 1; if (x1 - (x+w-1) < 3 && x1 - (x+w-1) > 0) w = x1 - x + 1;
    let y = y0;
    while (y <= y1){
      let d = 4 + ri(4); if (y + d - 1 > y1) d = y1 - y + 1; if (y1 - (y+d-1) < 3 && y1 - (y+d-1) > 0) d = y1 - y + 1;
      const r = rnd();
      if (w>=2 && d>=2 && r < .72){
        const fl = 1 + ri(4) + (rnd()<.12?1:0);
        if (!building(x, y, w, d, fl, { damaged: rnd() < .22 })) {}
      } else if (r < .88) courtyard(x, y, w, d);
      else ruinLot(x, y, w, d);
      y += d; if (rnd() < .3 && y < y1-3) y += 2;
    }
    x += w; if (rnd() < .3 && x < x1-3) x += 2;
  }
}

/* ---------- ground: one continuous painted texture ---------- */
function hash2(i,j){ let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x,y){
  const i = Math.floor(x), j = Math.floor(y), fx = x-i, fy = y-j, u = fx*fx*(3-2*fx), v = fy*fy*(3-2*fy);
  const a = hash2(i,j), b = hash2(i+1,j), c = hash2(i,j+1), d = hash2(i+1,j+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
const fbm = (x,y) => vnoise(x,y)*.5 + vnoise(x*2.03+7.1,y*2.03+3.3)*.3 + vnoise(x*4.1+1.7,y*4.1+9.2)*.2;
