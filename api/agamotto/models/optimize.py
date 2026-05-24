"""Optimiza pesos del ensemble sobre predicciones walk-forward.

Pipeline:
  1) Corre el backtest walk-forward y guarda predicciones por modelo + features de meta.
  2) Entrena LightGBM stacker con k-fold CV → predicciones OOF.
  3) Busca pesos óptimos (Elo, DC, Stacker) minimizando log loss vía scipy.
  4) Aplica calibración isotónica al ensemble óptimo.
  5) Reporta métricas comparativas y guarda el ensemble + calibrador finales.
"""

from __future__ import annotations

import json
from datetime import date

import joblib
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.linear_model import PoissonRegressor
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch, ModelVersion, Team
from agamotto.models.calibration import (
    IsotonicCalibrator,
    brier_multiclass,
    log_loss_multiclass,
)
from agamotto.models.dixon_coles import DixonColesModel, _fit_rho
from agamotto.models.elo import EloModel
from agamotto.models.poisson import PoissonModel, _build_dataset
from agamotto.models.stacker import build_features, train_kfold_oof

log = get_logger(__name__)


def _load_history() -> pd.DataFrame:
    with get_session() as s:
        rows = s.execute(select(
            HistoricalMatch.match_date, HistoricalMatch.home_team, HistoricalMatch.away_team,
            HistoricalMatch.home_score, HistoricalMatch.away_score, HistoricalMatch.neutral,
            HistoricalMatch.tournament,
        )).all()
    df = pd.DataFrame(rows, columns=["date", "home", "away", "hs", "as_", "neutral", "tournament"])
    return df.sort_values("date").reset_index(drop=True)


def collect_walk_forward(start_year: int = 2022, end_year: int = 2026) -> dict:
    """Camina año a año. Para cada año, entrena modelos con info <= anio-1
    y predice los partidos del año. Devuelve arrays alineados.
    """
    df = _load_history()
    df_val = df[df["date"] >= date(start_year, 1, 1)].copy()
    if df_val.empty:
        raise ValueError("No validation data found.")

    log.info("Walk-forward collection: %d candidate matches", len(df_val))

    y_true, p_elo, p_dc, lam, elo_diff_arr, neutral_arr = [], [], [], [], [], []

    for year in range(start_year, end_year + 1):
        year_mask = (df_val["date"] >= date(year, 1, 1)) & (df_val["date"] <= date(year, 12, 31))
        df_year = df_val[year_mask]
        if df_year.empty:
            continue
        cutoff = date(year - 1, 12, 31)
        log.info("year %d: training up to %s, predicting %d matches",
                 year, cutoff, len(df_year))

        # ----- Elo -----
        elo_m = EloModel(ratings={}, last_played={})
        df_train_elo = df[df["date"] <= cutoff]
        for _, r in df_train_elo.iterrows():
            elo_m.update_one(r["home"], r["away"], int(r["hs"]), int(r["as_"]),
                             r["tournament"], r["date"], bool(r["neutral"]))

        # ----- Poisson -----
        df_train_p = df[(df["date"] >= date(2014, 1, 1)) & (df["date"] <= cutoff)]
        dd, weights, y_pois = _build_dataset(df_train_p)
        teams = sorted(set(dd["team"]).union(dd["opp"]))
        t_idx = {t: i for i, t in enumerate(teams)}
        n = len(teams)
        X = np.zeros((len(dd), 1 + 2 * n), dtype=np.float32)
        X[:, 0] = dd["is_home"].values
        for i, r in enumerate(dd.itertuples(index=False)):
            X[i, 1 + t_idx[r.team]] = 1.0
            X[i, 1 + n + t_idx[r.opp]] = 1.0
        reg = PoissonRegressor(alpha=1e-3, max_iter=500).fit(X, y_pois, sample_weight=weights)
        pois_m = PoissonModel(
            attack={t: float(reg.coef_[1 + i]) for t, i in t_idx.items()},
            defense={t: float(reg.coef_[1 + n + i]) for t, i in t_idx.items()},
            intercept=float(reg.intercept_),
            home_adv=float(reg.coef_[0]),
        )

        # ----- DC -----
        df_train_dc = df[(df["date"] >= date(2018, 1, 1)) & (df["date"] <= cutoff)]
        rho = _fit_rho(df_train_dc, pois_m)
        dc_m = DixonColesModel(poisson=pois_m, rho=rho)

        # ----- Predict each match in df_year -----
        for _, r in df_year.iterrows():
            h, a, neutral = r["home"], r["away"], bool(r["neutral"])
            hs, as_ = int(r["hs"]), int(r["as_"])
            outcome = 0 if hs > as_ else 1 if hs == as_ else 2
            y_true.append(outcome)
            elo_p = elo_m.predict_proba(h, a, neutral=neutral)
            dc_p = dc_m.predict_proba(h, a, neutral=neutral)
            lam_h, lam_a = pois_m.lambda_home_away(h, a, neutral=neutral)
            p_elo.append([elo_p["home"], elo_p["draw"], elo_p["away"]])
            p_dc.append([dc_p["home"], dc_p["draw"], dc_p["away"]])
            lam.append([lam_h, lam_a])
            elo_diff_arr.append(elo_m.get(h) + (0 if neutral else elo_m.home_adv) - elo_m.get(a))
            neutral_arr.append(1.0 if neutral else 0.0)

    return {
        "y": np.array(y_true),
        "p_elo": np.array(p_elo, dtype=np.float32),
        "p_dc": np.array(p_dc, dtype=np.float32),
        "lambdas": np.array(lam, dtype=np.float32),
        "elo_diff": np.array(elo_diff_arr, dtype=np.float32),
        "neutral": np.array(neutral_arr, dtype=np.float32),
    }


