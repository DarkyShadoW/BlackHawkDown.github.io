"use strict";
/* ---------- simulation ---------- */
function step(dt){
  G.t += dt; G.dt = dt;
  scriptStep(dt); updRPGs(dt); updRockets(dt); cineStep(dt); if (MIS.id === 'tutorial') tutTick(dt);
  for (const C of CONVOYS) convoyStep(C, dt);
  for (const T_ of TECHS) techStep(T_, dt);
  for (const d of G.m.wounded || []) if (!d.gone) irDecorStep(d, dt);
  if (G.endAt != null && G.t >= G.endAt && !G.over){ endGame(true); return; }
  for (let k=sched.length-1;k>=0;k--) if (sched[k].at <= G.t){ const s = sched[k]; sched.splice(k,1); s.fn(); }
  for (let k=emitters.length-1;k>=0;k--) if (emitters[k].until && G.t > emitters[k].until) emitters.splice(k,1);
  G.visT -= dt;
  if (G.visT <= 0){ G.visT = .2; updVisibility(); }
  for (const u of units) updUnit(u, dt);
  formStep(dt);
  for (const u of us) idleLife(u, dt);
  medic(dt);
  updRuns(dt); updCivs(dt);
  G.supT = (G.supT || 0) - dt; if (G.supT <= 0){ G.supT = .5; updSupBtns(); }
  updMission();
  if (MIS.id === 'irene') irTick(dt);
  if (moveMark.material.opacity > 0) moveMark.material.opacity = Math.max(0, moveMark.material.opacity - dt*1.2);
  const supOn = us.some(u => u.alive && u.order && u.order.type==='suppress');
  supMark.material.opacity = supOn ? .55 + Math.sin(G.t*8)*.25 : Math.max(0, supMark.material.opacity - dt*2);
  checkEnd();
}
function updVisibility(){
  updLit();
  for (const e of them){
    if (!e.alive){ e.spotted = false; continue; }
    const was = e.spotted;
    e.spotted = us.some(u => u.alive && dist(u,e) < sightR(u,e) + 2 && losU(u,e));
    if (e.spotted){ G.ghosts.set(e, { x:e.x, z:e.z, t:G.t });
      if (!was && !e.dummy && G.t - G.contactT > 5){ G.contactT = G.t; const sp = us.filter(u=>u.alive).sort((a,b)=>dist(a,e)-dist(b,e))[0]; radio(sp, `¡Contacto, ${dirName(sp,e)}!`); autoPause('contacto'); } }
  }
}
function dirName(a,b){
  const ang = Math.atan2(b.x-a.x, -(b.z-a.z)) * 180/Math.PI; const n = ['al norte','al noreste','al este','al sureste','al sur','al suroeste','al oeste','al noroeste'];
  return n[((Math.round(ang/45) % 8) + 8) % 8];
}
/* ---------- fatigue (ours only): 100 is fresh. Running under orders and being under heavy fire wear a man down; he gets it back
   standing still out of the fire, faster on a knee or indoors. A tired man moves and shoots slower and misses more; at zero he is
   spent: he makes for the nearest cover and takes no order to move until he has his breath back. ---------- */
