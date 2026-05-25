from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.api.schemas import (
    FactorOut,
    MatchOut,
    MatchPredictionOut,
    PredictionInline,
    ScorelineOut,
    TeamOut,
    VenueOut,
)
from agamotto.db.models import Match, Prediction, Team, Venue

router = APIRouter(prefix="/matches", tags=["matches"])


def _team_out(t: Team | None) -> TeamOut | None:
    if t is None:
        return None
    return TeamOut(
        team_id=t.team_id, name=t.name, fifa_code=t.fifa_code,
        confederation=t.confederation, fifa_rank=t.fifa_rank,
        elo=t.elo, flag_emoji=t.flag_emoji,
    )


def _venue_out(v: Venue | None) -> VenueOut | None:
    if v is None:
        return None
    return VenueOut(
        venue_id=v.venue_id, name=v.name, city=v.city, country=v.country,
        altitude_m=v.altitude_m, capacity=v.capacity, surface=v.surface,
        roof=v.roof, timezone=v.timezone, latitude=v.latitude, longitude=v.longitude,
    )


def _pred_inline(p: Prediction | None) -> PredictionInline | None:
    if p is None:
        return None
    top_sc = (p.scoreline_matrix or {}).get("top", []) if isinstance(p.scoreline_matrix, dict) else []
    return PredictionInline(
        p_home=p.p_home or 0, p_draw=p.p_draw or 0, p_away=p.p_away or 0,
        lambda_home=p.lambda_home or 0, lambda_away=p.lambda_away or 0,
        p_over_2_5=p.p_over_2_5, p_btts=p.p_btts,
        top_scorelines=[ScorelineOut(**s_) for s_ in top_sc],
        top_factors=[FactorOut(**f) for f in (p.top_factors or [])],
    )


def _match_out(m: Match, pred: Prediction | None = None) -> MatchOut:
    return MatchOut(
        match_id=m.match_id, tournament_id=m.tournament_id, stage=m.stage,
        group_label=m.group_label, match_number=m.match_number, kickoff_utc=m.kickoff_utc,
        venue=_venue_out(m.venue), home_team=_team_out(m.home_team),
        away_team=_team_out(m.away_team), home_score=m.home_score, away_score=m.away_score,
        status=m.status, prediction=_pred_inline(pred),
    )


@router.get("", response_model=list[MatchOut])
def list_matches(
    s: Session = Depends(db),
    tournament: str = "WC2026",
    stage: str | None = None,
    group: str | None = None,
    team: str | None = None,
    limit: int = 200,
):
    q = select(Match).where(Match.tournament_id == tournament)
    if stage:
        q = q.where(Match.stage == stage)
    if group:
        q = q.where(Match.group_label == group)
    if team:
        q = q.where((Match.home_team_id == team) | (Match.away_team_id == team))
    q = q.order_by(Match.kickoff_utc).limit(limit)
    rows = s.execute(q).scalars().all()

    # Bulk-fetch latest prediction per match in one query
    match_ids = [m.match_id for m in rows]
    pred_rows = s.execute(
        select(Prediction)
        .where(Prediction.match_id.in_(match_ids))
        .order_by(Prediction.match_id, Prediction.created_at.desc())
    ).scalars().all()

    # Keep only latest per match_id
    pred_map: dict[str, Prediction] = {}
    for p in pred_rows:
        if p.match_id not in pred_map:
            pred_map[p.match_id] = p

    return [_match_out(m, pred_map.get(m.match_id)) for m in rows]


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: str, s: Session = Depends(db)):
    m = s.get(Match, match_id)
    if not m:
        raise HTTPException(404, "Match not found")
    p = s.execute(
        select(Prediction).where(Prediction.match_id == match_id)
        .order_by(Prediction.created_at.desc())
    ).scalars().first()
    return _match_out(m, p)


@router.get("/{match_id}/prediction", response_model=MatchPredictionOut)
def get_prediction(match_id: str, s: Session = Depends(db)):
    m = s.get(Match, match_id)
    if not m:
        raise HTTPException(404, "Match not found")
    p = s.execute(
        select(Prediction).where(Prediction.match_id == match_id)
        .order_by(Prediction.created_at.desc())
    ).scalars().first()
    if not p:
        raise HTTPException(404, "No prediction. Run `agamotto simulate` first.")
    top_sc = (p.scoreline_matrix or {}).get("top", []) if isinstance(p.scoreline_matrix, dict) else []
    return MatchPredictionOut(
        match_id=match_id,
        model_version=p.model_version_id,
        as_of=p.created_at,
        home_team=_team_out(m.home_team),
        away_team=_team_out(m.away_team),
        venue=_venue_out(m.venue),
        p_home=p.p_home or 0, p_draw=p.p_draw or 0, p_away=p.p_away or 0,
        lambda_home=p.lambda_home or 0, lambda_away=p.lambda_away or 0,
        p_over_2_5=p.p_over_2_5, p_btts=p.p_btts,
        top_scorelines=[ScorelineOut(**s_) for s_ in top_sc],
        top_factors=[FactorOut(**f) for f in (p.top_factors or [])],
    )


@router.get("/{match_id}/scoreline-matrix")
def get_scoreline_matrix(match_id: str, s: Session = Depends(db)):
    p = s.execute(
        select(Prediction).where(Prediction.match_id == match_id)
        .order_by(Prediction.created_at.desc())
    ).scalars().first()
    if not p:
        raise HTTPException(404, "No prediction.")
    return {"match_id": match_id, "top_scorelines": (p.scoreline_matrix or {}).get("top", [])}
