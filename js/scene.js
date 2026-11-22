// Night river backdrop: baked design image (assets/bg-river.webp) + live moon path, ripples, motes.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// measured on the 2560x1440 design; ax = which part of the image stays visible when cropped (keeps the moon in view on phones)
const BG = { ar: 16 / 9, moonX: 0.777, moonY: 0.188, moonR: 0.109, horizon: 0.548, ax: 0.8 };

export function createScene(canvas) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => draw(performance.now());
  img.src = 'assets/bg-river.webp';
  let W = 0, H = 0, dpr = 1, ox = 0, oy = 0, iw = 0, ih = 0, hy = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const motes = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: rnd(0.4, 1.4), v: rnd(0.012, 0.035), p: rnd(0, 6.28) }));

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const sc = sprite.getContext('2d');
  const g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,236,170,1)'); g.addColorStop(0.35, 'rgba(240,190,90,.45)'); g.addColorStop(1, 'rgba(240,190,90,0)');
  sc.fillStyle = g; sc.fillRect(0, 0, 32, 32);

  function resize() {
    // mobile URL-bar show/hide only changes height a little: skip it, reallocating the canvas flickers
    if (W && innerWidth === W && Math.abs(innerHeight - H) < 130) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    iw = Math.max(W, H * BG.ar); ih = iw / BG.ar; // cover
    ox = (W - iw) * BG.ax; oy = (H - ih) / 2;
    hy = oy + BG.horizon * ih;
    draw(performance.now());
  }

  function draw(ms) {
    const t = ms / 1000;
    const mx = ox + BG.moonX * iw, mr = BG.moonR * ih;
    ctx.globalAlpha = 1;
    if (img.naturalWidth) ctx.drawImage(img, ox, oy, iw, ih);
    if (H > W) { // phones: the cropped moon sits behind the hero text, so dim the sky above the water
      const d = ctx.createLinearGradient(0, 0, 0, hy);
      d.addColorStop(0, 'rgba(4,5,13,.6)'); d.addColorStop(1, 'rgba(4,5,13,.35)');
      ctx.fillStyle = d; ctx.fillRect(0, 0, W, hy);
    }
    // moon path
    const rows = 38, span = (H - hy) * 1.1;
    ctx.fillStyle = 'rgb(255,208,120)';
    for (let i = 0; i < rows; i++) {
      const p = i / rows, y = hy + Math.pow(p, 1.6) * span;
      const w = mr * (0.5 + p * 1.1) * (0.55 + 0.45 * Math.sin(t * 0.9 + i * 1.7) ** 2);
      const off = Math.sin(t * 0.7 + i * 0.9) * (2 + p * 22);
      ctx.globalAlpha = (1 - p) * 0.55 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
      ctx.fillRect(mx + off - w / 2, y, w, 1.2 + p * 3);
    }
    // faint ripples
    ctx.fillStyle = 'rgb(255,200,130)'; ctx.globalAlpha = 0.05;
    for (let i = 0; i < 18; i++) {
      const p = (i + 1) / 18, y = hy + Math.pow(p, 1.7) * span;
      const x = ((i * 0.37 + t * 0.01 * (1 + p)) % 1) * W;
      ctx.fillRect(x, y, 40 + p * 160, 1 + p);
    }
    // gold motes
    for (const m of motes) {
      m.y -= m.v * 0.016; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      const x = m.x * W + Math.sin(t * 0.5 + m.p) * 18, y = m.y * H, sz = 7 * m.s;
      ctx.globalAlpha = (0.25 + 0.5 * Math.sin(t * 1.6 + m.p) ** 2) * Math.min(1, m.y * 3);
      ctx.drawImage(sprite, x - sz, y - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;
  }

  let raf = 0;
  const loop = (ms) => { draw(ms); raf = requestAnimationFrame(loop); };
  function start() { if (!reduce && !raf) raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start();
  });
  addEventListener('resize', resize);
  resize(); start();

  return { horizon: () => hy }; // y (px) where the water starts
}