function updFatigue(u, dt, moving){
  if (u.fat == null) u.fat = 100;
  if (CINE.on || u.mounted || u.ride || u.board || u.down) return;
  let d = 0;
  if (moving && u.order) d -= (u.sneak ? 1.1 : 2.6)*(u.hp < u.hp0*.5 ? 1.35 : 1);
  if (u.pinned) d -= 2.4; else if (u.sup > 55) d -= .5 + 1.6*(u.sup - 55)/45;
  if (!moving && !u.pinned && u.sup <= 55) d += (u.sup < 20 ? 4.6 : 2.0)*(u.stance !== 'stand' || u.inB ? 1.3 : 1);
  u.fat = clamp(u.fat + d*dt, 0, 100);
  if (!u.spent && u.fat <= 0){
    u.spent = true;
    if (u.order && (u.order.type === 'move' || u.order.type === 'attack') && !u.inB){
      const c = findCover(Math.floor(u.x), Math.floor(u.z), nearestThreat(u), 5, new Set());
      u.path = c ? (smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z) || []) : []; u.order = { type:'cover' }; if (!u.path.length) u.stance = 'crouch'; }
    if (G.t - (G.spentT || -99) > 6){ G.spentT = G.t; radio(u, pick(['¡No puedo más! Necesito un respiro.', 'Estoy reventado. Me quedo a cubierto.', '¡Sin aliento! Dadme un minuto.'])); }
  } else if (u.spent && u.fat >= 35) u.spent = false;
}
// down a fast-rope: away quickly, then the hands and boots squeeze and he slows to a walking pace for the last metres
function ropeSpeed(v, h, dt){ v = v || .6; const top = h > 1.6 ? 5.6 : 1.3 + 2.7*Math.max(0, h - .2)/1.4; return v < top ? Math.min(top, v + dt*10) : Math.max(top, v - dt*16); }
function updUnit(u, dt){
  if (!u.alive) return;
  if (u.dummy){ u.sup = Math.max(0, u.sup - 14*dt); return; }
  if (u.pushup != null){ u.sup = 0; u.stance = 'prone'; return; }
  if (u.slide){ u.ropeV = ropeSpeed(u.ropeV, u.elev || 0, dt); u.elev = Math.max(0, (u.elev || 0) - dt*u.ropeV); if (u.elev <= 0){ u.slide = false; u.elev = 0; u.landT = .55; u.ropeV = 0; } return; }
  u.sup = Math.max(0, u.sup - (u.sup > 60 ? 10 : 16)*dt);
  u.pinned = u.sup >= 92 || (u.pinned && u.sup > 60);
  if (u.firing > 0) u.firing -= dt;
  const foes = u.team==='us' ? them : us;
  if (u.team === 'them'){ u.thinkT -= dt; if (u.thinkT <= 0){ u.thinkT = .8 + rnd()*.7; aiThink(u); } }

  const o = u.order;
  if (o && o.type === 'attack'){
    if (!o.target.alive){ u.order = null; }
    else {
      o.rT -= dt;
      const seeT = dist(u,o.target) < RANGE && losU(u,o.target);
      if (seeT){ if (u.path.length) u.path = []; }
      else if (o.rT <= 0 && !u.pinned && !u.inB && !u.spent){ o.rT = 1.5; const c = nearestFree(Math.floor(o.target.x), Math.floor(o.target.z)); u.path = findPath(Math.floor(u.x),Math.floor(u.z),c[0],c[1]) || []; u.stance = 'stand'; }
    }
  }
  if (o && o.type === 'suppress' && G.t > o.until) u.order = null;

  if (u.stumT > 0) u.stumT -= dt;
  if (!u.path.length && !u.inB && !u.mounted && vaultCell(Math.floor(u.x), Math.floor(u.z))){ u.path = [nearestFree(Math.floor(u.x), Math.floor(u.z))]; }   // never left standing in a wall
  if (u.team === 'them') foeLife(u, dt);
  let moving = false;
  const spd = u.spd * (u.hp < u.hp0*.5 ? .6 : 1) * (u.sup > 50 ? .65 : 1) * (u.team==='them' ? .9 : 1) * (u.sneak ? .55 : 1) * (u.fat != null && u.order ? .6 + .4*u.fat/100 : 1) * (u.stumT > 0 ? .3 : 1) * (u.vault ? .72 : 1) * (u.fgMul || 1);
  if (u.path.length && (!u.pinned || u.vault)){
    const n = u.path[0];
    if (!u.vault){ u.vsT = (u.vsT || 0) - dt; if (u.vsT <= 0){ u.vsT = .12; vaultScan(u); } }
    if (!walk(n[0],n[1])) { u.path = []; }
    else {
      let tx = n[0]+.5, tz = n[1]+.5;
      const d0 = Math.hypot(tx-u.x, tz-u.z), last = u.path.length === 1;
      if (u.team === 'us' && !last){
        // pursuit: aim at the point 1.1 m further along the route (through the next corner), which turns the corner into an arc
        let px = u.x, pz = u.z, rem = 1.1, k = 0, ax = null, az = null;
        while (k < u.path.length && k < 4){ const qx = u.path[k][0] + .5, qz = u.path[k][1] + .5, sl = Math.hypot(qx - px, qz - pz);
          if (sl >= rem){ ax = px + (qx - px)*rem/sl; az = pz + (qz - pz)*rem/sl; break; } rem -= sl; px = qx; pz = qz; k++; }
        if (ax == null){ ax = px; az = pz; }
        tx = ax; tz = az;
        // the corner is reached once he is close to it or has gone past it
        const n2 = u.path[1], ox = n2[0] + .5 - (n[0] + .5), oz = n2[1] + .5 - (n[1] + .5);
        if (d0 < .55 || ((u.x - n[0] - .5)*ox + (u.z - n[1] - .5)*oz > 0 && d0 < 1.4)) u.adv = true;
      }
      else if (!last && d0 < .7){ const n2 = u.path[1], t = (1 - d0/.7) * .6; tx += (n2[0]+.5-tx)*t; tz += (n2[1]+.5-tz)*t; }
      const dx = tx-u.x, dz = tz-u.z, d = Math.hypot(dx,dz) || 1e-4;
      const want = last ? Math.min(spd, d0*3.2 + .25) : spd;
      const a = 1 - Math.exp(-7*dt);
      u.vx += (dx/d*want - u.vx) * a; u.vz += (dz/d*want - u.vz) * a;
      u.x += u.vx*dt; u.z += u.vz*dt;
      if (u.adv || (last ? d0 < .06 : (u.team !== 'us' && d0 < .35))){ u.adv = false; u.path.shift(); if (!u.path.length){ arrive(u); } }
      moving = true;
      if (u.path.length && u.stance !== 'stand') u.stance = 'stand';   // not on the last step: arrive() has just set how he waits
    }
  }
  if (!moving){ const f = Math.exp(-10*dt); u.vx *= f; u.vz *= f; if (Math.abs(u.vx)+Math.abs(u.vz) > .01){ const nx = u.x + u.vx*dt, nz = u.z + u.vz*dt; if (walk(Math.floor(nx),Math.floor(nz))){ u.x = nx; u.z = nz; } } else { u.vx = u.vz = 0; } }
  const vsp = Math.hypot(u.vx, u.vz); if (vsp > .25 && moving) u.face = Math.atan2(u.vx, u.vz);
  u.moving = moving;
  if (moving && !u.vault && !(u.stumT > 0) && vsp > 1.7 && rnd() < dt*(u.team === 'us' ? (u.fat != null && u.fat < 35 ? .03 : .008) : .006)) u.stumT = .8;   // once in a long while a running man loses his footing
  if (u.team === 'us' && !u.npc) updFatigue(u, dt, moving);
  if (moving && u.team==='us' && u.order && u.order.type==='move' && u.sup > 45){ u.path = []; u.order = null; u.stance = 'crouch'; moving = u.moving = false; if (G.t - (G.downT||-9) > 4){ G.downT = G.t; radio(u, pick(['¡Nos disparan! ¡Al suelo!','¡Fuego enemigo, cubríos!','¡Contacto! ¡Abajo!'])); } }
  if (!moving){
    if (u.pinned) u.stance = 'prone';
    else if (u.stance === 'prone') u.stance = 'crouch';
    else if (u.sup > 30 && u.stance === 'stand') u.stance = 'crouch';
  }

  if (u.reloading){ u.reloadT += dt; if (u.reloadT >= u.reloadDur){ u.reloading = false; u.mag = Math.min(u.magSize, u.ammo); } }
  else if (u.mag <= 0 && u.ammo > 0 && !u.pist){
    // dry with the enemy close: no time for a magazine. The rifle drops on its sling and the pistol comes out
    if (u.hasPistol && !moving && !u.pinned && !u.inB && u.auto && u.auto.alive && dist(u, u.auto) < 9.5){ u.pist = { st:0, t:0, shots:3 + ri(4), cool:0 }; if (rnd() < .45) radio(u, pick(['¡Seco! ¡Pistola!', '¡Cambio a pistola!', '¡Sin cargador! ¡Pistola!'])); }
    else { u.reloading = true; u.reloadT = 0; reloadSnd(u); if (u.team==='us' && rnd()<.5) radio(u, pick(['¡Recargando!','¡Cambio cargador!','¡Cubridme, recargo!'])); } }
  else if (!u.pist && !u.auto && !moving && u.mag < u.magSize*.35 && u.ammo > u.mag && !(u.order && u.order.type==='suppress')){ u.reloading = true; u.reloadT = 0; reloadSnd(u); }
  if (u.pist){ const p_ = u.pist; p_.t += dt; const tg = u.auto && u.auto.alive && !moving && !u.pinned && dist(u, u.auto) < 12 ? u.auto : null;
    if (p_.st === 0 && p_.t > .55){ p_.st = 1; p_.cool = .12; }
    else if (p_.st === 1){ p_.cool -= dt;
      if (!tg || p_.shots <= 0){ p_.st = 2; p_.t = 0; }
      else if (p_.cool <= 0 && !u.noFire){ p_.cool = rr(.3, .55); p_.shots--; const a_ = u.acc, b_ = u.burst, s_ = u.supp; u.acc *= .8; u.burst = 1; u.supp = s_*.35; fireAt(u, tg); u.acc = a_; u.burst = b_; u.supp = s_; u.mag = 0; } }
    else if (p_.st === 2 && p_.t > .5){ u.pist = null; u.reloading = true; u.reloadT = 0; reloadSnd(u); } }
  u.status = u.reloading ? 'Recargando' : u.pinned ? 'Inmovilizado' : moving ? (o && o.type==='cover' ? 'A cubierto…' : 'Moviéndose') :
    (o && o.type==='suppress') ? 'Suprimiendo' : u.firing > 0 ? 'Disparando' : u.healing ? 'Atendiendo' : (o && o.type==='treat') ? 'Seguridad' :
    u.stance==='crouch' ? 'Agazapado' : 'Listo';
  if (u.inB) u.status = u.inB.level === 'roof' ? (u.firing > 0 ? 'Azotea · fuego' : 'En la azotea') : (u.firing > 0 ? 'Ventana · fuego' : 'En el edificio');
  if (u.spent && !moving) u.status = 'Agotado';
  if (u.pist) u.status = 'Pistola';

  if (u.team === 'us' && !u.npc){ u.wallT = (u.wallT || 0) - dt;
    if (moving || u.inB || u.auto || (o && (o.type === 'attack' || o.type === 'suppress' || o.type === 'treat'))) u.wall = null;
    else if (u.wallT <= 0){ u.wallT = .6; const i = Math.floor(u.x), j = Math.floor(u.z); let best = null;
      for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) if (bAt(i + dx, j + dz) >= 0){ const fx = u.x - (i + .5 + dx*.5), fz = u.z - (j + .5 + dz*.5); const d = Math.abs(dx ? fx : fz); if (!best || d < best[0]) best = [d, Math.atan2(-dx, -dz)]; }
      if (best){ if (u.wall == null){ u.wallVar = pick([0, 0, 1, 2]); if (u.wallVar === 2 && u.sup < 20) u.idleKneel = true; } u.wall = best[1]; const thr = nearestThreat(u); let d = Math.atan2(thr.x - u.x, thr.z - u.z) - u.wall; d = Math.atan2(Math.sin(d), Math.cos(d)); u.wallLook = clamp(d, -1.2, 1.2) || .9; }
      else u.wall = null; }
    if (u.wall != null) u.face = u.wallVar === 1 ? u.wall + (u.wallLook < 0 ? -1.25 : 1.25) : u.wall; }
  u.cool -= dt; u.scanT -= dt;
  if (u.scanT <= 0){
    u.scanT = .3; u.auto = null; let bd = 1e9;
    for (const f of foes){ if (!f.alive || f.dummy) continue; const d = dist(u,f); if (d < sightR(u,f) && d < bd && losU(u,f)){ bd = d; u.auto = f; } }
  }
  if (u.rpg){ rpgThink(u, dt, moving); return; }
  if (u.pinned || u.cool > 0 || u.reloading || u.mag <= 0 || u.noFire) return;
  if (o && o.type === 'treat' && u.healing) return;
  if (moving){ if (u.auto && u.auto.alive && u.team==='us' && dist(u,u.auto) < RANGE*.7){ const a = u.acc; u.acc *= .45; fireAt(u, u.auto); u.acc = a; u.cool *= 1.4; } return; }
  if (o && o.type === 'suppress'){
    if (Math.hypot(o.x-u.x,o.z-u.z) < RANGE+4 && losP(u,o.x,o.z)) { fireSuppress(u, o.x, o.z); return; }
  }
  let tgt = null;
  if (o && o.type==='attack' && o.target.alive && dist(u,o.target) < RANGE && losU(u,o.target)) tgt = o.target;
  else if (u.auto && u.auto.alive) tgt = u.auto;
  if (tgt) fireAt(u, tgt);
}
function arrive(u){
  if (u.order && u.order.type === 'enter'){ const b = BLDS[u.order.b]; if (b) placeInB(u, b, u.order.level); else u.order = null; return; }
  if (u.order && u.order.type === 'cover'){ u.stance = 'crouch'; }
  else if (u.order && u.order.type === 'move'){ if (u.order.form && formHolding(u.order.form)) return;   // in formation: he keeps his place while the point man is still walking
    const kn = u.order.kneel; u.order = null; u.stance = kn || u.sup > 25 ? 'crouch' : 'stand';
    if (u.team === 'us' && !u.npc && u.sup < 25 && (u.kit === 'radio' || rnd() < .15)){ u.sigT = 1.2; u.sigK = 'fist'; } }
}
function sightR(v, t){
  let R = RANGE;
  if (t && t.inB && t.inB.level === 'ground' && !(t.firing > 0)) R = 7;       // someone inside, back from the window, is hard to spot
  if (v.team === 'them' && G.m && G.m.p2 && nightF > .5) return t && t.lit ? R : Math.min(R, 10);   // Anochecer, phase 2: the militia sees nobody beyond 10 m unless a flare shows them
  if (nightF < .05 || (t && t.firing > 0)) return R;                           // a muzzle flash gives anyone away
  let nR;
  if (v.team === 'them') nR = t && t.lit ? RANGE*.85 : 3;                      // no night sights: the militia sees only what the light shows
  else if (v.look === 'delta' && G.nv) nR = (v.nvBlind || 0) > .45 ? 4 : NV_R;   // NVGs: about 50 m all round, useless when a flare whites them out
  else if (v.look === 'delta') nR = t && t.lit ? RANGE : 8;
  else nR = t && t.lit ? RANGE : 8;
  if (R === 7) nR = Math.min(nR, 7);
  return R + (nR - R) * nightF;
}
function medic(dt){
  for (const u of us) u.healing = !!u.working;
  for (const m_ of us.filter(u => u.medic && u.npc)) medicOne(m_, dt);
  treatOrders(dt);
  for (const u of us){
    if (!u.down) continue;
    let rate = 0, who = null;
    for (const h of us){ if (!h.alive || h.moving || dist(h,u) > 1.7 || !(h.npc || (h.order && h.order.type === 'treat' && h.order.pat === u))) continue; const r = h.medic ? 1 : .45; if (r > rate){ rate = r; who = h; } }
    if (who){ u.reviveT += dt*rate; who.healing = true;
      if (u.reviveT > 5){ u.down = false; u.alive = true; u.hp = who.medic ? 40 : 25; u.sup = 40; u.stance = 'crouch'; u.reviveT = 0; u.path = []; u.order = null;
        if (who.order && who.order.type === 'treat'){ u.order = { type:'treat', id:who.order.id, until:who.order.until, rT:0, pat:null }; if (G.sel.has(who)) G.sel.add(u); }
        logMsg(`${who.name} levanta a ${u.name}`, 'us'); } }
  }
}
function medicOne(m, dt){
  if (m && m.alive && !m.inB && !m.pinned && !m.path.length && (!m.order || m.order.type === 'cover') && G.t > (m.medGoT||0)){
    const f = us.filter(u => u.down).sort((a,b) => dist(a,m) - dist(b,m))[0];
    if (f && dist(f,m) > 1.4 && dist(f,m) < 16){
      m.medGoT = G.t + 2;
      const c = nearestFree(Math.floor(f.x), Math.floor(f.z)), pth = findPath(Math.floor(m.x), Math.floor(m.z), c[0], c[1]);
      if (pth){ m.path = pth; m.order = { type:'move' }; m.stance = 'stand';
        if (G.t - (m.medTalk||-99) > 8){ m.medTalk = G.t; radio(m, pick([`¡Voy a por ${f.name}!`, '¡Sanitario en camino!', '¡Cubridme, voy a por él!'])); } }
    }
  }
  if (m && m.alive && !m.moving && !m.pinned){
    for (const u of us) if (u !== m && u.alive && u.hp < 70 && dist(u,m) < 1.7){ u.hp = Math.min(70, u.hp + 5*dt); m.healing = true; }
    if (m.hp < 70 && !m.healing) m.hp = Math.min(70, m.hp + 1.5*dt);
  }
}
function aiThink(e){
  if (e.pinned || e.moving) return;
  const vis = us.filter(u => u.alive && dist(u,e) < sightR(e,u) && losU(e,u));
  const taken = new Set(them.filter(o => o !== e && o.alive).map(o => { const p = o.path.length ? o.path[o.path.length-1] : [Math.floor(o.x),Math.floor(o.z)]; return idx(p[0],p[1]); }));
  if (vis.length){
    G.alert = true; G.lastKnown = { x:vis[0].x, z:vis[0].z };
    if (e.stance === 'stand') e.stance = 'crouch';
    if (e.kind !== 'post' && !e.push){
      const nv = vis.sort((a,b)=>dist(a,e)-dist(b,e))[0];
      const pr = coverProt({ x:e.x, z:e.z, stance:'crouch' }, nv.x, nv.z).v;
      if (pr < .25 && rnd() < .45){ const c = findCover(Math.floor(e.x),Math.floor(e.z), nv, 4, taken); if (c) e.path = findPath(Math.floor(e.x),Math.floor(e.z),c[0],c[1]) || []; }
    }
    if (!(e.push && rnd() < .45)) return;   // the ones set on a goal keep going for it, under fire or not
  }
  if (e.kind === 'post' || !G.alert || G.t < e.nextMove) return;
  const goal = e.kind === 'wave' ? (e.goal || squadCenter()) : G.lastKnown; if (!goal) return;
  const d = Math.hypot(goal.x-e.x, goal.z-e.z);
  e.nextMove = G.t + 2.5 + rnd()*3;
  if (d < (e.push ? 2 : 7)) return;
  const hop = Math.min(7, d - (e.push ? 1 : 5));
  const hc = nearestFree(Math.floor(e.x + (goal.x-e.x)/d*hop), Math.floor(e.z + (goal.z-e.z)/d*hop));
  const c = findCover(hc[0], hc[1], goal, 3, taken) || hc;
  e.path = findPath(Math.floor(e.x),Math.floor(e.z),c[0],c[1]) || [];
  e.stance = 'stand';
}
function squadCenter(){ const a = us.filter(u=>u.alive); if (!a.length) return null; return { x:a.reduce((s,u)=>s+u.x,0)/a.length, z:a.reduce((s,u)=>s+u.z,0)/a.length }; }
function spawnWave(){
  G.waveSpawned = true; G.alert = true;
  const ESPEC = { acc:.18, burst:4, cool:1.7, supp:9, ammo:99999, hp:70, gun:'ak' };
  for (const [i,j] of [[62,31],[62,33],[63,29],[32,63],[30,62],[32,0]]){ const c = nearestFree(OX+i,OZ+j); const e = makeUnit('them', c[0], c[1], Object.assign({ kind:'wave', name:'Miliciano' }, ESPEC)); e.nextMove = G.t + rnd()*2; }
  logMsg('Radio: refuerzos de la milicia entrando por el este, el norte y el sur.', 'bad');
  autoPause('refuerzos');
}
/* mission: one final objective, sub-objectives revealed one by one over the radio */
const posts = () => them.filter(e => e.kind === 'post'), waveU = () => them.filter(e => e.kind === 'wave');
const MISSION = [
  { text:'Avanzar hasta la barricada de la avenida', zone:{ x:OX+23.5, z:OZ+31.5, r:3 },
    done:() => us.some(u => u.alive && Math.hypot(u.x-(OX+23.5), u.z-(OZ+31.5)) < 3),
    radio:'Barricada alcanzada. Hay nidos de la milicia en el cruce, ¡hay que callarlos!' },
  { text:'Silenciar los nidos del cruce', zone:{ x:OX+34, z:OZ+31.5, r:8 },
    count:() => [posts().filter(e => !e.alive).length, posts().length],
    done:() => posts().every(e => !e.alive),
    radio:'Nidos silenciados. ¡Todos al cruce, ya!' },
  { text:'Reunir a la escuadra en el cruce', zone:{ x:OBJ.x, z:OBJ.z, r:OBJ.r },
    count:() => { const a = us.filter(u => u.alive); return [a.filter(u => Math.hypot(u.x-OBJ.x, u.z-OBJ.z) < OBJ.r).length, a.length]; },
    done:() => { const a = us.filter(u => u.alive); return a.length > 0 && a.every(u => Math.hypot(u.x-OBJ.x, u.z-OBJ.z) < OBJ.r); },
    radio:'En posición. Mando avisa: viene la milicia en masa, ¡aguantad!' },
  { text:'Aguantar a los refuerzos', zone:{ x:OBJ.x, z:OBJ.z, r:OBJ.r }, start:() => { if (!G.waveSpawned) spawnWave(); },
    count:() => [waveU().filter(e => !e.alive).length, waveU().length],
    done:() => G.waveSpawned && waveU().every(e => !e.alive), radio:'¡Cruce asegurado! Buen trabajo.' },
];
/* ---------- missions: the original crossing plus two long test missions, one by day and one by night ---------- */
const ESPEC2 = { acc:.16, burst:4, cool:1.8, supp:9, ammo:99999, hp:70, gun:'ak' };
const S61 = { x:LM.s61.x, z:LM.s61.z }, S64 = { x:LM.s64.x, z:LM.s64.z };
function findWalk(x, z){
  const i0 = Math.floor(x), j0 = Math.floor(z);
  for (let r=0;r<40;r++) for (let dj=-r;dj<=r;dj++) for (let di=-r;di<=r;di++){
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    if (walk(i0+di, j0+dj)) return [i0+di, j0+dj];
  }
  return nearestFree(i0, j0);
}
function foe(x, z, kind, tag, extra){
  const c = findWalk(x, z);
  const e = makeUnit('them', c[0], c[1], Object.assign({ kind, tag, name:'Miliciano' }, ESPEC2, extra || {}));
  if (kind === 'post') e.stance = 'crouch';
  if (kind === 'wave') e.nextMove = (G ? G.t : 0) + rnd()*2;
  return e;
}
const tagged = t => them.filter(e => e.tag === t);
const tagDone = t => tagged(t).every(e => !e.alive);
const tagCount = t => { const L = tagged(t); return [L.filter(e => !e.alive).length, L.length]; };
// a wave of militia from one side, out of sight, running at the squad
function waveFrom(cx, cz, ang, n, tag, dist){
  G.alert = true; dist = dist || 40;
  const bx = cx + Math.cos(ang)*dist, bz = cz + Math.sin(ang)*dist;
  for (let k=0;k<n;k++) foe(bx + rr(-4, 4), bz + rr(-4, 4), 'wave', tag);
  const dir = compass(Math.cos(ang), Math.sin(ang));
  logMsg('Radio: milicia acercándose desde el ' + dir + '.', 'bad'); autoPause('ataque desde el ' + dir);
}
function inBNear(x, z, r, level){
  return us.filter(u => { if (!u.alive || !u.inB) return false; if (level && u.inB.level !== level) return false; const b = BLDS[u.inB.b]; return Math.hypot(b.x + b.w/2 - x, b.y + b.d/2 - z) < r; }).length;
}
const fmtLeft = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0'); };
// a timed defence: waves every so often from changing sides until the clock runs out
function holdSub(text, secs, every, n, cx, cz, radio){
  return { text, zone:{ x:cx, z:cz, r:14 },
    start:() => { G.holdEnd = G.t + secs; G.nextWave = G.t + 20; G.waveN = 0; },
    tick:() => { if (G.t >= G.nextWave && G.t < G.holdEnd - 25){ G.nextWave = G.t + every; G.waveN++; waveFrom(cx, cz, rnd()*Math.PI*2, n + Math.min(3, G.waveN >> 1), 'hold'); } },
    count:() => 'quedan ' + fmtLeft(G.holdEnd - G.t),
    done:() => G.t >= G.holdEnd, radio };
}
/* mortar team: while it lives, shells fall near the squad */
function mortarShell(){
  const c = squadCenter(); if (!c) return;
  const x = c.x + rr(-7, 7), z = c.z + rr(-7, 7);
  logMsg('¡Mortero! ¡A cubierto!', 'bad');
  sched.push({ at:G.t + 1.6, fn:() => {
    boom(x, z); sfx('boom', x, z); addNoise(x, z, 40);
    for (const u of units){ if (!u.alive) continue; const d = Math.hypot(u.x - x, u.z - z); if (d > 6) continue;
      u.sup = Math.min(100, u.sup + 80*(1 - d/6));
      if (d < 1.9 && !(u.inB && u.inB.level === 'ground')) damage(u, 55*(1 - d/1.9) + 15, null); } } });
}
/* supply bundles dropped by a Black Hawk: a crate under a spilled parachute, a smoke marker, a ring */
let CRATES = [];
function dropCrates(pts){
  CRATES = pts.map(p => {
    const c = findWalk(p[0], p[1]), x = c[0] + .5, z = c[1] + .5, g = new T.Group(); g.position.set(x, 0, z); world.add(g);
    const box_ = new T.Mesh(UBOX, new T.MeshLambertMaterial({ color:0x5a5e3a })); box_.scale.set(.8, .55, .7); box_.position.y = .28; box_.castShadow = true; g.add(box_);
    const chute = new T.Mesh(new T.SphereGeometry(.9, 10, 4, 0, Math.PI*2, 0, Math.PI/2), new T.MeshLambertMaterial({ color:0xd8d4c4, side:T.DoubleSide }));
    chute.scale.set(1.2, .25, 1); chute.position.set(.9, 0, .4); chute.rotation.z = .3; g.add(chute);
    const em = { x, z, y:.3, rate:10, life:7, vy:1.1, s0:.25, s1:1.5, fire:0, acc:0, sp:.12 }; emitters.push(em);
    const ring = grounded(ovRing(.9, 1.1, 0xe7a63d, .9), .08); ring.position.x = x; ring.position.z = z;
    return { x, z, g, em, ring, got:false };
  });
}
function pickCrates(){
  for (const c of CRATES){ if (c.got) continue;
    if (us.some(u => u.alive && !u.inB && Math.hypot(u.x - c.x, u.z - c.z) < 1.5)){ c.got = true; world.remove(c.g); overlay.remove(c.ring); c.em.until = G.t; logMsg('Suministro recogido.', 'us'); } }
}

