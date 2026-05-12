"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Confidence = "high" | "all";

export function ConfidenceToggle({ current }: { current: Confidence }) {
  const router = useRouter();
  const params = useSearchParams();

  function setConfidence(v: Confidence) {
    const sp = new URLSearchParams(params.toString());
    sp.set("confidence", v);
    router.push(`?${sp.toString()}`);
  }

  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      <button
        onClick={() => setConfidence("high")}
        className={
          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
          (current === "high"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:text-text-primary")
        }
        title="Episodes matched by strong signals only (e.g. granola.ai, Chris Pedregal, granola+notetaker)"
      >
        High confidence
      </button>
      <button
        onClick={() => setConfidence("all")}
        className={
          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
          (current === "all"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:text-text-primary")
        }
        title="Include broader matches like 'granola for' and 'i use granola' that may have noise"
      >
        Include broader matches
      </button>
    </div>
  );
}
