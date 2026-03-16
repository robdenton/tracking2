import { auth } from "@/lib/auth";
import {
  getLinkedInAdsConnection,
  getLinkedInAdsCampaigns,
  getLinkedInAdsWeeklyStats,
  getLinkedInAdsTotals,
  type DateRange,
} from "@/lib/data";
import { ConnectLinkedInAdsButton } from "./connect-button";
import { LinkedInAdsCharts } from "./charts";
import { CampaignsTable } from "./campaigns-table";
import { DateRangePicker } from "@/app/components/DateRangePicker";

export const dynamic = "force-dynamic";

export default async function LinkedInAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const session = await auth();

  // Compute date range from URL params (same logic as build-in-public page)
  let dateRange: DateRange | undefined;
  if (from === "all") {
    dateRange = undefined;
  } else if (from || to) {
    const today = new Date().toISOString().slice(0, 10);
    const yearStart = `${new Date().getFullYear()}-01-01`;
    dateRange = { from: from ?? yearStart, to: to ?? today };
  } else {
    // Default: last 90 days
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    dateRange = {
      from: ninetyDaysAgo.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    };
  }

  const connection = await getLinkedInAdsConnection();

  // If no connection, show setup page
  if (!connection) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">LinkedIn Ads</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track ad campaign performance from LinkedIn Marketing API
            </p>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold mb-2">
            Connect LinkedIn Ads
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Connect your LinkedIn Ads account to start tracking campaign
            performance, spend, impressions, and clicks.
          </p>
          <ConnectLinkedInAdsButton connection={null} />
        </div>
      </div>
    );
  }

  // Fetch data in parallel
  const [campaigns, weeklyStats, totals] = await Promise.all([
    getLinkedInAdsCampaigns(),
    getLinkedInAdsWeeklyStats(dateRange),
    getLinkedInAdsTotals(dateRange),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">LinkedIn Ads</h1>
          <p className="text-sm text-gray-500 mt-1">
            Campaign performance from LinkedIn Marketing API
          </p>
        </div>
        <ConnectLinkedInAdsButton
          connection={{
            adAccountName: connection.adAccountName,
            connectedBy: connection.connectedBy,
            expiresAt: connection.expiresAt.toISOString(),
          }}
        />
      </div>

      {/* Date Range Picker */}
      <DateRangePicker
        basePath="/channels/linkedin-ads"
        from={from ?? null}
        to={to ?? null}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Spend</div>
          <div className="text-2xl font-mono font-semibold">
            ${totals.totalSpend.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Impressions</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalImpressions.toLocaleString()}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Clicks</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalClicks.toLocaleString()}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">CTR</div>
          <div className="text-2xl font-mono font-semibold">
            {(totals.ctr * 100).toFixed(2)}%
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">CPC</div>
          <div className="text-2xl font-mono font-semibold">
            ${totals.cpc.toFixed(2)}
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Conversions</div>
          <div className="text-2xl font-mono font-semibold">
            {totals.totalConversions.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Charts */}
      {weeklyStats.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Weekly Performance</h2>
          <LinkedInAdsCharts data={weeklyStats.data} />
        </div>
      )}

      {/* Campaigns Table */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Campaigns</h2>
        <CampaignsTable campaigns={campaigns} />
      </div>
    </div>
  );
}
