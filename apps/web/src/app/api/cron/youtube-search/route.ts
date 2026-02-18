import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { searchAndSaveYouTubeResults } from "@/lib/tasks/youtube-search";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] YouTube search started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "youtube-search", startedAt, status: "running" },
  });

  try {
    const result = await searchAndSaveYouTubeResults();

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: "success",
        resultJson: JSON.stringify(result),
      },
    });

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] YouTube search failed:`, error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
