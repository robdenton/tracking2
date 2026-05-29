import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const classification = url.searchParams.get("classification") ?? "product";
  const startDate = url.searchParams.get("startDate") ?? "";
  const endDate = url.searchParams.get("endDate") ?? "";

  const where = {
    excluded: false,
    ...(classification === "product"
      ? { llmClassification: "product" }
      : classification === "unclassified"
        ? { llmClassification: null }
        : {}),
    ...(startDate || endDate
      ? {
          postedAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };

  const mentions = await prisma.xMention.findMany({
    where,
    orderBy: [{ impressionCount: "desc" }, { postedAt: "desc" }],
  });

  const headers = [
    "posted_at",
    "author_username",
    "author_name",
    "author_followers",
    "author_verified",
    "text",
    "impressions",
    "likes",
    "retweets",
    "replies",
    "quotes",
    "bookmarks",
    "ai_classification",
    "ai_reasoning",
    "tweet_id",
    "tweet_url",
  ];

  const rows = mentions.map((m) => [
    m.postedAt.toISOString(),
    m.authorUsername ?? "",
    m.authorName ?? "",
    m.authorFollowers ?? "",
    m.authorVerified === null ? "" : m.authorVerified ? "yes" : "no",
    m.text,
    m.impressionCount,
    m.likeCount,
    m.retweetCount,
    m.replyCount,
    m.quoteCount,
    m.bookmarkCount,
    m.llmClassification ?? "",
    m.llmReasoning ?? "",
    m.tweetId,
    m.authorUsername
      ? `https://x.com/${m.authorUsername}/status/${m.tweetId}`
      : `https://x.com/i/status/${m.tweetId}`,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `granola_x_mentions_${classification}_${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Row-Count": String(mentions.length),
    },
  });
}
