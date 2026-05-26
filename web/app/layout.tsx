import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import { Logo } from "@/components/Logo";
import { HamburgerNav } from "@/components/HamburgerNav";
import { getServerUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Agamotto · Mundial 2026",
  description: "No vemos un futuro. Los calculamos todos.",
};

const NAV = [
  { href: "/", label: "INICIO" },
  { href: "/comparar", label: "COMPARAR" },
  { href: "/analisis", label: "ANÁLISIS" },
  { href: "/escenarios", label: "ESCENARIOS" },
  { href: "/llave", label: "LLAVE" },
  { href: "/modelo", label: "MODELO" },
  { href: "/pivotes", label: "PIVOTES" },
  { href: "/jugadores", label: "JUGADORES" },
  { href: "/sobre", label: "SOBRE" },
];

async function AuthButtons() {
  let user = null;
  try {
    user = await getServerUser();
  } catch {
    // supabase not configured
  }

  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link
          href="/login"
          className="agm-mono"
          style={{
            fontSize: 11, letterSpacing: "0.1em", color: "var(--fg-2)",
            padding: "6px 12px", borderRadius: 7,
            border: "1px solid var(--line-2)",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
        >
          ENTRAR
        </Link>
        <Link
          href="/signup"
          className="agm-mono"
          style={{
            fontSize: 11, letterSpacing: "0.1em",
            color: "var(--green-deep)",
            padding: "6px 12px", borderRadius: 7,
            background: "var(--green-bg-2)",
            border: "1px solid rgba(34,217,126,0.25)",
            textDecoration: "none",
            fontWeight: 700,
            transition: "all 0.2s",
          }}
        >
          REGISTRARSE
        </Link>
      </div>
    );
  }

  const name = (user.user_metadata as any)?.full_name || user.email?.split("@")[0] || "user";
  const initial = (name[0] || "?").toUpperCase();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 999,
        background: "var(--green-bg-2)", border: "1px solid rgba(34,217,126,0.3)",
        color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)",
      }}>{initial}</div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="agm-mono"
          style={{
            fontSize: 10, letterSpacing: "0.1em", color: "var(--fg-3)",
            padding: "5px 10px", borderRadius: 6,
            border: "1px solid var(--line)",
            background: "transparent", cursor: "pointer",
          }}
        >
          SALIR
        </button>
      </form>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <header
            style={{
              borderBottom: "1px solid var(--line)",
              background: "var(--bg-1)",
              position: "sticky",
              top: 0,
              zIndex: 50,
            }}
          >
            <div
              className="mx-auto"
              style={{
                maxWidth: 1440,
                padding: "0 16px",
                height: 56,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* LEFT: Hamburger */}
              <HamburgerNav items={NAV} />

              {/* Logo */}
              <Logo />

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* RIGHT: status pill + theme + auth */}
              <span
                className="hidden lg:inline agm-mono"
                style={{ fontSize: 9, color: "var(--fg-3)", letterSpacing: "0.06em" }}
              >
                v0.5.0
              </span>
              <span className="hidden sm:inline-flex agm-pill agm-pill-green" style={{ height: 20, fontSize: 9 }}>
                <span className="agm-dot agm-dot-green agm-dot-pulse" />
                ONLINE
              </span>
              <ThemeToggle />
              <AuthButtons />
            </div>
          </header>

          <main
            className="mx-auto"
            style={{ maxWidth: 1440, padding: "32px 20px" }}
          >
            {children}
          </main>

          <footer style={{ borderTop: "1px solid var(--line)", padding: "32px 0", marginTop: 60 }}>
            <div
              className="mx-auto"
              style={{
                maxWidth: 1440,
                padding: "0 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em" }}>
                AGAMOTTO · PREDICTIVE 2026
              </span>
              <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em" }}>
                SECURE · TLS 1.3 · COOKIES MIN
              </span>
            </div>
          </footer>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
