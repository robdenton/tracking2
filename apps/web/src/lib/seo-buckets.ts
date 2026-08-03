import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Review buckets, read from the file the review runner emits.
//
// The bucketing rules live in review/lib/risk.mjs and are NOT duplicated here.
// That module is plain ESM run by node and sits outside the Next app, so rather
// than importing across that boundary (or re-implementing the rules in
// TypeScript, where the two copies would drift), the runner writes its verdict
// to public/review/buckets.json and this reads it back.
//
// Consequence worth knowing: buckets only change when the review runner runs.
// A missing entry means the runner has not seen that slug yet.

export interface BucketInfo {
  bucket: 1 | 2 | 3;
  /** True when the article has not been reviewed, so the bucket is a prediction. */
  provisional: boolean;
  contentLabel: string;
  /** "Agency" or "Granola in-house". */
  who: string;
  /** "Review & decide" | "Review & recommend" | "Do not review". */
  short: string;
  detail: string;
}

const BUCKETS_PATH = join(process.cwd(), "public", "review", "buckets.json");

export async function getBuckets(): Promise<Record<string, BucketInfo>> {
  try {
    const raw = await readFile(BUCKETS_PATH, "utf8");
    const parsed = JSON.parse(raw) as { buckets?: Record<string, BucketInfo> };
    return parsed.buckets ?? {};
  } catch {
    // Absent or unparseable: the page still renders, just without labels.
    // Failing the whole article list over a missing label file would be worse.
    return {};
  }
}
