import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncDubAnalytics } from "@/lib/tasks/sync-dub";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] Dub analytics sync started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "sync-dub", startedAt, status: "running" },
  });

  try {
    const result = await syncDubAnalytics();

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage: result.errors > 0 ? `${result.errors} error(s) during run` : null,
      },
    });

    console.log(
      `[Cron] Dub sync completed: ${result.stored} rows upserted, ${result.errors} errors`
    );

    return Response.json({ success: true, ...result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] Dub sync failed:`, error);
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
