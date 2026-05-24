# AGAMOTTO

**Plataforma predictiva multiverso del Mundial FIFA 2026.**

> *"No vemos un futuro. Los calculamos todos."*

Predicción probabilística calibrada de los 104 partidos, los 48 planteles y miles de millones de líneas de tiempo posibles. App web interactiva donde podés fijar resultados, cambiar variables y recorrer el multiverso del torneo.

📄 [Plan completo](docs/Agamotto_Plan_Integral.md) · [Guía de deploy](docs/DEPLOY.md)

---

## Estructura

```
agamotto/
├── api/              # Backend Python (FastAPI + modelos + simulador)
│   ├── agamotto/     # paquete principal
│   │   ├── core/, ingestion/, models/, simulator/, multiverse/, api/, cli/
│   ├── migrations/   # Alembic
│   ├── tests/
│   ├── Dockerfile
│   └── pyproject.toml
├── web/              # Frontend Next.js + React + TypeScript
│   ├── app/          # App Router routes
│   ├── components/
│   └── lib/
├── data/             # Datos locales (gitignored)
├── docs/             # Plan + DEPLOY
├── infra/            # docker-compose
└── .env.example      # template de env vars
```

---

## Quickstart local

### Backend

```bash
cd api
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -e .[dev]

# SQLite por defecto (cero setup)
alembic upgrade head

agamotto ingest fifa-2026       # seed: 48 equipos, 16 sedes, 104 fixtures
agamotto ingest martj42         # 49k partidos internacionales históricos

agamotto train elo
agamotto train poisson
agamotto train dixon-coles
agamotto train player-impact
agamotto train ensemble

agamotto simulate --runs 100000
agamotto serve --port 8000
```

### Frontend

```bash
cd web
npm install
npm run dev   # http://localhost:3000
```

---

## Routes

| Ruta | Descripción |
|---|---|
| `/` | Landing + ranking de campeones + próximos partidos |
| `/escenarios` | Simulador contrafactual (Ojo de Agamotto): condiciones encadenadas, delta vs baseline, universos muestreados |
| `/llave` | Bracket eliminatorio multiverso |
| `/modelo` | Calibración, Brier, Log Loss, modelos registrados |
| `/pivotes` | Partidos pivote ordenados por impacto sistémico |
| `/jugadores` | Player Impact Model + contrafactuales por jugador |
| `/matches` · `/matches/[id]` | Catálogo y detalle de partido |
| `/teams` · `/teams/[id]` | Selecciones y outlook |
| `/venues` · `/venues/[id]` | Estadios |
| `/login` · `/signup` | Auth |

---

## API endpoints (FastAPI)

| Endpoint | Descripción |
|---|---|
| `GET /matches` | Lista filtrable |
| `GET /matches/{id}/prediction` | 1X2, λ, scorelines, factores |
| `GET /matches/{id}/scoreline-matrix` | Matriz de marcadores |
| `GET /teams` · `/teams/{id}` | Equipos |
| `GET /teams/{id}/tournament-outlook` | p_round_X, p_champion, ruta modal |
| `GET /venues` · `/venues/{id}` | Sedes |
| `GET /players` · `/players/{id}/impact` | Jugadores |
| `GET /simulation/latest` | Último Monte Carlo |
| `POST /simulation/counterfactual` | Escenario condicionado |
| `GET /multiverse/champions` · `/pivot-matches` · `/universes` | Multiverso |
| `GET /validation/calibration` · `/models` · `/baselines` | Académico |

---

## Modelos

| Capa | Estado |
|---|---|
| 0 — Naïve (ranking + localía) | ✅ baseline |
| 1 — Elo propio (decay + importancia) | ✅ entrenado en 49k partidos |
| 2 — Poisson (sklearn PoissonRegressor) | ✅ |
| 3 — Dixon-Coles (corrección scorelines bajos) | ✅ |
| 4 — Bayesiano jerárquico | ⏳ post-MVP |
| 5 — ML tabular (LightGBM) | ⏳ pendiente features avanzadas |
| 6 — Player Impact + contrafactuales | ✅ esquema |
| 7 — Ensemble | ✅ |
| 8 — Calibración isotónica | ✅ esquema |

---

## Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, pandas, scikit-learn, LightGBM, scipy.
- **DB dev**: SQLite. **DB prod**: Supabase Postgres.
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + design system custom (Saira Condensed + Bebas Neue + Inter + JetBrains Mono).
- **Deploy**: Vercel (web) + Render/Railway (api) + Supabase (db).

---

## Licencia

Uso académico. Sin recomendación de apuestas.
