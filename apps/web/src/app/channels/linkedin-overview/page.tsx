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
    <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
      <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`font-display font-semibold text-text-primary whitespace-nowrap tracking-tight ${value.includes("–") ? "text-lg" : "text-2xl"}`}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1">{sub}</div>}
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
      <h1 className="text-2xl font-bold mb-1">LinkedIn Overview</h1>
      <p className="text-sm text-text-secondary mb-4">
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
        <p className="text-xs text-text-secondary mb-3">
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
            className="text-sm text-accent-strong hover:underline"
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
            className="text-sm text-accent-strong hover:underline"
          >
            View details →
          </Link>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          Contextual signal — not attributed. Impressions decayed over 3 days (50/30/20).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border-light">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Team Member</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Posts</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Impressions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Reactions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Comments</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Reposts</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummary.map((emp) => (
                <tr key={emp.name} className="border-b border-border-light">
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
          <p className="text-xs text-text-secondary mb-3">
            Contextual signal — not attributed. Impressions decayed over 3 days (50/30/20).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border-light">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Partner</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Type</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Clicks</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Cost</th>
                </tr>
              </thead>
              <tbody>
                {influencerActivities.map((act, i) => (
                  <tr key={i} className="border-b border-border-light">
                    <td className="px-3 py-2 font-medium">
                      {act.contentUrl ? (
                        <a
                          href={act.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-strong hover:underline"
                        >
                          {act.partnerName}
                        </a>
                      ) : (
                        act.partnerName
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{act.date}</td>
                    <td className="px-3 py-2 text-text-secondary">{act.activityType}</td>
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
