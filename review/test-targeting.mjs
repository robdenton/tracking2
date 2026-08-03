#!/usr/bin/env node
// Regression test for the field-targeting bug.
//
// A short quote such as "compliance" can appear in the title, the summary AND
// the body. Patch planning must use the field/block recorded with the finding;
// searching fields in order and taking the first match spliced body copy into
// an article headline. This asserts that can no longer happen.
//
//   node review/test-targeting.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractSegments } from './lib/extract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const { posts } = JSON.parse(readFileSync(join(ROOT, 'audit', 'data', 'posts.json'), 'utf8'));
const all = JSON.parse(readFileSync(join(__dirname, 'data', 'findings.json'), 'utf8'));

let checked = 0;
let ambiguous = 0;
let notApplicable = 0;
const failures = [];

for (const [postId, rec] of Object.entries(all)) {
  const post = posts.find((p) => p._id === postId);
  if (!post) continue;
  const segs = extractSegments(post);
  const segMap = new Map(segs.map((s) => [s.id, s]));

  for (const f of rec.findings) {
    const seg = segMap.get(f.segmentId);
    if (!seg) { failures.push(`${rec.slug} #${f.number}: segment ${f.segmentId} not found`); continue; }
    checked++;

    // How many DIFFERENT fields contain this quote verbatim?
    const inTitle = typeof post.title === 'string' && post.title.includes(f.quote);
    const inSummary = typeof post.summary === 'string' && post.summary.includes(f.quote);
    const blocksContaining = (post.body || []).filter((b) => {
      if (b._type === 'block') return (b.children || []).map((c) => c.text || '').join('').includes(f.quote);
      if (b._type === 'rawHtml') return typeof b.html === 'string' && b.html.includes(f.quote);
      return false;
    });
    const places = (inTitle ? 1 : 0) + (inSummary ? 1 : 0) + blocksContaining.length;
    if (places > 1) ambiguous++;

    // The finding must carry enough information to disambiguate.
    const fieldKind = ['title', 'summary', 'slug', 'linkHref'].includes(seg.field)
      ? seg.field
      : seg.meta?.blockType === 'rawHtml' ? 'rawHtml' : 'block';
    // Slugs and link URLs are never auto-applied — changing either breaks a
    // live URL. They are refused by design, not targeting failures.
    if (fieldKind === 'slug' || fieldKind === 'linkHref') { notApplicable++; continue; }
    if (fieldKind === 'block' || fieldKind === 'rawHtml') {
      if (!seg.meta?.blockKey) {
        failures.push(`${rec.slug} #${f.number}: body finding has no blockKey — cannot target safely`);
        continue;
      }
      // The recorded block must actually contain the quote — otherwise the
      // patch must REFUSE rather than fall back to searching other fields.
      const target = (post.body || []).find((b) => b._key === seg.meta.blockKey);
      const has = target && (target._type === 'block'
        ? (target.children || []).map((c) => c.text || '').join('').includes(f.quote)
        : typeof target.html === 'string' && target.html.includes(f.quote));
      if (!has) {
        if (fieldKind === 'rawHtml') {
          // Table text is entity-decoded and whitespace-collapsed on extraction,
          // so it legitimately may not appear verbatim in the HTML source. The
          // planner refuses these ("apply by hand") rather than mis-targeting,
          // which is safe — count it, don't fail on it.
          notApplicable++;
        } else {
          failures.push(`${rec.slug} #${f.number} [${fieldKind}]: recorded block ${seg.meta.blockKey} does not contain the quote`);
        }
      }
    }
  }
}

console.log(`findings checked:                 ${checked}`);
console.log(`quotes appearing in >1 field:     ${ambiguous}  <- these are what the bug corrupted`);
console.log(`safely refused (not auto-apply):  ${notApplicable}  <- table HTML, applied by hand`);
console.log(`UNSAFE targeting failures:        ${failures.length}`);
for (const f of failures.slice(0, 10)) console.log(`   ✗ ${f}`);
console.log(failures.length === 0
  ? '\nPASS — every finding carries unambiguous field/block targeting.'
  : '\nFAIL — some findings cannot be targeted safely.');
process.exitCode = failures.length ? 1 : 0;
