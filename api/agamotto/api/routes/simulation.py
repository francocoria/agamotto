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
    """Para cada slot del bracket, devuelve el CRUCE MODAL real (par de equipos que más
    veces se enfrentaron ahí) y el split de victoria DENTRO de ese cruce.

    Fallback: si no hay 'ko_match_triples' (simulación antigua), devuelve top winners
    (legacy mode), pero con disclaimer.
    """
    sim = _latest_baseline(s)
    if not sim:
        raise HTTPException(404, "No baseline simulation yet.")
    n_runs = sim.n_runs

    # Preferir triples (real matchups). Fallback a outcomes.
    triples = sim.aggregates.get("ko_match_triples", {})
    if triples:
        by_stage: dict[str, list[dict]] = {}
        for key, items in triples.items():
            if "__" not in key:
                continue
            stage, idx = key.split("__", 1)
            # items = [{home, away, winner, count}, ...]
            # Group by (home, away) pair regardless of winner
            pair_buckets: dict[tuple, dict] = {}
            for it in items:
                pair = (it["home"], it["away"])
                b = pair_buckets.setdefault(pair, {"total": 0, "wins": {}})
                b["total"] += it["count"]
                b["wins"][it["winner"]] = b["wins"].get(it["winner"], 0) + it["count"]
            # Pick modal pair (most-occurring matchup in this slot)
            sorted_pairs = sorted(pair_buckets.items(), key=lambda x: -x[1]["total"])
            if not sorted_pairs:
                continue
            (h, a), data = sorted_pairs[0]
            h_wins = data["wins"].get(h, 0)
            a_wins = data["wins"].get(a, 0)
            total = data["total"] or 1
            entry = {
                "slot_index": int(idx),
                "home_team": h,
                "away_team": a,
                "pair_occurrences": round(data["total"] / n_runs, 4),
                "p_home_wins_if_matchup": round(h_wins / total, 4),
                "p_away_wins_if_matchup": round(a_wins / total, 4),
                "alternative_pairs": [
                    {"home": p[0], "away": p[1], "p": round(d["total"] / n_runs, 4)}
                    for p, d in sorted_pairs[1:4]
                ],
            }
            by_stage.setdefault(stage, []).append(entry)
        for stage in by_stage:
            by_stage[stage].sort(key=lambda x: x["slot_index"])
        return by_stage

    # Legacy fallback (no triples in this simulation)
    ko = sim.aggregates.get("ko_match_outcomes", {})
    by_stage_legacy: dict[str, list[dict]] = {}
    for key, winners in ko.items():
        if "__" not in key:
            continue
        stage, idx = key.split("__", 1)
        top = sorted(winners.items(), key=lambda x: -x[1])
        if not top:
            continue
        top_team, top_count = top[0]
        by_stage_legacy.setdefault(stage, []).append({
            "slot_index": int(idx),
            "top_team": top_team,
            "p_top": round(top_count / n_runs, 4),
            "top_winners": [{"team": t, "p": round(c / n_runs, 4)} for t, c in top[:5]],
            "legacy": True,
        })
    for stage in by_stage_legacy:
        by_stage_legacy[stage].sort(key=lambda x: x["slot_index"])
    return by_stage_legacy


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
