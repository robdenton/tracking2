/**
 * YouTube Depth-Weighted Correlation Analysis
 *
 * Uses transcript-derived metadata (depthTier, depthScore, contentType, etc.)
 * to weight YouTube views and find a stronger correlation with user acquisition
 * (signups + activations) than raw unweighted views.
 *
 * Sections:
 *   1. Baseline — raw views ↔ signups correlation
 *   2. Tier-stratified — dedicated/featured/listed/incidental correlation
 *   3. Depth-weighted index — depthScore × views
 *   4. Multi-factor OLS regression — tier-stratified R²
 *   5. Feature multiplier analysis — CTA, personal use, content type
 *   6. Optimal weighting discovery — rank schemes by R²
 *   7. Summary report
 *   8. All-factor composite — every attribute (depth, CTA, link, audience, etc.)
 *   9. Composite quality score — per-video ranked table (time-series)
 *  10. Composite-weighted views — correlation test
 *  11. Cross-sectional regression — per-video S/kV = f(features) [ROBUST]
 *  12. Final summary — the composite formula
 *
 * Usage:
 *   source .env.prod && npx tsx scripts/youtube-depth-correlation.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    denX = 0,
    denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function spearman(x: number[], y: number[]): number {
  function rank(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    for (let i = 0; i < sorted.length; ) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const avgRank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
      i = j;
    }
    return ranks;
  }
  return pearson(rank(x), rank(y));
}

/** R² = pearson(x, y)² */
function rSquared(x: number[], y: number[]): number {
  const r = pearson(x, y);
  return r * r;
}

/**
 * Simple OLS regression: y = β₀ + β₁x₁ + β₂x₂ + ... + βₖxₖ
 * Returns { coefficients: number[], intercept: number, rSquared: number }
 *
 * Uses normal equation: β = (XᵀX)⁻¹ Xᵀy
 * For small k (≤ 4), this is perfectly fine.
 */
