"use client";

import { useMemo, useState } from "react";
import { api, pct, type MatchPrediction, type Team } from "@/lib/api";

export function CustomPredictor({ teams, defaultHome, defaultAway }: {
  teams: Team[];
  defaultHome?: string;
  defaultAway?: string;
}) {
  const sorted = useMemo(
    () => [...teams].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0)),
    [teams],
  );
  const [home, setHome] = useState(defaultHome ?? sorted[0]?.team_id ?? "");
  const [away, setAway] = useState(defaultAway ?? sorted[1]?.team_id ?? "");
  const [neutral, setNeutral] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchPrediction | null>(null);

  const swap = () => { setHome(away); setAway(home); };

  const onPredict = async () => {
    if (home === away) {
      setError("Elegí dos equipos distintos");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.predictCustom(home, away, neutral);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Error al predecir");
    } finally {
      setLoading(false);
    }
  };

  const homeTeam = teams.find((t) => t.team_id === home);
  const awayTeam = teams.find((t) => t.team_id === away);

  return (
    <div>
      {/* Selectors */}
      <div className="agm-card agm-card-pad" style={{ marginBottom: 24 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 16,
          alignItems: "end",
        }}>
          <TeamSelect label="LOCAL" value={home} onChange={setHome} teams={sorted} />
          <button
            onClick={swap}
            className="agm-btn-icon"
            title="Invertir local/visitante"
            style={{ marginBottom: 1 }}
          >
            ⇄
          </button>
          <TeamSelect label="VISITANTE" value={away} onChange={setAway} teams={sorted} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, gap: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-2)", fontSize: 12 }}>
            <input
              type="checkbox"
              checked={neutral}
              onChange={(e) => setNeutral(e.target.checked)}
            />
            Cancha neutral (default Mundial)
          </label>
          <button
            onClick={onPredict}
            disabled={loading || home === away}
            className="agm-btn agm-btn-primary"
            style={{ minWidth: 200, justifyContent: "center", opacity: loading || home === away ? 0.5 : 1 }}
          >
            {loading ? "CALCULANDO..." : "PREDECIR PARTIDO"}
          </button>
        </div>
        {error && (
          <div className="agm-pill agm-pill-red" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <PredictionResult result={result} homeTeam={homeTeam} awayTeam={awayTeam} />
      )}
    </div>
  );
}

