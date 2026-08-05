#!/usr/bin/env node
// Regenerate remedies for QUOTED-SPEECH findings under Addendum 6 before the
// amber batch applies them.
//
// The owner's ruling: a customer's quoted words are never reworded. If a quote
// alludes to bots changing the conversation, or endorses no-bot capture
// without transparency, it is TRIMMED (contiguous parts removed, every
// remaining word verbatim and in order) or DELETED. Existing proposed rewrites
// for these rows predate the ruling and may paraphrase — so they are replaced
// wholesale here, with the verbatim constraint enforced MECHANICALLY: any trim
// the model returns that is not a true ordered-substring reduction of the
// original is refused and becomes a delete.
//
// Rows touched: undecided queue rows in blockquote/testimonial fields, plus
// any whose text contains a quotation-marked passage. TL;DR callouts are not
// testimonials; the model may rewrite those freely (still rule-bound).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL } from '../review/lib/layer-b.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
for (const f of ['.env.prod', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
if (!anthropicKey) { console.error('ANTHROPIC_API_KEY missing'); process.exit(1); }

import { createRequire } from 'node:module';
const require = createRequire(join(ROOT, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const dbUrl = readFileSync(join(ROOT, '.env.prod'), 'utf8').match(/^DATABASE_URL=["']?([^"'\n]+)/m)[1];
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const rulesText = readFileSync(join(ROOT, 'review', 'RULES.md'), 'utf8');

const rows = await prisma.$queryRawUnsafe(`
  SELECT id, slug, field_label, original_text, reader_takeaway, rewrite_scope
  FROM seo_review_findings
  WHERE decision IS NULL AND applied_to_draft = false
    AND (decided_by IS NULL OR decided_by NOT IN ('auto-skip'))
    AND disposition = 'amber' AND confidence IN ('medium','high')
    AND (field_label = 'Blockquote / testimonial'
         OR original_text ~ '["“][^"”]{30,}["”]'
         OR reader_takeaway ILIKE '%quoted user%' OR reader_takeaway ILIKE '%testimonial%')`);
console.log(`Quoted-speech queue rows to re-remedy: ${rows.length}`);

/** True when `trimmed` is the original with zero or more contiguous parts removed. */
function isVerbatimTrim(original, trimmed) {
  const words = (s) => s.replace(/[“”"']/g, '').split(/\s+/).filter(Boolean);
  const o = words(original), t = words(trimmed);
  if (t.length === 0 || t.length > o.length) return false;
  let i = 0;
  for (const w of t) {
    while (i < o.length && o[i] !== w) i++;
    if (i >= o.length) return false;
    i++;
  }
  return true;
}

async function decide(row) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1500, thinking: { type: 'adaptive' },
      tools: [{
        name: 'submit_remedy',
        description: 'Remedy for a flagged passage that contains or is quoted speech',
        input_schema: {
          type: 'object',
          properties: {
            is_quoted_speech: { type: 'boolean', description: 'True if this is a real person\'s quoted words (testimonial). TL;DR callouts and editorial blockquotes are false.' },
            action: { type: 'string', enum: ['keep', 'trim', 'delete', 'rewrite'], description: 'keep = quote makes neither forbidden point; trim = remove offending contiguous parts (quotes only); delete = remove entirely; rewrite = free rewrite (non-quotes only)' },
            text: { type: 'string', description: 'For trim: the trimmed quote, every word verbatim and in order from the original. For rewrite: the replacement. Empty otherwise.' },
          },
          required: ['is_quoted_speech', 'action', 'text'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_remedy' },
      system: 'You apply the brand owner\'s testimonial ruling (Addendum 6) to Granola SEO copy. A customer\'s quoted words are NEVER reworded — only trimmed (contiguous removals, all remaining words verbatim in order) or deleted. Trim/delete is required when the quote alludes to bots changing the nature of the conversation, or endorses no-bot capture without transparency. Quotes making neither point are kept.\n\n' + rulesText.slice(0, 28000),
      messages: [{ role: 'user', content: `FLAGGED PASSAGE (field: ${row.field_label}):\n${row.original_text}\n\nWHY FLAGGED: ${row.reader_takeaway || ''}\n\nChoose the remedy.` }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const j = await res.json();
  return (j.content || []).find((c) => c.type === 'tool_use')?.input ?? null;
}

let kept = 0, trimmed = 0, deleted = 0, rewritten = 0, forcedDelete = 0, failed = 0, done = 0;
for (const row of rows) {
  done++;
  try {
    const r = await decide(row);
    if (!r) throw new Error('no output');
    if (r.is_quoted_speech && r.action === 'rewrite') r.action = 'delete'; // rule: never reword a quote

    if (r.action === 'keep') {
      // Clear it from the queue as owner-sanctioned: mark decided.
      await prisma.$executeRawUnsafe(
        `UPDATE seo_review_findings SET decision='dismiss', decided_by='auto-batch', decided_at=now(),
         note=COALESCE(note,'[testimonial ruling] quote makes neither forbidden point — kept') WHERE id=$1`, row.id);
      kept++;
    } else if (r.action === 'trim' && r.is_quoted_speech) {
      if (!isVerbatimTrim(row.original_text, r.text)) {
        // Not a true trim — the rule says delete instead. Never accept a paraphrase.
        await prisma.$executeRawUnsafe(
          `UPDATE seo_review_findings SET proposed_text=NULL, rewrite_scope='none',
           deletion_scope=CASE WHEN field_label='Blockquote / testimonial' THEN 'paragraph' ELSE 'sentence' END,
           note=COALESCE(note,'[testimonial ruling] trim failed verbatim check — deleting') WHERE id=$1`, row.id);
        forcedDelete++;
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE seo_review_findings SET proposed_text=$2, rewrite_scope=$3,
           note=COALESCE(note,'[testimonial ruling] trimmed, verbatim-verified') WHERE id=$1`,
          row.id, r.text, row.rewrite_scope === 'paragraph' ? 'paragraph' : 'sentence');
        trimmed++;
      }
    } else if (r.action === 'delete') {
      await prisma.$executeRawUnsafe(
        `UPDATE seo_review_findings SET proposed_text=NULL, rewrite_scope='none',
         deletion_scope=CASE WHEN field_label='Blockquote / testimonial' THEN 'paragraph' ELSE 'sentence' END,
         note=COALESCE(note,'[testimonial ruling] deleted') WHERE id=$1`, row.id);
      deleted++;
    } else {
      // Non-quote rewrite (TL;DR blocks etc.).
      await prisma.$executeRawUnsafe(
        `UPDATE seo_review_findings SET proposed_text=$2 WHERE id=$1`, row.id, r.text);
      rewritten++;
    }
  } catch (e) {
    failed++;
    console.log(`  [${done}/${rows.length}] FAIL ${row.slug.slice(0, 40)}: ${e.message}`);
    continue;
  }
  if (done % 20 === 0) console.log(`  [${done}/${rows.length}] kept ${kept} · trimmed ${trimmed} · deleted ${deleted} · rewritten ${rewritten} · forced-delete ${forcedDelete}`);
}
console.log(`\nDone: kept ${kept} (cleared) · trimmed ${trimmed} · deleted ${deleted} · rewritten ${rewritten} · forced-delete ${forcedDelete} · failed ${failed}`);
await prisma.$disconnect();
