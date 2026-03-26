import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_SOURCES = ["organic", "paid_sponsorship", "affiliate", "podcast"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { videoId, source } = body;

  if (!videoId || typeof videoId !== "string") {
    return Response.json({ error: "videoId is required" }, { status: 400 });
  }

  if (!source || !VALID_SOURCES.includes(source)) {
    return Response.json(
      { error: `source must be one of: ${VALID_SOURCES.join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.importedYouTubeVideo.update({
    where: { id: videoId },
    data: { source },
  });

  return Response.json({ success: true, videoId, source });
}
