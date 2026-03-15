import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { syncCompanyLinkedIn } from "@/lib/tasks/sync-company-linkedin";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(
    `[Cron] Company LinkedIn sync started at ${startedAt.toISOString()}`
  );

  const execution = await prisma.cronExecution.create({
    data: {
      taskName: "sync-company-linkedin",
      startedAt,
      status: "running",
    },
  });

  try {
    const result = await syncCompanyLinkedIn();

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage:
          result.errors > 0
            ? `${result.errors} error(s) during sync: ${result.errorDetail ?? "unknown"}`
            : null,
      },
    });

    console.log(
      `[Cron] Company LinkedIn sync completed: ${result.synced} posts, ${result.errors} errors`
    );

    return Response.json({
      success: true,
      message: "Company LinkedIn sync completed",
      ...result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] Company LinkedIn sync failed:`, error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
