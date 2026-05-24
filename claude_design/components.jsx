// Shared atoms for Agamotto screens

// ─── Animated number counter ───
function AnimNum({ value, format = (v) => v, duration = 900, delay = 0 }) {
  // Parse numeric portion + suffix
  const num = parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let raf, start;
    const t = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(num * eased);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [num, duration, delay]);
  return <span>{format(n)}</span>;
}

// ─── Aperture logo (analytical, not occult) ───
function ApertureLogo({ size = 36, spin = true }) {
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size} height={size} viewBox="0 0 36 36"
        style={spin ? { animation: 'agm-spin 24s linear infinite' } : null}>
        <defs>
          <linearGradient id={`grad-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--green)" />
            <stop offset="1" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        {/* outer ring */}
        <circle cx="18" cy="18" r="16" fill="none" stroke={`url(#grad-${size})`} strokeWidth="1.2" />
        {/* tick marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 18 + Math.cos(a) * 14;
          const y1 = 18 + Math.sin(a) * 14;
          const x2 = 18 + Math.cos(a) * (i % 3 === 0 ? 11 : 12.5);
          const y2 = 18 + Math.sin(a) * (i % 3 === 0 ? 11 : 12.5);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--fg-2)" strokeWidth="0.8" opacity="0.6" />;
        })}
        {/* inner ring */}
        <circle cx="18" cy="18" r="9" fill="none" stroke="var(--fg-3)" strokeWidth="0.6" opacity="0.4" />
        {/* aperture blades — 6 triangles forming an iris */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const x = 18 + Math.cos(a) * 5;
          const y = 18 + Math.sin(a) * 5;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--green)" opacity="0.65" />;
        })}
        {/* center node */}
        <circle cx="18" cy="18" r="2.4" fill="var(--green)" />
        <circle cx="18" cy="18" r="1.0" fill="var(--bg-1)" />
      </svg>
    </div>
  );
}

// ─── Wordmark ───
function Wordmark({ size = 18, sub = true }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <ApertureLogo size={size * 1.6} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span className="agm-display" style={{
          fontSize: size, letterSpacing: '0.20em',
          color: 'var(--fg-0)', fontWeight: 600,
        }}>
          AGAMOTTO
        </span>
        {sub && <span className="agm-mono" style={{
          fontSize: size * 0.48, color: 'var(--fg-3)', marginTop: 4, letterSpacing: '0.16em',
        }}>
          PREDICTIVE · FIFA 2026
        </span>}
      </div>
    </div>
  );
}

// ─── Top nav ───
function TopNav({ active = 'home', onLogin, onSignup }) {
  const t = useT();
  const items = [
    ['home',      t('nav_home')],
    ['scenarios', t('nav_scenarios')],
    ['bracket',   t('nav_bracket')],
    ['academic',  t('nav_academic')],
    ['pivot',     t('nav_pivot')],
    ['players',   t('nav_players')],
  ];
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 28,
      padding: '18px 40px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg-1)',
      position: 'relative', zIndex: 10,
    }}>
      <Wordmark size={13} sub={false} />
      <nav style={{ display: 'flex', gap: 2, marginLeft: 28 }}>
        {items.map(([k, label]) => (
          <a key={k} href="#" style={{
            color: k === active ? 'var(--green-deep)' : 'var(--fg-2)',
            textDecoration: 'none', padding: '8px 14px',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRadius: 6,
            background: k === active ? 'var(--green-bg)' : 'transparent',
            position: 'relative',
            transition: 'all .15s',
          }}>
            {label}
          </a>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="agm-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>
          v0.4.1 · CALIB Ω
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--green-deep)', fontFamily: 'var(--font-mono)' }}>
          <span className="agm-dot agm-dot-green agm-dot-pulse" /> ONLINE
        </span>
        <LangSwitch />
        <ThemeToggle />
        <div style={{ width: 1, height: 22, background: 'var(--line)' }} />
        <button className="agm-btn agm-btn-ghost" style={{ height: 32, fontSize: 12, padding: '0 14px' }}
          onClick={onLogin}>
          {t('auth_login')}
        </button>
        <button className="agm-btn agm-btn-primary" style={{ height: 32, fontSize: 12, padding: '0 16px' }}
          onClick={onSignup}>
          {t('auth_signup')}
        </button>
      </div>
    </header>
  );
}

