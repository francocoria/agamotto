from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.api.schemas import CounterfactualInput
from agamotto.db.models import Simulation
from agamotto.multiverse.engine import run_counterfactual

router = APIRouter(prefix="/simulation", tags=["simulation"])


def _latest_baseline(s: Session) -> Simulation | None:
    return s.execute(
        select(Simulation).where(Simulation.conditions.is_(None))
        .order_by(Simulation.created_at.desc())
    ).scalars().first()


@router.get("/latest")
def latest(s: Session = Depends(db)):
    sim = _latest_baseline(s)
    if not sim:
        raise HTTPException(404, "No baseline simulation yet.")
    return {
        "simulation_id": sim.simulation_id,
        "tournament_id": sim.tournament_id,
        "model_version": sim.model_version_id,
        "n_runs": sim.n_runs,
        "created_at": sim.created_at,
        "champion_distribution": sim.aggregates.get("champion_distribution", []),
        "team_outlook": sim.aggregates.get("team_outlook", {}),
        "sampled_universes": sim.aggregates.get("sampled_universes", [])[:50],
    }


@router.post("/counterfactual")
def counterfactual(payload: CounterfactualInput = Body(...)):
    if not payload.conditions:
        raise HTTPException(400, "Empty conditions.")
    out = run_counterfactual(conditions=payload.conditions, n_runs=payload.n_runs, persist=False)
    return {
        "n_runs": out["n_runs"],
        "conditions": payload.conditions,
        "champion_distribution": out["champion_distribution"][:48],
        "team_outlook": out["team_outlook"],
        "sampled_universes": out["sampled_universes"][:20],
    }
