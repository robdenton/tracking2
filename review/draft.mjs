#!/usr/bin/env node
// Plan Sanity DRAFT edits from accepted review findings.
//
// This script NEVER writes to Sanity. It only computes an exact patch plan and
// writes it to review/data/patch-plan-<slug>.json. Applying the plan is a
// separate, deliberate step via the Sanity patch_documents tool, which saves to
// the draft — published content is never modified directly, and nothing is ever
// published.
//
//   node review/draft.mjs --slug <slug>                    # plan from red findings
//   node review/draft.mjs --slug <slug> --include amber    # also include amber
//   node review/draft.mjs --slug <slug> --decisions <csv>  # plan from accepted decisions
//
// Safety rules, mirroring the highlight anchoring:
//   - The original text must be found VERBATIM in exactly one child span.
//     No fuzzy matching, no paraphrase.
//   - A quote spanning multiple styled spans (e.g. part bold) is NOT auto-applied.
//     It is reported as manual, because splicing across spans risks corrupting
//     marks and link annotations.
//   - Everything skipped is reported. Nothing is silently dropped.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractSegments } from './lib/extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

const slug = opt('--slug');
if (!slug) { console.error('Required: --slug <slug>'); process.exit(1); }
const include = new Set(['red', ...(opt('--include') ? opt('--include').split(',') : [])]);

// Replace `quote` with `replacement` inside `base`, tidying the seam.
// The model's rewrites are self-contained sentences, but a flagged quote often
// excludes the source's trailing punctuation — naive replacement then yields
// "notes.." or a doubled space. Only the join point is touched; the rest of the
// text is untouched, and the match itself is still exact/verbatim.
function spliceText(base, quote, replacement) {
  const i = base.indexOf(quote);
  if (i === -1) return null;
  let end = i + quote.length;
  const after = base.slice(end);
  // Don't double sentence-ending punctuation across the seam.
  if (/[.!?]$/.test(replacement) && /^[.!?]/.test(after)) end += 1;
  let out = base.slice(0, i) + replacement + base.slice(end);
  // Don't leave a doubled space where the seam landed.
  out = out.replace(/ {2,}/g, ' ');
  return out;
}

const findingsAll = JSON.parse(readFileSync(join(__dirname, 'data', 'findings.json'), 'utf8'));
const { posts } = JSON.parse(readFileSync(join(ROOT, 'audit', 'data', 'posts.json'), 'utf8'));

const rec = Object.entries(findingsAll).find(([, r]) => r.slug === slug);
if (!rec) { console.error(`No findings recorded for slug "${slug}" — review it first.`); process.exit(1); }
const [postId, record] = rec;
const post = posts.find((p) => p._id === postId);
if (!post) { console.error(`Post ${postId} not in snapshot.`); process.exit(1); }

// --- select findings -------------------------------------------------------
let selected = record.findings.filter((f) => include.has(f.disposition) && f.suggested_rewrite);

// If a decisions CSV is supplied, restrict to accepted rows (quote-matched).
const decisionsPath = opt('--decisions');
if (decisionsPath && existsSync(decisionsPath)) {
  const rows = readFileSync(decisionsPath, 'utf8').split('\n').slice(1).filter(Boolean);
  const accepted = new Set();
  for (const line of rows) {
    // naive CSV split is unsafe; match on the decision column being "accept"
    if (/,accept,|,accept$/.test(line)) {
      const m = line.match(/"((?:[^"]|"")+)"/g) || [];
      for (const q of m) accepted.add(q.slice(1, -1).replace(/""/g, '"'));
    }
  }
  selected = selected.filter((f) => accepted.has(f.quote));
  console.log(`Decisions file: restricting to ${accepted.size} accepted quote(s).`);
}

// --- locate each finding in the portable-text tree --------------------------
const segments = extractSegments(post);
const segById = new Map(segments.map((s) => [s.id, s]));
const blockByKey = new Map((post.body || []).filter((b) => b && b._key).map((b) => [b._key, b]));

const sets = {};      // path -> new full text for that node
const applied = [];
const skipped = [];

