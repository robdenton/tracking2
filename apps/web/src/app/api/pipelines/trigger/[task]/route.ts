import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGoogleSheets } from "@/lib/tasks/sync-sheets";
import { trackYouTubeViews } from "@/lib/tasks/track-youtube";
import { trackImportedViews } from "@/lib/tasks/track-imported";
import { trackLinkedInEngagement } from "@/lib/tasks/track-linkedin";
import { searchAndSaveYouTubeResults } from "@/lib/tasks/youtube-search";

type TaskName =
  | "sync-sheets"
  | "track-youtube"
  | "track-imported"
  | "track-linkedin"
  | "youtube-search";

async function runTask(taskName: TaskName) {
  switch (taskName) {
    case "sync-sheets":
      return syncGoogleSheets();
    case "track-youtube":
      return trackYouTubeViews();
    case "track-imported":
      return trackImportedViews();
    case "track-linkedin":
      return trackLinkedInEngagement();
    case "youtube-search":
      return searchAndSaveYouTubeResults();
    default:
      throw new Error(`Unknown task: ${taskName}`);
  }
}

const VALID_TASKS: TaskName[] = [
  "sync-sheets",
  "track-youtube",
  "track-imported",
  "track-linkedin",
  "youtube-search",
];

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ task: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task } = await params;

  if (!VALID_TASKS.includes(task as TaskName)) {
    return Response.json({ error: `Unknown task: ${task}` }, { status: 400 });
  }

  const taskName = task as TaskName;
  const startedAt = new Date();

  const execution = await prisma.cronExecution.create({
    data: { taskName, startedAt, status: "running" },
  });

  try {
    const result = await runTask(taskName);

    const hasErrors =
      "errors" in result && typeof result.errors === "number" && result.errors > 0;

    const completedAt = new Date();
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        completedAt,
        status: hasErrors ? "error" : "success",
        resultJson: JSON.stringify(result),
        errorMessage: hasErrors ? `${(result as { errors: number }).errors} error(s) during run` : null,
      },
    });

    return Response.json({ success: true, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: { completedAt: new Date(), status: "error", errorMessage },
    });
    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
