#!/usr/bin/env node
// Post-edit verification of every edited draft — the two passes the owner
// asked for, run AFTER the batch has finished writing:
//
//   1. Artifact pass — grammar/hangover damage from splicing: duplicated
//      phrases, broken punctuation, orphaned fragments. Uses the deployed
//      /verify endpoint (same checker the UI uses); anything repairable is
//      then fixed via /repair with apply=true, and anything left is listed.
//
//   2. Residual-language pass — re-run the full review scanners (Layer A
//      lexicon + Layer B semantic, under the CURRENT rules) against the
//      EDITED DRAFT text. This is the "no trace remains" check: it reads what
//      the article says now, not what we think we changed it to. Any red or
//      amber finding that still anchors in the draft is a residual.
//
//   node scripts/verify-drafts.mjs                 verify every edited article
//   node scripts/verify-drafts.mjs --limit 5       first 5 (smoke test)
//   node scripts/verify-drafts.mjs --skip-semantic artifacts only (fast, free)
//
// Output: review/change-log/<stamp>-verification.{json,md}, grouped by page
// with slug + live + Studio links, same convention as the edit logs.
//
// Draft content is read through the deployed site (drafts are not readable
// anonymously; the token lives only there). Semantic scanning runs locally
// against the Anthropic API. Repairs are the only writes, and they go through
// the same deployed repair path as the UI button.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractSegments } from '../review/lib/extract.mjs';
import { scanPost } from '../review/lib/layer-a.mjs';
import { semanticPass } from '../review/lib/layer-b.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BATCH_BASE_URL || 'https://tracking2-web.vercel.app';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

