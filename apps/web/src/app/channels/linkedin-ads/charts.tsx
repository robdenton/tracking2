"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeeklyRow {
  period: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export function LinkedInAdsCharts({ data }: { data: WeeklyRow[] }) {
  // Format period labels (YYYY-MM-DD → "Mar 10")
  const formatted = data.map((row) => {
    const d = new Date(row.period + "T00:00:00Z");
    const label = d.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
    return { ...row, label };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Spend */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Weekly Spend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
              }
            />
            <Tooltip
              formatter={(value) => [
                `$${Number(value).toFixed(2)}`,
                "Spend",
              ]}
            />
            <Bar dataKey="spend" fill="#3b82f6" name="Spend" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Impressions & Clicks */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Weekly Impressions &amp; Clicks
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
              }
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="impressions"
              stroke="#8b5cf6"
              name="Impressions"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="clicks"
              stroke="#10b981"
              name="Clicks"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
