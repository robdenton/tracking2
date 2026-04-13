"use client";

import { Fragment, useMemo, useState } from "react";

interface CampaignBreakdown {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  creativeUrn: string;
  intendedStatus: string | null;
  isServing: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number;
  cpm: number;
  conversions: number;
  landingPageClicks: number;
}

interface AggregatedCreative {
  contentRef: string;
  name: string | null;
  displayName: string;
  linkedInPostUrl: string | null;
  campaignCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalCtr: number;
  totalSpend: number;
  totalCpc: number;
  totalCpm: number;
  totalConversions: number;
  totalLandingPageClicks: number;
  campaigns: CampaignBreakdown[];
}

type SortKey =
  | "name"
  | "campaignCount"
  | "totalImpressions"
  | "totalClicks"
  | "totalCtr"
  | "totalSpend"
  | "totalCpc"
  | "totalCpm"
  | "totalConversions"
  | "totalLandingPageClicks";

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
      className={`px-3 py-2 text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary select-none ${
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    ACTIVE: "bg-accent-light text-accent-strong",
    PAUSED: "bg-[#FEF3C7] text-[#92400E]",
    DRAFT: "bg-surface-sunken text-text-secondary",
    ARCHIVED: "bg-surface-sunken text-text-secondary",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded ${colors[status] || "bg-surface-sunken text-text-secondary"}`}
    >
      {status}
    </span>
  );
}

export function CreativesTable({
  creatives,
}: {
  creatives: AggregatedCreative[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("totalImpressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function toggleExpand(contentRef: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(contentRef)) next.delete(contentRef);
      else next.add(contentRef);
      return next;
    });
  }

  const sorted = useMemo(() => {
    const items = [...creatives];
    items.sort((a, b) => {
      let av: number | string =
        sortKey === "name" ? a.displayName : (a[sortKey] ?? "");
      let bv: number | string =
        sortKey === "name" ? b.displayName : (b[sortKey] ?? "");
      if (sortKey === "name") {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [creatives, sortKey, sortDir]);

  if (creatives.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No creative data yet. Run a sync to fetch creative analytics.
      </p>
    );
  }

  const fmtNum = (n: number) => n.toLocaleString();
  const fmtPct = (n: number) => (n * 100).toFixed(2) + "%";
  const fmtCurrency = (n: number) =>
    "$" +
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border-light">
          <tr>
            <th className="w-6 px-1" />
            <SortHeader
              label="Creative"
              sortKey="name"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
              align="left"
            />
            <SortHeader
              label="Campaigns"
              sortKey="campaignCount"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Impressions"
              sortKey="totalImpressions"
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
              label="CTR"
              sortKey="totalCtr"
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
              sortKey="totalCpc"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="CPM"
              sortKey="totalCpm"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="LP Clicks"
              sortKey="totalLandingPageClicks"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              label="Conversions"
              sortKey="totalConversions"
              currentKey={sortKey}
              currentDir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((cr) => {
            const isExpanded = expanded.has(cr.contentRef);
            const isMultiCampaign = cr.campaignCount > 1;

            return (
              <Fragment key={cr.contentRef}>
                <tr
                  className={`border-b border-border-light hover:bg-surface-sunken ${
                    isMultiCampaign ? "cursor-pointer" : ""
                  }`}
                  onClick={
                    isMultiCampaign
                      ? () => toggleExpand(cr.contentRef)
                      : undefined
                  }
                >
                  <td className="px-1 text-center text-text-muted">
                    {isMultiCampaign && (
                      <span className="text-xs">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-left max-w-[300px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-medium truncate ${!cr.name ? "text-text-secondary" : ""}`}
                        title={cr.displayName}
                      >
                        {cr.displayName}
                      </span>
                      {cr.linkedInPostUrl && (
                        <a
                          href={cr.linkedInPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-accent-strong hover:text-accent-strong"
                          title="View ad on LinkedIn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {cr.campaignCount}
                    {isMultiCampaign && (
                      <span className="ml-1 text-[10px] bg-accent-light text-accent-strong px-1.5 py-0.5 rounded">
                        multi
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtNum(cr.totalImpressions)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtNum(cr.totalClicks)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtPct(cr.totalCtr)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtCurrency(cr.totalSpend)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtCurrency(cr.totalCpc)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtCurrency(cr.totalCpm)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtNum(cr.totalLandingPageClicks)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmtNum(cr.totalConversions)}
                  </td>
                </tr>

                {/* Expanded campaign breakdown */}
                {isExpanded &&
                  cr.campaigns.map((camp) => (
                    <tr
                      key={camp.creativeUrn}
                      className="bg-surface-sunken/50 border-b border-border-light"
                    >
                      <td />
                      <td className="px-3 py-1.5 text-left pl-8 text-xs text-text-secondary">
                        {camp.campaignName}
                        <StatusBadge status={camp.campaignStatus} />
                      </td>
                      <td />
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtNum(camp.impressions)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtNum(camp.clicks)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtPct(camp.ctr)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtCurrency(camp.spend)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtCurrency(camp.cpc)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtCurrency(camp.cpm)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtNum(camp.landingPageClicks)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                        {fmtNum(camp.conversions)}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
