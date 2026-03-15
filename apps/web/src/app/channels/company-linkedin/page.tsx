import {
  getCompanyLinkedInWeeklyStats,
  getCompanyLinkedInTotals,
  getTopCompanyPosts,
} from "@/lib/data";
import { CompanyLinkedInCharts } from "./charts";
import { CompanyTopPostsTable } from "./top-posts-table";

export const dynamic = "force-dynamic";

export default async function CompanyLinkedInPage() {
  const [weeklyStats, totals, topPosts] = await Promise.all([
    getCompanyLinkedInWeeklyStats(),
    getCompanyLinkedInTotals(),
    getTopCompanyPosts(20),
  ]);

  const avgEngagementPerPost =
    totals.totalPosts > 0
      ? Math.round(totals.totalEngagement / totals.totalPosts)
      : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Company LinkedIn</h1>
        <p className="text-sm text-gray-500 mt-1">
          Posts and engagement from the Granola company LinkedIn page
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Posts (2026)</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalPosts}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Engagement</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalEngagement.toLocaleString()}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Reactions</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalReactions.toLocaleString()}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Comments</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalComments.toLocaleString()}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Avg Engagement / Post</div>
          <div className="text-2xl font-mono font-semibold">
            {avgEngagementPerPost}
          </div>
        </div>
      </div>

      {/* Charts */}
      {weeklyStats.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            Weekly Reach &amp; Engagement
          </h2>
          <CompanyLinkedInCharts data={weeklyStats.data} />
        </div>
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Top Posts</h2>
          <CompanyTopPostsTable posts={topPosts} />
        </div>
      )}

      {totals.totalPosts === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No company posts synced yet</p>
          <p className="text-sm">
            Posts will appear here after the daily sync runs.
          </p>
        </div>
      )}
    </div>
  );
}
