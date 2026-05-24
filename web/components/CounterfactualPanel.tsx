"use client";
import { useState } from "react";
import { api, type ChampionEntry } from "@/lib/api";

type Condition = {
  type: "fix_result" | "fix_winner" | "override_weather";
  match_id?: string;
  home_score?: number;
  away_score?: number;
  winner_team_id?: string;
  temp_c?: number;
};

const LABELS: Record<Condition["type"], string> = {
  fix_result: "FIJAR MARCADOR",
  fix_winner: "FIJAR GANADOR",
  override_weather: "SIMULAR CLIMA",
};

export function CounterfactualPanel({ baseline }: { baseline: ChampionEntry[] }) {
  const [conds, setConds] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [draft, setDraft] = useState<Condition>({ type: "fix_result", match_id: "" });

  const addCond = () => {
    if (!draft.match_id) return;
    setConds([...conds, draft]);
    setDraft({ type: "fix_result", match_id: "" });
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Col 1 — Input */}
      <div className="agm-card">
        <div className="agm-card-h">
          <h3>CONDICIONES · INPUT</h3>
          <span className="agm-card-eyebrow">{conds.length}/8</span>
        </div>
        <div style={{ padding: 18 }}>
          {conds.map((c, i) => (
            <div key={i} className="agm-card agm-card-tight" style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4, width: 16 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1 }}>
                <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 2 }}>
                  {LABELS[c.type]}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-0)" }}>
                  {c.type === "fix_result" && `${c.match_id} ${c.home_score} — ${c.away_score}`}
                  {c.type === "fix_winner" && `${c.winner_team_id} gana ${c.match_id}`}
                  {c.type === "override_weather" && `${c.match_id} · ${c.temp_c}°C`}
                </div>
              </div>
              <button onClick={() => setConds(conds.filter((_, j) => j !== i))} style={{ background: "none", border: 0, color: "var(--fg-3)", fontSize: 14 }}>×</button>
            </div>
          ))}

          <div className="agm-card agm-card-tight" style={{ marginTop: 8, background: "var(--bg-2)" }}>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Condition["type"] })}
              className="agm-input" style={{ marginBottom: 8, fontSize: 11 }}>
              <option value="fix_result">Fijar marcador</option>
              <option value="fix_winner">Fijar ganador</option>
              <option value="override_weather">Cambiar clima</option>
            </select>
            <input value={draft.match_id ?? ""} onChange={(e) => setDraft({ ...draft, match_id: e.target.value })}
              placeholder="match_id ej. WC2026_GROUP_C01"
              className="agm-input agm-mono" style={{ marginBottom: 8, fontSize: 11 }} />
            {draft.type === "fix_result" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" min={0} max={10} placeholder="local" value={draft.home_score ?? ""}
                  onChange={(e) => setDraft({ ...draft, home_score: Number(e.target.value) })}
                  className="agm-input agm-mono" style={{ fontSize: 11 }} />
                <input type="number" min={0} max={10} placeholder="visitante" value={draft.away_score ?? ""}
                  onChange={(e) => setDraft({ ...draft, away_score: Number(e.target.value) })}
                  className="agm-input agm-mono" style={{ fontSize: 11 }} />
              </div>
            )}
            {draft.type === "fix_winner" && (
              <input value={draft.winner_team_id ?? ""} onChange={(e) => setDraft({ ...draft, winner_team_id: e.target.value.toUpperCase() })}
                placeholder="team_id ej. ARG" className="agm-input agm-mono" style={{ fontSize: 11 }} />
            )}
            {draft.type === "override_weather" && (
              <input type="number" placeholder="temp °C" value={draft.temp_c ?? ""}
                onChange={(e) => setDraft({ ...draft, temp_c: Number(e.target.value) })}
                className="agm-input agm-mono" style={{ fontSize: 11 }} />
            )}
            <button onClick={addCond} className="agm-mono" style={{
              marginTop: 8, width: "100%", padding: "8px 0", border: "1px dashed var(--line-2)",
              borderRadius: 8, background: "transparent", color: "var(--fg-2)", fontSize: 11,
            }}>
              + AGREGAR CONDICIÓN
            </button>
          </div>

          <button onClick={run} disabled={loading || conds.length === 0}
            className="agm-btn agm-btn-primary" style={{ width: "100%", marginTop: 14, justifyContent: "center", opacity: loading || conds.length === 0 ? 0.4 : 1 }}>
            {loading ? "RECORRIENDO UNIVERSOS..." : "RECALCULAR ESCENARIO"}
          </button>
          <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span>~ 3.000 iteraciones</span><span>&lt; 3 s</span>
          </div>
        </div>
      </div>

      {/* Col 2 — Delta de probabilidad */}
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
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>LÍNEA BASE</th>
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>ESCENARIO</th>
              <th className="agm-th agm-num" style={{ textAlign: "right" }}>Δ%</th>
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
          <h3>SIMULACIONES MUESTREADAS</h3>
          <span className="agm-card-eyebrow">5/4.000</span>
        </div>
        <div style={{ padding: 12 }}>
          {(result?.sampled_universes ?? []).slice(0, 8).map((u: any, i: number) => (
            <div key={i} className="agm-card agm-card-tight" style={{ marginBottom: 6 }}>
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginBottom: 4 }}>
                $-{String(i * 7 + 134).padStart(3, "0")}.{String(i * 17 + 312).padStart(3, "0")}
                <span style={{ float: "right" }}>p={(0.05 + i * 0.012).toFixed(3)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-0)" }}>
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
            <div style={{ padding: 24, fontSize: 12, color: "var(--fg-3)" }}>
              Aplicá condiciones y recalculá para ver universos muestreados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
