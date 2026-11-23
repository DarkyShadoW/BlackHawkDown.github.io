"use strict";
/* ---------- sound. Every shot is built from three parts (the crack of the muzzle, the body of the report and a low thump) with
   figures of its own for each weapon, so an M16, a CAR-15, a SAW, an AK, a .50 and a pistol do not sound alike. What is far is
   duller, later and wetter: each sound goes through a low-pass that closes with distance, is panned by where it is on the screen
   and sends a share to an echo made for a street between walls. Impacts are built by material. Rotors, engines, tyres and the
   rotor wash are loops whose level and pitch follow what is near the camera.
   Real recordings: loaded asynchronously from assets/audio/sfx/*.mp3 using metadata in js/data/sfx-meta.js (window.__SNDB),
   falling back to procedural Web Audio synthesis while loading or if unavailable. ---------- */
let SND = null, SMP = {}, sndTried = false, washLvl = 0;
const SND_NAMES = ['m16', 'car15', 'saw', 'dmr', 'ak47', 'm2', 'pistol', 'whiz', 'rpg_launch', 'rpg_blast', 'explosion', 'collapse', 'imp_wall', 'imp_stone', 'imp_sand', 'imp_wood', 'imp_glass', 'imp_metal', 'imp_soft', 'ricochet', 'casing',
  'rotor_bh', 'rotor_lb', 'wash', 'truck', 'tyres'];
const GUNS = {   // crack [high-pass Hz, level, s], body [band Hz, Q, level, s], thump [from Hz, to Hz, level, s], how far it carries, the action's clack
  m16:   { c:[5200, .9, .012], b:[1250, .9, .75, .11], t:[190, 70, .7, .09], r:62 },
  car15: { c:[4600, 1, .014], b:[980, .8, .85, .13], t:[170, 60, .8, .1], r:64 },
  saw:   { c:[4800, .85, .012], b:[1050, .9, .8, .1], t:[175, 65, .75, .09], r:64, mech:.22 },
  dmr:   { c:[4200, 1, .016], b:[820, .8, .9, .16], t:[150, 50, .95, .13], r:70 },
  ak47:  { c:[3600, .85, .016], b:[640, 1.1, .95, .17], t:[125, 45, 1, .14], r:66, mech:.16 },
  m2:    { c:[2800, 1, .02], b:[380, .8, 1.2, .26], t:[90, 32, 1.4, .22], r:86, mech:.28 },
  pistol:{ c:[4000, .7, .01], b:[900, 1.2, .6, .075], t:[210, 90, .5, .06], r:46 } };
function sndInit(){
  const master = AC.createGain(); master.gain.value = .9; const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .18; const gate = AC.createGain(); gate.gain.value = 1; master.connect(gate); gate.connect(comp); comp.connect(AC.destination);
  const sr = AC.sampleRate, L = Math.floor(sr*1.5), ir = AC.createBuffer(2, L, sr);
  for (let c=0;c<2;c++){ const d = ir.getChannelData(c); for (let i=0;i<L;i++){ const t = i/sr; d[i] = (Math.random()*2 - 1)*Math.exp(-t/.3)*(t < .015 ? t/.015 : 1)*.6; }
    for (const [tt, g] of [[.085, .55], [.16, .4], [.3, .25], [.47, .14]]){ const k = Math.floor((tt + c*.011)*sr); for (let i=0;i<420;i++) d[k + i] += (Math.random()*2 - 1)*g*(1 - i/420); } }   // slaps off the walls across the street
  const rev = AC.createConvolver(); rev.buffer = ir; const rg = AC.createGain(); rg.gain.value = .55; rev.connect(rg); rg.connect(master);
  const nb = AC.createBuffer(1, sr*2, sr), ch = nb.getChannelData(0); for (let i=0;i<ch.length;i++) ch[i] = Math.random()*2 - 1;
  SND = { master, gate, rev, noise:nb, last:{}, ambT:6, loops:{}, gOn:1 };
  sndLoops(); loadSamples();
}
const ar = (a, b) => a + Math.random()*(b - a), ai = n => Math.floor(Math.random()*n), ap = a => a[ai(a.length)];
const SB = {};   // decoded clips: buf, sh (decoder lead), r (round starts), t (tail start), s (pieces), loop
let SB_LOOPS = 0;
function loadSamples(){
  if (sndTried || !AC) return; sndTried = true;
  const D = window.__SNDB; if (!D) return;
  for (const k in D){ const e = D[k];
    const done = buf => {
      const ch = buf.getChannelData(0), sr = buf.sampleRate; let mx = 0; for (let i=0;i<ch.length;i++){ const q = Math.abs(ch[i]); if (q > mx) mx = q; }
      const th = mx*(e.loop ? .003 : .02); let i0 = 0; while (i0 < ch.length - 1 && Math.abs(ch[i0]) < th) i0++;
      const z = i0/sr, ref = e.loop ? 0 : e.r ? e.r[0] : .003;
      const sh = e.loop ? Math.min(z, .08) : clamp(z - ref, 0, .08);
      SB[k] = { buf, sh, d:e.d, r:e.r, t:e.t, s:e.s, loop:!!e.loop };
      if (e.loop && ++SB_LOOPS === Object.keys(D).filter(q => D[q].loop).length) sndLoops(); };
    fetch('assets/audio/sfx/' + k + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(ab => {
      try { const pr = AC.decodeAudioData(ab, done, () => {}); if (pr && pr.catch) pr.catch(() => {}); } catch(_){}
    }).catch(() => {}); }
}
// a stretch [a, b) of a clip (seconds from its true start) into dest at time 'at', with fades so nothing clicks
function clipPart(k, dest, at, a, b, vol, rate, fi, fo){
  const c = SB[k]; if (!c) return 0; rate = rate || 1; a = Math.max(0, a) + c.sh; b = Math.min(b + c.sh, c.buf.duration); if (b <= a + .005) return 0;
  const src = AC.createBufferSource(); src.buffer = c.buf; src.playbackRate.value = rate; const g = AC.createGain(), dur = (b - a)/rate;
  fi = Math.min(fi || .003, dur*.3); fo = Math.min(fo == null ? .02 : fo, dur*.6);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + fi); g.gain.setValueAtTime(vol, at + dur - fo); g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(g); g.connect(dest); src.start(at, a, dur + .01); src.stop(at + dur + .02); return dur;
}
// a whole clip, or one of its pieces, at a place in the world
function clipOne(k, g, vol, rate, out){
  const c = SB[k]; if (!c) return false; out = out || sndOut(g);
  if (c.s){ const q = c.s[ai(c.s.length)]; clipPart(k, out, g.at, q[0], q[1], vol*g.vol, rate, .002, Math.min(.12, (q[1] - q[0])*.4)); }
  else clipPart(k, out, g.at, 0, c.d, vol*g.vol, rate, .003, .05);
  return true;
}
/* a burst of n rounds out of a recording of automatic fire: the rounds from a random place in it, and then, where the next round
   would have begun, the recording's own tail (the decay after its last round), cross-faded so the burst ends naturally */
