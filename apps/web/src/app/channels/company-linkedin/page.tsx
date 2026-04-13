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
        <p className="text-sm text-text-secondary mt-1">
          Posts and engagement from the Granola company LinkedIn page
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Total Posts (2026)</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totals.totalPosts}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Total Engagement</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totals.totalEngagement.toLocaleString()}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Reactions</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totals.totalReactions.toLocaleString()}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Comments</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totals.totalComments.toLocaleString()}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Avg Eng. / Post</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
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
        <div className="text-center py-12 text-text-muted">
          <p className="text-lg mb-2">No company posts synced yet</p>
          <p className="text-sm">
            Posts will appear here after the daily sync runs.
          </p>
        </div>
      )}
    </div>
  );
}