/* ---- mission data ---- */
function spawnM1(){
  const posts = [[41,29],[41,34],[30,23],[34,23],[30,40],[34,40]];
  const rifles = [[46,25],[44,40],[40,46],[47,32],[22,20],[18,46],[33,48],[26,12],[48,14]];
  posts.forEach(p => foe(OX+p[0], OZ+p[1], 'post'));
  rifles.forEach(p => foe(OX+p[0], OZ+p[1], 'rifle'));
}
function spawnDay(){
  // along Hawlwadig, at the Warshadaha crossing, and round the crash
  for (const p of [[251,222],[261,214],[250,204],[262,196],[252,186]]) foe(p[0], p[1], 'post', 'g1');
  for (const p of [[266,226],[246,210],[267,200],[244,192]]) foe(p[0], p[1], 'rifle', 'g1');
  for (const p of [[250,163],[262,173],[256,158],[265,163],[248,174]]) foe(p[0], p[1], 'post', 'g2');
  for (const p of [[240,168],[272,168],[256,150]]) foe(p[0], p[1], 'rifle', 'g2');
  for (const p of [[299,199],[315,209],[303,215],[311,195]]) foe(p[0], p[1], 'post', 'g3');
  for (const p of [[294,190],[320,198],[311,224],[298,226],[325,212]]) foe(p[0], p[1], 'rifle', 'g3');
}
function spawnNight(){
  for (const p of [[330,190],[284,222],[288,182]]) foe(p[0], p[1], 'rifle', 'probe');
}
/* =====================================================================================================
   CAMPAIGN · the battle of 3-4 October 1993, mission by mission, as the timeline lays it out
   ===================================================================================================== */
let CONVOYS = [], SCRIPTED = [], ORBITS = [];
const RSPEC = { look:'ranger', spd:2.4, supRes:.6, reloadDur:2.3 }, DSPEC = { look:'delta', spd:2.7, supRes:.45, reloadDur:1.8 };
const chalkSpecs = k => RANGERS.map((s, i) => Object.assign({}, s, RSPEC, { name:IR_NAMES[k][i] }));
const deltaSpecs = (n, names) => DELTA.concat(IR_DELTA_X).slice(0, n).map((s, i) => Object.assign({}, s, DSPEC, names && names[i] ? names[i] : {}));
const rangerSpecs = names => names.map((n, i) => Object.assign({}, RANGERS[i % 6], RSPEC, { name:n }));
const CAMP_ESPEC = { acc:.2, hp:80 };

