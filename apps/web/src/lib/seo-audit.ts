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
  /** True when the article exists only as a draft — it is not live. */
  unpublished?: boolean;
}

export function postUrl(slug: string): string {
  return `https://www.granola.ai/blog/${slug}`;
}

// Fetch all in-scope SEO posts, newest first. Cached via Next's fetch cache;
// callers set the revalidate window.
export async function fetchSeoPosts(revalidateSeconds = 3600): Promise<SeoPost[]> {
  // Include articles that have been UNPUBLISHED. Those exist only as
  // drafts.<id>, so the published-only filter drops them — but review work on
  // them continues, and they still need to be findable. Draft ids are
  // normalised back to the published id so findings still match.
  const query = `{
    "published": *[${IN_SCOPE_FILTER}]{
      _id, title, "slug": slug.current, publishedAt, "updatedAt": _updatedAt,
      "unpublished": false
    },
    "draftOnly": *[_type == "post" && hidden == true && _id in path("drafts.**")
                   && !defined(*[_id == string::split(^._id, "drafts.")[1]][0]._id)]{
      "_id": string::split(_id, "drafts.")[1],
      title, "slug": slug.current, publishedAt, "updatedAt": _updatedAt,
      "unpublished": true
    }
  }`;
  // Drafts are NOT readable anonymously, so an unpublished article is invisible
  // without a token. Send the write token (it carries read access) when present;
  // without it the list still works, minus unpublished articles.
  const token = process.env.SANITY_WRITE_TOKEN?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && !/\s/.test(token)) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`Sanity query failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    result: { published: SeoPost[]; draftOnly: SeoPost[] };
  };
  const { published = [], draftOnly = [] } = json.result ?? {};
  return [...published, ...draftOnly].sort((a, b) =>
    String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")),
  );
}
