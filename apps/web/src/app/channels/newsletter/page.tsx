import Link from "next/link";
import { getChannelAnalytics } from "@/lib/data";
import { NewsletterChart } from "./chart";
import { ENAUChart } from "./enau-chart";

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

  // Group incremental values by period
  const incrementalByPeriod = new Map<string, number>();

  for (const report of reports) {
    const period = getPeriodKey(report.activity.date, grouping);
    const incremental = report.incremental;
    incrementalByPeriod.set(period, (incrementalByPeriod.get(period) || 0) + incremental);
  }

  // Combine into time series
  const allPeriods = new Set([
    ...clicksByPeriod.keys(),
    ...metricsByPeriod.keys(),
    ...incrementalByPeriod.keys(),
  ]);

  const timeSeries: TimeSeriesDataPoint[] = Array.from(allPeriods)
    .sort()
    .map((period) => {
      const signups = metricsByPeriod.get(period)?.signups || 0;
      const activations = metricsByPeriod.get(period)?.activations || 0;
      const incrementalSignups = incrementalByPeriod.get(period) || 0;

      // Calculate incremental activations as a proportion
      // If we have signups, use the activation rate to estimate incremental activations
      const activationRate = signups > 0 ? activations / signups : 0;
      const incrementalActivations = incrementalSignups * activationRate;

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

  // Group incremental values by period
  const incrementalByPeriod = new Map<string, number>();

  for (const report of reports) {
    const period = getPeriodKey(report.activity.date, grouping);
    const incremental = report.incremental;
    incrementalByPeriod.set(period, (incrementalByPeriod.get(period) || 0) + incremental);
  }

  // Combine into time series
  const allPeriods = new Set([
    ...enauByPeriod.keys(),
    ...metricsByPeriod.keys(),
    ...incrementalByPeriod.keys(),
  ]);

  const timeSeries: ENAUDataPoint[] = Array.from(allPeriods)
    .sort()
    .map((period) => {
      const signups = metricsByPeriod.get(period)?.signups || 0;
      const activations = metricsByPeriod.get(period)?.activations || 0;
      const incrementalSignups = incrementalByPeriod.get(period) || 0;

      // Calculate incremental activations as a proportion
      const activationRate = signups > 0 ? activations / signups : 0;
      const incrementalActivations = incrementalSignups * activationRate;

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

export default async function NewsletterChannelPage({
  searchParams,
}: {
  searchParams: Promise<{ grouping?: string }>;
}) {
  const { grouping = "monthly" } = await searchParams;
  const timeGrouping = (grouping === "weekly" ? "weekly" : "monthly") as TimeSeriesGrouping;

  const { activities, dailyMetrics, reports } = await getChannelAnalytics("newsletter");

  const timeSeries = aggregateToTimeSeries(activities, dailyMetrics, reports, timeGrouping);
  const enauTimeSeries = aggregateENAUTimeSeries(activities, dailyMetrics, reports, timeGrouping);

  const totalActualClicks = timeSeries.reduce((sum, d) => sum + d.actualClicks, 0);
  const totalSignups = timeSeries.reduce((sum, d) => sum + d.signups, 0);
  const totalActivations = timeSeries.reduce((sum, d) => sum + d.activations, 0);
  const totalIncrementalSignups = timeSeries.reduce((sum, d) => sum + d.incrementalSignups, 0);
  const totalIncrementalActivations = timeSeries.reduce((sum, d) => sum + d.incrementalActivations, 0);
  const totalENAU = enauTimeSeries.reduce((sum, d) => sum + d.eNAU, 0);

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">Newsletter Channel Analytics</h1>
      <p className="text-sm text-gray-500 mb-6">
        Aggregated performance across all newsletter activities
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Activities</div>
          <div className="text-2xl font-mono font-semibold">{activities.length}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Actual Clicks</div>
          <div className="text-2xl font-mono font-semibold">{totalActualClicks.toLocaleString()}</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">eNAU</div>
          <div className="text-2xl font-mono font-semibold">{totalENAU.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Estimated</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Signups</div>
          <div className="text-2xl font-mono font-semibold">{totalSignups.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Actual</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Activations</div>
          <div className="text-2xl font-mono font-semibold">{totalActivations.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Actual</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Incremental Signups</div>
          <div className="text-2xl font-mono font-semibold">{totalIncrementalSignups.toFixed(0)}</div>
          <div className="text-xs text-gray-400 mt-1">Attributed</div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Incremental Activations</div>
          <div className="text-2xl font-mono font-semibold">{totalIncrementalActivations.toFixed(0)}</div>
          <div className="text-xs text-gray-400 mt-1">Attributed</div>
        </div>
      </div>

      {/* Time Grouping Toggle */}
      <div className="flex gap-2 mb-4">
        <Link
          href="?grouping=weekly"
          className={`px-3 py-1 rounded text-sm ${
            timeGrouping === "weekly"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Weekly
        </Link>
        <Link
          href="?grouping=monthly"
          className={`px-3 py-1 rounded text-sm ${
            timeGrouping === "monthly"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Monthly
        </Link>
      </div>

      {/* Clicks vs Signups/Activations Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Actual Clicks vs Performance</h2>
        <NewsletterChart data={timeSeries} grouping={timeGrouping} />
      </div>

      {/* eNAU vs Actual Signups/Activations Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">eNAU (Estimated Activated Users) vs Actual</h2>
        <ENAUChart data={enauTimeSeries} grouping={timeGrouping} />
      </div>

      {/* Data Tables */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-3">Clicks Time Series Data</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 text-left">
                <th className="py-2 pr-4 font-medium">Period</th>
                <th className="py-2 pr-4 font-medium text-right">Actual Clicks</th>
                <th className="py-2 pr-4 font-medium text-right">Signups</th>
                <th className="py-2 pr-4 font-medium text-right">Activations</th>
                <th className="py-2 pr-4 font-medium text-right">Incr. Signups</th>
                <th className="py-2 pr-4 font-medium text-right">Incr. Activations</th>
                <th className="py-2 font-medium text-right">Click-to-Signup %</th>
              </tr>
            </thead>
            <tbody>
              {timeSeries.map((row) => {
                const clickToSignup = row.actualClicks > 0
                  ? ((row.signups / row.actualClicks) * 100).toFixed(2)
                  : "—";

                return (
                  <tr
                    key={row.period}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{row.period}</td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {row.actualClicks.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {row.signups.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {row.activations.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono font-semibold">
                      {row.incrementalSignups.toFixed(0)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono font-semibold">
                      {row.incrementalActivations.toFixed(0)}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-500">
                      {clickToSignup}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* eNAU Time Series Table */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-3">eNAU Time Series Data</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 text-left">
                <th className="py-2 pr-4 font-medium">Period</th>
                <th className="py-2 pr-4 font-medium text-right">eNAU (Est.)</th>
                <th className="py-2 pr-4 font-medium text-right">Signups (Actual)</th>
                <th className="py-2 pr-4 font-medium text-right">Activations (Actual)</th>
                <th className="py-2 pr-4 font-medium text-right">Incr. Signups</th>
                <th className="py-2 pr-4 font-medium text-right">Incr. Activations</th>
                <th className="py-2 font-medium text-right">eNAU vs Activations</th>
              </tr>
            </thead>
            <tbody>
              {enauTimeSeries.map((row) => {
                const accuracy = row.eNAU > 0
                  ? ((row.activations / row.eNAU) * 100).toFixed(1)
                  : "—";

                return (
                  <tr
                    key={row.period}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-2 pr-4 font-mono text-xs">{row.period}</td>
                    <td className="py-2 pr-4 text-right font-mono text-purple-600 dark:text-purple-400">
                      {row.eNAU.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {row.signups.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {row.activations.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono font-semibold">
                      {row.incrementalSignups.toFixed(0)}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono font-semibold">
                      {row.incrementalActivations.toFixed(0)}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-500">
                      {accuracy !== "—" ? `${accuracy}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
