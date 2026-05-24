import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="agm-eye-border" style={{ borderRadius: 999, padding: 2 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "var(--bg-1)",
            border: "1.5px solid var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--green)",
              boxShadow: "0 0 6px var(--green-glow)",
            }}
          />
        </div>
      </div>
      <div className="agm-display" style={{ fontSize: 15, letterSpacing: "0.06em", color: "var(--fg-0)" }}>
        AGAMOTTO
      </div>
    </Link>
  );
}
