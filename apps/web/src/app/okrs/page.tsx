import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CollapsibleTable } from "./okr-table";

export const dynamic = "force-dynamic";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000).toLocaleString() + "k";
  return n.toLocaleString();
}

function fmtCurrency(n: number | null): string {
  if (n === null || !isFinite(n)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function pctOfTarget(actual: number, target: number): string {
  if (target === 0) return "—";
  return Math.round((actual / target) * 100) + "%";
}

function PctBadge({ pct }: { pct: number }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        pct >= 100
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : pct >= 50
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {Math.round(pct)}%
    </span>
  );
}

function CpaBadge({ cpa, target }: { cpa: number | null; target: number }) {
  if (cpa === null || !isFinite(cpa)) return <span className="text-gray-300">—</span>;
  const isGood = cpa <= target;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        isGood
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      }`}
    >
      {fmtCurrency(cpa)}
    </span>
  );
}

interface OKRRow {
  activity: string;
  target: string;
  values: (number | null)[];
  total: number;
  pct: number;
  subRows?: { label: string; values: (string | null)[]; total: string }[];
}

export default async function OKRsPage() {
  const months = [
    { label: "Jan", from: "2026-01-01", to: "2026-01-31", q: 1 },
    { label: "Feb", from: "2026-02-01", to: "2026-02-28", q: 1 },
    { label: "Mar", from: "2026-03-01", to: "2026-03-31", q: 1 },
    { label: "Apr", from: "2026-04-01", to: "2026-04-30", q: 2 },
    { label: "May", from: "2026-05-01", to: "2026-05-31", q: 2 },
    { label: "Jun", from: "2026-06-01", to: "2026-06-30", q: 2 },
  ];
  const q1Indices = months.map((m, i) => m.q === 1 ? i : -1).filter(i => i >= 0);
  const q2Indices = months.map((m, i) => m.q === 2 ? i : -1).filter(i => i >= 0);

  // ── UGC Views ──
  const ugcViewsByMonth: number[] = [];
  for (const m of months) {
    const result = await prisma.growiDailySnapshot.aggregate({
      where: { date: { gte: m.from, lte: m.to } },
      _sum: { views: true },
    });
    ugcViewsByMonth.push(result._sum.views ?? 0);
  }
  const ugcTotal = ugcViewsByMonth.reduce((s, v) => s + v, 0);
  const ugcQ2 = q2Indices.reduce((s, i) => s + ugcViewsByMonth[i], 0);
  const ugcTarget = 10_000_000;

  // ── Build in Public (Employee LinkedIn Views) ──
  const bipViewsByMonth: number[] = [];
  for (const m of months) {
    const result = await prisma.employeeLinkedInPost.aggregate({
      where: { postDate: { gte: m.from, lte: m.to } },
      _sum: { impressions: true },
    });
    bipViewsByMonth.push(result._sum.impressions ?? 0);
  }
  const bipTotal = bipViewsByMonth.reduce((s, v) => s + v, 0);
  const bipQ2 = q2Indices.reduce((s, i) => s + bipViewsByMonth[i], 0);
  const bipTarget = 2_000_000;

  // ── Podcast Listens (from Podscribe) ──
  const podListensByMonth: number[] = [];
  const podSpendByMonth: number[] = [];
  for (const m of months) {
    const result = await prisma.$queryRaw<[{ total_impressions: number; total_spend: number }]>`
      SELECT
        COALESCE(SUM(impressions), 0)::int as total_impressions,
        COALESCE(SUM(spend), 0)::float as total_spend
      FROM podscribe_campaign_daily
      WHERE date >= ${m.from} AND date <= ${m.to}
    `;
    podListensByMonth.push(result[0].total_impressions);
    podSpendByMonth.push(result[0].total_spend);
  }
  const podListensTotal = podListensByMonth.reduce((s, v) => s + v, 0);
  const podListensQ2 = q2Indices.reduce((s, i) => s + podListensByMonth[i], 0);
  const podSpendTotal = podSpendByMonth.reduce((s, v) => s + v, 0);
  const podSpendQ2 = q2Indices.reduce((s, i) => s + podSpendByMonth[i], 0);
  const podTarget = 10_000_000;
  const podCpmTarget = 20;
  const podCpmByMonth = podListensByMonth.map((listens, i) =>
    listens > 0 ? (podSpendByMonth[i] / listens) * 1000 : null
  );
  const podCpmTotal = podListensTotal > 0 ? (podSpendTotal / podListensTotal) * 1000 : null;

  // ── Newsletter Incremental NAU (excluding affiliates) ──
  // Get all newsletter uplifts with activity data
  const nlUplifts = await prisma.activityUplift.findMany({
    where: {
      activity: {
        is: {
          channel: "newsletter",
          status: "live",
          OR: [{ tag: null }, { tag: { not: "affiliate" } }],
        },
      },
    },
    select: {
      attributedIncrementalActivations: true,
      activity: {
        select: { date: true, costUsd: true },
      },
    },
  });

  const nlNauByMonth: number[] = [];
  const nlSpendByMonth: number[] = [];
  for (const m of months) {
    const inMonth = nlUplifts.filter(
      (u) => u.activity.date >= m.from && u.activity.date <= m.to
    );
    nlNauByMonth.push(
      Math.round(inMonth.reduce((s, u) => s + u.attributedIncrementalActivations, 0))
    );
    nlSpendByMonth.push(
      inMonth.reduce((s, u) => s + (u.activity.costUsd ?? 0), 0)
    );
  }
  const nlNauTotal = nlNauByMonth.reduce((s, v) => s + v, 0);
  const nlNauQ2 = q2Indices.reduce((s, i) => s + nlNauByMonth[i], 0);
  const nlSpendTotal = nlSpendByMonth.reduce((s, v) => s + v, 0);
  const nlSpendQ2 = q2Indices.reduce((s, i) => s + nlSpendByMonth[i], 0);
  const nlTarget = 2_500;
  const nlCpaTarget = 200;

  // Compute CPA per month
  const nlCpaByMonth = nlNauByMonth.map((nau, i) =>
    nau > 0 ? nlSpendByMonth[i] / nau : null
  );
  const nlCpaTotal = nlNauTotal > 0 ? nlSpendTotal / nlNauTotal : null;

  return (
    <div className="max-w-6xl">
      <Link
        href="/"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
      >
        &larr; Back to summary
      </Link>

      <h1 className="text-2xl font-bold mb-1">OKRs</h1>
      <p className="text-sm text-gray-500 mb-6">
        Q2 2026 targets and progress tracking
      </p>

      <CollapsibleTable
        q1Labels={months.filter(m => m.q === 1).map(m => m.label)}
        q2Labels={months.filter(m => m.q === 2).map(m => m.label)}
      >
            {/* UGC Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-4 py-3 font-medium">UGC TikTok & Instagram Reach</td>
              <td className="px-4 py-3 text-right font-mono">{ugcTarget.toLocaleString()}</td>
              <td className="q1-col" />
              {ugcViewsByMonth.map((v, i) => (
                <td key={months[i].label} className={`px-4 py-3 text-right font-mono ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30 text-gray-500" : ""}`}>
                  {v > 0 ? fmtNum(v) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-mono font-semibold">{ugcQ2 > 0 ? fmtNum(ugcQ2) : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3 text-right">
                <PctBadge pct={ugcTarget > 0 ? (ugcQ2 / ugcTarget) * 100 : 0} />
              </td>
            </tr>

            {/* LinkedIn Ambassador Reach Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-4 py-3 font-medium">LinkedIn Ambassador Reach</td>
              <td className="px-4 py-3 text-right font-mono">{(3_000_000).toLocaleString()}</td>
              <td className="q1-col" />
              {months.map((m) => (
                <td key={m.label} className={`px-4 py-3 text-right font-mono ${m.q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30" : ""}`}>
                  <span className="text-gray-300">—</span>
                </td>
              ))}
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-300">—</td>
              <td className="px-4 py-3 text-right">
                <PctBadge pct={0} />
              </td>
            </tr>

            {/* Build in Public Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-4 py-3 font-medium">Build in Public LinkedIn Views</td>
              <td className="px-4 py-3 text-right font-mono">{bipTarget.toLocaleString()}</td>
              <td className="q1-col" />
              {bipViewsByMonth.map((v, i) => (
                <td key={months[i].label} className={`px-4 py-3 text-right font-mono ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30 text-gray-500" : ""}`}>
                  {v > 0 ? fmtNum(v) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-mono font-semibold">{bipQ2 > 0 ? fmtNum(bipQ2) : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3 text-right">
                <PctBadge pct={bipTarget > 0 ? (bipQ2 / bipTarget) * 100 : 0} />
              </td>
            </tr>

            {/* Podcast Listens Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-4 py-3 font-medium">Podcast Listens</td>
              <td className="px-4 py-3 text-right font-mono">
                <div>{podTarget.toLocaleString()}</div>
                <div className="text-xs text-gray-400">@ &le;${podCpmTarget} CPM</div>
              </td>
              <td className="q1-col" />
              {podListensByMonth.map((v, i) => (
                <td key={months[i].label} className={`px-4 py-3 text-right font-mono ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30 text-gray-500" : ""}`}>
                  {v > 0 ? fmtNum(v) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-mono font-semibold">{podListensQ2 > 0 ? fmtNum(podListensQ2) : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3 text-right">
                <PctBadge pct={podTarget > 0 ? (podListensQ2 / podTarget) * 100 : 0} />
              </td>
            </tr>

            {/* Podcast CPM sub-row */}
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <td className="px-4 py-2 pl-8 text-xs text-gray-500">CPM</td>
              <td className="px-4 py-2 text-right text-xs text-gray-500">&le;{fmtCurrency(podCpmTarget)}</td>
              <td className="q1-col" />
              {podCpmByMonth.map((cpm, i) => (
                <td key={months[i].label} className={`px-4 py-2 text-right ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30" : ""}`}>
                  <CpaBadge cpa={cpm} target={podCpmTarget} />
                </td>
              ))}
              <td className="px-4 py-2 text-right">
                {podListensQ2 > 0 ? <CpaBadge cpa={(podSpendQ2 / podListensQ2) * 1000} target={podCpmTarget} /> : <span className="text-gray-300">—</span>}
              </td>
              <td />
            </tr>

            {/* Podcast Spend sub-row */}
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <td className="px-4 py-2 pl-8 text-xs text-gray-500">Spend</td>
              <td />
              <td className="q1-col" />
              {podSpendByMonth.map((v, i) => (
                <td key={months[i].label} className={`px-4 py-2 text-right font-mono text-xs text-gray-500 ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30" : ""}`}>
                  {v > 0 ? fmtCurrency(v) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className="px-4 py-2 text-right font-mono text-xs text-gray-500 font-semibold">
                {podSpendQ2 > 0 ? fmtCurrency(podSpendQ2) : <span className="text-gray-300">—</span>}
              </td>
              <td />
            </tr>

            {/* Newsletter Incremental NAU Row */}
            <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-4 py-3 font-medium">
                Newsletter Incr. NAU
                <span className="text-xs text-gray-400 ml-1">(excl. affiliates)</span>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                <div>{nlTarget.toLocaleString()}</div>
                <div className="text-xs text-gray-400">@ &le;${nlCpaTarget} CPA</div>
              </td>
              <td className="q1-col" />
              {nlNauByMonth.map((v, i) => (
                <td key={months[i].label} className={`px-4 py-3 text-right font-mono ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30 text-gray-500" : ""}`}>
                  {v > 0 ? fmtNum(v) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-mono font-semibold">{nlNauQ2 > 0 ? fmtNum(nlNauQ2) : <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3 text-right">
                <PctBadge pct={nlTarget > 0 ? (nlNauQ2 / nlTarget) * 100 : 0} />
              </td>
            </tr>

            {/* Newsletter CPA sub-row */}
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <td className="px-4 py-2 pl-8 text-xs text-gray-500">Incr. Cost / NAU</td>
              <td className="px-4 py-2 text-right text-xs text-gray-500">&le;{fmtCurrency(nlCpaTarget)}</td>
              <td className="q1-col" />
              {nlCpaByMonth.map((cpa, i) => (
                <td key={months[i].label} className={`px-4 py-2 text-right ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30" : ""}`}>
                  <CpaBadge cpa={cpa} target={nlCpaTarget} />
                </td>
              ))}
              <td className="px-4 py-2 text-right">
                {nlNauQ2 > 0 ? <CpaBadge cpa={nlSpendQ2 / nlNauQ2} target={nlCpaTarget} /> : <span className="text-gray-300">—</span>}
              </td>
              <td />
            </tr>

            {/* Newsletter Spend sub-row */}
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <td className="px-4 py-2 pl-8 text-xs text-gray-500">Spend</td>
              <td />
              <td className="q1-col" />
              {nlSpendByMonth.map((v, i) => (
                <td key={months[i].label} className={`px-4 py-2 text-right font-mono text-xs text-gray-500 ${months[i].q === 1 ? "q1-col bg-gray-50/50 dark:bg-gray-900/30" : ""}`}>
                  {v > 0 ? fmtCurrency(v) : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className="px-4 py-2 text-right font-mono text-xs text-gray-500 font-semibold">
                {nlSpendQ2 > 0 ? fmtCurrency(nlSpendQ2) : <span className="text-gray-300">—</span>}
              </td>
              <td />
            </tr>
      </CollapsibleTable>
    </div>
  );
}
