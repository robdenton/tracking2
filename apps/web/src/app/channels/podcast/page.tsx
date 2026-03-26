import Link from "next/link";
import { Suspense } from "react";
import { getChannelAnalytics } from "@/lib/data";
import { PodcastChart } from "./chart";
import { PodcastShowTable } from "./show-table";
import { DateRangePicker } from "../newsletter/date-range-picker";
import { prisma } from "@/lib/prisma";

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
      <div className="group absolute top-2 right-2 z-10">
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 cursor-help text-xs select-none">
          ⓘ
        </span>
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

interface PodcastTimeSeriesDataPoint {
  period: string;
  estDownloads: number;
  signups: number;
  activations: number;
  incrementalSignups: number;
  incrementalActivations: number;
}

function getPeriodKey(date: string, grouping: TimeSeriesGrouping): string {
  const d = new Date(date);
  if (grouping === "monthly") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } else {
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

function aggregateToPodcastTimeSeries(
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
): PodcastTimeSeriesDataPoint[] {
  const downloadsByPeriod = new Map<string, number>();
  for (const activity of activities) {
    const period = getPeriodKey(activity.date, grouping);
    const downloads = activity.metadata?.estDownloads ?? 0;
    downloadsByPeriod.set(period, (downloadsByPeriod.get(period) ?? 0) + downloads);
  }

  const metricsByPeriod = new Map<string, { signups: number; activations: number }>();
  for (const metric of dailyMetrics) {
    const period = getPeriodKey(metric.date, grouping);
    const existing = metricsByPeriod.get(period) ?? { signups: 0, activations: 0 };
    metricsByPeriod.set(period, {
      signups: existing.signups + metric.signups,
      activations: existing.activations + metric.activations,
    });
  }

  const incrSignupsByPeriod = new Map<string, number>();
  const incrActivationsByPeriod = new Map<string, number>();
  for (const report of reports) {
    const period = getPeriodKey(report.activity.date, grouping);
    incrSignupsByPeriod.set(period, (incrSignupsByPeriod.get(period) ?? 0) + report.incremental);
    incrActivationsByPeriod.set(period, (incrActivationsByPeriod.get(period) ?? 0) + report.incrementalActivations);
  }

  const allPeriods = new Set([
    ...downloadsByPeriod.keys(),
    ...metricsByPeriod.keys(),
    ...incrSignupsByPeriod.keys(),
  ]);

  return Array.from(allPeriods)
    .sort()
    .map((period) => {
      const signups = metricsByPeriod.get(period)?.signups ?? 0;
      const activations = metricsByPeriod.get(period)?.activations ?? 0;
      const incrementalSignups = Math.min(incrSignupsByPeriod.get(period) ?? 0, signups);
      const incrementalActivations = Math.min(incrActivationsByPeriod.get(period) ?? 0, activations);
      return {
        period,
        estDownloads: downloadsByPeriod.get(period) ?? 0,
        signups,
        activations,
        incrementalSignups,
        incrementalActivations,
      };
    });
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compute podcast baseline from pre-podcast period (Sep 1 – Feb 22, 2026).
 * Uses weekday/weekend median split, zero-filling missing days.
 */
async function computePodcastBaseline() {
  const metrics = await prisma.dailyMetric.findMany({
    where: { channel: "podcast" },
    orderBy: { date: "asc" },
  });
  const metricsMap = new Map<string, { signups: number; activations: number }>();
  for (const m of metrics) metricsMap.set(m.date, { signups: m.signups, activations: m.activations });

  const wdNau: number[] = [];
  const weNau: number[] = [];
  const wdSig: number[] = [];
  const weSig: number[] = [];

  // Sep 1 to Feb 22 (pre-podcast ads)
  const cursor = new Date("2025-09-01T00:00:00Z");
  const end = new Date("2026-02-22T00:00:00Z");
  while (cursor <= end) {
    const ds = cursor.toISOString().slice(0, 10);
    const dow = cursor.getUTCDay();
    const m = metricsMap.get(ds);
    const nau = m?.activations ?? 0;
    const sig = m?.signups ?? 0;
    if (dow >= 1 && dow <= 5) {
      wdNau.push(nau);
      wdSig.push(sig);
    } else {
      weNau.push(nau);
      weSig.push(sig);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  function median(arr: number[]) {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? 0;
  }

  return {
    nauWeekday: median(wdNau),
    nauWeekend: median(weNau),
    sigWeekday: median(wdSig),
    sigWeekend: median(weSig),
  };
}

export default async function PodcastChannelPage({
  searchParams,
}: {
  searchParams: Promise<{ grouping?: string; startDate?: string; endDate?: string }>;
}) {
  const { grouping = "monthly", startDate = "", endDate = "" } = await searchParams;
  const timeGrouping = (grouping === "weekly" ? "weekly" : "monthly") as TimeSeriesGrouping;

  const [channelData, baseline] = await Promise.all([
    getChannelAnalytics("podcast"),
    computePodcastBaseline(),
  ]);
  const { activities: allActivities, dailyMetrics: allDailyMetrics, reports: allReports } = channelData;

  // Apply date range filter
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

  const activityIdsInRange = new Set(activities.map((a) => a.id));
  const reports = allReports.filter((r) => activityIdsInRange.has(r.activity.id));

  // Charts should only show data up to today
  const today = new Date().toISOString().slice(0, 10);
  const chartActivities = activities.filter((a) => a.date <= today);

  const timeSeries = aggregateToPodcastTimeSeries(chartActivities, dailyMetrics, reports, timeGrouping);

  // Totals from daily metrics
  const totalEstDownloads = activities.reduce((s, a) => s + (a.metadata?.estDownloads ?? 0), 0);
  const totalSignups = dailyMetrics.reduce((s, m) => s + m.signups, 0);
  const totalActivations = dailyMetrics.reduce((s, m) => s + m.activations, 0);
  const totalCost = activities.reduce((s, a) => s + (a.costUsd ?? 0), 0);

  // Portfolio-level incremental using weekday/weekend baseline
  // Count calendar days in the daily metrics range
  const metricDates = dailyMetrics.map((m) => m.date).sort();
  const periodStart = metricDates[0] || today;
  const periodEnd = metricDates[metricDates.length - 1] || today;

  let periodWD = 0;
  let periodWE = 0;
  {
    const cursor = new Date(periodStart + "T00:00:00Z");
    const end = new Date(periodEnd + "T00:00:00Z");
    while (cursor <= end) {
      const dow = cursor.getUTCDay();
      if (dow >= 1 && dow <= 5) periodWD++;
      else periodWE++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const expectedSignups = baseline.sigWeekday * periodWD + baseline.sigWeekend * periodWE;
  const expectedNau = baseline.nauWeekday * periodWD + baseline.nauWeekend * periodWE;
  const incrSignups = totalSignups - expectedSignups;
  const incrNau = totalActivations - expectedNau;

  // CPA metrics
  const blendedCpaSignup = totalSignups > 0 ? totalCost / totalSignups : null;
  const blendedCpaNau = totalActivations > 0 ? totalCost / totalActivations : null;
  const incrCpaSignup = incrSignups > 0 ? totalCost / incrSignups : null;
  const incrCpaNau = incrNau > 0 ? totalCost / incrNau : null;
  const cpm = totalEstDownloads > 0 ? (totalCost / totalEstDownloads) * 1000 : null;

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">Podcast Tracking</h1>
      <p className="text-sm text-gray-500 mb-4">
        Aggregated performance across all podcast activities
      </p>

      {/* Date Range Picker */}
      <Suspense>
        <DateRangePicker startDate={startDate} endDate={endDate} />
      </Suspense>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4 overflow-visible">
        <StatCard
          label="Total Activities"
          value={activities.length.toString()}
          tooltip="Number of podcast sponsorships in the selected date range."
          learnMoreHref="/measurement-explained"
        />
        <StatCard
          label="Est. Downloads"
          value={totalEstDownloads > 0 ? totalEstDownloads.toLocaleString() : "—"}
          sub="From bet"
          tooltip="Sum of estimated downloads across all podcast activities. Entered at booking time."
          learnMoreHref="/measurement-explained"
        />
        <StatCard
          label="Account Created"
          value={totalSignups.toLocaleString()}
          sub="Observed"
          tooltip="Total accounts created by users who said 'podcast' in the how-did-you-hear survey. Includes organic podcast attribution."
          learnMoreHref="/measurement-explained#account-created"
        />
        <StatCard
          label="Incr. Account Created"
          value={Math.round(incrSignups).toLocaleString()}
          sub={`vs ${baseline.sigWeekday}/${baseline.sigWeekend} wd/we baseline`}
          tooltip={`Accounts created above the expected baseline. Baseline: ${baseline.sigWeekday}/weekday, ${baseline.sigWeekend}/weekend (median from Sep–Feb pre-podcast period).`}
          learnMoreHref="/measurement-explained#incremental-account-created"
        />
        <StatCard
          label="Incr. NAU (Desktop)"
          value={Math.round(incrNau).toLocaleString()}
          sub={`vs ${baseline.nauWeekday}/${baseline.nauWeekend} wd/we baseline`}
          tooltip={`Activations above the expected baseline. Baseline: ${baseline.nauWeekday}/weekday, ${baseline.nauWeekend}/weekend (median from Sep–Feb pre-podcast period).`}
          learnMoreHref="/measurement-explained#incremental-nau"
        />
      </div>

      {/* Cost / Efficiency Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 overflow-visible">
        <StatCard
          label="Total Spend"
          value={formatCurrency(totalCost)}
          sub={`${activities.length} activities`}
          tooltip="Total podcast sponsorship spend across all activities."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="CPM"
          value={cpm !== null ? formatCurrency(cpm) : "—"}
          sub="Cost / 1K downloads"
          tooltip="Total spend divided by estimated downloads × 1,000."
          learnMoreHref="/measurement-explained"
        />
        <StatCard
          label="Blended Cost / NAU"
          value={formatCurrency(blendedCpaNau)}
          sub="Cost / Total NAU"
          tooltip="Total podcast spend divided by all NAU. Blended — does not subtract baseline."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Incr. CPA"
          value={formatCurrency(incrCpaSignup)}
          sub="Cost / Incr. Signups"
          tooltip="Total podcast spend divided by incremental accounts created above baseline."
          learnMoreHref="/measurement-explained#cpa"
        />
        <StatCard
          label="Incr. Cost / NAU"
          value={formatCurrency(incrCpaNau)}
          sub="Cost / Incr. NAU (Desktop)"
          tooltip="Total podcast spend divided by incremental NAU above baseline. The true cost of an additional activation driven by podcasts."
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

      {/* Est. Downloads vs Account created/NAU Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Est. Downloads vs Performance</h2>
        <PodcastChart data={timeSeries} grouping={timeGrouping} />
      </div>

      {/* Podcast Activities Table */}
      {activities.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-1">Podcast Performance</h2>
          <p className="text-xs text-gray-500 mb-3">
            Grouped by show. Data from Podscribe.
          </p>
          <PodcastShowTable
            activities={activities.map((a) => {
              const meta = typeof a.metadata === "string"
                ? JSON.parse(a.metadata)
                : (a.metadata ?? {});
              return {
                partnerName: a.partnerName,
                date: a.date,
                costUsd: a.costUsd ?? 0,
                impressions: meta.totalImpressions ?? 0,
                visitors: meta.totalVisitors ?? 0,
                visits: meta.totalVisits ?? 0,
                publisher: meta.publisher ?? "",
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
