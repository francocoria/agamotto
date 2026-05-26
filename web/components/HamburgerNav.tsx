"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitcher } from "./LangSwitcher";

interface NavItem {
  href: string;
  label: string;
}

export function HamburgerNav({ items, children }: {
  items: NavItem[];
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const path = usePathname();

  // Close menu on pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close when path changes
  useEffect(() => {
    setIsOpen(false);
  }, [path]);

  return (
    <>
      {/* Menu Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        className="agm-eye-border"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          cursor: "pointer",
          position: "relative",
          zIndex: 60,
          boxShadow: isOpen ? "0 0 15px var(--violet-glow)" : "var(--shadow-card)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ position: "relative", width: 18, height: 14 }}>
          {/* Top Bar */}
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: 2,
              background: "var(--fg-1)",
              borderRadius: 1,
              transform: isOpen ? "rotate(45deg) translateY(5px) translateX(4px)" : "none",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {/* Middle Bar */}
          <span
            style={{
              position: "absolute",
              top: 6,
              left: 0,
              width: "100%",
              height: 2,
              background: "var(--fg-1)",
              borderRadius: 1,
              opacity: isOpen ? 0 : 1,
              transform: isOpen ? "scaleX(0)" : "none",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {/* Bottom Bar */}
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: 2,
              background: "var(--fg-1)",
              borderRadius: 1,
              transform: isOpen ? "rotate(-45deg) translateY(-5px) translateX(4px)" : "none",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </button>

      {/* Backdrop Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 5, 8, 0.4)",
          backdropFilter: "blur(8px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 58,
          transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Sliding Drawer Menu */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 420,
          background: "rgba(11, 17, 23, 0.94)",
          backdropFilter: "blur(20px)",
          borderLeft: "1px solid var(--line-2)",
          zIndex: 59,
          padding: "80px 40px 40px 40px",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Header Area inside Menu */}
          <div>
            <div className="agm-mono" style={{ fontSize: 10, color: "var(--violet)", letterSpacing: "0.2em", marginBottom: 4 }}>
              MULTIVERSE PORTAL
            </div>
            <h3 className="agm-display" style={{ fontSize: 24, letterSpacing: "0.05em", color: "var(--fg-0)" }}>
              AGAMOTTO NAV
            </h3>
            <div className="agm-rune-line" style={{ marginTop: 12 }} />
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((n, idx) => {
              const active = n.href === path || (n.href !== "/" && path.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="agm-display"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    fontSize: 16,
                    letterSpacing: "0.14em",
                    color: active ? "var(--green)" : "var(--fg-1)",
                    padding: "12px 18px",
                    borderRadius: 10,
                    background: active ? "var(--green-bg)" : "rgba(255,255,255,0.02)",
                    border: active ? "1px solid rgba(34, 217, 126, 0.2)" : "1px solid transparent",
                    transition: "all 0.25s ease",
                    position: "relative",
                    overflow: "hidden",
                    animation: isOpen ? `agm-fade-in-slide 0.3s ease forwards ${idx * 0.04}s` : "none",
                    opacity: isOpen ? 0 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--green)";
                    e.currentTarget.style.background = "var(--green-bg)";
                    e.currentTarget.style.borderColor = "rgba(34, 217, 126, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--fg-1)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  {/* Glowing active indicator dot */}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: active ? "var(--green)" : "transparent",
                      boxShadow: active ? "0 0 10px var(--green)" : "none",
                      transition: "all 0.25s ease",
                    }}
                  />
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area inside Menu */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="agm-rune-line" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <LangSwitcher />
            {children}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>
              SYSTEM LATENCY: OFF-LINE snapping
            </span>
            <span className="agm-mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>
              TIMELINES: 420+ PARALLEL COMBINATIONS
            </span>
          </div>
        </div>
      </div>

      {/* Internal Menu Animations */}
      <style jsx global>{`
        @keyframes agm-fade-in-slide {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
