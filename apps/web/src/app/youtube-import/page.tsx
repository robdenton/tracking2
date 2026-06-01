import { Suspense } from "react";
import {
  getYouTubeChannelsWithDailyViews,
  getImportedVideosWithDailyViews,
  getPendingSearchResults,
  getYouTubeWeeklyTimeSeries,
} from "@/lib/data";
import Link from "next/link";
import { YouTubeTableToggle } from "./YouTubeTableToggle";
import { YouTubeChart } from "./chart";
import { DateRangePicker } from "@/app/channels/newsletter/date-range-picker";

export const dynamic = "force-dynamic";

const MAX_DAYS = 60;
const DEFAULT_DAYS = 10;

function clampDays(n: number) {
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(Math.max(Math.round(n), 1), MAX_DAYS);
}

/** Compute number of days (inclusive) between two YYYY-MM-DD strings. */
function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T00:00:00Z").getTime();
  const b = new Date(end + "T00:00:00Z").getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

interface SearchParams {
  startDate?: string;
  endDate?: string;
}

export default async function YouTubeImportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  let startDate = sp.startDate ?? "";
  let endDate = sp.endDate ?? "";

  // Derive (days, endDate) for the data functions
  let days = DEFAULT_DAYS;
  let endAnchor: string | undefined;
  if (startDate && endDate) {
    days = clampDays(daysBetween(startDate, endDate));
    endAnchor = endDate;
    // If clamping shrunk the range, also shift startDate so the picker UI reflects what we're showing
    const adjustedStart = new Date(endDate + "T00:00:00Z");
    adjustedStart.setUTCDate(adjustedStart.getUTCDate() - (days - 1));
    startDate = adjustedStart.toISOString().slice(0, 10);
  } else if (endDate) {
    endAnchor = endDate;
  } else if (startDate) {
    // Just a start date — go forward up to DEFAULT_DAYS
    days = DEFAULT_DAYS;
    const end = new Date(startDate + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() + (days - 1));
    endAnchor = end.toISOString().slice(0, 10);
    endDate = endAnchor;
  }

  const [{ channels, dates }, { videos }, pendingResults, chartData] =
    await Promise.all([
      getYouTubeChannelsWithDailyViews(days, endAnchor),
      getImportedVideosWithDailyViews(days, endAnchor),
      getPendingSearchResults(),
      getYouTubeWeeklyTimeSeries(),
    ]);

  const totalViews = videos.reduce((sum, v) => sum + (v.totalViews || 0), 0);
  const totalChannels = channels.length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">YouTube Tracking</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Channels</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">{totalChannels}</div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Total Videos</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">{videos.length}</div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Total Views</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">{totalViews.toLocaleString()}</div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Pending Review</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">{pendingResults.length}</div>
        </div>
      </div>

      {/* Pending Review Link */}
      {pendingResults.length > 0 && (
        <div className="mb-6 p-4 bg-accent-light/20 border border-accent-light rounded-lg">
          <Link
            href="/youtube-import/review"
            className="text-accent-strong hover:underline font-semibold"
          >
            Review {pendingResults.length} pending video
            {pendingResults.length !== 1 ? "s" : ""} &rarr;
          </Link>
        </div>
      )}

      {/* Chart: Weekly Views vs Acquisition */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Weekly Views vs User Acquisition
        </h2>
        <div className="bg-surface border border-border-light rounded-lg p-5">
          <YouTubeChart data={chartData} />
        </div>
      </div>

      {/* Date range picker for the per-day table */}
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div className="text-xs text-text-muted">
          Showing{" "}
          <span className="font-medium text-text-secondary">{dates.length}</span>{" "}
          day{dates.length === 1 ? "" : "s"} · {dates[0]} →{" "}
          {dates[dates.length - 1]}
          {days >= MAX_DAYS && (
            <span className="ml-2 text-[#B85C38]">
              (capped at {MAX_DAYS} days max)
            </span>
          )}
        </div>
        <Suspense>
          <DateRangePicker startDate={startDate} endDate={endDate} />
        </Suspense>
      </div>

      {/* Table with Channel/Video Toggle */}
      {channels.length === 0 ? (
        <p className="text-text-muted">No imported videos yet</p>
      ) : (
        <YouTubeTableToggle
          channels={channels}
          videos={videos}
          dates={dates}
        />
      )}
    </div>
  );
}
