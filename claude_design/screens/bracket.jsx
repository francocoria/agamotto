// Bracket / Knockout — Multiverse-style bracket where line thickness == probability

// Half-bracket data. 8 R32 matches per side.
// score: [home prob, draw prob (decisive games can't draw — leave 0), away prob]
const LEFT_R32 = [
  { a: 'ARG', b: 'AUS', pA: 78, w: 'ARG' },
  { a: 'MEX', b: 'POR', pA: 32, w: 'POR' },
  { a: 'NED', b: 'JPN', pA: 64, w: 'NED' },
  { a: 'CRO', b: 'KOR', pA: 58, w: 'CRO' },
  { a: 'BRA', b: 'SEN', pA: 71, w: 'BRA' },
  { a: 'URU', b: 'SUI', pA: 56, w: 'URU' },
  { a: 'COL', b: 'ECU', pA: 53, w: 'COL' },
  { a: 'GER', b: 'CAN', pA: 68, w: 'GER' },
];
const RIGHT_R32 = [
  { a: 'FRA', b: 'DEN', pA: 66, w: 'FRA' },
  { a: 'BEL', b: 'MAR', pA: 51, w: 'BEL' },
  { a: 'ESP', b: 'USA', pA: 60, w: 'ESP' },
  { a: 'ITA', b: 'AUS', pA: 62, w: 'ITA' },
  { a: 'ENG', b: 'SEN', pA: 64, w: 'ENG' },
  { a: 'POR', b: 'JPN', pA: 58, w: 'POR' },
  { a: 'GER', b: 'CRO', pA: 52, w: 'GER' },
  { a: 'NED', b: 'SUI', pA: 61, w: 'NED' },
];

const LEFT_R16 = [
  { a: 'ARG', b: 'POR', pA: 62 },
  { a: 'NED', b: 'CRO', pA: 56 },
  { a: 'BRA', b: 'URU', pA: 68 },
  { a: 'COL', b: 'GER', pA: 44 },
];
const RIGHT_R16 = [
  { a: 'FRA', b: 'BEL', pA: 58 },
  { a: 'ESP', b: 'ITA', pA: 55 },
  { a: 'ENG', b: 'POR', pA: 53 },
  { a: 'GER', b: 'NED', pA: 47 },
];

const LEFT_QF = [
  { a: 'ARG', b: 'NED', pA: 60 },
  { a: 'BRA', b: 'GER', pA: 58 },
];
const RIGHT_QF = [
  { a: 'FRA', b: 'ESP', pA: 54 },
  { a: 'ENG', b: 'NED', pA: 55 },
];

const SF = [
  { a: 'ARG', b: 'BRA', pA: 52, side: 'L' },
  { a: 'FRA', b: 'ENG', pA: 51, side: 'R' },
];

const FINAL = { a: 'ARG', b: 'FRA', pA: 53 };

// A compact knockout match block
function KMatch({ a, b, pA, focused = false, w = 'A' }) {
  const winA = w === 'A' || w === a;
  return (
    <div style={{
      background: 'var(--bg-1)',
      border: `1px solid ${focused ? 'var(--green)' : 'var(--line)'}`,
      borderRadius: 6,
      overflow: 'hidden',
      boxShadow: focused ? '0 0 0 1px var(--green), 0 4px 12px var(--green-glow)' : 'var(--shadow-card)',
      width: '100%',
      transition: 'all .15s',
    }}>
      <Side code={a} pct={pA} winner={winA} />
      <div style={{ height: 1, background: 'var(--line)' }} />
      <Side code={b} pct={100 - pA} winner={!winA} />
    </div>
  );
}
function Side({ code, pct, winner }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 8px',
      background: winner ? 'var(--green-bg)' : 'transparent',
      position: 'relative',
    }}>
      <span className="agm-flag-emoji" style={{ fontSize: 12 }}>{COUNTRIES[code]?.f}</span>
      <span className="agm-mono" style={{
        fontSize: 10, fontWeight: winner ? 700 : 500,
        color: winner ? 'var(--green-deep)' : 'var(--fg-2)',
        letterSpacing: '0.04em', flex: 1,
      }}>{code}</span>
      <span className="agm-mono" style={{ fontSize: 9, color: winner ? 'var(--green-deep)' : 'var(--fg-3)' }}>
        {pct}%
      </span>
    </div>
  );
}

