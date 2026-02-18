import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { trackLinkedInEngagement } from "@/lib/tasks/track-linkedin";
import { prisma } from "@/lib/prisma";

// LinkedIn scraping involves launching a headless browser and visiting each post.
// Give it 5 minutes to handle up to ~10 activities with navigation + delays.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] LinkedIn tracking started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "track-linkedin", startedAt, status: "running" },
  });

  try {
    const result = await trackLinkedInEngagement();

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage: result.errors > 0 ? `${result.errors} error(s) during tracking` : null,
      },
    });

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] LinkedIn tracking failed:`, error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
