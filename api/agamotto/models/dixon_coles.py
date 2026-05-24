"""Dixon-Coles correction for low scorelines.

Dixon & Coles (1997). Aplica un factor de corrección sobre 0-0, 1-0, 0-1, 1-1
para mejorar el ajuste a la frecuencia empírica de empates bajos.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import joblib
import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import minimize
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch, ModelVersion
from agamotto.models.poisson import PoissonModel
from agamotto.models.poisson import load as load_poisson


def tau(i: int, j: int, lam_h: float, lam_a: float, rho: float) -> float:
    """Factor de corrección Dixon-Coles para (i, j)."""
    if i == 0 and j == 0:
        return 1.0 - lam_h * lam_a * rho
    if i == 0 and j == 1:
        return 1.0 + lam_h * rho
    if i == 1 and j == 0:
        return 1.0 + lam_a * rho
    if i == 1 and j == 1:
        return 1.0 - rho
    return 1.0


def dc_scoreline_matrix(lam_h: float, lam_a: float, rho: float, max_goals: int = 10) -> np.ndarray:
    ph = stats.poisson.pmf(np.arange(max_goals + 1), lam_h)
    pa = stats.poisson.pmf(np.arange(max_goals + 1), lam_a)
    m = np.outer(ph, pa)
    for i in range(2):
        for j in range(2):
            m[i, j] *= tau(i, j, lam_h, lam_a, rho)
    # Renormaliza
    m = m / m.sum()
    return m


@dataclass
class DixonColesModel:
    poisson: PoissonModel
    rho: float

    def scoreline_matrix(self, home: str, away: str, neutral: bool = False) -> np.ndarray:
        lam_h, lam_a = self.poisson.lambda_home_away(home, away, neutral)
        return dc_scoreline_matrix(lam_h, lam_a, self.rho, self.poisson.max_goals)

    def predict_proba(self, home: str, away: str, neutral: bool = False) -> dict[str, float]:
        m = self.scoreline_matrix(home, away, neutral)
        return {
            "home": float(np.tril(m, -1).sum()),
            "draw": float(np.trace(m)),
            "away": float(np.triu(m, 1).sum()),
        }

    def expected_goals(self, home: str, away: str, neutral: bool = False) -> tuple[float, float]:
        return self.poisson.lambda_home_away(home, away, neutral)

    def to_dict(self) -> dict:
        return {"poisson": self.poisson.to_dict(), "rho": float(self.rho)}

    @classmethod
    def from_dict(cls, d: dict) -> "DixonColesModel":
        return cls(poisson=PoissonModel.from_dict(d["poisson"]), rho=float(d["rho"]))


log = get_logger(__name__)


def _fit_rho(df: pd.DataFrame, p: PoissonModel) -> float:
    """Maximiza log-likelihood en rho dado el modelo Poisson preentrenado."""
    pairs: list[tuple[int, int, float, float]] = []
    for _, r in df.iterrows():
        lam_h, lam_a = p.lambda_home_away(r["home"], r["away"], bool(r["neutral"]))
        pairs.append((int(r["hs"]), int(r["as_"]), lam_h, lam_a))

    def neg_ll(params: np.ndarray) -> float:
        rho = float(params[0])
        # Restringir rango razonable
        if rho < -0.2 or rho > 0.2:
            return 1e10
        ll = 0.0
        for hs, as_, lh, la in pairs:
            ph = stats.poisson.pmf(hs, lh)
            pa = stats.poisson.pmf(as_, la)
            t = tau(hs, as_, lh, la, rho)
            p_obs = max(ph * pa * t, 1e-12)
            ll += np.log(p_obs)
        return -ll

    res = minimize(neg_ll, x0=np.array([-0.05]), method="Nelder-Mead")
    return float(res.x[0])


def train(min_date: date | None = date(2018, 1, 1), poisson_version: str = "poisson_0.1.0") -> DixonColesModel:
    log.info("Training Dixon-Coles rho on top of %s", poisson_version)
    p = load_poisson(poisson_version)
    with get_session() as s:
        rows = s.execute(select(
            HistoricalMatch.match_date, HistoricalMatch.home_team, HistoricalMatch.away_team,
            HistoricalMatch.home_score, HistoricalMatch.away_score, HistoricalMatch.neutral,
        )).all()
    df = pd.DataFrame(rows, columns=["date", "home", "away", "hs", "as_", "neutral"])
    df = df.sort_values("date").reset_index(drop=True)
    if min_date:
        df = df[df["date"] >= min_date]
    rho = _fit_rho(df, p)
    log.info("Fitted rho=%.4f on %d matches", rho, len(df))
    return DixonColesModel(poisson=p, rho=rho)


def save(model: DixonColesModel, version: str = "dixon_coles_0.1.0") -> str:
    path = settings.processed_dir / f"{version}.joblib"
    joblib.dump(model.to_dict(), path)
    with get_session() as s:
        mv = s.get(ModelVersion, version)
        if mv:
            mv.metrics = {"rho": model.rho}
            mv.artifact_path = str(path)
        else:
            s.add(ModelVersion(
                model_version_id=version, family="dixon-coles",
                params={"rho": model.rho},
                metrics={},
                artifact_path=str(path),
            ))
    return str(path)


def load(version: str = "dixon_coles_0.1.0") -> DixonColesModel:
    path = settings.processed_dir / f"{version}.joblib"
    return DixonColesModel.from_dict(joblib.load(path))
