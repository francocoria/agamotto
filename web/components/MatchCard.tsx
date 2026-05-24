import Link from "next/link";
import type { Match } from "@/lib/api";
import { ProbabilityBar, ProbLabels } from "./ProbabilityBar";

export function MatchCard({ match, prediction }: {
  match: Match;
  prediction?: { p_home: number; p_draw: number; p_away: number } | null;
}) {
  const date = new Date(match.kickoff_utc);
  const day = date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).toUpperCase();
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const stageLabel = match.stage === "group" ? `GRUPO ${match.group_label}` : match.stage.replace("_", " ").toUpperCase();
  return (
    <Link href={`/matches/${match.match_id}`} className="agm-card agm-card-tight agm-lift" style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em" }}>
          {day} · {time}
        </span>
        <span className="agm-pill" style={{ height: 18, fontSize: 9, padding: "0 8px" }}>
          {stageLabel}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span className="agm-flag-emoji" style={{ fontSize: 24 }}>{match.home_team?.flag_emoji ?? "🏳️"}</span>
          <span className="agm-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-0)" }}>
            {match.home_team?.fifa_code ?? "—"}
          </span>
        </div>
        <span className="agm-display" style={{ fontSize: 12, color: "var(--fg-3)" }}>—</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
          <span className="agm-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-0)" }}>
            {match.away_team?.fifa_code ?? "—"}
          </span>
          <span className="agm-flag-emoji" style={{ fontSize: 24 }}>{match.away_team?.flag_emoji ?? "🏳️"}</span>
        </div>
      </div>
      {prediction ? (
        <>
          <ProbabilityBar pHome={prediction.p_home} pDraw={prediction.p_draw} pAway={prediction.p_away} />
          <ProbLabels
            pHome={prediction.p_home} pDraw={prediction.p_draw} pAway={prediction.p_away}
            homeCode={match.home_team?.fifa_code ?? undefined} awayCode={match.away_team?.fifa_code ?? undefined}
          />
        </>
      ) : null}
      {match.venue && (
        <div style={{
          marginTop: 10, fontSize: 10, color: "var(--fg-3)",
          letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {match.venue.name.toUpperCase()} · {match.venue.city.toUpperCase()}
        </div>
      )}
    </Link>
  );
}
