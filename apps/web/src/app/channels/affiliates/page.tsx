import Link from "next/link";
import { fetchPartners, aggregateByGroup, getMonthlyTrends } from "@/lib/affiliates";
import { GroupTable } from "./group-table";
import { PartnerTable } from "./partner-table";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-mono font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function fmtDollars(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString();
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

export default async function AffiliatesPage() {
  const partners = await fetchPartners();

  // Summary totals
  const totalClicks = partners.reduce((s, p) => s + p.totalClicks, 0);
  const totalLeads = partners.reduce((s, p) => s + p.totalLeads, 0);
  const totalConversions = partners.reduce((s, p) => s + p.totalConversions, 0);
  const totalCommissions = partners.reduce((s, p) => s + p.totalCommissions, 0);
  const clickToLeadRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
  const leadToConvRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
  const cpl = totalLeads > 0 ? totalCommissions / totalLeads : null;

  // Group data
  const groupStats = aggregateByGroup(partners);

  // Partner leaderboard (only partners with >=1 lead)
  const activePartners = partners
    .filter((p) => p.totalLeads >= 1)
    .map((p) => ({
      name: p.name,
      groupName: p.groupName,
      clicks: p.totalClicks,
      leads: p.totalLeads,
      conversions: p.totalConversions,
      commissions: p.totalCommissions,
      cpl: p.totalLeads > 0 ? p.totalCommissions / p.totalLeads : null,
      clickToLeadPct: p.totalClicks > 0 ? (p.totalLeads / p.totalClicks) * 100 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  // Monthly trends
  const allShortLinks = partners.flatMap((p) => p.shortLinks);
  const monthlyTrends = await getMonthlyTrends(allShortLinks);

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">Affiliate Programme</h1>
      <p className="text-sm text-gray-500 mb-6">
        Partner performance from Dub. All-time totals.
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <StatCard label="Total Leads" value={fmtNum(totalLeads)} sub="Primary KPI" />
        <StatCard label="Total Clicks" value={fmtNum(totalClicks)} />
        <StatCard label="Click → Lead" value={fmtPct(clickToLeadRate)} />
        <StatCard label="Total Commissions" value={fmtDollars(totalCommissions)} sub={`${partners.length} partners`} />
        <StatCard label="Cost per Lead" value={cpl != null ? fmtDollars(cpl) : "—"} />
        <StatCard label="Total Conversions" value={fmtNum(totalConversions)} />
        <StatCard label="Lead → Conv" value={fmtPct(leadToConvRate)} />
      </div>

      {/* Group Performance */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-1">Group Performance</h2>
        <p className="text-xs text-gray-500 mb-3">Aggregated by incentive tier</p>
        <GroupTable groups={groupStats} />
      </div>

      {/* Partner Leaderboard */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-1">Partner Leaderboard</h2>
        <p className="text-xs text-gray-500 mb-3">
          {activePartners.length} partners with at least 1 lead
        </p>
        <PartnerTable partners={activePartners} />
      </div>

      {/* Monthly Trends */}
      {monthlyTrends.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Monthly Trends</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Clicks</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Leads</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Click→Lead</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((m) => (
                  <tr key={m.month} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2 font-mono">{m.month}</td>
                    <td className="px-4 py-2 text-right font-mono">{m.clicks.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono">{m.leads.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {m.clicks > 0 ? fmtPct((m.leads / m.clicks) * 100) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Monthly trends use daily snapshots from Dub link analytics. Leads data requires the sync-dub pipeline to have run with leads tracking enabled.
          </p>
        </div>
      )}
    </div>
  );
}
