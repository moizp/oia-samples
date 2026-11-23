# oia-samples

Real public Official Information Act responses, used as test data for [oia-harness](https://github.com/moizp/oia-harness) (document ingestion and knowledge capture). **Private until the licence and third-party check is done** (oia-harness `docs/backlog.md`, item 14).

- `doc-oia-2026/`: 73 Department of Conservation responses (117 PDFs, 68.7 MB), exact downloaded bytes, with `manifest.json` (URLs, sizes, SHA-256, pages) and a request log. See its README for licence, skips and benchmark counts.
- Source: Department of Conservation. Crown copyright, reusable under CC BY 4.0 unless a document is marked third party. Files are never edited, re-saved or redacted.
- Fetch tool: `scripts/fetch-doc-oia.mjs` in oia-harness (polite, sequential, manual only).
