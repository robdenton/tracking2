#!/usr/bin/env node
// Bulk-publish the edited drafts, on the owner's instruction (2026-08-05).
//
//   node scripts/bulk-publish.mjs --dry-run
//   node scripts/bulk-publish.mjs
//
// Order of operations, deliberately:
//   1. SNAPSHOT every edited draft into archive/<date>-edited-pre-publish/.
//      Publishing consumes the draft, so this snapshot is the only complete
//      record of "what we published" — and the rollback source if an article
//      ever needs to revert to its pre-review original (archive/2026-08-04).
//   2. Publish each draft through the deployed endpoint — explicit id list,
//      the two deliberately-unpublished articles excluded.
//   3. Verify a sample: published doc now contains a known replacement text,
//      and the draft is gone.
//   4. Write the publish log to review/change-log/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BATCH_BASE_URL || 'https://tracking2-web.vercel.app';
const dryRun = process.argv.includes('--dry-run');

for (const f of ['.env.prod', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const secret = process.env.CRON_SECRET?.trim();
if (!secret) { console.error('CRON_SECRET missing'); process.exit(1); }
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` };

// The owner unpublished these on purpose. They are NEVER bulk-published;
// their drafts stay put for whenever he republishes by hand.
const EXCLUDE = new Set([
  'best-meeting-transcription-apps',
  'how-to-transcribe-an-audio-interview-to-text-tools-and-workflow-for-clean-analysable-transcripts',
]);

import { createRequire } from 'node:module';
const require = createRequire(join(ROOT, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const dbUrl = readFileSync(join(ROOT, '.env.prod'), 'utf8').match(/^DATABASE_URL=["']?([^"'\n]+)/m)[1];
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const arts = await prisma.$queryRawUnsafe(`
  SELECT slug, post_id, count(*)::int edits, min(title) title
  FROM seo_review_findings WHERE applied_to_draft = true GROUP BY slug, post_id ORDER BY slug`);
// One replacement text per article, for post-publish verification.
const probes = await prisma.$queryRawUnsafe(`
  SELECT DISTINCT ON (slug) slug, COALESCE(final_text, proposed_text) probe
  FROM seo_review_findings
  WHERE applied_to_draft AND COALESCE(final_text, proposed_text) IS NOT NULL
    AND length(COALESCE(final_text, proposed_text)) BETWEEN 40 AND 300
  ORDER BY slug, applied_at DESC`);
await prisma.$disconnect();
const probeBySlug = new Map(probes.map((p) => [p.slug, p.probe]));

const targets = arts.filter((a) => !EXCLUDE.has(a.slug));
console.log(`Articles with edits: ${arts.length} · excluded (deliberately unpublished): ${arts.length - targets.length} · to publish: ${targets.length}${dryRun ? ' [DRY RUN]' : ''}\n`);

// --- 1. snapshot the edited drafts ------------------------------------------
const stamp = new Date().toISOString().slice(0, 10);
const SNAP = join(ROOT, 'archive', `${stamp}-edited-pre-publish`);
mkdirSync(join(SNAP, 'json'), { recursive: true });
let snapped = 0;
for (const a of arts) { // snapshot ALL edited drafts, including excluded ones
  const r = await fetch(`${BASE}/api/seo-review/draft-doc?id=${a.post_id}`, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) { console.error(`snapshot FAILED for ${a.slug} — aborting before any publish`); process.exit(1); }
  const j = await r.json();
  if (j.source !== 'draft') { console.log(`  note: ${a.slug} has no draft (source=${j.source}) — nothing to publish there`); continue; }
  writeFileSync(join(SNAP, 'json', `${a.slug}.draft.json`), JSON.stringify(j.doc, null, 2));
  snapped++;
  if (snapped % 50 === 0) console.log(`  snapshot ${snapped}/${arts.length}`);
}
console.log(`Snapshot: ${snapped} draft(s) -> archive/${stamp}-edited-pre-publish/\n`);

// --- 2. publish --------------------------------------------------------------
const results = [];
for (let i = 0; i < targets.length; i += 20) {
  const chunk = targets.slice(i, i + 20);
  let res = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(`${BASE}/api/seo-review/publish`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ postIds: chunk.map((c) => c.post_id), dryRun }),
        signal: AbortSignal.timeout(150_000),
      });
      if (res.ok) break;
    } catch { res = null; }
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  if (!res || !res.ok) { console.error(`publish chunk failed at offset ${i} — stopping`); break; }
  const j = await res.json();
  for (const r of j.results) {
    const slug = chunk.find((c) => c.post_id === r.postId)?.slug ?? r.postId;
    results.push({ ...r, slug });
  }
  console.log(`[${Math.min(i + 20, targets.length)}/${targets.length}] published so far: ${results.filter((r) => r.status === 'published').length}`);
}

// --- 3. verify a sample ------------------------------------------------------
let verified = 0, verifyFails = 0;
if (!dryRun) {
  const sample = results.filter((r) => r.status === 'published' && probeBySlug.has(r.slug)).slice(0, 12);
  for (const s of sample) {
    const q = `{"pub": *[_id == "${s.postId}"][0], "draft": *[_id == "drafts.${s.postId}"][0]}`;
    const r = await fetch(`https://oy7f1h9b.api.sanity.io/v2021-06-07/data/query/production?query=${encodeURIComponent(q)}`);
    const j = (await r.json()).result;
    const text = JSON.stringify(j.pub || {});
    const probe = (probeBySlug.get(s.slug) || '').slice(0, 60);
    if (j.draft === null && text.includes(probe.slice(0, 40))) verified++;
    else { verifyFails++; console.error(`VERIFY FAIL: ${s.slug} draftGone=${j.draft === null}`); }
  }
}

// --- 4. log ------------------------------------------------------------------
const out = {
  ranAt: new Date().toISOString(), dryRun,
  toPublish: targets.length,
  published: results.filter((r) => r.status === 'published').length,
  noDraft: results.filter((r) => r.status === 'no-draft').length,
  errors: results.filter((r) => r.status === 'error').length,
  excluded: [...EXCLUDE],
  sampleVerified: verified, sampleVerifyFails: verifyFails,
  results,
};
const logPath = join(ROOT, 'review', 'change-log', `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 17)}-publish.json`);
writeFileSync(logPath, JSON.stringify(out, null, 2));
console.log(`\nPublished: ${out.published} · no-draft: ${out.noDraft} · errors: ${out.errors} · sample verified ${verified}/${verified + verifyFails}`);
console.log(`Log: ${logPath}`);
