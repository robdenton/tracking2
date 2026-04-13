import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { groupId, tag } = body as { groupId: string; tag: string | null };

  if (!groupId) {
    return Response.json({ error: "groupId is required" }, { status: 400 });
  }

  const result = await prisma.dubGroupMeta.upsert({
    where: { groupId },
    create: { groupId, tag: tag || null },
    update: { tag: tag || null },
  });

  return Response.json({ success: true, result });
}
