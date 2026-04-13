import { Suspense } from "react";
import { fetchPartnersFromCache, aggregateByGroup, getMonthlyTrends, getDateFilteredStats, applyDateFilter } from "@/lib/affiliates";
import { GroupTable } from "./group-table";
import { PartnerTable } from "./partner-table";
import { DateRangePicker } from "../newsletter/date-range-picker";
import { AffiliateFilter } from "./affiliate-filter";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
      <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">{label}</div>
      <div className="font-display font-semibold text-text-primary whitespace-nowrap tracking-tight text-2xl">{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1">{sub}</div>}
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

export default async function AffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; filter?: string }>;
}) {
  const { startDate = "2026-01-01", endDate = "", filter = "all" } = await searchParams;
  const effectiveEnd = endDate || new Date().toISOString().slice(0, 10);
  const activeFilter = filter === "affiliate" ? "affiliate" : "all";

  const allPartners = await fetchPartnersFromCache();

  // Apply group tag filter
  const partners = activeFilter === "affiliate"
    ? allPartners.filter((p) => p.groupTag === "affiliate")
    : allPartners;

  const allShortLinks = partners.flatMap((p) => p.shortLinks);

  // Get date-filtered stats from dub_link_daily
  const dateStats = await getDateFilteredStats(allShortLinks, startDate, effectiveEnd);
  const filteredPartners = applyDateFilter(partners, dateStats);

  // Summary totals (using date-filtered clicks/leads)
  const totalClicks = filteredPartners.reduce((s, p) => s + p.totalClicks, 0);
  const totalLeads = filteredPartners.reduce((s, p) => s + p.totalLeads, 0);
  const totalConversions = filteredPartners.reduce((s, p) => s + p.totalConversions, 0);
  const totalCommissions = filteredPartners.reduce((s, p) => s + p.totalCommissions, 0);
  const clickToLeadRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
  const leadToConvRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
  const cpl = totalLeads > 0 ? totalCommissions / totalLeads : null;

  // Group data
  const groupStats = aggregateByGroup(filteredPartners);

  // Partner leaderboard (only partners with >=1 lead)
  const activePartners = filteredPartners
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

  // Monthly trends (filtered to partner links only)
  const monthlyTrends = await getMonthlyTrends(allShortLinks, startDate, effectiveEnd, true);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">Affiliate Programme</h1>
      <p className="text-sm text-text-secondary mb-4">
        Partner performance from Dub
      </p>

      {/* Date Range Picker + Filter */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Suspense>
          <DateRangePicker startDate={startDate} endDate={endDate} />
        </Suspense>
        <Suspense>
          <AffiliateFilter current={activeFilter} />
        </Suspense>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 mt-4">
        <StatCard label="Total NAU" value={fmtNum(totalLeads)} sub="Dub lead event = NAU" />
        <StatCard label="Total Clicks" value={fmtNum(totalClicks)} />
        <StatCard label="Click → NAU" value={fmtPct(clickToLeadRate)} />
        <StatCard label="Total Commissions" value={fmtDollars(totalCommissions)} sub="All-time (not date-filtered)" />
        <StatCard label="Cost per NAU" value={cpl != null ? fmtDollars(cpl) : "—"} sub="Commissions ÷ NAU" />
        <StatCard label="Total Conversions" value={fmtNum(totalConversions)} sub="All-time" />
        <StatCard label="NAU → Conv" value={fmtPct(leadToConvRate)} />
      </div>

      {/* Group Performance */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-1">Group Performance</h2>
        <p className="text-xs text-text-secondary mb-3">Aggregated by incentive tier. Clicks and leads are date-filtered; commissions are all-time.</p>
        <GroupTable groups={groupStats} />
      </div>

      {/* Partner Leaderboard */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-1">Partner Leaderboard</h2>
        <p className="text-xs text-text-secondary mb-3">
          {activePartners.length} partners with at least 1 NAU in period
        </p>
        <PartnerTable partners={activePartners} />
      </div>

      {/* Monthly Trends */}
      {monthlyTrends.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Monthly Trends</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border-light">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Month</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">Clicks</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary cursor-help" title="New Activated Users — mapped from Dub 'lead' event">NAU</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">Click→NAU</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((m) => (
                  <tr key={m.month} className="border-b border-border-light">
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
        </div>
      )}
    </div>
  );
}
