"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav({ items, children }: {
  items: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="agm-btn-icon md:hidden"
        style={{ marginLeft: 8 }}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: 56,
            background: "var(--bg-0)",
            zIndex: 49,
            overflowY: "auto",
            padding: 24,
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            {items.map((n) => {
              const active = n.href === path || (n.href !== "/" && path.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="agm-display"
                  style={{
                    fontSize: 16,
                    letterSpacing: "0.16em",
                    color: active ? "var(--green-deep)" : "var(--fg-0)",
                    padding: "14px 16px",
                    borderRadius: 8,
                    background: active ? "var(--green-bg)" : "transparent",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          {children && <div style={{ paddingTop: 16, borderTop: "1px solid var(--line)" }}>{children}</div>}
        </div>
      )}
    </>
  );
}
