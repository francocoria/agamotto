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
        "ko_match_outcomes": sim.aggregates.get("ko_match_outcomes", {}),
    }


@router.get("/bracket")
def bracket(s: Session = Depends(db)):
    """Para cada slot del bracket eliminatorio, devuelve los top equipos que
    aparecieron ahí y la proba de avance, sobre la última simulación."""
    sim = _latest_baseline(s)
    if not sim:
        raise HTTPException(404, "No baseline simulation yet.")
    ko = sim.aggregates.get("ko_match_outcomes", {})
    n_runs = sim.n_runs
    # group by stage
    by_stage: dict[str, list[dict]] = {}
    for key, winners in ko.items():
        if "__" not in key:
            continue
        stage, idx = key.split("__", 1)
        # top 2 ganadores históricos en este slot
        top = sorted(winners.items(), key=lambda x: -x[1])
        if not top:
            continue
        top_team, top_count = top[0]
        entry = {
            "slot_index": int(idx),
            "top_team": top_team,
            "p_top": round(top_count / n_runs, 4),
            "top_winners": [{"team": t, "p": round(c / n_runs, 4)} for t, c in top[:5]],
        }
        by_stage.setdefault(stage, []).append(entry)
    for stage in by_stage:
        by_stage[stage].sort(key=lambda x: x["slot_index"])
    return by_stage


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