/* ---------- the force: groups of men, each with its own card, like the chalks of Irene ---------- */
const SPAWN_OFF = [[0,0],[1.3,1.2],[-1.3,1.2],[1.3,-1.2],[-1.3,-1.2],[2.6,0],[-2.6,0],[0,2.5],[0,-2.5],[2.6,2.5]];
function spawnForce(defs){
  for (const u of us){ world.remove(u.m.root); dropOverlay(u); } units = units.filter(u => u.team !== 'us'); us = [];
  IRN = { groups:[] };
  for (const d of defs) addGroup(d);
  return IRN.groups;
}
function addGroup(d){
  if (!IRN.groups) IRN.groups = [];
  const gi = IRN.groups.length, g = { name:d.name, role:d.role || '', kind:d.kind || 'chalk', members:[] };
  IRN.groups.push(g);
  (d.specs || []).forEach((sp, k) => addMember(g, sp, d.at[0] + SPAWN_OFF[k % SPAWN_OFF.length][0], d.at[1] + SPAWN_OFF[k % SPAWN_OFF.length][1], d.face));
  if (G && G.started) buildCards();
  return g;
}
function addMember(g, sp, x, z, face){
  const c = findWalk(x, z), gi = IRN.groups.indexOf(g);
  const u = makeUnit('us', c[0], c[1], Object.assign({ kind:'us', grp:gi }, sp));
  if (face != null) u.face = face;
  g.members.push(u); return u;
}
const grpN = n => IRN.groups ? IRN.groups.find(g => g.name === n) : null;
const gLive = g => g ? g.members.filter(u => u.alive) : [];
const gIn = (g, x, z, r) => gLive(g).filter(u => Math.hypot(u.x - x, u.z - z) < r).length;
const gNeed = (g, need) => Math.min(need || 4, gLive(g).length);
const gReady = (g, x, z, r, need) => gLive(g).length > 0 && gIn(g, x, z, r) >= gNeed(g, need);
// militia that can actually shoot into a spot: inside the radius and either seen or with a line of fire to it
const foesNear = (x, z, r) => them.filter(e => e.alive && Math.hypot(e.x - x, e.z - z) < r && (e.spotted || los(e.x, e.z, x, z))).length;
const usNear = (x, z, r) => us.filter(u => u.alive && Math.hypot(u.x - x, u.z - z) < r).length;
function ringAt(x, z, r, col){ const m = ovRing(r - .35, r, col || 0x7fb6ff, .8); m.position.set(x, .05, z); return grounded(m, .08); }

/* a wave that runs at a point, not at the squad */
/* ---- militia technicals: a pick-up with a heavy machine gun in the bed and a man on it ---- */
let TECHS = [];
const TECH_PIV = [.17, 1.0, -.85];
function techSpawn(pts, tag, o){
  o = o || {};
  const T_ = Object.assign(routeOf(pts), { s:0, v:0, vmax:o.vmax || 3.4, stopAt:o.stopAt || 0, holdT:0, alive:true, tag });
  const g = new T.Group(), body = new T.Group(), piv = new T.Group(); g.add(body); piv.position.set(...TECH_PIV); body.add(piv); world.add(g);
  withModel('tech', M_ => { if (!M_.fix){ M_.fix = true; M_.geos.gun.translate(-TECH_PIV[0], -TECH_PIV[1], -TECH_PIV[2]); M_.mat.color.setRGB(1.15, 1.1, 1.05); }
    const b = lodMesh(M_.geos.body, M_.mat); b.castShadow = b.receiveShadow = true; body.add(b);
    const q = new T.Mesh(M_.geos.gun, M_.mat); q.castShadow = true; piv.add(q); });
  T_.g = g; T_.body = body; T_.piv = piv;
  const p = polyAt(T_, 0); g.position.set(p[0], 0, p[1]); g.rotation.y = p[2];
  const e = foe(p[0], p[1], 'post', tag || 'tech', Object.assign({ name:'Ametrallador · técnica', burst:5, cool:.9, supp:30, acc:.2, hp:85, gun:'ak' }, o.gunner || {}));
  e.tech = T_; e.stance = 'stand'; e.elev = .62; T_.gunner = e;
  TECHS.push(T_); techStep(T_, 0); return T_;
}
function techStep(T_, dt){
  const e = T_.gunner;
  if (T_.alive && !e.alive){ T_.alive = false; T_.v = 0; emitters.push({ x:T_.g.position.x, z:T_.g.position.z, y:1, rate:30, life:6, vy:1.2, s0:.3, s1:1.4, fire:.3, sp:.5, acc:0, until:G.t + 40 }); }
  if (e.alive && (e.auto || e.firing > 0)) T_.holdT = G.t + 6;
  const want = T_.alive && G.t > T_.holdT ? clamp((T_.L - T_.stopAt - T_.s)*.8, 0, T_.vmax) : 0;
  T_.v += clamp(want - T_.v, -5*dt, 1.6*dt); if (T_.v < 0) T_.v = 0; T_.s = Math.min(T_.L, T_.s + T_.v*dt);
  const [x, z, hd] = polyAt(T_, T_.s), g = T_.g;
  g.position.set(x, T_.v > .3 ? Math.sin(G.t*14)*.02 : 0, z);
  let d = hd - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += dt > 0 ? d*Math.min(1, dt*3) : d;
  // the gunner stands in the bed behind the gun; the gun follows where he looks
  const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y), bx = TECH_PIV[0] - .05, bz = TECH_PIV[2] - .45;
  if (e.alive){ e.x = x + bx*c + bz*s; e.z = z - bx*s + bz*c; e.vx = e.vz = 0; e.path = []; if (!e.auto && !(e.firing > 0)) e.face = g.rotation.y; }
  let a = (e.alive ? e.face : g.rotation.y) - g.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); T_.piv.rotation.y += (a - T_.piv.rotation.y)*Math.min(1, dt*6);
}
// a technical that drives down the streets toward a point and stops short of it to fire
function techToward(sx, sz, gx, gz, tag, o){
  const a = nearestFree(Math.floor(sx), Math.floor(sz)), b = nearestFree(Math.floor(gx), Math.floor(gz)), path = findPath(a[0], a[1], b[0], b[1]);
  if (!path || path.length < 6) return null;
  const pts = [[a[0] + .5, a[1] + .5]].concat(path.filter((_, i) => i % 3 === 2 || i === path.length - 1).map(c => [c[0] + .5, c[1] + .5]));
  return techSpawn(pts, tag, Object.assign({ stopAt:14 }, o || {}));
}
// militia on the rooftops: they shoot from behind the parapet of the nearest free roof
function roofFoe(x, z, tag, extra){
  const cand = BLDS.filter(b => !b.ring && b.top > 1 && b.w >= 3 && b.d >= 3).map(b => [Math.hypot(b.x + b.w/2 - x, b.y + b.d/2 - z), b]).sort((p, q) => p[0] - q[0]).slice(0, 5);
  for (const [, b] of cand){ const slots = bSlots(b, 'roof'), used = new Set(them.filter(e => e.alive && e.inB && e.inB.b === b.id).map(e => e.inB.slot));
    const k = slots.findIndex((s_, i) => !used.has(i)); if (k < 0) continue;
    const e = foe(slots[k][0], slots[k][1], 'post', tag, Object.assign({}, CAMP_ESPEC, extra || {})), door = nearestFree(Math.floor(slots[k][0]), Math.floor(slots[k][1]));
    e.inB = { b:b.id, level:'roof', slot:k, door }; e.x = slots[k][0]; e.z = slots[k][1]; e.elev = b.top; e.stance = 'crouch'; e.roof = true; return e; }
  return null;
}
function waveGoal(cx, cz, ang, n, tag, dist, goal, who, extra){
  G.alert = true; dist = dist || 40;
  const bx = cx + Math.cos(ang)*dist, bz = cz + Math.sin(ang)*dist;
  for (let k=0;k<n;k++){ const e = foe(bx + rr(-4, 4), bz + rr(-4, 4), 'wave', tag, extra || CAMP_ESPEC); if (goal) e.goal = { x:goal.x + rr(-4, 4), z:goal.z + rr(-4, 4) }; }
  if (n >= 4 && !CINE.on && TECHS.filter(t => t.alive).length < 2 && rnd() < .3){ const T_ = techToward(bx, bz, goal ? goal.x : cx, goal ? goal.z : cz, tag); if (T_ && who !== false) sched.push({ at:G.t + 1.5, fn:() => say(who || 'Super 6-4', 'Una técnica con ametralladora pesada viene con ellos.', 'air', true), say:1 }); }
  const dir = compass(Math.cos(ang), Math.sin(ang));
  if (who !== false) say(who || 'Super 6-4', `Unos ${n} armados por el ${dir}, vienen hacia vosotros.`, 'air', true);
  autoPause('ataque desde el ' + dir);
}
/* a timed defence with waves from changing sides */
function holdWaves(text, secs, every, n, cx, cz, o){
  o = o || {};
  return { text, zone:{ x:cx, z:cz, r:o.r || 16 },
    start(){ G.holdEnd = G.t + secs; G.nextWave = G.t + (o.first || 15); G.waveN = 0; if (o.start) o.start(); },
    tick(){ if (G.t >= G.nextWave && G.t < G.holdEnd - 20){ G.nextWave = G.t + every; G.waveN++;
        waveGoal(cx, cz, rnd()*6.283, n + Math.min(4, G.waveN >> 1), 'hold', o.dist || 42, { x:cx, z:cz }, o.who); }
      if (o.tick) o.tick(); },
    count:() => 'quedan ' + fmtLeft(G.holdEnd - G.t), done:() => G.t >= G.holdEnd && (!o.done || o.done()), radio:o.radio, onDone:o.onDone };
}

