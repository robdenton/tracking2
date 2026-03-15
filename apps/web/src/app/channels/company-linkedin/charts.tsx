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

interface WeeklyDataPoint {
  period: string;
  impressions: number;
  reactions: number;
  comments: number;
  reposts: number;
  engagement: number;
  posts: number;
}

export function CompanyLinkedInCharts({
  data,
}: {
  data: WeeklyDataPoint[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Total Engagement */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Weekly Total Engagement
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="engagement" fill="#3b82f6" name="Total Engagement" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement breakdown — stacked by type */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Weekly Engagement Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="reactions"
              stackId="eng"
              fill="#10b981"
              name="Reactions"
            />
            <Bar
              dataKey="comments"
              stackId="eng"
              fill="#f59e0b"
              name="Comments"
            />
            <Bar
              dataKey="reposts"
              stackId="eng"
              fill="#8b5cf6"
              name="Reposts"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
