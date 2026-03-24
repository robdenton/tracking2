export type {
  Activity,
  ActivityReport,
  BaselineAdjustment,
  Confidence,
  DailyMetric,
  DayDataPoint,
  DecontaminatedBaseline,
  DecontaminationConfig,
  DailyAttributionShare,
  FixedBaselineConfig,
  PostWindowAttributionConfig,
  UpliftConfig,
} from "./types";

export {
  mean,
  median,
  stddev,
  computeExpectedTotal,
  computeIncremental,
  computeConfidence,
} from "./math";

export { parseDate, formatDate, addDays, dateRange } from "./dates";

export {
  computeActivityReport,
  computeActivityReportWithCleanedBaseline,
  computeAllReports,
} from "./uplift";

export { decontaminateBaselines } from "./baseline-decontamination";

export {
  applyProportionalAttribution,
  getClicksForAttribution,
  getAttributionWeight,
} from "./post-window-attribution";

export { getConfig } from "./config";

export { extractVideoId, fetchViewCountAPI } from "./youtube-utils";
