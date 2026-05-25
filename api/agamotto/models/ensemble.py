"""Ensemble: combina Elo + Poisson + Dixon-Coles + Player Impact.

Output canónico:
    {
        "p_home", "p_draw", "p_away",
        "lambda_home", "lambda_away",
        "scoreline_matrix": np.ndarray (max_goals+1, max_goals+1),
        "top_factors": list of {name, weight, direction}
    }
"""

from __future__ import annotations

from dataclasses import dataclass, field

import joblib
import numpy as np

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import ModelVersion
from agamotto.models.calibration import IsotonicCalibrator
from agamotto.models.dixon_coles import DixonColesModel, dc_scoreline_matrix
from agamotto.models.dixon_coles import load as load_dc
from agamotto.models.elo import EloModel
from agamotto.models.elo import load as load_elo
from agamotto.models.player_impact import PlayerImpactModel
from agamotto.models.player_impact import load as load_pi
from agamotto.models.stacker import StackerModel, build_features

log = get_logger(__name__)


@dataclass
class AgamottoEnsemble:
    elo: EloModel
    dc: DixonColesModel
    pi: PlayerImpactModel
    calibrator: IsotonicCalibrator | None = None
    stacker: StackerModel | None = None
    # Mixing weights (suman 1)
    w_elo: float = 0.25
    w_dc: float = 0.75
    w_stacker: float = 0.0
    version: str = "agamotto_ensemble_0.1.0"
    # Mapping: team_id (uppercase code) → display name used for Elo/DC lookups
    team_name_map: dict[str, str] = field(default_factory=dict)

    def _name(self, team_id: str) -> str:
        return self.team_name_map.get(team_id, team_id)

    def predict(
        self,
        home_team_id: str,
        away_team_id: str,
        neutral: bool = True,
        match_id: str | None = None,
        max_goals: int = 8,
    ) -> dict:
        home_name = self._name(home_team_id)
        away_name = self._name(away_team_id)

        # 1) Elo
        elo_p = self.elo.predict_proba(home_name, away_name, neutral=neutral)

        # 2) Dixon-Coles + Poisson lambdas
        lam_h, lam_a = self.dc.poisson.lambda_home_away(home_name, away_name, neutral=neutral)

        # 3) Player impact adjustments
        adj_h = self.pi.team_adjustment(home_team_id, match_id=match_id)
        adj_a = self.pi.team_adjustment(away_team_id, match_id=match_id)
        lam_h = float(np.exp(np.log(max(lam_h, 1e-3)) + adj_h))
        lam_a = float(np.exp(np.log(max(lam_a, 1e-3)) + adj_a))

        # Re-aplicar matriz DC con lambdas ajustadas
        m = dc_scoreline_matrix(lam_h, lam_a, self.dc.rho, max_goals=max_goals)
        dc_p = {
            "home": float(np.tril(m, -1).sum()),
            "draw": float(np.trace(m)),
            "away": float(np.triu(m, 1).sum()),
        }

        # 3.5) Stacker (si está disponible)
        stack_p = {"home": 0.0, "draw": 0.0, "away": 0.0}
        if self.stacker is not None and self.w_stacker > 0:
            elo_h_rating = self.elo.get(home_name)
            elo_a_rating = self.elo.get(away_name)
            elo_diff = elo_h_rating + (0 if neutral else self.elo.home_adv) - elo_a_rating
            # Context features: at inference we don't have the per-match historical state
            # available cheaply, so we pass neutral priors (form 0.5, no h2h info).
            # The stacker still benefits from the base features it always sees.
            from agamotto.models.features import CONTEXT_FEATURE_NAMES
            ctx_neutral = np.zeros((1, len(CONTEXT_FEATURE_NAMES)), dtype=np.float32)
            # form_5 priors = 0.5
            ctx_neutral[0, 0] = 0.5  # home_form_5
            ctx_neutral[0, 1] = 0.5  # away_form_5
            ctx_neutral[0, 8] = 0.5  # h2h_home_pct
            feats = build_features(
                np.array([[elo_p["home"], elo_p["draw"], elo_p["away"]]], dtype=np.float32),
                np.array([[dc_p["home"], dc_p["draw"], dc_p["away"]]], dtype=np.float32),
                np.array([[lam_h, lam_a]], dtype=np.float32),
                np.array([elo_diff], dtype=np.float32),
                np.array([1.0 if neutral else 0.0], dtype=np.float32),
                context=ctx_neutral,
            )
            sp = self.stacker.predict_proba(feats)[0]
            stack_p = {"home": float(sp[0]), "draw": float(sp[1]), "away": float(sp[2])}

        # 4) Combinar Elo + DC + Stacker
        p = {
            "home": self.w_elo * elo_p["home"] + self.w_dc * dc_p["home"] + self.w_stacker * stack_p["home"],
            "draw": self.w_elo * elo_p["draw"] + self.w_dc * dc_p["draw"] + self.w_stacker * stack_p["draw"],
            "away": self.w_elo * elo_p["away"] + self.w_dc * dc_p["away"] + self.w_stacker * stack_p["away"],
        }
        # Renormaliza
        s = sum(p.values())
        p = {k: v / s for k, v in p.items()}

        # 5) Calibrar
        if self.calibrator is not None and self.calibrator.fitted:
            p = self.calibrator.transform(p)

        # 6) Markets
        p_over_2_5 = float(np.triu(_indicator_over(max_goals + 1, 2), 0).T.flatten() @ m.flatten())
        p_btts = float(_btts_prob(m))

        # 7) Top factors (explainability simple)
        factors = self._top_factors(elo_p, dc_p, adj_h, adj_a, home_name, away_name)

        # 8) Top scorelines
        top_scorelines = _top_scorelines(m, k=10)

        return {
            "p_home": p["home"], "p_draw": p["draw"], "p_away": p["away"],
            "lambda_home": lam_h, "lambda_away": lam_a,
            "expected_goals_home": lam_h, "expected_goals_away": lam_a,
            "p_over_2_5": p_over_2_5, "p_btts": p_btts,
            "scoreline_matrix": m,
            "top_scorelines": top_scorelines,
            "top_factors": factors,
            "model_version": self.version,
        }

    def _top_factors(
        self, elo_p: dict, dc_p: dict, adj_h: float, adj_a: float, hn: str, an: str,
    ) -> list[dict]:
        h_rating = self.elo.get(hn)
        a_rating = self.elo.get(an)
        diff = h_rating - a_rating
        factors = [
            {"name": "elo_diff", "value": round(diff, 1),
             "direction": "home" if diff > 0 else "away" if diff < 0 else "neutral",
             "weight": float(abs(diff) / 400)},
        ]
        if adj_h != 0 or adj_a != 0:
            factors.append({
                "name": "lineup_strength_diff",
                "value": round((adj_h - adj_a) * 100, 1),
                "direction": "home" if adj_h > adj_a else "away",
                "weight": float(abs(adj_h - adj_a)),
            })
        # Modelo desacuerdo
        disagreement = abs(elo_p["home"] - dc_p["home"])
        if disagreement > 0.05:
            factors.append({
                "name": "model_disagreement",
                "value": round(disagreement, 3),
                "direction": "neutral",
                "weight": float(disagreement),
            })
        factors.sort(key=lambda x: -x["weight"])
        return factors[:5]

    def to_dict(self) -> dict:
        return {
            "elo": self.elo.to_dict(),
            "dc": self.dc.to_dict(),
            "pi": self.pi.to_dict(),
            "calibrator": None,  # se carga aparte
            "w_elo": self.w_elo, "w_dc": self.w_dc,
            "version": self.version,
            "team_name_map": self.team_name_map,
        }


