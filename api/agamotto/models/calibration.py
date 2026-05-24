"""Calibración probabilística: isotonic regression sobre 1X2."""

from __future__ import annotations

from dataclasses import dataclass, field

import joblib
import numpy as np
from sklearn.isotonic import IsotonicRegression

from agamotto.core.config import settings
from agamotto.core.logging import get_logger

log = get_logger(__name__)


@dataclass
class IsotonicCalibrator:
    iso_home: IsotonicRegression = field(default_factory=lambda: IsotonicRegression(out_of_bounds="clip"))
    iso_draw: IsotonicRegression = field(default_factory=lambda: IsotonicRegression(out_of_bounds="clip"))
    iso_away: IsotonicRegression = field(default_factory=lambda: IsotonicRegression(out_of_bounds="clip"))
    fitted: bool = False

    def fit(self, p_pred: np.ndarray, outcomes: np.ndarray) -> "IsotonicCalibrator":
        """p_pred shape (n, 3) = [p_home, p_draw, p_away], outcomes shape (n,) in {0,1,2}.

        0=home win, 1=draw, 2=away win
        """
        y_home = (outcomes == 0).astype(int)
        y_draw = (outcomes == 1).astype(int)
        y_away = (outcomes == 2).astype(int)
        self.iso_home.fit(p_pred[:, 0], y_home)
        self.iso_draw.fit(p_pred[:, 1], y_draw)
        self.iso_away.fit(p_pred[:, 2], y_away)
        self.fitted = True
        return self

    def transform(self, p: dict[str, float]) -> dict[str, float]:
        if not self.fitted:
            return p
        ph = float(self.iso_home.transform([p["home"]])[0])
        pd_ = float(self.iso_draw.transform([p["draw"]])[0])
        pa = float(self.iso_away.transform([p["away"]])[0])
        s = ph + pd_ + pa
        if s == 0:
            return p
        return {"home": ph / s, "draw": pd_ / s, "away": pa / s}

    def save(self, version: str = "calibrator_0.1.0") -> str:
        path = settings.processed_dir / f"{version}.joblib"
        joblib.dump(self, path)
        return str(path)

    @classmethod
    def load(cls, version: str = "calibrator_0.1.0") -> "IsotonicCalibrator":
        path = settings.processed_dir / f"{version}.joblib"
        return joblib.load(path)


def brier_multiclass(p_pred: np.ndarray, outcomes: np.ndarray) -> float:
    n, k = p_pred.shape
    y = np.zeros((n, k))
    y[np.arange(n), outcomes] = 1
    return float(((p_pred - y) ** 2).sum(axis=1).mean())


def log_loss_multiclass(p_pred: np.ndarray, outcomes: np.ndarray, eps: float = 1e-12) -> float:
    p = np.clip(p_pred, eps, 1 - eps)
    return float(-np.log(p[np.arange(len(outcomes)), outcomes]).mean())
