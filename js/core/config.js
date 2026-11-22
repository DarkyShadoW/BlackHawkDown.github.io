"use strict";
const T = THREE;
const W = 768, H = 768, RANGE = 24, FH = 1.25, CUT = 0.85;
const OX = 224, OZ = 224;                   // the mission-1 district inside the city grid
const OBJ = { x:OX+32, z:OZ+32, r:3.6 };
const TIMESCALE = 3;
const PHASES = { day:{ h:15.7, d:'3 OCT 1993' }, dusk:{ h:17.33, d:'3 OCT 1993' }, night:{ h:23.0, d:'3 OCT 1993' }, dawn:{ h:6.33, d:'4 OCT 1993' } };
let phaseSel = 'day';
const $ = id => document.getElementById(id);

/* ---------- RNG ---------- */
let seed = 1993;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ri = n => Math.floor(rnd() * n);
const rr = (a,b) => a + rnd()*(b-a);
const pick = a => a[ri(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const c255 = v => clamp(Math.round(v), 0, 255);
const shade = (c, f) => (c255(((c>>16)&255)*f)<<16) | (c255(((c>>8)&255)*f)<<8) | c255((c&255)*f);
const jit = (c, a) => shade(c, 1 + (ri(5) - 2) * a / 2);

/* ---------- three basics ---------- */
const canvas = $('view');
const renderer = new T.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = Math.min(innerWidth, innerHeight) < 700 ? T.PCFShadowMap : T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // shadows are redrawn only when something has moved (shadowFrame)
/* graphics presets: how many lights the shaders loop over, the shadow map, how soon models drop to their lighter versions,
   which small things throw a shadow, and how often men far off or out of view are animated */
const GFXQ = {
  high:{ pt:8, sp:3, sm:2048, soft:false, shN:2, lod:1,   castR:.12, dsh:true,  far:22 },
  mid: { pt:5, sp:2, sm:2048, soft:false, shN:2, lod:1.3, castR:.22, dsh:false, far:16 },
  low: { pt:3, sp:1, sm:1024, soft:false, shN:3, lod:1.8, castR:.34, dsh:false, far:12 } };
const GFX_PHONE = Math.min(innerWidth, innerHeight) < 700 || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
let GFX = null;
function gfxQ(){ return GFX || GFXQ.high; }
