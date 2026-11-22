"use strict";
/* the campaign's opening: Somalia in a few lines, white on black */
const INTRO = {
  es:['Somalia, África Oriental. 1992.',
      'Tras la caída del dictador Siad Barre, los clanes se disputan el país. La guerra y la sequía traen una hambruna que mata a cientos de miles de personas.',
      'El hambre se convierte en un arma: las milicias se quedan con la ayuda que llega a los puertos.',
      'Diciembre de 1992. Una fuerza internacional encabezada por Estados Unidos desembarca para que la comida llegue a quien la necesita.',
      'Junio de 1993. Una emboscada de la milicia del general Mohamed Farrah Aidid mata a veinticuatro cascos azules paquistaníes. La ONU ordena detener a los responsables.',
      'Agosto de 1993. Llega a Mogadiscio la Task Force Ranger: operadores de Delta, Rangers del 75º Regimiento y los pilotos del 160º SOAR.',
      '3 de octubre de 1993, 15:32. Llega un aviso: dos lugartenientes de Aidid están reunidos en un edificio junto al Hotel Olympic, en pleno territorio de la milicia.',
      'La operación debía durar una hora.'],
  en:['Somalia, East Africa. 1992.',
      'After the fall of the dictator Siad Barre, the clans fight over the country. War and drought bring a famine that kills hundreds of thousands of people.',
      'Hunger becomes a weapon: the militias seize the aid that reaches the ports.',
      'December 1992. An international force led by the United States lands so the food reaches those who need it.',
      'June 1993. An ambush by General Mohamed Farrah Aidid\'s militia kills twenty-four Pakistani peacekeepers. The UN orders those responsible to be arrested.',
      'August 1993. Task Force Ranger arrives in Mogadishu: Delta operators, Rangers of the 75th Regiment and the pilots of the 160th SOAR.',
      '3 October 1993, 15:32. A tip comes in: two of Aidid\'s lieutenants are meeting in a building near the Olympic Hotel, deep in militia territory.',
      'The operation was supposed to take one hour.'] };
let introRun = null; var introSeen = false;
function playIntro(after){
  const lines = INTRO[LANG], el = $('introLine'); let k = -1;
  showScreen('scrIntro');
  const next = () => { k++; if (k >= lines.length){ stopIntro(); return; }
    el.classList.remove('on'); setTimeout(() => { el.textContent = lines[k]; el.classList.add('on'); }, 450);
    introRun.t = setTimeout(next, 1800 + lines[k].length*48); };
  introRun = { after, t:null }; next();
}
function stopIntro(){ if (typeof CINTRO !== 'undefined' && CINTRO){ campIntroGo(true); return; } if (!introRun) return; clearTimeout(introRun.t); const f = introRun.after; introRun = null; introSeen = true; markIntro(); $('introLine').classList.remove('on'); if (f) f(); }

/* ---------- screens: title, main menu, campaign, briefing, end, options, credits, pause ---------- */
const SCREENS = ['scrTitle', 'scrMenu', 'scrCamp', 'brief', 'endScr', 'scrOpts', 'scrCred', 'scrPause', 'scrLoad', 'scrIntro', 'scrMan'];
let SCREEN = 'scrTitle', optBack = 'scrMenu';
function showScreen(n){
  SCREEN = n; if (n){ const el = $('curtain'); if (el){ el.hidden = true; el.style.opacity = 0; el.classList.remove('epi'); } m9EpiClear(); }
  if (n === 'scrMenu') renderSaveInfo();
  for (const id of SCREENS){ const el = $(id); if (el) el.hidden = id !== n; }
  const ov = $('overlay'); ov.hidden = !n;
  ov.classList.toggle('ov-title', n === 'scrTitle'); ov.classList.toggle('ov-intro', n === 'scrIntro'); ov.classList.toggle('ov-menu', n === 'scrMenu' || n === 'scrCred' || (n === 'scrOpts' && MIS.id === 'attract'));
  document.body.classList.toggle('attract', !!MIS && MIS.id === 'attract');
  document.body.classList.toggle('menuopen', !!n && !(n === 'brief' && $('overlay').classList.contains('peek')));
  if (n) closeCtx();
}
function initSound(){ if (!AC) initAudio(); else if (AC.state === 'suspended') AC.resume(); startRotorSound(); }
// the tap that leaves the title must not also land on the menu button that appears under the finger
function leaveTitle(){ initSound(); showScreen('scrMenu'); const t0 = performance.now(), eat = e => { if (performance.now() - t0 < 500){ e.stopPropagation(); e.preventDefault(); } removeEventListener('click', eat, true); };
  addEventListener('click', eat, true); setTimeout(() => removeEventListener('click', eat, true), 600); }
function startAttract(){
  setMission('attract');
  G.started = true; G.paused = false; G.autoP = false; G.speed = .65;
  document.body.classList.add('att-blur');
  launchAttractFlight();
  camS.yaw = camS.yawT; camS.zoom = camS.zoomT;
  setTimeout(() => document.body.classList.remove('att-blur'), 1100);
}
/* the loading screen: the heavy, blocking part runs once the screen has painted; the bar then fills over the steps,
   with a note from the field manual to read meanwhile */
