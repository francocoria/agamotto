import Link from "next/link";

export const metadata = {
  title: "Agamotto · Cómo funciona",
};

export default function SobrePage() {
  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        METODOLOGÍA
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        CÓMO FUNCIONA AGAMOTTO
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 14, lineHeight: 1.6, maxWidth: 760 }}>
        Plataforma predictiva calibrada del Mundial FIFA 2026. Probabilidades, no certezas.
        Cada número tiene un modelo, un dataset y una métrica de validación detrás.
      </p>

      <section className="agm-card agm-card-pad" style={{ marginBottom: 24 }}>
        <H>El pipeline</H>
        <Step n={1} title="Datos">
          <strong>49.257 partidos internacionales</strong> de 1872 a hoy (MartJ42, CC0), sedes con altitud/clima/huso,
          48 selecciones esperadas para el Mundial 2026 y los 104 fixtures generados a partir del formato
          oficial 12 × 4 + 32avos.
        </Step>
        <Step n={2} title="Modelos base">
          <strong>Elo</strong> con decaimiento e importancia por torneo · <strong>Poisson regression</strong>{" "}
          con efectos de ataque/defensa por equipo + ventaja de localía · <strong>Dixon-Coles</strong>{" "}
          corrigiendo marcadores bajos · <strong>LightGBM stacker</strong> de 5 features sobre las salidas
          de los modelos base.
        </Step>
        <Step n={3} title="Ensemble óptimo">
          Pesos optimizados vía <code className="agm-mono">scipy.optimize.minimize</code> (SLSQP) sobre predicciones
          walk-forward 2022–2026: <strong>Elo 0.47 · DC 0.37 · Stacker 0.16</strong>. Calibración isotónica
          aplicada a la salida final.
        </Step>
        <Step n={4} title="Simulador Monte Carlo">
          100.000 simulaciones del torneo entero por corrida. Cada universo: muestrea marcadores
          de fase de grupos, ordena tablas con reglas oficiales de desempate, selecciona 8 mejores
          terceros, simula 32avos → octavos → cuartos → semis → final (con penales en empates).
        </Step>
        <Step n={5} title="Multiverso">
          Sobre los 100k universos agregamos: P(campeón) por equipo, P(avance) por fase,
          partidos pivote (ordenados por entropía 1X2). El motor de escenarios re-samplea ~3k
          universos condicionados cuando agregás restricciones (fijar marcador, ganador, clima).
        </Step>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Metric label="BRIER" value="0.515" hint="−23% vs Naive" />
        <Metric label="LOG LOSS" value="0.874" hint="−21% vs Naive" />
        <Metric label="MATCHES" value="4.421" hint="walk-forward 2022–2026" />
        <Metric label="MODEL VERSION" value="v0.2.0" hint="Elo+DC+Stacker+ISO" />
      </section>

      <section className="agm-card agm-card-pad" style={{ marginBottom: 24 }}>
        <H>Anti-leakage</H>
        <p style={{ color: "var(--fg-2)", lineHeight: 1.6, fontSize: 13 }}>
          La validación es estrictamente <strong>walk-forward temporal</strong>: para predecir el
          año T solo se usan partidos con fecha &lt; T. Sin shuffling, sin train/test split
          aleatorio, sin features calculadas con info post-partido. Los modelos se reentrenan año
          a año en backtesting.
        </p>
      </section>

      <section className="agm-card agm-card-pad" style={{ marginBottom: 24 }}>
        <H>Limitaciones conocidas</H>
        <ul style={{ color: "var(--fg-2)", lineHeight: 1.7, fontSize: 13, paddingLeft: 18 }}>
          <li><strong>Sin datos de plantel todavía</strong>: cuando se conecte un provider con squads,
          el Player Impact Model agrega ~3–5% Brier. Hoy las predicciones son a nivel selección.</li>
          <li><strong>Sin xG / shot data</strong>: usamos goles directos, no expected goals shot-by-shot.</li>
          <li><strong>Sorteo de grupos placeholder</strong>: hasta que FIFA cierre el draw oficial, los grupos
          se generan como template plausible.</li>
          <li><strong>Calendario aproximado</strong>: los 104 fixtures se generan con un schedule sintético.</li>
        </ul>
      </section>

      <section className="agm-card agm-card-pad" style={{ marginBottom: 24, borderLeft: "3px solid var(--amber)" }}>
        <H>Aviso</H>
        <p style={{ color: "var(--fg-2)", lineHeight: 1.6, fontSize: 13 }}>
          Agamotto no es una recomendación de apuestas. Las probabilidades son una herramienta
          analítica calibrada matemáticamente, expuesta con fines académicos y de exploración.
          No usar para decisiones de apuestas reales.
        </p>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
        <Link href="/comparar" className="agm-btn agm-btn-primary">Probar el comparador</Link>
        <Link href="/modelo" className="agm-btn agm-btn-ghost">Ver métricas en vivo</Link>
        <a href="https://github.com/francocoria/agamotto" target="_blank" rel="noopener noreferrer" className="agm-btn agm-btn-ghost">
          Código en GitHub
        </a>
      </div>
    </>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="agm-display" style={{ fontSize: 18, color: "var(--fg-0)", letterSpacing: "0.04em", marginBottom: 12 }}>
      {children}
    </h2>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="agm-display" style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: 999,
        background: "var(--green-bg)", color: "var(--green-deep)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700,
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div className="agm-display" style={{ fontSize: 13, color: "var(--fg-0)", letterSpacing: "0.08em", marginBottom: 6 }}>
          {title.toUpperCase()}
        </div>
        <p style={{ color: "var(--fg-2)", lineHeight: 1.6, fontSize: 13 }}>{children}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="agm-card agm-card-pad" style={{ textAlign: "center" }}>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>{label}</div>
      <div className="agm-display agm-num" style={{ fontSize: 32, color: "var(--green-deep)", marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>{hint}</div>
    </div>
  );
}
