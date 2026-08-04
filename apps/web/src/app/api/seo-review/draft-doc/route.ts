import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { readEditableDoc } from "@/lib/seo-review";

export const dynamic = "force-dynamic";

// GET /api/seo-review/draft-doc?slug=<slug>&id=<postId>
//
// Returns the document the review pipeline would edit — the draft when one
// exists, else the published doc. Exists for the post-edit verification
// passes: drafts are not readable anonymously, and the token lives only in
// this deployment, so the local scanner reads draft content through here.
// Read-only.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const postId = request.nextUrl.searchParams.get("id");
  if (!postId || !/^[A-Za-z0-9-]+$/.test(postId)) {
    return NextResponse.json({ error: "id (post id) required" }, { status: 400 });
  }
  try {
    const { doc, source } = await readEditableDoc(postId);
    if (!doc) return NextResponse.json({ error: "document not found" }, { status: 404 });
    return NextResponse.json({ source, doc });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "read failed" },
      { status: 500 },
    );
  }
}
