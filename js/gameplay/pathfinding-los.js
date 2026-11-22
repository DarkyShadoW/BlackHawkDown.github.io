"use strict";
/* ---------- world build ---------- */
/* ---------- the assault target: a two-storey courtyard house like the one in the film, arcades and galleries round
   an open patio, stepped merlons on the parapet, tiled pent roofs over the upper gallery, ivy on the columns ---------- */
function targetCompound(x0, y0, w, d){
  const T2 = 2, gx0 = x0 + 6, gx1 = x0 + 7;                       // ring thickness, gate cells (south side)
  const inCourt = (i, j) => i >= x0+T2 && i < x0+w-T2 && j >= y0+T2 && j < y0+d-T2;
  const inGate = (i, j) => i >= gx0 && i <= gx1 && j >= y0+d-T2;
  const inPortico = (i, j) => i === x0 && j >= y0+1 && j <= y0+d-2;                // arcade on the wide street
  const inPass = (i, j) => i === x0+1 && (j === y0+4 || j === y0+5);               // passage from the arcade to the patio
  for (let j=y0;j<y0+d;j++) for (let i=x0;i<x0+w;i++){ const k = idx(i,j); reserved[k] = 1;
    if (inCourt(i,j) || inGate(i,j) || inPortico(i,j) || inPass(i,j)){ grid[k] = 0; ground[k] = 3; topH[k] = 0; } else { grid[k] = 1; topH[k] = 3.55; } }
  const bid = regB(x0, y0, w, d, 3.2); BLDS[bid].ring = true;
  for (let j=y0;j<y0+d;j++) for (let i=x0;i<x0+w;i++) if (grid[idx(i,j)] === 0) BID[idx(i,j)] = -1;
  // courtyard props that matter in a fight: sandbags, crates, a well
  addCover('sandbag', x0+3, y0+5, 'x'); addCover('sandbag', x0+4, y0+5, 'x'); addCover('crates', x0+9, y0+3); addCover('barrel', x0+10, y0+6);
  addCover('fountain', x0+6, y0+3);
  lazyAdd(x0 + w/2, y0 + d/2, () => buildTargetCompound(x0, y0, w, d, T2, gx0, gx1));
}
/* the arcade on the street front: a run of horseshoe arches cut into a plastered screen, each framed by a carved alfiz,
   standing on paired marble columns; behind it a deep portico with a zellige dado and a passage into the patio */
