import { api, type Match } from "@/lib/api";

const STAGES = [
  { key: "round_32", label: "32AVOS" },
  { key: "round_16", label: "OCTAVOS" },
  { key: "quarter", label: "CUARTOS" },
  { key: "semi", label: "SEMIS" },
];

type Slot = { slot_index: number; top_team: string; p_top: number; top_winners: { team: string; p: number }[] };

function KCard({ slot, teamsMap }: { slot: Slot | undefined; teamsMap: Map<string, { fifa_code?: string | null; flag_emoji?: string | null }> }) {
  if (!slot || slot.top_winners.length < 2) {
    return (
      <div style={{
        background: "var(--bg-2)", border: "1px dashed var(--line)",
        borderRadius: 6, padding: "10px 12px", width: 140, fontSize: 10, color: "var(--fg-3)",
      }}>
        <div className="agm-mono">slot vacante</div>
      </div>
    );
  }
  const [a, b] = slot.top_winners;
  const ta = teamsMap.get(a.team) ?? {};
  const tb = teamsMap.get(b.team) ?? {};
  return (
    <div style={{
      background: "var(--bg-1)", border: "1px solid var(--line)",
      borderRadius: 6, overflow: "hidden", boxShadow: "var(--shadow-card)", width: 140,
    }}>
      <Side code={a.team} flag={ta.flag_emoji} pct={a.p} winner />
      <div style={{ height: 1, background: "var(--line)" }} />
      <Side code={b.team} flag={tb.flag_emoji} pct={b.p} winner={false} />
    </div>
  );
}

function Side({ code, flag, pct, winner }: { code: string; flag?: string | null; pct: number; winner: boolean }) {
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
      }}>{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}

function Column({ matches, label, mirror }: { matches: (Slot | undefined)[]; label: string; mirror: boolean; teamsMap: Map<string, any> }) {
  return null; // unused after refactor
}

export async function BracketView({ matches }: { matches: Match[] }) {
  // Build teams map from match data
  const teamsMap = new Map<string, { fifa_code?: string | null; flag_emoji?: string | null }>();
  for (const m of matches) {
    if (m.home_team?.fifa_code) teamsMap.set(m.home_team.fifa_code, m.home_team);
    if (m.away_team?.fifa_code) teamsMap.set(m.away_team.fifa_code, m.away_team);
  }
  // Also seed from all teams
  const allTeams = await api.teams().catch(() => []);
  for (const t of allTeams) {
    if (t.fifa_code) teamsMap.set(t.fifa_code, t);
  }

  const bracket = await api.bracket().catch(() => ({} as Record<string, Slot[]>));

  const half = (arr: Slot[]) => {
    const n = Math.ceil(arr.length / 2);
    return [arr.slice(0, n), arr.slice(n)];
  };

  // Final
  const finalSlots = bracket["final"] ?? [];
  const final = finalSlots[0];
  const finalA = final?.top_winners[0];
  const finalB = final?.top_winners[1];
  const ta = finalA ? teamsMap.get(finalA.team) ?? {} : {};
  const tb = finalB ? teamsMap.get(finalB.team) ?? {} : {};

  return (
    <div style={{ overflowX: "auto", padding: "20px 0" }}>
      <div style={{ display: "flex", gap: 16, minWidth: 1600, alignItems: "stretch", justifyContent: "center" }}>
        {STAGES.map((s) => {
          const slots = bracket[s.key] ?? [];
          const [left] = half(slots);
          return (
            <div key={`l-${s.key}`} style={{ display: "flex", flexDirection: "column", flex: "0 0 150px" }}>
              <div className="agm-mono" style={{
                fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em",
                marginBottom: 12, textAlign: "center",
              }}>{s.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-around" }}>
                {left.map((slot, i) => (
                  <KCard key={i} slot={slot} teamsMap={teamsMap} />
                ))}
              </div>
            </div>
          );
        })}

        {/* FINAL center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 200 }}>
          <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em", marginBottom: 12 }}>FINAL</div>
          <div
            className="agm-eye-border"
            style={{
              borderRadius: 10, padding: 16,
              background: "var(--bg-1)", border: "1px solid var(--line)",
              minWidth: 180, textAlign: "center",
              boxShadow: "0 6px 28px var(--green-glow)",
            }}
          >
            <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginBottom: 8 }}>
              METLIFE · 19.JUL.2026
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ textAlign: "center" }}>
                <div className="agm-flag-emoji" style={{ fontSize: 24 }}>{ta.flag_emoji ?? "🏳️"}</div>
                <div className="agm-display" style={{ fontSize: 18, color: "var(--green-deep)" }}>{finalA?.team ?? "—"}</div>
                <div className="agm-mono agm-num" style={{ fontSize: 11, color: "var(--green-deep)", fontWeight: 700 }}>
                  {finalA ? `${(finalA.p * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
              <div className="agm-display" style={{ fontSize: 14, color: "var(--fg-3)" }}>VS</div>
              <div style={{ textAlign: "center" }}>
                <div className="agm-flag-emoji" style={{ fontSize: 24 }}>{tb.flag_emoji ?? "🏳️"}</div>
                <div className="agm-display" style={{ fontSize: 18, color: "var(--fg-1)" }}>{finalB?.team ?? "—"}</div>
                <div className="agm-mono agm-num" style={{ fontSize: 11, color: "var(--fg-2)" }}>
                  {finalB ? `${(finalB.p * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
            </div>
          </div>
          <div className="agm-mono" style={{ marginTop: 12, fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.1em" }}>
            top equipos del slot, sobre las simulaciones
          </div>
        </div>

        {[...STAGES].reverse().map((s) => {
          const slots = bracket[s.key] ?? [];
          const [, right] = half(slots);
          return (
            <div key={`r-${s.key}`} style={{ display: "flex", flexDirection: "column", flex: "0 0 150px" }}>
              <div className="agm-mono" style={{
                fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em",
                marginBottom: 12, textAlign: "center",
              }}>{s.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-around" }}>
                {right.map((slot, i) => (
                  <KCard key={i} slot={slot} teamsMap={teamsMap} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
