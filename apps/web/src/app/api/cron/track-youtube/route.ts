import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { trackYouTubeViews } from "@/lib/tasks/track-youtube";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  console.log(`[Cron] YouTube view tracking started at ${new Date().toISOString()}`);

  try {
    const result = await trackYouTubeViews();

    console.log(
      `[Cron] YouTube view tracking completed: ${result.tracked} tracked, ${result.errors} errors`
    );

    return Response.json({
      success: true,
      message: "YouTube view tracking completed",
      tracked: result.tracked,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error(`[Cron] YouTube view tracking failed:`, error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
