import Link from "next/link";
import { api, pct, type TeamOutlook } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";

export const revalidate = 30;

const STAGES: { key: keyof TeamOutlook; label: string }[] = [
  { key: "p_round_32", label: "32avos" },
  { key: "p_round_16", label: "Octavos" },
  { key: "p_quarter", label: "Cuartos" },
  { key: "p_semi", label: "Semifinal" },
  { key: "p_final", label: "Final" },
  { key: "p_champion", label: "Campeón" },
];

export default async function TeamPage({ params }: { params: { id: string } }) {
  const id = params.id.toUpperCase();
  const [team, outlook, matches] = await Promise.all([
    api.team(id),
    api.teamOutlook(id).catch(() => null),
    api.matches({ team: id, limit: 50 }),
  ]);

  return (
    <>
      <Link href="/teams" className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>← SELECCIONES</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16, marginBottom: 32 }}>
        <div className="agm-flag-emoji" style={{ fontSize: 80 }}>{team.flag_emoji}</div>
        <div>
          <h1 className="agm-display" style={{ fontSize: 48, color: "var(--fg-0)" }}>{team.name}</h1>
          <div className="agm-mono" style={{ color: "var(--fg-3)", marginTop: 4 }}>
            {team.confederation} · ELO {team.elo ? Math.round(team.elo) : "—"} · FIFA #{team.fifa_rank ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 }}>
        <div className="agm-card">
          <div className="agm-card-h"><h3>OUTLOOK DEL TORNEO</h3><span className="agm-card-eyebrow">probabilidad por fase</span></div>
          <div style={{ padding: 24 }}>
            {outlook ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {STAGES.map((s) => {
                  const p = (outlook[s.key] as number) ?? 0;
                  return (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", width: 80, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</span>
                      <div className="agm-bar" style={{ flex: 1, height: 6 }}>
                        <div className="agm-bar-fill" style={{ width: `${p * 100}%` }} />
                      </div>
                      <span className="agm-mono agm-num" style={{ width: 60, textAlign: "right", color: "var(--green-deep)", fontWeight: 600 }}>
                        {(p * 100).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--fg-3)" }}>Sin simulación todavía.</p>
            )}
          </div>
        </div>

        {outlook && (
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="agm-card agm-card-pad">
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>P(CAMPEÓN)</div>
              <div className="agm-display agm-num" style={{ fontSize: 56, color: "var(--green-deep)", lineHeight: 1, marginTop: 8 }}>
                {(outlook.p_champion * 100).toFixed(2)}%
              </div>
              <div style={{ marginTop: 10, color: "var(--fg-2)", fontSize: 12 }}>
                Final {pct(outlook.p_final)} · Semi {pct(outlook.p_semi)}
              </div>
            </div>
            <div className="agm-card agm-card-pad">
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>FASE DE GRUPOS</div>
              <Row k="Gana grupo" v={pct(outlook.p_group_winner)} />
              <Row k="Segundo" v={pct(outlook.p_runner_up)} />
              <Row k="Mejor tercero" v={pct(outlook.p_best_third)} />
              <Row k="Avanza" v={pct(outlook.p_round_32)} />
            </div>
          </aside>
        )}
      </div>

      <section style={{ marginTop: 48 }}>
        <h2 className="agm-display" style={{ fontSize: 14, letterSpacing: "0.16em", color: "var(--fg-2)", marginBottom: 20 }}>CALENDARIO</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {matches.map((m) => (
            <MatchCard key={m.match_id} match={m} />
          ))}
        </div>
      </section>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
      <span style={{ color: "var(--fg-3)" }}>{k}</span>
      <span className="agm-mono agm-num" style={{ color: "var(--green-deep)" }}>{v}</span>
    </div>
  );
}
