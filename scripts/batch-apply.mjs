#!/usr/bin/env node
// Drive the auto-edit pipeline through the DEPLOYED site, and save every
// change as a permanent log in the repo.
//
//   node scripts/batch-apply.mjs --dry-run              plan only, write nothing
//   node scripts/batch-apply.mjs --max-articles 20      first tranche
//   node scripts/batch-apply.mjs                        everything eligible
//   node scripts/batch-apply.mjs --slugs a,b,c          specific articles
//
// Why through the site rather than Sanity directly: the deployed app holds the
// write token and the ONE tested apply path (planPatch/planDeletion → pt-edit).
// Driving it means batch edits and single-click edits in the UI are literally
// the same code, and the server records decided_by='auto-batch' on every row.
//
// Logs — the part that makes this auditable:
//   review/change-log/<stamp>-<label>.json   every change, machine-readable
//   review/change-log/<stamp>-<label>.md     the same, readable, grouped by PAGE
// Each entry carries the page it belongs to: slug, title, live URL and Studio
// URL, plus the exact before/after text, the field, and any warning (e.g. a
// link that could not be carried into a rewrite).
//
// Drafts only. Nothing is published by any part of this.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BATCH_BASE_URL || 'https://tracking2-web.vercel.app';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

// --- env: CRON_SECRET authenticates us to the deployed endpoint ------------
for (const f of ['.env.prod', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const secret = process.env.CRON_SECRET?.trim();
if (!secret) { console.error('CRON_SECRET not found in .env — cannot authenticate to the site.'); process.exit(1); }

const dryRun = flag('--dry-run');
const maxArticles = opt('--max-articles') ? Number(opt('--max-articles')) : null;
const slugsArg = opt('--slugs') ? opt('--slugs').split(',').map((s) => s.trim()).filter(Boolean) : null;

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 17);
const label = dryRun ? 'dry-run' : maxArticles ? `first-${maxArticles}-articles` : 'batch';

console.log(`== Auto-edit batch ==\nsite: ${BASE}\nmode: ${dryRun ? 'DRY RUN (nothing written)' : 'apply to drafts'}\n`);

const all = [];
let round = 0;
let prevRemaining = Infinity;

for (;;) {
  round++;
  if (round > 400) { console.error('Round cap (400) reached — stopping.'); break; }
  // 10 rows per round keeps each serverless invocation far from its timeout —
  // 25 was ~5s per row of Sanity reads+writes, brushing the 120s ceiling.
  // A failed round is retried: every row commits individually server-side, so
  // re-requesting after a timeout resumes exactly where it stopped.
  let res = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(`${BASE}/api/seo-review/batch-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ limit: 10, dryRun, slugs: slugsArg ?? undefined }),
        // A request that never returns must not stall the whole batch — this
        // run once sat 80 minutes on a single unanswered fetch.
        signal: AbortSignal.timeout(150_000),
      });
      if (res.ok) break;
      console.error(`round ${round} attempt ${attempt}: HTTP ${res.status}`);
    } catch (e) {
      console.error(`round ${round} attempt ${attempt}: ${e.message}`.slice(0, 160));
      res = null;
    }
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  if (!res || !res.ok) {
    console.error(`Round ${round}: failed after 3 attempts — stopping.`);
    break;
  }
  const json = await res.json();
  all.push(...json.changes);
  const articles = new Set(all.map((c) => c.slug));
  console.log(
    `round ${round}: +${json.processed} (applied ${json.applied}, skipped ${json.skipped}, errors ${json.errors})` +
    ` · total ${all.length} across ${articles.size} article(s) · ${json.remainingEligible} still eligible`,
  );

  if (json.errors > 0 && json.applied === 0) { console.error('Round produced only errors — stopping.'); break; }
  if (json.processed === 0 || json.remainingEligible === 0) break;
  // No progress two rounds running means the server is re-serving the same
  // rows — stop rather than loop on them.
  if (json.applied === 0 && json.remainingEligible >= prevRemaining) {
    console.error('No progress: nothing applied and the eligible pool did not shrink — stopping.');
    break;
  }
  prevRemaining = json.remainingEligible;
  if (dryRun) {
    // Dry run applies nothing, so "remaining" never shrinks — one round shows
    // the plan; looping would repeat the same 25 forever.
    break;
  }
  if (maxArticles && articles.size >= maxArticles) {
    console.log(`Reached --max-articles ${maxArticles}.`);
    break;
  }
}

// --- write the logs ---------------------------------------------------------
const dir = join(ROOT, 'review', 'change-log');
mkdirSync(dir, { recursive: true });

const jsonPath = join(dir, `${stamp}-${label}.json`);
writeFileSync(jsonPath, JSON.stringify({
  ranAt: new Date().toISOString(),
  site: BASE,
  dryRun,
  totals: {
    changes: all.length,
    applied: all.filter((c) => c.action === 'rewrite' || c.action === 'delete').length,
    rewrites: all.filter((c) => c.action === 'rewrite').length,
    deletions: all.filter((c) => c.action === 'delete').length,
    skipped: all.filter((c) => c.action === 'skipped').length,
    errors: all.filter((c) => c.action === 'error').length,
    articles: new Set(all.map((c) => c.slug)).size,
  },
  changes: all,
}, null, 2));

// Readable log, grouped by page — every change sits under the article it
// belongs to, with the live and Studio links right there.
const bySlug = new Map();
for (const c of all) {
  if (!bySlug.has(c.slug)) bySlug.set(c.slug, []);
  bySlug.get(c.slug).push(c);
}
const lines = [
  `# Auto-edit change log — ${stamp}${dryRun ? ' (DRY RUN — nothing was written)' : ''}`,
  '',
  `${all.length} change(s) across ${bySlug.size} article(s). Every edit went to the Sanity **draft**; nothing was published.`,
  `Machine-readable version: \`${jsonPath.split('/').pop()}\`. Rows are also marked \`decided_by=auto-batch\` in the decision database.`,
  '',
];
for (const [slug, changes] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const first = changes[0];
  lines.push(`## ${first.title || slug}`);
  lines.push(`page: \`${slug}\` · [live](${first.liveUrl}) · [draft in Studio](${first.studioUrl})`);
  lines.push('');
  for (const c of changes) {
    const head = c.action === 'rewrite' ? 'REWROTE' : c.action === 'delete' ? 'DELETED' : c.action.toUpperCase();
    lines.push(`- **${head}** · ${c.fieldLabel} · ${c.category}/${c.disposition}${c.scope ? ` · ${c.scope}` : ''}`);
    lines.push(`  - was: “${(c.original || '').replace(/\s+/g, ' ').slice(0, 240)}”`);
    if (c.replacement) lines.push(`  - now: “${c.replacement.replace(/\s+/g, ' ').slice(0, 240)}”`);
    if (c.warning) lines.push(`  - ⚠ ${c.warning}`);
  }
  lines.push('');
}
const mdPath = join(dir, `${stamp}-${label}.md`);
writeFileSync(mdPath, lines.join('\n'));

console.log(`\nChanges:   ${all.length} across ${bySlug.size} article(s)`);
console.log(`  applied: ${all.filter((c) => c.action === 'rewrite' || c.action === 'delete').length}` +
  ` (rewrote ${all.filter((c) => c.action === 'rewrite').length}, deleted ${all.filter((c) => c.action === 'delete').length})`);
console.log(`  skipped: ${all.filter((c) => c.action === 'skipped').length}  errors: ${all.filter((c) => c.action === 'error').length}`);
console.log(`\nLog: ${mdPath}\n     ${jsonPath}`);