function clipBurst(k, n, g, vol, rate, out){
  const c = SB[k]; if (!c || !c.r) return false; const R = c.r, N = R.length; n = Math.max(1, Math.min(n, N)); rate = rate || 1;
  const i = Math.random() < .3 ? N - n : ai(Math.max(1, Math.floor((N - n)*.75) + 1)); out = out || sndOut(g); const v = vol*g.vol;
  if (i + n >= N){ clipPart(k, out, g.at, R[i] - .004, c.d, v, rate, .002, .06); return true; }
  const bd = clipPart(k, out, g.at, R[i] - .004, R[i + n] - .004, v, rate, .002, .016);
  clipPart(k, out, g.at + bd - .016, c.t - .02, c.d, v, rate, .016, .06);
  return true;
}
const GUN_SB = {   // which recording each weapon uses, its level, pitch, the far version, the brass
  m16:   { b:'m16b', one:'m16', v:.41, cas:'cas_s' },
  car15: { b:'car15b', one:'m16', v:.6, rate:1.05, cas:'cas_s' },
  dmr:   { one:'m16', v:.58, rate:.88, cas:'cas_s' },
  saw:   { b:'saw', v:.4, cas:'cas_s' },
  ak47:  { b:'ak', v:.5, far:['akf', 'akf2'], fv:1.15, cas:'cas_s' },
  pkm:   { b:'pkm', v:.37, far:['akf'], fv:2.6, frate:.92, cas:'cas_b' },
  m2:    { b:'m2', v:.39, cas:'cas_b' },
  pistol:{ seg:'pistol', v:.32 } };
