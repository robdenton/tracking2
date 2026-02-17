import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { searchAndSaveYouTubeResults } from "@/lib/tasks/youtube-search";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  console.log(`[Cron] YouTube search started at ${new Date().toISOString()}`);

  try {
    const result = await searchAndSaveYouTubeResults();

    console.log(
      `[Cron] YouTube search completed: ${result.resultsFound} found, ${result.saved} saved`
    );

    return Response.json({
      success: true,
      message: "YouTube search completed",
      resultsFound: result.resultsFound,
      saved: result.saved,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error(`[Cron] YouTube search failed:`, error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
