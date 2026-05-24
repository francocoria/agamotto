import { api } from "@/lib/api";
import { CounterfactualPanel } from "@/components/CounterfactualPanel";

export const revalidate = 30;

export default async function EscenariosPage() {
  const champions = await api.multiverseChampions().catch(() => []);

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
      </p>

      <CounterfactualPanel baseline={champions} />
    </>
  );
}
