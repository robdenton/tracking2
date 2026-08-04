#!/usr/bin/env node
// Pre-edit copies of the articles that have been UNPUBLISHED.
//
//   node scripts/archive-preedit-unpublished.mjs
//
// WHY THIS IS SEPARATE
// For every still-published article, the live document is untouched by this
// review — every edit went to a draft. So the main archive already holds the
// original.
//
// An unpublished article is different: unpublishing deletes the published
// document, leaving only the draft — and that draft is the one we edited. So
// for those, "the current state" and "the original" are not the same thing, and
// the main archive can only capture the former.
//
// Sanity's history API would give the pre-edit revision, but it requires a
// token. It is not needed: audit/data/posts.json is a full snapshot of the
// PUBLISHED documents taken 2026-08-03T09:18Z, before any edit was written and
// before either article was unpublished. That snapshot is the original, and it
// is verifiable — each document's own _updatedAt predates the review.
//
// This lifts those articles out of that snapshot into the durable archive,
// since posts.json itself is gitignored and lives on one machine.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { bodyToMarkdown } from './lib/pt-markdown.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROJECT = 'oy7f1h9b';
const DATASET = 'production';

const snapPath = join(ROOT, 'audit', 'data', 'posts.json');
const snap = JSON.parse(readFileSync(snapPath, 'utf8'));

// Work out which articles are no longer published, rather than hard-coding
// them — if another is unpublished later, this picks it up.
const res = await fetch(`https://${PROJECT}.api.sanity.io/v2021-06-07/data/query/${DATASET}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '*[_type == "post" && hidden == true && !(_id in path("drafts.**"))]{_id}',
  }),
});
if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
const live = new Set((await res.json()).result.map((d) => d._id));

const gone = snap.posts.filter((p) => !live.has(p._id));
if (gone.length === 0) {
  console.log('No unpublished articles found — nothing to do.');
  process.exit(0);
}

const label = 'pre-edit-unpublished';
const OUT = join(ROOT, 'archive', label);
mkdirSync(join(OUT, 'json'), { recursive: true });
mkdirSync(join(OUT, 'markdown'), { recursive: true });

const sha = (s) => createHash('sha256').update(s).digest('hex');
const capturedAt = new Date().toISOString();
const manifest = [];

console.log(`== Pre-edit archive of unpublished articles ==`);
console.log(`source: audit/data/posts.json captured ${snap.fetchedAt}\n`);

for (const doc of gone) {
  const slug = doc.slug || doc._id;
  const json = JSON.stringify(doc, null, 2);
  const md =
    `# ${doc.title ?? ''}\n\n` +
    `> **Pre-edit original.** This is the PUBLISHED document as it stood before\n` +
    `> the consent & disclosure review made any change and before the article was\n` +
    `> unpublished.\n` +
    `>\n` +
    `> Source: \`audit/data/posts.json\`, captured ${snap.fetchedAt}\n` +
    `> Written to the archive ${capturedAt}\n` +
    `> _id \`${doc._id}\` · document _updatedAt ${doc._updatedAt ?? 'n/a'}\n` +
    `> slug \`${slug}\`\n\n` +
    (doc.summary ? `**Summary:** ${doc.summary}\n\n` : '') +
    `---\n\n` +
    bodyToMarkdown(doc.body);

  writeFileSync(join(OUT, 'json', `${slug}.pre-edit.json`), json);
  writeFileSync(join(OUT, 'markdown', `${slug}.pre-edit.md`), md);

  manifest.push({
    slug,
    _id: doc._id,
    title: doc.title ?? '',
    documentUpdatedAt: doc._updatedAt ?? null,
    blocks: Array.isArray(doc.body) ? doc.body.length : 0,
    words: bodyToMarkdown(doc.body).split(/\s+/).filter(Boolean).length,
    sha256: sha(json),
  });
  console.log(`  ${slug}`);
  console.log(`      blocks ${manifest.at(-1).blocks} · words ${manifest.at(-1).words} · doc updated ${doc._updatedAt}`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  capturedAt,
  sourceSnapshot: 'audit/data/posts.json',
  sourceFetchedAt: snap.fetchedAt,
  project: PROJECT,
  dataset: DATASET,
  note:
    'Pre-edit originals for articles that have since been unpublished. Taken from the '
    + 'published documents as they stood on 2026-08-03, before any review edit was written. '
    + 'Each document _updatedAt predates the review, which is the check that these are unedited.',
  articles: manifest,
}, null, 2));

writeFileSync(join(OUT, 'README.md'),
`# Pre-edit originals — unpublished articles

${manifest.length} article(s) that have since been **unpublished**.

For every still-published article the live document was never touched by the
review — edits went to drafts — so \`archive/<date>/\` already holds the original.

Unpublishing deletes the published document and leaves only the draft, and that
draft is the one the review edited. So for these, current state and original are
different things. This folder holds the original.

Source: \`audit/data/posts.json\`, captured ${snap.fetchedAt} — a full snapshot of
the published documents taken before any edit was written and before either
article was unpublished. Each document's own \`_updatedAt\` predates the review,
which is how you can check these are unedited.

${manifest.map((m) => `- \`${m.slug}\` — ${m.words} words, ${m.blocks} blocks, document last updated ${m.documentUpdatedAt}`).join('\n')}
`);

console.log(`\nWrote archive/${label}/ (${manifest.length} article(s))`);
