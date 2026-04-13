import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { exportSpine } from "@/lib/tasks/export-spine";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] Spine export started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "export-spine", startedAt, status: "running" },
  });

  try {
    const result = await exportSpine();

    const timestamp = startedAt.toISOString().slice(0, 10);
    const blob = await put(
      `spine/metrics_spine_${timestamp}.csv`,
      result.csv,
      {
        access: "public",
        contentType: "text/csv",
        addRandomSuffix: false,
      }
    );

    // Also upload a "latest" pointer that always has the newest export
    await put("spine/metrics_spine_latest.csv", result.csv, {
      access: "public",
      contentType: "text/csv",
      addRandomSuffix: false,
    });

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: "success",
        resultJson: JSON.stringify({
          rowCount: result.rowCount,
          platforms: result.platforms,
          dateRange: result.dateRange,
          blobUrl: blob.url,
          blobSize: result.csv.length,
        }),
      },
    });

    console.log(
      `[Cron] Spine export completed: ${result.rowCount} rows, ${result.csv.length} bytes`
    );

    return Response.json({
      success: true,
      rowCount: result.rowCount,
      platforms: result.platforms,
      dateRange: result.dateRange,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error(`[Cron] Spine export failed:`, error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