// where a sound is, for the ear: level, side, how dull and how wet; null when out of earshot
function sndGeo(x, z, range){
  const dx = x - camS.tx, dz = z - camS.tz, d = Math.hypot(dx, dz), k = d/range; if (k >= 1) return null;
  return { k, vol:Math.pow(1 - k, 1.5), pan:clamp((dx*Math.cos(camS.yaw) - dz*Math.sin(camS.yaw))/(halfH()*1.7 + 4), -1, 1)*.8, lp:17000*Math.pow(1 - k, 2.4) + 480, wet:.14 + .7*k, at:AC.currentTime + Math.min(.22, d*.0035) };
}
function sndOut(g){
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = g.lp; let node = lp;
  if (AC.createStereoPanner){ const p_ = AC.createStereoPanner(); p_.pan.value = g.pan; lp.connect(p_); node = p_; }
  node.connect(SND.master); const sd = AC.createGain(); sd.gain.value = g.wet; node.connect(sd); sd.connect(SND.rev); return lp;
}
function nz(dest, t0, type, f0, f1, q, vol, dur, att){
  const src = AC.createBufferSource(); src.buffer = SND.noise; const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(Math.max(.0002, vol), t0 + (att || .0015)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(dest); src.start(t0, Math.random()*1.5); src.stop(t0 + dur + .03);
}
function tone(dest, t0, type, f0, f1, vol, dur, att){
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(Math.max(.0002, vol), t0 + (att || .002)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + .03);
}
function smp(name, g, vol){
  const L_ = SMP[name]; if (!L_ || !L_.length) return false;
  const src = AC.createBufferSource(); src.buffer = L_[ri(L_.length)]; src.playbackRate.value = rr(.96, 1.04); const gn = AC.createGain(); gn.gain.value = vol*g.vol;
  src.connect(gn); gn.connect(sndOut(g)); src.start(g.at); return true;
}
const sndGate = (k, gap) => { const now = AC.currentTime; if (now - (SND.last[k] || -9) < gap) return false; SND.last[k] = now; return true; };
function gunSnd(w, x, z, g, n){
  n = n || 1; const P_ = GUNS[w] || GUNS.m16; if (!g){ if (!sndGate(w, n > 1 ? .05 : .028)) return; g = sndGeo(x, z, P_.r); } if (!g) return;
  const B_ = GUN_SB[w];
  if (B_ && SB[B_.b || B_.one || B_.seg]){
    const j = ar(.97, 1.03)*(B_.rate || 1);
    if (B_.far && (g.k || 0) > .45 && SB[B_.far[0]]){                                // far off: the recording made at a distance, brighter than the filter would leave it
      g.lp = Math.max(g.lp, 5200); clipBurst(ap(B_.far.filter(f => SB[f])), n, g, B_.v*B_.fv, j*(B_.frate || 1)); }
    else if (B_.seg){ const out = sndOut(g); for (let q=0;q<n;q++){ const gq = Object.assign({}, g, { at:g.at + q*.12 }); clipOne(B_.seg, gq, B_.v, j, out); } }
    else if (n === 1 && B_.one) clipOne(B_.one, g, B_.v*1.1, j);
    else if (B_.b) clipBurst(B_.b, n, g, B_.v, j);
    else { const out = sndOut(g); for (let q=0;q<n;q++) clipOne(B_.one, Object.assign({}, g, { at:g.at + q*.09 }), B_.v, j*ar(.98, 1.02), out); }
    // the brass ringing on the ground at the shooter's feet, only close by
    if (B_.cas && (g.k || 0) < .2 && x != null && SB[B_.cas] && sndGate('cas' + B_.cas, .35)){
      const gc = sndGeo(x, z, 15); if (gc){ gc.at += .18; gc.wet = .05; clipOne(B_.cas, gc, B_.cas === 'cas_b' ? .5 : .32, ar(.92, 1.08)); } }
    return; }
  if (smp(w, g, .8)) return;
  const out = sndOut(g), t0 = g.at, j = rr(.94, 1.06), v = g.vol*.55*rr(.88, 1.06);
  nz(out, t0, 'highpass', P_.c[0]*j, 0, .7, v*P_.c[1], P_.c[2] + .02);
  nz(out, t0, 'bandpass', P_.b[0]*j, P_.b[0]*j*.55, P_.b[1], v*P_.b[2]*1.6, P_.b[3]);
  tone(out, t0, 'sine', P_.t[0]*j, P_.t[1], v*P_.t[2], P_.t[3]);
  if (P_.mech) nz(out, t0 + .028, 'bandpass', 3300*j, 0, 7, v*P_.mech, .03);
}
function sfx(kind, x, z, s, n){
  if (!AC || !soundOn || !SND) return;
  if (kind === 'boom') return blastSnd(x, z, 1);
  if (kind === 'crash') return crashSnd(x, z);
  if (kind === 'mini' && SB.mini){ const g = sndGeo(x, z, 110); if (g){ SND.miniT = AC.currentTime; SND.miniV = Math.max(SND.miniV && AC.currentTime - SND.miniT0 < .3 ? SND.miniV : 0, g.vol); SND.miniT0 = AC.currentTime; } return; }
  let w = kind === 'pistol' ? 'pistol' : kind === 'm2' ? 'm2' : kind === 'ak' ? 'ak47' : kind === 'saw' ? 'saw' : 'm16';
  if (s && kind !== 'pistol') w = s.tech ? 'm2' : s.team === 'us' ? ({ car:'car15', saw:'saw', dmr:'dmr' }[s.gun] || 'm16') : s.gun === 'saw' ? 'pkm' : 'ak47';
  gunSnd(w, x, z, null, n);
}
// a reload close by: magazine out, magazine in, the bolt
function reloadSnd(u){
  if (!AC || !soundOn || !SND || !SB.reload || !u || u.gun === 'rpg') return; const g = sndGeo(u.x, u.z, 16); if (!g) return; g.wet = .06; g.at += ar(.05, .3);
  clipOne('reload', g, .7, u.team === 'us' ? ar(.98, 1.04) : ar(.9, .96));
}
// a helicopter hit by a rocket, a helicopter going into the ground: heard across the city
function heliSnd(k, x, z){
  if (!AC || !soundOn || !SND || !SB[k]) return false; const g = sndGeo(x, z, 170); if (!g) return true; g.wet = Math.min(1, g.wet + .2); g.lp = Math.max(g.lp, 2400);
  clipOne(k, g, k === 'heli_crash' ? 1.5 : .72, 1); return true;
}
// a round going past the ear: the snap of it and the hiss behind
function whizSnd(x, z){
  if (!AC || !soundOn || !SND || !sndGate('whiz', .11)) return; const g = sndGeo(x, z, 9); if (!g) return; g.wet = .1;
  if (SB.whiz){ clipOne('whiz', g, .23, ar(.9, 1.15)); return; }
  if (smp('whiz', g, .5)) return; const out = sndOut(g), t0 = g.at;
  nz(out, t0, 'highpass', 6000, 0, .7, g.vol*.2, .012); nz(out, t0 + .004, 'bandpass', rr(4600, 6200), rr(1100, 1700), 2.2, g.vol*.2, rr(.1, .16), .01);
}
function impSnd(kind, x, z){
  if (!AC || !soundOn || !SND || !sndGate('i' + kind, kind === 'brass' ? .07 : .035)) return;
  const g = sndGeo(x, z, kind === 'brass' ? 14 : 38); if (!g) return; const v = g.vol*.3, t0 = g.at;
  if (kind === 'brass' && SB.cas_s) return;                                           // the brass is heard with the burst
  const CK = { dirt:[['imp_sand'], .21, 1], soft:[['imp_sand'], .11, .78], metal:[['imp_metal', 'imp_metal2'], .31, 1], glass:[['imp_glass'], .3, 1], ric:[['ric'], .52, 1] }[kind];
  if (CK && SB[CK[0][0]]){ clipOne(ap(CK[0]), g, CK[1], CK[2]*ar(.9, 1.1)); return; }
  const nm = { thud:'imp_wall', stone:'imp_stone', dirt:'imp_sand', wood:'imp_wood', glass:'imp_glass', metal:'imp_metal', soft:'imp_soft', ric:'ricochet', brass:'casing' }[kind];
  if (nm && smp(nm, g, kind === 'brass' ? .25 : .6)) return; const out = sndOut(g), j = rr(.88, 1.14);
  if (kind === 'ric'){ tone(out, t0, 'sine', rr(2400, 3600), rr(500, 900), v*.5, rr(.22, .34)); nz(out, t0, 'bandpass', 3000, 0, 5, v*.5, .03); }
  else if (kind === 'metal'){ nz(out, t0, 'highpass', 2500, 0, .7, v*.8, .02); for (const f of [1750, 2630, 4120, 5400]) tone(out, t0, 'sine', f*j*rr(.97, 1.03), 0, v*.3, rr(.12, .3)); }
  else if (kind === 'glass'){ nz(out, t0, 'highpass', 4200, 0, .7, v*1.1, .09); for (let k=0;k<6;k++) tone(out, t0 + k*rr(.012, .05), 'sine', rr(2800, 7600), 0, v*.22, rr(.08, .28));
    for (let k=0;k<5;k++) nz(out, t0 + .1 + k*rr(.04, .09), 'bandpass', rr(5000, 8000), 0, 9, v*.3, .03); }                                  // and the pieces coming down
  else if (kind === 'wood'){ nz(out, t0, 'bandpass', 620*j, 0, 6, v*2.2, .07); nz(out, t0, 'highpass', 2600, 0, .7, v*.6, .016); tone(out, t0, 'sine', 240*j, 150, v*.6, .05); }
  else if (kind === 'stone'){ nz(out, t0, 'bandpass', 1900*j, 0, 3.5, v*1.6, .045); nz(out, t0, 'lowpass', 600, 0, .7, v*1.2, .07); for (let k=0;k<3;k++) nz(out, t0 + .05 + k*rr(.03, .07), 'bandpass', rr(2200, 3600), 0, 6, v*.3, .025); }
  else if (kind === 'dirt'){ nz(out, t0, 'lowpass', 480*j, 0, .7, v*1.5, .08); nz(out, t0, 'highpass', 3200, 0, .7, v*.22, .13, .01); }
  else if (kind === 'soft'){ nz(out, t0, 'lowpass', 330*j, 0, .7, v*1.4, .06); }
  else if (kind === 'brass'){ const f = rr(5200, 7400); tone(out, t0, 'sine', f, 0, v*.3, .07); tone(out, t0 + rr(.05, .09), 'sine', f*rr(.9, 1.1), 0, v*.2, .06); tone(out, t0, 'sine', f*1.5, 0, v*.1, .04); }
  else { nz(out, t0, 'lowpass', 720*j, 0, .7, v*1.6, .085); nz(out, t0, 'bandpass', 1500*j, 0, 1.5, v*.6, .04); for (let k=0;k<3;k++) nz(out, t0 + .05 + k*rr(.03, .08), 'bandpass', rr(1800, 3200), 0, 5, v*.22, .03); }   // plaster and block: a thud and the grit that falls
}
function blastSnd(x, z, size){
  if (!AC || !soundOn || !SND) return; const g = sndGeo(x, z, 120); if (!g) return; g.wet = Math.min(1, g.wet + .25);
  if (SB.exp1){ const far = (g.k || 0) > .5 && SB.rpg_far; if (far) g.lp = Math.max(g.lp, 3200);
    clipOne(far ? 'rpg_far' : size < 1 ? 'rpg_hit' : ap(['exp1', 'exp2', 'rpg_hit']), g, far ? 1.25 : .9*Math.min(1.2, size + .1), ar(.94, 1.04)); return; }
  if (smp(size < 1 ? 'rpg_blast' : 'explosion', g, 1) || (size < 1 && smp('explosion', g, .85))) return;
  const out = sndOut(g), t0 = g.at, v = g.vol*size;
  nz(out, t0, 'highpass', 1800, 0, .7, v*.9, .05); nz(out, t0, 'bandpass', 420, 120, .7, v*1.5, .5);
  nz(out, t0, 'lowpass', 190, 55, .7, v*2.2, 1.9, .004); tone(out, t0, 'sine', 95, 28, v*1.1, 1.1);
  for (let k=0;k<12;k++) nz(out, t0 + .25 + k*rr(.05, .14), 'bandpass', rr(900, 3200), 0, 4, v*rr(.05, .14), rr(.03, .07));                  // what was thrown up comes down
}
function launchSnd(x, z){
  const g = sndGeo(x, z, 70); if (!g) return; if (SB.rpg_launch){ clipOne('rpg_launch', g, .48, ar(.95, 1.05)); return; } if (smp('rpg_launch', g, .9)) return; const out = sndOut(g), t0 = g.at, v = g.vol*.6;
  nz(out, t0, 'highpass', 2200, 0, .7, v*.8, .03); tone(out, t0, 'sine', 130, 45, v*.9, .16); nz(out, t0, 'bandpass', 700, 0, .8, v*1.2, .18);
  nz(out, t0 + .03, 'bandpass', 1700, 420, 1.3, v*.9, 1.0, .05);                                                                              // the motor burning away down the street
}
function rpgSnd(x, z, big){ if (!AC || !soundOn || !SND) return; if (big) blastSnd(x, z, .85); else launchSnd(x, z); }
function crashSnd(x, z){
  const g = sndGeo(x, z, 60); if (!g) return; if (smp('collapse', g, .9)) return; const out = sndOut(g), t0 = g.at, v = g.vol*.5;
  nz(out, t0, 'lowpass', 300, 80, .7, v*1.8, .7, .01); nz(out, t0, 'bandpass', 900, 0, 1, v*.8, .25);
  for (let k=0;k<14;k++) nz(out, t0 + k*rr(.03, .08), 'bandpass', rr(700, 2800), 0, 4, v*rr(.12, .3), rr(.03, .08));
}
// the loops: Black Hawk and Little Bird rotors, the wash on the ground, a diesel and its tyres
function sndLoops(){
  if (!SND) return; const now = AC.currentTime;
  for (const k in SND.loops){ for (const n of SND.loops[k].src) try { n.stop(); } catch(e){} }
  const mk = (name, lvl, build) => { const old = SND.loops[name], g = old ? old.g : AC.createGain(); if (!old){ g.gain.value = 0; g.connect(SND.master); } const src = [];
    if (SMP[name] && SMP[name][0]){ const b = AC.createBufferSource(); b.buffer = SMP[name][0]; b.loop = true; const pre = AC.createGain(); pre.gain.value = lvl; b.connect(pre); pre.connect(g); b.start(); src.push(b); SND.loops[name] = { g, src, rate:b.playbackRate }; }
    else { const o = build(g, src) || {}; SND.loops[name] = Object.assign({ g, src }, o); } };
  const noise = () => { const b = AC.createBufferSource(); b.buffer = SND.noise; b.loop = true; b.start(0, Math.random()); return b; };
  const rotor = (bp, thump, slapF, whine) => (g, src) => {
    const lfo = AC.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = bp; lfo.start(); src.push(lfo);
    const n1 = noise(), f1 = AC.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = thump; const a1 = AC.createGain(); a1.gain.value = .55; const d1 = AC.createGain(); d1.gain.value = .55; lfo.connect(d1); d1.connect(a1.gain); n1.connect(f1); f1.connect(a1); a1.connect(g);
    const n2 = noise(), f2 = AC.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = slapF; f2.Q.value = .8; const a2 = AC.createGain(); a2.gain.value = .12; const d2 = AC.createGain(); d2.gain.value = .14; lfo.connect(d2); d2.connect(a2.gain); n2.connect(f2); f2.connect(a2); a2.connect(g);
    const n3 = noise(), f3 = AC.createBiquadFilter(); f3.type = 'bandpass'; f3.frequency.value = whine; f3.Q.value = 5; const a3 = AC.createGain(); a3.gain.value = .035; n3.connect(f3); f3.connect(a3); a3.connect(g);
    const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = whine*.74; const a4 = AC.createGain(); a4.gain.value = .006; o.connect(a4); a4.connect(g); o.start(); src.push(n1, n2, n3, o); };
  mk('rotor_bh', 1, rotor(17.2, 170, 760, 3900)); mk('rotor_lb', 1, rotor(39, 330, 1500, 5200));
  mk('wash', 1, (g, src) => { const n = noise(), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .5; const lf = AC.createOscillator(); lf.frequency.value = .7; const d = AC.createGain(); d.gain.value = 320; lf.connect(d); d.connect(f.frequency); lf.start(); n.connect(f); f.connect(g); src.push(n, lf); });
  mk('truck', 1, (g, src) => { const o1 = AC.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 46; const o2 = AC.createOscillator(); o2.type = 'square'; o2.frequency.value = 23;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 1.2; const am = AC.createGain(); am.gain.value = .6; const lf = AC.createOscillator(); lf.type = 'square'; lf.frequency.value = 11.5; const d = AC.createGain(); d.gain.value = .3; lf.connect(d); d.connect(am.gain);
    const g1 = AC.createGain(); g1.gain.value = .5; const g2 = AC.createGain(); g2.gain.value = .35; o1.connect(g1); o2.connect(g2); g1.connect(f); g2.connect(f); f.connect(am); am.connect(g);
    const n = noise(), nf = AC.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 220; const ng = AC.createGain(); ng.gain.value = .5; n.connect(nf); nf.connect(ng); ng.connect(g);
    o1.start(); o2.start(); lf.start(); src.push(o1, o2, lf, n); return { f1:o1.frequency, f2:o2.frequency, f3:lf.frequency, cut:f.frequency }; });
  mk('tyres', 1, (g, src) => { const n = noise(), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = .6; n.connect(f); f.connect(g); src.push(n); return { cut:f.frequency }; });
  // the recordings, once decoded, take over: layers of looping clips, each with its own level and pitch
  const mkS = (name, layers) => { if (!layers.every(l => SB[l[0]])) return; const old = SND.loops[name], g = old ? old.g : AC.createGain(); if (!old){ g.gain.value = 0; g.connect(SND.master); }
    const src = [], rates = [];
    for (const [k, lvl, rt] of layers){ const c = SB[k], b = AC.createBufferSource(); b.buffer = c.buf; b.loop = true; b.loopStart = c.sh; b.loopEnd = Math.min(c.buf.duration, c.sh + c.d);
      b.playbackRate.value = rt; const pre = AC.createGain(); pre.gain.value = lvl; b.connect(pre); pre.connect(g); b.start(0, c.sh + Math.random()*c.d*.9); src.push(b); rates.push([b.playbackRate, rt]); }
    SND.loops[name] = { g, src, rates }; };
  mkS('rotor_bh', [['heli_amb', .75, 1], ['rotor', .6, 1]]);
  mkS('rotor_lb', [['rotor', .7, 1.62], ['heli_amb', .32, 1.3]]);
  mkS('eng_idle', [['truck_idle', 1, 1]]); mkS('eng_move', [['truck_move', 1, 1]]); mkS('eng_hum', [['humvee', 1, 1]]);
  mkS('tyres', [['tyres', 1, 1]]);
  mkS('mini', [['mini', 1, 1]]);
  mkS('run1', [['run1', 1, 1]]); mkS('run2', [['run2', 1, 1]]);
  mkS('war', [['war', 1, 1]]);
  rotorGain = SND.loops.rotor_bh.g;
}
function updLoops(dt){
  if (!AC || !SND) return; const now = AC.currentTime, on = soundOn ? 1 : 0, L_ = SND.loops, cx = camS.tx, cz = camS.tz;
  SND.master.gain.setTargetAtTime(on*.9, now, .06);
  // the Little Birds
  let lb = 0; for (const o of ORBITS) if (o.lb){ const d = Math.hypot(o.h.g.position.x - cx, o.h.g.position.z - cz); lb = Math.max(lb, Math.max(0, 1 - d/50)*.4); }
  if (FLIGHT.on) for (const h of FLIGHT.helis) if (h.lb && !h.gone && h.rs > .2){ const d = Math.hypot(h.g.position.x - cx, h.g.position.z - cz); lb = Math.max(lb, Math.max(0, 1 - d/55)*.34*h.rs); }
  L_.rotor_lb.g.gain.setTargetAtTime(lb, now, .25);
  // dust and air under a rotor
  L_.wash.g.gain.setTargetAtTime(0, now, .1); washLvl = 0;
  // the nearest vehicle: engine note and level follow its speed, tyres only when it rolls
  let bd = 40, sp = 0, pet = false, vk = 't'; const see = (x, z, v, p_, kd) => { const d = Math.hypot(x - cx, z - cz); if (d < bd){ bd = d; sp = v; pet = !!p_; vk = kd || 't'; } };
  for (const C of CONVOYS) for (const v of C.veh) if (v.x != null) see(v.x, v.z, C.v, false, v.kind);
  for (const t of TECHS) if (t.alive && t.g) see(t.g.position.x, t.g.position.z, t.v || 0, true, 'tech');
  if (IRN.convoy) for (const v of IRN.convoy) see(v.x, v.z, v.v || 0, false, v.kind);
  if (FLIGHT.on && FLIGHT.convoy) for (const v of FLIGHT.convoy) if (v.g) see(v.g.position.x, v.g.position.z, 2, false, v.kind);
  const near = bd < 40 ? 1 - bd/40 : 0, k = Math.min(1, sp/2.3), e = L_.truck;
  if (L_.eng_idle){   // the recordings: a Humvee (or a pickup, higher) or a truck (or an armoured carrier, lower), idling or pulling
    const hum = vk === 'h' || vk === 'tech', apc = vk === 'un' || vk === 'btr', pr = apc ? .78 : vk === 'tech' ? 1.16 : 1;
    L_.eng_hum.g.gain.setTargetAtTime(hum ? near*(.15 + .13*k) : 0, now, .25);
    L_.eng_idle.g.gain.setTargetAtTime(hum ? 0 : near*.2*(1 - k*.7), now, .3);
    L_.eng_move.g.gain.setTargetAtTime(hum ? 0 : near*.22*k, now, .3);
    for (const [nm, b0, b1] of [['eng_hum', .88, .4], ['eng_idle', .95, .15], ['eng_move', .85, .3]]) for (const [rp, r0] of L_[nm].rates) rp.setTargetAtTime(r0*pr*(b0 + b1*k), now, .3);
    L_.tyres.g.gain.setTargetAtTime(near*.16*k, now, .2);
    e.g.gain.setTargetAtTime(0, now, .1); }
  else {
  e.g.gain.setTargetAtTime(near*(.15 + .16*k), now, .2);
  if (e.f1){ const f0 = (pet ? 62 : 44) + (pet ? 46 : 36)*k; e.f1.setTargetAtTime(f0, now, .25); e.f2.setTargetAtTime(f0/2, now, .25); e.f3.setTargetAtTime(f0/4, now, .25); e.cut.setTargetAtTime(300 + 380*k, now, .3); }
  else if (e.rate) e.rate.setTargetAtTime(.8 + .5*k, now, .3);
  L_.tyres.g.gain.setTargetAtTime(near*.085*k, now, .2); }
  // the Little Birds' miniguns: on while rounds are going out, off a beat after
  if (L_.mini){ const fir = SND.miniT != null && now - SND.miniT < .13; L_.mini.g.gain.setTargetAtTime(fir ? Math.min(.7, (SND.miniV || 0)*.62) : 0, now, fir ? .02 : .07); if (!fir) SND.miniV = 0; }
  // feet: men running close to the camera when it is down low
  if (L_.run1){ let nr = 0; const R = halfH()*.8 + 2, zz = clamp((24 - camS.zoom)/14, 0, 1);
    if (zz > 0 && G && G.started) for (const u of units) if (u.alive && u.moving && !u.down && Math.hypot(u.x - cx, u.z - cz) < R) nr++;
    L_.run1.g.gain.setTargetAtTime(zz*Math.min(1, nr/2)*.25, now, .25); L_.run2.g.gain.setTargetAtTime(zz*clamp((nr - 2)/4, 0, 1)*.22, now, .3); }
  // the battle across the city: only in the city, and only once the shooting has started; it comes in slowly and goes out slowly
  if (L_.war){ const city = G && G.started && !G.over && MIS && MIS.id !== 'tutorial' && MIS.id !== 'attract' && G.alert;
    L_.war.g.gain.setTargetAtTime(city ? (nightF > .5 ? .24 : .3) : 0, now, city ? 2.5 : 1.2); }
  // the battle beyond the street: now and then a burst somewhere else in the city
  if (G && G.started && !G.over && !G.paused && on && MIS && MIS.id !== 'tutorial' && MIS.id !== 'attract' && G.alert){ SND.ambT -= dt;
    if (SND.ambT <= 0){ SND.ambT = rr(2.5, 8); const w = pick(['ak47', 'ak47', 'ak47', 'm16', 'm16', 'saw', 'm2']), n = w === 'm2' ? 3 + ri(4) : 1 + ri(5), pan = rr(-.9, .9), vol = rr(.05, .13), lp = rr(650, 1500), gap = w === 'saw' ? .075 : w === 'm2' ? .12 : rr(.09, .14);
      if (SB.akf){ const ww = w === 'saw' ? 'pkm' : w === 'm16' ? 'ak47' : w; gunSnd(ww, null, null, { k:.9, vol:vol*1.1, pan, lp:Math.max(lp, 3000), wet:.7, at:now }, n); }
      else for (let q=0;q<n;q++) gunSnd(w, 0, 0, { vol, pan, lp, wet:.9, at:now + q*gap + ar(0, .01) });
      if (rnd() < .12) { const g = { vol:rr(.12, .22), pan, lp:500, wet:1, at:now + rr(.5, 1.5) }, out = sndOut(g); nz(out, g.at, 'lowpass', 160, 50, .7, g.vol*2, 1.6, .01); } } }
}
/* ---------- fx ---------- */
const trMat = {}; const trM = c => trMat[c] || (trMat[c] = new T.MeshBasicMaterial({ color:c, fog:false, transparent:true, opacity:.62, depthWrite:false }));
function tracer(x0,y0,z0,x1,y1,z1,col,delay){
  const ln = new T.Mesh(UBOX, trM(col)); ln.visible = false; world.add(ln);
  const d = Math.hypot(x1-x0,y1-y0,z1-z0);
  const tl = d > 4 && rnd() < .35 ? trL[trHead = (trHead + 1) % TRL_N] : null; if (tl){ tl.color.setHex(col); tl.userData.owner = ln; }
  fx.push({ type:'tr', obj:ln, t:-delay, life: Math.max(.1, d/65), a:[x0,y0,z0], b:[x1,y1,z1], d, L:tl });
}
const lmC = {}; const lineMat = c => lmC[c] || (lmC[c] = new T.LineBasicMaterial({ color:c, fog:false }));
const _mz = new T.Vector3();
const _bp = new T.Vector3();
function ejectBrass(s){
  if (!s.m || !s.alive || !chunkMesh) return;
  const p = s.m.gun.localToWorld(_bp.set(-.03, .045, .06)); if (!isFinite(p.x)) return;
  const rx = -Math.cos(s.face), rz = Math.sin(s.face), v = rr(1.2,2);
  const b = spawnChunk(p.x, p.y, p.z, rx*v + rr(-.3,.3), rr(1.0,1.8), rz*v + rr(-.3,.3), .015, s.gun === 'saw' ? 0x86744a : 0x8e7c52, 'splinter'); if (b) b.brass = true;
}
function burstFx(s, ix, iy, iz, unitHit){
  const n = s.burst > 4 ? 4 : s.burst;
  s.aimP = [ix, iy, iz, G.t];
  let fx0 = s.x + Math.sin(s.face)*.62, fz0 = s.z + Math.cos(s.face)*.62, fy0 = s.stance==='prone' ? .18 : s.stance==='crouch' ? .64 : .83;
  if (s.m){ s.m.recoil = 1; const mz = s.pist && s.m.pistol ? s.m.pistol.localToWorld(_mz.set(0, -.15, .014)) : s.m.gun.localToWorld(_mz.set(0, .015, s.gun==='car' ? .45 : s.gun==='ak' ? .38 : .5)); if (isFinite(mz.x)){ fx0 = mz.x; fy0 = mz.y; fz0 = mz.z; } }
  const col = s.team==='us' ? 0xff7a3a : 0x9aff5a;
  for (let k=0;k<n;k++){
    const del = k*0.09;
    let ex = ix+(rnd()-.5)*.5, ey = iy+(rnd()-.5)*.3, ez = iz+(rnd()-.5)*.5, hitW = null;
    if (!unitHit){
      hitW = traceShot(fx0,fy0,fz0, ex,ey,ez, 26);
      if (hitW){ ex = hitW.x; ey = hitW.y; ez = hitW.z; }
      else { const dx = ex-fx0, dy = ey-fy0, dz = ez-fz0, L = Math.hypot(dx,dy,dz) || 1, f = (L + 26)/L; ex = fx0 + dx*f; ey = fy0 + dy*f; ez = fz0 + dz*f; }
    }
    tracer(fx0,fy0,fz0, ex,ey,ez, col, del);
    if (s.team === 'them' && Math.hypot(fx0 - camS.tx, fz0 - camS.tz) > 9) sched.push({ at:G.t + del + .04, fn:() => whizSnd(ex, ez) });
    if (hitW){ const hw = hitW, tl = Math.max(.1, Math.hypot(ex-fx0, ey-fy0, ez-fz0)/65); sched.push({ at:G.t+del+tl, fn:() => impactFx(hw) }); }
    sched.push({ at:G.t+del, fn:() => { flash(fx0,fy0,fz0, !s.pist && (s.gun==='saw' || !!s.tech)); if (k === 0) sfx(s.pist ? 'pistol' : s.team==='us'?'m16':'ak', s.x, s.z, s, n); ejectBrass(s); } });
  }
  G.fired += s.team==='us' && !s.god ? s.burst : 0;
}
const MZ_TEX = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.25, 'rgba(255,220,140,.95)'); g.addColorStop(.6, 'rgba(255,150,60,.35)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,230,160,.9)';
  for (let k=0;k<5;k++){ const a = k/5*Math.PI*2 + .3, L = k % 2 ? 22 : 30; x.beginPath(); x.moveTo(32 + Math.cos(a)*L, 32 + Math.sin(a)*L); x.lineTo(32 + Math.cos(a + 1.35)*5, 32 + Math.sin(a + 1.35)*5); x.lineTo(32 + Math.cos(a - 1.35)*5, 32 + Math.sin(a - 1.35)*5); x.closePath(); x.fill(); }
  const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; return t;
})();
const mzMats = [0, 1, 2].map(() => new T.SpriteMaterial({ map:MZ_TEX, color:0xffe2a8, blending:T.AdditiveBlending, transparent:true, depthWrite:false, fog:false }));
function flash(x,y,z,big){
  const sp = new T.Sprite(mzMats[ri(3)]), s = (big ? rr(.9, 1.3) : rr(.5, .75))*(1 + nightF*.25); sp.material.rotation = rnd()*6.28; sp.scale.set(s, s, 1); sp.position.set(x, y, z); world.add(sp);
  fx.push({ type:'fl', obj:sp, t:0, life:big ? .07 : .05 });
  muzzleLight(x, y, z, big);
  if (rnd() < (big ? .9 : .5)) spawnP(x, y, z, rr(-.2,.2), rr(.2,.5), rr(-.2,.2), rr(.6,1.1)*(big ? 1.6 : 1), big ? .14 : .08, big ? .45 : .25, 0x9a9488, 0xc8c0b0, .7, 0, 0); }
