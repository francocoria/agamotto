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
// Poisson helpers for betting market calculations
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
// Markets panel component
// ──────────────────────────────────────────────────────────────────────────────
function MarketPill({
  label, value, accent = false, dim = false,
}: { label: string; value: string; accent?: boolean; dim?: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "10px 14px", borderRadius: 10, minWidth: 86,
      background: accent ? "var(--green-bg)" : dim ? "rgba(255,255,255,0.02)" : "var(--bg-2)",
      border: `1px solid ${accent ? "rgba(34,217,126,0.25)" : "var(--line)"}`,
      gap: 4,
    }}>
      <span className="agm-mono" style={{
        fontSize: 14, fontWeight: 700,
        color: accent ? "var(--green-deep)" : "var(--fg-1)",
      }}>{value}</span>
      <span className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)", letterSpacing: "0.1em", textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
}

function MarketRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid var(--line)",
    }}>
      <span className="agm-mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>{label}</span>
      <span className="agm-mono" style={{
        fontSize: 12, fontWeight: 700,
        color: accent ? "var(--green-deep)" : "var(--fg-0)",
      }}>{value}</span>
    </div>
  );
}

interface BettingMarketsProps {
  prediction: PredictionData;
  homeStats: TeamStats;
  awayStats: TeamStats;
  homeId: string;
  awayId: string;
}

