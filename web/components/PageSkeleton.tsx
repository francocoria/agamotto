function shim(): React.CSSProperties {
  return {
    background: "linear-gradient(90deg, var(--bg-2) 0%, var(--bg-3) 50%, var(--bg-2) 100%)",
    backgroundSize: "200% 100%",
    animation: "agm-shimmer 1.6s ease-in-out infinite",
    borderRadius: 12,
  };
}

export function PageSkeleton({ title = true, cards = 3 }: { title?: boolean; cards?: number }) {
  return (
    <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      {title && (
        <div>
          <div style={{ ...shim(), height: 14, width: 200, marginBottom: 14 }} />
          <div style={{ ...shim(), height: 40, width: "60%" }} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`, gap: 16 }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="agm-card" style={{ padding: 18 }}>
            <div style={{ ...shim(), height: 14, marginBottom: 12 }} />
            <div style={{ ...shim(), height: 30, marginBottom: 10 }} />
            <div style={{ ...shim(), height: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
