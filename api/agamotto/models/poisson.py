"""Poisson regression for expected goals.

Modelo simple por equipo: cada equipo tiene un parámetro de ataque y uno
de defensa. Goles esperados de home contra away:
    log λ_home = μ + home_adv + attack_home + defense_away
    log λ_away = μ + attack_away + defense_home

Se entrena maximizando log-likelihood de Poisson sobre goles a favor.
Implementación: usamos PoissonRegressor con one-hot.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import PoissonRegressor
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch, ModelVersion

log = get_logger(__name__)


@dataclass
class PoissonModel:
    attack: dict[str, float]
    defense: dict[str, float]
    intercept: float
    home_adv: float
    max_goals: int = 10

    def lambda_home_away(self, home: str, away: str, neutral: bool = False) -> tuple[float, float]:
        ah = self.attack.get(home, 0.0)
        dh = self.defense.get(home, 0.0)
        aa = self.attack.get(away, 0.0)
        da = self.defense.get(away, 0.0)
        home_adv = 0.0 if neutral else self.home_adv
        lam_h = float(np.exp(self.intercept + home_adv + ah + da))
        lam_a = float(np.exp(self.intercept + aa + dh))
        return lam_h, lam_a

    def scoreline_matrix(self, home: str, away: str, neutral: bool = False) -> np.ndarray:
        lam_h, lam_a = self.lambda_home_away(home, away, neutral)
        ph = stats.poisson.pmf(np.arange(self.max_goals + 1), lam_h)
        pa = stats.poisson.pmf(np.arange(self.max_goals + 1), lam_a)
        return np.outer(ph, pa)

    def predict_proba(self, home: str, away: str, neutral: bool = False) -> dict[str, float]:
        m = self.scoreline_matrix(home, away, neutral)
        p_home = float(np.tril(m, -1).sum())
        p_draw = float(np.trace(m))
        p_away = float(np.triu(m, 1).sum())
        # Renormaliza para corregir cola truncada
        total = p_home + p_draw + p_away
        return {"home": p_home / total, "draw": p_draw / total, "away": p_away / total}

    def to_dict(self) -> dict:
        return {
            "attack": self.attack,
            "defense": self.defense,
            "intercept": self.intercept,
            "home_adv": self.home_adv,
            "max_goals": self.max_goals,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "PoissonModel":
        return cls(
            attack=dict(d["attack"]),
            defense=dict(d["defense"]),
            intercept=float(d["intercept"]),
            home_adv=float(d["home_adv"]),
            max_goals=int(d.get("max_goals", 10)),
        )


# ---------------- Training ----------------

def _load_history(min_date: date | None = None) -> pd.DataFrame:
    with get_session() as s:
        rows = s.execute(select(
            HistoricalMatch.match_date, HistoricalMatch.home_team, HistoricalMatch.away_team,
            HistoricalMatch.home_score, HistoricalMatch.away_score, HistoricalMatch.neutral,
        )).all()
    df = pd.DataFrame(rows, columns=["date", "home", "away", "hs", "as_", "neutral"])
    df = df.sort_values("date").reset_index(drop=True)
    if min_date is not None:
        df = df[df["date"] >= min_date].reset_index(drop=True)
    return df


def _build_dataset(df: pd.DataFrame, alpha: float = 0.0015) -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """Duplica cada match en dos filas (perspectiva home y away).
    Aplica peso exponencial por antigüedad.
    """
    today = df["date"].max()
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "team": r["home"], "opp": r["away"], "is_home": 1 if not r["neutral"] else 0,
            "goals": int(r["hs"]), "date": r["date"],
        })
        rows.append({
            "team": r["away"], "opp": r["home"], "is_home": 0,
            "goals": int(r["as_"]), "date": r["date"],
        })
    dd = pd.DataFrame(rows)
    days_ago = np.array([(today - d).days for d in dd["date"]], dtype=np.float32)
    weights = np.exp(-alpha * days_ago)
    return dd, weights, dd["goals"].values


def train(min_date: date | None = date(2014, 1, 1)) -> PoissonModel:
    df = _load_history(min_date)
    log.info("Training Poisson on %d matches", len(df))

    dd, weights, y = _build_dataset(df)
    teams = sorted(set(dd["team"]).union(dd["opp"]))
    t_idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)

    # Features: [is_home, attack_one_hot..., defense_one_hot...]
    rows = len(dd)
    X = np.zeros((rows, 1 + 2 * n), dtype=np.float32)
    X[:, 0] = dd["is_home"].values
    for i, r in enumerate(dd.itertuples(index=False)):
        X[i, 1 + t_idx[r.team]] = 1.0           # attack
        X[i, 1 + n + t_idx[r.opp]] = 1.0        # defense (faced)

    model = PoissonRegressor(alpha=1e-3, max_iter=500)
    model.fit(X, y, sample_weight=weights)
    coefs = model.coef_
    intercept = float(model.intercept_)
    home_adv = float(coefs[0])
    attack = {t: float(coefs[1 + i]) for t, i in t_idx.items()}
    defense = {t: float(coefs[1 + n + i]) for t, i in t_idx.items()}

    log.info("Trained. intercept=%.3f home_adv=%.3f teams=%d", intercept, home_adv, n)
    return PoissonModel(attack=attack, defense=defense, intercept=intercept, home_adv=home_adv)


def save(model: PoissonModel, version: str = "poisson_0.1.0") -> str:
    path = settings.processed_dir / f"{version}.joblib"
    joblib.dump(model.to_dict(), path)
    with get_session() as s:
        mv = s.get(ModelVersion, version)
        if mv:
            mv.metrics = {"teams": len(model.attack)}
            mv.artifact_path = str(path)
        else:
            s.add(ModelVersion(
                model_version_id=version, family="poisson",
                params={"home_adv": model.home_adv, "intercept": model.intercept},
                metrics={"teams": len(model.attack)},
                artifact_path=str(path),
            ))
    log.info("Saved %s -> %s", version, path)
    return str(path)


def load(version: str = "poisson_0.1.0") -> PoissonModel:
    path = settings.processed_dir / f"{version}.joblib"
    return PoissonModel.from_dict(joblib.load(path))