for (const f of ['.env.prod', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const secret = process.env.CRON_SECRET?.trim();
if (!secret) { console.error('CRON_SECRET missing.'); process.exit(1); }

const HEADERS = { Authorization: `Bearer ${secret}` };
const api = async (path) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  throw new Error(`API failed after retries: ${path}`);
};

// Articles with at least one applied edit, from the local Prisma client.
import { createRequire } from 'node:module';
const require = createRequire(join(ROOT, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const dbUrl = readFileSync(join(ROOT, '.env.prod'), 'utf8').match(/^DATABASE_URL=["']?([^"'\n]+)/m)[1];
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const edited = await prisma.$queryRawUnsafe(`
  SELECT slug, post_id, min(title) AS title, count(*)::int AS edits
  FROM seo_review_findings WHERE applied_to_draft = true
  GROUP BY slug, post_id ORDER BY slug`);
await prisma.$disconnect();

let targets = edited;
if (opt('--limit')) targets = targets.slice(0, Number(opt('--limit')));

const rulesText = readFileSync(join(ROOT, 'review', 'RULES.md'), 'utf8');
const skipSemantic = flag('--skip-semantic');

console.log(`== Post-edit verification ==\n${targets.length} edited article(s) · semantic pass ${skipSemantic ? 'OFF' : 'on'}\n`);

const report = [];
let done = 0;

for (const t of targets) {
  const row = {
    slug: t.slug, title: t.title, edits: t.edits,
    liveUrl: `https://www.granola.ai/blog/${t.slug}`,
    studioUrl: `https://www.granola.ai/studio/structure/seoPosts;${t.post_id}`,
    artifacts: [], repaired: [], manual: [], residuals: [], error: null,
  };
  try {
    // Pass 1 — artifacts.
    const v = await api(`/api/seo-review/verify?slug=${encodeURIComponent(t.slug)}`);
    if (v) {
      row.artifacts = (v.issues || []).map((i) => ({ kind: i.kind, where: i.where, detail: i.detail, text: (i.text || '').slice(0, 140) }));
      row.manual = (v.manualActions || []).map((m) => ({ reason: m.reason, field: m.fieldLabel, text: (m.text || '').slice(0, 140) }));
      if (row.artifacts.length) {
        const r = await fetch(`${BASE}/api/seo-review/repair?slug=${encodeURIComponent(t.slug)}&apply=true`, {
          method: 'POST', headers: HEADERS, signal: AbortSignal.timeout(60_000),
        }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r) {
          row.repaired = (r.repaired || []).map((x) => ({ where: x.where, removed: (x.removed || '').slice(0, 120) }));
          row.manual.push(...(r.unrepairable || []).map((u) => ({ reason: u.detail, field: u.where, text: (u.text || '').slice(0, 140) })));
        }
      }
    }

    // Pass 2 — residual language, against the DRAFT as it stands now.
    const dd = await api(`/api/seo-review/draft-doc?id=${encodeURIComponent(t.post_id)}`);
    if (dd && dd.doc) {
      const post = { ...dd.doc, slug: { current: t.slug } };
      const segments = extractSegments(post);
      const aHits = scanPost(post).filter((h) => h.tier === 'red');
      let bFindings = [];
      if (!skipSemantic) {
        const sem = await semanticPass({ rulesText, post, segments });
        bFindings = (sem.findings || []).filter((f) => ['red', 'amber'].includes(f.disposition));
      }
      row.residuals = [
        ...aHits.map((h) => ({ layer: 'A', severity: 'red', term: h.term, quote: (h.sentence || h.quote || '').slice(0, 160) })),
        ...bFindings.map((f) => ({ layer: 'B', severity: f.disposition, category: f.category || 'disclosure', quote: (f.quote || '').slice(0, 160), why: (f.reader_takeaway || '').slice(0, 140) })),
      ];
    } else {
      row.error = 'could not read the draft document';
    }
  } catch (e) {
    row.error = e instanceof Error ? e.message : String(e);
  }
  report.push(row);
  done++;
  const flagged = row.artifacts.length + row.residuals.length + row.manual.length;
  console.log(`[${done}/${targets.length}] ${t.slug.slice(0, 55)}  ${row.error ? 'ERROR: ' + row.error.slice(0, 60) : flagged === 0 ? 'clean' : `artifacts:${row.artifacts.length} repaired:${row.repaired.length} residuals:${row.residuals.length} manual:${row.manual.length}`}`);
}

// --- write the report -------------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 17);
const dir = join(ROOT, 'review', 'change-log');
mkdirSync(dir, { recursive: true });

const totals = {
  articles: report.length,
  clean: report.filter((r) => !r.error && r.artifacts.length + r.residuals.length + r.manual.length === 0).length,
  withResiduals: report.filter((r) => r.residuals.length).length,
  residuals: report.reduce((a, r) => a + r.residuals.length, 0),
  repaired: report.reduce((a, r) => a + r.repaired.length, 0),
  manual: report.reduce((a, r) => a + r.manual.length, 0),
  errors: report.filter((r) => r.error).length,
};

writeFileSync(join(dir, `${stamp}-verification.json`), JSON.stringify({ ranAt: new Date().toISOString(), skipSemantic, totals, report }, null, 2));

const lines = [
  `# Post-edit verification — ${stamp}`, '',
  `${totals.articles} edited article(s). **${totals.clean} fully clean.** ` +
  `${totals.residuals} residual finding(s) in ${totals.withResiduals} article(s) · ` +
  `${totals.repaired} artifact(s) auto-repaired · ${totals.manual} item(s) need a hand · ${totals.errors} error(s).`, '',
  `A *residual* is red/amber language still present in the edited draft — the "no trace remains" check read the draft as it stands, not the edit list.`, '',
];
for (const r of report) {
  const flagged = r.artifacts.length + r.residuals.length + r.manual.length;
  if (!flagged && !r.error) continue; // clean articles are counted, not listed
  lines.push(`## ${r.title || r.slug}`);
  lines.push(`page: \`${r.slug}\` · ${r.edits} edit(s) · [live](${r.liveUrl}) · [draft in Studio](${r.studioUrl})`);
  if (r.error) lines.push(`- **ERROR**: ${r.error}`);
  for (const x of r.residuals) lines.push(`- **RESIDUAL ${x.severity}** (${x.layer}${x.category ? '/' + x.category : ''}): “${x.quote}”${x.why ? ` — ${x.why}` : ''}`);
  for (const x of r.repaired) lines.push(`- repaired: ${x.where} — removed “${x.removed}”`);
  for (const x of r.manual) lines.push(`- **manual**: ${x.field} — ${x.reason} — “${x.text}”`);
  lines.push('');
}
writeFileSync(join(dir, `${stamp}-verification.md`), lines.join('\n'));

console.log(`\nClean: ${totals.clean}/${totals.articles} · residuals ${totals.residuals} · repaired ${totals.repaired} · manual ${totals.manual} · errors ${totals.errors}`);
console.log(`Report: review/change-log/${stamp}-verification.md`);
