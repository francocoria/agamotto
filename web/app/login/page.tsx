import Link from "next/link";

export default function LoginPage() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, minHeight: "calc(100vh - 200px)", alignItems: "center" }}>
      <div>
        <div className="agm-mono" style={{ fontSize: 10, color: "var(--green-deep)", letterSpacing: "0.18em", marginBottom: 16 }}>
          MUNDIAL 2026 · 11 JUN — 19 JUL
        </div>
        <h1 className="agm-display" style={{ fontSize: "clamp(48px, 6vw, 72px)", lineHeight: 0.95, color: "var(--fg-0)" }}>
          NO VEMOS<br />UN FUTURO.<br />
          <span style={{ color: "var(--green)" }}>LOS CALCULAMOS<br />TODOS.</span>
        </h1>
        <p style={{ marginTop: 24, color: "var(--fg-2)", maxWidth: 480, fontSize: 14 }}>
          48 selecciones · 104 partidos · 16 sedes · miles de millones de líneas de tiempo.
        </p>
      </div>

      <div className="agm-card agm-card-pad agm-anim-blur" style={{ padding: 40 }}>
        <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
          — BIENVENIDO/A DE NUEVO
        </div>
        <h2 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)" }}>INICIAR SESIÓN</h2>
        <p style={{ color: "var(--fg-2)", fontSize: 13, marginTop: 8, marginBottom: 24 }}>
          Entrá para ejecutar simulaciones, guardar escenarios y exportar tus análisis.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="agm-btn">G  Google</button>
          <button className="agm-btn"></button>
        </div>
        <div style={{ textAlign: "center", margin: "20px 0 16px", fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em" }}>
          O CONTINUÁ CON
        </div>

        <form>
          <label className="agm-label">EMAIL</label>
          <input className="agm-input" type="email" placeholder="lionel@10.ar" />
          <label className="agm-label" style={{ marginTop: 14 }}>CONTRASEÑA</label>
          <input className="agm-input" type="password" placeholder="••••••••••" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-2)" }}>
              <input type="checkbox" /> Mantener sesión
            </label>
            <a className="agm-mono" style={{ color: "var(--green-deep)" }}>Olvidé la contraseña</a>
          </div>

          <button type="submit" className="agm-btn agm-btn-primary" style={{ width: "100%", marginTop: 20, justifyContent: "center" }}>
            ENTRAR
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--fg-2)" }}>
          ¿No tenés cuenta? <Link href="/signup" className="agm-mono" style={{ color: "var(--green-deep)", fontWeight: 700 }}>Crear cuenta</Link>
        </div>
      </div>
    </div>
  );
}
