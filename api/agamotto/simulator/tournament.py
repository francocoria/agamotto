"""Monte Carlo simulator del Mundial 2026.

Para cada iteración:
  1) Simula scorelines de fase de grupos.
  2) Calcula tabla de cada grupo (puntos, DG, GF, h2h aproximado, sorteo).
  3) Extrae winners (12), runners-up (12), best thirds (8).
  4) Asigna a bracket (32avos).
  5) Simula 32avos → octavos → cuartos → semis → final.
  6) Persiste resultado de cada match y campeón.

Agrega:
  - Por equipo: p_group_winner, p_runner_up, p_best_third, p_round_X, p_champion, modal_path.
  - Por partido: distribución de resultados, lambdas, scoreline esperado.
  - Por torneo: distribución de campeones, partidos pivote.
  - Sample de N universos para vista multiverso.
"""

from __future__ import annotations

import json
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime

import numpy as np
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import Match, ModelVersion, Prediction, Simulation
from agamotto.models import ensemble
from agamotto.models.ensemble import AgamottoEnsemble
from agamotto.simulator.bracket import (
    BEST_THIRDS_SLOTS,
    FINAL_PAIR_FROM_SF,
    GROUP_LABELS,
    QUARTER_PAIRS_FROM_R16,
    ROUND_16_PAIRS_FROM_R32,
    ROUND_32_PAIRS,
    SEMI_PAIRS_FROM_QF,
)

log = get_logger(__name__)

STAGES = ["round_32", "round_16", "quarter", "semi", "final"]


# ---------------- helpers ----------------

def _sample_scoreline(rng: np.random.Generator, scoreline_matrix: np.ndarray) -> tuple[int, int]:
    flat = scoreline_matrix.flatten()
    flat = flat / flat.sum()
    idx = int(rng.choice(len(flat), p=flat))
    n = scoreline_matrix.shape[1]
    return idx // n, idx % n


def _sample_winner_knockout(
    rng: np.random.Generator, scoreline_matrix: np.ndarray, p_proba: dict, home: str, away: str,
) -> tuple[str, int, int]:
    """Devuelve (winner, hs, as_) decidiendo prórroga + penales si empate."""
    hs, as_ = _sample_scoreline(rng, scoreline_matrix)
    if hs > as_:
        return home, hs, as_
    if hs < as_:
        return away, hs, as_
    # Empate: ET + penales como coin flip ajustado por p_home/p_away
    p_h = p_proba["home"] / (p_proba["home"] + p_proba["away"]) if (p_proba["home"] + p_proba["away"]) > 0 else 0.5
    if rng.random() < p_h:
        return home, hs, as_  # registramos empate en regulación; ganó por pens
    return away, hs, as_


# ---------------- core ----------------

@dataclass
class GroupResult:
    team_id: str
    points: int
    gf: int
    ga: int
    gd: int


def _simulate_group(rng: np.random.Generator, teams: list[str], match_preds: dict) -> list[GroupResult]:
    """Simula los 6 matches del grupo y devuelve la tabla ordenada."""
    standings = {t: [0, 0, 0] for t in teams}  # [pts, gf, ga]
    # Pares round-robin
    pairs = [
        (teams[0], teams[1]), (teams[2], teams[3]),
        (teams[0], teams[2]), (teams[1], teams[3]),
        (teams[0], teams[3]), (teams[1], teams[2]),
    ]
    for h, a in pairs:
        pred = match_preds.get((h, a))
        if pred is None:
            continue
        hs, as_ = _sample_scoreline(rng, pred["scoreline_matrix"])
        standings[h][1] += hs
        standings[h][2] += as_
        standings[a][1] += as_
        standings[a][2] += hs
        if hs > as_:
            standings[h][0] += 3
        elif hs < as_:
            standings[a][0] += 3
        else:
            standings[h][0] += 1
            standings[a][0] += 1
    rows = [GroupResult(t, p[0], p[1], p[2], p[1] - p[2]) for t, p in standings.items()]
    rows.sort(key=lambda r: (-r.points, -r.gd, -r.gf, rng.random()))
    return rows


