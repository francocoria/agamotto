from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from agamotto.api.deps import db
from agamotto.db.models import ModelVersion

router = APIRouter(prefix="/validation", tags=["validation"])


import json
from agamotto.core.config import settings

@router.get("/calibration")
def calibration(s: Session = Depends(db)):
    path = settings.processed_dir / "calibration_results.json"
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
            
    # Fallback to placeholder if file does not exist or has errors
    return {
        "model_version": "agamotto_ensemble_0.1.0",
        "bins": [
            {"bin": "0.0-0.1", "predicted": 0.05, "observed": 0.06, "n": 0},
            {"bin": "0.1-0.2", "predicted": 0.15, "observed": 0.14, "n": 0},
            {"bin": "0.2-0.3", "predicted": 0.25, "observed": 0.24, "n": 0},
            {"bin": "0.3-0.4", "predicted": 0.35, "observed": 0.36, "n": 0},
            {"bin": "0.4-0.5", "predicted": 0.45, "observed": 0.47, "n": 0},
            {"bin": "0.5-0.6", "predicted": 0.55, "observed": 0.54, "n": 0},
            {"bin": "0.6-0.7", "predicted": 0.65, "observed": 0.63, "n": 0},
            {"bin": "0.7-0.8", "predicted": 0.75, "observed": 0.77, "n": 0},
            {"bin": "0.8-0.9", "predicted": 0.85, "observed": 0.85, "n": 0},
            {"bin": "0.9-1.0", "predicted": 0.95, "observed": 0.94, "n": 0},
        ],
        "brier": None,
        "log_loss": None,
        "note": "Bins ilustrativos. Ejecutá backtesting walk-forward para valores reales.",
    }


@router.get("/baselines")
def baselines():
    """Devuelve la comparativa cruda del backtest/optimize, en el orden en que se calculó.
    Frontend ordena/highlightea como quiera."""
    path = settings.processed_dir / "calibration_results.json"
    weights = None
    weights_path = settings.processed_dir / "ensemble_weights.json"
    if weights_path.exists():
        try:
            with open(weights_path, encoding="utf-8") as f:
                weights = json.load(f)
        except Exception:
            weights = None

    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            mc = data.get("metrics_comparison", {})
            baselines = [
                {"name": name, "brier": m.get("brier"), "log_loss": m.get("log_loss")}
                for name, m in mc.items()
            ]
            return {
                "baselines": baselines,
                "weights": weights,
                "note": data.get("note"),
            }
        except Exception:
            pass

    return {
        "baselines": [
            {"name": "Naive", "log_loss": None, "brier": None},
            {"name": "Elo", "log_loss": None, "brier": None},
            {"name": "Poisson", "log_loss": None, "brier": None},
            {"name": "Dixon-Coles", "log_loss": None, "brier": None},
            {"name": "Ensemble (calibrated)", "log_loss": None, "brier": None},
        ],
        "weights": weights,
        "note": "Ejecutá `agamotto train optimize` para llenar este panel.",
    }


@router.get("/models")
def models(s: Session = Depends(db)):
    rows = s.execute(select(ModelVersion).order_by(ModelVersion.created_at.desc())).scalars().all()
    return [
        {
            "model_version_id": m.model_version_id,
            "family": m.family,
            "created_at": m.created_at,
            "params": m.params,
            "metrics": m.metrics,
        }
        for m in rows
    ]
