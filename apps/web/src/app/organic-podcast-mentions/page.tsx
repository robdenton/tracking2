import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DateRangePicker } from "@/app/channels/newsletter/date-range-picker";
import { MentionsTable } from "./mentions-table";
import { ViewToggle } from "./view-toggle";
import { ClassificationToggle } from "./classification-toggle";

export const dynamic = "force-dynamic";

interface SearchParams {
  startDate?: string;
  endDate?: string;
  view?: "organic" | "paid" | "all";
  classification?: "product" | "all" | "unclassified";
}

export default async function OrganicPodcastMentionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = sp.view ?? "organic";
  const classification = sp.classification ?? "product";
  const startDate = sp.startDate ?? "";
  const endDate = sp.endDate ?? "";

  // Server-side filter: classification gates the default view to LLM-verified
  // product mentions only. Toggle to "all" to also see food/ambiguous matches.
  const mentions = await prisma.podscanMention.findMany({
    where: {
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
    },
    orderBy: [
      { podcastAudienceSize: { sort: "desc", nulls: "last" } },
      { postedAt: "desc" },
    ],
  });

  // Summary counts (ignore date filter for the totals at top)
  const [
    totalProduct,
    totalFood,
    totalAmbiguous,
    totalUnclassified,
    totalExcluded,
    latestSync,
    latestClassify,
  ] = await Promise.all([
    prisma.podscanMention.count({
      where: { excluded: false, llmClassification: "product" },
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
            AI-verified as Granola product
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

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <ViewToggle current={view} />
          <ClassificationToggle current={classification} />
        </div>
        <Suspense>
          <DateRangePicker startDate={startDate} endDate={endDate} />
        </Suspense>
      </div>

      {/* Table */}
      {mentions.length === 0 ? (
        <div className="bg-surface border border-border-light rounded-lg p-8 text-center">
          <p className="text-text-muted">
            No {view === "all" ? "" : view} mentions in this range yet.
          </p>
          <p className="text-xs text-text-muted mt-2">
            New mentions are discovered daily.
          </p>
        </div>
      ) : (
        <MentionsTable mentions={mentions} view={view} />
      )}
    </div>
  );
}
