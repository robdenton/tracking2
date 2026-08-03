# Granola SEO Article Audit

A **repeatable, deterministic** audit of Granola's published SEO articles in Sanity
(`post` documents where `hidden == true`). Built to produce the same answer twice and
to run unattended on a schedule — not a one-off narrative.

## What it audits

Scope filter (the contract):

```groq
*[_type == "post" && hidden == true && !(_id in path("drafts.**"))]
```

207 posts as of 2026-08-03. The run re-counts this live and warns if it differs from
the expected number in `config.mjs`.

> **Content model note.** No schema is deployed to this Sanity project, so the model
> was inferred from the documents. SEO posts have: `title`, `slug.current`,
> `publishedAt`, `summary` (the only meta/description field), and `body` (portable
> text of `block` + `rawHtml` nodes). There is **no** `author`, `metaTitle`,
> `metaDescription`, `excerpt`, or `categories` field. The canonical live domain is
> **granola.ai** (granola.so redirects to it); posts are served at
> `https://www.granola.ai/blog/<slug>`.

## Run it

```bash
node audit/run.mjs                 # full run: fetch → inventory → checks → links → report
node audit/run.mjs --skip-links    # structural checks only (fast, no network)
node audit/run.mjs --reuse-snapshot # reuse last fetch, re-run checks/links/report
node audit/run.mjs --fresh-links   # ignore the link cache, re-check every URL
```

No token needed — the `production` dataset is publicly readable. If Sanity ever locks
it down, set `SANITY_READ_TOKEN` in the environment.

## Outputs

| File | What it is |
|---|---|
| `audit/inventory.csv` | **Phase 0 contract.** One row per in-scope post: `_id, slug.current, title, publishedAt, _updatedAt`. |
| `audit/report.html` | The dashboard — overview table (one row per check) + a table of flagged posts per check. Open in a browser. |
| `audit/data/posts.json` | Raw content snapshot (includes body). Everything downstream is computed from this. |
| `audit/data/link-status.json` | Cached HTTP status per URL. Re-runs reuse it; delete it (or `--fresh-links`) to re-check. |
| `audit/data/results.json` | Machine-readable findings — feed a dashboard, diff between runs, etc. |

## The checks (each is one row in the report overview)

| # | Check | Type |
|---|---|---|
| 1 | Broken or redirecting outbound links | network |
| 2 | Internal links → 404 or unpublished post | network |
| 3 | Missing / over-length / short summary | deterministic |
| 4 | Missing author | deterministic |
| 5 | Missing publish date | deterministic |
| 6 | Publish date in the future | deterministic |
| 7 | Duplicate / near-duplicate titles | deterministic |
| 8 | Duplicate / near-duplicate slugs | deterministic |
| 9 | Word-count outliers (thin posts) | deterministic |
| 10 | Orphan posts (no internal inbound links) | deterministic |
| 11 | Hardcoded pricing / plan names / numbers | deterministic |

## Determinism & reproducibility

- **Deterministic checks** are computed purely from `posts.json`. Same snapshot →
  identical output, every time. All thresholds live in `config.mjs`.
- **Network checks** (link liveness) depend on live HTTP at run time and can legitimately
  change as target sites change. They are clearly tagged `network` in the report. The
  *structural* facts they build on (which links exist, where they point) are deterministic;
  only the up/down status is time-dependent. Statuses are cached in `link-status.json` so a
  re-run without `--fresh-links` is fast and stable.
- The run reads the clock exactly once, so a single run has one consistent "today" for the
  future-date check.

## Scheduling

The whole thing is one command with no interactive input, so any scheduler works.
Example daily cron (09:00), writing a timestamped log:

```cron
0 9 * * * cd "/Users/robdenton-ross/Claude measurement project" && /usr/bin/env node audit/run.mjs >> audit/data/cron.log 2>&1
```

For a hosted schedule, wrap `node audit/run.mjs` in a Vercel Cron / GitHub Action and
publish `audit/report.html` as an artifact.

## Layout

```
audit/
  config.mjs         thresholds, scope filter, domains — the only knobs
  run.mjs            orchestrator (Phase 0 + Phase 1)
  checks.mjs         the 11 checks (pure functions)
  report.mjs         results.json → report.html
  lib/
    sanity.mjs       public-API fetch
    portable-text.mjs  body → text / word count / links
    link.mjs         link classification + HTTP liveness
    util.mjs         csv, normalization, similarity, percentiles
  inventory.csv      Phase 0 output
  report.html        dashboard
  data/              snapshot, link cache, results
```
