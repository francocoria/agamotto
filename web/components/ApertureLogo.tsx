"use client";
import React from "react";

export function ApertureLogo({ size = 36, spin = true }: { size?: number; spin?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className={spin ? "animate-spin-slow" : ""}
        style={{
          animationDuration: "24s",
        }}
      >
        <defs>
          <linearGradient id={`grad-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--green)" />
            <stop offset="1" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        
        {/* outer ring */}
        <circle cx="18" cy="18" r="16" fill="none" stroke={`url(#grad-${size})`} strokeWidth="1.2" />
        
        {/* tick marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 18 + Math.cos(a) * 14;
          const y1 = 18 + Math.sin(a) * 14;
          const x2 = 18 + Math.cos(a) * (i % 3 === 0 ? 11 : 12.5);
          const y2 = 18 + Math.sin(a) * (i % 3 === 0 ? 11 : 12.5);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--fg-2)"
              strokeWidth="0.8"
              opacity="0.6"
            />
          );
        })}
        
        {/* inner ring */}
        <circle cx="18" cy="18" r="9" fill="none" stroke="var(--fg-3)" strokeWidth="0.6" opacity="0.4" />
        
        {/* aperture blades — 6 triangles forming an iris */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const x = 18 + Math.cos(a) * 5;
          const y = 18 + Math.sin(a) * 5;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--green)" opacity="0.65" />;
        })}
        
        {/* center node */}
        <circle cx="18" cy="18" r="2.4" fill="var(--green)" />
        <circle cx="18" cy="18" r="1.0" fill="var(--bg-1)" />
      </svg>
      
      <style>{`
        .animate-spin-slow {
          animation: agm-rotate 24s linear infinite;
        }
        @keyframes agm-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
