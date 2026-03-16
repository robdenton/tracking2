"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Preset {
  label: string;
  from: string;
  to: string;
}

function getPresets(): Preset[] {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth(); // 0-indexed

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);

  // Year to Date
  const ytdStart = new Date(yyyy, 0, 1);

  // This Month
  const thisMonthStart = new Date(yyyy, mm, 1);
  const thisMonthEnd = new Date(yyyy, mm + 1, 0);

  // Last Month
  const lastMonthStart = new Date(yyyy, mm - 1, 1);
  const lastMonthEnd = new Date(yyyy, mm, 0);

  // This Quarter
  const qStart = Math.floor(mm / 3) * 3;
  const thisQStart = new Date(yyyy, qStart, 1);
  const thisQEnd = new Date(yyyy, qStart + 3, 0);

  // Last Quarter
  const lqStartMonth = qStart - 3;
  const lqYear = lqStartMonth < 0 ? yyyy - 1 : yyyy;
  const lqMonth = ((lqStartMonth % 12) + 12) % 12;
  const lastQStart = new Date(lqYear, lqMonth, 1);
  const lastQEnd = new Date(lqYear, lqMonth + 3, 0);

  return [
    { label: "Year to Date", from: fmt(ytdStart), to: todayStr },
    { label: "This Month", from: fmt(thisMonthStart), to: fmt(thisMonthEnd) },
    { label: "Last Month", from: fmt(lastMonthStart), to: fmt(lastMonthEnd) },
    { label: "This Quarter", from: fmt(thisQStart), to: fmt(thisQEnd) },
    { label: "Last Quarter", from: fmt(lastQStart), to: fmt(lastQEnd) },
  ];
}

const ACTIVE_CLASS =
  "bg-gray-900 text-white dark:bg-white dark:text-gray-900";
const INACTIVE_CLASS =
  "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700";
const BTN_CLASS = "px-3 py-1.5 rounded-full text-xs font-medium transition-colors";

export function DateRangePicker({
  basePath,
  from,
  to,
}: {
  basePath: string;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presets = getPresets();

  // Determine which preset is active (if any)
  const isAllTime = from === "all";
  const isDefault = !from && !to; // no URL params = YTD default

  function activePresetIndex(): number {
    if (isAllTime) return -1;
    const effectiveFrom = from ?? presets[0]?.from; // default = YTD
    const effectiveTo = to ?? presets[0]?.to;
    return presets.findIndex(
      (p) => p.from === effectiveFrom && p.to === effectiveTo
    );
  }

  const activeIdx = activePresetIndex();
  // If default (no params) and YTD matches preset[0], highlight it
  const ytdActive = isDefault || activeIdx === 0;

  function pushRange(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    router.push(`${basePath}?${params.toString()}`);
  }

  function pushAllTime() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", "all");
    params.delete("to");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {presets.map((preset, i) => {
        const isActive = i === 0 ? ytdActive : activeIdx === i;
        return (
          <button
            key={preset.label}
            onClick={() => pushRange(preset.from, preset.to)}
            className={`${BTN_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`}
          >
            {preset.label}
          </button>
        );
      })}
      <button
        onClick={pushAllTime}
        className={`${BTN_CLASS} ${isAllTime ? ACTIVE_CLASS : INACTIVE_CLASS}`}
      >
        All Time
      </button>
    </div>
  );
}
