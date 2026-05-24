from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.api.schemas import TeamOut, TeamOutlookOut
from agamotto.db.models import Simulation, Team

router = APIRouter(prefix="/teams", tags=["teams"])


def _team_to_out(t: Team) -> TeamOut:
    return TeamOut(
        team_id=t.team_id, name=t.name, fifa_code=t.fifa_code,
        confederation=t.confederation, fifa_rank=t.fifa_rank,
        elo=t.elo, flag_emoji=t.flag_emoji,
    )


@router.get("", response_model=list[TeamOut])
def list_teams(s: Session = Depends(db)):
    rows = s.execute(select(Team).order_by(Team.elo.desc().nulls_last())).scalars().all()
    return [_team_to_out(t) for t in rows]


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: str, s: Session = Depends(db)):
    t = s.get(Team, team_id)
    if not t:
        raise HTTPException(404, "Team not found")
    return _team_to_out(t)


@router.get("/{team_id}/tournament-outlook", response_model=TeamOutlookOut)
def tournament_outlook(team_id: str, s: Session = Depends(db)):
    t = s.get(Team, team_id)
    if not t:
        raise HTTPException(404, "Team not found")
    sim = s.execute(
        select(Simulation)
        .where(Simulation.conditions.is_(None))
        .order_by(Simulation.created_at.desc())
    ).scalars().first()
    if not sim:
        raise HTTPException(404, "No baseline simulation found. Run `agamotto simulate` first.")
    outlook = sim.aggregates.get("team_outlook", {}).get(team_id)
    if not outlook:
        raise HTTPException(404, f"No outlook for team {team_id}")
    return TeamOutlookOut(team_id=team_id, name=t.name, **outlook)
