import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { verifyDraft } from "@/lib/seo-review";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/seo-review/verify?slug=<slug>
//
// Post-edit check. Reads the DRAFT and reports artifacts introduced by applying
// edits (stranded punctuation, duplicated sentences, emptied blocks, fragments)
// plus the edits that were refused and still need doing by hand.
//
// Accepts either a signed-in session or the cron secret, so it can be run from
// the review page and from a script.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const result = await verifyDraft(slug);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "verification failed" },
      { status: 500 },
    );
  }
}
