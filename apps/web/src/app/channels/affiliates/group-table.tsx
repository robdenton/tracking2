"use client";

import { useMemo, useState } from "react";

interface GroupRow {
  groupName: string;
  partnerCount: number;
  clicks: number;
  leads: number;
  conversions: number;
  commissions: number; // cents
  cpl: number | null; // cents
  clickToLeadPct: number;
  leadToConvPct: number;
}

type SortKey = "groupName" | "partnerCount" | "clicks" | "leads" | "conversions" | "commissions" | "cpl" | "clickToLeadPct" | "leadToConvPct";
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

export function GroupTable({ groups }: { groups: GroupRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("leads");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir(key === "groupName" ? "asc" : "desc"); }
  }

  const sorted = useMemo(() => {
    const items = [...groups];
    items.sort((a, b) => {
      const av = sortKey === "groupName" ? a.groupName.toLowerCase() : (a[sortKey] ?? -1);
      const bv = sortKey === "groupName" ? b.groupName.toLowerCase() : (b[sortKey] ?? -1);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [groups, sortKey, sortDir]);

  const fmtDollars = (cents: number | null) => cents == null ? "—" : "$" + Math.round(cents / 100).toLocaleString();
  const fmtPct = (n: number) => n.toFixed(1) + "%";

  const totals = groups.reduce((s, g) => ({
    partners: s.partners + g.partnerCount, clicks: s.clicks + g.clicks,
    leads: s.leads + g.leads, conversions: s.conversions + g.conversions,
    commissions: s.commissions + g.commissions,
  }), { partners: 0, clicks: 0, leads: 0, conversions: 0, commissions: 0 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <SortHeader label="Group" sortKey="groupName" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Partners" sortKey="partnerCount" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Clicks" sortKey="clicks" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Leads" sortKey="leads" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Conversions" sortKey="conversions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Commissions" sortKey="commissions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="CPL" sortKey="cpl" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Click→Lead" sortKey="clickToLeadPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Lead→Conv" sortKey="leadToConvPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => (
            <tr key={g.groupName} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-3 py-2 font-medium">{g.groupName}</td>
              <td className="px-3 py-2 text-right font-mono">{g.partnerCount}</td>
              <td className="px-3 py-2 text-right font-mono">{g.clicks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{g.leads.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{g.conversions.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtDollars(g.commissions)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtDollars(g.cpl)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtPct(g.clickToLeadPct)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtPct(g.leadToConvPct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold bg-gray-50 dark:bg-gray-900">
          <tr>
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right font-mono">{totals.partners}</td>
            <td className="px-3 py-2 text-right font-mono">{totals.clicks.toLocaleString()}</td>
            <td className="px-3 py-2 text-right font-mono">{totals.leads.toLocaleString()}</td>
            <td className="px-3 py-2 text-right font-mono">{totals.conversions.toLocaleString()}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtDollars(totals.commissions)}</td>
            <td className="px-3 py-2 text-right font-mono">{totals.leads > 0 ? fmtDollars(totals.commissions / totals.leads) : "—"}</td>
            <td className="px-3 py-2 text-right font-mono">{totals.clicks > 0 ? fmtPct((totals.leads / totals.clicks) * 100) : "—"}</td>
            <td className="px-3 py-2 text-right font-mono">{totals.leads > 0 ? fmtPct((totals.conversions / totals.leads) * 100) : "—"}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
