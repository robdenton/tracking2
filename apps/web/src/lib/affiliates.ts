/**
 * Affiliate programme data functions.
 * Fetches partner data from Dub API and monthly trends from dub_link_daily.
 */

import { prisma } from "./prisma";

const DUB_API_BASE = "https://api.dub.co";
const WORKSPACE_ID = "ws_cm3mibm7j0001jn08998xpzqp";

export const GROUP_NAMES: Record<string, string> = {
  grp_1K9FX244DHYR0S9T19KDQWZMQ: "High Tier",
  grp_1K2QB1G389K2QQADNSANAZEKW: "Default Group",
  grp_1K3NZFKAS951HZZXW76G6QXW7: "Influencer Discount - 1 month",
  grp_1K2Z3JXQDBJBGCVYBCFQ7M9M9: "Creators",
  grp_1KFBMT8SDMSZVDZETPKARH03W: "Influencer Discount - 3 month",
  grp_1K2Z3MRHQY6JA8EGWMZHTHHZ0: "Audience Owners",
  grp_1K2Z3JT4ARME48KPRPES58SWD: "Specialists",
  grp_1KHB4B7F3CBS5063S5Y7A8VZA: "LinkedIn",
  grp_1KFGCTC243HBE9FK13NRTNJR9: "Tano",
};

export interface DubPartner {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string;
  totalClicks: number;
  totalLeads: number;
  totalConversions: number;
  totalCommissions: number; // in cents
  totalSaleAmount: number; // in cents
  clickToLeadRate: number;
  leadToConversionRate: number;
  shortLinks: string[];
}

export interface GroupStats {
  groupId: string;
  groupName: string;
  partnerCount: number;
  clicks: number;
  leads: number;
  conversions: number;
  commissions: number; // in cents
  cpl: number | null; // cents per lead
  clickToLeadPct: number;
  leadToConvPct: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  clicks: number;
  leads: number;
}

/** Fetch all partners from Dub API with group and commission data */
export async function fetchPartners(): Promise<DubPartner[]> {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(
    `${DUB_API_BASE}/partners?workspaceId=${WORKSPACE_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }
  );

  if (!res.ok) return [];
  const data = await res.json();

  return (data as any[]).map((p) => ({
    id: p.id,
    name: p.name || p.email || "Unknown",
    groupId: p.groupId || null,
    groupName: GROUP_NAMES[p.groupId] || "Ungrouped",
    totalClicks: p.totalClicks ?? 0,
    totalLeads: p.totalLeads ?? 0,
    totalConversions: p.totalConversions ?? 0,
    totalCommissions: p.totalCommissions ?? 0,
    totalSaleAmount: p.totalSaleAmount ?? 0,
    clickToLeadRate: p.clickToLeadRate ?? 0,
    leadToConversionRate: p.leadToConversionRate ?? 0,
    shortLinks: (p.links ?? []).map((l: any) => l.shortLink),
  }));
}

/** Aggregate partner data by group */
export function aggregateByGroup(partners: DubPartner[]): GroupStats[] {
  const groups = new Map<string, GroupStats>();

  for (const p of partners) {
    if (p.totalLeads === 0 && p.totalClicks === 0) continue;
    const gid = p.groupId || "ungrouped";
    const existing = groups.get(gid) || {
      groupId: gid,
      groupName: p.groupName,
      partnerCount: 0,
      clicks: 0,
      leads: 0,
      conversions: 0,
      commissions: 0,
      cpl: null,
      clickToLeadPct: 0,
      leadToConvPct: 0,
    };
    existing.partnerCount++;
    existing.clicks += p.totalClicks;
    existing.leads += p.totalLeads;
    existing.conversions += p.totalConversions;
    existing.commissions += p.totalCommissions;
    groups.set(gid, existing);
  }

  // Compute rates
  for (const g of groups.values()) {
    g.cpl = g.leads > 0 ? g.commissions / g.leads : null;
    g.clickToLeadPct = g.clicks > 0 ? (g.leads / g.clicks) * 100 : 0;
    g.leadToConvPct = g.leads > 0 ? (g.conversions / g.leads) * 100 : 0;
  }

  return Array.from(groups.values()).sort((a, b) => b.leads - a.leads);
}

/** Get monthly click/lead trends from dub_link_daily for partner links */
export async function getMonthlyTrends(
  partnerShortLinks: string[],
  startDate?: string,
  endDate?: string
): Promise<MonthlyTrend[]> {
  if (partnerShortLinks.length === 0) return [];

  const where: Record<string, unknown> = {
    shortLink: { in: partnerShortLinks },
  };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as any).gte = startDate;
    if (endDate) (where.date as any).lte = endDate;
  }

  const daily = await prisma.dubLinkDaily.findMany({
    where,
    select: { date: true, clicks: true, leads: true },
  });

  const monthMap = new Map<string, { clicks: number; leads: number }>();
  for (const d of daily) {
    const month = d.date.slice(0, 7);
    const existing = monthMap.get(month) || { clicks: 0, leads: 0 };
    existing.clicks += d.clicks;
    existing.leads += d.leads;
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