/* ---------- vehicle columns: follow a route of streets, stop where they are told, the M2 gunners fight ---------- */
function routeOf(pts){ const cum = [0]; for (let k=1;k<pts.length;k++) cum.push(cum[k-1] + Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1])); return { pts, cum, L:cum[cum.length-1] }; }
const routeS = (C, x, z) => { let best = 0, bd = 1e9; for (let s=0;s<=C.L;s+=.5){ const p = polyAt(C, s), d = Math.hypot(p[0]-x, p[1]-z); if (d < bd){ bd = d; best = s; } } return best; };
function mkConvoy(kinds, pts, o){
  o = o || {}; const R_ = routeOf(pts);
  const C = Object.assign(R_, { s:o.s0 || 0, v:0, vmax:o.vmax || 2.3, gap:o.gap || 8.6, limit:o.limit != null ? o.limit : R_.L, go:!!o.go, veh:[], un:!!o.un, fire:o.fire !== false, name:o.name || 'Columna' });
  for (const k of kinds){ const v = k === 'un' ? unApc() : k === 'btr' ? btrVehicle() : irVehicle(k); v.kind = k; v.fireT = rr(0, 1); v.aim = 0; C.veh.push(v); }
  CONVOYS.push(C); convoyStep(C, 0); return C;
}
function convoyStep(C, dt){
  const lim = C.spread && C.limit >= C.L - .01 ? C.L + C.veh.length*C.gap + 2 : C.limit;   // spreading out: the column keeps feeding vehicles in
  const want = C.go ? clamp((lim - C.s)*.6, 0, C.vmax) : 0;
  C.v += clamp(want - C.v, -4*dt, 1.2*dt); if (C.v < 0) C.v = 0;
  C.s = Math.min(C.s + C.v*dt, Math.max(C.s, lim));
  const moving = C.v > .3;
  C.veh.forEach((v, i) => {
    if (v.own){ convoyOwn(v, C, dt); return; }
    if (C.spread && C.spread[i] && C.s - i*C.gap >= C.sGate && v.x != null){ v.own = { pts:[[v.x, v.z]].concat(C.spread[i]), k:1, sp:C.v }; convoyOwn(v, C, dt); return; }
    const [x, z, hd] = polyAt(C, C.s - i*C.gap); if (v.x != null){ const mx = x - v.x, mz = z - v.z, ml = Math.hypot(mx, mz); if (ml > 1e-4){ v.fx = mx/ml; v.fz = mz/ml; } } v.x = x; v.z = z;
    v.g.position.set(x, moving ? Math.sin(G.t*13 + i)*.02 : 0, z);
    let d = hd - v.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.g.rotation.y += dt > 0 ? d*Math.min(1, dt*3) : d;
    if (moving) for (let j=Math.floor(z - 1.6); j<=Math.floor(z + 1.6); j++) for (let i2=Math.floor(x - 1.6); i2<=Math.floor(x + 1.6); i2++){
      if (!inB(i2, j)) continue; const o = cov[idx(i2, j)]; if (o && o.kind !== 'fountain' && o.kind !== 'wreck' && !o.barricade) destroyCover(o); }
    if (v.piv && C.fire && dt > 0) convoyGun(v, dt, C.gunKill == null ? .25 : C.gunKill);
  });
}
function convoyOwn(v, C, dt){
  const O = v.own; if (O.k >= O.pts.length){ v.g.position.y = 0; return; }
  const [tx, tz] = O.pts[O.k], dx = tx - v.x, dz = tz - v.z, L = Math.hypot(dx, dz), last = O.k === O.pts.length - 1;
  if (L < (last ? .12 : 1.0)){ O.k++; return; }
  const want = last ? Math.min(C.vmax, L*.5 + .15) : C.vmax; O.sp += clamp(want - O.sp, -4*dt, 1.2*dt); if (O.sp < 0) O.sp = 0;
  const st = Math.min(L, O.sp*dt); v.x += dx/L*st; v.z += dz/L*st;
  v.g.position.set(v.x, O.sp > .3 ? Math.sin(G.t*13)*.02 : 0, v.z);
  let d = Math.atan2(dx, dz) - v.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.g.rotation.y += dt > 0 ? d*Math.min(1, dt*2.6) : d;
}
function convoyGun(v, dt, kill){
  v.fireT -= dt; let tgt = null, bd = 30;
  for (const e of them){ if (!e.alive) continue; const d = Math.hypot(e.x - v.x, e.z - v.z); if (d < bd && los(v.x, v.z, e.x, e.z)){ bd = d; tgt = e; } }
  if (!tgt) return;
  const want = Math.atan2(tgt.x - v.x, tgt.z - v.z) - v.g.rotation.y; let d = want - v.aim; d = Math.atan2(Math.sin(d), Math.cos(d)); v.aim += clamp(d, -dt*2.5, dt*2.5); v.piv.rotation.y = v.aim;
  if (v.fireT <= 0 && Math.abs(d) < .25){ v.fireT = rr(.5, .9);
    const s = Math.sin(v.g.rotation.y + v.aim), c = Math.cos(v.g.rotation.y + v.aim), mx = v.x + s*1.1, mz = v.z + c*1.1;
    for (let k=0;k<3;k++){ tracer(mx, 2.15, mz, tgt.x + rr(-.6, .6), .3 + rnd()*.9, tgt.z + rr(-.6, .6), 0xff7a3a, k*.08);
      sched.push({ at:G.t + k*.08, fn:() => { flash(mx + s*.25, 2.15, mz + c*.25, true); if (chunkMesh){ const b = spawnChunk(v.x - s*.2, 2.2, v.z - c*.2, c*rr(1.4, 2.2), rr(1.2, 2), -s*rr(1.4, 2.2), .025, 0x8a7848, 'splinter'); if (b) b.brass = true; } } }); }
    for (let q=0;q<3;q++) sched.push({ at:G.t + q*.08 + .001, fn:() => { if (q === 0) sfx('m2', v.x, v.z, null, 3); } }); addNoise(v.x, v.z, 30); tgt.sup = Math.min(100, tgt.sup + 30);
    if (rnd() < kill) sched.push({ at:G.t + .15, fn:() => { if (tgt.alive) damage(tgt, 45 + rnd()*30, null); } }); }
}
/* the white UN armour that came for them in the night: a wheeled APC, built from boxes */
let APC_GEO = null;
function apcGeo(){
  if (APC_GEO) return APC_GEO;
  const L = [], WH = 0xe6e4dc, WH2 = 0xc9c7bf, BK = 0x1c1c1a;
  L.push([2.5, 1.25, 5.4, 0, 1.25, 0, WH]);                                  // hull
  L.push([2.3, .5, 1.3, 0, 1.55, 2.95, WH2, -.55]);                          // sloped glacis
  L.push([2.36, .14, 5.2, 0, 1.92, -.1, WH2]);                               // roof plate

  for (const s of [-1, 1]){
    for (const z of [-1.7, 0, 1.7]){ L.push([1.0, .38, 0, s*1.2, .5, z, BK, 0,0,PH, 'c']); L.push([.5, .4, 0, s*1.21, .5, z, 0x5a5a56, 0,0,PH, 'c']); }
  }
  L.push([.04, .5, .9, 0, 1.2, -2.72, WH2]);                                 // rear door
  APC_GEO = partGeo(L); return APC_GEO;
}
let UN_TEX = null;
function unLetters(){
  if (UN_TEX) return UN_TEX;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#141414'; x.font = '900 54px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('UN', 64, 35);
  UN_TEX = new T.CanvasTexture(c); return UN_TEX;
}
let BTR_TUR = null, BTR_SPLIT = null, BTR_TG = null;
// the hull's triangles round the turret ring, cut out so they can take the white paint
function btrSplit(src){
  if (BTR_SPLIT) return BTR_SPLIT;
  const P_ = src.attributes.position, I_ = src.index ? src.index.array : [...Array(P_.count).keys()], keep = [], ring = [];
  for (let t=0;t<I_.length;t+=3){ let inR = true, cx = 0, cz = 0;
    for (let q=0;q<3;q++){ const v = I_[t + q]; cx += (P_.getX(v) - BTR_PIV[0])/3; cz += (P_.getZ(v) - BTR_PIV[2])/3; if (P_.getY(v) < BTR_PIV[1] - .9) inR = false; }
    if (Math.hypot(cx, cz) > .95) inR = false;
    (inR ? ring : keep).push(I_[t], I_[t+1], I_[t+2]); }
  const mk = ix => { const g = new T.BufferGeometry(); for (const k in src.attributes) g.setAttribute(k, src.attributes[k]); g.setIndex(ix); g.computeBoundingSphere(); return g; };
  return (BTR_SPLIT = [mk(keep), mk(ring)]);
}
function btrVehicle(){
  const g = new T.Group(), body = new T.Group(); body.scale.setScalar(1/1.5); g.add(body); world.add(g);
  const piv = new T.Group(); piv.position.set(BTR_PIV[0], BTR_PIV[1], BTR_PIV[2]); body.add(piv);
  withModel('btr', M_ => { if (!M_.lit){ M_.lit = true; M_.mat.color.setRGB(.9, .9, .88); }
    if (!BTR_TUR){ BTR_TUR = M_.mat.clone(); BTR_TUR.map = whiteMap(M_.mat.map, true); BTR_TUR.color.setRGB(1, 1, 1); BTR_TUR.vertexColors = false; BTR_TUR.needsUpdate = true; }   // the turret painted white like the hull
    const [gb, gr] = btrSplit(M_.geos.body);
    const q = lodMesh(gb, M_.mat); q.castShadow = true; q.receiveShadow = true; body.add(q);
    const rg = new T.Mesh(gr, M_.mat); rg.castShadow = rg.receiveShadow = true; body.add(rg);
    if (!BTR_TG){ BTR_TG = M_.geos.turret.clone(); BTR_TG.deleteAttribute('normal'); BTR_TG.computeVertexNormals(); }   // its stored normals came out dark
    const t = new T.Mesh(BTR_TG, BTR_TUR); t.castShadow = true; piv.add(t); });
  // the black UN on both flanks
  const mat = new T.MeshBasicMaterial({ map:unLetters(), transparent:true, depthWrite:false, side:T.DoubleSide }), geo = new T.PlaneGeometry(1.5, .75);

  return { g, piv, kind:'btr' };
}
function unApc(){
  const g = new T.Group(), body = new T.Group(); body.scale.setScalar(1/1.5); g.add(body); world.add(g);
  const m = new T.Mesh(apcGeo(), heliMat); m.castShadow = true; m.receiveShadow = true; body.add(m);
  return { g, piv:null, kind:'un' };
}
/* barricades: tyres, junk and a burnt car across a street, burning; they block until the troops clear them */
function barricade(x, z, dir, tag, solid){
  const g = new T.Group(); world.add(g);
  const cells = [], o = { kind:'barricade', val:.7, cells, i:Math.floor(x), j:Math.floor(z), g, barricade:tag };
  const tire = new T.CylinderGeometry(.34, .34, .16, 10), tm = lmat(0x1f1e1c), jm = [lmat(0x6a5a48), lmat(0x3a3430), lmat(0x8a7a62), lmat(0x5a4a3a)];
  for (let k=-4;k<=4;k++){
    const i = Math.floor(x + (dir === 'x' ? k : 0)), j = Math.floor(z + (dir === 'z' ? k : 0));
    if (!inB(i, j) || grid[idx(i, j)] === 1) continue;
    const kk = idx(i, j); if (cov[kk]) destroyCover(cov[kk]);
    cells.push(kk); grid[kk] = solid ? 1 : 2; cov[kk] = o; topH[kk] = .8;
    for (let n=0;n<3+ri(2);n++){ const m = new T.Mesh(tire, tm); m.position.set(i + .5 + rr(-.1, .1), .09 + n*.16, j + .5 + rr(-.1, .1)); m.castShadow = true; g.add(m); }
    if (rnd() < .6){ const m = new T.Mesh(UBOX, pick(jm)); m.scale.set(rr(.3, .9), rr(.2, .7), rr(.3, .9)); m.position.set(i + .5 + rr(-.3, .3), .3, j + .5 + rr(-.3, .3)); m.rotation.y = rnd()*3; m.castShadow = true; g.add(m); }
  }
  const em = { x, z, y:.9, rate:42, life:11, vy:1.5, s0:.5, s1:2.6, fire:.55, acc:0, sp:.9 }; emitters.push(em); o.em = em;
  return { x, z, o, em, cleared:false };
}
function clearBarricade(b){ if (b.cleared) return; b.cleared = true; destroyCover(b.o); b.em.until = G.t + .01; }

