#!/usr/bin/env node
// Consent & disclosure review — main runner.
//
//   node review/run.mjs --limit 3            process the next 3 queued articles
//   node review/run.mjs --slug <slug>        process one specific article
//   node review/run.mjs                      process everything still queued
//   node review/run.mjs --render-only        rebuild index/pages from the ledger
//   node review/run.mjs --force              re-process even if already done
//
// Resumable: anything marked `done` in review/state.json is skipped unless
// --force. The index is regenerated after EVERY article so progress can be
// watched in the browser.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

import { extractSegments } from './lib/extract.mjs';
import { scanPost } from './lib/layer-a.mjs';
import { semanticPass, adjudicateLexicon, repairQuotes, MODEL } from './lib/layer-b.mjs';
import { anchorFindings, reconcileLexicon, AnchorError } from './lib/anchor.mjs';
import { renderArticlePage } from './lib/render-article.mjs';
import { renderIndex } from './lib/render-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(__dirname, 'data');
const EXPECTED = 207;

const P = {
  rules: join(__dirname, 'RULES.md'),
  state: join(__dirname, 'state.json'),
  index: join(__dirname, 'index.html'),
  csv: join(__dirname, 'findings.csv'),
  snapshot: join(ROOT, 'audit', 'data', 'posts.json'),
  findings: join(DATA, 'findings.json'),
};

// --- env -------------------------------------------------------------------
for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true });

const readJson = (p, fb) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fb);
const csvField = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// --- corpus ----------------------------------------------------------------
// Re-count live against Sanity so the run always states the true in-scope number.
async function liveCount() {
  const q = '*[_type == "post" && hidden == true && !(_id in path("drafts.**"))]';
  const url = `https://oy7f1h9b.api.sanity.io/v2021-06-07/data/query/production?query=${encodeURIComponent(`count(${q})`)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sanity count failed: ${r.status}`);
  return (await r.json()).result;
}

function loadCorpus() {
  const snap = readJson(P.snapshot, null);
  if (!snap) throw new Error(`Missing content snapshot at ${P.snapshot}`);
  return snap.posts
    .map((p) => ({ ...p, slug: p.slug || '' }))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a._id.localeCompare(b._id));
}

