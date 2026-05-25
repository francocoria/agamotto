import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function ModeloPage() {
  const [calib, baselines, models] = await Promise.all([
    api.calibration().catch(() => null),
    api.baselines().catch(() => null),
    api.models().catch(() => []),
  ]);

  const rows: { name: string; brier: number | null; log_loss: number | null }[] =
    baselines?.baselines ?? [];
  // Sort: best (lowest Brier) first, nulls last
  rows.sort((a, b) => {
    if (a.brier == null) return 1;
    if (b.brier == null) return -1;
    return a.brier - b.brier;
  });
  const weights = baselines?.weights as
    | { w_elo: number; w_dc: number; w_stacker: number }
    | null;

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        VALIDACIÓN · ACADÉMICA
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        MODELO
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        Calibración, Brier, Log Loss y comparativa con baselines sobre walk-forward 2022–2026.
        Honestidad probabilística antes que accuracy.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 32 }}>
        <div className="agm-card">
          <div className="agm-card-h">
            <h3>CURVA DE CALIBRACIÓN</h3>
            <span className="agm-card-eyebrow">predicho vs observado</span>
          </div>
          <div style={{ padding: 24 }}>
            {calib?.bins ? <CalibrationChart bins={calib.bins} /> : <p style={{ color: "var(--fg-3)" }}>Sin datos.</p>}
            <p style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 12 }}>{calib?.note ?? ""}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MetricCard label="BRIER SCORE" value={calib?.brier ? calib.brier.toFixed(4) : "—"} hint="Menor es mejor. 0 = perfecto." />
          <MetricCard label="LOG LOSS" value={calib?.log_loss ? calib.log_loss.toFixed(4) : "—"} hint="Penaliza confianza errada." />
          {weights && (
            <div className="agm-card agm-card-pad">
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>
                PESOS DEL ENSEMBLE
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <WeightRow label="Elo" v={weights.w_elo} />
                <WeightRow label="Dixon-Coles" v={weights.w_dc} />
                <WeightRow label="LGBM Stacker" v={weights.w_stacker} />
              </div>
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 10 }}>
                scipy SLSQP · 4.421 partidos
              </div>
            </div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <section className="agm-card" style={{ marginBottom: 32 }}>
          <div className="agm-card-h">
            <h3>COMPARATIVA DE MODELOS</h3>
            <span className="agm-card-eyebrow">walk-forward · 2022–2026</span>
          </div>
          <table className="agm-table">
            <thead>
              <tr>
                <th className="agm-th">#</th>
                <th className="agm-th">MODELO</th>
                <th className="agm-th agm-num" style={{ textAlign: "right" }}>BRIER</th>
                <th className="agm-th agm-num" style={{ textAlign: "right" }}>LOG LOSS</th>
                <th className="agm-th" style={{ minWidth: 140 }}>VS NAIVE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const naive = rows.find((x) => x.name.toLowerCase().startsWith("naive"));
                const improvement = naive?.brier && r.brier
                  ? ((naive.brier - r.brier) / naive.brier) * 100
                  : null;
                const isBest = i === 0;
                return (
                  <tr key={r.name} className="agm-tr-hover" style={isBest ? { background: "var(--green-bg)" } : {}}>
                    <td className="agm-td agm-mono" style={{ color: "var(--fg-3)", textAlign: "center" }}>
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="agm-td">
                      <span style={{ fontWeight: isBest ? 700 : 500, color: isBest ? "var(--green-deep)" : "var(--fg-0)" }}>
                        {r.name}
                      </span>
                      {isBest && <span className="agm-pill agm-pill-green" style={{ marginLeft: 8, fontSize: 9 }}>MEJOR</span>}
                    </td>
                    <td className="agm-td agm-mono agm-num" style={{ textAlign: "right" }}>
                      {r.brier != null ? r.brier.toFixed(4) : "—"}
                    </td>
                    <td className="agm-td agm-mono agm-num" style={{ textAlign: "right" }}>
                      {r.log_loss != null ? r.log_loss.toFixed(4) : "—"}
                    </td>
                    <td className="agm-td">
                      {improvement != null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="agm-bar" style={{ flex: 1, height: 5 }}>
                            <div className="agm-bar-fill" style={{ width: `${Math.max(0, Math.min(100, improvement * 2))}%` }} />
                          </div>
                          <span className="agm-mono agm-num" style={{
                            fontSize: 11, color: improvement > 0 ? "var(--green-deep)" : "var(--fg-3)", fontWeight: 600,
                          }}>
                            {improvement > 0 ? "−" : ""}{Math.abs(improvement).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--fg-3)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {baselines?.note && (
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--fg-3)" }}>
              {baselines.note}
            </div>
          )}
        </section>
      )}

      <div className="agm-card">
        <div className="agm-card-h">
          <h3>MODELOS REGISTRADOS</h3>
          <span className="agm-card-eyebrow">{models.length}</span>
        </div>
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
                <td className="agm-td agm-mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
                  {new Date(m.created_at).toLocaleString()}
                </td>
                <td className="agm-td agm-mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>
                  {JSON.stringify(m.metrics ?? {})}
                </td>
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

function WeightRow({ label, v }: { label: string; v: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)", width: 88, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div className="agm-bar" style={{ flex: 1, height: 5 }}>
        <div className="agm-bar-fill" style={{ width: `${v * 100}%` }} />
      </div>
      <span className="agm-mono agm-num" style={{ fontSize: 11, color: "var(--green-deep)", fontWeight: 600, width: 44, textAlign: "right" }}>
        {(v * 100).toFixed(1)}%
      </span>
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
