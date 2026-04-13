import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { UGCChart } from "./chart";
import { UGCDailyTable } from "./daily-table";
import { DateRangePicker } from "../newsletter/date-range-picker";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="stat-card bg-surface border border-border-light rounded-lg p-4">
      <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`font-display font-semibold text-text-primary whitespace-nowrap tracking-tight ${value.includes("–") ? "text-lg" : "text-2xl"}`}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function getWeekKey(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const dayNum = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dayNum + 1);
  return monday.toISOString().slice(0, 10);
}

/** Fetch daily platform post counts from Growi snapshots API */
async function fetchDailyPlatformCounts(startDate: string, endDate: string): Promise<Map<string, { tiktok: number; instagram: number }>> {
  const apiKey = process.env.GROWI_API_KEY;
  const result = new Map<string, { tiktok: number; instagram: number }>();
  if (!apiKey) return result;

  try {
    const fmtDate = (d: string) => {
      const [y, m, day] = d.split("-");
      return `${m}/${day}/${y}`;
    };

    const res = await fetch(
      `https://api.growi.io/api/public/v1/stats/snapshots?start_date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}&limit=10000`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return result;
    const data = await res.json();
    const snapshots = data?.data?.snapshots ?? [];

    for (const s of snapshots) {
      const ids: string[] = s.user_content_ids ?? [];
      const tiktok = ids.filter((id: string) => id.startsWith("tik_tok:")).length;
      const instagram = ids.filter((id: string) => id.startsWith("instagram:")).length;
      if (tiktok > 0 || instagram > 0) {
        result.set(s.date, { tiktok, instagram });
      }
    }
  } catch {
    // ignore
  }
  return result;
}

/** Fetch platform breakdown from Growi API (top posts aggregated by platform) */
async function fetchPlatformBreakdown(startDate: string, endDate: string) {
  const apiKey = process.env.GROWI_API_KEY;
  if (!apiKey) return null;

  try {
    // Format dates as MM/DD/YYYY for Growi API
    const fmtDate = (d: string) => {
      const [y, m, day] = d.split("-");
      return `${m}/${day}/${y}`;
    };

    const res = await fetch(
      `https://api.growi.io/api/public/v1/stats/top_posts_by_views?start_date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}&limit=10000`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const posts = data?.data?.top_posts_by_views ?? [];

    // Aggregate by platform
    const platformMap = new Map<string, { views: number; likes: number; comments: number; shares: number; posts: number }>();
    for (const p of posts) {
      const platform = p.platform === "tik_tok" ? "TikTok" : p.platform === "instagram" ? "Instagram" : p.platform || "Unknown";
      const existing = platformMap.get(platform) ?? { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 };
      const metrics = p.metrics ?? {};
      existing.views += metrics.views ?? 0;
      existing.likes += metrics.likes ?? 0;
      existing.comments += metrics.comments ?? 0;
      existing.shares += metrics.shares ?? 0;
      existing.posts++;
      platformMap.set(platform, existing);
    }

    return Array.from(platformMap.entries())
      .map(([platform, data]) => ({ platform, ...data }))
      .sort((a, b) => b.views - a.views);
  } catch {
    return null;
  }
}

export default async function UGCPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const { startDate = "", endDate = "" } = await searchParams;

  const allSnapshots = await prisma.growiDailySnapshot.findMany({
    orderBy: { date: "asc" },
  });

  // Apply date range filter
  const snapshots = allSnapshots.filter((s) => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });

  // Totals
  const totalViews = snapshots.reduce((s, d) => s + d.views, 0);
  const totalLikes = snapshots.reduce((s, d) => s + d.likes, 0);
  const totalComments = snapshots.reduce((s, d) => s + d.comments, 0);
  const totalShares = snapshots.reduce((s, d) => s + d.shares, 0);
  const totalSaves = snapshots.reduce((s, d) => s + d.saves, 0);
  const totalPosts = snapshots.reduce((s, d) => s + d.postsCount, 0);
  const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;
  const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

  // Filter to days with data
  const activeDays = snapshots.filter((s) => s.views > 0 || s.postsCount > 0);

  // Determine date range for platform breakdown
  const pStart = startDate || (activeDays.length > 0 ? activeDays[0].date : "2026-01-01");
  const pEnd = endDate || (activeDays.length > 0 ? activeDays[activeDays.length - 1].date : new Date().toISOString().slice(0, 10));
  const [platformBreakdown, dailyPlatformCounts] = await Promise.all([
    fetchPlatformBreakdown(pStart, pEnd),
    fetchDailyPlatformCounts(pStart, pEnd),
  ]);

  // Weekly aggregation for chart
  const weekMap = new Map<
    string,
    { views: number; likes: number; comments: number; shares: number; saves: number; postsCount: number }
  >();
  for (const s of snapshots) {
    const wk = getWeekKey(s.date);
    const e = weekMap.get(wk) ?? { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, postsCount: 0 };
    e.views += s.views;
    e.likes += s.likes;
    e.comments += s.comments;
    e.shares += s.shares;
    e.saves += s.saves;
    e.postsCount += s.postsCount;
    weekMap.set(wk, e);
  }

  const weeklyData = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, d]) => ({ period, ...d }));

  // Daily table data (last 30 days with data)
  const recentDays = activeDays.slice(-30);

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold text-text-primary tracking-tight mb-0.5">UGC Programme</h1>
      <p className="text-[13px] text-text-muted mb-5">
        Creator programme performance from Growi (TikTok & Instagram)
      </p>

      {/* Date Range Picker */}
      <div className="mb-5">
        <Suspense>
          <DateRangePicker startDate={startDate} endDate={endDate} />
        </Suspense>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Views" value={fmtNum(totalViews)} />
        <StatCard label="Total Likes" value={fmtNum(totalLikes)} />
        <StatCard label="Comments" value={fmtNum(totalComments)} />
        <StatCard label="Shares" value={fmtNum(totalShares)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Saves" value={fmtNum(totalSaves)} />
        <StatCard label="Posts" value={totalPosts.toLocaleString()} />
        <StatCard
          label="Eng. Rate"
          value={engagementRate.toFixed(2) + "%"}
          sub="(Likes+Comments+Shares+Saves) / Views"
        />
      </div>

      {/* Platform Breakdown */}
      {platformBreakdown && platformBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Channel Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border-light">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted">Platform</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Posts</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Views</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Likes</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Comments</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Shares</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Eng. Rate</th>
                </tr>
              </thead>
              <tbody>
                {platformBreakdown.map((p) => {
                  const eng = p.likes + p.comments + p.shares;
                  const rate = p.views > 0 ? (eng / p.views) * 100 : 0;
                  return (
                    <tr
                      key={p.platform}
                      className="border-b border-border-light"
                    >
                      <td className="px-3 py-2 font-medium">{p.platform}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.posts.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtNum(p.views)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtNum(p.likes)}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.comments.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.shares.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{rate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border  font-semibold bg-surface-sunken">
                {(() => {
                  const totViews = platformBreakdown.reduce((s, p) => s + p.views, 0);
                  const totLikes = platformBreakdown.reduce((s, p) => s + p.likes, 0);
                  const totComments = platformBreakdown.reduce((s, p) => s + p.comments, 0);
                  const totShares = platformBreakdown.reduce((s, p) => s + p.shares, 0);
                  const totPosts = platformBreakdown.reduce((s, p) => s + p.posts, 0);
                  const eng = totLikes + totComments + totShares;
                  const rate = totViews > 0 ? (eng / totViews) * 100 : 0;
                  return (
                    <tr>
                      <td className="px-3 py-2 text-left">Total</td>
                      <td className="px-3 py-2 text-right font-mono">{totPosts.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtNum(totViews)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtNum(totLikes)}</td>
                      <td className="px-3 py-2 text-right font-mono">{totComments.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{totShares.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{rate.toFixed(1)}%</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Weekly Views & Likes</h2>
        <div className="bg-surface border border-border-light rounded-lg p-5">
          <UGCChart data={weeklyData} grouping="weekly" />
        </div>
      </div>

      {/* Daily Table */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-1">Daily Breakdown</h2>
        <p className="text-xs text-text-secondary mb-3">Click a date to see TikTok / Instagram split</p>
        <UGCDailyTable
          days={activeDays.map((d) => ({
            date: d.date,
            views: d.views,
            likes: d.likes,
            comments: d.comments,
            shares: d.shares,
            saves: d.saves,
            postsCount: d.postsCount,
            tiktokPosts: d.tiktokPosts,
            tiktokViews: d.tiktokViews,
            tiktokLikes: d.tiktokLikes,
            tiktokComments: d.tiktokComments,
            tiktokShares: d.tiktokShares,
            tiktokSaves: d.tiktokSaves,
            instagramPosts: d.instagramPosts,
            instagramViews: d.instagramViews,
            instagramLikes: d.instagramLikes,
            instagramComments: d.instagramComments,
            instagramShares: d.instagramShares,
            instagramSaves: d.instagramSaves,
          }))}
        />
      </div>
    </div>
  );
}
