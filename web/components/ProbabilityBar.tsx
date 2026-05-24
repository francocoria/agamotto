export function ProbabilityBar({
  pHome, pDraw, pAway,
}: { pHome: number; pDraw: number; pAway: number }) {
  return (
    <div className="agm-bar-1x2">
      <span style={{ width: `${pHome * 100}%` }} />
      <span style={{ width: `${pDraw * 100}%` }} />
      <span style={{ width: `${pAway * 100}%` }} />
    </div>
  );
}

export function ProbLabels({
  pHome, pDraw, pAway, homeCode, awayCode,
}: { pHome: number; pDraw: number; pAway: number; homeCode?: string; awayCode?: string }) {
  return (
    <>
      <div className="agm-mono" style={{
        display: "flex", justifyContent: "space-between", marginTop: 8,
        fontSize: 11, fontWeight: 600,
      }}>
        <span style={{ color: "var(--green-deep)" }}>{(pHome * 100).toFixed(1)}%</span>
        <span style={{ color: "var(--fg-2)" }}>{(pDraw * 100).toFixed(1)}%</span>
        <span style={{ color: "var(--violet)" }}>{(pAway * 100).toFixed(1)}%</span>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 2,
        fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        <span>{homeCode ?? "Local"}</span>
        <span>Empate</span>
        <span>{awayCode ?? "Visita"}</span>
      </div>
    </>
  );
}
