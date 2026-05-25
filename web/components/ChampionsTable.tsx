import Link from "next/link";
import type { ChampionEntry, TeamOutlook } from "@/lib/api";

export function ChampionsTable({
  entries,
  outlook,
  groups,
  top = 16,
}: {
  entries: ChampionEntry[];
  outlook?: Record<string, TeamOutlook> | null;
  groups?: Record<string, string> | null; // team_id -> group label
  top?: number;
}) {
  const max = Math.max(...entries.map((e) => e.p), 0.0001);
  const rows = entries.slice(0, top);

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="agm-table" style={{ minWidth: 720 }}>
        <thead>
          <tr>
            <th className="agm-th" style={{ width: 38, textAlign: "center" }}>#</th>
            <th className="agm-th">SEL.</th>
            <th className="agm-th" style={{ width: 46, textAlign: "center" }}>GRP</th>
            <th className="agm-th" style={{ width: 60, textAlign: "right" }}>ELO</th>
            <th className="agm-th" style={{ width: 70, textAlign: "right" }}>R16</th>
            <th className="agm-th" style={{ width: 70, textAlign: "right" }}>QF</th>
            <th className="agm-th" style={{ width: 70, textAlign: "right" }}>SF</th>
            <th className="agm-th" style={{ minWidth: 120 }}>P(TÍTULO)</th>
            <th className="agm-th" style={{ width: 70, textAlign: "right" }}>%</th>
          </tr>
        </thead>
        <tbody className="agm-stagger">
          {rows.map((e, i) => {
            const o = outlook?.[e.team];
            const grp = groups?.[e.team] ?? "—";
            return (
              <tr key={e.team} className="agm-tr-hover">
                <td className="agm-td agm-mono" style={{ color: "var(--fg-3)", textAlign: "center" }}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="agm-td">
                  <Link href={`/teams/${e.team}`} className="agm-flag" style={{ textDecoration: "none" }}>
                    <span className="agm-flag-emoji" style={{ fontSize: 16 }}>{e.flag ?? "🏳️"}</span>
                    <span className="agm-mono" style={{ fontWeight: 700, color: "var(--fg-3)" }}>{e.team}</span>
                    <span style={{ fontWeight: 500, color: "var(--fg-0)", fontFamily: "var(--font-sans)" }}>
                      {e.name ?? e.team}
                    </span>
                  </Link>
                </td>
                <td className="agm-td agm-mono" style={{ color: "var(--fg-3)", textAlign: "center", fontSize: 11 }}>{grp}</td>
                <td className="agm-td agm-mono agm-num" style={{ textAlign: "right", color: "var(--fg-1)" }}>—</td>
                <NumCell v={o?.p_round_16} />
                <NumCell v={o?.p_quarter} />
                <NumCell v={o?.p_semi} />
                <td className="agm-td">
                  <div className="agm-bar" style={{ height: 5 }}>
                    <div className="agm-bar-fill" style={{ width: `${(e.p / max) * 100}%` }} />
                  </div>
                </td>
                <td className="agm-td agm-mono agm-num" style={{
                  textAlign: "right", color: "var(--fg-0)", fontWeight: 700, fontSize: 13,
                }}>
                  {(e.p * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NumCell({ v }: { v: number | undefined }) {
  return (
    <td className="agm-td agm-mono agm-num" style={{ textAlign: "right", color: v ? "var(--fg-2)" : "var(--fg-3)", fontSize: 11 }}>
      {v != null ? `${(v * 100).toFixed(1)}%` : "—"}
    </td>
  );
}