def _renorm(p: np.ndarray) -> np.ndarray:
    s = p.sum(axis=1, keepdims=True)
    return np.where(s > 0, p / s, p)


def _optimal_weights(p_list: list[np.ndarray], y: np.ndarray) -> np.ndarray:
    """Minimiza log loss del promedio ponderado de p_list. Pesos en simplex (suma=1, >=0)."""
    K = len(p_list)
    P = np.stack(p_list, axis=0)  # (K, n, 3)

    def neg_ll(w):
        w = np.clip(w, 0, None)
        if w.sum() == 0:
            return 1e9
        w = w / w.sum()
        mix = (w[:, None, None] * P).sum(axis=0)
        mix = _renorm(np.clip(mix, 1e-9, 1.0))
        return log_loss_multiclass(mix, y)

    x0 = np.ones(K) / K
    bounds = [(0.0, 1.0)] * K
    res = minimize(neg_ll, x0, method="SLSQP", bounds=bounds,
                   constraints={"type": "eq", "fun": lambda w: w.sum() - 1.0})
    return np.clip(res.x, 0, 1) / max(np.clip(res.x, 0, 1).sum(), 1e-9)


def _metrics(p: np.ndarray, y: np.ndarray) -> dict:
    return {"brier": brier_multiclass(p, y), "log_loss": log_loss_multiclass(p, y)}


