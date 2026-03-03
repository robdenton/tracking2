import {
  getYouTubeChannelsWithDailyViews,
  getImportedVideosWithDailyViews,
  getPendingSearchResults,
} from "@/lib/data";
import Link from "next/link";
import { ChannelTable } from "./ChannelTable";

export const dynamic = "force-dynamic";

export default async function YouTubeImportPage() {
  const [{ channels, dates }, { videos }, pendingResults] = await Promise.all([
    getYouTubeChannelsWithDailyViews(10),
    getImportedVideosWithDailyViews(10),
    getPendingSearchResults(),
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

      {/* Channels Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Channels</h2>
      </div>

      {channels.length === 0 ? (
        <p className="text-gray-400">No imported videos yet</p>
      ) : (
        <ChannelTable channels={channels} dates={dates} />
      )}
    </div>
  );
}
