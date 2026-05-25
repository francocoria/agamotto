import { api, type Match } from "@/lib/api";

const STAGES = [
  { key: "round_32", label: "32AVOS" },
  { key: "round_16", label: "OCTAVOS" },
  { key: "quarter", label: "CUARTOS" },
  { key: "semi", label: "SEMIS" },
];

// New format (preferred): from /simulation/bracket with triples
type ModalSlot = {
  slot_index: number;
  home_team?: string;
  away_team?: string;
  pair_occurrences?: number;
  p_home_wins_if_matchup?: number;
  p_away_wins_if_matchup?: number;
  alternative_pairs?: { home: string; away: string; p: number }[];
  // Legacy (fallback)
  legacy?: boolean;
  top_team?: string;
  top_winners?: { team: string; p: number }[];
  p_top?: number;
};

function KCard({ slot, teamsMap }: {
  slot: ModalSlot | undefined;
  teamsMap: Map<string, { fifa_code?: string | null; flag_emoji?: string | null }>;
}) {
  if (!slot) {
    return (
      <div style={{
        background: "var(--bg-2)", border: "1px dashed var(--line)",
        borderRadius: 10, padding: "12px 14px", width: 150, fontSize: 10, color: "var(--fg-3)",
      }}>
        <div className="agm-mono">slot vacante</div>
      </div>
    );
  }

  // Modal-matchup format
  if (slot.home_team && slot.away_team && slot.p_home_wins_if_matchup != null) {
    const home = slot.home_team;
    const away = slot.away_team;
    const ph = slot.p_home_wins_if_matchup ?? 0.5;
    const pa = slot.p_away_wins_if_matchup ?? 0.5;
    const homeWins = ph > pa;
    const th = teamsMap.get(home) ?? {};
    const ta = teamsMap.get(away) ?? {};
    return (
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: 12, overflow: "hidden",
        boxShadow: "var(--shadow-card)", width: 160,
      }}>
        <Side code={home} flag={th.flag_emoji} pct={ph} winner={homeWins} />
        <div style={{ height: 1, background: "var(--line)" }} />
        <Side code={away} flag={ta.flag_emoji} pct={pa} winner={!homeWins} />
        {slot.pair_occurrences != null && (
          <div className="agm-mono" style={{
            padding: "4px 8px", fontSize: 8, color: "var(--fg-3)",
            background: "var(--bg-2)", borderTop: "1px solid var(--line)",
            textAlign: "center", letterSpacing: "0.06em",
          }}>
            cruce en {(slot.pair_occurrences * 100).toFixed(0)}% de universos
          </div>
        )}
      </div>
    );
  }

  // Legacy: top winners (older simulation without triples)
  if (slot.top_winners && slot.top_winners.length >= 2) {
    const [a, b] = slot.top_winners;
    const ta = teamsMap.get(a.team) ?? {};
    const tb = teamsMap.get(b.team) ?? {};
    return (
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--amber)",
        borderRadius: 12, overflow: "hidden", width: 160, opacity: 0.85,
      }}>
        <Side code={a.team} flag={ta.flag_emoji} pct={a.p} winner />
        <div style={{ height: 1, background: "var(--line)" }} />
        <Side code={b.team} flag={tb.flag_emoji} pct={b.p} winner={false} />
        <div className="agm-mono" style={{
          padding: "4px 8px", fontSize: 8, color: "var(--amber)",
          background: "var(--bg-2)", borderTop: "1px solid var(--line)",
          textAlign: "center",
        }}>
          ⚠ datos legacy — re-simular para ver cruce real
        </div>
      </div>
    );
  }

  return (
    <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>—</div>
  );
}

function Side({ code, flag, pct, winner }: { code: string; flag?: string | null; pct: number; winner: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
      background: winner ? "var(--green-bg)" : "transparent",
    }}>
      <span className="agm-flag-emoji" style={{ fontSize: 14 }}>{flag ?? "🏳️"}</span>
      <span className="agm-mono" style={{
        fontSize: 11, fontWeight: winner ? 700 : 500,
        color: winner ? "var(--green-deep)" : "var(--fg-2)", flex: 1,
      }}>{code}</span>
      <span className="agm-mono agm-num" style={{
        fontSize: 10, color: winner ? "var(--green-deep)" : "var(--fg-3)",
        fontWeight: winner ? 700 : 500,
      }}>{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}