function TeamSelect({ label, value, onChange, teams }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  teams: Team[];
}) {
  const selected = teams.find((t) => t.team_id === value);
  return (
    <div>
      <label className="agm-label">{label}</label>
      <div style={{ position: "relative" }}>
        {selected && (
          <span className="agm-flag-emoji" style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: 20, pointerEvents: "none",
          }}>{selected.flag_emoji}</span>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="agm-input"
          style={{ paddingLeft: 44, fontSize: 14, fontWeight: 600, height: 48 }}
        >
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.fifa_code} · {t.name} (Elo {t.elo ? Math.round(t.elo) : "—"})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PredictionResult({ result, homeTeam, awayTeam }: {
  result: MatchPrediction;
  homeTeam?: Team;
  awayTeam?: Team;
}) {
  const top = result.top_scorelines?.[0]?.p ?? 1;
  return (
    <div className="agm-card agm-anim-blur" style={{ overflow: "hidden" }}>
      <div className="agm-card-h">
        <h3>PREDICCIÓN</h3>
        <span className="agm-card-eyebrow">{result.model_version}</span>
      </div>

      {/* VS row */}
      <div style={{
        padding: 28,
        background: "var(--bg-2)",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16,
      }}>
        <ResultSide team={homeTeam} p={result.p_home} lambda={result.lambda_home} />
        <div className="agm-display" style={{ fontSize: 22, color: "var(--fg-3)" }}>VS</div>
        <ResultSide team={awayTeam} p={result.p_away} lambda={result.lambda_away} right />
      </div>

      {/* Probability bar */}
      <div style={{ padding: 24, borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 12 }}>
          <div style={{ flex: result.p_home, background: "var(--green)" }} />
          <div style={{ flex: result.p_draw, background: "var(--fg-3)" }} />
          <div style={{ flex: result.p_away, background: "var(--violet)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", marginTop: 12 }}>
          <Cell label={`GANA ${homeTeam?.fifa_code ?? "LOCAL"}`} value={pct(result.p_home)} color="var(--green-deep)" />
          <Cell label="EMPATE" value={pct(result.p_draw)} />
          <Cell label={`GANA ${awayTeam?.fifa_code ?? "VISITA"}`} value={pct(result.p_away)} color="var(--violet)" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 18, gap: 16, textAlign: "center" }}>
          <Mini label="Goles esp. local" value={result.lambda_home.toFixed(2)} />
          <Mini label="O/U 2.5" value={result.p_over_2_5 != null ? pct(result.p_over_2_5) : "—"} />
          <Mini label="Goles esp. visita" value={result.lambda_away.toFixed(2)} />
        </div>
      </div>

      {/* Top scorelines */}
      <div style={{ padding: 24, borderBottom: "1px solid var(--line)" }}>
        <div className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
          RESULTADOS MÁS PROBABLES
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(result.top_scorelines ?? []).slice(0, 8).map((s) => {
            const [h, a] = s.score.split("-").map(Number);
            const winLabel = h > a ? homeTeam?.fifa_code ?? "Local"
              : h < a ? awayTeam?.fifa_code ?? "Visita" : "Empate";
            const winColor = h > a ? "var(--green-deep)" : h < a ? "var(--violet)" : "var(--fg-2)";
            return (
              <li key={s.score} style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr 80px 60px",
                gap: 10,
                padding: "8px 0",
                alignItems: "center",
                borderBottom: "1px solid var(--line)",
              }}>
                <span className="agm-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-0)" }}>
                  {homeTeam?.flag_emoji} {h} – {a} {awayTeam?.flag_emoji}
                </span>
                <div className="agm-bar" style={{ height: 5 }}>
                  <div className="agm-bar-fill" style={{ width: `${(s.p / top) * 100}%` }} />
                </div>
                <span className="agm-mono" style={{ fontSize: 11, color: winColor, fontWeight: 600 }}>
                  → {winLabel}
                </span>
                <span className="agm-mono agm-num" style={{ fontSize: 13, color: "var(--green-deep)", fontWeight: 700, textAlign: "right" }}>
                  {pct(s.p, 1)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Factors */}
      {result.top_factors?.length > 0 && (
        <div style={{ padding: 24 }}>
          <div className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
            FACTORES CLAVE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.top_factors.map((f, i) => (
              <span key={i} className={`agm-pill ${f.direction === "home" ? "agm-pill-green" : f.direction === "away" ? "agm-pill-violet" : ""}`}>
                {f.name.replace(/_/g, " ")} · {f.direction === "home" ? "→ local" : f.direction === "away" ? "→ visita" : "neutral"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultSide({ team, p, lambda, right }: { team?: Team; p: number; lambda: number; right?: boolean }) {
  return (
    <div style={{ textAlign: right ? "right" : "left" }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>{team?.flag_emoji ?? "🏳️"}</div>
      <div className="agm-display" style={{ fontSize: 28, color: "var(--fg-0)", marginTop: 4 }}>
        {team?.fifa_code ?? "—"}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>{team?.name ?? ""}</div>
      <div className="agm-mono agm-num" style={{
        marginTop: 10, fontSize: 22, color: "var(--green-deep)", fontWeight: 700,
      }}>{pct(p)}</div>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
        xG {lambda.toFixed(2)}
      </div>
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="agm-display agm-num" style={{ fontSize: 24, color: color ?? "var(--fg-0)" }}>{value}</div>
      <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.1em", marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div className="agm-mono agm-num" style={{ fontSize: 16, color: "var(--fg-1)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
