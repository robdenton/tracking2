#!/usr/bin/env node
// Point-in-time archive of every in-scope SEO article.
//
//   node scripts/archive-sanity.mjs                 archive to archive/<today>/
//   node scripts/archive-sanity.mjs --label pre-edit
//
// WHY THIS EXISTS
// Sanity's history retention is 90 days. After that, the only record of what an
// article said is whatever we kept ourselves. This writes that record into the
// git repository, which is versioned, durable past 90 days, and mirrored to
// GitHub — three properties the working snapshot in audit/data/ has none of,
// because it is gitignored and lives on one laptop.
//
// WHAT IT CAPTURES
// Both the published document AND the draft, for every article. Those diverge:
// an unpublished article exists only as a draft, and any article we have edited
// has a draft ahead of its published version. Archiving one and not the other
// would lose whichever is the real current state.
//
// Each article is written three ways, because they answer different questions:
//   json/      the exact document, including _rev — restore fidelity
//   markdown/  readable prose — useful in ten years without Sanity
//   manifest   ids, revisions, timestamps, checksums — proves what was captured
//
// Read-only against Sanity. Nothing here writes, patches or publishes.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROJECT = 'oy7f1h9b';
const DATASET = 'production';
const API = `https://${PROJECT}.api.sanity.io/v2021-06-07`;

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

// --- env -------------------------------------------------------------------
for (const f of ['.env.prod', '.env']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const token = process.env.SANITY_WRITE_TOKEN?.trim();
const tokenUsable = Boolean(token) && !/\s/.test(token);
const publishedOnly = argv.includes('--published-only');

if (!tokenUsable && !publishedOnly) {
  console.error(
    'SANITY_WRITE_TOKEN is missing or malformed.\n' +
    'Drafts are not readable anonymously, so without it the archive would silently\n' +
    'omit every unpublished article and every pending edit. Refusing to write a\n' +
    'partial archive that looks complete.\n\n' +
    'Either add the token to .env.prod (untracked and gitignored — do NOT put it in\n' +
    '.env, which is committed), or re-run with --published-only to capture the 205\n' +
    'published documents now. That archive is explicitly marked incomplete.',
  );
  process.exit(1);
}

// Published-only mode still has to EXCLUDE drafts from the filter, or the query
// silently returns nothing for them and the archive under-reports without
// saying so.
const COMPLETE = tokenUsable && !publishedOnly;

async function query(groq) {
  const headers = { 'Content-Type': 'application/json' };
  if (COMPLETE) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/data/query/${DATASET}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: groq }),
  });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

import { bodyToMarkdown } from './lib/pt-markdown.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');

// --- main ------------------------------------------------------------------
const capturedAt = new Date().toISOString();
const label = opt('--label') || capturedAt.slice(0, 10);
const OUT = join(ROOT, 'archive', label);

const IN_SCOPE = COMPLETE
  ? '_type == "post" && hidden == true'
  : '_type == "post" && hidden == true && !(_id in path("drafts.**"))';

console.log(`== Sanity archive ==\nproject ${PROJECT}/${DATASET}\ncaptured ${capturedAt}\ninto archive/${label}/\n`);

// Every in-scope document, published and draft alike. Draft ids are normalised
// so the two halves of one article group together.
const docs = await query(`*[${IN_SCOPE}]{...}`);
console.log(`Fetched ${docs.length} document(s) (published + drafts).`);

const articles = new Map(); // baseId -> { published, draft }
for (const d of docs) {
  const isDraft = d._id.startsWith('drafts.');
  const baseId = isDraft ? d._id.slice('drafts.'.length) : d._id;
  const rec = articles.get(baseId) ?? { baseId, published: null, draft: null };
  if (isDraft) rec.draft = d; else rec.published = d;
  articles.set(baseId, rec);
}

mkdirSync(join(OUT, 'json'), { recursive: true });
mkdirSync(join(OUT, 'markdown'), { recursive: true });

const manifest = [];
let nPub = 0, nDraft = 0, nDraftOnly = 0;

