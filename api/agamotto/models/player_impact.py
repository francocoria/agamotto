"""Player Impact Model.

Calcula rating por jugador y ajuste de fuerza por lineup.
Si no hay datos de jugador, devuelve ajustes 0 (modelo se reduce a team-level).

Cuando el usuario ingiere stats reales de jugador, la fórmula se enriquece.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import joblib
import numpy as np
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import Lineup, LineupPlayer, ModelVersion, Player

log = get_logger(__name__)


# Pesos por posición para agregar lineup strength
POSITION_WEIGHTS = {
    "GK": 1.2,
    "DF": 1.0,
    "MF": 1.1,
    "FW": 1.2,
}


@dataclass
class PlayerImpactModel:
    # Player rating en una escala normalizada (0-100) centrada en 50.
    player_ratings: dict[str, float] = field(default_factory=dict)
    # Pesos w_i del player_rating (ridge-learned cuando hay datos)
    feature_weights: dict[str, float] = field(default_factory=lambda: {
        "club_recent": 0.30,
        "national_team": 0.20,
        "league_quality": 0.15,
        "form_and_minutes": 0.15,
        "position_adj": 0.10,
        "set_piece": 0.05,
        "injury_risk": -0.05,
    })
    # Cuánto baja la fuerza del equipo si falta el jugador top
    star_dependence_alpha: float = 0.05
    version: str = "player_impact_0.1.0"

    # -------- core API --------

    def rating(self, player_id: str) -> float:
        return self.player_ratings.get(player_id, 50.0)

    def lineup_strength(self, player_ids: list[str], positions: list[str] | None = None) -> float:
        """Devuelve el rating agregado del XI ponderado por posición.
        Score 0-100 centrado en 50."""
        if not player_ids:
            return 50.0
        if positions is None:
            positions = ["MF"] * len(player_ids)
        weights = np.array([POSITION_WEIGHTS.get(p, 1.0) for p in positions])
        ratings = np.array([self.rating(pid) for pid in player_ids])
        return float((ratings * weights).sum() / weights.sum())

    def team_adjustment(
        self,
        team_id: str,
        match_id: str | None = None,
        baseline_xi_ids: list[str] | None = None,
        baseline_positions: list[str] | None = None,
    ) -> float:
        """Devuelve un offset multiplicativo aplicado al lambda Poisson del equipo.

        Si no hay datos de plantel, devuelve 0 (sin ajuste).
        Si hay XI: compara fuerza vs baseline neutro (50.0) y devuelve un delta
        en escala log para que se sume al exponente.
        """
        xi = self._resolve_xi(team_id, match_id, baseline_xi_ids)
        if not xi:
            return 0.0
        strength = self.lineup_strength(*xi)
        # delta log-lambda: 1 punto de strength sobre baseline 50 ~ 1% más goles
        delta = (strength - 50.0) * 0.01
        return delta

    def counterfactual_remove_player(
        self, team_id: str, player_id: str, replacement_id: str | None = None,
        match_id: str | None = None,
    ) -> dict:
        """Devuelve estimación de cambio en strength del equipo si se saca al jugador."""
        xi, positions = self._resolve_xi(team_id, match_id) or ([], [])
        if not xi or player_id not in xi:
            return {"applied": False, "delta_strength": 0.0}
        idx = xi.index(player_id)
        new_xi = list(xi)
        new_pos = list(positions)
        if replacement_id:
            new_xi[idx] = replacement_id
        else:
            new_xi.pop(idx)
            new_pos.pop(idx)
        old = self.lineup_strength(xi, positions)
        new = self.lineup_strength(new_xi, new_pos)
        return {
            "applied": True,
            "delta_strength": new - old,
            "old_strength": old,
            "new_strength": new,
        }

    # -------- internals --------

    def _resolve_xi(
        self, team_id: str, match_id: str | None, baseline: list[str] | None = None,
    ) -> tuple[list[str], list[str]] | None:
        if baseline:
            return baseline, ["MF"] * len(baseline)
        if not match_id:
            return None
        with get_session() as s:
            lu = s.execute(
                select(Lineup).where(Lineup.match_id == match_id, Lineup.team_id == team_id)
                .order_by(Lineup.captured_at.desc())
            ).scalars().first()
            if lu is None:
                return None
            players = s.execute(
                select(LineupPlayer.player_id, LineupPlayer.position)
                .where(LineupPlayer.lineup_id == lu.lineup_id, LineupPlayer.is_starter.is_(True))
            ).all()
        if not players:
            return None
        return [p[0] for p in players], [p[1] or "MF" for p in players]

    def to_dict(self) -> dict:
        return {
            "player_ratings": self.player_ratings,
            "feature_weights": self.feature_weights,
            "star_dependence_alpha": self.star_dependence_alpha,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "PlayerImpactModel":
        return cls(**{k: v for k, v in d.items() if k in {
            "player_ratings", "feature_weights", "star_dependence_alpha", "version",
        }})


def train_from_market_values() -> PlayerImpactModel:
    """Bootstrap inicial: asigna ratings basados en valor de mercado o constantes."""
    with get_session() as s:
        players = s.execute(select(Player.player_id, Player.market_value_eur)).all()
    if not players:
        log.warning("No players in DB. Returning empty model.")
        return PlayerImpactModel(player_ratings={})
    ratings: dict[str, float] = {}
    mvs = [p[1] for p in players if p[1]]
    if mvs:
        max_mv = max(mvs)
        for pid, mv in players:
            if mv:
                # Escala log de valor de mercado a 30..90
                r = 30 + 60 * (np.log1p(mv) / np.log1p(max_mv))
                ratings[pid] = float(r)
            else:
                ratings[pid] = 50.0
    else:
        for pid, _ in players:
            ratings[pid] = 50.0
    return PlayerImpactModel(player_ratings=ratings)


def save(model: PlayerImpactModel) -> str:
    path = settings.processed_dir / f"{model.version}.joblib"
    joblib.dump(model.to_dict(), path)
    with get_session() as s:
        mv = s.get(ModelVersion, model.version)
        if mv:
            mv.metrics = {"players": len(model.player_ratings)}
            mv.artifact_path = str(path)
        else:
            s.add(ModelVersion(
                model_version_id=model.version, family="player-impact",
                params={"star_dependence_alpha": model.star_dependence_alpha},
                metrics={"players": len(model.player_ratings)},
                artifact_path=str(path),
            ))
    return str(path)


def load(version: str = "player_impact_0.1.0") -> PlayerImpactModel:
    path = settings.processed_dir / f"{version}.joblib"
    return PlayerImpactModel.from_dict(joblib.load(path))
