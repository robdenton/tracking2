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
  groupTag: string | null; // affiliate, influencer, etc. — from DB
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
  groupTag: string | null;
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

/** Fetch all partners from Dub API with group and commission data (paginated) */
export async function fetchPartners(): Promise<DubPartner[]> {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) return [];

  const groupMetas = await prisma.dubGroupMeta.findMany();
  const tagMap = new Map(groupMetas.map((m) => [m.groupId, m.tag]));

  // Fetch all partners (paginated)
  const allPartners: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${DUB_API_BASE}/partners?workspaceId=${WORKSPACE_ID}&limit=100&page=${page}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }
    );
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allPartners.push(...data);
    if (data.length < 100) break;
    page++;
  }

  // Fetch ALL links on go.granola.ai + go.granola.so to build partnerId → shortLinks map
  // This catches links not returned in the partner's nested links array
  const linksByPartner = new Map<string, string[]>();
  for (const domain of ["go.granola.ai", "go.granola.so"]) {
    let lpage = 1;
    while (true) {
      const res = await fetch(
        `${DUB_API_BASE}/links?domain=${domain}&limit=100&page=${lpage}`,
        { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }
      );
      if (!res.ok) break;
      const links = await res.json();
      if (!Array.isArray(links) || links.length === 0) break;
      for (const l of links) {
        if (l.partnerId && l.shortLink) {
          const existing = linksByPartner.get(l.partnerId) || [];
          existing.push(l.shortLink);
          linksByPartner.set(l.partnerId, existing);
        }
      }
      if (links.length < 100) break;
      lpage++;
    }
  }

  // Deduplicate by partner ID (API returns same partner once per link)
  const deduped = new Map<string, any>();
  for (const p of allPartners) {
    const existing = deduped.get(p.id);
    if (existing) {
      // Merge links from duplicate entries
      for (const l of (p.links ?? [])) {
        existing._mergedLinks.add(l.shortLink);
      }
    } else {
      const nestedLinks = new Set((p.links ?? []).map((l: any) => l.shortLink as string));
      deduped.set(p.id, { ...p, _mergedLinks: nestedLinks });
    }
  }

  return Array.from(deduped.values()).map((p) => {
    // Merge: nested links from all duplicate entries + links discovered from /links API
    const nestedLinks = [...(p._mergedLinks as Set<string>)];
    const discoveredLinks = linksByPartner.get(p.id) || [];
    const allLinks = [...new Set([...nestedLinks, ...discoveredLinks])];

    return {
      id: p.id,
      name: p.name || p.email || "Unknown",
      groupId: p.groupId || null,
      groupName: GROUP_NAMES[p.groupId] || "Ungrouped",
      groupTag: tagMap.get(p.groupId) ?? null,
      totalClicks: p.totalClicks ?? 0,
      totalLeads: p.totalLeads ?? 0,
      totalConversions: p.totalConversions ?? 0,
      totalCommissions: p.totalCommissions ?? 0,
      totalSaleAmount: p.totalSaleAmount ?? 0,
      clickToLeadRate: p.clickToLeadRate ?? 0,
      leadToConversionRate: p.leadToConversionRate ?? 0,
      shortLinks: allLinks,
    };
  });
}

/** Read partners from the DB cache (fast — no API calls) */
export async function fetchPartnersFromCache(): Promise<DubPartner[]> {
  const groupMetas = await prisma.dubGroupMeta.findMany();
  const tagMap = new Map(groupMetas.map((m) => [m.groupId, m.tag]));

  const cached = await prisma.dubPartnerCache.findMany();

  return cached.map((p) => ({
    id: p.dubPartnerId,
    name: p.name,
    groupId: p.groupId,
    groupName: p.groupName || GROUP_NAMES[p.groupId ?? ""] || "Ungrouped",
    groupTag: tagMap.get(p.groupId ?? "") ?? null,
    totalClicks: p.totalClicks,
    totalLeads: p.totalLeads,
    totalConversions: p.totalConversions,
    totalCommissions: p.totalCommissions,
    totalSaleAmount: p.totalSaleAmount,
    clickToLeadRate: p.clickToLeadRate,
    leadToConversionRate: p.leadToConvRate,
    shortLinks: p.shortLinks,
  }));
}

