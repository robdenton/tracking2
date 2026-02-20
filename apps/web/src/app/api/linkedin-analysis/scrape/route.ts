import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseLinkedInFeed, extractSlug } from "@/lib/parse-linkedin-feed";
import { categorisePosts } from "@/lib/categorise-linkedin-posts";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; pageText?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, pageText, force = false } = body;

  if (!url || typeof url !== "string") {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  if (!url.includes("linkedin.com/company/")) {
    return Response.json(
      { error: "URL must be a LinkedIn company URL (linkedin.com/company/...)" },
      { status: 400 }
    );
  }

  const slug = extractSlug(url);
  if (!slug) {
    return Response.json(
      { error: "Could not extract company slug from URL" },
      { status: 400 }
    );
  }

  if (!pageText || typeof pageText !== "string" || pageText.trim().length < 50) {
    return Response.json(
      { error: "pageText is required. Paste the full page text from the LinkedIn company posts page." },
      { status: 400 }
    );
  }

  // Check for recent cached analysis (< 24 hours) unless force refresh
  if (!force) {
    const existing = await prisma.linkedInCompany.findUnique({
      where: { slug },
      include: { posts: true },
    });

    if (existing && existing.posts.length > 0) {
      const ageMs = Date.now() - existing.scrapedAt.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (ageMs < twentyFourHours) {
        return Response.json({
          companySlug: slug,
          companyName: existing.name,
          cached: true,
          scrapedAt: existing.scrapedAt.toISOString(),
          postCount: existing.posts.length,
        });
      }
    }
  }

  // Check Anthropic API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to your environment variables.",
      },
      { status: 503 }
    );
  }

  // Parse posts from raw page text
  const parseResult = parseLinkedInFeed(pageText);

  if (parseResult.posts.length === 0) {
    return Response.json(
      {
        error:
          "No posts could be parsed from the pasted text. Make sure you copied the full page content from the LinkedIn company posts page (Cmd+A then Cmd+C).",
      },
      { status: 422 }
    );
  }

  // Categorise posts with Claude
  let categorisedPosts;
  try {
    categorisedPosts = await categorisePosts(parseResult.posts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Categorisation failed: ${msg}` },
      { status: 500 }
    );
  }

  // Persist to database
  const companyName = parseResult.companyName ?? slug;
  const company = await prisma.linkedInCompany.upsert({
    where: { slug },
    create: {
      slug,
      name: companyName,
      linkedinUrl: url,
      scrapedAt: new Date(),
    },
    update: {
      name: companyName,
      linkedinUrl: url,
      scrapedAt: new Date(),
    },
  });

  // Delete old posts and re-insert fresh ones
  await prisma.linkedInCompanyPost.deleteMany({
    where: { companyId: company.id },
  });

  await prisma.linkedInCompanyPost.createMany({
    data: categorisedPosts.map((p) => ({
      companyId: company.id,
      postText: p.postText,
      postDate: p.postDate,
      postUrl: null,
      likes: p.likes,
      comments: p.comments,
      reposts: p.reposts,
      views: null,
      category: p.category,
      categoryReasoning: p.categoryReasoning,
    })),
  });

  return Response.json({
    companySlug: slug,
    companyName,
    cached: false,
    scrapedAt: company.scrapedAt.toISOString(),
    postCount: categorisedPosts.length,
  });
}
