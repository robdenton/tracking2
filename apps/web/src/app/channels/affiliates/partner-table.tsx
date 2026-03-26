"use client";

import { useMemo, useState } from "react";

interface PartnerRow {
  name: string;
  groupName: string;
  clicks: number;
  leads: number;
  conversions: number;
  commissions: number; // cents
  cpl: number | null; // cents
  clickToLeadPct: number;
}

type SortKey = "name" | "groupName" | "clicks" | "leads" | "conversions" | "commissions" | "cpl" | "clickToLeadPct";
type SortDir = "asc" | "desc";

function SortHeader({ label, sortKey: key, currentKey, currentDir, onSort, align = "right" }: {
  label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir;
  onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const active = key === currentKey;
  return (
    <th className={`px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 select-none whitespace-nowrap ${align === "left" ? "text-left" : "text-right"}`} onClick={() => onSort(key)}>
      {label}{active && <span className="ml-1">{currentDir === "desc" ? "↓" : "↑"}</span>}
    </th>
  );
}

export function PartnerTable({ partners }: { partners: PartnerRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("leads");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir(key === "name" || key === "groupName" ? "asc" : "desc"); }
  }

  const sorted = useMemo(() => {
    const items = [...partners];
    items.sort((a, b) => {
      const av = (sortKey === "name" || sortKey === "groupName") ? (a[sortKey] as string).toLowerCase() : (a[sortKey] ?? -1);
      const bv = (sortKey === "name" || sortKey === "groupName") ? (b[sortKey] as string).toLowerCase() : (b[sortKey] ?? -1);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [partners, sortKey, sortDir]);

  const fmtDollars = (cents: number | null) => cents == null ? "—" : "$" + Math.round(cents / 100).toLocaleString();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <SortHeader label="Partner" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Group" sortKey="groupName" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Clicks" sortKey="clicks" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Leads" sortKey="leads" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Conversions" sortKey="conversions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Commissions" sortKey="commissions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="CPL" sortKey="cpl" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Click→Lead" sortKey="clickToLeadPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.name} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-3 py-2 font-medium max-w-[200px] truncate">{p.name}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">{p.groupName}</td>
              <td className="px-3 py-2 text-right font-mono">{p.clicks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{p.leads.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{p.conversions.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtDollars(p.commissions)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtDollars(p.cpl)}</td>
              <td className="px-3 py-2 text-right font-mono">{p.clickToLeadPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