let ldTipK = -1;
function loadSeq(eye, title, sub, steps, work, done){
  $('ldEye').textContent = L(eye); $('ldTitle').textContent = L(title); $('ldSub').textContent = L(sub || '');
  const tips = FIELD_TIPS; ldTipK = (ldTipK + 1 + Math.floor(Math.random()*(tips.length - 1))) % tips.length; $('ldTip').textContent = L(tips[ldTipK]);
  const fill = $('ldFill'), st = $('ldStep'), bar = fill.parentNode;
  const set = (f, t) => { fill.style.width = (f*100).toFixed(0) + '%'; bar.setAttribute('aria-valuenow', Math.round(f*100)); if (t) st.textContent = L(t); };
  fill.style.transition = 'none'; set(0, steps[0]); void fill.offsetWidth; fill.style.transition = '';
  showScreen('scrLoad');
  const t0 = performance.now();
  setTimeout(() => { set(.18, steps[0]); setTimeout(() => {
    set(.34, steps[1]);
    setTimeout(() => { work();                                   // blocks while the city is built
      const n = steps.length - 2, dur = Math.max(450, 1300 - (performance.now() - t0));
      for (let k=0;k<n;k++) setTimeout(() => set(.34 + .66*(k + 1)/n, steps[k + 2]), dur*(k + 1)/(n + 1));
      setTimeout(done, dur + 160);
    }, 60);
  }, 220); }, 30);
}
const LOAD_STEPS = ['Recibiendo las órdenes…', 'Cargando el mapa de Mogadiscio…', 'Desplegando las unidades…', 'Comprobando las radios…', 'Listos para salir'];
function goMenu(){ loadSeq('Regresando', 'Cuartel general', 'Aeropuerto de Mogadiscio', ['Cerrando la misión…', 'Volviendo a la base…', 'Listo'], () => startAttract(), () => showScreen('scrMenu')); }
const nextMission = () => { const k = CAMPAIGN.indexOf(MIS.id); return k >= 0 && k < CAMPAIGN.length - 1 ? CAMPAIGN[k + 1] : null; };
const hhmm = h => { const m = Math.round(h*60); return String(Math.floor(m/60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
function openMission(id, direct){
  markLast(id);
  const M_ = MISSIONS[id] || {};
  loadSeq(M_.n > 0 ? `Misión ${M_.n}` : 'Instrucción', M_.title || 'Mogadiscio', `${M_.date || '3 OCT 1993'} · ${hhmm(M_.hour || 12)} · ${M_.place || 'Mogadiscio'}`, LOAD_STEPS,
    () => { setMission(id); if (id === 'irene') { const a_ = cmusEl(); if (a_) a_.load(); } }, () => { if (direct) startMission(); else { fillBrief(); showScreen('brief'); } });
}
function fillBrief(){
  $('bDate').textContent = `${MIS.date || '3 OCT 1993'} · ${hhmm(MIS.hour)} · ${L('MOGADISCIO')}`;
  $('bEyebrow').textContent = MIS.n > 0 ? `${L('Misión')} ${MIS.n} · ${hhmm(MIS.hour)}` : L('Instrucción');
  $('bTitle').textContent = L(MIS.title); $('bName').textContent = L(MIS.title);
  $('bCard').textContent = L(MIS.summary || '');
  $('bText').textContent = L(MIS.text || '');
  $('bPlace').textContent = L(MIS.place || ''); $('bSquad').textContent = L(MIS.squadTxt || '');
  $('bOpt').textContent = ['Que nadie caiga'].concat((MIS.opt || []).map(o => o.text)).map(L).join(' · ');
  $('bBack').textContent = L(MIS.id === 'tutorial' ? 'Menú principal' : 'Campaña');
  $('bFinale').hidden = !FINALES[MIS.id];
}
$('bBack').onclick = () => { if (MIS.id === 'tutorial') goMenu(); else { renderCampaign(); showScreen('scrCamp'); } };

/* ---------- campaign save: kept in this browser and, when the game runs as a published page on claude.ai, in the player's own
   private store there too, so the progress survives closing the game, clearing the browser or opening it on another device ---------- */
const SAVE = { v:1, done:[], res:{}, last:null, intro:false, at:0 };
let cloud = null, cloudQ = Promise.resolve(), saveReady = false;
function saveMerge(o){
  if (!o || typeof o !== 'object') return false; let ch = false;
  for (const id of Array.isArray(o.done) ? o.done : []) if (typeof id === 'string' && MISSIONS[id] && !SAVE.done.includes(id)){ SAVE.done.push(id); ch = true; }
  for (const id in (o.res || {})){ const a = SAVE.res[id], b = o.res[id]; if (!b || !MISSIONS[id]) continue;
    if (!a || (b.opt || 0) > (a.opt || 0) || ((b.opt || 0) === (a.opt || 0) && (b.secs || 1e9) < (a.secs || 1e9))){ SAVE.res[id] = b; ch = true; } }
  if (o.intro && !SAVE.intro){ SAVE.intro = true; ch = true; }
  if ((o.at || 0) > (SAVE.at || 0) && o.last && MISSIONS[o.last]){ SAVE.last = o.last; SAVE.at = o.at; ch = true; }
  return ch;
}
function saveLocal(){ try { localStorage.setItem('bhd.save', JSON.stringify(SAVE)); localStorage.setItem('bhd.done', JSON.stringify(SAVE.done)); } catch(e){} }
function saveCloud(){ if (!cloud) return; const body = JSON.parse(JSON.stringify(SAVE));
  cloudQ = cloudQ.then(() => cloud.set(body)).catch(() => {}); }   // one write at a time, in order
function saveNow(){ SAVE.at = Date.now(); saveLocal(); saveCloud(); renderSaveInfo(); }
(function loadSave(){
  try { saveMerge(JSON.parse(localStorage.getItem('bhd.save') || 'null')); } catch(e){}
  try { saveMerge({ done:JSON.parse(localStorage.getItem('bhd.done') || '[]') }); } catch(e){}   // progress from before this save existed
  introSeen = introSeen || SAVE.intro; saveReady = true;
  // the private cloud copy: only on claude.ai, only for a signed-in player; the game never waits for it
  if (window.claude && typeof window.claude.use === 'function') (async () => {
    try { const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); if (!db || !user) return;
      const id = await user.id(); if (!id) return;
      const ref = db.doc('data/users/' + id + '/campaign'), snap = await ref.get();
      cloud = ref; const theirs = snap.exists ? snap.data() : null;
      saveMerge(theirs); introSeen = introSeen || SAVE.intro; saveLocal();
      if (!theirs || JSON.stringify(theirs) !== JSON.stringify(SAVE)) saveCloud();   // the cloud copy catches up with what this browser had
      SAVE.cloud = true; renderSaveInfo(); if (SCREEN === 'scrCamp') renderCampaign();
    } catch(e){}
  })();
})();
function doneSet(){ return new Set(SAVE.done); }
function markDone(id, r){ if (!SAVE.done.includes(id)) SAVE.done.push(id); if (r) saveMerge({ res:{ [id]:r } }); saveNow(); }
function markLast(id){ if (id && CAMPAIGN.includes(id) && SAVE.last !== id){ SAVE.last = id; saveNow(); } }
function markIntro(){ if (!SAVE.intro){ SAVE.intro = true; saveNow(); } }
// the next mission to play: the one after the last one won, or the last one opened
function resumeMission(){ for (const id of CAMPAIGN) if (!SAVE.done.includes(id)) return id; return SAVE.last || CAMPAIGN[0]; }
function renderSaveInfo(){
  const b = $('mCont'); if (!b) return;
  const any = SAVE.done.length > 0 || !!SAVE.last; b.hidden = !any; if (!any) return;
  const id = resumeMission(), M_ = MISSIONS[id];
  b.querySelector('em').textContent = `${L('Misión')} ${M_.n} · ${L(M_.title)} · ${SAVE.done.length}/${CAMPAIGN.length} ${L('cumplidas')}` + (SAVE.cloud ? ' · ' + L('guardado en tu cuenta') : '');
}
const PHASE_HEAD = { irene:'Día · 3 de octubre', perim:'Atardecer y noche · visores y bengalas', mile:'Amanecer · 4 de octubre' };
function renderCampaign(){
  const done = doneSet();
  const tl = CAMPAIGN.map(id => { const M_ = MISSIONS[id]; return `<button class="tl-n${done.has(id) ? ' done' : ''}" data-m="${id}" title="${L(M_.title)}"><i></i><b>${hhmm(M_.hour)}</b><span>${L(M_.title)}</span></button>`; }).join('');
  let rows = '';
  for (const id of CAMPAIGN){ const M_ = MISSIONS[id];
    if (PHASE_HEAD[id]) rows += `<li class="ph-head">${L(PHASE_HEAD[id])}</li>`;
    rows += `<li><button class="mrow2${done.has(id) ? ' done' : ''}" data-m="${id}">
      <span class="mn">${M_.n}</span><span class="mh">${hhmm(M_.hour)}</span>
      <span class="mt"><b>${L(M_.title)}</b><em>${L(M_.place)} · ${L(M_.squadTxt)}</em><small>${L(M_.summary)}</small></span>
      <span class="ms">${done.has(id) ? L('Cumplida') + (SAVE.res[id] ? `<small>${SAVE.res[id].opt}/${SAVE.res[id].of} ${L('opcionales')}</small>` : '') : ''}</span></button></li>`; }
  $('campTl').innerHTML = tl; $('campList').innerHTML = rows;
  for (const b of document.querySelectorAll('#scrCamp [data-m]')) b.onclick = () => openMission(b.dataset.m);
}

/* options: kept in this browser */
const OPT = { sound:true, autoP:true, draw:true, q:1, rays:true, music:true };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('bhd.opt') || '{}')); } catch(e){}
if (!OPT.q2){ OPT.q2 = 1; OPT.q = OPT.q >= 3 ? 2.5 : OPT.q >= 2 ? 1.5 : 1; }   // the old steps were coarser: everyone moves up one
function saveOpt(){ try { localStorage.setItem('bhd.opt', JSON.stringify(OPT)); } catch(e){} }
function renderOpts(){
  const set = (id, on) => { const b = $(id); if (b){ b.setAttribute('aria-pressed', on); b.querySelector('em').textContent = L(on ? 'Sí' : 'No'); } };
  for (const b of document.querySelectorAll('.langbtn')) b.setAttribute('aria-pressed', b.dataset.lang === LANG);
  set('opSound', soundOn); set('opAuto', OPT.autoP); set('opDraw', OPT.draw); set('opRays', OPT.rays !== false); set('opMusic', OPT.music !== false);
  for (const b of document.querySelectorAll('#opQ button')) b.setAttribute('aria-pressed', +b.dataset.q === OPT.q);
  const g = OPT.gfx || (GFX_PHONE ? 'mid' : 'high'); for (const b of document.querySelectorAll('#opG button')) b.setAttribute('aria-pressed', b.dataset.g === g);
  set('opDyn', OPT.dyn !== false); set('opFps', !!OPT.fps);
}
$('opSound').onclick = () => setSound(!soundOn);
$('opAuto').onclick = () => { OPT.autoP = !OPT.autoP; if (G && MIS.id !== 'attract') G.autoP = OPT.autoP; $('bAuto').setAttribute('aria-pressed', OPT.autoP); saveOpt(); renderOpts(); };
$('opDraw').onclick = () => { OPT.draw = !OPT.draw; saveOpt(); renderOpts(); };
$('opRays').onclick = () => { OPT.rays = OPT.rays === false; saveOpt(); renderOpts(); };
$('opMusic').onclick = () => { OPT.music = OPT.music === false; saveOpt(); renderOpts(); };
// the browser only lets sound start after a touch or a key: the first one anywhere wakes the audio, so the music can begin
addEventListener('pointerdown', () => { if (!AC) initAudio(); else if (AC.state === 'suspended') AC.resume(); }, { once:true, capture:true });
addEventListener('keydown', () => { if (!AC) initAudio(); else if (AC.state === 'suspended') AC.resume(); }, { once:true, capture:true });
for (const b of document.querySelectorAll('#opQ button')) b.onclick = () => { OPT.q = +b.dataset.q; PS = OPT.q; resize(); saveOpt(); renderOpts(); };
$('opBack').onclick = () => showScreen(optBack);
for (const b of document.querySelectorAll('#opG button')) b.onclick = () => { OPT.gfx = b.dataset.g; applyGfx(); saveOpt(); renderOpts(); };
$('opDyn').onclick = () => { OPT.dyn = OPT.dyn === false; if (OPT.dyn === false) DYN.i = 0; saveOpt(); renderOpts(); };
$('opFps').onclick = () => { OPT.fps = !OPT.fps; const el = $('fpsC'); if (el) el.hidden = !OPT.fps; saveOpt(); renderOpts(); };
{ const el = document.createElement('div'); el.id = 'fpsC'; el.hidden = true;
  el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 3px);transform:translateX(-50%);z-index:60;pointer-events:none;font:600 11px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#f2ead8;background:rgba(0,0,0,.42);padding:1px 7px;border-radius:4px;letter-spacing:.04em';
  document.body.appendChild(el); }
{ const w = $('swWarn'), c = $('swWarnClose');
  if (w && SW_RENDERER){ w.hidden = false; }
  if (c) c.onclick = e => { e.stopPropagation(); w.hidden = true; }; }