/* ---------- scripted aircraft: keyframes in time; they fly, hover, set down, fall ---------- */
function scriptHeli(kind, keys, o){
  const h = kind === 'lb' ? littleBird() : makeHeliObj(); if (kind === 'lb') world.add(h.g);
  const k0 = keys[0];
  const S = Object.assign({ h, kind, keys, t:0, k:0, yaw:k0.yaw != null ? k0.yaw : 0, spin:0, x:k0.x, y:k0.y, z:k0.z, smoke:null, rope:null }, o || {});
  h.g.position.set(S.x, S.y, S.z); SCRIPTED.push(S); startRotorSound(); return S;
}
function scriptStep(dt){
  for (let n=SCRIPTED.length-1; n>=0; n--){
    const S = SCRIPTED[n]; S.t += dt;
    const K = S.keys;
    while (S.k < K.length - 1 && S.t >= K[S.k + 1].t){ S.k++; if (K[S.k].ev) K[S.k].ev(S); }
    if (S.gone){ world.remove(S.h.g); if (S.rope) world.remove(S.rope); if (S.smoke) S.smoke.until = G.t + .01; SCRIPTED.splice(n, 1); continue; }
    const a = K[S.k], b = K[Math.min(S.k + 1, K.length - 1)];
    const px = S.x, pz = S.z;
    if (S.spline && b !== a){ const lf = clamp((S.t - a.t)/Math.max(.01, b.t - a.t), 0, 1), p0 = K[Math.max(0, S.k - 1)], p3 = K[Math.min(K.length - 1, S.k + 2)];
      const cr = (q0, q1, q2, q3) => .5*((2*q1) + (-q0 + q2)*lf + (2*q0 - 5*q1 + 4*q2 - q3)*lf*lf + (-q0 + 3*q1 - 3*q2 + q3)*lf*lf*lf);
      S.x = cr(p0.x, a.x, b.x, p3.x); S.y = Math.max(0, cr(p0.y, a.y, b.y, p3.y)); S.z = cr(p0.z, a.z, b.z, p3.z); }
    else { const f = b === a ? 1 : sstep(0, 1, (S.t - a.t)/Math.max(.01, b.t - a.t)); S.x = a.x + (b.x - a.x)*f; S.y = a.y + (b.y - a.y)*f; S.z = a.z + (b.z - a.z)*f; }
    const vx = (S.x - px)/Math.max(dt, 1e-4), vz = (S.z - pz)/Math.max(dt, 1e-4), sp = Math.hypot(vx, vz);
    if (S.spin) S.yaw += S.spin*dt;
    else if (sp > 1.2){ let d = Math.atan2(vx, vz) - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d*Math.min(1, dt*(S.turn || 2.2)); }
    else if (a.yaw != null){ let d = a.yaw - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d*Math.min(1, dt*1.5); }
    S.h.g.position.set(S.x, S.y, S.z);
    S.h.g.rotation.set(clamp(sp*.01, 0, .18) + (S.tilt || 0), S.yaw, (S.spin ? Math.sin(S.t*3)*.15 : 0), 'YXZ');
    if (S.h.rotor) S.h.rotor.rotation.y += dt*17;
    if (S.h.tail && !S.noTail) S.h.tail.rotation.x += dt*42;
    if (S.y < 16) rotorWash(S.x, S.z, Math.max(S.y, .5), dt, .9);
    if (S.smoke){ S.smoke.x = S.x; S.smoke.z = S.z; S.smoke.y = S.y + 2; }
    if (S.rope){ S.rope.position.set(S.x + Math.sin(S.yaw + PH)*1.0, S.y + 1.6, S.z + Math.cos(S.yaw + PH)*1.0); S.rope.scale.y = Math.max(.1, S.y + 1.6); }
  }
}
/* men sliding down a rope from a hovering helicopter, one after another */
function fastRope(S, g, specs, gap){
  S.rope = ropeMesh();
  specs.forEach((sp, k) => sched.push({ at:G.t + .4 + k*(gap || 1.1), fn:() => {
    const rx_ = S.x + Math.sin(S.yaw + PH)*1.0, rz_ = S.z + Math.cos(S.yaw + PH)*1.0, u = addMember(g, sp, rx_ + rr(-.6, .6), rz_ + rr(-.6, .6));
    u.slide = true; u.elev = Math.max(0, S.y + 1.2); u.stance = 'stand'; u.ropeV = .6;
    if (walk(Math.floor(rx_), Math.floor(rz_))){ u.face = rnd()*6.283; u.x = rx_ - Math.sin(u.face)*.13; u.z = rz_ - Math.cos(u.face)*.13; }
    if (k === specs.length - 1) sched.push({ at:G.t + 3, fn:() => { if (S.rope){ world.remove(S.rope); S.rope = null; } G.m.roped = true; } });
    buildCards();
  } }));
}

/* ---------- the convoy's military symbol: a NATO frame over the column, seen from anywhere, never selectable ---------- */
const NATO_BLUE = '#5c8fca', NATO_BLUE_SEL = '#9cc2ec';
function natoTex(label, inf){
  const c = document.createElement('canvas'); c.width = 96; c.height = 84; const x = c.getContext('2d');
  x.fillStyle = NATO_BLUE; x.strokeStyle = '#0b0f14'; x.lineWidth = 4;
  x.fillRect(10, 8, 76, 48); x.strokeRect(10, 8, 76, 48);
  x.lineWidth = 3; x.beginPath(); x.moveTo(10, 8); x.lineTo(86, 56); x.moveTo(86, 8); x.lineTo(10, 56); x.stroke();   // infantry
  if (!inf){ x.beginPath(); x.moveTo(48, 8); x.lineTo(48, 56); x.stroke(); }                                        // motorised
  x.font = '700 17px "Barlow Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; label = L(label);
  x.lineWidth = 4; x.strokeStyle = 'rgba(10,12,16,.85)'; x.strokeText(label, 48, 72); x.fillStyle = '#e8f4ff'; x.fillText(label, 48, 72);
  const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; return t;
}
const SYM_TEX = {};
let convSyms = [];
function convoyLists(){
  const L = [];
  for (const C of CONVOYS) if (C.veh.length) L.push([C.veh.map(v => [v.g.position.x, v.g.position.z]), C.un ? 'ONU' : (C.label || 'ROMEO 6-4')]);
  if (IRN.convoy) L.push([IRN.convoy.map(v => [v.g.position.x, v.g.position.z]), 'ROMEO 6-4']);
  if (FLIGHT.on && FLIGHT.convoy && !FLIGHT.attract) L.push([FLIGHT.convoy.map(v => [v.g.position.x, v.g.position.z]), 'ROMEO 6-4']);
  if (G && G.m && G.m.syms) for (const s of G.m.syms){ const p = s.pts(); if (p.length) L.push([p, s.label, true]); }   // infantry the player does not command
  return L;
}
function updConvoySyms(){
  const L = (MIS && MIS.id === 'attract') || CINE.on ? [] : convoyLists(), s = halfH()*.16;
  while (convSyms.length < L.length){ const sp = new T.Sprite(new T.SpriteMaterial({ depthTest:false, depthWrite:false, transparent:true })); overlay.add(sp); convSyms.push(sp); }
  convSyms.forEach((sp, k) => {
    if (!sp.parent) overlay.add(sp);
    const e = L[k]; sp.visible = !!e; if (!e) return;
    const lab = e[1], key = lab + (e[2] ? '|i' : ''); if (!SYM_TEX[key]) SYM_TEX[key] = natoTex(lab, e[2]); if (sp.material.map !== SYM_TEX[key]){ sp.material.map = SYM_TEX[key]; sp.material.needsUpdate = true; }
    const cx = e[0].reduce((a, p) => a + p[0], 0)/e[0].length, cz = e[0].reduce((a, p) => a + p[1], 0)/e[0].length;
    sp.position.set(cx, 4.5 + s*.6, cz); sp.scale.set(s*1.14, s, 1); sp.material.opacity = .92;
  });
}

/* ---------- wounded men laid out by the crash, waiting ---------- */
function woundedAt(x, z, n){
  const out = [];
  for (let k=0;k<n;k++){ const c = findWalk(x + (k%2)*1.1, z + (k>>1)*1.2), rig = buildRig(k % 3 ? 'ranger' : 'delta', { gun:'m16' });
    const d = irDecor(rig, c[0] + .5, c[1] + .5, rnd()*6.28, { alive:false, down:true, look:null }); rig.gun.visible = false; out.push(d); }
  G.m.wounded = out; return out;
}

/* ---------- mounting the vehicles when the column pulls out ---------- */
function mount(u){ u.mounted = true; u.alive = false; u.down = false; u.path = []; u.order = null; G.sel.delete(u); if (u.inB) leaveB(u); world.remove(u.m.root); dropOverlay(u); units = units.filter(o => o !== u); }
function mountNear(C){
  for (const u of us){
    if (u.mounted || (!u.alive && !u.down)) continue;
    const v = C.veh.find(v => Math.hypot(v.x - u.x, v.z - u.z) < 3.8); if (!v) continue;
    if (u.alive && !u.inB) mount(u);
    else if (u.down && us.some(o => o.alive && Math.hypot(o.x - u.x, o.z - u.z) < 2.2)) mount(u);
  }
}

/* ---------------------------------- the missions ---------------------------------- */
const MISSIONS = {};
const D_B = 'Kilo 1-1';

/* ---- 2 · Calle Hawlwadig ---- */
/* ---------- in-mission cinematics: the HUD goes, the camera orbits a point the player can turn around, a script runs in game time ---------- */
let CINE = { on:false };
function cineStart(o){
  CINE = Object.assign({ on:true, t:0, k:0, uyaw:0, uz:1, yaw0:camS.yaw, keys:[], dur:1e9, zoom:11, spin:.025, block:true }, o);
  document.body.classList.add('cine'); $('bSkip').hidden = false; $('bSkip').textContent = 'Saltar escena'; $('flyUnits').innerHTML = '';
  $('cine').hidden = !o.text; if (o.text) cineText(o.text);
  G.sel = new Set(); closeCtx(); setMode('move'); openMap(false);
}
function cineStep(dt){
  if (!CINE.on) return; CINE.t += dt;
  const K = CINE.keys; while (CINE.k < K.length && CINE.t >= K[CINE.k].t){ const e = K[CINE.k++]; if (e.text){ $('cine').hidden = false; cineText(e.text); } if (e.fn) e.fn(); }
  if (CINE.tick) CINE.tick(dt);
  if (CINE.k >= K.length && CINE.t >= CINE.dur) cineEnd();
}
function cineEnd(){
  if (!CINE.on) return; const f = CINE.onEnd; CINE.on = false;
  document.body.classList.remove('cine'); $('bSkip').hidden = true; $('cine').hidden = true; $('bSkip').textContent = 'Saltar vuelo';
  if (f) f();
}
function cineCam(rdt){
  const f = CINE.focus ? CINE.focus() : [camS.tx, camS.tz, 0], a = Math.min(1, rdt*2.2);
  // a point in the air shows up higher on screen than its spot on the ground: aim at where it appears, then frame it a little below the middle
  const k = f[3] ? 0 : (f[2] || 0)/Math.tan(camS.pitch) + .3*halfH()/Math.sin(camS.pitch), c = [f[0] - Math.sin(camS.yaw)*k, f[1] - Math.cos(camS.yaw)*k];
  camS.tx += (c[0] - camS.tx)*a; camS.tz += (c[1] - camS.tz)*a;
  camS.zoomT = clamp((CINE.zoom || 11)*CINE.uz, 4, 30); camS.yawT = CINE.yaw0 + CINE.uyaw + CINE.t*CINE.spin;
}
function cineSkip(){ let n = 0; while (CINE.on && !G.over && n++ < 30*150) step(1/30); CHAT.q = []; }
function goTo(u, x, z){ const c = nearestFree(Math.floor(x), Math.floor(z)), p = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z); u.path = p || []; u.order = { type:'move' }; u.stance = 'stand'; }