function olsRegression(
  xs: number[][],
  y: number[]
): { coefficients: number[]; intercept: number; rSquared: number } {
  const n = y.length;
  const k = xs.length; // number of predictors

  // Build X matrix [1, x1, x2, ..., xk] for each observation
  // XᵀX is (k+1)×(k+1), Xᵀy is (k+1)×1
  const dim = k + 1;
  const XtX: number[][] = Array.from({ length: dim }, () =>
    new Array(dim).fill(0)
  );
  const Xty: number[] = new Array(dim).fill(0);

  for (let i = 0; i < n; i++) {
    const row = [1, ...xs.map((x) => x[i])];
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        XtX[r][c] += row[r] * row[c];
      }
      Xty[r] += row[r] * y[i];
    }
  }

  // Solve via Gaussian elimination
  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col < dim; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < dim; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // singular

    for (let j = col; j <= dim; j++) aug[col][j] /= pivot;
    for (let row = 0; row < dim; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= dim; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  const beta = aug.map((row) => row[dim]);
  const intercept = beta[0];
  const coefficients = beta.slice(1);

  // Compute R²
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0,
    ssRes = 0;
  for (let i = 0; i < n; i++) {
    let yHat = intercept;
    for (let j = 0; j < k; j++) yHat += coefficients[j] * xs[j][i];
    ssTot += (y[i] - yMean) ** 2;
    ssRes += (y[i] - yHat) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { coefficients, intercept, rSquared: r2 };
}

// ─── Types ──────────────────────────────────────────────────────────────────

type DepthTier = "dedicated" | "featured" | "listed" | "incidental";
const TIERS: DepthTier[] = ["dedicated", "featured", "listed", "incidental"];

interface VideoMeta {
  id: string;
  videoId: string;
  title: string;
  depthTier: DepthTier | null;
  depthScore: number | null;
  contentType: string | null;
  creatorPersonallyUses: boolean | null;
  explicitCta: boolean | null;
  sentiment: string | null;
  targetAudience: string | null;
  granolaMinutes: number | null;
  mentionCount: number | null;
  firstMentionPct: number | null;
  granolaLinkInDesc: boolean | null;
  granolaLinkType: string | null;
  sponsoredDisclosure: boolean | null;
  durationSeconds: number | null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(80));
  console.log("YOUTUBE DEPTH-WEIGHTED CORRELATION ANALYSIS");
  console.log("=".repeat(80));

  // ── Load data ─────────────────────────────────────────────────────────────
  const [allViews, metricRows, videos] = await Promise.all([
    prisma.importedVideoView.findMany({ orderBy: { date: "asc" } }),
    prisma.dailyMetric.findMany({
      where: { channel: "youtube" },
      orderBy: { date: "asc" },
    }),
    prisma.importedYouTubeVideo.findMany({
      where: { status: "active" },
      select: {
        id: true,
        videoId: true,
        title: true,
        depthTier: true,
        depthScore: true,
        contentType: true,
        creatorPersonallyUses: true,
        explicitCta: true,
        sentiment: true,
        targetAudience: true,
        granolaMinutes: true,
        mentionCount: true,
        firstMentionPct: true,
        granolaLinkInDesc: true,
        granolaLinkType: true,
        sponsoredDisclosure: true,
        durationSeconds: true,
      },
    }),
  ]);

  console.log(`\nData loaded:`);
  console.log(`  ImportedVideoView records: ${allViews.length}`);
  console.log(`  DailyMetric (youtube) records: ${metricRows.length}`);
  console.log(`  Active imported videos: ${videos.length}`);
  console.log(
    `  Videos with depth analysis: ${videos.filter((v) => v.depthTier).length}`
  );

  // Video metadata lookup
  const videoMeta = new Map<string, VideoMeta>();
  for (const v of videos) {
    videoMeta.set(v.id, v as VideoMeta);
  }

  // ── Compute per-video daily increments ────────────────────────────────────
  const viewsByVideo = new Map<
    string,
    { date: string; viewCount: number }[]
  >();
  for (const v of allViews) {
    if (!viewsByVideo.has(v.videoId)) viewsByVideo.set(v.videoId, []);
    viewsByVideo.get(v.videoId)!.push({ date: v.date, viewCount: v.viewCount });
  }

  // Per-video increments (skip first tracked day — it's cumulative lifetime)
  const videoIncrements = new Map<
    string,
    { date: string; increment: number }[]
  >();

  for (const [videoId, views] of viewsByVideo) {
    views.sort((a, b) => a.date.localeCompare(b.date));
    const increments: { date: string; increment: number }[] = [];
    for (let i = 1; i < views.length; i++) {
      const diff = views[i].viewCount - views[i - 1].viewCount;
      if (diff >= 0) {
        increments.push({ date: views[i].date, increment: diff });
      }
    }
    videoIncrements.set(videoId, increments);
  }

  // Daily metrics lookup
  const metricsByDate = new Map<
    string,
    { signups: number; activations: number }
  >();
  for (const m of metricRows) {
    const existing = metricsByDate.get(m.date) ?? {
      signups: 0,
      activations: 0,
    };
    metricsByDate.set(m.date, {
      signups: existing.signups + m.signups,
      activations: existing.activations + m.activations,
    });
  }

  // ── Build daily view series (raw + weighted + tier-stratified) ────────────
  const dailyRaw = new Map<string, number>();
  const dailyWeighted = new Map<string, number>();
  const dailyHighQuality = new Map<string, number>(); // dedicated + featured only
  const dailyByTier = new Map<DepthTier, Map<string, number>>();
  for (const t of TIERS) dailyByTier.set(t, new Map());

  // Feature-stratified daily series
  const dailyCta = new Map<string, number>();
  const dailyNoCta = new Map<string, number>();
  const dailyPersonalUse = new Map<string, number>();
  const dailyNoPersonalUse = new Map<string, number>();

  // Per-video total incremental views + attributed signups (for feature analysis)
  const videoTotalViews = new Map<string, number>();

  for (const [videoId, increments] of videoIncrements) {
    const meta = videoMeta.get(videoId);
    const score = meta?.depthScore ?? 0;
    const tier = (meta?.depthTier as DepthTier) ?? null;
    const hasCta = meta?.explicitCta === true;
    const personalUse = meta?.creatorPersonallyUses === true;

    let totalInc = 0;

    for (const { date, increment } of increments) {
      totalInc += increment;

      // Raw
      dailyRaw.set(date, (dailyRaw.get(date) ?? 0) + increment);

      // Depth-weighted
      dailyWeighted.set(
        date,
        (dailyWeighted.get(date) ?? 0) + increment * score
      );

      // High-quality only (score >= 0.30 = dedicated or featured)
      if (score >= 0.3) {
        dailyHighQuality.set(
          date,
          (dailyHighQuality.get(date) ?? 0) + increment
        );
      }

      // Tier-stratified
      if (tier && dailyByTier.has(tier)) {
        const tierMap = dailyByTier.get(tier)!;
        tierMap.set(date, (tierMap.get(date) ?? 0) + increment);
      }

      // CTA-stratified
      if (hasCta) {
        dailyCta.set(date, (dailyCta.get(date) ?? 0) + increment);
      } else {
        dailyNoCta.set(date, (dailyNoCta.get(date) ?? 0) + increment);
      }

      // Personal use
      if (personalUse) {
        dailyPersonalUse.set(
          date,
          (dailyPersonalUse.get(date) ?? 0) + increment
        );
      } else {
        dailyNoPersonalUse.set(
          date,
          (dailyNoPersonalUse.get(date) ?? 0) + increment
        );
      }
    }

    videoTotalViews.set(videoId, totalInc);
  }

  // Aligned dates (intersection of views + metrics)
  const allDates = new Set([...dailyRaw.keys(), ...metricsByDate.keys()]);
  const sortedDates = Array.from(allDates).sort();

  console.log(
    `\nDate range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]} (${sortedDates.length} days)`
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: BASELINE — RAW VIEWS CORRELATION
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 1: BASELINE — RAW VIEWS ↔ SIGNUPS CORRELATION");
  console.log("=".repeat(80));

  console.log("\n--- Daily correlation (Pearson r / Spearman ρ) ---");
  console.log("Lag = views lead signups by N days\n");

  for (let lag = 0; lag <= 7; lag++) {
    const viewsArr: number[] = [];
    const signupsArr: number[] = [];

    for (let i = 0; i < sortedDates.length - lag; i++) {
      const viewDate = sortedDates[i];
      const metricDate = sortedDates[i + lag];
      viewsArr.push(dailyRaw.get(viewDate) ?? 0);
      signupsArr.push(metricsByDate.get(metricDate)?.signups ?? 0);
    }

    const r = pearson(viewsArr, signupsArr);
    const rho = spearman(viewsArr, signupsArr);
    const r2 = r * r;
    const marker = lag === 0 ? " ← baseline" : "";
    console.log(
      `  Lag ${lag}d:  r=${r.toFixed(3)}  ρ=${rho.toFixed(3)}  R²=${r2.toFixed(3)}${marker}`
    );
  }

  // Weekly baseline
  const weeklyRaw = new Map<string, number>();
  const weeklySignups = new Map<string, number>();
  const weeklyActivations = new Map<string, number>();

  for (const date of sortedDates) {
    const week = getWeekKey(date);
    weeklyRaw.set(week, (weeklyRaw.get(week) ?? 0) + (dailyRaw.get(date) ?? 0));
    const m = metricsByDate.get(date);
    if (m) {
      weeklySignups.set(week, (weeklySignups.get(week) ?? 0) + m.signups);
      weeklyActivations.set(
        week,
        (weeklyActivations.get(week) ?? 0) + m.activations
      );
    }
  }

  const allWeeks = Array.from(
    new Set([...weeklyRaw.keys(), ...weeklySignups.keys()])
  ).sort();
  const wRawArr = allWeeks.map((w) => weeklyRaw.get(w) ?? 0);
  const wSignupsArr = allWeeks.map((w) => weeklySignups.get(w) ?? 0);
  const wActivationsArr = allWeeks.map((w) => weeklyActivations.get(w) ?? 0);

  console.log("\n--- Weekly baseline ---\n");
  console.log(
    `  Views↔Signups:  r=${pearson(wRawArr, wSignupsArr).toFixed(3)}  R²=${rSquared(wRawArr, wSignupsArr).toFixed(3)}`
  );
  console.log(
    `  Views↔NAU:      r=${pearson(wRawArr, wActivationsArr).toFixed(3)}  R²=${rSquared(wRawArr, wActivationsArr).toFixed(3)}`
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: TIER-STRATIFIED CORRELATION
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 2: TIER-STRATIFIED — WHICH TIER PREDICTS SIGNUPS BEST?");
  console.log("=".repeat(80));

  console.log(
    "\n--- Daily Pearson r (views ↔ signups) by depth tier and lag ---\n"
  );
  console.log(
    `  ${"Lag".padEnd(6)}  ${"Dedicated".padStart(10)}  ${"Featured".padStart(10)}  ${"Listed".padStart(10)}  ${"Incidental".padStart(11)}  ${"Raw (all)".padStart(10)}`
  );
  console.log("  " + "-".repeat(65));

  for (let lag = 0; lag <= 7; lag++) {
    const results: string[] = [];
    for (const tier of TIERS) {
      const tierMap = dailyByTier.get(tier)!;
      const viewsArr: number[] = [];
      const signupsArr: number[] = [];
      for (let i = 0; i < sortedDates.length - lag; i++) {
        viewsArr.push(tierMap.get(sortedDates[i]) ?? 0);
        signupsArr.push(
          metricsByDate.get(sortedDates[i + lag])?.signups ?? 0
        );
      }
      results.push(pearson(viewsArr, signupsArr).toFixed(3).padStart(10));
    }
    // Raw for comparison
    const rawV: number[] = [];
    const rawS: number[] = [];
    for (let i = 0; i < sortedDates.length - lag; i++) {
      rawV.push(dailyRaw.get(sortedDates[i]) ?? 0);
      rawS.push(metricsByDate.get(sortedDates[i + lag])?.signups ?? 0);
    }
    results.push(pearson(rawV, rawS).toFixed(3).padStart(10));

    console.log(`  ${`${lag}d`.padEnd(6)}  ${results.join("  ")}`);
  }

  // Weekly tier-stratified
  console.log(
    "\n--- Weekly Pearson r (views ↔ signups) by depth tier ---\n"
  );

  for (const tier of TIERS) {
    const tierMap = dailyByTier.get(tier)!;
    const weeklyTier = new Map<string, number>();
    for (const [date, val] of tierMap) {
      const week = getWeekKey(date);
      weeklyTier.set(week, (weeklyTier.get(week) ?? 0) + val);
    }
    const wArr = allWeeks.map((w) => weeklyTier.get(w) ?? 0);
    const r = pearson(wArr, wSignupsArr);
    const r2 = r * r;
    console.log(
      `  ${tier.padEnd(12)}: r=${r.toFixed(3)}  R²=${r2.toFixed(3)}`
    );
  }
  console.log(
    `  ${"raw (all)".padEnd(12)}: r=${pearson(wRawArr, wSignupsArr).toFixed(3)}  R²=${rSquared(wRawArr, wSignupsArr).toFixed(3)}`
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: DEPTH-WEIGHTED VIEW INDEX
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 3: DEPTH-WEIGHTED VIEW INDEX");
  console.log("=".repeat(80));

  console.log(
    "\n--- Daily: depth-weighted views vs raw views → signups correlation ---\n"
  );
  console.log(
    `  ${"Lag".padEnd(6)}  ${"Raw r".padStart(8)}  ${"Raw R²".padStart(8)}  ${"Weighted r".padStart(11)}  ${"Weighted R²".padStart(12)}  ${"HQ-only r".padStart(10)}  ${"HQ-only R²".padStart(11)}`
  );
  console.log("  " + "-".repeat(75));

  for (let lag = 0; lag <= 7; lag++) {
    const rawV: number[] = [];
    const weightedV: number[] = [];
    const hqV: number[] = [];
    const signups: number[] = [];

    for (let i = 0; i < sortedDates.length - lag; i++) {
      rawV.push(dailyRaw.get(sortedDates[i]) ?? 0);
      weightedV.push(dailyWeighted.get(sortedDates[i]) ?? 0);
      hqV.push(dailyHighQuality.get(sortedDates[i]) ?? 0);
      signups.push(metricsByDate.get(sortedDates[i + lag])?.signups ?? 0);
    }

    const rRaw = pearson(rawV, signups);
    const rWeighted = pearson(weightedV, signups);
    const rHQ = pearson(hqV, signups);

    console.log(
      `  ${`${lag}d`.padEnd(6)}  ${rRaw.toFixed(3).padStart(8)}  ${(rRaw * rRaw).toFixed(3).padStart(8)}  ${rWeighted.toFixed(3).padStart(11)}  ${(rWeighted * rWeighted).toFixed(3).padStart(12)}  ${rHQ.toFixed(3).padStart(10)}  ${(rHQ * rHQ).toFixed(3).padStart(11)}`
    );
  }

  // Weekly
  console.log("\n--- Weekly comparison ---\n");

  const weeklyWeighted = new Map<string, number>();
  const weeklyHQ = new Map<string, number>();
  for (const date of sortedDates) {
    const week = getWeekKey(date);
    weeklyWeighted.set(
      week,
      (weeklyWeighted.get(week) ?? 0) + (dailyWeighted.get(date) ?? 0)
    );
    weeklyHQ.set(
      week,
      (weeklyHQ.get(week) ?? 0) + (dailyHighQuality.get(date) ?? 0)
    );
  }

  const wWeightedArr = allWeeks.map((w) => weeklyWeighted.get(w) ?? 0);
  const wHQArr = allWeeks.map((w) => weeklyHQ.get(w) ?? 0);

  console.log(
    `  Raw views ↔ Signups:       r=${pearson(wRawArr, wSignupsArr).toFixed(3)}  R²=${rSquared(wRawArr, wSignupsArr).toFixed(3)}`
  );
  console.log(
    `  Weighted views ↔ Signups:  r=${pearson(wWeightedArr, wSignupsArr).toFixed(3)}  R²=${rSquared(wWeightedArr, wSignupsArr).toFixed(3)}`
  );
  console.log(
    `  HQ-only views ↔ Signups:  r=${pearson(wHQArr, wSignupsArr).toFixed(3)}  R²=${rSquared(wHQArr, wSignupsArr).toFixed(3)}`
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: MULTI-FACTOR OLS REGRESSION
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 4: OLS REGRESSION — TIER-STRATIFIED VIEWS → SIGNUPS");
  console.log("=".repeat(80));

  // Daily regression
  const dailyTierArrays = TIERS.map((tier) => {
    const tierMap = dailyByTier.get(tier)!;
    return sortedDates.map((d) => tierMap.get(d) ?? 0);
  });
  const dailySignupsArr = sortedDates.map(
    (d) => metricsByDate.get(d)?.signups ?? 0
  );

  const dailyOLS = olsRegression(dailyTierArrays, dailySignupsArr);

  console.log("\n--- Daily regression: Signups = β₀ + β₁·Ded + β₂·Feat + β₃·List + β₄·Inc ---\n");
  console.log(`  Intercept (β₀):    ${dailyOLS.intercept.toFixed(4)}`);
  for (let i = 0; i < TIERS.length; i++) {
    console.log(
      `  ${TIERS[i].padEnd(12)} (β${i + 1}):  ${dailyOLS.coefficients[i].toFixed(6)}  (${(dailyOLS.coefficients[i] * 1000).toFixed(3)} signups per 1000 views)`
    );
  }
  console.log(`\n  R² = ${dailyOLS.rSquared.toFixed(4)}`);

  // Compare against simple raw regression
  const rawArr = sortedDates.map((d) => dailyRaw.get(d) ?? 0);
  const rawOLS = olsRegression([rawArr], dailySignupsArr);
  console.log(`  R² (raw single-variable): ${rawOLS.rSquared.toFixed(4)}`);
  console.log(
    `  R² improvement: ${((dailyOLS.rSquared - rawOLS.rSquared) * 100).toFixed(1)} percentage points`
  );

  // Weekly regression
  const weeklyTierArrays = TIERS.map((tier) => {
    const tierMap = dailyByTier.get(tier)!;
    const weeklyTier = new Map<string, number>();
    for (const [date, val] of tierMap) {
      const week = getWeekKey(date);
      weeklyTier.set(week, (weeklyTier.get(week) ?? 0) + val);
    }
    return allWeeks.map((w) => weeklyTier.get(w) ?? 0);
  });

  const weeklyOLS = olsRegression(weeklyTierArrays, wSignupsArr);
  const weeklyRawOLS = olsRegression([wRawArr], wSignupsArr);

  console.log(
    "\n--- Weekly regression: Signups = β₀ + β₁·Ded + β₂·Feat + β₃·List + β₄·Inc ---\n"
  );
  console.log(`  Intercept (β₀):    ${weeklyOLS.intercept.toFixed(4)}`);
  for (let i = 0; i < TIERS.length; i++) {
    console.log(
      `  ${TIERS[i].padEnd(12)} (β${i + 1}):  ${weeklyOLS.coefficients[i].toFixed(6)}  (${(weeklyOLS.coefficients[i] * 1000).toFixed(3)} signups per 1000 views)`
    );
  }
  console.log(`\n  R² = ${weeklyOLS.rSquared.toFixed(4)}`);
  console.log(`  R² (raw single-variable): ${weeklyRawOLS.rSquared.toFixed(4)}`);
  console.log(
    `  R² improvement: ${((weeklyOLS.rSquared - weeklyRawOLS.rSquared) * 100).toFixed(1)} percentage points`
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: FEATURE MULTIPLIER ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 5: FEATURE MULTIPLIER ANALYSIS");
  console.log("=".repeat(80));

  // View-share attributed signups per video
  const videoAttrSignups = new Map<string, number>();
  for (const date of sortedDates) {
    const totalViews = dailyRaw.get(date) ?? 0;
    const metrics = metricsByDate.get(date);
    if (totalViews === 0 || !metrics || metrics.signups === 0) continue;

    for (const [videoId, increments] of videoIncrements) {
      const dayInc = increments.find((inc) => inc.date === date);
      if (!dayInc || dayInc.increment === 0) continue;
      const share = dayInc.increment / totalViews;
      videoAttrSignups.set(
        videoId,
        (videoAttrSignups.get(videoId) ?? 0) + metrics.signups * share
      );
    }
  }

  // ── 5a: Depth tier conversion rates ──
  console.log("\n--- 5a: Conversion by depth tier ---\n");
  console.log(
    `  ${"Tier".padEnd(12)}  ${"Videos".padStart(6)}  ${"Views".padStart(10)}  ${"Signups".padStart(9)}  ${"S/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(50));

  for (const tier of TIERS) {
    const tierVideos = [...videoMeta.values()].filter(
      (v) => v.depthTier === tier
    );
    let totalViews = 0;
    let totalSignups = 0;
    for (const v of tierVideos) {
      totalViews += videoTotalViews.get(v.id) ?? 0;
      totalSignups += videoAttrSignups.get(v.id) ?? 0;
    }
    const sPerKV = totalViews > 0 ? (totalSignups / totalViews) * 1000 : 0;
    console.log(
      `  ${tier.padEnd(12)}  ${String(tierVideos.length).padStart(6)}  ${totalViews.toLocaleString().padStart(10)}  ${totalSignups.toFixed(1).padStart(9)}  ${sPerKV.toFixed(2).padStart(6)}`
    );
  }

  // ── 5b: CTA vs no-CTA ──
  console.log("\n--- 5b: Explicit CTA vs no CTA ---\n");
  for (const [label, hasCta] of [
    ["With CTA", true],
    ["Without CTA", false],
  ] as const) {
    const matched = [...videoMeta.values()].filter(
      (v) => v.explicitCta === hasCta && v.depthTier !== null
    );
    let views = 0,
      signups = 0;
    for (const v of matched) {
      views += videoTotalViews.get(v.id) ?? 0;
      signups += videoAttrSignups.get(v.id) ?? 0;
    }
    const sPerKV = views > 0 ? (signups / views) * 1000 : 0;
    console.log(
      `  ${label.padEnd(15)}  ${String(matched.length).padStart(4)} videos  ${views.toLocaleString().padStart(10)} views  ${signups.toFixed(1).padStart(8)} signups  ${sPerKV.toFixed(2).padStart(6)} S/kV`
    );
  }

  // ── 5c: Personal use vs not ──
  console.log("\n--- 5c: Creator personally uses Granola vs not ---\n");
  for (const [label, uses] of [
    ["Personal use", true],
    ["No personal use", false],
  ] as const) {
    const matched = [...videoMeta.values()].filter(
      (v) => v.creatorPersonallyUses === uses && v.depthTier !== null
    );
    let views = 0,
      signups = 0;
    for (const v of matched) {
      views += videoTotalViews.get(v.id) ?? 0;
      signups += videoAttrSignups.get(v.id) ?? 0;
    }
    const sPerKV = views > 0 ? (signups / views) * 1000 : 0;
    console.log(
      `  ${label.padEnd(17)}  ${String(matched.length).padStart(4)} videos  ${views.toLocaleString().padStart(10)} views  ${signups.toFixed(1).padStart(8)} signups  ${sPerKV.toFixed(2).padStart(6)} S/kV`
    );
  }

  // ── 5d: Content type ──
  console.log("\n--- 5d: Conversion by content type ---\n");
  console.log(
    `  ${"Type".padEnd(14)}  ${"Videos".padStart(6)}  ${"Views".padStart(10)}  ${"Signups".padStart(9)}  ${"S/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(52));

  const contentTypes = new Set(
    [...videoMeta.values()]
      .map((v) => v.contentType)
      .filter(Boolean) as string[]
  );
  const ctResults: { type: string; videos: number; views: number; signups: number; sPerKV: number }[] = [];
  for (const ct of contentTypes) {
    const matched = [...videoMeta.values()].filter(
      (v) => v.contentType === ct
    );
    let views = 0,
      signups = 0;
    for (const v of matched) {
      views += videoTotalViews.get(v.id) ?? 0;
      signups += videoAttrSignups.get(v.id) ?? 0;
    }
    const sPerKV = views > 0 ? (signups / views) * 1000 : 0;
    ctResults.push({ type: ct, videos: matched.length, views, signups, sPerKV });
  }
  ctResults.sort((a, b) => b.sPerKV - a.sPerKV);
  for (const r of ctResults) {
    console.log(
      `  ${r.type.padEnd(14)}  ${String(r.videos).padStart(6)}  ${r.views.toLocaleString().padStart(10)}  ${r.signups.toFixed(1).padStart(9)}  ${r.sPerKV.toFixed(2).padStart(6)}`
    );
  }

  // ── 5e: Target audience ──
  console.log("\n--- 5e: Conversion by target audience ---\n");
  console.log(
    `  ${"Audience".padEnd(18)}  ${"Videos".padStart(6)}  ${"Views".padStart(10)}  ${"Signups".padStart(9)}  ${"S/kV".padStart(6)}`
  );
  console.log("  " + "-".repeat(56));

  const audiences = new Set(
    [...videoMeta.values()]
      .map((v) => v.targetAudience)
      .filter(Boolean) as string[]
  );
  const audResults: { audience: string; videos: number; views: number; signups: number; sPerKV: number }[] = [];
  for (const aud of audiences) {
    const matched = [...videoMeta.values()].filter(
      (v) => v.targetAudience === aud
    );
    let views = 0,
      signups = 0;
    for (const v of matched) {
      views += videoTotalViews.get(v.id) ?? 0;
      signups += videoAttrSignups.get(v.id) ?? 0;
    }
    const sPerKV = views > 0 ? (signups / views) * 1000 : 0;
    audResults.push({ audience: aud, videos: matched.length, views, signups, sPerKV });
  }
  audResults.sort((a, b) => b.sPerKV - a.sPerKV);
  for (const r of audResults) {
    console.log(
      `  ${r.audience.padEnd(18)}  ${String(r.videos).padStart(6)}  ${r.views.toLocaleString().padStart(10)}  ${r.signups.toFixed(1).padStart(9)}  ${r.sPerKV.toFixed(2).padStart(6)}`
    );
  }

  // ── 5f: Sentiment ──
  console.log("\n--- 5f: Conversion by sentiment ---\n");
  for (const sent of ["positive", "neutral", "mixed"]) {
    const matched = [...videoMeta.values()].filter(
      (v) => v.sentiment === sent
    );
    let views = 0,
      signups = 0;
    for (const v of matched) {
      views += videoTotalViews.get(v.id) ?? 0;
      signups += videoAttrSignups.get(v.id) ?? 0;
    }
    const sPerKV = views > 0 ? (signups / views) * 1000 : 0;
    console.log(
      `  ${sent.padEnd(10)}  ${String(matched.length).padStart(4)} videos  ${views.toLocaleString().padStart(10)} views  ${signups.toFixed(1).padStart(8)} signups  ${sPerKV.toFixed(2).padStart(6)} S/kV`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6: OPTIMAL WEIGHTING DISCOVERY
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 6: WEIGHTING SCHEME COMPARISON (WEEKLY R²)");
  console.log("=".repeat(80));

  // Build weekly series for each weighting scheme
  type Scheme = { name: string; weeklyArr: number[] };
  const schemes: Scheme[] = [];

  // 1. Raw (baseline)
  schemes.push({ name: "Raw views (baseline)", weeklyArr: wRawArr });

  // 2. depthScore × views
  schemes.push({ name: "depthScore × views", weeklyArr: wWeightedArr });

  // 3. High-quality only (dedicated + featured)
  schemes.push({ name: "HQ only (ded+feat)", weeklyArr: wHQArr });

  // 4. Build more complex schemes
  const buildWeeklyWeighted = (
    weightFn: (meta: VideoMeta | undefined) => number
  ): number[] => {
    const weekly = new Map<string, number>();
    for (const [videoId, increments] of videoIncrements) {
      const meta = videoMeta.get(videoId);
      const weight = weightFn(meta);
      for (const { date, increment } of increments) {
        const week = getWeekKey(date);
        weekly.set(week, (weekly.get(week) ?? 0) + increment * weight);
      }
    }
    return allWeeks.map((w) => weekly.get(w) ?? 0);
  };

  // 4. depthScore × (1 + CTA)
  schemes.push({
    name: "depth × (1+CTA)",
    weeklyArr: buildWeeklyWeighted(
      (m) => (m?.depthScore ?? 0) * (1 + (m?.explicitCta ? 1 : 0))
    ),
  });

  // 5. depthScore × (1 + personalUse)
  schemes.push({
    name: "depth × (1+personalUse)",
    weeklyArr: buildWeeklyWeighted(
      (m) =>
        (m?.depthScore ?? 0) * (1 + (m?.creatorPersonallyUses ? 1 : 0))
    ),
  });

  // 6. depthScore × (1+CTA) × (1+personalUse)
  schemes.push({
    name: "depth × (1+CTA) × (1+pUse)",
    weeklyArr: buildWeeklyWeighted(
      (m) =>
        (m?.depthScore ?? 0) *
        (1 + (m?.explicitCta ? 1 : 0)) *
        (1 + (m?.creatorPersonallyUses ? 1 : 0))
    ),
  });

  // 7. Tier-only binary weights
  const TIER_WEIGHTS: Record<string, number> = {
    dedicated: 1.0,
    featured: 0.5,
    listed: 0.1,
    incidental: 0,
  };
  schemes.push({
    name: "Tier binary (1/.5/.1/0)",
    weeklyArr: buildWeeklyWeighted(
      (m) => TIER_WEIGHTS[m?.depthTier ?? ""] ?? 0
    ),
  });

  // 8. OLS-derived optimal weights
  // Normalise OLS coefficients so they sum to 1 (for interpretability)
  const olsCoeffs = weeklyOLS.coefficients;
  const olsPositive = olsCoeffs.map((c) => Math.max(0, c)); // clamp negatives
  const olsSum = olsPositive.reduce((a, b) => a + b, 0) || 1;
  const olsNorm = olsPositive.map((c) => c / olsSum);

  const OLS_WEIGHTS: Record<string, number> = {};
  TIERS.forEach((t, i) => {
    OLS_WEIGHTS[t] = olsNorm[i];
  });
  schemes.push({
    name: "OLS-derived weights",
    weeklyArr: buildWeeklyWeighted(
      (m) => OLS_WEIGHTS[m?.depthTier ?? ""] ?? 0
    ),
  });

  // 9. Multi-factor regression (tier-stratified) — already have R²
  // Don't need to add to schemes since it's a multi-variable model

  // Compute and rank
  const schemeResults = schemes.map((s) => ({
    name: s.name,
    rSignups: pearson(s.weeklyArr, wSignupsArr),
    r2Signups: rSquared(s.weeklyArr, wSignupsArr),
    rNAU: pearson(s.weeklyArr, wActivationsArr),
    r2NAU: rSquared(s.weeklyArr, wActivationsArr),
  }));

  // Add multi-factor as special entry
  schemeResults.push({
    name: "OLS multi-factor (4-var)",
    rSignups: Math.sqrt(weeklyOLS.rSquared),
    r2Signups: weeklyOLS.rSquared,
    rNAU: NaN, // not computed for multi-factor NAU
    r2NAU: NaN,
  });

  schemeResults.sort((a, b) => b.r2Signups - a.r2Signups);

  console.log(
    `\n${"#".padStart(3)}  ${"Weighting Scheme".padEnd(32)}  ${"r (signups)".padStart(12)}  ${"R² (signups)".padStart(13)}  ${"r (NAU)".padStart(9)}  ${"R² (NAU)".padStart(10)}`
  );
  console.log("  " + "-".repeat(85));

  for (let i = 0; i < schemeResults.length; i++) {
    const s = schemeResults[i];
    console.log(
      `${String(i + 1).padStart(3)}  ${s.name.padEnd(32)}  ${s.rSignups.toFixed(3).padStart(12)}  ${s.r2Signups.toFixed(3).padStart(13)}  ${isNaN(s.rNAU) ? "n/a".padStart(9) : s.rNAU.toFixed(3).padStart(9)}  ${isNaN(s.r2NAU) ? "n/a".padStart(10) : s.r2NAU.toFixed(3).padStart(10)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7: SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 7: SUMMARY & RECOMMENDATIONS");
  console.log("=".repeat(80));

  const baseline = schemeResults.find((s) =>
    s.name.includes("baseline")
  )!;
  const best = schemeResults[0];

  console.log(`\n  Baseline (raw views):  R² = ${baseline.r2Signups.toFixed(3)}`);
  console.log(`  Best scheme:          R² = ${best.r2Signups.toFixed(3)}  (${best.name})`);
  console.log(
    `  Improvement:          ${((best.r2Signups - baseline.r2Signups) * 100).toFixed(1)} percentage points (+${(((best.r2Signups / baseline.r2Signups) - 1) * 100).toFixed(0)}% relative)`
  );

  console.log("\n  Per-tier signup yield (OLS weekly coefficients):");
  for (let i = 0; i < TIERS.length; i++) {
    const coeff = weeklyOLS.coefficients[i];
    console.log(
      `    ${TIERS[i].padEnd(12)}: ${(coeff * 1000).toFixed(3)} signups per 1,000 views`
    );
  }

  console.log(
    "\n  OLS normalised weights (for building a quality-adjusted view metric):"
  );
  for (let i = 0; i < TIERS.length; i++) {
    console.log(
      `    ${TIERS[i].padEnd(12)}: ${olsNorm[i].toFixed(3)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8: ALL-FACTOR COMPOSITE SCORING
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log(
    "SECTION 8: ALL-FACTOR COMPOSITE — EVERY ATTRIBUTE CONTRIBUTES"
  );
  console.log("=".repeat(80));

  // ── Build feature matrix for every video ──────────────────────────────
  // For each video we build a numeric feature vector encoding ALL metadata.
  // Booleans → 0/1
  // Categoricals → one-hot (minus one reference category for identifiability)
  // Continuous → used directly (normalised to 0-1 range where sensible)

  // Gather all categorical values present in the dataset
  const allContentTypes = Array.from(
    new Set(
      [...videoMeta.values()]
        .map((v) => v.contentType)
        .filter(Boolean) as string[]
    )
  ).sort();
  const allAudiences = Array.from(
    new Set(
      [...videoMeta.values()]
        .map((v) => v.targetAudience)
        .filter(Boolean) as string[]
    )
  ).sort();
  const allSentiments = ["positive", "neutral", "mixed"];
  const allLinkTypes = ["tracked", "direct", "none"];

  // Feature definitions — order matters (maps to OLS coefficient indices)
  const featureNames: string[] = [
    // Continuous features (normalised)
    "depthScore",
    "granolaMinutes_norm",
    "firstMentionPct_norm",
    "mentionCount_norm",
    "durationMinutes_norm",
    // Boolean features
    "granolaLinkInDesc",
    "explicitCta",
    "creatorPersonallyUses",
    "sponsoredDisclosure",
    // One-hot: content type (reference = "other")
    ...allContentTypes
      .filter((ct) => ct !== "other")
      .map((ct) => `ct_${ct}`),
    // One-hot: target audience (reference = "other")
    ...allAudiences
      .filter((a) => a !== "other")
      .map((a) => `aud_${a}`),
    // One-hot: sentiment (reference = "neutral")
    ...allSentiments
      .filter((s) => s !== "neutral")
      .map((s) => `sent_${s}`),
    // One-hot: link type (reference = "none")
    ...allLinkTypes
      .filter((lt) => lt !== "none")
      .map((lt) => `link_${lt}`),
  ];

  console.log(`\n  Feature vector dimension: ${featureNames.length}`);
  console.log(`  Features: ${featureNames.join(", ")}`);

  // Normalisation helpers — find maxes across dataset
  const maxGranolaMin =
    Math.max(
      ...[...videoMeta.values()].map((v) => v.granolaMinutes ?? 0)
    ) || 1;
  const maxMentionCount =
    Math.max(
      ...[...videoMeta.values()].map((v) => v.mentionCount ?? 0)
    ) || 1;
  const maxDurationSec =
    Math.max(
      ...[...videoMeta.values()].map((v) => v.durationSeconds ?? 0)
    ) || 1;

  /** Encode a single video into its feature vector */
  function encodeFeatures(meta: VideoMeta | undefined): number[] {
    if (!meta) return new Array(featureNames.length).fill(0);

    const features: number[] = [];

    // Continuous (normalised 0-1)
    features.push(meta.depthScore ?? 0); // already 0-1
    features.push((meta.granolaMinutes ?? 0) / maxGranolaMin);
    features.push((meta.firstMentionPct ?? 100) / 100); // lower = earlier = better
    features.push((meta.mentionCount ?? 0) / maxMentionCount);
    features.push(((meta.durationSeconds ?? 0) / 60) / (maxDurationSec / 60));

    // Booleans
    features.push(meta.granolaLinkInDesc === true ? 1 : 0);
    features.push(meta.explicitCta === true ? 1 : 0);
    features.push(meta.creatorPersonallyUses === true ? 1 : 0);
    features.push(meta.sponsoredDisclosure === true ? 1 : 0);

    // One-hot: content type
    for (const ct of allContentTypes.filter((c) => c !== "other")) {
      features.push(meta.contentType === ct ? 1 : 0);
    }
    // One-hot: audience
    for (const aud of allAudiences.filter((a) => a !== "other")) {
      features.push(meta.targetAudience === aud ? 1 : 0);
    }
    // One-hot: sentiment
    for (const s of allSentiments.filter((s) => s !== "neutral")) {
      features.push(meta.sentiment === s ? 1 : 0);
    }
    // One-hot: link type
    for (const lt of allLinkTypes.filter((l) => l !== "none")) {
      features.push(meta.granolaLinkType === lt ? 1 : 0);
    }

    return features;
  }

  // ── Compute per-video attributed signups per view (conversion rate) ───
  // This is the dependent variable: for each video, signups / views
  // But for OLS we use the view-share approach: daily weighted sum

  // Approach: Build daily feature-weighted view series, run OLS at weekly level
  // For each day, for each feature dimension f:
  //   feature_f_views[day] = Σ over videos ( increment_i × feature_f_i )
  // Then OLS: weekly_signups = β₀ + Σ βf × weekly_feature_f_views

  const K = featureNames.length;
  const dailyFeatureViews: Map<string, number>[] = Array.from(
    { length: K },
    () => new Map()
  );

  // Also track each video's feature vector for per-video scoring later
  const videoFeatureVectors = new Map<string, number[]>();

  for (const [videoId, increments] of videoIncrements) {
    const meta = videoMeta.get(videoId);
    const features = encodeFeatures(meta);
    videoFeatureVectors.set(videoId, features);

    for (const { date, increment } of increments) {
      for (let f = 0; f < K; f++) {
        const map = dailyFeatureViews[f];
        map.set(date, (map.get(date) ?? 0) + increment * features[f]);
      }
    }
  }

  // Aggregate to weekly
  const weeklyFeatureViews: number[][] = Array.from({ length: K }, () =>
    new Array(allWeeks.length).fill(0)
  );
  for (let f = 0; f < K; f++) {
    for (const [date, val] of dailyFeatureViews[f]) {
      const week = getWeekKey(date);
      const idx = allWeeks.indexOf(week);
      if (idx >= 0) weeklyFeatureViews[f][idx] += val;
    }
  }

  // Run OLS: weekly_signups = β₀ + Σ βf × weekly_feature_f_views
  const allFactorOLS = olsRegression(weeklyFeatureViews, wSignupsArr);

  console.log(
    `\n--- All-factor OLS regression (weekly, ${K} features) ---\n`
  );
  console.log(`  R² = ${allFactorOLS.rSquared.toFixed(4)}`);
  console.log(
    `  R² baseline (raw views): ${weeklyRawOLS.rSquared.toFixed(4)}`
  );
  console.log(
    `  R² improvement: +${((allFactorOLS.rSquared - weeklyRawOLS.rSquared) * 100).toFixed(1)} pp  (+${(((allFactorOLS.rSquared / weeklyRawOLS.rSquared) - 1) * 100).toFixed(0)}% relative)`
  );
  console.log(`  Intercept: ${allFactorOLS.intercept.toFixed(4)}`);

  // Show coefficients sorted by absolute magnitude
  const coeffPairs = featureNames.map((name, i) => ({
    name,
    coeff: allFactorOLS.coefficients[i],
    absCoeff: Math.abs(allFactorOLS.coefficients[i]),
  }));
  coeffPairs.sort((a, b) => b.absCoeff - a.absCoeff);

  console.log(
    `\n  Factor coefficients (sorted by |magnitude|):\n`
  );
  console.log(
    `  ${"Feature".padEnd(28)}  ${"Coefficient".padStart(12)}  ${"S/kV".padStart(8)}  ${"Direction".padStart(10)}`
  );
  console.log("  " + "-".repeat(64));
  for (const { name, coeff } of coeffPairs) {
    const sPerKV = coeff * 1000;
    const dir = coeff > 0.000001 ? "↑ positive" : coeff < -0.000001 ? "↓ negative" : "— neutral";
    console.log(
      `  ${name.padEnd(28)}  ${coeff.toFixed(6).padStart(12)}  ${sPerKV.toFixed(3).padStart(8)}  ${dir.padStart(10)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 9: COMPOSITE QUALITY SCORE PER VIDEO
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log(
    "SECTION 9: COMPOSITE QUALITY SCORE — EVERY VIDEO RANKED"
  );
  console.log("=".repeat(80));

  // The composite quality score for a video is: Σ βf × feature_f
  // This is the video's "signup productivity per view" predicted by the model
  // Higher = each view from this video is more likely to produce a signup

  // Compute score for every video with metadata
  const videoScores: {
    id: string;
    videoId: string;
    title: string;
    compositeScore: number;
    views: number;
    attrSignups: number;
    actualSPerKV: number;
    depthTier: string;
    features: Record<string, number>;
  }[] = [];

  for (const [videoId, meta] of videoMeta) {
    const features = videoFeatureVectors.get(videoId);
    if (!features || !meta.depthTier) continue;

    let compositeScore = 0;
    const featureBreakdown: Record<string, number> = {};
    for (let f = 0; f < K; f++) {
      const contribution = allFactorOLS.coefficients[f] * features[f];
      compositeScore += contribution;
      if (Math.abs(contribution) > 0.000001) {
        featureBreakdown[featureNames[f]] = contribution;
      }
    }

    const views = videoTotalViews.get(videoId) ?? 0;
    const signups = videoAttrSignups.get(videoId) ?? 0;
    const actualSPerKV = views > 0 ? (signups / views) * 1000 : 0;

    videoScores.push({
      id: videoId,
      videoId: meta.videoId,
      title: meta.title,
      compositeScore,
      views,
      attrSignups: signups,
      actualSPerKV,
      depthTier: meta.depthTier,
      features: featureBreakdown,
    });
  }

  // Sort by composite score descending
  videoScores.sort((a, b) => b.compositeScore - a.compositeScore);

  console.log(
    `\n  Videos scored: ${videoScores.length}`
  );
  console.log(
    `\n  Composite score = sum of (coefficient × feature_value) across all ${K} factors`
  );
  console.log(
    `  Interpretation: predicted signups per view, based on video attributes`
  );

  // Top 25
  console.log(
    "\n--- Top 25 videos by composite quality score ---\n"
  );
  console.log(
    `  ${"#".padStart(3)}  ${"Score".padStart(7)}  ${"S/kV".padStart(7)}  ${"Views".padStart(9)}  ${"Tier".padEnd(10)}  Title`
  );
  console.log("  " + "-".repeat(90));
  for (let i = 0; i < Math.min(25, videoScores.length); i++) {
    const v = videoScores[i];
    console.log(
      `  ${String(i + 1).padStart(3)}  ${(v.compositeScore * 1000).toFixed(2).padStart(7)}  ${v.actualSPerKV.toFixed(2).padStart(7)}  ${v.views.toLocaleString().padStart(9)}  ${v.depthTier.padEnd(10)}  ${v.title.slice(0, 55)}`
    );
  }

  // Bottom 10
  console.log(
    "\n--- Bottom 10 videos by composite quality score ---\n"
  );
  console.log(
    `  ${"#".padStart(3)}  ${"Score".padStart(7)}  ${"S/kV".padStart(7)}  ${"Views".padStart(9)}  ${"Tier".padEnd(10)}  Title`
  );
  console.log("  " + "-".repeat(90));
  for (
    let i = Math.max(0, videoScores.length - 10);
    i < videoScores.length;
    i++
  ) {
    const v = videoScores[i];
    console.log(
      `  ${String(i + 1).padStart(3)}  ${(v.compositeScore * 1000).toFixed(2).padStart(7)}  ${v.actualSPerKV.toFixed(2).padStart(7)}  ${v.views.toLocaleString().padStart(9)}  ${v.depthTier.padEnd(10)}  ${v.title.slice(0, 55)}`
    );
  }

  // Score distribution by tier
  console.log(
    "\n--- Average composite score by depth tier ---\n"
  );
  for (const tier of TIERS) {
    const tierScores = videoScores.filter((v) => v.depthTier === tier);
    const avg =
      tierScores.length > 0
        ? tierScores.reduce((s, v) => s + v.compositeScore, 0) /
          tierScores.length
        : 0;
    const median = tierScores.length > 0
      ? tierScores.sort((a, b) => a.compositeScore - b.compositeScore)[
          Math.floor(tierScores.length / 2)
        ].compositeScore
      : 0;
    console.log(
      `  ${tier.padEnd(12)}: avg=${(avg * 1000).toFixed(3).padStart(8)}  median=${(median * 1000).toFixed(3).padStart(8)}  n=${tierScores.length}`
    );
  }

  // ── Feature importance breakdown for top 5 videos ──
  console.log(
    "\n--- Feature contribution breakdown (top 5 videos) ---"
  );
  // Re-sort in case tier breakdown shuffled the array
  videoScores.sort((a, b) => b.compositeScore - a.compositeScore);
  for (let i = 0; i < Math.min(5, videoScores.length); i++) {
    const v = videoScores[i];
    console.log(`\n  #${i + 1}: ${v.title.slice(0, 60)}`);
    console.log(`       Composite: ${(v.compositeScore * 1000).toFixed(3)}  |  Actual S/kV: ${v.actualSPerKV.toFixed(2)}  |  Views: ${v.views.toLocaleString()}`);
    const sorted = Object.entries(v.features).sort(
      (a, b) => Math.abs(b[1]) - Math.abs(a[1])
    );
    for (const [feat, contrib] of sorted.slice(0, 8)) {
      const bar = contrib > 0 ? "+" : "";
      console.log(
        `       ${feat.padEnd(26)} ${bar}${(contrib * 1000).toFixed(3)}`
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 10: COMPOSITE-WEIGHTED VIEW INDEX — CORRELATION TEST
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log(
    "SECTION 10: COMPOSITE-WEIGHTED VIEWS ↔ SIGNUPS CORRELATION"
  );
  console.log("=".repeat(80));

  // Build a daily "composite-weighted views" series where each view is
  // multiplied by its video's composite quality score
  const dailyCompositeViews = new Map<string, number>();
  for (const [videoId, increments] of videoIncrements) {
    const score =
      videoScores.find((v) => v.id === videoId)?.compositeScore ?? 0;
    // Clamp to non-negative (negative-score videos contribute 0)
    const weight = Math.max(0, score);
    for (const { date, increment } of increments) {
      dailyCompositeViews.set(
        date,
        (dailyCompositeViews.get(date) ?? 0) + increment * weight
      );
    }
  }

  // Weekly composite
  const weeklyComposite = new Map<string, number>();
  for (const date of sortedDates) {
    const week = getWeekKey(date);
    weeklyComposite.set(
      week,
      (weeklyComposite.get(week) ?? 0) +
        (dailyCompositeViews.get(date) ?? 0)
    );
  }
  const wCompositeArr = allWeeks.map((w) => weeklyComposite.get(w) ?? 0);

  console.log("\n--- Weekly R² comparison: all weighting approaches ---\n");

  // Build a comprehensive comparison table of ALL approaches
  const finalSchemes: {
    name: string;
    r: number;
    r2: number;
    rho: number;
  }[] = [
    {
      name: "1. Raw views (baseline)",
      r: pearson(wRawArr, wSignupsArr),
      r2: rSquared(wRawArr, wSignupsArr),
      rho: spearman(wRawArr, wSignupsArr),
    },
    {
      name: "2. depthScore × views",
      r: pearson(wWeightedArr, wSignupsArr),
      r2: rSquared(wWeightedArr, wSignupsArr),
      rho: spearman(wWeightedArr, wSignupsArr),
    },
    {
      name: "3. HQ only (ded+feat)",
      r: pearson(wHQArr, wSignupsArr),
      r2: rSquared(wHQArr, wSignupsArr),
      rho: spearman(wHQArr, wSignupsArr),
    },
    {
      name: "4. Tier binary (1/.5/.1/0)",
      r: pearson(
        schemes.find((s) => s.name.includes("Tier binary"))!.weeklyArr,
        wSignupsArr
      ),
      r2: rSquared(
        schemes.find((s) => s.name.includes("Tier binary"))!.weeklyArr,
        wSignupsArr
      ),
      rho: spearman(
        schemes.find((s) => s.name.includes("Tier binary"))!.weeklyArr,
        wSignupsArr
      ),
    },
    {
      name: "5. Composite (all factors)",
      r: pearson(wCompositeArr, wSignupsArr),
      r2: rSquared(wCompositeArr, wSignupsArr),
      rho: spearman(wCompositeArr, wSignupsArr),
    },
    {
      name: "6. OLS 4-var (tier only)",
      r: Math.sqrt(weeklyOLS.rSquared),
      r2: weeklyOLS.rSquared,
      rho: NaN,
    },
    {
      name: `7. OLS ${K}-var (all factors)`,
      r: Math.sqrt(allFactorOLS.rSquared),
      r2: allFactorOLS.rSquared,
      rho: NaN,
    },
  ];

  console.log(
    `  ${"Approach".padEnd(35)}  ${"Pearson r".padStart(10)}  ${"R²".padStart(8)}  ${"Spearman ρ".padStart(11)}`
  );
  console.log("  " + "-".repeat(70));
  for (const s of finalSchemes) {
    console.log(
      `  ${s.name.padEnd(35)}  ${s.r.toFixed(3).padStart(10)}  ${s.r2.toFixed(3).padStart(8)}  ${isNaN(s.rho) ? "n/a".padStart(11) : s.rho.toFixed(3).padStart(11)}`
    );
  }

  // Daily lag analysis for composite-weighted
  console.log(
    "\n--- Daily lag analysis: composite-weighted views → signups ---\n"
  );
  console.log(
    `  ${"Lag".padEnd(6)}  ${"Raw r".padStart(8)}  ${"Raw R²".padStart(8)}  ${"Composite r".padStart(12)}  ${"Composite R²".padStart(13)}`
  );
  console.log("  " + "-".repeat(55));

  for (let lag = 0; lag <= 7; lag++) {
    const rawV: number[] = [];
    const compV: number[] = [];
    const signups: number[] = [];
    for (let i = 0; i < sortedDates.length - lag; i++) {
      rawV.push(dailyRaw.get(sortedDates[i]) ?? 0);
      compV.push(dailyCompositeViews.get(sortedDates[i]) ?? 0);
      signups.push(
        metricsByDate.get(sortedDates[i + lag])?.signups ?? 0
      );
    }
    const rRaw = pearson(rawV, signups);
    const rComp = pearson(compV, signups);
    console.log(
      `  ${`${lag}d`.padEnd(6)}  ${rRaw.toFixed(3).padStart(8)}  ${(rRaw ** 2).toFixed(3).padStart(8)}  ${rComp.toFixed(3).padStart(12)}  ${(rComp ** 2).toFixed(3).padStart(13)}`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 11: CROSS-SECTIONAL REGRESSION — THE ROBUST COMPOSITE
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log(
    "SECTION 11: CROSS-SECTIONAL REGRESSION — PER-VIDEO CONVERSION"
  );
  console.log("=".repeat(80));

  console.log(
    "\n  The time-series OLS above has only ~17 weekly observations for 25"
  );
  console.log(
    "  features, which overfits. This section instead uses per-video data:"
  );
  console.log(
    "    For each of ~288 videos: S/kV = f(all features)"
  );
  console.log(
    "    This is 288 observations → much more robust coefficients.\n"
  );

  // Build cross-sectional dataset: each video is one observation
  // Dependent variable: signups per 1000 views (S/kV)
  // Only include videos with >= 10 views to avoid extreme ratios from tiny samples
  const MIN_VIEWS_FOR_XSECTION = 10;

  const xsVideos: { features: number[]; sPerKV: number; weight: number }[] = [];
  for (const [videoId, meta] of videoMeta) {
    if (!meta.depthTier) continue;
    const views = videoTotalViews.get(videoId) ?? 0;
    if (views < MIN_VIEWS_FOR_XSECTION) continue;
    const signups = videoAttrSignups.get(videoId) ?? 0;
    const sPerKV = (signups / views) * 1000;
    const features = encodeFeatures(meta);
    xsVideos.push({ features, sPerKV, weight: Math.sqrt(views) });
  }

  console.log(
    `  Videos with ≥${MIN_VIEWS_FOR_XSECTION} views: ${xsVideos.length}`
  );

  // Run OLS: S/kV = β₀ + Σ βf × feature_f
  const xsFeatureArrays: number[][] = Array.from(
    { length: K },
    (_, f) => xsVideos.map((v) => v.features[f])
  );
  const xsSPerKV = xsVideos.map((v) => v.sPerKV);

  const xsOLS = olsRegression(xsFeatureArrays, xsSPerKV);

  console.log(
    `\n--- Cross-sectional OLS: S/kV = β₀ + Σ βf × feature_f ---\n`
  );
  console.log(`  R² = ${xsOLS.rSquared.toFixed(4)}`);
  console.log(`  Intercept (base S/kV): ${xsOLS.intercept.toFixed(3)}`);

  // Show coefficients sorted by absolute magnitude
  const xsCoeffPairs = featureNames.map((name, i) => ({
    name,
    coeff: xsOLS.coefficients[i],
    absCoeff: Math.abs(xsOLS.coefficients[i]),
  }));
  xsCoeffPairs.sort((a, b) => b.absCoeff - a.absCoeff);

  console.log(
    `\n  Feature coefficients (S/kV contribution, sorted by |magnitude|):\n`
  );
  console.log(
    `  ${"Feature".padEnd(28)}  ${"Coeff (S/kV)".padStart(14)}  ${"Direction".padStart(10)}`
  );
  console.log("  " + "-".repeat(56));
  for (const { name, coeff } of xsCoeffPairs) {
    const dir =
      coeff > 0.01
        ? "↑ positive"
        : coeff < -0.01
          ? "↓ negative"
          : "— neutral";
    console.log(
      `  ${name.padEnd(28)}  ${coeff.toFixed(3).padStart(14)}  ${dir.padStart(10)}`
    );
  }

  // ── Weighted cross-sectional regression (weight by sqrt(views)) ──────
  // Larger videos are more reliable estimates of S/kV, so weight them more
  console.log(
    "\n--- Weighted cross-sectional OLS (√views weighting) ---\n"
  );

  // Transform for WLS: multiply both sides by sqrt(weight)
  const wlsFeatureArrays: number[][] = Array.from(
    { length: K },
    (_, f) => xsVideos.map((v) => v.features[f] * v.weight)
  );
  const wlsSPerKV = xsVideos.map((v) => v.sPerKV * v.weight);

  const wlsOLS = olsRegression(wlsFeatureArrays, wlsSPerKV);

  console.log(`  R² (weighted) = ${wlsOLS.rSquared.toFixed(4)}`);
  console.log(
    `  Intercept: ${wlsOLS.intercept.toFixed(3)}`
  );

  const wlsCoeffPairs = featureNames.map((name, i) => ({
    name,
    coeff: wlsOLS.coefficients[i],
    absCoeff: Math.abs(wlsOLS.coefficients[i]),
  }));
  wlsCoeffPairs.sort((a, b) => b.absCoeff - a.absCoeff);

  console.log(
    `\n  ${"Feature".padEnd(28)}  ${"Coeff (S/kV)".padStart(14)}  ${"Direction".padStart(10)}`
  );
  console.log("  " + "-".repeat(56));
  for (const { name, coeff } of wlsCoeffPairs) {
    const dir =
      coeff > 0.01
        ? "↑ positive"
        : coeff < -0.01
          ? "↓ negative"
          : "— neutral";
    console.log(
      `  ${name.padEnd(28)}  ${coeff.toFixed(3).padStart(14)}  ${dir.padStart(10)}`
    );
  }

  // ── Build the FINAL composite quality score using cross-sectional coefficients ──
  // Re-score every video using the cross-sectional OLS coefficients
  console.log(
    "\n--- Per-video composite quality score (using cross-sectional coefficients) ---\n"
  );

  const xsVideoScores: {
    id: string;
    title: string;
    compositeScore: number;
    views: number;
    actualSPerKV: number;
    predictedSPerKV: number;
    depthTier: string;
    qualityAdjViews: number;
    topContributors: { name: string; contrib: number }[];
  }[] = [];

  for (const [videoId, meta] of videoMeta) {
    if (!meta.depthTier) continue;
    const features = videoFeatureVectors.get(videoId);
    if (!features) continue;

    let predicted = xsOLS.intercept;
    const contribs: { name: string; contrib: number }[] = [];
    for (let f = 0; f < K; f++) {
      const contrib = xsOLS.coefficients[f] * features[f];
      predicted += contrib;
      if (Math.abs(contrib) > 0.01) {
        contribs.push({ name: featureNames[f], contrib });
      }
    }
    contribs.sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));

    const views = videoTotalViews.get(videoId) ?? 0;
    const signups = videoAttrSignups.get(videoId) ?? 0;
    const actualSPerKV = views > 0 ? (signups / views) * 1000 : 0;
    const qualityAdjViews = views * Math.max(0, predicted / 1000);

    xsVideoScores.push({
      id: videoId,
      title: meta.title,
      compositeScore: predicted,
      views,
      actualSPerKV,
      predictedSPerKV: predicted,
      depthTier: meta.depthTier,
      qualityAdjViews,
      topContributors: contribs.slice(0, 5),
    });
  }

  xsVideoScores.sort((a, b) => b.compositeScore - a.compositeScore);

  // Top 25
  console.log(
    `  ${"#".padStart(3)}  ${"Predicted".padStart(10)}  ${"Actual".padStart(8)}  ${"Views".padStart(9)}  ${"QA Views".padStart(10)}  ${"Tier".padEnd(10)}  Title`
  );
  console.log(
    `  ${"".padStart(3)}  ${"S/kV".padStart(10)}  ${"S/kV".padStart(8)}  ${"".padStart(9)}  ${"".padStart(10)}  ${"".padEnd(10)}`
  );
  console.log("  " + "-".repeat(100));
  for (let i = 0; i < Math.min(25, xsVideoScores.length); i++) {
    const v = xsVideoScores[i];
    console.log(
      `  ${String(i + 1).padStart(3)}  ${v.predictedSPerKV.toFixed(2).padStart(10)}  ${v.actualSPerKV.toFixed(2).padStart(8)}  ${v.views.toLocaleString().padStart(9)}  ${v.qualityAdjViews.toFixed(0).padStart(10)}  ${v.depthTier.padEnd(10)}  ${v.title.slice(0, 48)}`
    );
  }

  // Bottom 10
  console.log(
    "\n--- Bottom 10 ---\n"
  );
  for (
    let i = Math.max(0, xsVideoScores.length - 10);
    i < xsVideoScores.length;
    i++
  ) {
    const v = xsVideoScores[i];
    console.log(
      `  ${String(i + 1).padStart(3)}  ${v.predictedSPerKV.toFixed(2).padStart(10)}  ${v.actualSPerKV.toFixed(2).padStart(8)}  ${v.views.toLocaleString().padStart(9)}  ${v.qualityAdjViews.toFixed(0).padStart(10)}  ${v.depthTier.padEnd(10)}  ${v.title.slice(0, 48)}`
    );
  }

  // Average by tier
  console.log(
    "\n--- Average predicted S/kV by depth tier ---\n"
  );
  for (const tier of TIERS) {
    const tierVids = xsVideoScores.filter((v) => v.depthTier === tier);
    if (tierVids.length === 0) continue;
    const avgPredicted =
      tierVids.reduce((s, v) => s + v.predictedSPerKV, 0) / tierVids.length;
    const avgActual =
      tierVids.reduce((s, v) => s + v.actualSPerKV, 0) / tierVids.length;
    console.log(
      `  ${tier.padEnd(12)}: predicted=${avgPredicted.toFixed(2).padStart(7)} S/kV  actual=${avgActual.toFixed(2).padStart(7)} S/kV  n=${tierVids.length}`
    );
  }

  // Feature contribution breakdown for top 5
  console.log(
    "\n--- Feature contribution breakdown (top 5 scoring videos) ---"
  );
  for (let i = 0; i < Math.min(5, xsVideoScores.length); i++) {
    const v = xsVideoScores[i];
    console.log(
      `\n  #${i + 1}: ${v.title.slice(0, 60)}`
    );
    console.log(
      `       Predicted: ${v.predictedSPerKV.toFixed(2)} S/kV  |  Actual: ${v.actualSPerKV.toFixed(2)} S/kV  |  Views: ${v.views.toLocaleString()}`
    );
    console.log(`       Base (intercept): ${xsOLS.intercept.toFixed(2)} S/kV`);
    for (const { name, contrib } of v.topContributors) {
      const sign = contrib > 0 ? "+" : "";
      console.log(
        `       ${name.padEnd(26)} ${sign}${contrib.toFixed(2)} S/kV`
      );
    }
  }

  // ── Test: composite-weighted views using cross-sectional scores ──────
  console.log(
    "\n--- Correlation test: cross-sectional composite-weighted views → signups ---\n"
  );

  // Build a daily series using the cross-sectional predicted S/kV as weights
  const dailyXSComposite = new Map<string, number>();
  for (const [videoId, increments] of videoIncrements) {
    const vs = xsVideoScores.find((v) => v.id === videoId);
    const weight = Math.max(0, (vs?.predictedSPerKV ?? 0) / 1000);
    for (const { date, increment } of increments) {
      dailyXSComposite.set(
        date,
        (dailyXSComposite.get(date) ?? 0) + increment * weight
      );
    }
  }

  const weeklyXSComposite = new Map<string, number>();
  for (const date of sortedDates) {
    const week = getWeekKey(date);
    weeklyXSComposite.set(
      week,
      (weeklyXSComposite.get(week) ?? 0) +
        (dailyXSComposite.get(date) ?? 0)
    );
  }
  const wXSCompositeArr = allWeeks.map(
    (w) => weeklyXSComposite.get(w) ?? 0
  );

  const xsCompR = pearson(wXSCompositeArr, wSignupsArr);
  const xsCompR2 = xsCompR * xsCompR;
  const xsCompRho = spearman(wXSCompositeArr, wSignupsArr);

  console.log(
    `  Raw views → signups (weekly):               r=${pearson(wRawArr, wSignupsArr).toFixed(3)}  R²=${rSquared(wRawArr, wSignupsArr).toFixed(3)}`
  );
  console.log(
    `  XS-composite-weighted views → signups:      r=${xsCompR.toFixed(3)}  R²=${xsCompR2.toFixed(3)}  ρ=${xsCompRho.toFixed(3)}`
  );

  const improvementPP = (xsCompR2 - rSquared(wRawArr, wSignupsArr)) * 100;
  if (improvementPP > 0) {
    console.log(
      `  Improvement: +${improvementPP.toFixed(1)} percentage points`
    );
  } else {
    console.log(
      `  Delta: ${improvementPP.toFixed(1)} pp (composite weighting ${improvementPP > 0 ? "improves" : "does not improve"} single-index correlation)`
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 12: FINAL SUMMARY — THE COMPOSITE FORMULA
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(80));
  console.log("SECTION 12: FINAL SUMMARY — COMPOSITE QUALITY FORMULA");
  console.log("=".repeat(80));

  console.log(
    "\n  The composite quality score predicts S/kV (signups per 1,000 views)"
  );
  console.log(
    "  for a video based on ALL its attributes:\n"
  );
  console.log(
    `    predicted_S/kV = ${xsOLS.intercept.toFixed(2)} (base)`
  );

  // Show cross-sectional coefficients as the canonical formula
  const xsPositive = xsCoeffPairs.filter((c) => c.coeff > 0.01);
  const xsNegative = xsCoeffPairs.filter((c) => c.coeff < -0.01);

  if (xsPositive.length > 0) {
    console.log(
      "\n  POSITIVE contributors (these attributes INCREASE conversion):"
    );
    for (const { name, coeff } of xsPositive) {
      console.log(
        `    + ${name.padEnd(28)}  +${coeff.toFixed(2)} S/kV`
      );
    }
  }

  if (xsNegative.length > 0) {
    console.log(
      "\n  NEGATIVE contributors (these attributes correlate with LOWER conversion):"
    );
    for (const { name, coeff } of xsNegative) {
      console.log(
        `    − ${name.padEnd(28)}  ${coeff.toFixed(2)} S/kV`
      );
    }
  }

  // Final R² comparison
  const baselineR2 = rSquared(wRawArr, wSignupsArr);

  console.log("\n" + "-".repeat(60));
  console.log("\n  KEY RESULTS:\n");
  console.log(
    `    Raw views → signups (weekly):               R² = ${baselineR2.toFixed(3)}`
  );
  console.log(
    `    XS-composite-weighted views → signups:      R² = ${xsCompR2.toFixed(3)}`
  );
  console.log(
    `    Cross-sectional model R²:                   R² = ${xsOLS.rSquared.toFixed(3)}`
  );
  console.log(
    `    Time-series all-factor OLS R²:              R² = ${allFactorOLS.rSquared.toFixed(3)} (overfits — ${K} features, ~17 weeks)`
  );

  console.log(
    "\n  INTERPRETATION:"
  );
  console.log(
    `    The cross-sectional model explains ${(xsOLS.rSquared * 100).toFixed(1)}% of variation in per-video`
  );
  console.log(
    "    conversion rates using video attributes alone."
  );
  console.log(
    "\n    Use the predicted S/kV to evaluate video performance:"
  );
  console.log(
    "      quality_adjusted_views = views × (predicted_S/kV / 1000)"
  );
  console.log(
    "    This gives you a single number that accounts for both reach AND quality."
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
