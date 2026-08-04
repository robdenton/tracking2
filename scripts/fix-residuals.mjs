#!/usr/bin/env node
// Fix the verification sweep's OWN-DEFECT list: residuals introduced by our
// rewrites, and apply mismatches (old text an edit should have removed but
// which still reads in the draft).
//
//   node scripts/fix-residuals.mjs             plan + insert + apply
//   node scripts/fix-residuals.mjs --plan-only stop after showing the plan
//
// HOW IT WORKS
// Each defect becomes a first-class finding row in the database and is applied
// through the deployed human-accepted pipeline — the same tested path as every
// other edit, so it lands in the change log, the Changes page, and the
// decided_by audit trail ('auto-fix') like everything else. No side-channel
// writes to Sanity.
//
//   introduced  -> generate a fresh rewrite (Anthropic API) with the residual's
//                  own reasoning fed back as an explicit constraint
//   mismatch    -> reuse the replacement text of the finding whose apply missed
//                  this occurrence
//
// Anything whose quote no longer anchors verbatim in the current draft is
// listed for the manual pass instead of guessed at.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { extractSegments } from '../review/lib/extract.mjs';
import { MODEL } from '../review/lib/layer-b.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.BATCH_BASE_URL || 'https://tracking2-web.vercel.app';
const planOnly = process.argv.includes('--plan-only');

