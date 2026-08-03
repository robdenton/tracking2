// The mechanical checks. Every function here is deterministic given its
// inputs: the post snapshot, the (optional) link-status map, and a single
// injected `now`. No function reads the clock or the network itself.
//
// Each check returns:
//   { id, title, description, deterministic, rows, count }
// where `rows` is one object per flagged post/finding, always carrying
// { postId, title, summary, url } plus check-specific detail columns.

import { THRESHOLDS, PLAN_TOKENS, postUrl } from './config.mjs';
import { extractLinks, wordCount, plainText } from './lib/portable-text.mjs';
import { classifyLink } from './lib/link.mjs';
import { normalizeText, similarity, percentile } from './lib/util.mjs';

const base = (p) => ({
  postId: p._id,
  title: p.title || '(untitled)',
  summary: p.summary || '',
  url: p.slug ? postUrl(p.slug) : null,
});

// 1. Broken or redirecting outbound links -------------------------------
// Severity-classified so the handful of genuinely dead links don't drown in
// benign http→https redirects or bot-protection 403s.
//   broken       4xx (not 403) / 5xx / network error / timeout  → dead
//   redirect→home a redirect that lands on the site root         → likely soft-404
//   redirect      a redirect that materially changes host/path   → target moved
//   blocked-403   403 — often bot protection, not truly broken   → verify manually
//   redirect-triv only scheme/www/trailing-slash changed         → cosmetic
const SEVERITY = { broken: 0, timeout: 0, error: 0, 'redirect-home': 1, redirect: 2, 'blocked-403': 3, 'redirect-trivial': 4 };

function normForRedirect(u) {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\./, '');
    const path = x.pathname.replace(/\/$/, '');
    return `${host}${path}`;
  } catch { return u; }
}

function classifyStatus(origUrl, st) {
  if (st.error) return st.error === 'timeout' ? 'timeout' : 'error';
  if (st.status === 403) return 'blocked-403';
  if (st.status >= 400) return 'broken';
  // 2xx/3xx success — look for redirect.
  const moved = st.redirected || (st.finalUrl && st.finalUrl !== origUrl);
  if (!moved) return 'ok';
  if (normForRedirect(origUrl) === normForRedirect(st.finalUrl)) return 'redirect-trivial';
  try {
    const finalPath = new URL(st.finalUrl).pathname.replace(/\/$/, '');
    const origPath = new URL(origUrl).pathname.replace(/\/$/, '');
    if (finalPath === '' && origPath !== '') return 'redirect-home'; // deep link → homepage
  } catch { /* ignore */ }
  return 'redirect';
}

// Issues that are genuine, actionable findings (counted). blocked-403 and
// redirect-trivial are NOT counted: a 403 means "couldn't verify" (bot
// protection), not "broken", and is the least repeatable signal run-to-run;
// trivial redirects are cosmetic. Both are still reported transparently in the
// description so nothing is hidden.
const ACTIONABLE = new Set(['broken', 'timeout', 'error', 'redirect-home', 'redirect']);

