"""Custom matchup predictor — predicts an arbitrary pair on the fly."""

from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.api.routes.matches import _team_out
from agamotto.api.schemas import FactorOut, MatchPredictionOut, ScorelineOut
from agamotto.db.models import Team
from agamotto.models import ensemble

router = APIRouter(prefix="/predict", tags=["predict"])


@lru_cache(maxsize=1)
def _ensemble():
    return ensemble.build()


@router.get("", response_model=MatchPredictionOut)
def predict(
    home: str = Query(..., description="team_id local (ej. ARG)"),
    away: str = Query(..., description="team_id visitante (ej. FRA)"),
    neutral: bool = Query(True, description="cancha neutral (default true para Mundial)"),
    s: Session = Depends(db),
):
    """Devuelve la predicción del ensemble para un partido arbitrario.

    No requiere que el partido exista en la base. Útil para 'qué pasaría si...'.
    """
    home_u = home.strip().upper()
    away_u = away.strip().upper()
    if home_u == away_u:
        raise HTTPException(400, "home y away no pueden ser iguales")

    home_team = s.get(Team, home_u)
    away_team = s.get(Team, away_u)
    if not home_team:
        raise HTTPException(404, f"Selección no encontrada: {home_u}")
    if not away_team:
        raise HTTPException(404, f"Selección no encontrada: {away_u}")

    ens = _ensemble()
    out = ens.predict(home_u, away_u, neutral=neutral)
    from datetime import datetime
    return MatchPredictionOut(
        match_id=f"CUSTOM_{home_u}_VS_{away_u}",
        model_version=out["model_version"],
        as_of=datetime.utcnow(),
        home_team=_team_out(home_team),
        away_team=_team_out(away_team),
        venue=None,
        p_home=out["p_home"], p_draw=out["p_draw"], p_away=out["p_away"],
        lambda_home=out["lambda_home"], lambda_away=out["lambda_away"],
        p_over_2_5=out["p_over_2_5"], p_btts=out["p_btts"],
        top_scorelines=[ScorelineOut(**sc) for sc in out["top_scorelines"]],
        top_factors=[FactorOut(**f) for f in out["top_factors"]],
    )
