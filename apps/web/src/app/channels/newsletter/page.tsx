import Link from "next/link";
import { Suspense } from "react";
import { getChannelAnalytics, getDubClicksByActivity } from "@/lib/data";
import { NewsletterChart } from "./chart";
import { ENAUChart } from "./enau-chart";
import { DateRangePicker } from "./date-range-picker";
import { NewsletterTableToggle } from "./newsletter-table-toggle";

/** Stat card with an info tooltip and optional sub-label */
function StatCard({
  label,
  value,
  sub,
  tooltip,
  learnMoreHref,
}: {
  label: string;
  value: string;
  sub?: string;
  tooltip: string;
  learnMoreHref: string;
}) {
  return (
    <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {/* Tooltip — group scoped to the icon only, not the whole card */}
      <div className="group absolute top-2 right-2 z-10">
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 cursor-help text-xs select-none">
          ⓘ
        </span>
        {/* Tooltip bubble — opens upward to avoid grid clipping */}
        <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 bottom-6 z-50 w-60 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          {tooltip}
          <a
            href={learnMoreHref}
            className="pointer-events-auto block mt-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Learn more →
          </a>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-1 pr-4">{label}</div>
      <div className={`font-mono font-semibold whitespace-nowrap ${value.includes("–") ? "text-lg" : "text-2xl"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export const dynamic = "force-dynamic";

type TimeSeriesGrouping = "weekly" | "monthly";

interface TimeSeriesDataPoint {
  period: string;
  actualClicks: number;
  signups: number;
  activations: number;
  incrementalSignups: number;
  incrementalActivations: number;
}

interface ENAUDataPoint {
  period: string;
  eNAU: number;
  signups: number;
  activations: number;
  incrementalSignups: number;
  incrementalActivations: number;
}

function aggregateToTimeSeries(
  activities: Array<{
    date: string;
    actualClicks: number | null;
  }>,
  dailyMetrics: Array<{
    date: string;
    signups: number;
    activations: number;
  }>,
  reports: Array<{
    activity: { id: string; date: string };
    incremental: number;
    incrementalActivations: number;
  }>,
  grouping: TimeSeriesGrouping
): TimeSeriesDataPoint[] {
  // Group activities by period for actual clicks
  const clicksByPeriod = new Map<string, number>();

  for (const activity of activities) {
    const period = getPeriodKey(activity.date, grouping);
    const actualClicks = activity.actualClicks || 0;
    clicksByPeriod.set(period, (clicksByPeriod.get(period) || 0) + actualClicks);
  }

  // Group daily metrics by period
  const metricsByPeriod = new Map<string, { signups: number; activations: number }>();

  for (const metric of dailyMetrics) {
    const period = getPeriodKey(metric.date, grouping);
    const existing = metricsByPeriod.get(period) || { signups: 0, activations: 0 };
    metricsByPeriod.set(period, {
      signups: existing.signups + metric.signups,
      activations: existing.activations + metric.activations,
    });
  }

  // Group incremental values by period — use the same pre-computed fields
  // as the home page (report.incremental for signups, report.incrementalActivations)
  const incrSignupsByPeriod = new Map<string, number>();
  const incrActivationsByPeriod = new Map<string, number>();

  for (const report of reports) {
    const period = getPeriodKey(report.activity.date, grouping);
    incrSignupsByPeriod.set(period, (incrSignupsByPeriod.get(period) || 0) + report.incremental);
    incrActivationsByPeriod.set(period, (incrActivationsByPeriod.get(period) || 0) + report.incrementalActivations);
  }

  // Combine into time series
  const allPeriods = new Set([
    ...clicksByPeriod.keys(),
    ...metricsByPeriod.keys(),
    ...incrSignupsByPeriod.keys(),
  ]);

  const timeSeries: TimeSeriesDataPoint[] = Array.from(allPeriods)
    .sort()
    .map((period) => {
      const signups = metricsByPeriod.get(period)?.signups || 0;
      const activations = metricsByPeriod.get(period)?.activations || 0;

      // Per-activity figures are already bounded by the daily pool (≤ actual daily NAU)
      // by construction in the new channel-baseline model. No separate cap needed.
      const incrementalSignups = incrSignupsByPeriod.get(period) || 0;
      const incrementalActivations = incrActivationsByPeriod.get(period) || 0;

      return {
        period,
        actualClicks: clicksByPeriod.get(period) || 0,
        signups,
        activations,
        incrementalSignups,
        incrementalActivations,
      };
    });

  return timeSeries;
}

function aggregateENAUTimeSeries(
  activities: Array<{
    date: string;
    metadata: Record<string, number> | null;
  }>,
  dailyMetrics: Array<{
    date: string;
    signups: number;
    activations: number;
  }>,
  reports: Array<{
    activity: { id: string; date: string };
    incremental: number;
    incrementalActivations: number;
  }>,
  grouping: TimeSeriesGrouping
): ENAUDataPoint[] {
  // Group activities by period for eNAU
  const enauByPeriod = new Map<string, number>();

  for (const activity of activities) {
    const period = getPeriodKey(activity.date, grouping);
    const eNAU = activity.metadata?.eNAU || 0;
    enauByPeriod.set(period, (enauByPeriod.get(period) || 0) + eNAU);
  }

  // Group daily metrics by period
  const metricsByPeriod = new Map<string, { signups: number; activations: number }>();

  for (const metric of dailyMetrics) {
    const period = getPeriodKey(metric.date, grouping);
    const existing = metricsByPeriod.get(period) || { signups: 0, activations: 0 };
    metricsByPeriod.set(period, {
      signups: existing.signups + metric.signups,
      activations: existing.activations + metric.activations,
    });
  }

  // Group incremental values by period — same pre-computed fields as home page
  const incrSignupsByPeriod = new Map<string, number>();
  const incrActivationsByPeriod = new Map<string, number>();

  for (const report of reports) {
    const period = getPeriodKey(report.activity.date, grouping);
    incrSignupsByPeriod.set(period, (incrSignupsByPeriod.get(period) || 0) + report.incremental);
    incrActivationsByPeriod.set(period, (incrActivationsByPeriod.get(period) || 0) + report.incrementalActivations);
  }

  // Combine into time series
  const allPeriods = new Set([
    ...enauByPeriod.keys(),
    ...metricsByPeriod.keys(),
    ...incrSignupsByPeriod.keys(),
  ]);

  const timeSeries: ENAUDataPoint[] = Array.from(allPeriods)
    .sort()
    .map((period) => {
      const signups = metricsByPeriod.get(period)?.signups || 0;
      const activations = metricsByPeriod.get(period)?.activations || 0;

      const incrementalSignups = incrSignupsByPeriod.get(period) || 0;
      const incrementalActivations = incrActivationsByPeriod.get(period) || 0;

      return {
        period,
        eNAU: enauByPeriod.get(period) || 0,
        signups,
        activations,
        incrementalSignups,
        incrementalActivations,
      };
    });

  return timeSeries;
}

function getPeriodKey(date: string, grouping: TimeSeriesGrouping): string {
  const d = new Date(date);

  if (grouping === "monthly") {
    // Format: "2026-01"
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } else {
    // Weekly: Get ISO week number
    const weekNum = getWeekNumber(d);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function NewsletterChannelPage({
  searchParams,
}: {
  searchParams: Promise<{ grouping?: string; startDate?: string; endDate?: string }>;
}) {
  const { grouping = "monthly", startDate = "", endDate = "" } = await searchParams;
  const timeGrouping = (grouping === "weekly" ? "weekly" : "monthly") as TimeSeriesGrouping;

  const [channelData, dubClicksMap] = await Promise.all([
    getChannelAnalytics("newsletter"),
    getDubClicksByActivity(),
  ]);
  const { activities: allActivities, dailyMetrics: allDailyMetrics, reports: allReports } = channelData;

  // Convert Map to plain object for client component serialization
  const dubClicksObj: Record<string, { dubClicks: number; dubLeads: number; shortLink: string }> = {};
  for (const [id, data] of dubClicksMap) {
    dubClicksObj[id] = data;
  }

  // Apply date range filter to each data source
  const activities = allActivities.filter((a) => {
    if (startDate && a.date < startDate) return false;
    if (endDate && a.date > endDate) return false;
    return true;
  });

  const dailyMetrics = allDailyMetrics.filter((m) => {
    if (startDate && m.date < startDate) return false;
    if (endDate && m.date > endDate) return false;
    return true;
  });

  // Reports are keyed by activity date; filter to activities in range
  const activityIdsInRange = new Set(activities.map((a) => a.id));
  const reports = allReports.filter((r) => activityIdsInRange.has(r.activity.id));

  // Charts should only show data up to today (no future booked activities)
  const today = new Date().toISOString().slice(0, 10);
  const chartActivities = activities.filter((a) => a.date <= today);
  const chartReports = reports.filter((r) => r.activity.date <= today);

  const timeSeries = aggregateToTimeSeries(chartActivities, dailyMetrics, chartReports, timeGrouping);
  const enauTimeSeries = aggregateENAUTimeSeries(chartActivities, dailyMetrics, chartReports, timeGrouping);

  const totalActualClicks = timeSeries.reduce((sum, d) => sum + d.actualClicks, 0);
  const totalSignups = timeSeries.reduce((sum, d) => sum + d.signups, 0);
  const totalActivations = timeSeries.reduce((sum, d) => sum + d.activations, 0);
  const totalENAU = enauTimeSeries.reduce((sum, d) => sum + d.eNAU, 0);

  // --- Portfolio-level incremental: total observed minus baseline expected ---
  // Weekday/weekend split baseline from pre-newsletter period (Sep 1 – Dec 6):
  //   Weekday: NAU median=12, Signups median=24
  //   Weekend: NAU median=0,  Signups median=6
  // These are medians across 97 days including zero-days for missing data.
  const BASELINE_WD_NAU = 12;
  const BASELINE_WE_NAU = 0;
  const BASELINE_WD_SIGNUPS = 24;
  const BASELINE_WE_SIGNUPS = 6;

  // Count all calendar days in the filtered period (not just days with data)
  // Every day without a metric row = 0 observed
  const firstActivity = chartActivities.find(a => a.status === "live");
  const periodStart = firstActivity?.date ?? chartActivities[0]?.date ?? today;
  const periodEnd = today;

  let weekdaysInPeriod = 0;
  let weekendsInPeriod = 0;
  {
    const cursor = new Date(periodStart + "T00:00:00Z");
    const endD = new Date(periodEnd + "T00:00:00Z");
    while (cursor <= endD) {
      const dow = cursor.getUTCDay();
      if (dow >= 1 && dow <= 5) weekdaysInPeriod++;
      else weekendsInPeriod++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const expectedSignups = (BASELINE_WD_SIGNUPS * weekdaysInPeriod) + (BASELINE_WE_SIGNUPS * weekendsInPeriod);
  const expectedNau = (BASELINE_WD_NAU * weekdaysInPeriod) + (BASELINE_WE_NAU * weekendsInPeriod);

  // Only count observed values from the newsletter period (first activity onwards)
  // — dailyMetrics includes pre-newsletter baseline data which must not be counted as observed
  const nlPeriodMetrics = dailyMetrics.filter(m => m.date >= periodStart);
  const observedSignups = nlPeriodMetrics.reduce((s, m) => s + m.signups, 0);
  const observedNau = nlPeriodMetrics.reduce((s, m) => s + m.activations, 0);
  const portfolioIncrSignups = Math.round(observedSignups - expectedSignups);
  const portfolioIncrActivations = Math.round(observedNau - expectedNau);

  const totalCost = chartActivities.reduce((sum, a) => sum + (a.costUsd ?? 0), 0);
  const blendedCpaActivation = totalActivations > 0 ? totalCost / totalActivations : null;
  const incrementalCpaSignup = portfolioIncrSignups > 0 ? totalCost / portfolioIncrSignups : null;
  const incrementalCpaNau = portfolioIncrActivations > 0 ? totalCost / portfolioIncrActivations : null;

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">Newsletter Tracking</h1>
      <p className="text-sm text-gray-500 mb-4">
        Aggregated performance across all newsletter activities
      </p>

      {/* Date Range Picker */}
      <Suspense>
        <DateRangePicker startDate={startDate} endDate={endDate} />
      </Suspense>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4 overflow-visible">
        <StatCard
          label="Total Activities"
          value={activities.length.toString()}
          tooltip="Number of newsletter sends in the selected date range."
          learnMoreHref="/measurement-explained#newsletter"
        />
        <StatCard
          label="Actual Clicks"
          value={totalActualClicks.toLocaleString()}
          tooltip="Total measured clicks across all newsletter activities. Used to distribute credit when post-windows overlap."
          learnMoreHref="/measurement-explained#newsletter"
        />
        <StatCard
          label="eNAU"
          value={totalENAU.toLocaleString()}
          sub="Estimated"
          tooltip="Estimated New Activated Users: clicks × historical click-to-activation rate. A forward-looking estimate before observed activation data is available."
          learnMoreHref="/measurement-explained#enau"
        />
        <StatCard
          label="Account Created"
          value={observedSignups.toLocaleString()}
          sub="Observed"
          tooltip="Total accounts created on the newsletter channel from the first activity onwards. This is the raw observed count from the 'how did you hear about us' survey."
          learnMoreHref="/measurement-explained#account-created"
        />
        <StatCard
          label="NAU (Desktop)"
          value={observedNau.toLocaleString()}
          sub="Observed"
          tooltip="Total desktop NAU on the newsletter channel from the first activity onwards. Raw observed count from the survey, not adjusted for baseline."
          learnMoreHref="/measurement-explained#nau"
        />
        <StatCard
          label="Incr. Account Created"
          value={portfolioIncrSignups.toLocaleString()}
          sub={`vs ${BASELINE_WD_SIGNUPS}/${BASELINE_WE_SIGNUPS} wd/we baseline`}
          tooltip="Total accounts created minus baseline expected. Baseline uses pre-newsletter (Sep–Dec 6) weekday/weekend medians. Weekday: 24/day, Weekend: 6/day."
          learnMoreHref="/measurement-explained#incremental-account-created"
        />
        <StatCard
          label="Incr. NAU (Desktop)"
          value={portfolioIncrActivations.toLocaleString()}
          sub={`vs ${BASELINE_WD_NAU}/${BASELINE_WE_NAU} wd/we baseline`}
          tooltip="Total desktop NAU minus baseline expected. Baseline uses pre-newsletter (Sep–Dec 6) weekday/weekend medians. Weekday: 12/day, Weekend: 0/day."
          learnMoreHref="/measurement-explained#incremental-nau"
        />
      </div>

      {/* CPA Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 overflow-visible">
        <StatCard
          label="Total Spend"
          value={formatCurrency(totalCost)}
          sub={`${activities.length} activities`}
          tooltip="Total newsletter spend across all activities in the selected date range."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Actual CPC"
          value={totalActualClicks > 0 ? formatCurrency(totalCost / totalActualClicks) : "—"}
          sub="Cost / Actual click"
          tooltip="Total spend divided by total measured clicks in the selected date range. Reflects the blended cost per click across all newsletters."
          learnMoreHref="/measurement-explained#newsletter"
        />
        <StatCard
          label="Blended Cost / NAU"
          value={formatCurrency(blendedCpaActivation) ?? "—"}
          sub="Cost / Total NAU"
          tooltip="Total newsletter spend divided by all NAU in post-windows. Blended — does not subtract baseline."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Incr. CPA"
          value={formatCurrency(incrementalCpaSignup) ?? "—"}
          sub="Cost / Incr. Signups"
          tooltip="Total newsletter spend divided by incremental accounts created. This is the true cost of an additional signup driven by newsletters."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Incr. Cost / NAU"
          value={formatCurrency(incrementalCpaNau) ?? "—"}
          sub="Cost / Incr. NAU (Desktop)"
          tooltip="Total newsletter spend divided by portfolio-level incremental NAU desktop (total observed minus baseline × days)."
          learnMoreHref="/measurement-explained#cpa"
        />
      </div>

      {/* Time Grouping Toggle */}
      <div className="flex gap-2 mb-4">
        <Link
          href={`?grouping=weekly${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`}
          className={`px-3 py-1 rounded text-sm ${
            timeGrouping === "weekly"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Weekly
        </Link>
        <Link
          href={`?grouping=monthly${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`}
          className={`px-3 py-1 rounded text-sm ${
            timeGrouping === "monthly"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Monthly
        </Link>
      </div>

      {/* Clicks vs Account created/NAU Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Actual Clicks vs Performance</h2>
        <NewsletterChart data={timeSeries} grouping={timeGrouping} />
      </div>

      {/* eNAU vs Actual Account created/NAU Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">eNAU (Estimated Activated Users) vs Actual</h2>
        <ENAUChart data={enauTimeSeries} grouping={timeGrouping} />
      </div>

      {/* Publisher / Activity Toggle Table */}
      <div className="mb-8">
        <NewsletterTableToggle
          publishers={(() => {
            // Aggregate reports by partnerName
            const pubMap = new Map<string, {
              activityCount: number;
              totalClicks: number;
              totalSpend: number;
              incrementalSignups: number;
              incrementalActivations: number;
              incrementalActivationsAllDevices: number;
              ubIncrSignups: number;
              ubIncrActivations: number;
              ubIncrActivationsAll: number;
            }>();

            for (const report of reports) {
              const partner = report.activity.partnerName;
              const existing = pubMap.get(partner) ?? {
                activityCount: 0,
                totalClicks: 0,
                totalSpend: 0,
                incrementalSignups: 0,
                incrementalActivations: 0,
                incrementalActivationsAllDevices: 0,
                ubIncrSignups: 0,
                ubIncrActivations: 0,
                ubIncrActivationsAll: 0,
              };
              existing.activityCount++;
              existing.totalClicks += report.activity.actualClicks ?? 0;
              existing.totalSpend += report.activity.costUsd ?? 0;
              existing.incrementalSignups += report.incremental;
              existing.incrementalActivations += report.incrementalActivations;
              existing.incrementalActivationsAllDevices += report.incrementalActivationsAllDevices;
              existing.ubIncrSignups += report.upperBoundIncrementalSignups ?? report.incremental;
              existing.ubIncrActivations += report.upperBoundIncrementalActivations ?? report.incrementalActivations;
              existing.ubIncrActivationsAll += report.upperBoundIncrementalActivationsAllDevices ?? report.incrementalActivationsAllDevices;
              pubMap.set(partner, existing);
            }

            return Array.from(pubMap.entries()).map(([partnerName, data]) => ({
              partnerName,
              ...data,
              cpc: data.totalClicks > 0 ? data.totalSpend / data.totalClicks : null,
              incrementalCpa: data.incrementalActivations > 0
                ? data.totalSpend / data.incrementalActivations
                : null,
            }));
          })()}
          reports={reports}
          selectedChannel="newsletter"
          clickConversionAvg={
            (() => {
              const liveWithClicks = reports.filter(
                (r) => r.activity.status === "live" && (r.activity.actualClicks ?? 0) > 0
              );
              const clicks = liveWithClicks.reduce((s, r) => s + (r.activity.actualClicks ?? 0), 0);
              const incrNAU = liveWithClicks.reduce((s, r) => s + r.incrementalActivations, 0);
              return clicks > 0 ? incrNAU / clicks : undefined;
            })()
          }
          dubClicksMap={Object.keys(dubClicksObj).length > 0 ? dubClicksObj : undefined}
        />
      </div>

    </div>
  );
}
