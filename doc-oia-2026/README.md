# DOC OIA responses 2026 (demo PDFs)

73 real Official Information Act responses from the Department of Conservation, each with its response letter and up to 3 PDF attachments (117 PDFs, 68.7 MB, 1,203 pages). The first 20 were added 2026-11-11 (49 PDFs, 33.0 MB, 581 pages); 53 more were added 2026-11-23 (68 PDFs, 37.2 MB, 622 pages). They are demo data for trying the ingestion pipeline and knowledge base. No test or CI step reads them.

- Source: https://www.doc.govt.nz/news/oia-responses/2026/ (retrieved 2026-11-11 and 2026-11-23). Per-file URLs, sizes, SHA-256 and page counts: `manifest.json`.
- Files are the exact bytes downloaded. Nothing was edited, re-saved or redacted.
- Fetch tool: `scripts/fetch-doc-oia.mjs` (manual only; robots check, cache, request log). First pass: 10 to 15 s delay, 60-request cap. Second pass: 15 to 20 s delay, 160-request cap (set in the script).

## Licence

From https://www.doc.govt.nz/footer-links/copyright/:

> Unless identified as having third party copyright or other licence, the material on this website is Crown Copyright and can be reused under the terms of the Creative Commons Attribution 4.0 International Licence (CC BY 4.0).

Attribution asked for: `Use text (not logos), eg "Source: Department of Conservation".`

Source: Department of Conservation. The terms exclude third-party material inside attachments (for example consultant or company documents) and require accurate reproduction, which is why the files are unmodified.

## Added 2026-11-23

53 more requests from the same 2026 index (it does not paginate; the 2025 index was not needed or used). The aim was 30; 23 more were added because the first 30 had no scanned pages and the OCR target was not met (see below).

