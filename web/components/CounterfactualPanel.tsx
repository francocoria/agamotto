"use client";
import { useState } from "react";
import { api, type ChampionEntry, type Match, type Team } from "@/lib/api";

type Condition = {
  type: "fix_result" | "fix_winner" | "override_weather";
  match_id?: string;
  home_score?: number;
  away_score?: number;
  winner_team_id?: string;
  temp_c?: number;
  humidity?: number;
};

const LABELS: Record<Condition["type"], string> = {
  fix_result: "FIJAR MARCADOR",
  fix_winner: "FIJAR GANADOR",
  override_weather: "SIMULAR CLIMA",
};

function fmtMatch(m: Match): string {
  const stage = m.stage === "group" ? `Grupo ${m.group_label}` : m.stage.replace("_", " ");
  const d = new Date(m.kickoff_utc).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  const h = m.home_team?.fifa_code ?? "—";
  const a = m.away_team?.fifa_code ?? "—";
  return `${h} vs ${a} · ${stage} · ${d}`;
}

export function CounterfactualPanel({
  baseline, matches, teams,
}: {
  baseline: ChampionEntry[];
  matches: Match[];
  teams: Team[];
}) {
  const [conds, setConds] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [draft, setDraft] = useState<Condition>({
    type: "fix_result",
    match_id: matches[0]?.match_id ?? "",
    home_score: 1, away_score: 0,
  });

  const matchById = new Map(matches.map((m) => [m.match_id, m]));
  const teamsByElo = [...teams].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));

  // For "fix_winner", the eligible winners are the 2 teams of the chosen match
  const draftMatch = draft.match_id ? matchById.get(draft.match_id) : undefined;
  const eligibleWinners = draftMatch
    ? [draftMatch.home_team, draftMatch.away_team].filter(Boolean) as Team[]
    : teamsByElo;

  const condLabel = (c: Condition): string => {
    const m = c.match_id ? matchById.get(c.match_id) : undefined;
    const ml = m ? `${m.home_team?.fifa_code ?? "—"} vs ${m.away_team?.fifa_code ?? "—"}` : c.match_id ?? "";
    if (c.type === "fix_result") return `${ml}: ${c.home_score} – ${c.away_score}`;
    if (c.type === "fix_winner") return `${c.winner_team_id} gana ${ml}`;
    if (c.type === "override_weather") return `${ml} · ${c.temp_c}°C${c.humidity ? ` · ${c.humidity}% hum.` : ""}`;
    return JSON.stringify(c);
  };

  const addCond = () => {
    if (!draft.match_id) return;
    setConds([...conds, draft]);
    setDraft({
      type: "fix_result",
      match_id: matches[0]?.match_id ?? "",
      home_score: 1, away_score: 0,
    });
  };
  const run = async () => {
    setLoading(true);
    try {
      const r = await api.counterfactual(conds, 3000);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const baselineMap = new Map(baseline.map((b) => [b.team, b.p]));

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(280px, 1fr) minmax(380px, 1.4fr) minmax(240px, 1fr)",
      gap: 24, alignItems: "start",
    }}>
      {/* Col 1 — Input */}
      <div className="agm-card">
        <div className="agm-card-h">
          <h3>CONDICIONES · INPUT</h3>
          <span className="agm-card-eyebrow">{conds.length}/8</span>
        </div>
        <div style={{ padding: 18 }}>
          {conds.map((c, i) => (
            <div key={i} className="agm-card agm-card-tight" style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12, padding: 10 }}>
              <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4, width: 18 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 2 }}>
                  {LABELS[c.type]}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-0)", lineHeight: 1.4 }}>
                  {condLabel(c)}
                </div>
              </div>
              <button onClick={() => setConds(conds.filter((_, j) => j !== i))}
                style={{ background: "none", border: 0, color: "var(--fg-3)", fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
          ))}

          {/* Draft form */}
          <div className="agm-card" style={{ marginTop: 8, background: "var(--bg-2)", padding: 14 }}>
            <label className="agm-label">TIPO</label>
            <select value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as Condition["type"] })}
              className="agm-input" style={{ fontSize: 12 }}>
              <option value="fix_result">Fijar marcador exacto</option>
              <option value="fix_winner">Fijar ganador</option>
              <option value="override_weather">Simular clima</option>
            </select>

            <label className="agm-label" style={{ marginTop: 12 }}>PARTIDO</label>
            <select value={draft.match_id ?? ""}
              onChange={(e) => {
                const mid = e.target.value;
                const m = matchById.get(mid);
                setDraft({
                  ...draft,
                  match_id: mid,
                  winner_team_id: m?.home_team?.fifa_code ?? draft.winner_team_id,
                });
              }}
              className="agm-input" style={{ fontSize: 12 }}>
              {matches.length === 0 && <option value="">— sin partidos —</option>}
              {matches.map((m) => (
                <option key={m.match_id} value={m.match_id}>{fmtMatch(m)}</option>
              ))}
            </select>

            {draft.type === "fix_result" && (
              <>
                <label className="agm-label" style={{ marginTop: 12 }}>MARCADOR</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                  <input type="number" min={0} max={10} value={draft.home_score ?? 0}
                    onChange={(e) => setDraft({ ...draft, home_score: Number(e.target.value) })}
                    className="agm-input agm-mono" style={{ textAlign: "center", fontSize: 16 }} />
                  <span className="agm-display" style={{ color: "var(--fg-3)" }}>—</span>
                  <input type="number" min={0} max={10} value={draft.away_score ?? 0}
                    onChange={(e) => setDraft({ ...draft, away_score: Number(e.target.value) })}
                    className="agm-input agm-mono" style={{ textAlign: "center", fontSize: 16 }} />
                </div>
                <div className="agm-mono" style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--fg-3)" }}>
                  <span>{draftMatch?.home_team?.fifa_code ?? "LOCAL"}</span>
                  <span>{draftMatch?.away_team?.fifa_code ?? "VISITA"}</span>
                </div>
              </>
            )}
            {draft.type === "fix_winner" && (
              <>
                <label className="agm-label" style={{ marginTop: 12 }}>GANADOR</label>
                <select value={draft.winner_team_id ?? ""}
                  onChange={(e) => setDraft({ ...draft, winner_team_id: e.target.value })}
                  className="agm-input" style={{ fontSize: 12 }}>
                  {eligibleWinners.map((t) => (
                    <option key={t.team_id} value={t.fifa_code ?? t.team_id}>
                      {t.flag_emoji} {t.fifa_code} · {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            {draft.type === "override_weather" && (
              <>
                <label className="agm-label" style={{ marginTop: 12 }}>TEMP °C</label>
                <input type="number" placeholder="35" value={draft.temp_c ?? ""}
                  onChange={(e) => setDraft({ ...draft, temp_c: Number(e.target.value) })}
                  className="agm-input agm-mono" style={{ fontSize: 12 }} />
                <label className="agm-label" style={{ marginTop: 12 }}>HUMEDAD %</label>
                <input type="number" min={0} max={100} placeholder="80" value={draft.humidity ?? ""}
                  onChange={(e) => setDraft({ ...draft, humidity: Number(e.target.value) })}
                  className="agm-input agm-mono" style={{ fontSize: 12 }} />
              </>
            )}

            <button onClick={addCond} className="agm-mono" style={{
              marginTop: 14, width: "100%", padding: "10px 0", border: "1px dashed var(--line-2)",
              borderRadius: 8, background: "transparent", color: "var(--fg-2)", fontSize: 11,
              cursor: "pointer",
            }}>
              + AGREGAR CONDICIÓN
            </button>
          </div>

          <button onClick={run} disabled={loading || conds.length === 0}
            className="agm-btn agm-btn-primary" style={{
              width: "100%", marginTop: 14, justifyContent: "center",
              opacity: loading || conds.length === 0 ? 0.4 : 1,
              cursor: loading || conds.length === 0 ? "not-allowed" : "pointer",
            }}>
            {loading ? "RECORRIENDO UNIVERSOS..." : "RECALCULAR ESCENARIO"}
          </button>
          <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span>~ 3.000 iteraciones</span><span>&lt; 3 s</span>
          </div>
        </div>
      </div>

      {/* Col 2 — Delta */}
      <div className="agm-card">
        <div className="agm-card-h">
          <h3>DELTA DE PROBABILIDAD · TÍTULO</h3>
          <span style={{ display: "flex", gap: 6 }}>
            <span className="agm-pill" style={{ fontSize: 9 }}>LÍNEA BASE</span>
            <span className="agm-pill agm-pill-green" style={{ fontSize: 9 }}>ESCENARIO</span>
          </span>
        </div>
        <table className="agm-table">
          <thead>
            <tr>
              <th className="agm-th">SELECCIÓN</th>
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>BASE</th>
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>ESCENARIO</th>
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>Δ</th>
            </tr>
          </thead>
          <tbody className="agm-stagger">
            {(result?.champion_distribution ?? baseline).slice(0, 12).map((c: any) => {
              const base = baselineMap.get(c.team) ?? 0;
              const scen = c.p ?? base;
              const delta = scen - base;
              return (
                <tr key={c.team} className="agm-tr-hover">
                  <td className="agm-td">
                    <span className="agm-flag">
                      <span className="agm-flag-emoji">{c.flag ?? "🏳️"}</span>
                      <span className="agm-mono" style={{ fontWeight: 700 }}>{c.team}</span>
                      <span style={{ color: "var(--fg-2)" }}>{c.name ?? ""}</span>
                    </span>
                  </td>
                  <td className="agm-td agm-mono agm-num" style={{ textAlign: "right", color: "var(--fg-2)" }}>
                    {(base * 100).toFixed(2)}%
                  </td>
                  <td className="agm-td agm-mono agm-num" style={{ textAlign: "right", color: "var(--fg-0)", fontWeight: 700 }}>
                    {(scen * 100).toFixed(2)}%
                  </td>
                  <td className="agm-td agm-mono agm-num" style={{
                    textAlign: "right", fontWeight: 600,
                    color: delta > 0 ? "var(--green-deep)" : delta < 0 ? "var(--red)" : "var(--fg-3)",
                  }}>
                    {delta > 0 ? "+" : ""}{(delta * 100).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {result && (
          <div className="agm-mono" style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)" }}>
            <span>{result.n_runs.toLocaleString()} iteraciones</span>
            <span>{conds.length} condiciones aplicadas</span>
          </div>
        )}
      </div>

      {/* Col 3 — Sampled universes */}
      <div className="agm-card">
        <div className="agm-card-h">
          <h3>UNIVERSOS MUESTREADOS</h3>
          <span className="agm-card-eyebrow">{(result?.sampled_universes ?? []).length}</span>
        </div>
        <div style={{ padding: 12 }}>
          {(result?.sampled_universes ?? []).slice(0, 8).map((u: any, i: number) => (
            <div key={i} className="agm-card agm-card-tight" style={{ marginBottom: 6, padding: 10 }}>
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginBottom: 4 }}>
                UNIVERSO #{String(i + 1).padStart(3, "0")}
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-0)" }}>
                CAMP <span className="agm-mono" style={{ color: "var(--green-deep)", fontWeight: 700 }}>{u.champion}</span>
              </div>
              {u.final && (
                <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 2 }}>
                  FINAL: {u.final.filter(Boolean).join(" — ")}
                </div>
              )}
            </div>
          ))}
          {!result && (
            <div style={{ padding: 24, fontSize: 12, color: "var(--fg-3)", textAlign: "center" }}>
              Aplicá condiciones y recalculá para ver universos compatibles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
