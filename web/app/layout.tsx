import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { MobileNav } from "@/components/MobileNav";

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
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Logo />

              {/* Desktop nav (md+) */}
              <nav
                className="hidden md:flex"
                style={{ alignItems: "center", gap: 22, marginLeft: 8, overflowX: "auto" }}
              >
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="agm-display"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      color: "var(--fg-2)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                {/* Desktop-only meta */}
                <span
                  className="hidden lg:inline agm-mono"
                  style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em" }}
                >
                  v0.4.1 · CALIB Q
                </span>
                <span className="hidden lg:inline-flex agm-pill agm-pill-green" style={{ height: 20, fontSize: 9 }}>
                  <span className="agm-dot agm-dot-green agm-dot-pulse" />
                  ONLINE
                </span>
                <div className="hidden md:block">
                  <LangSwitcher />
                </div>
                <ThemeToggle />
                <div className="hidden md:block">
                  <UserMenu />
                </div>

                {/* Mobile nav drawer */}
                <MobileNav items={NAV}>
                  <UserMenu />
                </MobileNav>
              </div>
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