// Renders one full column of matches with vertical spread
function Col({ matches, top, height, width, leftPx, label, focusIdx = -1 }) {
  const step = height / matches.length;
  return (
    <div style={{ position: 'absolute', left: leftPx, top: top, width, height }}>
      <div style={{
        fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.2em',
        textAlign: 'center', marginBottom: 8, fontWeight: 700,
      }}>{label}</div>
      {matches.map((m, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: i * step + step / 2 - 22 + 16,
        }}>
          <KMatch {...m} focused={i === focusIdx} />
        </div>
      ))}
    </div>
  );
}

// Compute connector lines between adjacent columns
function Connector({ from, to, w = 1, color = 'rgba(255,255,255,0.12)', dashed = false }) {
  const midX = (from.x + to.x) / 2;
  const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  return <path d={d} stroke={color} strokeWidth={w} fill="none" strokeDasharray={dashed ? '3 4' : null} strokeLinecap="round" />;
}

// ─── DESKTOP ───
function BracketDesktop() {
  const t = useT();
  const W = 1600, contentH = 720, topPad = 100;
  return <BracketDesktopInner t={t} W={W} contentH={contentH} topPad={topPad} />;
}

function BracketDesktopInner({ t, W, contentH, topPad }) {
  // Column x-positions (centers)
  const colW = 140;
  const xs = [60, 230, 400, 570, 800 - colW/2 + 60]; // mid for final visual

  // Layout y centers for each col's matches
  const ys = (n, top, h) => Array.from({ length: n }, (_, i) => top + h / n * (i + 0.5));
  const leftYs32 = ys(8, topPad, contentH);
  const leftYs16 = ys(4, topPad, contentH);
  const leftYsQF = ys(2, topPad, contentH);
  const leftYsSF = ys(1, topPad, contentH);

  // Right side mirror
  const rightX32 = W - 60 - colW;
  const rightX16 = W - 230 - colW;
  const rightXQF = W - 400 - colW;
  const rightXSF = W - 570 - colW;

  // Final card center
  const cx = W / 2, cy = topPad + contentH / 2;

  return (
    <AppShell active="bracket">
      <TopNav active="bracket" />

      <div style={{ padding: '24px 40px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} className="agm-anim-fade-up">
        <div>
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.16em', marginBottom: 8 }}>
            ELIMINATORIA · ESCENARIO MODAL
          </div>
          <h1 className="agm-display" style={{ fontSize: 30, letterSpacing: '0.03em' }}>
            {t('br_title')}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>{t('br_sub')}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <LegendItem color="var(--green)" label="P > 60%" />
          <LegendItem color="var(--violet)" label="P < 30%" />
          <span className="agm-pill agm-pill-green" style={{ height: 22 }}>
            <span className="agm-dot agm-dot-green agm-dot-pulse" /> {t('baseline')}
          </span>
        </div>
      </div>

      {/* Bracket SVG layer + match cards overlay */}
      <div style={{ position: 'relative', flex: 1, minHeight: 800 }}>
        <svg viewBox={`0 0 ${W} ${topPad + contentH + 80}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* Round labels */}
          {[
            [60 + colW/2, t('r32')],
            [230 + colW/2, t('r16')],
            [400 + colW/2, t('qf')],
            [570 + colW/2, t('sf')],
            [cx, t('final')],
            [W - 60 - colW/2, t('r32')],
            [W - 230 - colW/2, t('r16')],
            [W - 400 - colW/2, t('qf')],
            [W - 570 - colW/2, t('sf')],
          ].map(([x, l], i) => (
            <text key={i} x={x} y={topPad - 30} fill="var(--fg-3)" fontFamily="var(--font-mono)"
              fontSize="10" textAnchor="middle" letterSpacing="3">{l.toUpperCase()}</text>
          ))}

          {/* LEFT side connectors */}
          {LEFT_R32.map((m, i) => {
            const y1 = leftYs32[i];
            const y2 = leftYs16[Math.floor(i / 2)];
            const prob = m.pA / 100;
            const w = 0.5 + prob * 2.2;
            const color = prob > 0.6 ? 'color-mix(in srgb, var(--green) 65%, transparent)' : prob > 0.4 ? 'var(--line-2)' : 'color-mix(in srgb, var(--violet) 55%, transparent)';
            return <Connector key={`l32-${i}`} from={{ x: 60 + colW, y: y1 }} to={{ x: 230, y: y2 }} w={w} color={color} dashed={prob < 0.35} />;
          })}
          {LEFT_R16.map((m, i) => {
            const y1 = leftYs16[i];
            const y2 = leftYsQF[Math.floor(i / 2)];
            const prob = m.pA / 100;
            const w = 0.5 + prob * 2.2;
            const color = prob > 0.6 ? 'color-mix(in srgb, var(--green) 70%, transparent)' : prob > 0.4 ? 'var(--line-2)' : 'color-mix(in srgb, var(--violet) 55%, transparent)';
            return <Connector key={`l16-${i}`} from={{ x: 230 + colW, y: y1 }} to={{ x: 400, y: y2 }} w={w} color={color} dashed={prob < 0.35} />;
          })}
          {LEFT_QF.map((m, i) => {
            const y1 = leftYsQF[i];
            const y2 = leftYsSF[0];
            const prob = m.pA / 100;
            const w = 0.5 + prob * 2.5;
            const color = prob > 0.55 ? 'color-mix(in srgb, var(--green) 80%, transparent)' : 'color-mix(in srgb, var(--violet) 60%, transparent)';
            return <Connector key={`lqf-${i}`} from={{ x: 400 + colW, y: y1 }} to={{ x: 570, y: y2 }} w={w} color={color} />;
          })}
          {/* L SF → Final */}
          <Connector from={{ x: 570 + colW, y: leftYsSF[0] }} to={{ x: cx - 70, y: cy }} w={3} color="color-mix(in srgb, var(--green) 90%, transparent)" />

          {/* RIGHT side connectors (mirror) */}
          {RIGHT_R32.map((m, i) => {
            const y1 = leftYs32[i];
            const y2 = leftYs16[Math.floor(i / 2)];
            const prob = m.pA / 100;
            const w = 0.5 + prob * 2.2;
            const color = prob > 0.6 ? 'color-mix(in srgb, var(--green) 65%, transparent)' : prob > 0.4 ? 'var(--line-2)' : 'color-mix(in srgb, var(--violet) 55%, transparent)';
            return <Connector key={`r32-${i}`} from={{ x: rightX32, y: y1 }} to={{ x: rightX16 + colW, y: y2 }} w={w} color={color} dashed={prob < 0.35} />;
          })}
          {RIGHT_R16.map((m, i) => {
            const y1 = leftYs16[i];
            const y2 = leftYsQF[Math.floor(i / 2)];
            const prob = m.pA / 100;
            const w = 0.5 + prob * 2.2;
            const color = prob > 0.6 ? 'color-mix(in srgb, var(--green) 70%, transparent)' : prob > 0.4 ? 'var(--line-2)' : 'color-mix(in srgb, var(--violet) 55%, transparent)';
            return <Connector key={`r16-${i}`} from={{ x: rightX16, y: y1 }} to={{ x: rightXQF + colW, y: y2 }} w={w} color={color} />;
          })}
          {RIGHT_QF.map((m, i) => {
            const y1 = leftYsQF[i];
            const y2 = leftYsSF[0];
            const prob = m.pA / 100;
            const w = 0.5 + prob * 2.5;
            const color = prob > 0.55 ? 'color-mix(in srgb, var(--green) 80%, transparent)' : 'color-mix(in srgb, var(--violet) 60%, transparent)';
            return <Connector key={`rqf-${i}`} from={{ x: rightXQF, y: y1 }} to={{ x: rightXSF + colW, y: y2 }} w={w} color={color} />;
          })}
          <Connector from={{ x: rightXSF, y: leftYsSF[0] }} to={{ x: cx + 70, y: cy }} w={3} color="color-mix(in srgb, var(--green) 90%, transparent)" />

          {/* Center halo behind final */}
          <defs>
            <radialGradient id="trophy-halo">
              <stop offset="0" stopColor="color-mix(in srgb, var(--green) 55%, transparent)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={120} fill="url(#trophy-halo)" />
        </svg>

        {/* MATCH CARDS */}
        {/* LEFT R32 */}
        {LEFT_R32.map((m, i) => (
          <div key={`L32-${i}`} style={{ position: 'absolute', left: 60, width: colW, top: leftYs32[i] - 20 }}>
            <KMatch {...m} focused={i === 0} />
          </div>
        ))}
        {LEFT_R16.map((m, i) => (
          <div key={`L16-${i}`} style={{ position: 'absolute', left: 230, width: colW, top: leftYs16[i] - 20 }}>
            <KMatch {...m} focused={i === 0} />
          </div>
        ))}
        {LEFT_QF.map((m, i) => (
          <div key={`LQF-${i}`} style={{ position: 'absolute', left: 400, width: colW, top: leftYsQF[i] - 20 }}>
            <KMatch {...m} />
          </div>
        ))}
        <div style={{ position: 'absolute', left: 570, width: colW, top: leftYsSF[0] - 20 }}>
          <KMatch {...SF[0]} focused />
        </div>

        {/* RIGHT (mirror) */}
        {RIGHT_R32.map((m, i) => (
          <div key={`R32-${i}`} style={{ position: 'absolute', left: rightX32, width: colW, top: leftYs32[i] - 20 }}>
            <KMatch {...m} />
          </div>
        ))}
        {RIGHT_R16.map((m, i) => (
          <div key={`R16-${i}`} style={{ position: 'absolute', left: rightX16, width: colW, top: leftYs16[i] - 20 }}>
            <KMatch {...m} />
          </div>
        ))}
        {RIGHT_QF.map((m, i) => (
          <div key={`RQF-${i}`} style={{ position: 'absolute', left: rightXQF, width: colW, top: leftYsQF[i] - 20 }}>
            <KMatch {...m} />
          </div>
        ))}
        <div style={{ position: 'absolute', left: rightXSF, width: colW, top: leftYsSF[0] - 20 }}>
          <KMatch {...SF[1]} focused />
        </div>

        {/* FINAL card — central, special */}
        <div style={{
          position: 'absolute', left: cx - 80, top: cy - 60, width: 160,
        }}>
          <div className="agm-eye-border" style={{ borderRadius: 10 }}>
            <div style={{
              background: 'linear-gradient(180deg, var(--green-bg-2), var(--bg-1))',
              border: '1px solid color-mix(in srgb, var(--green) 55%, transparent)',
              borderRadius: 10,
              padding: '12px 12px 14px',
              textAlign: 'center',
            }}>
              <div className="agm-display" style={{
                fontSize: 11, letterSpacing: '0.3em', color: 'var(--green-soft)', marginBottom: 8,
              }}>FINAL</div>
              <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', marginBottom: 10 }}>
                METLIFE · 19.JUL.2026
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span className="agm-flag-emoji" style={{ fontSize: 26 }}>{COUNTRIES[FINAL.a]?.f}</span>
                  <div className="agm-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-soft)', marginTop: 4 }}>{FINAL.a}</div>
                  <div className="agm-mono" style={{ fontSize: 10, color: 'var(--green-soft)' }}>{FINAL.pA}%</div>
                </div>
                <div className="agm-display" style={{ fontSize: 12, color: 'var(--fg-3)' }}>VS</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span className="agm-flag-emoji" style={{ fontSize: 26 }}>{COUNTRIES[FINAL.b]?.f}</span>
                  <div className="agm-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-2)', marginTop: 4 }}>{FINAL.b}</div>
                  <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{100 - FINAL.pA}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* footer scrubber */}
      <div style={{
        padding: '14px 40px', borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
        background: 'var(--bg-1)',
      }}>
        <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
          CONFIANZA TÍTULO ARG · 53.4% (IC 95%: 41.1 – 66.0)
        </div>
        <div style={{ flex: 1, position: 'relative', height: 4, background: 'var(--bg-3)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', left: '12%', right: '34%', top: 0, bottom: 0, background: 'linear-gradient(90deg, var(--violet), var(--green))', borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: '53.4%', top: -3, width: 2, height: 10, background: 'var(--green)', boxShadow: '0 0 8px var(--green-glow)' }} />
        </div>
        <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>N = 100k</div>
      </div>
    </AppShell>
  );
}

// ─── MOBILE ───
function BracketMobile() {
  const t = useT();
  // Show route ARG (a champion) takes: R32 → R16 → QF → SF → Final
  const route = [
    { round: t('r32'), m: LEFT_R32[0], advanced: true },
    { round: t('r16'), m: LEFT_R16[0], advanced: true },
    { round: t('qf'),  m: LEFT_QF[0],  advanced: true },
    { round: t('sf'),  m: SF[0],       advanced: true },
    { round: t('final'), m: FINAL,    advanced: true, isFinal: true },
  ];
  return (
    <AppShell active="bracket" mobile>
      <MobileBar title="LLAVE" />

      <section style={{ padding: '20px 18px 8px' }}>
        <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.2em', marginBottom: 6 }}>
          UNIVERSO MODAL · BASELINE
        </div>
        <h1 className="agm-display" style={{ fontSize: 24, letterSpacing: '0.03em', color: 'var(--fg-0)' }}>{t('br_title')}</h1>
      </section>

      {/* Tab selector */}
      <section style={{ padding: '8px 18px' }}>
        <div style={{
          display: 'flex', gap: 0, background: 'var(--bg-2)',
          border: '1px solid var(--line)', borderRadius: 999, padding: 3,
        }}>
          {['ARG', 'BRA', 'FRA', 'ESP'].map((c, i) => (
            <button key={c} style={{
              flex: 1, height: 30, borderRadius: 999, border: 0,
              background: i === 0 ? 'var(--bg-3)' : 'transparent',
              color: i === 0 ? 'var(--green-soft)' : 'var(--fg-3)',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span className="agm-flag-emoji" style={{ fontSize: 11 }}>{COUNTRIES[c]?.f}</span>
              {c}
            </button>
          ))}
        </div>
        <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', textAlign: 'center', marginTop: 10, letterSpacing: '0.12em' }}>
          CAMINO PROYECTADO HACIA EL TÍTULO
        </div>
      </section>

      {/* Route timeline */}
      <section style={{ padding: '12px 18px 30px' }}>
        <div style={{ position: 'relative' }}>
          {/* vertical track */}
          <div style={{
            position: 'absolute', left: 22, top: 16, bottom: 16, width: 2,
            background: 'linear-gradient(180deg, var(--green), var(--violet))',
            boxShadow: '0 0 12px var(--green-glow)',
          }} />
          {route.map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, marginBottom: 14, position: 'relative',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--bg-1)',
                border: `2px solid ${r.isFinal ? 'var(--green)' : 'color-mix(in srgb, var(--green) 55%, transparent)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--green-soft)', fontFamily: 'var(--font-mono)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                zIndex: 1, flexShrink: 0,
                boxShadow: r.isFinal ? '0 0 16px var(--green-glow)' : 'none',
              }}>{r.round.slice(0, 4)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em', marginBottom: 6, textTransform: 'uppercase' }}>
                  {r.round} · {r.isFinal ? '19 JUL · METLIFE' : '· '}
                </div>
                <KMatch {...r.m} focused={r.isFinal} />
                {!r.isFinal && (
                  <div className="agm-mono" style={{ marginTop: 6, fontSize: 10, color: 'var(--green-soft)' }}>
                    avanza con p = {r.m.pA}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Title chance summary */}
        <div className="agm-card agm-card-pad" style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.16em', marginBottom: 6 }}>
            P(ARG · TÍTULO)
          </div>
          <div className="agm-display" style={{ fontSize: 44, lineHeight: 1, color: 'var(--green-deep)' }}>
            <AnimNum value={14.8} format={(v) => v.toFixed(1)} duration={1200} />
            <span style={{ fontSize: 18 }}>%</span>
          </div>
          <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 6 }}>
            IC 95% · 11.2 – 18.9 · n = 100k
          </div>
        </div>
      </section>

      <MobileTabs active="bracket" />
    </AppShell>
  );
}

Object.assign(window, { BracketDesktop, BracketMobile });
