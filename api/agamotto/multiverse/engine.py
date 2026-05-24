"""Multiverse Engine — el Ojo de Agamotto.

Aplica condiciones del usuario sobre una simulación y devuelve nuevas distribuciones.

Tipos de condición:
  - fix_result   : fija marcador exacto de un partido.
  - fix_winner   : fija el ganador de un partido (cualquier marcador compatible).
  - remove_player: marca a un jugador como ausente desde un match en adelante.
  - override_weather: ajusta clima de un partido (afecta lambdas).
  - swap_venue   : cambia sede de un partido.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np

from agamotto.core.logging import get_logger
from agamotto.models import ensemble
from agamotto.simulator.tournament import TournamentSimulator, _persist_simulation

log = get_logger(__name__)


ConditionType = Literal[
    "fix_result", "fix_winner", "remove_player", "override_weather", "swap_venue",
]


@dataclass
class Condition:
    type: ConditionType
    match_id: str | None = None
    home_score: int | None = None
    away_score: int | None = None
    winner_team_id: str | None = None
    team_id: str | None = None
    player_id: str | None = None
    venue_id: str | None = None
    temp_c: float | None = None
    humidity: float | None = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class MultiverseEngine:
    sim: TournamentSimulator
    conditions: list[Condition] = field(default_factory=list)

    def apply(self) -> None:
        """Modifica self.sim._match_preds para reflejar las condiciones."""
        if self.sim._match_preds is None:
            self.sim.load()
        for c in self.conditions:
            if c.type == "fix_result" and c.match_id and c.home_score is not None and c.away_score is not None:
                self._fix_result(c.match_id, c.home_score, c.away_score)
            elif c.type == "fix_winner" and c.match_id and c.winner_team_id:
                self._fix_winner(c.match_id, c.winner_team_id)
            elif c.type == "remove_player" and c.team_id and c.player_id:
                self._remove_player(c.team_id, c.player_id)
            elif c.type == "override_weather" and c.match_id and c.temp_c is not None:
                self._override_weather(c.match_id, c.temp_c, c.humidity)
            elif c.type == "swap_venue" and c.match_id and c.venue_id:
                pass  # placeholder

    # ---------- mutators ----------

    def _fix_result(self, match_id: str, hs: int, as_: int) -> None:
        pred = self.sim._match_preds.get(match_id)
        if not pred:
            return
        m = np.zeros_like(pred["scoreline_matrix"])
        m[hs, as_] = 1.0
        pred["scoreline_matrix"] = m
        pred["p_home"] = float(hs > as_)
        pred["p_draw"] = float(hs == as_)
        pred["p_away"] = float(hs < as_)
        pred["lambda_home"] = float(hs)
        pred["lambda_away"] = float(as_)

    def _fix_winner(self, match_id: str, winner_team_id: str) -> None:
        pred = self.sim._match_preds.get(match_id)
        if not pred:
            return
        m = pred["scoreline_matrix"].copy()
        # Buscar home/away teams del match
        match_meta = next((x for x in self.sim._matches if x["match_id"] == match_id), None)
        if not match_meta:
            return
        home, away = match_meta["home"], match_meta["away"]
        if winner_team_id == home:
            m = np.tril(m, -1)
        elif winner_team_id == away:
            m = np.triu(m, 1)
        else:
            return
        if m.sum() == 0:
            return
        m = m / m.sum()
        pred["scoreline_matrix"] = m
        pred["p_home"] = float(np.tril(m, -1).sum())
        pred["p_draw"] = float(np.trace(m))
        pred["p_away"] = float(np.triu(m, 1).sum())

    def _remove_player(self, team_id: str, player_id: str) -> None:
        # Reduce el rating del jugador a 0 dentro del PlayerImpactModel
        pi = self.sim.ens.pi
        if player_id in pi.player_ratings:
            pi.player_ratings[player_id] = 0.0
        # Recalcular predicciones de partidos donde participa este equipo
        for m in self.sim._matches:
            if m["stage"] not in {"group"}:
                continue
            if m["home"] != team_id and m["away"] != team_id:
                continue
            if not (m["home"] and m["away"]):
                continue
            self.sim._match_preds[(m["home"], m["away"])] = self.sim.ens.predict(
                m["home"], m["away"], neutral=True, match_id=m["match_id"],
            )

    def _override_weather(self, match_id: str, temp_c: float, humidity: float | None) -> None:
        # Heurística: temperatura alta (>30°C) reduce lambdas en ~5%
        pred = self.sim._match_preds.get(match_id)
        if not pred:
            return
        factor = 1.0
        if temp_c > 30:
            factor *= 0.95
        if humidity and humidity > 70:
            factor *= 0.97
        pred["lambda_home"] *= factor
        pred["lambda_away"] *= factor
        # Recompute matrix (Poisson product)
        from scipy import stats

        from agamotto.models.dixon_coles import dc_scoreline_matrix
        m = dc_scoreline_matrix(pred["lambda_home"], pred["lambda_away"],
                                self.sim.ens.dc.rho, max_goals=8)
        pred["scoreline_matrix"] = m
        pred["p_home"] = float(np.tril(m, -1).sum())
        pred["p_draw"] = float(np.trace(m))
        pred["p_away"] = float(np.triu(m, 1).sum())


def run_counterfactual(conditions: list[dict], n_runs: int = 10_000, persist: bool = False) -> dict:
    ens = ensemble.build()
    sim = TournamentSimulator(ens=ens)
    sim.load()
    engine = MultiverseEngine(sim=sim, conditions=[Condition(**c) for c in conditions])
    engine.apply()
    out = sim.run(n_runs=n_runs)
    out["conditions"] = conditions
    if persist:
        _persist_simulation(out, f"{ens.version}__cf")
    return out