applyGfx();

/* pause menu during a mission */
function pauseMenu(){ if (!G.started || G.over) return; G.wasPaused = G.paused; G.paused = true; updPause(); showScreen('scrPause'); }
function resumeGame(){ showScreen(null); G.paused = !!G.wasPaused; updPause(); }
$('bMenu').onclick = () => pauseMenu();
$('pResume').onclick = () => resumeGame();
$('pRestart').onclick = () => openMission(MIS.id, true);
$('pOpts').onclick = () => { optBack = 'scrPause'; renderOpts(); showScreen('scrOpts'); };
$('pQuit').onclick = () => { if (FLIGHT.on) endFlightQuiet(); goMenu(); };
function endFlightQuiet(){ for (const h of FLIGHT.helis) world.remove(h.g); FLIGHT = { on:false }; FOCUS2 = null; document.body.classList.remove('cine'); $('bSkip').hidden = true; $('cine').hidden = true; $('flyUnits').innerHTML = ''; }

/* main menu */
$('mCont').onclick = () => { const id = resumeMission(); const go = () => openMission(id); if (!introSeen) playIntro(go); else go(); };
$('mCamp').onclick = () => { const go = () => { renderCampaign(); showScreen('scrCamp'); }; if (!introSeen) playIntro(go); else go(); };
$('campIntro').onclick = () => playIntro(() => { renderCampaign(); showScreen('scrCamp'); });
$('introSkip').onclick = e => { e.stopPropagation(); stopIntro(); };
$('scrIntro').addEventListener('pointerdown', e => { if (e.target.id !== 'introSkip') stopIntro(); });
for (const b of document.querySelectorAll('.langbtn')) b.onclick = () => setLang(b.dataset.lang);
$('mTut').onclick = () => openMission('tutorial');
$('mOpts').onclick = () => { optBack = 'scrMenu'; renderOpts(); showScreen('scrOpts'); };
$('mCred').onclick = () => showScreen('scrCred');
/* the field manual: page 0 is the cover, then MANUAL's pages; one page at a time, turned with the arrows, a swipe or the keys */
let manK = 0, MANP = null, manW = 0;
function manText(k){ const P_ = MANUAL[k - 1], en = LANG === 'en';
  const l = t => en ? (MAN_SK_EN[t] || t) : t;
  let h = (en ? P_[2] : P_[1]).replace(/\{sk:(\w+)\}/g, (_, n) => MAN_SK[n] ? MAN_SK[n](l) : '')
    .replace(/\{btn:(\w+)\}/g, (_, id) => { const b = $(id), sv = b && b.querySelector('svg'); return `<span class="kb">${sv ? sv.outerHTML : `<small>${b ? b.textContent.trim().slice(0, 4).toUpperCase() : ''}</small>`}</span>`; });
  return `<h3>${L(P_[0])}</h3>${h}`; }
