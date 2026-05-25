"""LightGBM stacker — meta-modelo entrenado sobre las salidas de los modelos base
+ features contextuales (forma reciente, descanso, h2h).

Soporta bagging: entrena N modelos con seeds distintas y promedia probabilidades.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import joblib
import lightgbm as lgb
import numpy as np
from sklearn.model_selection import KFold

from agamotto.core.config import settings
from agamotto.core.logging import get_logger
from agamotto.models.features import CONTEXT_FEATURE_NAMES

log = get_logger(__name__)


BASE_FEATURE_NAMES = [
    "p_elo_home", "p_elo_draw", "p_elo_away",
    "p_dc_home", "p_dc_draw", "p_dc_away",
    "lambda_h", "lambda_a",
    "elo_diff", "neutral",
]
FEATURE_NAMES = BASE_FEATURE_NAMES + CONTEXT_FEATURE_NAMES


def build_features(
    pred_elo: np.ndarray, pred_dc: np.ndarray, lambdas: np.ndarray,
    elo_diff: np.ndarray, neutral: np.ndarray,
    context: np.ndarray | None = None,
) -> np.ndarray:
    """
    pred_elo, pred_dc: (n, 3). lambdas: (n, 2). elo_diff, neutral: (n,).
    context: (n, len(CONTEXT_FEATURE_NAMES)) — opcional; si None se rellena con zeros.
    """
    base = np.column_stack([pred_elo, pred_dc, lambdas, elo_diff, neutral]).astype(np.float32)
    n = len(base)
    if context is None:
        context = np.zeros((n, len(CONTEXT_FEATURE_NAMES)), dtype=np.float32)
    return np.column_stack([base, context]).astype(np.float32)


@dataclass
class StackerModel:
    """Soporta single booster o lista de boosters (bagging)."""
    boosters: list = field(default_factory=list)
    version: str = "stacker_0.2.0"
    feature_names: list = field(default_factory=lambda: list(FEATURE_NAMES))

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if not self.boosters:
            raise RuntimeError("Stacker sin boosters cargados.")
        # Si X viene con menos features (legacy), pad con ceros para mantener compat
        if X.shape[1] < len(self.feature_names):
            pad = np.zeros((X.shape[0], len(self.feature_names) - X.shape[1]), dtype=np.float32)
            X = np.column_stack([X, pad])
        preds = np.stack([b.predict(X) for b in self.boosters], axis=0)
        return preds.mean(axis=0)  # avg over bagged boosters

    def save(self, version: str | None = None) -> str:
        v = version or self.version
        path = settings.processed_dir / f"{v}.joblib"
        joblib.dump({"boosters": self.boosters, "version": v, "feature_names": self.feature_names}, path)
        log.info("Saved stacker %s (%d boosters) -> %s", v, len(self.boosters), path)
        return str(path)

    @classmethod
    def load(cls, version: str = "stacker_0.2.0") -> "StackerModel":
        path = settings.processed_dir / f"{version}.joblib"
        if not path.exists():
            # Try legacy 0.1.0
            legacy = settings.processed_dir / "stacker_0.1.0.joblib"
            if legacy.exists():
                d = joblib.load(legacy)
                if "booster" in d:
                    return cls(boosters=[d["booster"]], version=d.get("version", "stacker_0.1.0"),
                               feature_names=BASE_FEATURE_NAMES.copy())
                return cls(boosters=d.get("boosters", []), version=d.get("version", "stacker_0.1.0"),
                           feature_names=d.get("feature_names", BASE_FEATURE_NAMES.copy()))
            raise FileNotFoundError(path)
        d = joblib.load(path)
        return cls(boosters=d["boosters"], version=d["version"], feature_names=d["feature_names"])


def _train_one(X_train: np.ndarray, y_train: np.ndarray, seed: int = 42,
               feature_names: list = FEATURE_NAMES, params: dict | None = None) -> lgb.Booster:
    default_params = {
        "objective": "multiclass",
        "num_class": 3,
        "metric": "multi_logloss",
        "learning_rate": 0.04,
        "num_leaves": 24,
        "min_data_in_leaf": 25,
        "feature_fraction": 0.85,
        "bagging_fraction": 0.85,
        "bagging_freq": 5,
        "lambda_l2": 0.2,
        "verbose": -1,
        "force_row_wise": True,
        "seed": seed,
        "deterministic": True,
    }
    if params:
        default_params.update(params)
    dtrain = lgb.Dataset(X_train, label=y_train, feature_name=feature_names)
    return lgb.train(default_params, dtrain, num_boost_round=400)


def train_kfold_oof_bagged(
    X: np.ndarray, y: np.ndarray,
    n_splits: int = 5, n_bags: int = 3,
    seeds: list[int] | None = None,
) -> tuple[np.ndarray, StackerModel]:
    """Walk-forward style k-fold + bagging.

    Para cada fold, entrena `n_bags` modelos (seeds distintas) y promedia su predicción
    en validación. El modelo final son `n_bags` modelos entrenados sobre TODO X.
    """
    if seeds is None:
        seeds = list(range(42, 42 + n_bags))
    log.info("Stacker · %d-fold CV · %d bags · %d features", n_splits, n_bags, X.shape[1])

    oof = np.zeros((len(X), 3), dtype=np.float32)
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    for fold, (tr_idx, va_idx) in enumerate(kf.split(X), start=1):
        fold_preds = []
        for seed in seeds:
            booster = _train_one(X[tr_idx], y[tr_idx], seed=seed)
            fold_preds.append(booster.predict(X[va_idx]))
        oof[va_idx] = np.mean(fold_preds, axis=0)
        log.info("  fold %d done", fold)

    # Modelos finales (uno por seed) sobre todo X
    final_boosters = [_train_one(X, y, seed=s) for s in seeds]
    return oof, StackerModel(boosters=final_boosters)


# Backwards-compat alias
def train_kfold_oof(X: np.ndarray, y: np.ndarray, n_splits: int = 5,
                    seed: int = 42) -> tuple[np.ndarray, StackerModel]:
    return train_kfold_oof_bagged(X, y, n_splits=n_splits, n_bags=1, seeds=[seed])
