"use client";

import { useState, useMemo } from "react";
import { formatDisplayDate } from "../../format";

interface PodcastActivity {
  partnerName: string;
  date: string;
  costUsd: number;
  impressions: number;
  visitors: number;
  visits: number;
  publisher: string;
}

type SortKey = "show" | "publisher" | "date" | "impressions" | "visitors" | "visits" | "spend" | "cpm" | "costPerVisitor";
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

interface EpisodeRow {
  show: string;
  publisher: string;
  date: string;
  impressions: number;
  visitors: number;
  visits: number;
  spend: number;
  cpm: number | null;
  costPerVisitor: number | null;
}

export function PodcastShowTable({ activities }: { activities: PodcastActivity[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("impressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir(key === "show" || key === "publisher" || key === "date" ? "asc" : "desc"); }
  }

  const rows: EpisodeRow[] = useMemo(() => {
    return activities.map((a) => ({
      show: a.partnerName,
      publisher: a.publisher,
      date: a.date,
      impressions: a.impressions,
      visitors: a.visitors,
      visits: a.visits,
      spend: a.costUsd,
      cpm: a.impressions > 0 ? (a.costUsd / a.impressions) * 1000 : null,
      costPerVisitor: a.visitors > 0 ? a.costUsd / a.visitors : null,
    }));
  }, [activities]);

  const sorted = useMemo(() => {
    const items = [...rows];
    items.sort((a, b) => {
      if (sortKey === "show" || sortKey === "publisher" || sortKey === "date") {
        const av = (a[sortKey] as string).toLowerCase();
        const bv = (b[sortKey] as string).toLowerCase();
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
  }, [rows, sortKey, sortDir]);

  if (activities.length === 0) {
    return <p className="text-sm text-text-secondary">No podcast activity data. Run a Podscribe sync to import campaigns.</p>;
  }

  const totImp = rows.reduce((s, r) => s + r.impressions, 0);
  const totVisitors = rows.reduce((s, r) => s + r.visitors, 0);
  const totVisits = rows.reduce((s, r) => s + r.visits, 0);
  const totSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totCpm = totImp > 0 ? (totSpend / totImp) * 1000 : null;
  const totCpv = totVisitors > 0 ? totSpend / totVisitors : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border-light">
          <tr>
            <SortHeader label="Podcast" sortKey="show" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Publisher" sortKey="publisher" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Air Date" sortKey="date" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Impressions" sortKey="impressions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Visitors" sortKey="visitors" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Visits" sortKey="visits" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Spend" sortKey="spend" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="CPM" sortKey="cpm" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Cost / Visitor" sortKey="costPerVisitor" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={`${row.show}-${row.date}-${i}`} className="border-b border-border-light hover:bg-surface-sunken">
              <td className="px-3 py-2 font-medium max-w-[250px] truncate">{row.show}</td>
              <td className="px-3 py-2 text-text-secondary max-w-[180px] truncate">{row.publisher}</td>
              <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{formatDisplayDate(row.date)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNum(row.impressions)}</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(row.visitors).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{Math.round(row.visits).toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.spend)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.cpm)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.costPerVisitor)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-border  font-semibold bg-surface-sunken">
          <tr>
            <td className="px-3 py-2 text-left">Total ({rows.length} episodes)</td>
            <td />
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
