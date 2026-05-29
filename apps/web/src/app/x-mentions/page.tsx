import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DateRangePicker } from "@/app/channels/newsletter/date-range-picker";
import { XMentionsTable } from "./mentions-table";
import { ClassificationToggle } from "./classification-toggle";
import { ExportButton } from "./export-button";
import { XTrendsChart } from "./trends-chart";

export const dynamic = "force-dynamic";

interface SearchParams {
  startDate?: string;
  endDate?: string;
  classification?: "product" | "all" | "unclassified";
}

const DAY_LABEL = (s: string) => {
  // "YYYY-MM-DD"
  const d = new Date(s + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export default async function XMentionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const classification = sp.classification ?? "product";
  const startDate = sp.startDate ?? "";
  const endDate = sp.endDate ?? "";

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

  // Build daily trend (only count credible product mentions for the chart,
  // matching the default view)
  const chartWhere = {
    excluded: false,
    llmClassification: "product",
    ...(startDate || endDate
      ? {
          postedAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };
  const chartMentions = await prisma.xMention.findMany({
    where: chartWhere,
    select: { postedAt: true, impressionCount: true },
  });
  const dayMap = new Map<
    string,
    { mentions: number; impressions: number }
  >();
  for (const m of chartMentions) {
    const day = m.postedAt.toISOString().slice(0, 10);
    let row = dayMap.get(day);
    if (!row) {
      row = { mentions: 0, impressions: 0 };
      dayMap.set(day, row);
    }
    row.mentions++;
    row.impressions += m.impressionCount;
  }
  const trendData = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      day,
      dayLabel: DAY_LABEL(day),
      mentions: v.mentions,
      impressions: v.impressions,
    }));

  // Summary counts
  const [
    totalProduct,
    totalFood,
    totalAmbiguous,
    totalUnclassified,
    totalExcluded,
    totalImpressionsResult,
    latestSync,
    latestClassify,
  ] = await Promise.all([
    prisma.xMention.count({
      where: { excluded: false, llmClassification: "product" },
    }),
    prisma.xMention.count({
      where: { excluded: false, llmClassification: "food" },
    }),
    prisma.xMention.count({
      where: { excluded: false, llmClassification: "ambiguous" },
    }),
    prisma.xMention.count({
      where: { excluded: false, llmClassification: null },
    }),
    prisma.xMention.count({ where: { excluded: true } }),
    prisma.xMention.aggregate({
      where: { excluded: false, llmClassification: "product" },
      _sum: { impressionCount: true },
    }),
    prisma.cronExecution.findFirst({
      where: { taskName: "sync-x-mentions" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.cronExecution.findFirst({
      where: { taskName: "classify-x-mentions" },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  const totalImpressions = totalImpressionsResult._sum.impressionCount ?? 0;
  const visibleCount = mentions.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">X Mentions</h1>
        <p className="text-sm text-text-secondary mt-1">
          Tweets mentioning Granola, discovered via X Search Recent API. The
          AI classifier filters out granola-the-food posts. Tweets older than
          7 days can&apos;t be backfilled (X API limitation) — data accrues
          forward from when this tracker started.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Credible Mentions
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalProduct.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            AI-verified as Granola product
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Total Impressions
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalImpressions >= 1_000_000
              ? (totalImpressions / 1_000_000).toFixed(1) + "M"
              : totalImpressions >= 1_000
                ? (totalImpressions / 1_000).toFixed(0) + "k"
                : totalImpressions.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            Across credible mentions
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Filtered: Food
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalFood.toLocaleString()}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Awaiting Review
          </div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totalAmbiguous + totalUnclassified}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {totalAmbiguous} ambiguous · {totalUnclassified} new · {totalExcluded} excluded
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

      {/* Trends */}
      {trendData.length > 0 && (
        <div className="mb-6">
          <XTrendsChart data={trendData} />
        </div>
      )}

      {/* Filters + export */}
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <ClassificationToggle current={classification} />
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
        {classification === "product"
          ? "credible "
          : classification === "unclassified"
            ? "unclassified "
            : ""}
        tweet{visibleCount === 1 ? "" : "s"}
        {startDate || endDate ? " in selected date range" : ""}.
      </div>

      {mentions.length === 0 ? (
        <div className="bg-surface border border-border-light rounded-lg p-8 text-center">
          <p className="text-text-muted">No tweets in this view yet.</p>
          <p className="text-xs text-text-muted mt-2">
            The daily sync cron will start populating data once the X_BEARER_TOKEN env var is set.
          </p>
        </div>
      ) : (
        <XMentionsTable mentions={mentions} />
      )}
    </div>
  );
}
