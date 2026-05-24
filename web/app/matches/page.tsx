import { api } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";

export const revalidate = 30;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: { stage?: string; group?: string; team?: string };
}) {
  const matches = await api.matches({
    stage: searchParams.stage,
    group: searchParams.group,
    team: searchParams.team,
    limit: 200,
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="title text-3xl">Partidos</h1>
        <p className="text-canvas-500 mt-1">{matches.length} partidos en el catálogo del torneo</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((m) => (
          <MatchCard key={m.match_id} match={m} />
        ))}
      </div>
    </>
  );
}
