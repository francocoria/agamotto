import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

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

        <LoginForm />

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--fg-2)" }}>
          ¿No tenés cuenta? <Link href="/signup" className="agm-mono" style={{ color: "var(--green-deep)", fontWeight: 700 }}>Crear cuenta</Link>
        </div>
      </div>
    </div>
  );
}