/** Sync partner data from Dub API into the cache table */
export async function syncPartnerCache(): Promise<{ synced: number }> {
  const partners = await fetchPartners();
  let synced = 0;

  for (const p of partners) {
    await prisma.dubPartnerCache.upsert({
      where: { dubPartnerId: p.id },
      create: {
        dubPartnerId: p.id,
        name: p.name,
        groupId: p.groupId,
        groupName: p.groupName,
        totalClicks: p.totalClicks,
        totalLeads: p.totalLeads,
        totalConversions: p.totalConversions,
        totalCommissions: p.totalCommissions,
        totalSaleAmount: p.totalSaleAmount,
        clickToLeadRate: p.clickToLeadRate,
        leadToConvRate: p.leadToConversionRate,
        shortLinks: p.shortLinks,
      },
      update: {
        name: p.name,
        groupId: p.groupId,
        groupName: p.groupName,
        totalClicks: p.totalClicks,
        totalLeads: p.totalLeads,
        totalConversions: p.totalConversions,
        totalCommissions: p.totalCommissions,
        totalSaleAmount: p.totalSaleAmount,
        clickToLeadRate: p.clickToLeadRate,
        leadToConvRate: p.leadToConversionRate,
        shortLinks: p.shortLinks,
        syncedAt: new Date(),
      },
    });
    synced++;
  }

  return { synced };
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
      groupTag: p.groupTag,
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

/** Get per-shortLink click/lead totals from dub_link_daily for a date range */
export async function getDateFilteredStats(
  partnerShortLinks: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, { clicks: number; leads: number }>> {
  if (partnerShortLinks.length === 0) return new Map();

  const daily = await prisma.dubLinkDaily.findMany({
    where: {
      shortLink: { in: partnerShortLinks },
      date: { gte: startDate, lte: endDate },
    },
    select: { shortLink: true, clicks: true, leads: true },
  });

  const result = new Map<string, { clicks: number; leads: number }>();
  for (const d of daily) {
    const existing = result.get(d.shortLink) || { clicks: 0, leads: 0 };
    existing.clicks += d.clicks;
    existing.leads += d.leads;
    result.set(d.shortLink, existing);
  }
  return result;
}

/** Apply date-filtered stats to partners, overriding their all-time totals */
export function applyDateFilter(
  partners: DubPartner[],
  statsMap: Map<string, { clicks: number; leads: number }>
): DubPartner[] {
  return partners.map((p) => {
    let clicks = 0;
    let leads = 0;
    for (const sl of p.shortLinks) {
      const stats = statsMap.get(sl);
      if (stats) {
        clicks += stats.clicks;
        leads += stats.leads;
      }
    }
    return {
      ...p,
      totalClicks: clicks,
      totalLeads: leads,
      clickToLeadRate: clicks > 0 ? leads / clicks : 0,
      // conversions and commissions can't be date-filtered from dub_link_daily
      // keep all-time values with a note
    };
  });
}

/** Get monthly click/lead trends from dub_link_daily, filtered to partner links */
export async function getMonthlyTrends(
  partnerShortLinks: string[],
  startDate?: string,
  endDate?: string,
  partnerOnly?: boolean
): Promise<MonthlyTrend[]> {
  if (partnerShortLinks.length === 0) return [];
  const start = startDate || "2026-01-01";
  const end = endDate || new Date().toISOString().slice(0, 10);

  const daily = await prisma.dubLinkDaily.findMany({
    where: {
      shortLink: { in: partnerShortLinks },
      date: { gte: start, lte: end },
    },
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