// --- one article -----------------------------------------------------------
async function processArticle(post, rulesText, rulesHash) {
  const segments = extractSegments(post);

  // Layer A — deterministic, no judgment.
  const aHits = scanPost(post);

  // Layer B — semantic pass runs INDEPENDENTLY (it never sees aHits), and the
  // lexicon adjudication runs separately so nothing is silently cleared.
  const [semantic, adjudicated] = await Promise.all([
    semanticPass({ rulesText, post, segments }),
    adjudicateLexicon({
      rulesText,
      post,
      hits: aHits.map((h) => ({ tier: h.tier, term: h.term, label: h.label, quote: h.quote, sentence: h.sentence })),
    }),
  ]);

  // Fold adjudications back onto the Layer A hits — every hit gets a
  // disposition; an unadjudicated hit becomes `not-audited`, never dropped.
  const byIndex = new Map((adjudicated.dispositions || []).map((d) => [d.hit_index, d]));
  const lexiconFindings = aHits.map((h, i) => {
    const d = byIndex.get(i);
    return {
      layer: 'A',
      term: h.term,
      tier: h.tier,
      segmentId: h.segmentId,
      quote: h.quote,
      // Carry the scanner's EXACT offsets. Without these, anchoring re-derives
      // by indexOf and every repeat of a term collapses onto its first
      // occurrence — un-highlighting the rest.
      start: h.start,
      end: h.end,
      sentence: h.sentence,
      disposition: d ? d.disposition : 'not-audited',
      reader_takeaway: d ? d.reader_takeaway : 'Not adjudicated by the model — review by hand.',
      suggested_rewrite: d ? d.suggested_rewrite : '',
      rewrite_scope: d ? d.rewrite_scope : 'none',
      deletion_scope: d ? d.suggested_deletion_scope : 'none',
      deletion_rationale: d ? d.deletion_rationale : '',
      confidence: d ? d.confidence : 'low',
    };
  });

  const semanticFindings = (semantic.findings || []).map((f) => ({
    layer: 'B',
    term: '',
    segmentId: f.segment_id,
    quote: f.quote,
    sentence: '',
    disposition: f.disposition,
    reader_takeaway: f.reader_takeaway,
    suggested_rewrite: f.suggested_rewrite,
    rewrite_scope: f.rewrite_scope || 'sentence',
    deletion_scope: f.suggested_deletion_scope || 'none',
    deletion_rationale: f.deletion_rationale || '',
    confidence: f.confidence,
  }));

  // --- Step 6 assertions ---------------------------------------------------
  // 1. Every quote must anchor verbatim against the same text the page renders.
  const all = [...lexiconFindings, ...semanticFindings];
  let { anchored, errors } = anchorFindings(all, segments);

  // 1b. Repair pass. An unanchorable quote is not silently dropped and is not
  // fuzzy-matched — the model is asked to re-quote verbatim from the true text.
  // Repairs and withdrawals are counted and reported, never hidden.
  const repairLog = { attempted: 0, repaired: 0, withdrawn: 0 };
  if (errors.length) {
    const segById = new Map(segments.map((s) => [s.id, s]));
    const fixable = errors.filter((e) => segById.has(e.finding.segmentId));
    repairLog.attempted = fixable.length;
    if (fixable.length) {
      const { repairs } = await repairQuotes({
        failures: fixable.map((e) => ({
          quote: e.finding.quote,
          segmentId: e.finding.segmentId,
          segmentText: segById.get(e.finding.segmentId).text,
        })),
      });
      const byIdx = new Map(repairs.map((r) => [r.failure_index, r]));
      const retry = [];
      fixable.forEach((e, i) => {
        const r = byIdx.get(i);
        if (!r || r.withdraw || !r.corrected_quote) { repairLog.withdrawn++; return; }
        retry.push({ ...e.finding, quote: r.corrected_quote });
      });
      const second = anchorFindings(retry, segments);
      repairLog.repaired = second.anchored.length;
      anchored = anchored.concat(second.anchored);
      // Anything still unanchorable after an explicit re-quote is a fabricated
      // finding — fail the article's build loudly.
      errors = second.errors.concat(errors.filter((e) => !segById.has(e.finding.segmentId)));
    }
  }
  if (errors.length) {
    const first = errors[0];
    throw new AnchorError(
      `${errors.length} finding(s) could not be anchored verbatim even after a re-quote pass. First: [${first.finding.segmentId}] "${String(first.finding.quote).slice(0, 120)}" — ${first.reason}`,
      errors,
    );
  }
  // 2. Lexicon reconciliation: scan count must equal rendered lexicon findings.
  reconcileLexicon(aHits.length, anchored.filter((f) => f.layer === 'A').length);

  // Document order, then number.
  const order = new Map(segments.map((s, i) => [s.id, i]));
  anchored.sort((a, b) => (order.get(a.segmentId) - order.get(b.segmentId)) || a.start - b.start);
  anchored.forEach((f, i) => {
    f.number = i + 1;
    // Content-addressed id: stable across re-runs so a sign-off stays attached
    // to the same finding. If the article copy changes, the id changes too —
    // a decision on old wording must not silently carry to new wording.
    f.findingId = createHash('sha256')
      .update([post._id, f.segmentId, f.start, f.end, f.quote, f.layer, f.term || ''].join('\u0000'))
      .digest('hex')
      .slice(0, 32);
  });

  const counts = {};
  for (const f of anchored) counts[f.disposition] = (counts[f.disposition] || 0) + 1;

  // --- anomaly self-check --------------------------------------------------
  // A silent failure looks exactly like a clean article. These flags surface
  // the shapes that warrant a human glance rather than averaging into a count.
  const words = segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  const bFindings = anchored.filter((f) => f.layer === 'B');
  const anomalies = [];
  if (bFindings.length === 0 && words > 800) {
    anomalies.push(`Layer B returned 0 findings on a ${words}-word article — verify it actually read the body.`);
  }
  if (anchored.length > 0 && anchored.every((f) => String(f.disposition).startsWith('cleared'))) {
    anomalies.push('Every finding was cleared — check the clearing decisions, that is where a real miss hides.');
  }
  if (aHits.length > 0 && anchored.filter((f) => f.layer === 'A' && f.disposition === 'not-audited').length > 0) {
    anomalies.push('Some lexicon hits came back un-adjudicated (not-audited).');
  }
  if (repairLog.withdrawn > 0) {
    anomalies.push(`${repairLog.withdrawn} finding(s) withdrawn during the re-quote pass — confirm they were genuinely mistaken.`);
  }

  return { segments, findings: anchored, counts, lexiconHitCount: aHits.length, words, repairLog, anomalies };
}

