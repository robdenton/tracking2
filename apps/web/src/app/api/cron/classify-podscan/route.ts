import { NextRequest } from "next/server";
import { verifyCronSecret, unauthorizedResponse } from "@/lib/cron-auth";
import { classifyPodscanMentions } from "@/lib/tasks/classify-podscan-mentions";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return unauthorizedResponse();
  }

  const startedAt = new Date();
  console.log(`[Cron] Podscan classify started at ${startedAt.toISOString()}`);

  const execution = await prisma.cronExecution.create({
    data: {
      taskName: "classify-podscan",
      startedAt,
      status: "running",
    },
  });

  try {
    // Limit to ~250 per run to stay within cron timeout (~1s per call)
    const result = await classifyPodscanMentions({ limit: 250 });

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
      `[Cron] Podscan classify completed: ${result.classified} classified ` +
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
    console.error(`[Cron] Podscan classify failed:`, error);
    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