/* fixed sheets, no scrolling: each chapter is laid out on as many sheets as it needs. What does not fit on a sheet
   goes over to the next, a list item or table row at a time, measured on an invisible sheet of the same size. */
function manPaginate(){
  const B_ = $('manBook'), probe = document.createElement('div');
  probe.className = 'man-page'; probe.style.visibility = 'hidden'; probe.style.pointerEvents = 'none';
  const inner = document.createElement('div'); inner.className = 'mp-in'; probe.appendChild(inner); B_.appendChild(probe);
  const pages = [], first = [];
  for (let c = 1; c <= MANUAL.length; c++){
    const tmp = document.createElement('div'); tmp.innerHTML = manText(c);
    // the pieces that can go on a sheet: a heading, a sketch, a paragraph, one list item, one table row
    const blocks = [];
    for (const el of [...tmp.children]){
      if (el.tagName === 'UL' || el.tagName === 'OL'){ let i = 0; for (const li of [...el.children]) blocks.push({ wrap:el, start:++i, el:li }); }
      else if (el.tagName === 'TABLE'){ for (const tr of [...el.querySelectorAll('tr')]) blocks.push({ wrap:el, el:tr }); }
      else blocks.push({ el });
    }
    const title = tmp.querySelector('h3') ? tmp.querySelector('h3').textContent : '';
    first[c] = pages.length;
    let k = 0, cont = false;
    while (k < blocks.length){
      inner.innerHTML = ''; let cur = null, curWrap = null, n = 0;
      if (cont){ const h = document.createElement('h3'); h.textContent = title + ' ' + L('(sigue)'); inner.appendChild(h); }
      while (k < blocks.length){
        const bk = blocks[k]; let node;
        if (bk.wrap){
          if (curWrap !== bk.wrap){ cur = bk.wrap.cloneNode(false); if (bk.wrap.tagName === 'OL') cur.setAttribute('start', bk.start); if (bk.wrap.tagName === 'TABLE') cur.appendChild(document.createElement('tbody')); inner.appendChild(cur); curWrap = bk.wrap; }
          node = bk.el.cloneNode(true); (cur.tagName === 'TABLE' ? cur.tBodies[0] : cur).appendChild(node);
        } else { node = bk.el.cloneNode(true); inner.appendChild(node); cur = null; curWrap = null; }
        if (inner.scrollHeight > inner.clientHeight + 1 && n > 0 && !(n === 1 && blocks[k - 1].el.tagName === 'H3')){
          node.remove(); if (cur && !cur.querySelector('li,tr')) cur.remove(); break; }
        n++; k++;
      }
      // a heading left alone at the bottom of a sheet goes over with what follows it
      const last = inner.lastElementChild; if (last && last.tagName === 'H3' && k < blocks.length && n > 1 && !cont){ last.remove(); k--; }
      pages.push({ html:inner.innerHTML, ch:c }); cont = true;
    }
  }
  probe.remove();
  MANP = { pages, first }; manW = B_.clientWidth + 'x' + B_.clientHeight;
}
function manRender(dir){
  const B_ = $('manBook');
  if (!MANP || manW !== B_.clientWidth + 'x' + B_.clientHeight) manPaginate();
  const n = MANP.pages.length + 1; manK = clamp(manK, 0, n - 1);
  if (manK === 0) B_.innerHTML = `<div class="man-cover"><span class="mc-strip"></span><div class="mc-stencil">${L('MANUAL DE CAMPO')}</div>
      <div class="mc-sub">FM 93-M · TASK FORCE RANGER</div><div class="mc-label"><span>${L('Mogadiscio, Somalia')}</span><span>${L('Sgto. — Cía. B, 3/75')}</span><span>Oct. 1993</span></div>
      <div class="mc-stamp">${L('RESTRINGIDO')}</div><span class="mc-ring"></span><button id="manOpen" class="mc-open">${L('Abrir el cuaderno')}</button></div>`;
  else B_.innerHTML = `<div class="man-page${manK % 4 === 1 ? ' stain' : manK % 4 === 3 ? ' stain stain2' : ''}"><div class="mp-in">${MANP.pages[manK - 1].html}</div><span class="mp-n">${manK}</span></div>`;
  B_.classList.remove('turnL', 'turnR'); void B_.offsetWidth; if (dir) B_.classList.add(dir > 0 ? 'turnR' : 'turnL');
  $('manPg').textContent = manK === 0 ? L('Portada') : `${manK} / ${n - 1}`;
  $('manPrev').disabled = manK === 0; $('manNext').disabled = manK === n - 1;
  const op = $('manOpen'); if (op) op.onclick = () => { manK = 1; manRender(1); };
  for (const li of B_.querySelectorAll('[data-go]')) li.onclick = () => { manK = MANP.first[+li.dataset.go] + 1; manRender(1); };
}
function manLast(){ return MANP ? MANP.pages.length : MANUAL.length; }
// the sheets are measured again when the window changes size or the handwriting font arrives
addEventListener('resize', () => { if (SCREEN !== 'scrMan') return; clearTimeout(manRender.t); manRender.t = setTimeout(() => { const ch = manK > 0 && MANP ? MANP.pages[manK - 1].ch : 0; MANP = null; manRender(0); if (ch){ manK = MANP.first[ch] + 1; manRender(0); } }, 200); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { MANP = null; if (SCREEN === 'scrMan') manRender(0); });
function openManual(){ manK = 0; MANP = null; showScreen('scrMan'); manRender(0); }
$('mMan').onclick = () => openManual();
$('manPrev').onclick = () => { manK--; manRender(-1); };
$('manNext').onclick = () => { manK++; manRender(1); };
$('manClose').onclick = () => showScreen('scrMenu');
addEventListener('keydown', e => { if (SCREEN !== 'scrMan') return; const k = e.key;
  if (k === 'ArrowRight' || k === 'PageDown'){ e.preventDefault(); e.stopImmediatePropagation(); if (manK < manLast()){ manK++; manRender(1); } }
  else if (k === 'ArrowLeft' || k === 'PageUp'){ e.preventDefault(); e.stopImmediatePropagation(); if (manK > 0){ manK--; manRender(-1); } }
  else if (k === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); showScreen('scrMenu'); } }, true);
{ let sx = null, sy = 0; const bk = $('manBook');
  bk.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  bk.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.5){ if (dx < 0 && manK < manLast()){ manK++; manRender(1); } else if (dx > 0 && manK > 0){ manK--; manRender(-1); } } }); }
