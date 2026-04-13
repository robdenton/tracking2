"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();
  const [activePreset, setActivePreset] = useState<string | null>(() => {
    if (!startDate && !endDate) return null;
    const today = new Date();
    const end = formatDate(today);
    if (endDate !== end) return null;
    for (const p of ["30d", "90d", "6m", "ytd", "12m"]) {
      const range = getPresetRange(p);
      if (range.start === startDate && range.end === endDate) return p;
    }
    return null;
  });

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      setActivePreset(null);
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const applyPreset = useCallback(
    (preset: string) => {
      const { start, end } = getPresetRange(preset);
      const params = new URLSearchParams(searchParams.toString());
      params.set("startDate", start);
      params.set("endDate", end);
      setActivePreset(preset);
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const clearDates = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    setActivePreset(null);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }, [router, searchParams]);

  const presets = [
    { label: "30d", value: "30d" },
    { label: "90d", value: "90d" },
    { label: "6m", value: "6m" },
    { label: "YTD", value: "ytd" },
    { label: "12m", value: "12m" },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${isPending ? "opacity-60" : ""} transition-opacity`}>
      {/* Preset buttons */}
      <div className="flex rounded-full border border-border text-[12px] overflow-hidden">
        {presets.map((p) => {
          const isActive = activePreset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              disabled={isPending}
              className={`px-3 py-1.5 font-medium transition-colors ${
                isActive
                  ? "bg-accent-light text-accent-strong"
                  : "text-text-muted hover:bg-surface-sunken hover:text-text-secondary"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          defaultValue={startDate}
          onChange={(e) => update("startDate", e.target.value)}
          className="text-[12px] border border-border rounded-lg px-2.5 py-1.5 bg-surface font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
        <span className="text-[11px] text-text-muted">to</span>
        <input
          type="date"
          defaultValue={endDate}
          onChange={(e) => update("endDate", e.target.value)}
          className="text-[12px] border border-border rounded-lg px-2.5 py-1.5 bg-surface font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {(startDate || endDate) && (
        <button
          onClick={clearDates}
          className="text-[12px] text-text-muted hover:text-accent-strong font-medium transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
