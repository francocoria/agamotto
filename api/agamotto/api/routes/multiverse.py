from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.db.models import Match, Simulation, Team

router = APIRouter(prefix="/multiverse", tags=["multiverse"])


def _latest_sim(s: Session) -> Simulation | None:
    return s.execute(
        select(Simulation).where(Simulation.conditions.is_(None))
        .order_by(Simulation.created_at.desc())
    ).scalars().first()


@router.get("/champions")
def champions(s: Session = Depends(db)):
    sim = _latest_sim(s)
    if not sim:
        raise HTTPException(404, "No baseline simulation.")
    dist = sim.aggregates.get("champion_distribution", [])
    # Enriquecer con metadatos del equipo
    team_meta = {t.team_id: {"name": t.name, "flag": t.flag_emoji, "confederation": t.confederation}
                 for t in s.execute(select(Team)).scalars().all()}
    return [
        {**c, **team_meta.get(c["team"], {})} for c in dist
    ]


@router.get("/pivot-matches")
def pivot_matches(s: Session = Depends(db)):
    """Partidos pivote: estimación simple por variabilidad de p_home en la matriz."""
    sim = _latest_sim(s)
    if not sim:
        raise HTTPException(404, "No baseline simulation.")
    # Aproximación: pivote = partidos con mayor entropía 1X2 (más cerca de 33/33/33)
    from agamotto.db.models import Prediction
    preds = s.execute(select(Prediction)).scalars().all()
    rows = []
    import math
    for p in preds:
        ph = p.p_home or 0
        pd_ = p.p_draw or 0
        pa = p.p_away or 0
        eps = 1e-9
        H = -sum(x * math.log(x + eps) for x in [ph, pd_, pa])
        m = s.get(Match, p.match_id)
        rows.append({
            "match_id": p.match_id,
            "home_team_id": m.home_team_id if m else None,
            "away_team_id": m.away_team_id if m else None,
            "stage": m.stage if m else None,
            "impact_score": round(H, 4),
        })
    rows.sort(key=lambda x: -x["impact_score"])
    return rows[:30]


@router.get("/universes")
def universes(s: Session = Depends(db), limit: int = 50):
    sim = _latest_sim(s)
    if not sim:
        raise HTTPException(404, "No baseline simulation.")
    return sim.aggregates.get("sampled_universes", [])[:limit]
