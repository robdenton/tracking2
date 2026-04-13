"use client";

import { useState } from "react";
import Link from "next/link";
import type { ActivityReport } from "@mai/core";

import {
  formatBetSummary,
  calculateEstimatedCPC,
  calculateActualCPC,
  formatCPC,
  calculateCPA,
  formatCPA,
  formatDisplayDate,
} from "../format";

type SortColumn =
  | "date"
  | "partner"
  | "cost"
  | "estimatedCPC"
  | "actualCPC"
  | "estimatedClicks"
  | "actualClicks"
  | "clickConversion"
  | "cpa"
  | "incremental";
type SortDirection = "asc" | "desc";

interface ActivityTableProps {
  reports: ActivityReport[];
  selectedChannel: string | null;
  /** Pooled click→incremental NAU rate across all live newsletters, for vs-avg display */
  clickConversionAvg?: number;
  /** Dub click data per activity ID (from getDubClicksByActivity) */
  dubClicksMap?: Record<string, { dubClicks: number; dubLeads: number; shortLink: string }>;
  /** Show tag column for tagging activities as affiliate etc */
  showTagColumn?: boolean;
}

function TagDropdown({ activityId, currentTag }: { activityId: string; currentTag: string | null }) {
  const [tag, setTag] = useState<string>(currentTag || "");
  const [saving, setSaving] = useState(false);

  async function handleChange(newTag: string) {
    setTag(newTag);
    setSaving(true);
    try {
      await fetch("/api/activities/tag", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, tag: newTag || null }),
      });
    } catch (e) {
      console.error("Failed to save tag:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={tag}
      onChange={(e) => handleChange(e.target.value)}
      className={`text-xs px-1.5 py-0.5 rounded border border-border-light bg-surface ${
        saving ? "opacity-50" : ""
      } ${tag === "affiliate" ? "text-[#92400E] bg-[#FEF3C7]" : "text-text-secondary"}`}
    >
      <option value="">—</option>
      <option value="affiliate">affiliate</option>
      <option value="paid">paid</option>
    </select>
  );
}

