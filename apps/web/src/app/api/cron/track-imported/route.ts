import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { trackImportedViews } from "@/lib/tasks/track-imported";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  console.log(`[Cron] Imported video tracking started at ${new Date().toISOString()}`);

  try {
    const result = await trackImportedViews();

    console.log(
      `[Cron] Imported video tracking completed: ${result.tracked} tracked, ${result.errors} errors`
    );

    return Response.json({
      success: true,
      message: "Imported video tracking completed",
      tracked: result.tracked,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error(`[Cron] Imported video tracking failed:`, error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
