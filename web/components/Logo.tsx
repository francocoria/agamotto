import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group" style={{ textDecoration: "none" }}>
      <span className="agm-eye-mark" aria-hidden>
        <span className="agm-eye-spin" />
      </span>
      <span className="agm-display" style={{ fontSize: 16, letterSpacing: "0.08em", color: "var(--fg-0)" }}>
        AGAMOTTO
      </span>
    </Link>
  );
}