@dataclass
class TournamentSimulator:
    ens: AgamottoEnsemble
    tournament_id: str = "WC2026"
    rng_seed: int = 42

    # Lazy-loaded
    _matches: list = None
    _group_teams: dict[str, list[str]] = None
    _match_preds: dict = None
    _knockout_match_ids: dict[str, list[str]] = None

    def load(self) -> None:
        with get_session() as s:
            rows = s.execute(
                select(
                    Match.match_id, Match.stage, Match.group_label,
                    Match.home_team_id, Match.away_team_id, Match.match_number,
                ).where(Match.tournament_id == self.tournament_id)
                .order_by(Match.match_number)
            ).all()
        self._matches = [{
            "match_id": r[0], "stage": r[1], "group_label": r[2],
            "home": r[3], "away": r[4], "match_number": r[5],
        } for r in rows]
        # Group teams
        group_teams: dict[str, list[str]] = defaultdict(list)
        for m in self._matches:
            if m["stage"] != "group" or not m["group_label"]:
                continue
            for tid in (m["home"], m["away"]):
                if tid and tid not in group_teams[m["group_label"]]:
                    group_teams[m["group_label"]].append(tid)
        self._group_teams = dict(group_teams)

        # Precompute group match predictions
        preds = {}
        for m in self._matches:
            if m["stage"] != "group":
                continue
            h, a = m["home"], m["away"]
            if not (h and a):
                continue
            p = self.ens.predict(h, a, neutral=True, match_id=m["match_id"])
            preds[(h, a)] = p
            preds[m["match_id"]] = p
        self._match_preds = preds

        # Knockout match IDs por stage en orden
        ko = defaultdict(list)
        for m in self._matches:
            if m["stage"] in STAGES or m["stage"] == "third_place":
                ko[m["stage"]].append(m["match_id"])
        self._knockout_match_ids = dict(ko)

    # ---------- single iteration ----------

    def _run_iteration(self, rng: np.random.Generator) -> dict:
        # Group stage
        winners: list[str] = []
        runners_up: list[str] = []
        thirds: list[tuple[str, GroupResult, str]] = []  # (team, gr, group_label)
        group_results: dict[str, list[GroupResult]] = {}

        for label in GROUP_LABELS:
            teams = self._group_teams.get(label, [])
            if len(teams) != 4:
                continue
            standings = _simulate_group(rng, teams, self._match_preds)
            group_results[label] = standings
            winners.append(standings[0].team_id)
            runners_up.append(standings[1].team_id)
            thirds.append((standings[2].team_id, standings[2], label))

        # 8 best thirds
        thirds.sort(key=lambda x: (-x[1].points, -x[1].gd, -x[1].gf, rng.random()))
        best_third_teams = {label: team for team, _, label in thirds[:8]}

        # Build bracket teams
        team_for_slot: dict[str, str] = {}
        for i, label in enumerate(GROUP_LABELS):
            if i < len(winners):
                team_for_slot[f"W_{label}"] = winners[i]
            if i < len(runners_up):
                team_for_slot[f"R_{label}"] = runners_up[i]
        # T_X slots — usamos el orden BEST_THIRDS_SLOTS para asignar mejores terceros
        sorted_thirds_teams = [t[0] for t in thirds[:8]]
        for slot, team in zip(BEST_THIRDS_SLOTS, sorted_thirds_teams):
            team_for_slot[f"T_{slot}"] = team

        # Round 32
        r32_teams: list[tuple[str, str]] = []
        for h_slot, a_slot in ROUND_32_PAIRS:
            h = team_for_slot.get(h_slot)
            a = team_for_slot.get(a_slot)
            r32_teams.append((h, a))

        # Simulate knockout chain
        ko_results = {}  # stage -> [(home, away, winner, hs, as_)]
        prev_round = r32_teams
        prev_winners: list[str] = []
        for stage, pairs_idx in [
            ("round_32", [(i,) for i in range(16)]),
            ("round_16", ROUND_16_PAIRS_FROM_R32),
            ("quarter", QUARTER_PAIRS_FROM_R16),
            ("semi", SEMI_PAIRS_FROM_QF),
        ]:
            stage_results = []
            stage_winners: list[str] = []
            if stage == "round_32":
                matchups = prev_round
            else:
                matchups = [(prev_winners[a], prev_winners[b]) for a, b in pairs_idx]
            for (h, a) in matchups:
                winner, hs, as_ = self._simulate_ko_match(rng, h, a)
                stage_results.append((h, a, winner, hs, as_))
                stage_winners.append(winner)
            ko_results[stage] = stage_results
            prev_winners = stage_winners

        # Final
        f_pair = (prev_winners[FINAL_PAIR_FROM_SF[0]], prev_winners[FINAL_PAIR_FROM_SF[1]])
        winner, hs, as_ = self._simulate_ko_match(rng, *f_pair)
        ko_results["final"] = [(f_pair[0], f_pair[1], winner, hs, as_)]
        champion = winner

        return {
            "group_results": group_results,
            "winners": winners,
            "runners_up": runners_up,
            "best_thirds": best_third_teams,
            "ko_results": ko_results,
            "champion": champion,
        }

    def _simulate_ko_match(self, rng: np.random.Generator, home: str, away: str) -> tuple[str, int, int]:
        if not home or not away:
            return home or away, 0, 0
        pred = self._match_preds.get((home, away))
        if pred is None:
            pred = self.ens.predict(home, away, neutral=True)
            self._match_preds[(home, away)] = pred
        winner, hs, as_ = _sample_winner_knockout(
            rng, pred["scoreline_matrix"],
            {"home": pred["p_home"], "draw": pred["p_draw"], "away": pred["p_away"]},
            home, away,
        )
        return winner, hs, as_

    # ---------- multi-run ----------

    def run(self, n_runs: int = 10_000, store_universes: int = 50) -> dict:
        if self._matches is None:
            self.load()
        log.info("Running %d Monte Carlo iterations...", n_runs)

        rng = np.random.default_rng(self.rng_seed)
        # Aggregates
        all_teams: set[str] = set()
        for ts in self._group_teams.values():
            all_teams.update(ts)
        counters = {
            "group_winner": Counter(), "runner_up": Counter(), "best_third": Counter(),
            "round_32": Counter(), "round_16": Counter(), "quarter": Counter(),
            "semi": Counter(), "final": Counter(), "champion": Counter(),
        }
        # Modal path: tracking rivals por equipo y fase
        rival_history: dict[tuple[str, str], Counter] = defaultdict(Counter)
        # Match: counts de winners por match_id en knockout (template)
        ko_match_outcomes: dict[str, Counter] = defaultdict(Counter)

        sampled_universes = []

        for it in range(n_runs):
            res = self._run_iteration(rng)
            for t in res["winners"]:
                counters["group_winner"][t] += 1
            for t in res["runners_up"]:
                counters["runner_up"][t] += 1
            for _label, t in res["best_thirds"].items():
                counters["best_third"][t] += 1
            # Avance por fase
            r32_teams = set()
            for h_slot, a_slot in ROUND_32_PAIRS:
                pass  # se computa por team al observar resultados
            # Recorrer ko_results para contar avances
            r32 = res["ko_results"]["round_32"]
            r16_winners = [m[2] for m in res["ko_results"]["round_16"]]
            qf_winners = [m[2] for m in res["ko_results"]["quarter"]]
            sf_winners = [m[2] for m in res["ko_results"]["semi"]]
            f_winner = res["ko_results"]["final"][0][2]
            f_loser = res["ko_results"]["final"][0][0] if f_winner == res["ko_results"]["final"][0][1] else res["ko_results"]["final"][0][1]
            sf_losers = [m[0] if m[2] == m[1] else m[1] for m in res["ko_results"]["semi"]]

            # Quien jugó 32avos
            for h, a, *_ in r32:
                if h: counters["round_32"][h] += 1
                if a: counters["round_32"][a] += 1
            # Octavos
            for w in r16_winners:
                if w: counters["round_16"][w] += 0  # corregido abajo
            # Llegar a R16: ganadores de R32
            for h, a, w, *_ in r32:
                if w:
                    counters["round_16"][w] += 1
            # Llegar a QF: ganadores de R16
            for m in res["ko_results"]["round_16"]:
                counters["quarter"][m[2]] += 1
            for m in res["ko_results"]["quarter"]:
                counters["semi"][m[2]] += 1
            for m in res["ko_results"]["semi"]:
                counters["final"][m[2]] += 1
            counters["champion"][f_winner] += 1

            # KO match outcomes por slot (índice)
            for stage, results in res["ko_results"].items():
                for i, (h, a, w, hs, as_) in enumerate(results):
                    key = f"{stage}__{i}"
                    if w:
                        ko_match_outcomes[key][w] += 1

            if len(sampled_universes) < store_universes:
                sampled_universes.append({
                    "champion": f_winner,
                    "final": [f_winner, f_loser if f_loser else None],
                    "semis": sf_winners,
                    "winners": res["winners"][:3],  # solo guardamos algunos
                })

        # Build outputs
        team_outlook = {}
        for t in sorted(all_teams):
            team_outlook[t] = {
                "p_group_winner": counters["group_winner"][t] / n_runs,
                "p_runner_up": counters["runner_up"][t] / n_runs,
                "p_best_third": counters["best_third"][t] / n_runs,
                "p_round_32": counters["round_32"][t] / n_runs,
                "p_round_16": counters["round_16"][t] / n_runs,
                "p_quarter": counters["quarter"][t] / n_runs,
                "p_semi": counters["semi"][t] / n_runs,
                "p_final": counters["final"][t] / n_runs,
                "p_champion": counters["champion"][t] / n_runs,
            }

        champion_dist = [
            {"team": t, "p": c / n_runs}
            for t, c in counters["champion"].most_common()
        ]

        # Per-match predictions (group stage)
        match_predictions = {}
        for m in self._matches:
            if m["stage"] != "group":
                continue
            h, a = m["home"], m["away"]
            if not (h and a):
                continue
            p = self._match_preds.get((h, a))
            if not p:
                continue
            match_predictions[m["match_id"]] = {
                "match_id": m["match_id"],
                "home_team_id": h, "away_team_id": a,
                "p_home": p["p_home"], "p_draw": p["p_draw"], "p_away": p["p_away"],
                "lambda_home": p["lambda_home"], "lambda_away": p["lambda_away"],
                "p_over_2_5": p["p_over_2_5"], "p_btts": p["p_btts"],
                "top_scorelines": p["top_scorelines"],
                "top_factors": p["top_factors"],
            }

        return {
            "n_runs": n_runs,
            "team_outlook": team_outlook,
            "champion_distribution": champion_dist,
            "match_predictions": match_predictions,
            "ko_match_outcomes": {k: dict(v) for k, v in ko_match_outcomes.items()},
            "sampled_universes": sampled_universes,
            "model_version": self.ens.version,
        }