$('campBack').onclick = () => { if (MIS.id !== 'attract') goMenu(); else showScreen('scrMenu'); };
$('credBack').onclick = () => showScreen('scrMenu');
$('scrTitle').addEventListener('pointerdown', e => { e.preventDefault(); leaveTitle(); });

/* ---------- light pool: every lamp, fire, flash and vest light keeps working as before, but only the few that matter most
   on screen (bright, near the view) are switched on for the shaders; the count never changes, so nothing recompiles ---------- */
let LP_PT = [], LP_SP = [], LP_N = 0, LP_SON = false; const LP_S = [];
function lpShown(o){ while (o && o !== scene){ if (!o.visible && !o.isLight) return false; o = o.parent; } return !!o; }
function lpPick(arr, K, R){
  LP_S.length = 0;
  for (const L of arr){ if (!lpShown(L)){ L.visible = false; continue; }
    const e = L.matrixWorld.elements, x = L.parent === scene ? L.position.x : e[12], z = L.parent === scene ? L.position.z : e[14];
    const d = Math.hypot(x - camS.tx, z - camS.tz), reach = L.distance || 8;
    let sc = L.intensity > .001 ? (L.intensity + .1)*reach : 0; if (d > R + reach) sc *= .001; else if (d > R) sc /= 1 + (d - R);
    LP_S.push([sc, L]); }
  LP_S.sort((a, b) => b[0] - a[0]);
  for (let k=0;k<LP_S.length;k++) LP_S[k][1].visible = k < K;
}
function lightPool(){
  if (LP_N++ % 30 === 0){ LP_PT = []; LP_SP = []; scene.traverse(o => { if (o.isPointLight) LP_PT.push(o); else if (o.isSpotLight) LP_SP.push(o); }); }
  const Q = gfxQ(), hh = halfH(), R = Math.hypot(hh*innerWidth/innerHeight, hh/Math.sin(camS.pitch)) + 2;
  lpPick(LP_PT, Q.pt, R);
  LP_SON = nightF > (LP_SON ? .2 : .3);
  lpPick(LP_SP, LP_SON ? Q.sp : 0, R);
}
/* dynamic resolution: when the frame rate stays under 28 the picture is drawn a step coarser (up to about 57 %), and finer again
   once it is comfortably over 52; the FPS counter (Options) shows the rate and the scale */
