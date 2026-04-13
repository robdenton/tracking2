"use client";

import { useMemo, useState } from "react";

interface GroupRow {
  groupId: string;
  groupName: string;
  groupTag: string | null;
  partnerCount: number;
  clicks: number;
  leads: number;
  conversions: number;
  commissions: number; // cents
  cpl: number | null; // cents
  clickToLeadPct: number;
  leadToConvPct: number;
}

function TagDropdown({ groupId, currentTag }: { groupId: string; currentTag: string | null }) {
  const [tag, setTag] = useState<string>(currentTag || "");
  const [saving, setSaving] = useState(false);

  async function handleChange(newTag: string) {
    setTag(newTag);
    setSaving(true);
    try {
      await fetch("/api/affiliates/group-tag", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, tag: newTag || null }),
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
      } ${tag === "affiliate" ? "text-accent-strong bg-accent-light/30" : "text-text-secondary"}`}
    >
      <option value="">—</option>
      <option value="affiliate">affiliate</option>
      <option value="influencer">influencer</option>
      <option value="newsletter">newsletter</option>
    </select>
  );
}

type SortKey = "groupName" | "partnerCount" | "clicks" | "leads" | "conversions" | "commissions" | "cpl" | "clickToLeadPct" | "leadToConvPct";
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
        <thead className="border-b border-border-light">
          <tr>
            <SortHeader label="Group" sortKey="groupName" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
            <th className="px-3 py-2 text-xs font-medium text-text-secondary text-left">Tag</th>
            <SortHeader label="Partners" sortKey="partnerCount" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Clicks" sortKey="clicks" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="NAU" sortKey="leads" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="New Activated Users — mapped from Dub 'lead' event" />
            <SortHeader label="Conversions" sortKey="conversions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Commissions" sortKey="commissions" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="CPA" sortKey="cpl" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="Cost per NAU — commissions ÷ NAU" />
            <SortHeader label="Click→NAU" sortKey="clickToLeadPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="Click to NAU conversion rate" />
            <SortHeader label="NAU→Conv" sortKey="leadToConvPct" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} title="NAU to paid conversion rate" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => (
            <tr key={g.groupName} className="border-b border-border-light hover:bg-surface-sunken">
              <td className="px-3 py-2 font-medium">{g.groupName}</td>
              <td className="px-3 py-2"><TagDropdown groupId={g.groupId} currentTag={g.groupTag} /></td>
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
        <tfoot className="border-t-2 border-border  font-semibold bg-surface-sunken">
          <tr>
            <td className="px-3 py-2">Total</td>
            <td />
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
