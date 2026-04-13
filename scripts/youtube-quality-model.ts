/**
 * YouTube Quality Model: Data-Driven View Weighting
 *
 * Finds the optimal quality weights for YouTube video views to maximise
 * correlation with signups. Two complementary approaches:
 *
 *   A. Unconstrained OLS — linear reformulation, data picks all weights
 *   B. Structured grid search — multiplicative quality, data-optimised
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/youtube-quality-model.ts
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

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay(); // 0=Sun, 6=Sat
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : num / den;
}

/**
 * OLS regression: y = β₀ + β₁x₁ + ... + βₖxₖ
 * Returns { coefficients, intercept, rSquared }
 */
function olsRegression(
  xs: number[][],
  y: number[]
): { coefficients: number[]; intercept: number; rSquared: number } {
  const n = y.length;
  const k = xs.length;
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

  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col < dim; col++) {
    let maxRow = col;
    for (let row = col + 1; row < dim; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
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

/**
 * Simple 1-variable OLS with day-of-week controls.
 * Returns R² after controlling for day-of-week patterns.
 */
function olsWithDowControl(
  x: number[],
  y: number[],
  dows: number[]
): { beta: number; intercept: number; rSquared: number } {
  // Build predictors: 6 day-of-week dummies (Sun=ref) + 1 x variable
  const xs: number[][] = [];
  for (let d = 1; d <= 6; d++) {
    xs.push(dows.map((dow) => (dow === d ? 1 : 0)));
  }
  xs.push(x);

  const result = olsRegression(xs, y);
  return {
    beta: result.coefficients[6], // the x coefficient (after 6 DOW dummies)
    intercept: result.intercept,
    rSquared: result.rSquared,
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

type DepthTier = "dedicated" | "featured" | "listed" | "incidental";

interface VideoMeta {
  id: string;
  depthTier: string | null;
  depthScore: number | null;
  explicitCta: boolean | null;
  creatorPersonallyUses: boolean | null;
  granolaLinkInDesc: boolean | null;
  sponsoredDisclosure: boolean | null;
  // For display
  title: string;
  channelTitle: string;
  contentType: string | null;
  targetAudience: string | null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(80));
  console.log("YOUTUBE QUALITY MODEL — DATA-DRIVEN VIEW WEIGHTING");
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
        title: true,
        channelTitle: true,
        depthTier: true,
        depthScore: true,
        contentType: true,
        targetAudience: true,
        explicitCta: true,
        creatorPersonallyUses: true,
        granolaLinkInDesc: true,
        sponsoredDisclosure: true,
      },
    }),
  ]);

  // Build metadata lookup
  const videoMeta = new Map<string, VideoMeta>();
  for (const v of videos) {
    videoMeta.set(v.id, v as VideoMeta);
  }

  // Identify and exclude Granola-owned videos
  const granolaOwnedIds = new Set(
    videos
      .filter((v) => v.channelTitle.toLowerCase() === "granola")
      .map((v) => v.id)
  );

  console.log(`\nData loaded:`);
  console.log(`  Videos: ${videos.length} total, ${granolaOwnedIds.size} Granola-owned (excluded)`);
  console.log(`  Third-party videos: ${videos.length - granolaOwnedIds.size}`);
  console.log(`  DailyMetric records: ${metricRows.length}`);
  console.log(`  ImportedVideoView records: ${allViews.length}`);

  // ── Compute per-video daily increments ────────────────────────────────────
  const viewsByVideo = new Map<string, { date: string; viewCount: number }[]>();
  for (const v of allViews) {
    if (granolaOwnedIds.has(v.videoId)) continue;
    if (!viewsByVideo.has(v.videoId)) viewsByVideo.set(v.videoId, []);
    viewsByVideo.get(v.videoId)!.push({ date: v.date, viewCount: v.viewCount });
  }

  // Per-video increments with gap normalization
  const videoIncrements = new Map<
    string,
    { date: string; increment: number }[]
  >();

  for (const [videoId, views] of viewsByVideo) {
    views.sort((a, b) => a.date.localeCompare(b.date));
    const increments: { date: string; increment: number }[] = [];
    for (let i = 1; i < views.length; i++) {
      const diff = views[i].viewCount - views[i - 1].viewCount;
      if (diff < 0) continue;
      const gapMs =
        new Date(views[i].date).getTime() -
        new Date(views[i - 1].date).getTime();
      const gapDays = Math.round(gapMs / 86400000);
      if (gapDays > 1) {
        const dailyRate = diff / gapDays;
        for (let d = 1; d <= gapDays; d++) {
          const fillDate = new Date(
            new Date(views[i - 1].date).getTime() + d * 86400000
          );
          increments.push({
            date: fillDate.toISOString().slice(0, 10),
            increment: dailyRate,
          });
        }
      } else {
        increments.push({ date: views[i].date, increment: diff });
      }
    }
    videoIncrements.set(videoId, increments);
  }

  // Daily metrics lookup
  const metricsByDate = new Map<string, number>();
  for (const m of metricRows) {
    metricsByDate.set(m.date, (metricsByDate.get(m.date) ?? 0) + m.signups);
  }

  // Use ALL metric dates — days before video tracking started (views = 0)
  // are essential baseline data showing signup levels without YouTube influence
  const allDates = [...metricsByDate.keys()].sort();

  console.log(
    `  Date range: ${allDates[0]} to ${allDates[allDates.length - 1]} (${allDates.length} days)`
  );

  // ── Pre-compute per-video daily increment lookup ──────────────────────────
  // videoDateInc[videoId][date] = increment
  const videoDateInc = new Map<string, Map<string, number>>();
  for (const [videoId, incs] of videoIncrements) {
    const dateMap = new Map<string, number>();
    for (const { date, increment } of incs) {
      dateMap.set(date, (dateMap.get(date) ?? 0) + increment);
    }
    videoDateInc.set(videoId, dateMap);
  }

  // Per-video total views (for scorecard)
  const videoTotalViews = new Map<string, number>();
  for (const [videoId, incs] of videoIncrements) {
    videoTotalViews.set(
      videoId,
      incs.reduce((sum, i) => sum + i.increment, 0)
    );
  }

  // Daily signups and day-of-week arrays
  const signupsArr = allDates.map((d) => metricsByDate.get(d) ?? 0);
  const dowArr = allDates.map((d) => getDayOfWeek(d));

  // ── Baseline: raw views (no quality weighting) ────────────────────────────
  const dailyRawViews = allDates.map((date) => {
    let total = 0;
    for (const [, dateMap] of videoDateInc) {
      total += dateMap.get(date) ?? 0;
    }
    return total;
  });

  const baselineDaily = olsWithDowControl(dailyRawViews, signupsArr, dowArr);

  // Weekly baseline
  const weeklyRaw = new Map<string, number>();
  const weeklySignups = new Map<string, number>();
  for (let i = 0; i < allDates.length; i++) {
    const w = getWeekKey(allDates[i]);
    weeklyRaw.set(w, (weeklyRaw.get(w) ?? 0) + dailyRawViews[i]);
    weeklySignups.set(w, (weeklySignups.get(w) ?? 0) + signupsArr[i]);
  }
  const weeks = [...weeklyRaw.keys()].sort();
  const wRawArr = weeks.map((w) => weeklyRaw.get(w)!);
  const wSigArr = weeks.map((w) => weeklySignups.get(w)!);
  const baselineWeeklyR2 = pearson(wRawArr, wSigArr) ** 2;

  console.log(`\n${"=".repeat(80)}`);
  console.log("BASELINE — RAW VIEWS (no quality weighting)");
  console.log("=".repeat(80));
  console.log(`  Daily R² (with DOW controls): ${baselineDaily.rSquared.toFixed(4)}`);
  console.log(`  Weekly R² (Pearson²):         ${baselineWeeklyR2.toFixed(4)}`);
  console.log(`  β (signups per view):          ${baselineDaily.beta.toFixed(6)}`);
  console.log(`  β (signups per 1000 views):    ${(baselineDaily.beta * 1000).toFixed(3)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // APPROACH A: UNCONSTRAINED OLS
  // ════════════════════════════════════════════════════════════════════════════

  console.log(`\n${"=".repeat(80)}`);
  console.log("APPROACH A: UNCONSTRAINED OLS — DATA PICKS ALL WEIGHTS");
  console.log("=".repeat(80));

  // Build feature-weighted daily view series
  // For each feature, sum views from videos with that feature on each day
  const featureNames = [
    "dedicated_views",
    "featured_views",
    "listed_views",
    "cta_views",
    "personal_use_views",
    "link_in_desc_views",
    "sponsored_views",
  ];

  const featureSeries: number[][] = featureNames.map(() =>
    new Array(allDates.length).fill(0)
  );

  for (const [videoId, dateMap] of videoDateInc) {
    const meta = videoMeta.get(videoId);
    if (!meta) continue;

    const tier = meta.depthTier as DepthTier | null;
    const isCta = meta.explicitCta === true;
    const isPersonalUse = meta.creatorPersonallyUses === true;
    const hasLink = meta.granolaLinkInDesc === true;
    const isSponsored = meta.sponsoredDisclosure === true;

    for (let di = 0; di < allDates.length; di++) {
      const inc = dateMap.get(allDates[di]) ?? 0;
      if (inc === 0) continue;

      // Tier dummies (incidental = reference category)
      if (tier === "dedicated") featureSeries[0][di] += inc;
      if (tier === "featured") featureSeries[1][di] += inc;
      if (tier === "listed") featureSeries[2][di] += inc;

      // Boolean features (these overlap with tiers — additive modifiers)
      if (isCta) featureSeries[3][di] += inc;
      if (isPersonalUse) featureSeries[4][di] += inc;
      if (hasLink) featureSeries[5][di] += inc;
      if (isSponsored) featureSeries[6][di] += inc;
    }
  }

  // Build full predictor set: 6 DOW dummies + 7 feature series = 13 predictors
  const allPredictors: number[][] = [];
  for (let d = 1; d <= 6; d++) {
    allPredictors.push(dowArr.map((dow) => (dow === d ? 1 : 0)));
  }
  for (const series of featureSeries) {
    allPredictors.push(series);
  }

  const approachA = olsRegression(allPredictors, signupsArr);

  console.log(`\n  R² (daily, with DOW controls): ${approachA.rSquared.toFixed(4)}`);
  console.log(`  Observations: ${allDates.length} days, ${featureNames.length + 6} predictors`);
  console.log(`  Obs/parameter ratio: ${(allDates.length / (featureNames.length + 7)).toFixed(1)}`);

  console.log(`\n  Feature coefficients (signups per view, data-determined):\n`);
  console.log(`  ${"Feature".padEnd(25)} | Coeff (per view) | Per 1000 views | Direction`);
  console.log(`  ${"-".repeat(25)} | ---------------- | -------------- | ---------`);

  const featureCoeffs = approachA.coefficients.slice(6); // skip DOW dummies
  for (let i = 0; i < featureNames.length; i++) {
    const c = featureCoeffs[i];
    const dir = c > 0.0001 ? "↑ positive" : c < -0.0001 ? "↓ negative" : "— neutral";
    console.log(
      `  ${featureNames[i].padEnd(25)} | ${c.toFixed(8).padStart(16)} | ${(c * 1000).toFixed(4).padStart(14)} | ${dir}`
    );
  }

  // Interpret: what's the effective coefficient for each tier+feature combo?
  console.log(`\n  Effective signups per 1000 views by combination:\n`);
  const incidentalBase = 0; // reference category
  const tiers = ["dedicated", "featured", "listed", "incidental"] as const;
  const tierCoeffs = [featureCoeffs[0], featureCoeffs[1], featureCoeffs[2], 0]; // incidental = 0 (reference)

  for (let t = 0; t < tiers.length; t++) {
    const base = tierCoeffs[t] * 1000;
    console.log(`  ${tiers[t].padEnd(12)}: ${base.toFixed(3)} S/kV (base)`);
    console.log(
      `  ${" ".repeat(12)}  + CTA: ${(base + featureCoeffs[3] * 1000).toFixed(3)} S/kV`
    );
    console.log(
      `  ${" ".repeat(12)}  + personal use: ${(base + featureCoeffs[4] * 1000).toFixed(3)} S/kV`
    );
    console.log(
      `  ${" ".repeat(12)}  + link: ${(base + featureCoeffs[5] * 1000).toFixed(3)} S/kV`
    );
  }

  // Weekly R² for Approach A
  const approachADaily = allDates.map((_, di) => {
    let pred = approachA.intercept;
    for (let p = 0; p < allPredictors.length; p++) {
      pred += approachA.coefficients[p] * allPredictors[p][di];
    }
    return pred;
  });

  // Compute Approach A effective views for weekly comparison
  const weeklyAViews = new Map<string, number>();
  for (let di = 0; di < allDates.length; di++) {
    const w = getWeekKey(allDates[di]);
    let ev = 0;
    for (let f = 0; f < featureNames.length; f++) {
      ev += featureCoeffs[f] * featureSeries[f][di];
    }
    weeklyAViews.set(w, (weeklyAViews.get(w) ?? 0) + ev);
  }
  const wAArr = weeks.map((w) => weeklyAViews.get(w) ?? 0);
  const approachAWeeklyR2 = pearson(wAArr, wSigArr) ** 2;

  console.log(`\n  Weekly R² (effective views ↔ signups): ${approachAWeeklyR2.toFixed(4)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // APPROACH B: STRUCTURED GRID SEARCH — MULTIPLICATIVE QUALITY
  // ════════════════════════════════════════════════════════════════════════════

  console.log(`\n${"=".repeat(80)}`);
  console.log("APPROACH B: STRUCTURED GRID SEARCH — MULTIPLICATIVE QUALITY");
  console.log("=".repeat(80));
  console.log(`\n  quality_i = tier_base(i) × (1 + w_cta×CTA + w_personal×PU + w_link×Link - w_sponsored×Spons)`);
  console.log(`  signups_t = α + DOW + β × Σ(views_it × quality_i)`);
  console.log(`\n  All weights found by maximising R² against actual signup data.`);

  // Pre-compute per-video feature flags
  interface VideoFeatures {
    tier: DepthTier | null;
    cta: boolean;
    personalUse: boolean;
    link: boolean;
    sponsored: boolean;
  }

  const videoFeatures = new Map<string, VideoFeatures>();
  for (const [videoId, meta] of videoMeta) {
    if (granolaOwnedIds.has(videoId)) continue;
    videoFeatures.set(videoId, {
      tier: (meta.depthTier as DepthTier) ?? null,
      cta: meta.explicitCta === true,
      personalUse: meta.creatorPersonallyUses === true,
      link: meta.granolaLinkInDesc === true,
      sponsored: meta.sponsoredDisclosure === true,
    });
  }

  // Helper: compute effective views for given weights
  function computeEffectiveViews(
    wFeat: number,
    wList: number,
    wCta: number,
    wPersonal: number,
    wLink: number,
    wSponsored: number
  ): number[] {
    return allDates.map((date) => {
      let ev = 0;
      for (const [videoId, dateMap] of videoDateInc) {
        const inc = dateMap.get(date) ?? 0;
        if (inc === 0) continue;

        const feat = videoFeatures.get(videoId);
        if (!feat) continue;

        // Tier base
        let tierBase: number;
        switch (feat.tier) {
          case "dedicated":
            tierBase = 1.0;
            break;
          case "featured":
            tierBase = wFeat;
            break;
          case "listed":
            tierBase = wList;
            break;
          default:
            tierBase = 0; // incidental, unanalysed = 0
        }
        if (tierBase === 0) continue;

        // Modifier sum
        const modSum =
          wCta * (feat.cta ? 1 : 0) +
          wPersonal * (feat.personalUse ? 1 : 0) +
          wLink * (feat.link ? 1 : 0) -
          wSponsored * (feat.sponsored ? 1 : 0);

        const quality = tierBase * (1 + modSum);
        ev += inc * Math.max(0, quality); // floor at 0
      }
      return ev;
    });
  }

  // Helper: R² for a given effective views series (with DOW controls)
  function evalR2(effectiveViews: number[]): number {
    return olsWithDowControl(effectiveViews, signupsArr, dowArr).rSquared;
  }

  // ── Stage 1: Tier weights only ──────────────────────────────────────────
  console.log(`\n--- Stage 1: Find optimal tier weights (modifiers = 0) ---`);

  let bestS1 = { wFeat: 0, wList: 0, r2: 0 };
  const s1Results: { wFeat: number; wList: number; r2: number }[] = [];

  for (let wFeat = 0; wFeat <= 1.0; wFeat += 0.05) {
    for (let wList = 0; wList <= 0.5; wList += 0.025) {
      const ev = computeEffectiveViews(
        Math.round(wFeat * 100) / 100,
        Math.round(wList * 1000) / 1000,
        0, 0, 0, 0
      );
      const r2 = evalR2(ev);
      s1Results.push({ wFeat: Math.round(wFeat * 100) / 100, wList: Math.round(wList * 1000) / 1000, r2 });
      if (r2 > bestS1.r2) {
        bestS1 = { wFeat: Math.round(wFeat * 100) / 100, wList: Math.round(wList * 1000) / 1000, r2 };
      }
    }
  }

  console.log(`  Tested ${s1Results.length} combinations`);
  console.log(`  Best: w_feat=${bestS1.wFeat.toFixed(2)}, w_list=${bestS1.wList.toFixed(3)} → R²=${bestS1.r2.toFixed(4)}`);

  // Show top 10
  s1Results.sort((a, b) => b.r2 - a.r2);
  console.log(`\n  Top 10 tier weight combinations:`);
  console.log(`  ${"w_feat".padStart(7)} | ${"w_list".padStart(7)} | ${"R²".padStart(8)}`);
  console.log(`  ${"-------"} | ${"-------"} | ${"--------"}`);
  for (const r of s1Results.slice(0, 10)) {
    console.log(`  ${r.wFeat.toFixed(2).padStart(7)} | ${r.wList.toFixed(3).padStart(7)} | ${r.r2.toFixed(4).padStart(8)}`);
  }

  // ── Stage 2: Feature modifiers (with tier weights from Stage 1) ─────────
  console.log(`\n--- Stage 2: Find optimal feature modifiers (tier weights fixed) ---`);

  let bestS2 = { wCta: 0, wPersonal: 0, wLink: 0, wSponsored: 0, r2: 0 };
  let s2Count = 0;

  for (let wCta = 0; wCta <= 1.0; wCta += 0.1) {
    for (let wPersonal = 0; wPersonal <= 1.0; wPersonal += 0.1) {
      for (let wLink = 0; wLink <= 1.0; wLink += 0.1) {
        for (let wSponsored = 0; wSponsored <= 1.0; wSponsored += 0.1) {
          s2Count++;
          const ev = computeEffectiveViews(
            bestS1.wFeat, bestS1.wList,
            Math.round(wCta * 10) / 10,
            Math.round(wPersonal * 10) / 10,
            Math.round(wLink * 10) / 10,
            Math.round(wSponsored * 10) / 10
          );
          const r2 = evalR2(ev);
          if (r2 > bestS2.r2) {
            bestS2 = {
              wCta: Math.round(wCta * 10) / 10,
              wPersonal: Math.round(wPersonal * 10) / 10,
              wLink: Math.round(wLink * 10) / 10,
              wSponsored: Math.round(wSponsored * 10) / 10,
              r2,
            };
          }
        }
      }
    }
  }

  console.log(`  Tested ${s2Count} combinations`);
  console.log(
    `  Best: w_cta=${bestS2.wCta.toFixed(1)}, w_personal=${bestS2.wPersonal.toFixed(1)}, ` +
    `w_link=${bestS2.wLink.toFixed(1)}, w_sponsored=${bestS2.wSponsored.toFixed(1)} → R²=${bestS2.r2.toFixed(4)}`
  );

  // ── Stage 3: Joint refinement ───────────────────────────────────────────
  console.log(`\n--- Stage 3: Joint refinement (fine grid around best) ---`);

  let bestFinal = {
    wFeat: bestS1.wFeat,
    wList: bestS1.wList,
    wCta: bestS2.wCta,
    wPersonal: bestS2.wPersonal,
    wLink: bestS2.wLink,
    wSponsored: bestS2.wSponsored,
    r2: bestS2.r2,
  };

  let s3Count = 0;
  const step3 = 0.02;
  const range3 = 0.1;

  function refineRange(center: number, min: number, max: number): number[] {
    const vals: number[] = [];
    for (
      let v = Math.max(min, center - range3);
      v <= Math.min(max, center + range3);
      v += step3
    ) {
      vals.push(Math.round(v * 100) / 100);
    }
    return vals;
  }

  const featRange = refineRange(bestS1.wFeat, 0, 1.0);
  const listRange = refineRange(bestS1.wList, 0, 0.5);
  const ctaRange = refineRange(bestS2.wCta, 0, 1.0);
  const personalRange = refineRange(bestS2.wPersonal, 0, 1.0);
  const linkRange = refineRange(bestS2.wLink, 0, 1.0);
  const sponsoredRange = refineRange(bestS2.wSponsored, 0, 1.0);

  for (const wF of featRange) {
    for (const wL of listRange) {
      for (const wC of ctaRange) {
        for (const wP of personalRange) {
          for (const wLk of linkRange) {
            for (const wS of sponsoredRange) {
              s3Count++;
              const ev = computeEffectiveViews(wF, wL, wC, wP, wLk, wS);
              const r2 = evalR2(ev);
              if (r2 > bestFinal.r2) {
                bestFinal = {
                  wFeat: wF, wList: wL, wCta: wC,
                  wPersonal: wP, wLink: wLk, wSponsored: wS, r2,
                };
              }
            }
          }
        }
      }
    }
  }

  console.log(`  Tested ${s3Count.toLocaleString()} combinations`);
  console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
  console.log(`  ║  OPTIMAL QUALITY WEIGHTS (data-determined)          ║`);
  console.log(`  ╠══════════════════════════════════════════════════════╣`);
  console.log(`  ║  Tier weights:                                      ║`);
  console.log(`  ║    dedicated  = 1.000 (reference)                   ║`);
  console.log(`  ║    featured   = ${bestFinal.wFeat.toFixed(3).padEnd(37)}║`);
  console.log(`  ║    listed     = ${bestFinal.wList.toFixed(3).padEnd(37)}║`);
  console.log(`  ║    incidental = 0.000 (fixed)                       ║`);
  console.log(`  ║                                                      ║`);
  console.log(`  ║  Feature modifiers:                                  ║`);
  console.log(`  ║    explicitCta          = +${bestFinal.wCta.toFixed(2).padEnd(27)}║`);
  console.log(`  ║    creatorPersonallyUses = +${bestFinal.wPersonal.toFixed(2).padEnd(26)}║`);
  console.log(`  ║    granolaLinkInDesc    = +${bestFinal.wLink.toFixed(2).padEnd(27)}║`);
  console.log(`  ║    sponsoredDisclosure  = -${bestFinal.wSponsored.toFixed(2).padEnd(27)}║`);
  console.log(`  ║                                                      ║`);
  console.log(`  ║  Daily R² (with DOW):  ${bestFinal.r2.toFixed(4).padEnd(30)}║`);
  console.log(`  ╚══════════════════════════════════════════════════════╝`);

  // Final model fit
  const finalEV = computeEffectiveViews(
    bestFinal.wFeat, bestFinal.wList,
    bestFinal.wCta, bestFinal.wPersonal, bestFinal.wLink, bestFinal.wSponsored
  );
  const finalFit = olsWithDowControl(finalEV, signupsArr, dowArr);

  console.log(`\n  β (signups per effective view): ${finalFit.beta.toFixed(6)}`);
  console.log(`  β (signups per 1000 eff. views): ${(finalFit.beta * 1000).toFixed(3)}`);

  // Weekly R² for Approach B
  const weeklyEV = new Map<string, number>();
  for (let di = 0; di < allDates.length; di++) {
    const w = getWeekKey(allDates[di]);
    weeklyEV.set(w, (weeklyEV.get(w) ?? 0) + finalEV[di]);
  }
  const wEVArr = weeks.map((w) => weeklyEV.get(w) ?? 0);
  const approachBWeeklyR2 = pearson(wEVArr, wSigArr) ** 2;

  console.log(`  Weekly R² (eff. views ↔ signups): ${approachBWeeklyR2.toFixed(4)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // SENSITIVITY ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════

  console.log(`\n${"=".repeat(80)}`);
  console.log("SENSITIVITY ANALYSIS — How R² changes as each weight varies");
  console.log("=".repeat(80));

  const params = [
    { name: "w_featured", key: "wFeat" as const, min: 0, max: 1.0, step: 0.05 },
    { name: "w_listed", key: "wList" as const, min: 0, max: 0.5, step: 0.025 },
    { name: "w_cta", key: "wCta" as const, min: 0, max: 1.0, step: 0.05 },
    { name: "w_personal_use", key: "wPersonal" as const, min: 0, max: 1.0, step: 0.05 },
    { name: "w_link_in_desc", key: "wLink" as const, min: 0, max: 1.0, step: 0.05 },
    { name: "w_sponsored", key: "wSponsored" as const, min: 0, max: 1.0, step: 0.05 },
  ];

  for (const param of params) {
    console.log(`\n  --- ${param.name} (optimal: ${bestFinal[param.key].toFixed(2)}) ---`);

    const points: { val: number; r2: number }[] = [];
    for (let v = param.min; v <= param.max + 0.001; v += param.step) {
      const val = Math.round(v * 100) / 100;
      const weights = { ...bestFinal };
      (weights as any)[param.key] = val;
      const ev = computeEffectiveViews(
        weights.wFeat, weights.wList, weights.wCta,
        weights.wPersonal, weights.wLink, weights.wSponsored
      );
      const r2 = evalR2(ev);
      points.push({ val, r2 });
    }

    // Display as mini chart
    const maxR2 = Math.max(...points.map((p) => p.r2));
    const minR2 = Math.min(...points.map((p) => p.r2));
    const chartWidth = 30;

    for (const p of points) {
      const barLen =
        maxR2 === minR2
          ? chartWidth
          : Math.round(((p.r2 - minR2) / (maxR2 - minR2)) * chartWidth);
      const marker = Math.abs(p.val - bestFinal[param.key]) < 0.001 ? "◆" : "█";
      const bar = marker.repeat(Math.max(1, barLen));
      console.log(
        `  ${p.val.toFixed(2).padStart(5)} | ${bar.padEnd(chartWidth + 1)} ${p.r2.toFixed(4)}`
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMPARISON TABLE
  // ════════════════════════════════════════════════════════════════════════════

  console.log(`\n${"=".repeat(80)}`);
  console.log("R² COMPARISON");
  console.log("=".repeat(80));
  console.log(`\n  ${"Approach".padEnd(45)} | Daily R² | Weekly R²`);
  console.log(`  ${"-".repeat(45)} | -------- | ---------`);
  console.log(`  ${"Raw views (baseline, no quality)".padEnd(45)} | ${baselineDaily.rSquared.toFixed(4).padStart(8)} | ${baselineWeeklyR2.toFixed(4).padStart(9)}`);
  console.log(`  ${"Approach A: Unconstrained OLS (additive)".padEnd(45)} | ${approachA.rSquared.toFixed(4).padStart(8)} | ${approachAWeeklyR2.toFixed(4).padStart(9)}`);
  console.log(`  ${"Approach B: Grid search (multiplicative)".padEnd(45)} | ${bestFinal.r2.toFixed(4).padStart(8)} | ${approachBWeeklyR2.toFixed(4).padStart(9)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // PER-VIDEO QUALITY SCORECARD
  // ════════════════════════════════════════════════════════════════════════════

  console.log(`\n${"=".repeat(80)}`);
  console.log("PER-VIDEO QUALITY SCORECARD (Approach B weights)");
  console.log("=".repeat(80));

  interface VideoScore {
    videoId: string;
    title: string;
    channel: string;
    tier: string;
    quality: number;
    totalViews: number;
    effectiveViews: number;
    cta: boolean;
    personalUse: boolean;
    link: boolean;
    sponsored: boolean;
  }

  const scores: VideoScore[] = [];
  for (const [videoId, feat] of videoFeatures) {
    const meta = videoMeta.get(videoId);
    if (!meta) continue;

    let tierBase: number;
    switch (feat.tier) {
      case "dedicated":
        tierBase = 1.0;
        break;
      case "featured":
        tierBase = bestFinal.wFeat;
        break;
      case "listed":
        tierBase = bestFinal.wList;
        break;
      default:
        tierBase = 0;
    }

    const modSum =
      bestFinal.wCta * (feat.cta ? 1 : 0) +
      bestFinal.wPersonal * (feat.personalUse ? 1 : 0) +
      bestFinal.wLink * (feat.link ? 1 : 0) -
      bestFinal.wSponsored * (feat.sponsored ? 1 : 0);

    const quality = Math.max(0, tierBase * (1 + modSum));
    const totalViews = videoTotalViews.get(videoId) ?? 0;

    scores.push({
      videoId,
      title: meta.title,
      channel: meta.channelTitle,
      tier: meta.depthTier ?? "unanalysed",
      quality,
      totalViews: Math.round(totalViews),
      effectiveViews: Math.round(totalViews * quality),
      cta: feat.cta,
      personalUse: feat.personalUse,
      link: feat.link,
      sponsored: feat.sponsored,
    });
  }

  // Sort by effective views (quality × volume)
  scores.sort((a, b) => b.effectiveViews - a.effectiveViews);

  console.log(`\n  Top 30 videos by effective views (quality × volume):\n`);
  console.log(
    `  ${"#".padStart(3)} | ${"Quality".padStart(7)} | ${"Views".padStart(8)} | ${"Eff.Views".padStart(9)} | ${"Tier".padEnd(12)} | Flags | Title`
  );
  console.log(
    `  ${"---"} | ${"-------"} | ${"--------"} | ${"----------"} | ${"------------"} | ----- | -----`
  );

  for (let i = 0; i < Math.min(scores.length, 30); i++) {
    const s = scores[i];
    const flags = [
      s.cta ? "CTA" : "",
      s.personalUse ? "PU" : "",
      s.link ? "LNK" : "",
      s.sponsored ? "SP" : "",
    ]
      .filter(Boolean)
      .join(",");
    console.log(
      `  ${(i + 1).toString().padStart(3)} | ${s.quality.toFixed(3).padStart(7)} | ${s.totalViews.toLocaleString().padStart(8)} | ${s.effectiveViews.toLocaleString().padStart(9)} | ${s.tier.padEnd(12)} | ${flags.padEnd(5)} | ${s.title.slice(0, 50)}`
    );
  }

  // ── Tier-level summary ──────────────────────────────────────────────────
  console.log(`\n  Quality by tier:\n`);
  const tierSummary = new Map<string, { count: number; totalViews: number; totalEV: number; avgQuality: number }>();
  for (const s of scores) {
    const existing = tierSummary.get(s.tier) ?? { count: 0, totalViews: 0, totalEV: 0, avgQuality: 0 };
    existing.count++;
    existing.totalViews += s.totalViews;
    existing.totalEV += s.effectiveViews;
    existing.avgQuality += s.quality;
    tierSummary.set(s.tier, existing);
  }

  console.log(`  ${"Tier".padEnd(12)} | ${"Videos".padStart(6)} | ${"Avg Quality".padStart(11)} | ${"Total Views".padStart(11)} | ${"Eff. Views".padStart(10)} | View Value`);
  console.log(`  ${"-".repeat(12)} | ${"------"} | ${"-----------"} | ${"-----------"} | ${"----------"} | ----------`);
  for (const tier of ["dedicated", "featured", "listed", "incidental", "unanalysed"]) {
    const ts = tierSummary.get(tier);
    if (!ts) continue;
    const avgQ = ts.avgQuality / ts.count;
    const pct = ts.totalViews > 0 ? ((ts.totalEV / ts.totalViews) * 100).toFixed(1) + "%" : "0%";
    console.log(
      `  ${tier.padEnd(12)} | ${ts.count.toString().padStart(6)} | ${avgQ.toFixed(3).padStart(11)} | ${ts.totalViews.toLocaleString().padStart(11)} | ${ts.totalEV.toLocaleString().padStart(10)} | ${pct}`
    );
  }

  // ── Relative value statements ─────────────────────────────────────────
  console.log(`\n  Relative value of views:\n`);

  const dedBase = 1.0;
  const dedCta = 1.0 * (1 + bestFinal.wCta);
  const dedFull = 1.0 * (1 + bestFinal.wCta + bestFinal.wPersonal + bestFinal.wLink);
  const featBase = bestFinal.wFeat;
  const listBase = bestFinal.wList;

  if (listBase > 0) {
    console.log(`  • A dedicated video view is worth ${(dedBase / listBase).toFixed(1)}× a listed video view`);
    console.log(`  • A dedicated video with CTA is worth ${(dedCta / listBase).toFixed(1)}× a listed video view`);
    console.log(`  • A dedicated video with CTA + personal use + link is worth ${(dedFull / listBase).toFixed(1)}× a listed video view`);
  }
  if (featBase > 0 && listBase > 0) {
    console.log(`  • A featured video view is worth ${(featBase / listBase).toFixed(1)}× a listed video view`);
  }
  console.log(`  • An incidental video view is worth 0× (excluded from model)`);

  // ── Weekly effective views vs signups ──────────────────────────────────
  console.log(`\n  Weekly effective views vs signups:\n`);
  console.log(`  ${"Week".padEnd(10)} | ${"Raw Views".padStart(10)} | ${"Eff. Views".padStart(10)} | ${"Signups".padStart(8)} | ${"Predicted".padStart(9)}`);
  console.log(`  ${"-".repeat(10)} | ${"-".repeat(10)} | ${"-".repeat(10)} | ${"-".repeat(8)} | ${"-".repeat(9)}`);

  for (const w of weeks) {
    const rawV = weeklyRaw.get(w) ?? 0;
    const evV = weeklyEV.get(w) ?? 0;
    const sig = weeklySignups.get(w) ?? 0;
    // Simple weekly prediction: β × effective_views (no DOW at weekly level)
    const pred = finalFit.beta * evV;
    console.log(
      `  ${w.padEnd(10)} | ${Math.round(rawV).toLocaleString().padStart(10)} | ${Math.round(evV).toLocaleString().padStart(10)} | ${sig.toLocaleString().padStart(8)} | ${Math.round(pred).toLocaleString().padStart(9)}`
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════════════════════

  console.log(`\n${"=".repeat(80)}`);
  console.log("FINAL SUMMARY");
  console.log("=".repeat(80));

  console.log(`\n  The data-optimal quality model:`);
  console.log(`    quality = tier_weight × (1 + feature_bonuses)`);
  console.log(`\n  Tier weights (data-determined):`);
  console.log(`    dedicated  = 1.000`);
  console.log(`    featured   = ${bestFinal.wFeat.toFixed(3)}`);
  console.log(`    listed     = ${bestFinal.wList.toFixed(3)}`);
  console.log(`    incidental = 0.000`);
  console.log(`\n  Feature modifiers (data-determined):`);
  console.log(`    CTA              = +${bestFinal.wCta.toFixed(2)}`);
  console.log(`    Personal use     = +${bestFinal.wPersonal.toFixed(2)}`);
  console.log(`    Link in desc     = +${bestFinal.wLink.toFixed(2)}`);
  console.log(`    Sponsored        = -${bestFinal.wSponsored.toFixed(2)}`);
  console.log(`\n  Model performance:`);
  console.log(`    Raw views R²:          daily=${baselineDaily.rSquared.toFixed(4)}  weekly=${baselineWeeklyR2.toFixed(4)}`);
  console.log(`    Quality-weighted R²:   daily=${bestFinal.r2.toFixed(4)}  weekly=${approachBWeeklyR2.toFixed(4)}`);
  console.log(`    Improvement:           daily=+${((bestFinal.r2 - baselineDaily.rSquared) * 100).toFixed(1)}pp  weekly=+${((approachBWeeklyR2 - baselineWeeklyR2) * 100).toFixed(1)}pp`);
  console.log(`\n  Conversion rate: ${(finalFit.beta * 1000).toFixed(3)} signups per 1,000 effective views`);

  await prisma.$disconnect();
}

main().catch(console.error);