export function checkBrokenOutbound(posts, linkStatus) {
  const rows = [];
  const tally = {};
  for (const p of posts) {
    for (const { href } of dedupeLinks(extractLinks(p.body))) {
      const c = classifyLink(href);
      if (c.kind !== 'external') continue;
      const st = linkStatus[c.url];
      if (!st) continue; // not checked (only when --skip-links)
      const issue = classifyStatus(c.url, st);
      if (issue === 'ok') continue;
      tally[issue] = (tally[issue] || 0) + 1;
      if (!ACTIONABLE.has(issue)) continue; // counted-out, summarized below
      rows.push({
        ...base(p),
        link: href,
        status: st.error ? `ERR:${st.error}` : String(st.status),
        finalUrl: st.finalUrl && st.finalUrl !== c.url ? st.finalUrl : '',
        issue,
      });
    }
  }
  rows.sort((a, b) => (SEVERITY[a.issue] ?? 9) - (SEVERITY[b.issue] ?? 9) || a.link.localeCompare(b.link));
  const n = (k) => tally[k] || 0;
  return check('broken_outbound_links', 'Broken or redirecting outbound links',
    `Actionable external-link problems (link-instances across posts): ` +
    `${n('broken')} broken (4xx/5xx), ${n('timeout') + n('error')} unreachable, ` +
    `${n('redirect-home')} soft-404 (deep link → homepage), ${n('redirect')} moved (material redirect). ` +
    `NOT counted, reported for transparency: ${n('blocked-403')} link-instances to bot-protected hosts ` +
    `returned 403 (unverifiable, not broken — e.g. g2.com/gartner.com), and ${n('redirect-trivial')} ` +
    `cosmetic redirects (http→https / www / trailing slash). Rows sorted most-severe first.`,
    rows, false);
}

// 2. Internal links pointing at 404s or unpublished posts ---------------
// validBlogSlugs = every published post slug (hidden SEO + visible blog), so a
// SEO post linking to a real visible post is not falsely flagged.
export function checkInternalLinks(posts, linkStatus, validBlogSlugs) {
  const rows = [];
  for (const p of posts) {
    for (const { href } of dedupeLinks(extractLinks(p.body))) {
      const c = classifyLink(href);
      if (c.kind !== 'internal') continue;
      let issue = null;
      let detail = '';
      if (c.slug) {
        // Points at a /blog/<slug> — must resolve to a real published post.
        if (!validBlogSlugs.has(c.slug)) {
          issue = 'unknown-post';
          detail = `slug "${c.slug}" not a published post`;
        }
      }
      const st = c.url ? linkStatus[c.url] : null;
      if (!issue && st && !st.ok) {
        issue = 'http-error';
        detail = st.error ? `ERR:${st.error}` : `HTTP ${st.status}`;
      } else if (issue && st && !st.ok) {
        detail += st.error ? ` (ERR:${st.error})` : ` (HTTP ${st.status})`;
      }
      if (issue) {
        rows.push({ ...base(p), link: href, issue, detail });
      }
    }
  }
  return check('internal_link_targets', 'Internal links → 404 or unpublished post',
    'Internal links that resolve to a /blog/<slug> not in the published corpus, or that returned an HTTP error.',
    rows, false);
}

// 3. Missing or over-length meta/summary --------------------------------
export function checkSummary(posts) {
  const rows = [];
  for (const p of posts) {
    const s = (p.summary || '').trim();
    const len = s.length;
    let issue = null;
    if (len === 0) issue = 'missing';
    else if (len > THRESHOLDS.summaryMaxChars) issue = 'over-length';
    else if (len < THRESHOLDS.summaryMinChars) issue = 'short';
    if (issue) rows.push({ ...base(p), length: len, issue });
  }
  return check('summary_meta', 'Missing / over-length / short summary',
    `summary missing, longer than ${THRESHOLDS.summaryMaxChars} chars, or shorter than ${THRESHOLDS.summaryMinChars} chars. (summary is the only meta/description field in the model.)`,
    rows, true);
}

// 4. Missing author -----------------------------------------------------
export function checkMissingAuthor(posts) {
  const rows = posts
    .filter((p) => !p.author && !(p.authorRef))
    .map((p) => ({ ...base(p), issue: 'no author field' }));
  return check('missing_author', 'Missing author',
    'Posts with no author. NOTE: the SEO-post content model has no author field at all, so this is expected to be 100% — reported for completeness, not as 207 separate defects.',
    rows, true);
}

// 5. Missing publish date ----------------------------------------------
export function checkMissingDate(posts) {
  const rows = posts
    .filter((p) => !p.publishedAt)
    .map((p) => ({ ...base(p), issue: 'no publishedAt' }));
  return check('missing_publish_date', 'Missing publish date',
    'Posts with no publishedAt value.', rows, true);
}

