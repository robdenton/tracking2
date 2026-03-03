import { getChannelVideosWithDailyViews } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VideoTable } from "../../VideoTable";

export const dynamic = "force-dynamic";

export default async function ChannelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const channelTitle = decodeURIComponent(slug);

  const { videos, dates } = await getChannelVideosWithDailyViews(channelTitle, 10);

  if (videos.length === 0) return notFound();

  const totalViews = videos.reduce((sum, v) => sum + (v.totalViews || 0), 0);
  const paidCount = videos.filter((v) => v.source === "paid_sponsorship").length;
  const organicCount = videos.length - paidCount;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link
          href="/youtube-import"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          YouTube Tracking
        </Link>
        <span className="mx-1">/</span>
        <span>{channelTitle}</span>
      </div>

      <h1 className="text-2xl font-bold mb-6">{channelTitle}</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Videos</div>
          <div className="text-2xl font-mono">{videos.length}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Total Views</div>
          <div className="text-2xl font-mono">{totalViews.toLocaleString()}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Organic</div>
          <div className="text-2xl font-mono">{organicCount}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-1">Paid Sponsorship</div>
          <div className="text-2xl font-mono">{paidCount}</div>
        </div>
      </div>

      {/* Videos Table */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Videos</h2>
      </div>

      <VideoTable videos={videos} dates={dates} />
    </div>
  );
}
