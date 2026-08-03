import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getSamples } from "@/lib/seo-insights-samples";

export const dynamic = "force-dynamic";

// GET /api/seo-review/insights/samples
// The findings we flagged and the reviewer rejected, and the ones we cleared
// that the reviewer acted on anyway — over-firing and under-firing respectively.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getSamples());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "samples failed" },
      { status: 500 },
    );
  }
}
