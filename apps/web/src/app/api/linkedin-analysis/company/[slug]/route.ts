import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const company = await prisma.linkedInCompany.findUnique({
    where: { slug },
    include: {
      posts: {
        orderBy: { postDate: "desc" },
      },
    },
  });

  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  return Response.json(company);
}
