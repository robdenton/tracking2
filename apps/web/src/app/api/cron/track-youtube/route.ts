import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { trackYouTubeViews } from "@/lib/tasks/track-youtube";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] YouTube view tracking started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "track-youtube", startedAt, status: "running" },
  });

  try {
    const result = await trackYouTubeViews();

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] YouTube view tracking failed:`, error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
