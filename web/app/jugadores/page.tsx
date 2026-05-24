export const revalidate = 60;

export default async function JugadoresPage() {
  const players = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/players?limit=200`, {
    next: { revalidate: 60 },
  }).then((r) => r.json()).catch(() => []);

  return (
    <>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginBottom: 12 }}>
        PLAYER IMPACT · CONTRAFACTUALES
      </div>
      <h1 className="agm-display" style={{ fontSize: 32, color: "var(--fg-0)", marginBottom: 8 }}>
        JUGADORES
      </h1>
      <p style={{ color: "var(--fg-2)", marginBottom: 32, fontSize: 13, maxWidth: 720 }}>
        {players.length === 0
          ? "Sin jugadores en la base. Conectá un provider (API-Football, Statorium o Sportmonks) para poblar planteles."
          : `${players.length} jugadores en el sistema.`}
      </p>

      {players.length === 0 ? (
        <div className="agm-card agm-card-pad">
          <p style={{ color: "var(--fg-2)" }}>
            El Player Impact Model está activo. Cuando ingestes datos reales de jugador, esta página se llena automáticamente.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {players.map((p: any) => (
            <div key={p.player_id} className="agm-card agm-card-pad">
              <div className="agm-display" style={{ fontSize: 16, color: "var(--fg-0)" }}>{p.name}</div>
              <div className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
                {p.position ?? "—"} · {p.club ?? "—"} {p.league ? `(${p.league})` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
