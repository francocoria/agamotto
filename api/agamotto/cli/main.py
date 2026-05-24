"""Agamotto CLI — `agamotto <command>`."""

from __future__ import annotations

import json
from datetime import date

import typer
from rich import print as rprint
from rich.table import Table

from agamotto.core.logging import setup_logging

app = typer.Typer(help="Agamotto — plataforma predictiva multiverso del Mundial 2026.")
ingest_app = typer.Typer(help="Ingestar datos.")
train_app = typer.Typer(help="Entrenar modelos.")
app.add_typer(ingest_app, name="ingest")
app.add_typer(train_app, name="train")


# ------------------ ingest ------------------

@ingest_app.command("fifa-2026")
def ingest_fifa():
    """Sembrar equipos, sedes, grupos y fixtures del Mundial 2026."""
    setup_logging()
    from agamotto.ingestion.fifa_2026 import run
    n = run()
    rprint(f"[green]OK[/green] FIFA 2026 seed: {n} rows")


@ingest_app.command("martj42")
def ingest_martj42():
    """Descargar histórico internacional MartJ42 (CC0)."""
    setup_logging()
    from agamotto.ingestion.martj42 import run
    n = run()
    rprint(f"[green]OK[/green] MartJ42: {n} historical matches")


# ------------------ train ------------------

@train_app.command("elo")
def train_elo(min_date: str = typer.Option("2014-01-01", help="Solo partidos desde esta fecha.")):
    setup_logging()
    from agamotto.models import elo
    m = elo.train(min_date=date.fromisoformat(min_date))
    elo.save(m)
    elo.sync_team_elo(m)
    rprint(f"[green]OK[/green] Elo: {len(m.ratings)} teams")
    table = Table(title="Top 15 by Elo")
    table.add_column("Team"); table.add_column("Rating", justify="right")
    for t, r in sorted(m.ratings.items(), key=lambda x: -x[1])[:15]:
        table.add_row(t, f"{r:.1f}")
    rprint(table)


@train_app.command("poisson")
def train_poisson(min_date: str = typer.Option("2016-01-01")):
    setup_logging()
    from agamotto.models import poisson
    m = poisson.train(min_date=date.fromisoformat(min_date))
    poisson.save(m)
    rprint(f"[green]OK[/green] Poisson: {len(m.attack)} teams, home_adv={m.home_adv:.3f}")


@train_app.command("dixon-coles")
def train_dc(min_date: str = typer.Option("2020-01-01")):
    setup_logging()
    from agamotto.models import dixon_coles
    m = dixon_coles.train(min_date=date.fromisoformat(min_date))
    dixon_coles.save(m)
    rprint(f"[green]OK[/green] Dixon-Coles: rho={m.rho:.4f}")


@train_app.command("player-impact")
def train_pi():
    setup_logging()
    from agamotto.models import player_impact
    m = player_impact.train_from_market_values()
    player_impact.save(m)
    rprint(f"[green]OK[/green] Player Impact: {len(m.player_ratings)} players")


@train_app.command("ensemble")
def train_ensemble():
    setup_logging()
    from agamotto.models import ensemble
    e = ensemble.build()
    ensemble.save(e)
    rprint(f"[green]OK[/green] Ensemble: {e.version}")


@train_app.command("optimize")
def train_optimize(start_year: int = typer.Option(2022), end_year: int = typer.Option(2026)):
    """Entrena LightGBM stacker + optimiza pesos del ensemble por scipy. Reporta métricas."""
    setup_logging()
    from agamotto.models.optimize import run_optimize
    out = run_optimize(start_year=start_year, end_year=end_year)
    rprint("[green]OK[/green] Ensemble optimization complete")
    rprint(f"Optimal weights:  Elo={out['weights']['w_elo']:.3f}  "
           f"DC={out['weights']['w_dc']:.3f}  Stacker={out['weights']['w_stacker']:.3f}")
    rprint(f"Brier:    [cyan]{out['brier']:.4f}[/cyan]")
    rprint(f"Log loss: [cyan]{out['log_loss']:.4f}[/cyan]")
    table = Table(title="Comparativa de modelos")
    table.add_column("Modelo"); table.add_column("Brier", justify="right"); table.add_column("LogLoss", justify="right")
    for name, m in out["metrics_comparison"].items():
        table.add_row(name, f"{m['brier']:.4f}", f"{m['log_loss']:.4f}")
    rprint(table)


