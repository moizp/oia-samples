// run: fetch planned PDFs (cached, resumable), verify, save, write manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const slugify = (ref, title) => (ref + '-' + title.toLowerCase().replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 7).join('-')).replace(/-+$/, '');
function pages(file) {
  try { const o = execFileSync('pdfinfo', [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); return { pages: +/Pages:\s+(\d+)/.exec(o)[1] }; }
  catch { const n = (fs.readFileSync(file, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length; return { pages: n, pages_estimated: true }; }
}

export default async function ({ get, OUT, CACHE, YEAR, BASE, LICENCE }) {
  const plan = JSON.parse(fs.readFileSync(path.join(CACHE, 'plan.json'), 'utf8'));
  const held = JSON.parse(fs.readFileSync(path.join(OUT, '..', 'doc-oia-2026', 'manifest.json'), 'utf8'));
  const heldHashes = new Set(held.requests.flatMap((x) => x.files.map((f) => f.sha256)));
  const today = new Date().toISOString().slice(0, 10);
  const requests = []; const dupHash = [];
  for (const r of plan.picked) {
    const slug = slugify(r.ref, r.title);
    const files = []; const skipped = [...r.skipped];
    const list = [{ l: r.resp, role: 'response', name: 'response.pdf' }, ...r.atts.map((l, i) => ({ l, role: 'attachment', name: `attachment-${i + 1}.pdf` }))];
    for (const { l, role, name } of list) {
      const url = new URL(l.href, BASE).href;
      const buf = await get(url, { cacheName: crypto.createHash('sha1').update(url).digest('hex') + '.pdf' });
      if (buf.subarray(0, 5).toString() !== '%PDF-') { skipped.push({ href: l.href, reason: 'response was not a PDF (bad magic)' }); continue; }
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      if (heldHashes.has(sha256)) { dupHash.push(r.ref + '/' + name); skipped.push({ href: l.href, reason: 'SHA-256 already held (2026 set)' }); continue; }
      const rel = `${slug}/${name}`;
      fs.mkdirSync(path.join(OUT, slug), { recursive: true });
      fs.writeFileSync(path.join(OUT, rel), buf);
      files.push({ file: rel, role, label: l.label, pdfUrl: url, bytes: buf.length, sha256, ...pages(path.join(OUT, rel)), retrieved: today });
    }
    requests.push({ ref: r.ref, slug, title: r.title, responseDate: r.responseDate, sourcePage: `${BASE}/news/oia-responses/${YEAR}/`, files, skipped });
    console.error('done', r.ref, files.length, 'files');
  }
  const manifest = { source: `${BASE}/news/oia-responses/${YEAR}/`, retrieved: today, licence: { termsPage: `${BASE}/footer-links/copyright/`, statement: LICENCE, attribution: 'Use text (not logos), eg "Source: Department of Conservation".', note: held.licence.note, rechecked: today }, requests, skipped: [] };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.error('manifest written; hash duplicates vs 2026:', dupHash.length, '; total HTTP requests:', fs.readFileSync(path.join(CACHE, 'count.txt'), 'utf8'));
}
