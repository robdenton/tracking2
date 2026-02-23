import Link from "next/link";
import { Suspense } from "react";
import { getChannelAnalytics } from "@/lib/data";
import { NewsletterChart } from "./chart";
import { ENAUChart } from "./enau-chart";
import { DateRangePicker } from "./date-range-picker";

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
    <div className="group relative border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {/* Tooltip trigger — positioned so the bubble escapes the card upward */}
      <div className="absolute top-2 right-2 z-10">
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
      <div className="text-2xl font-mono font-semibold">{value}</div>
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

      // Cap incremental at actual to prevent double-counting from overlapping post-windows
      const incrementalSignups = Math.min(incrSignupsByPeriod.get(period) || 0, signups);
      const incrementalActivations = Math.min(incrActivationsByPeriod.get(period) || 0, activations);

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

      const incrementalSignups = Math.min(incrSignupsByPeriod.get(period) || 0, signups);
      const incrementalActivations = Math.min(incrActivationsByPeriod.get(period) || 0, activations);

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

  const { activities: allActivities, dailyMetrics: allDailyMetrics, reports: allReports } =
    await getChannelAnalytics("newsletter");

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

  const timeSeries = aggregateToTimeSeries(activities, dailyMetrics, reports, timeGrouping);
  const enauTimeSeries = aggregateENAUTimeSeries(activities, dailyMetrics, reports, timeGrouping);

  const totalActualClicks = timeSeries.reduce((sum, d) => sum + d.actualClicks, 0);
  const totalSignups = timeSeries.reduce((sum, d) => sum + d.signups, 0);
  const totalActivations = timeSeries.reduce((sum, d) => sum + d.activations, 0);
  // Cap incremental at actual — overlapping activity post-windows can cause
  // double-counting of the same daily signups/activations across activities.
  const rawIncrementalSignups = timeSeries.reduce((sum, d) => sum + d.incrementalSignups, 0);
  const rawIncrementalActivations = timeSeries.reduce((sum, d) => sum + d.incrementalActivations, 0);
  const totalIncrementalSignups = Math.min(rawIncrementalSignups, totalSignups);
  const totalIncrementalActivations = Math.min(rawIncrementalActivations, totalActivations);
  const totalENAU = enauTimeSeries.reduce((sum, d) => sum + d.eNAU, 0);

  const totalCost = activities.reduce((sum, a) => sum + (a.costUsd ?? 0), 0);
  const blendedCpaSignup = totalSignups > 0 ? totalCost / totalSignups : null;
  const blendedCpaActivation = totalActivations > 0 ? totalCost / totalActivations : null;
  const incrementalCpaSignup = totalIncrementalSignups > 0 ? totalCost / totalIncrementalSignups : null;
  const incrementalCpaActivation = totalIncrementalActivations > 0 ? totalCost / totalIncrementalActivations : null;

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">Newsletter Channel Analytics</h1>
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
          label="Account created"
          value={totalSignups.toLocaleString()}
          sub="Actual"
          tooltip="Total Granola accounts created during the post-windows of all newsletter activities. This is the raw observed count, not adjusted for baseline."
          learnMoreHref="/measurement-explained#account-created"
        />
        <StatCard
          label="NAU"
          value={totalActivations.toLocaleString()}
          sub="Actual"
          tooltip="New Activated Users: accounts that completed activation (paid or trial) during the post-windows. Raw observed count, not adjusted for baseline."
          learnMoreHref="/measurement-explained#nau"
        />
        <StatCard
          label="Incremental account created"
          value={Math.round(totalIncrementalSignups).toLocaleString()}
          sub="Attributed"
          tooltip="Accounts created above the expected baseline, attributed to newsletters. Uses a 2-day post-window uplift model with proportional credit-splitting when sends overlap."
          learnMoreHref="/measurement-explained#incremental-account-created"
        />
        <StatCard
          label="Incremental NAU"
          value={Math.round(totalIncrementalActivations).toLocaleString()}
          sub="Attributed"
          tooltip="Activations above the expected baseline, attributed to newsletters. Same uplift methodology as incremental account created, applied to activation events."
          learnMoreHref="/measurement-explained#incremental-nau"
        />
      </div>

      {/* CPA Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 overflow-visible">
        <StatCard
          label="Blended CPA"
          value={formatCurrency(blendedCpaSignup) ?? "—"}
          sub="Cost / Account created"
          tooltip="Total newsletter spend divided by all accounts created in post-windows. Blended (not incremental) — does not subtract baseline."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Blended Cost per NAU"
          value={formatCurrency(blendedCpaActivation) ?? "—"}
          sub="Cost / Total NAU"
          tooltip="Total newsletter spend divided by all NAU in post-windows. Blended — does not subtract baseline."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Incremental CPA"
          value={formatCurrency(incrementalCpaSignup) ?? "—"}
          sub="Cost / Incr. Account created"
          tooltip="Total newsletter spend divided by incremental accounts created. This is the true cost of an additional signup driven by newsletters."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Incremental Cost per NAU"
          value={formatCurrency(incrementalCpaActivation) ?? "—"}
          sub="Cost / Incr. NAU"
          tooltip="Total newsletter spend divided by incremental NAU. The true cost of an additional activation driven by newsletters."
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

    </div>
  );
}
