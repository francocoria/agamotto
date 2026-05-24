// Academic / Calibration screen

// Calibration curve: predicted vs observed in 12 bins
// Format: [predicted, observed]
const CAL_POINTS = [
  [0.05, 0.04], [0.12, 0.09], [0.18, 0.21], [0.25, 0.27],
  [0.33, 0.31], [0.41, 0.43], [0.50, 0.48], [0.58, 0.61],
  [0.66, 0.64], [0.74, 0.78], [0.82, 0.80], [0.92, 0.89],
];

const MODELS = [
  { name: 'Elo · base',       version: '2.4.1', trained: '04.MAY.2026', brier: 0.198, ll: 1.024, status: 'active', weight: 0.18 },
  { name: 'Poisson · xG',     version: '1.8.0', trained: '06.MAY.2026', brier: 0.187, ll: 0.991, status: 'active', weight: 0.24 },
  { name: 'Dixon–Coles',      version: '3.0.2', trained: '08.MAY.2026', brier: 0.181, ll: 0.974, status: 'active', weight: 0.22 },
  { name: 'Bivariate Poisson',version: '0.9.1', trained: '12.MAY.2026', brier: 0.184, ll: 0.983, status: 'active', weight: 0.14 },
  { name: 'Stacking Ensemble',version: '0.4.1', trained: '21.MAY.2026', brier: 0.176, ll: 0.952, status: 'champion', weight: 1.00 },
  { name: 'XGBoost (form)',   version: '2.1.0', trained: '15.MAY.2026', brier: 0.193, ll: 1.012, status: 'shadow',   weight: 0.10 },
  { name: 'Hierarchical Bayes',version:'1.3.4', trained: '19.MAY.2026', brier: 0.189, ll: 0.998, status: 'shadow',   weight: 0.12 },
];

