import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { recomputeAttribution } from "@/lib/tasks/recompute-attribution";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/recompute
 *
 * Manually triggers an attribution recompute without requiring a full
 * Google Sheets sync. Protected by CRON_SECRET.
 *
 * Use this to:
 * - Backfill activity_uplifts on first deploy
 * - Re-run after a config change (e.g. post-window days)
 * - Debug/verify computed values without waiting for the daily sync
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  const execution = await prisma.cronExecution.create({
    data: { taskName: "recompute-attribution", startedAt, status: "running" },
  });

  try {
    const result = await recomputeAttribution();

    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt: new Date(),
        status: "success",
        resultJson: JSON.stringify(result),
      },
    });

    console.log(
      `[Recompute] Attribution recompute completed: ${result.count} activities in ${result.durationMs}ms`
    );

    return Response.json({
      success: true,
      count: result.count,
      durationMs: result.durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error("[Recompute] Attribution recompute failed:", error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
