import { api } from "@/lib/api";
import { BracketView } from "@/components/BracketView";

export const revalidate = 30;

export default async function LlavePage() {
  const matches = await api.matches({ limit: 200 });
  const sim = await api.simulationLatest().catch(() => null);
  const ko = matches.filter((m) => m.stage !== "group");

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        ELIMINATORIA · ESCENARIO MODAL
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        LLAVE ELIMINATORIA
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13 }}>
        Grosor de línea proporcional a la probabilidad del cruce.
      </p>
      <BracketView matches={ko} />
    </>
  );
}
