import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncGoogleAdsClicks } from "@/lib/tasks/sync-google-ads-clicks";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return unauthorizedResponse();

  const startedAt = new Date();
  console.log(`[Cron] GAds sync started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "sync-google-ads-clicks", startedAt, status: "running" },
  });

  try {
    const result = await syncGoogleAdsClicks();

    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt: new Date(),
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage:
          result.errors > 0 ? `${result.errors} batch error(s)` : null,
      },
    });

    console.log(
      `[Cron] GAds sync done: day=${result.day}, fetched=${result.fetched}, inserted=${result.inserted}`
    );
    return Response.json({ success: true, ...result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error("[Cron] GAds sync failed:", error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
