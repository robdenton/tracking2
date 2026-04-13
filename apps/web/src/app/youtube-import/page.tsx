import {
  getYouTubeChannelsWithDailyViews,
  getImportedVideosWithDailyViews,
  getPendingSearchResults,
  getYouTubeWeeklyTimeSeries,
} from "@/lib/data";
import Link from "next/link";
import { YouTubeTableToggle } from "./YouTubeTableToggle";
import { YouTubeChart } from "./chart";

export const dynamic = "force-dynamic";

export default async function YouTubeImportPage() {
  const [{ channels, dates }, { videos }, pendingResults, chartData] =
    await Promise.all([
      getYouTubeChannelsWithDailyViews(10),
      getImportedVideosWithDailyViews(10),
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
