// Trilingual strings + theme + language contexts

const I18N = {
  // Nav
  nav_home:        { es: "Inicio",          pt: "Início",         en: "Home" },
  nav_scenarios:   { es: "Escenarios",      pt: "Cenários",       en: "Scenarios" },
  nav_bracket:     { es: "Llave",           pt: "Chaveamento",    en: "Bracket" },
  nav_academic:    { es: "Modelo",          pt: "Modelo",         en: "Model" },
  nav_pivot:       { es: "Pivotes",         pt: "Pivôs",          en: "Pivots" },
  nav_players:     { es: "Jugadores",       pt: "Jogadores",      en: "Players" },

  // Auth
  auth_login:      { es: "Iniciar sesión",  pt: "Entrar",         en: "Log in" },
  auth_signup:     { es: "Crear cuenta",    pt: "Criar conta",    en: "Sign up" },
  auth_or:         { es: "o continuá con",  pt: "ou continue com",en: "or continue with" },
  auth_email:      { es: "Email",           pt: "E-mail",         en: "Email" },
  auth_password:   { es: "Contraseña",      pt: "Senha",          en: "Password" },
  auth_name:       { es: "Nombre",          pt: "Nome",           en: "Name" },
  auth_remember:   { es: "Mantener sesión", pt: "Manter sessão",  en: "Stay signed in" },
  auth_forgot:     { es: "Olvidé la contraseña", pt: "Esqueci a senha", en: "Forgot password" },
  auth_no_account: { es: "¿No tenés cuenta?", pt: "Não tem conta?", en: "No account?" },
  auth_have_account: { es: "¿Ya tenés cuenta?", pt: "Já tem conta?", en: "Have an account?" },
  auth_signup_btn: { es: "Crear cuenta gratis", pt: "Criar conta grátis", en: "Create free account" },
  auth_login_btn:  { es: "Entrar",          pt: "Entrar",         en: "Sign in" },
  auth_terms:      { es: "Al continuar aceptás los Términos y la Política de Privacidad.",
                     pt: "Ao continuar você aceita os Termos e a Política de Privacidade.",
                     en: "By continuing you accept the Terms and Privacy Policy." },

  // Landing
  hero_kicker:     { es: "MUNDIAL · USA · MEX · CAN · 2026",
                     pt: "COPA · USA · MEX · CAN · 2026",
                     en: "WORLD CUP · USA · MEX · CAN · 2026" },
  hero_title_a:    { es: "No vemos",        pt: "Não vemos",      en: "We don't see" },
  hero_title_b:    { es: "un futuro.",      pt: "um futuro.",     en: "one future." },
  hero_title_c:    { es: "Los calculamos",  pt: "Calculamos",     en: "We compute" },
  hero_title_d:    { es: "todos.",          pt: "todos.",         en: "them all." },
  hero_desc:       {
    es: "Plataforma predictiva calibrada matemáticamente para los 104 partidos del Mundial 2026. Simulamos 100.000 escenarios por noche con un ensemble de cinco modelos. Tu pregunta dispara una nueva simulación en vivo.",
    pt: "Plataforma preditiva calibrada matematicamente para as 104 partidas da Copa 2026. Simulamos 100.000 cenários por noite com um ensemble de cinco modelos. Sua pergunta dispara uma nova simulação ao vivo.",
    en: "A predictive platform mathematically calibrated for the 104 matches of the 2026 World Cup. We simulate 100,000 scenarios nightly with a five-model ensemble. Your question fires a fresh on-demand simulation." },
  hero_cta_eye:    { es: "Empezar a simular", pt: "Começar a simular", en: "Start simulating" },
  hero_cta_method: { es: "Metodología",     pt: "Metodologia",    en: "Methodology" },

  metric_teams:    { es: "Selecciones",     pt: "Seleções",       en: "Nations" },
  metric_matches:  { es: "Partidos",        pt: "Partidas",       en: "Matches" },
  metric_venues:   { es: "Sedes",           pt: "Sedes",          en: "Venues" },
  metric_universes:{ es: "Escenarios simulados", pt: "Cenários simulados", en: "Scenarios simulated" },

  section_champ:   { es: "PROBABILIDAD DE TÍTULO · LÍNEA BASE",
                     pt: "PROBABILIDADE DE TÍTULO · LINHA BASE",
                     en: "TITLE PROBABILITY · BASELINE" },
  section_next:    { es: "PRÓXIMOS PARTIDOS",
                     pt: "PRÓXIMAS PARTIDAS",
                     en: "UPCOMING MATCHES" },
  section_methodology: { es: "ARQUITECTURA DEL MODELO",
                     pt: "ARQUITETURA DO MODELO",
                     en: "MODEL ARCHITECTURE" },

  // Scenarios (was Multiverse)
  mv_title:        { es: "ESCENARIOS",      pt: "CENÁRIOS",       en: "SCENARIOS" },
  mv_sub:          { es: "Encadená condiciones para recalcular el torneo bajo otra historia posible.",
                     pt: "Encadeie condições para recalcular o torneio sob outra história possível.",
                     en: "Chain conditions to recompute the tournament under another possible history." },
  mv_collapse:     { es: "Recalcular escenario",
                     pt: "Recalcular cenário",
                     en: "Recompute scenario" },
  mv_add:          { es: "Agregar condición",
                     pt: "Adicionar condição",
                     en: "Add condition" },
  mv_delta_title:  { es: "DELTA DE PROBABILIDAD · TÍTULO",
                     pt: "DELTA DE PROBABILIDADE · TÍTULO",
                     en: "PROBABILITY DELTA · TITLE" },
  mv_universes:    { es: "SIMULACIONES MUESTREADAS",
                     pt: "SIMULAÇÕES AMOSTRADAS",
                     en: "SAMPLED SIMULATIONS" },

  // Conditions
  cond_score:      { es: "Fijar marcador",  pt: "Fixar placar",   en: "Fix score" },
  cond_winner:     { es: "Fijar ganador",   pt: "Fixar vencedor", en: "Fix winner" },
  cond_climate:    { es: "Simular clima",   pt: "Simular clima",  en: "Simulate climate" },
  cond_absence:    { es: "Ausencia",        pt: "Ausência",       en: "Absence" },

  // Bracket
  br_title:        { es: "LLAVE ELIMINATORIA",
                     pt: "CHAVE ELIMINATÓRIA",
                     en: "KNOCKOUT BRACKET" },
  br_sub:          { es: "Grosor de línea proporcional a la probabilidad del cruce.",
                     pt: "Espessura da linha proporcional à probabilidade do cruzamento.",
                     en: "Line thickness proportional to crossing probability." },
  r32:             { es: "32avos",          pt: "32-avos",        en: "R32" },
  r16:             { es: "Octavos",         pt: "Oitavas",        en: "R16" },
  qf:              { es: "Cuartos",         pt: "Quartas",        en: "QF" },
  sf:              { es: "Semis",           pt: "Semis",          en: "SF" },
  final:           { es: "Final",           pt: "Final",          en: "Final" },

  // Academic / Model
  ac_title:        { es: "CALIBRACIÓN & AUDITORÍA",
                     pt: "CALIBRAÇÃO & AUDITORIA",
                     en: "CALIBRATION & AUDIT" },
  ac_curve:        { es: "Curva de calibración",
                     pt: "Curva de calibração",
                     en: "Calibration curve" },
  ac_curve_sub:    { es: "Predicho vs. observado · 12 bins · Mundiales 2002–2022.",
                     pt: "Previsto vs. observado · 12 bins · Copas 2002–2022.",
                     en: "Predicted vs. observed · 12 bins · World Cups 2002–2022." },
  ac_brier:        { es: "Brier Score",     pt: "Brier Score",    en: "Brier Score" },
  ac_logloss:      { es: "Log Loss",        pt: "Log Loss",       en: "Log Loss" },
  ac_models:       { es: "Auditoría de modelos",
                     pt: "Auditoria de modelos",
                     en: "Model audit" },

  // Pivot
  pv_title:        { es: "PARTIDOS PIVOTE",
                     pt: "PARTIDAS PIVÔ",
                     en: "PIVOT MATCHES" },
  pv_sub:          { es: "Partidos cuyo resultado bifurca el torneo con mayor entropía.",
                     pt: "Partidas cujo resultado bifurca o torneio com maior entropia.",
                     en: "Matches whose outcome forks the tournament with the highest entropy." },
  pv_entropy:      { es: "Entropía",        pt: "Entropia",       en: "Entropy" },
  pv_impact:       { es: "Impacto sistémico",
                     pt: "Impacto sistêmico",
                     en: "Systemic impact" },

  // Common
  win:             { es: "Gana", pt: "Vence", en: "Win" },
  draw:            { es: "Empate", pt: "Empate", en: "Draw" },
  vs:              { es: "vs", pt: "vs", en: "vs" },
  view_all:        { es: "Ver todos",       pt: "Ver tudo",       en: "View all" },
  live:            { es: "EN VIVO",         pt: "AO VIVO",        en: "LIVE" },
  baseline:        { es: "línea base",      pt: "linha base",     en: "baseline" },
  collapsed:       { es: "escenario",       pt: "cenário",        en: "scenario" },
  iterations:      { es: "iteraciones",     pt: "iterações",      en: "iterations" },
  group_stage:     { es: "Fase de Grupos",  pt: "Fase de Grupos", en: "Group Stage" },

  // Table extras
  col_team:        { es: "Selección",       pt: "Seleção",        en: "Nation" },
  col_pot:         { es: "Bombo",           pt: "Pote",           en: "Pot" },
  col_grp:         { es: "Grupo",           pt: "Grupo",          en: "Group" },
  col_elo:         { es: "Elo",             pt: "Elo",            en: "Elo" },
  col_fifa:        { es: "FIFA",            pt: "FIFA",           en: "FIFA" },
  col_form:        { es: "Forma · 10",      pt: "Forma · 10",     en: "Form · 10" },
  col_xg:          { es: "xG/p",            pt: "xG/p",           en: "xG/g" },
  col_ttl:         { es: "P(Título)",       pt: "P(Título)",      en: "P(Title)" },
  col_sf:          { es: "P(Semi)",         pt: "P(Semi)",        en: "P(SF)" },
  col_qf:          { es: "P(Cuartos)",      pt: "P(Quartas)",     en: "P(QF)" },
  col_r16:         { es: "P(Octavos)",      pt: "P(Oitavas)",     en: "P(R16)" },
  col_trend_24h:   { es: "Δ 24h",           pt: "Δ 24h",          en: "Δ 24h" },
  col_ci:          { es: "IC 95%",          pt: "IC 95%",         en: "95% CI" },
};