// ─── Mobile top bar ───
function MobileBar({ title, onMenu }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderBottom: '1px solid var(--line)',
      background: 'var(--bg-1)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ApertureLogo size={24} spin={false} />
        <span className="agm-display" style={{ fontSize: 12, letterSpacing: '0.16em', fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LangSwitch />
        <ThemeToggle />
      </div>
    </div>
  );
}

// ─── Mobile bottom tabs ───
function MobileTabs({ active = 'home' }) {
  const t = useT();
  const items = [
    ['home',      'nav_home',      'M3 10l7-6 7 6v8H3z'],
    ['scenarios', 'nav_scenarios', 'M10 3v14M3 10h14'],
    ['bracket',   'nav_bracket',   'M3 5h5v4H3zM3 11h5v4H3zM12 8h5'],
    ['academic',  'nav_academic',  'M3 14L7 9l3 3 4-6'],
    ['pivot',     'nav_pivot',     'M5 5l10 10M15 5L5 15'],
  ];
  return (
    <nav style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'space-around',
      padding: '8px 0 12px',
      background: 'var(--bg-1)',
      borderTop: '1px solid var(--line)',
      zIndex: 12,
    }}>
      {items.map(([k, key, path]) => {
        const on = k === active;
        return (
          <button key={k} style={{
            background: 'transparent', border: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4,
            color: on ? 'var(--green-deep)' : 'var(--fg-3)',
            padding: '4px 8px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d={path} />
            </svg>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {useT()(key)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Auth modal ───
function AuthModal({ mode, onClose, onSwitch }) {
  // mode: 'login' | 'signup' | null
  const t = useT();
  if (!mode) return null;
  const isSignup = mode === 'signup';
  return (
    <div className="agm-modal-overlay" onClick={onClose}>
      <div className="agm-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: 6, border: 0,
          background: 'transparent', color: 'var(--fg-3)', fontSize: 18,
        }}>×</button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
          <ApertureLogo size={42} spin={false} />
          <div className="agm-display" style={{
            fontSize: 22, marginTop: 12, letterSpacing: '0.04em', color: 'var(--fg-0)',
          }}>
            {isSignup ? t('auth_signup') : t('auth_login')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
            {isSignup ? 'AGAMOTTO · PREDICTIVE 2026' : 'Bienvenido/a de nuevo'}
          </div>
        </div>

        {/* OAuth */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button className="agm-btn agm-btn-ghost" style={{ height: 38, width: '100%', justifyContent: 'center', fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path fill="#EA4335" d="M7 5.7v2.6h3.7c-.2 1-1.4 2.8-3.7 2.8-2.2 0-4-1.8-4-4s1.8-4 4-4c1.3 0 2.1.5 2.6 1l1.8-1.7C10.2 1.5 8.7.8 7 .8 3.6.8.8 3.6.8 7s2.8 6.2 6.2 6.2c3.6 0 6-2.5 6-6 0-.4 0-.7-.1-1.1H7z"/></svg>
            Google
          </button>
          <button className="agm-btn agm-btn-ghost" style={{ height: 38, width: '100%', justifyContent: 'center', fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M10.7 7.4c0-1.6 1.3-2.4 1.4-2.5-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.6.6-.5 0-1.4-.6-2.3-.6C3.3 3.6 2 4.5 2 6.5c0 1.2.4 2.4.9 3.3.5.8 1 1.4 1.8 1.4.7 0 1-.5 1.9-.5.9 0 1.1.5 1.9.5.8 0 1.3-.7 1.8-1.5.6-.9.8-1.7.8-1.7 0-.1-1.4-.6-1.4-2.6zM9.2 2.6c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.8.7 0 1.4-.4 1.7-.8z"/></svg>
            Apple
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 18px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('auth_or')}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        {isSignup && (
          <div style={{ marginBottom: 14 }}>
            <label className="agm-label">{t('auth_name')}</label>
            <input className="agm-input" placeholder="Lionel Messi" defaultValue="" />
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label className="agm-label">{t('auth_email')}</label>
          <input className="agm-input" placeholder="hola@agamotto.io" type="email" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="agm-label">{t('auth_password')}</label>
          <input className="agm-input" placeholder="••••••••••" type="password" defaultValue="••••••••" />
        </div>
        {!isSignup && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--fg-2)' }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: '1px solid var(--line-2)',
                background: 'var(--green)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 9,
              }}>✓</span>
              {t('auth_remember')}
            </label>
            <a href="#" style={{ fontSize: 11, color: 'var(--green-deep)', textDecoration: 'none' }}>{t('auth_forgot')}</a>
          </div>
        )}
        {isSignup && <div style={{ marginBottom: 18 }} />}

        <button className="agm-btn agm-btn-primary" style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 13 }}>
          {isSignup ? t('auth_signup_btn') : t('auth_login_btn')}
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--fg-2)', textAlign: 'center' }}>
          {isSignup ? t('auth_have_account') : t('auth_no_account')}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }}
            style={{ color: 'var(--green-deep)', fontWeight: 600, textDecoration: 'none' }}>
            {isSignup ? t('auth_login') : t('auth_signup')}
          </a>
        </div>
        {isSignup && (
          <div style={{ marginTop: 12, fontSize: 10, color: 'var(--fg-3)', textAlign: 'center', lineHeight: 1.6 }}>
            {t('auth_terms')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Country roster ───
const COUNTRIES = {
  ARG: { f: '🇦🇷', n: 'Argentina',    grp: 'C', elo: 2143, fifa: 1, conf: 'CONMEBOL' },
  BRA: { f: '🇧🇷', n: 'Brasil',       grp: 'G', elo: 2105, fifa: 5, conf: 'CONMEBOL' },
  FRA: { f: '🇫🇷', n: 'Francia',      grp: 'F', elo: 2112, fifa: 2, conf: 'UEFA' },
  ESP: { f: '🇪🇸', n: 'España',       grp: 'H', elo: 2090, fifa: 3, conf: 'UEFA' },
  ENG: { f: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', n: 'Inglaterra', grp: 'D', elo: 2076, fifa: 4, conf: 'UEFA' },
  GER: { f: '🇩🇪', n: 'Alemania',     grp: 'E', elo: 2020, fifa: 9, conf: 'UEFA' },
  POR: { f: '🇵🇹', n: 'Portugal',     grp: 'L', elo: 2030, fifa: 6, conf: 'UEFA' },
  NED: { f: '🇳🇱', n: 'Países Bajos', grp: 'J', elo: 2015, fifa: 7, conf: 'UEFA' },
  ITA: { f: '🇮🇹', n: 'Italia',       grp: 'K', elo: 2005, fifa: 8, conf: 'UEFA' },
  BEL: { f: '🇧🇪', n: 'Bélgica',      grp: 'F', elo: 1985, fifa: 10,conf: 'UEFA' },
  CRO: { f: '🇭🇷', n: 'Croacia',      grp: 'I', elo: 1970, fifa: 11,conf: 'UEFA' },
  URU: { f: '🇺🇾', n: 'Uruguay',      grp: 'A', elo: 1965, fifa: 13,conf: 'CONMEBOL' },
  COL: { f: '🇨🇴', n: 'Colombia',     grp: 'B', elo: 1955, fifa: 12,conf: 'CONMEBOL' },
  MEX: { f: '🇲🇽', n: 'México',       grp: 'A', elo: 1880, fifa: 15,conf: 'CONCACAF' },
  USA: { f: '🇺🇸', n: 'USA',          grp: 'B', elo: 1860, fifa: 17,conf: 'CONCACAF' },
  CAN: { f: '🇨🇦', n: 'Canadá',       grp: 'C', elo: 1820, fifa: 30,conf: 'CONCACAF' },
  MAR: { f: '🇲🇦', n: 'Marruecos',    grp: 'F', elo: 1830, fifa: 14,conf: 'CAF' },
  JPN: { f: '🇯🇵', n: 'Japón',        grp: 'J', elo: 1840, fifa: 16,conf: 'AFC' },
  KOR: { f: '🇰🇷', n: 'Corea',        grp: 'D', elo: 1810, fifa: 22,conf: 'AFC' },
  SEN: { f: '🇸🇳', n: 'Senegal',      grp: 'G', elo: 1815, fifa: 18,conf: 'CAF' },
  SUI: { f: '🇨🇭', n: 'Suiza',        grp: 'I', elo: 1855, fifa: 19,conf: 'UEFA' },
  DEN: { f: '🇩🇰', n: 'Dinamarca',    grp: 'L', elo: 1865, fifa: 20,conf: 'UEFA' },
  ECU: { f: '🇪🇨', n: 'Ecuador',      grp: 'B', elo: 1810, fifa: 24,conf: 'CONMEBOL' },
  AUS: { f: '🇦🇺', n: 'Australia',    grp: 'C', elo: 1750, fifa: 27,conf: 'AFC' },
};

function Flag({ code, showName = false, size = 14, dim = false }) {
  const c = COUNTRIES[code] || { f: '⚑', n: code };
  return (
    <span className="agm-flag" style={{ fontSize: size, opacity: dim ? 0.5 : 1 }}>
      <span className="agm-flag-emoji" style={{ fontSize: size * 1.15 }}>{c.f}</span>
      <span>{code}</span>
      {showName && <span style={{ color: 'var(--fg-2)', fontFamily: 'var(--font-sans)', fontWeight: 500, letterSpacing: 0, marginLeft: 2 }}>{c.n}</span>}
    </span>
  );
}

// ─── Probability bar ───
function ProbBar({ value, height = 6 }) {
  return (
    <div className="agm-bar" style={{ height }}>
      <div className="agm-bar-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── 1X2 bar ───
function Bar1X2({ home, draw, away }) {
  return (
    <div className="agm-bar-1x2">
      <span style={{ width: `${home}%` }} />
      <span style={{ width: `${draw}%` }} />
      <span style={{ width: `${away}%` }} />
    </div>
  );
}

// ─── Sparkline (form) ───
function Sparkline({ results, w = 90, h = 18 }) {
  // results: array of 'W' 'D' 'L'
  const cw = w / results.length;
  return (
    <div style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {results.map((r, i) => (
        <span key={i} style={{
          width: cw - 2, height: h,
          background: r === 'W' ? 'var(--green)' : r === 'D' ? 'var(--fg-3)' : 'var(--red)',
          borderRadius: 2,
          display: 'inline-block',
          opacity: 0.85,
        }} />
      ))}
    </div>
  );
}

// ─── Metric block ───
function Metric({ value, label, unit, accent = 'green', animate = true, decimals = 0 }) {
  const fmt = (n) => {
    if (typeof value === 'string' && /[a-zA-Z]/.test(value)) return value;
    if (value === '100,000' || value === '100k') {
      return Math.round(n).toLocaleString('en-US');
    }
    return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');
  };
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 44, fontWeight: 500, lineHeight: 1,
        color: 'var(--fg-0)',
        letterSpacing: '-0.01em',
      }}>
        <span className="agm-num">
          {animate && !(typeof value === 'string' && /[a-zA-Z]/.test(value))
            ? <AnimNum value={value} format={fmt} />
            : value}
        </span>
        {unit && <span style={{ fontSize: 14, color: 'var(--fg-3)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>{unit}</span>}
      </div>
      <div style={{
        marginTop: 8, fontSize: 10, color: 'var(--fg-3)',
        letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{
        position: 'absolute', left: -14, top: 4, bottom: 4, width: 2,
        background: accent === 'green' ? 'var(--green)' : 'var(--violet)',
        boxShadow: `0 0 8px ${accent === 'green' ? 'var(--green-glow)' : 'var(--violet-glow)'}`,
      }} />
    </div>
  );
}

// ─── Branching timelines hero SVG ───
function TimelinesHero({ width = 760, height = 460 }) {
  const cx = 80, cy = height / 2;
  const branches = [];
  const build = (x, y, depth, parentId) => {
    if (depth > 4) return;
    const stepX = (width - 100) / 5;
    const nx = x + stepX;
    const spread = (height / 2 - 40) / Math.pow(2, depth);
    const isViolet = (parentId.length % 2) === 1;
    const colorA = isViolet ? 'var(--violet)' : 'var(--green)';
    const colorB = !isViolet ? 'var(--violet)' : 'var(--green)';
    if (depth === 0) {
      const yA = y - spread * 0.6, yB = y + spread * 0.6;
      branches.push({ x1: x, y1: y, x2: nx, y2: yA, c: 'var(--green)', w: 2.4, op: 0.9 });
      branches.push({ x1: x, y1: y, x2: nx, y2: yB, c: 'var(--violet)', w: 1.6, op: 0.5 });
      build(nx, yA, depth + 1, parentId + 'A');
      build(nx, yB, depth + 1, parentId + 'B');
    } else {
      const yA = y - spread, yB = y + spread;
      const wA = 2.2 / (depth + 0.5);
      const wB = 1.4 / (depth + 0.5);
      branches.push({ x1: x, y1: y, x2: nx, y2: yA, c: colorA, w: wA, op: 0.75 / depth });
      branches.push({ x1: x, y1: y, x2: nx, y2: yB, c: colorB, w: wB, op: 0.55 / depth });
      build(nx, yA, depth + 1, parentId + 'A');
      build(nx, yB, depth + 1, parentId + 'B');
    }
  };
  build(cx, cy, 0, '');
  // Total path length for stroke-dashoffset animation
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="var(--green-glow)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={80} fill="url(#halo)" />
      {branches.map((b, i) => {
        const dx = b.x2 - b.x1;
        const midX = b.x1 + dx * 0.5;
        const d = `M ${b.x1} ${b.y1} C ${midX} ${b.y1}, ${midX} ${b.y2}, ${b.x2} ${b.y2}`;
        return (
          <path key={i} d={d} stroke={b.c} strokeWidth={b.w} fill="none" opacity={b.op} strokeLinecap="round"
            strokeDasharray="600" strokeDashoffset="600"
            style={{ animation: `agm-draw 1.4s ${0.05 + i * 0.015}s cubic-bezier(0.2, 0.7, 0.3, 1) forwards` }} />
        );
      })}
      {branches.filter((b) => b.x2 >= width - 100).map((b, i) => (
        <g key={`n${i}`} style={{ animation: `agm-fade-in 0.4s ${1.0 + i * 0.02}s ease both`, opacity: 0 }}>
          <circle cx={b.x2} cy={b.y2} r={3} fill={b.c} opacity={b.op + 0.2} />
          <circle cx={b.x2} cy={b.y2} r={6} fill={b.c} opacity={0.1} />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={9} fill="var(--bg-1)" stroke="var(--green)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={3} fill="var(--green)" />
      <text x={cx - 18} y={cy - 18} fill="var(--green-deep)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">T₀ · NOW</text>
      <text x={width - 60} y={20} fill="var(--fg-3)" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">+ 32 DAYS</text>

      <style>{`@keyframes agm-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

// ─── Top-right legend ───
function LegendItem({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--fg-2)', letterSpacing: '0.08em' }}>
      <span style={{ width: 14, height: 2, background: color }} />
      {label}
    </span>
  );
}

// ─── Section header ───
function SectionHeader({ kicker, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
      <div>
        {kicker && <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 6 }}>{kicker}</div>}
        {title && <div className="agm-display" style={{ fontSize: 22, color: 'var(--fg-0)', letterSpacing: '0.03em' }}>{title}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── App shell — wraps a screen with theme + auth modal ───
function AppShell({ children, active, mobile = false }) {
  const { theme } = React.useContext(ThemeCtx);
  const [authMode, setAuthMode] = React.useState(null);

  // Inject login/signup callbacks via cloning the first child (TopNav or MobileBar)
  const enhanced = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === TopNav || child.type === MobileBar) {
      return React.cloneElement(child, {
        onLogin: () => setAuthMode('login'),
        onSignup: () => setAuthMode('signup'),
      });
    }
    return child;
  });

  return (
    <div className="agm-root agm-bg" data-theme={theme}
      style={{ width: '100%', height: '100%', overflow: mobile ? 'auto' : 'auto',
        position: 'relative', paddingBottom: mobile ? 76 : 0 }}>
      {enhanced}
      <AuthModal mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitch={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} />
    </div>
  );
}

Object.assign(window, {
  ApertureLogo, Wordmark, TopNav, MobileBar, MobileTabs,
  AuthModal, AppShell,
  Flag, COUNTRIES, ProbBar, Bar1X2, Sparkline, Metric, AnimNum,
  TimelinesHero, LegendItem, SectionHeader,
});