let ZELLIGE = null;
function zelligeTex(){
  if (ZELLIGE) return ZELLIGE;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = '#efe8d8'; c.fillRect(0, 0, 64, 64);
  const star = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let k=0;k<16;k++){ const a = k/16*Math.PI*2, rr_ = k % 2 ? r*.55 : r; c.lineTo(x + Math.cos(a)*rr_, y + Math.sin(a)*rr_); } c.closePath(); c.fill(); };
  for (const [x, y] of [[0,0],[64,0],[0,64],[64,64],[32,32]]) star(x, y, 15, '#22436e');
  for (const [x, y] of [[32,0],[0,32],[64,32],[32,64]]){ c.fillStyle = '#1f6a5a'; c.beginPath(); c.moveTo(x, y-9); c.lineTo(x+9, y); c.lineTo(x, y+9); c.lineTo(x-9, y); c.closePath(); c.fill(); }
  for (const [x, y] of [[16,16],[48,16],[16,48],[48,48]]) star(x, y, 5, '#c9a24a');
  c.strokeStyle = 'rgba(40,40,40,.35)'; c.lineWidth = 1; for (let k=0;k<=64;k+=16){ c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 64); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(64, k); c.stroke(); }
  ZELLIGE = new T.CanvasTexture(cv); ZELLIGE.magFilter = T.NearestFilter; ZELLIGE.wrapS = ZELLIGE.wrapT = T.RepeatWrapping;
  return ZELLIGE;
}
function porticoWest(x0, z0, L, H, b, WALL, TRIM, pass0, pass1){
  const par = CUR ? CUR.group : world, depth = .22;
  const n = Math.max(3, Math.round(L / 1.45)), step = L / n, a = .42, r = .5, s = .82;
  // the arched screen as one extruded shape with keyhole holes
  // one outline that dips into each arch from the ground line (holes may not touch the edge, so the arches are notches)
  const al = Math.acos(a / r), jambTop = s - r*Math.sin(al);
  const sh = new T.Shape(); sh.moveTo(0, 0);
  for (let k=0;k<n;k++){
    const cx = (k + .5) * step;
    sh.lineTo(cx - a, 0); sh.lineTo(cx - a, jambTop);
    const N = 22; for (let q=0;q<=N;q++){ const th = Math.PI + al - (Math.PI + 2*al) * q/N; sh.lineTo(cx + r*Math.cos(th), s + r*Math.sin(th)); }
    sh.lineTo(cx + a, 0);
  }
  sh.lineTo(L, 0); sh.lineTo(L, H); sh.lineTo(0, H); sh.closePath();
  const geo = new T.ExtrudeGeometry(sh, { depth, bevelEnabled:false, curveSegments:4 });
  const mat = new T.MeshPhongMaterial({ color:WALL, specular:0x000000, shininess:1, side:T.DoubleSide });
  const screen = new T.Mesh(geo, mat); screen.rotation.y = -Math.PI/2; screen.position.set(x0 + depth, 0, z0); screen.castShadow = screen.receiveShadow = true; par.add(screen);
  // a moulded band round each horseshoe, standing proud of the wall, in a darker carved stone
  const mshape = new T.Shape(), M2 = 26, w_ = .085;
  { const ro = r + w_, alo = Math.acos(Math.min(.99, (a + w_*.6) / ro));
    mshape.moveTo(-a, jambTop);
    for (let q=0;q<=M2;q++){ const th = Math.PI + al - (Math.PI + 2*al)*q/M2; mshape.lineTo(r*Math.cos(th), s + r*Math.sin(th)); }
    mshape.lineTo(a + w_*.6, jambTop - .02);
    for (let q=0;q<=M2;q++){ const th = -alo + (Math.PI + 2*alo)*q/M2; mshape.lineTo(ro*Math.cos(th), s + ro*Math.sin(th)); }
    mshape.closePath(); }
  const mgeo = new T.ExtrudeGeometry(mshape, { depth:.05, bevelEnabled:false, curveSegments:4 });
  const mmat = new T.MeshPhongMaterial({ color:0xc8b896, specular:0x000000, shininess:1, side:T.DoubleSide });
  for (let k=0;k<n;k++){ const m = new T.Mesh(mgeo, mmat); m.rotation.y = -Math.PI/2; m.position.set(x0 - .045 + .05, 0, z0 + (k + .5)*step); m.castShadow = true; par.add(m); }
  // per arch: alfiz frame and carved spandrel panels on the street face, paired columns at each pier
  const fx = x0 - .03;
  for (let k=0;k<n;k++){
    const cz = z0 + (k + .5) * step;
    B(fx, s + r + .11, cz, .05, .06, 2*r + .26, TRIM, { b });                          // alfiz top
    B(fx, (s + r + .11 + jambTop)/2 + .05, cz - r - .12, .05, s + r + .11 - jambTop, .06, TRIM, { b });
    B(fx, (s + r + .11 + jambTop)/2 + .05, cz + r + .12, .05, s + r + .11 - jambTop, .06, TRIM, { b });
    for (const sg of [-1, 1]) B(fx + .01, s + r*.72, cz + sg*(r*.82), .03, r*.55, r*.32, shade(WALL, .9), { b, m:M.STONE });   // carved spandrels
    B(fx, s + r - .01, cz, .04, .1, .12, shade(TRIM, .92), { b, m:M.STONE });           // keystone
  }
  for (let k=0;k<=n;k++){
    const pz = z0 + k*step;
    for (const off of (k === 0 || k === n) ? [k === 0 ? .14 : -.14] : [-.13, .13]){
      const z = pz + off, x = x0 - .1;
      C(x, jambTop/2 + .06, z, .065, jambTop - .1, 0xf2ecde, { b, m:M.STONE });
      B(x, .05, z, .2, .1, .2, TRIM, { b, m:M.STONE });
      B(x, jambTop + .02, z, .2, .12, .2, TRIM, { b, m:M.STONE });                       // capital
    }
  }
  // street-side plinth and a frieze between the arcade and the upper floor
  B(x0 - .04, H - .1, z0 + L/2, .1, .14, L + .1, TRIM, { b });
  for (let t=.2; t<L; t+=.42) B(x0 - .07, H - .1, z0 + t, .04, .08, .16, shade(TRIM, .86), { b, m:M.STONE });
  // the back wall of the portico, with the zellige dado, two doors and the passage left open
  const back = x0 + 1;
  const seg = (za, zb) => { if (zb - za < .05) return; B(back + .06, H/2, (za+zb)/2, .12, H, zb - za, shade(WALL, .72), { b }); };
  seg(z0, pass0); seg(pass1, z0 + L);
  const dado = new T.MeshPhongMaterial({ map:zelligeTex(), specular:0x333333, shininess:30 });
  for (const [za, zb] of [[z0, pass0], [pass1, z0 + L]]){
    if (zb - za < .1) continue;
    const g = new T.PlaneGeometry(zb - za, .62); const uv = g.attributes.uv; for (let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*(zb - za)/.45, uv.getY(i)*.62/.45);
    const m = new T.Mesh(g, dado); m.rotation.y = -Math.PI/2; m.position.set(back - .002, .33, (za+zb)/2); m.receiveShadow = true; par.add(m);
    B(back - .01, .66, (za+zb)/2, .03, .04, zb - za, 0x8a6a3a, { b, m:M.WOOD });
  }
  // doors in the back wall
  for (const zc of [z0 + 1.1, z0 + L - 1.1]) if (zc < pass0 - .6 || zc > pass1 + .6){ B(back - .02, .75, zc, .05, 1.35, .7, 0x4a3424, { b, m:M.WOOD }); B(back - .03, 1.48, zc, .05, .12, .84, TRIM, { b }); }
  // the passage: a plain arch through to the patio
  B(back + .06, H - .22, (pass0 + pass1)/2, .12, .44, pass1 - pass0, WALL, { b });
  // big clay jars and a bench under the arches
  C(x0 + .7, .3, z0 + .5, .22, .6, 0xb87a4a, { b, m:M.BRICK }); C(x0 + .72, .26, z0 + L - .55, .2, .52, 0xa86a3e, { b, m:M.BRICK });
  // hanging lamps under the arcade
  for (let k=1;k<n;k+=2){ const z = z0 + k*step; B(x0 + .5, H - .25, z, .02, .3, .02, 0x2a2a28, { b, m:M.METAL }); B(x0 + .5, H - .45, z, .12, .14, .12, 0x6a5a3a, { b, m:M.METAL }); }
}
function buildTargetCompound(x0, y0, w, d, T2, gx0, gx1){
  const b = nBld++, WALL = 0xe9e0cc, TRIM = 0xd6cbb2, STONE = 0xcfc4ad, TILE = 0xa8583a, IVY = 0x4e6a34, FH2 = 1.55;
  const top = FH2*2, X1 = x0 + w, Y1 = y0 + d;
  const P = (x, y, z, sx, sy, sz, c, ex) => B(x, y, z, sx, sy, sz, c, Object.assign({ b }, ex || {}));
  MAT = M.PLASTER;
  // outer shell: four wings; the inner half of each wing is a gallery, so the solid part is the outer metre
  const shell = (ax, az, bx, bz) => P((ax+bx)/2, top/2, (az+bz)/2, bx-ax, top, bz-az, WALL);
  shell(x0, y0, X1, y0 + 1);                                      // north
  shell(x0, Y1 - 1, gx0, Y1); shell(gx1 + 1, Y1 - 1, X1, Y1);       // south, split by the gate
  shell(X1 - 1, y0 + 1, X1, Y1 - 1);                                // east
  P(x0 + .5, (FH2 + top)/2 + .07, (y0 + 1 + Y1 - 1)/2, 1, top - FH2 - .14, d - 2, WALL);   // west upper floor, carried on the arcade
  P(x0 + .5, FH2 + .02, (y0 + 1 + Y1 - 1)/2, 1.02, .16, d - 2, TRIM, { m:M.CONC });      // its floor slab, the portico ceiling
  porticoWest(x0, y0 + 1, d - 2, FH2, b, WALL, TRIM, y0 + 4, y0 + 6);

  // gate: a horseshoe-ish arch in a deep portal, heavy wooden doors thrown open
  P((gx0+gx1+1)/2, top - .45, Y1 - 1, 2.1, .9, 2, WALL);
  P((gx0+gx1+1)/2, 2.05, Y1 + .02, 2.3, .22, .1, TRIM); P(gx0 - .02, 1.1, Y1 + .02, .22, 2.2, .1, TRIM); P(gx1 + 1.02, 1.1, Y1 + .02, .22, 2.2, .1, TRIM);
  P(gx0 + .25, 1.0, Y1 - .3, .08, 2.0, .9, 0x5a3e28, { m:M.WOOD, ry:.6 }); P(gx1 + .75, 1.0, Y1 - .3, .08, 2.0, .9, 0x5a3e28, { m:M.WOOD, ry:-.6 });
  // base course and string course on the outside
  P(x0 + w/2, .25, y0 - .02, w + .05, .5, .06, STONE, { m:M.STONE }); P(x0 - .02, .25, y0 + .5, .06, .5, 1.05, STONE, { m:M.STONE }); P(x0 - .02, .25, Y1 - .5, .06, .5, 1.05, STONE, { m:M.STONE }); P(X1 + .02, .25, y0 + d/2, .06, .5, d + .05, STONE, { m:M.STONE });
  P(x0 + 3.2, .25, Y1 + .02, 6.3, .5, .06, STONE, { m:M.STONE }); P(X1 - 2.6, .25, Y1 + .02, 5.1, .5, .06, STONE, { m:M.STONE });
  for (const [ax, az, bx, bz] of [[x0, y0, X1, y0], [x0, Y1, X1, Y1], [x0, y0, x0, Y1], [X1, y0, X1, Y1]]){
    const horiz = az === bz, L = horiz ? bx - ax : bz - az, o = (horiz ? (az === y0 ? -1 : 1) : (ax === x0 ? -1 : 1)) * .03;
    P(horiz ? (ax+bx)/2 : ax + o, FH2 + .05, horiz ? az + o : (az+bz)/2, horiz ? L + .08 : .1, .12, horiz ? .1 : L + .08, TRIM);
    // windows: small, deep, with wooden shutters; arched tops faked by a lighter keystone block
    const n = Math.floor(L / 1.6);
    for (let f=0; f<2; f++) for (let k=0;k<n;k++){
      const t = (k + .5) * L / n, cx = horiz ? ax + t : ax + o, cz = horiz ? az + o : az + t;
      if (horiz && az === Y1 && cx > gx0 - .6 && cx < gx1 + 1.6) continue;
      if (f === 0 && rnd() < .35) continue;
      if (f === 0 && !horiz && ax === x0) continue;
      const yy = f*FH2 + .95;
      P(cx, yy, cz, horiz ? .5 : .05, .7, horiz ? .05 : .5, 0x26221d, { m:M.GLASS });
      P(cx, yy + .43, cz, horiz ? .62 : .07, .14, horiz ? .07 : .62, TRIM);
      if (rnd() < .5){ const sc = pick([0x3e6b6a, 0x6a5236, 0x5a7d9a]); const off = .36;
        P(horiz ? cx - off : cx, yy, horiz ? cz : cz - off, horiz ? .2 : .05, .68, horiz ? .05 : .2, sc, { m:M.WOOD }); P(horiz ? cx + off : cx, yy, horiz ? cz : cz + off, horiz ? .2 : .05, .68, horiz ? .05 : .2, sc, { m:M.WOOD }); }
    }
  }
  // parapet with stepped merlons
  const parapet = (ax, az, bx, bz) => { const horiz = az === bz, L = horiz ? bx - ax : bz - az;
    P(horiz ? (ax+bx)/2 : ax, top + .2, horiz ? az : (az+bz)/2, horiz ? L : .16, .4, horiz ? .16 : L, WALL, { roof:1 });
    for (let t=.35; t<L; t+=.7){ const cx = horiz ? ax + t : ax, cz = horiz ? az : az + t;
      P(cx, top + .52, cz, horiz ? .34 : .18, .26, horiz ? .18 : .34, WALL, { roof:1 }); P(cx, top + .72, cz, horiz ? .18 : .16, .16, horiz ? .16 : .18, WALL, { roof:1 }); } };
  parapet(x0, y0 + .08, X1, y0 + .08); parapet(x0, Y1 - .08, X1, Y1 - .08); parapet(x0 + .08, y0, x0 + .08, Y1); parapet(X1 - .08, y0, X1 - .08, Y1);
  // roofs of the wings (flat, walkable) and the inner pent roofs of red tiles over the upper galleries
  const ix0 = x0 + T2, ix1 = X1 - T2, iz0 = y0 + T2, iz1 = Y1 - T2;
  P(x0 + w/2, top + .03, y0 + .5, w, .08, 1, 0xa49b88, { m:M.CONC }); P(x0 + w/2, top + .03, Y1 - .5, w, .08, 1, 0xa49b88, { m:M.CONC });
  P(x0 + .5, top + .03, y0 + d/2, 1, .08, d, 0xa49b88, { m:M.CONC }); P(X1 - .5, top + .03, y0 + d/2, 1, .08, d, 0xa49b88, { m:M.CONC });
  const tile = (cx, cz, sx, sz, ex) => P(cx, top - .02, cz, sx, .1, sz, TILE, Object.assign({ m:M.BRICK, roof:1 }, ex));
  tile((ix0+ix1)/2, iz0 - .45, ix1 - ix0 + 2, 1.1, { rx:.42 }); tile((ix0+ix1)/2, iz1 + .45, ix1 - ix0 + 2, 1.1, { rx:-.42 });
  tile(ix0 - .45, (iz0+iz1)/2, 1.1, iz1 - iz0, { rz:-.42 }); tile(ix1 + .45, (iz0+iz1)/2, 1.1, iz1 - iz0, { rz:.42 });
  // galleries round the patio: two tiers of slender columns and arches, a balustrade upstairs, tile dado and doors behind
  const side = (ax, az, bx, bz, nx, nz) => {
    const horiz = az === bz, L = horiz ? bx - ax : bz - az, n = Math.max(2, Math.round(L / 1.3)), step = L / n;
    const at = (t, off) => horiz ? [ax + t, az + nz*off] : [ax + nx*off, az + t];
    // gallery floor slab and the back wall details
    // (the gallery floor slab upstairs, the blue tile dado and the doors and windows that stood behind are gone: with the roof cut away
    //  they read as loose walls and a floating floor inside the patio)
    for (let f=0; f<2; f++){
      const y0f = f*FH2 + (f ? .14 : 0), ch = f ? 1.1 : 1.25;
      for (let k=0;k<=n;k++){ const p = at(k*step, 0);
        C(p[0], y0f + ch/2, p[1], .09, ch, 0xf0e8d6, { b, m:M.STONE });
        P(p[0], y0f + ch + .06, p[1], .26, .1, .26, TRIM, { m:M.STONE });
        P(p[0], y0f + .05, p[1], .22, .1, .22, TRIM, { m:M.STONE });
        if (rnd() < .45) leafCanopy(p[0], y0f + rr(.3, ch), p[1], .22, rr(.3,.6), .22, IVY, 10);
      }
      // arch band over the columns: a lintel with scalloped arches cut by two tilted blocks per bay
      const lin = at(L/2, 0);
      P(lin[0], y0f + ch + .32, lin[1], horiz ? L : .2, .4, horiz ? .2 : L, WALL);
      for (let k=0;k<n;k++){ const p0 = at(k*step + step*.22, 0), p1 = at(k*step + step*.78, 0), pc = at((k+.5)*step, 0);
        const r = horiz ? { rz:.8 } : { rx:-.8 }, r2 = horiz ? { rz:-.8 } : { rx:.8 };
        P(p0[0], y0f + ch + .05, p0[1], horiz ? .42 : .19, .2, horiz ? .19 : .42, WALL, r); P(p1[0], y0f + ch + .05, p1[1], horiz ? .42 : .19, .2, horiz ? .19 : .42, WALL, r2);
        P(pc[0], y0f + ch + .16, pc[1], horiz ? .3 : .19, .08, horiz ? .19 : .3, TRIM); }
      if (f === 1){ // balustrade
        const bl = at(L/2, .02); P(bl[0], FH2 + .7, bl[1], horiz ? L : .1, .07, horiz ? .1 : L, 0x6a4a30, { m:M.WOOD });
        for (let t=.2; t<L; t+=.26){ const q = at(t, .02); P(q[0], FH2 + .42, q[1], .045, .5, .045, 0x6a4a30, { m:M.WOOD }); } }
    }
    // ivy spilling over the roof edge
    for (let k=0;k<3;k++){ const q = at(rr(.5, L - .5), -.2); leafCanopy(q[0], top - .3, q[1], .5, .5, .5, IVY, 26); }
  };
  side(ix0, iz0, ix1, iz0, 0, -1); side(ix0, iz1, ix1, iz1, 0, 1); side(ix0, iz0, ix0, iz1, -1, 0); side(ix1, iz0, ix1, iz1, 1, 0);
  // patio clutter: a ladder against the gallery, a tarp hung from it, crates and a jerrycan, laundry upstairs
  P(ix1 - 1.2, 1.3, iz0 + .35, .05, 2.6, .05, 0x7a5a3a, { m:M.WOOD, rx:-.25 }); P(ix1 - .8, 1.3, iz0 + .35, .05, 2.6, .05, 0x7a5a3a, { m:M.WOOD, rx:-.25 });
  for (let k=0;k<7;k++) P(ix1 - 1, .3 + k*.34, iz0 + .2 + k*.085, .45, .04, .04, 0x7a5a3a, { m:M.WOOD });
  P(ix0 + 2.5, 1.0, iz0 + .15, 1.6, 1.9, .04, 0x9a9268, { m:M.CLOTH, awn:2 });
  P(ix0 + .6, .2, iz1 - .5, .3, .4, .2, 0x3a5a3a, { m:M.METAL });
  for (let k=0;k<4;k++) P(ix0 + 1.5 + k*.32, FH2 + 1.05, iz1 + .55, .26, .34, .02, pick([0xd8d1c1,0xc9bc9f,0xbcad8c,0xe2dccd]), { awn:2, m:M.CLOTH });
  // a water tank and a dish on the roof
  C(X1 - .6, top + .5, y0 + .6, .35, .8, 0x6c6f6a, { b, roof:1, m:M.METAL });
  rubbleAround(x0, y0, w, d);
}
let G, objRing, moveMark, supMark;
function buildDistrict(){
  const X = OX, Z = OZ;
  const rsv = (x0,y0,x1,y1) => { for (let j=y0;j<=y1;j++) for (let i=x0;i<=x1;i++) if (inB(X+i,Z+j)) reserved[idx(X+i,Z+j)] = 1; };
  const cv = (k, i, j, dir, opt) => addCover(k, X+i, Z+j, dir, opt);
  // landmarks: the Hotel Olympic and, one block north, the target building
  building(X+37,Z+15,7,7,6,{ col:0xf1eee4, base:0xd8d2c2, hotel:true, force:true, cren:true });
  targetCompound(X+37, Z+0, 13, 10);
  tower(X+46,Z+17);
  constructionSite(X+15,Z+37,7,6,4); crane(X+24,Z+39); rsv(14,36,28,44);
  for (let j=36;j<=44;j++) for (let i=14;i<=28;i++) if (grid[idx(X+i,Z+j)]===0) ground[idx(X+i,Z+j)] = 2;
  rsv(36,36,50,49);
  for (let i=36;i<=48;i+=3) shack(X+i, Z+48, 3, 2);
  for (let j=37;j<=45;j+=3) shack(X+49, Z+j, 2, 3);
  MKT = true;
  for (const j of [38,41,44]) for (let i=37;i<=47;i+=2) if (rnd() < .85) cv('stall', i, j);
  for (let k=0;k<8;k++) cv(pick(['crates','crates','tires','barrel']), 37+ri(12), 37+ri(10));
  MKT = false;
  const XS = [[0,8],[14,28],[36,50],[56,63]], YS = [[0,9],[15,27],[36,49],[55,63]];
  for (const xr of XS) for (const yr of YS){
    if (xr[0]===36 && yr[0]===36) continue;
    if (xr[0]===36 && yr[0]===0) continue;             // the target compound fills this block
    if (xr[0]===14 && yr[0]===36) continue;
    if (xr[0]===36 && yr[0]===15){ fillBlock(X+44,Z+15,X+50,Z+16); fillBlock(X+48,Z+18,X+50,Z+21); continue; }
    fillBlock(X+xr[0], Z+yr[0], X+xr[1], Z+yr[1]);
  }
  fillBlock(X+14,Z+45,X+28,Z+49);
  // (the fountain that stood out here is gone: the one in the target's patio is the fountain now)
  cv('bus',37,26,'x',{ burnt:true });
  for (const [i,j] of [[45,26],[47,26],[49,26]]) cv('stall', i, j);
  cv('sandbag',42,22,'x'); cv('sandbag',43,22,'x'); cv('crates',48,23);
  for (const x of [36.6,40.6,44.6,48.6]) palm(X+x, Z+22.4);
  palm(X+39.5,Z+27.4); palm(X+46.5,Z+24.8);
  // avenue west (approach)
  cv('car',6,29,'x',{burnt:true}); cv('crates',4,34); cv('barrel',9,35,null,{fuel:true});
  cv('van',13,32,'x'); cv('rubble',16,29); cv('rubble',17,30); cv('tires',11,28);
  cv('pickup',19,34,'x',{burnt:true}); cv('barrier',23,30,'z'); cv('barrier',23,31,'z');
  cv('sandbag',26,28,'z'); cv('barrel',21,28); cv('barrel',25,35,null,{fuel:true}); cv('car',26,33,'x');
  cv('crates',2,28); cv('wall',15,35,'x');
  // intersection
  cv('car',31,30,'z',{burnt:true}); cv('barrel',34,29); cv('crates',29,35); cv('tires',35,34);
  // militia barricades
  for (const j of [28,29,30,33,34,35]) cv('sandbag',40,j,'z');
  cv('barrel',41,32,null,{fuel:true}); cv('tires',41,31);
  for (const i of [29,30,31,33,34,35]) cv('sandbag',i,24,'x');
  cv('barrel',32,23,null,{fuel:true});
  for (const i of [29,30,34,35]) cv('barrier',i,39,'x');
  cv('crates',32,40);
  cv('van',46,29,'x',{burnt:true}); cv('car',44,34,'x',{burnt:true}); cv('rubble',49,31); cv('car',53,33,'x');
  cv('rubble',58,30); cv('bus',59,33,'x');
  cv('car',31,15,'z'); cv('rubble',33,8); cv('crates',30,4);
  cv('pickup',30,46,'z'); cv('rubble',34,52); cv('barrel',33,58);
  for (const i of [3,15,24,44,52,60]) palm(X+i+.5, Z+35.6);
  for (const j of [5,17,46,57]) palm(X+29.4, Z+j+.5);
}
function buildWorld(){
  if (world) scene.remove(world);
  batchReset(); SHK.force = true;
  while (overlay.children.length) overlay.remove(overlay.children[0]);
  seed = 1993; S62_GHOSTS = []; STAD_GH = []; MKT_WIDE = []; GHOST = false;
  world = new T.Group(); scene.add(world);
  ORX = ORZ = 0; TZONE = null;
  grid = new Uint8Array(W*H); topH = new Float32Array(W*H); cov = new Array(W*H).fill(null); reserved = new Uint8Array(W*H); ground = new Uint8Array(W*H);
  HG = new Array(W*H);
  CHUNKS = new Map(); GEN = []; CUR = null; heliWaiters = []; FOCUS2 = null;
  units = []; us = []; them = []; fx = []; sched = []; BX = []; CY = []; nBld = 0; emitters = []; poles = []; wires = [];
  palms = []; flags = []; birds = []; AW = []; awMesh = null; wireGeo = null; heli = null;
  LIGHTSRC = []; GLOWS = []; glowMesh = null;
  BLDS = []; BID = new Int32Array(W*H).fill(-1);
  PLANNING = true;
  noVehPlan();
  planStreets();
  buildDistrict();
  planBlocks();
  stadium(); archGate(); k4(); mainRoad();
  // only what has already come down by this point of the battle lies in the streets
  WRECKS = {};
  if (crashed('s61')) wreck(LM.s61.x, LM.s61.z, .5, false);
  if (crashed('s64')) wreck(LM.s64.x, LM.s64.z, -.9, true);
  for (let j=352;j<=368;j++) for (let i=263;i<=279;i++) if (grid[idx(i,j)] === 0) ground[idx(i,j)] = 2;
  streetJunk(); planLights();
  planAirport(); planRegion();
  // sidewalks where streets meet buildings
  for (let j=0;j<H;j++) for (let i=0;i<W;i++){
    const k = idx(i,j); if (STR[k] !== 2 || grid[k] === 1) continue;
    if ((i+1<W && grid[k+1] === 1 && !STR[k+1]) || (i>0 && grid[k-1] === 1 && !STR[k-1]) || (j+1<H && grid[k+W] === 1 && !STR[k+W]) || (j>0 && grid[k-W] === 1 && !STR[k-W])) ground[k] = 5;
  }
  // poles & wires: the district's lines and the long avenues
  const P = (x, z) => [OX + x, OZ + z];
  const pl = []; for (let i=1;i<64;i+=6) pl.push(P(i+.5, 28.2)); poleLine(pl);
  const pl2 = []; for (let j=1;j<64;j+=6) pl2.push(P(35.8, j+.5)); poleLine(pl2);
  const pl3 = []; for (let i=2;i<64;i+=7) pl3.push(P(i+.5, 14.8)); poleLine(pl3);
  const pl4 = []; for (let j=3;j<64;j+=7) pl4.push(P(9.2, j+.5)); poleLine(pl4);
  const pl5 = []; for (let i=4;i<64;i+=7) pl5.push(P(i+.5, 50.2)); poleLine(pl5);
  const av = (a, b, step, fixed, vert) => { const L = []; for (let t=a;t<=b;t+=step){ const x = vert ? fixed : t, z = vert ? t : fixed; if (inB(Math.floor(x), Math.floor(z)) && grid[idx(Math.floor(x), Math.floor(z))] === 0 && cityDs(x, z) > .18 && coastS(x, z) < -27) L.push([x, z]); else if (L.length > 1){ poleLine(L.splice(0)); } else L.length = 0; } if (L.length > 1) poleLine(L); };
  av(4, OZ-6, 8, OX+35.8, true); av(OZ+70, H-12, 8, OX+35.8, true); av(4, OX-6, 8, OZ+28.2, false); av(OX+70, W-12, 8, OZ+28.2, false); av(4, W-12, 8, 317.5, false);
  s62Clear();
  PLANNING = false;

  // wires (animated)
  const wp = [], wm = []; let span = 0;
  for (const line of wires) for (let k=0;k<line.length-1;k++){
    const a = line[k], b = line[k+1]; span++;
    for (const off of [-.4,.4]){
      const dx = b[0]-a[0], dz = b[2]-a[2], horiz = Math.abs(dx) > Math.abs(dz), L = Math.hypot(dx,dz) || 1;
      const perp = [-dz/L, dx/L];
      let prev = null, prevM = null;
      for (let s=0;s<=10;s++){ const t = s/10, sf = Math.sin(t*Math.PI), sag = sf*.55;
        const p = [a[0]+dx*t + (horiz?0:off), a[1]-sag, a[2]+dz*t + (horiz?off:0)], mm = [sf, perp[0], perp[1], span*1.7 + off];
        if (prev){ wp.push(...prev, ...p); wm.push(prevM, mm); } prev = p; prevM = mm; }
    }
  }
  wireBase = new Float32Array(wp); wireMeta = wm;
  wireGeo = new T.BufferGeometry(); wireGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(wp),3));
  world.add(new T.LineSegments(wireGeo, new T.LineBasicMaterial({ color:0x2a2622 })));

  ocean = makeOcean(); buildGlows(); makeLaundry(); makeLitter();
  makeBirds(); if (MIS.ambHeli) makeHeli(MIS.ambHeli);
  ORBITS = (MIS.orbits || []).map(o => { const h = o.lb ? littleBird() : makeHeliObj(); if (o.lb) world.add(h.g); return Object.assign({ h, a:rnd()*6.283 }, o); });
  initParticles(); initChunks(); initDecals(); initMarks(); trickles = [];
  const E = (x, z, o) => emitters.push(Object.assign({ x, z, acc:0 }, o));
  E(OX+45, OZ+34.5, { y:.9, rate:60, life:8, vy:1.3, s0:.3, s1:1.5, fire:1, sp:.5 });
  E(OX+47, OZ+29.5, { y:1.2, rate:45, life:8, vy:1.2, s0:.28, s1:1.3, fire:.6, sp:.5 });
  E(OX+20, OZ+20.5, { y:3.9, rate:55, life:10, vy:1.4, s0:.35, s1:1.9, fire:.7, sp:.7 });
  // burning tyre barricades and fires across the city
  for (const [x, z] of [[150,180],[330,300],[420,205],[200,380],[118,300],[380,450],[290,150],[460,330],[236,470],[90,120]])
    if (cityDs(x, z) > .3) E(x, z, { y:1.2, rate:38, life:13, vy:1.6, s0:.6, s1:2.8, fire:.35, sp:.9 });

  // objective & markers
  const zg = new T.RingGeometry(OBJ.r-.3, OBJ.r, 48); zg.rotateX(-Math.PI/2);
  objRing = new T.Mesh(zg, new T.MeshBasicMaterial({ color:0xe7a63d, transparent:true, opacity:.75 }));
  objRing.position.set(OBJ.x, 0.08, OBJ.z); grounded(objRing);
  moveMark = new T.Mesh(new T.RingGeometry(.36,.47,20), new T.MeshBasicMaterial({ color:0x7fb8ff, transparent:true, opacity:0, side:T.DoubleSide, depthTest:false }));
  moveMark.rotation.x = -Math.PI/2; grounded(moveMark);
  supMark = new T.Mesh(new T.RingGeometry(1.9,2.1,24), new T.MeshBasicMaterial({ color:0xe7a63d, transparent:true, opacity:0, side:T.DoubleSide }));
  supMark.rotation.x = -Math.PI/2; grounded(supMark);

  makeSquad(squadType);
  MIS.spawn();
  spawnCivs();
}

