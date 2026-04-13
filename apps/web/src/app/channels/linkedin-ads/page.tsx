import { auth } from "@/lib/auth";
import {
  getLinkedInAdsConnection,
  getLinkedInAdsCampaigns,
  getLinkedInAdsWeeklyStats,
  getLinkedInAdsTotals,
  getLinkedInAdsCompanyStats,
  getLinkedInAdsCreativeStats,
  ensureOrgCacheEntries,
  type DateRange,
} from "@/lib/data";
import { ConnectLinkedInAdsButton } from "./connect-button";
import { LinkedInAdsCharts } from "./charts";
import { CampaignsTable } from "./campaigns-table";
import { CompanyTable } from "./company-table";
import { CreativesTable } from "./creatives-table";
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
            <p className="text-sm text-text-secondary mt-1">
              Track ad campaign performance from LinkedIn Marketing API
            </p>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold mb-2">
            Connect LinkedIn Ads
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            Connect your LinkedIn Ads account to start tracking campaign
            performance, spend, impressions, and clicks.
          </p>
          <ConnectLinkedInAdsButton connection={null} />
        </div>
      </div>
    );
  }

  // Fetch data in parallel
  const [campaigns, weeklyStats, totals, companyStats, creativeStats] =
    await Promise.all([
      getLinkedInAdsCampaigns(),
      getLinkedInAdsWeeklyStats(dateRange),
      getLinkedInAdsTotals(dateRange),
      getLinkedInAdsCompanyStats(dateRange),
      getLinkedInAdsCreativeStats(dateRange),
    ]);

  // Ensure cache entries exist for discovered org IDs (non-blocking, skip __other__)
  const orgIds = companyStats
    .map((c) => c.orgId)
    .filter((id) => id && id !== "__other__");
  if (orgIds.length > 0) {
    ensureOrgCacheEntries(orgIds).catch(() => {});
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">LinkedIn Ads</h1>
          <p className="text-sm text-text-secondary mt-1">
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Total Spend</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            ${totals.totalSpend.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Impressions</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totals.totalImpressions.toLocaleString()}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Clicks</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {totals.totalClicks.toLocaleString()}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">CTR</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            {(totals.ctr * 100).toFixed(2)}%
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">CPC</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            ${totals.cpc.toFixed(2)}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">CPM</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
            ${totals.cpm.toFixed(2)}
          </div>
        </div>
        <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Conversions</div>
          <div className="text-2xl font-display font-semibold text-text-primary tracking-tight">
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

      {/* Companies Reached */}
      {companyStats.length > 0 && (
        <div className="mb-8">
          <CompanyTable companies={companyStats} />
        </div>
      )}

      {/* Creatives Performance */}
      {creativeStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-1">Creative Performance</h2>
          <p className="text-xs text-text-secondary mb-3">
            Assets used across multiple campaigns are grouped together. Click to
            expand campaign-level breakdown.
          </p>
          <CreativesTable creatives={creativeStats} />
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
