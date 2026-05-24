import Link from "next/link";
import type { Team } from "@/lib/api";

export function TeamBadge({
  team,
  size = "md",
  asLink = true,
  showName = true,
}: {
  team?: Team | null;
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
  showName?: boolean;
}) {
  if (!team) return <span style={{ color: "var(--fg-3)" }}>—</span>;
  const fs = size === "lg" ? 16 : size === "sm" ? 11 : 13;
  const emojiSize = size === "lg" ? 22 : size === "sm" ? 14 : 17;
  const inner = (
    <span className="agm-flag" style={{ fontSize: fs }}>
      <span className="agm-flag-emoji" style={{ fontSize: emojiSize }}>{team.flag_emoji ?? "🏳️"}</span>
      <span className="agm-mono" style={{ fontWeight: 700, color: "var(--fg-3)" }}>{team.fifa_code ?? team.team_id}</span>
      {showName && <span style={{ fontWeight: 600, color: "var(--fg-0)", fontFamily: "var(--font-sans)", letterSpacing: 0 }}>{team.name}</span>}
    </span>
  );
  return asLink ? <Link href={`/teams/${team.team_id}`}>{inner}</Link> : inner;
}

export function TeamFlag({ team }: { team?: Team | null }) {
  if (!team) return <span className="agm-flag-emoji">🏳️</span>;
  return <span className="agm-flag-emoji">{team.flag_emoji}</span>;
}
