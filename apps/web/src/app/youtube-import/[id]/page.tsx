import { getImportedVideoById, getImportedVideoViews } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ImportedVideoDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [video, views] = await Promise.all([
    getImportedVideoById(id),
    getImportedVideoViews(id),
  ]);

  if (!video) return notFound();

  const latestViews = views.length > 0 ? views[views.length - 1].viewCount : null;
  const firstViews = views.length > 0 ? views[0].viewCount : null;
  const growth = latestViews !== null && firstViews !== null ? latestViews - firstViews : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
        <div className="text-sm text-gray-500 mb-2">
          {video.channelTitle} • Published {video.publishedAt} • Imported {video.importedDate}
        </div>
        <a href={video.url} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
          View on YouTube →
        </a>
      </div>

      {/* Performance Stats */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Latest Views</div>
            <div className="text-xl font-mono">{latestViews !== null ? latestViews.toLocaleString() : '—'}</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">First Tracked</div>
            <div className="text-xl font-mono">{firstViews !== null ? firstViews.toLocaleString() : '—'}</div>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Growth</div>
            <div className="text-xl font-mono">
              {growth !== null ? `+${growth.toLocaleString()}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* View History Table */}
      <div>
        <h2 className="text-sm font-semibold mb-2">View History</h2>
        {views.length === 0 ? (
          <p className="text-gray-400">No view data yet. Run `npm run track-imported-views` to start tracking.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Daily Change</th>
                </tr>
              </thead>
              <tbody>
                {views.map((view, i) => {
                  const prevViews = i > 0 ? views[i - 1].viewCount : null;
                  const dailyChange = prevViews !== null ? view.viewCount - prevViews : null;

                  return (
                    <tr key={view.date} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="py-2">{view.date}</td>
                      <td className="py-2 text-right font-mono">{view.viewCount.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono">
                        {dailyChange !== null ? `+${dailyChange.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
