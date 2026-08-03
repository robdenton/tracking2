#!/usr/bin/env node
// Step 2 — canary test. Ten synthetic sentences, blatant → subtle, pushed
// through the SAME pipeline real articles use (Layer A scan + Layer B semantic
// pass), before any real content is touched.
//
// The point is a measured recall number, not an assurance. Sentences 8-10 in
// particular contain NO lexicon term — if those slip through, Layer B is not
// sensitive enough and must be tuned before processing the corpus.
//
// Usage: node review/canary.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { scanPost } from './lib/layer-a.mjs';
import { semanticPass } from './lib/layer-b.mjs';
import { extractSegments } from './lib/extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load env (ANTHROPIC_API_KEY) from .env — never committed.
for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

// The canary set. Every one of these MUST be caught: each either states or
// implies that participants won't know recording/notetaking is happening.
// `lexicon` marks whether any Layer A term is present — the no-term cases are
// the real test of Layer B.
const CANARIES = [
  { id: 1,  lexicon: true,  text: 'Granola records secretly so nobody knows what you are capturing in the meeting.' },
  { id: 2,  lexicon: true,  text: 'It runs in stealth mode, completely undetectable to the other participants on the call.' },
  { id: 3,  lexicon: true,  text: 'Granola stays invisible to everyone else in the meeting while it takes your notes.' },
  { id: 4,  lexicon: true,  text: 'Because no bot joins the call, no one can tell that the meeting is being transcribed.' },
  { id: 5,  lexicon: true,  text: 'It works silently in the background, so your client never notices anything is running.' },
  { id: 6,  lexicon: true,  text: 'Unlike Otter, which announces itself to the room, Granola keeps your note-taking discreet.' },
  { id: 7,  lexicon: true,  text: 'Your conversations are never recorded, so there is nothing you need to declare to anyone.' },
  // --- no lexicon term at all from here: pure Layer B territory ---
  { id: 8,  lexicon: false, text: "There's no awkward moment where you have to explain what the app is doing." },
  { id: 9,  lexicon: false, text: 'Skip the whole song and dance at the top of the call — just let it capture everything and get straight to business.' },
  { id: 10, lexicon: false, text: 'Other participants see nothing different about the call; the meeting simply proceeds as normal while notes are captured.' },
];

async function main() {
  // Re-read the rules from disk, exactly as the real run does.
  const rulesPath = join(__dirname, 'RULES.md');
  const rulesText = readFileSync(rulesPath, 'utf8');
  const rulesHash = createHash('sha256').update(rulesText).digest('hex');
  console.log('== Canary test ==');
  console.log(`RULES.md sha256: ${rulesHash}`);
  console.log(`Model: claude-opus-5\n`);

  // Build a synthetic "post" whose body is the 10 sentences, one paragraph each.
  const post = {
    _id: 'canary',
    title: 'Canary test article',
    slug: 'canary-test',
    summary: 'Synthetic sentences for pipeline recall measurement.',
    body: CANARIES.map((c) => ({
      _type: 'block', style: 'normal', markDefs: [],
      children: [{ _type: 'span', text: c.text }],
    })),
  };

  const segments = extractSegments(post);
  // Map each canary sentence to the segment that carries it.
  const segOf = new Map();
  for (const c of CANARIES) {
    const seg = segments.find((s) => s.text === c.text);
    if (seg) segOf.set(c.id, seg.id);
  }

  // --- Layer A ---
  const aHits = scanPost(post);
  const aBySeg = new Map();
  for (const h of aHits) {
    if (!aBySeg.has(h.segmentId)) aBySeg.set(h.segmentId, []);
    aBySeg.get(h.segmentId).push(h);
  }

  // --- Layer B (independent) ---
  const { findings } = await semanticPass({ rulesText, post, segments });
  const bBySeg = new Map();
  for (const f of findings) {
    if (!bBySeg.has(f.segment_id)) bBySeg.set(f.segment_id, []);
    bBySeg.get(f.segment_id).push(f);
  }

  // --- Score ---
  let caughtA = 0, caughtB = 0, caughtEither = 0;
  const rows = [];
  for (const c of CANARIES) {
    const sid = segOf.get(c.id);
    const a = (aBySeg.get(sid) || []).length > 0;
    // A Layer B finding only counts if it is NOT a clearing disposition.
    const bFindings = bBySeg.get(sid) || [];
    const b = bFindings.some((f) => !String(f.disposition).startsWith('cleared'));
    if (a) caughtA++;
    if (b) caughtB++;
    if (a || b) caughtEither++;
    rows.push({ ...c, segmentId: sid, layerA: a, layerB: b, caught: a || b,
      dispositions: bFindings.map((f) => f.disposition).join(', ') || '-' });
  }

  console.log('id  lexicon  LayerA  LayerB  CAUGHT  disposition(s)');
  for (const r of rows) {
    console.log(
      `${String(r.id).padStart(2)}  ${r.lexicon ? 'yes    ' : 'NO     '}  ` +
      `${r.layerA ? '  ✓   ' : '  ·   '}  ${r.layerB ? '  ✓   ' : '  ·   '}  ` +
      `${r.caught ? ' PASS ' : ' MISS '}  ${r.dispositions}`,
    );
  }

  const noTerm = rows.filter((r) => !r.lexicon);
  console.log(`\nRecall (either layer):        ${caughtEither}/${CANARIES.length} = ${(100 * caughtEither / CANARIES.length).toFixed(0)}%`);
  console.log(`Layer A alone:                ${caughtA}/${CANARIES.length}`);
  console.log(`Layer B alone:                ${caughtB}/${CANARIES.length}`);
  console.log(`No-lexicon-term subset:       ${noTerm.filter((r) => r.caught).length}/${noTerm.length}  <- the sensitivity test`);

  const misses = rows.filter((r) => !r.caught);
  if (misses.length) {
    console.log('\nMISSES (pipeline is not sensitive enough — tune before the real run):');
    for (const m of misses) console.log(`  #${m.id}: ${m.text}`);
  } else {
    console.log('\nNo misses. Pipeline is sensitive enough to proceed.');
  }

  writeFileSync(join(__dirname, 'data', 'canary-results.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), rulesHash, model: 'claude-opus-5',
      recall: caughtEither / CANARIES.length, rows, rawFindings: findings }, null, 2));
  console.log(`\nWrote ${join(__dirname, 'data', 'canary-results.json')}`);
  process.exitCode = misses.length ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
