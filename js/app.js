import { createScene } from './scene.js';
import { store, KRATHONGS, kr, krSrc } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = createScene($('#scene'));

/* ---------- state (survives page changes & reloads) ---------- */
const DRAFT = 'phalanupap.draft.v1';
let S = { krathong: null, name: '', wish: '', last: null, mine: [] };
try { S = { ...S, ...JSON.parse(localStorage.getItem(DRAFT)) }; } catch {}
const save = () => { try { localStorage.setItem(DRAFT, JSON.stringify(S)); } catch {} };

const portrait = () => innerHeight > innerWidth;

/* ---------- router ---------- */
const ROUTES = ['home', 'about', 'select', 'wish', 'float', 'river'];
let current = '';
let busy = false;

function parse() {
  const r = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  return ROUTES.includes(r) ? r : 'home';
}
function guard(r) {
  if (r === 'wish' && !S.krathong) return 'select';
  if (r === 'float' && !S.last) return 'select';
  return r;
}
async function route() {
  let r = guard(parse());
  if (r !== parse()) { history.replaceState(null, '', '#/' + r); }
  const view = r === 'about' ? 'home' : r;
  const same = view === current;
  if (same) { if (r === 'about') $('#about').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); else if (r === 'home') scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); setNav(r); return; }
  if (busy) return;
  busy = true;
  const veil = $('#veil');
  if (current) { veil.classList.add('on'); await wait(reduce ? 0 : 260); }
  $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === view));
  document.body.dataset.view = view;
  current = view;
  scrollTo({ top: 0, behavior: 'instant' }); // html has scroll-behavior:smooth, so be explicit
  setNav(r);
  closeMenu();
  enter[view]?.();
  if (r === 'about') requestAnimationFrame(() => $('#about').scrollIntoView({ behavior: 'instant' }));
  veil.classList.remove('on');
  busy = false;
  const w = guard(parse());
  if ((w === 'about' ? 'home' : w) !== current) route();
// warm the other krathong images after the page is idle so the select page opens instantly
addEventListener('load', () => setTimeout(() => KRATHONGS.forEach((k) => { new Image().src = krSrc(k.id); }), 1500)); // a click landed mid-transition
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function setNav(r) {
  const key = r === 'wish' ? 'select' : r === 'float' ? 'select' : r;
  $$('.menu a').forEach((a) => a.classList.toggle('on', a.dataset.route === key));
}
addEventListener('hashchange', route);
addEventListener('resize', () => { if (current === 'river') layoutRiver(); });

/* ---------- nav ---------- */
const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
const onScroll = () => nav.classList.toggle('solid', scrollY > 30 || current !== 'home');
addEventListener('scroll', onScroll, { passive: true });
function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); onScroll(); }
burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });


/* ================= SELECT ================= */
const cardsEl = $('#cards');
cardsEl.innerHTML = KRATHONGS.map((k) => `
  <button type="button" class="card" role="radio" aria-checked="false" data-id="${k.id}">
    <div class="kr"><img src="${krSrc(k.id)}" alt="${k.name}" width="1280" height="720" loading="lazy" decoding="async"></div>
    <span class="nm">${k.name}</span>
  </button>`).join('');
const pv = { img: $('#pv-img'), name: $('#pv-name'), desc: $('#pv-desc'), btn: $('#pv-confirm'), box: $('#pv-kr') };
let picked = null;
function pick(id) {
  picked = id;
  $$('.card', cardsEl).forEach((c) => c.setAttribute('aria-checked', c.dataset.id === id));
  const k = kr(id);
  pv.img.src = krSrc(id); pv.img.alt = k.name; pv.name.textContent = k.name; pv.desc.textContent = k.desc; pv.btn.disabled = false;
  pv.box.classList.remove('swap'); void pv.box.offsetWidth; pv.box.classList.add('swap');
}
cardsEl.addEventListener('click', (e) => {
  const c = e.target.closest('.card'); if (!c) return;
  pick(c.dataset.id);
  if (matchMedia('(max-width:1020px)').matches) $('.preview').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});
cardsEl.addEventListener('keydown', (e) => {
  const list = $$('.card', cardsEl), i = list.indexOf(document.activeElement);
  if (i < 0) return;
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (d) { e.preventDefault(); const n = list[(i + d + list.length) % list.length]; n.focus(); pick(n.dataset.id); }
});
pv.btn.addEventListener('click', () => { if (!picked) return; S.krathong = picked; save(); location.hash = '#/wish'; });