/* an RPG: a smoking streak from the launcher to its target, then whatever the hit does */
let RPGS = [];
function fireRPG(from, to, onHit){
  const R = new T.Group(), mk = (mat, sx, sy, sz, z) => { const m = new T.Mesh(UBOX, mat); m.scale.set(sx, sy, sz); m.position.z = z; R.add(m); return m; };
  mk(rkMats.body, .09, .09, .6, -.05); mk(rkMats.head, .16, .16, .24, .32); mk(rkMats.fin, .24, .015, .08, -.32); mk(rkMats.fin, .015, .24, .08, -.32);
  const fl = mk(rkMats.flame, .12, .12, .3, -.5);
  from.face = Math.atan2(to.x - from.x, to.z - from.z); from.firing = .8; from.stance = 'crouch';
  const y0 = (from.elev || 0) + 1.5;
  rpgBackblast(from.x, y0, from.z, from.face); rpgSnd(from.x, from.z, false);
  const b = typeof to.pos === 'function' ? to.pos() : [to.x, to.y, to.z];
  R.position.set(from.x, y0, from.z); world.add(R);
  const Lt = trL[trHead = (trHead + 1) % TRL_N]; Lt.color.setHex(0xffa040); Lt.userData.owner = R;
  RPGS.push({ m:R, fl, L:Lt, a:[from.x, y0, from.z], to, t:0, sp:0, dur:Math.max(1.1, Math.hypot(b[0] - from.x, b[1] - y0, b[2] - from.z)/24), onHit });
}
function updRPGs(dt){
  for (let k=RPGS.length-1; k>=0; k--){ const r = RPGS[k]; r.t += dt; const f = Math.min(1, r.t/r.dur), b = typeof r.to.pos === 'function' ? r.to.pos() : [r.to.x, r.to.y, r.to.z];
    const x = r.a[0] + (b[0] - r.a[0])*f, y = r.a[1] + (b[1] - r.a[1])*f, z = r.a[2] + (b[2] - r.a[2])*f;
    const px = r.m.position.x, py = r.m.position.y, pz = r.m.position.z;
    r.m.position.set(x, y, z); r.m.lookAt(b[0], b[1], b[2]); r.m.rotateZ(r.t*14);
    r.fl.scale.z = .25 + rnd()*.15;
    // a thick white trail laid all along the path flown this frame, with sparks from the motor
    const D = Math.hypot(x - px, y - py, z - pz); r.sp += D*9;
    while (r.sp > 1){ r.sp -= 1; const q = rnd(), sx = px + (x - px)*q, sy = py + (y - py)*q, sz = pz + (z - pz)*q;
      spawnP(sx + rr(-.06,.06), sy + rr(-.06,.06), sz + rr(-.06,.06), rr(-.3,.3), rr(.05,.4), rr(-.3,.3), rr(3.5, 5.5), rr(.3,.42), rr(1.6,2.4), jit(0xd6d2ca,.04), 0x8a857c, 1, 0, 0);
      if (rnd() < .4) spawnP(sx, sy, sz, rr(-1,1), rr(-1,1), rr(-1,1), rr(.1,.2), rr(.2,.3), .05, pick([0xffe7a0,0xffc050]), 0xff6020, 1, 1, 0); }
    if (r.L && r.L.userData.owner === r.m){ r.L.position.set(x, y, z); r.L.intensity = (3 + nightF*3)*(.85 + rnd()*.3); r.L.distance = 9 + nightF*4; }
    if (f >= 1){ world.remove(r.m); RPGS.splice(k, 1); if (r.L && r.L.userData.owner === r.m){ r.L.intensity = 0; r.L.userData.owner = null; }
      // the burst in the air: a flash, a big fireball, sparks, a black puff and pieces falling away
      lightFlash(b[0], b[1], b[2], 0xffa040, 12, 22, 1.1); rpgSnd(b[0], b[2], true); sfx('boom', b[0], b[2]);
      for (let q=0;q<30;q++){ const a = rnd()*6.28, s = rr(.3, 1.6); spawnP(b[0], b[1], b[2], Math.cos(a)*s, rr(-.4, 1.2), Math.sin(a)*s, rr(.4, .7), rr(1.1, 1.8), .4, pick([0xfff6d0,0xffe7a0,0xffd060]), 0xe0601a, 1, 1, 0); }
      for (let q=0;q<90;q++){ const a = rnd()*6.28, s = rr(1, 6); spawnP(b[0], b[1], b[2], Math.cos(a)*s, rr(-2, 3), Math.sin(a)*s, rr(.3, .8), rr(.35, .7), .1, pick([0xffe7a0, 0xffc050, 0xff9030]), 0xc0301a, 1, 1, 6); }
      for (let q=0;q<40;q++){ const a = rnd()*6.28, s = rr(5, 11); spawnP(b[0], b[1], b[2], Math.cos(a)*s, rr(-3, 4), Math.sin(a)*s, rr(.4, .9), rr(.05,.08), .02, pick([0xfff4c0,0xffe080]), 0xff6a20, 1, 1, 9); }
      for (let q=0;q<45;q++){ const a = rnd()*6.28, s = rr(.5, 2.4); spawnP(b[0] + rr(-.4,.4), b[1] + rr(-.3,.3), b[2] + rr(-.4,.4), Math.cos(a)*s, rr(-.2, 1), Math.sin(a)*s, rr(3, 5.5), rr(.5,.8), rr(2,3.2), jit(0x26221e,.12), 0x6a6258, 1, 0, 0); }
      for (let q=0;q<16;q++) spawnChunk(b[0], b[1], b[2], rr(-5,5), rr(-1,4), rr(-5,5), rr(.06,.16), pick([0x3a3d33, 0x2a2a26, 0x4a4a44, 0x5a5e50]), 'flake');
      if (r.onHit) r.onHit(); } }
}



