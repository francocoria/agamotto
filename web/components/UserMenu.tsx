import Link from "next/link";
import { getServerUser } from "@/lib/supabase/server";

export async function UserMenu() {
  let user = null;
  try {
    user = await getServerUser();
  } catch {
    // env not set at build time
  }

  if (!user) {
    return (
      <>
        <Link href="/login" className="agm-btn agm-btn-ghost" style={{ height: 32, padding: "0 14px", fontSize: 12 }}>
          Iniciar sesión
        </Link>
        <Link href="/signup" className="agm-btn agm-btn-primary" style={{ height: 32, padding: "0 14px", fontSize: 12 }}>
          Crear cuenta
        </Link>
      </>
    );
  }

  const name = (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "user";
  const initial = (name[0] || "?").toUpperCase();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 999,
        background: "var(--green-bg)", border: "1px solid var(--green)",
        color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700,
      }}>{initial}</div>
      <span className="agm-mono" style={{ fontSize: 11, color: "var(--fg-1)" }}>{name}</span>
      <form action="/auth/signout" method="post">
        <button type="submit" className="agm-btn agm-btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: 11 }}>
          Salir
        </button>
      </form>
    </div>
  );
}