export function ActivityTable({ reports, selectedChannel, clickConversionAvg, dubClicksMap, showTagColumn }: ActivityTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Sorting logic
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedReports = [...reports].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case "date":
        aVal = a.activity.date;
        bVal = b.activity.date;
        break;
      case "partner":
        aVal = a.activity.partnerName.toLowerCase();
        bVal = b.activity.partnerName.toLowerCase();
        break;
      case "cost":
        aVal = a.activity.costUsd ?? 0;
        bVal = b.activity.costUsd ?? 0;
        break;
      case "estimatedCPC":
        aVal = calculateEstimatedCPC(a.activity) ?? 0;
        bVal = calculateEstimatedCPC(b.activity) ?? 0;
        break;
      case "actualCPC":
        aVal = calculateActualCPC(a.activity) ?? 0;
        bVal = calculateActualCPC(b.activity) ?? 0;
        break;
      case "estimatedClicks":
        aVal = a.activity.deterministicClicks ?? 0;
        bVal = b.activity.deterministicClicks ?? 0;
        break;
      case "actualClicks":
        aVal = a.activity.actualClicks ?? 0;
        bVal = b.activity.actualClicks ?? 0;
        break;
      case "clickConversion":
        aVal = (a.activity.actualClicks ?? 0) > 0
          ? a.incrementalActivations / (a.activity.actualClicks as number)
          : 0;
        bVal = (b.activity.actualClicks ?? 0) > 0
          ? b.incrementalActivations / (b.activity.actualClicks as number)
          : 0;
        break;
      case "cpa":
        aVal = calculateCPA({ costUsd: a.activity.costUsd, incremental: a.incrementalActivations }) ?? Infinity;
        bVal = calculateCPA({ costUsd: b.activity.costUsd, incremental: b.incrementalActivations }) ?? Infinity;
        break;
      case "incremental":
        aVal = a.incrementalActivations;
        bVal = b.incrementalActivations;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Render sortable column header
  const SortableHeader = ({
    column,
    children,
    align = "left",
  }: {
    column: SortColumn;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <th
      className={`py-2 pr-4 text-xs font-medium cursor-pointer hover:text-text-primary ${
        align === "right" ? "text-right" : ""
      }`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {sortColumn === column && (
          <span className="text-text-muted">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  // Determine if we're showing newsletter-specific columns
  const showNewsletterColumns = selectedChannel === "newsletter";

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border  text-left text-text-secondary">
          <SortableHeader column="date">Date</SortableHeader>
          <SortableHeader column="partner">Partner</SortableHeader>
          <th className="py-2 pr-4 text-xs font-medium">Channel</th>
          <th className="py-2 pr-4 text-xs font-medium">Status</th>
          {showTagColumn && (
            <th className="py-2 pr-4 text-xs font-medium">Tag</th>
          )}

          <SortableHeader column="cost" align="right">
            Cost
          </SortableHeader>

          {showNewsletterColumns ? (
            <>
              <SortableHeader column="estimatedCPC" align="right">
                Est. CPC
              </SortableHeader>
              <SortableHeader column="actualCPC" align="right">
                Actual CPC
              </SortableHeader>
              <SortableHeader column="actualClicks" align="right">
                Actual Clicks
              </SortableHeader>
              {dubClicksMap && (
                <th className="py-2 pr-4 text-xs font-medium text-right">
                  Dub Clicks
                </th>
              )}
              <SortableHeader column="clickConversion" align="right">
                Click → Incr. NAU %
              </SortableHeader>
            </>
          ) : (
            <>
              <th className="py-2 pr-4 text-xs font-medium">The Bet</th>
            </>
          )}

          <SortableHeader column="incremental" align="right">
            Incr. Activations
          </SortableHeader>
          <SortableHeader column="cpa" align="right">
            CPA
          </SortableHeader>
          <th className="py-2 pr-4 text-xs font-medium">Confidence</th>
          <th className="py-2 pr-4 text-xs font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {sortedReports.map((r) => {
          const estimatedCPC = calculateEstimatedCPC(r.activity);
          const actualCPC = calculateActualCPC(r.activity);

          return (
            <tr
              key={r.activity.id}
              className="border-b border-border-light hover:bg-surface-sunken"
            >
              <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{formatDisplayDate(r.activity.date)}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/partners/${encodeURIComponent(r.activity.partnerName)}`}
                  className="text-accent-strong hover:underline"
                >
                  {r.activity.partnerName}
                </Link>
              </td>
              <td className="py-2 pr-4 text-text-secondary">{r.activity.channel}</td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs ${
                    r.activity.status === "live"
                      ? "bg-accent-light text-accent-strong"
                      : r.activity.status === "booked"
                      ? "bg-accent-light text-accent-strong"
                      : "bg-surface-sunken text-text-secondary"
                  }`}
                >
                  {r.activity.status}
                </span>
              </td>
              {showTagColumn && (
                <td className="py-2 pr-4">
                  <TagDropdown activityId={r.activity.id} currentTag={r.activity.tag} />
                </td>
              )}

              <td className="py-2 pr-4 text-right font-mono text-text-secondary">
                {r.activity.costUsd
                  ? `$${r.activity.costUsd.toLocaleString()}`
                  : "—"}
              </td>

              {showNewsletterColumns ? (
                <>
                  <td className="py-2 pr-4 text-right font-mono text-text-secondary">
                    {formatCPC(estimatedCPC)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-text-secondary">
                    {formatCPC(actualCPC)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-text-secondary">
                    {r.activity.actualClicks?.toLocaleString() ?? "—"}
                  </td>
                  {dubClicksMap && (
                    <td className="py-2 pr-4 text-right font-mono">
                      {(() => {
                        const dub = dubClicksMap[r.activity.id];
                        if (!dub) return <span className="text-text-muted">—</span>;
                        const actual = r.activity.actualClicks ?? 0;
                        const diff = actual > 0 ? ((dub.dubClicks - actual) / actual) * 100 : 0;
                        const showDiff = actual > 0 && dub.dubClicks > 0;
                        return (
                          <span>
                            <span className="text-text-secondary">{dub.dubClicks.toLocaleString()}</span>
                            {showDiff && (
                              <span
                                className={`ml-1 text-[10px] ${
                                  Math.abs(diff) > 30
                                    ? "text-amber-500"
                                    : "text-text-muted"
                                }`}
                                title={`${diff > 0 ? "+" : ""}${diff.toFixed(0)}% vs actual`}
                              >
                                {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </td>
                  )}
                  <td className="py-2 pr-4 text-right font-mono">
                    {(() => {
                      const clicks = r.activity.actualClicks ?? 0;
                      if (clicks === 0 || r.incrementalActivations <= 0) {
                        return <span className="text-text-muted">—</span>;
                      }
                      const rate = r.incrementalActivations / clicks;
                      const aboveAvg = clickConversionAvg != null && rate >= clickConversionAvg;
                      return (
                        <span className={aboveAvg ? "text-accent-strong400 font-semibold" : "text-text-secondary"}>
                          {(rate * 100).toFixed(1)}%
                        </span>
                      );
                    })()}
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 pr-4 text-xs text-text-secondary">
                    {formatBetSummary(r.activity.channel, r.activity.metadata)}
                  </td>
                </>
              )}

              <td className="py-2 pr-4 text-right font-mono font-semibold">
                {r.incrementalActivations > 0 ? `+${r.incrementalActivations.toFixed(0)}` : "0"}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-text-secondary">
                {formatCPA(calculateCPA({ costUsd: r.activity.costUsd, incremental: r.incrementalActivations }))}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    r.confidence === "HIGH"
                      ? "bg-accent-light text-accent-strong"
                      : r.confidence === "MED"
                      ? "bg-[#FEF3C7] text-[#92400E]"
                      : "bg-surface-sunken text-text-secondary"
                  }`}
                >
                  {r.confidence}
                </span>
              </td>
              <td className="py-2">
                <Link
                  href={`/activity/${r.activity.id}`}
                  className="text-sm text-accent-strong hover:underline"
                >
                  Detail
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
