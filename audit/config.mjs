// Central, explicit configuration for the SEO audit.
// Every threshold that affects a pass/fail decision lives here so the audit is
// auditable itself: change a number here, re-run, and the result changes
// predictably. Nothing below reads the clock except `now`, which is injected
// once per run (see run.mjs) so a single run has one consistent "today".

export const SANITY = {
  projectId: 'oy7f1h9b',
  dataset: 'production',
  apiVersion: 'v2021-06-07',
};

// The in-scope filter. This string is the contract for the whole audit.
export const IN_SCOPE_FILTER =
  '_type == "post" && hidden == true && !(_id in path("drafts.**"))';

// Expected in-scope count. A checkable expectation, not gospel — the run
// reports loudly if the live count differs from this.
export const EXPECTED_COUNT = 207;

// granola.ai is the canonical domain; granola.so redirects to it. Both serve
// the blog at /blog/<slug>. We link to the canonical host to avoid redirects.
export const CANONICAL_ORIGIN = 'https://www.granola.ai';

// Public live URL for a post given its slug.
export const postUrl = (slug) => `${CANONICAL_ORIGIN}/blog/${slug}`;

export const THRESHOLDS = {
  // Meta/summary length. Google typically truncates meta descriptions past
  // ~160 chars; below ~70 is thin. Missing = undefined/empty after trim.
  summaryMaxChars: 160,
  summaryMinChars: 70,

  // Word count. "Very thin" is an absolute floor; we also flag statistical
  // low outliers relative to the corpus (below the 10th percentile).
  thinWordCount: 300,

  // Near-duplicate title/slug detection. Normalized-equal always flags.
  // Levenshtein similarity at or above this ratio also flags.
  nearDuplicateSimilarity: 0.9,
};

// Link liveness (HTTP) settings. These affect timing/robustness, not the
// structural findings, which are computed purely from the content snapshot.
export const HTTP = {
  concurrency: 24,
  timeoutMs: 15000,
  retries: 1,
  // A realistic browser UA. Many hosts (g2.com, Cloudflare-fronted sites) return
  // 403 to non-browser agents, producing false "broken" positives; a normal
  // Chrome UA avoids most of that. This is link validation of first-party content,
  // not scraping.
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

// First-party = any granola.ai host (www, docs, help, trust, notes, status…)
// or the legacy granola.so. Relative links are first-party too.
export function isFirstPartyHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return (
    h === 'granola.ai' || h.endsWith('.granola.ai') ||
    h === 'granola.so' || h.endsWith('.granola.so')
  );
}

// Hosts where a /blog/<slug> path is an actual blog post (not docs/help).
export const BLOG_HOSTS = new Set([
  'granola.ai', 'www.granola.ai', 'granola.so', 'www.granola.so',
]);

// Known Granola plan/tier tokens to extract from copy (extract, don't judge).
// Case-sensitive, word-boundary matched, so ordinary lowercase "free"/"team"
// prose is ignored and only Title-Case plan-like tokens surface.
export const PLAN_TOKENS = [
  'Free', 'Pro', 'Plus', 'Team', 'Business', 'Enterprise',
  'Starter', 'Premium', 'Individual', 'Basic',
];
