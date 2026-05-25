import Link from "next/link";
import { api, type Team } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default async function TeamsPage() {
  const teams = (await api.teams().catch(() => [])) as Team[];
  const byConf = teams.reduce<Record<string, Team[]>>((acc, t) => {
    (acc[t.confederation] ||= []).push(t);
    return acc;
  }, {});

  return (
    <>
      <header className="mb-8">
        <h1 className="title text-3xl">Selecciones</h1>
        <p className="text-canvas-500 mt-1">{teams.length} clasificadas al Mundial</p>
      </header>

      {Object.entries(byConf).map(([conf, ts]) => (
        <section key={conf} className="mb-8">
          <h2 className="title text-xl mb-3">{conf} <span className="text-canvas-500 text-sm">· {ts.length}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ts.map((t) => (
              <Link key={t.team_id} href={`/teams/${t.team_id}`} className="card hover:border-agamotto-400/40 transition">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{t.flag_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-canvas-500">Elo {t.elo ? Math.round(t.elo) : "—"} · FIFA #{t.fifa_rank ?? "—"}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
