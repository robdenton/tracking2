// Link classification + HTTP liveness. Classification is pure/deterministic;
// liveness performs network I/O and is therefore the one part of the audit
// whose result can vary between runs (a server can be up now, down later).
// We keep the two concerns separate so structural findings never depend on
// the network.
import { isFirstPartyHost, BLOG_HOSTS, CANONICAL_ORIGIN, HTTP, postUrl } from '../config.mjs';

// Classify a raw href into a structured descriptor.
//   kind: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel' | 'other'
//   slug: for internal /blog/<slug> links, the target slug (else null)
export function classifyLink(href) {
  const raw = String(href || '').trim();
  if (!raw) return { href: raw, kind: 'other', slug: null, url: null };

  if (raw.startsWith('#')) return { href: raw, kind: 'anchor', slug: null, url: null };
  if (/^mailto:/i.test(raw)) return { href: raw, kind: 'mailto', slug: null, url: null };
  if (/^tel:/i.test(raw)) return { href: raw, kind: 'tel', slug: null, url: null };

  let url;
  let internal;
  if (raw.startsWith('/')) {
    // Site-relative → first-party, resolved against the canonical host.
    url = new URL(raw, CANONICAL_ORIGIN);
    internal = true;
  } else {
    try {
      url = new URL(raw);
    } catch {
      return { href: raw, kind: 'other', slug: null, url: null };
    }
    if (!/^https?:$/.test(url.protocol)) {
      return { href: raw, kind: 'other', slug: null, url: null };
    }
    internal = isFirstPartyHost(url.hostname);
  }

  // A /blog/<slug> is only a post reference on an actual blog host.
  const slug = BLOG_HOSTS.has(url.hostname) ? extractBlogSlug(url) : null;
  return {
    href: raw,
    kind: internal ? 'internal' : 'external',
    slug,
    url: url.toString(),
  };
}

// If the URL points at a blog post (/blog/<slug>), return the slug.
function extractBlogSlug(url) {
  const m = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

// --- HTTP liveness -------------------------------------------------------

async function fetchStatus(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': HTTP.userAgent, Accept: '*/*' },
    });
    return {
      status: res.status,
      finalUrl: res.url,
      redirected: res.redirected,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Check one URL. HEAD first (cheap); fall back to GET when HEAD is rejected
// (405/501) or errors, since many servers mishandle HEAD.
export async function checkUrl(url) {
  let lastErr;
  for (let attempt = 0; attempt <= HTTP.retries; attempt++) {
    try {
      let r = await fetchStatus(url, 'HEAD');
      if (r.status === 405 || r.status === 501 || r.status === 403) {
        r = await fetchStatus(url, 'GET');
      }
      return { url, ...r, ok: r.status >= 200 && r.status < 400, error: null };
    } catch (e) {
      lastErr = e;
      try {
        const r = await fetchStatus(url, 'GET');
        return { url, ...r, ok: r.status >= 200 && r.status < 400, error: null };
      } catch (e2) {
        lastErr = e2;
      }
    }
  }
  return {
    url,
    status: 0,
    finalUrl: null,
    redirected: false,
    ok: false,
    error: lastErr ? (lastErr.name === 'AbortError' ? 'timeout' : lastErr.code || lastErr.message) : 'unknown',
  };
}

// Run checkUrl over many URLs with bounded concurrency. `cache` maps url ->
// prior result; cached URLs are skipped so re-runs are fast and resumable.
export async function checkUrls(urls, cache = {}, onProgress = () => {}) {
  const todo = urls.filter((u) => !cache[u]);
  let done = 0;
  const results = { ...cache };
  let idx = 0;
  async function worker() {
    while (idx < todo.length) {
      const url = todo[idx++];
      results[url] = await checkUrl(url);
      done++;
      if (done % 25 === 0 || done === todo.length) onProgress(done, todo.length);
    }
  }
  const workers = Array.from({ length: Math.min(HTTP.concurrency, todo.length) }, worker);
  await Promise.all(workers);
  return results;
}

export { postUrl };
