import { api } from "@/lib/api";
import { CustomPredictor } from "@/components/CustomPredictor";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function CompararPage({
  searchParams,
}: {
  searchParams: { home?: string; away?: string };
}) {
  const teams = await api.teams().catch(() => []);

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        COMPARADOR · CUALQUIER PARTIDO
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        COMPARAR DOS SELECCIONES
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Elegí dos equipos y el ensemble te dice qué pasaría si jugaran. Probabilidades de victoria,
        empate y derrota, marcadores más probables, goles esperados y factores clave.
        No hace falta que el partido exista en el calendario oficial.
      </p>

      {teams.length === 0 ? (
        <div className="agm-card agm-card-pad" style={{ color: "var(--fg-3)" }}>
          La API no está respondiendo. Sin lista de equipos el comparador no puede arrancar.
        </div>
      ) : (
        <CustomPredictor
          teams={teams}
          defaultHome={searchParams.home}
          defaultAway={searchParams.away}
        />
      )}

      <div style={{
        marginTop: 40, padding: 20, borderRadius: 10,
        border: "1px solid var(--line)", background: "var(--bg-2)",
      }}>
        <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 8 }}>
          CÓMO FUNCIONA
        </div>
        <p style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6 }}>
          Cada predicción combina <strong>Elo</strong> (49k partidos internacionales),{" "}
          <strong>Dixon-Coles</strong> (corrección de marcadores bajos),{" "}
          <strong>LightGBM stacker</strong> (no-linealidades sobre las salidas base), y se aplica{" "}
          <strong>calibración isotónica</strong>. Brier en validación walk-forward 2022–2026: <strong>0.515</strong>.
        </p>
      </div>
    </>
  );
}
