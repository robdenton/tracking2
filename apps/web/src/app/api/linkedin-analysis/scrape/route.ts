import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  scrapeLinkedInCompany,
  extractSlug,
} from "@/lib/scrape-linkedin-company";
import { categorisePosts } from "@/lib/categorise-linkedin-posts";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, force = false } = body;

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

  // Check for recent cached analysis (< 24 hours) unless force refresh
  if (!force) {
    const existing = await prisma.linkedInCompany.findUnique({
      where: { slug },
      include: { posts: true },
    });

    if (existing) {
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

  // Check Anthropic API key before starting the expensive scrape
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to your .env file to enable post categorisation.",
      },
      { status: 503 }
    );
  }

  // Scrape the company feed
  let scrapeResult;
  try {
    scrapeResult = await scrapeLinkedInCompany(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Scraping failed: ${msg}` },
      { status: 500 }
    );
  }

  if (scrapeResult.authWall) {
    return Response.json(
      {
        error:
          "LinkedIn requires login to view this page. The scraper hit an authentication wall. Try again after ensuring the company page is publicly visible.",
        authWall: true,
      },
      { status: 403 }
    );
  }

  if (scrapeResult.posts.length === 0) {
    return Response.json(
      {
        error:
          "No posts were found on this page. The company may have no public posts, or the page structure could not be parsed.",
      },
      { status: 422 }
    );
  }

  // Categorise posts with Claude
  let categorisedPosts;
  try {
    categorisedPosts = await categorisePosts(scrapeResult.posts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Categorisation failed: ${msg}` },
      { status: 500 }
    );
  }

  // Persist to database — delete old posts for this company and re-insert
  const company = await prisma.linkedInCompany.upsert({
    where: { slug },
    create: {
      slug,
      name: scrapeResult.companyName,
      linkedinUrl: url,
      scrapedAt: new Date(),
    },
    update: {
      name: scrapeResult.companyName ?? undefined,
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
      postUrl: p.postUrl,
      likes: p.likes,
      comments: p.comments,
      reposts: p.reposts,
      views: p.views,
      category: p.category,
      categoryReasoning: p.categoryReasoning,
    })),
  });

  return Response.json({
    companySlug: slug,
    companyName: scrapeResult.companyName,
    cached: false,
    scrapedAt: company.scrapedAt.toISOString(),
    postCount: categorisedPosts.length,
  });
}
