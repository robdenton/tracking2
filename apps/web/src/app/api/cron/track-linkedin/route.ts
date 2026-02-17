import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { trackLinkedInEngagement } from "@/lib/tasks/track-linkedin";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  console.log(`[Cron] LinkedIn tracking started at ${new Date().toISOString()}`);

  try {
    const result = await trackLinkedInEngagement();

    console.log(
      `[Cron] LinkedIn tracking completed: ${result.tracked} tracked, ${result.errors} errors`
    );

    return Response.json({
      success: true,
      message: "LinkedIn tracking completed",
      tracked: result.tracked,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error(`[Cron] LinkedIn tracking failed:`, error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
