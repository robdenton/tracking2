// Live fetch of Granola's published SEO articles from Sanity.
// These are `post` documents with `hidden == true` (the SEO articles; the
// visible posts are the product blog). The production dataset is publicly
// readable, so no token is needed. Canonical live domain is granola.ai.
//
// Full audit logic (link checks, duplicates, thin posts, etc.) lives in the
// repo-root `audit/` CLI tool. This page intentionally shows only the always-
// current article index, which is the primary use case.

const PROJECT_ID = "oy7f1h9b";
const DATASET = "production";
const API_VERSION = "v2021-06-07";
const ENDPOINT = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}/data/query/${DATASET}`;

const IN_SCOPE_FILTER =
  `_type == "post" && hidden == true && !(_id in path("drafts.**"))`;

export interface SeoPost {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
}

export function postUrl(slug: string): string {
  return `https://www.granola.ai/blog/${slug}`;
}

// Fetch all in-scope SEO posts, newest first. Cached via Next's fetch cache;
// callers set the revalidate window.
export async function fetchSeoPosts(revalidateSeconds = 3600): Promise<SeoPost[]> {
  const query = `*[${IN_SCOPE_FILTER}] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    "updatedAt": _updatedAt
  }`;
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: revalidateSeconds } });
  if (!res.ok) {
    throw new Error(`Sanity query failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { result: SeoPost[] };
  return json.result ?? [];
}
