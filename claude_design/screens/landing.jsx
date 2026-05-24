// Landing page — desktop & mobile

// Expanded champion data with new columns
const CHAMPIONS = [
  { code: 'ARG', p: 14.8, sf: 38.1, qf: 60.4, r16: 84.2, ci: [11.2, 18.9], trend: +0.6, form: ['W','W','D','W','W','L','W','W','D','W'], xg: 1.94 },
  { code: 'BRA', p: 13.2, sf: 36.4, qf: 58.9, r16: 82.7, ci: [10.0, 16.8], trend: -0.3, form: ['W','D','W','W','L','W','W','W','D','W'], xg: 1.88 },
  { code: 'FRA', p: 11.6, sf: 33.1, qf: 55.2, r16: 80.1, ci: [ 8.7, 14.9], trend: +0.2, form: ['W','W','W','L','W','D','W','W','W','D'], xg: 1.92 },
  { code: 'ESP', p: 10.4, sf: 31.0, qf: 53.7, r16: 78.6, ci: [ 7.8, 13.6], trend: +1.1, form: ['W','W','W','W','D','W','L','W','W','W'], xg: 2.04 },
  { code: 'ENG', p:  9.1, sf: 28.4, qf: 49.8, r16: 75.2, ci: [ 6.7, 12.0], trend: -0.4, form: ['W','D','W','L','W','W','D','W','W','L'], xg: 1.81 },
  { code: 'GER', p:  6.7, sf: 22.5, qf: 41.6, r16: 67.4, ci: [ 4.7,  9.1], trend: +0.1, form: ['D','W','W','D','L','W','W','D','W','W'], xg: 1.72 },
  { code: 'POR', p:  6.0, sf: 21.2, qf: 39.8, r16: 65.3, ci: [ 4.2,  8.4], trend: -0.5, form: ['W','L','W','W','W','D','W','L','W','W'], xg: 1.68 },
  { code: 'NED', p:  4.8, sf: 18.9, qf: 36.4, r16: 61.7, ci: [ 3.2,  6.9], trend: +0.3, form: ['W','W','D','W','L','W','W','W','D','D'], xg: 1.63 },
  { code: 'BEL', p:  3.9, sf: 16.1, qf: 32.8, r16: 56.4, ci: [ 2.5,  5.7], trend:  0.0, form: ['D','W','L','W','D','W','W','L','W','D'], xg: 1.54 },
  { code: 'CRO', p:  3.1, sf: 13.8, qf: 28.4, r16: 51.2, ci: [ 1.9,  4.7], trend: -0.2, form: ['L','W','W','D','W','L','W','W','D','L'], xg: 1.42 },
];

const NEXT_MATCHES = [
  { d: 'JUN 11', t: '20:00 ET', venue: 'AZTECA · CDMX',  stage: 'A1', home: 'MEX', away: 'CAN', p: [42, 27, 31] },
  { d: 'JUN 12', t: '15:00 ET', venue: 'METLIFE · NJ',   stage: 'B2', home: 'USA', away: 'ECU', p: [55, 24, 21] },
  { d: 'JUN 12', t: '18:00 ET', venue: 'SOFI · LA',      stage: 'C1', home: 'ARG', away: 'AUS', p: [71, 18, 11] },
  { d: 'JUN 13', t: '21:00 ET', venue: 'BMO · TORONTO',  stage: 'D3', home: 'FRA', away: 'KOR', p: [62, 22, 16] },
];