export async function BracketView({ matches }: { matches: Match[] }) {
  const teamsMap = new Map<string, { fifa_code?: string | null; flag_emoji?: string | null }>();
  for (const m of matches) {
    if (m.home_team?.fifa_code) teamsMap.set(m.home_team.fifa_code, m.home_team);
    if (m.away_team?.fifa_code) teamsMap.set(m.away_team.fifa_code, m.away_team);
  }
  const allTeams = await api.teams().catch(() => []);
  for (const t of allTeams) {
    if (t.fifa_code) teamsMap.set(t.fifa_code, t);
  }

  const bracket = await api.bracket().catch(() => ({} as Record<string, ModalSlot[]>));
  const finalSlots = (bracket["final"] ?? []) as ModalSlot[];
  const final = finalSlots[0];

  const half = (arr: ModalSlot[]) => {
    const n = Math.ceil(arr.length / 2);
    return [arr.slice(0, n), arr.slice(n)] as const;
  };

  return (
    <div style={{ overflowX: "auto", padding: "20px 0" }}>
      <div style={{ display: "flex", gap: 16, minWidth: 1700, alignItems: "stretch", justifyContent: "center" }}>
        {STAGES.map((s) => {
          const slots = (bracket[s.key] ?? []) as ModalSlot[];
          const [left] = half(slots);
          return (
            <div key={`l-${s.key}`} style={{ display: "flex", flexDirection: "column", flex: "0 0 170px" }}>
              <div className="agm-mono" style={{
                fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em",
                marginBottom: 12, textAlign: "center",
              }}>{s.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-around" }}>
                {left.map((slot, i) => (<KCard key={i} slot={slot} teamsMap={teamsMap} />))}
              </div>
            </div>
          );
        })}

        {/* FINAL center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 220 }}>
          <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em", marginBottom: 12 }}>FINAL</div>
          {final && final.home_team && final.away_team ? (
            <div
              className="agm-eye-border"
              style={{
                borderRadius: 12, padding: 18, background: "var(--bg-1)",
                border: "1px solid var(--line)", minWidth: 200, textAlign: "center",
                boxShadow: "0 6px 28px var(--green-glow)",
              }}
            >
              <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.12em", marginBottom: 10 }}>
                METLIFE · 19.JUL.2026
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <FinalSide code={final.home_team} flag={teamsMap.get(final.home_team)?.flag_emoji} p={final.p_home_wins_if_matchup ?? 0} winner />
                <div className="agm-display" style={{ fontSize: 14, color: "var(--fg-3)" }}>VS</div>
                <FinalSide code={final.away_team} flag={teamsMap.get(final.away_team)?.flag_emoji} p={final.p_away_wins_if_matchup ?? 0} winner={false} />
              </div>
              {final.pair_occurrences != null && (
                <div className="agm-mono" style={{ marginTop: 12, fontSize: 9, color: "var(--fg-3)" }}>
                  cruce modal · {(final.pair_occurrences * 100).toFixed(1)}% de universos
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 12, fontStyle: "italic", textAlign: "center", maxWidth: 200 }}>
              Re-simular para ver la final modal del torneo.
            </div>
          )}
        </div>

        {[...STAGES].reverse().map((s) => {
          const slots = (bracket[s.key] ?? []) as ModalSlot[];
          const [, right] = half(slots);
          return (
            <div key={`r-${s.key}`} style={{ display: "flex", flexDirection: "column", flex: "0 0 170px" }}>
              <div className="agm-mono" style={{
                fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em",
                marginBottom: 12, textAlign: "center",
              }}>{s.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "space-around" }}>
                {right.map((slot, i) => (<KCard key={i} slot={slot} teamsMap={teamsMap} />))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalSide({ code, flag, p, winner }: { code: string; flag?: string | null; p: number; winner: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="agm-flag-emoji" style={{ fontSize: 24 }}>{flag ?? "🏳️"}</div>
      <div className="agm-display" style={{ fontSize: 20, color: winner ? "var(--green-deep)" : "var(--fg-1)", marginTop: 2 }}>
        {code}
      </div>
      <div className="agm-mono agm-num" style={{
        fontSize: 12, color: winner ? "var(--green-deep)" : "var(--fg-2)",
        fontWeight: 700, marginTop: 2,
      }}>{(p * 100).toFixed(0)}%</div>
    </div>
  );
}
