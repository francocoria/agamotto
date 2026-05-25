"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { api, pct, type Team } from "@/lib/api";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface TeamStats {
  form_pct: number | null;
  form_pts: number[];
  gf_avg: number | null;
  ga_avg: number | null;
  gd_avg: number | null;
  possession_avg: number | null;
  shots_avg: number | null;
  sot_avg: number | null;
  corners_avg: number | null;
  early_goals_avg: number | null;
  fouls_avg: number | null;
  yellows_avg: number | null;
  reds_avg: number | null;
  shot_efficiency: number | null;
  conversion_rate: number | null;
  matches_analyzed: number;
}

interface TeamAnalysis {
  team_id: string;
  name: string;
  flag: string;
  elo: number | null;
  fifa_rank: number | null;
  confederation: string;
  recent_form: ("W" | "D" | "L")[];
  recent_matches: {
    date: string;
    opponent: string;
    score: string;
    result: "W" | "D" | "L";
    tournament: string;
    is_home: boolean;
  }[];
  stats: TeamStats;
}

interface H2H {
  total_matches: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  recent: { date: string; home: string; away: string; score: string; tournament: string }[];
}

interface AnalysisData {
  home: TeamAnalysis;
  away: TeamAnalysis;
  h2h: H2H;
  n_matches: number;
}

