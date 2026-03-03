/**
 * Transcript fetching and LLM content analysis for YouTube videos.
 *
 * Transcript source: supadata.ai YouTube Transcript API
 *   - Handles PO tokens automatically (unlike the direct YouTube timedtext API)
 *   - Requires SUPADATA_API_KEY env var
 *   - Free tier: 100 credits/month; Pro: $9/month for 3,000 credits
 *   - Docs: https://supadata.ai
 *
 * LLM analysis: Anthropic claude-haiku-4-5
 *   - Structured extraction of depth tier, content type, sentiment, etc.
 *   - Requires ANTHROPIC_API_KEY env var
 *
 * Exports:
 *   fetchTranscript(videoId)   → raw transcript text (or null)
 *   analyseTranscript(...)     → structured ContentAnalysis (or null)
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentAnalysis {
  depthTier: "dedicated" | "featured" | "listed" | "incidental";
  /** 0.0–1.0 composite depth score */
  depthScore: number;
  contentType:
    | "tutorial"
    | "review"
    | "comparison"
    | "listicle"
    | "interview"
    | "podcast"
    | "other";
  /** Creator expresses they personally use Granola */
  creatorPersonallyUses: boolean;
  /** Explicit call to download/try Granola */
  explicitCta: boolean;
  /** Estimated minutes of content focused on Granola */
  granolaMinutes: number;
  /** 0–100: where in the video Granola is first mentioned */
  firstMentionPct: number;
  /** Approximate number of times "Granola" is mentioned */
  mentionCount: number;
  sentiment: "positive" | "neutral" | "mixed";
  /** Competitor app names found in the video */
  competitorsMentioned: string[];
  targetAudience:
    | "founders"
    | "knowledge_workers"
    | "general_tech"
    | "students"
    | "other";
}

interface SupadataSegment {
  text: string;
  offset: number;   // ms from start
  duration: number; // ms
  lang: string;
}

interface SupadataResponse {
  lang: string;
  content: SupadataSegment[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Truncate transcripts beyond ~20k input tokens (~60 min of speech). */
const MAX_TRANSCRIPT_CHARS = 80_000;

// ---------------------------------------------------------------------------
// Transcript fetching — supadata.ai
// ---------------------------------------------------------------------------

/**
 * Fetch the transcript for a YouTube video via the supadata.ai API.
 * Returns the full joined text (up to MAX_TRANSCRIPT_CHARS), or null if
 * the video has no captions / the API returns an error.
 */
export async function fetchTranscript(videoId: string): Promise<string | null> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error("SUPADATA_API_KEY environment variable is not set");
  }

  try {
    const url = `https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(url, { headers: { "x-api-key": apiKey } });

    if (!res.ok) {
      // These statuses mean "no transcript available" — not a fatal error.
      // 400 / 404 / 422 = unknown video / no captions
      // 403 = age-restricted or members-only video (can't scrape)
      if (
        res.status === 400 ||
        res.status === 403 ||
        res.status === 404 ||
        res.status === 422
      ) {
        return null;
      }
      throw new Error(`supadata HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as SupadataResponse;

    if (!data.content || data.content.length === 0) return null;

    const text = data.content
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 0 ? text.slice(0, MAX_TRANSCRIPT_CHARS) : null;
  } catch (err) {
    // Network / parse errors — let caller decide
    throw err;
  }
}

// ---------------------------------------------------------------------------
// LLM analysis — Claude Haiku
// ---------------------------------------------------------------------------