for (const f of selected) {
  const seg = segById.get(f.segmentId);
  if (!seg) { skipped.push({ f, why: 'segment not found' }); continue; }

  // Title / summary are plain string fields — patch directly.
  if (seg.field === 'title' || seg.field === 'summary') {
    if (!seg.text.includes(f.quote)) { skipped.push({ f, why: 'quote not verbatim in field' }); continue; }
    const path = seg.field;
    const base = sets[path] !== undefined ? sets[path] : seg.text;
    if (!base.includes(f.quote)) { skipped.push({ f, why: 'overlapping edit already applied' }); continue; }
    const spliced = spliceText(base, f.quote, f.suggested_rewrite);
    if (spliced === null) { skipped.push({ f, why: 'quote vanished after an earlier edit' }); continue; }
    sets[path] = spliced;
    applied.push({ f, path, before: seg.text, after: sets[path] });
    continue;
  }
  if (seg.field === 'slug') { skipped.push({ f, why: 'slug change would break the live URL — do by hand' }); continue; }

  const blockKey = seg.meta?.blockKey;
  if (!blockKey) { skipped.push({ f, why: 'no block provenance' }); continue; }
  const block = blockByKey.get(blockKey);
  if (!block) { skipped.push({ f, why: `block ${blockKey} not found` }); continue; }

  // rawHtml (tables): replace inside the html string, only if unambiguous.
  if (seg.meta.blockType === 'rawHtml') {
    const path = `body[_key=="${blockKey}"].html`;
    const base = sets[path] !== undefined ? sets[path] : block.html;
    const n = base.split(f.quote).length - 1;
    if (n === 0) { skipped.push({ f, why: 'quote not found in rawHtml (likely entity-encoded) — apply by hand' }); continue; }
    if (n > 1) { skipped.push({ f, why: `quote appears ${n}× in the table HTML — ambiguous, apply by hand` }); continue; }
    const splicedHtml = spliceText(base, f.quote, f.suggested_rewrite);
    if (splicedHtml === null) { skipped.push({ f, why: 'quote vanished after an earlier edit' }); continue; }
    sets[path] = splicedHtml;
    applied.push({ f, path, before: block.html.slice(0, 160), after: sets[path].slice(0, 160) });
    continue;
  }

  // Normal blocks: the quote must sit entirely inside ONE child span, or we
  // refuse — splicing across spans risks destroying marks/link annotations.
  const children = block.children || [];
  let offset = 0, target = -1, localIdx = -1;
  const full = children.map((c) => c.text || '').join('');
  const qStart = full.indexOf(f.quote);
  if (qStart === -1) { skipped.push({ f, why: 'quote not verbatim in block' }); continue; }
  const qEnd = qStart + f.quote.length;
  for (let i = 0; i < children.length; i++) {
    const t = children[i].text || '';
    if (qStart >= offset && qEnd <= offset + t.length) { target = i; localIdx = qStart - offset; break; }
    offset += t.length;
  }
  if (target === -1) {
    skipped.push({ f, why: 'quote spans multiple styled spans (bold/link) — apply by hand to preserve marks' });
    continue;
  }
  const path = `body[_key=="${blockKey}"].children[${target}].text`;
  const orig = children[target].text || '';
  const base = sets[path] !== undefined ? sets[path] : orig;
  if (!base.includes(f.quote)) { skipped.push({ f, why: 'overlapping edit already applied' }); continue; }
  const splicedChild = spliceText(base, f.quote, f.suggested_rewrite);
  if (splicedChild === null) { skipped.push({ f, why: 'quote vanished after an earlier edit' }); continue; }
  sets[path] = splicedChild;
  applied.push({ f, path, before: orig, after: sets[path] });
}

// --- report ----------------------------------------------------------------
console.log(`\n== Draft patch plan: ${slug} ==`);
console.log(`Document:   ${postId}`);
console.log(`Target:     drafts.${postId}  (published doc is NEVER modified; nothing is published)`);
console.log(`Selected:   ${selected.length} finding(s) with dispositions [${[...include].join(', ')}]`);
console.log(`Auto-apply: ${applied.length}`);
console.log(`Manual:     ${skipped.length}\n`);

for (const a of applied) {
  console.log(`  ✎ [${a.f.disposition}] ${a.path}`);
  console.log(`    - ${a.before.length > 170 ? a.before.slice(0, 170) + '…' : a.before}`);
  console.log(`    + ${a.after.length > 170 ? a.after.slice(0, 170) + '…' : a.after}\n`);
}
if (skipped.length) {
  console.log('  Not auto-applied (reported, not dropped):');
  for (const s of skipped) console.log(`    · [${s.f.disposition}] "${s.f.quote.slice(0, 70)}…" — ${s.why}`);
}

const planPath = join(__dirname, 'data', `patch-plan-${slug}.json`);
writeFileSync(planPath, JSON.stringify({
  postId, slug, draftId: `drafts.${postId}`, createdAt: new Date().toISOString(),
  dispositionsIncluded: [...include],
  sets,
  changeLog: applied.map((a) => ({
    disposition: a.f.disposition, layer: a.f.layer, term: a.f.term || null,
    field: a.f.label, path: a.path,
    originalQuote: a.f.quote, proposedText: a.f.suggested_rewrite,
    readerTakeaway: a.f.reader_takeaway,
  })),
  skipped: skipped.map((s) => ({ quote: s.f.quote, disposition: s.f.disposition, reason: s.why })),
}, null, 2));
console.log(`\nWrote ${planPath}`);
console.log('This script did NOT write to Sanity. Applying the plan is a separate, explicit step.');