interface PredictionData {
  p_home: number;
  p_draw: number;
  p_away: number;
  lambda_home: number;
  lambda_away: number;
  p_over_2_5?: number | null;
  p_btts?: number | null;
  top_scorelines: { score: string; p: number }[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Eye of Agamotto animated SVG
// ──────────────────────────────────────────────────────────────────────────────
function EyeOfAgamotto({ size = 120, active = false }: { size?: number; active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.44;

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);

      // Outer glow ring
      const outerGrd = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.1);
      outerGrd.addColorStop(0, "rgba(34,217,126,0.0)");
      outerGrd.addColorStop(0.6, active ? "rgba(34,217,126,0.22)" : "rgba(34,217,126,0.08)");
      outerGrd.addColorStop(1, "rgba(34,217,126,0.0)");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = outerGrd;
      ctx.fill();

      // Rotating runes ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.4);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const rx = Math.cos(angle) * R * 0.88;
        const ry = Math.sin(angle) * R * 0.88;
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,217,126,${0.4 + 0.3 * Math.sin(t * 1.5 + i)})`;
        ctx.fill();
      }
      ctx.restore();

      // Inner counter-rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.25);
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const rx = Math.cos(angle) * R * 0.68;
        const ry = Math.sin(angle) * R * 0.68;
        ctx.beginPath();
        ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(123,82,255,${0.3 + 0.25 * Math.sin(t * 2 + i)})`;
        ctx.fill();
      }
      ctx.restore();

      // Main iris circle
      const irisGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      irisGrd.addColorStop(0, "#0a9956");
      irisGrd.addColorStop(0.45, "#22d97e");
      irisGrd.addColorStop(0.75, "#075a32");
      irisGrd.addColorStop(1, "#06090d");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = irisGrd;
      ctx.fill();

      // Iris lines
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.12);
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * R * 0.12, Math.sin(angle) * R * 0.12);
        ctx.lineTo(Math.cos(angle) * R * 0.50, Math.sin(angle) * R * 0.50);
        ctx.strokeStyle = "rgba(10,153,86,0.35)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      ctx.restore();

      // Pupil (black)
      const pupilR = R * 0.18 + (active ? R * 0.04 * Math.sin(t * 2) : 0);
      const pupilGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, pupilR);
      pupilGrd.addColorStop(0, "#000000");
      pupilGrd.addColorStop(0.7, "#060a0d");
      pupilGrd.addColorStop(1, "rgba(6,10,13,0.9)");
      ctx.beginPath();
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = pupilGrd;
      ctx.fill();

      // Pupil highlight
      ctx.beginPath();
      ctx.arc(cx - pupilR * 0.28, cy - pupilR * 0.28, pupilR * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fill();

      // Outer ring border
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      const borderGrd = ctx.createConicGradient
        ? ctx.createConicGradient(t * 0.4, cx, cy)
        : null;
      if (borderGrd) {
        borderGrd.addColorStop(0, "#22d97e");
        borderGrd.addColorStop(0.25, "rgba(34,217,126,0.2)");
        borderGrd.addColorStop(0.5, "#7b52ff");
        borderGrd.addColorStop(0.75, "rgba(123,82,255,0.2)");
        borderGrd.addColorStop(1, "#22d97e");
        ctx.strokeStyle = borderGrd;
      } else {
        ctx.strokeStyle = "rgba(34,217,126,0.6)";
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function loop() {
      tRef.current += 0.016;
      draw(tRef.current);
      animRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [size, active]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// Stat bar comparison
// ──────────────────────────────────────────────────────────────────────────────
function StatBar({
  label,
  homeVal,
  awayVal,
  format = (v: number) => v.toFixed(2),
  higherIsBetter = true,
  unit = "",
}: {
  label: string;
  homeVal: number | null;
  awayVal: number | null;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
  unit?: string;
}) {
  if (homeVal == null && awayVal == null) return null;
  const h = homeVal ?? 0;
  const a = awayVal ?? 0;
  const total = h + a;
  const homePct = total > 0 ? (h / total) * 100 : 50;
  const awayPct = 100 - homePct;
  const homeWins = higherIsBetter ? h >= a : h <= a;
  const awayWins = higherIsBetter ? a > h : a < h;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 5, gap: 12,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
          color: homeWins ? "var(--green-deep)" : "var(--fg-2)",
          minWidth: 56, textAlign: "right",
        }}>
          {homeVal != null ? format(homeVal) + unit : "—"}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em",
          color: "var(--fg-3)", textTransform: "uppercase", flex: 1, textAlign: "center",
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
          color: awayWins ? "var(--violet)" : "var(--fg-2)",
          minWidth: 56,
        }}>
          {awayVal != null ? format(awayVal) + unit : "—"}
        </span>
      </div>
      <div style={{ display: "flex", height: 5, borderRadius: 999, overflow: "hidden", gap: 1 }}>
        <div style={{
          flex: homePct, background: homeWins
            ? "linear-gradient(90deg, var(--green-deep), var(--green))"
            : "var(--bg-3)",
          borderRadius: "999px 0 0 999px",
          transition: "flex 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
        <div style={{
          flex: awayPct, background: awayWins
            ? "linear-gradient(90deg, var(--violet), var(--violet-soft))"
            : "var(--bg-3)",
          borderRadius: "0 999px 999px 0",
          transition: "flex 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Form dots
// ──────────────────────────────────────────────────────────────────────────────
function FormDots({ form, align = "left" }: { form: string[]; align?: "left" | "right" }) {
  const color = (r: string) =>
    r === "W" ? "var(--green)" : r === "D" ? "var(--fg-3)" : "var(--red)";
  return (
    <div style={{
      display: "flex", gap: 4,
      flexDirection: align === "right" ? "row-reverse" : "row",
    }}>
      {form.map((r, i) => (
        <div key={i} title={r} style={{
          width: 20, height: 20, borderRadius: 5,
          background: color(r),
          opacity: 0.85 + 0.15 * (i / Math.max(form.length - 1, 1)),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "#fff",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
        }}>{r}</div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Team selector
// ──────────────────────────────────────────────────────────────────────────────
function TeamSelect({
  label, value, onChange, teams,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  teams: Team[];
}) {
  const selected = teams.find((t) => t.team_id === value);
  return (
    <div>
      <label style={{
        display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 6,
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        {selected && (
          <span style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 24, pointerEvents: "none", fontFamily: "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif",
          }}>{selected.flag_emoji}</span>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="agm-input"
          style={{ paddingLeft: 52, fontSize: 14, fontWeight: 700, height: 54 }}
        >
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.fifa_code} · {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export function AnalisisView({ teams }: { teams: Team[] }) {
  const sorted = useMemo(() => [...teams].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0)), [teams]);

  const [home, setHome] = useState(sorted[0]?.team_id ?? "");
  const [away, setAway] = useState(sorted[1]?.team_id ?? "");
  const [n, setN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eyeActive, setEyeActive] = useState(false);

  const analyze = useCallback(async () => {
    if (!home || !away || home === away) return;
    setLoading(true);
    setEyeActive(true);
    setError(null);

    try {
      const [analysisRes, predRes] = await Promise.all([
        api.analyze(home, away, n),
        api.predictCustom(home, away, true).catch(() => null),
      ]);
      setData(analysisRes);
      setPrediction(predRes as any);
    } catch (e: any) {
      setError(e?.message ?? "Error al analizar");
    } finally {
      setLoading(false);
      setTimeout(() => setEyeActive(false), 1500);
    }
  }, [home, away, n]);

  // Auto-trigger on change
  useEffect(() => {
    const timer = setTimeout(analyze, 300);
    return () => clearTimeout(timer);
  }, [analyze]);

  const swap = () => { setHome(away); setAway(home); };

  return (
    <div>
      {/* Selector panel */}
      <div className="agm-card agm-card-pad" style={{ marginBottom: 28 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto 1fr",
          gap: 16, alignItems: "end",
        }}>
          <TeamSelect label="EQUIPO LOCAL" value={home} onChange={setHome} teams={sorted} />

          {/* Eye central */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, paddingBottom: 2,
          }}>
            <EyeOfAgamotto size={58} active={loading || eyeActive} />
          </div>

          <button onClick={swap} className="agm-btn-icon" style={{
            width: 40, height: 40, marginBottom: 2, fontSize: 18,
          }} title="Intercambiar">⇄</button>

          <TeamSelect label="EQUIPO VISITANTE" value={away} onChange={setAway} teams={sorted} />
        </div>

        {/* N selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-3)", letterSpacing: "0.14em" }}>
            ANALIZAR ÚLTIMOS
          </span>
          {[5, 10, 15, 20].map((val) => (
            <button
              key={val}
              onClick={() => setN(val)}
              className={`agm-pill${n === val ? " agm-pill-green" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              {val} partidos
            </button>
          ))}
          {loading && (
            <span className="agm-pill" style={{ fontSize: 9, animationName: "agm-pulse", animationDuration: "1.2s", animationIterationCount: "infinite" }}>
              ⟳ CALCULANDO...
            </span>
          )}
          {error && <span className="agm-pill agm-pill-red">{error}</span>}
        </div>
      </div>

      {data && (
        <div className="agm-stagger">
          {/* Hero: predicción 1X2 */}
          {prediction && (
            <div className="agm-card agm-anim-blur" style={{ marginBottom: 20, overflow: "hidden" }}>
              <div className="agm-card-h">
                <h3>PREDICCIÓN ENSEMBLE</h3>
                <span className="agm-card-eyebrow">Cancha neutral · Modelo calibrado</span>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 0, borderBottom: "1px solid var(--line)",
              }}>
                <div style={{
                  padding: "22px 24px", textAlign: "center",
                  borderRight: "1px solid var(--line)", background: "var(--green-bg)",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 4, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>
                    {data.home.flag}
                  </div>
                  <div className="agm-display" style={{ fontSize: 22, color: "var(--fg-0)" }}>{data.home.team_id}</div>
                  <div className="agm-mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--green-deep)", marginTop: 8 }}>
                    {pct(prediction.p_home)}
                  </div>
                  <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                    xG {prediction.lambda_home.toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: "22px 20px", textAlign: "center" }}>
                  <div style={{ marginBottom: 12, marginTop: 8 }}>
                    <EyeOfAgamotto size={56} active={false} />
                  </div>
                  <div className="agm-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-1)" }}>
                    {pct(prediction.p_draw)}
                  </div>
                  <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginTop: 2 }}>
                    EMPATE
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
                    {prediction.p_over_2_5 != null && (
                      <span className="agm-pill agm-pill-green" style={{ fontSize: 9 }}>
                        O/U 2.5: {pct(prediction.p_over_2_5)}
                      </span>
                    )}
                    {prediction.p_btts != null && (
                      <span className="agm-pill" style={{ fontSize: 9 }}>
                        BTTS: {pct(prediction.p_btts)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{
                  padding: "22px 24px", textAlign: "center",
                  borderLeft: "1px solid var(--line)", background: "var(--violet-bg)",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 4, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>
                    {data.away.flag}
                  </div>
                  <div className="agm-display" style={{ fontSize: 22, color: "var(--fg-0)" }}>{data.away.team_id}</div>
                  <div className="agm-mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--violet)", marginTop: 8 }}>
                    {pct(prediction.p_away)}
                  </div>
                  <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                    xG {prediction.lambda_away.toFixed(2)}
                  </div>
                </div>
              </div>
              {/* Probability bar */}
              <div style={{ padding: "12px 24px" }}>
                <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ flex: prediction.p_home, background: "linear-gradient(90deg, var(--green-deep), var(--green))" }} />
                  <div style={{ flex: prediction.p_draw, background: "var(--bg-3)" }} />
                  <div style={{ flex: prediction.p_away, background: "linear-gradient(90deg, var(--violet), var(--violet-soft))" }} />
                </div>
              </div>

              {/* Top scorelines */}
              {prediction.top_scorelines?.length > 0 && (
                <div style={{ padding: "0 24px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {prediction.top_scorelines.slice(0, 8).map((s) => {
                    const [h, a] = s.score.split("-").map(Number);
                    const col = h > a ? "var(--green-bg)" : h < a ? "var(--violet-bg)" : "var(--bg-2)";
                    return (
                      <div key={s.score} style={{
                        padding: "5px 12px", borderRadius: 8, background: col,
                        border: "1px solid var(--line)", display: "flex", flexDirection: "column", alignItems: "center",
                      }}>
                        <span className="agm-mono" style={{ fontSize: 14, fontWeight: 700 }}>{s.score}</span>
                        <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{pct(s.p, 1)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stats comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Forma y perfil */}
            <div className="agm-card">
              <div className="agm-card-h">
                <h3>FORMA RECIENTE</h3>
                <span className="agm-card-eyebrow">Últimos 5 partidos</span>
              </div>
              <div style={{ padding: "18px 22px" }}>
                {/* Home */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.home.flag}</span>
                    <div>
                      <div className="agm-display" style={{ fontSize: 14, color: "var(--fg-0)" }}>{data.home.team_id}</div>
                      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
                        Elo {data.home.elo ? Math.round(data.home.elo) : "—"} · #{data.home.fifa_rank ?? "—"}
                      </div>
                    </div>
                  </div>
                  <FormDots form={data.home.recent_form} />
                </div>

                <div className="agm-rune-line" style={{ marginBottom: 14 }} />

                {/* Away */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.away.flag}</span>
                    <div>
                      <div className="agm-display" style={{ fontSize: 14, color: "var(--fg-0)" }}>{data.away.team_id}</div>
                      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
                        Elo {data.away.elo ? Math.round(data.away.elo) : "—"} · #{data.away.fifa_rank ?? "—"}
                      </div>
                    </div>
                  </div>
                  <FormDots form={data.away.recent_form} align="right" />
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>
                    FORMA {n} PARTIDOS
                  </div>
                  <StatBar
                    label="% Puntos"
                    homeVal={data.home.stats.form_pct}
                    awayVal={data.away.stats.form_pct}
                    format={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <StatBar
                    label="Goles por partido"
                    homeVal={data.home.stats.gf_avg}
                    awayVal={data.away.stats.gf_avg}
                  />
                  <StatBar
                    label="Goles recibidos"
                    homeVal={data.home.stats.ga_avg}
                    awayVal={data.away.stats.ga_avg}
                    higherIsBetter={false}
                  />
                  <StatBar
                    label="Diferencia de goles"
                    homeVal={data.home.stats.gd_avg}
                    awayVal={data.away.stats.gd_avg}
                  />
                </div>
              </div>
            </div>

            {/* H2H */}
            <div className="agm-card">
              <div className="agm-card-h">
                <h3>HISTORIAL DIRECTO</h3>
                <span className="agm-card-eyebrow">{data.h2h.total_matches} partidos</span>
              </div>
              <div style={{ padding: "18px 22px" }}>
                {data.h2h.total_matches > 0 ? (
                  <>
                    {/* H2H bar */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8, textAlign: "center", marginBottom: 16,
                    }}>
                      <div>
                        <div className="agm-display" style={{ fontSize: 28, color: "var(--green-deep)" }}>
                          {data.h2h.home_wins}
                        </div>
                        <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em" }}>
                          GANA {data.home.team_id}
                        </div>
                      </div>
                      <div>
                        <div className="agm-display" style={{ fontSize: 28, color: "var(--fg-2)" }}>
                          {data.h2h.draws}
                        </div>
                        <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em" }}>
                          EMPATES
                        </div>
                      </div>
                      <div>
                        <div className="agm-display" style={{ fontSize: 28, color: "var(--violet)" }}>
                          {data.h2h.away_wins}
                        </div>
                        <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em" }}>
                          GANA {data.away.team_id}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", height: 7, borderRadius: 999, overflow: "hidden", marginBottom: 16 }}>
                      <div style={{ flex: data.h2h.home_wins, background: "var(--green)" }} />
                      <div style={{ flex: data.h2h.draws, background: "var(--bg-3)" }} />
                      <div style={{ flex: data.h2h.away_wins, background: "var(--violet)" }} />
                    </div>
                    {/* Recent H2H */}
                    <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>ÚLTIMOS ENFRENTAMIENTOS</div>
                    {data.h2h.recent.slice().reverse().slice(0, 5).map((m, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "7px 0", borderBottom: i < 4 ? "1px solid var(--line)" : "none",
                      }}>
                        <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
                          {m.date.substring(0, 7)}
                        </span>
                        <span className="agm-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-0)" }}>
                          {m.home} {m.score} {m.away}
                        </span>
                        <span style={{
                          fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--fg-3)",
                          maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {m.tournament}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--fg-3)", padding: "24px 0" }}>
                    <EyeOfAgamotto size={48} />
                    <p style={{ marginTop: 12, fontSize: 12 }}>Sin historial directo registrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced stats comparison */}
          <div className="agm-card" style={{ marginBottom: 20 }}>
            <div className="agm-card-h">
              <h3>ESTADÍSTICAS AVANZADAS</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="agm-card-eyebrow">{n} partidos · {data.home.stats.matches_analyzed} analiz.</span>
                <span className="agm-pill agm-pill-green" style={{ fontSize: 9 }}>
                  200+ COMBINACIONES
                </span>
              </div>
            </div>
            <div style={{ padding: "18px 28px" }}>
              {/* Headers */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 20, gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 28, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.home.flag}</span>
                  <span className="agm-display" style={{ fontSize: 16, color: "var(--green-deep)" }}>{data.home.name}</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <EyeOfAgamotto size={40} active={loading} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="agm-display" style={{ fontSize: 16, color: "var(--violet)" }}>{data.away.name}</span>
                  <span style={{ fontSize: 28, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.away.flag}</span>
                </div>
              </div>

              {/* Ataque */}
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>⚡ PODER OFENSIVO</div>
              <StatBar label="Remates por partido" homeVal={data.home.stats.shots_avg} awayVal={data.away.stats.shots_avg} />
              <StatBar label="Remates al arco" homeVal={data.home.stats.sot_avg} awayVal={data.away.stats.sot_avg} />
              <StatBar label="Eficiencia de tiro" homeVal={data.home.stats.shot_efficiency} awayVal={data.away.stats.shot_efficiency} format={(v) => `${(v * 100).toFixed(0)}%`} />
              <StatBar label="Tasa de conversión" homeVal={data.home.stats.conversion_rate} awayVal={data.away.stats.conversion_rate} format={(v) => `${(v * 100).toFixed(0)}%`} />
              <StatBar label="Tiros de esquina" homeVal={data.home.stats.corners_avg} awayVal={data.away.stats.corners_avg} />
              <StatBar label="Goles primeros 10 min" homeVal={data.home.stats.early_goals_avg} awayVal={data.away.stats.early_goals_avg} format={(v) => v.toFixed(2)} />

              <div className="agm-rune-line" style={{ margin: "16px 0" }} />

              {/* Control */}
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>🔄 CONTROL DE JUEGO</div>
              <StatBar label="Posesión promedio" homeVal={data.home.stats.possession_avg} awayVal={data.away.stats.possession_avg} format={(v) => `${(v * 100).toFixed(0)}%`} />

              <div className="agm-rune-line" style={{ margin: "16px 0" }} />

              {/* Disciplina */}
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>🟨 DISCIPLINA</div>
              <StatBar label="Faltas cometidas" homeVal={data.home.stats.fouls_avg} awayVal={data.away.stats.fouls_avg} higherIsBetter={false} />
              <StatBar label="Tarjetas amarillas" homeVal={data.home.stats.yellows_avg} awayVal={data.away.stats.yellows_avg} higherIsBetter={false} />
              <StatBar label="Tarjetas rojas" homeVal={data.home.stats.reds_avg} awayVal={data.away.stats.reds_avg} higherIsBetter={false} format={(v) => v.toFixed(2)} />
            </div>
          </div>

          {/* Recent matches side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[data.home, data.away].map((team, idx) => (
              <div key={team.team_id} className="agm-card">
                <div className="agm-card-h">
                  <h3>{team.flag} {team.team_id} — RECIENTES</h3>
                  <span className="agm-card-eyebrow">{team.confederation}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {team.recent_matches.map((m, i) => {
                      const col = m.result === "W" ? "var(--green)" : m.result === "D" ? "var(--fg-3)" : "var(--red)";
                      return (
                        <tr key={i} className="agm-tr-hover">
                          <td style={{ padding: "9px 16px", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
                            {m.date.substring(0, 7)}
                          </td>
                          <td style={{ padding: "9px 8px", fontSize: 11 }}>
                            {m.is_home ? "🏠" : "✈️"} {m.opponent}
                          </td>
                          <td style={{ padding: "9px 8px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700 }}>
                            {m.score}
                          </td>
                          <td style={{ padding: "9px 16px", textAlign: "right" }}>
                            <span style={{
                              display: "inline-block", width: 22, height: 22, borderRadius: 5,
                              background: col, color: "#fff",
                              fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
                              lineHeight: "22px", textAlign: "center",
                            }}>{m.result}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
