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
} from "../format";

type SortColumn =
  | "date"
  | "partner"
  | "cost"
  | "estimatedCPC"
  | "actualCPC"
  | "estimatedClicks"
  | "actualClicks"
  | "cpa"
  | "incremental";
type SortDirection = "asc" | "desc";

interface ActivityTableProps {
  reports: ActivityReport[];
  selectedChannel: string | null;
}

export function ActivityTable({ reports, selectedChannel }: ActivityTableProps) {
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
      className={`py-2 pr-4 text-xs font-medium cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 ${
        align === "right" ? "text-right" : ""
      }`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {sortColumn === column && (
          <span className="text-gray-400">
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
        <tr className="border-b border-gray-300 dark:border-gray-700 text-left text-gray-500">
          <SortableHeader column="date">Date</SortableHeader>
          <SortableHeader column="partner">Partner</SortableHeader>
          <th className="py-2 pr-4 text-xs font-medium">Channel</th>
          <th className="py-2 pr-4 text-xs font-medium">Status</th>

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
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="py-2 pr-4 font-mono text-xs">{r.activity.date}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/partners/${encodeURIComponent(r.activity.partnerName)}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {r.activity.partnerName}
                </Link>
              </td>
              <td className="py-2 pr-4 text-gray-500">{r.activity.channel}</td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs ${
                    r.activity.status === "live"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : r.activity.status === "booked"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {r.activity.status}
                </span>
              </td>

              <td className="py-2 pr-4 text-right font-mono text-gray-500">
                {r.activity.costUsd
                  ? `$${r.activity.costUsd.toLocaleString()}`
                  : "—"}
              </td>

              {showNewsletterColumns ? (
                <>
                  <td className="py-2 pr-4 text-right font-mono text-gray-500">
                    {formatCPC(estimatedCPC)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-500">
                    {formatCPC(actualCPC)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-500">
                    {r.activity.actualClicks?.toLocaleString() ?? "—"}
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {formatBetSummary(r.activity.channel, r.activity.metadata)}
                  </td>
                </>
              )}

              <td className="py-2 pr-4 text-right font-mono font-semibold">
                {r.incrementalActivations > 0 ? `+${r.incrementalActivations.toFixed(0)}` : "0"}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-gray-500">
                {formatCPA(calculateCPA({ costUsd: r.activity.costUsd, incremental: r.incrementalActivations }))}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    r.confidence === "HIGH"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : r.confidence === "MED"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {r.confidence}
                </span>
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
          );
        })}
      </tbody>
    </table>
  );
}
