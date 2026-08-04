# Content archive — 2026-08-04

Point-in-time copy of every in-scope SEO article in Sanity, taken 2026-08-04T09:37:03.827Z.

## ⚠ INCOMPLETE — published documents only

Captured without a Sanity token. Drafts are not readable anonymously, so this
archive does **not** contain unpublished articles (which exist only as a draft)
or any pending draft edits. Re-run with the token to capture those:

    node scripts/archive-sanity.mjs --label 2026-08-04

Sanity retains document history for **90 days**. This archive is the record that
outlives that window, which is why it lives in git rather than in `audit/data/`
(gitignored, single machine, published-only).

- `json/<slug>.published.json` — exact published document, including `_rev`
- `json/<slug>.draft.json` — exact draft, where one exists
- `markdown/<slug>.*.md` — readable prose, so the archive is usable without Sanity
- `manifest.json` — ids, revisions, timestamps, word counts and SHA-256 per document

**205 articles** · 205 published documents · 0 drafts ·
**0 exist only as a draft** (unpublished — the draft is the only copy).

Filter: `*[_type == "post" && hidden == true && !(_id in path("drafts.**"))]`

## Restoring

`json/*.published.json` is the document as Sanity returned it. To restore, strip
`_rev` and `createOrReplace` it. Check `manifest.json` first — the `_rev` recorded
there tells you whether the live document has changed since this capture.
