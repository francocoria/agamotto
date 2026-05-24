import Link from "next/link";
import { api } from "@/lib/api";

export const revalidate = 60;

export default async function VenuesPage() {
  const venues = await api.venues();
  return (
    <>
      <header className="mb-6">
        <h1 className="title text-3xl">Sedes</h1>
        <p className="text-canvas-500 mt-1">{venues.length} estadios en 3 países anfitriones</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((v) => (
          <Link key={v.venue_id} href={`/venues/${v.venue_id}`} className="card hover:border-agamotto-400/40">
            <div className="title text-lg">{v.name}</div>
            <div className="text-canvas-500 text-sm mt-1">{v.city}, {v.country}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <Stat label="Capacidad" value={v.capacity?.toLocaleString() ?? "—"} />
              <Stat label="Altitud" value={`${v.altitude_m ?? 0} m`} />
              <Stat label="Techo" value={v.roof ?? "—"} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-canvas-500 text-[10px] uppercase">{label}</div>
      <div className="text-agamotto-300 mt-1">{value}</div>
    </div>
  );
}