// Detailed champion row
function ChampionRow({ idx, c }) {
  const meta = COUNTRIES[c.code] || {};
  return (
    <tr className="agm-tr-hover">
      <td className="agm-td agm-mono" style={{ color: 'var(--fg-3)', textAlign: 'center', width: 36 }}>
        {String(idx + 1).padStart(2, '0')}
      </td>
      <td className="agm-td" style={{ paddingLeft: 8 }}>
        <Flag code={c.code} showName size={13} />
      </td>
      <td className="agm-td agm-mono" style={{ color: 'var(--fg-3)', textAlign: 'center', width: 40 }}>
        {meta.grp}
      </td>
      <td className="agm-td agm-mono agm-num" style={{ textAlign: 'right', color: 'var(--fg-1)', width: 60 }}>
        {meta.elo}
      </td>
      <td className="agm-td" style={{ width: 110 }}>
        <Sparkline results={c.form} w={92} h={14} />
      </td>
      <td className="agm-td agm-mono agm-num" style={{ textAlign: 'right', color: 'var(--fg-2)', width: 50 }}>
        {c.xg.toFixed(2)}
      </td>
      <td className="agm-td agm-num" style={{ textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: 11, width: 60 }}>
        {c.r16.toFixed(1)}<span style={{ color: 'var(--fg-3)' }}>%</span>
      </td>
      <td className="agm-td agm-num" style={{ textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: 11, width: 60 }}>
        {c.qf.toFixed(1)}<span style={{ color: 'var(--fg-3)' }}>%</span>
      </td>
      <td className="agm-td agm-num" style={{ textAlign: 'right', color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: 11, width: 60 }}>
        {c.sf.toFixed(1)}<span style={{ color: 'var(--fg-3)' }}>%</span>
      </td>
      <td className="agm-td" style={{ width: 110 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="agm-bar" style={{ flex: 1, height: 5 }}>
            <div className="agm-bar-fill" style={{ width: `${(c.p / 15) * 100}%` }} />
          </div>
        </div>
      </td>
      <td className="agm-td agm-num" style={{ textAlign: 'right', color: 'var(--fg-0)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, width: 64 }}>
        {c.p.toFixed(1)}%
      </td>
      <td className="agm-td agm-num" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', width: 80 }}>
        {c.ci[0].toFixed(1)}–{c.ci[1].toFixed(1)}
      </td>
      <td className="agm-td agm-num" style={{
        textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, width: 56,
        color: c.trend > 0 ? 'var(--green-deep)' : c.trend < 0 ? 'var(--red)' : 'var(--fg-3)',
      }}>
        {c.trend > 0 ? '▲' : c.trend < 0 ? '▼' : '–'}{Math.abs(c.trend).toFixed(1)}
      </td>
    </tr>
  );
}

function MatchCard({ m }) {
  const t = useT();
  return (
    <div className="agm-card agm-card-tight agm-lift" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
          {m.d} · {m.t}
        </span>
        <span className="agm-pill" style={{ height: 18, fontSize: 9, padding: '0 8px' }}>
          {t('group_stage')}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="agm-flag-emoji" style={{ fontSize: 28 }}>{COUNTRIES[m.home]?.f}</span>
          <span className="agm-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-0)' }}>{m.home}</span>
        </div>
        <span className="agm-display" style={{ fontSize: 14, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>—</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="agm-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-0)' }}>{m.away}</span>
          <span className="agm-flag-emoji" style={{ fontSize: 28 }}>{COUNTRIES[m.away]?.f}</span>
        </div>
      </div>
      <Bar1X2 home={m.p[0]} draw={m.p[1]} away={m.p[2]} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 8,
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
      }}>
        <span style={{ color: 'var(--green-deep)' }}>{m.p[0]}%</span>
        <span style={{ color: 'var(--fg-2)' }}>{m.p[1]}%</span>
        <span style={{ color: 'var(--violet)' }}>{m.p[2]}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2,
        fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span>{m.home}</span><span>{t('draw')}</span><span>{m.away}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.04em' }}>
        {m.venue}
      </div>
    </div>
  );
}

// ─── LANDING · DESKTOP ───
function LandingDesktop() {
  const t = useT();
  return (
    <AppShell active="home">
      <TickerBar />
      <TopNav active="home" />

      {/* Hero */}
      <section style={{ position: 'relative', padding: '60px 60px 40px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 40, alignItems: 'center' }}>
        <div className="agm-anim-blur">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--fg-2)', letterSpacing: '0.18em',
            padding: '6px 14px',
            border: '1px solid var(--line-2)',
            borderRadius: 999,
            background: 'var(--bg-1)',
          }}>
            <span className="agm-dot agm-dot-green agm-dot-pulse" />
            {t('hero_kicker')}
          </div>
          <h1 className="agm-display" style={{
            fontSize: 80, lineHeight: 0.96,
            letterSpacing: '-0.01em',
            marginTop: 26, marginBottom: 20,
            fontWeight: 500, color: 'var(--fg-0)',
            textWrap: 'pretty',
          }}>
            <span>{t('hero_title_a')} </span>
            <span style={{ color: 'var(--fg-3)' }}>{t('hero_title_b')}</span>
            <br />
            <span>{t('hero_title_c')} </span>
            <span style={{ color: 'var(--green-deep)' }}>{t('hero_title_d')}</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.6, maxWidth: 540, marginBottom: 30 }}>
            {t('hero_desc')}
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="agm-btn agm-btn-primary" style={{ height: 50, padding: '0 26px', fontSize: 13, borderRadius: 12 }}>
              {t('hero_cta_eye')}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
            </button>
            <button className="agm-btn agm-btn-ghost" style={{ height: 50, borderRadius: 12 }}>
              {t('hero_cta_method')}
            </button>
          </div>
          <div className="agm-mono" style={{ marginTop: 28, fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em' }}>
            ELO · POISSON · DIXON–COLES · HIERARCHICAL BAYES · STACKING ENSEMBLE
          </div>
        </div>

        <div style={{ position: 'relative' }} className="agm-anim-fade">
          <div style={{ position: 'relative' }}>
            <TimelinesHero width={620} height={420} />
            <div style={{ position: 'absolute', top: 4, left: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <LegendItem color="var(--green)" label="LÍNEA BASE" />
              <LegendItem color="var(--violet)" label="ESCENARIO ALTERNO" />
            </div>
            <div style={{ position: 'absolute', bottom: -10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
              {['USA', 'MEX', 'CAN'].map((c) => (
                <span key={c} className="agm-pill" style={{
                  background: 'var(--bg-1)', height: 26, padding: '0 12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                }}>
                  <span className="agm-flag-emoji" style={{ fontSize: 13 }}>{COUNTRIES[c].f}</span>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="agm-rune-line" style={{ margin: '20px 60px' }} />

      {/* Metrics */}
      <section className="agm-stagger" style={{ padding: '40px 60px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 48, paddingLeft: 74 }}>
        <Metric value="48" label={t('metric_teams')} accent="green" />
        <Metric value="104" label={t('metric_matches')} accent="green" />
        <Metric value="16" label={t('metric_venues')} accent="violet" />
        <Metric value="100,000" label={t('metric_universes')} accent="violet" />
      </section>

      <div className="agm-rune-line" style={{ margin: '20px 60px' }} />

      {/* Champions full table */}
      <section style={{ padding: '40px 60px 0' }}>
        <SectionHeader kicker={t('section_champ')}
          action={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
                N = 100.000 · MC + ENSEMBLE
              </span>
              <button className="agm-btn agm-btn-ghost" style={{ height: 30, fontSize: 11, padding: '0 12px' }}>EXPORTAR CSV ↓</button>
            </div>
          } />
        <div className="agm-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="agm-th" style={{ textAlign: 'center' }}>#</th>
                <th className="agm-th">{t('col_team')}</th>
                <th className="agm-th" style={{ textAlign: 'center' }}>{t('col_grp')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_elo')}</th>
                <th className="agm-th">{t('col_form')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_xg')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_r16')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_qf')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_sf')}</th>
                <th className="agm-th">DIST</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_ttl')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_ci')}</th>
                <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_trend_24h')}</th>
              </tr>
            </thead>
            <tbody className="agm-stagger">
              {CHAMPIONS.map((c, i) => <ChampionRow key={c.code} idx={i} c={c} />)}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>+ 38 selecciones con p &lt; 2.5% · ordenadas por P(Título) descendente</span>
          <a href="#" style={{ fontSize: 11, color: 'var(--green-deep)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{t('view_all')} →</a>
        </div>
      </section>

      {/* Next matches + Methodology */}
      <section style={{ padding: '40px 60px 60px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 36 }}>
        <div>
          <SectionHeader kicker={t('section_next')}
            action={<button className="agm-btn agm-btn-ghost" style={{ height: 30, fontSize: 11, padding: '0 14px' }}>FIXTURE COMPLETO →</button>} />
          <div className="agm-stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {NEXT_MATCHES.map((m, i) => <MatchCard key={i} m={m} />)}
          </div>
        </div>
        <div>
          <SectionHeader kicker={t('section_methodology')} />
          <div className="agm-card agm-card-pad">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { k: 'Elo',          d: 'Rating base K=32',     w: 18 },
                { k: 'Poisson',      d: 'Expected goals',       w: 24 },
                { k: 'Dixon–Coles',  d: 'Corr. marcadores bajos',w: 22 },
                { k: 'H. Bayes',     d: 'Latente por selección', w: 22 },
                { k: 'XGBoost',      d: 'Forma + viaje',        w: 14 },
                { k: 'Stacking',     d: 'Meta-modelo final',    w: 100 },
              ].map((x) => (
                <div key={x.k} className="agm-lift" style={{
                  padding: '14px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                }}>
                  <div className="agm-mono" style={{ fontSize: 12, color: 'var(--green-deep)', fontWeight: 700, letterSpacing: '0.02em' }}>{x.k}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>{x.d}</div>
                  <div className="agm-bar" style={{ height: 3, marginTop: 8 }}>
                    <div className="agm-bar-fill" style={{ width: `${x.w}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="agm-rune-line" style={{ margin: '20px 0 16px' }} />
            <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
              El ensemble pondera cinco modelos por su <strong style={{ color: 'var(--fg-0)' }}>Brier Score</strong> en backtest contra los Mundiales 2002 – 2022.
              Cada simulación corre <strong style={{ color: 'var(--fg-0)' }}>100.000 iteraciones</strong> de Monte Carlo y devuelve distribuciones, no resultados puntuales.
            </div>
            <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: 11, color: 'var(--green-deep)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Leer paper técnico →
            </a>
          </div>
        </div>
      </section>

      {/* World Cup 2026 · Groups */}
      <section style={{ padding: '20px 60px 0' }}>
        <SectionHeader kicker="FASE DE GRUPOS · 12 GRUPOS · 48 SELECCIONES"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
                MATCHDAY 2 · 12 PARTIDOS JUGADOS
              </span>
              <button className="agm-btn agm-btn-ghost" style={{ height: 30, fontSize: 11, padding: '0 12px' }}>VER TODOS →</button>
            </div>
          } />
        <div className="agm-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {GROUPS.map((g) => <GroupCard key={g.letter} {...g} />)}
        </div>
      </section>

      {/* Fixture day strip */}
      <section style={{ padding: '40px 60px 0' }}>
        <SectionHeader kicker="CALENDARIO DEL TORNEO" />
        <FixtureStrip />
      </section>

      {/* Venues */}
      <section style={{ padding: '40px 60px 60px' }}>
        <SectionHeader kicker="16 SEDES · USA · MÉXICO · CANADÁ"
          action={
            <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
              CAPACIDAD TOTAL · 1.111.700 ASIENTOS
            </span>
          } />
        <div className="agm-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {VENUES.map((v) => <VenueCard key={v.code} {...v} />)}
        </div>
      </section>

      <footer style={{ padding: '24px 60px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.16em' }}>
          AGAMOTTO · PREDICTIVE · 2026 EDITION
        </span>
        <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
          LAST CALIB · 23.MAY.2026 04:00 UTC · NEXT IN 23h 12m
        </span>
      </footer>
    </AppShell>
  );
}

// ─── LANDING · MOBILE ───
function LandingMobile() {
  const t = useT();
  return (
    <AppShell active="home" mobile>
      <TickerBar />
      <MobileBar title="AGAMOTTO" />

      <section style={{ padding: '24px 18px 12px' }} className="agm-anim-blur">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--fg-2)', letterSpacing: '0.14em',
          padding: '5px 10px',
          border: '1px solid var(--line-2)',
          borderRadius: 999,
        }}>
          <span className="agm-dot agm-dot-green agm-dot-pulse" />
          USA · MEX · CAN · 2026
        </div>
        <h1 className="agm-display" style={{
          fontSize: 38, lineHeight: 1, letterSpacing: '-0.005em',
          marginTop: 16, marginBottom: 14, fontWeight: 500, color: 'var(--fg-0)',
        }}>
          <span>{t('hero_title_a')} </span>
          <span style={{ color: 'var(--fg-3)' }}>{t('hero_title_b')}</span>
          <br />
          <span>{t('hero_title_c')} </span>
          <span style={{ color: 'var(--green-deep)' }}>{t('hero_title_d')}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 18 }}>
          {t('hero_desc')}
        </p>

        <div style={{ position: 'relative', margin: '0 -18px 18px' }}>
          <TimelinesHero width={390} height={200} />
        </div>

        <button className="agm-btn agm-btn-primary" style={{
          width: '100%', height: 48, fontSize: 12, justifyContent: 'center', borderRadius: 12,
        }}>
          {t('hero_cta_eye')}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
        </button>
      </section>

      <div className="agm-rune-line" style={{ margin: '8px 18px' }} />

      <section className="agm-stagger" style={{ padding: '24px 18px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingLeft: 32 }}>
        <Metric value="48"      label={t('metric_teams')}     accent="green" />
        <Metric value="104"     label={t('metric_matches')}   accent="green" />
        <Metric value="16"      label={t('metric_venues')}    accent="violet" />
        <Metric value="100,000" label={t('metric_universes')} accent="violet" />
      </section>

      {/* Champions compact */}
      <section style={{ padding: '24px 18px 12px' }}>
        <SectionHeader kicker={t('section_champ')} />
        <div className="agm-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="agm-th" style={{ padding: '8px 10px' }}>#</th>
                <th className="agm-th" style={{ padding: '8px 6px' }}>SEL.</th>
                <th className="agm-th" style={{ padding: '8px 6px' }}>FORMA</th>
                <th className="agm-th" style={{ padding: '8px 8px', textAlign: 'right' }}>P</th>
                <th className="agm-th" style={{ padding: '8px 8px', textAlign: 'right' }}>Δ</th>
              </tr>
            </thead>
            <tbody className="agm-stagger">
              {CHAMPIONS.slice(0, 8).map((c, i) => (
                <tr key={c.code} className="agm-tr-hover">
                  <td className="agm-td agm-mono" style={{ color: 'var(--fg-3)', padding: '8px 10px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="agm-td" style={{ padding: '8px 6px' }}>
                    <Flag code={c.code} size={11} />
                  </td>
                  <td className="agm-td" style={{ padding: '8px 6px' }}>
                    <Sparkline results={c.form.slice(-6)} w={50} h={10} />
                  </td>
                  <td className="agm-td agm-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--fg-0)', padding: '8px 8px' }}>
                    {c.p.toFixed(1)}%
                  </td>
                  <td className="agm-td agm-mono" style={{
                    textAlign: 'right', fontSize: 10, padding: '8px 8px',
                    color: c.trend > 0 ? 'var(--green-deep)' : c.trend < 0 ? 'var(--red)' : 'var(--fg-3)',
                  }}>
                    {c.trend > 0 ? '▲' : c.trend < 0 ? '▼' : '–'}{Math.abs(c.trend).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ padding: '12px 18px 30px' }}>
        <SectionHeader kicker={t('section_next')} />
        <div className="agm-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NEXT_MATCHES.slice(0, 3).map((m, i) => <MatchCard key={i} m={m} />)}
        </div>
      </section>

      {/* Groups (horizontal scroll) */}
      <section style={{ padding: '20px 0 0' }}>
        <div style={{ padding: '0 18px' }}>
          <SectionHeader kicker="FASE DE GRUPOS · 12 GRUPOS" />
        </div>
        <div style={{ overflowX: 'auto', padding: '0 18px 8px', display: 'flex', gap: 10, scrollSnapType: 'x mandatory' }}>
          {GROUPS.map((g) => (
            <div key={g.letter} style={{ minWidth: 240, scrollSnapAlign: 'start' }}>
              <GroupCard {...g} />
            </div>
          ))}
        </div>
      </section>

      {/* Fixture strip */}
      <section style={{ padding: '20px 18px 0' }}>
        <SectionHeader kicker="CALENDARIO" />
        <FixtureStrip />
      </section>

      {/* Venues compact */}
      <section style={{ padding: '20px 0 30px' }}>
        <div style={{ padding: '0 18px' }}>
          <SectionHeader kicker="16 SEDES · USA · MEX · CAN" />
        </div>
        <div style={{ overflowX: 'auto', padding: '0 18px 8px', display: 'flex', gap: 10, scrollSnapType: 'x mandatory' }}>
          {VENUES.slice(0, 8).map((v) => (
            <div key={v.code} style={{ minWidth: 180, scrollSnapAlign: 'start' }}>
              <VenueCard {...v} />
            </div>
          ))}
        </div>
      </section>

      <MobileTabs active="home" />
    </AppShell>
  );
}

Object.assign(window, { LandingDesktop, LandingMobile, CHAMPIONS, NEXT_MATCHES });