function nearestFree(i,j){
  for (let r=0;r<14;r++) for (let dj=-r;dj<=r;dj++) for (let di=-r;di<=r;di++){
    if (Math.max(Math.abs(di),Math.abs(dj)) !== r) continue;
    if (walk(i+di,j+dj)) return [i+di,j+dj];
  }
  return [i,j];
}

/* ---------- pathfinding ---------- */
const DIRS = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
function hpush(h,f,k){ h.push([f,k]); let i = h.length-1; while (i>0){ const p = (i-1)>>1; if (h[p][0] <= h[i][0]) break; const t = h[p]; h[p] = h[i]; h[i] = t; i = p; } }
function hpop(h){ const top = h[0], last = h.pop(); if (h.length){ h[0] = last; let i = 0; for(;;){ const l = 2*i+1, r = l+1; let m = i; if (l<h.length && h[l][0]<h[m][0]) m = l; if (r<h.length && h[r][0]<h[m][0]) m = r; if (m===i) break; const t = h[m]; h[m] = h[i]; h[i] = t; i = m; } } return top; }
const PF = { stamp:0 }, FC = { stamp:0 };
// a straight walk from a to b, with a little room either side, never touches a wall or an obstacle
function clearWalk(ax, az, bx, bz){
  const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L/.25);
  for (let k=1;k<n;k++){ const t = k/n, x = ax + (bx - ax)*t, z = az + (bz - az)*t;
    for (const [ox, oz] of [[0, 0], [.32, 0], [-.32, 0], [0, .32], [0, -.32]]) if (!walk(Math.floor(x + ox), Math.floor(z + oz))) return false; }
  return true;
}
// string-pulling: from each corner, jump to the furthest cell still reachable in a straight line; the soldier then rounds the corners
function smoothPath(p, sx, sz){
  if (!p || p.length < 3) return p || [];
  const out = []; let ax = sx, az = sz, i = 0;
  while (i < p.length){ let j = Math.min(p.length - 1, i + 48);
    while (j > i && !clearWalk(ax, az, p[j][0] + .5, p[j][1] + .5)) j--;
    out.push(p[j]); ax = p[j][0] + .5; az = p[j][1] + .5; i = j + 1; }
  return out;
}
// the curve drawn on the ground: Chaikin corner cutting, so turns read as arcs
function curvePts(pts, it){
  let P = pts;
  for (let r=0;r<(it || 3);r++){ if (P.length < 3) break; const Q = [P[0]];
    for (let k=0;k<P.length - 1;k++){ const a = P[k], b = P[k+1]; Q.push([a[0]*.75 + b[0]*.25, a[1]*.75 + b[1]*.25], [a[0]*.25 + b[0]*.75, a[1]*.25 + b[1]*.75]); }
    Q.push(P[P.length - 1]); P = Q; }
  return P;
}
const VAULT = { wall:1, sandbag:1 };
function vaultCell(i, j){ if (!inB(i, j)) return false; const k = idx(i, j), o = cov[k]; return grid[k] === 2 && !!o && !!VAULT[o.kind] && !o.barricade && !o.dead; }
// is there a low wall across the next stretch of his route? Then he goes over it
function vaultScan(u){
  const n = u.path[0]; if (!n) return; const dx = n[0] + .5 - u.x, dz = n[1] + .5 - u.z, d = Math.hypot(dx, dz); if (d < .6 || d > 3.4) return;
  for (let q=.3; q<d && q<1.5; q+=.25){ const i = Math.floor(u.x + dx/d*q), j = Math.floor(u.z + dz/d*q); if (vaultCell(i, j)){ u.vault = { cx:i + .5, cz:j + .5, dx:dx/d, dz:dz/d, t:0 }; return; } }
}
function findPath(si,sj,gi,gj){
  if (!walk(gi,gj)) return null;
  const N = W*H;
  if (!PF.gc){ PF.gc = new Float32Array(N); PF.came = new Int32Array(N); PF.seen = new Uint32Array(N); PF.shut = new Uint32Array(N); }
  const st = ++PF.stamp, gcA = PF.gc, came = PF.came, seen = PF.seen, shut = PF.shut;
  const gc = { get: k => seen[k] === st ? gcA[k] : 1e9 };
  const s = idx(si,sj), goal = idx(gi,gj);
  const hh = (i,j) => Math.hypot(i-gi, j-gj);
  const open = []; hpush(open, hh(si,sj), s); seen[s] = st; gcA[s] = 0; came[s] = -1; let it = 0;
  while (open.length && it++ < 40000){
    const cur = hpop(open)[1];
    if (shut[cur] === st) continue; shut[cur] = st;
    if (cur === goal) break;
    const ci = kI(cur), cj = kJ(cur);
    for (const [dx,dy,c] of DIRS){
      const ni = ci+dx, nj = cj+dy;
      if (!walk(ni,nj)){
        if (c === 1 && !PF.noVault && vaultCell(ni, nj) && walk(ni+dx, nj+dy)){ const vk = idx(ni+dx, nj+dy), vg = gcA[cur] + 5.5;
          if (vg < gc.get(vk)){ seen[vk] = st; gcA[vk] = vg; came[vk] = cur; hpush(open, vg + hh(ni+dx, nj+dy), vk); } }
        continue; }
      if (dx && dy && (!walk(ci+dx,cj) || !walk(ci,cj+dy))) continue;
      const nk = idx(ni,nj), ng = gcA[cur] + c;
      if (ng < gc.get(nk)){ seen[nk] = st; gcA[nk] = ng; came[nk] = cur; hpush(open, ng + hh(ni,nj), nk); }
    }
  }
  if (seen[goal] !== st && goal !== s) return null;
  const out = []; let k = goal;
  while (k !== s && k !== -1){ out.push([kI(k), kJ(k)]); k = came[k]; }
  return out.reverse();
}

