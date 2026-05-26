"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitcher } from "./LangSwitcher";

interface NavItem {
  href: string;
  label: string;
}

const ICONS: Record<string, string> = {
  "/": "◎",
  "/comparar": "⇄",
  "/analisis": "◈",
  "/escenarios": "⊞",
  "/llave": "◇",
  "/modelo": "⌬",
  "/pivotes": "◉",
  "/jugadores": "◍",
  "/sobre": "○",
};

export function HamburgerNav({ items }: { items: NavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => { setIsOpen(false); }, [path]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          width: 38,
          height: 38,
          borderRadius: 8,
          background: isOpen ? "var(--green-bg-2)" : "transparent",
          border: `1px solid ${isOpen ? "rgba(34,217,126,0.3)" : "var(--line-2)"}`,
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.2s ease",
          padding: 0,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: 16,
              height: 2,
              borderRadius: 1,
              background: isOpen ? "var(--green)" : "var(--fg-2)",
              transition: "all 0.25s ease",
              transform:
                isOpen && i === 0 ? "rotate(45deg) translate(5px, 5px)" :
                isOpen && i === 1 ? "scaleX(0)" :
                isOpen && i === 2 ? "rotate(-45deg) translate(5px, -5px)" :
                "none",
              opacity: isOpen && i === 1 ? 0 : 1,
            }}
          />
        ))}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(3, 5, 8, 0.55)",
            backdropFilter: "blur(6px)",
            zIndex: 58,
            animation: "agm-fade-in 0.25s ease",
          }}
        />
      )}

      {/* Drawer — always dark bg, legible text */}
      <nav
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          width: 280,
          background: "#0e1320",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          zIndex: 59,
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: isOpen ? "4px 0 40px rgba(0,0,0,0.5)" : "none",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#5a6573", letterSpacing: "0.18em", marginBottom: 2 }}>
              MULTIVERSE PORTAL
            </div>
            <div style={{ fontSize: 20, fontFamily: "var(--font-display)", color: "#f4f7fb", letterSpacing: "0.06em", fontWeight: 700 }}>
              AGAMOTTO
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#8a96a3", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((item, idx) => {
            const active = item.href === path || (item.href !== "/" && path.startsWith(item.href));
            const icon = ICONS[item.href] ?? "·";
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 9,
                  textDecoration: "none",
                  background: active ? "rgba(34,217,126,0.1)" : "transparent",
                  border: `1px solid ${active ? "rgba(34,217,126,0.2)" : "transparent"}`,
                  transition: "all 0.15s ease",
                  animation: isOpen ? `agm-nav-in 0.3s ease both` : "none",
                  animationDelay: `${idx * 35}ms`,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                <span style={{
                  width: 20, textAlign: "center", fontSize: 14,
                  color: active ? "#22d97e" : "#5a6573",
                  flexShrink: 0,
                }}>{icon}</span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.12em",
                  color: active ? "#f4f7fb" : "#c8d0d9",
                }}>
                  {item.label}
                </span>
                {active && (
                  <span style={{
                    marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
                    background: "#22d97e",
                    boxShadow: "0 0 8px #22d97e",
                    flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <LangSwitcher />
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#2e3a47", letterSpacing: "0.1em" }}>
            420+ COMBINACIONES · OFFLINE-FIRST
          </div>
        </div>
      </nav>

      <style jsx global>{`
        @keyframes agm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes agm-nav-in {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