const DYN = { i:0, acc:0, n:0, fps:60, cool:0 }, DYN_K = [1, 1.2, 1.45, 1.75];
function dynTick(raw){
  if (!(raw > 0) || raw > 1) return;
  DYN.acc += raw; DYN.n++;
  if (DYN.acc < 1) return;
  DYN.fps = DYN.n/DYN.acc; DYN.acc = 0; DYN.n = 0;
  const active = G && G.started && !G.paused && !G.over && !document.hidden;
  if (OPT.dyn === false) DYN.i = 0;
  else if (active){ DYN.cool--;
    if (DYN.fps < 28 && DYN.i < DYN_K.length - 1 && DYN.cool <= 0){ DYN.i++; DYN.cool = 2; }
    else if (DYN.fps > 52 && DYN.i > 0 && DYN.cool <= -5){ DYN.i--; DYN.cool = 2; } }
  const el = $('fpsC'); if (el){ el.hidden = !OPT.fps; if (OPT.fps) el.textContent = Math.round(DYN.fps) + ' FPS' + (DYN.i ? ' · ' + Math.round(100/DYN_K[DYN.i]) + ' %' : ''); }
}
/* animation pacing: men out of view are posed every fourth frame, and every other frame when the camera is far out */
let ANP_F = -1, ANP_R = 0;
function animDue(u, dt){
  if (ANP_F !== frameStamp){ ANP_F = frameStamp; const hh = halfH(); ANP_R = Math.hypot(hh*innerWidth/innerHeight, hh/Math.sin(camS.pitch)) + 3; }
  u._anA = (u._anA || 0) + dt; if (u._anO == null) u._anO = (Math.random()*4) | 0;
  const r = u.m.root, off = !r.visible || Math.hypot(u.x - camS.tx, u.z - camS.tz) > ANP_R;
  const every = off ? 4 : camS.zoom > gfxQ().far ? 2 : 1;
  u._anK = (u._anK || 0) + 1;
  if (every > 1 && (u._anK + u._anO) % every) return false;
  u._anD = Math.min(u._anA, .12); u._anA = 0; return true;
}
function applyGfx(){
  const g = OPT.gfx || (GFX_PHONE ? 'mid' : 'high'); GFX = GFXQ[g] || GFXQ.high; const Q = GFX;
  if (sun.shadow.mapSize.x !== Q.sm){ sun.shadow.mapSize.set(Q.sm, Q.sm); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } }
  const ty = Q.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
  if (renderer.shadowMap.type !== ty){ renderer.shadowMap.type = ty; scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }
  for (const m of CASTS){ if (!m.parent){ CASTS.delete(m); continue; } m.castShadow = m.userData.cast0 && m.userData.castR >= Q.castR; }
  if (typeof chunkMesh !== 'undefined' && chunkMesh) chunkMesh.castShadow = Q.dsh;
  if (CRIT) CRIT.castShadow = Q.dsh;
  SHK.force = true;
}

