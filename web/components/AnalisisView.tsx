"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { api, pct, type Team } from "@/lib/api";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface HalfStats {
  goals_avg: number | null;
  possession_avg: number | null;
  shots_avg: number | null;
  sot_avg: number | null;
  corners_avg: number | null;
  fouls_avg: number | null;
  free_kicks_avg: number | null;
  offsides_avg: number | null;
  xg_avg: number | null;
}

interface GoalPeriods {
  p_0_15: number | null;
  p_15_30: number | null;
  p_30_45: number | null;
  p_45_60: number | null;
  p_60_75: number | null;
  p_75_90: number | null;
  p_90plus: number | null;
}

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

  // Advanced stats
  xg_avg: number | null;
  free_kicks_avg: number | null;
  offsides_avg: number | null;
  passes_avg: number | null;
  pass_accuracy_avg: number | null;
  aerials_won_avg: number | null;
  saves_avg: number | null;

  // Splits
  first_half?: HalfStats;
  second_half?: HalfStats;

  // Periods
  periods?: GoalPeriods;

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
// Poisson helpers
// ──────────────────────────────────────────────────────────────────────────────
function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function pOverGoals(lH: number, lA: number, line: number): number {
  let pUnder = 0;
  for (let h = 0; h <= 10; h++) {
    for (let a = 0; a <= 10; a++) {
      if (h + a <= line) pUnder += poissonPMF(lH, h) * poissonPMF(lA, a);
    }
  }
  return Math.max(0, Math.min(1, 1 - pUnder));
}

function pBTTS(lH: number, lA: number): number {
  return (1 - poissonPMF(lH, 0)) * (1 - poissonPMF(lA, 0));
}

function pExactGoals(lH: number, lA: number, total: number): number {
  let p = 0;
  for (let h = 0; h <= total; h++) p += poissonPMF(lH, h) * poissonPMF(lA, total - h);
  return p;
}

function pDoubleChance(pH: number, pD: number, pA: number, type: "1X" | "X2" | "12"): number {
  if (type === "1X") return pH + pD;
  if (type === "X2") return pD + pA;
  return pH + pA;
}

function pHTResult(lH: number, lA: number): { p1: number; pX: number; p2: number } {
  const lHH = lH * 0.48, lHA = lA * 0.48;
  let p1 = 0, pX = 0, p2 = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = poissonPMF(lHH, h) * poissonPMF(lHA, a);
      if (h > a) p1 += p;
      else if (h === a) pX += p;
      else p2 += p;
    }
  }
  return { p1, pX, p2 };
}

function pOverStat(avg: number, line: number): number {
  return Math.max(0, Math.min(1, 1 - Math.exp(-avg) * Array.from({ length: Math.floor(line) + 1 }, (_, k) => poissonPMF(avg, k)).reduce((s, v) => s + v, 0)));
}

function pOverLine(expectedTotal: number, line: number): number {
  return pOverStat(expectedTotal, line);
}

