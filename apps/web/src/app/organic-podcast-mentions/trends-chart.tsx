"use client";

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
  totalAudience: number; // sum of podcast_audience_size for organic mentions
}

export function TrendsChart({ data }: { data: MonthlyDataPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Mentions per month — stacked bar (organic vs paid) */}
      <div className="border border-border-light rounded-lg p-4 bg-surface">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Credible mentions by month
        </h3>
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
            <Bar
              dataKey="organic"
              stackId="a"
              fill="#788C16"
              name="Organic"
            />
            <Bar dataKey="paid" stackId="a" fill="#B85C38" name="Paid" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total reach (organic only) — bar by month */}
      <div className="border border-border-light rounded-lg p-4 bg-surface">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Organic reach by month (sum of est. audience)
        </h3>
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
            <Bar
              dataKey="totalAudience"
              fill="#C4960C"
              name="Total Reach"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
