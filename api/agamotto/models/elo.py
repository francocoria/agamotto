"""Elo rating model for international football.

Rating actualizado partido a partido en orden cronológico con:
- factor K dependiente de importancia del torneo
- ajuste por margen de goles
- ventaja de localía
- decaimiento opcional aplicado en inferencia
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import date

import joblib
import pandas as pd
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch, ModelVersion, Team

log = get_logger(__name__)


# Importancia por tipo de torneo (similar a la fórmula FIFA Elo)
TOURNAMENT_K = {
    "FIFA World Cup": 60,
    "FIFA World Cup qualification": 40,
    "Copa América": 50,
    "UEFA Euro": 50,
    "UEFA Euro qualification": 40,
    "African Cup of Nations": 45,
    "AFC Asian Cup": 45,
    "Gold Cup": 35,
    "UEFA Nations League": 35,
    "Confederations Cup": 40,
    "Friendly": 20,
}
DEFAULT_K = 30
HOME_ADV = 65.0
INITIAL_RATING = 1500.0


@dataclass
class EloModel:
    ratings: dict[str, float]
    last_played: dict[str, date]
    home_adv: float = HOME_ADV
    initial: float = INITIAL_RATING

    def get(self, team: str) -> float:
        return self.ratings.get(team, self.initial)

    def expected_score(self, home_rating: float, away_rating: float, neutral: bool = False) -> float:
        ra = home_rating + (0 if neutral else self.home_adv)
        return 1.0 / (1.0 + 10 ** ((away_rating - ra) / 400))

    def predict_proba(self, home: str, away: str, neutral: bool = False) -> dict[str, float]:
        """Devuelve {home, draw, away}. La probabilidad de empate se aproxima
        con una función de la diferencia de rating; la 1X2 se reparte."""
        h, a = self.get(home), self.get(away)
        e_home = self.expected_score(h, a, neutral)
        diff = abs(h + (0 if neutral else self.home_adv) - a)
        # P(draw) decrece con la diferencia de rating; calibrado empírico.
        p_draw = max(0.10, 0.32 - 0.0007 * diff)
        p_home = e_home * (1 - p_draw)
        p_away = (1 - e_home) * (1 - p_draw)
        # Renormaliza por si acaso
        total = p_home + p_draw + p_away
        return {"home": p_home / total, "draw": p_draw / total, "away": p_away / total}

    def update_one(
        self, home: str, away: str, hs: int, as_: int,
        tournament: str | None, match_date: date, neutral: bool,
    ) -> None:
        k = TOURNAMENT_K.get(tournament or "Friendly", DEFAULT_K)
        # Bonus por margen de gol
        g_diff = abs(hs - as_)
        k_mult = 1.0 + math.log1p(max(0, g_diff - 1)) * 0.5
        k_eff = k * k_mult

        h, a = self.get(home), self.get(away)
        e_home = self.expected_score(h, a, neutral)
        actual = 1.0 if hs > as_ else 0.5 if hs == as_ else 0.0
        delta = k_eff * (actual - e_home)
        self.ratings[home] = h + delta
        self.ratings[away] = a - delta
        self.last_played[home] = match_date
        self.last_played[away] = match_date

    def to_dict(self) -> dict:
        return {
            "ratings": self.ratings,
            "last_played": {k: v.isoformat() for k, v in self.last_played.items()},
            "home_adv": self.home_adv,
            "initial": self.initial,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EloModel":
        return cls(
            ratings=dict(d.get("ratings", {})),
            last_played={k: date.fromisoformat(v) for k, v in d.get("last_played", {}).items()},
            home_adv=d.get("home_adv", HOME_ADV),
            initial=d.get("initial", INITIAL_RATING),
        )


# ---------------- Training ----------------

def _load_history() -> pd.DataFrame:
    with get_session() as s:
        rows = s.execute(select(
            HistoricalMatch.match_date, HistoricalMatch.home_team, HistoricalMatch.away_team,
            HistoricalMatch.home_score, HistoricalMatch.away_score,
            HistoricalMatch.tournament, HistoricalMatch.neutral,
        )).all()
    df = pd.DataFrame(rows, columns=["date", "home", "away", "hs", "as_", "tournament", "neutral"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def train(min_date: date | None = None) -> EloModel:
    df = _load_history()
    if min_date:
        df = df[df["date"] >= min_date]
    log.info("Training Elo on %d matches", len(df))
    model = EloModel(ratings={}, last_played={})
    for _, r in df.iterrows():
        model.update_one(
            r["home"], r["away"], int(r["hs"]), int(r["as_"]),
            r["tournament"], r["date"], bool(r["neutral"]),
        )
    log.info("Done. %d teams rated.", len(model.ratings))
    return model


def save(model: EloModel, version: str = "elo_0.1.0") -> str:
    path = settings.processed_dir / f"{version}.joblib"
    joblib.dump(model.to_dict(), path)
    with get_session() as s:
        mv = s.get(ModelVersion, version)
        if mv:
            mv.metrics = {"teams": len(model.ratings)}
            mv.artifact_path = str(path)
        else:
            s.add(ModelVersion(
                model_version_id=version, family="elo",
                params={"home_adv": model.home_adv, "initial": model.initial},
                metrics={"teams": len(model.ratings)},
                artifact_path=str(path),
            ))
    log.info("Saved %s -> %s", version, path)
    return str(path)


def load(version: str = "elo_0.1.0") -> EloModel:
    path = settings.processed_dir / f"{version}.joblib"
    d = joblib.load(path)
    return EloModel.from_dict(d)


def sync_team_elo(model: EloModel) -> int:
    """Persiste el rating Elo final en la tabla teams (columna elo)."""
    n = 0
    with get_session() as s:
        for team in s.execute(select(Team)).scalars().all():
            r = model.ratings.get(team.name)
            if r is not None:
                team.elo = round(r, 1)
                n += 1
    log.info("Synced Elo to %d teams", n)
    return n


def export_top(model: EloModel, n: int = 20) -> str:
    top = sorted(model.ratings.items(), key=lambda x: -x[1])[:n]
    return json.dumps(top, indent=2)
