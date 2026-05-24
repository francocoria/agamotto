// Scenarios screen (renamed from Multiverse — counterfactual simulator)

const DELTA_ROWS = [
  { code: 'ARG', base: 14.80, now: 17.92, d: +3.12, ci: [13.4, 22.1], n: 717 },
  { code: 'BRA', base: 13.20, now: 11.04, d: -2.16, ci: [ 8.1, 14.2], n: 442 },
  { code: 'FRA', base: 11.60, now: 12.85, d: +1.25, ci: [ 9.6, 16.4], n: 514 },
  { code: 'ESP', base: 10.40, now:  9.16, d: -1.24, ci: [ 6.8, 11.9], n: 366 },
  { code: 'ENG', base:  9.10, now: 10.42, d: +1.32, ci: [ 7.7, 13.5], n: 417 },
  { code: 'GER', base:  6.70, now:  6.21, d: -0.49, ci: [ 4.4,  8.4], n: 248 },
  { code: 'POR', base:  6.00, now:  6.78, d: +0.78, ci: [ 4.8,  9.0], n: 271 },
  { code: 'MEX', base:  1.60, now:  0.42, d: -1.18, ci: [ 0.1,  0.9], n:  17 },
  { code: 'NED', base:  4.80, now:  5.12, d: +0.32, ci: [ 3.6,  7.0], n: 205 },
  { code: 'URU', base:  2.70, now:  3.45, d: +0.75, ci: [ 2.1,  5.2], n: 138 },
];

const UNIVERSES = [
  { id: 'S·034.512', champ: 'ESP', f: 'ARG → CUARTOS · BRA → R16',           odd: 0.087, goals: 168 },
  { id: 'S·112.044', champ: 'ARG', f: 'BRA → SEMIS · ESP → CUARTOS',          odd: 0.142, goals: 154 },
  { id: 'S·201.876', champ: 'FRA', f: 'MEX → R16 · POR → SEMIS · CRO → CUARTOS', odd: 0.063, goals: 161 },
  { id: 'S·077.331', champ: 'ARG', f: 'ENG → FINAL · BRA → R16',              odd: 0.118, goals: 149 },
  { id: 'S·149.005', champ: 'POR', f: 'BRA → R32 · ARG → SEMIS',              odd: 0.024, goals: 172 },
];

function CondRow({ icon, type, body, active = true, color = 'green' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: active ? (color === 'green' ? 'var(--green-bg)' : 'var(--violet-bg)') : 'var(--bg-2)',
      border: `1px solid ${active ? (color === 'green' ? 'rgba(10,153,86,0.30)' : 'rgba(90,54,214,0.30)') : 'var(--line)'}`,
      borderRadius: 10,
      transition: 'all .15s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: color === 'green' ? 'var(--green-bg-2)' : 'var(--violet-bg-2)',
        color: color === 'green' ? 'var(--green-deep)' : 'var(--violet)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
          {type}
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-0)', marginTop: 2 }}>{body}</div>
      </div>
      <button style={{
        width: 24, height: 24, borderRadius: 6,
        background: 'transparent', border: 0, color: 'var(--fg-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>×</button>
    </div>
  );
}

function DeltaRow({ row, max }) {
  const dColor = row.d > 0 ? 'var(--green-deep)' : 'var(--red)';
  const dBg = row.d > 0 ? 'var(--green-bg)' : 'var(--red-bg)';
  return (
    <tr className="agm-tr-hover">
      <td className="agm-td" style={{ width: 130 }}>
        <Flag code={row.code} showName size={13} />
      </td>
      <td className="agm-td agm-mono agm-num" style={{ color: 'var(--fg-2)', textAlign: 'right', fontSize: 11 }}>
        {row.base.toFixed(2)}%
      </td>
      <td className="agm-td agm-mono agm-num" style={{ color: 'var(--fg-0)', textAlign: 'right', fontWeight: 700 }}>
        {row.now.toFixed(2)}%
      </td>
      <td className="agm-td" style={{ width: '38%' }}>
        <div style={{ position: 'relative', height: 4, background: 'var(--bg-3)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', top: -3, left: '50%', width: 1, height: 10, background: 'var(--line-2)' }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, borderRadius: 2,
            width: `${Math.abs(row.d) / max * 50}%`,
            background: row.d > 0 ? 'linear-gradient(90deg, var(--green-deep), var(--green))' : 'linear-gradient(90deg, var(--red), #c83b3b)',
            left: row.d > 0 ? '50%' : null,
            right: row.d > 0 ? null : '50%',
            animation: 'agm-bar-grow 0.7s cubic-bezier(0.2,0.7,0.3,1) both',
            transformOrigin: row.d > 0 ? 'left' : 'right',
          }} />
        </div>
      </td>
      <td className="agm-td agm-mono agm-num" style={{
        textAlign: 'right', fontWeight: 700, fontSize: 12, width: 80,
        color: dColor,
      }}>
        <span style={{ background: dBg, padding: '2px 8px', borderRadius: 4 }}>
          {row.d > 0 ? '+' : ''}{row.d.toFixed(2)}%
        </span>
      </td>
      <td className="agm-td agm-mono agm-num" style={{ textAlign: 'right', color: 'var(--fg-3)', fontSize: 10, width: 100 }}>
        {row.ci[0].toFixed(1)}–{row.ci[1].toFixed(1)}
      </td>
      <td className="agm-td agm-mono agm-num" style={{ textAlign: 'right', color: 'var(--fg-3)', fontSize: 10, width: 60 }}>
        {row.n}
      </td>
    </tr>
  );
}

