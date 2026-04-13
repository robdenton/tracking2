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

function SortHeader({ label, sortKey: key, currentKey, currentDir, onSort, align = "right", title }: {
  label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir;
  onSort: (k: SortKey) => void; align?: "left" | "right"; title?: string;
}) {
  const active = key === currentKey;
  return (
    <th className={`px-3 py-2 text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary select-none whitespace-nowrap ${align === "left" ? "text-left" : "text-right"}`} onClick={() => onSort(key)} title={title}>
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
        <thead className="border-b border-border-light">
          <tr>
            <SortHeader label="Partner" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Group" sortKey="groupName" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <SortHeader label="Clicks" sortKey="clicks" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="NAU" sortKey="leads" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="New Activated Users — mapped from Dub 'lead' event" />
            <SortHeader label="Conversions" sortKey="conversions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Commissions" sortKey="commissions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="CPA" sortKey="cpl" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="Cost per NAU — commissions ÷ NAU" />
            <SortHeader label="Click→NAU" sortKey="clickToLeadPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="Click to NAU conversion rate" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.name} className="border-b border-border-light hover:bg-surface-sunken">
              <td className="px-3 py-2 font-medium max-w-[200px] truncate">{p.name}</td>
              <td className="px-3 py-2 text-text-secondary text-xs">{p.groupName}</td>
              <td className="px-3 py-2 text-right font-mono">{p.clicks.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{p.leads.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{p.conversions.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtDollars(p.commissions)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtDollars(p.cpl)}</td>
              <td className="px-3 py-2 text-right font-mono">{p.clickToLeadPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        {(() => {
          const totClicks = partners.reduce((s, p) => s + p.clicks, 0);
          const totNAU = partners.reduce((s, p) => s + p.leads, 0);
          const totConv = partners.reduce((s, p) => s + p.conversions, 0);
          const totComm = partners.reduce((s, p) => s + p.commissions, 0);
          return (
            <tfoot className="border-t-2 border-border  font-semibold bg-surface-sunken">
              <tr>
                <td className="px-3 py-2">Total ({partners.length})</td>
                <td />
                <td className="px-3 py-2 text-right font-mono">{totClicks.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">{totNAU.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">{totConv.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtDollars(totComm)}</td>
                <td className="px-3 py-2 text-right font-mono">{totNAU > 0 ? fmtDollars(totComm / totNAU) : "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{totClicks > 0 ? (totNAU / totClicks * 100).toFixed(1) + "%" : "—"}</td>
              </tr>
            </tfoot>
          );
        })()}
      </table>
    </div>
  );
}
