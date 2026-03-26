"use client";

import { useState, useMemo } from "react";

interface PodcastActivity {
  partnerName: string;
  date: string;
  costUsd: number;
  impressions: number;
  visitors: number;
  visits: number;
  publisher: string;
}

interface ShowRow {
  show: string;
  publisher: string;
  episodes: number;
  firstAir: string;
  lastAir: string;
  totalImpressions: number;
  totalVisitors: number;
  totalVisits: number;
  totalSpend: number;
  cpm: number | null;
  costPerVisitor: number | null;
}

type SortKey = "show" | "episodes" | "totalImpressions" | "totalVisitors" | "totalVisits" | "totalSpend" | "cpm" | "costPerVisitor" | "firstAir";
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
      {active && <span className="ml-1">{currentDir === "desc" ? "↓" : "↑"}</span>}
    </th>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function fmtCurrency(n: number | null): string {
  if (n === null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

export function PodcastShowTable({ activities }: { activities: PodcastActivity[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalImpressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir(key === "show" || key === "firstAir" ? "asc" : "desc"); }
  }

  const shows: ShowRow[] = useMemo(() => {
    const map = new Map<string, { publisher: string; dates: string[]; totalImp: number; totalVisitors: number; totalVisits: number; totalSpend: number }>();
    for (const a of activities) {
      const key = a.partnerName;
      const existing = map.get(key) ?? { publisher: a.publisher, dates: [], totalImp: 0, totalVisitors: 0, totalVisits: 0, totalSpend: 0 };
      existing.dates.push(a.date);
      existing.totalImp += a.impressions;
      existing.totalVisitors += a.visitors;
      existing.totalVisits += a.visits;
      existing.totalSpend += a.costUsd;
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([show, data]) => ({
      show,
      publisher: data.publisher,
      episodes: data.dates.length,
      firstAir: data.dates.sort()[0],
      lastAir: data.dates.sort()[data.dates.length - 1],
      totalImpressions: data.totalImp,
      totalVisitors: data.totalVisitors,
      totalVisits: data.totalVisits,
      totalSpend: data.totalSpend,
      cpm: data.totalImp > 0 ? (data.totalSpend / data.totalImp) * 1000 : null,
      costPerVisitor: data.totalVisitors > 0 ? data.totalSpend / data.totalVisitors : null,
    }));
  }, [activities]);

  const sorted = useMemo(() => {
    const items = [...shows];
    items.sort((a, b) => {
      if (sortKey === "show") {
        const av = a.show.toLowerCase(), bv = b.show.toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [shows, sortKey, sortDir]);

  if (activities.length === 0) {
    return <p className="text-sm text-gray-500">No podcast activity data. Run a Podscribe sync to import campaigns.</p>;
  }

  // Totals
  const totEpisodes = shows.reduce((s, r) => s + r.episodes, 0);
  const totImp = shows.reduce((s, r) => s + r.totalImpressions, 0);
  const totVisitors = shows.reduce((s, r) => s + r.totalVisitors, 0);
  const totVisits = shows.reduce((s, r) => s + r.totalVisits, 0);
  const totSpend = shows.reduce((s, r) => s + r.totalSpend, 0);
  const totCpm = totImp > 0 ? (totSpend / totImp) * 1000 : null;
  const totCpv = totVisitors > 0 ? totSpend / totVisitors : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <SortHeader label="Podcast" sortKey="show" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Publisher</th>
            <SortHeader label="Episodes" sortKey="episodes" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Air Date" sortKey="firstAir" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Impressions" sortKey="totalImpressions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Visitors" sortKey="totalVisitors" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Visits" sortKey="totalVisits" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Spend" sortKey="totalSpend" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="CPM" sortKey="cpm" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Cost / Visitor" sortKey="costPerVisitor" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.show} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-3 py-2 font-medium max-w-[250px] truncate">{row.show}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[180px] truncate">{row.publisher}</td>
              <td className="px-3 py-2 text-right font-mono">{row.episodes}</td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                {row.episodes > 1 ? `${row.firstAir} – ${row.lastAir}` : row.firstAir}
              </td>
              <td className="px-3 py-2 text-right font-mono">{fmtNum(row.totalImpressions)}</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(row.totalVisitors).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(row.totalVisits).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.totalSpend)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.cpm)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.costPerVisitor)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold bg-gray-50 dark:bg-gray-900">
          <tr>
            <td className="px-3 py-2 text-left">Total</td>
            <td />
            <td className="px-3 py-2 text-right font-mono">{totEpisodes}</td>
            <td />
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totImp)}</td>
            <td className="px-3 py-2 text-right font-mono">{Math.round(totVisitors).toLocaleString()}</td>
            <td className="px-3 py-2 text-right font-mono">{Math.round(totVisits).toLocaleString()}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtCurrency(totSpend)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtCurrency(totCpm)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtCurrency(totCpv)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
