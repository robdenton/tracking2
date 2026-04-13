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
    ctx.strokeStyle = "#EAEBE5";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = mt + ph - (i / 5) * ph;
      ctx.beginPath();
      ctx.moveTo(ml, y);
      ctx.lineTo(ml + pw, y);
      ctx.stroke();
    }

    // Axis borders
    ctx.strokeStyle = "#D5D5D2";
    ctx.lineWidth = 1;
    // Left axis
    ctx.beginPath();
    ctx.moveTo(ml, mt);
    ctx.lineTo(ml, mt + ph);
    ctx.stroke();
    // Bottom axis
    ctx.beginPath();
    ctx.moveTo(ml, mt + ph);
    ctx.lineTo(ml + pw, mt + ph);
    ctx.stroke();
    // Right axis
    ctx.beginPath();
    ctx.moveTo(ml + pw, mt);
    ctx.lineTo(ml + pw, mt + ph);
    ctx.stroke();

    // Bars (views) - olive
    data.forEach((d, i) => {
      const x = ml + (i / data.length) * pw + barW * 0.25;
      const h = (d.views / maxViews) * ph;
      ctx.fillStyle = "rgba(120, 140, 22, 0.5)";
      ctx.fillRect(x, mt + ph - h, barW * 0.5, h);
    });

    // Line (likes) - terracotta
    ctx.strokeStyle = "#B85C38";
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
      ctx.fillStyle = "#B85C38";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Left axis labels (views)
    ctx.fillStyle = "#9E9E9A";
    ctx.font = "11px Inter, system-ui, sans-serif";
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
    ctx.fillStyle = "#72726E";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.translate(14, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Views", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#72726E";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.translate(W - 14, mt + ph / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Likes", 0, 0);
    ctx.restore();

    // Legend with dots (circles) instead of squares
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";

    // Views legend dot
    ctx.fillStyle = "rgba(120, 140, 22, 0.5)";
    ctx.beginPath();
    ctx.arc(ml + 16, mt + 11, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#72726E";
    ctx.fillText("Views", ml + 26, mt + 15);

    // Likes legend dot
    ctx.fillStyle = "#B85C38";
    ctx.beginPath();
    ctx.arc(ml + 86, mt + 11, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#72726E";
    ctx.fillText("Likes", ml + 96, mt + 15);
  }, [data, grouping]);

  if (data.length === 0) {
    return <p className="text-sm text-text-secondary py-8 text-center">No data available yet.</p>;
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}
