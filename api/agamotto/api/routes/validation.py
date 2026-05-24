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
    path = settings.processed_dir / "calibration_results.json"
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
                mc = data.get("metrics_comparison", {})
                if mc:
                    return {
                        "baselines": [
                            {"name": "Naive (equal probability)", "log_loss": mc.get("Naive", {}).get("log_loss"), "brier": mc.get("Naive", {}).get("brier")},
                            {"name": "Elo", "log_loss": mc.get("Elo", {}).get("log_loss"), "brier": mc.get("Elo", {}).get("brier")},
                            {"name": "Poisson", "log_loss": mc.get("Poisson", {}).get("log_loss"), "brier": mc.get("Poisson", {}).get("brier")},
                            {"name": "Dixon-Coles", "log_loss": mc.get("Dixon-Coles", {}).get("log_loss"), "brier": mc.get("Dixon-Coles", {}).get("brier")},
                            {"name": "Agamotto Ensemble", "log_loss": mc.get("Ensemble (Calibrated)", {}).get("log_loss"), "brier": mc.get("Ensemble (Calibrated)", {}).get("brier")},
                        ]
                    }
        except Exception:
            pass

    return {
        "baselines": [
            {"name": "Naive (equal probability)", "log_loss": None, "brier": None},
            {"name": "Elo", "log_loss": None, "brier": None},
            {"name": "Poisson", "log_loss": None, "brier": None},
            {"name": "Dixon-Coles", "log_loss": None, "brier": None},
            {"name": "Agamotto Ensemble", "log_loss": None, "brier": None},
        ],
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
