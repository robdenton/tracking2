"use client";

import { useEffect, useRef } from "react";

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

    // Draw axes
    ctx.strokeStyle = "#d1d5db";
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

    // Draw grid lines
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    // Draw eNAU line (purple)
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.eNAU);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Signups line (green)
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.signups);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw Activations line (orange)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.activations);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw data points
    data.forEach((d, i) => {
      const x = xScale(i);

      // eNAU point (hollow circle)
      ctx.strokeStyle = "#8b5cf6";
      ctx.fillStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, yScale(d.eNAU), 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Signups point
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(x, yScale(d.signups), 4, 0, 2 * Math.PI);
      ctx.fill();

      // Activations point
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(x, yScale(d.activations), 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Y-axis labels
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxValue / 4) * (4 - i));
      const y = margin.top + (i / 4) * chartHeight;
      ctx.fillText(value.toLocaleString(), margin.left - 10, y + 4);
    }

    // Draw X-axis labels (show every nth label to avoid crowding)
    ctx.textAlign = "center";
    const labelFrequency = Math.ceil(data.length / 10);
    data.forEach((d, i) => {
      if (i % labelFrequency === 0 || i === data.length - 1) {
        const x = xScale(i);
        ctx.fillText(d.period, x, margin.top + chartHeight + 20);
      }
    });

    // Draw axis title
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#374151";

    // Left axis title
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Accounts / Activations", 0, 0);
    ctx.restore();

    // Draw legend
    const legendY = margin.top - 10;
    const legendItems = [
      { label: "eNAU (Estimated)", color: "#8b5cf6", dashed: true },
      { label: "Signups (Actual)", color: "#10b981", dashed: false },
      { label: "Activations (Actual)", color: "#f59e0b", dashed: false },
    ];

    let legendX = margin.left;
    legendItems.forEach((item) => {
      // Draw color box or line
      if (item.dashed) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(legendX, legendY);
        ctx.lineTo(legendX + 12, legendY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, legendY - 6, 12, 12);
      }

      // Draw label
      ctx.fillStyle = "#374151";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item.label, legendX + 16, legendY + 4);

      legendX += ctx.measureText(item.label).width + 50;
    });
  }, [data, grouping]);

  if (data.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500">
        No eNAU data available for the selected time period.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-950">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "400px" }}
        className="max-w-full"
      />
    </div>
  );
}
