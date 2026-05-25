import { api, type Match } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";

export const revalidate = 30;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: { stage?: string; group?: string; team?: string };
}) {
  const matches: Match[] = await api.matches({
    stage: searchParams.stage,
    group: searchParams.group,
    team: searchParams.team,
    limit: 200,
  }).catch(() => [] as Match[]);

  const byGroup = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.stage === "group" ? `Grupo ${m.group_label}` : "Fase Eliminatoria";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <h1 className="agm-display" style={{ fontSize: 28, color: "var(--fg-0)" }}>PARTIDOS</h1>
        <p style={{ color: "var(--fg-3)", fontSize: 13, marginTop: 6 }}>
          {matches.length} partidos · Mundial FIFA 2026
        </p>
      </div>

      {Object.entries(byGroup).map(([groupLabel, groupMatches]) => (
        <section key={groupLabel} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
            <h2 className="agm-display" style={{ fontSize: 12, letterSpacing: "0.18em", color: "var(--fg-2)" }}>
              {groupLabel.toUpperCase()}
            </h2>
            <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              {groupMatches.length} partidos
            </span>
          </div>
          <div className="agm-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {groupMatches.map((m) => (
              <MatchCard key={m.match_id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