// ── Language context ──
const LangCtx = React.createContext({ lang: "es", setLang: () => {} });
function LangProvider({ children }) {
  const [lang, setLang] = React.useState("es");
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}
function useT() {
  const { lang } = React.useContext(LangCtx);
  return (key) => (I18N[key] && I18N[key][lang]) || key;
}

function LangSwitch() {
  const { lang, setLang } = React.useContext(LangCtx);
  return (
    <div className="agm-lang">
      {['es', 'pt', 'en'].map((l) => (
        <button key={l} onClick={() => setLang(l)} className={lang === l ? 'active' : ''}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ── Theme context (light default) ──
const ThemeCtx = React.createContext({ theme: "light", setTheme: () => {} });
function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState("light");
  return <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>{children}</ThemeCtx.Provider>;
}

function ThemeToggle() {
  const { theme, toggle } = React.useContext(ThemeCtx);
  return (
    <button className="agm-theme-toggle" onClick={toggle} title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>
      {theme === 'light' ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 8.2A4.5 4.5 0 1 1 5.8 2.5a4.5 4.5 0 0 0 5.7 5.7Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="2.6" />
          <path d="M7 .8v1.6M7 11.6v1.6M.8 7h1.6M11.6 7h1.6M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1" />
        </svg>
      )}
    </button>
  );
}

// Wrap any artboard root with the current theme via data-theme attr
function ThemedRoot({ children, ...rest }) {
  const { theme } = React.useContext(ThemeCtx);
  return <div data-theme={theme} {...rest}>{children}</div>;
}

Object.assign(window, { LangProvider, LangCtx, LangSwitch, useT, ThemeProvider, ThemeCtx, ThemeToggle, ThemedRoot });