def _top_scorelines(m: np.ndarray, k: int = 10) -> list[dict]:
    flat = [(i, j, float(m[i, j])) for i in range(m.shape[0]) for j in range(m.shape[1])]
    flat.sort(key=lambda x: -x[2])
    return [{"score": f"{i}-{j}", "p": p} for i, j, p in flat[:k]]


def _indicator_over(n: int, k: int) -> np.ndarray:
    """Matriz indicador de total > k goals."""
    out = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            out[i, j] = 1.0 if i + j > k else 0.0
    return out


def _btts_prob(m: np.ndarray) -> float:
    total = 0.0
    for i in range(1, m.shape[0]):
        for j in range(1, m.shape[1]):
            total += m[i, j]
    return float(total)


def build(
    elo_version: str = "elo_0.1.0",
    dc_version: str = "dixon_coles_0.1.0",
    pi_version: str = "player_impact_0.1.0",
    calibrator_version: str | None = None,
    use_optimal: bool = True,
) -> AgamottoEnsemble:
    """Construye el ensemble. Si `use_optimal` y hay artefactos guardados
    por `agamotto train optimize`, los carga (stacker + pesos + calibrador)."""
    import json
    elo_m = load_elo(elo_version)
    dc_m = load_dc(dc_version)
    try:
        pi_m = load_pi(pi_version)
    except FileNotFoundError:
        log.warning("No player impact model found, using empty.")
        pi_m = PlayerImpactModel()

    # Defaults
    w_elo, w_dc, w_stacker = 0.25, 0.75, 0.0
    stacker = None
    cal = None
    version = "agamotto_ensemble_0.1.0"

    # Try to load optimized artifacts
    weights_path = settings.processed_dir / "ensemble_weights.json"
    if use_optimal and weights_path.exists():
        with open(weights_path, encoding="utf-8") as f:
            w = json.load(f)
        w_elo = float(w["w_elo"])
        w_dc = float(w["w_dc"])
        w_stacker = float(w["w_stacker"])
        try:
            # Try v0.2 first (with context features); fall back to v0.1
            try:
                stacker = StackerModel.load("stacker_0.2.0")
                version = "agamotto_ensemble_0.3.0"
            except FileNotFoundError:
                stacker = StackerModel.load("stacker_0.1.0")
                version = "agamotto_ensemble_0.2.0"
            log.info("Loaded optimal ensemble · weights Elo=%.3f DC=%.3f Stacker=%.3f",
                     w_elo, w_dc, w_stacker)
        except FileNotFoundError:
            stacker = None
            w_stacker = 0.0
            # Renormalize elo+dc to sum to 1
            tot = w_elo + w_dc
            if tot > 0:
                w_elo /= tot; w_dc /= tot

    # Calibrator: optimal first, then explicit
    if use_optimal:
        try:
            cal = IsotonicCalibrator.load("calibrator_optimal_0.1.0")
        except FileNotFoundError:
            cal = None
    if cal is None and calibrator_version:
        try:
            cal = IsotonicCalibrator.load(calibrator_version)
        except FileNotFoundError:
            cal = None

    # Build team_id → name map desde DB
    from sqlalchemy import select

    from agamotto.db.models import Team
    with get_session() as s:
        rows = s.execute(select(Team.team_id, Team.name)).all()
    team_name_map = {tid: name for tid, name in rows}

    return AgamottoEnsemble(
        elo=elo_m, dc=dc_m, pi=pi_m,
        calibrator=cal, stacker=stacker,
        w_elo=w_elo, w_dc=w_dc, w_stacker=w_stacker,
        version=version, team_name_map=team_name_map,
    )


def save(ens: AgamottoEnsemble) -> str:
    path = settings.processed_dir / f"{ens.version}.joblib"
    joblib.dump(ens.to_dict(), path)
    with get_session() as s:
        mv = s.get(ModelVersion, ens.version)
        if mv:
            mv.artifact_path = str(path)
        else:
            s.add(ModelVersion(
                model_version_id=ens.version, family="ensemble",
                params={"w_elo": ens.w_elo, "w_dc": ens.w_dc},
                metrics={},
                artifact_path=str(path),
            ))
    log.info("Saved ensemble %s -> %s", ens.version, path)
    return str(path)
