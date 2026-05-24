"use client";
import React, { useEffect, useState } from "react";

interface Branch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  c: string;
  w: number;
  op: number;
}

export function TimelinesHero({ width = 620, height = 400 }: { width?: number; height?: number }) {
  const cx = 80;
  const cy = height / 2;
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const list: Branch[] = [];
    const build = (x: number, y: number, depth: number, parentId: string) => {
      if (depth > 4) return;
      const stepX = (width - 100) / 5;
      const nx = x + stepX;
      const spread = (height / 2 - 40) / Math.pow(2, depth);
      const isViolet = parentId.length % 2 === 1;
      const colorA = isViolet ? "var(--violet)" : "var(--green)";
      const colorB = !isViolet ? "var(--violet)" : "var(--green)";

      if (depth === 0) {
        const yA = y - spread * 0.6;
        const yB = y + spread * 0.6;
        list.push({ x1: x, y1: y, x2: nx, y2: yA, c: "var(--green)", w: 2.4, op: 0.9 });
        list.push({ x1: x, y1: y, x2: nx, y2: yB, c: "var(--violet)", w: 1.6, op: 0.5 });
        build(nx, yA, depth + 1, parentId + "A");
        build(nx, yB, depth + 1, parentId + "B");
      } else {
        const yA = y - spread;
        const yB = y + spread;
        const wA = 2.2 / (depth + 0.5);
        const wB = 1.4 / (depth + 0.5);
        list.push({ x1: x, y1: y, x2: nx, y2: yA, c: colorA, w: wA, op: 0.75 / depth });
        list.push({ x1: x, y1: y, x2: nx, y2: yB, c: colorB, w: wB, op: 0.55 / depth });
        build(nx, yA, depth + 1, parentId + "A");
        build(nx, yB, depth + 1, parentId + "B");
      }
    };
    build(cx, cy, 0, "");
    setBranches(list);
  }, [width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="var(--green-glow)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={80} fill="url(#halo)" />
      
      {branches.map((b, i) => {
        const dx = b.x2 - b.x1;
        const midX = b.x1 + dx * 0.5;
        const d = `M ${b.x1} ${b.y1} C ${midX} ${b.y1}, ${midX} ${b.y2}, ${b.x2} ${b.y2}`;
        return (
          <path
            key={i}
            d={d}
            stroke={b.c}
            strokeWidth={b.w}
            fill="none"
            opacity={b.op}
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset="600"
            style={{
              animation: `agm-draw 1.4s ${0.05 + i * 0.015}s cubic-bezier(0.2, 0.7, 0.3, 1) forwards`,
            }}
          />
        );
      })}
      
      {branches.filter((b) => b.x2 >= width - 100).map((b, i) => (
        <g
          key={`n${i}`}
          style={{
            animation: `agm-fade-in 0.4s ${1.0 + i * 0.02}s ease both`,
            opacity: 0,
          }}
        >
          <circle cx={b.x2} cy={b.y2} r={3} fill={b.c} opacity={b.op + 0.2} />
          <circle cx={b.x2} cy={b.y2} r={6} fill={b.c} opacity={0.1} />
        </g>
      ))}
      
      <circle cx={cx} cy={cy} r={9} fill="var(--bg-1)" stroke="var(--green)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={3} fill="var(--green)" />
      <text x={cx - 18} y={cy - 18} fill="var(--green)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">T₀ · NOW</text>
      <text x={width - 80} y={20} fill="var(--fg-3)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">+ 32 DAYS</text>

      <style>{`
        @keyframes agm-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes agm-fade-in {
          to { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
