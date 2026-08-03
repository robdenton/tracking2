// Fetch in-scope posts from the public Sanity API. The production dataset is
// publicly readable, so no token is required. If Sanity ever locks the dataset
// down, set SANITY_READ_TOKEN in the environment and it is sent as a Bearer.
import { SANITY, IN_SCOPE_FILTER } from '../config.mjs';

const ENDPOINT = `https://${SANITY.projectId}.api.sanity.io/${SANITY.apiVersion}/data/query/${SANITY.dataset}`;

async function runQuery(query, params = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = process.env.SANITY_READ_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  // POST avoids URL-length limits and is deterministic regardless of query size.
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) {
    throw new Error(`Sanity query failed: ${res.status} ${res.statusText} — ${await res.text()}`);
  }
  const json = await res.json();
  return json.result;
}

export async function countInScope() {
  return runQuery(`count(*[${IN_SCOPE_FILTER}])`);
}

// Every published (non-draft) post slug — hidden SEO posts AND the visible
// product blog. Used to validate that internal /blog/<slug> links resolve to a
// real post (a SEO post may legitimately link to a visible blog post).
export async function fetchAllBlogSlugs() {
  return runQuery(
    `*[_type == "post" && !(_id in path("drafts.**")) && defined(slug.current)].slug.current`
  );
}

// Fetch every in-scope post with exactly the fields the audit needs.
// Ordered by _id for a stable, reproducible snapshot ordering.
export async function fetchInScopePosts() {
  const query = `*[${IN_SCOPE_FILTER}] | order(_id asc) {
    _id,
    _updatedAt,
    _createdAt,
    title,
    "slug": slug.current,
    publishedAt,
    summary,
    hidden,
    body
  }`;
  return runQuery(query);
}
