import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DateRangePicker } from "@/app/channels/newsletter/date-range-picker";
import { MentionsTable } from "./mentions-table";
import { ViewToggle } from "./view-toggle";
import { ClassificationToggle } from "./classification-toggle";
import { GroupToggle } from "./group-toggle";
import { ExportButton } from "./export-button";
import { TrendsChart } from "./trends-chart";
import { PodcastsTable } from "./podcasts-table";

export const dynamic = "force-dynamic";

interface SearchParams {
  startDate?: string;
  endDate?: string;
  view?: "organic" | "paid" | "all";
  classification?: "product" | "all" | "unclassified";
  group?: "episodes" | "podcasts";
}

const MONTH_LABEL = (m: string) => {
  // m is "YYYY-MM"
  const [y, mo] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
};

export default async function OrganicPodcastMentionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = sp.view ?? "organic";
  const classification = sp.classification ?? "product";
  const group = sp.group ?? "episodes";
  const startDate = sp.startDate ?? "";
  const endDate = sp.endDate ?? "";

  const filterWhere = {
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

  // Mentions for the episodes table (current view)
  const mentions = await prisma.podscanMention.findMany({
    where: filterWhere,
    orderBy: [
      { podcastAudienceSize: { sort: "desc", nulls: "last" } },
      { postedAt: "desc" },
    ],
  });

  // Charts data: same date + classification filters, but ALWAYS includes
  // both organic and paid so the user can compare them. The chart component
  // has its own internal toggle for showing/hiding paid.
  const chartWhere = {
    excluded: false,
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
  const chartMentions =
    view === "organic" || view === "paid"
      ? await prisma.podscanMention.findMany({
          where: chartWhere,
          select: {
            postedAt: true,
            isSponsored: true,
            podcastId: true,
            podcastAudienceSize: true,
          },
        })
      : mentions; // when view='all' we already have everything

  // Build per-podcast aggregation from the SAME filtered set
  const podcastAgg = new Map<
    string,
    {
      podcastId: string;
      podcastName: string | null;
      podcastAudienceSize: number | null;
      totalMentions: number;
      organicMentions: number;
      paidMentions: number;
      firstMention: string | null;
      lastMention: string | null;
    }
  >();
  for (const m of mentions) {
    let agg = podcastAgg.get(m.podcastId);
    if (!agg) {
      agg = {
        podcastId: m.podcastId,
        podcastName: m.podcastName,
        podcastAudienceSize: m.podcastAudienceSize,
        totalMentions: 0,
        organicMentions: 0,
        paidMentions: 0,
        firstMention: null,
        lastMention: null,
      };
      podcastAgg.set(m.podcastId, agg);
    }
    agg.totalMentions++;
    if (m.isSponsored) agg.paidMentions++;
    else agg.organicMentions++;
    if (m.postedAt) {
      if (!agg.firstMention || m.postedAt < agg.firstMention)
        agg.firstMention = m.postedAt;
      if (!agg.lastMention || m.postedAt > agg.lastMention)
        agg.lastMention = m.postedAt;
    }
  }
  const podcasts = [...podcastAgg.values()];

  // Build monthly trends from chartMentions (ignores view filter so we
  // always have both organic + paid). Reach is sum of UNIQUE podcast
  // audiences per month (a podcast counted once even with multiple eps).
  const monthMap = new Map<
    string,
    {
      organic: number;
      paid: number;
      organicPodcasts: Map<string, number>; // podcastId -> audience
      paidPodcasts: Map<string, number>;
    }
  >();
  for (const m of chartMentions) {
    if (!m.postedAt) continue;
    const month = m.postedAt.slice(0, 7); // "YYYY-MM"
    let row = monthMap.get(month);
    if (!row) {
      row = {
        organic: 0,
        paid: 0,
        organicPodcasts: new Map(),
        paidPodcasts: new Map(),
      };
      monthMap.set(month, row);
    }
    if (m.isSponsored) {
      row.paid++;
      if (m.podcastAudienceSize && !row.paidPodcasts.has(m.podcastId)) {
        row.paidPodcasts.set(m.podcastId, m.podcastAudienceSize);
      }
    } else {
      row.organic++;
      if (m.podcastAudienceSize && !row.organicPodcasts.has(m.podcastId)) {
        row.organicPodcasts.set(m.podcastId, m.podcastAudienceSize);
      }
    }
  }
  const trendData = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      monthLabel: MONTH_LABEL(month),
      organic: v.organic,
      paid: v.paid,
      organicReach: [...v.organicPodcasts.values()].reduce((s, a) => s + a, 0),
      paidReach: [...v.paidPodcasts.values()].reduce((s, a) => s + a, 0),
    }));

  // Summary counts (ignore date filter for the totals at top)
  const [
    totalProductOrganic,
    totalProductPaid,
    totalFood,
    totalAmbiguous,
    totalUnclassified,
    totalExcluded,
    latestSync,
    latestClassify,
  ] = await Promise.all([
    prisma.podscanMention.count({
      where: {
        excluded: false,
        llmClassification: "product",
        isSponsored: { not: true },
      },
    }),
    prisma.podscanMention.count({
      where: {
        excluded: false,
        llmClassification: "product",
        isSponsored: true,
      },
    }),
    prisma.podscanMention.count({
      where: { excluded: false, llmClassification: "food" },
    }),
    prisma.podscanMention.count({
      where: { excluded: false, llmClassification: "ambiguous" },
    }),
    prisma.podscanMention.count({
      where: { excluded: false, llmClassification: null },
    }),
    prisma.podscanMention.count({ where: { excluded: true } }),
    prisma.cronExecution.findFirst({
      where: { taskName: "sync-podscan" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.cronExecution.findFirst({
      where: { taskName: "classify-podscan" },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  const totalProduct = totalProductOrganic + totalProductPaid;
  const visibleCount = mentions.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organic Podcast Mentions</h1>
        <p className="text-sm text-text-secondary mt-1">
          Episodes that mention Granola, discovered via Podscan transcript
          search. Toggle between organic mentions (audience discussion) and
          paid sponsor reads.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Credible Mentions
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalProduct}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {totalProductOrganic} organic · {totalProductPaid} paid
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Filtered: Food
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalFood}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Ambiguous
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalAmbiguous}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Unclassified
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalUnclassified}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            +{totalExcluded} excluded
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Last Updated
          </div>
          <div className="text-xs font-display text-text-primary tracking-tight">
            Sync:{" "}
            {latestSync?.completedAt
              ? new Date(latestSync.completedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never"}
          </div>
          <div className="text-xs font-display text-text-primary tracking-tight mt-0.5">
            Classify:{" "}
            {latestClassify?.completedAt
              ? new Date(latestClassify.completedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never"}
          </div>
        </div>
      </div>

      {/* Monthly trends */}
      {trendData.length > 0 && (
        <div className="mb-6">
          <TrendsChart data={trendData} />
        </div>
      )}

      {/* Filters + export */}
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle current={view} />
          <ClassificationToggle current={classification} />
          <GroupToggle current={group} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Suspense>
            <ExportButton />
          </Suspense>
          <Suspense>
            <DateRangePicker startDate={startDate} endDate={endDate} />
          </Suspense>
        </div>
      </div>
      <div className="mb-5 text-xs text-text-muted">
        Showing <span className="font-medium text-text-secondary">{visibleCount.toLocaleString()}</span>{" "}
        {view === "organic"
          ? "organic"
          : view === "paid"
            ? "paid"
            : "all"}{" "}
        {classification === "product"
          ? "credible "
          : classification === "unclassified"
            ? "unclassified "
            : ""}
        mention{visibleCount === 1 ? "" : "s"}
        {startDate || endDate ? " in selected date range" : ""}.
        {view === "organic" && classification === "product" && !startDate && !endDate && (
          <span> Total credible across both views: {totalProduct}.</span>
        )}
      </div>

      {/* Episodes table OR podcasts table */}
      {mentions.length === 0 ? (
        <div className="bg-surface border border-border-light rounded-lg p-8 text-center">
          <p className="text-text-muted">
            No {view === "all" ? "" : view} mentions in this range yet.
          </p>
          <p className="text-xs text-text-muted mt-2">
            New mentions are discovered daily.
          </p>
        </div>
      ) : group === "podcasts" ? (
        <PodcastsTable podcasts={podcasts} />
      ) : (
        <MentionsTable mentions={mentions} view={view} />
      )}
    </div>
  );
}
