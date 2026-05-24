import Link from "next/link";

export default function SignupPage() {
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
      </div>

      <div className="agm-card agm-card-pad agm-anim-blur" style={{ padding: 40 }}>
        <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
          — CREÁ TU CUENTA
        </div>
        <h2 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)" }}>CREAR CUENTA</h2>
        <p style={{ color: "var(--fg-2)", fontSize: 13, marginTop: 8, marginBottom: 24 }}>
          Acceso completo al simulador, bracket multiverso, partidos pivote y exportación de datos.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="agm-btn">G  Google</button>
          <button className="agm-btn"></button>
        </div>
        <div style={{ textAlign: "center", margin: "20px 0 16px", fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.16em" }}>
          O CONTINUÁ CON
        </div>

        <form>
          <label className="agm-label">NOMBRE</label>
          <input className="agm-input" type="text" placeholder="Lionel Mendoza" />
          <label className="agm-label" style={{ marginTop: 14 }}>EMAIL</label>
          <input className="agm-input" type="email" placeholder="lionel@10.ar" />
          <label className="agm-label" style={{ marginTop: 14 }}>CONTRASEÑA</label>
          <input className="agm-input" type="password" placeholder="••••••••••" />

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12, color: "var(--fg-2)" }}>
            <input type="checkbox" />
            Acepto los <a className="agm-mono" style={{ color: "var(--green-deep)" }}>Términos</a> y la <a className="agm-mono" style={{ color: "var(--green-deep)" }}>Política de Privacidad</a>.
          </label>

          <button type="submit" className="agm-btn agm-btn-primary" style={{ width: "100%", marginTop: 20, justifyContent: "center" }}>
            CREAR CUENTA GRATIS
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--fg-2)" }}>
          ¿Ya tenés cuenta? <Link href="/login" className="agm-mono" style={{ color: "var(--green-deep)", fontWeight: 700 }}>Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
