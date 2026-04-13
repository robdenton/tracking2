"use client";

import { useEffect, useRef } from "react";

// On-brand earthy chart palette
const COLORS = {
  slate: "#5B7B8A",     // eNAU — cool contrast (dashed)
  terracotta: "#B85C38", // Signups — warm clay
  amber: "#C4960C",      // Activations — golden
};

interface ENAUDataPoint {
  period: string;
  eNAU: number;
  signups: number;
  activations: number;
}

interface ENAUChartProps {
  data: ENAUDataPoint[];
  grouping: "weekly" | "monthly";
}

export function ENAUChart({ data, grouping }: ENAUChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Chart dimensions
    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max values for scaling
    const maxValue = Math.max(
      ...data.map((d) => Math.max(d.eNAU, d.signups, d.activations)),
      1
    );

    // Scales
    const xScale = (index: number) =>
      margin.left + (index / (data.length - 1 || 1)) * chartWidth;
    const yScale = (value: number) =>
      margin.top + chartHeight - (value / maxValue) * chartHeight;

    // Draw grid lines
    ctx.strokeStyle = "#EAEBE5";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "#D5D5D2";
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(width - margin.right, margin.top + chartHeight);
    ctx.stroke();

    // Draw eNAU line (dashed)
    ctx.strokeStyle = COLORS.slate;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.eNAU);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Signups line
    ctx.strokeStyle = COLORS.terracotta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.signups);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Activations line
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.activations);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw data points
    data.forEach((d, i) => {
      const x = xScale(i);

      // eNAU point (hollow circle)
      ctx.strokeStyle = COLORS.slate;
      ctx.fillStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, yScale(d.eNAU), 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Signups point
      ctx.fillStyle = COLORS.terracotta;
      ctx.beginPath();
      ctx.arc(x, yScale(d.signups), 4, 0, 2 * Math.PI);
      ctx.fill();

      // Activations point
      ctx.fillStyle = COLORS.amber;
      ctx.beginPath();
      ctx.arc(x, yScale(d.activations), 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Y-axis labels
    ctx.fillStyle = "#9E9E9A";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxValue / 4) * (4 - i));
      const y = margin.top + (i / 4) * chartHeight;
      ctx.fillText(value.toLocaleString(), margin.left - 10, y + 4);
    }

    // X-axis labels
    ctx.textAlign = "center";
    const labelFrequency = Math.ceil(data.length / 10);
    data.forEach((d, i) => {
      if (i % labelFrequency === 0 || i === data.length - 1) {
        const x = xScale(i);
        ctx.fillText(d.period, x, margin.top + chartHeight + 20);
      }
    });

    // Axis title
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#72726E";

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Accounts / Activations", 0, 0);
    ctx.restore();

    // Legend
    const legendY = margin.top - 10;
    const legendItems = [
      { label: "eNAU (Estimated)", color: COLORS.slate, dashed: true },
      { label: "Signups (Actual)", color: COLORS.terracotta, dashed: false },
      { label: "Activations (Actual)", color: COLORS.amber, dashed: false },
    ];

    let legendX = margin.left;
    legendItems.forEach((item) => {
      if (item.dashed) {
        // Dashed line for legend
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(legendX, legendY);
        ctx.lineTo(legendX + 12, legendY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Solid dot for legend
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(legendX + 4, legendY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.fillStyle = "#72726E";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item.label, legendX + 16, legendY + 4);

      legendX += ctx.measureText(item.label).width + 44;
    });
  }, [data, grouping]);

  if (data.length === 0) {
    return (
      <div className="rounded-lg p-8 text-center text-text-muted">
        No eNAU data available for the selected time period.
      </div>
    );
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "400px" }}
        className="max-w-full"
      />
    </div>
  );
}
