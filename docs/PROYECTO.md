# AGAMOTTO · Estado del proyecto

> **Plataforma predictiva multiverso del Mundial FIFA 2026.**
> *"No vemos un futuro. Los calculamos todos."*

Última actualización: refleja el commit `ab51918` (fix bracket modal matchups).

---

## 1. Arquitectura general

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Vercel (web)   │────▶│  Render (API)       │────▶│  Supabase (DB)   │
│  Next.js 14     │     │  FastAPI + Python   │     │  Postgres        │
│  agamotto-one   │     │  agamotto-i9ja      │     │  nciwpsmupophvk  │
└─────────────────┘     └─────────────────────┘     └──────────────────┘
        │                         │
        │  ⚡ Static cache         │  Cold-start ~30s en free tier
        ▼                         ▼
┌─────────────────┐     ┌─────────────────────┐
│ predictions.json│     │ MartJ42 + Wikipedia │
│ 1.596 pares     │     │ Scrapers locales    │
│ 1.2 MB · CDN    │     │ (CLI agamotto)      │
└─────────────────┘     └─────────────────────┘
```

**Flujo de datos**:

1. Datos crudos → ingestion adapters (`agamotto ingest ...`)
2. Datos → entrenamiento de modelos (`agamotto train ...`)
3. Modelos → simulación Monte Carlo del torneo (`agamotto simulate`)
4. Simulación → cache estático JSON + DB Supabase
5. Frontend → lee cache para `/comparar` (instantáneo), API para `/escenarios` y `/llave`

---

## 2. Stack tecnológico

### Backend (Python 3.11+)

| Categoría | Tecnología | Uso |
|---|---|---|
| Web framework | **FastAPI** 0.110+ | API REST con OpenAPI auto-generado |
| ORM | **SQLAlchemy 2.0** | Modelado de DB |
| Migrations | **Alembic** | Versionado de schema |
| Validación | **Pydantic 2.6+** | Schemas API request/response |
| Settings | **pydantic-settings** | Config por env vars |
| DB driver | **psycopg[binary]** | PostgreSQL (Supabase) |
| Data | **pandas 2.2** + **numpy** | Manipulación de datasets |
| ML — clásico | **scikit-learn** | PoissonRegressor, IsotonicRegression, KFold |
| ML — gradient boosting | **LightGBM 4.3+** | Stacker meta-modelo |
| Optimización | **scipy** | SLSQP para pesos óptimos del ensemble |
| Serialización | **joblib** | Guardado de modelos a disco |
| Scraping | **requests** + **beautifulsoup4** + **lxml** | Wikipedia squads |
| CLI | **typer 0.12** + **rich** | Comandos `agamotto ...` |
| Server | **uvicorn** | ASGI |

### Frontend (Next.js)

| Categoría | Tecnología | Uso |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR + Server Components |
| Lenguaje | **TypeScript 5.5** | Type safety end-to-end |
| UI | **React 18** | Componentes |
| Styling | **Tailwind 3.4** + CSS custom (`agm-*`) | Design system propio (light/dark) |
| Charts | **Recharts 2.13** | (no usado activamente; SVG inline) |
| Auth | **@supabase/ssr 0.5** + **@supabase/supabase-js** | Login/signup + middleware gating |
| Analytics | **@vercel/analytics 2.0** | Pageviews |
| Fonts | Saira Condensed, Bebas Neue, Inter, JetBrains Mono | (Google Fonts) |

### Infraestructura

| Servicio | Para | URL |
|---|---|---|
| **Vercel** | Frontend Next.js | `agamotto-one.vercel.app` |
| **Render** | API FastAPI (Dockerfile) | `agamotto-i9ja.onrender.com` |
| **Supabase** | Postgres + Auth | `nciwpsmupophvkzexjdt.supabase.co` |
| **GitHub** | Source + CI trigger | `github.com/francocoria/agamotto` |

---

## 3. Modelos predictivos

### Pipeline en capas

| # | Modelo | Estado | Entradas | Salidas |
|---|---|---|---|---|
| 0 | **Naive** | ✅ baseline | — | 1/3, 1/3, 1/3 |
| 1 | **Elo** (con decay e importancia por torneo) | ✅ entrenado | 49.257 partidos internacionales | rating por selección |
| 2 | **Poisson regression** | ✅ entrenado | features de equipo, ventaja localía | λ por equipo |
| 3 | **Dixon-Coles** | ✅ entrenado | output Poisson + ρ corrector | matriz scorelines |
| 4 | Bayesiano jerárquico | ⏳ post-MVP | — | — |
| 5 | **LightGBM Stacker** (3 bags) | ✅ entrenado | 21 features (probs base + contexto) | predicción meta |
| 6 | **Player Impact Model v2** | ✅ entrenado | caps/año, goles/cap, tier club, edad, posición | offset por equipo |
| 7 | **Ensemble lineal** (pesos SLSQP) | ✅ óptimo | Elo + DC + Stacker | probabilidad combinada |
| 8 | **Calibración isotónica** | ✅ ajustada | output ensemble | probabilidades honestas |

### Pesos óptimos del ensemble

Encontrados con `scipy.optimize.minimize` (SLSQP) sobre 4.421 partidos walk-forward 2022-2026:

```
Elo      → 0.425  (42.5%)
DC       → 0.382  (38.2%)
Stacker  → 0.193  (19.3%)
```

### Player Impact Rating · fórmula v2

```
rating = 50
       + caps/año × 12       (max +12)   ← normaliza edad
       + goles/cap × 9       (max +9)    ← solo FW/MF con ≥10 caps
       + (4 − club_tier) × 3 (max +9)    ← tier 1 elite, tier 4 otros
       − (edad − 27)² / 8    (max −10)   ← curva de edad
       + pos_bias            (max +2)    ← FW > MF > DF = GK
       + starter_bonus       (max +3)    ← si está en XI titular
