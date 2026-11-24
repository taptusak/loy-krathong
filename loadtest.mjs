// Run from the project folder:  node loadtest.mjs https://your-site.vercel.app [--write=200]
// Reads are harmless. --write=N inserts N test krathong named __loadtest (one machine = one IP, so the 600/min guard applies).
// Clean up afterwards in Supabase SQL Editor:  delete from wishes where name = '__loadtest';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./js/store.js', import.meta.url), 'utf8');
const API = src.match(/SUPABASE_URL = '([^']+)'/)[1], KEY = src.match(/SUPABASE_KEY = '([^']+)'/)[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const site = process.argv.find((a) => a.startsWith('http'))?.replace(/\/$/, '');
const writes = +(process.argv.find((a) => a.startsWith('--write='))?.split('=')[1] || 0);

async function run(label, n, conc, job) {
  const lat = [], codes = {}; let next = 0; const t0 = performance.now();
  await Promise.all(Array.from({ length: conc }, async () => {
    while (next < n) {
      const i = next++, t = performance.now(); let c;
      try { c = await job(i); } catch { c = 'ERR'; }
      lat.push(performance.now() - t); codes[c] = (codes[c] || 0) + 1;
    }
  }));
  lat.sort((a, b) => a - b);
  const p = (q) => Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * q))]);
  console.log(`${label}: n=${n} conc=${conc} total=${((performance.now() - t0) / 1000).toFixed(1)}s p50=${p(0.5)}ms p95=${p(0.95)}ms max=${p(1)}ms status=${JSON.stringify(codes)}`);
}
const get = async (url, h) => { const r = await fetch(url, { headers: h }); await r.arrayBuffer(); return r.status; };

if (site) {
  await run('site page   ', 1000, 100, () => get(site + '/'));
  await run('bg image    ', 1000, 100, () => get(site + '/assets/bg-river.webp'));
}
await run('river read  ', 1000, 100, () => get(`${API}/rest/v1/river_public?select=id,krathong&order=created_at.desc&limit=60`, { ...H, Prefer: 'count=exact' }));
if (writes) {
  await run('wish insert ', writes, 20, async () => {
    const r = await fetch(`${API}/rest/v1/wishes`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ id: crypto.randomUUID(), krathong: 'lotus', name: '__loadtest', wish: 'ทดสอบระบบ' }) });
    return r.status;
  });
  console.log("cleanup: delete from wishes where name = '__loadtest';");
}