def run_simulation(n_runs: int | None = None, persist: bool = True, seed: int | None = None) -> dict:
    n = n_runs or settings.simulation_default_runs
    ens = ensemble.build()
    sim = TournamentSimulator(ens=ens, rng_seed=seed or settings.simulation_seed)
    sim.load()
    out = sim.run(n_runs=n)

    if persist:
        _persist_predictions(out, ens.version)
        _persist_simulation(out, ens.version)

    return out


def _persist_predictions(out: dict, model_version: str) -> None:
    """Guarda predicciones por partido (sobrescribe la última por modelo)."""
    with get_session() as s:
        # Ensure model_version exists
        if not s.get(ModelVersion, model_version):
            s.add(ModelVersion(model_version_id=model_version, family="ensemble"))
            s.flush()
        # Borra previas del mismo modelo
        from sqlalchemy import delete
        s.execute(delete(Prediction).where(Prediction.model_version_id == model_version))
        # Inserta nuevas
        for mp in out["match_predictions"].values():
            s.add(Prediction(
                match_id=mp["match_id"],
                model_version_id=model_version,
                p_home=mp["p_home"], p_draw=mp["p_draw"], p_away=mp["p_away"],
                lambda_home=mp["lambda_home"], lambda_away=mp["lambda_away"],
                expected_goals_home=mp["lambda_home"], expected_goals_away=mp["lambda_away"],
                p_over_2_5=mp["p_over_2_5"], p_btts=mp["p_btts"],
                scoreline_matrix={"top": mp["top_scorelines"]},
                top_factors=mp["top_factors"],
            ))


def _persist_simulation(out: dict, model_version: str) -> None:
    with get_session() as s:
        if not s.get(ModelVersion, model_version):
            s.add(ModelVersion(model_version_id=model_version, family="ensemble"))
            s.flush()
        aggregates = {
            "team_outlook": out["team_outlook"],
            "champion_distribution": out["champion_distribution"],
            "sampled_universes": out["sampled_universes"],
            "ko_match_outcomes": out["ko_match_outcomes"],
        }
        sim = Simulation(
            tournament_id="WC2026",
            model_version_id=model_version,
            n_runs=out["n_runs"],
            seed=settings.simulation_seed,
            aggregates=aggregates,
        )
        s.add(sim)