/* ---------- render sync ---------- */
function sync(rdt){
  const iconF = clamp((camS.zoom - 10.5) / 3, 0, 1), closeF = clamp((9 - camS.zoom) / 4, 0, 1);
  const ringS = 1 + Math.max(0, camS.zoom - 6) * .05, iconS = halfH() * .075;
  const adt = G.paused && G.started ? 0 : rdt * (G.started ? G.speed : 1);
  for (const u of units){
    const r = u.m.root;
    r.position.set(u.x, u.elev || 0, u.z);
    if (u.m.wallB > .01){ r.position.x -= Math.sin(u.wall || r.rotation.y)*.24*u.m.wallB; r.position.z -= Math.cos(u.wall || r.rotation.y)*.24*u.m.wallB; }
    let df = u.face - r.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); r.rotation.y += clamp(df * Math.min(1, adt*6), -adt*5.5, adt*5.5);
    if (animDue(u, adt)) animRig(u, u._anD);
    if (u.pushup != null) pushupPose(u);
    r.visible = u.team === 'us' || !u.alive || u.spotted || CINE.on || MIS.id === 'attract' || !!u.dummy;
    if (u.m.tg) u.m.tg.rotation.x += ((u.alive ? 0 : -1.42) - u.m.tg.rotation.x)*Math.min(1, adt*5);
    const vis = u.alive && !u.npc && (u.team === 'us' || u.spotted) && MIS.id !== 'attract' && !CINE.on, M = u.m;
    M.ring.visible = vis && iconF < .95; M.ring.position.set(u.x, (u.elev || 0) + .03, u.z); M.ring.scale.setScalar(ringS); M.ring.material.opacity = (.38 + .2*closeF) * (1 - iconF*.8);
    if (M.sel){ M.sel.visible = G.sel.has(u) && u.alive && iconF < .95 && !CINE.on; M.sel.position.set(u.x, (u.elev || 0) + .035, u.z); M.sel.scale.setScalar(ringS * (1 + Math.sin(performance.now()/260)*.025)); }
    const kind = u.team === 'them' ? 'them' : (!u.alive ? 'down' : G.sel.has(u) ? 'sel' : 'us');
    const inside = !!(u.alive && u.inB && u.inB.level === 'ground');
    M.icon.visible = MIS.id !== 'attract' && !CINE.on && !u.npc && (iconF > .02 || inside) && (u.team === 'us' ? (u.alive || u.down) : vis);
    if (M.icon.visible){ if (M.iconKind !== kind){ M.icon.material.map = ICONS[kind]; M.icon.material.needsUpdate = true; M.iconKind = kind; }
      M.icon.material.opacity = Math.max(iconF, inside ? .9 : 0); M.icon.scale.set(iconS, iconS, 1); M.icon.position.set(u.x, (u.elev || 0) + (inside ? 2.4 : 1.6) + iconS*.5, u.z); }
    M.mark.visible = false;
    if (u.down) { M.mark.visible = false; M.mark.position.y = .6 + Math.sin(G.t*4)*.08; } else M.mark.position.y = u.stance === 'prone' ? .7 : u.stance === 'crouch' ? 1.25 : 1.55;
    if (u.team === 'them'){
      const g = G.ghosts.get(u), gh = M.ghost;
      gh.visible = false;
      if (gh.visible){ gh.position.set(g.x, 1.1 + Math.sin(G.t*3)*.08, g.z); gh.rotation.y += rdt*2; gh.material.opacity = .7 * (1 - (G.t-g.t)/10); gh.scale.setScalar(ringS); }
    }
  }
  updCrew(adt); updStadCrew(adt); syncCivs(adt);
  objRing.visible = MIS.id !== 'attract' && !CINE.on && !MIS.noObjRing; objRing.material.color.setHex(MIS.objCol || 0xe7a63d);
  objRing.material.opacity = .45 + Math.sin(performance.now()/300)*.25;
  updConvoySyms();
}