// 6. Publish date in the future ----------------------------------------
export function checkFutureDate(posts, now) {
  const today = now.toISOString().slice(0, 10);
  const rows = posts
    .filter((p) => p.publishedAt && String(p.publishedAt).slice(0, 10) > today)
    .map((p) => ({ ...base(p), publishedAt: p.publishedAt, today }));
  return check('future_publish_date', 'Publish date in the future',
    `Posts whose publishedAt is after the run date (${today}).`, rows, true);
}

// 7 & 8. Duplicate / near-duplicate titles and slugs -------------------
function duplicateCheck(posts, field, getVal, id, title) {
  const rows = [];
  // Exact-normalized groups.
  const groups = new Map();
  for (const p of posts) {
    const key = normalizeText(getVal(p));
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const seenPair = new Set();
  for (const [, group] of groups) {
    if (group.length > 1) {
      for (const p of group) {
        rows.push({
          ...base(p),
          value: getVal(p),
          kind: 'exact',
          match: group.filter((q) => q._id !== p._id).map((q) => getVal(q)).join(' | '),
          similarity: '1.00',
        });
      }
    }
  }
  // Near-duplicate pairs across distinct normalized values.
  const list = posts.filter((p) => getVal(p));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (normalizeText(getVal(a)) === normalizeText(getVal(b))) continue; // already exact
      const sim = similarity(getVal(a), getVal(b));
      if (sim >= THRESHOLDS.nearDuplicateSimilarity) {
        const pairKey = [a._id, b._id].sort().join('|');
        if (seenPair.has(pairKey)) continue;
        seenPair.add(pairKey);
        rows.push({ ...base(a), value: getVal(a), kind: 'near', match: getVal(b), similarity: sim.toFixed(2) });
        rows.push({ ...base(b), value: getVal(b), kind: 'near', match: getVal(a), similarity: sim.toFixed(2) });
      }
    }
  }
  return check(id, title,
    `Exact (normalized) duplicate ${field}s, plus near-duplicates at Levenshtein similarity ≥ ${THRESHOLDS.nearDuplicateSimilarity}.`,
    rows, true);
}

export function checkDuplicateTitles(posts) {
  return duplicateCheck(posts, 'title', (p) => p.title || '', 'duplicate_titles', 'Duplicate / near-duplicate titles');
}
export function checkDuplicateSlugs(posts) {
  return duplicateCheck(posts, 'slug', (p) => p.slug || '', 'duplicate_slugs', 'Duplicate / near-duplicate slugs');
}

// 9. Word count outliers (very thin posts) ------------------------------
export function checkThinPosts(posts) {
  const counts = posts.map((p) => wordCount(p.body));
  const p10 = Math.round(percentile(counts, 10));
  const median = Math.round(percentile(counts, 50));
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const rows = [];
  posts.forEach((p, i) => {
    const wc = counts[i];
    const belowFloor = wc < THRESHOLDS.thinWordCount;
    const belowP10 = wc <= p10;
    if (belowFloor || belowP10) {
      rows.push({
        ...base(p),
        words: wc,
        issue: belowFloor ? `< ${THRESHOLDS.thinWordCount} (thin)` : `≤ p10 (${p10}) relative outlier`,
      });
    }
  });
  rows.sort((a, b) => a.words - b.words);
  return check('thin_posts', 'Word-count outliers (thin posts)',
    `Posts under the ${THRESHOLDS.thinWordCount}-word "thin" floor, or at/below the corpus 10th percentile. ` +
    `Corpus distribution — min ${min}, p10 ${p10}, median ${median}, max ${max} words. ` +
    `(No post is under the ${THRESHOLDS.thinWordCount}-word floor; flagged rows are relative bottom-decile outliers.)`,
    rows, true);
}

