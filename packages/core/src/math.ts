/**
 * Pure deterministic math functions for uplift calculations.
 * No LLM arithmetic — all calculations are done in code.
 */

/** Compute arithmetic mean of an array of numbers. Returns 0 for empty arrays. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/** Compute population standard deviation. Returns 0 for empty/single-element arrays. */
export function stddev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compute incremental uplift.
 * incremental = max(0, observed - expected)
 */
export function computeIncremental(
  observedTotal: number,
  expectedTotal: number,
): number {
  return Math.max(0, observedTotal - expectedTotal);
}

/**
 * Compute expected total signups based on baseline average and post window size.
 * expected = baseline_avg * post_window_days
 */
export function computeExpectedTotal(
  baselineAvg: number,
  postWindowDays: number,
): number {
  return baselineAvg * postWindowDays;
}

/**
 * Confidence heuristic:
 * - HIGH if incremental > 2 * sigma * sqrt(W)
 * - MED if incremental > 1 * sigma * sqrt(W)
 * - LOW otherwise
 *
 * Returns { confidence, explanation }
 */
export function computeConfidence(
  incremental: number,
  sigma: number,
  postWindowDays: number,
  baselineDays: number,
): { confidence: "HIGH" | "MED" | "LOW"; explanation: string } {
  if (baselineDays === 0) {
    return {
      confidence: "LOW",
      explanation: "No baseline data available — cannot assess confidence.",
    };
  }

  if (sigma === 0) {
    return {
      confidence: "LOW",
      explanation:
        "Baseline standard deviation is 0 (constant signups) — confidence heuristic not applicable.",
    };
  }

  const sqrtW = Math.sqrt(postWindowDays);
  const highThreshold = 2 * sigma * sqrtW;
  const medThreshold = 1 * sigma * sqrtW;

  if (incremental > highThreshold) {
    return {
      confidence: "HIGH",
      explanation: `Incremental (${incremental.toFixed(1)}) > 2σ√W (${highThreshold.toFixed(1)})`,
    };
  }

  if (incremental > medThreshold) {
    return {
      confidence: "MED",
      explanation: `Incremental (${incremental.toFixed(1)}) > 1σ√W (${medThreshold.toFixed(1)}) but ≤ 2σ√W (${highThreshold.toFixed(1)})`,
    };
  }

  return {
    confidence: "LOW",
    explanation: `Incremental (${incremental.toFixed(1)}) ≤ 1σ√W (${medThreshold.toFixed(1)})`,
  };
}
