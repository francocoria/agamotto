import { api } from "@/lib/api";
import { BracketView } from "@/components/BracketView";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default async function LlavePage() {
  const matches = await api.matches({ limit: 200 }).catch(() => []);
  const ko = matches.filter((m) => m.stage !== "group");

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        ELIMINATORIA · CRUCES MODALES
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        LLAVE ELIMINATORIA
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 24, fontSize: 13, lineHeight: 1.6, maxWidth: 800 }}>
        Cada tarjeta muestra el <strong>cruce modal</strong> de ese slot — es decir, los dos
        equipos que más veces se enfrentaron ahí a lo largo de las 100.000 simulaciones — y la
        probabilidad de victoria de cada uno <em>dentro de ese cruce</em>. La leyenda en la base
        indica en qué % de universos se da exactamente ese emparejamiento.
      </p>
      <BracketView matches={ko} />
    </>
  );
}
