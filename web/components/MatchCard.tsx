import Link from "next/link";
import type { Match } from "@/lib/api";

function pct(p: number, digits = 1) {
  return (p * 100).toFixed(digits) + "%";
}

export function MatchCard({ match }: { match: Match }) {
  const pred = match.prediction;
  const date = new Date(match.kickoff_utc);
  const day = date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).toUpperCase();
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const stageLabel =
    match.stage === "group"
      ? `GRUPO ${match.group_label}`
      : match.stage.replace(/_/g, " ").toUpperCase();

  const homeCode = match.home_team?.fifa_code ?? "—";
  const awayCode = match.away_team?.fifa_code ?? "—";
  const homeFlag = match.home_team?.flag_emoji ?? "🏳️";
  const awayFlag = match.away_team?.flag_emoji ?? "🏳️";

  return (
    <Link
      href={`/matches/${match.match_id}`}
      className="agm-card agm-lift"
      style={{ display: "block", textDecoration: "none", padding: 20 }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em" }}>
          {day} · {time}
        </span>
        <span className="agm-pill" style={{ height: 18, fontSize: 9, padding: "0 8px" }}>
          {stageLabel}
        </span>
      </div>

      {/* Teams VS row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginBottom: pred ? 16 : 0 }}>
        {/* Home */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{homeFlag}</span>
          <span className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-0)" }}>{homeCode}</span>
          <span style={{ fontSize: 10, color: "var(--fg-3)", textAlign: "center", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {match.home_team?.name ?? ""}
          </span>
        </div>

        {/* VS / Score */}
        <div style={{ textAlign: "center" }}>
          {match.home_score != null && match.away_score != null ? (
            <span className="agm-display" style={{ fontSize: 22, color: "var(--fg-0)" }}>
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="agm-display" style={{ fontSize: 14, color: "var(--fg-3)", letterSpacing: "0.1em" }}>VS</span>
          )}
        </div>

        {/* Away */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{awayFlag}</span>
          <span className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-0)" }}>{awayCode}</span>
          <span style={{ fontSize: 10, color: "var(--fg-3)", textAlign: "center", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {match.away_team?.name ?? ""}
          </span>
        </div>
      </div>

      {/* ── Prediction block ── */}
      {pred && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          {/* 1X2 probability bar */}
          <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 8, marginBottom: 8 }}>
            <div style={{ flex: pred.p_home, background: "var(--green)" }} title={`${homeCode} gana: ${pct(pred.p_home)}`} />
            <div style={{ flex: pred.p_draw, background: "var(--fg-3)" }} title={`Empate: ${pct(pred.p_draw)}`} />
            <div style={{ flex: pred.p_away, background: "var(--violet)" }} title={`${awayCode} gana: ${pct(pred.p_away)}`} />
          </div>

          {/* Labels bajo la barra */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", marginBottom: 14, gap: 4 }}>
            <div>
              <div className="agm-num" style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>{pct(pred.p_home)}</div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>GANA {homeCode}</div>
            </div>
            <div>
              <div className="agm-num" style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>{pct(pred.p_draw)}</div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>EMPATE</div>
            </div>
            <div>
              <div className="agm-num" style={{ fontSize: 15, fontWeight: 700, color: "var(--violet)" }}>{pct(pred.p_away)}</div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>GANA {awayCode}</div>
            </div>
          </div>

          {/* Tabla de marcadores más probables */}
          {pred.top_scorelines.length > 0 && (
            <>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginBottom: 6 }}>
                MARCADORES MÁS PROBABLES
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th className="agm-mono" style={{ textAlign: "left", padding: "3px 0", color: "var(--fg-3)", fontWeight: 400, fontSize: 9 }}>RESULTADO</th>
                    <th className="agm-mono" style={{ textAlign: "left", padding: "3px 0", color: "var(--fg-3)", fontWeight: 400, fontSize: 9 }}>GANADOR</th>
                    <th className="agm-mono" style={{ textAlign: "right", padding: "3px 0", color: "var(--fg-3)", fontWeight: 400, fontSize: 9 }}>PROB.</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pred.top_scorelines.slice(0, 7).map((s) => {
                    const [h, a] = s.score.split("-").map(Number);
                    const winner = h > a ? homeCode : a > h ? awayCode : "Empate";
                    const winnerColor = h > a ? "var(--green)" : a > h ? "var(--violet)" : "var(--fg-2)";
                    const maxP = pred.top_scorelines[0]?.p ?? 1;
                    return (
                      <tr key={s.score} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "5px 0" }}>
                          <span className="agm-mono agm-num" style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-0)" }}>
                            {homeFlag} {h} – {a} {awayFlag}
                          </span>
                        </td>
                        <td style={{ padding: "5px 0" }}>
                          <span style={{ color: winnerColor, fontWeight: 600, fontSize: 11 }}>{winner}</span>
                        </td>
                        <td className="agm-num" style={{ textAlign: "right", padding: "5px 0", color: "var(--green-deep)", fontWeight: 700, fontSize: 12 }}>
                          {pct(s.p, 1)}
                        </td>
                        <td style={{ padding: "5px 0 5px 8px" }}>
                          <div style={{ background: "var(--bg-2)", borderRadius: 2, height: 5, overflow: "hidden" }}>
                            <div style={{ width: `${(s.p / maxP) * 100}%`, height: "100%", background: "var(--green-deep)", borderRadius: 2 }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* xG row */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--fg-3)" }}>
                <span>xG {homeCode}: <strong style={{ color: "var(--fg-1)" }}>{pred.lambda_home.toFixed(2)}</strong></span>
                {pred.p_btts != null && (
                  <span>BTTS: <strong style={{ color: "var(--fg-1)" }}>{pct(pred.p_btts)}</strong></span>
                )}
                <span>xG {awayCode}: <strong style={{ color: "var(--fg-1)" }}>{pred.lambda_away.toFixed(2)}</strong></span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Venue */}
      {match.venue && (
        <div style={{ marginTop: 10, fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {match.venue.name}, {match.venue.city}
        </div>
      )}
    </Link>
  );
}