function puff(x,y,z,col,n){ for (let k=0;k<n*3;k++) spawnP(x+rr(-.1,.1), y, z+rr(-.1,.1), rr(-.7,.7), rr(.4,1.6), rr(-.7,.7), rr(.4,.9), rr(.06,.12), rr(.2,.38), col, shade(col,1.15), rr(.7,1), 0, 0); }
function boom(x,z){
  lightFlash(x, 1.2, z, 0xffa040, 7, 12, .8);
  for (let k=0;k<70;k++){ const a = rnd()*6.28, s = rr(1,4.5); spawnP(x, .5, z, Math.cos(a)*s, rr(1,4), Math.sin(a)*s, rr(.25,.6), rr(.25,.5), .08, pick([0xffe7a0,0xffc050,0xff9030]), 0xc0301a, 1, 1, 0); }
  for (let k=0;k<60;k++){ const a = rnd()*6.28, s = rr(.3,1.6); spawnP(x+rr(-.4,.4), rr(.3,1), z+rr(-.4,.4), Math.cos(a)*s, rr(.6,2.2), Math.sin(a)*s, rr(2.5,5), rr(.3,.5), rr(.9,1.6), 0x1e1b18, 0x6a6258, 1, 0, 0); }
  for (let k=0;k<30;k++){ const a = rnd()*6.28, s = rr(2,6); spawnP(x, .5, z, Math.cos(a)*s, rr(2,5), Math.sin(a)*s, rr(1,1.8), .08, .07, pick([0x3a342c,0x6a5a48,0x8a7a62]), 0x4a4036, 1, 0, 9); }
  scorchAround(x, .03, z, rr(2.6, 3.4)); blastCover(x, z, 2.0); blastRubble(x, z, 16);
}
function updFx(dt){
  updChunks(dt); updTrickles(dt); updTraces(dt);
  for (let k=fx.length-1;k>=0;k--){
    const f = fx[k]; f.t += dt;
    if (f.type === 'tr'){
      if (f.t < 0) continue;
      f.obj.visible = true;
      const u = clamp(f.t/f.life,0,1), seg = Math.min(1, 1.7/(f.d||1));
      const a = f.a, b = f.b, u0 = Math.max(0,u-seg);
      const ax = a[0]+(b[0]-a[0])*u0, ay = a[1]+(b[1]-a[1])*u0, az = a[2]+(b[2]-a[2])*u0;
      const bx = a[0]+(b[0]-a[0])*u, by = a[1]+(b[1]-a[1])*u, bz = a[2]+(b[2]-a[2])*u;
      const L = Math.hypot(bx-ax, by-ay, bz-az) || .01;
      f.obj.position.set((ax+bx)/2, (ay+by)/2, (az+bz)/2); f.obj.lookAt(bx, by, bz); f.obj.scale.set(.03, .03, L);
      if (f.L && f.L.userData.owner === f.obj){ f.L.position.set(bx, by, bz); f.L.intensity = (1.4 + nightF*2.2)*(u < 1 ? 1 : 0); f.L.distance = 3.5 + nightF*2.5; if (u >= 1) f.L.userData.owner = null; }
    } else if (f.type === 'grow'){
      const s = .15 + .85 * Math.sqrt(Math.min(1, f.t/f.life)); f.obj.scale.setScalar(s); if (f.t >= f.life) { fx.splice(k,1); continue; }
    } else if (f.type === 'pf'){
      f.obj.position.x += f.v[0]*dt; f.obj.position.y += f.v[1]*dt; f.obj.position.z += f.v[2]*dt; f.v[1] -= 1.2*dt;
      const s = 1 + f.t*2; f.obj.scale.set(s,s,s);
    } else if (f.type === 'bm'){
      const s = 1 + f.t*5; f.obj.scale.set(s,s,s); f.obj.material.opacity = 1 - f.t/f.life;
    }
    if (f.t >= f.life){ if (f.L && f.L.userData.owner === f.obj){ f.L.intensity = 0; f.L.userData.owner = null; } world.remove(f.obj); fx.splice(k,1); }
  }
}

/* ---------- sound ---------- */
let AC = null, noiseBuf = null, soundOn = true, lastSnd = 0;
function initAudio(){
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate*1.0, AC.sampleRate);
    const ch = noiseBuf.getChannelData(0); for (let k=0;k<ch.length;k++) ch[k] = (Math.random()*2-1) * Math.pow(1 - k/ch.length, 2);
    sndInit();
  } catch(e){ AC = null; }
}
