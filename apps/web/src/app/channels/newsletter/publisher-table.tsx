"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface PublisherRow {
  partnerName: string;
  activityCount: number;
  totalClicks: number;
  totalSpend: number;
  incrementalSignups: number;
  incrementalActivations: number;
  incrementalActivationsAllDevices: number;
  ubIncrSignups: number;
  ubIncrActivations: number;
  ubIncrActivationsAll: number;
  cpc: number | null;
  incrementalCpa: number | null;
}

type SortKey =
  | "partnerName"
  | "activityCount"
  | "totalClicks"
  | "totalSpend"
  | "incrementalSignups"
  | "incrementalActivations"
  | "incrementalActivationsAllDevices"
  | "cpc"
  | "incrementalCpa";

type SortDir = "asc" | "desc";

function SortHeader({
  label,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = key === currentKey;
  return (
    <th
      className={`px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 select-none whitespace-nowrap ${
        align === "left" ? "text-left" : "text-right"
      }`}
      onClick={() => onSort(key)}
    >
      {label}
      {active && (
        <span className="ml-1">{currentDir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );
}

export function PublisherTable({ publishers }: { publishers: PublisherRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalClicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir(key === "partnerName" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const items = [...publishers];
    items.sort((a, b) => {
      if (sortKey === "partnerName") {
        const av = a.partnerName.toLowerCase();
        const bv = b.partnerName.toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls always sort last regardless of direction
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [publishers, sortKey, sortDir]);

  const fmtCurrency = (n: number | null) =>
    n === null
      ? "—"
      : "$" + Math.round(n).toLocaleString();

  if (publishers.length === 0) {
    return <p className="text-sm text-gray-500">No publisher data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <SortHeader
              label="Publisher"
              sortKey="partnerName"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              align="left"
            />
            <SortHeader
              label="Sends"
              sortKey="activityCount"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Clicks"
              sortKey="totalClicks"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Spend"
              sortKey="totalSpend"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="CPC"
              sortKey="cpc"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Incr. Signups"
              sortKey="incrementalSignups"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Incr. NAU (Desktop)"
              sortKey="incrementalActivations"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Incr. NAU (All)"
              sortKey="incrementalActivationsAllDevices"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Incr. CPA"
              sortKey="incrementalCpa"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((pub) => (
            <tr
              key={pub.partnerName}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="px-3 py-2 text-left font-medium max-w-[250px] truncate">
                <Link
                  href={`/partners/${encodeURIComponent(pub.partnerName)}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {pub.partnerName}
                </Link>
              </td>
              <td className="px-3 py-2 text-right font-mono">{pub.activityCount}</td>
              <td className="px-3 py-2 text-right font-mono">{pub.totalClicks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(pub.totalSpend)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(pub.cpc)}</td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {Math.round(Math.min(pub.incrementalSignups, pub.ubIncrSignups)).toLocaleString()}
                <span className="text-gray-400"> – </span>
                {Math.round(Math.max(pub.incrementalSignups, pub.ubIncrSignups)).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {Math.round(Math.min(pub.incrementalActivations, pub.ubIncrActivations)).toLocaleString()}
                <span className="text-gray-400"> – </span>
                {Math.round(Math.max(pub.incrementalActivations, pub.ubIncrActivations)).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {Math.round(Math.min(pub.incrementalActivationsAllDevices, pub.ubIncrActivationsAll)).toLocaleString()}
                <span className="text-gray-400"> – </span>
                {Math.round(Math.max(pub.incrementalActivationsAllDevices, pub.ubIncrActivationsAll)).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {pub.ubIncrActivations > 0 ? fmtCurrency(pub.totalSpend / Math.max(pub.incrementalActivations, pub.ubIncrActivations)) : "—"}
                <span className="text-gray-400"> – </span>
                {pub.incrementalActivations > 0 ? fmtCurrency(pub.totalSpend / Math.min(pub.incrementalActivations, pub.ubIncrActivations || pub.incrementalActivations)) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
