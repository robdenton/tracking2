import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFinding, regenerateRewrite, setProposedText } from "@/lib/seo-review";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/seo-review/regenerate  { id, feedback, keep?: boolean }
//
// Generates a revised rewrite from the reviewer's direction. Nothing is written
// to Sanity: the proposal is returned for review, and only stored against the
// finding when keep=true. Applying it is still a separate, explicit Accept.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string; feedback?: string; keep?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { id, feedback, keep } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!feedback || !feedback.trim()) {
    return NextResponse.json({ error: "Tell it what to change — the direction is required." }, { status: 400 });
  }

  const finding = await getFinding(id);
  if (!finding) return NextResponse.json({ error: "finding not found" }, { status: 404 });

  if (finding.applied_to_draft) {
    return NextResponse.json(
      {
        error:
          "This change has already been written to the Sanity draft. Generating a new rewrite here would not update it — edit the draft in the Studio, or discard it and start again.",
      },
      { status: 409 },
    );
  }

  try {
    const result = await regenerateRewrite({ finding, feedback });
    if (keep) await setProposedText(id, result.rewrite);
    return NextResponse.json({ ...result, stored: keep === true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "could not generate a rewrite" },
      { status: 500 },
    );
  }
}
