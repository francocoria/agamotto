// Login + Signup full-page views (desktop + mobile)
// Split-screen on desktop: branded panel on left, form on right.

// Sample mini-ranking for the visual side
const AUTH_TOP5 = [
  { code: 'ARG', p: 14.8 },
  { code: 'BRA', p: 13.2 },
  { code: 'FRA', p: 11.6 },
  { code: 'ESP', p: 10.4 },
  { code: 'ENG', p:  9.1 },
];

// ─── Visual side panel (desktop) ───
function AuthVisual() {
  const max = AUTH_TOP5[0].p;
  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--line)',
      padding: '40px 48px',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Background timelines */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
      }}>
        <TimelinesHero width={760} height={900} />
      </div>

      {/* Top: wordmark */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Wordmark size={14} sub />
      </div>

      {/* Headline */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: 56, marginBottom: 40 }} className="agm-anim-blur">
        <div className="agm-mono" style={{
          fontSize: 10, letterSpacing: '0.18em', color: 'var(--green-deep)',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span className="agm-dot agm-dot-green agm-dot-pulse" />
          MUNDIAL 2026 · 11 JUN — 19 JUL
        </div>
        <h1 className="agm-display" style={{
          fontSize: 64, lineHeight: 0.92, color: 'var(--fg-0)',
          fontWeight: 800, letterSpacing: '-0.01em',
          maxWidth: 480,
        }}>
          NO VEMOS<br />
          UN FUTURO. <br />
          <span style={{ color: 'var(--green-deep)' }}>LOS CALCULAMOS<br />TODOS.</span>
        </h1>
      </div>

      {/* Live match card floating */}
      <div className="agm-card agm-anim-fade-up" style={{
        position: 'relative', zIndex: 1, padding: 16, marginBottom: 20,
        maxWidth: 360,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="agm-pill agm-pill-red" style={{ height: 18, fontSize: 9 }}>
            <span className="agm-dot agm-dot-pulse" style={{ background: 'var(--red)' }} /> EN VIVO · 76'
          </span>
          <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
            METLIFE · NJ
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="agm-flag-emoji" style={{ fontSize: 26 }}>🇦🇷</span>
            <span className="agm-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)' }}>ARG</span>
          </div>
          <div className="agm-broadcast" style={{
            fontSize: 36, color: 'var(--fg-0)', letterSpacing: '0.02em', lineHeight: 1,
            fontFamily: 'var(--font-broadcast)',
          }}>
            2 <span style={{ color: 'var(--fg-3)' }}>:</span> 1
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="agm-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)' }}>BRA</span>
            <span className="agm-flag-emoji" style={{ fontSize: 26 }}>🇧🇷</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="agm-bar-1x2">
            <span style={{ width: '78%' }} />
            <span style={{ width: '14%' }} />
            <span style={{ width: '8%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            <span style={{ color: 'var(--green-deep)' }}>ARG GANA · 78%</span>
            <span style={{ color: 'var(--fg-3)' }}>UPDATED 0:02s</span>
          </div>
        </div>
      </div>

      {/* Mini ranking */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 20, maxWidth: 360 }}>
        <div className="agm-mono" style={{
          fontSize: 10, letterSpacing: '0.16em', color: 'var(--fg-3)',
          fontWeight: 700, marginBottom: 10,
        }}>
          TOP 5 · P(TÍTULO) · LÍNEA BASE
        </div>
        <div className="agm-stagger">
          {AUTH_TOP5.map((c, i) => (
            <div key={c.code} style={{
              display: 'grid', gridTemplateColumns: '20px 86px 1fr 50px',
              alignItems: 'center', gap: 12,
              padding: '8px 0',
              borderBottom: i < 4 ? '1px solid var(--line)' : 'none',
            }}>
              <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <Flag code={c.code} showName size={12} />
              <div className="agm-bar" style={{ height: 4 }}>
                <div className="agm-bar-fill" style={{ width: `${(c.p / max) * 100}%` }} />
              </div>
              <span className="agm-mono" style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--fg-0)' }}>
                {c.p.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: hosts + venues */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
        <div className="agm-rune-line" style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { f: '🇺🇸', n: 'UNITED STATES', c: '11 venues' },
            { f: '🇲🇽', n: 'MÉXICO',         c: '3 venues' },
            { f: '🇨🇦', n: 'CANADÁ',         c: '2 venues' },
          ].map((h) => (
            <div key={h.n} style={{
              flex: 1,
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 12px',
              background: 'var(--bg-2)',
            }}>
              <span className="agm-flag-emoji" style={{ fontSize: 18 }}>{h.f}</span>
              <div className="agm-display" style={{ fontSize: 11, color: 'var(--fg-0)', marginTop: 4, letterSpacing: '0.02em', fontWeight: 700 }}>{h.n}</div>
              <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', marginTop: 2 }}>{h.c}</div>
            </div>
          ))}
        </div>
        <div className="agm-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.14em' }}>
          48 SELECCIONES · 104 PARTIDOS · 16 SEDES · 100.000 SIMULACIONES NIGHTLY
        </div>
      </div>
    </div>
  );
}

// ─── Auth form (shared body) ───
function AuthForm({ mode, onSwitch, compact = false }) {
  const t = useT();
  const isSignup = mode === 'signup';
  return (
    <div style={{ width: '100%', maxWidth: compact ? '100%' : 380 }}>
      <div className="agm-anim-fade-up">
        <div className="agm-mono" style={{
          fontSize: 10, letterSpacing: '0.18em', color: 'var(--fg-3)',
          fontWeight: 700, marginBottom: 12,
        }}>
          {isSignup ? '— CREÁ TU CUENTA' : '— BIENVENIDO/A DE NUEVO'}
        </div>
        <h1 className="agm-display" style={{
          fontSize: compact ? 36 : 44, lineHeight: 1, color: 'var(--fg-0)',
          fontWeight: 800, marginBottom: 10, letterSpacing: '-0.005em',
        }}>
          {isSignup ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 22, lineHeight: 1.55 }}>
          {isSignup
            ? 'Acceso completo al simulador, bracket multiverso, partidos pivote y exportación de datos.'
            : 'Entrá para ejecutar simulaciones, guardar escenarios y exportar tus análisis.'}
        </p>
      </div>

      {/* OAuth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }} className="agm-anim-fade-up">
        <button className="agm-btn agm-btn-ghost agm-lift" style={{ height: 44, width: '100%', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path fill="#EA4335" d="M7 5.7v2.6h3.7c-.2 1-1.4 2.8-3.7 2.8-2.2 0-4-1.8-4-4s1.8-4 4-4c1.3 0 2.1.5 2.6 1l1.8-1.7C10.2 1.5 8.7.8 7 .8 3.6.8.8 3.6.8 7s2.8 6.2 6.2 6.2c3.6 0 6-2.5 6-6 0-.4 0-.7-.1-1.1H7z"/></svg>
          Google
        </button>
        <button className="agm-btn agm-btn-ghost agm-lift" style={{ height: 44, width: '100%', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="currentColor"><path d="M10.7 7.4c0-1.6 1.3-2.4 1.4-2.5-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.6.6-.5 0-1.4-.6-2.3-.6C3.3 3.6 2 4.5 2 6.5c0 1.2.4 2.4.9 3.3.5.8 1 1.4 1.8 1.4.7 0 1-.5 1.9-.5.9 0 1.1.5 1.9.5.8 0 1.3-.7 1.8-1.5.6-.9.8-1.7.8-1.7 0-.1-1.4-.6-1.4-2.6zM9.2 2.6c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.7 0 1.4-.4 1.7-.8z"/></svg>
          Apple
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 18px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{t('auth_or')}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      <div className="agm-stagger">
        {isSignup && (
          <div style={{ marginBottom: 14 }}>
            <label className="agm-label">{t('auth_name')}</label>
            <input className="agm-input" placeholder="Tu nombre" defaultValue="Lionel Mendoza" />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label className="agm-label">{t('auth_email')}</label>
          <input className="agm-input" placeholder="hola@agamotto.io" type="email" defaultValue="lionel@10.ar" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="agm-label">{t('auth_password')}</label>
          <div style={{ position: 'relative' }}>
            <input className="agm-input" placeholder="••••••••••" type="password" defaultValue="••••••••••" style={{ paddingRight: 64 }} />
            <button style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 0,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--fg-3)', textTransform: 'uppercase',
              padding: '6px 8px',
            }}>VER</button>
          </div>
          {isSignup && (
            <div style={{ marginTop: 8 }}>
              <div className="agm-bar" style={{ height: 4 }}>
                <div className="agm-bar-fill" style={{ width: '78%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10 }}>
                <span style={{ color: 'var(--green-deep)', fontWeight: 600 }}>Contraseña fuerte</span>
                <span className="agm-mono" style={{ color: 'var(--fg-3)' }}>14/24</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isSignup ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-2)' }}>
            <span style={{
              width: 16, height: 16, borderRadius: 4,
              border: '1px solid var(--green-deep)',
              background: 'var(--green)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10,
            }}>✓</span>
            {t('auth_remember')}
          </label>
          <a href="#" style={{ fontSize: 12, color: 'var(--green-deep)', textDecoration: 'none', fontWeight: 600 }}>{t('auth_forgot')}</a>
        </div>
      ) : (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 20, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
          <span style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: '1px solid var(--green-deep)',
            background: 'var(--green)', marginTop: 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 10,
          }}>✓</span>
          <span>
            Acepto los <a href="#" style={{ color: 'var(--green-deep)', fontWeight: 600 }}>Términos</a> y
            la <a href="#" style={{ color: 'var(--green-deep)', fontWeight: 600 }}>Política de Privacidad</a>.
          </span>
        </label>
      )}

      <button className="agm-btn agm-btn-primary" style={{
        width: '100%', height: 48, justifyContent: 'center',
        fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        borderRadius: 10,
      }}>
        {isSignup ? t('auth_signup_btn') : t('auth_login_btn')}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
      </button>

      <div style={{ marginTop: 18, fontSize: 13, color: 'var(--fg-2)', textAlign: 'center' }}>
        {isSignup ? t('auth_have_account') : t('auth_no_account')}{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitch && onSwitch(); }}
          style={{ color: 'var(--green-deep)', fontWeight: 700, textDecoration: 'none' }}>
          {isSignup ? t('auth_login') : t('auth_signup')}
        </a>
      </div>
    </div>
  );
}

// ─── DESKTOP ───
function AuthDesktop({ mode = 'login' }) {
  const t = useT();
  const { theme } = React.useContext(ThemeCtx);
  return (
    <div className="agm-root agm-bg" data-theme={theme} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        height: '100%',
      }}>
        <AuthVisual />
        {/* Form side */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '36px 60px 40px',
          position: 'relative',
        }}>
          {/* Top-right utility row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            <LangSwitch />
            <ThemeToggle />
            <button className="agm-btn agm-btn-ghost" style={{ height: 30, fontSize: 11, padding: '0 12px' }}>← VOLVER</button>
          </div>

          {/* Centered form */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AuthForm mode={mode} onSwitch={() => {}} />
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em',
            fontFamily: 'var(--font-mono)',
          }}>
            <span>AGAMOTTO · PREDICTIVE 2026</span>
            <span>SECURE · TLS 1.3 · COOKIES MIN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE ───
function AuthMobile({ mode = 'login' }) {
  const t = useT();
  const { theme } = React.useContext(ThemeCtx);
  const isSignup = mode === 'signup';
  return (
    <div className="agm-root agm-bg" data-theme={theme}
      style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--line)',
        background: 'var(--bg-1)',
      }}>
        <button className="agm-btn agm-btn-icon" style={{ width: 32, height: 32 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5" /></svg>
        </button>
        <Wordmark size={11} sub={false} />
        <div style={{ display: 'flex', gap: 6 }}>
          <ThemeToggle />
        </div>
      </div>

      {/* Hero strip */}
      <section style={{ padding: '24px 22px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
        }}>
          <TimelinesHero width={390} height={200} />
        </div>
        <div className="agm-anim-blur" style={{ position: 'relative' }}>
          <div className="agm-mono" style={{
            fontSize: 9, letterSpacing: '0.16em', color: 'var(--green-deep)',
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="agm-dot agm-dot-green agm-dot-pulse" />
            MUNDIAL 2026 · 11 JUN — 19 JUL
          </div>
          <h1 className="agm-display" style={{
            fontSize: 38, lineHeight: 0.95, color: 'var(--fg-0)',
            fontWeight: 800, letterSpacing: '-0.005em',
          }}>
            {isSignup ? <>UNITE A<br /><span style={{ color: 'var(--green-deep)' }}>AGAMOTTO.</span></> : <>BIENVENIDO<br />DE <span style={{ color: 'var(--green-deep)' }}>VUELTA.</span></>}
          </h1>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '8px 22px 32px' }}>
        <AuthForm mode={mode} onSwitch={() => {}} compact />
      </section>

      {/* Bottom hosts */}
      <section style={{ padding: '0 22px 24px' }}>
        <div className="agm-rune-line" style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { f: '🇺🇸', c: 'USA', v: '11' },
            { f: '🇲🇽', c: 'MEX', v: '3' },
            { f: '🇨🇦', c: 'CAN', v: '2' },
          ].map((h) => (
            <div key={h.c} style={{
              flex: 1,
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '8px 10px',
              background: 'var(--bg-2)',
              textAlign: 'center',
            }}>
              <span className="agm-flag-emoji" style={{ fontSize: 16 }}>{h.f}</span>
              <div className="agm-display" style={{ fontSize: 11, color: 'var(--fg-0)', marginTop: 2, fontWeight: 700 }}>{h.c}</div>
              <div className="agm-mono" style={{ fontSize: 8, color: 'var(--fg-3)' }}>{h.v} sedes</div>
            </div>
          ))}
        </div>
        <div className="agm-mono" style={{
          fontSize: 8, color: 'var(--fg-3)', letterSpacing: '0.14em',
          textAlign: 'center',
        }}>
          48 SELECCIONES · 104 PARTIDOS · 16 SEDES
        </div>
      </section>
    </div>
  );
}

Object.assign(window, {
  AuthDesktop, AuthMobile,
  LoginDesktop: () => <AuthDesktop mode="login" />,
  LoginMobile:  () => <AuthMobile  mode="login" />,
  SignupDesktop:() => <AuthDesktop mode="signup" />,
  SignupMobile: () => <AuthMobile  mode="signup" />,
});