// Calibration plot SVG
function CalibrationPlot({ w = 460, h = 380, compact = false }) {
  const pad = compact ? 28 : 42;
  const plotW = w - pad * 2, plotH = h - pad * 2;
  const x = (p) => pad + p * plotW;
  const y = (p) => h - pad - p * plotH;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <g key={i}>
          <line x1={x(g)} y1={pad} x2={x(g)} y2={h - pad} stroke="rgba(255,255,255,0.05)" />
          <line x1={pad} y1={y(g)} x2={w - pad} y2={y(g)} stroke="rgba(255,255,255,0.05)" />
        </g>
      ))}
      {/* y/x axis */}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--line-2)" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--line-2)" />
      {/* Perfect calibration */}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--violet)" strokeWidth="1" strokeDasharray="3 4" opacity="0.7" />
      {/* Confidence band */}
      <path d={`M ${x(0)},${y(0.03)} L ${x(1)},${y(1.03)} L ${x(1)},${y(0.97)} L ${x(0)},${y(-0.03)} Z`}
        fill="var(--green-bg)" />

      {/* Observed line + points */}
      <path
        d={CAL_POINTS.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${x(p[0])} ${y(p[1])}`).join(' ')}
        stroke="var(--green)" strokeWidth="2" fill="none"
        strokeDasharray="800" strokeDashoffset="800"
        style={{ animation: 'agm-draw-cal 1.6s 0.2s cubic-bezier(0.2, 0.7, 0.3, 1) forwards' }} />
      <style>{`@keyframes agm-draw-cal { to { stroke-dashoffset: 0; } }`}</style>
      {CAL_POINTS.map((p, i) => (
        <g key={i} style={{ animation: `agm-fade-in 0.3s ${0.5 + i * 0.06}s ease both`, opacity: 0 }}>
          <circle cx={x(p[0])} cy={y(p[1])} r="6" fill="var(--bg-1)" stroke="var(--green)" strokeWidth="1.6" />
          <circle cx={x(p[0])} cy={y(p[1])} r="2.5" fill="var(--green)" />
        </g>
      ))}

      {/* Axis labels */}
      {!compact && (
        <>
          {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
            <g key={i}>
              <text x={x(g)} y={h - pad + 16} fill="var(--fg-3)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">{g.toFixed(2)}</text>
              <text x={pad - 8} y={y(g) + 3} fill="var(--fg-3)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">{g.toFixed(2)}</text>
            </g>
          ))}
          <text x={w / 2} y={h - 4} fill="var(--fg-2)" fontSize="10" textAnchor="middle" letterSpacing="2" fontFamily="var(--font-mono)">PREDICHO →</text>
          <text x={12} y={h / 2} fill="var(--fg-2)" fontSize="10" textAnchor="middle" letterSpacing="2" fontFamily="var(--font-mono)" transform={`rotate(-90 12 ${h/2})`}>OBSERVADO →</text>
        </>
      )}
    </svg>
  );
}

function ModelRow({ m, compact = false }) {
  const color = m.status === 'champion' ? 'var(--green-soft)' : m.status === 'shadow' ? 'var(--violet-soft)' : 'var(--fg-1)';
  const pill = m.status === 'champion' ? 'agm-pill-green' : m.status === 'shadow' ? 'agm-pill-violet' : '';
  return (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>
      <td className="agm-td">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="agm-dot" style={{
            background: m.status === 'champion' ? 'var(--green)' : m.status === 'shadow' ? 'var(--violet)' : 'var(--fg-3)',
            boxShadow: m.status !== 'shadow' ? '0 0 6px currentColor' : 'none',
          }} />
          <span style={{ color, fontWeight: m.status === 'champion' ? 600 : 500 }}>{m.name}</span>
        </div>
      </td>
      {!compact && <td className="agm-td agm-num" style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.version}</td>}
      <td className="agm-td agm-num" style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.trained}</td>
      <td className="agm-td agm-num" style={{ color: 'var(--fg-0)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{m.brier.toFixed(3)}</td>
      <td className="agm-td agm-num" style={{ color: 'var(--fg-0)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{m.ll.toFixed(3)}</td>
      {!compact && (
        <td className="agm-td" style={{ width: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="agm-bar" style={{ flex: 1, height: 4 }}>
              <div className="agm-bar-fill" style={{ width: `${m.weight * 100}%` }} />
            </div>
            <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', minWidth: 28, textAlign: 'right' }}>
              {(m.weight * 100).toFixed(0)}%
            </span>
          </div>
        </td>
      )}
    </tr>
  );
}

// ─── DESKTOP ───
function AcademicDesktop() {
  const t = useT();
  return (
    <AppShell active="academic">
      <TopNav active="academic" />

      <div style={{ padding: '24px 40px 16px' }} className="agm-anim-fade-up">
        <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.16em', marginBottom: 6 }}>
          DEFENSA · CALIBRACIÓN · AUDITORÍA
        </div>
        <h1 className="agm-display" style={{ fontSize: 30, letterSpacing: '0.03em' }}>
          {t('ac_title')}
        </h1>
      </div>

      {/* metrics row */}
      <div style={{ padding: '8px 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }} className="agm-stagger">
        <div className="agm-card agm-card-tight" style={{ paddingLeft: 28 }}>
          <Metric value="0.176" label={t('ac_brier')} accent="green" />
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--green-soft)', marginTop: 10, letterSpacing: '0.08em' }}>
            ▼ 0.022 vs Mundial 2022
          </div>
        </div>
        <div className="agm-card agm-card-tight" style={{ paddingLeft: 28 }}>
          <Metric value="0.952" label={t('ac_logloss')} accent="green" />
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--green-soft)', marginTop: 10, letterSpacing: '0.08em' }}>
            ▼ 0.061 vs Mundial 2022
          </div>
        </div>
        <div className="agm-card agm-card-tight" style={{ paddingLeft: 28 }}>
          <Metric value="0.013" label="ECE · Calibración" accent="violet" unit="±" />
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 10, letterSpacing: '0.08em' }}>
            12 bins · empírico
          </div>
        </div>
        <div className="agm-card agm-card-tight" style={{ paddingLeft: 28 }}>
          <Metric value="384" label="Partidos · backtest" accent="violet" />
          <div className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 10, letterSpacing: '0.08em' }}>
            2002 · 2006 · 2010 · 2014 · 2018 · 2022
          </div>
        </div>
      </div>

      {/* two columns */}
      <div style={{ flex: 1, padding: '24px 40px 30px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, minHeight: 0 }}>

        {/* Calibration plot card */}
        <div className="agm-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="agm-card-h">
            <h3>{t('ac_curve')}</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <LegendItem color="var(--green)" label="OBS" />
              <LegendItem color="var(--violet)" label="IDEAL" />
            </div>
          </div>
          <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CalibrationPlot w={500} h={400} />
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.6 }}>
              {t('ac_curve_sub')}
            </div>
          </div>
        </div>

        {/* Model audit */}
        <div className="agm-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="agm-card-h">
            <h3>{t('ac_models')}</h3>
            <span className="agm-card-eyebrow">7 modelos · ensemble v0.4.1</span>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="agm-th">Modelo</th>
                  <th className="agm-th">Versión</th>
                  <th className="agm-th">Entrenado</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>Brier</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>Log-Loss</th>
                  <th className="agm-th">Peso · Ensemble</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => <ModelRow key={m.name} m={m} />)}
              </tbody>
            </table>
          </div>
          {/* Reliability + Sharpness */}
          <div style={{ borderTop: '1px solid var(--line)', padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {[
              { k: 'Reliability', v: '0.011', d: 'menor = mejor' },
              { k: 'Resolution',  v: '0.094', d: 'mayor = mejor' },
              { k: 'Sharpness',   v: '0.281', d: 'desv. P(títulos)' },
            ].map((x) => (
              <div key={x.k}>
                <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.18em' }}>{x.k.toUpperCase()}</div>
                <div className="agm-mono" style={{ fontSize: 18, color: 'var(--fg-0)', fontWeight: 600, marginTop: 4 }}>{x.v}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── MOBILE ───
function AcademicMobile() {
  const t = useT();
  return (
    <AppShell active="academic" mobile>
      <MobileBar title="MODELO" />

      <section style={{ padding: '22px 18px 12px' }} className="agm-anim-blur">
        <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.16em', marginBottom: 6 }}>
          CALIBRACIÓN · AUDITORÍA
        </div>
        <h1 className="agm-display" style={{ fontSize: 24, letterSpacing: '0.03em', color: 'var(--fg-0)' }}>{t('ac_title')}</h1>
      </section>

      {/* Metric cards 2x2 */}
      <section style={{ padding: '8px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="agm-stagger">
        {[
          ['0.176', t('ac_brier'),    'green', '▼ 0.022'],
          ['0.952', t('ac_logloss'),  'green', '▼ 0.061'],
          ['0.013', 'ECE',            'violet','12 bins'],
          ['384',   'Backtest',       'violet','6 mundiales'],
        ].map(([v, l, a, d], i) => (
          <div key={i} className="agm-card agm-card-tight" style={{ padding: '14px 14px 14px 22px' }}>
            <Metric value={v} label={l} accent={a} />
            <div className="agm-mono" style={{ fontSize: 9, color: a === 'green' ? 'var(--green-soft)' : 'var(--fg-3)', marginTop: 8, letterSpacing: '0.06em' }}>{d}</div>
          </div>
        ))}
      </section>

      {/* Plot */}
      <section style={{ padding: '20px 18px 12px' }}>
        <SectionHeader kicker={t('ac_curve')} />
        <div className="agm-card" style={{ padding: '14px 12px 12px' }}>
          <CalibrationPlot w={360} h={300} compact />
          <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4, lineHeight: 1.5, padding: '0 6px' }}>
            {t('ac_curve_sub')}
          </div>
        </div>
      </section>

      {/* Model audit */}
      <section style={{ padding: '12px 18px 30px' }}>
        <SectionHeader kicker={t('ac_models')} />
        <div className="agm-card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="agm-th" style={{ padding: '10px 12px' }}>Modelo</th>
                <th className="agm-th" style={{ padding: '10px 12px', textAlign: 'right' }}>Brier</th>
                <th className="agm-th" style={{ padding: '10px 12px', textAlign: 'right' }}>LL</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => <ModelRow key={m.name} m={m} compact />)}
            </tbody>
          </table>
        </div>
      </section>

      <MobileTabs active="academic" />
    </AppShell>
  );
}

Object.assign(window, { AcademicDesktop, AcademicMobile });