/* ---------- planned routes: drawn flat on the ground, over everything, like Door Kickers ---------- */
const RT_MAX = 30000, rtPos = new Float32Array(RT_MAX*3), rtCol = new Float32Array(RT_MAX*3);
const rtGeo = new T.BufferGeometry();
rtGeo.setAttribute('position', new T.BufferAttribute(rtPos, 3).setUsage(T.DynamicDrawUsage));
rtGeo.setAttribute('color', new T.BufferAttribute(rtCol, 3).setUsage(T.DynamicDrawUsage));
const rtMesh = new T.Mesh(rtGeo, new T.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:.75, depthTest:true, depthWrite:false, fog:false, side:T.DoubleSide, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4 }));
rtMesh.frustumCulled = false; rtMesh.renderOrder = 2; let rtY = .07;
const ROUTE_COLS = [0x4fe0b8, 0xf2d14b, 0xc08cff, 0xff8fb8, 0x9be15d, 0x5fd4ff, 0xffffff, 0xffb070].map(c => new T.Color(c)); let routeColI = 0;
const nextRouteCol = () => ROUTE_COLS[routeColI++ % ROUTE_COLS.length];
const RC_LB = new T.Color(0xff8a2a), RC_NVG = new T.Color(0x56e86a), RC_SEL = new T.Color(0xffffff), RC_DIM = new T.Color(0xd8d8d8), RC_ATK = new T.Color(0xff4a36), RC_SUP = new T.Color(0xe7a63d);
let rtN = 0;
function rtQuad(ax, az, bx, bz, w, col){
  if (rtN + 6 > RT_MAX) return;
  const dx = bx-ax, dz = bz-az, L = Math.hypot(dx,dz) || 1, px = -dz/L*w/2, pz = dx/L*w/2;
  const P = [ax+px, az+pz, ax-px, az-pz, bx+px, bz+pz, bx-px, bz-pz];
  for (const k of [0,1,2,2,1,3]){ const o = rtN*3; rtPos[o] = P[k*2]; rtPos[o+1] = rtY; rtPos[o+2] = P[k*2+1]; rtCol[o] = col.r; rtCol[o+1] = col.g; rtCol[o+2] = col.b; rtN++; }
}
function rtLine(pts, w, col, dash){
  let acc = 0;
  for (let i=1;i<pts.length;i++){
    const a = pts[i-1], b = pts[i], L = Math.hypot(b[0]-a[0], b[1]-a[1]); if (L < 1e-4) continue;
    if (!dash){ rtQuad(a[0], a[1], b[0], b[1], w, col); continue; }
    for (let t=0, guard=0; t<L && guard < 400; guard++){
      const ph = acc % .5, on = ph < .3, step = Math.max(.004, Math.min(L - t, on ? .3 - ph : .5 - ph));
      if (on){ const t0 = t/L, t1 = (t+step)/L; rtQuad(a[0]+(b[0]-a[0])*t0, a[1]+(b[1]-a[1])*t0, a[0]+(b[0]-a[0])*t1, a[1]+(b[1]-a[1])*t1, w, col); }
      t += step; acc += step;
    }
  }
}
function rtMark(x, z, s, col){ rtQuad(x - s, z, x + s, z, s*2, col); }
function rtCircle(x, z, r, w, col){ const n = 18; for (let k=0;k<n;k++){ const a0 = k/n*6.2832, a1 = (k + 1)/n*6.2832; rtQuad(x + Math.sin(a0)*r, z + Math.cos(a0)*r, x + Math.sin(a1)*r, z + Math.cos(a1)*r, w, col); } }
function drawRoutes(){
  if (rtMesh.parent !== world) world.add(rtMesh);
  rtN = 0; rtY = .07;
  const nt = clamp(NIGHTG.value, 0, 1); rtMesh.material.opacity = .75 + .25*nt; const nw = 1 + .6*nt;
  if (G.started && !G.over && MIS.id !== 'attract' && !CINE.on) for (const u of us){
    if (!u.alive || u.npc) continue;   // scripted men (base life, the medics) walk without a painted route
    const sel = G.sel.has(u), w = (sel ? .1 : .065)*nw, col = u.routeCol || (sel ? RC_SEL : RC_DIM);
    rtY = (u.elev || 0) + .07;
    if (u.path.length){
      const pts = [[u.x, u.z]]; for (const c of u.path) pts.push([c[0]+.5, c[1]+.5]);
      rtLine(curvePts(pts, 3), u.routeCol ? w*1.1 : w, col, !sel && !u.routeCol);
      const e = pts[pts.length-1]; rtCircle(e[0], e[1], sel ? .26 : .2, (sel ? .07 : .055)*nw, col);
    }
    const o = u.order;
    if (o && o.type === 'attack' && o.target.alive && (o.target.spotted || sel)) rtLine([[u.x, u.z], [o.target.x, o.target.z]], .055, RC_ATK, true);
    if (o && o.type === 'suppress') rtLine([[u.x, u.z], [o.x, o.z]], .055, RC_SUP, true);
  }
  rtY = .07;
  if (G.started && !G.over){
    if (G.draft && G.draft.length > 1) rtLine(curvePts(G.draft, 2), .1*nw, RC_SEL, false);
    if (SUP){
      const lbLine = (a, b) => { const dx = b[0]-a[0], dz = b[1]-a[1], L = Math.hypot(dx, dz) || 1, ux = dx/L, uz = dz/L, nx = -uz*LB_HW, nz = ux*LB_HW;
        // the strip that will be swept: dashed border, hatching across it, the flight line down the middle and a big arrow
        const c1 = [a[0]+nx, a[1]+nz], c2 = [b[0]+nx, b[1]+nz], c3 = [b[0]-nx, b[1]-nz], c4 = [a[0]-nx, a[1]-nz];
        const k = Math.max(1, camS.zoom/9);
        rtLine([c1, c2, c3, c4, c1], .32*k, RC_LB, false);
        for (let t=1.2; t<L; t+=2.4){ const p = [a[0]+ux*t, a[1]+uz*t]; rtQuad(p[0]+nx*.95 - ux*1.3, p[1]+nz*.95 - uz*1.3, p[0]-nx*.95 + ux*1.3, p[1]-nz*.95 + uz*1.3, .16*k, RC_LB); }
        for (let t=0; t<L; t+=2.2) rtQuad(a[0]+ux*t, a[1]+uz*t, a[0]+ux*Math.min(L, t+1.3), a[1]+uz*Math.min(L, t+1.3), .22*k, RC_LB);
        rtQuad(b[0] + ux*2.5, b[1] + uz*2.5, b[0] - ux*1.5 - uz*2.2, b[1] - uz*1.5 + ux*2.2, .4, RC_LB); rtQuad(b[0] + ux*2.5, b[1] + uz*2.5, b[0] - ux*1.5 + uz*2.2, b[1] - uz*1.5 - ux*2.2, .4, RC_LB);
        rtMark(a[0], a[1], .6, RC_LB); };
      if (SUP.draft) lbLine(SUP.draft[0], SUP.draft[1]); else if (SUP.lbA && G.mode === 'lb') rtMark(SUP.lbA[0], SUP.lbA[1], .7, RC_LB);
      for (const r of SUP.runs) if (r.s < r.cum[2] && !r.noMark) lbLine(r.a, r.b);
    }
  }
  rtGeo.setDrawRange(0, rtN); rtGeo.attributes.position.needsUpdate = true; rtGeo.attributes.color.needsUpdate = true;
}

