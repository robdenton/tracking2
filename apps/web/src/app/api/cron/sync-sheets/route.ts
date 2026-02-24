import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncGoogleSheets } from "@/lib/tasks/sync-sheets";
import { recomputeAttribution } from "@/lib/tasks/recompute-attribution";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] Sheets sync started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "sync-sheets", startedAt, status: "running" },
  });

  try {
    const result = await syncGoogleSheets();

    // Recompute attribution immediately after sync so stored values stay
    // consistent with the freshly imported activity data. Wrapped in its own
    // try/catch so a recompute failure is logged but does not mask a
    // successful sync.
    let upliftCount = 0;
    let upliftDurationMs = 0;
    try {
      const upliftResult = await recomputeAttribution();
      upliftCount = upliftResult.count;
      upliftDurationMs = upliftResult.durationMs;
      console.log(
        `[Cron] Attribution recomputed: ${upliftCount} activities in ${upliftDurationMs}ms`
      );
    } catch (upliftError) {
      console.error("[Cron] Attribution recompute failed after sync:", upliftError);
    }

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: "success",
        resultJson: JSON.stringify({ ...result, upliftCount, upliftDurationMs }),
      },
    });

    console.log(
      `[Cron] Sheets sync completed: ${result.activitiesCount} activities, ${result.metricsCount} metrics`
    );

    return Response.json({
      success: true,
      message: "Sheets sync completed",
      activitiesCount: result.activitiesCount,
      metricsCount: result.metricsCount,
      upliftCount,
      upliftDurationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] Sheets sync failed:`, error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
