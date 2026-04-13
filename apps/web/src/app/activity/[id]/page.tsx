import { notFound } from "next/navigation";
import Link from "next/link";
import { getReportById, getAllReports, getContentViews, getLinkedInEngagements } from "@/lib/data";
import type { Confidence } from "@mai/core";
import { getBetLabels, formatBetValue, formatCompact, calculateCPA, formatCPA, formatDisplayDate } from "../../format";

function ConfidenceBadge({ level }: { level: Confidence }) {
  const colors = {
    HIGH: "bg-accent-light text-accent-strong",
    MED: "bg-[#FEF3C7] text-[#92400E]",
    LOW: "bg-surface-sunken text-text-secondary",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}
    >
      {level}
    </span>
  );
}

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

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [report, allReports] = await Promise.all([getReportById(id), getAllReports()]);

  if (!report) notFound();

  // Compute pooled click→incremental NAU conversion rate across all live newsletters
  const nlReports = allReports.filter(
    (r) =>
      r.activity.channel === "newsletter" &&
      r.activity.status === "live" &&
      (r.activity.actualClicks ?? 0) > 0,
  );
  const _nlTotalClicks = nlReports.reduce((s, r) => s + (r.activity.actualClicks ?? 0), 0);
  const _nlTotalIncrNAU = nlReports.reduce((s, r) => s + r.incrementalActivations, 0);
  const nlClickConversionAvg = _nlTotalClicks > 0 ? _nlTotalIncrNAU / _nlTotalClicks : null;

  const { activity } = report;
  const betLabels = getBetLabels(activity.channel);

  // Fetch additional days after post window for context
  // Newsletters: 5 days, LinkedIn: 10 days
  const isNewsletter = activity.channel === "newsletter";
  const isLinkedIn = activity.channel === "linkedin";
  const extraDays = isNewsletter ? 5 : isLinkedIn ? 10 : 0;
  let additionalDays: Array<{ date: string; signups: number; activations: number }> = [];

  // Hide uplift metrics for YouTube (views accumulate continuously, not discrete windows)
  const showUpliftMetrics = activity.channel !== "youtube";

  if (extraDays > 0) {
    const { prisma } = await import("@/lib/prisma");
    const { addDays, dateRange } = await import("@mai/core");

    const afterStart = addDays(report.postWindowEnd, 1);
    const afterEnd = addDays(report.postWindowEnd, extraDays);
    const afterDates = dateRange(afterStart, afterEnd);

    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        channel: activity.channel,
        date: { in: afterDates },
      },
      orderBy: { date: "asc" },
    });

    additionalDays = afterDates.map(date => {
      const metric = afterMetrics.find(m => m.date === date);
      return {
        date,
        signups: metric?.signups ?? 0,
        activations: metric?.activations ?? 0,
      };
    });
  }

  // Fetch content view tracking data if available
  const contentViews = await getContentViews(id);

  // Calculate total views and estimated views from metadata
  const latestViewCount = contentViews.length > 0
    ? contentViews[contentViews.length - 1].viewCount
    : null;
  const estimatedViews = activity.metadata?.estViews ?? null;

  // For podcasts, use estimated downloads for CPM calculation
  const estimatedDownloads = activity.metadata?.estDownloads ?? null;

  // Determine the denominator for CPM calculation based on channel
  const cpmDenominator = activity.channel === "podcast"
    ? estimatedDownloads
    : estimatedViews;

  // Fetch LinkedIn engagement data if available
  const linkedInEngagements = await getLinkedInEngagements(id);
  const latestEngagement = linkedInEngagements.length > 0
    ? linkedInEngagements[linkedInEngagements.length - 1]
    : null;

  return (
    <div className="max-w-4xl">
      <Link
        href="/"
        className="text-sm text-accent-strong hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">
        {activity.partnerName} &mdash; {activity.activityType}
      </h1>
      <p className="text-sm text-text-secondary mb-2">
        {activity.channel} | {formatDisplayDate(activity.date)}
        {activity.notes && ` | ${activity.notes}`}
      </p>

      {/* URLs section */}
      {(activity.contentUrl || activity.channelUrl) && (
        <div className="flex gap-3 mb-6">
          {activity.contentUrl && (
            <a
              href={activity.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-strong hover:underline"
            >
              → Content URL
            </a>
          )}
          {activity.channelUrl && (
            <a
              href={activity.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-strong hover:underline"
            >
              → Channel URL
            </a>
          )}
        </div>
      )}

      {/* Content Views Tracking */}
      {contentViews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Content Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <StatCard
              label="Latest Views"
              value={latestViewCount?.toLocaleString() ?? "—"}
              sub={`as of ${contentViews[contentViews.length - 1].date}`}
            />
            {estimatedViews != null && (
              <StatCard
                label="Estimated Views"
                value={estimatedViews.toLocaleString()}
                sub="from bet"
              />
            )}
            {estimatedViews != null && latestViewCount != null && (
              <StatCard
                label="vs. Estimate"
                value={`${((latestViewCount / estimatedViews) * 100).toFixed(0)}%`}
                sub={latestViewCount >= estimatedViews ? "exceeded" : "below"}
              />
            )}
          </div>

          {/* View count time series */}
          <div className="overflow-x-auto">
            <h3 className="text-xs font-semibold mb-2 text-text-secondary">
              View Count History
            </h3>
            <table className="w-full text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-border  text-left">
                  <th className="py-1 pr-3 font-medium">Date</th>
                  <th className="py-1 pr-3 font-medium text-right">Views</th>
                  <th className="py-1 font-medium text-right">Daily Change</th>
                </tr>
              </thead>
              <tbody>
                {contentViews.map((view, idx) => {
                  const prevViews = idx > 0 ? contentViews[idx - 1].viewCount : null;
                  const dailyChange = prevViews != null ? view.viewCount - prevViews : null;
                  return (
                    <tr
                      key={view.date}
                      className="border-b border-border-light"
                    >
                      <td className="py-1 pr-3">{view.date}</td>
                      <td className="py-1 pr-3 text-right">
                        {view.viewCount.toLocaleString()}
                      </td>
                      <td className="py-1 text-right text-text-secondary">
                        {dailyChange != null
                          ? `+${dailyChange.toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LinkedIn Engagement Tracking */}
      {linkedInEngagements.length > 0 && activity.channel === 'linkedin' && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">LinkedIn Engagement</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {latestEngagement && (
              <>
                <StatCard
                  label="Latest Likes"
                  value={latestEngagement.likes?.toLocaleString() ?? "—"}
                  sub={`as of ${latestEngagement.date}`}
                />
                <StatCard
                  label="Latest Comments"
                  value={latestEngagement.comments?.toLocaleString() ?? "—"}
                  sub={`as of ${latestEngagement.date}`}
                />
                <StatCard
                  label="Latest Reposts"
                  value={latestEngagement.reposts?.toLocaleString() ?? "—"}
                  sub={`as of ${latestEngagement.date}`}
                />
                {latestEngagement.views != null && (
                  <StatCard
                    label="Post Views"
                    value={latestEngagement.views.toLocaleString()}
                    sub={`as of ${latestEngagement.date}`}
                  />
                )}
              </>
            )}
          </div>

          {/* Engagement History Table */}
          <div className="overflow-x-auto">
            <h3 className="text-xs font-semibold mb-2 text-text-secondary">
              Engagement History
            </h3>
            <table className="w-full text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-border  text-left">
                  <th className="py-1 pr-3 font-medium">Date</th>
                  <th className="py-1 pr-3 font-medium text-right">Likes</th>
                  <th className="py-1 pr-3 font-medium text-right">Comments</th>
                  <th className="py-1 pr-3 font-medium text-right">Reposts</th>
                  <th className="py-1 font-medium text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {linkedInEngagements.map((eng) => (
                  <tr
                    key={eng.date}
                    className="border-b border-border-light"
                  >
                    <td className="py-1 pr-3">{eng.date}</td>
                    <td className="py-1 pr-3 text-right">
                      {eng.likes?.toLocaleString() ?? "—"}
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {eng.comments?.toLocaleString() ?? "—"}
                    </td>
                    <td className="py-1 pr-3 text-right">
                      {eng.reposts?.toLocaleString() ?? "—"}
                    </td>
                    <td className="py-1 text-right">
                      {eng.views?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* The Bet — Newsletter specific layout */}
      {activity.channel === "newsletter" && (activity.costUsd || activity.metadata) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">The Bet</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activity.costUsd != null && (
              <StatCard
                label="Cost"
                value={`$${activity.costUsd.toLocaleString()}`}
              />
            )}
            {activity.metadata?.send != null && (
              <StatCard
                label="Estimated Sends"
                value={activity.metadata.send.toLocaleString()}
              />
            )}
            {activity.deterministicClicks != null && (
              <StatCard
                label="Estimated Clicks"
                value={activity.deterministicClicks.toLocaleString()}
              />
            )}
            {activity.costUsd != null && activity.deterministicClicks != null && activity.deterministicClicks > 0 && (
              <StatCard
                label="Estimated CPC"
                value={`$${(activity.costUsd / activity.deterministicClicks).toFixed(2)}`}
                sub="Cost per click"
              />
            )}
          </div>
        </div>
      )}

      {/* Results — Newsletter actual metrics */}
      {activity.channel === "newsletter" && activity.actualClicks != null && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activity.costUsd != null && (
              <StatCard
                label="Cost"
                value={`$${activity.costUsd.toLocaleString()}`}
              />
            )}
            {activity.metadata?.send != null && (
              <StatCard
                label="Actual Sends"
                value={activity.metadata.send.toLocaleString()}
                sub="from tracking"
              />
            )}
            <StatCard
              label="Actual Clicks"
              value={activity.actualClicks.toLocaleString()}
              sub={
                activity.deterministicClicks != null
                  ? `${((activity.actualClicks / activity.deterministicClicks) * 100).toFixed(0)}% of estimate`
                  : undefined
              }
            />
            {activity.costUsd != null && activity.actualClicks > 0 && (
              <StatCard
                label="Actual CPC"
                value={`$${(activity.costUsd / activity.actualClicks).toFixed(2)}`}
                sub={
                  activity.deterministicClicks != null && activity.deterministicClicks > 0
                    ? `vs $${(activity.costUsd / activity.deterministicClicks).toFixed(2)} est.`
                    : "Cost per click"
                }
              />
            )}
            {activity.actualClicks != null && activity.actualClicks > 0 && report.incrementalActivations > 0 && (
              <StatCard
                label="Click → Incr. NAU"
                value={`${((report.incrementalActivations / activity.actualClicks) * 100).toFixed(1)}%`}
                sub={
                  nlClickConversionAvg != null
                    ? `vs ${(nlClickConversionAvg * 100).toFixed(1)}% avg`
                    : "conversion rate"
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Attribution Details — Newsletter proportional attribution */}
      {activity.channel === "newsletter" && report.postWindowAttribution && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Attribution Details</h2>
          <div className="text-xs text-text-secondary mb-3 space-y-1">
            <div>
              Account created: {report.postWindowAttribution.rawIncrementalSignups?.toFixed(1) ?? "—"} raw
              → {report.postWindowAttribution.attributedIncrementalSignups?.toFixed(1) ?? "—"} attributed
            </div>
            <div>
              NAU: {report.postWindowAttribution.rawIncremental.toFixed(1)} raw
              → {report.postWindowAttribution.attributedIncremental.toFixed(1)} attributed
            </div>
            {report.postWindowAttribution.clicksSource && (
              <div>
                Using {report.postWindowAttribution.clicksSource} clicks: {report.postWindowAttribution.clicksUsed?.toLocaleString()}
              </div>
            )}
          </div>

          {report.postWindowAttribution.dailyShares.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border ">
                    <th className="py-1 pr-3 text-left font-medium">Date</th>
                    <th className="py-1 pr-3 text-right font-medium">Pooled</th>
                    <th className="py-1 pr-3 text-right font-medium">My Share</th>
                    <th className="py-1 pr-3 text-right font-medium">Attributed</th>
                    <th className="py-1 text-right font-medium">Overlaps</th>
                  </tr>
                </thead>
                <tbody>
                  {report.postWindowAttribution.dailyShares.map(share => (
                    <tr key={share.date} className="border-b border-border-light">
                      <td className="py-1 pr-3 font-mono">{share.date}</td>
                      <td className="py-1 pr-3 text-right">{share.pooledIncremental.toFixed(1)}</td>
                      <td className="py-1 pr-3 text-right">{(share.share * 100).toFixed(1)}%</td>
                      <td className="py-1 pr-3 text-right font-semibold">{share.attributed.toFixed(2)}</td>
                      <td className="py-1 text-right text-text-secondary">
                        {share.overlappingActivities.length - 1} others
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* The Bet — channel-specific hypothesis metrics (non-newsletter) */}
      {activity.channel !== "newsletter" && (activity.costUsd || activity.metadata) && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">The Bet</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activity.costUsd != null && (
              <StatCard
                label="Cost"
                value={`$${activity.costUsd.toLocaleString()}`}
              />
            )}
            {activity.metadata &&
              betLabels.map(([key, label]) => {
                const val = activity.metadata?.[key];
                if (val == null) return null;
                return (
                  <StatCard
                    key={key}
                    label={label.charAt(0).toUpperCase() + label.slice(1)}
                    value={formatBetValue(key, val)}
                  />
                );
              })}
            {/* CPM calculation for YouTube and Podcast: (Cost / Est. Views or Downloads) * 1000 */}
            {(activity.channel === "youtube" || activity.channel === "podcast") &&
              activity.costUsd != null &&
              cpmDenominator != null &&
              cpmDenominator > 0 && (
                <StatCard
                  label="CPM"
                  value={`$${((activity.costUsd / cpmDenominator) * 1000).toFixed(2)}`}
                  sub={
                    activity.channel === "podcast"
                      ? "Cost per 1K downloads"
                      : "Cost per 1K views"
                  }
                />
              )}
          </div>
        </div>
      )}

      {/* Uplift metrics grid */}
      {showUpliftMetrics && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Uplift</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Floor Signups"
            value={String(report.floorSignups)}
            sub="Deterministic tracked"
          />
          <StatCard
            label="Baseline Avg/day"
            value={report.baselineAvg.toFixed(1)}
            sub={`${report.baselineDays} days of data`}
          />
          <StatCard
            label="Observed Total"
            value={String(report.observedTotal)}
            sub={`${report.postWindowStart} to ${report.postWindowEnd}`}
          />
          <StatCard
            label="Incr. Activations"
            value={
              report.incrementalActivations > 0
                ? `+${report.incrementalActivations.toFixed(0)}`
                : "0"
            }
            sub={`Expected: ${report.expectedActivations.toFixed(0)}`}
          />
          {activity.costUsd != null && (
            <StatCard
              label="CPA"
              value={formatCPA(calculateCPA({ costUsd: activity.costUsd, incremental: report.incrementalActivations }))}
              sub="Cost per activation"
            />
          )}
        </div>
        </div>
      )}

      {/* Confidence */}
      {showUpliftMetrics && (
        <div className="mb-8">
        <h2 className="text-sm font-semibold mb-2">Confidence</h2>
        <div className="flex items-center gap-3">
          <ConfidenceBadge level={report.confidence} />
          <span className="text-sm text-text-secondary">
            {report.confidenceExplanation}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Baseline &sigma; = {report.baselineStdDev.toFixed(2)}
        </p>
        </div>
      )}

      {/* Windows summary */}
      {showUpliftMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-sm font-semibold mb-2">Baseline Window</h2>
          <p className="text-xs text-text-secondary">
            {report.baselineWindowStart} to {report.baselineWindowEnd}
          </p>
          <p className="text-xs text-text-secondary">
            Average: {report.baselineAvg.toFixed(1)} signups/day | StdDev:{" "}
            {report.baselineStdDev.toFixed(2)}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-2">Post Window</h2>
          <p className="text-xs text-text-secondary">
            {report.postWindowStart} to {report.postWindowEnd}
          </p>
          <p className="text-xs text-text-secondary">
            Signups - Observed: {report.observedTotal} | Expected:{" "}
            {report.expectedTotal.toFixed(0)} | Incremental:{" "}
            {report.incremental.toFixed(0)}
          </p>
          <p className="text-xs text-text-secondary">
            Activations - Observed: {report.observedActivations} | Expected:{" "}
            {report.expectedActivations.toFixed(0)} | Incremental:{" "}
            {report.incrementalActivations.toFixed(0)}
          </p>
        </div>
        </div>
      )}

      {/* Daily signups table */}
      {showUpliftMetrics && (
        <div>
        <h2 className="text-sm font-semibold mb-2">
          Daily Metrics (Baseline + Post Window{extraDays > 0 ? ` + ${extraDays} days` : ""})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-border  text-left">
                <th className="py-1 pr-3 font-medium">Date</th>
                <th className="py-1 pr-3 font-medium text-right">Account Created</th>
                <th className="py-1 pr-3 font-medium text-right">NAU</th>
                <th className="py-1 font-medium">Window</th>
              </tr>
            </thead>
            <tbody>
              {report.dailyData.map((d) => (
                <tr
                  key={d.date}
                  className={`border-b border-border-light ${
                    d.isPostWindow
                      ? "bg-accent-light"
                      : ""
                  }`}
                >
                  <td className="py-1 pr-3">{formatDisplayDate(d.date)}</td>
                  <td className="py-1 pr-3 text-right">{d.signups}</td>
                  <td className="py-1 pr-3 text-right">{d.activations}</td>
                  <td className="py-1 text-text-muted">
                    {d.isBaseline ? "baseline" : ""}
                    {d.isPostWindow ? "post" : ""}
                  </td>
                </tr>
              ))}
              {/* Additional days after post window */}
              {additionalDays.map((d) => (
                <tr
                  key={d.date}
                  className="border-b border-border-light"
                >
                  <td className="py-1 pr-3">{formatDisplayDate(d.date)}</td>
                  <td className="py-1 pr-3 text-right">{d.signups}</td>
                  <td className="py-1 pr-3 text-right">{d.activations}</td>
                  <td className="py-1 text-text-muted"></td>
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
