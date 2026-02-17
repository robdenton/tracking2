import { getImportedVideos, getPendingSearchResults, getImportedVideoViews } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function YouTubeImportPage() {
  const [videos, pendingResults] = await Promise.all([
    getImportedVideos(),
    getPendingSearchResults(),
  ]);

  // Get latest view counts for each video
  const videosWithViews = await Promise.all(
    videos.map(async (video) => {
      const views = await getImportedVideoViews(video.id);
      const latestViews = views.length > 0 ? views[views.length - 1].viewCount : null;
      return { ...video, latestViews };
    })
  );

  const totalViews = videosWithViews.reduce((sum, v) => sum + (v.latestViews || 0), 0);
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">YouTube Import</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Total Videos</div>
          <div className="text-2xl font-mono">{videos.length}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Views</div>
          <div className="text-2xl font-mono">{avgViews.toLocaleString()}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Pending Review</div>
          <div className="text-2xl font-mono">{pendingResults.length}</div>
        </div>
      </div>

      {/* Pending Review Link */}
      {pendingResults.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Link href="/youtube-import/review" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Review {pendingResults.length} pending video{pendingResults.length !== 1 ? 's' : ''} →
          </Link>
        </div>
      )}

      {/* Imported Videos Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Imported Videos</h2>
      </div>

      {videos.length === 0 ? (
        <p className="text-gray-400">No imported videos yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="text-left py-2 px-3">Imported</th>
                <th className="text-left py-2 px-3">Title</th>
                <th className="text-left py-2 px-3">Channel</th>
                <th className="text-right py-2 px-3">Latest Views</th>
                <th className="text-center py-2 px-3">Link</th>
              </tr>
            </thead>
            <tbody>
              {videosWithViews.map(video => (
                <tr key={video.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="py-2 px-3">{video.importedDate}</td>
                  <td className="py-2 px-3">
                    <Link href={`/youtube-import/${video.id}`} className="hover:underline">
                      {video.title}
                    </Link>
                  </td>
                  <td className="py-2 px-3">{video.channelTitle}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {video.latestViews !== null ? video.latestViews.toLocaleString() : '—'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <a href={video.url} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                      YouTube →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
