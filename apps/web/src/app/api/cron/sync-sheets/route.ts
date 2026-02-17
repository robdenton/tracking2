import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncGoogleSheets } from "@/lib/tasks/sync-sheets";

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  console.log(`[Cron] Sheets sync started at ${new Date().toISOString()}`);

  try {
    const result = await syncGoogleSheets();

    console.log(
      `[Cron] Sheets sync completed: ${result.activitiesCount} activities, ${result.metricsCount} metrics`
    );

    return Response.json({
      success: true,
      message: "Sheets sync completed",
      activitiesCount: result.activitiesCount,
      metricsCount: result.metricsCount,
    });
  } catch (error) {
    console.error(`[Cron] Sheets sync failed:`, error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
