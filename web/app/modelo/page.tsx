import { api } from "@/lib/api";

export const revalidate = 60;

export default async function ModeloPage() {
  const [calib, models] = await Promise.all([
    api.calibration().catch(() => null),
    api.models().catch(() => []),
  ]);

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        VALIDACIÓN · ACADÉMICA
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        MODELO
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Calibración, Brier, Log Loss y comparación con baselines. Honestidad probabilística antes que accuracy.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 32 }}>
        <div className="agm-card">
          <div className="agm-card-h"><h3>CURVA DE CALIBRACIÓN</h3><span className="agm-card-eyebrow">predicho vs observado</span></div>
          <div style={{ padding: 24 }}>
            {calib ? <CalibrationChart bins={calib.bins} /> : <p style={{ color: "var(--fg-3)" }}>Sin datos.</p>}
            <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 12 }}>{calib?.note ?? ""}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MetricCard label="BRIER SCORE" value={calib?.brier?.toFixed(3) ?? "—"} hint="Menor es mejor. 0 = perfecto." />
          <MetricCard label="LOG LOSS" value={calib?.log_loss?.toFixed(3) ?? "—"} hint="Penaliza confianza errada." />
        </div>
      </div>

      <div className="agm-card">
        <div className="agm-card-h"><h3>MODELOS REGISTRADOS</h3><span className="agm-card-eyebrow">{models.length}</span></div>
        <table className="agm-table">
          <thead>
            <tr>
              <th className="agm-th">VERSIÓN</th>
              <th className="agm-th">FAMILIA</th>
              <th className="agm-th">CREADO</th>
              <th className="agm-th">MÉTRICAS</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m: any) => (
              <tr key={m.model_version_id} className="agm-tr-hover">
                <td className="agm-td agm-mono" style={{ color: "var(--fg-0)", fontWeight: 600 }}>{m.model_version_id}</td>
                <td className="agm-td">
                  <span className="agm-pill" style={{ fontSize: 9 }}>{m.family}</span>
                </td>
                <td className="agm-td agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{new Date(m.created_at).toLocaleString()}</td>
                <td className="agm-td agm-mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>{JSON.stringify(m.metrics ?? {})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="agm-card agm-card-pad">
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>{label}</div>
      <div className="agm-display agm-num" style={{ fontSize: 40, color: "var(--green-deep)", marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 8 }}>{hint}</div>
    </div>
  );
}

function CalibrationChart({ bins }: { bins: any[] }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: 320 }} preserveAspectRatio="none">
      <line x1="0" y1="100" x2="100" y2="0" stroke="var(--line-2)" strokeWidth="0.4" strokeDasharray="2,2" />
      <polyline
        points={bins.map((b: any) => `${b.predicted * 100},${100 - b.observed * 100}`).join(" ")}
        fill="none" stroke="var(--green)" strokeWidth="0.8"
      />
      {bins.map((b: any, i: number) => (
        <circle key={i} cx={b.predicted * 100} cy={100 - b.observed * 100} r="1.2" fill="var(--green)" />
      ))}
    </svg>
  );
}