for (const rec of articles.values()) {
  const primary = rec.published ?? rec.draft;
  const slug = primary?.slug?.current || primary?._id || 'unknown';
  const entry = {
    slug,
    id: rec.baseId,
    title: primary?.title ?? '',
    publishedAt: primary?.publishedAt ?? null,
    live: Boolean(rec.published),
    hasDraft: Boolean(rec.draft),
    // An article with no published document is one that has been unpublished —
    // it is live nowhere, and the draft is the only copy that exists.
    draftOnly: Boolean(rec.draft && !rec.published),
    published: null,
    draft: null,
  };

  for (const which of ['published', 'draft']) {
    const doc = rec[which];
    if (!doc) continue;
    const json = JSON.stringify(doc, null, 2);
    const md =
      `# ${doc.title ?? ''}\n\n` +
      `> Archived ${capturedAt} from Sanity ${PROJECT}/${DATASET}\n` +
      `> _id \`${doc._id}\` · _rev \`${doc._rev ?? 'n/a'}\` · updated ${doc._updatedAt ?? 'n/a'}\n` +
      `> slug \`${doc.slug?.current ?? ''}\` · ${which}\n\n` +
      (doc.summary ? `**Summary:** ${doc.summary}\n\n` : '') +
      `---\n\n` +
      bodyToMarkdown(doc.body);

    writeFileSync(join(OUT, 'json', `${slug}.${which}.json`), json);
    writeFileSync(join(OUT, 'markdown', `${slug}.${which}.md`), md);

    entry[which] = {
      _id: doc._id,
      _rev: doc._rev ?? null,
      _updatedAt: doc._updatedAt ?? null,
      blocks: Array.isArray(doc.body) ? doc.body.length : 0,
      words: bodyToMarkdown(doc.body).split(/\s+/).filter(Boolean).length,
      sha256: sha(json),
    };
    if (which === 'published') nPub++; else nDraft++;
  }
  if (entry.draftOnly) nDraftOnly++;
  manifest.push(entry);
}

manifest.sort((a, b) => a.slug.localeCompare(b.slug));

writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify({ capturedAt, project: PROJECT, dataset: DATASET, filter: IN_SCOPE,
                   complete: COMPLETE,
                   incompleteReason: COMPLETE ? null
                     : 'Captured without a Sanity token. Drafts are not readable anonymously, '
                     + 'so this archive contains PUBLISHED documents only. Unpublished articles '
                     + '(which exist only as a draft) and any pending draft edits are NOT here.',
                   articles: manifest.length, publishedDocs: nPub, draftDocs: nDraft,
                   draftOnly: nDraftOnly, articleList: manifest }, null, 2),
);

writeFileSync(join(OUT, 'README.md'),
`# Content archive — ${label}

Point-in-time copy of every in-scope SEO article in Sanity, taken ${capturedAt}.

${COMPLETE ? '**Complete** — published documents and drafts.' :
`## ⚠ INCOMPLETE — published documents only

Captured without a Sanity token. Drafts are not readable anonymously, so this
archive does **not** contain unpublished articles (which exist only as a draft)
or any pending draft edits. Re-run with the token to capture those:

    node scripts/archive-sanity.mjs --label ${label}`}

Sanity retains document history for **90 days**. This archive is the record that
outlives that window, which is why it lives in git rather than in \`audit/data/\`
(gitignored, single machine, published-only).

- \`json/<slug>.published.json\` — exact published document, including \`_rev\`
- \`json/<slug>.draft.json\` — exact draft, where one exists
- \`markdown/<slug>.*.md\` — readable prose, so the archive is usable without Sanity
- \`manifest.json\` — ids, revisions, timestamps, word counts and SHA-256 per document

**${manifest.length} articles** · ${nPub} published documents · ${nDraft} drafts ·
**${nDraftOnly} exist only as a draft** (unpublished — the draft is the only copy).

Filter: \`*[${IN_SCOPE}]\`

## Restoring

\`json/*.published.json\` is the document as Sanity returned it. To restore, strip
\`_rev\` and \`createOrReplace\` it. Check \`manifest.json\` first — the \`_rev\` recorded
there tells you whether the live document has changed since this capture.
`);

console.log(`\nArticles:        ${manifest.length}`);
console.log(`Published docs:  ${nPub}`);
console.log(`Draft docs:      ${nDraft}`);
console.log(`Draft-only:      ${nDraftOnly}  (unpublished — draft is the only copy)`);
console.log(`\nWrote archive/${label}/`);
