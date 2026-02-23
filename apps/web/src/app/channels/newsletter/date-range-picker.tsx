"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const end = formatDate(today);

  switch (preset) {
    case "30d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start: formatDate(start), end };
    }
    case "90d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return { start: formatDate(start), end };
    }
    case "6m": {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      return { start: formatDate(start), end };
    }
    case "ytd": {
      return { start: `${today.getFullYear()}-01-01`, end };
    }
    case "12m": {
      const start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      return { start: formatDate(start), end };
    }
    default:
      return { start: "", end: "" };
  }
}

export function DateRangePicker({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const applyPreset = useCallback(
    (preset: string) => {
      const { start, end } = getPresetRange(preset);
      const params = new URLSearchParams(searchParams.toString());
      params.set("startDate", start);
      params.set("endDate", end);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearDates = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    router.push(`?${params.toString()}`);
  }, [router, searchParams]);

  const presets = [
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "6m", value: "6m" },
    { label: "YTD", value: "ytd" },
    { label: "12m", value: "12m" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <span className="text-xs text-gray-500 font-medium">Date range</span>

      {/* Preset buttons */}
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => applyPreset(p.value)}
            className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            {p.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-300 dark:text-gray-600">|</span>

      {/* Custom date inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          defaultValue={startDate}
          onChange={(e) => update("startDate", e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 font-mono"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          defaultValue={endDate}
          onChange={(e) => update("endDate", e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 font-mono"
        />
      </div>

      {(startDate || endDate) && (
        <button
          onClick={clearDates}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
        >
          All time
        </button>
      )}
    </div>
  );
}
