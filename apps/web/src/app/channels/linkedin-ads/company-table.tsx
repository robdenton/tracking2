"use client";

import { useState } from "react";

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

export function CompanyTable({ companies }: { companies: CompanyRow[] }) {
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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

  const unresolvedCount = companies.filter((c) => !c.name).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Companies Reached</h2>
        <div className="flex items-center gap-3">
          {unresolvedCount > 0 && (
            <span className="text-xs text-gray-500">
              {unresolvedCount} unresolved
            </span>
          )}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {resolving ? "Resolving..." : "Resolve Names"}
          </button>
        </div>
      </div>

      {result && (
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          {result}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <th className="pb-2 pr-4">#</th>
              <th className="pb-2 pr-4">Company</th>
              <th className="pb-2 pr-4 text-right">Impressions</th>
              <th className="pb-2 pr-4 text-right">Clicks</th>
              <th className="pb-2 pr-4 text-right">LP Clicks</th>
              <th className="pb-2 pr-4 text-right">CTR</th>
              <th className="pb-2 pr-4 text-right">Spend</th>
              <th className="pb-2 pr-4 text-right">CPC</th>
              <th className="pb-2 text-right">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company, i) => (
              <tr
                key={company.orgId}
                className="border-b border-gray-100 dark:border-gray-800/50"
              >
                <td className="py-2 pr-4 text-gray-400 text-xs">{i + 1}</td>
                <td className="py-2 pr-4 font-medium">
                  {company.name || (
                    <span className="text-gray-400">
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
                    : "—"}
                </td>
                <td className="py-2 text-right font-mono">
                  {company.conversions > 0
                    ? company.conversions.toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
