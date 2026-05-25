import type { Scoreline, Team } from "@/lib/api";

export function ScorelineDistribution({
  scorelines, homeTeam, awayTeam,
}: {
  scorelines: Scoreline[];
  homeTeam?: Team | null;
  awayTeam?: Team | null;
}) {
  // Agrupar por outcome
  const groups: { label: string; color: string; total: number; rows: Scoreline[] }[] = [
    { label: `Gana ${homeTeam?.fifa_code ?? "LOCAL"}`, color: "var(--green-deep)", total: 0, rows: [] },
    { label: "Empate", color: "var(--fg-2)", total: 0, rows: [] },
    { label: `Gana ${awayTeam?.fifa_code ?? "VISITA"}`, color: "var(--violet)", total: 0, rows: [] },
  ];
  for (const s of scorelines) {
    const [h, a] = s.score.split("-").map(Number);
    const idx = h > a ? 0 : h < a ? 2 : 1;
    groups[idx].rows.push(s);
    groups[idx].total += s.p;
  }
  const max = Math.max(...scorelines.map((s) => s.p), 0.001);

  return (
    <div className="agm-card">
      <div className="agm-card-h">
        <h3>TODOS LOS RESULTADOS POSIBLES</h3>
        <span className="agm-card-eyebrow">{scorelines.length} marcadores · ordenados por probabilidad</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        {groups.map((g, gi) => (
          <div key={g.label} style={{
            padding: 16,
            borderRight: gi < 2 ? "1px solid var(--line)" : "none",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)",
            }}>
              <span className="agm-mono" style={{
                fontSize: 10, color: g.color, letterSpacing: "0.12em", fontWeight: 700,
              }}>{g.label.toUpperCase()}</span>
              <span className="agm-display agm-num" style={{
                fontSize: 18, color: g.color, fontWeight: 700,
              }}>{(g.total * 100).toFixed(1)}%</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {g.rows.slice(0, 8).map((s) => (
                <li key={s.score} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr 56px",
                  gap: 10, alignItems: "center", padding: "6px 0",
                }}>
                  <span className="agm-mono" style={{
                    fontSize: 13, fontWeight: 700, color: "var(--fg-0)", minWidth: 40,
                  }}>{s.score}</span>
                  <div className="agm-bar" style={{ height: 4 }}>
                    <div className="agm-bar-fill" style={{ width: `${(s.p / max) * 100}%` }} />
                  </div>
                  <span className="agm-mono agm-num" style={{
                    fontSize: 11, color: "var(--fg-2)", textAlign: "right", fontWeight: 600,
                  }}>{(s.p * 100).toFixed(1)}%</span>
                </li>
              ))}
              {g.rows.length === 0 && (
                <li style={{ fontSize: 11, color: "var(--fg-3)", padding: "10px 0", textAlign: "center" }}>
                  Sin marcadores en el top
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
