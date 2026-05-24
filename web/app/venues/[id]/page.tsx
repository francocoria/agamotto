import Link from "next/link";
import { api } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";

export const revalidate = 60;

export default async function VenuePage({ params }: { params: { id: string } }) {
  const [venue, allMatches] = await Promise.all([
    api.venue(params.id).catch(() => null),
    api.matches({ limit: 200 }).catch(() => []),
  ]);

  if (!venue) {
    return (
      <>
        <header className="mb-8">
          <Link href="/venues" className="text-xs text-canvas-500 hover:text-agamotto-300">← Sedes</Link>
          <div className="agm-card agm-card-pad" style={{ color: "var(--fg-3)", marginTop: 24 }}>
            No se encontró la sede o la API está desconectada.
          </div>
        </header>
      </>
    );
  }

  const matches = allMatches.filter((m) => m.venue?.venue_id === venue.venue_id);

  return (
    <>
      <header className="mb-8">
        <Link href="/venues" className="text-xs text-canvas-500 hover:text-agamotto-300">← Sedes</Link>
        <h1 className="title text-3xl mt-3">{venue.name}</h1>
        <div className="text-canvas-500 mt-1">{venue.city}, {venue.country}</div>
      </header>

      <section className="card mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Capacidad" value={venue.capacity?.toLocaleString() ?? "—"} />
        <Stat label="Altitud" value={`${venue.altitude_m ?? 0} msnm`} />
        <Stat label="Césped" value={venue.surface ?? "—"} />
        <Stat label="Techo" value={venue.roof ?? "—"} />
        <Stat label="Huso horario" value={venue.timezone} />
        <Stat label="Latitud" value={venue.latitude?.toFixed(3) ?? "—"} />
        <Stat label="Longitud" value={venue.longitude?.toFixed(3) ?? "—"} />
        <Stat label="Partidos" value={String(matches.length)} />
      </section>

      <section>
        <h2 className="title text-xl mb-4">Partidos en esta sede</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((m) => (<MatchCard key={m.match_id} match={m} />))}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="label">{label}</div>
      <div className="title text-lg text-agamotto-300 mt-1">{value}</div>
    </div>
  );
}
