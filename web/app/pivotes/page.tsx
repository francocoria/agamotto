import Link from "next/link";
import { api } from "@/lib/api";

export const revalidate = 30;

export default async function PivotesPage() {
  const pivot = await api.pivotMatches();
  const max = Math.max(...pivot.map((p) => p.impact_score), 0.001);

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        PARTIDOS · MÁXIMO IMPACTO
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        PIVOTES
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Partidos donde el resultado mueve más el resto del torneo. Mayor entropía = más bifurcaciones del multiverso.
      </p>

      <div className="agm-card">
        <table className="agm-table">
          <thead>
            <tr>
              <th className="agm-th" style={{ width: 40 }}>#</th>
              <th className="agm-th">PARTIDO</th>
              <th className="agm-th">FASE</th>
              <th className="agm-th" style={{ minWidth: 200 }}>IMPACTO</th>
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>SCORE</th>
            </tr>
          </thead>
          <tbody className="agm-stagger">
            {pivot.map((m, i) => (
              <tr key={m.match_id} className="agm-tr-hover">
                <td className="agm-td agm-mono" style={{ color: "var(--fg-3)" }}>{String(i + 1).padStart(2, "0")}</td>
                <td className="agm-td">
                  <Link href={`/matches/${m.match_id}`} className="agm-mono" style={{ color: "var(--fg-0)", fontWeight: 600 }}>
                    {m.home_team_id} · {m.away_team_id}
                  </Link>
                </td>
                <td className="agm-td">
                  <span className="agm-pill" style={{ fontSize: 9 }}>{(m.stage ?? "").replace("_", " ")}</span>
                </td>
                <td className="agm-td">
                  <div className="agm-bar" style={{ height: 5 }}>
                    <div className="agm-bar-fill" style={{ width: `${(m.impact_score / max) * 100}%` }} />
                  </div>
                </td>
                <td className="agm-td agm-mono agm-num" style={{ textAlign: "right", color: "var(--green-deep)", fontWeight: 700 }}>
                  {m.impact_score.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
