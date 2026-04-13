"use client";

import { useEffect, useRef } from "react";

// On-brand earthy chart palette
const COLORS = {
  olive: "#788C16",      // Clicks — primary brand green
  terracotta: "#B85C38", // Signups — warm clay
  amber: "#C4960C",      // Activations — golden
};

interface TimeSeriesDataPoint {
  period: string;
  actualClicks: number;
  signups: number;
  activations: number;
  incrementalSignups: number;
  incrementalActivations: number;
}

interface NewsletterChartProps {
  data: TimeSeriesDataPoint[];
  grouping: "weekly" | "monthly";
}

export function NewsletterChart({ data, grouping }: NewsletterChartProps) {
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
    const maxClicks = Math.max(...data.map((d) => d.actualClicks), 1);
    const maxSignupsActivations = Math.max(
      ...data.map((d) => Math.max(d.signups, d.activations)),
      1
    );

    // Scales
    const xScale = (index: number) =>
      margin.left + (index / (data.length - 1 || 1)) * chartWidth;
    const yScaleClicks = (value: number) =>
      margin.top + chartHeight - (value / maxClicks) * chartHeight;
    const yScaleSignups = (value: number) =>
      margin.top + chartHeight - (value / maxSignupsActivations) * chartHeight;

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

    // Y-axis left (Clicks)
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();

    // Y-axis right (Signups/Activations)
    ctx.beginPath();
    ctx.moveTo(width - margin.right, margin.top);
    ctx.lineTo(width - margin.right, margin.top + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(width - margin.right, margin.top + chartHeight);
    ctx.stroke();

    // Draw Actual Clicks line
    ctx.strokeStyle = COLORS.olive;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScaleClicks(d.actualClicks);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Signups line
    ctx.strokeStyle = COLORS.terracotta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScaleSignups(d.signups);
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
      const y = yScaleSignups(d.activations);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw data points
    data.forEach((d, i) => {
      const x = xScale(i);

      ctx.fillStyle = COLORS.olive;
      ctx.beginPath();
      ctx.arc(x, yScaleClicks(d.actualClicks), 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = COLORS.terracotta;
      ctx.beginPath();
      ctx.arc(x, yScaleSignups(d.signups), 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = COLORS.amber;
      ctx.beginPath();
      ctx.arc(x, yScaleSignups(d.activations), 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Y-axis labels
    ctx.fillStyle = "#9E9E9A";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";

    // Left axis (Clicks)
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxClicks / 4) * (4 - i));
      const y = margin.top + (i / 4) * chartHeight;
      ctx.fillText(value.toLocaleString(), margin.left - 10, y + 4);
    }

    // Right axis (Signups/Activations)
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxSignupsActivations / 4) * (4 - i));
      const y = margin.top + (i / 4) * chartHeight;
      ctx.fillText(value.toLocaleString(), width - margin.right + 10, y + 4);
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

    // Axis titles
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#72726E";

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Actual Clicks", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(width - 15, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Signups / Activations", 0, 0);
    ctx.restore();

    // Legend
    const legendY = margin.top - 10;
    const legendItems = [
      { label: "Actual Clicks", color: COLORS.olive },
      { label: "Signups", color: COLORS.terracotta },
      { label: "Activations", color: COLORS.amber },
    ];

    let legendX = margin.left;
    legendItems.forEach((item) => {
      // Color dot
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX + 4, legendY, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Label
      ctx.fillStyle = "#72726E";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item.label, legendX + 14, legendY + 4);

      legendX += ctx.measureText(item.label).width + 36;
    });
  }, [data, grouping]);

  if (data.length === 0) {
    return (
      <div className="rounded-lg p-8 text-center text-text-muted">
        No data available for the selected time period.
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