```

Rango: 20–95. Median centrado a 50 a nivel equipo. `impact_alpha = 0.003` → max ±1.5% λ swing por team.

### Tabla de calidad de clubes

| Tier | Cantidad | Ejemplos | Impact |
|---|---|---|---|
| **1** (élite Champions) | 16 | Real Madrid, Barcelona, Bayern, City, PSG, Liverpool, Arsenal | +9 |
| **2** (top-5 ligas no élite) | ~70 | Newcastle, Aston Villa, Real Sociedad, Roma, Leverkusen, Marseille | +6 |
| **3** (otras top europeas + SA top + Saudi) | ~50 | Ajax, Benfica, Porto, Galatasaray, Boca, River, Al Hilal | +3 |
| **4** (default) | resto | clubes desconocidos | 0 |

---

## 4. Métricas de validación

**Walk-forward 2022-2026** (4.421 partidos, modelos reentrenados año a año):

| Modelo | Brier ↓ | LogLoss ↓ | Mejora vs Naive |
|---|---|---|---|
| Naive (1/3) | 0.667 | 1.099 | — |
| Elo | 0.525 | 0.898 | −21.3% Brier |
| Poisson | 0.530 | 0.901 | −20.5% |
| Dixon-Coles | 0.530 | 0.901 | −20.6% |
| Stacker (LGBM solo) | 0.556 | 0.958 | −16.6% |
| **Ensemble óptimo (no calibrado)** | **0.521** | **0.887** | −21.9% |
| **Ensemble calibrado (final)** | **0.515** | **0.874** | **−22.8%** |

Brier 0.515 es competitivo con literatura de fútbol internacional (rango típico 0.50–0.55 con solo datos de selecciones).

### Honestidad — cómo se mide

- **Brier**: distancia cuadrática entre probabilidad y outcome. Penaliza tanto sub como sobreconfianza.
- **LogLoss**: penaliza más severamente las predicciones confiadas y equivocadas.
- **Walk-forward**: para predecir año T solo se usa info < T. Sin shuffle, sin random split.
- **Calibración isotónica**: ajusta la salida del ensemble para que "70%" realmente ocurra ~70% del tiempo.

---

## 5. Datos cargados

### Históricos
| Dataset | Filas | Fuente | Ventana |
|---|---|---|---|
| **HistoricalMatch** | 49.257 | MartJ42 (CC0, GitHub) | 1872 → presente |

### Mundial 2026 (seed actual)
| Tabla | Filas | Notas |
|---|---|---|
| Tournament | 1 | WC2026 |
| Team | 48 | (+ ~9 con Wikipedia adicionales) = 57 |
| Venue | 16 | Sedes oficiales con altitud, capacidad, huso, césped |
| Match | 104 | Template generado (12 grupos × 6 + 32 knockout) |
| Squad | 48 | Status `official` |
| **SquadPlayer** | **1.617** | Scraping de Wikipedia EN |
| **Player** | **1.611** únicos | Reales con caps + goals + edad + club |

### Cache pre-computado
| Archivo | Tamaño | Contenido |
|---|---|---|
| `web/public/data/predictions.json` | 1.2 MB | 1.596 pares de equipos (todos los matchups, cancha neutral), top 20 scorelines c/u |

---

## 6. Rutas y endpoints

### Frontend (Next.js)

| Ruta | Auth | Datos | Dinámico |
|---|---|---|---|
| `/` | público | API + cache | force-dynamic |
| `/sobre` | público | static | static |
| `/login`, `/signup` | público | Supabase Auth | dynamic |
| `/comparar` | 🔒 | **cache JSON** (sin API) | dynamic |
| `/escenarios` | 🔒 | API (simulación) | dynamic |
| `/llave` | 🔒 | API (bracket modal) | dynamic |
| `/modelo` | 🔒 | API (calibration + baselines) | dynamic |
| `/pivotes` | 🔒 | API (pivot matches) | dynamic |
| `/jugadores` | 🔒 | API (1.611 players) | dynamic |
| `/matches` · `/matches/[id]` | 🔒 | API | dynamic |
| `/teams` · `/teams/[id]` | 🔒 | API | dynamic |
| `/venues` · `/venues/[id]` | 🔒 | API | dynamic |

### Backend (FastAPI)

| Endpoint | Descripción |
|---|---|
| `GET /` | Service info |
| `GET /matches` | Lista filtrable |
| `GET /matches/{id}/prediction` | 1X2, λ, scorelines, factores |
| `GET /teams` · `/teams/{id}` | Selecciones |
| `GET /teams/{id}/tournament-outlook` | P(fase), modal path |
| `GET /venues` · `/venues/{id}` | Estadios |
| `GET /players` · `/players/{id}/impact` | Jugadores |
| **`GET /predict?home=X&away=Y`** | Predicción on-the-fly (con cache ensemble en memoria) |
| `GET /simulation/latest` | Último Monte Carlo |
| **`GET /simulation/bracket`** | Cruces modales por slot del bracket |
| `POST /simulation/counterfactual` | Escenario condicionado |
| `GET /multiverse/champions` · `/pivot-matches` · `/universes` | Multiverso |
| `GET /validation/calibration` · `/baselines` · `/models` | Académico |

---

## 7. Comandos CLI principales

```bash
# Ingest de datos
agamotto ingest fifa-2026          # seed teams/venues/fixtures
agamotto ingest martj42            # histórico 49k partidos (~5s download)
agamotto ingest wikipedia-squads   # scrape 48 squads (~80s, 1 req/s)
agamotto ingest squads-csv         # carga CSV en DB

