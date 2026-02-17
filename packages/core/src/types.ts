/** An activity row from the activities CSV / DB */
export interface Activity {
  id: string;
  activityType: string;
  channel: string;
  partnerName: string;
  date: string; // YYYY-MM-DD
  status: string; // live, booked, canceled
  costUsd: number | null;
  deterministicClicks: number | null;
  actualClicks: number | null;
  deterministicTrackedSignups: number | null;
  notes: string | null;
  metadata: Record<string, number> | null; // channel-specific bet metrics
  contentUrl: string | null; // URL to the actual content (e.g. YouTube video)
  channelUrl: string | null; // URL to the partner's channel
}

/** A daily metrics row from the daily_metrics CSV / DB */
export interface DailyMetric {
  date: string; // YYYY-MM-DD
  channel: string;
  signups: number;
  activations: number;
}

export type Confidence = "HIGH" | "MED" | "LOW";

/** Per-day data point used in detail view */
export interface DayDataPoint {
  date: string;
  signups: number;
  isBaseline: boolean;
  isPostWindow: boolean;
  baselineAdjustment?: {
    contamination: number;
    sources: string[];
  };
}

/** The computed uplift report for a single activity */
export interface ActivityReport {
  activity: Activity;

  // Baseline
  baselineWindowStart: string; // t - B
  baselineWindowEnd: string; // t - 1
  baselineAvg: number;
  baselineStdDev: number;
  baselineDays: number; // how many days actually had data

  // Post window (signups)
  postWindowStart: string; // t
  postWindowEnd: string; // t + W - 1
  observedTotal: number;
  expectedTotal: number;
  incremental: number;

  // Post window (activations)
  observedActivations: number;
  expectedActivations: number;
  incrementalActivations: number;

  // Floor
  floorSignups: number;

  // Confidence
  confidence: Confidence;
  confidenceExplanation: string;

  // Daily data for detail view
  dailyData: DayDataPoint[];

  // Baseline decontamination
  baselineDecontamination?: {
    enabled: boolean;
    iterations: number;
    adjustments: BaselineAdjustment[];
    totalAdjustment: number;
    adjustedDates: number;
    rawBaselineAvg: number; // Before decontamination
    cleanedBaselineAvg: number; // After decontamination
  };

  // Post-window proportional attribution
  postWindowAttribution?: {
    enabled: boolean;
    rawIncremental: number; // Original incremental before attribution
    attributedIncremental: number; // Final incremental after attribution
    dailyShares: DailyAttributionShare[];
    clicksUsed: number | null; // Which clicks value was used
    clicksSource: "actual" | "deterministic" | "estimated" | null;
  };
}

/** Decontamination configuration */
export interface DecontaminationConfig {
  enabled: boolean;
  maxIterations: number;
  convergenceThreshold: number;
}

/** Baseline adjustment details */
export interface BaselineAdjustment {
  date: string;
  rawSignups: number;
  contamination: number;
  cleanedSignups: number;
  contaminatingSources: string[]; // Activity IDs
}

/** Decontaminated baseline result */
export interface DecontaminatedBaseline {
  cleanedSignups: number[];
  adjustments: BaselineAdjustment[];
  totalAdjustment: number;
  adjustedDates: number;
}

/** Daily attribution share details */
export interface DailyAttributionShare {
  date: string;
  pooledIncremental: number; // Total incremental for this date (from metrics)
  myClicks: number; // This activity's clicks
  totalClicks: number; // Sum of all overlapping activities' clicks
  share: number; // myClicks / totalClicks
  attributed: number; // pooledIncremental × share
  overlappingActivities: string[]; // Activity IDs sharing this date
}

/** Post-window attribution configuration */
export interface PostWindowAttributionConfig {
  enabled: boolean;
  channels: string[]; // Which channels to apply attribution to (e.g., ["newsletter"])
}

/** Config for the uplift model */
export interface UpliftConfig {
  baselineWindowDays: number;
  postWindowDays: number;
  decontamination?: DecontaminationConfig;
  postWindowAttribution?: PostWindowAttributionConfig;
}
