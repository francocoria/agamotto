from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.db.models import Player

router = APIRouter(prefix="/players", tags=["players"])


@router.get("")
def list_players(
    s: Session = Depends(db),
    team: str | None = None,
    limit: int = 100,
):
    q = select(Player)
    if team:
        q = q.where(Player.nation == team)
    rows = s.execute(q.limit(limit)).scalars().all()
    return [
        {
            "player_id": p.player_id, "name": p.name, "position": p.position,
            "club": p.club, "league": p.league, "nation": p.nation,
            "market_value_eur": p.market_value_eur,
        }
        for p in rows
    ]


@router.get("/{player_id}")
def get_player(player_id: str, s: Session = Depends(db)):
    p = s.get(Player, player_id)
    if not p:
        raise HTTPException(404, "Player not found")
    return {
        "player_id": p.player_id, "name": p.name, "full_name": p.full_name,
        "dob": p.dob, "position": p.position, "foot": p.foot, "height_cm": p.height_cm,
        "nation": p.nation, "club": p.club, "league": p.league,
        "market_value_eur": p.market_value_eur,
    }


@router.get("/{player_id}/impact")
def get_impact(player_id: str, match_id: str | None = None, s: Session = Depends(db)):
    # Stub functional: integra con PlayerImpactModel cuando hay datos.
    from agamotto.models import player_impact
    try:
        pi = player_impact.load()
    except FileNotFoundError:
        raise HTTPException(404, "No player impact model trained.")
    rating = pi.rating(player_id)
    return {
        "player_id": player_id, "rating": rating,
        "delta_p_win_estimate": 0.0 if rating == 50.0 else round((rating - 50.0) / 200, 3),
        "note": "Bootstrap rating. Más preciso cuando se ingieren stats reales.",
    }
