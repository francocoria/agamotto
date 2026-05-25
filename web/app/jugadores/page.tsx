import Link from "next/link";
import { api } from "@/lib/api";

export const revalidate = 60;

export default async function JugadoresPage() {
  const [teams, players] = await Promise.all([
    api.teams().catch(() => []),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/players?limit=200`, {
      next: { revalidate: 60 },
    }).then((r) => r.json()).catch(() => []),
  ]);

  const playersByTeam: Record<string, any[]> = {};
  for (const p of players) {
    const k = p.nation ?? "—";
    (playersByTeam[k] ||= []).push(p);
  }

  const totalPlayers = players.length;

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        PLAYER IMPACT · CONTRAFACTUALES
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        JUGADORES
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Player Impact Model: rating por jugador + escenarios contrafactuales. Las cards de cada
        plantel se completan cuando se conecta un provider con datos de plantel
        (API-Football, Statorium o Sportmonks).
      </p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          marginBottom: 32,
          padding: "24px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat value={String(teams.length)} label="SELECCIONES" />
        <Stat value={totalPlayers ? String(totalPlayers) : "—"} label="JUGADORES" sub={totalPlayers ? "" : "esperando ingest"} />
        <Stat value={totalPlayers ? "ACTIVO" : "STANDBY"} label="PLAYER IMPACT" />
        <Stat value={teams.length ? "26" : "—"} label="MÁX. POR PLANTEL" />
      </section>

      <h2 className="agm-display" style={{ fontSize: 14, letterSpacing: "0.16em", color: "var(--fg-2)", marginBottom: 16 }}>
        PLANTELES POR SELECCIÓN
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {teams.map((t) => {
          const tp = playersByTeam[t.name] ?? playersByTeam[t.team_id] ?? [];
          return (
            <Link
              key={t.team_id}
              href={`/teams/${t.team_id}`}
              className="agm-card agm-card-tight agm-lift"
              style={{ display: "block", padding: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="agm-flag-emoji" style={{ fontSize: 26 }}>{t.flag_emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="agm-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em" }}>
                    {t.fifa_code}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 600 }}>{t.name}</div>
                </div>
                <span className="agm-pill" style={{
                  fontSize: 9,
                  background: tp.length ? "var(--green-bg)" : "var(--bg-2)",
                  color: tp.length ? "var(--green-deep)" : "var(--fg-3)",
                  borderColor: tp.length ? "rgba(10,153,86,0.30)" : "var(--line)",
                }}>
                  {tp.length ? `${tp.length}` : "—"}
                </span>
              </div>
              <div className="agm-mono" style={{
                marginTop: 10, fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.04em",
              }}>
                {tp.length
                  ? `${tp.length} jugadores cargados`
                  : "PLANTEL · ESPERANDO DATOS"}
              </div>
            </Link>
          );
        })}
      </div>

      <section className="agm-card agm-card-pad" style={{ marginTop: 40 }}>
        <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>
          QUÉ HACE EL PLAYER IMPACT MODEL
        </div>
        <h3 className="agm-display" style={{ fontSize: 20, color: "var(--fg-0)", marginTop: 6, marginBottom: 12 }}>
          Contrafactuales por jugador
        </h3>
        <p style={{ color: "var(--fg-2)", fontSize: 13, lineHeight: 1.6 }}>
          Cuando se ingiere un plantel, cada jugador recibe un rating compuesto basado en
          rendimiento de club + selección + calidad de liga + forma + posición + pelota parada
          − riesgo de lesión. Con esos ratings construimos la fuerza del XI titular y del banco,
          y simulamos qué pasa con la probabilidad del torneo si un jugador clave se lesiona,
          es reemplazado, o juega 30 minutos en lugar de 90.
        </p>
        <p style={{ color: "var(--fg-3)", fontSize: 12, marginTop: 12 }}>
          Mejora esperada de accuracy con datos de plantel reales: <strong style={{ color: "var(--green-deep)" }}>−3 a −5% Brier</strong>.
        </p>
      </section>
    </>
  );
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div>
      <div className="agm-display agm-num" style={{ fontSize: 28, color: "var(--fg-0)", lineHeight: 1 }}>
        {value}
      </div>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em", marginTop: 4, textTransform: "uppercase" }}>
        {label}
      </div>
      {sub && (
        <div className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