/* ---------- line of sight & cover ---------- */
function los(ax,az,bx,bz){
  const dx = bx-ax, dz = bz-az, d = Math.hypot(dx,dz), steps = Math.ceil(d*3);
  const ai = Math.floor(ax), aj = Math.floor(az), bi = Math.floor(bx), bj = Math.floor(bz);
  for (let s=1;s<steps;s++){
    const t = s/steps, i = Math.floor(ax+dx*t), j = Math.floor(az+dz*t);
    if ((i===ai && j===aj) || (i===bi && j===bj)) continue;
    if (inB(i,j) && grid[idx(i,j)] === 1) return false;
  }
  return true;
}
const dist = (a,b) => Math.hypot(a.x-b.x, a.z-b.z);
function coverProt(t, sx, sz){
  if (t.inB) return { v: t.inB.level === 'ground' ? .9 : (t.stance === 'prone' ? .8 : .6), cell:-1 };
  const ti = Math.floor(t.x), tj = Math.floor(t.z);
  let dx = sx - t.x, dz = sz - t.z; const L = Math.hypot(dx,dz) || 1; dx /= L; dz /= L;
  let best = 0, cell = -1;
  for (let oy=-1;oy<=1;oy++) for (let ox=-1;ox<=1;ox++){
    if (!ox && !oy) continue;
    const ol = Math.hypot(ox,oy), dot = (ox*dx + oy*dz)/ol; if (dot < .5) continue;
    const i = ti+ox, j = tj+oy; if (!inB(i,j)) continue;
    const k = idx(i,j); let v = 0;
    if (grid[k] === 1) v = .75; else if (grid[k] === 2 && cov[k]) v = cov[k].val;
    v *= dot > .85 ? 1 : .75;
    if (v > best){ best = v; cell = k; }
  }
  const st = t.stance === 'stand' ? .55 : 1;
  return { v: best*st, cell };
}
function findCover(si, sj, threat, radius, taken){
  const N = W*H; if (!FC.d){ FC.d = new Int16Array(N); FC.s = new Uint32Array(N); } const st = ++FC.stamp, D_ = FC.d, Ss = FC.s;
  const dd = { get:k => Ss[k] === st ? D_[k] : -1, set:(k,v) => { Ss[k] = st; D_[k] = v; } };
  const q = [idx(si,sj)]; dd.set(q[0], 0);
  let best = null, bs = -1, h = 0;
  while (h < q.length){
    const k = q[h++], i = kI(k), j = kJ(k), d = dd.get(k);
    if (!taken.has(k) && walk(i,j)){
      const fake = { x:i+.5, z:j+.5, stance:'crouch' };
      const pr = threat ? coverProt(fake, threat.x, threat.z).v : anyCover(i,j);
      const sc = pr - d*0.035;
      if (pr >= .3 && sc > bs){ bs = sc; best = [i,j]; }
    }
    if (d >= radius) continue;
    for (const [dx,dy] of DIRS){ const ni = i+dx, nj = j+dy; if (!walk(ni,nj)) continue; const nk = idx(ni,nj); if (dd.get(nk) !== -1) continue; dd.set(nk, d+1); q.push(nk); }
  }
  return best;
}
function anyCover(i,j){ let b = 0; for (const [dx,dy] of DIRS){ const ni=i+dx, nj=j+dy; if (!inB(ni,nj)) continue; const k = idx(ni,nj); if (grid[k]===2 && cov[k]) b = Math.max(b, cov[k].val); } return b; }