// ─── DESKTOP ───
function ScenariosDesktop() {
  const t = useT();
  const maxDelta = Math.max(...DELTA_ROWS.map((r) => Math.abs(r.d)));
  return (
    <AppShell active="scenarios">
      <TopNav active="scenarios" />

      <div style={{ padding: '28px 40px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="agm-anim-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className="agm-dot agm-dot-violet" />
            <span className="agm-mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--violet)' }}>
              SIMULADOR · MODO ESCENARIO
            </span>
          </div>
          <h1 className="agm-display" style={{ fontSize: 36, letterSpacing: '0.03em', fontWeight: 500 }}>
            {t('mv_title')}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6, maxWidth: 640 }}>{t('mv_sub')}</div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span className="agm-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.10em' }}>
            3.214 ms · 4.000 ITER
          </span>
          <span className="agm-pill agm-pill-violet">
            <span className="agm-dot agm-dot-violet" /> {t('collapsed')}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr 360px', gap: 20, padding: '0 40px 28px', minHeight: 0 }}>

        {/* LEFT — Conditions */}
        <div className="agm-card agm-anim-slide" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="agm-card-h">
            <h3>CONDICIONES · INPUT</h3>
            <span className="agm-card-eyebrow">3/8</span>
          </div>
          <div className="agm-stagger" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
            <CondRow icon="01" color="green" type={t('cond_score')}
              body="ARG 3 — 0 MEX · Fase de Grupos · Día 4" />
            <CondRow icon="02" color="green" type={t('cond_winner')}
              body="BRA gana cuartos vs ESP" />
            <CondRow icon="03" color="violet" type={t('cond_climate')}
              body="Miami · 35°C · humedad 78%" />

            <button style={{
              padding: '14px',
              background: 'transparent',
              border: '1px dashed var(--line-2)',
              borderRadius: 10,
              color: 'var(--fg-3)',
              fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
              transition: 'all .15s',
            }}>
              <span style={{ fontSize: 14 }}>+</span> {t('mv_add')}
            </button>

            <div style={{ flex: 1, minHeight: 20 }} />

            <button className="agm-btn agm-btn-primary" style={{
              width: '100%', height: 52,
              borderRadius: 12, justifyContent: 'center', fontSize: 13,
            }}>
              {t('mv_collapse')}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', marginTop: 2 }}>
              <span>~ 4.000 {t('iterations')}</span>
              <span>&lt; 3 s</span>
            </div>
          </div>
        </div>

        {/* CENTER — Delta table */}
        <div className="agm-card agm-anim-fade-up" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="agm-card-h">
            <h3>{t('mv_delta_title')}</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <span className="agm-pill agm-pill-green" style={{ height: 18, fontSize: 9 }}>{t('baseline')}</span>
              <span className="agm-pill agm-pill-violet" style={{ height: 18, fontSize: 9 }}>{t('collapsed')}</span>
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="agm-th">{t('col_team')}</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>{t('baseline').toUpperCase()}</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>{t('collapsed').toUpperCase()}</th>
                  <th className="agm-th" style={{ textAlign: 'center' }}>DELTA</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>Δ%</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>{t('col_ci')}</th>
                  <th className="agm-th" style={{ textAlign: 'right' }}>n</th>
                </tr>
              </thead>
              <tbody className="agm-stagger">
                {DELTA_ROWS.map((r) => <DeltaRow key={r.code} row={r} max={maxDelta} />)}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.10em' }}>ENTROPÍA</span>
              <span className="agm-mono" style={{ fontSize: 13, color: 'var(--green-deep)', fontWeight: 600 }}>3.42 bits</span>
              <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>Δ −0.18</span>
            </div>
            <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>BRIER = 0.184 · LOG-LOSS = 0.962</span>
          </div>
        </div>

        {/* RIGHT — Sampled simulations */}
        <div className="agm-card agm-anim-slide" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="agm-card-h">
            <h3>{t('mv_universes')}</h3>
            <span className="agm-card-eyebrow">5/4.000</span>
          </div>
          <div className="agm-stagger" style={{ flex: 1, overflow: 'auto' }}>
            {UNIVERSES.map((u) => (
              <div key={u.id} className="agm-row-hover" style={{
                padding: '12px 14px', borderBottom: '1px solid var(--line)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="agm-mono" style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 600 }}>
                    {u.id}
                  </span>
                  <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>p={u.odd}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>CAMP</span>
                  <Flag code={u.champ} size={12} />
                  <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>·</span>
                  <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{u.goals} goles</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>{u.f}</div>
              </div>
            ))}
          </div>
          {/* mini histogram */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 10 }}>
              CAMPEONES SOBRE 4.000 SIMULACIONES
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
              {[18, 14, 12, 9, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1, 1].map((h, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${h * 3}px`,
                  background: i < 3 ? 'var(--green)' : i < 7 ? 'var(--green-deep)' : 'var(--violet-deep)',
                  borderRadius: '2px 2px 0 0',
                  opacity: i < 3 ? 1 : 0.65,
                  animation: `agm-bar-grow 0.6s ${0.05 + i * 0.03}s cubic-bezier(0.2,0.7,0.3,1) both`,
                  transformOrigin: 'bottom',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, color: 'var(--fg-3)' }}>
              <span>ARG</span><span>BRA</span><span>FRA</span><span>· · ·</span><span>OTROS</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── MOBILE ───
function ScenariosMobile() {
  const t = useT();
  const maxDelta = Math.max(...DELTA_ROWS.map((r) => Math.abs(r.d)));
  return (
    <AppShell active="scenarios" mobile>
      <MobileBar title="ESCENARIOS" />

      <section style={{ padding: '22px 18px 12px' }} className="agm-anim-blur">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="agm-dot agm-dot-violet" />
          <span className="agm-mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--violet)' }}>
            SIMULADOR
          </span>
        </div>
        <h1 className="agm-display" style={{ fontSize: 28, letterSpacing: '0.03em', color: 'var(--fg-0)' }}>
          {t('mv_title')}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 6 }}>{t('mv_sub')}</div>
      </section>

      <section style={{ padding: '8px 18px' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 10 }}>
          CONDICIONES · 3
        </div>
        <div className="agm-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CondRow icon="01" color="green" type={t('cond_score')} body="ARG 3 — 0 MEX" />
          <CondRow icon="02" color="green" type={t('cond_winner')} body="BRA gana cuartos vs ESP" />
          <CondRow icon="03" color="violet" type={t('cond_climate')} body="Miami · 35°C" />
        </div>
        <button style={{
          marginTop: 10, padding: 12, width: '100%',
          background: 'transparent', border: '1px dashed var(--line-2)',
          borderRadius: 10, color: 'var(--fg-3)', fontSize: 12,
        }}>+ {t('mv_add')}</button>
        <button className="agm-btn agm-btn-primary" style={{
          marginTop: 14, width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', fontSize: 12,
        }}>
          {t('mv_collapse')}
        </button>
      </section>

      <section style={{ padding: '24px 18px 8px' }}>
        <SectionHeader kicker={t('mv_delta_title')} />
        <div className="agm-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="agm-th" style={{ padding: '8px 10px' }}>SEL.</th>
                <th className="agm-th" style={{ padding: '8px 8px', textAlign: 'right' }}>BASE</th>
                <th className="agm-th" style={{ padding: '8px 8px', textAlign: 'right' }}>SIM</th>
                <th className="agm-th" style={{ padding: '8px 8px', textAlign: 'right' }}>Δ</th>
              </tr>
            </thead>
            <tbody className="agm-stagger">
              {DELTA_ROWS.slice(0, 8).map((r) => (
                <tr key={r.code} className="agm-tr-hover">
                  <td className="agm-td" style={{ padding: '8px 10px' }}>
                    <Flag code={r.code} size={11} />
                  </td>
                  <td className="agm-td agm-mono" style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--fg-3)', fontSize: 10 }}>
                    {r.base.toFixed(1)}
                  </td>
                  <td className="agm-td agm-mono" style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--fg-0)' }}>
                    {r.now.toFixed(1)}
                  </td>
                  <td className="agm-td agm-mono" style={{
                    padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11,
                    color: r.d > 0 ? 'var(--green-deep)' : 'var(--red)',
                  }}>
                    {r.d > 0 ? '+' : ''}{r.d.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ padding: '16px 18px 30px' }}>
        <SectionHeader kicker={t('mv_universes')} />
        <div className="agm-card agm-stagger">
          {UNIVERSES.slice(0, 4).map((u) => (
            <div key={u.id} className="agm-row-hover" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="agm-mono" style={{ fontSize: 10, color: 'var(--violet)', fontWeight: 600 }}>
                  {u.id}
                </span>
                <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>p={u.odd}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>CAMP</span>
                <Flag code={u.champ} size={12} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-2)', marginTop: 4 }}>{u.f}</div>
            </div>
          ))}
        </div>
      </section>

      <MobileTabs active="scenarios" />
    </AppShell>
  );
}

// Backward-compat aliases (host file uses MultiverseDesktop/Mobile)
Object.assign(window, {
  ScenariosDesktop, ScenariosMobile,
  MultiverseDesktop: ScenariosDesktop, MultiverseMobile: ScenariosMobile,
});
