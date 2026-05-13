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
  const view = url.searchParams.get("view") ?? "organic";
  const classification = url.searchParams.get("classification") ?? "product";
  const startDate = url.searchParams.get("startDate") ?? "";
  const endDate = url.searchParams.get("endDate") ?? "";

  const where = {
    excluded: false,
    ...(view === "organic" ? { isSponsored: false } : {}),
    ...(view === "paid" ? { isSponsored: true } : {}),
    ...(classification === "product"
      ? { llmClassification: "product" }
      : classification === "unclassified"
        ? { llmClassification: null }
        : {}),
    ...(startDate || endDate
      ? {
          postedAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate + "T23:59:59Z" } : {}),
          },
        }
      : {}),
  };

  const mentions = await prisma.podscanMention.findMany({
    where,
    orderBy: [
      { podcastAudienceSize: { sort: "desc", nulls: "last" } },
      { postedAt: "desc" },
    ],
  });

  const headers = [
    "date",
    "podcast",
    "episode_title",
    "estimated_audience",
    "podcast_reach_score",
    "ai_classification",
    "ai_reasoning",
    "is_sponsored",
    "sponsor_confidence",
    "matched_queries",
    "source_label",
    "duration_seconds",
    "episode_url",
    "podcast_id",
    "episode_id",
  ];

  const rows = mentions.map((m) => [
    m.postedAt?.slice(0, 10) ?? "",
    m.podcastName ?? "",
    m.episodeTitle ?? "",
    m.podcastAudienceSize ?? "",
    m.podcastReach ?? "",
    m.llmClassification ?? "",
    m.llmReasoning ?? "",
    m.isSponsored === null ? "" : m.isSponsored ? "paid" : "organic",
    m.sponsoredScore ?? "",
    m.matchedQueries ?? "",
    m.confidenceTier ?? "",
    m.durationSec ?? "",
    m.episodeUrl ?? "",
    m.podcastId,
    m.episodeId,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `granola_podcast_mentions_${view}_${classification}_${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Row-Count": String(mentions.length),
    },
  });
}