// --- render ----------------------------------------------------------------
function regenerate({ corpus, ledger, allFindings, rulesHash }) {
  const generatedAt = new Date().toISOString();
  writeFileSync(P.index, renderIndex({
    inventory: corpus.map((p) => ({ _id: p._id, slug: p.slug, title: p.title, publishedAt: p.publishedAt })),
    ledger, generatedAt, rulesHash, expected: corpus.length,
  }));

  const header = ['_id', 'slug', 'title', 'layer', 'term_or_pattern', 'disposition', 'verbatim_quote',
    'sentence_context', 'reader_takeaway', 'suggested_rewrite', 'rewrite_scope',
    'deletion_scope', 'deletion_rationale', 'confidence'];
  const lines = [header.join(',')];
  for (const [id, rec] of Object.entries(allFindings)) {
    for (const f of rec.findings) {
      lines.push([id, rec.slug, rec.title, f.layer, f.term || '', f.disposition, f.quote,
        f.sentence || '', f.reader_takeaway, f.suggested_rewrite || '', f.rewrite_scope || '',
        f.deletion_scope || '', f.deletion_rationale || '', f.confidence].map(csvField).join(','));
    }
  }
  writeFileSync(P.csv, lines.join('\n') + '\n');
}

// --- main ------------------------------------------------------------------
async function main() {
  // Re-read RULES.md from disk at the start of the run AND before every
  // article, so the standard cannot drift over 207 iterations.
  let rulesText = readFileSync(P.rules, 'utf8');
  let rulesHash = createHash('sha256').update(rulesText).digest('hex');

  const corpus = loadCorpus();
  const ledger = readJson(P.state, {});
  const allFindings = readJson(P.findings, {});

  console.log('== Consent & disclosure review ==');
  console.log(`RULES.md sha256: ${rulesHash}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Corpus: ${corpus.length} articles (expected ${EXPECTED})`);
  if (!flag('--render-only')) {
    try {
      const live = await liveCount();
      console.log(`Live in-scope count: ${live}${live !== corpus.length ? `  ⚠ DIFFERS from snapshot ${corpus.length}` : ''}`);
    } catch (e) { console.log(`Live count check failed (continuing): ${e.message}`); }
  }

  // Seed the ledger so every in-scope doc has an entry from the start.
  for (const p of corpus) {
    if (!ledger[p._id]) {
      ledger[p._id] = { slug: p.slug, title: p.title, status: 'queued', counts: {}, timestamp: null, rulesHash: null };
    }
  }
  writeFileSync(P.state, JSON.stringify(ledger, null, 2));

  if (flag('--render-only') || flag('--rerender')) {
    regenerate({ corpus, ledger, allFindings, rulesHash });
    console.log('Rendered index + CSV from ledger.');
    if (flag('--rerender')) {
      // Re-emit article pages from stored findings (no model calls), so pages
      // pick up renderer changes. Finding ids are recomputed deterministically.
      let n = 0;
      for (const [pid, rec] of Object.entries(allFindings)) {
        const post = corpus.find((p) => p._id === pid);
        if (!post) continue;
        const segments = extractSegments(post);
        const findings = rec.findings.map((f) => ({
          ...f,
          findingId: createHash('sha256')
            .update([pid, f.segmentId, f.start, f.end, f.quote, f.layer, f.term || ''].join('\u0000'))
            .digest('hex').slice(0, 32),
        }));
        const counts = {};
        for (const f of findings) counts[f.disposition] = (counts[f.disposition] || 0) + 1;
        const idx = corpus.findIndex((p) => p._id === pid);
        writeFileSync(join(__dirname, `${post.slug}.html`), renderArticlePage({
          post, segments, findings, counts,
          prev: idx > 0 ? corpus[idx - 1].slug : null,
          next: idx < corpus.length - 1 ? corpus[idx + 1].slug : null,
          generatedAt: new Date().toISOString(), rulesHash, buildError: null,
        }));
        n++;
      }
      console.log(`Re-rendered ${n} article page(s).`);
    }
    return;
  }

  // Select work.
  let queue = corpus;
  const slug = opt('--slug');
  if (slug) queue = corpus.filter((p) => p.slug === slug);
  if (!flag('--force')) queue = queue.filter((p) => ledger[p._id].status !== 'done');
  const limit = opt('--limit');
  if (limit) queue = queue.slice(0, Number(limit));
  // --next: process exactly one article. Never approaches a shell timeout by
  // construction, and every result is inspected before the next one starts.
  if (flag('--next')) queue = queue.slice(0, 1);

  const remaining = corpus.filter((p) => ledger[p._id].status !== 'done').length;
  console.log(`Queued: ${remaining} of ${corpus.length} remaining. Processing ${queue.length} now.\n`);

  for (const [i, post] of queue.entries()) {
    // Re-read the rules from disk for EVERY article — do not rely on context.
    rulesText = readFileSync(P.rules, 'utf8');
    rulesHash = createHash('sha256').update(rulesText).digest('hex');

    ledger[post._id] = { ...ledger[post._id], status: 'in-progress', timestamp: new Date().toISOString() };
    writeFileSync(P.state, JSON.stringify(ledger, null, 2));

    const label = `[${i + 1}/${queue.length}] ${post.slug}`;
    const t0 = Date.now();
    try {
      const { segments, findings, counts, lexiconHitCount, words, repairLog, anomalies } =
        await processArticle(post, rulesText, rulesHash);

      const idx = corpus.findIndex((p) => p._id === post._id);
      writeFileSync(join(__dirname, `${post.slug}.html`), renderArticlePage({
        post, segments, findings, counts,
        prev: idx > 0 ? corpus[idx - 1].slug : null,
        next: idx < corpus.length - 1 ? corpus[idx + 1].slug : null,
        generatedAt: new Date().toISOString(), rulesHash, buildError: null,
      }));

      allFindings[post._id] = { slug: post.slug, title: post.title, findings };
      ledger[post._id] = {
        slug: post.slug, title: post.title, status: 'done', counts,
        findingsTotal: findings.length, lexiconHits: lexiconHitCount, words,
        repairs: repairLog, anomalies,
        seconds: Math.round((Date.now() - t0) / 1000),
        timestamp: new Date().toISOString(), rulesHash, model: MODEL,
      };
      const summary = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(' ') || 'clean';
      console.log(`${label}  ✓ ${findings.length} findings  (${summary})  ${words}w  ${Math.round((Date.now() - t0) / 1000)}s`);
      if (repairLog.attempted) {
        console.log(`      re-quote pass: ${repairLog.attempted} attempted, ${repairLog.repaired} repaired, ${repairLog.withdrawn} withdrawn`);
      }
      for (const a of anomalies) console.log(`      ⚠ ${a}`);

      // Verbose per-article detail for one-at-a-time review.
      if (flag('--next') || flag('--verbose')) {
        const notable = findings.filter((f) => ['red', 'amber', 'about-competitor'].includes(f.disposition));
        console.log(`\n      ── ${notable.length} notable finding(s) ──`);
        for (const f of notable) {
          console.log(`      [${f.disposition}] L${f.layer}${f.term ? ` "${f.term}"` : ''} · ${f.label}`);
          console.log(`        “${f.quote.length > 150 ? f.quote.slice(0, 150) + '…' : f.quote}”`);
          console.log(`        → ${f.reader_takeaway}`);
        }
        const cleared = findings.length - notable.length;
        if (cleared) console.log(`      (+ ${cleared} cleared/listed, in the CSV and on the page)`);
        console.log('');
      }
    } catch (e) {
      // Fail loudly and mark `error` — never silently drop a highlight.
      ledger[post._id] = {
        ...ledger[post._id], status: 'error', error: e.message,
        timestamp: new Date().toISOString(), rulesHash, counts: {},
      };
      console.error(`${label}  ✗ ERROR: ${e.message}`);
      if (e instanceof AnchorError && e.detail) {
        console.error(`      (${Array.isArray(e.detail) ? e.detail.length : 1} anchoring failure(s))`);
      }
      // Still emit a page so the failure is inspectable in the browser.
      try {
        const segments = extractSegments(post);
        const idx = corpus.findIndex((p) => p._id === post._id);
        writeFileSync(join(__dirname, `${post.slug}.html`), renderArticlePage({
          post, segments, findings: [], counts: {},
          prev: idx > 0 ? corpus[idx - 1].slug : null,
          next: idx < corpus.length - 1 ? corpus[idx + 1].slug : null,
          generatedAt: new Date().toISOString(), rulesHash, buildError: e.message,
        }));
      } catch { /* page emission is best-effort */ }
    }

    // Persist + regenerate after EVERY article so progress is watchable.
    writeFileSync(P.state, JSON.stringify(ledger, null, 2));
    writeFileSync(P.findings, JSON.stringify(allFindings, null, 2));
    regenerate({ corpus, ledger, allFindings, rulesHash });
  }

  // --- reconciliation report ----------------------------------------------
  const done = corpus.filter((p) => ledger[p._id].status === 'done').length;
  const errored = corpus.filter((p) => ledger[p._id].status === 'error').length;
  const unchecked = corpus.length - done - errored;
  console.log('\n--- Reconciliation ---');
  console.log(`In scope:   ${corpus.length}`);
  console.log(`Done:       ${done}`);
  console.log(`Error:      ${errored}`);
  console.log(`Unchecked:  ${unchecked}`);
  const totalFindings = Object.values(allFindings).reduce((n, r) => n + r.findings.length, 0);
  console.log(`Findings:   ${totalFindings} across ${Object.keys(allFindings).length} articles`);
}

main().catch((e) => { console.error(e); process.exit(1); });
