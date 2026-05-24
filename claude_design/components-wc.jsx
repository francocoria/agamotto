// World Cup–specific components: ticker, groups, venues, fixture strip, broadcast bits

// ─── Live results ticker (broadcast feel) ───
const TICKER_DATA = [
  { home: 'ARG', away: 'AUS', hs: 2, as: 0, st: 'FT'    },
  { home: 'BRA', away: 'SEN', hs: 1, as: 1, st: '76\''  },
  { home: 'FRA', away: 'KOR', hs: 3, as: 0, st: 'FT'    },
  { home: 'ESP', away: 'USA', hs: 2, as: 1, st: '32\''  },
  { home: 'POR', away: 'JPN', hs: 0, as: 0, st: 'HT'    },
  { home: 'NED', away: 'JPN', hs: 1, as: 0, st: 'FT'    },
  { home: 'ENG', away: 'SEN', hs: 4, as: 1, st: 'FT'    },
  { home: 'ITA', away: 'MAR', hs: 2, as: 2, st: '88\''  },
  { home: 'GER', away: 'CAN', hs: 3, as: 0, st: 'FT'    },
  { home: 'BEL', away: 'MAR', hs: 1, as: 2, st: '63\''  },
  { home: 'CRO', away: 'KOR', hs: 2, as: 1, st: 'FT'    },
  { home: 'URU', away: 'SUI', hs: 0, as: 0, st: '12\''  },
];

function TickerItem({ m }) {
  const live = /['']/g.test(m.st) || m.st === 'HT';
  const winner = m.hs > m.as ? 'home' : m.hs < m.as ? 'away' : null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '0 22px',
      borderRight: '1px solid var(--line)',
      height: '100%',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
        letterSpacing: '0.1em',
        color: live ? 'var(--red)' : 'var(--fg-3)',
        minWidth: 24, textAlign: 'right',
      }}>
        {live && <span className="agm-dot agm-dot-pulse" style={{ background: 'var(--red)', marginRight: 4, width: 5, height: 5 }} />}
        {m.st}
      </span>
      <span className="agm-flag-emoji" style={{ fontSize: 14 }}>{COUNTRIES[m.home]?.f}</span>
      <span className="agm-mono" style={{
        fontSize: 12, fontWeight: winner === 'home' ? 700 : 500,
        color: winner === 'home' ? 'var(--fg-0)' : 'var(--fg-2)',
      }}>{m.home}</span>
      <span className="agm-broadcast" style={{
        fontSize: 18, color: 'var(--fg-0)',
        fontFamily: 'var(--font-broadcast)', letterSpacing: '0.04em',
      }}>
        {m.hs} <span style={{ color: 'var(--fg-3)' }}>:</span> {m.as}
      </span>
      <span className="agm-mono" style={{
        fontSize: 12, fontWeight: winner === 'away' ? 700 : 500,
        color: winner === 'away' ? 'var(--fg-0)' : 'var(--fg-2)',
      }}>{m.away}</span>
      <span className="agm-flag-emoji" style={{ fontSize: 14 }}>{COUNTRIES[m.away]?.f}</span>
    </span>
  );
}