# Entrenamiento
agamotto train elo                 # entrena Elo sobre histórico
agamotto train poisson             # PoissonRegressor con decay
agamotto train dixon-coles         # ajusta rho corrector
agamotto train player-impact       # ratings desde squads CSV
agamotto train ensemble            # compone ensemble
agamotto train optimize            # optimiza pesos + stacker (walk-forward)
agamotto train all                 # todo en orden

# Cache + simulación
agamotto cache-predictions         # genera predictions.json (1.596 pares)
agamotto simulate --runs 100000    # Monte Carlo del torneo

# Servidor
agamotto serve --port 8000         # FastAPI
agamotto predict ARG FRA           # predice un partido one-off
agamotto status                    # estado de la DB

# Validación
agamotto train validation          # backtest walk-forward 2022-2026
```

---

## 8. Variables de entorno

### Vercel (frontend)
```bash
NEXT_PUBLIC_API_BASE=https://agamotto-i9ja.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://nciwpsmupophvkzexjdt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...   # JWT con role 'anon'
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...        # JWT con role 'service_role' (server-only)
```

### Render (backend)
```bash
AGAMOTTO_DATABASE_URL=postgresql+psycopg2://postgres.nciwpsmupophvkzexjdt:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
AGAMOTTO_API_CORS_ORIGINS=["https://agamotto-one.vercel.app","http://localhost:3000"]
PYTHONIOENCODING=utf-8
# opcionales: AGAMOTTO_SIMULATION_DEFAULT_RUNS, _SEED, _MODEL_SET_VERSION, _OPEN_METEO_BASE
```

---

## 9. Lo que YA está hecho ✅

### Modelos
- ✅ Elo entrenado en 49k partidos internacionales reales
- ✅ Poisson + Dixon-Coles entrenados
- ✅ LightGBM stacker (3 bags, 21 features con contexto)
- ✅ Ensemble óptimo vía scipy SLSQP
- ✅ Calibración isotónica
- ✅ Walk-forward backtesting 2022-2026 (4.421 partidos)
- ✅ Player Impact con caps + goles + tier club + curva edad
- ✅ Simulador Monte Carlo 100k iteraciones (~10 min)
- ✅ Motor de contrafactuales (fijar marcador/ganador, simular clima)
- ✅ Bracket con cruces modales reales

### Frontend
- ✅ 14 rutas funcionales (home, comparar, escenarios, llave, modelo, pivotes, jugadores, matches, teams, venues, login, signup, sobre, 404)
- ✅ Design system propio (light + dark, agm-* classes)
- ✅ Mobile responsive (hamburger menu)
- ✅ Skeletons en cada ruta
- ✅ Transición page-in (blur + fade)
- ✅ Favicon Ojo de Agamotto + logo animado (iris pulsing + ring rotating)
- ✅ Auth con Supabase (login email/password + Google OAuth listo)
- ✅ Auth gating con middleware (rutas protegidas)
- ✅ Comparador instantáneo desde cache estático (cero llamadas API)
- ✅ Vista de distribución de marcadores agrupada por outcome
- ✅ Wizard explicativo en /escenarios

### Datos
- ✅ 49.257 partidos históricos MartJ42
- ✅ 1.611 jugadores reales con caps/goles/edad/club (Wikipedia)
- ✅ 48 sedes con altitud/capacidad/huso
- ✅ 104 fixtures del torneo (template)
- ✅ 1.596 predicciones pre-computadas como JSON estático

### Infraestructura
- ✅ Vercel deploy (auto on push)
- ✅ Render deploy (Dockerfile)
- ✅ Supabase Postgres conectado
- ✅ CORS configurado para producción
- ✅ Vercel Analytics
- ✅ CI: build passes con force-dynamic + timeouts

---

## 10. Lo que FALTA ⏳

### Crítico (bloquea producción "lista")
- ⏳ **Re-simular en Render** después de redeploy para que `/llave` muestre cruces modales con datos frescos (actualmente bracket muestra `⚠ datos legacy` hasta que se corra `agamotto simulate` allá)
- ⏳ **Cron de redeploy** del backend cuando hay nuevos modelos
- ⏳ Configurar OAuth providers (Google, Apple) en Supabase Dashboard si se quieren usar

### Mejoras de modelo (techo de accuracy)
- ⏳ **Datos de provider real**: Statorium (USD 499 one-time) o API-Football (USD 19/mes) para lineups oficiales, lesiones, eventos en vivo
- ⏳ **xG histórico**: StatsBomb Open Data (free, cobertura parcial) → mejor que goles directos
- ⏳ Odds del mercado como benchmark
- ⏳ Bayesiano jerárquico (smoothing por confederación)
- ⏳ Re-scraping automatizado de Wikipedia (cron semanal)

### UX / Polish
- ⏳ **Sparklines** de forma reciente en la tabla de campeones del home
- ⏳ **i18n real** ES/PT/EN (el switcher en el header es decorativo, no traduce)
- ⏳ Mobile pixel-perfect contra los mocks del PDF
- ⏳ Más visualizaciones tipo "Eye of Agamotto" (animaciones de líneas de tiempo)
- ⏳ Profile page del usuario logueado
- ⏳ Guardar escenarios favoritos por usuario en Supabase
- ⏳ Compartir resultado de `/comparar` por URL

### Testing
- ⏳ **Tests E2E con Playwright** (login flow, comparador, escenarios)
- ⏳ Smoke tests del API en CI
- ⏳ Test de regresión: que las métricas Brier no empeoren entre commits

### Operación
- ⏳ Migrar SQLite local → Supabase como fuente única
- ⏳ GitHub Action para regenerar `predictions.json` cuando cambia el modelo
- ⏳ Monitoring (Sentry frontend + backend)
- ⏳ Alertas si Brier walk-forward cambia >5% entre versiones

### Académico (para defender la tesis)
- ⏳ Documentar metodología completa con citas a literatura
- ⏳ Ablation study: cuánto aporta cada feature al Brier
- ⏳ Sensitivity analysis: variar pesos del ensemble y reportar
- ⏳ Comparación contra odds del mercado en partidos pasados

---

## 11. Arquitectura de archivos

```
agamotto/
├── api/                                # Backend
│   ├── agamotto/
│   │   ├── core/                       # config, db, logging, ids, enums
│   │   ├── db/models.py                # SQLAlchemy ORM
│   │   ├── ingestion/                  # adapters
│   │   │   ├── base.py
│   │   │   ├── martj42.py              # 49k matches CC0
│   │   │   ├── wikipedia_squads.py     # scraping Wikipedia
│   │   │   ├── squads_csv.py           # CSV → DB
│   │   │   ├── fifa_2026.py            # seed teams/venues/fixtures
│   │   │   └── seed/                   # data sintética inicial
│   │   ├── models/                     # ML
│   │   │   ├── elo.py
│   │   │   ├── poisson.py
│   │   │   ├── dixon_coles.py
│   │   │   ├── stacker.py              # LightGBM meta
│   │   │   ├── features.py             # context features (form, h2h, rest)
│   │   │   ├── player_impact.py        # con club_tiers
│   │   │   ├── club_tiers.py           # tabla curada ~150 clubes
│   │   │   ├── ensemble.py             # mixing
│   │   │   ├── calibration.py          # isotonic
│   │   │   ├── optimize.py             # SLSQP pesos óptimos
│   │   │   ├── backtest.py             # walk-forward 2022-2026
│   │   │   └── cache_predictions.py    # → web/public/data/
│   │   ├── simulator/
│   │   │   ├── tournament.py           # Monte Carlo + ko_match_triples
│   │   │   └── bracket.py              # reglas del bracket 48 equipos
│   │   ├── multiverse/engine.py        # contrafactuales encadenados
│   │   ├── api/                        # FastAPI routes
│   │   │   ├── main.py
│   │   │   ├── routes/                 # matches, teams, predict, simulation, etc.
│   │   │   └── schemas.py
│   │   └── cli/main.py                 # typer commands
│   ├── tests/
│   ├── migrations/                     # Alembic
│   ├── Dockerfile
│   ├── render.yaml
│   └── pyproject.toml
│
├── web/                                # Frontend
│   ├── app/                            # App Router
│   │   ├── page.tsx                    # home
│   │   ├── layout.tsx                  # shell + ThemeProvider + Analytics
│   │   ├── globals.css                 # design system (agm-*)
│   │   ├── icon.svg + apple-icon.svg   # favicon ojo agamotto
│   │   ├── loading.tsx + not-found.tsx
│   │   ├── auth/                       # Supabase callback + signout
│   │   ├── comparar/, escenarios/, llave/, modelo/, ...
│   ├── components/
│   │   ├── ThemeProvider.tsx + ThemeToggle
│   │   ├── Logo.tsx                    # iris pulsing
│   │   ├── MobileNav.tsx               # hamburger
│   │   ├── CustomPredictor.tsx         # /comparar (usa cache)
│   │   ├── CounterfactualPanel.tsx     # /escenarios (3-col)
│   │   ├── BracketView.tsx             # /llave (cruces modales)
│   │   ├── ScorelineDistribution.tsx   # nueva vista por outcome
│   │   ├── ChampionsTable.tsx          # /home (con outlook)
│   │   ├── PageSkeleton.tsx            # shimmer
│   │   ├── ApiStatusBanner.tsx
│   │   ├── LoginForm.tsx + SignupForm.tsx
│   │   ├── UserMenu.tsx
│   │   ├── MatchCard.tsx + TeamBadge.tsx + ...
│   ├── lib/
│   │   ├── api.ts                      # API client con timeout 4s
│   │   ├── predictions-cache.ts        # carga /data/predictions.json
│   │   └── supabase/                   # browser + server clients
│   ├── middleware.ts                   # auth gating
│   ├── public/data/predictions.json    # 1.2 MB cache
│   └── package.json
│
├── data/                               # gitignored excepto cache
│   ├── raw/                            # CSVs descargados
│   └── processed/                      # modelos .joblib
│
├── docs/
│   ├── PROYECTO.md                     # ← este archivo
│   ├── DEPLOY.md                       # pasos de deploy
│   └── Agamotto_Plan_Integral.md       # plan original
│
└── README.md                           # quickstart
```

---

## 12. Próximo paso recomendado

Si tuviera que ordenar prioridades:

1. **🔥 Render redeploy + simulate** → para que `/llave` muestre cruces reales (10 min de trabajo tuyo)
2. **🎨 Sparklines en home** → 30 min, alto impacto visual (yo lo hago)
3. **🌐 i18n real** → 1-2 h (yo lo hago)
4. **🧪 Tests E2E** → 1 h (yo lo hago)
5. **📊 Provider real** → cuando tengas presupuesto USD 19+/mes
6. **🤖 Cron de auto-update** → cuando estés en producción real

---

## 13. Decisiones de diseño relevantes

- **Cache estático vs API live**: optamos por pre-computar 1.596 predicciones porque (a) son finitos, (b) eliminan el cold-start de Render free tier, (c) zero llamadas API para el caso de uso más común (`/comparar`).
- **force-dynamic en todas las páginas con fetch**: evita timeout de build en Vercel cuando Render duerme. Sacrifica algo de performance al primer hit pero gana robustez.
- **impact_alpha conservador (0.003)**: el Elo tiene 49k partidos de señal real, el player rating tiene sesgos por datos sintéticos/Wikipedia. No queremos que sobreajuste contra Elo.
- **Modal matchups en bracket**: no top winners, porque la UI los muestra como cruces y son confusos. El cruce modal es lo que el usuario espera ver.
- **Auth gating con redirect**: para empujar registro y poder crecer base de usuarios (vs. todo público).
- **Walk-forward strict**: nunca usar info post-partido para predecir. Defendible académicamente.

---

**Mantenedor**: [@francocoria](https://github.com/francocoria)
**Repositorio**: https://github.com/francocoria/agamotto
**Deploy**: https://agamotto-one.vercel.app
**Licencia**: Uso académico. Sin recomendación de apuestas.
