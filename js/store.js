// Wish storage adapter.
// Supabase (REST, no SDK): fill the two constants below after running supabase.sql.
// Left empty = localStorage only (this browser sees just its own krathong).
// Visitors can INSERT into `wishes` but never SELECT it; the river reads the `river_public` view (id + krathong only).
const SUPABASE_URL = 'https://faxodgxrcnumykfqonxw.supabase.co'; // e.g. https://xxxx.supabase.co
const SUPABASE_KEY = 'sb_publishable_5l7ZPKFFrD2TPltmiWyWwQ_IwZBGFvU'; // anon / publishable key (safe to ship: RLS limits it)
const ON = !!(SUPABASE_URL && SUPABASE_KEY);
const HDR = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
const KEY = 'phalanupap.wishes.v1';

export const KRATHONGS = [
  { id: 'phalanupap', name: 'กระทงพลานุภาพ', desc: 'กลีบแดงทับทิมประดับไข่มุกและทอง สัญลักษณ์ของคณะสีแดงพลานุภาพ' },
  { id: 'orchid', name: 'กระทงกล้วยไม้', desc: 'กล้วยไม้สีม่วงบานสะพรั่งบนใบตองจีบ งามสง่าและอ่อนช้อย' },
  { id: 'bread', name: 'กระทงขนมปัง', desc: 'กระทงขนมปัง ทางเลือกที่เป็นมิตรต่อสายน้ำและสัตว์น้ำ' },
  { id: 'lotus', name: 'กระทงดอกบัว', desc: 'บัวสีชมพูบนฐานใบตอง สื่อถึงความบริสุทธิ์และการเริ่มต้นใหม่' },
  { id: 'marigold', name: 'กระทงดาวเรือง', desc: 'ดาวเรืองสีส้มทองสดใส ชวนให้นึกถึงโชคลาภและความอบอุ่น' },
  { id: 'jasmine', name: 'กระทงมะลิ', desc: 'กระทงมะลิขาว ใจเย็นและเรียบง่าย' },
];
export const kr = (id) => KRATHONGS.find((k) => k.id === id) || KRATHONGS[0];
export const krSrc = (id) => `assets/krathong/${kr(id).id}.webp`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cache = { t: 0, v: null }; // river read cache: 1000 visitors in a minute = a handful of DB reads per browser, not one per page view

// Retry bursts (network / 429 / 5xx). The id is made on the client, so a 409 means the first try already landed.
async function post(url, init) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, init);
      if (r.ok || r.status === 409) return;
      if (i >= 2 || (r.status !== 429 && r.status < 500)) throw new Error('add ' + r.status);
    } catch (e) { if (i >= 2 || /^add /.test(e.message)) throw e; }
    await sleep(600 * 2 ** i + Math.random() * 400);
  }
}

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

export const store = {
  /** real krathong only, newest 60 oldest-first, no names/wishes: { items:[{id,krathong}], total } */
  async river() {
    if (ON) {
      if (cache.v && Date.now() - cache.t < 15000) return cache.v;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/river_public?select=id,krathong&order=created_at.desc&limit=60`, { headers: { ...HDR, Prefer: 'count=exact' } });
      if (!r.ok) throw new Error('river ' + r.status);
      cache = { t: Date.now(), v: { items: (await r.json()).reverse(), total: +r.headers.get('content-range').split('/')[1] || 0 } };
      return cache.v;
    }
    const all = read();
    return { items: all.slice(-60).map(({ id, krathong }) => ({ id, krathong })), total: all.length };
  },
  /** throws if the server rejects it (the form shows an error), so a lost krathong is never shown as floated */
  async add({ krathong, name, wish }) {
    const item = { id: crypto.randomUUID(), krathong, name, wish };
    if (ON) {
      await post(`${SUPABASE_URL}/rest/v1/wishes`, { method: 'POST', headers: { ...HDR, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(item) });
      cache.t = 0; // so your own krathong shows up in the river right away
      return item;
    }
    try { localStorage.setItem(KEY, JSON.stringify([...read(), item])); } catch (e) { console.warn('storage blocked', e); }
    return item;
  },
};
