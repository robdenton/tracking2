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
  Legend,
} from "recharts";

interface WeeklyDataPoint {
  period: string;
  impressions: number;
  engagement: number;
  reactions: number;
  comments: number;
  reposts: number;
  postCount: number;
}

export function BuildInPublicCharts({ data }: { data: WeeklyDataPoint[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Impressions (Reach) Chart */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Weekly Impressions (Reach)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="impressions" fill="#3b82f6" name="Impressions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement Chart */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Weekly Engagement
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="reactions"
              stroke="#10b981"
              name="Reactions"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="comments"
              stroke="#f59e0b"
              name="Comments"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="reposts"
              stroke="#8b5cf6"
              name="Reposts"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
