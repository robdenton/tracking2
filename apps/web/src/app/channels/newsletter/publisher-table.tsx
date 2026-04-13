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
      className={`px-3 py-2 text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary select-none whitespace-nowrap ${
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
    return <p className="text-sm text-text-secondary">No publisher data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border-light">
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
              className="border-b border-border-light hover:bg-surface-sunken"
            >
              <td className="px-3 py-2 text-left font-medium max-w-[250px] truncate">
                <Link
                  href={`/partners/${encodeURIComponent(pub.partnerName)}`}
                  className="text-accent-strong hover:underline"
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
                <span className="text-text-muted"> – </span>
                {Math.round(Math.max(pub.incrementalSignups, pub.ubIncrSignups)).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {Math.round(Math.min(pub.incrementalActivations, pub.ubIncrActivations)).toLocaleString()}
                <span className="text-text-muted"> – </span>
                {Math.round(Math.max(pub.incrementalActivations, pub.ubIncrActivations)).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {Math.round(Math.min(pub.incrementalActivationsAllDevices, pub.ubIncrActivationsAll)).toLocaleString()}
                <span className="text-text-muted"> – </span>
                {Math.round(Math.max(pub.incrementalActivationsAllDevices, pub.ubIncrActivationsAll)).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {pub.ubIncrActivations > 0 ? fmtCurrency(pub.totalSpend / Math.max(pub.incrementalActivations, pub.ubIncrActivations)) : "—"}
                <span className="text-text-muted"> – </span>
                {pub.incrementalActivations > 0 ? fmtCurrency(pub.totalSpend / Math.min(pub.incrementalActivations, pub.ubIncrActivations || pub.incrementalActivations)) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-border  font-semibold bg-surface-sunken">
          {(() => {
            const totSends = publishers.reduce((s, p) => s + p.activityCount, 0);
            const totClicks = publishers.reduce((s, p) => s + p.totalClicks, 0);
            const totSpend = publishers.reduce((s, p) => s + p.totalSpend, 0);
            const totIS = publishers.reduce((s, p) => s + p.incrementalSignups, 0);
            const totUbIS = publishers.reduce((s, p) => s + p.ubIncrSignups, 0);
            const totIN = publishers.reduce((s, p) => s + p.incrementalActivations, 0);
            const totUbIN = publishers.reduce((s, p) => s + p.ubIncrActivations, 0);
            const totINA = publishers.reduce((s, p) => s + p.incrementalActivationsAllDevices, 0);
            const totUbINA = publishers.reduce((s, p) => s + p.ubIncrActivationsAll, 0);
            const loIN = Math.min(totIN, totUbIN);
            const hiIN = Math.max(totIN, totUbIN);
            return (
              <tr>
                <td className="px-3 py-2 text-left">Total</td>
                <td className="px-3 py-2 text-right font-mono">{totSends}</td>
                <td className="px-3 py-2 text-right font-mono">{totClicks.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtCurrency(totSpend)}</td>
                <td className="px-3 py-2 text-right font-mono">{totClicks > 0 ? fmtCurrency(totSpend / totClicks) : "—"}</td>
                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                  {Math.round(Math.min(totIS, totUbIS)).toLocaleString()}
                  <span className="text-text-muted"> – </span>
                  {Math.round(Math.max(totIS, totUbIS)).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                  {Math.round(loIN).toLocaleString()}
                  <span className="text-text-muted"> – </span>
                  {Math.round(hiIN).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                  {Math.round(Math.min(totINA, totUbINA)).toLocaleString()}
                  <span className="text-text-muted"> – </span>
                  {Math.round(Math.max(totINA, totUbINA)).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                  {hiIN > 0 ? fmtCurrency(totSpend / hiIN) : "—"}
                  <span className="text-text-muted"> – </span>
                  {loIN > 0 ? fmtCurrency(totSpend / loIN) : "—"}
                </td>
              </tr>
            );
          })()}
        </tfoot>
      </table>
    </div>
  );
}
