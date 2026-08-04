import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setEditFeedback } from "@/lib/seo-review";

export const dynamic = "force-dynamic";

// POST /api/seo-review/feedback
// Body: { id, revert: boolean, note?: string }
//
// Feedback on an APPLIED edit, from the change-log page. Session-only — this
// is a human judgement, so no cron-secret path. Flagging queues the edit for
// reversal and feeds calibration for the next pass; it does not touch Sanity
// by itself.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string; revert?: boolean; note?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.id || typeof body.revert !== "boolean") {
    return NextResponse.json({ error: "id and revert (boolean) required" }, { status: 400 });
  }

  try {
    const found = await setEditFeedback({
      id: body.id,
      revert: body.revert,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
    });
    if (!found) {
      return NextResponse.json(
        { error: "No applied edit with that id — feedback is only for changes already in a draft." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, revert: body.revert });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "feedback failed" },
      { status: 500 },
    );
  }
}
