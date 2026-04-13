"use client";

import { useMemo, useState } from "react";

interface CompanyRow {
  orgId: string;
  orgUrn: string;
  name: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  landingPageClicks: number;
  cpc: number;
  conversions: number;
}

type SortKey =
  | "impressions"
  | "clicks"
  | "landingPageClicks"
  | "ctr"
  | "spend"
  | "cpc"
  | "conversions"
  | "name";

type SortDir = "asc" | "desc";

export function CompanyTable({ companies }: { companies: CompanyRow[] }) {
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("impressions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    // Separate "Other" row from sortable rows
    const other = companies.find((c) => c.orgId === "__other__");
    const sortable = companies.filter((c) => c.orgId !== "__other__");

    sortable.sort((a, b) => {
      let av: number | string;
      let bv: number | string;

      if (sortKey === "name") {
        av = (a.name ?? "zzz").toLowerCase();
        bv = (b.name ?? "zzz").toLowerCase();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    // Always keep "Other" at the bottom
    if (other) sortable.push(other);
    return sortable;
  }, [companies, sortKey, sortDir]);

  async function handleResolve() {
    setResolving(true);
    setResult(null);
    try {
      const res = await fetch("/api/linkedin-ads/resolve-companies", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResult(
          `Resolved ${data.resolved} new companies (${data.failed} failed). Refresh the page to see updated names.`
        );
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setResolving(false);
    }
  }

  const unresolvedCount = companies.filter(
    (c) => !c.name && c.orgId !== "__other__"
  ).length;

  function SortHeader({
    label,
    field,
    align = "right",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === field;
    return (
      <th
        className={`pb-2 pr-4 ${align === "right" ? "text-right" : ""} cursor-pointer select-none hover:text-text-primary transition-colors`}
        onClick={() => handleSort(field)}
      >
        {label}
        {active && (
          <span className="ml-0.5">
            {sortDir === "desc" ? " \u2193" : " \u2191"}
          </span>
        )}
      </th>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Companies Reached</h2>
        <div className="flex items-center gap-3">
          {unresolvedCount > 0 && (
            <span className="text-xs text-text-secondary">
              {unresolvedCount} unresolved
            </span>
          )}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-xs px-3 py-1.5 rounded border border-border  hover:bg-surface-sunken disabled:opacity-50"
          >
            {resolving ? "Resolving..." : "Resolve Names"}
          </button>
        </div>
      </div>

      {result && (
        <div className="text-xs text-accent-strong mb-3 p-2 bg-accent-light/20 rounded">
          {result}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary border-b border-border-light">
              <th className="pb-2 pr-4">#</th>
              <SortHeader label="Company" field="name" align="left" />
              <SortHeader label="Impressions" field="impressions" />
              <SortHeader label="Clicks" field="clicks" />
              <SortHeader label="LP Clicks" field="landingPageClicks" />
              <SortHeader label="CTR" field="ctr" />
              <SortHeader label="Spend" field="spend" />
              <SortHeader label="CPC" field="cpc" />
              <SortHeader label="Conv." field="conversions" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((company, i) => {
              const isOther = company.orgId === "__other__";
              return (
              <tr
                key={company.orgId}
                className={
                  isOther
                    ? "border-t-2 border-border  bg-surface-sunken/50 font-medium"
                    : "border-b border-border-light/50"
                }
              >
                <td className="py-2 pr-4 text-text-muted text-xs">
                  {isOther ? "" : i + 1}
                </td>
                <td className="py-2 pr-4 font-medium">
                  {isOther ? (
                    <span className="text-text-secondary italic">{company.name}</span>
                  ) : company.name ? (
                    company.name
                  ) : (
                    <span className="text-text-muted">
                      org:{company.orgId}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {company.impressions.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {company.clicks.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {company.landingPageClicks.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {(company.ctr * 100).toFixed(2)}%
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  ${company.spend.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {company.cpc > 0
                    ? `$${company.cpc.toFixed(2)}`
                    : "\u2014"}
                </td>
                <td className="py-2 text-right font-mono">
                  {company.conversions > 0
                    ? company.conversions.toLocaleString()
                    : "\u2014"}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