// ──────────────────────────────────────────────────────────────────────────────
// Pronóstico panel — informativo, lenguaje simple
// ──────────────────────────────────────────────────────────────────────────────
function ProbRow({
  label, p, color = "var(--green)", note,
}: { label: string; p: number; color?: string; note?: string }) {
  const pct100 = Math.round(p * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--fg-1)", fontFamily: "var(--font-sans)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          {note && <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-sans)" }}>{note}</span>}
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: pct100 >= 60 ? color : "var(--fg-1)" }}>
            {pct100}%
          </span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--bg-3)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct100}%`,
          background: color,
          borderRadius: 99,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

function Insight({ text, type = "neutral" }: { text: string; type?: "good" | "neutral" | "info" }) {
  const bg = type === "good" ? "var(--green-bg-2)" : type === "info" ? "var(--violet-bg)" : "var(--bg-2)";
  const col = type === "good" ? "var(--green)" : type === "info" ? "var(--violet)" : "var(--fg-2)";
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 9,
      background: bg, border: `1px solid ${type === "good" ? "rgba(34,217,126,0.2)" : type === "info" ? "rgba(123,82,255,0.2)" : "var(--line)"}`,
      fontSize: 13, color: col, fontFamily: "var(--font-sans)", lineHeight: 1.5,
    }}>
      {text}
    </div>
  );
}

interface PronosticoPanelProps {
  prediction: PredictionData;
  homeStats: TeamStats;
  awayStats: TeamStats;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
}

function PronosticoPanel({ prediction, homeStats, awayStats, homeId, awayId, homeName, awayName }: PronosticoPanelProps) {
  const { p_home: pH, p_draw: pD, p_away: pA, lambda_home: lH, lambda_away: lA } = prediction;

  const pO25 = pOverGoals(lH, lA, 2);
  const pBtts = pBTTS(lH, lA);

  const pG0 = pExactGoals(lH, lA, 0);
  const pG1 = pExactGoals(lH, lA, 1);
  const pG2 = pExactGoals(lH, lA, 2);
  const pG3 = pExactGoals(lH, lA, 3);
  const pG4 = pExactGoals(lH, lA, 4);
  const pG5p = 1 - pG0 - pG1 - pG2 - pG3 - pG4;

  const p1X = pDoubleChance(pH, pD, pA, "1X");
  const pX2 = pDoubleChance(pH, pD, pA, "X2");
  const p12 = pDoubleChance(pH, pD, pA, "12");

  const ht = pHTResult(lH, lA);

  // Corners
  const hCorners = homeStats.corners_avg ?? 4.5;
  const aCorners = awayStats.corners_avg ?? 4.5;
  const expCorners = hCorners + aCorners;
  const pC75 = pOverLine(expCorners, 7);
  const pC95 = pOverLine(expCorners, 9);
  const pC115 = pOverLine(expCorners, 11);

  // Cards
  const hCards = (homeStats.yellows_avg ?? 1.5) + 2 * (homeStats.reds_avg ?? 0.05);
  const aCards = (awayStats.yellows_avg ?? 1.5) + 2 * (awayStats.reds_avg ?? 0.05);
  const expCards = hCards + aCards;
  const pCards35 = pOverLine(expCards, 3);
  const pCards45 = pOverLine(expCards, 4);
  const pCards55 = pOverLine(expCards, 5);
  const pRedCard = 1 - Math.exp(-(homeStats.reds_avg ?? 0.05) - (awayStats.reds_avg ?? 0.05));

  // Shots
  const expShots = (homeStats.shots_avg ?? 10) + (awayStats.shots_avg ?? 10);
  const expSOT = (homeStats.sot_avg ?? 3.5) + (awayStats.sot_avg ?? 3.5);
  const pShots185 = pOverLine(expShots, 18);
  const pShots215 = pOverLine(expShots, 21);
  const pSOT75 = pOverLine(expSOT, 7);

  // Free kicks & offsides
  const expFK = (homeStats.free_kicks_avg ?? 11) + (awayStats.free_kicks_avg ?? 11);
  const expOff = (homeStats.offsides_avg ?? 1.8) + (awayStats.offsides_avg ?? 1.8);
  const pFK195 = pOverLine(expFK, 19);
  const pOff35 = pOverLine(expOff, 3);

  // Goals by period
  const periods = homeStats.periods && awayStats.periods ? {
    "0-15": (homeStats.periods.p_0_15 ?? 0.1) + (awayStats.periods.p_0_15 ?? 0.1),
    "15-30": (homeStats.periods.p_15_30 ?? 0.15) + (awayStats.periods.p_15_30 ?? 0.15),
    "30-45": (homeStats.periods.p_30_45 ?? 0.18) + (awayStats.periods.p_30_45 ?? 0.18),
    "45-60": (homeStats.periods.p_45_60 ?? 0.15) + (awayStats.periods.p_45_60 ?? 0.15),
    "60-75": (homeStats.periods.p_60_75 ?? 0.18) + (awayStats.periods.p_60_75 ?? 0.18),
    "75-90": (homeStats.periods.p_75_90 ?? 0.22) + (awayStats.periods.p_75_90 ?? 0.22),
    "90+": (homeStats.periods.p_90plus ?? 0.04) + (awayStats.periods.p_90plus ?? 0.04),
  } : null;

  const lHFH = lH * 0.48, lAFH = lA * 0.48;
  const pFHO05 = pOverGoals(lHFH, lAFH, 0);
  const pFHO15 = pOverGoals(lHFH, lAFH, 1);
  const lHSH = lH * 0.52, lASH = lA * 0.52;
  const pSHO05 = pOverGoals(lHSH, lASH, 0);
  const pSHO15 = pOverGoals(lHSH, lASH, 1);

  const [activeTab, setActiveTab] = useState<string>("ganador");

  const tabs = [
    { id: "ganador", label: "¿Quién gana?" },
    { id: "goles", label: "Goles" },
    { id: "momentos", label: "Momentos" },
    { id: "juego", label: "Cómo juegan" },
    { id: "disciplina", label: "Disciplina" },
  ];

  return (
    <div className="agm-card agm-anim-blur" style={{ marginBottom: 20 }}>
      <div className="agm-card-h">
        <h3>ANÁLISIS PREDICTIVO</h3>
        <span className="agm-pill agm-pill-green" style={{ fontSize: 9 }}>MODELO ENSEMBLE</span>
      </div>

      {/* Tab nav */}
      <div style={{
        display: "flex", gap: 4, padding: "0 20px 0",
        borderBottom: "1px solid var(--line)", overflowX: "auto", flexWrap: "nowrap",
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 16px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: activeTab === t.id ? "var(--green)" : "var(--fg-2)",
              borderBottom: activeTab === t.id ? "2px solid var(--green)" : "2px solid transparent",
              whiteSpace: "nowrap", transition: "color 0.2s",
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* ── ¿QUIÉN GANA? ── */}
        {activeTab === "ganador" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                RESULTADO FINAL
              </div>
              <ProbRow
                label={`Gana ${homeName}`}
                p={pH}
                color="var(--green)"
                note={pH === Math.max(pH, pD, pA) ? "Favorito" : undefined}
              />
              <ProbRow label="Empate" p={pD} color="var(--fg-2)" />
              <ProbRow
                label={`Gana ${awayName}`}
                p={pA}
                color="var(--violet)"
                note={pA === Math.max(pH, pD, pA) ? "Favorito" : undefined}
              />
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                ¿QUIÉN NO PIERDE?
              </div>
              <ProbRow label={`${homeName} gana o empata`} p={p1X} color="var(--green)" />
              <ProbRow label={`${awayName} empata o gana`} p={pX2} color="var(--violet)" />
              <ProbRow label="El partido se define (no hay empate)" p={p12} color="var(--fg-2)" />
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                PRIMER TIEMPO
              </div>
              <ProbRow label={`${homeName} gana el 1er tiempo`} p={ht.p1} color="var(--green)" />
              <ProbRow label="Empate al descanso" p={ht.pX} color="var(--fg-2)" />
              <ProbRow label={`${awayName} gana el 1er tiempo`} p={ht.p2} color="var(--violet)" />
            </div>

            <div className="agm-rune-line" />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pH > pA && pH > 0.45 && (
                <Insight type="good" text={`El modelo favorece a ${homeName}, con un ${Math.round(pH * 100)}% de probabilidad de ganar.`} />
              )}
              {pA > pH && pA > 0.45 && (
                <Insight type="good" text={`El modelo favorece a ${awayName}, con un ${Math.round(pA * 100)}% de probabilidad de ganar.`} />
              )}
              {Math.abs(pH - pA) < 0.08 && (
                <Insight type="neutral" text={`Partido muy parejo: ${homeName} ${Math.round(pH * 100)}% vs ${awayName} ${Math.round(pA * 100)}%. El empate (${Math.round(pD * 100)}%) es una opción muy válida.`} />
              )}
              {ht.pX > 0.45 && (
                <Insight type="info" text={`Hay un ${Math.round(ht.pX * 100)}% de probabilidad de que el primer tiempo termine igualado.`} />
              )}
              <Insight type="info" text={`El modelo estima ${lH.toFixed(1)} goles esperados para ${homeName} y ${lA.toFixed(1)} para ${awayName}.`} />
            </div>
          </div>
        )}

        {/* ── GOLES ── */}
        {activeTab === "goles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                ¿CUÁNTOS GOLES HABRÁ?
              </div>
              <ProbRow label="Sin goles (0–0)" p={pG0} color="var(--fg-2)" />
              <ProbRow label="1 gol en total" p={pG1} color="var(--fg-2)" />
              <ProbRow label="2 goles en total" p={pG2} color="var(--green)" />
              <ProbRow label="3 goles en total" p={pG3} color="var(--green)" />
              <ProbRow label="4 goles en total" p={pG4} color="var(--fg-2)" />
              <ProbRow label="5 o más goles" p={Math.max(0, pG5p)} color="var(--fg-2)" />
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                ¿ANOTAN LOS DOS EQUIPOS?
              </div>
              <ProbRow label="Ambos equipos anotan al menos 1 gol" p={pBtts} color="var(--green)" />
              <ProbRow label="Algún equipo termina sin anotar" p={1 - pBtts} color="var(--fg-2)" />
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MARCADORES MÁS PROBABLES
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {prediction.top_scorelines?.slice(0, 12).map((s) => {
                  const [h, a] = s.score.split("-").map(Number);
                  const col = h > a ? "var(--green-bg)" : h < a ? "var(--violet-bg)" : "var(--bg-2)";
                  return (
                    <div key={s.score} style={{
                      padding: "8px 14px", borderRadius: 8, background: col,
                      border: "1px solid var(--line)", display: "flex", flexDirection: "column", alignItems: "center",
                    }}>
                      <span className="agm-mono" style={{ fontSize: 15, fontWeight: 700 }}>{s.score}</span>
                      <span className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{pct(s.p, 1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pG2 + pG3 > 0.5 && (
                <Insight type="good" text={`El escenario más probable es 2 o 3 goles en el partido (${Math.round((pG2 + pG3) * 100)}% de chances).`} />
              )}
              {pO25 > 0.6 && (
                <Insight type="good" text={`Alta probabilidad de ver más de 2 goles (${Math.round(pO25 * 100)}%). Ambos ataques son potentes.`} />
              )}
              {pO25 < 0.4 && (
                <Insight type="neutral" text={`El modelo espera un partido cerrado. Lo más probable es que haya menos de 3 goles.`} />
              )}
              {pBtts > 0.55 && (
                <Insight type="info" text={`Hay ${Math.round(pBtts * 100)}% de probabilidad de que los dos equipos anoten. Los dos ataques tienen potencial.`} />
              )}
            </div>
          </div>
        )}

        {/* ── MOMENTOS ── */}
        {activeTab === "momentos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                DISTRIBUCIÓN DE GOLES POR TRAMO (PROMEDIO HISTÓRICO COMBINADO)
              </div>
              {periods ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(periods).map(([period, avg]) => {
                    const maxVal = Math.max(...Object.values(periods));
                    const barPct = maxVal > 0 ? (avg / maxVal) * 100 : 0;
                    return (
                      <div key={period} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", minWidth: 60 }}>{period}&apos;</span>
                        <div style={{ flex: 1, height: 24, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          <div style={{
                            position: "absolute", left: 0, top: 0, bottom: 0,
                            width: `${barPct}%`,
                            background: "linear-gradient(90deg, var(--green-deep), var(--green))",
                            borderRadius: 4, transition: "width 0.5s ease",
                          }} />
                          <span className="agm-mono" style={{
                            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                            fontSize: 10, fontWeight: 700, color: "var(--fg-0)",
                          }}>{avg.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "var(--fg-3)", fontSize: 12 }}>Sin datos de distribución temporal disponibles.</div>
              )}
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                GOLES POR TIEMPO
              </div>
              <ProbRow label="Primer tiempo con al menos 1 gol" p={pFHO05} color="var(--green)" />
              <ProbRow label="Primer tiempo con 2 o más goles" p={pFHO15} color="var(--green)" />
              <ProbRow label="Segundo tiempo con al menos 1 gol" p={pSHO05} color="var(--violet)" />
              <ProbRow label="Segundo tiempo con 2 o más goles" p={pSHO15} color="var(--violet)" />
            </div>

            {periods && (() => {
              const entries = Object.entries(periods);
              const totalGoals = entries.reduce((s, [, v]) => s + v, 0);
              const peakPeriod = entries.reduce((best, curr) => curr[1] > best[1] ? curr : best, entries[0]);
              const lateGoals = (periods["75-90"] ?? 0) + (periods["90+"] ?? 0);
              const lateShare = totalGoals > 0 ? lateGoals / totalGoals : 0;
              return (
                <>
                  <div className="agm-rune-line" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Insight type="info" text={`El tramo más productivo históricamente es el ${peakPeriod[0]}' (${peakPeriod[1].toFixed(2)} goles promedio).`} />
                    {lateShare > 0.3 && (
                      <Insight type="good" text={`Estos equipos marcan mucho al final del partido: el ${Math.round(lateShare * 100)}% de los goles caen después del minuto 75.`} />
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── CÓMO JUEGAN ── */}
        {activeTab === "juego" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>
                TIROS DE ESQUINA
              </div>
              <Insight type="neutral" text={`Se esperan ${expCorners.toFixed(1)} tiros de esquina en total — ${homeName}: ${hCorners.toFixed(1)}, ${awayName}: ${aCorners.toFixed(1)}.`} />
              <div style={{ marginTop: 14 }}>
                <ProbRow label="Más de 7 corners en el partido" p={pC75} color="var(--green)" />
                <ProbRow label="Más de 9 corners en el partido" p={pC95} color="var(--green)" />
                <ProbRow label="Más de 11 corners en el partido" p={pC115} color="var(--fg-2)" />
                <ProbRow label={`${homeName} tiene más corners`} p={hCorners / (hCorners + aCorners)} color="var(--green)" />
                <ProbRow label={`${awayName} tiene más corners`} p={aCorners / (hCorners + aCorners)} color="var(--violet)" />
              </div>
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>
                REMATES
              </div>
              <Insight type="neutral" text={`Se esperan ${expShots.toFixed(1)} remates totales, de los cuales ${expSOT.toFixed(1)} irán al arco.`} />
              <div style={{ marginTop: 14 }}>
                <ProbRow label="Más de 18 remates en el partido" p={pShots185} color="var(--green)" />
                <ProbRow label="Más de 21 remates en el partido" p={pShots215} color="var(--fg-2)" />
                <ProbRow label="Más de 7 remates al arco" p={pSOT75} color="var(--green)" />
              </div>
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>
                TIROS LIBRES Y FUERAS DE JUEGO
              </div>
              <Insight type="neutral" text={`Promedio esperado: ${expFK.toFixed(1)} tiros libres y ${expOff.toFixed(1)} fueras de juego.`} />
              <div style={{ marginTop: 14 }}>
                <ProbRow label="Más de 19 tiros libres" p={pFK195} color="var(--green)" />
                <ProbRow label="Más de 3 fueras de juego" p={pOff35} color="var(--fg-2)" />
              </div>
            </div>
          </div>
        )}

        {/* ── DISCIPLINA ── */}
        {activeTab === "disciplina" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>
                TARJETAS EN EL PARTIDO
              </div>
              <Insight type="neutral" text={`Se esperan aproximadamente ${expCards.toFixed(1)} tarjetas en total (amarilla = 1 pt, roja = 2 pts).`} />
              <div style={{ marginTop: 14 }}>
                <ProbRow label="Más de 3 tarjetas en el partido" p={pCards35} color="var(--fg-2)" />
                <ProbRow label="Más de 4 tarjetas en el partido" p={pCards45} color="var(--fg-2)" />
                <ProbRow label="Más de 5 tarjetas en el partido" p={pCards55} color="var(--fg-2)" />
                <ProbRow
                  label="Habrá una tarjeta roja"
                  p={pRedCard}
                  color="var(--red, #e84040)"
                  note={pRedCard < 0.1 ? "Poco probable" : undefined}
                />
              </div>
            </div>

            <div className="agm-rune-line" />

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 14 }}>
                HISTORIAL DE TARJETAS POR EQUIPO
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)", marginBottom: 8 }}>{homeName}</div>
                  <ProbRow
                    label="Amarillas por partido"
                    p={Math.min(1, (homeStats.yellows_avg ?? 1.5) / 5)}
                    color="var(--green)"
                    note={`${(homeStats.yellows_avg ?? 1.5).toFixed(1)} promedio`}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)", marginBottom: 8 }}>{awayName}</div>
                  <ProbRow
                    label="Amarillas por partido"
                    p={Math.min(1, (awayStats.yellows_avg ?? 1.5) / 5)}
                    color="var(--violet)"
                    note={`${(awayStats.yellows_avg ?? 1.5).toFixed(1)} promedio`}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(homeStats.yellows_avg ?? 1.5) > 2.5 && (
                <Insight type="neutral" text={`${homeName} es un equipo físico y suele recibir más de 2 amarillas por partido.`} />
              )}
              {(awayStats.yellows_avg ?? 1.5) > 2.5 && (
                <Insight type="neutral" text={`${awayName} es un equipo físico y suele recibir más de 2 amarillas por partido.`} />
              )}
              {pRedCard < 0.08 && (
                <Insight type="info" text={`El historial de ambos equipos muestra que las expulsiones son poco frecuentes.`} />
              )}
              {pRedCard >= 0.15 && (
                <Insight type="neutral" text={`Hay un ${Math.round(pRedCard * 100)}% de probabilidad de ver una expulsión. Los partidos entre estos equipos pueden ser intensos.`} />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
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

  const analyze = useCallback(async () => {
    if (!home || !away || home === away) return;
    setLoading(true);
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

          {/* VS divider */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "flex-end", gap: 4, paddingBottom: 4,
          }}>
            <span className="agm-mono" style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
              color: loading ? "var(--green)" : "var(--fg-3)",
              transition: "color 0.3s",
            }}>VS</span>
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
                  <div className="agm-display" style={{ fontSize: 22, color: "var(--fg-0)" }}>{data.home.name}</div>
                  <div className="agm-mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--green-deep)", marginTop: 8 }}>
                    {pct(prediction.p_home)}
                  </div>
                  <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                    {prediction.lambda_home.toFixed(2)} goles esperados
                  </div>
                </div>
                <div style={{ padding: "22px 20px", textAlign: "center" }}>
                  <div style={{ marginBottom: 12, marginTop: 8 }}>
                    <span className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.2em" }}>VS</span>
                  </div>
                  <div className="agm-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-1)" }}>
                    {pct(prediction.p_draw)}
                  </div>
                  <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginTop: 2 }}>
                    EMPATE
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {prediction.p_over_2_5 != null && (
                      <span className="agm-pill agm-pill-green" style={{ fontSize: 9 }}>
                        +2 goles: {pct(prediction.p_over_2_5)}
                      </span>
                    )}
                    {prediction.p_btts != null && (
                      <span className="agm-pill" style={{ fontSize: 9 }}>
                        Anotan los 2: {pct(prediction.p_btts)}
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
                  <div className="agm-display" style={{ fontSize: 22, color: "var(--fg-0)" }}>{data.away.name}</div>
                  <div className="agm-mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--violet)", marginTop: 8 }}>
                    {pct(prediction.p_away)}
                  </div>
                  <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                    {prediction.lambda_away.toFixed(2)} goles esperados
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

          {/* Pronóstico panel */}
          {prediction && (
            <PronosticoPanel
              prediction={prediction}
              homeStats={data.home.stats}
              awayStats={data.away.stats}
              homeId={data.home.team_id}
              awayId={data.away.team_id}
              homeName={data.home.name}
              awayName={data.away.name}
            />
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
                    <div style={{ fontSize: 32, marginBottom: 8 }}>—</div>
                    <p style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>Sin historial directo registrado.</p>
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
                  420+ COMBINACIONES
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
                  <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.18em" }}>VS</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="agm-display" style={{ fontSize: 16, color: "var(--violet)" }}>{data.away.name}</span>
                  <span style={{ fontSize: 28, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{data.away.flag}</span>
                </div>
              </div>

              {/* Ataque */}
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>⚡ PODER OFENSIVO</div>
              <StatBar label="Goles Esperados (xG)" homeVal={data.home.stats.xg_avg} awayVal={data.away.stats.xg_avg} />
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
              <StatBar label="Pases intentados" homeVal={data.home.stats.passes_avg} awayVal={data.away.stats.passes_avg} format={(v) => Math.round(v).toString()} />
              <StatBar label="Precisión de pases" homeVal={data.home.stats.pass_accuracy_avg} awayVal={data.away.stats.pass_accuracy_avg} format={(v) => `${v.toFixed(1)}%`} />
              <StatBar label="Duelos aéreos ganados" homeVal={data.home.stats.aerials_won_avg} awayVal={data.away.stats.aerials_won_avg} format={(v) => v.toFixed(1)} />
              <StatBar label="Atajadas del portero" homeVal={data.home.stats.saves_avg} awayVal={data.away.stats.saves_avg} />

              <div className="agm-rune-line" style={{ margin: "16px 0" }} />

              {/* Disciplina */}
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 10 }}>🟨 DISCIPLINA</div>
              <StatBar label="Tiros Libres por partido" homeVal={data.home.stats.free_kicks_avg} awayVal={data.away.stats.free_kicks_avg} />
              <StatBar label="Fueras de juego (Offsides)" homeVal={data.home.stats.offsides_avg} awayVal={data.away.stats.offsides_avg} higherIsBetter={false} />
              <StatBar label="Faltas cometidas" homeVal={data.home.stats.fouls_avg} awayVal={data.away.stats.fouls_avg} higherIsBetter={false} />
              <StatBar label="Tarjetas amarillas" homeVal={data.home.stats.yellows_avg} awayVal={data.away.stats.yellows_avg} higherIsBetter={false} />
              <StatBar label="Tarjetas rojas" homeVal={data.home.stats.reds_avg} awayVal={data.away.stats.reds_avg} higherIsBetter={false} format={(v) => v.toFixed(2)} />
            </div>
          </div>

          {/* Splits comparison */}
          <div className="agm-card" style={{ marginBottom: 20 }}>
            <div className="agm-card-h">
              <h3>DESGLOSE POR MITAD</h3>
              <span className="agm-card-eyebrow">Comparación 1er vs 2do Tiempo (Averages)</span>
            </div>
            <div style={{ padding: "18px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* 1st Half */}
                <div>
                  <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>⏱️ PRIMER TIEMPO</div>
                  {data.home.stats.first_half && data.away.stats.first_half ? (
                    <>
                      <StatBar label="Goles en 1T" homeVal={data.home.stats.first_half.goals_avg} awayVal={data.away.stats.first_half.goals_avg} />
                      <StatBar label="xG en 1T" homeVal={data.home.stats.first_half.xg_avg} awayVal={data.away.stats.first_half.xg_avg} />
                      <StatBar label="Posesión en 1T" homeVal={data.home.stats.first_half.possession_avg} awayVal={data.away.stats.first_half.possession_avg} format={(v) => `${(v * 100).toFixed(0)}%`} />
                      <StatBar label="Remates en 1T" homeVal={data.home.stats.first_half.shots_avg} awayVal={data.away.stats.first_half.shots_avg} />
                      <StatBar label="Corners en 1T" homeVal={data.home.stats.first_half.corners_avg} awayVal={data.away.stats.first_half.corners_avg} />
                    </>
                  ) : (
                    <div style={{ color: "var(--fg-3)", fontSize: 12 }}>Sin datos de mitades disponibles.</div>
                  )}
                </div>

                {/* 2nd Half */}
                <div>
                  <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>⏱️ SEGUNDO TIEMPO</div>
                  {data.home.stats.second_half && data.away.stats.second_half ? (
                    <>
                      <StatBar label="Goles en 2T" homeVal={data.home.stats.second_half.goals_avg} awayVal={data.away.stats.second_half.goals_avg} />
                      <StatBar label="xG en 2T" homeVal={data.home.stats.second_half.xg_avg} awayVal={data.away.stats.second_half.xg_avg} />
                      <StatBar label="Posesión en 2T" homeVal={data.home.stats.second_half.possession_avg} awayVal={data.away.stats.second_half.possession_avg} format={(v) => `${(v * 100).toFixed(0)}%`} />
                      <StatBar label="Remates en 2T" homeVal={data.home.stats.second_half.shots_avg} awayVal={data.away.stats.second_half.shots_avg} />
                      <StatBar label="Corners en 2T" homeVal={data.home.stats.second_half.corners_avg} awayVal={data.away.stats.second_half.corners_avg} />
                    </>
                  ) : (
                    <div style={{ color: "var(--fg-3)", fontSize: 12 }}>Sin datos de mitades disponibles.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Goals by period timeline */}
          <div className="agm-card" style={{ marginBottom: 20 }}>
            <div className="agm-card-h">
              <h3>DISTRIBUCIÓN TEMPORAL DE GOLES</h3>
              <span className="agm-card-eyebrow">Promedio de goles por tramo de 15 minutos</span>
            </div>
            <div style={{ padding: "20px 28px" }}>
              {data.home.stats.periods && data.away.stats.periods ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { label: "0' - 15'", homeKey: "p_0_15", awayKey: "p_0_15" },
                    { label: "15' - 30'", homeKey: "p_15_30", awayKey: "p_15_30" },
                    { label: "30' - 45'", homeKey: "p_30_45", awayKey: "p_30_45" },
                    { label: "45' - 60'", homeKey: "p_45_60", awayKey: "p_45_60" },
                    { label: "60' - 75'", homeKey: "p_60_75", awayKey: "p_60_75" },
                    { label: "75' - 90'", homeKey: "p_75_90", awayKey: "p_75_90" },
                    { label: "90'+", homeKey: "p_90plus", awayKey: "p_90plus" },
                  ].map((period) => {
                    const hVal = (data.home.stats.periods as any)[period.homeKey] ?? 0;
                    const aVal = (data.away.stats.periods as any)[period.awayKey] ?? 0;
                    return (
                      <StatBar
                        key={period.label}
                        label={period.label}
                        homeVal={hVal}
                        awayVal={aVal}
                        format={(v) => v.toFixed(2)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>Sin datos temporales de goles disponibles.</div>
              )}
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