for (const f of ['.env.prod', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const secret = process.env.CRON_SECRET?.trim();
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
if (!secret || !anthropicKey) { console.error('CRON_SECRET / ANTHROPIC_API_KEY missing.'); process.exit(1); }

import { createRequire } from 'node:module';
const require = createRequire(join(ROOT, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const dbUrl = readFileSync(join(ROOT, '.env.prod'), 'utf8').match(/^DATABASE_URL=["']?([^"'\n]+)/m)[1];
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const rulesText = readFileSync(join(ROOT, 'review', 'RULES.md'), 'utf8');
const rulesHash = createHash('sha256').update(rulesText).digest('hex');

const FIELD_KIND = { title: 'title', slug: 'slug', summary: 'summary', paragraph: 'block', heading: 'block', blockquote: 'block', listItem: 'block', tableHeader: 'rawHtml', tableCell: 'rawHtml', linkText: 'block', linkHref: 'linkHref' };
const FIELD_LABEL = { title: 'Title', summary: 'Meta / summary', paragraph: 'Body paragraph', heading: 'Heading', blockquote: 'Blockquote / testimonial', listItem: 'List item', tableHeader: 'Table header cell', tableCell: 'Table cell', linkText: 'Link text', linkHref: 'Link URL' };

// --- collect the 58 ---------------------------------------------------------
const reportArg = (() => { const i = process.argv.indexOf('--report'); return i >= 0 ? process.argv[i + 1] : null; })();
const final = require(reportArg ? join(ROOT, reportArg) : join(ROOT, 'review', 'change-log', '2026-08-04-verification-FINAL.json'));
const appliedRows = await prisma.$queryRawUnsafe(`
  SELECT slug, original_text, COALESCE(final_text, proposed_text) AS replacement
  FROM seo_review_findings WHERE applied_to_draft`);
const appliedBySlug = new Map();
for (const a of appliedRows) {
  if (!appliedBySlug.has(a.slug)) appliedBySlug.set(a.slug, []);
  appliedBySlug.get(a.slug).push(a);
}
const norm = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();

const work = [];
for (const r of final.report) {
  for (const x of r.residuals || []) {
    if (x.class === 'apply-mismatch') {
      // Find the applied row whose original overlaps — its replacement is the fix.
      const donor = (appliedBySlug.get(r.slug) || []).find(
        (a) => norm(a.original_text).includes(norm(x.quote)) || norm(x.quote).includes(norm(a.original_text)),
      );
      work.push({ kind: 'mismatch', slug: r.slug, quote: x.quote, why: x.why || '', severity: x.severity, category: x.category || 'disclosure', donor: donor?.replacement || null });
    } else if (x.class === 'new') {
      const q = norm(x.quote);
      const introduced = (appliedBySlug.get(r.slug) || []).some((a) => q.length >= 15 && norm(a.replacement).includes(q));
      if (introduced) {
        work.push({ kind: 'introduced', slug: r.slug, quote: x.quote, why: x.why || '', severity: x.severity, category: x.category || 'disclosure' });
      }
    }
  }
}
console.log(`Defects to fix: ${work.length} (${work.filter((w) => w.kind === 'introduced').length} introduced, ${work.filter((w) => w.kind === 'mismatch').length} mismatches) across ${new Set(work.map((w) => w.slug)).size} page(s)\n`);
if (planOnly) { await prisma.$disconnect(); process.exit(0); }

// --- resolve targets in the CURRENT drafts ----------------------------------
const meta = await prisma.$queryRawUnsafe(`SELECT DISTINCT slug, post_id, title FROM seo_review_findings`);
const metaBySlug = new Map(meta.map((m) => [m.slug, m]));

const api = (path) => fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) }).then((r) => (r.ok ? r.json() : null));

async function generateRewrite(item, segText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      tools: [{
        name: 'submit_fix',
        description: 'Submit the corrected copy',
        input_schema: {
          type: 'object',
          properties: {
            rewrite: { type: 'string', description: 'Replacement for the FLAGGED SPAN only — must fit grammatically where the flagged text sits.' },
            delete_instead: { type: 'boolean', description: 'True when removal is the better remedy and the surrounding copy reads cleanly without it.' },
          },
          required: ['rewrite', 'delete_instead'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_fix' },
      system: 'You fix brand-safety defects in Granola\'s SEO articles. The rules below are the contract; a previous rewrite VIOLATED them and you are correcting it. Never argue that people behave differently when no bot is visible; never make imperceptibility a benefit; competitor comparisons are purely factual; Granola runs on laptop or phone using device audio.\n\n' + rulesText.slice(0, 30000),
      messages: [{
        role: 'user',
        content: `The flagged span below was written by an earlier automated rewrite and violates the rules.\n\nWHY IT FAILS: ${item.why}\nCATEGORY: ${item.category}\n\nFULL PASSAGE (context):\n${segText.slice(0, 2500)}\n\nFLAGGED SPAN (replace exactly this):\n${item.quote}\n\nWrite the corrected replacement for the flagged span only.`,
      }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const j = await res.json();
  const tool = (j.content || []).find((c) => c.type === 'tool_use');
  return tool?.input ?? null;
}

const inserts = [];
const manual = [];
let done = 0;

for (const item of work) {
  done++;
  const m = metaBySlug.get(item.slug);
  if (!m) { manual.push({ ...item, reason: 'article not found' }); continue; }
  const dd = await api(`/api/seo-review/draft-doc?id=${m.post_id}`);
  if (!dd?.doc) { manual.push({ ...item, reason: 'draft unreadable' }); continue; }
  const segments = extractSegments({ ...dd.doc, slug: { current: item.slug } });
  // The residual quote was truncated to 160 chars by the scanner; anchor on it verbatim.
  const seg = segments.find((s) => s.text.includes(item.quote));
  if (!seg || !seg.meta?.blockKey) {
    manual.push({ ...item, reason: seg ? 'no block provenance' : 'quote no longer anchors (draft changed since the sweep)' });
    continue;
  }

  let replacement = null; let scope = 'sentence'; let deletion = 'none';
  try {
    if (item.kind === 'mismatch' && item.donor) {
      replacement = item.donor;
    } else {
      const fix = await generateRewrite(item, seg.text);
      if (!fix) throw new Error('no tool output');
      if (fix.delete_instead) { deletion = 'sentence'; replacement = ''; }
      else replacement = fix.rewrite;
    }
  } catch (e) {
    manual.push({ ...item, reason: 'rewrite generation failed: ' + (e.message || e) });
    continue;
  }

  const id = createHash('sha256').update(`${m.post_id}|${seg.id}|${item.quote}|fix-residual`).digest('hex').slice(0, 32);
  inserts.push({
    id, post_id: m.post_id, slug: item.slug, title: m.title, segment_id: seg.id,
    field_label: FIELD_LABEL[seg.field] || seg.field, field_kind: FIELD_KIND[seg.field] || 'block',
    block_key: seg.meta.blockKey, layer: 'B', term: '',
    disposition: item.severity === 'red' ? 'red' : 'amber', confidence: 'high',
    original_text: item.quote,
    proposed_text: replacement || null,
    rewrite_scope: replacement ? scope : 'none',
    deletion_scope: deletion,
    reader_takeaway: `[residual fix · ${item.kind}] ${item.why}`.slice(0, 500),
    category: item.category,
  });
  console.log(`[${done}/${work.length}] ${item.kind.padEnd(10)} ${item.slug.slice(0, 45)} — ${replacement === '' ? 'DELETE' : 'rewrite ready'}`);
}

// --- insert as accepted rows and apply through the deployed pipeline --------
for (const r of inserts) {
  await prisma.$executeRawUnsafe(`
    INSERT INTO seo_review_findings
      (id, post_id, slug, title, segment_id, field_label, layer, term, disposition, confidence,
       original_text, proposed_text, reader_takeaway, decision, decided_by, decided_at,
       rules_hash, model, applied_to_draft, field_kind, block_key, rewrite_scope, deletion_scope, category,
       created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,'B','', $7,$8,$9,$10,$11,
            $12,'auto-fix', now(), $13,$14,false,$15,$16,$17,$18,$19, now(), now())
    ON CONFLICT (id) DO UPDATE SET proposed_text = EXCLUDED.proposed_text, decision = EXCLUDED.decision, applied_to_draft = false`,
    r.id, r.post_id, r.slug, r.title, r.segment_id, r.field_label, r.disposition, r.confidence,
    r.original_text, r.proposed_text, r.reader_takeaway,
    r.proposed_text !== '' && r.proposed_text !== null ? 'accept' : 'accept-delete',
    rulesHash, MODEL, r.field_kind, r.block_key, r.rewrite_scope, r.deletion_scope, r.category);
}
console.log(`\nInserted ${inserts.length} fix row(s); ${manual.length} to the manual list.`);
writeFileSync(join(ROOT, 'review', 'change-log', 'residual-fix-manual.json'), JSON.stringify(manual, null, 2));
await prisma.$disconnect();
console.log('Now apply with: node scripts/batch-apply.mjs --mode human-accepted --slugs <affected>');
console.log('AFFECTED=' + [...new Set(inserts.map((i) => i.slug))].join(','));
