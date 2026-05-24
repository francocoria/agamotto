# Agamotto — Backend

Python 3.11+, FastAPI, SQLAlchemy, modelos en `agamotto/models/`, simulador en `agamotto/simulator/`.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS/Linux
pip install -e .[dev]
alembic upgrade head
```

## Comandos

```bash
agamotto --help

# Ingesta
agamotto ingest fifa-2026       # fixtures, sedes, equipos
agamotto ingest martj42         # histórico internacional
agamotto ingest openfootball    # mundiales pasados

# Entrenamiento (en orden)
agamotto train elo
agamotto train poisson
agamotto train dixon-coles
agamotto train player-impact
agamotto train ml-tabular
agamotto train ensemble
agamotto calibrate

# Predicciones + simulación
agamotto predict all-matches
agamotto simulate --runs 100000

# API
agamotto serve --port 8000
```

## Layout

```
agamotto/
├── core/         # config, db, ids, types, logging
├── ingestion/    # adapters por provider
├── features/     # feature engineering + store
├── models/       # elo, poisson, dixon_coles, ml, player_impact, ensemble, calibration
├── simulator/    # Monte Carlo
├── multiverse/   # conditional sampling (Eye of Agamotto)
├── api/          # FastAPI routes
└── cli/          # comandos typer
```
