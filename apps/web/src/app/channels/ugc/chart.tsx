"use client";

import { useRef, useEffect } from "react";

interface DataPoint {
  period: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  postsCount: number;
}

export function UGCChart({
  data,
  grouping,
}: {
  data: DataPoint[];
  grouping: "weekly" | "monthly";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    const ml = 70, mr = 70, mt = 20, mb = 50;
    const pw = W - ml - mr;
    const ph = H - mt - mb;

    // Left axis: views (bars)
    const maxViews = Math.max(...data.map((d) => d.views), 1);
    // Right axis: engagement (likes line)
    const maxLikes = Math.max(...data.map((d) => d.likes), 1);

    const barW = Math.max(2, pw / data.length - 4);

    // Grid lines
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = mt + ph - (i / 5) * ph;
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + pw, y);
      ctx.stroke();
    }

    // Bars (views) - teal
    data.forEach((d, i) => {
      const x = ml + (i / data.length) * pw + barW * 0.25;
      const h = (d.views / maxViews) * ph;
      ctx.fillStyle = "rgba(20, 184, 166, 0.6)";
      ctx.fillRect(x, mt + ph - h, barW * 0.5, h);
    });

    // Line (likes) - purple
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = ml + (i / data.length) * pw + barW * 0.5;
      const y = mt + ph - (d.likes / maxLikes) * ph;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots on line
    data.forEach((d, i) => {
      const x = ml + (i / data.length) * pw + barW * 0.5;
      const y = mt + ph - (d.likes / maxLikes) * ph;
      ctx.fillStyle = "#8b5cf6";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Left axis labels (views)
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const val = Math.round((maxViews * i) / 5);
      const y = mt + ph - (i / 5) * ph;
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "k" : val.toString(), ml - 8, y + 4);
    }

    // Right axis labels (likes)
    ctx.textAlign = "left";
    for (let i = 0; i <= 5; i++) {
      const val = Math.round((maxLikes * i) / 5);
      const y = mt + ph - (i / 5) * ph;
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "k" : val.toString(), ml + pw + 8, y + 4);
    }

    // X axis labels
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(data.length / 12));
    data.forEach((d, i) => {
      if (i % step !== 0) return;
      const x = ml + (i / data.length) * pw + barW * 0.5;
      ctx.fillText(d.period, x, mt + ph + 20);
    });

    // Axis titles
    ctx.save();
    ctx.fillStyle = "rgba(20, 184, 166, 0.8)";
    ctx.translate(14, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = "11px sans-serif";
    ctx.fillText("Views", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#8b5cf6";
    ctx.translate(W - 14, mt + ph / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = "11px sans-serif";
    ctx.fillText("Likes", 0, 0);
    ctx.restore();

    // Legend
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(20, 184, 166, 0.6)";
    ctx.fillRect(ml + 10, mt + 5, 12, 12);
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Views", ml + 26, mt + 15);

    ctx.fillStyle = "#8b5cf6";
    ctx.fillRect(ml + 80, mt + 5, 12, 12);
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Likes", ml + 96, mt + 15);
  }, [data, grouping]);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No data available yet.</p>;
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 320 }}
    />
  );
}
