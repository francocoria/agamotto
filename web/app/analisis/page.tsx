import { api } from "@/lib/api";
import { AnalisisView } from "@/components/AnalisisView";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function AnalisisPage() {
  const teams = await api.teams().catch(() => []);

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        ANÁLISIS PROFUNDO · +200 COMBINACIONES
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        ANÁLISIS DE ENFRENTAMIENTOS
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Elegí dos equipos para contrastar su historial de partidos, estadísticas de posesión, remates,
        efectividad y disciplina. Toda la información contextual combinada con la predicción del modelo.
      </p>

      {teams.length === 0 ? (
        <div className="agm-card agm-card-pad" style={{ color: "var(--fg-3)" }}>
          La API no está respondiendo o el cache no está listo. Sin lista de equipos el comparador no puede arrancar.
        </div>
      ) : (
        <AnalisisView teams={teams} />
      )}
    </>
  );
}
