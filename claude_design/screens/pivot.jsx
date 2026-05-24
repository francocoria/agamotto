// Pivot Matches screen

const PIVOTS = [
  {
    rank: 1, stage: 'OCTAVOS', date: 'JUL 04', time: '18:00',
    venue: 'AT&T STADIUM · DALLAS', host: 'USA',
    a: 'BRA', b: 'NED',
    p1x2: [44, 26, 30],
    entropy: 1.572,
    impact: 0.94,
    // outcomes: for each branch, top 3 changes to title probabilities of other teams
    branches: [
      { result: 'BRA gana', p: 44, deltas: [['BRA', +5.2], ['ARG', -1.8], ['FRA', -1.3]] },
      { result: 'Empate',   p: 26, deltas: [['ARG', +2.1], ['FRA', +1.6], ['BRA', -2.4]] },
      { result: 'NED gana', p: 30, deltas: [['NED', +6.8], ['BRA', -7.1], ['ENG', +1.4]] },
    ],
  },
  {
    rank: 2, stage: 'GRUPOS · J3', date: 'JUN 22', time: '21:00',
    venue: 'AZTECA · CIUDAD DE MÉXICO', host: 'MEX',
    a: 'ARG', b: 'MEX',
    p1x2: [62, 22, 16],
    entropy: 1.388,
    impact: 0.81,
    branches: [
      { result: 'ARG gana', p: 62, deltas: [['ARG', +1.4], ['MEX', -0.6], ['BRA', -0.3]] },
      { result: 'Empate',   p: 22, deltas: [['MEX', +1.2], ['ARG', -1.1], ['POR', +0.4]] },
      { result: 'MEX gana', p: 16, deltas: [['MEX', +4.3], ['ARG', -4.1], ['ESP', +0.8]] },
    ],
  },
  {
    rank: 3, stage: 'OCTAVOS', date: 'JUL 05', time: '15:00',
    venue: 'METLIFE · NEW JERSEY', host: 'USA',
    a: 'FRA', b: 'ESP',
    p1x2: [48, 24, 28],
    entropy: 1.541,
    impact: 0.88,
    branches: [
      { result: 'FRA gana', p: 48, deltas: [['FRA', +3.6], ['ESP', -3.9], ['ARG', -0.4]] },
      { result: 'Empate',   p: 24, deltas: [['ENG', +1.0], ['FRA', -0.8], ['ESP', -0.5]] },
      { result: 'ESP gana', p: 28, deltas: [['ESP', +5.4], ['FRA', -4.1], ['POR', +0.7]] },
    ],
  },
];

