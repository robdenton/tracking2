import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { backfillPodscanAudience } from "@/lib/tasks/backfill-podscan-audience";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return unauthorizedResponse();

  const startedAt = new Date();
  console.log(`[Cron] Audience backfill started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "backfill-podscan-audience", startedAt, status: "running" },
  });

  try {
    // Premium tier 2000/day. sync-podscan uses ~230, classify uses 0, so this
    // cron can use up to ~1700/day. Use 1500 for headroom + 120/min rate cap.
    // At 600ms/call = 100/min, 1500 calls = 15 min runtime (fits in maxDuration=300).
    // Actually 1500 * 0.6s = 900s — too long. Cap at 450 per run.
    const result = await backfillPodscanAudience({ limit: 450, delayMs: 600 });

    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt: new Date(),
        status: "success",
        resultJson: JSON.stringify(result),
      },
    });

    console.log(
      `[Cron] Audience backfill complete: enriched=${result.enriched}/${result.checked}, remaining=${result.remaining}`
    );

    return Response.json({ success: true, ...result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error("[Cron] Audience backfill failed:", error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
