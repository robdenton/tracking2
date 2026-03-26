"use client";

import { Fragment, useState } from "react";

interface DayRow {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  postsCount: number;
  tiktokPosts: number;
  instagramPosts: number;
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
        <thead className="border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="w-6 px-1" />
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Views</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Likes</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Comments</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Shares</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Saves</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Posts</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Eng. Rate</th>
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
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 ${hasPlatformData ? "cursor-pointer" : ""}`}
                    onClick={hasPlatformData ? () => toggle(d.date) : undefined}
                  >
                    <td className="px-1 text-center text-gray-400">
                      {hasPlatformData && (
                        <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{d.date}</td>
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
                      {d.tiktokPosts > 0 && (
                        <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-50 dark:border-gray-800">
                          <td />
                          <td className="px-3 py-1.5 pl-8 text-xs text-gray-500">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                              TikTok
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-500" colSpan={5}>—</td>
                          <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-500">{d.tiktokPosts}</td>
                          <td />
                        </tr>
                      )}
                      {d.instagramPosts > 0 && (
                        <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-50 dark:border-gray-800">
                          <td />
                          <td className="px-3 py-1.5 pl-8 text-xs text-gray-500">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                              Instagram
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-500" colSpan={5}>—</td>
                          <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-500">{d.instagramPosts}</td>
                          <td />
                        </tr>
                      )}
                    </>
                  )}
                </Fragment>
              );
            })}
        </tbody>
        <tfoot className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold bg-gray-50 dark:bg-gray-900">
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