function TickerBar() {
  // Duplicate the data so the marquee loops seamlessly
  const items = [...TICKER_DATA, ...TICKER_DATA];
  return (
    <div style={{
      height: 38,
      background: 'var(--bg-1)',
      borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'stretch',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--red) 0%, #b81e1e 100%)',
        color: '#fff', padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-display)',
        fontWeight: 800, fontSize: 11,
        letterSpacing: '0.2em',
        flexShrink: 0,
        position: 'relative', zIndex: 2,
        boxShadow: '6px 0 12px rgba(0,0,0,0.06)',
      }}>
        <span className="agm-dot agm-dot-pulse" style={{ background: '#fff', width: 5, height: 5 }} />
        EN VIVO
      </div>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', height: '100%',
          animation: 'agm-ticker 90s linear infinite',
          whiteSpace: 'nowrap',
        }}>
          {items.map((m, i) => <TickerItem key={i} m={m} />)}
        </div>
      </div>
      <div style={{
        flexShrink: 0, padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderLeft: '1px solid var(--line)',
        background: 'var(--bg-2)',
      }}>
        <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
          MATCHDAY 12 · 22 JUN 2026
        </span>
      </div>
      <style>{`@keyframes agm-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// ─── Stadium SVG silhouette ───
function StadiumIcon({ w = 40, h = 22 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 40 22" fill="none">
      <path d="M2 18 Q 2 8, 20 8 Q 38 8, 38 18 Z" stroke="var(--fg-2)" strokeWidth="1" fill="var(--bg-2)" />
      <path d="M2 18 L 38 18" stroke="var(--fg-3)" strokeWidth="0.6" />
      <path d="M6 14 L 10 14 M30 14 L 34 14" stroke="var(--green-deep)" strokeWidth="1" />
      <ellipse cx="20" cy="14" rx="6" ry="2" stroke="var(--green-deep)" strokeWidth="0.6" fill="none" />
      <line x1="20" y1="12" x2="20" y2="16" stroke="var(--green-deep)" strokeWidth="0.5" />
    </svg>
  );
}

// ─── Trophy icon ───
function TrophyIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path d="M5 3h12v6a6 6 0 0 1-12 0V3z" fill="var(--green)" stroke="var(--green-deep)" strokeWidth="0.6" />
      <path d="M5 4H2v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3" stroke="var(--green-deep)" strokeWidth="1" fill="none" />
      <rect x="9" y="14" width="4" height="3" fill="var(--green-deep)" />
      <rect x="7" y="17" width="8" height="2" rx="0.5" fill="var(--green-deep)" />
      <circle cx="11" cy="7" r="2" fill="var(--bg-1)" opacity="0.4" />
    </svg>
  );
}

// ─── Football icon ───
function BallIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="var(--fg-0)" />
      <polygon points="7,3.5 9.2,5 8.4,7.4 5.6,7.4 4.8,5" fill="var(--bg-1)" />
      <path d="M7 3.5 L 7 1.5 M 9.2 5 L 11 4 M 8.4 7.4 L 10 9 M 5.6 7.4 L 4 9 M 4.8 5 L 3 4" stroke="var(--bg-1)" strokeWidth="0.5" />
    </svg>
  );
}

// ─── Group circular badge ───
function GroupBadge({ letter, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--green-bg-2)',
      border: '1px solid rgba(10, 153, 86, 0.4)',
      color: 'var(--green-deep)',
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: size * 0.5,
      letterSpacing: '0.02em',
      display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
    }}>{letter}</div>
  );
}

// ─── Group card (mini standings) ───
function GroupCard({ letter, teams }) {
  return (
    <div className="agm-card agm-lift" style={{ padding: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GroupBadge letter={letter} size={26} />
          <span className="agm-display" style={{ fontSize: 13, color: 'var(--fg-0)', fontWeight: 700, letterSpacing: '0.08em' }}>
            GRUPO {letter}
          </span>
        </div>
        <span className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>
          MD 2/3
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {teams.map((tm, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '14px 1fr 28px 28px 36px',
            alignItems: 'center', gap: 8,
            padding: '6px 0',
            borderBottom: i < teams.length - 1 ? '1px solid var(--line)' : 'none',
            opacity: i < 2 ? 1 : 0.65,
          }}>
            <span className="agm-mono" style={{
              fontSize: 9, color: i < 2 ? 'var(--green-deep)' : 'var(--fg-3)',
              fontWeight: 700,
            }}>{i + 1}</span>
            <Flag code={tm.code} size={11} />
            <span className="agm-mono agm-num" style={{ fontSize: 10, color: 'var(--fg-2)', textAlign: 'center' }}>
              {tm.pj}
            </span>
            <span className="agm-mono agm-num" style={{
              fontSize: 10, color: tm.gd > 0 ? 'var(--green-deep)' : tm.gd < 0 ? 'var(--red)' : 'var(--fg-3)',
              textAlign: 'center',
            }}>
              {tm.gd > 0 ? '+' : ''}{tm.gd}
            </span>
            <span className="agm-mono agm-num" style={{
              fontSize: 12, color: 'var(--fg-0)', fontWeight: 700, textAlign: 'right',
            }}>{tm.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 12 groups × 4 teams = 48 selections
const GROUPS = [
  { letter: 'A', teams: [{ code: 'MEX', pj: 2, gd: +3, pts: 6 }, { code: 'URU', pj: 2, gd: +1, pts: 4 }, { code: 'CAN', pj: 2, gd: -1, pts: 1 }, { code: 'JPN', pj: 2, gd: -3, pts: 0 }] },
  { letter: 'B', teams: [{ code: 'USA', pj: 2, gd: +4, pts: 6 }, { code: 'COL', pj: 2, gd: +2, pts: 4 }, { code: 'ECU', pj: 2, gd:  0, pts: 3 }, { code: 'KOR', pj: 2, gd: -6, pts: 0 }] },
  { letter: 'C', teams: [{ code: 'ARG', pj: 2, gd: +5, pts: 6 }, { code: 'CRO', pj: 2, gd: +1, pts: 3 }, { code: 'CAN', pj: 2, gd: -2, pts: 1 }, { code: 'AUS', pj: 2, gd: -4, pts: 1 }] },
  { letter: 'D', teams: [{ code: 'ENG', pj: 2, gd: +3, pts: 6 }, { code: 'KOR', pj: 2, gd: +1, pts: 3 }, { code: 'MAR', pj: 2, gd:  0, pts: 3 }, { code: 'AUS', pj: 2, gd: -4, pts: 0 }] },
  { letter: 'E', teams: [{ code: 'GER', pj: 2, gd: +4, pts: 6 }, { code: 'POR', pj: 2, gd: +2, pts: 4 }, { code: 'DEN', pj: 2, gd: -2, pts: 1 }, { code: 'JPN', pj: 2, gd: -4, pts: 0 }] },
  { letter: 'F', teams: [{ code: 'FRA', pj: 2, gd: +6, pts: 6 }, { code: 'BEL', pj: 2, gd: +1, pts: 3 }, { code: 'MAR', pj: 2, gd: -1, pts: 3 }, { code: 'SEN', pj: 2, gd: -6, pts: 0 }] },
  { letter: 'G', teams: [{ code: 'BRA', pj: 2, gd: +5, pts: 6 }, { code: 'SEN', pj: 2, gd: +1, pts: 4 }, { code: 'SUI', pj: 2, gd:  0, pts: 1 }, { code: 'ECU', pj: 2, gd: -6, pts: 0 }] },
  { letter: 'H', teams: [{ code: 'ESP', pj: 2, gd: +4, pts: 6 }, { code: 'URU', pj: 2, gd: +2, pts: 4 }, { code: 'COL', pj: 2, gd: -2, pts: 1 }, { code: 'JPN', pj: 2, gd: -4, pts: 0 }] },
  { letter: 'I', teams: [{ code: 'CRO', pj: 2, gd: +2, pts: 4 }, { code: 'SUI', pj: 2, gd: +1, pts: 4 }, { code: 'MEX', pj: 2, gd:  0, pts: 3 }, { code: 'KOR', pj: 2, gd: -3, pts: 0 }] },
  { letter: 'J', teams: [{ code: 'NED', pj: 2, gd: +4, pts: 6 }, { code: 'JPN', pj: 2, gd: +1, pts: 3 }, { code: 'SEN', pj: 2, gd: -1, pts: 3 }, { code: 'AUS', pj: 2, gd: -4, pts: 0 }] },
  { letter: 'K', teams: [{ code: 'ITA', pj: 2, gd: +3, pts: 4 }, { code: 'MAR', pj: 2, gd: +2, pts: 4 }, { code: 'AUS', pj: 2, gd: -1, pts: 3 }, { code: 'CAN', pj: 2, gd: -4, pts: 0 }] },
  { letter: 'L', teams: [{ code: 'POR', pj: 2, gd: +5, pts: 6 }, { code: 'DEN', pj: 2, gd: +2, pts: 4 }, { code: 'COL', pj: 2, gd:  0, pts: 1 }, { code: 'SUI', pj: 2, gd: -7, pts: 0 }] },
];

// ─── Venue card ───
function VenueCard({ city, country, name, cap, code }) {
  return (
    <div className="agm-card agm-lift" style={{ padding: '14px 14px 12px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="agm-flag-emoji" style={{ fontSize: 16 }}>{COUNTRIES[country]?.f || '⚑'}</span>
          <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>{country}</span>
        </div>
        <span className="agm-mono" style={{
          fontSize: 8, color: 'var(--green-deep)',
          letterSpacing: '0.14em', fontWeight: 700,
        }}>{code}</span>
      </div>
      <StadiumIcon w={50} h={28} />
      <div className="agm-display" style={{
        fontSize: 14, fontWeight: 700, color: 'var(--fg-0)',
        letterSpacing: '0.02em', marginTop: 10,
      }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-2)', marginTop: 2 }}>{city}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <span className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
          CAP · <b style={{ color: 'var(--fg-1)' }}>{cap.toLocaleString()}</b>
        </span>
      </div>
    </div>
  );
}

const VENUES = [
  { code: 'NYC', city: 'East Rutherford',   country: 'USA', name: 'METLIFE', cap: 82500 },
  { code: 'DAL', city: 'Arlington',         country: 'USA', name: 'AT&T STADIUM', cap: 80000 },
  { code: 'LA',  city: 'Inglewood',         country: 'USA', name: 'SOFI STADIUM', cap: 70200 },
  { code: 'ATL', city: 'Atlanta',           country: 'USA', name: 'MERCEDES-BENZ', cap: 71000 },
  { code: 'KC',  city: 'Kansas City',       country: 'USA', name: 'ARROWHEAD', cap: 76500 },
  { code: 'BOS', city: 'Foxborough',        country: 'USA', name: 'GILLETTE', cap: 65900 },
  { code: 'PHI', city: 'Philadelphia',      country: 'USA', name: 'LINCOLN FIN.', cap: 69700 },
  { code: 'MIA', city: 'Miami Gardens',     country: 'USA', name: 'HARD ROCK', cap: 67500 },
  { code: 'HOU', city: 'Houston',           country: 'USA', name: 'NRG STADIUM', cap: 72200 },
  { code: 'SEA', city: 'Seattle',           country: 'USA', name: 'LUMEN FIELD', cap: 68700 },
  { code: 'SF',  city: 'Santa Clara',       country: 'USA', name: "LEVI'S",     cap: 68500 },
  { code: 'MEX', city: 'Ciudad de México',  country: 'MEX', name: 'AZTECA',     cap: 87000 },
  { code: 'GDL', city: 'Guadalajara',       country: 'MEX', name: 'AKRON',      cap: 49850 },
  { code: 'MTY', city: 'Monterrey',         country: 'MEX', name: 'BBVA',       cap: 53500 },
  { code: 'TOR', city: 'Toronto',           country: 'CAN', name: 'BMO FIELD',  cap: 45500 },
  { code: 'VAN', city: 'Vancouver',         country: 'CAN', name: 'BC PLACE',   cap: 54500 },
];

// ─── Fixture day strip (32 days of tournament) ───
function FixtureStrip() {
  // 32 days, varied match counts
  const days = Array.from({ length: 32 }, (_, i) => {
    const date = i + 11; // starts Jun 11
    const month = date <= 30 ? 'JUN' : 'JUL';
    const d = date <= 30 ? date : date - 30;
    // Match counts: heavy in group stage (4/day), lighter knockout
    let count = i < 12 ? 4 : i < 18 ? 3 : i < 22 ? 2 : i < 26 ? 1 : i < 30 ? 1 : 1;
    const phase = i < 14 ? 'group' : i < 18 ? 'r32' : i < 22 ? 'r16' : i < 25 ? 'qf' : i < 28 ? 'sf' : 'final';
    const isToday = i === 11;
    return { d, month, count, phase, isToday };
  });
  return (
    <div className="agm-card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="agm-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--fg-3)', fontWeight: 700 }}>
          CALENDARIO · 32 DÍAS · 104 PARTIDOS
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <LegendItem color="var(--green)" label="GRUPOS" />
          <LegendItem color="var(--violet)" label="ELIMINATORIA" />
          <LegendItem color="var(--red)" label="FINAL" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 56 }}>
        {days.map((d, i) => {
          const color = d.phase === 'group' ? 'var(--green)' : d.phase === 'final' ? 'var(--red)' : 'var(--violet)';
          const opacity = d.phase === 'group' ? 0.85 : 0.95;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%',
                height: `${d.count * 10 + 6}px`,
                background: color,
                opacity,
                borderRadius: '2px 2px 0 0',
                animation: `agm-bar-grow 0.5s ${0.02 * i}s cubic-bezier(0.2,0.7,0.3,1) both`,
                transformOrigin: 'bottom',
                outline: d.isToday ? `2px solid var(--red)` : 'none',
                outlineOffset: 1,
              }} />
              <div className="agm-mono" style={{
                fontSize: 8, color: d.isToday ? 'var(--red)' : 'var(--fg-3)',
                fontWeight: d.isToday ? 700 : 500,
                letterSpacing: '0.04em',
              }}>{d.d}</div>
            </div>
          );
        })}
      </div>
      <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 10, letterSpacing: '0.12em', display: 'flex', justifyContent: 'space-between' }}>
        <span>11 JUN · INAUGURACIÓN · AZTECA</span>
        <span><b style={{ color: 'var(--red)' }}>● HOY · 22 JUN</b></span>
        <span>19 JUL · FINAL · METLIFE</span>
      </div>
    </div>
  );
}

// ─── Big broadcast-style match card (for hero / featured) ───
function BroadcastCard({ home, away, hs, as, time, status, venue, p1x2 }) {
  return (
    <div className="agm-card" style={{ overflow: 'hidden', position: 'relative' }}>
      {/* status strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px',
        background: status === 'LIVE' ? 'linear-gradient(90deg, var(--red), #b81e1e)' : 'var(--bg-2)',
        color: status === 'LIVE' ? '#fff' : 'var(--fg-2)',
        fontSize: 10, fontFamily: 'var(--font-mono)',
        letterSpacing: '0.14em', fontWeight: 700,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status === 'LIVE' && <span className="agm-dot agm-dot-pulse" style={{ background: '#fff', width: 5, height: 5 }} />}
          {status} · {time}
        </span>
        <span>{venue}</span>
      </div>
      {/* score */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 18,
        padding: '20px 22px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="agm-flag-emoji" style={{ fontSize: 40 }}>{COUNTRIES[home]?.f}</span>
          <div>
            <div className="agm-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)' }}>{home}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{COUNTRIES[home]?.n}</div>
          </div>
        </div>
        <div className="agm-broadcast" style={{
          fontFamily: 'var(--font-broadcast)',
          fontSize: 58, lineHeight: 1, color: 'var(--fg-0)',
          letterSpacing: '0.02em',
        }}>
          {hs} <span style={{ color: 'var(--fg-3)' }}>:</span> {as}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="agm-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)' }}>{away}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{COUNTRIES[away]?.n}</div>
          </div>
          <span className="agm-flag-emoji" style={{ fontSize: 40 }}>{COUNTRIES[away]?.f}</span>
        </div>
      </div>
      {/* Probability bar */}
      <div style={{ padding: '0 22px 16px' }}>
        <Bar1X2 home={p1x2[0]} draw={p1x2[1]} away={p1x2[2]} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: 'var(--green-deep)' }}>{home} {p1x2[0]}%</span>
          <span style={{ color: 'var(--fg-2)' }}>X · {p1x2[1]}%</span>
          <span style={{ color: 'var(--violet)' }}>{away} {p1x2[2]}%</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  TickerBar, TickerItem, TICKER_DATA,
  StadiumIcon, TrophyIcon, BallIcon, GroupBadge,
  GroupCard, GROUPS, VenueCard, VENUES,
  FixtureStrip, BroadcastCard,
});
