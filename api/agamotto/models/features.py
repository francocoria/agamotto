"""Feature engineering — calcula features contextuales por partido sobre el historial.

Todo respeta lock temporal: para un partido con fecha T, solo se usan partidos < T.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class TeamState:
    """Estado acumulado de un equipo hasta una fecha de corte."""
    matches_played: int = 0
    last_match_date: date | None = None
    # Form: lista de "points" (3=W, 1=D, 0=L) ordenada cronológicamente, oldest→newest
    recent_pts: list[int] | None = None
    # Goles favor/contra rolling (últimos 5 internacionales)
    recent_gf: list[int] | None = None
    recent_ga: list[int] | None = None

    def __post_init__(self):
        if self.recent_pts is None: self.recent_pts = []
        if self.recent_gf is None: self.recent_gf = []
        if self.recent_ga is None: self.recent_ga = []

    def update(self, gf: int, ga: int, match_date: date):
        pts = 3 if gf > ga else 1 if gf == ga else 0
        self.recent_pts.append(pts)
        self.recent_gf.append(gf)
        self.recent_ga.append(ga)
        self.matches_played += 1
        self.last_match_date = match_date
        # Mantener solo últimos 10 para que no crezca infinito
        if len(self.recent_pts) > 10:
            self.recent_pts.pop(0); self.recent_gf.pop(0); self.recent_ga.pop(0)

    def form_pct(self, n: int = 5) -> float:
        """Porcentaje de puntos en los últimos n partidos. 1.0 = todos ganados."""
        if not self.recent_pts:
            return 0.5  # prior: neutral
        tail = self.recent_pts[-n:]
        return sum(tail) / (3 * len(tail))

    def goal_diff_avg(self, n: int = 5) -> float:
        if not self.recent_gf:
            return 0.0
        gf, ga = self.recent_gf[-n:], self.recent_ga[-n:]
        return float(np.mean([f - a for f, a in zip(gf, ga)]))

    def days_since_last(self, today: date) -> int:
        if self.last_match_date is None:
            return 365  # prior: largo
        return (today - self.last_match_date).days


@dataclass
class H2HState:
    """Historial cara a cara entre dos equipos."""
    home_wins: int = 0
    away_wins: int = 0
    draws: int = 0

    def update(self, home_gf: int, away_gf: int):
        if home_gf > away_gf: self.home_wins += 1
        elif home_gf < away_gf: self.away_wins += 1
        else: self.draws += 1

    def home_win_pct(self) -> float:
        total = self.home_wins + self.away_wins + self.draws
        return self.home_wins / total if total > 0 else 0.5


def build_state_index(df: pd.DataFrame) -> tuple[dict[str, TeamState], dict[tuple[str, str], H2HState]]:
    """Walk the entire df chronologically, building per-team state and h2h state.
    Returns the state snapshots so they can be re-built incrementally during walk-forward.
    """
    team_state: dict[str, TeamState] = defaultdict(TeamState)
    h2h_state: dict[tuple[str, str], H2HState] = defaultdict(H2HState)
    for _, r in df.iterrows():
        team_state[r["home"]].update(int(r["hs"]), int(r["as_"]), r["date"])
        team_state[r["away"]].update(int(r["as_"]), int(r["hs"]), r["date"])
        key = tuple(sorted([r["home"], r["away"]]))
        h2h_state[key].update(int(r["hs"]) if r["home"] == key[0] else int(r["as_"]),
                              int(r["as_"]) if r["home"] == key[0] else int(r["hs"]))
    return team_state, h2h_state


def compute_match_features(
    home: str, away: str, match_date: date,
    team_state: dict[str, TeamState], h2h_state: dict[tuple[str, str], H2HState],
) -> dict[str, float]:
    """Devuelve las features contextuales para un partido a predecir.
    `team_state` y `h2h_state` deben representar el estado HASTA el día anterior al partido.
    """
    sh = team_state.get(home, TeamState())
    sa = team_state.get(away, TeamState())
    h2h = h2h_state.get(tuple(sorted([home, away])), H2HState())

    return {
        "home_form_5": sh.form_pct(5),
        "away_form_5": sa.form_pct(5),
        "form_diff": sh.form_pct(5) - sa.form_pct(5),
        "home_gd_5": sh.goal_diff_avg(5),
        "away_gd_5": sa.goal_diff_avg(5),
        "home_rest_days": min(sh.days_since_last(match_date), 365),
        "away_rest_days": min(sa.days_since_last(match_date), 365),
        "rest_diff": sh.days_since_last(match_date) - sa.days_since_last(match_date),
        "h2h_home_pct": h2h.home_win_pct(),
        "home_matches_played": min(sh.matches_played, 200),
        "away_matches_played": min(sa.matches_played, 200),
    }


CONTEXT_FEATURE_NAMES = [
    "home_form_5", "away_form_5", "form_diff",
    "home_gd_5", "away_gd_5",
    "home_rest_days", "away_rest_days", "rest_diff",
    "h2h_home_pct",
    "home_matches_played", "away_matches_played",
]
