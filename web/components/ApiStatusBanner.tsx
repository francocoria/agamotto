import { API_BASE } from "@/lib/api";

async function checkApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ApiStatusBanner() {
  const online = await checkApi();
  if (online) return null;
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--amber)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span className="agm-pill" style={{ background: "transparent", border: "none", color: "var(--amber)", fontSize: 10, padding: 0 }}>
        ◉ API OFFLINE
      </span>
      <span style={{ fontSize: 12, color: "var(--fg-2)" }}>
        El backend de Agamotto no está respondiendo todavía. Los datos predictivos van a aparecer
        cuando el API se deploye en Render y conecte a Supabase. Mientras tanto, mostramos la estructura
        del producto.
      </span>
    </div>
  );
}