function BettingMarkets({ prediction, homeStats, awayStats, homeId, awayId }: BettingMarketsProps) {
  const { p_home: pH, p_draw: pD, p_away: pA, lambda_home: lH, lambda_away: lA } = prediction;

  // Goals markets
  const pO05 = pOverGoals(lH, lA, 0);
  const pO15 = pOverGoals(lH, lA, 1);
  const pO25 = pOverGoals(lH, lA, 2);
  const pO35 = pOverGoals(lH, lA, 3);
  const pO45 = pOverGoals(lH, lA, 4);
  const pBtts = pBTTS(lH, lA);

  // Exact goals
  const pG0 = pExactGoals(lH, lA, 0);
  const pG1 = pExactGoals(lH, lA, 1);
  const pG2 = pExactGoals(lH, lA, 2);
  const pG3 = pExactGoals(lH, lA, 3);
  const pG4 = pExactGoals(lH, lA, 4);
  const pG5p = 1 - pG0 - pG1 - pG2 - pG3 - pG4;

  // Double chance
  const p1X = pDoubleChance(pH, pD, pA, "1X");
  const pX2 = pDoubleChance(pH, pD, pA, "X2");
  const p12 = pDoubleChance(pH, pD, pA, "12");

  // HT result
  const ht = pHTResult(lH, lA);

  // HT/FT combos (simplified with independence assumption)
  const htft = [
    { label: `1/1 (${homeId} gana ambos)`, p: ht.p1 * pH },
    { label: `X/1 (Empate 1T, gana ${homeId})`, p: ht.pX * pH },
    { label: `X/X (Empate ambos)`, p: ht.pX * pD },
    { label: `1/X (${homeId} 1T, empate final)`, p: ht.p1 * pD },
    { label: `2/2 (${awayId} gana ambos)`, p: ht.p2 * pA },
    { label: `X/2 (Empate 1T, gana ${awayId})`, p: ht.pX * pA },
  ].sort((a, b) => b.p - a.p);

  // Corners (using team averages)
  const hCorners = homeStats.corners_avg ?? 4.5;
  const aCorners = awayStats.corners_avg ?? 4.5;
  const expCorners = hCorners + aCorners;
  const pC75 = pOverLine(expCorners, 7);
  const pC95 = pOverLine(expCorners, 9);
  const pC115 = pOverLine(expCorners, 11);
  const pC125 = pOverLine(expCorners, 12);
  const hFHCorners = homeStats.first_half?.corners_avg ?? hCorners * 0.48;
  const aFHCorners = awayStats.first_half?.corners_avg ?? aCorners * 0.48;
  const expFHCorners = hFHCorners + aFHCorners;
  const pCFH35 = pOverLine(expFHCorners, 3);
  const pCFH45 = pOverLine(expFHCorners, 4);
  const pCSH = pOverLine(expCorners - expFHCorners, 4);

  // Cards (using yellows + 2*reds)
  const hCards = (homeStats.yellows_avg ?? 1.5) + 2 * (homeStats.reds_avg ?? 0.05);
  const aCards = (awayStats.yellows_avg ?? 1.5) + 2 * (awayStats.reds_avg ?? 0.05);
  const expCards = hCards + aCards;
  const pCards35 = pOverLine(expCards, 3);
  const pCards45 = pOverLine(expCards, 4);
  const pCards55 = pOverLine(expCards, 5);
  const pRedCard = 1 - Math.exp(-(homeStats.reds_avg ?? 0.05) - (awayStats.reds_avg ?? 0.05));

  // Shots O/U
  const expShots = (homeStats.shots_avg ?? 10) + (awayStats.shots_avg ?? 10);
  const expSOT = (homeStats.sot_avg ?? 3.5) + (awayStats.sot_avg ?? 3.5);
  const pShots185 = pOverLine(expShots, 18);
  const pShots215 = pOverLine(expShots, 21);
  const pSOT75 = pOverLine(expSOT, 7);
  const pSOT95 = pOverLine(expSOT, 9);

  // Free kicks
  const expFK = (homeStats.free_kicks_avg ?? 11) + (awayStats.free_kicks_avg ?? 11);
  const pFK195 = pOverLine(expFK, 19);
  const pFK235 = pOverLine(expFK, 23);

  // Offsides
  const expOff = (homeStats.offsides_avg ?? 1.8) + (awayStats.offsides_avg ?? 1.8);
  const pOff25 = pOverLine(expOff, 2);
  const pOff35 = pOverLine(expOff, 3);

  // Goals by period (first goal timing)
  const periods = homeStats.periods && awayStats.periods ? {
    "0-15": (homeStats.periods.p_0_15 ?? 0.1) + (awayStats.periods.p_0_15 ?? 0.1),
    "15-30": (homeStats.periods.p_15_30 ?? 0.15) + (awayStats.periods.p_15_30 ?? 0.15),
    "30-45": (homeStats.periods.p_30_45 ?? 0.18) + (awayStats.periods.p_30_45 ?? 0.18),
    "45-60": (homeStats.periods.p_45_60 ?? 0.15) + (awayStats.periods.p_45_60 ?? 0.15),
    "60-75": (homeStats.periods.p_60_75 ?? 0.18) + (awayStats.periods.p_60_75 ?? 0.18),
    "75-90": (homeStats.periods.p_75_90 ?? 0.22) + (awayStats.periods.p_75_90 ?? 0.22),
    "90+": (homeStats.periods.p_90plus ?? 0.04) + (awayStats.periods.p_90plus ?? 0.04),
  } : null;

  // First half total goals
  const lHFH = lH * 0.48, lAFH = lA * 0.48;
  const pFHO05 = pOverGoals(lHFH, lAFH, 0);
  const pFHO15 = pOverGoals(lHFH, lAFH, 1);
  const pFHBTTS = pBTTS(lHFH, lAFH);

  const lHSH = lH * 0.52, lASH = lA * 0.52;
  const pSHO05 = pOverGoals(lHSH, lASH, 0);
  const pSHO15 = pOverGoals(lHSH, lASH, 1);

  const [activeTab, setActiveTab] = useState<string>("resultado");

  const tabs = [
    { id: "resultado", label: "RESULTADO" },
    { id: "goles", label: "GOLES" },
    { id: "corners", label: "CORNERS" },
    { id: "tarjetas", label: "TARJETAS" },
    { id: "mitades", label: "MITADES" },
    { id: "tiempos", label: "TIEMPOS" },
    { id: "remates", label: "REMATES" },
  ];

  return (
    <div className="agm-card agm-anim-blur" style={{ marginBottom: 20 }}>
      <div className="agm-card-h">
        <h3>MERCADOS DE APUESTAS</h3>
        <span className="agm-pill agm-pill-green" style={{ fontSize: 9 }}>300+ VARIABLES</span>
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
            className="agm-mono"
            style={{
              padding: "10px 14px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 9, letterSpacing: "0.14em",
              color: activeTab === t.id ? "var(--green)" : "var(--fg-3)",
              borderBottom: activeTab === t.id ? "2px solid var(--green)" : "2px solid transparent",
              whiteSpace: "nowrap", transition: "color 0.2s",
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* ── RESULTADO ── */}
        {activeTab === "resultado" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                RESULTADO FINAL (1X2)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`GANA ${homeId}`} value={pct(pH)} accent={pH === Math.max(pH, pD, pA)} />
                <MarketPill label="EMPATE" value={pct(pD)} accent={pD === Math.max(pH, pD, pA)} />
                <MarketPill label={`GANA ${awayId}`} value={pct(pA)} accent={pA === Math.max(pH, pD, pA)} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                DOBLE OPORTUNIDAD
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`${homeId} O EMPATE (1X)`} value={pct(p1X)} accent={p1X > 0.6} />
                <MarketPill label={`EMPATE O ${awayId} (X2)`} value={pct(pX2)} accent={pX2 > 0.6} />
                <MarketPill label={`${homeId} O ${awayId} (12)`} value={pct(p12)} accent={p12 > 0.8} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                RESULTADO 1ER TIEMPO (1X2)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`GANA ${homeId} 1T`} value={pct(ht.p1)} />
                <MarketPill label="EMPATE 1T" value={pct(ht.pX)} accent={ht.pX === Math.max(ht.p1, ht.pX, ht.p2)} />
                <MarketPill label={`GANA ${awayId} 1T`} value={pct(ht.p2)} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                COMBINADO DESCANSO / FINAL (HT/FT) — Top 6
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {htft.map((c) => (
                  <MarketRow key={c.label} label={c.label} value={pct(c.p)} accent={c.p === htft[0].p} />
                ))}
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                APUESTA SIN EMPATE (DNB)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`${homeId} (DNB)`} value={pct(pH / (pH + pA))} accent={pH > pA} />
                <MarketPill label={`${awayId} (DNB)`} value={pct(pA / (pH + pA))} accent={pA > pH} />
              </div>
            </div>
          </div>
        )}

        {/* ── GOLES ── */}
        {activeTab === "goles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                TOTAL GOLES — LÍNEAS OVER/UNDER
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "O/U 0.5", over: pO05 },
                  { label: "O/U 1.5", over: pO15 },
                  { label: "O/U 2.5", over: pO25 },
                  { label: "O/U 3.5", over: pO35 },
                  { label: "O/U 4.5", over: pO45 },
                ].map(({ label, over }) => (
                  <div key={label} style={{
                    display: "flex", flexDirection: "column", gap: 6, minWidth: 96, alignItems: "center",
                    padding: "12px 14px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)",
                  }}>
                    <span className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{label}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--green-deep)" }}>{pct(over)}</div>
                        <div className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)" }}>MÁS</div>
                      </div>
                      <div style={{ width: 1, background: "var(--line)" }} />
                      <div style={{ textAlign: "center" }}>
                        <div className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)" }}>{pct(1 - over)}</div>
                        <div className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)" }}>MENOS</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                AMBOS EQUIPOS ANOTAN (BTTS)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label="BTTS — SÍ" value={pct(pBtts)} accent={pBtts > 0.5} />
                <MarketPill label="BTTS — NO" value={pct(1 - pBtts)} accent={pBtts <= 0.5} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                GOLES EXACTOS DEL PARTIDO
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "0 GOLES", p: pG0 },
                  { label: "1 GOL", p: pG1 },
                  { label: "2 GOLES", p: pG2 },
                  { label: "3 GOLES", p: pG3 },
                  { label: "4 GOLES", p: pG4 },
                  { label: "5+ GOLES", p: pG5p },
                ].map(({ label, p }) => (
                  <MarketPill key={label} label={label} value={pct(p)} accent={p === Math.max(pG0, pG1, pG2, pG3, pG4, pG5p)} />
                ))}
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MARCADORES EXACTOS MÁS PROBABLES
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

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MULTIGOLES (RANGOS)
              </div>
              <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                {[
                  { label: "1-2 goles", p: pG1 + pG2 },
                  { label: "1-3 goles", p: pG1 + pG2 + pG3 },
                  { label: "2-3 goles", p: pG2 + pG3 },
                  { label: "2-4 goles", p: pG2 + pG3 + pG4 },
                  { label: "3-5 goles", p: pG3 + pG4 + pG5p },
                ].map(({ label, p }) => (
                  <MarketRow key={label} label={label} value={pct(Math.min(1, p))} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CORNERS ── */}
        {activeTab === "corners" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>
                MEDIA ESPERADA: <span style={{ color: "var(--green)" }}>{expCorners.toFixed(1)} corners totales</span>
                &nbsp;({homeId}: {hCorners.toFixed(1)} · {awayId}: {aCorners.toFixed(1)})
              </div>
            </div>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                TOTAL CORNERS — OVER/UNDER
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "O/U 7.5", over: pC75 },
                  { label: "O/U 9.5", over: pC95 },
                  { label: "O/U 11.5", over: pC115 },
                  { label: "O/U 12.5", over: pC125 },
                ].map(({ label, over }) => (
                  <div key={label} style={{
                    display: "flex", flexDirection: "column", gap: 6, minWidth: 96, alignItems: "center",
                    padding: "12px 14px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)",
                  }}>
                    <span className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{label}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--green-deep)" }}>{pct(over)}</div>
                        <div className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)" }}>MÁS</div>
                      </div>
                      <div style={{ width: 1, background: "var(--line)" }} />
                      <div style={{ textAlign: "center" }}>
                        <div className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)" }}>{pct(1 - over)}</div>
                        <div className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)" }}>MENOS</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                CORNERS POR MITAD
              </div>
              <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                <MarketRow label={`Corners 1T — Más de 3.5 (Media: ${expFHCorners.toFixed(1)})`} value={pct(pCFH35)} accent={pCFH35 > 0.5} />
                <MarketRow label={`Corners 1T — Más de 4.5`} value={pct(pCFH45)} />
                <MarketRow label={`Corners 2T — Más de 4.5 (Media: ${(expCorners - expFHCorners).toFixed(1)})`} value={pct(pCSH)} accent={pCSH > 0.5} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                CARRERA DE CORNERS (¿Quién llega primero?)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill
                  label={`${homeId} MÁS CORNERS`}
                  value={pct(hCorners / (hCorners + aCorners))}
                  accent={hCorners > aCorners}
                />
                <MarketPill
                  label={`${awayId} MÁS CORNERS`}
                  value={pct(aCorners / (hCorners + aCorners))}
                  accent={aCorners > hCorners}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TARJETAS ── */}
        {activeTab === "tarjetas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>
                MEDIA ESPERADA: <span style={{ color: "var(--green)" }}>{expCards.toFixed(1)} pts de tarjetas</span>
                &nbsp;(amarilla=1, roja=2)
              </div>
            </div>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                TOTAL TARJETAS — OVER/UNDER
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "O/U 3.5", over: pCards35 },
                  { label: "O/U 4.5", over: pCards45 },
                  { label: "O/U 5.5", over: pCards55 },
                ].map(({ label, over }) => (
                  <div key={label} style={{
                    display: "flex", flexDirection: "column", gap: 6, minWidth: 96, alignItems: "center",
                    padding: "12px 14px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)",
                  }}>
                    <span className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{label}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--green-deep)" }}>{pct(over)}</div>
                        <div className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)" }}>MÁS</div>
                      </div>
                      <div style={{ width: 1, background: "var(--line)" }} />
                      <div style={{ textAlign: "center" }}>
                        <div className="agm-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--violet)" }}>{pct(1 - over)}</div>
                        <div className="agm-mono" style={{ fontSize: 8, color: "var(--fg-3)" }}>MENOS</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                TARJETA ROJA EN EL PARTIDO
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label="SÍ HABRÁ ROJA" value={pct(pRedCard)} accent={pRedCard > 0.15} />
                <MarketPill label="NO HABRÁ ROJA" value={pct(1 - pRedCard)} accent={pRedCard <= 0.15} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                DISCIPLINA POR EQUIPO (AMARILLAS PROM.)
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`${homeId} — Más tarjetas`} value={(homeStats.yellows_avg ?? 1.5).toFixed(1)} accent={(homeStats.yellows_avg ?? 0) > (awayStats.yellows_avg ?? 0)} />
                <MarketPill label={`${awayId} — Más tarjetas`} value={(awayStats.yellows_avg ?? 1.5).toFixed(1)} accent={(awayStats.yellows_avg ?? 0) > (homeStats.yellows_avg ?? 0)} />
              </div>
            </div>
          </div>
        )}

        {/* ── MITADES ── */}
        {activeTab === "mitades" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                GOLES EN PRIMER TIEMPO
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label="1T — O/U 0.5" value={`${pct(pFHO05)} / ${pct(1 - pFHO05)}`} accent={pFHO05 > 0.6} />
                <MarketPill label="1T — O/U 1.5" value={`${pct(pFHO15)} / ${pct(1 - pFHO15)}`} />
                <MarketPill label="1T — BTTS" value={pct(pFHBTTS)} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                GOLES EN SEGUNDO TIEMPO
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label="2T — O/U 0.5" value={`${pct(pSHO05)} / ${pct(1 - pSHO05)}`} accent={pSHO05 > 0.6} />
                <MarketPill label="2T — O/U 1.5" value={`${pct(pSHO15)} / ${pct(1 - pSHO15)}`} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                ¿QUÉ EQUIPO GANA CADA MITAD? (GANA AMBOS TIEMPOS)
              </div>
              <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                <MarketRow label={`${homeId} gana primer tiempo`} value={pct(ht.p1)} />
                <MarketRow label={`${homeId} gana segundo tiempo`} value={pct(pH)} />
                <MarketRow label={`${homeId} gana AMBOS tiempos`} value={pct(ht.p1 * pH)} accent />
                <MarketRow label={`${awayId} gana primer tiempo`} value={pct(ht.p2)} />
                <MarketRow label={`${awayId} gana AMBOS tiempos`} value={pct(ht.p2 * pA)} accent />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                STATS MITAD ESPERADAS — {homeId}
              </div>
              {homeStats.first_half && (
                <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                  <MarketRow label="Corners 1T prom." value={(homeStats.first_half.corners_avg ?? 2.2).toFixed(1)} />
                  <MarketRow label="Remates 1T prom." value={(homeStats.first_half.shots_avg ?? 4.8).toFixed(1)} />
                  <MarketRow label="xG 1T prom." value={(homeStats.first_half.xg_avg ?? 0.5).toFixed(2)} />
                  <MarketRow label="Faltas 1T prom." value={(homeStats.first_half.fouls_avg ?? 6).toFixed(1)} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TIEMPOS ── */}
        {activeTab === "tiempos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                DISTRIBUCIÓN DE GOLES POR TRAMO (PROM. COMBINADO)
              </div>
              {periods ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(periods).map(([period, avg]) => {
                    const maxVal = Math.max(...Object.values(periods));
                    const barPct = maxVal > 0 ? (avg / maxVal) * 100 : 0;
                    return (
                      <div key={period} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", minWidth: 60 }}>{period}'</span>
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
                <div style={{ color: "var(--fg-3)", fontSize: 12 }}>Sin datos de distribución temporal.</div>
              )}
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                PRIMER GOL POR INTERVALO (RANGOS DE 15 MIN)
              </div>
              {periods && (
                <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                  {Object.entries(periods).map(([period, avg]) => {
                    const totalGoals = Object.values(periods).reduce((s, v) => s + v, 0);
                    const p = totalGoals > 0 ? avg / totalGoals : 1 / 7;
                    return (
                      <MarketRow key={period} label={`Primer gol en ${period}'`} value={pct(p)} accent={p === Math.max(...Object.values(periods).map((v) => totalGoals > 0 ? v / totalGoals : 1/7))} />
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                MARCADOR EN MINUTO EXACTO
              </div>
              <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                <MarketRow label={`Ganando al min 15`} value={pct(ht.p1 * 0.5)} />
                <MarketRow label={`Ganando al min 30`} value={pct(ht.p1 * 0.75)} />
                <MarketRow label={`Ganando al min 60`} value={pct(pH * 0.8)} />
                <MarketRow label={`Ganando al min 75`} value={pct(pH * 0.9)} />
              </div>
            </div>
          </div>
        )}

        {/* ── REMATES ── */}
        {activeTab === "remates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>
                MEDIA ESPERADA: <span style={{ color: "var(--green)" }}>{expShots.toFixed(1)} remates totales · {expSOT.toFixed(1)} al arco</span>
              </div>
            </div>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                REMATES TOTALES — OVER/UNDER
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label="Remates O/U 18.5" value={`${pct(pShots185)} / ${pct(1 - pShots185)}`} accent={pShots185 > 0.5} />
                <MarketPill label="Remates O/U 21.5" value={`${pct(pShots215)} / ${pct(1 - pShots215)}`} />
                <MarketPill label="Al Arco O/U 7.5" value={`${pct(pSOT75)} / ${pct(1 - pSOT75)}`} accent={pSOT75 > 0.5} />
                <MarketPill label="Al Arco O/U 9.5" value={`${pct(pSOT95)} / ${pct(1 - pSOT95)}`} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                TIROS LIBRES — OVER/UNDER
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`TL O/U 19.5 (Media: ${expFK.toFixed(1)})`} value={`${pct(pFK195)} / ${pct(1 - pFK195)}`} accent={pFK195 > 0.5} />
                <MarketPill label="TL O/U 23.5" value={`${pct(pFK235)} / ${pct(1 - pFK235)}`} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                FUERAS DE JUEGO (OFFSIDES) — OVER/UNDER
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MarketPill label={`Offside O/U 2.5 (Media: ${expOff.toFixed(1)})`} value={`${pct(pOff25)} / ${pct(1 - pOff25)}`} accent={pOff25 > 0.5} />
                <MarketPill label="Offside O/U 3.5" value={`${pct(pOff35)} / ${pct(1 - pOff35)}`} />
              </div>
            </div>

            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
                REMATES POR EQUIPO
              </div>
              <div style={{ display: "flex", gap: 0, flexDirection: "column" }}>
                <MarketRow label={`${homeId} — Remates prom.`} value={(homeStats.shots_avg ?? 10).toFixed(1)} accent={(homeStats.shots_avg ?? 0) > (awayStats.shots_avg ?? 0)} />
                <MarketRow label={`${awayId} — Remates prom.`} value={(awayStats.shots_avg ?? 10).toFixed(1)} accent={(awayStats.shots_avg ?? 0) > (homeStats.shots_avg ?? 0)} />
                <MarketRow label={`${homeId} — SOT prom.`} value={(homeStats.sot_avg ?? 3.5).toFixed(1)} accent={(homeStats.sot_avg ?? 0) > (awayStats.sot_avg ?? 0)} />
                <MarketRow label={`${awayId} — SOT prom.`} value={(awayStats.sot_avg ?? 3.5).toFixed(1)} accent={(awayStats.sot_avg ?? 0) > (homeStats.sot_avg ?? 0)} />
                <MarketRow label={`${homeId} — xG prom.`} value={(homeStats.xg_avg ?? 1.1).toFixed(2)} />
                <MarketRow label={`${awayId} — xG prom.`} value={(awayStats.xg_avg ?? 1.1).toFixed(2)} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
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

          {/* Betting markets panel */}
          {prediction && (
            <BettingMarkets
              prediction={prediction}
              homeStats={data.home.stats}
              awayStats={data.away.stats}
              homeId={data.home.team_id}
              awayId={data.away.team_id}
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
                  <EyeOfAgamotto size={40} active={loading} />
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
