"""Extended stats analysis endpoint — devuelve estadísticas avanzadas históricas
entre dos selecciones (forma, tiros, corners, posesión, goles tempranos, head-to-head).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from functools import lru_cache
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.db.models import HistoricalMatch, Team

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _rolling_avg(values: list, n: int) -> float | None:
    if not values:
        return None
    tail = values[-n:]
    return round(float(np.mean(tail)), 3)


def _get_team_stats(matches: list[dict], team: str, n: int = 10) -> dict:
    """Calcula promedios históricos de stats para un equipo dado los últimos N partidos."""
    gf, ga, possession, shots, sot, corners, early_goals, fouls, yellows, reds, pts = \
        [], [], [], [], [], [], [], [], [], [], []

    for m in matches[-n:]:
        is_home = m["home"] == team
        side = "home" if is_home else "away"
        opp_side = "away" if is_home else "home"

        team_gf = m["home_score"] if is_home else m["away_score"]
        team_ga = m["away_score"] if is_home else m["home_score"]

        gf.append(team_gf)
        ga.append(team_ga)

        pt = 3 if team_gf > team_ga else 1 if team_gf == team_ga else 0
        pts.append(pt)

        s = m.get("stats")
        if s and side in s:
            st = s[side]
            possession.append(st.get("possession", 0.5))
            shots.append(st.get("shots", 0))
            sot.append(st.get("shots_on_target", 0))
            corners.append(st.get("corners", 0))
            early_goals.append(st.get("early_goals_10m", 0))
            fouls.append(st.get("fouls", 0))
            yellows.append(st.get("yellow_cards", 0))
            reds.append(st.get("red_cards", 0))

    return {
        "form_pts": pts,
        "form_pct": round(sum(pts) / (3 * len(pts)), 3) if pts else None,
        "gf_avg": _rolling_avg(gf, n),
        "ga_avg": _rolling_avg(ga, n),
        "gd_avg": round((sum(gf) - sum(ga)) / max(len(gf), 1), 3),
        "possession_avg": _rolling_avg(possession, n),
        "shots_avg": _rolling_avg(shots, n),
        "sot_avg": _rolling_avg(sot, n),
        "corners_avg": _rolling_avg(corners, n),
        "early_goals_avg": _rolling_avg(early_goals, n),
        "fouls_avg": _rolling_avg(fouls, n),
        "yellows_avg": _rolling_avg(yellows, n),
        "reds_avg": _rolling_avg(reds, n),
        "shot_efficiency": round(
            sum(sot) / max(sum(shots), 1), 3
        ) if shots else None,
        "conversion_rate": round(
            sum(gf) / max(sum(sot), 1), 3
        ) if sot else None,
        "matches_analyzed": len(matches[-n:]),
    }


@router.get("")
def analyze_matchup(
    home: str = Query(..., description="team_id local (ej. ARG)"),
    away: str = Query(..., description="team_id visitante (ej. FRA)"),
    n: int = Query(10, ge=3, le=30, description="Últimos N partidos a analizar"),
    s: Session = Depends(db),
):
    """Análisis estadístico avanzado de un enfrentamiento hipotético.

    Retorna estadísticas de remates, tiros al arco, corners, posesión,
    goles tempranos (< 10 min), disciplina y head-to-head histórico.
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

    # Cargar histórico relevante
    rows = s.execute(
        select(
            HistoricalMatch.match_date,
            HistoricalMatch.home_team,
            HistoricalMatch.away_team,
            HistoricalMatch.home_score,
            HistoricalMatch.away_score,
            HistoricalMatch.tournament,
            HistoricalMatch.neutral,
            HistoricalMatch.stats,
        ).where(
            ((HistoricalMatch.home_team == home_u) | (HistoricalMatch.away_team == home_u) |
             (HistoricalMatch.home_team == away_u) | (HistoricalMatch.away_team == away_u))
        ).order_by(HistoricalMatch.match_date)
    ).all()

    all_matches = [
        {
            "date": str(r.match_date),
            "home": r.home_team,
            "away": r.away_team,
            "home_score": r.home_score,
            "away_score": r.away_score,
            "tournament": r.tournament,
            "neutral": r.neutral,
            "stats": r.stats,
        }
        for r in rows
    ]

    # Separar por equipo
    home_matches = [m for m in all_matches if m["home"] == home_u or m["away"] == home_u]
    away_matches = [m for m in all_matches if m["home"] == away_u or m["away"] == away_u]

    # H2H
    h2h_matches = [
        m for m in all_matches
        if (m["home"] == home_u and m["away"] == away_u) or
           (m["home"] == away_u and m["away"] == home_u)
    ]
    h2h_home_wins = sum(
        1 for m in h2h_matches
        if (m["home"] == home_u and m["home_score"] > m["away_score"]) or
           (m["away"] == home_u and m["away_score"] > m["home_score"])
    )
    h2h_away_wins = sum(
        1 for m in h2h_matches
        if (m["home"] == away_u and m["home_score"] > m["away_score"]) or
           (m["away"] == away_u and m["away_score"] > m["home_score"])
    )
    h2h_draws = len(h2h_matches) - h2h_home_wins - h2h_away_wins

    # Stats por equipo
    home_stats = _get_team_stats(home_matches, home_u, n)
    away_stats = _get_team_stats(away_matches, away_u, n)

    # Recientes para form visual (últimos 5)
    def recent_form_results(matches: list[dict], team: str, count: int = 5) -> list[str]:
        results = []
        for m in matches[-count:]:
            is_home = m["home"] == team
            gf = m["home_score"] if is_home else m["away_score"]
            ga = m["away_score"] if is_home else m["home_score"]
            if gf > ga:
                results.append("W")
            elif gf == ga:
                results.append("D")
            else:
                results.append("L")
        return results

    def recent_matches_detail(matches: list[dict], team: str, count: int = 5) -> list[dict]:
        out = []
        for m in matches[-count:]:
            is_home = m["home"] == team
            gf = m["home_score"] if is_home else m["away_score"]
            ga = m["away_score"] if is_home else m["home_score"]
            opp = m["away"] if is_home else m["home"]
            result = "W" if gf > ga else "D" if gf == ga else "L"
            out.append({
                "date": m["date"],
                "opponent": opp,
                "score": f"{gf}–{ga}",
                "result": result,
                "tournament": m["tournament"],
                "is_home": is_home,
            })
        return out

    return {
        "home": {
            "team_id": home_u,
            "name": home_team.name,
            "flag": home_team.flag_emoji,
            "elo": home_team.elo,
            "fifa_rank": home_team.fifa_rank,
            "confederation": home_team.confederation,
            "recent_form": recent_form_results(home_matches, home_u),
            "recent_matches": recent_matches_detail(home_matches, home_u),
            "stats": home_stats,
        },
        "away": {
            "team_id": away_u,
            "name": away_team.name,
            "flag": away_team.flag_emoji,
            "elo": away_team.elo,
            "fifa_rank": away_team.fifa_rank,
            "confederation": away_team.confederation,
            "recent_form": recent_form_results(away_matches, away_u),
            "recent_matches": recent_matches_detail(away_matches, away_u),
            "stats": away_stats,
        },
        "h2h": {
            "total_matches": len(h2h_matches),
            "home_wins": h2h_home_wins,
            "away_wins": h2h_away_wins,
            "draws": h2h_draws,
            "recent": [
                {
                    "date": m["date"],
                    "home": m["home"],
                    "away": m["away"],
                    "score": f"{m['home_score']}–{m['away_score']}",
                    "tournament": m["tournament"],
                }
                for m in h2h_matches[-8:]
            ],
        },
        "n_matches": n,
    }
