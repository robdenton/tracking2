import Link from "next/link";
import { getLinkedInOverviewData } from "@/lib/data";
import { OverviewChart } from "./overview-chart";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-mono font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function formatCurrency(n: number | null): string {
  if (n === null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

export default async function LinkedInOverviewPage() {
  const data = await getLinkedInOverviewData();
  const { summary, baseline, dailyData, employeeSummary, influencerActivities } = data;

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">LinkedIn Overview</h1>
      <p className="text-sm text-gray-500 mb-4">
        Combined view of ads, employee build-in-public, and influencer activity
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="LinkedIn NAU (Observed)"
          value={summary.totalNau.toLocaleString()}
          sub="Dec 16 onwards"
        />
        <StatCard
          label="Incremental NAU"
          value={summary.incrementalNau.toLocaleString()}
          sub={`vs ${baseline.weekdayNau}/${baseline.weekendNau} wd/we baseline`}
        />
        <StatCard
          label="Total Paid Spend"
          value={formatCurrency(summary.totalPaidSpend)}
          sub={`Ads: ${formatCurrency(summary.totalAdSpend)} · Influencer: ${formatCurrency(summary.totalInfluencerSpend)}`}
        />
        <StatCard
          label="Incremental CPA"
          value={formatCurrency(summary.incrementalCpa)}
          sub="Paid spend / Incr. NAU"
        />
      </div>

      {/* Main Chart */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-1">Weekly LinkedIn NAU vs Activity</h2>
        <p className="text-xs text-gray-500 mb-3">
          Blue line = observed NAU · Dashed line = baseline expected · Bars = employee &amp; influencer impressions (decayed 50/30/20)
        </p>
        <OverviewChart data={dailyData} baseline={baseline} />
      </div>

      {/* Ads Summary */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Ads Performance</h2>
          <Link
            href="/channels/linkedin-ads"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View detailed ads →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Ad Spend"
            value={formatCurrency(summary.totalAdSpend)}
            sub="Dec 16 onwards"
          />
          <StatCard
            label="Ad Impressions"
            value={dailyData.reduce((s, d) => s + d.adImpressions, 0).toLocaleString()}
          />
          <StatCard
            label="Ad Clicks"
            value={dailyData.reduce((s, d) => s + d.adClicks, 0).toLocaleString()}
          />
          <StatCard
            label="Ad CPC"
            value={(() => {
              const clicks = dailyData.reduce((s, d) => s + d.adClicks, 0);
              return clicks > 0 ? formatCurrency(summary.totalAdSpend / clicks) : "—";
            })()}
          />
        </div>
      </div>

      {/* Employee Build-in-Public */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Employee Build-in-Public</h2>
          <Link
            href="/build-in-public"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View details →
          </Link>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Contextual signal — not attributed. Impressions decayed over 3 days (50/30/20).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Team Member</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Posts</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Impressions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Reactions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Comments</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Reposts</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummary.map((emp) => (
                <tr key={emp.name} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 font-medium">{emp.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{emp.postCount}</td>
                  <td className="px-3 py-2 text-right font-mono">{emp.totalImpressions.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{emp.totalReactions.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{emp.totalComments.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{emp.totalReposts.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Influencer Collaborations */}
      {influencerActivities.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-1">Influencer Collaborations</h2>
          <p className="text-xs text-gray-500 mb-3">
            Contextual signal — not attributed. Impressions decayed over 3 days (50/30/20).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Partner</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Clicks</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cost</th>
                </tr>
              </thead>
              <tbody>
                {influencerActivities.map((act, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-medium">
                      {act.contentUrl ? (
                        <a
                          href={act.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {act.partnerName}
                        </a>
                      ) : (
                        act.partnerName
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{act.date}</td>
                    <td className="px-3 py-2 text-gray-600">{act.activityType}</td>
                    <td className="px-3 py-2 text-right font-mono">{act.actualClicks.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(act.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
