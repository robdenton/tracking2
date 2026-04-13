"use client";

import {
  ComposedChart,
  CartesianGrid,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyRow {
  date: string;
  isWeekday: boolean;
  linkedinNau: number;
  adImpressions: number;
  adSpend: number;
  empImpressions: number;
  influencerImpressions: number;
}

interface Props {
  data: DailyRow[];
  baseline: { weekdayNau: number; weekendNau: number };
}

export function OverviewChart({ data, baseline }: Props) {
  // Aggregate to weekly for readability
  const weekMap = new Map<
    string,
    {
      nau: number;
      adImp: number;
      adSpend: number;
      empImp: number;
      infImp: number;
      days: number;
      baselineExpected: number;
    }
  >();

  for (const d of data) {
    const dt = new Date(d.date + "T00:00:00Z");
    const day = dt.getUTCDay() || 7;
    const monday = new Date(dt);
    monday.setUTCDate(dt.getUTCDate() - day + 1);
    const weekKey = monday.toISOString().slice(0, 10);

    const existing = weekMap.get(weekKey) ?? {
      nau: 0,
      adImp: 0,
      adSpend: 0,
      empImp: 0,
      infImp: 0,
      days: 0,
      baselineExpected: 0,
    };
    existing.nau += d.linkedinNau;
    existing.adImp += d.adImpressions;
    existing.adSpend += d.adSpend;
    existing.empImp += d.empImpressions;
    existing.infImp += d.influencerImpressions;
    existing.days++;
    existing.baselineExpected += d.isWeekday
      ? baseline.weekdayNau
      : baseline.weekendNau;
    weekMap.set(weekKey, existing);
  }

  const chartData = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week: week.slice(5), // "MM-DD"
      nau: v.nau,
      baseline: Math.round(v.baselineExpected),
      adImp: Math.round(v.adImp / 1000),
      empImp: Math.round(v.empImp / 1000),
      infImp: Math.round(v.infImp / 1000),
    }));

  const labelMap: Record<string, string> = {
    nau: "LinkedIn NAU",
    baseline: "Baseline Expected",
    adImp: "Ad Impressions (k)",
    empImp: "Employee Impressions (k)",
    infImp: "Influencer Impressions (k)",
  };

  return (
    <div className="bg-surface border border-border-light rounded-lg p-5">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EAEBE5" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9E9E9A" }} />
          <YAxis yAxisId="nau" tick={{ fontSize: 11, fill: "#9E9E9A" }} />
          <YAxis
            yAxisId="imp"
            orientation="right"
            tick={{ fontSize: 11, fill: "#9E9E9A" }}
            label={{
              value: "Impressions (k)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 10, fill: "#9E9E9A" },
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value ?? 0);
              const n = String(name);
              if (n === "adImp" || n === "empImp" || n === "infImp")
                return [v.toLocaleString() + "k", labelMap[n] ?? n];
              return [v.toLocaleString(), labelMap[n] ?? n];
            }}
          />
          <Legend formatter={(value) => labelMap[String(value)] ?? value} />
          <Bar
            yAxisId="imp"
            dataKey="adImp"
            fill="#788C16"
            opacity={0.5}
            name="adImp"
            stackId="imp"
          />
          <Bar
            yAxisId="imp"
            dataKey="empImp"
            fill="#B85C38"
            opacity={0.5}
            name="empImp"
            stackId="imp"
          />
          <Bar
            yAxisId="imp"
            dataKey="infImp"
            fill="#C4960C"
            opacity={0.5}
            name="infImp"
            stackId="imp"
          />
          <Line
            yAxisId="nau"
            type="monotone"
            dataKey="baseline"
            stroke="#5B7B8A"
            strokeDasharray="5 5"
            dot={false}
            name="baseline"
          />
          <Line
            yAxisId="nau"
            type="monotone"
            dataKey="nau"
            stroke="#788C16"
            strokeWidth={2}
            dot={false}
            name="nau"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