/* ---- militia RPG gunners: one in twenty. 15% to hit, 30 s to reload; the rocket trails smoke and light, the blast throws big and small debris ---- */
function rpgEligible(s){
  if (!s || s.dummy || s.noRpg || window.__noRPG || s.tag === 'rpg' || /técnica/.test(s.name || '')) return false;
  let id = null; try { id = MIS && MIS.id; } catch (e){} if (id === 'tutorial' || id === 'attract') return false;
  return (s.look || 'militia') === 'militia';
}
function rpgThink(u, dt, moving){
  if (G.m && G.m.noRpgUntil && G.t < G.m.noRpgUntil){ u.rpgAim = 0; return; }
  if (!u.rpgLoaded){
    if (!u.reloading && G.t >= u.rpgReady - 2.5){ if (u.rpgRel){ u.rpgLoaded = true; u.rpgRel = false; } else { u.reloading = true; u.reloadT = 0; reloadSnd(u); u.reloadDur = 2.5; u.rpgRel = true; } }
    return; }
  const t = u.auto;
  if (u.pinned || u.noFire || !t || !t.alive){ u.rpgAim = 0; return; }
  const d = dist(u, t); if (d < 4.5 || d > RANGE + 4){ u.rpgAim = 0; return; }
  if (moving){ u.path = []; u.vx = u.vz = 0; u.nextMove = G.t + 4; u.thinkT = 3; u.stance = 'crouch'; return; }   // a loaded gunner with a target stops to take the shot
  u.face = Math.atan2(t.x - u.x, t.z - u.z);
  u.rpgAim = (u.rpgAim || 0) + dt; if (u.rpgAim < 1.3) return;       // a moment on the shoulder before the shot, so it can be seen coming
  u.rpgAim = 0; u.rpgLoaded = false; u.rpgReady = G.t + 30; rpgFire(u, t);
}
const _rq = new T.Vector3();
const rkMats = { body:new T.MeshLambertMaterial({ color:0x3d4232 }), head:new T.MeshLambertMaterial({ color:0x58623e }), fin:new T.MeshLambertMaterial({ color:0x2a2a26 }), flame:new T.MeshBasicMaterial({ color:0xffc860, fog:false }) };
function rpgFire(s, t){
  const hit = rnd() < .15;
  let o = s.m && s.m.gun ? s.m.gun.localToWorld(_rq.set(0, .1, .6)) : null;
  const ox = o && isFinite(o.x) ? o.x : s.x + Math.sin(s.face)*.5, oy = o && isFinite(o.y) ? o.y : (s.elev || 0) + 1.45, oz = o && isFinite(o.z) ? o.z : s.z + Math.cos(s.face)*.5;
  const ty = (t.elev || 0) + (t.stance === 'prone' ? .25 : t.stance === 'crouch' ? .6 : .85);
  let ax, ay, az;
  if (hit){ ax = t.x; ay = ty; az = t.z; }
  else { const a = rnd()*Math.PI*2, r = rr(4, 7.5); ax = t.x + Math.cos(a)*r; az = t.z + Math.sin(a)*r; ay = Math.max(.15, ty + rr(-.6, 1.4)); }
  const L = Math.hypot(ax - ox, ay - oy, az - oz) || 1, sk = Math.min(1.4, L*.5);   // the trace starts past the gunner's own sandbags
  let h = traceShot(ox + (ax - ox)/L*sk, oy + (ay - oy)/L*sk, oz + (az - oz)/L*sk, ax, ay, az, hit ? 0 : 30), direct = null;
  if (hit && (!h || Math.hypot(h.x - ox, h.y - oy, h.z - oz) > L - .6)){ direct = t; h = { x:ax, y:ay, z:az, nx:-(ax - ox)/L, ny:0, nz:-(az - oz)/L, m:-2, c:0x8a7a62, e:null, dx:(ax - ox)/L, dy:(ay - oy)/L, dz:(az - oz)/L }; }
  if (!h){ const f = (L + 30)/L, ex = ox + (ax - ox)*f, ez = oz + (az - oz)*f; h = { x:ex, y:0, z:ez, nx:0, ny:1, nz:0, m:-1, c:groundCol(ex, ez), e:null, dx:(ax - ox)/L, dy:0, dz:(az - oz)/L }; }
  launchRocket(ox, oy, oz, h, s, direct);
  // launch: flash at the muzzle, the back-blast kicking dust and smoke out behind the shooter
  s.firing = .9; s.cool = 1;
  rpgBackblast(ox, oy, oz, s.face);
  rpgSnd(ox, oz, false); sfx('ak', ox, oz); addNoise(s.x, s.z, 40); G.alert = true;
  if (t.team === 'us'){ t.sup = Math.min(100, t.sup + 30);
    if (G.t - rpgCallT > 5){ rpgCallT = G.t; const c = us.filter(u => u.alive && !u.npc).sort((p, q) => dist(p, s) - dist(q, s))[0];
      if (c) radio(c, pick(['¡RPG!', '¡RPG, RPG!', '¡Cohete! ¡Cubríos!', '¡RPG en el tejado!'].slice(0, s.roof ? 4 : 3))); logMsg('¡RPG! Lanzacohetes de la milicia.', 'bad'); } }
}
function rpgBackblast(ox, oy, oz, face){
  const bx = -Math.sin(face), bz = -Math.cos(face), rx = ox + bx*.9, rz = oz + bz*.9;
  lightFlash(ox, oy, oz, 0xffc070, 5 + nightF*3, 9 + nightF*3, .3);
  for (let k=0;k<26;k++){ const v = rr(2, 6); spawnP(rx, oy - .1, rz, (bx + rr(-.45,.45))*v, rr(-.3,.6)*v*.3, (bz + rr(-.45,.45))*v, rr(.15,.35), rr(.18,.3), .06, pick([0xffe7a0,0xffc050]), 0xc0501a, 1, 1, 0); }
  for (let k=0;k<44;k++){ const v = rr(1, 4.5); spawnP(rx, Math.max(.1, oy - .3), rz, (bx + rr(-.7,.7))*v, rr(0,.5)*v, (bz + rr(-.7,.7))*v, rr(1.4, 3), rr(.2,.35), rr(.9,1.6), jit(0xbcae94,.06), 0xd2c8b4, rr(.6,.9), 0, 0); }
}
// a rocket in flight from (ox,oy,oz) to the hit h; a scripted shot can aim it anywhere (past a helicopter, say) and it bursts on whatever is behind
function rocketAt(ox, oy, oz, tx, ty, tz, src){
  const L = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
  let h = traceShot(ox + (tx - ox)/L*1.4, oy + (ty - oy)/L*1.4, oz + (tz - oz)/L*1.4, tx, ty, tz, 60);
  if (!h){ const f = (L + 60)/L, ex = ox + (tx - ox)*f, ez = oz + (tz - oz)*f; h = { x:ex, y:0, z:ez, nx:0, ny:1, nz:0, m:-1, c:groundCol(ex, ez), e:null, dx:(tx - ox)/L, dy:0, dz:(tz - oz)/L }; }
  launchRocket(ox, oy, oz, h, src || null, null); rpgBackblast(ox, oy, oz, Math.atan2(tx - ox, tz - oz)); rpgSnd(ox, oz, false);
}
function launchRocket(ox, oy, oz, h, s, direct){
  const R = new T.Group(), mk = (mat, sx, sy, sz, z) => { const m = new T.Mesh(UBOX, mat); m.scale.set(sx, sy, sz); m.position.z = z; R.add(m); return m; };
  mk(rkMats.body, .06, .06, .42, -.05); mk(rkMats.head, .11, .11, .17, .24); mk(rkMats.head, .05, .05, .08, .36); mk(rkMats.fin, .16, .01, .06, -.24); mk(rkMats.fin, .01, .16, .06, -.24);
  const fl = mk(rkMats.flame, .07, .07, .16, -.36);
  R.position.set(ox, oy, oz); R.lookAt(h.x, h.y, h.z); world.add(R);
  const D = Math.hypot(h.x - ox, h.y - oy, h.z - oz), Lt = trL[trHead = (trHead + 1) % TRL_N]; Lt.color.setHex(0xffa040); Lt.userData.owner = R;
  ROCKETS.push({ R, fl, L:Lt, a:[ox, oy, oz], h, t:0, dur:Math.max(.12, D/30), D, src:s, direct, sp:0 });
}
function updRockets(dt){
  for (let k=ROCKETS.length-1; k>=0; k--){ const r = ROCKETS[k]; r.t += dt;
    const f = Math.min(1, r.t/r.dur), h = r.h;
    const x = r.a[0] + (h.x - r.a[0])*f, y = r.a[1] + (h.y - r.a[1])*f, z = r.a[2] + (h.z - r.a[2])*f;
    r.R.position.set(x, y, z); r.R.rotateZ(dt*14);
    r.fl.scale.z = .12 + rnd()*.1; r.fl.scale.x = r.fl.scale.y = .06 + rnd()*.03;
    // smoke trail: a thick ribbon close behind, thinning and drifting as it ages
    r.sp += dt*170;
    const dx = (h.x - r.a[0])/r.D, dy = (h.y - r.a[1])/r.D, dz = (h.z - r.a[2])/r.D;
    while (r.sp > 1){ r.sp -= 1; const b = rnd()*dt*30, px = x - dx*(.35 + b), py = y - dy*(.35 + b), pz = z - dz*(.35 + b);
      spawnP(px + rr(-.04,.04), py + rr(-.04,.04), pz + rr(-.04,.04), rr(-.25,.25), rr(.05,.35), rr(-.25,.25), rr(3, 5), rr(.22,.3), rr(1.3,1.9), jit(0xa8a49c,.04), 0x84807a, 1, 0, 0);
      if (rnd() < .35) spawnP(px, py, pz, -dx*2 + rr(-.3,.3), -dy*2 + rr(-.3,.3), -dz*2 + rr(-.3,.3), rr(.08,.16), rr(.12,.2), .04, pick([0xffe7a0,0xffc050]), 0xff6020, 1, 1, 0); }
    if (r.L.userData.owner === r.R){ r.L.position.set(x, y + .15, z); r.L.intensity = (2.6 + nightF*3.4)*(.85 + rnd()*.3); r.L.distance = 6 + nightF*4; }
    if (f >= 1){ if (r.L.userData.owner === r.R){ r.L.intensity = 0; r.L.userData.owner = null; } world.remove(r.R); ROCKETS.splice(k, 1); rpgBlast(r.h, r.src, r.direct); }
  }
}
function rpgBlast(h, src, direct){
  blastCover(h.x, h.z, 1.7); if (h.m >= 0 && h.e) wallBlast(h); else blastRubble(h.x, h.z, 8);
  const nx = h.nx, ny = h.ny, nz = h.nz, col = h.c == null ? 0xb0a080 : h.c, wall = h.m >= 0, brick = wall && h.m === M.BRICK;
  if (wall) scorch(h, rr(1.6, 2.1)); else scorchAround(h.x, .03, h.z, rr(1.8, 2.4));
  const px = h.x + nx*.12, py = Math.max(.05, h.y + ny*.12), pz = h.z + nz*.12;
  lightFlash(px, py + .6, pz, 0xffa040, 6 + nightF*6, 10 + nightF*6, 1.0); lightFlash(px, py + .4, pz, 0xfff2c8, 5, 5.5, .18);
  rpgSnd(px, pz, true); sfx('boom', px, pz); addNoise(px, pz, 50);
  const dir = (s, up) => { let a = nx + rr(-1,1)*s, b = ny + rr(-.2,1)*s + (up || 0), c = nz + rr(-1,1)*s; const l = Math.hypot(a, b, c) || 1; return [a/l, b/l, c/l]; };
  // fireball and sparks
  for (let k=0;k<26;k++){ const [a, b, c] = dir(.7, .3), v = rr(.3, 1.6); spawnP(px, py + .2, pz, a*v, b*v + .4, c*v, rr(.35,.6), rr(.9,1.5), .35, pick([0xfff6d0,0xffe7a0,0xffd060]), 0xe0601a, 1, 1, 0); }
  for (let k=0;k<80;k++){ const [a, b, c] = dir(.9, .2), v = rr(1.2, 5.5); spawnP(px, py, pz, a*v, b*v, c*v, rr(.3,.8), rr(.45,.9), .15, pick([0xfff2c0,0xffe7a0,0xffc050,0xff9030]), pick([0xc0301a,0x8a2010]), 1, 1, 0); }
  for (let k=0;k<45;k++){ const [a, b, c] = dir(1.1, .3), v = rr(5, 11); spawnP(px, py, pz, a*v, b*v, c*v, rr(.35,.9), rr(.04,.07), .02, pick([0xfff4c0,0xffe080]), 0xff6a20, 1, 1, 9); }
  // a dark rolling cloud, then the dust thrown along the ground or off the wall
  for (let k=0;k<70;k++){ const [a, b, c] = dir(1, .5), v = rr(.4, 2.2); spawnP(px + rr(-.3,.3), py + rr(0,.4), pz + rr(-.3,.3), a*v, b*v + rr(.3,1), c*v, rr(3, 6.5), rr(.35,.6), rr(1.6,2.8), jit(0x26221e,.12), 0x6a6258, rr(.8,1), 0, 0); }
  const dc = brick ? 0xb08060 : shade(col, 1.12);
  for (let k=0;k<50;k++){ const a = rnd()*6.28, v = rr(2.5, 6); spawnP(wall ? px : px + Math.cos(a)*.3, wall ? py + rr(-.4,.4) : .15, wall ? pz : pz + Math.sin(a)*.3,
      wall ? (nx + rr(-.8,.8))*v : Math.cos(a)*v, wall ? rr(-.5,1)*v*.4 : rr(.1,.6), wall ? (nz + rr(-.8,.8))*v : Math.sin(a)*v, rr(1.6, 3.2), rr(.25,.4), rr(1.1,2), jit(dc,.06), shade(dc,1.06), rr(.6,.85), 0, 0); }
  // debris: a few big lumps and a shower of small bits, from whatever was hit
  const cc = () => brick || (wall && rnd() < .2) ? jit(0xa0644a,.1) : jit(shade(col, rr(.75,1)),.1);
  for (let k=0;k<14;k++){ const [a, b, c] = dir(.9, .4), v = rr(3, 7.5); spawnChunk(px, py, pz, a*v, b*v + rr(1,3), c*v, rr(.13,.3), cc()); }
  for (let k=0;k<45;k++){ const [a, b, c] = dir(1.1, .5), v = rr(3, 10); spawnChunk(px, py, pz, a*v, b*v + rr(1,4), c*v, rr(.035,.08), cc(), rnd() < .3 ? 'flake' : null); }
  if (h.m === M.WOOD) for (let k=0;k<12;k++){ const [a, b, c] = dir(1, .4), v = rr(3, 8); spawnChunk(px, py, pz, a*v, b*v + 2, c*v, rr(.06,.12), jit(shade(col,1.1),.1), 'splinter'); }
  if (h.m === M.GLASS || h.m === M.METAL || h.m === M.TIN) for (let k=0;k<16;k++){ const [a, b, c] = dir(1, .4), v = rr(3, 8); spawnChunk(px, py, pz, a*v, b*v + 2, c*v, rr(.05,.1), jit(shade(col,1.05),.1), 'flake'); }
  // scorch: a blackened patch on the ground, a burnt crater mark on a wall
  if (wall){ decal(h, 0x2a2420, .9); decal(h, 0x3a322a, .55); decal(h, shade(col, .5), .35); }
  else { const sc = new T.Mesh(new T.CircleGeometry(1.4, 12), new T.MeshBasicMaterial({ color:0x221d18, transparent:true, opacity:.72, depthWrite:false }));
    sc.rotation.x = -Math.PI/2; sc.position.set(px, .03 + rnd()*.004, pz); world.add(sc);
    decal({ x:px, y:0, z:pz, nx:0, ny:1, nz:0, e:null }, 0x18140f, 1.1); }
  emitters.push({ x:px, z:pz, y:Math.max(.2, py - .2), rate:16, life:4.5, vy:.9, s0:.3, s1:1.6, fire:rnd() < .35 && !wall ? .35 : 0, acc:0, sp:.6, until:G.t + (wall ? 5 : 9) });
  // effect on people: the man it struck, everyone in the blast, suppression all around
  for (const u of units){ if (!u.alive) continue;
    const d = Math.hypot(u.x - px, u.z - pz, ((u.elev || 0) + .7 - py)*.8);
    if (u === direct){ u.sup = 100; damage(u, 120 + rnd()*30, src); continue; }
    if (d < 7){ u.sup = Math.min(100, u.sup + 75*(1 - d/7)); u.flinchT = Math.max(u.flinchT || 0, .8); }
    if (d < 1.9 && !(u.inB && d > 1)){ const pr = coverProt(u, px, pz); damage(u, (48*(1 - d/1.9) + 8)*(1 - pr.v*.6)*(u.stance === 'stand' ? 1 : .7), src); } }
  for (let j=Math.floor(pz)-3;j<=Math.floor(pz)+3;j++) for (let i=Math.floor(px)-3;i<=Math.floor(px)+3;i++){ if (!inB(i,j)) continue; const o = cov[idx(i,j)];
    if (o && o.kind === 'barrel' && Math.hypot(o.i + .5 - px, o.j + .5 - pz) < 2.4){ const oo = o; sched.push({ at:G.t + .3, fn:() => { if (cov[oo.cells[0]] === oo) breakBarrel(oo); } }); } }
}

