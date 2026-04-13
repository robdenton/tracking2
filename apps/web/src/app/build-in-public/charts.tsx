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

interface Employee {
  key: string;
  name: string;
  color: string;
}

export function BuildInPublicCharts({
  employees,
  data,
}: {
  employees: Employee[];
  data: Array<Record<string, string | number>>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Impressions (Reach) — Stacked by Employee */}
      <div className="border border-border-light rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Weekly Impressions (Reach)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {employees.map((emp) => (
              <Bar
                key={emp.key}
                dataKey={`${emp.key}_impressions`}
                stackId="impressions"
                fill={emp.color}
                name={emp.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement — Stacked by Employee */}
      <div className="border border-border-light rounded-lg p-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Weekly Engagement
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {employees.map((emp) => (
              <Bar
                key={emp.key}
                dataKey={`${emp.key}_engagement`}
                stackId="engagement"
                fill={emp.color}
                name={emp.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
