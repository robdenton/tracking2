import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncDubAnalytics } from "@/lib/tasks/sync-dub";
import { syncPartnerCache } from "@/lib/affiliates";
import { prisma } from "@/lib/prisma";

export const maxDuration = 800;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] Dub analytics sync started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "sync-dub", startedAt, status: "running" },
  });

  try {
    const startDateParam = request.nextUrl.searchParams.get("startDate") ?? undefined;
    const batchIndexParam = request.nextUrl.searchParams.get("batch") ? parseInt(request.nextUrl.searchParams.get("batch")!) : undefined;
    const batchSizeParam = request.nextUrl.searchParams.get("batchSize") ? parseInt(request.nextUrl.searchParams.get("batchSize")!) : undefined;
    const result = await syncDubAnalytics(startDateParam, batchIndexParam, batchSizeParam);

    // Also sync the partner cache (so the affiliate page loads from DB, not live API)
    let partnerCacheResult = { synced: 0 };
    try {
      partnerCacheResult = await syncPartnerCache();
      console.log(`[Cron] Partner cache synced: ${partnerCacheResult.synced} partners`);
    } catch (e) {
      console.error(`[Cron] Partner cache sync failed:`, e);
    }

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage: result.errors > 0 ? `${result.errors} error(s) during run` : null,
      },
    });

    console.log(
      `[Cron] Dub sync completed: ${result.stored} rows upserted, ${result.errors} errors`
    );

    return Response.json({ success: true, ...result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] Dub sync failed:`, error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
