"use client";

import { Fragment, useState } from "react";
import { formatDisplayDate } from "../../format";

interface DayRow {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  postsCount: number;
  tiktokPosts: number;
  tiktokViews: number;
  tiktokLikes: number;
  tiktokComments: number;
  tiktokShares: number;
  tiktokSaves: number;
  instagramPosts: number;
  instagramViews: number;
  instagramLikes: number;
  instagramComments: number;
  instagramShares: number;
  instagramSaves: number;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

export function UGCDailyTable({ days }: { days: DayRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const totalViews = days.reduce((s, d) => s + d.views, 0);
  const totalLikes = days.reduce((s, d) => s + d.likes, 0);
  const totalComments = days.reduce((s, d) => s + d.comments, 0);
  const totalShares = days.reduce((s, d) => s + d.shares, 0);
  const totalSaves = days.reduce((s, d) => s + d.saves, 0);
  const totalPosts = days.reduce((s, d) => s + d.postsCount, 0);
  const totalEng = totalLikes + totalComments + totalShares + totalSaves;
  const totalRate = totalViews > 0 ? (totalEng / totalViews) * 100 : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border-light">
          <tr>
            <th className="w-6 px-1" />
            <th className="px-3 py-2 text-left text-[11px] font-medium text-text-muted">Date</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Views</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Likes</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Comments</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Shares</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Saves</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Posts</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-text-muted">Eng. Rate</th>
          </tr>
        </thead>
        <tbody>
          {days
            .slice()
            .reverse()
            .map((d) => {
              const eng = d.likes + d.comments + d.shares + d.saves;
              const rate = d.views > 0 ? (eng / d.views) * 100 : 0;
              const isExpanded = expanded.has(d.date);
              const hasPlatformData = d.tiktokPosts > 0 || d.instagramPosts > 0;

              return (
                <Fragment key={d.date}>
                  <tr
                    className={`border-b border-border-light hover:bg-surface-sunken ${hasPlatformData ? "cursor-pointer" : ""}`}
                    onClick={hasPlatformData ? () => toggle(d.date) : undefined}
                  >
                    <td className="px-1 text-center text-text-muted">
                      {hasPlatformData && (
                        <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{formatDisplayDate(d.date)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtNum(d.views)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtNum(d.likes)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtNum(d.comments)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtNum(d.shares)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtNum(d.saves)}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.postsCount}</td>
                    <td className="px-3 py-2 text-right font-mono">{rate.toFixed(1)}%</td>
                  </tr>
                  {isExpanded && (
                    <>
                      {(d.tiktokPosts > 0 || d.tiktokViews > 0) && (() => {
                        const eng = d.tiktokLikes + d.tiktokComments + d.tiktokShares + d.tiktokSaves;
                        const tkRate = d.tiktokViews > 0 ? (eng / d.tiktokViews) * 100 : 0;
                        return (
                          <tr className="bg-surface-sunken/50 border-b border-border-light ">
                            <td />
                            <td className="px-3 py-1.5 pl-8 text-xs text-text-secondary">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-light text-accent-strong">
                                TikTok
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.tiktokViews)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.tiktokLikes)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.tiktokComments)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.tiktokShares)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.tiktokSaves)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{d.tiktokPosts}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{tkRate.toFixed(1)}%</td>
                          </tr>
                        );
                      })()}
                      {(d.instagramPosts > 0 || d.instagramViews > 0) && (() => {
                        const eng = d.instagramLikes + d.instagramComments + d.instagramShares + d.instagramSaves;
                        const igRate = d.instagramViews > 0 ? (eng / d.instagramViews) * 100 : 0;
                        return (
                          <tr className="bg-surface-sunken/50 border-b border-border-light ">
                            <td />
                            <td className="px-3 py-1.5 pl-8 text-xs text-text-secondary">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                Instagram
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.instagramViews)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.instagramLikes)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.instagramComments)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.instagramShares)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{fmtNum(d.instagramSaves)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{d.instagramPosts}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-xs text-text-secondary">{igRate.toFixed(1)}%</td>
                          </tr>
                        );
                      })()}
                    </>
                  )}
                </Fragment>
              );
            })}
        </tbody>
        <tfoot className="border-t-2 border-border  font-semibold bg-surface-sunken">
          <tr>
            <td />
            <td className="px-3 py-2 text-left">Total</td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalViews)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalLikes)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalComments)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalShares)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalSaves)}</td>
            <td className="px-3 py-2 text-right font-mono">{fmtNum(totalPosts)}</td>
            <td className="px-3 py-2 text-right font-mono">{totalRate.toFixed(1)}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
