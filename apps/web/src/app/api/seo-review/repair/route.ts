import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { repairDraft } from "@/lib/seo-review";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/seo-review/repair  { slug, apply?: boolean }
//
// Repairs artifacts our own edits introduced into a draft — duplicated phrases
// and sentences, stranded punctuation. Deterministic only: it removes text that
// is provably duplicated and fixes punctuation. It never rewrites meaning.
//
// apply=false (default) is a dry run, so the repair can be inspected first.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { slug?: string; apply?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const result = await repairDraft(body.slug, body.apply === true);
    return NextResponse.json({ ...result, applied: body.apply === true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "repair failed" },
      { status: 500 },
    );
  }
}