def run_optimize(start_year: int = 2022, end_year: int = 2026) -> dict:
    log.info("=== Agamotto · ensemble optimization ===")
    data = collect_walk_forward(start_year=start_year, end_year=end_year)
    y = data["y"]
    p_elo, p_dc = data["p_elo"], data["p_dc"]
    log.info("Collected %d out-of-time predictions.", len(y))

    # --- Train LGBM stacker with k-fold OOF ---
    X = build_features(p_elo, p_dc, data["lambdas"], data["elo_diff"], data["neutral"])
    p_stacker_oof, stacker_final = train_kfold_oof(X, y, n_splits=5, seed=42)

    # --- Base metrics ---
    metrics = {
        "Naive": _metrics(np.full((len(y), 3), 1 / 3), y),
        "Elo": _metrics(p_elo, y),
        "DC": _metrics(p_dc, y),
        "Stacker (LGBM OOF)": _metrics(p_stacker_oof, y),
    }

    # --- Optimize linear weights over (Elo, DC, Stacker) ---
    w = _optimal_weights([p_elo, p_dc, p_stacker_oof], y)
    log.info("Optimal weights: Elo=%.3f  DC=%.3f  Stacker=%.3f", w[0], w[1], w[2])
    mix = _renorm(w[0] * p_elo + w[1] * p_dc + w[2] * p_stacker_oof)
    metrics["Ensemble (Elo+DC+Stacker, optimal weights)"] = _metrics(mix, y)

    # --- Calibrate the optimal ensemble (isotonic, per-class) ---
    calib = IsotonicCalibrator()
    calib.fit(mix, y)
    calibrated = np.array([
        list(calib.transform({"home": p[0], "draw": p[1], "away": p[2]}).values())
        for p in mix
    ])
    metrics["Ensemble (calibrated)"] = _metrics(calibrated, y)

    log.info("Comparative metrics:")
    for name, m in metrics.items():
        log.info("  %-50s Brier=%.4f  LogLoss=%.4f", name, m["brier"], m["log_loss"])

    # --- Persist artifacts ---
    stacker_path = stacker_final.save("stacker_0.1.0")
    calib.save("calibrator_optimal_0.1.0")
    weights_path = settings.processed_dir / "ensemble_weights.json"
    with open(weights_path, "w", encoding="utf-8") as f:
        json.dump({"w_elo": float(w[0]), "w_dc": float(w[1]), "w_stacker": float(w[2])}, f, indent=2)

    # Calibration bins for the academic panel
    preds_flat = calibrated.flatten()
    obs = np.zeros_like(calibrated)
    obs[np.arange(len(y)), y] = 1.0
    obs_flat = obs.flatten()
    bins = []
    edges = np.linspace(0, 1, 11)
    for i in range(10):
        lo, hi = edges[i], edges[i + 1]
        mask = (preds_flat >= lo) & (preds_flat < hi)
        if mask.sum() > 0:
            bins.append({
                "bin": f"{lo:.1f}-{hi:.1f}",
                "predicted": float(round(preds_flat[mask].mean(), 4)),
                "observed": float(round(obs_flat[mask].mean(), 4)),
                "n": int(mask.sum()),
            })
        else:
            bins.append({"bin": f"{lo:.1f}-{hi:.1f}", "predicted": float((lo + hi) / 2),
                         "observed": 0.0, "n": 0})

    out = {
        "model_version": "agamotto_ensemble_0.2.0",
        "weights": {"w_elo": float(w[0]), "w_dc": float(w[1]), "w_stacker": float(w[2])},
        "metrics_comparison": metrics,
        "brier": metrics["Ensemble (calibrated)"]["brier"],
        "log_loss": metrics["Ensemble (calibrated)"]["log_loss"],
        "bins": bins,
        "note": f"Walk-forward {start_year}-{end_year} · {len(y)} partidos · LGBM stacker 5-fold OOF.",
        "stacker_path": stacker_path,
        "weights_path": str(weights_path),
    }
    results_path = settings.processed_dir / "calibration_results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    log.info("Wrote optimization results → %s", results_path)

    with get_session() as s:
        mv = s.get(ModelVersion, "agamotto_ensemble_0.2.0")
        if not mv:
            s.add(ModelVersion(
                model_version_id="agamotto_ensemble_0.2.0",
                family="ensemble-stacker",
                params={"weights": out["weights"]},
                metrics={"brier": out["brier"], "log_loss": out["log_loss"]},
                artifact_path=stacker_path,
            ))
        else:
            mv.metrics = {"brier": out["brier"], "log_loss": out["log_loss"]}
            mv.params = {"weights": out["weights"]}
    return out
