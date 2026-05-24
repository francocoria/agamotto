import Link from "next/link";
import type { ChampionEntry } from "@/lib/api";

export function ChampionsTable({ entries, top = 16 }: { entries: ChampionEntry[]; top?: number }) {
  const max = Math.max(...entries.map((e) => e.p), 0.0001);
  const rows = entries.slice(0, top);
  return (
    <table className="agm-table">
      <thead>
        <tr>
          <th className="agm-th" style={{ width: 36, textAlign: "center" }}>#</th>
          <th className="agm-th">SEL.</th>
          <th className="agm-th" style={{ width: 80 }}>CONF.</th>
          <th className="agm-th" style={{ minWidth: 140 }}>P(TÍTULO)</th>
          <th className="agm-th" style={{ width: 80, textAlign: "right" }}></th>
        </tr>
      </thead>
      <tbody className="agm-stagger">
        {rows.map((e, i) => (
          <tr key={e.team} className="agm-tr-hover">
            <td className="agm-td agm-mono" style={{ color: "var(--fg-3)", textAlign: "center" }}>
              {String(i + 1).padStart(2, "0")}
            </td>
            <td className="agm-td">
              <Link href={`/teams/${e.team}`} className="agm-flag">
                <span className="agm-flag-emoji" style={{ fontSize: 16 }}>{e.flag ?? "🏳️"}</span>
                <span className="agm-mono" style={{ fontWeight: 700, color: "var(--fg-3)" }}>{e.team}</span>
                <span style={{ fontWeight: 500, color: "var(--fg-0)", fontFamily: "var(--font-sans)" }}>{e.name ?? e.team}</span>
              </Link>
            </td>
            <td className="agm-td agm-mono" style={{ color: "var(--fg-3)", fontSize: 10 }}>{e.confederation ?? "—"}</td>
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
        ))}
      </tbody>
    </table>
  );
}
