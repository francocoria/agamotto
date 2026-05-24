import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  title: "Agamotto · Mundial 2026",
  description: "No vemos un futuro. Los calculamos todos.",
};

const NAV = [
  { href: "/", label: "INICIO" },
  { href: "/escenarios", label: "ESCENARIOS" },
  { href: "/llave", label: "LLAVE" },
  { href: "/modelo", label: "MODELO" },
  { href: "/pivotes", label: "PIVOTES" },
  { href: "/jugadores", label: "JUGADORES" },
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
            <div className="mx-auto max-w-[1440px] px-6 py-3 flex items-center gap-8">
              <Logo />
              <nav className="flex items-center gap-6 ml-2 overflow-x-auto">
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
              <div className="ml-auto flex items-center gap-3">
                <span
                  className="agm-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--fg-3)",
                    letterSpacing: "0.06em",
                  }}
                >
                  v0.4.1 · CALIB Q
                </span>
                <span
                  className="agm-pill agm-pill-green"
                  style={{ height: 20, fontSize: 9 }}
                >
                  <span className="agm-dot agm-dot-green agm-dot-pulse" />
                  ONLINE
                </span>
                <LangSwitcher />
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[1440px] px-6 py-10">{children}</main>
          <footer
            style={{
              borderTop: "1px solid var(--line)",
              padding: "32px 0",
              marginTop: 80,
            }}
          >
            <div className="mx-auto max-w-[1440px] px-6 flex items-center justify-between">
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
