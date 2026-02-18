import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerReports } from "@/lib/data";
import type { ActivityReport, Confidence } from "@mai/core";
import {
  formatBetSummary,
  calculateCPA,
  formatCPA,
  formatCompact,
} from "../../format";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Sub-components (inline, same pattern as activity detail page)
// ---------------------------------------------------------------------------

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
      <div className="text-xl font-mono font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function ConfidenceBadge({ level }: { level: Confidence }) {
  const colors = {
    HIGH: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors =
    status === "live"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : status === "booked"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${colors}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helper: aggregate stats across a set of reports
// ---------------------------------------------------------------------------

function computeAggregates(reports: ActivityReport[]) {
  const liveReports = reports.filter((r) => r.activity.status === "live");
  const totalSpend = liveReports.reduce(
    (s, r) => s + (r.activity.costUsd ?? 0),
    0,
  );
  const totalIncremental = liveReports.reduce(
    (s, r) => s + r.incrementalActivations,
    0,
  );
  const blendedCPA =
    totalSpend > 0 && totalIncremental > 0
      ? totalSpend / totalIncremental
      : null;

  return { totalSpend, totalIncremental, blendedCPA, count: reports.length };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ partner: string }>;
}) {
  const { partner } = await params;
  const partnerName = decodeURIComponent(partner);

  const reports = await getPartnerReports(partnerName);

  if (reports.length === 0) notFound();

  // Sort newest first
  const sorted = [...reports].sort((a, b) =>
    b.activity.date.localeCompare(a.activity.date),
  );

  // Aggregate stats
  const { totalSpend, totalIncremental, blendedCPA, count } =
    computeAggregates(reports);

  // Channel URL — use first non-null across activities
  const channelUrl =
    reports.find((r) => r.activity.channelUrl)?.activity.channelUrl ?? null;

  // Channels this partner has appeared on
  const channelNames = Array.from(
    new Set(reports.map((r) => r.activity.channel)),
  ).sort();
  const isMultiChannel = channelNames.length > 1;

  // Per-channel breakdown
  const channelBreakdown = channelNames.map((ch) => {
    const chReports = reports.filter((r) => r.activity.channel === ch);
    const liveChReports = chReports.filter(
      (r) => r.activity.status === "live",
    );
    const spend = liveChReports.reduce(
      (s, r) => s + (r.activity.costUsd ?? 0),
      0,
    );
    const incremental = liveChReports.reduce(
      (s, r) => s + r.incrementalActivations,
      0,
    );
    return { channel: ch, spend, incremental, count: chReports.length };
  });

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      {/* Header */}
      <h1 className="text-2xl font-bold mb-1">{partnerName}</h1>
      <p className="text-sm text-gray-500 mb-2">
        {count} {count === 1 ? "activity" : "activities"} &middot;{" "}
        {channelNames.join(", ")}
      </p>
      {channelUrl && (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          → Channel
        </a>
      )}

      {/* Aggregate stats */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Activities"
            value={String(count)}
            sub={`${channelNames.join(", ")}`}
          />
          <StatCard
            label="Total Spend"
            value={totalSpend > 0 ? `$${totalSpend.toLocaleString()}` : "—"}
            sub="live activities only"
          />
          <StatCard
            label="Total Incr. Activations"
            value={
              totalIncremental > 0
                ? `+${totalIncremental.toFixed(0)}`
                : "0"
            }
            sub="live activities only"
          />
          <StatCard
            label="Blended CPA"
            value={
              blendedCPA != null
                ? `$${blendedCPA.toFixed(2)}`
                : "—"
            }
            sub="spend ÷ activations"
          />
        </div>
      </div>

      {/* Channel breakdown — only shown when partner spans multiple channels */}
      {isMultiChannel && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">By Channel</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-700 text-left text-gray-500">
                  <th className="py-2 pr-4 text-xs font-medium">Channel</th>
                  <th className="py-2 pr-4 text-xs font-medium text-right">
                    Activities
                  </th>
                  <th className="py-2 pr-4 text-xs font-medium text-right">
                    Spend
                  </th>
                  <th className="py-2 text-xs font-medium text-right">
                    Incr. Activations
                  </th>
                </tr>
              </thead>
              <tbody>
                {channelBreakdown.map((row) => (
                  <tr
                    key={row.channel}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                      {row.channel}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-500">
                      {row.count}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-gray-500">
                      {row.spend > 0
                        ? `$${row.spend.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {row.incremental > 0
                        ? `+${row.incremental.toFixed(0)}`
                        : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activities table */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-3">All Activities</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 text-left text-gray-500">
                <th className="py-2 pr-4 text-xs font-medium">Date</th>
                <th className="py-2 pr-4 text-xs font-medium">Channel</th>
                <th className="py-2 pr-4 text-xs font-medium">Type</th>
                <th className="py-2 pr-4 text-xs font-medium">Status</th>
                <th className="py-2 pr-4 text-xs font-medium text-right">
                  Cost
                </th>
                <th className="py-2 pr-4 text-xs font-medium">The Bet</th>
                <th className="py-2 pr-4 text-xs font-medium text-right">
                  Incr. Activations
                </th>
                <th className="py-2 pr-4 text-xs font-medium text-right">
                  CPA
                </th>
                <th className="py-2 pr-4 text-xs font-medium">Confidence</th>
                <th className="py-2 text-xs font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.activity.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="py-2 pr-4 font-mono text-xs">
                    {r.activity.date}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">
                    {r.activity.channel}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                    {r.activity.activityType}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={r.activity.status} />
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-500">
                    {r.activity.costUsd
                      ? `$${r.activity.costUsd.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {formatBetSummary(
                      r.activity.channel,
                      r.activity.metadata,
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono font-semibold">
                    {r.incrementalActivations > 0
                      ? `+${r.incrementalActivations.toFixed(0)}`
                      : "0"}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-500">
                    {formatCPA(
                      calculateCPA({
                        costUsd: r.activity.costUsd,
                        incremental: r.incrementalActivations,
                      }),
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <ConfidenceBadge level={r.confidence} />
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/activity/${r.activity.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
