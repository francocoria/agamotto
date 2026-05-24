"""LightGBM stacker — meta-modelo entrenado sobre las salidas de los modelos base.

Toma como features:
  - Probabilidades de Elo (home, draw, away)
  - Probabilidades de Dixon-Coles (home, draw, away)
  - Lambdas Poisson (home, away)
  - Diferencia de Elo
  - Indicador neutral

Target: outcome 1X2 (0 = home, 1 = draw, 2 = away).

Entrena un único LGBM multiclass. Usa k-fold para obtener predicciones
out-of-fold honestas durante optimización de pesos del ensemble.
"""

from __future__ import annotations

from dataclasses import dataclass

import joblib
import lightgbm as lgb
import numpy as np
from sklearn.model_selection import KFold

from agamotto.core.config import settings
from agamotto.core.logging import get_logger

log = get_logger(__name__)


FEATURE_NAMES = [
    "p_elo_home", "p_elo_draw", "p_elo_away",
    "p_dc_home", "p_dc_draw", "p_dc_away",
    "lambda_h", "lambda_a",
    "elo_diff", "neutral",
]


def build_features(pred_elo: np.ndarray, pred_dc: np.ndarray,
                   lambdas: np.ndarray, elo_diff: np.ndarray,
                   neutral: np.ndarray) -> np.ndarray:
    """pred_elo, pred_dc: shape (n, 3). lambdas: shape (n, 2). elo_diff, neutral: shape (n,)."""
    return np.column_stack([pred_elo, pred_dc, lambdas, elo_diff, neutral]).astype(np.float32)


@dataclass
class StackerModel:
    booster: lgb.Booster
    version: str = "stacker_0.1.0"

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.booster.predict(X)  # shape (n, 3)

    def save(self, version: str | None = None) -> str:
        v = version or self.version
        path = settings.processed_dir / f"{v}.joblib"
        # joblib stores Booster via pickle; LightGBM supports it
        joblib.dump({"booster": self.booster, "version": v}, path)
        log.info("Saved stacker %s -> %s", v, path)
        return str(path)

    @classmethod
    def load(cls, version: str = "stacker_0.1.0") -> "StackerModel":
        path = settings.processed_dir / f"{version}.joblib"
        d = joblib.load(path)
        return cls(booster=d["booster"], version=d["version"])


def _train_one(X_train: np.ndarray, y_train: np.ndarray, params: dict | None = None) -> lgb.Booster:
    default_params = {
        "objective": "multiclass",
        "num_class": 3,
        "metric": "multi_logloss",
        "learning_rate": 0.05,
        "num_leaves": 16,
        "min_data_in_leaf": 30,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.85,
        "bagging_freq": 5,
        "lambda_l2": 0.1,
        "verbose": -1,
        "force_row_wise": True,
    }
    if params:
        default_params.update(params)
    dtrain = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_NAMES)
    booster = lgb.train(default_params, dtrain, num_boost_round=300)
    return booster


def train_kfold_oof(X: np.ndarray, y: np.ndarray, n_splits: int = 5,
                    seed: int = 42) -> tuple[np.ndarray, StackerModel]:
    """Devuelve (predicciones OOF, modelo final entrenado en todo X)."""
    log.info("Training LightGBM stacker with %d-fold CV on %d samples", n_splits, len(X))
    oof = np.zeros((len(X), 3), dtype=np.float32)
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=seed)
    for fold, (tr_idx, va_idx) in enumerate(kf.split(X), start=1):
        booster = _train_one(X[tr_idx], y[tr_idx])
        oof[va_idx] = booster.predict(X[va_idx])
        log.info("  fold %d done", fold)
    # Modelo final sobre todo el dataset
    final_booster = _train_one(X, y)
    return oof, StackerModel(booster=final_booster)
