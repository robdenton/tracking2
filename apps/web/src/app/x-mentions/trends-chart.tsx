"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DailyDataPoint {
  day: string;
  dayLabel: string;
  mentions: number;
  impressions: number;
}

export function XTrendsChart({ data }: { data: DailyDataPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Mentions per day */}
      <div className="border border-border-light rounded-lg p-4 bg-surface">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Credible mentions by day
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis
              dataKey="dayLabel"
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
            <Bar dataKey="mentions" fill="#788C16" name="Mentions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Impressions per day */}
      <div className="border border-border-light rounded-lg p-4 bg-surface">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Total impressions by day
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis
              dataKey="dayLabel"
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
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="#C4960C"
              strokeWidth={2}
              dot={{ r: 3, fill: "#C4960C" }}
              name="Impressions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
