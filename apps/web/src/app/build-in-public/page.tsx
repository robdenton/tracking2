import { auth } from "@/lib/auth";
import {
  getEmployeeLinkedInWeeklyStats,
  getEmployeeLinkedInBreakdown,
  getTopEmployeePosts,
  getUserLinkedInAccount,
  getConnectedLinkedInAccounts,
} from "@/lib/data";
import { BuildInPublicCharts } from "./charts";
import { EmployeeTable } from "./employee-table";
import { TopPostsTable } from "./top-posts-table";
import { ConnectLinkedInButton } from "./connect-button";

export const dynamic = "force-dynamic";

export default async function BuildInPublicPage() {
  const session = await auth();
  const [weeklyStats, breakdown, topPosts, connectedAccounts] =
    await Promise.all([
      getEmployeeLinkedInWeeklyStats(),
      getEmployeeLinkedInBreakdown(),
      getTopEmployeePosts(20),
      getConnectedLinkedInAccounts(),
    ]);

  const userAccount = session?.user?.id
    ? await getUserLinkedInAccount(session.user.id)
    : null;

  const totalImpressions = breakdown.reduce(
    (s, e) => s + e.totalImpressions,
    0
  );
  const totalEngagement = breakdown.reduce(
    (s, e) => s + e.totalReactions + e.totalComments + e.totalReposts,
    0
  );
  const totalPosts = breakdown.reduce((s, e) => s + e.postCount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Build in Public</h1>
          <p className="text-sm text-gray-500 mt-1">
            Aggregate LinkedIn reach and engagement across connected employees
          </p>
        </div>
        <ConnectLinkedInButton
          account={
            userAccount
              ? {
                  status: userAccount.status,
                  linkedinName: userAccount.linkedinName,
                  connectedAt: userAccount.connectedAt?.toISOString() ?? null,
                  lastSyncAt: userAccount.lastSyncAt?.toISOString() ?? null,
                  lastSyncError: userAccount.lastSyncError,
                  postCount: userAccount._count.posts,
                }
              : null
          }
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Connected Accounts</div>
          <div className="text-2xl font-mono font-semibold">
            {connectedAccounts.length}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Posts (2026)</div>
          <div className="text-2xl font-mono font-semibold">{totalPosts}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Impressions</div>
          <div className="text-2xl font-mono font-semibold">
            {totalImpressions.toLocaleString()}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Engagement</div>
          <div className="text-2xl font-mono font-semibold">
            {totalEngagement.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts */}
      {weeklyStats.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            Weekly Reach &amp; Engagement
          </h2>
          <BuildInPublicCharts
            employees={weeklyStats.employees}
            data={weeklyStats.data}
          />
        </div>
      )}

      {/* Per-employee breakdown */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Per-Employee Breakdown</h2>
        <EmployeeTable employees={breakdown} />
      </div>

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Top Posts</h2>
          <TopPostsTable posts={topPosts} />
        </div>
      )}
    </div>
  );
}
