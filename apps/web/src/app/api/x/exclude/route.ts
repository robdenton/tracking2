import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tweetId = (body as { tweetId?: string }).tweetId;
  if (!tweetId) {
    return Response.json({ error: "tweetId required" }, { status: 400 });
  }

  await prisma.xMention.update({
    where: { tweetId },
    data: { excluded: true },
  });

  return Response.json({ ok: true });
}
