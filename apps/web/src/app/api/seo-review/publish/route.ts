import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { SANITY_PROJECT, SANITY_DATASET } from "@/lib/seo-review";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/seo-review/publish
// Body: { postIds: string[], dryRun?: boolean }
//
// Publishes Sanity drafts: the draft content replaces the published document
// and the draft is deleted — exactly what the Studio's Publish button does.
//
// This is the ONE outward-facing write in the whole system, so it is
// deliberately dumb: it publishes exactly the ids it is given, nothing more.
// There is no "publish everything" mode — the caller must enumerate, and the
// driver script builds that list explicitly and excludes the articles the
// owner unpublished on purpose. Capped per call; each id succeeds or fails
// independently.
const API = `https://${SANITY_PROJECT}.api.sanity.io/v2021-06-07`;
const CAP = 20;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { postIds?: string[]; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const ids = (body.postIds ?? []).filter((x) => typeof x === "string" && /^[A-Za-z0-9-]+$/.test(x)).slice(0, CAP);
  if (ids.length === 0) return NextResponse.json({ error: "postIds required (max 20 per call)" }, { status: 400 });
  const dryRun = Boolean(body.dryRun);

  const token = process.env.SANITY_WRITE_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "no write token configured" }, { status: 500 });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const results: { postId: string; status: string; detail?: string }[] = [];
  for (const postId of ids) {
    try {
      const read = await fetch(`${API}/data/query/${SANITY_DATASET}`, {
        method: "POST", headers,
        body: JSON.stringify({ query: `*[_id == "drafts.${postId}"][0]` }),
      });
      const draft = (await read.json()).result as Record<string, unknown> | null;
      if (!draft) { results.push({ postId, status: "no-draft" }); continue; }
      if (dryRun) { results.push({ postId, status: "would-publish" }); continue; }

      const doc: Record<string, unknown> = { ...draft, _id: postId };
      delete doc._rev;
      const res = await fetch(`${API}/data/mutate/${SANITY_DATASET}`, {
        method: "POST", headers,
        body: JSON.stringify({
          mutations: [
            { createOrReplace: doc },
            { delete: { id: `drafts.${postId}` } },
          ],
        }),
      });
      if (!res.ok) {
        results.push({ postId, status: "error", detail: (await res.text()).slice(0, 200) });
        continue;
      }
      results.push({ postId, status: "published" });
    } catch (e) {
      results.push({ postId, status: "error", detail: e instanceof Error ? e.message : "failed" });
    }
  }
  return NextResponse.json({
    dryRun,
    published: results.filter((r) => r.status === "published").length,
    results,
  });
}
