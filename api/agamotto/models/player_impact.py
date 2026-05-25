"""Player Impact Model.

Cada jugador tiene un rating en [20, 95] centrado en 50.
A nivel equipo, computamos lineup_strength promedio del XI titular (ponderado por posición).
Ese strength se traduce en un offset (en log-lambda) al ataque/defensa del equipo
en el ensemble — es decir, modifica los goles esperados por encima del baseline Elo/Poisson.

Soporta:
  - train_from_csv_squads: usa caps + edad + posición + titular del CSV
  - train_from_market_values: legacy (cuando había market_value_eur)
  - team_adjustment: devuelve el offset multiplicativo para un team_id

Estado por equipo (`team_lineup_strength`) se calcula una vez al entrenar
y se persiste como parte del modelo para no recalcular en cada predicción.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import joblib
import numpy as np
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import ModelVersion, Player, Squad, SquadPlayer

log = get_logger(__name__)


# Peso por posición al agregar lineup strength (porteros y defensa pesan parecido al medio)
POSITION_WEIGHTS = {"GK": 1.2, "DF": 1.0, "MF": 1.1, "FW": 1.2}


def compute_player_rating(
    caps: int, age: int, position: str, is_starter: bool,
    goals: int = 0, club: str = "",
) -> float:
    """Rating 20-95 basado en caps, goles, club, edad y posición.

    Componentes:
      - Caps-por-año (normaliza por edad): mide ritmo internacional
      - Goles (solo MF/FW): eficiencia ofensiva normalizada
      - Tier de club: proxy de calidad del entorno donde compite
      - Curva de edad: peak ~27
      - Bonus de titular
    """
    from agamotto.models.club_tiers import get_club_tier

    # 1. Caps por año de carrera senior (asume debut a los 18)
    senior_years = max(1, age - 18)
    caps_per_year = caps / senior_years
    caps_score = min(caps_per_year, 12) / 12 * 12  # 0..12 puntos

    # 2. Goles (solo cuenta para FW/MF con >=10 caps)
    goals_score = 0.0
    if position in ("FW", "MF") and caps >= 10:
        gpc = goals / max(caps, 1)
        target_gpc = 0.30 if position == "FW" else 0.12  # FW elite=0.3, MF elite=0.12
        goals_score = min(gpc / target_gpc, 1.5) * 6  # 0..9 puntos

    # 3. Calidad de club (tier 1 = elite Champions, tier 4 = otros)
    tier = get_club_tier(club) if club else 3.5
    club_score = (4.0 - tier) * 3.0  # tier 1 = +9, tier 4 = 0

    # 4. Curva de edad: peak 27, decae 6 puntos en los extremos
    age_pen = -((age - 27) ** 2) / 8

    # 5. Sesgo posicional + titular
    pos_bias = {"GK": 0.0, "DF": 0.0, "MF": 1.0, "FW": 2.0}.get(position, 0.0)
    starter_bonus = 3.0 if is_starter else 0.0

    r = 50 + caps_score + goals_score + club_score + age_pen + pos_bias + starter_bonus
    return max(20.0, min(95.0, r))


@dataclass
class PlayerImpactModel:
    player_ratings: dict[str, float] = field(default_factory=dict)
    # Por equipo: strength del XI titular (centrado en 50)
    team_lineup_strength: dict[str, float] = field(default_factory=dict)
    # Cuánto sensitivity tiene lambda al strength_diff. 0.003 = +1 punto strength => +0.3% goles
    # Conservador para que no domine al Elo (que tiene 49k partidos de señal real).
    impact_alpha: float = 0.003
    version: str = "player_impact_0.2.0"

    def rating(self, player_id: str) -> float:
        return self.player_ratings.get(player_id, 50.0)

    def team_strength(self, team_id: str) -> float:
        return self.team_lineup_strength.get(team_id, 50.0)

    def team_adjustment(self, team_id: str, match_id: str | None = None, **_) -> float:
        """Offset log-lambda para el equipo. Centrado en 0 (cuando strength=50)."""
        if not self.team_lineup_strength:
            return 0.0
        s = self.team_strength(team_id)
        return (s - 50.0) * self.impact_alpha

    def lineup_strength(self, player_ids: list[str], positions: list[str] | None = None) -> float:
        if not player_ids:
            return 50.0
        if positions is None:
            positions = ["MF"] * len(player_ids)
        weights = np.array([POSITION_WEIGHTS.get(p, 1.0) for p in positions])
        ratings = np.array([self.rating(pid) for pid in player_ids])
        return float((ratings * weights).sum() / weights.sum())

    def counterfactual_remove_player(self, team_id: str, player_id: str,
                                     replacement_id: str | None = None,
                                     match_id: str | None = None) -> dict:
        # Necesitaríamos la lista actual del XI; placeholder usando team_strength
        base = self.team_strength(team_id)
        delta = -self.rating(player_id) * 0.08  # heurística: -8% del rating del jugador
        if replacement_id:
            delta += self.rating(replacement_id) * 0.08
        new_s = max(20.0, min(95.0, base + delta))
        return {
            "applied": True, "delta_strength": new_s - base,
            "old_strength": base, "new_strength": new_s,
        }

    def to_dict(self) -> dict:
        return {
            "player_ratings": self.player_ratings,
            "team_lineup_strength": self.team_lineup_strength,
            "impact_alpha": self.impact_alpha,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "PlayerImpactModel":
        return cls(
            player_ratings=dict(d.get("player_ratings", {})),
            team_lineup_strength=dict(d.get("team_lineup_strength", {})),
            impact_alpha=float(d.get("impact_alpha", 0.005)),
            version=d.get("version", "player_impact_0.2.0"),
        )


# ----------------- training -----------------

def train_from_db() -> PlayerImpactModel:
    """Calcula rating por jugador y strength por equipo a partir de Player + SquadPlayer."""
    with get_session() as s:
        # Latest squad per team (assume one squad per team for WC2026)
        squads = s.execute(select(Squad)).scalars().all()
        if not squads:
            log.warning("No squads in DB. Returning empty model.")
            return PlayerImpactModel()

        # Build per-team list of (player, is_starter)
        team_players: dict[str, list[tuple[Player, SquadPlayer]]] = {}
        for sq in squads:
            sps = s.execute(
                select(SquadPlayer).where(SquadPlayer.squad_id == sq.squad_id)
            ).scalars().all()
            roster = []
            for sp in sps:
                p = s.get(Player, sp.player_id)
                if p:
                    roster.append((p, sp))
            team_players[sq.team_id] = roster

    ratings: dict[str, float] = {}
    team_strength: dict[str, float] = {}

    for team_id, roster in team_players.items():
        # Per-player rating
        for p, sp in roster:
            is_starter = (sp.is_starter_prob or 0) >= 0.5
            # Use caps from player (we don't store it explicitly; using a heuristic from market or 0)
            # In our CSV ingest we don't persist caps in the player row, so use defaults
            caps = 0
            # Recover caps if we stashed them on full_name (we didn't). Use position bias only.
            r = compute_player_rating(
                caps=caps,
                age=_age_of(p),
                position=p.position or "MF",
                is_starter=is_starter,
            )
            ratings[p.player_id] = r

        # Lineup strength = avg of titulares pondered by position
        titulares = [(p, sp) for p, sp in roster if (sp.is_starter_prob or 0) >= 0.5]
        if not titulares:
            team_strength[team_id] = 50.0
            continue
        weights = np.array([POSITION_WEIGHTS.get(p.position or "MF", 1.0) for p, _ in titulares])
        rs = np.array([ratings[p.player_id] for p, _ in titulares])
        team_strength[team_id] = float((rs * weights).sum() / weights.sum())

    log.info("Player Impact trained: %d players, %d teams", len(ratings), len(team_strength))
    return PlayerImpactModel(player_ratings=ratings, team_lineup_strength=team_strength)


def _age_of(p: Player) -> int:
    if p.dob:
        from datetime import date as _date
        return _date.today().year - p.dob.year
    return 26  # prior


def train_from_csv_squads(csv_path: str | None = None) -> PlayerImpactModel:
    """Re-lee el CSV y entrena con las edades/caps directos (más fiel)."""
    import csv as _csv
    import unicodedata as _ud
    from pathlib import Path
    from agamotto.ingestion.squads_csv import map_country, map_position

    # Preferir Wikipedia scrape si existe, fallback a seed sintético
    if csv_path:
        p = Path(csv_path)
    else:
        wiki = settings.raw_dir / "squads_wikipedia.csv"
        seed = settings.raw_dir / "squads_2026.csv"
        p = wiki if wiki.exists() else seed
    log.info("Player Impact training source: %s", p)
    if not p.exists():
        log.warning("CSV no encontrado en %s — usando DB.", p)
        return train_from_db()

    ratings: dict[str, float] = {}
    team_data: dict[str, list[tuple[str, str, float]]] = {}
    with open(p, encoding="utf-8-sig") as f:
        for r in _csv.DictReader(f):
            m = map_country(r["Pais"])
            if not m:
                continue
            tid = m[0]
            name = r["Jugador"].strip()
            pos = map_position(r["Posicion_General"])
            age = int(r["Edad"]) if r["Edad"] else 26
            caps = int(r["Partidos_Internacionales"]) if r["Partidos_Internacionales"] else 0
            goals = int(r.get("Goles_Internacionales") or 0)
            club = (r.get("Club_Actual") or "").strip()
            is_starter = (_ud.normalize("NFKD", r["Es_Titular"]).encode("ascii","ignore").decode().lower().strip()
                          in ("si", "sí"))
            rating = compute_player_rating(caps, age, pos, is_starter, goals=goals, club=club)
            from agamotto.core.ids import player_id as _pid
            pid = _pid(name)
            ratings[pid] = rating
            team_data.setdefault(tid, []).append((pid, pos, rating if is_starter else 0.0))

    team_strength_raw: dict[str, float] = {}
    for tid, players in team_data.items():
        starters = [(pid, pos, r) for pid, pos, r in players if r > 0]
        if not starters:
            team_strength_raw[tid] = 50.0
            continue
        weights = np.array([POSITION_WEIGHTS.get(pos, 1.0) for _, pos, _ in starters])
        rs = np.array([r for _, _, r in starters])
        team_strength_raw[tid] = float((rs * weights).sum() / weights.sum())

    # Re-center solo: median = 50. Sin amplificar (la señal de los datos sintéticos es débil
    # y amplificarla artificialmente puede contradecir el Elo).
    raw_vals = np.array(list(team_strength_raw.values()))
    med = float(np.median(raw_vals))
    std = float(np.std(raw_vals))
    log.info("Raw strengths: median=%.2f std=%.2f range [%.2f, %.2f]",
             med, std, raw_vals.min(), raw_vals.max())
    team_strength = {tid: 50.0 + (s - med) for tid, s in team_strength_raw.items()}

    log.info("Player Impact (CSV): %d unique players, %d teams · strength range [%.1f, %.1f]",
             len(ratings), len(team_strength),
             min(team_strength.values()), max(team_strength.values()))
    return PlayerImpactModel(player_ratings=ratings, team_lineup_strength=team_strength)


# Backwards-compat
def train_from_market_values() -> PlayerImpactModel:
    """Prefiere data scrapeada de Wikipedia, fallback a seed sintético, luego DB."""
    return train_from_csv_squads()  # picks wiki vs seed internally


def save(model: PlayerImpactModel) -> str:
    path = settings.processed_dir / f"{model.version}.joblib"
    joblib.dump(model.to_dict(), path)
    with get_session() as s:
        mv = s.get(ModelVersion, model.version)
        if mv:
            mv.metrics = {"players": len(model.player_ratings), "teams": len(model.team_lineup_strength)}
            mv.artifact_path = str(path)
        else:
            s.add(ModelVersion(
                model_version_id=model.version, family="player-impact",
                params={"impact_alpha": model.impact_alpha},
                metrics={"players": len(model.player_ratings), "teams": len(model.team_lineup_strength)},
                artifact_path=str(path),
            ))
    return str(path)


def load(version: str = "player_impact_0.2.0") -> PlayerImpactModel:
    path = settings.processed_dir / f"{version}.joblib"
    if not path.exists():
        legacy = settings.processed_dir / "player_impact_0.1.0.joblib"
        if legacy.exists():
            d = joblib.load(legacy)
            return PlayerImpactModel.from_dict(d)
        raise FileNotFoundError(path)
    return PlayerImpactModel.from_dict(joblib.load(path))
