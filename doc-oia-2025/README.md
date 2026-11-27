# DOC OIA responses 2025 (sample PDFs)

30 real Official Information Act responses from the Department of Conservation, each with its response letter and up to 3 PDF attachments (40 PDFs, 48.1 MB, 663 pages). Exact downloaded bytes; nothing edited, re-saved or redacted.

- Source: https://www.doc.govt.nz/news/oia-responses/2025/ (retrieved 2026-11-27). Per-file URLs, sizes, SHA-256 and page counts: `manifest.json` (paths relative to this folder, same layout as `doc-oia-2026/`).
- Source: Department of Conservation. Crown copyright, reusable under CC BY 4.0 unless a document is marked third party.

## Licence

From https://www.doc.govt.nz/footer-links/copyright/ (re-checked 2026-11-27, wording unchanged):

> Unless identified as having third party copyright or other licence, the material on this website is Crown Copyright and can be reused under the terms of the Creative Commons Attribution 4.0 International Licence (CC BY 4.0).

Attribution asked for: `Use text (not logos), eg "Source: Department of Conservation".` The terms exclude third-party material inside attachments, logos and trademarks, and require accurate reproduction.

## Retrieval

- Fetcher: `scripts/fetch-doc-oia.mjs` (+ `-select`, `-run`; no dependencies, manual only). Honest User-Agent naming it a research tool; robots.txt fetched first and every URL checked (23 Disallow rules for `*`, none applied; no Crawl-delay); host limited to www.doc.govt.nz; one request at a time, 15 to 20 s jittered delay, cap 160, stops on any non-200.
- 43 HTTP requests in total (robots.txt, copyright page, 2025 index, 40 PDFs), all HTTP 200, 15.8 s minimum gap between requests. Log: `request-log-2026-11-27.jsonl` (URL, status, bytes, ms, time).
- Selection: the index lists 179 requests with a reference (Jan to Dec 2025; no March entries). Chosen newest first, round-robin by month (2 to 3 per month), response plus at most 3 attachments, PDFs only, files over 5 MB skipped.
- Skipped: none of the chosen requests had a skipped file (0 over 5 MB, 0 not PDF, 0 over the attachment cap). Not chosen: 1 request whose response alone is over 5 MB (OIAD-5120); one 2022 entry on the 2025 index (OIAD-2511) was left out as not a 2025 response.
- Duplicates against `doc-oia-2026/`: 0 refs and 0 SHA-256 matches (2026 refs are all different from 2025 refs).
- Page counts from `pdfinfo` (none estimated).
- Not done here: privacy scan and benchmark (need the oia-harness repo).
