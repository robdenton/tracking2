#!/usr/bin/env node
// SEO audit — single entrypoint. Deterministic by construction:
//   Phase 0  fetch snapshot + write inventory.csv (the contract)
//   Phase 1  structural checks (pure) + link liveness (HTTP, cached)
//            write results.json + report.html
//
// Flags:
//   --skip-links     skip HTTP liveness; structural checks only
//   --reuse-snapshot reuse audit/data/posts.json instead of refetching
//   --fresh-links    ignore the link-status cache and re-check every URL
//
// Usage:  node audit/run.mjs [flags]
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EXPECTED_COUNT } from './config.mjs';
import { fetchInScopePosts, countInScope, fetchAllBlogSlugs } from './lib/sanity.mjs';
import { extractLinks, wordCount } from './lib/portable-text.mjs';
import { postUrl } from './config.mjs';
import { classifyLink, checkUrls } from './lib/link.mjs';
import { toCsv } from './lib/util.mjs';
import { runAllChecks } from './checks.mjs';
import { renderReport } from './report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, 'data');
const paths = {
  snapshot: join(DATA, 'posts.json'),
  inventory: join(__dirname, 'inventory.csv'),
  linkStatus: join(DATA, 'link-status.json'),
  results: join(DATA, 'results.json'),
  report: join(__dirname, 'report.html'),
};

const flags = new Set(process.argv.slice(2));
const now = new Date(); // one clock read per run → one consistent "today"

function readJson(p, fallback) {
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;
}

async function main() {
  console.log('== Granola SEO audit ==');

  // --- Phase 0: snapshot + inventory ---------------------------------
  let posts, allBlogSlugs;
  if (flags.has('--reuse-snapshot') && existsSync(paths.snapshot)) {
    const snap = readJson(paths.snapshot);
    posts = snap.posts;
    allBlogSlugs = snap.allBlogSlugs || posts.map((p) => p.slug).filter(Boolean);
    console.log(`Phase 0: reusing snapshot (${posts.length} posts)`);
  } else {
    const liveCount = await countInScope();
    console.log(`Phase 0: live in-scope count = ${liveCount} (expected ${EXPECTED_COUNT})`);
    if (liveCount !== EXPECTED_COUNT) {
      console.log(`  ⚠ count differs from expectation by ${liveCount - EXPECTED_COUNT}`);
    }
    posts = await fetchInScopePosts();
    allBlogSlugs = await fetchAllBlogSlugs();
    if (posts.length !== liveCount) {
      throw new Error(`Fetched ${posts.length} but count() said ${liveCount} — aborting.`);
    }
    writeFileSync(paths.snapshot, JSON.stringify(
      { fetchedAt: now.toISOString(), count: posts.length, allBlogSlugs, posts }, null, 2));
    console.log(`  wrote ${paths.snapshot} (all published blog slugs: ${allBlogSlugs.length})`);
  }

  // inventory.csv is the contract every later phase is diffed against.
  const invRows = posts.map((p) => ({
    _id: p._id,
    'slug.current': p.slug || '',
    title: p.title || '',
    publishedAt: p.publishedAt || '',
    _updatedAt: p._updatedAt || '',
  }));
  writeFileSync(paths.inventory, toCsv(['_id', 'slug.current', 'title', 'publishedAt', '_updatedAt'], invRows));
  console.log(`  wrote ${paths.inventory} (${invRows.length} rows)`);
  if (invRows.length !== EXPECTED_COUNT) {
    console.log(`  ⚠ inventory row count ${invRows.length} != expected ${EXPECTED_COUNT}`);
  }

  // --- Phase 1: link liveness ----------------------------------------
  let linkStatus = {};
  if (!flags.has('--skip-links')) {
    const urls = new Set();
    for (const p of posts) {
      for (const { href } of extractLinks(p.body)) {
        const c = classifyLink(href);
        if ((c.kind === 'external' || c.kind === 'internal') && c.url) urls.add(c.url);
      }
    }
    const urlList = [...urls].sort();
    const cache = flags.has('--fresh-links') ? {} : readJson(paths.linkStatus, {});
    console.log(`Phase 1: checking ${urlList.length} unique links (${Object.keys(cache).length} cached)...`);
    linkStatus = await checkUrls(urlList, cache, (d, t) => process.stdout.write(`\r  ${d}/${t} checked`));
    process.stdout.write('\n');
    writeFileSync(paths.linkStatus, JSON.stringify(linkStatus, null, 2));
    console.log(`  wrote ${paths.linkStatus}`);
  } else {
    linkStatus = readJson(paths.linkStatus, {});
    console.log(`Phase 1: --skip-links (using ${Object.keys(linkStatus).length} cached statuses)`);
  }

  // --- Phase 1: structural checks ------------------------------------
  const checks = runAllChecks(posts, linkStatus, now, new Set(allBlogSlugs));
  const linksChecked = Object.keys(linkStatus).length;

  // Master index: EVERY in-scope article, one row each, with the checks it
  // triggers. This is the primary view — a browsable list of all articles.
  // 'missing_author' is universal (no author field exists in the model), so it
  // would tag every row and drown the signal — keep it as a check section but
  // leave it out of the per-article flag chips.
  const FLAG_EXCLUDE = new Set(['missing_author']);
  const issuesByPost = new Map();
  for (const c of checks) {
    if (FLAG_EXCLUDE.has(c.id)) continue;
    for (const r of c.rows) {
      if (!issuesByPost.has(r.postId)) issuesByPost.set(r.postId, new Set());
      issuesByPost.get(r.postId).add(c.title);
    }
  }
  const articles = posts
    .map((p) => ({
      postId: p._id,
      title: p.title || '(untitled)',
      slug: p.slug || '',
      url: p.slug ? postUrl(p.slug) : null,
      publishedAt: p.publishedAt || '',
      updatedAt: p._updatedAt || '',
      summary: p.summary || '',
      words: wordCount(p.body),
      issues: [...(issuesByPost.get(p._id) || [])],
    }))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const results = {
    generatedAt: now.toISOString(),
    project: 'oy7f1h9b/production',
    inScope: posts.length,
    expected: EXPECTED_COUNT,
    linksChecked,
    linksSkipped: flags.has('--skip-links'),
    articles,
    checks,
  };
  writeFileSync(paths.results, JSON.stringify(results, null, 2));
  console.log(`  wrote ${paths.results}`);

  // --- report --------------------------------------------------------
  writeFileSync(paths.report, renderReport(results));
  console.log(`  wrote ${paths.report}`);

  console.log('\nSummary:');
  for (const c of checks) console.log(`  ${String(c.count).padStart(4)}  ${c.title}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
