import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { activityId, tag } = body as { activityId: string; tag: string | null };

  if (!activityId) {
    return Response.json({ error: "activityId is required" }, { status: 400 });
  }

  const activity = await prisma.activity.update({
    where: { id: activityId },
    data: { tag: tag || null },
    select: { id: true, tag: true },
  });

  return Response.json({ success: true, activity });
}
