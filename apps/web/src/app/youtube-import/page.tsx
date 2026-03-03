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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Channels</div>
          <div className="text-2xl font-mono">{totalChannels}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Total Videos</div>
          <div className="text-2xl font-mono">{videos.length}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Total Views</div>
          <div className="text-2xl font-mono">{totalViews.toLocaleString()}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Pending Review</div>
          <div className="text-2xl font-mono">{pendingResults.length}</div>
        </div>
      </div>

      {/* Pending Review Link */}
      {pendingResults.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Link
            href="/youtube-import/review"
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            Review {pendingResults.length} pending video
            {pendingResults.length !== 1 ? "s" : ""} &rarr;
          </Link>
        </div>
      )}

      {/* Chart: Weekly Views vs Acquisition */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Weekly Views vs User Acquisition
        </h2>
        <YouTubeChart data={chartData} />
      </div>

      {/* Table with Channel/Video Toggle */}
      {channels.length === 0 ? (
        <p className="text-gray-400">No imported videos yet</p>
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
