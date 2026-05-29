import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { classifyXMentions } from "@/lib/tasks/classify-x-mentions";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return unauthorizedResponse();

  const startedAt = new Date();
  console.log(`[Cron] X classify started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: { taskName: "classify-x-mentions", startedAt, status: "running" },
  });

  try {
    // Limit so cron stays within 300s. Haiku ~1s per call → 250 fits well.
    const result = await classifyXMentions({ limit: 250 });

    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt: new Date(),
        status: result.errors > 0 ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage:
          result.errors > 0 ? `${result.errors} classification error(s)` : null,
      },
    });

    console.log(
      `[Cron] X classify done: ${result.classified} classified ` +
        `(product=${result.product}, food=${result.food}, ambiguous=${result.ambiguous})`
    );
    return Response.json({ success: true, ...result });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    console.error("[Cron] X classify failed:", error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