@train_app.command("validation")
def train_validation(start_year: int = typer.Option(2022, help="Año de inicio de validación.")):
    """Ejecuta backtesting walk-forward, calibra el ensemble y guarda métricas."""
    setup_logging()
    from agamotto.models import backtest
    results = backtest.run_backtest(start_year=start_year)
    rprint("[green]OK[/green] Calibration & Validation complete.")
    rprint(f"Brier score: [cyan]{results['brier']:.4f}[/cyan]")
    rprint(f"Log loss:    [cyan]{results['log_loss']:.4f}[/cyan]")


@train_app.command("all")
def train_all(skip_validation: bool = typer.Option(False, help="Saltear backtesting walk-forward.")):
    """Entrena todo en orden: elo → poisson → dixon-coles → player-impact → ensemble (+ validation)."""
    train_elo(min_date="2014-01-01")
    train_poisson(min_date="2016-01-01")
    train_dc(min_date="2020-01-01")
    train_pi()
    train_ensemble()
    if not skip_validation:
        try:
            train_validation(start_year=2022)
        except Exception as e:
            rprint(f"[yellow]WARN[/yellow] validation skipped: {e}")


# ------------------ simulate / predict / serve ------------------

@app.command("simulate")
def simulate(
    runs: int = typer.Option(100_000, help="Iteraciones Monte Carlo."),
    seed: int = typer.Option(42),
):
    """Corre el simulador Monte Carlo del torneo completo y persiste resultados."""
    setup_logging()
    import time
    from agamotto.simulator.tournament import run_simulation
    t0 = time.time()
    out = run_simulation(n_runs=runs, persist=True, seed=seed)
    dt = time.time() - t0
    rprint(f"[green]OK[/green] {runs} runs in {dt:.1f}s ({runs/dt:.0f} runs/s)")
    table = Table(title="Top 10 campeones")
    table.add_column("Team"); table.add_column("P(champion)", justify="right")
    for c in out["champion_distribution"][:10]:
        table.add_row(c["team"], f"{c['p']*100:5.2f}%")
    rprint(table)


@app.command("predict")
def predict(home: str = typer.Argument(...), away: str = typer.Argument(...)):
    """Predice un único partido one-off."""
    setup_logging()
    from agamotto.models import ensemble
    ens = ensemble.build()
    out = ens.predict(home, away, neutral=True)
    rprint({k: v for k, v in out.items() if k != "scoreline_matrix"})


@app.command("counterfactual")
def counterfactual(conditions_json: str, runs: int = 5000):
    """Corre un escenario contrafactual. JSON: lista de condiciones."""
    setup_logging()
    from agamotto.multiverse.engine import run_counterfactual
    conds = json.loads(conditions_json)
    out = run_counterfactual(conditions=conds, n_runs=runs)
    rprint({"top_champions": out["champion_distribution"][:10]})


@app.command("serve")
def serve(
    host: str = typer.Option("0.0.0.0"),
    port: int = typer.Option(8000),
    reload: bool = typer.Option(False),
):
    """Levanta la API FastAPI."""
    setup_logging()
    import uvicorn
    uvicorn.run("agamotto.api.main:app", host=host, port=port, reload=reload)


@app.command("status")
def status():
    """Resumen del estado del sistema."""
    setup_logging()
    from sqlalchemy import func, select
    from agamotto.core.db import get_session
    from agamotto.db.models import (
        HistoricalMatch, Match, ModelVersion, Prediction, Simulation, Team, Venue,
    )
    with get_session() as s:
        rows = {
            "teams": s.scalar(select(func.count()).select_from(Team)),
            "venues": s.scalar(select(func.count()).select_from(Venue)),
            "matches": s.scalar(select(func.count()).select_from(Match)),
            "historical_matches": s.scalar(select(func.count()).select_from(HistoricalMatch)),
            "models": s.scalar(select(func.count()).select_from(ModelVersion)),
            "predictions": s.scalar(select(func.count()).select_from(Prediction)),
            "simulations": s.scalar(select(func.count()).select_from(Simulation)),
        }
    rprint({"agamotto_status": rows})


if __name__ == "__main__":
    app()