const ANALYSIS_PROMPT = (
  title: string,
  channelTitle: string,
  durationMinutes: number | string,
  transcript: string,
  truncated: boolean,
) => `You are analysing a YouTube video transcript to understand how much it features Granola — an AI meeting notes app that automatically records, transcribes, and summarises meetings.

Video: "${title}" by ${channelTitle}
Duration: ${durationMinutes} minutes${truncated ? "\n(Transcript truncated at ~60 min)" : ""}

Transcript:
${transcript}

Return a JSON object with EXACTLY these fields:

{
  "depthTier": "dedicated" | "featured" | "listed" | "incidental",
  "depthScore": <float 0.00–1.00>,
  "contentType": "tutorial" | "review" | "comparison" | "listicle" | "interview" | "podcast" | "other",
  "creatorPersonallyUses": <true|false>,
  "explicitCta": <true|false — explicit call to download or try Granola>,
  "granolaMinutes": <float — estimated minutes of content focused on Granola>,
  "firstMentionPct": <integer 0–100 — percentage into the video when Granola first appears>,
  "mentionCount": <integer — approximate number of times "Granola" is mentioned>,
  "sentiment": "positive" | "neutral" | "mixed",
  "competitorsMentioned": [<array of competitor app names, e.g. "Otter.ai", "Fireflies", "Notion">],
  "targetAudience": "founders" | "knowledge_workers" | "general_tech" | "students" | "other"
}

Depth tier definitions:
- dedicated  : Entire video is primarily about Granola (>60% of content time)
- featured   : Granola is a main topic with substantial coverage (20–60%)
- listed     : Granola included in a list/roundup with meaningful description (5–20%)
- incidental : Brief passing mention only (<5% or <2 total minutes)

Depth score ranges (within each tier):
- dedicated  : 0.75–1.00
- featured   : 0.30–0.74
- listed     : 0.05–0.29
- incidental : 0.00–0.04

Return ONLY valid JSON. No markdown code fences, no explanation.`;

/** ms to wait before each retry attempt (doubles each time) */
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

/**
 * Run Claude Haiku structured extraction on a video transcript.
 * Retries up to 3 times on transient errors (Cloudflare 403, rate limits, etc.).
 * Returns null if the LLM call ultimately fails or returns unparseable JSON.
 */
export async function analyseTranscript(
  videoId: string,
  title: string,
  channelTitle: string,
  durationSeconds: number | null,
  transcript: string,
): Promise<ContentAnalysis | null> {
  const anthropic = new Anthropic();
  const durationMinutes = durationSeconds
    ? Math.round(durationSeconds / 60)
    : "unknown";
  const truncated = transcript.length >= MAX_TRANSCRIPT_CHARS;

  const prompt = ANALYSIS_PROMPT(
    title,
    channelTitle,
    durationMinutes,
    transcript,
    truncated,
  );

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const raw =
        response.content[0].type === "text" ? response.content[0].text.trim() : "";

      // Strip accidental markdown fences
      const clean = raw
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

      const parsed = JSON.parse(clean) as ContentAnalysis;

      // Clamp / sanitise numeric fields
      parsed.depthScore = Math.max(0, Math.min(1, Number(parsed.depthScore)));
      parsed.firstMentionPct = Math.max(
        0,
        Math.min(100, Math.round(Number(parsed.firstMentionPct))),
      );
      parsed.granolaMinutes = Math.max(0, Number(parsed.granolaMinutes));
      parsed.mentionCount = Math.max(0, Math.round(Number(parsed.mentionCount)));

      if (!Array.isArray(parsed.competitorsMentioned)) {
        parsed.competitorsMentioned = [];
      }

      return parsed;
    } catch (err) {
      const isTransient =
        err instanceof Error &&
        (err.message.includes("403") ||
          err.message.includes("529") ||
          err.message.includes("overloaded") ||
          err.message.includes("rate limit") ||
          err.message.includes("timeout"));

      if (isTransient && attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        console.warn(
          `  [analyseTranscript] ${videoId} — transient error (attempt ${attempt + 1}), retrying in ${delay / 1000}s: ${err}`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error(
        `  [analyseTranscript] ${videoId} — LLM error (attempt ${attempt + 1}): ${err}`,
      );
      return null;
    }
  }

  return null;
}
