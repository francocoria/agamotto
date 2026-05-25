export default function Loading() {
  return (
    <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      <SkeletonHero />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        {[0, 1, 2, 3].map((i) => (<SkeletonStat key={i} />))}
      </div>
      <SkeletonTable />
    </div>
  );
}

function shimmer(): React.CSSProperties {
  return {
    background:
      "linear-gradient(90deg, var(--bg-2) 0%, var(--bg-3) 50%, var(--bg-2) 100%)",
    backgroundSize: "200% 100%",
    animation: "agm-shimmer 1.6s ease-in-out infinite",
    borderRadius: 8,
  };
}

function SkeletonHero() {
  return (
    <div>
      <div style={{ ...shimmer(), height: 14, width: 240, marginBottom: 18 }} />
      <div style={{ ...shimmer(), height: 60, width: "85%", marginBottom: 12 }} />
      <div style={{ ...shimmer(), height: 60, width: "70%", marginBottom: 12 }} />
      <div style={{ ...shimmer(), height: 60, width: "60%", marginBottom: 24 }} />
      <div style={{ ...shimmer(), height: 16, width: 400 }} />
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="agm-card agm-card-pad">
      <div style={{ ...shimmer(), height: 28, width: 80, marginBottom: 8 }} />
      <div style={{ ...shimmer(), height: 12, width: 60 }} />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="agm-card" style={{ padding: 20 }}>
      <div style={{ ...shimmer(), height: 18, width: 260, marginBottom: 16 }} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 80px 80px",
          gap: 12, alignItems: "center", padding: "10px 0",
          borderBottom: "1px solid var(--line)",
        }}>
          <div style={{ ...shimmer(), height: 20, width: 20, borderRadius: 999 }} />
          <div style={{ ...shimmer(), height: 14 }} />
          <div style={{ ...shimmer(), height: 5 }} />
          <div style={{ ...shimmer(), height: 14, width: 60 }} />
        </div>
      ))}
    </div>
  );
}
