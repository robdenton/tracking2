import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncGrowiSnapshots } from "@/lib/tasks/sync-growi";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(
    `[Cron] Growi UGC sync started at ${startedAt.toISOString()}`
  );

  const execution = await prisma.cronExecution.create({
    data: { taskName: "sync-growi", startedAt, status: "running" },
  });

  try {
    const result = await syncGrowiSnapshots();

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage:
          result.errors > 0
            ? `${result.errors} error(s) during sync`
            : null,
      },
    });

    return Response.json({
      success: true,
      message: "Growi UGC sync completed",
      ...result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error("[Cron] Growi sync failed:", error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
