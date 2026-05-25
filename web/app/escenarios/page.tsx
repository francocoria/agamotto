import { api } from "@/lib/api";
import { CounterfactualPanel } from "@/components/CounterfactualPanel";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default async function EscenariosPage() {
  const [champions, matches, teams] = await Promise.all([
    api.multiverseChampions().catch(() => []),
    api.matches({ limit: 200 }).catch(() => []),
    api.teams().catch(() => []),
  ]);
  const apiOnline = champions.length > 0 || matches.length > 0;

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        SIMULADOR · MODO ESCENARIO
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", letterSpacing: "0.02em", marginBottom: 8 }}>
        ESCENARIOS
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Encadená condiciones para recalcular el torneo bajo otra historia posible.
        Cada cambio re-simula ~3.000 universos en menos de 3 segundos.
      </p>

      {!apiOnline && (
        <div className="agm-card agm-card-pad" style={{ marginBottom: 24, borderLeft: "3px solid var(--amber)" }}>
          <div className="agm-mono" style={{ fontSize: 10, color: "var(--amber)", letterSpacing: "0.14em" }}>
            BACKEND NO CONECTADO
          </div>
          <p style={{ marginTop: 8, color: "var(--fg-2)", fontSize: 13 }}>
            El simulador necesita la API corriendo para devolver resultados. Aparece como UI inerte
            hasta que el backend esté online. Mientras tanto, podés ver el layout del panel de escenarios.
          </p>
        </div>
      )}

      <CounterfactualPanel baseline={champions} matches={matches} teams={teams} />

      <section className="agm-card agm-card-pad" style={{ marginTop: 32 }}>
        <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>
          TIPOS DE CONDICIÓN
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16, marginTop: 16,
        }}>
          <ConditionType
            title="Fijar marcador"
            desc="Forzá un resultado exacto (ej. ARG 2 – 0 MEX). El simulador colapsa al subconjunto compatible."
          />
          <ConditionType
            title="Fijar ganador"
            desc="Forzá quién gana sin importar el marcador. Recalcula el resto del torneo."
          />
          <ConditionType
            title="Simular clima"
            desc="Cambiá temperatura/humedad de un partido. Ajusta los goles esperados vía el modelo."
          />
          <ConditionType
            title="Quitar jugador"
            desc="Cuando se ingieren planteles: simulá un equipo sin su jugador clave."
          />
        </div>
      </section>
    </>
  );
}

function ConditionType({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10, border: "1px solid var(--line)",
      background: "var(--bg-2)",
    }}>
      <div className="agm-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--green-deep)", letterSpacing: "0.06em" }}>
        {title.toUpperCase()}
      </div>
      <p style={{ marginTop: 6, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}
