import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dub/mappings
 *
 * Returns all saved Dub → newsletter partner mappings.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mappings = await prisma.dubNewsletterMapping.findMany({
    orderBy: { partnerName: "asc" },
  });

  return NextResponse.json(mappings);
}

/**
 * POST /api/dub/mappings
 *
 * Save or update a Dub link → newsletter partner mapping.
 * Body: { shortLink: string, partnerName: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortLink, partnerName } = await req.json();

  if (!shortLink || !partnerName) {
    return NextResponse.json(
      { error: "shortLink and partnerName are required" },
      { status: 400 }
    );
  }

  const mapping = await prisma.dubNewsletterMapping.upsert({
    where: { shortLink },
    create: { shortLink, partnerName },
    update: { partnerName },
  });

  return NextResponse.json(mapping);
}

/**
 * DELETE /api/dub/mappings
 *
 * Remove a mapping by shortLink.
 * Body: { shortLink: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortLink } = await req.json();

  if (!shortLink) {
    return NextResponse.json(
      { error: "shortLink is required" },
      { status: 400 }
    );
  }

  try {
    await prisma.dubNewsletterMapping.delete({ where: { shortLink } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
  }
}
