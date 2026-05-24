"use client";

import type { Match, TeamOutlook } from "@/lib/api";

type KMatch = { home?: string; away?: string; pA?: number; flagH?: string; flagA?: string; matchId?: string };

function KCard({ m, focused }: { m: KMatch; focused?: boolean }) {
  const pa = m.pA ?? 50;
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: `1px solid ${focused ? "var(--green)" : "var(--line)"}`,
        borderRadius: 6,
        boxShadow: focused ? "0 0 0 1px var(--green), 0 4px 12px var(--green-glow)" : "var(--shadow-card)",
        overflow: "hidden",
        width: 130,
      }}
    >
      <Side code={m.home ?? "—"} flag={m.flagH} pct={pa} winner={pa > 50} />
      <div style={{ height: 1, background: "var(--line)" }} />
      <Side code={m.away ?? "—"} flag={m.flagA} pct={100 - pa} winner={pa <= 50} />
    </div>
  );
}

function Side({ code, flag, pct, winner }: { code: string; flag?: string; pct: number; winner: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
      background: winner ? "var(--green-bg)" : "transparent",
    }}>
      <span className="agm-flag-emoji" style={{ fontSize: 12 }}>{flag ?? "🏳️"}</span>
      <span className="agm-mono" style={{
        fontSize: 10, fontWeight: winner ? 700 : 500,
        color: winner ? "var(--green-deep)" : "var(--fg-2)", flex: 1,
      }}>{code}</span>
      <span className="agm-mono agm-num" style={{
        fontSize: 9, color: winner ? "var(--green-deep)" : "var(--fg-3)",
      }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

const STAGES = [
  { key: "round_32", label: "32AVOS", count: 16 },
  { key: "round_16", label: "OCTAVOS", count: 8 },
  { key: "quarter", label: "CUARTOS", count: 4 },
  { key: "semi", label: "SEMIS", count: 2 },
];

export function BracketView({
  matches,
  simulationAggregates,
}: {
  matches: Match[];
  simulationAggregates: Record<string, TeamOutlook> | null;
}) {
  const byStage = STAGES.map((s) => ({
    ...s,
    matches: matches.filter((m) => m.stage === s.key).map<KMatch>((m) => ({
      home: m.home_team?.fifa_code ?? "—",
      away: m.away_team?.fifa_code ?? "—",
      flagH: m.home_team?.flag_emoji ?? undefined,
      flagA: m.away_team?.flag_emoji ?? undefined,
      matchId: m.match_id,
      pA: 50 + (Math.random() * 30 - 15), // fallback; replace with real ko_match_outcomes
    })),
  }));

  // Final
  const finals = matches.filter((m) => m.stage === "final");
  const finalMatch: KMatch = finals[0]
    ? {
        home: finals[0].home_team?.fifa_code ?? "ARG",
        away: finals[0].away_team?.fifa_code ?? "FRA",
        flagH: finals[0].home_team?.flag_emoji ?? undefined,
        flagA: finals[0].away_team?.flag_emoji ?? undefined,
        pA: 53,
      }
    : { home: "ARG", away: "FRA", pA: 53 };

  // Half the matches per side
  const half = (arr: KMatch[]) => {
    const n = Math.ceil(arr.length / 2);
    return [arr.slice(0, n), arr.slice(n)];
  };

  return (
    <div style={{ overflowX: "auto", padding: "20px 0" }}>
      <div style={{ display: "flex", gap: 20, minWidth: 1500, alignItems: "stretch", justifyContent: "center" }}>
        {/* LEFT side: 32avos ← octavos ← cuartos ← semis */}
        {STAGES.map((s) => {
          const [left] = half(byStage.find((b) => b.key === s.key)?.matches ?? []);
          return (
            <Column key={`l-${s.key}`} label={s.label} matches={left} mirror={false} />
          );
        })}

        {/* FINAL center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 200 }}>
          <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em", marginBottom: 12 }}>
            FINAL
          </div>
          <div
            className="agm-eye-border"
            style={{
              borderRadius: 10,
              padding: 16,
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              minWidth: 180,
              textAlign: "center",
              boxShadow: "0 6px 28px var(--green-glow)",
            }}
          >
            <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginBottom: 8 }}>
              METLIFE · 19.JUL.2026
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ textAlign: "center" }}>
                <div className="agm-flag-emoji" style={{ fontSize: 24 }}>{finalMatch.flagH ?? "🏳️"}</div>
                <div className="agm-display" style={{ fontSize: 18, color: "var(--green-deep)" }}>{finalMatch.home}</div>
                <div className="agm-mono agm-num" style={{ fontSize: 11, color: "var(--green-deep)", fontWeight: 700 }}>{finalMatch.pA?.toFixed(0)}%</div>
              </div>
              <div className="agm-display" style={{ fontSize: 14, color: "var(--fg-3)" }}>VS</div>
              <div style={{ textAlign: "center" }}>
                <div className="agm-flag-emoji" style={{ fontSize: 24 }}>{finalMatch.flagA ?? "🏳️"}</div>
                <div className="agm-display" style={{ fontSize: 18, color: "var(--fg-1)" }}>{finalMatch.away}</div>
                <div className="agm-mono agm-num" style={{ fontSize: 11, color: "var(--fg-2)" }}>{(100 - (finalMatch.pA ?? 50)).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT side: semis → cuartos → octavos → 32avos */}
        {[...STAGES].reverse().map((s) => {
          const [, right] = half(byStage.find((b) => b.key === s.key)?.matches ?? []);
          return (
            <Column key={`r-${s.key}`} label={s.label} matches={right} mirror />
          );
        })}
      </div>
    </div>
  );
}

function Column({ matches, label, mirror }: { matches: KMatch[]; label: string; mirror: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="agm-mono" style={{
        fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em",
        marginBottom: 12, textAlign: "center",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-around", direction: mirror ? "rtl" : "ltr" }}>
        {matches.map((m, i) => (
          <div key={i} style={{ direction: "ltr" }}>
            <KCard m={m} />
          </div>
        ))}
      </div>
    </div>
  );
}
