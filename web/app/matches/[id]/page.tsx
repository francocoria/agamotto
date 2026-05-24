import Link from "next/link";
import { api, pct } from "@/lib/api";
import { ProbabilityBar, ProbLabels } from "@/components/ProbabilityBar";

export const revalidate = 30;

export default async function MatchPage({ params }: { params: { id: string } }) {
  const [match, pred] = await Promise.all([
    api.match(params.id),
    api.prediction(params.id).catch(() => null),
  ]);

  const date = new Date(match.kickoff_utc);
  const dateStr = date.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" });

  return (
    <>
      <Link href="/matches" className="agm-mono" style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.06em" }}>
        ← MATCHES
      </Link>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em", marginTop: 16 }}>
        {match.stage === "group" ? `GRUPO ${match.group_label}` : match.stage.replace("_", " ").toUpperCase()} · {dateStr.toUpperCase()}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginTop: 24, marginBottom: 32 }}>
        <div>
          <div className="agm-flag-emoji" style={{ fontSize: 56 }}>{match.home_team?.flag_emoji}</div>
          <div className="agm-display" style={{ fontSize: 36, color: "var(--fg-0)", marginTop: 6 }}>
            {match.home_team?.fifa_code}
          </div>
          <div style={{ color: "var(--fg-2)" }}>{match.home_team?.name}</div>
        </div>
        <div className="agm-display" style={{ fontSize: 18, color: "var(--fg-3)", padding: "0 32px" }}>VS</div>
        <div style={{ textAlign: "right" }}>
          <div className="agm-flag-emoji" style={{ fontSize: 56 }}>{match.away_team?.flag_emoji}</div>
          <div className="agm-display" style={{ fontSize: 36, color: "var(--fg-0)", marginTop: 6 }}>
            {match.away_team?.fifa_code}
          </div>
          <div style={{ color: "var(--fg-2)" }}>{match.away_team?.name}</div>
        </div>
      </div>

      {match.venue && (
        <div style={{ textAlign: "center", color: "var(--fg-2)", marginBottom: 32, fontSize: 13 }}>
          📍 {match.venue.name}, {match.venue.city}, {match.venue.country}
          {match.venue.altitude_m ? ` · ${match.venue.altitude_m} msnm` : ""}
        </div>
      )}

      {!pred ? (
        <div className="agm-card agm-card-pad" style={{ color: "var(--fg-3)" }}>
          Sin predicción. Ejecutá <code className="agm-mono">agamotto simulate</code>.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
          <div className="agm-card">
            <div className="agm-card-h"><h3>PROBABILIDAD 1X2</h3><span className="agm-card-eyebrow">{pred.model_version}</span></div>
            <div style={{ padding: 24 }}>
              <ProbabilityBar pHome={pred.p_home} pDraw={pred.p_draw} pAway={pred.p_away} />
              <ProbLabels
                pHome={pred.p_home} pDraw={pred.p_draw} pAway={pred.p_away}
                homeCode={match.home_team?.fifa_code ?? undefined} awayCode={match.away_team?.fifa_code ?? undefined}
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 32, textAlign: "center" }}>
                <Stat label="Gana local" value={pct(pred.p_home)} color="var(--green-deep)" />
                <Stat label="Empate" value={pct(pred.p_draw)} />
                <Stat label="Gana visitante" value={pct(pred.p_away)} color="var(--violet)" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16, textAlign: "center" }}>
                <Stat label="xG local" value={pred.lambda_home.toFixed(2)} />
                <Stat label="BTTS" value={pred.p_btts ? pct(pred.p_btts) : "—"} />
                <Stat label="xG visitante" value={pred.lambda_away.toFixed(2)} />
              </div>

              <h3 className="agm-display" style={{ marginTop: 32, fontSize: 12, letterSpacing: "0.16em", color: "var(--fg-3)" }}>
                TOP MARCADORES
              </h3>
              <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
                {pred.top_scorelines.slice(0, 8).map((s) => (
                  <li key={s.score} style={{ display: "flex", alignItems: "center", padding: "6px 0", fontSize: 13 }}>
                    <span className="agm-mono" style={{ color: "var(--fg-3)", width: 50 }}>{s.score}</span>
                    <div className="agm-bar" style={{ flex: 1, marginRight: 12, height: 5 }}>
                      <div className="agm-bar-fill" style={{ width: `${(s.p / pred.top_scorelines[0].p) * 100}%` }} />
                    </div>
                    <span className="agm-mono agm-num" style={{ color: "var(--green-deep)", width: 56, textAlign: "right" }}>
                      {pct(s.p, 2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="agm-card agm-card-pad">
              <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>FACTORES CLAVE</div>
              <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
                {pred.top_factors.map((f, i) => (
                  <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 12, borderBottom: "1px solid var(--line)" }}>
                    <span style={{ color: "var(--fg-2)" }}>{f.name}</span>
                    <span className={`agm-pill agm-pill-${f.direction === "home" ? "green" : f.direction === "away" ? "violet" : ""}`} style={{ fontSize: 9 }}>
                      {f.direction === "home" ? "LOCAL" : f.direction === "away" ? "VISITA" : "NEUTRAL"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {match.venue && (
              <div className="agm-card agm-card-pad">
                <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.14em" }}>SEDE</div>
                <h3 style={{ marginTop: 8, fontSize: 16 }}>{match.venue.name}</h3>
                <dl style={{ marginTop: 12, fontSize: 12 }}>
                  <Row k="Capacidad" v={match.venue.capacity?.toLocaleString() ?? "—"} />
                  <Row k="Altitud" v={`${match.venue.altitude_m ?? 0} msnm`} />
                  <Row k="Césped" v={match.venue.surface ?? "—"} />
                  <Row k="Techo" v={match.venue.roof ?? "—"} />
                  <Row k="Huso" v={match.venue.timezone} />
                </dl>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="agm-mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.12em" }}>{label.toUpperCase()}</div>
      <div className="agm-display agm-num" style={{ fontSize: 28, color: color ?? "var(--fg-0)", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <dt style={{ color: "var(--fg-3)" }}>{k}</dt>
      <dd style={{ margin: 0, color: "var(--fg-0)" }}>{v}</dd>
    </div>
  );
}