function PivotRow({ p, expanded }) {
  const t = useT();
  return (
    <div style={{
      border: `1px solid ${expanded ? 'rgba(34,217,126,0.35)' : 'var(--line)'}`,
      borderRadius: 12,
      background: expanded ? 'linear-gradient(180deg, rgba(34,217,126,0.04), rgba(11,17,23,0.85))' : 'rgba(17,24,31,0.6)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '40px 110px 1fr 220px 160px 140px',
        alignItems: 'center', gap: 18, padding: '18px 20px',
      }}>
        <div className="agm-display" style={{ fontSize: 24, color: 'var(--green-soft)', lineHeight: 1 }}>
          {String(p.rank).padStart(2, '0')}
        </div>

        <div>
          <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.15em', fontWeight: 700 }}>
            {p.stage}
          </div>
          <div className="agm-mono" style={{ fontSize: 11, color: 'var(--fg-1)', marginTop: 4 }}>
            {p.date} · {p.time}
          </div>
          <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 4 }}>
            {p.venue}
          </div>
        </div>

        {/* Match */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="agm-flag-emoji" style={{ fontSize: 30 }}>{COUNTRIES[p.a]?.f}</span>
            <span className="agm-mono" style={{ fontSize: 18, fontWeight: 700 }}>{p.a}</span>
          </div>
          <span className="agm-display" style={{ fontSize: 13, color: 'var(--fg-3)' }}>VS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="agm-mono" style={{ fontSize: 18, fontWeight: 700 }}>{p.b}</span>
            <span className="agm-flag-emoji" style={{ fontSize: 30 }}>{COUNTRIES[p.b]?.f}</span>
          </div>
        </div>

        {/* 1X2 */}
        <div>
          <Bar1X2 home={p.p1x2[0]} draw={p.p1x2[1]} away={p.p1x2[2]} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <span style={{ color: 'var(--green-soft)' }}>{p.p1x2[0]}%</span>
            <span style={{ color: 'var(--fg-2)' }}>{p.p1x2[1]}%</span>
            <span style={{ color: 'var(--violet-soft)' }}>{p.p1x2[2]}%</span>
          </div>
        </div>

        {/* Entropy */}
        <div>
          <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em' }}>
            ENTROPÍA
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span className="agm-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-soft)', textShadow: '0 0 12px var(--green-glow)' }}>
              {p.entropy.toFixed(3)}
            </span>
            <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>bits</span>
          </div>
          <div className="agm-bar" style={{ height: 3, marginTop: 6 }}>
            <div className="agm-bar-fill" style={{ width: `${(p.entropy / 1.585) * 100}%` }} />
          </div>
        </div>

        {/* Impact */}
        <div style={{ textAlign: 'right' }}>
          <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em' }}>
            IMPACTO
          </div>
          <div className="agm-display agm-glow-violet" style={{ fontSize: 26, marginTop: 4 }}>
            {p.impact.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Branches detail */}
      {expanded && (
        <div style={{ padding: '4px 20px 18px' }}>
          <div className="agm-rune-line" style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {p.branches.map((br, i) => (
              <div key={i} style={{
                background: 'var(--bg-2)', borderRadius: 8,
                border: '1px solid var(--line)',
                padding: '12px 14px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: i === 0 ? 'linear-gradient(90deg, var(--green), var(--green-soft))' : i === 1 ? 'var(--fg-3)' : 'linear-gradient(90deg, var(--violet), var(--violet-soft))',
                  borderRadius: '8px 8px 0 0',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-1)', fontWeight: 600 }}>{br.result}</span>
                  <span className="agm-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{br.p}%</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {br.deltas.map((d, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Flag code={d[0]} size={11} />
                      <span className="agm-mono" style={{
                        fontSize: 11, fontWeight: 600,
                        color: d[1] > 0 ? 'var(--green-soft)' : 'var(--red)',
                      }}>
                        {d[1] > 0 ? '+' : ''}{d[1].toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DESKTOP ───
function PivotDesktop() {
  const t = useT();
  return (
    <AppShell active="pivot">
      <TopNav active="pivot" />

      <div style={{ padding: '28px 40px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} className="agm-anim-fade-up">
        <div>
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.16em', marginBottom: 6 }}>
            ANÁLISIS DE ENTROPÍA · BIFURCACIONES
          </div>
          <h1 className="agm-display" style={{ fontSize: 30, letterSpacing: '0.03em' }}>
            {t('pv_title')}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>{t('pv_sub')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="agm-btn agm-btn-ghost" style={{ height: 34, fontSize: 11 }}>TODAS LAS FASES</button>
          <button className="agm-btn agm-btn-ghost" style={{ height: 34, fontSize: 11 }}>POR PAÍS</button>
          <button className="agm-btn agm-btn-ghost" style={{ height: 34, fontSize: 11 }}>EXPORTAR ↓</button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ padding: '12px 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }} className="agm-stagger">
        {[
          ['1.572', t('pv_entropy') + ' MÁX', 'bits', 'green'],
          ['12', 'PIVOTES > 1.4 bits', '·', 'green'],
          ['BRA — NED', 'PARTIDO PIVOTE #1', '·', 'violet'],
          ['ARG vs FRA', 'BIFURCACIÓN CLAVE', 'final', 'violet'],
        ].map(([v, l, u, a], i) => (
          <div key={i} className="agm-card agm-card-tight" style={{ paddingLeft: 26 }}>
            <Metric value={v} label={l} unit={u !== '·' ? u : undefined} accent={a} />
          </div>
        ))}
      </div>

      {/* Pivot list */}
      <div style={{ padding: '20px 40px 30px', display: 'flex', flexDirection: 'column', gap: 14 }} className="agm-stagger">
        <PivotRow p={PIVOTS[0]} expanded />
        <PivotRow p={PIVOTS[1]} />
        <PivotRow p={PIVOTS[2]} />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button className="agm-btn agm-btn-ghost" style={{ height: 36, fontSize: 11 }}>
            VER 9 PIVOTES MÁS →
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── MOBILE ───
function PivotMobile() {
  const t = useT();
  return (
    <AppShell active="pivot" mobile>
      <MobileBar title="PIVOTES" />

      <section style={{ padding: '22px 18px 8px' }} className="agm-anim-blur">
        <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.16em', marginBottom: 6 }}>
          BIFURCACIONES · ENTROPÍA
        </div>
        <h1 className="agm-display" style={{ fontSize: 24, letterSpacing: '0.03em', color: 'var(--fg-0)' }}>{t('pv_title')}</h1>
        <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 6 }}>{t('pv_sub')}</div>
      </section>

      <section style={{ padding: '16px 18px 6px' }}>
        {/* Hero pivot card */}
        <div style={{
          border: '1px solid rgba(34,217,126,0.4)',
          borderRadius: 14, padding: 16,
          background: 'linear-gradient(180deg, rgba(34,217,126,0.06), rgba(11,17,23,0.85))',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* watermark rank */}
          <div className="agm-display" style={{
            position: 'absolute', right: -10, top: -28,
            fontSize: 140, color: 'rgba(34,217,126,0.06)', fontWeight: 600,
          }}>01</div>

          <div className="agm-mono" style={{ fontSize: 9, color: 'var(--green-soft)', letterSpacing: '0.18em', marginBottom: 4 }}>
            #01 · PIVOTE PRINCIPAL · OCTAVOS
          </div>
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginBottom: 16 }}>
            JUL 04 · AT&T · DALLAS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <span className="agm-flag-emoji" style={{ fontSize: 32 }}>{COUNTRIES.BRA.f}</span>
              <div className="agm-mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>BRA</div>
            </div>
            <span className="agm-display" style={{ fontSize: 14, color: 'var(--fg-3)' }}>VS</span>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <span className="agm-flag-emoji" style={{ fontSize: 32 }}>{COUNTRIES.NED.f}</span>
              <div className="agm-mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>NED</div>
            </div>
          </div>
          <Bar1X2 home={44} draw={26} away={30} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <span style={{ color: 'var(--green-soft)' }}>44%</span>
            <span style={{ color: 'var(--fg-2)' }}>26%</span>
            <span style={{ color: 'var(--violet-soft)' }}>30%</span>
          </div>

          {/* Entropy + Impact */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16,
            paddingTop: 14, borderTop: '1px solid var(--line)',
          }}>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em' }}>
                ENTROPÍA
              </div>
              <div className="agm-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-soft)' }}>
                1.572 <span style={{ fontSize: 9, color: 'var(--fg-3)' }}>bits</span>
              </div>
            </div>
            <div>
              <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em' }}>
                IMPACTO
              </div>
              <div className="agm-display agm-glow-violet" style={{ fontSize: 20 }}>
                0.94
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Branch outcomes for pivot #1 */}
      <section style={{ padding: '14px 18px 0' }}>
        <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em', marginBottom: 10 }}>
          RAMAS DEL UNIVERSO
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PIVOTS[0].branches.map((br, i) => (
            <div key={i} style={{
              background: 'var(--bg-2)', borderRadius: 8,
              border: '1px solid var(--line)',
              padding: '12px 14px',
              borderLeft: `2px solid ${i === 0 ? 'var(--green)' : i === 1 ? 'var(--fg-3)' : 'var(--violet)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{br.result}</span>
                <span className="agm-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{br.p}%</span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {br.deltas.map((d, j) => (
                  <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Flag code={d[0]} size={10} />
                    <span className="agm-mono" style={{
                      fontSize: 11, fontWeight: 600,
                      color: d[1] > 0 ? 'var(--green-soft)' : 'var(--red)',
                    }}>
                      {d[1] > 0 ? '+' : ''}{d[1].toFixed(1)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other pivots */}
      <section style={{ padding: '24px 18px 30px' }}>
        <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em', marginBottom: 10 }}>
          PRÓXIMOS PIVOTES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PIVOTS.slice(1).map((p) => (
            <div key={p.rank} style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '14px',
              display: 'grid', gridTemplateColumns: '36px 1fr 60px', gap: 14, alignItems: 'center',
            }}>
              <div className="agm-display" style={{ fontSize: 22, color: 'var(--green-soft)' }}>
                {String(p.rank).padStart(2, '0')}
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 4 }}>
                  {p.stage} · {p.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Flag code={p.a} size={11} />
                  <span className="agm-display" style={{ fontSize: 10, color: 'var(--fg-3)' }}>VS</span>
                  <Flag code={p.b} size={11} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="agm-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-soft)' }}>
                  {p.entropy.toFixed(2)}
                </div>
                <div className="agm-mono" style={{ fontSize: 8, color: 'var(--fg-3)' }}>bits</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MobileTabs active="pivot" />
    </AppShell>
  );
}

Object.assign(window, { PivotDesktop, PivotMobile });