/* ================= WISH ================= */
const SAMPLES = ['ขอให้ครอบครัวมีสุขภาพแข็งแรง', 'ขอให้ "ความรักที่ไม่ดี" ลอยออกไปขอให้ "ความรักครั้งใหม่"ที่เต็มไปด้วยสดใสลอยเข้ามา', 'ขอให้ความทุกข์ลอยไปกับสายน้ำ', 'ขอให้การเรียนและการงานก้าวหน้า', 'ขอให้ได้พบเรื่องดี ๆ และคนดี ๆ', 'ขอให้ชีวิตต่อจากนี้สว่างไสวเหมือนแสงจันทร์ในคืนวันลอยกระทง'];
const fName = $('#f-name'), fWish = $('#f-wish');
$('#chips').innerHTML = SAMPLES.map((s) => `<button type="button" class="chip">${s}</button>`).join('');
$('#chips').addEventListener('click', (e) => {
  const c = e.target.closest('.chip'); if (!c) return;
  fWish.value = c.textContent; syncWish(); fWish.focus();
});
function syncWish() {
  S.name = fName.value; S.wish = fWish.value; save();
  $('#wish-count').textContent = `${fWish.value.length}/120`;
  $('#wp-wish').textContent = fWish.value.trim() || 'คำอธิษฐานของคุณจะปรากฏที่นี่';
  $('#wp-name').textContent = fName.value.trim() ? `โดย ${fName.value.trim()}` : '';
  $('#e-name').textContent = ''; $('#e-wish').textContent = '';
}
fName.addEventListener('input', syncWish); fWish.addEventListener('input', syncWish);
$('#wish-back').addEventListener('click', () => { location.hash = '#/select'; });
$('#wish-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = fName.value.trim(), wish = fWish.value.trim();
  let bad = false;
  if (!name) { $('#e-name').textContent = 'กรอกชื่อผู้ลอยกระทงก่อน'; bad = true; }
  if (!wish) { $('#e-wish').textContent = 'เขียนคำอธิษฐานหรือเลือกข้อความตัวอย่างก่อน'; bad = true; }
  if (bad) { (!name ? fName : fWish).focus(); return; }
  const btn = e.submitter; if (btn) btn.disabled = true;
  try {
    const item = await store.add({ krathong: S.krathong, name, wish });
    S.last = item; S.mine = [...(S.mine || []).filter((m) => m && m.id), item]; S.wish = ''; save();
    fWish.value = '';
    location.hash = '#/float';
  } catch (err) { console.warn(err); $('#e-wish').textContent = 'ลอยกระทงไม่สำเร็จ ลองอีกครั้งนะ'; }
  finally { if (btn) btn.disabled = false; }
});

