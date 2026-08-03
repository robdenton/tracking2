import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getInsights } from "@/lib/seo-insights";

export const dynamic = "force-dynamic";

// GET /api/seo-review/insights
//
// Acceptance rates by disposition, layer, category, field and lexicon term —
// the raw material for recalibrating the review against real decisions rather
// than against my assumptions about what matters.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getInsights());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "insights failed" },
      { status: 500 },
    );
  }
}