- Fetching: 70 HTTP requests in total (robots.txt, index, the copyright page once, 67 PDFs), all HTTP 200, one at a time, 16 to 38 s apart (15 to 20 s delay plus the transfer). Log: `request-log-2026-11-23.jsonl` (URL, status, bytes, time).
- robots.txt unchanged: plain `User-agent: *` list, no Crawl-delay, no AI-bot rules. No PDF was under a disallowed path.
- Licence re-checked 2026-11-23: the CC BY 4.0 statement and the attribution wording are unchanged. Retrieval dates are in `manifest.json`.
- Skipped (new): over 5 MB, not downloaded (listed size): OIAD-9341 7.4 MB, OIAD-6121 6.1 MB, OIAD-5962 9.4 MB, OIAD-9364 10.6 MB, OIAD-8150 49 MB, OIAD-6282 42 MB, OIAD-5818 14 MB and 5.3 MB, OIAD-6265 11 MB, 22 MB and 9 MB. Not a PDF: OIAD-9387 (xlsx), OIAD-6062 (xlsx).
- OIAD-6164 attachments 1 and 2 are the same bytes (the index links one file twice).
- Privacy scan (the repo's findEmails, findPhones, findAddresses on the extracted text of the 68 new files; counts only): 317 emails (288 doc.govt.nz, 25 horowhenua.govt.nz, 4 other government or iwi), 18 phone matches (office lines, council and iwi offices, a freephone), 111 address matches (mostly the letterhead office address). No personal email domain, home address or personal phone found. Nothing was skipped or altered.

## Skipped (first 20)

- OIAD-6214 item 4 and OIAD-6013 item 5: over the cap of 3 attachments.
- OIAD-5919 (two .xls) and OIAD-6013 (one .xlsx): not PDFs.
- No attachment exceeded 5 MB. Larger attachments on the index (for example 7 to 49 MB) were not chosen.
- A scan for email addresses and phone numbers found only work or organisation addresses, a public hotline, a company number and a URL timestamp. Nothing was dropped for privacy.

## Benchmark results (counts only)

`pnpm bench demo/doc-oia-2026` and one `pnpm bench` run per request folder (one batch per request, response and attachments together). Local, no model, no network. Node 24, this sandbox. **These are measurements on 20 real documents with no labels (basis: unlabelled). They show coverage and timings, not accuracy.**

| Measure | Result |
|---|---|
| Files by type | 49 pdf (`manifest.json` is listed as unsupported in the folder run) |
| Coverage | 100% (49 of 49 read in full) |
| Unreadable (scanned) pages | 0 in 0 files; no page needed OCR, so local OCR was not exercised |
| Text blocks | 581 (11.9 per file, one per page) |
| Failures | 0 (no reason codes) |
| Time, pdf | 6.9 s whole folder; per file mean 137 ms, max 2.6 s (60-page attachment) |
| Assumptions raised | 229 in the folder run (structure 43, vocabulary 186, fact 0, access 0); 284 when each request is its own batch (structure 43, vocabulary 241). All open. |
| Quotes | 307 kept, 0 dropped (folder run) |

## After the ingestion-quality changes (counts only)

Same 20 requests, one batch per request, local, no model, basis `unlabelled`. The table above is the earlier run; this is the same measurement after the term, title/date/type, PDF page-error and phone changes (see `docs/ingestion.md`, `docs/benchmark.md`, `docs/redaction.md`). These are counts, not accuracy: nobody has labelled these documents.

| Measure | Before | After |
|---|---|---|
| Vocabulary questions (per-request batches) | 241 | 174 |
| Structure questions | 43 | 2 |
| Questions with a proposal | 0 | 55 (53 terms with the document's own expansion, 2 dates) |
| Raised terms that are in the embedded common-word list | 62 | 0 (by construction: the list is one of the filters) |
| pdf.js warnings printed | 8,317 | 3 summary lines (all 8,317 counted) |
| PDF page problems recorded | none (not surfaced) | 6 pages in 3 files, 0 held for review |
| Phone matches | 16 | 1 (the public hotline) |

## Response letter plus attachments as one request

Checked with the benchmark runs above and a throwaway script on the request OIAD-6214 (not committed).

1. **Ingest together:** yes. All 20 requests ingest cleanly in one batch each (0 failures).
2. **Linked:** no. Each PDF is its own item with no parent (`parentId` is only set for email attachments; 0 of 49 here). Search and evidence return passages by document name and location. A letter's "Attachment A" is just text; nothing ties it to `attachment-1.pdf`. In OIAD-6214, evidence for "the attachments referred to in the response letter" returned passages from 2 documents with no sign they belong together. 11 of 20 response letters mention attachments, items or enclosures.
3. **Shared acronyms:** one question with several dependents. Matching terms share a question, so 8 of 20 requests have at least one question raised by both the letter and an attachment (11 in all), answered once. Per batch: 21 questions have more than one dependent. Across the whole folder, the same happens across requests (32 questions with more than one dependent, up to 22), so common terms such as DOC are one question for all.
4. **Today:** upload the files together in one batch, name them so the order is obvious (the fetch tool uses `response.pdf`, `attachment-N.pdf`), and answer the shared questions once. A user must read the letter to see which attachment it means.
   **A "document family" link would add:** a parent for the response with attachments as children (as for email); "Attachment A" in a letter resolved to its file; search and evidence results grouped by request with the letter shown beside the attachment; confirming one question for the whole family; and a request-level coverage and completeness check (every referred attachment present). Not built in this change.

   **Built since:** a family link (not `parentId`), made from the file names, with the letter's references to its attachments found and matched by rules. Measured with `pnpm bench --families demo/doc-oia-2026` (counts only; basis **unlabelled**, so no accuracy claim): all 20 requests make a family (29 attachments). 19 letters contain a reference of some kind: 25 distinct references (6 labelled such as an attachment number, none ordinal, 19 the words "attached" or "enclosed"; 47 mentions), in 4 letters with a labelled one. Of the 25: 18 matched (12 because the request has only one attachment, 4 by number or letter, 2 by exact label), 7 ambiguous (several attachments and no name, so nothing is guessed), 0 unmatched. 1 of the 29 attachments is never referred to. Only the 6 labelled matches are proposed to the queue. The "attached" count includes any use of the word, so it is not a count of letters that name an attachment (the 11 of 20 above counts attachments, items and enclosures by a different reading).

## Benchmark results for the 2026-11-23 set (counts only)

Same method as above, local, no model, no network. One `pnpm bench` run per request folder, plus `pnpm bench --families demo/doc-oia-2026`. Basis **unlabelled**: coverage and timings, not accuracy. "New" is the 53 requests added on 2026-11-23; "first 20" is the original set measured again with the same code, so the two can be compared.

| Measure | First 20 | New 53 | All 73 |
|---|---|---|---|
| Files (all pdf) | 49 | 68 (67 counted for coverage; 1 duplicate) | 117 |
| Coverage | 100% (49 of 49) | 100% (67 of 67) | 100% (116 of 116) |
| Pages needing OCR | 0 | 3 pages, in 3 requests | 3 |
| OCR read at or above confidence 70 / held for review | none tried | 3 / 0 (confidence 91.9 to 92.8) | 3 / 0 |
| Text blocks | 581 | 618 | 1,199 |
| Extraction failures | 0 | 0 | 0 |
| pdf.js page problems | 6 pages in 3 files, 0 held | none | 6 pages in 3 files, 0 held |
| Time, pdf: mean and max per file | 192 ms, 2.4 s | 372 ms, 3.4 s | 296 ms, 3.4 s |
| Questions raised (per-request batches) | 178 (structure 8, vocabulary 170) | 257 (structure 9, vocabulary 248) | 435 (structure 17, vocabulary 418) |
| Questions with a proposal | 61 | 107 | 168 |
| Quotes dropped | 0 | 0 | 0 |

Family references (`--families`):

| Measure | First 20 | New 53 | All 73 |
|---|---|---|---|
| Requests that make a family (response plus attachments) | 20 | 12 | 32 |
| Attachments | 29 | 15 | 44 |
| Letters with a reference to an attachment | 19 | 11 | 30 |
| References found (distinct) | 25 | 29 | 54 |
| Matched | 18 | 13 | 31 |
| Ambiguous | 7 | 2 | 9 |
| Unmatched | 0 | 14 | 14 |
| Attachments never referred to | 1 | 1 | 2 |

Ingestion observations on the new set (counts only, nothing fixed here): 0 files failed, 0 pages held for review, 0 extractor errors; 3 pages needed OCR, all read; 14 references unmatched in the new set against 0 in the first 20 (not investigated here); 1 file is exactly the same bytes as another in its request. OIAD-5962's 44-page attachment has very little text per page (image-heavy plan) but every page has a text layer. The OCR target of 5 requests was not met: only 3 of the 53 requests have a page with no text layer (3 pages, one each).
