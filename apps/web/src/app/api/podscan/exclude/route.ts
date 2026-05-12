import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const episodeId = (body as { episodeId?: string }).episodeId;
  if (!episodeId) {
    return Response.json({ error: "episodeId required" }, { status: 400 });
  }

  await prisma.podscanMention.update({
    where: { episodeId },
    data: { excluded: true },
  });

  return Response.json({ ok: true });
}