// 10. Orphan posts (no internal inbound links) --------------------------
export function checkOrphans(posts) {
  const inbound = new Map(); // slug -> count of OTHER posts linking to it
  const slugOf = new Map();
  for (const p of posts) if (p.slug) { inbound.set(p.slug, 0); slugOf.set(p._id, p.slug); }
  for (const p of posts) {
    const targets = new Set();
    for (const { href } of extractLinks(p.body)) {
      const c = classifyLink(href);
      if (c.kind === 'internal' && c.slug && c.slug !== p.slug) targets.add(c.slug);
    }
    for (const t of targets) if (inbound.has(t)) inbound.set(t, inbound.get(t) + 1);
  }
  const rows = posts
    .filter((p) => p.slug && inbound.get(p.slug) === 0)
    .map((p) => ({ ...base(p), inboundLinks: 0 }));
  return check('orphan_posts', 'Orphan posts (no internal inbound links)',
    'Posts that no other in-scope post links to via an internal /blog/<slug> link.',
    rows, true);
}

// 11. Hardcoded pricing / plan names / numbers --------------------------
const CURRENCY_RE = /(?:\$|£|€)\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s?(?:USD|GBP|EUR|dollars)\b/gi;
const PER_UNIT_RE = /\b\d[\d,]*(?:\.\d+)?\s?(?:per (?:month|user|seat|year)|\/mo\b|\/month|\/year|a month|a year)/gi;
const planContextRe = new RegExp(
  `\\b(${PLAN_TOKENS.join('|')})\\s+(?:plan|tier|subscription|version|account|users?|seats?)\\b`, 'g');

export function checkHardcodedValues(posts) {
  const rows = [];
  for (const p of posts) {
    const text = [p.title || '', p.summary || '', plainText(p.body)].join('  ');
    const prices = uniq(match(text, CURRENCY_RE));
    const perUnit = uniq(match(text, PER_UNIT_RE));
    const plans = uniq(match(text, planContextRe));
    if (prices.length || perUnit.length || plans.length) {
      rows.push({
        ...base(p),
        prices: prices.join(' · '),
        perUnit: perUnit.join(' · '),
        plans: plans.join(' · '),
        total: prices.length + perUnit.length + plans.length,
      });
    }
  }
  rows.sort((a, b) => b.total - a.total);
  return check('hardcoded_values', 'Hardcoded pricing / plan names / numbers',
    'Extracted currency amounts, per-unit pricing phrases, and plan-name-in-context tokens. Extraction only — not judged.',
    rows, true);
}

// --- helpers -----------------------------------------------------------
function match(text, re) {
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    // Trim surrounding whitespace and trailing sentence punctuation so
    // "$20," and "$20" collapse to the same extracted token.
    out.push(m[0].trim().replace(/[.,;:]+$/, ''));
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}
function uniq(arr) { return [...new Set(arr)]; }
function dedupeLinks(links) {
  const seen = new Set();
  const out = [];
  for (const l of links) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l);
  }
  return out;
}
function check(id, title, description, rows, deterministic) {
  return { id, title, description, deterministic, rows, count: rows.length };
}

// Run every check and return them in the listed order.
// validBlogSlugs = all published post slugs (defaults to in-scope if omitted).
export function runAllChecks(posts, linkStatus, now, validBlogSlugs) {
  const scopeSlugs = new Set(posts.map((p) => p.slug).filter(Boolean));
  const blogSlugs = validBlogSlugs || scopeSlugs;
  return [
    checkBrokenOutbound(posts, linkStatus),
    checkInternalLinks(posts, linkStatus, blogSlugs),
    checkSummary(posts),
    checkMissingAuthor(posts),
    checkMissingDate(posts),
    checkFutureDate(posts, now),
    checkDuplicateTitles(posts),
    checkDuplicateSlugs(posts),
    checkThinPosts(posts),
    checkOrphans(posts),
    checkHardcodedValues(posts),
  ];
}
