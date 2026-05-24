"""Walk-forward validation, model calibration, and baseline comparison.

Trains models in yearly blocks and evaluates them out-of-time.
Fits the IsotonicCalibrator on validation predictions and outputs
calibration curve bins and metrics.
"""

from __future__ import annotations

import json
from datetime import date
import numpy as np
import pandas as pd
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch, ModelVersion
from agamotto.models.calibration import IsotonicCalibrator, brier_multiclass, log_loss_multiclass
from agamotto.models.dixon_coles import DixonColesModel
from agamotto.models.elo import EloModel
from agamotto.models.poisson import PoissonModel
from agamotto.models.player_impact import PlayerImpactModel
from agamotto.models.ensemble import AgamottoEnsemble

log = get_logger(__name__)


def run_backtest(start_year: int = 2022, end_year: int = 2026) -> dict:
    log.info("Starting walk-forward backtest from %d to %d...", start_year, end_year)

    # 1. Load historical matches
    with get_session() as s:
        rows = s.execute(select(
            HistoricalMatch.match_date, HistoricalMatch.home_team, HistoricalMatch.away_team,
            HistoricalMatch.home_score, HistoricalMatch.away_score, HistoricalMatch.neutral,
            HistoricalMatch.tournament,
        )).all()
    
    df = pd.DataFrame(rows, columns=["date", "home", "away", "hs", "as_", "neutral", "tournament"])
    df = df.sort_values("date").reset_index(drop=True)

    validation_mask = df["date"] >= date(start_year, 1, 1)
    df_val = df[validation_mask].copy()
    
    if len(df_val) == 0:
        raise ValueError(f"No validation matches found starting from year {start_year}")

    log.info("Found %d validation matches.", len(df_val))

    # Initialize results containers
    y_true_list = []
    pred_naive_list = []
    pred_elo_list = []
    pred_poisson_list = []
    pred_dc_list = []
    pred_ensemble_list = []

    # Map team ids to names - for ensemble
    from agamotto.db.models import Team
    with get_session() as s:
        team_rows = s.execute(select(Team.team_id, Team.name)).all()
    team_name_map = {tid: name for tid, name in team_rows}

    # 2. Walk forward year by year
    for year in range(start_year, end_year + 1):
        year_mask = (df_val["date"] >= date(year, 1, 1)) & (df_val["date"] <= date(year, 12, 31))
        df_year = df_val[year_mask]
        if len(df_year) == 0:
            continue
        
        train_cutoff = date(year - 1, 12, 31)
        log.info("Backtesting year %d. Training models up to %s...", year, train_cutoff)

        # Train models up to train_cutoff
        # A. Elo
        df_train_elo = df[df["date"] <= train_cutoff]
        elo_m = EloModel(ratings={}, last_played={})
        for _, r in df_train_elo.iterrows():
            elo_m.update_one(
                r["home"], r["away"], int(r["hs"]), int(r["as_"]),
                r["tournament"], r["date"], bool(r["neutral"]),
            )

        # B. Poisson (trains on window from 2014)
        df_train_poisson = df[(df["date"] >= date(2014, 1, 1)) & (df["date"] <= train_cutoff)]
        from agamotto.models.poisson import _build_dataset
        dd, weights, y_poisson = _build_dataset(df_train_poisson)
        teams = sorted(set(dd["team"]).union(dd["opp"]))
        t_idx = {t: i for i, t in enumerate(teams)}
        n = len(teams)
        X = np.zeros((len(dd), 1 + 2 * n), dtype=np.float32)
        X[:, 0] = dd["is_home"].values
        for i, r in enumerate(dd.itertuples(index=False)):
            X[i, 1 + t_idx[r.team]] = 1.0
            X[i, 1 + n + t_idx[r.opp]] = 1.0
        
        from sklearn.linear_model import PoissonRegressor
        poisson_reg = PoissonRegressor(alpha=1e-3, max_iter=500)
        poisson_reg.fit(X, y_poisson, sample_weight=weights)
        
        poisson_m = PoissonModel(
            attack={t: float(poisson_reg.coef_[1 + i]) for t, i in t_idx.items()},
            defense={t: float(poisson_reg.coef_[1 + n + i]) for t, i in t_idx.items()},
            intercept=float(poisson_reg.intercept_),
            home_adv=float(poisson_reg.coef_[0]),
        )

        # C. Dixon-Coles (fitted on top of Poisson from 2018)
        df_train_dc = df[(df["date"] >= date(2018, 1, 1)) & (df["date"] <= train_cutoff)]
        from agamotto.models.dixon_coles import _fit_rho
        rho = _fit_rho(df_train_dc, poisson_m)
        dc_m = DixonColesModel(poisson=poisson_m, rho=rho)

        # D. Ensemble (no player impact in historical matches)
        ens = AgamottoEnsemble(
            elo=elo_m,
            dc=dc_m,
            pi=PlayerImpactModel(player_ratings={}), # empty for historical
            calibrator=None, # not calibrated yet
            team_name_map=team_name_map,
        )

        # Predict matches for this year
        for _, r in df_year.iterrows():
            h, a = r["home"], r["away"]
            hs, as_ = int(r["hs"]), int(r["as_"])
            neutral = bool(r["neutral"])
            
            # Actual outcome: 0=home win, 1=draw, 2=away win
            outcome = 0 if hs > as_ else 1 if hs == as_ else 2
            y_true_list.append(outcome)

            # Baselines
            pred_naive_list.append([0.3333, 0.3333, 0.3333])
            
            p_elo = elo_m.predict_proba(h, a, neutral=neutral)
            pred_elo_list.append([p_elo["home"], p_elo["draw"], p_elo["away"]])
            
            p_poisson = poisson_m.predict_proba(h, a, neutral=neutral)
            pred_poisson_list.append([p_poisson["home"], p_poisson["draw"], p_poisson["away"]])
            
            p_dc = dc_m.predict_proba(h, a, neutral=neutral)
            pred_dc_list.append([p_dc["home"], p_dc["draw"], p_dc["away"]])

            # Ensemble
            p_ens = ens.predict(h, a, neutral=neutral)
            pred_ensemble_list.append([p_ens["p_home"], p_ens["p_draw"], p_ens["p_away"]])

    # 3. Compute metrics
    y_true = np.array(y_true_list)
    pred_naive = np.array(pred_naive_list)
    pred_elo = np.array(pred_elo_list)
    pred_poisson = np.array(pred_poisson_list)
    pred_dc = np.array(pred_dc_list)
    pred_ensemble = np.array(pred_ensemble_list)

    metrics = {
        "Naive": {
            "brier": brier_multiclass(pred_naive, y_true),
            "log_loss": log_loss_multiclass(pred_naive, y_true)
        },
        "Elo": {
            "brier": brier_multiclass(pred_elo, y_true),
            "log_loss": log_loss_multiclass(pred_elo, y_true)
        },
        "Poisson": {
            "brier": brier_multiclass(pred_poisson, y_true),
            "log_loss": log_loss_multiclass(pred_poisson, y_true)
        },
        "Dixon-Coles": {
            "brier": brier_multiclass(pred_dc, y_true),
            "log_loss": log_loss_multiclass(pred_dc, y_true)
        },
        "Ensemble (Uncalibrated)": {
            "brier": brier_multiclass(pred_ensemble, y_true),
            "log_loss": log_loss_multiclass(pred_ensemble, y_true)
        }
    }

    # 4. Calibrate ensemble
    calibrator = IsotonicCalibrator()
    calibrator.fit(pred_ensemble, y_true)
    
    # Save the fitted calibrator
    cal_path = calibrator.save("calibrator_0.1.0")
    log.info("Saved fitted calibrator to %s", cal_path)

    # Transform predictions
    pred_calib_list = []
    for p in pred_ensemble:
        p_dict = {"home": p[0], "draw": p[1], "away": p[2]}
        p_cal = calibrator.transform(p_dict)
        pred_calib_list.append([p_cal["home"], p_cal["draw"], p_cal["away"]])
    pred_calib = np.array(pred_calib_list)

    metrics["Ensemble (Calibrated)"] = {
        "brier": brier_multiclass(pred_calib, y_true),
        "log_loss": log_loss_multiclass(pred_calib, y_true)
    }

    log.info("Validation metrics completed:")
    for model_name, m in metrics.items():
        log.info("  %s -> Brier: %.4f, Log Loss: %.4f", model_name, m["brier"], m["log_loss"])

    # 5. Compute calibration bins
    preds_flat = pred_calib.flatten()
    outcomes_flat = np.zeros_like(pred_calib)
    outcomes_flat[np.arange(len(y_true)), y_true] = 1.0
    outcomes_flat = outcomes_flat.flatten()

    bins = []
    bin_edges = np.linspace(0.0, 1.0, 11)
    for i in range(10):
        low, high = bin_edges[i], bin_edges[i+1]
        mask = (preds_flat >= low) & (preds_flat < high)
        if mask.sum() > 0:
            pred_val = float(preds_flat[mask].mean())
            obs_val = float(outcomes_flat[mask].mean())
            n_samples = int(mask.sum())
        else:
            pred_val = float((low + high) / 2)
            obs_val = 0.0
            n_samples = 0
        bins.append({
            "bin": f"{low:.1f}-{high:.1f}",
            "predicted": round(pred_val, 4),
            "observed": round(obs_val, 4),
            "n": n_samples
        })

    # 6. Save results to JSON
    calibration_results = {
        "model_version": settings.model_set_version,
        "bins": bins,
        "brier": metrics["Ensemble (Calibrated)"]["brier"],
        "log_loss": metrics["Ensemble (Calibrated)"]["log_loss"],
        "note": f"Basado en backtesting walk-forward de {len(df_val)} partidos post-{start_year}.",
        "metrics_comparison": metrics
    }
    
    results_path = settings.processed_dir / "calibration_results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(calibration_results, f, indent=2, ensure_ascii=False)
    log.info("Saved calibration results JSON to %s", results_path)

    # Sync ensemble metadata inside database
    with get_session() as s:
        mv = s.get(ModelVersion, settings.model_set_version)
        if mv:
            mv.metrics = {
                "brier": metrics["Ensemble (Calibrated)"]["brier"],
                "log_loss": metrics["Ensemble (Calibrated)"]["log_loss"],
                "uncalibrated_brier": metrics["Ensemble (Uncalibrated)"]["brier"],
                "uncalibrated_log_loss": metrics["Ensemble (Uncalibrated)"]["log_loss"],
                "validation_size": len(df_val)
            }

    return calibration_results