/* ================= FLOAT ================= */
const fk = $('#float-kr'), fm = $('#float-msg');
let anims = [], timers = [];
function buildSparks() {
  $('#sparks').innerHTML = Array.from({ length: 18 }, () => {
    const s = (4 + Math.random() * 8).toFixed(1);
    return `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(8 + Math.random() * 70).toFixed(1)}%;--s:${s}px;--d:${(2 + Math.random() * 2.4).toFixed(1)}s;--dl:${(Math.random() * 3).toFixed(1)}s"></i>`;
  }).join('');
}
function playFloat() {
  anims.forEach((a) => a.cancel()); timers.forEach(clearTimeout); anims = []; timers = [];
  const w = S.last; if (!w) return;
  const src = krSrc(w.krathong);
  $('#fl-img').src = src; $('#fl-refl').src = src; $('#fl-img').alt = kr(w.krathong).name;
  $('#fl-wish').textContent = `“${w.wish}” — ${w.name}`;
  fm.classList.remove('show', 'btns'); buildSparks();
  if (reduce) {
    fk.style.opacity = 1; fk.style.transform = 'translate(14vw,-24vh) scale(.5)';
    fm.classList.add('show', 'btns'); return;
  }
  anims.push($('#float-stage').animate([{ transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 3200, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }));
  anims.push(fk.animate([
    { opacity: 0, transform: 'translate(0,16px) scale(.92)', offset: 0 },
    { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 0.2 },
    { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 0.3 },
    { opacity: 1, transform: 'translate(8vw,-6vh) scale(.5)', offset: 0.72 },
    { opacity: 0.0, transform: 'translate(14vw,-12vh) scale(.26)', offset: 1 },
  ], { duration: 13000, easing: 'cubic-bezier(.35,.1,.3,1)', fill: 'forwards' }));
  anims.push(fk.animate([{ translate: '0 0' }, { translate: '0 -6px' }, { translate: '0 0' }], { duration: 3600, iterations: Infinity, easing: 'ease-in-out' }));
  timers.push(setTimeout(() => fm.classList.add('show'), 4300), setTimeout(() => fm.classList.add('btns'), 6800));
}
$('#float-stage').addEventListener('click', (e) => { if (e.target.closest('.btn')) return; fm.classList.add('show', 'btns'); });

/* ================= RIVER ================= */
const stage = $('#river-stage');
let items = [], riverRaf = 0, last = 0;
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

async function loadRiver() {
  let r = { items: [], total: 0 };
  try { r = await store.river(); } catch (e) { console.warn('river unavailable', e); }
  // only your own krathong is clickable: its wish/name live in this browser, never in the public river data
  const mine = new Map((S.mine || []).filter((m) => m && m.id).map((m) => [m.id, m]));
  $('#river-count').textContent = r.total.toLocaleString('th-TH');
  $('#river-empty').hidden = r.items.length > 0;
  stage.innerHTML = '';
  items = r.items.slice(-(innerWidth < 700 ? 36 : 60)).map((w) => { // fewer moving layers on phones
    const m = mine.get(w.id);
    const b = document.createElement(m ? 'button' : 'div');
    b.className = 'rk' + (m ? ' mine' : '');
    if (m) { b.type = 'button'; b.setAttribute('aria-label', `${kr(w.krathong).name} ของคุณ`); b.addEventListener('click', () => openDlg(m)); }
    else { b.setAttribute('role', 'img'); b.setAttribute('aria-label', 'กระทงของผู้ร่วมงาน'); }
    b.innerHTML = `${m ? '<span class="who">ของคุณ</span>' : ''}<div class="kr"><img src="${krSrc(w.krathong)}" alt="" draggable="false"></div>`;
    stage.append(b);
    return { w, el: b, lane: hash(w.id + 'y'), x0: hash(w.id + 'x'), ph: hash(w.id + 'p') * 6.28, sp: 0.6 + hash(w.id + 's') * 0.8, x: 0, y: 0, d: 0, wd: 0 };
  });
  layoutRiver();
}
function layoutRiver() {
  const W = stage.clientWidth, H = stage.clientHeight;
  const top = scene.horizon() + 24, bottom = H - (portrait() ? 90 : 70);
  const minW = portrait() ? 70 : 96, maxW = portrait() ? 150 : 210;
  const n = items.length;
  items.forEach((it, i) => {
    // spread lanes evenly with jitter so krathong do not stack
    const lane = ((i * 0.618034) % 1) * 0.8 + it.lane * 0.2;
    it.d = lane; it.wd = minW + (maxW - minW) * lane;
    it.yBase = top + (bottom - top) * lane - it.wd / 2.1 * 0.5;
    it.span = W + it.wd * 2;
    if (!it.init) { it.x = it.x0 * it.span - it.wd; it.init = true; }
    it.el.style.width = it.wd + 'px'; it.el.style.zIndex = Math.round(lane * 100);
  });
}
function tick(ms) {
  const dt = Math.min(0.05, (ms - last) / 1000 || 0.016); last = ms;
  for (const it of items) {
    it.x += (10 + 26 * it.d) * it.sp * dt;
    if (it.x > it.span - it.wd) it.x -= it.span;
    const y = it.yBase + Math.sin(ms / 1000 * 0.9 + it.ph) * 4;
    it.el.style.transform = `translate3d(${it.x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(Math.sin(ms / 1400 + it.ph) * 1.2).toFixed(2)}deg)`;
  }
  riverRaf = requestAnimationFrame(tick);
}
function startRiver() { cancelAnimationFrame(riverRaf); last = performance.now(); if (reduce) { tick(last); cancelAnimationFrame(riverRaf); } else riverRaf = requestAnimationFrame(tick); }
const dlg = $('#river-dialog');
function openDlg(w) {
  $('#dg-img').src = krSrc(w.krathong); $('#dg-img').alt = kr(w.krathong).name;
  $('#dg-wish').textContent = `“${w.wish}”`; $('#dg-name').textContent = `โดย ${w.name}`;
  dlg.showModal();
}
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
addEventListener('storage', () => { if (current === 'river') loadRiver(); });

/* ---------- view enter hooks ---------- */
const enter = {
  home() { onScroll(); },
  select() { onScroll(); if (S.krathong) pick(S.krathong); },
  wish() {
    onScroll();
    fName.value = S.name || ''; fWish.value = S.wish || '';
    $('#wp-img').src = krSrc(S.krathong); $('#wp-img').alt = kr(S.krathong).name;
    syncWish(); setTimeout(() => (fName.value ? fWish : fName).focus({ preventScroll: true }), 400);
  },
  float() { onScroll(); playFloat(); },
  river() { onScroll(); loadRiver().then(startRiver); },
};
const leave = () => { cancelAnimationFrame(riverRaf); };
addEventListener('hashchange', () => { if (parse() !== 'river') leave(); });

/* scroll links */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll]'); if (!a) return;
  if (current === 'home') { e.preventDefault(); history.replaceState(null, '', '#/about'); setNav('about'); $('#about').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
});

route();
