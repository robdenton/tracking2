import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncLinkedInAds } from "@/lib/tasks/sync-linkedin-ads";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(
    `[Cron] LinkedIn Ads sync started at ${startedAt.toISOString()}`
  );

  const execution = await prisma.cronExecution.create({
    data: {
      taskName: "sync-linkedin-ads",
      startedAt,
      status: "running",
    },
  });

  try {
    const result = await syncLinkedInAds();

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage:
          result.errors > 0
            ? `${result.errors} error(s): ${result.errorDetail ?? "unknown"}`
            : null,
      },
    });

    console.log(
      `[Cron] LinkedIn Ads sync completed: ${result.campaigns} campaigns, ${result.creatives} creatives, ${result.analytics} campaign analytics, ${result.creativeAnalytics} creative analytics, ${result.errors} errors`
    );

    return Response.json({
      success: true,
      message: "LinkedIn Ads sync completed",
      ...result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] LinkedIn Ads sync failed:`, error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
