"use client";

import { useState } from "react";
import type { PipelineStatus } from "@/lib/data";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const remainderMins = diffMins % 60;

  if (diffHours > 0) return `in ${diffHours}h ${remainderMins}m`;
  return `in ${diffMins}m`;
}

function formatUTCTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} UTC`;
}

function formatResultSummary(taskName: string, resultJson: string | null): string {
  if (!resultJson) return "";
  try {
    const r = JSON.parse(resultJson);
    switch (taskName) {
      case "sync-sheets":
        return `${r.activitiesCount ?? 0} activities · ${r.metricsCount ?? 0} metrics`;
      case "track-youtube":
      case "track-imported":
      case "track-linkedin":
        return `${r.tracked ?? 0} tracked · ${r.skipped ?? 0} skipped · ${r.errors ?? 0} errors`;
      case "youtube-search":
        return `${r.resultsFound ?? 0} found · ${r.saved ?? 0} new · ${r.skipped ?? 0} known`;
      default:
        return "";
    }
  } catch {
    return "";
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        ✓ Success
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        ✗ Error
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        ⟳ Running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      {status}
    </span>
  );
}

interface PipelineCardProps {
  pipeline: PipelineStatus;
}

export function PipelineCard({ pipeline }: PipelineCardProps) {
  const { config, lastRun, nextRun } = pipeline;
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    status: string;
    summary: string;
    errorMessage?: string;
  } | null>(null);

  async function handleTrigger() {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/pipelines/trigger/${config.taskName}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        const summary = formatResultSummary(config.taskName, JSON.stringify(data.result));
        setRunResult({ status: "success", summary });
      } else {
        setRunResult({ status: "error", summary: "", errorMessage: data.error });
      }
    } catch (err) {
      setRunResult({
        status: "error",
        summary: "",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  }

  const displayLastRun = runResult
    ? { status: runResult.status, summary: runResult.summary, errorMessage: runResult.errorMessage }
    : lastRun
    ? {
        status: lastRun.status,
        summary: formatResultSummary(config.taskName, lastRun.resultJson),
        errorMessage: lastRun.errorMessage ?? undefined,
        time: lastRun.completedAt ?? lastRun.startedAt,
      }
    : null;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm">{config.label}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={isRunning}
          className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition-colors ${
            isRunning
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300"
          }`}
        >
          {isRunning ? "Running…" : "Run now"}
        </button>
      </div>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Last run */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Last run</div>
        {displayLastRun ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={displayLastRun.status} />
              {"time" in displayLastRun && displayLastRun.time && (
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(displayLastRun.time)}
                </span>
              )}
              {runResult && (
                <span className="text-xs text-gray-500">just now</span>
              )}
            </div>
            {displayLastRun.summary && (
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                {displayLastRun.summary}
              </p>
            )}
            {displayLastRun.errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {displayLastRun.errorMessage}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No runs yet</p>
        )}
      </div>

      {/* Next scheduled */}
      <div>
        <div className="text-xs text-gray-500 mb-1">Next scheduled</div>
        <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
          {formatUTCTime(config.scheduleHour, config.scheduleMinute)}
          <span className="text-gray-400 ml-2">· {formatTimeUntil(nextRun)}</span>
        </p>
      </div>
    </div>
  );
}
