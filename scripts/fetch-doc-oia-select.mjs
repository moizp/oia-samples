// select: parse cached index, build exclusion list, choose ~30 requests (no network).
import fs from 'node:fs';
import path from 'node:path';
const decode = (s) => s.replace(/&nbsp;|&#160;|&ndash;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const kb = (label) => { const m = /\(([A-Za-z]+),\s*([\d,.]+)\s*([KMG])\)/i.exec(label); if (!m) return null; return Math.round(parseFloat(m[2].replace(/,/g, '')) * { K: 1024, M: 1048576, G: 1073741824 }[m[3].toUpperCase()]); };

export default async function ({ CACHE, OUT, YEAR, BASE, MAX_BYTES, MAX_ATT }) {
  const html = fs.readFileSync(path.join(CACHE, 'index.html'), 'utf8');
  const blocks = html.split(/<hr\s*\/?>/i);
  const reqs = [];
  for (const b of blocks) {
    const h = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/i.exec(b); const r = /Ref:\s*(OIAD?-\d+)/i.exec(b); if (!h || !r) continue;
    const d = /Date:\s*([^<]+)/i.exec(b);
    const links = [...b.matchAll(/<li>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<\/li>/gi)].map((m) => ({ href: m[1], label: decode(m[2]), note: decode(m[3]), size: kb(decode(m[2])), pdf: /\(PDF,/i.test(m[2]) || /\.pdf$/i.test(m[1]) }));
    const month = (/globalassets\/documents\/about-doc\/oia\/\d{4}\/([a-z]+)\//i.exec(links[0]?.href ?? '') ?? [])[1] ?? 'unknown';
    reqs.push({ ref: r[1].toUpperCase().replace(/^OIA-/, 'OIAD-'), listedRef: r[1], title: decode(h[1]), responseDate: d ? d[1].trim() : '', month, links });
  }
  // exclusions: refs and hashes of what we hold
  const held = JSON.parse(fs.readFileSync(path.join(OUT, '..', 'doc-oia-2026', 'manifest.json'), 'utf8'));
  const heldRefs = new Set(held.requests.map((x) => x.ref));
  const heldHashes = new Set(held.requests.flatMap((x) => x.files.map((f) => f.sha256)));
  const seen = new Set(); const uniq = [];
  for (const r of reqs) { if (seen.has(r.ref)) continue; seen.add(r.ref); uniq.push(r); }
  const skippedHeld = uniq.filter((r) => heldRefs.has(r.ref));
  const cand = uniq.filter((r) => !heldRefs.has(r.ref)).map((r) => {
    const resp = r.links.find((l) => (/response/i.test(l.href) || /^response/i.test(l.label)) && /oia\/20/.test(l.href) && l.pdf) ?? null;
    const others = r.links.filter((l) => l !== resp);
    const skipped = []; const atts = [];
    if (!resp || (resp.size ?? 0) > MAX_BYTES) { return { ...r, ok: false, why: !resp ? 'no PDF response' : 'response over 5 MB' }; }
    for (const l of others) {
      if (!l.pdf) skipped.push({ href: l.href, reason: 'not a PDF' });
      else if ((l.size ?? 0) > MAX_BYTES) skipped.push({ href: l.href, reason: `over 5 MB (listed ${l.label.match(/\(PDF,\s*([^)]+)\)/i)?.[1]})` });
      else if (atts.length >= MAX_ATT) skipped.push({ href: l.href, reason: 'over cap of 3 attachments' });
      else atts.push(l);
    }
    return { ...r, ok: true, resp, atts, skipped, clean: skipped.length === 0 };
  });
  const ok = cand.filter((r) => r.ok && r.month !== 'unknown' && /2025/.test(r.responseDate));
  // spread: round-robin over months (listing order = newest first), clean requests first within a month
  const months = [...new Set(ok.map((r) => r.month))];
  const by = Object.fromEntries(months.map((m) => [m, ok.filter((r) => r.month === m).sort((a, b) => Number(b.clean) - Number(a.clean))]));
  const pick = [];
  while (pick.length < 30 && months.some((m) => by[m].length)) for (const m of months) { if (pick.length < 30 && by[m].length) pick.push(by[m].shift()); }
  const bad = cand.filter((r) => !r.ok);
  fs.writeFileSync(path.join(CACHE, 'plan.json'), JSON.stringify({ picked: pick, excluded: { heldRefs: skippedHeld.map((r) => r.ref), noPdfOrOversizeResponse: bad.map((r) => ({ ref: r.ref, why: r.why })) } }, null, 1));
  console.error(`index requests ${uniq.length} (dupe rows ${reqs.length - uniq.length}); already-held refs skipped ${skippedHeld.length}; unusable ${bad.length}; eligible ${ok.length}; picked ${pick.length}`);
  console.error('months in index:', months.join(','));
  console.error('picked per month:', months.map((m) => m + ':' + pick.filter((r) => r.month === m).length).join(' '));
  console.error('picked files:', pick.reduce((n, r) => n + 1 + r.atts.length, 0), '; planned skips:', pick.reduce((n, r) => n + r.skipped.length, 0));
}
