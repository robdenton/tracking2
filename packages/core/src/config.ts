import type { UpliftConfig } from "./types";

/** Default config; overridden by env vars at runtime */
export function getConfig(): UpliftConfig {
  return {
    baselineWindowDays: intEnv("BASELINE_WINDOW_DAYS", 14),
    postWindowDays: intEnv("POST_WINDOW_DAYS", 7),
    decontamination: {
      enabled: boolEnv("BASELINE_DECONTAMINATION_ENABLED", true),
      maxIterations: intEnv("DECONTAMINATION_MAX_ITERATIONS", 2),
      convergenceThreshold: intEnv("DECONTAMINATION_CONVERGENCE_THRESHOLD", 1),
    },
    postWindowAttribution: {
      enabled: boolEnv("POST_WINDOW_ATTRIBUTION_ENABLED", true),
      channels: ["newsletter"],
    },
  };
}

function intEnv(key: string, fallback: number): number {
  const val = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (val === undefined || val === "") return fallback;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const val = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (val === undefined || val === "") return fallback;
  return val.toLowerCase() === "true" || val === "1";
}
