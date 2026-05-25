import Link from "next/link";
import { api } from "@/lib/api";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { ChampionsTable } from "@/components/ChampionsTable";
import { MatchCard } from "@/components/MatchCard";

export const revalidate = 30;

export default async function Home() {
  const [sim, champions, matches, teams, venues] = await Promise.all([
    api.simulationLatest().catch(() => null),
    api.multiverseChampions().catch(() => []),
    api.matches({ limit: 8 }).catch(() => []),
    api.teams().catch(() => []),
    api.venues().catch(() => []),
  ]);
  // Build team_id -> group label map from matches
  const groups: Record<string, string> = {};
  for (const m of matches) {
    if (m.group_label && m.home_team?.fifa_code) groups[m.home_team.fifa_code] = m.group_label;
    if (m.group_label && m.away_team?.fifa_code) groups[m.away_team.fifa_code] = m.group_label;
  }

  return (
    <>
      <ApiStatusBanner />
      <section className="agm-anim-blur" style={{ marginBottom: 56 }}>
        <div className="agm-mono" style={{ fontSize: 11, color: "var(--green-deep)", letterSpacing: "0.3em", marginBottom: 24 }}>
          MUNDIAL · USA · MEX · CAN · 2026
        </div>
        <h1 className="agm-display" style={{ fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 0.95, color: "var(--fg-0)", maxWidth: 1100 }}>
          NO VEMOS<br />
          UN FUTURO.<br />
          <span style={{ color: "var(--green)" }}>LOS CALCULAMOS<br />TODOS.</span>
        </h1>
        <p style={{ marginTop: 28, color: "var(--fg-2)", maxWidth: 720, fontSize: 15, lineHeight: 1.6 }}>
          Plataforma predictiva calibrada para los <strong style={{ color: "var(--fg-0)" }}>104 partidos</strong> del Mundial 2026.
          {sim?.n_runs ? <> Cada noche corremos <strong style={{ color: "var(--fg-0)" }}>{sim.n_runs.toLocaleString()} simulaciones</strong> con un ensemble de Elo + Dixon-Coles + LightGBM stacker, calibrado por isotónica.</> : <> Ensemble de Elo + Dixon-Coles + LightGBM stacker, calibrado por isotónica.</>}
          {" "}Probabilidades, no certezas — y todos los universos posibles.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <Link href="/escenarios" className="agm-btn agm-btn-primary">
            ABRIR EL OJO
          </Link>
          <Link href="/llave" className="agm-btn agm-btn-ghost">
            Ver bracket
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section
        className="agm-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          marginBottom: 48,
          padding: "32px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat value={String(venues.length)} label="SEDES" />
        <Stat value="104" label="PARTIDOS" />
        <Stat value={String(teams.length)} label="SELECCIONES" />
        <Stat value={sim?.n_runs.toLocaleString() ?? "—"} label="UNIVERSOS / NOCHE" />
      </section>

      {/* Champions table */}
      <section style={{ marginBottom: 56 }}>
        <div className="agm-card-h" style={{ padding: "0 0 14px 0", borderBottom: "1px solid var(--line)", marginBottom: 0 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-2)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            PROBABILIDAD DE TÍTULO · LÍNEA BASE
          </h3>
          <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
            modelo {sim?.model_version ?? "—"}
          </span>
        </div>
        <div className="agm-card" style={{ padding: 0, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {champions.length > 0 ? (
            <ChampionsTable
              entries={champions}
              outlook={sim?.team_outlook ?? null}
              groups={groups}
              top={16}
            />
          ) : (
            <div style={{ padding: 32, color: "var(--fg-3)", fontSize: 13 }}>
              Sin simulación todavía. Ejecutá <code className="agm-mono">agamotto simulate</code>.
            </div>
          )}
        </div>
      </section>

      {/* Próximos partidos */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="agm-display" style={{ fontSize: 14, letterSpacing: "0.16em", color: "var(--fg-2)" }}>
            PRÓXIMOS PARTIDOS
          </h2>
          <a href="/matches" className="agm-mono" style={{ fontSize: 11, color: "var(--green-deep)" }}>
            VER TODOS →
          </a>
        </div>
        <div className="agm-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {matches.map((m) => (
            <MatchCard key={m.match_id} match={m} />
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="agm-display agm-num" style={{ fontSize: 36, color: "var(--fg-0)", lineHeight: 1 }}>
        {value}
      </div>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em", marginTop: 4, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}
