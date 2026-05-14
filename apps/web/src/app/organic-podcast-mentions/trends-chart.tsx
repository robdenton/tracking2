"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface MonthlyDataPoint {
  month: string; // "YYYY-MM"
  monthLabel: string; // "Jan 2025"
  organic: number;
  paid: number;
  organicReach: number;
  paidReach: number;
}

type Mode = "all" | "organic";

function ChartToggle({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      <button
        onClick={() => setMode("all")}
        className={
          "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors " +
          (mode === "all"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:text-text-primary")
        }
      >
        All
      </button>
      <button
        onClick={() => setMode("organic")}
        className={
          "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors " +
          (mode === "organic"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:text-text-primary")
        }
      >
        Organic
      </button>
    </div>
  );
}

export function TrendsChart({ data }: { data: MonthlyDataPoint[] }) {
  const [mentionsMode, setMentionsMode] = useState<Mode>("all");
  const [reachMode, setReachMode] = useState<Mode>("all");

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Mentions per month */}
      <div className="border border-border-light rounded-lg p-4 bg-surface">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text-secondary">
            Credible mentions by month
          </h3>
          <ChartToggle mode={mentionsMode} setMode={setMentionsMode} />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "#9E9E9A" }}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9E9E9A" }} />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #E5E5DF",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="organic" stackId="a" fill="#788C16" name="Organic" />
            {mentionsMode === "all" && (
              <Bar dataKey="paid" stackId="a" fill="#B85C38" name="Paid" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Reach per month */}
      <div className="border border-border-light rounded-lg p-4 bg-surface">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-text-secondary">
            Reach by month
          </h3>
          <ChartToggle mode={reachMode} setMode={setReachMode} />
        </div>
        <p className="text-[11px] text-text-muted mb-3">
          Sum of est. audience for unique podcasts mentioning Granola that
          month (a podcast counted once even if it had multiple episodes).
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "#9E9E9A" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9E9E9A" }}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? (v / 1_000_000).toFixed(1) + "M"
                  : v >= 1_000
                    ? (v / 1_000).toFixed(0) + "k"
                    : v.toString()
              }
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #E5E5DF",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) =>
                typeof v === "number" ? v.toLocaleString() : String(v)
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="organicReach"
              stackId="b"
              fill="#C4960C"
              name="Organic reach"
            />
            {reachMode === "all" && (
              <Bar
                dataKey="paidReach"
                stackId="b"
                fill="#B85C38"
                name="Paid reach"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
