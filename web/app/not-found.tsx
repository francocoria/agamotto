import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", textAlign: "center", padding: 24,
    }}>
      <div className="agm-display" style={{ fontSize: "clamp(72px, 18vw, 220px)", color: "var(--green)", lineHeight: 0.9 }}>
        404
      </div>
      <div className="agm-mono" style={{
        marginTop: 16, fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.18em",
      }}>
        UNIVERSO NO ENCONTRADO
      </div>
      <h1 className="agm-display" style={{ marginTop: 18, fontSize: 28, color: "var(--fg-0)", maxWidth: 560 }}>
        Esta página no existe<br />en ninguna línea de tiempo.
      </h1>
      <p style={{ marginTop: 14, fontSize: 14, color: "var(--fg-2)", maxWidth: 480, lineHeight: 1.6 }}>
        Quizás te equivocaste de URL o la página fue movida. Volvé al multiverso conocido.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="agm-btn agm-btn-primary">Volver al inicio</Link>
        <Link href="/comparar" className="agm-btn agm-btn-ghost">Comparar dos equipos</Link>
      </div>
    </div>
  );
}
