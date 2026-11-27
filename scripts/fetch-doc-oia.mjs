#!/usr/bin/env node
// Polite, sequential, manual-only fetcher for published DoC OIA responses.
// No dependencies. Usage: node scripts/fetch-doc-oia.mjs <command> [year]
//   prep   : robots.txt, licence page, year index (cached in .cache/)
//   select : choose requests from cached index (no network) -> .cache/plan.json
//   run    : fetch the planned PDFs (resumable; cache + request log)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const YEAR = process.argv[3] ?? '2025';
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, `doc-oia-${YEAR}`);
const CACHE = path.join(ROOT, '.cache', `doc-oia-${YEAR}`);
const HOST = 'www.doc.govt.nz';
const BASE = `https://${HOST}`;
const UA = 'oia-samples-research-fetcher/1.0 (research tool collecting public NZ OIA responses as test data; sequential, rate-limited)';
const DELAY_MIN = 15000, DELAY_MAX = 20000, CAP = 160;
const MAX_BYTES = 5 * 1024 * 1024, MAX_ATT = 3;
const LOG = path.join(OUT, `request-log-${new Date().toISOString().slice(0, 10)}.jsonl`);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

let disallow = null;
let last = 0;
const countFile = path.join(CACHE, 'count.txt');
const count = () => (fs.existsSync(countFile) ? +fs.readFileSync(countFile, 'utf8') : 0);

function allowed(url) {
  const u = new URL(url);
  if (u.host !== HOST) throw new Error('host not allowed: ' + u.host);
  if (!disallow) return true;
  const p = u.pathname + u.search;
  return !disallow.some((d) => d && p.startsWith(d));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { cacheName, binary = false } = {}) {
  const cf = cacheName && path.join(CACHE, cacheName);
  if (cf && fs.existsSync(cf)) return fs.readFileSync(cf);
  if (url !== `${BASE}/robots.txt` && !allowed(url)) throw new Error('robots disallow: ' + url);
  if (count() >= CAP) throw new Error('request cap reached');
  const wait = last ? Math.max(0, last + DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN) - Date.now()) : 0;
  if (wait) await sleep(wait);
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'manual' });
  const buf = Buffer.from(await res.arrayBuffer());
  last = Date.now();
  fs.writeFileSync(countFile, String(count() + 1));
  fs.appendFileSync(LOG, JSON.stringify({ url, status: res.status, bytes: buf.length, ms: last - t0, at: new Date(last).toISOString() }) + '\n');
  if (res.status !== 200) {
    console.error(`STOP: HTTP ${res.status} for ${url}`);
    process.exit(2);
  }
  if (cf) fs.writeFileSync(cf, buf);
  return buf;
}

async function robots() {
  const txt = (await get(`${BASE}/robots.txt`, { cacheName: 'robots.txt' })).toString();
  // groups: honour "User-agent: *" only (this agent's name matches no specific group)
  const groups = []; let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const l = raw.replace(/#.*/, '').trim(); if (!l) continue;
    const [k, ...v] = l.split(':'); const key = k.toLowerCase(), val = v.join(':').trim();
    if (key === 'user-agent') { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); }
    else if (cur) cur.rules.push([key, val]);
  }
  const mine = UA.toLowerCase();
  const g = groups.find((x) => x.agents.some((a) => a !== '*' && mine.includes(a))) ?? groups.find((x) => x.agents.includes('*'));
  disallow = (g?.rules ?? []).filter(([k]) => k === 'disallow').map(([, v]) => v);
  const allow = (g?.rules ?? []).filter(([k, v]) => k === 'allow' && v);
  if (allow.length) console.error('note: Allow rules present (ignored; stricter)');
  console.error('robots: disallow rules =', disallow.length, '; crawl-delay present =', /crawl-delay/i.test(txt));
}

const LICENCE = 'Unless identified as having third party copyright or other licence, the material on this website is Crown Copyright and can be reused under the terms of the Creative Commons Attribution 4.0 International Licence (CC BY 4.0).';

async function prep() {
  await robots();
  const lic = (await get(`${BASE}/footer-links/copyright/`, { cacheName: 'copyright.html' })).toString();
  const norm = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
  const same = norm(lic).includes(LICENCE);
  console.error('licence statement unchanged:', same);
  if (!same) { console.error('STOP: licence wording changed'); process.exit(3); }
  await get(`${BASE}/news/oia-responses/${YEAR}/`, { cacheName: 'index.html' });
  console.error('requests so far:', count());
}

const cmd = process.argv[2];
if (cmd === 'prep') await prep();
else if (cmd === 'select' || cmd === 'run') { await robots(); const m = await import('./fetch-doc-oia-' + cmd + '.mjs').catch(() => null); if (!m) console.error('not implemented yet'); else await m.default({ get, allowed, OUT, CACHE, YEAR, BASE, MAX_BYTES, MAX_ATT, count, LICENCE }); }
else console.error('usage: prep|select|run [year]');
