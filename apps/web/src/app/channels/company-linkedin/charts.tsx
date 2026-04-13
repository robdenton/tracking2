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
      <div className="border border-border-light rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Weekly Total Engagement
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9E9E9A" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9E9E9A" }} />
            <Tooltip />
            <Bar dataKey="engagement" fill="#788C16" name="Total Engagement" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement breakdown — stacked by type */}
      <div className="border border-border-light rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Weekly Engagement Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9E9E9A" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9E9E9A" }} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="reactions"
              stackId="eng"
              fill="#788C16"
              name="Reactions"
            />
            <Bar
              dataKey="comments"
              stackId="eng"
              fill="#C4960C"
              name="Comments"
            />
            <Bar
              dataKey="reposts"
              stackId="eng"
              fill="#5B7B8A"
              name="Reposts"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
