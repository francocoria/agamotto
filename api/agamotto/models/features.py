"""Feature engineering — calcula features contextuales por partido sobre el historial.

Soporta más de 200 combinaciones basadas en estadísticas avanzadas (tiros, posesión, corners, tarjetas, faltas, goles tempranos).
Todo respeta lock temporal: para un partido con fecha T, solo se usan partidos < T.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import date
from dataclasses import dataclass, field

import numpy as np
import pandas as pd


BASE_METRICS = {
    "gf": 1.2,
    "ga": 1.2,
    "possession": 0.5,
    "shots": 10.0,
    "sot": 3.5,
    "corners": 4.5,
    "early_goals": 0.08,
    "fouls": 13.0,
    "yellows": 1.5,
    "reds": 0.05,
}


@dataclass
class TeamState:
    """Estado acumulado de un equipo hasta una fecha de corte, incluyendo estadísticas avanzadas."""
    matches_played: int = 0
    last_match_date: date | None = None
    
    # Form: lista de "points" (3=W, 1=D, 0=L) ordenada cronológicamente
    recent_pts: list[int] = field(default_factory=list)
    
    # Listas de estadísticas rolling (máximo últimas 20 para eficiencia)
    recent_gf: list[int] = field(default_factory=list)
    recent_ga: list[int] = field(default_factory=list)
    recent_possession: list[float] = field(default_factory=list)
    recent_shots: list[int] = field(default_factory=list)
    recent_sot: list[int] = field(default_factory=list)
    recent_corners: list[int] = field(default_factory=list)
    recent_early_goals: list[int] = field(default_factory=list)
    recent_fouls: list[int] = field(default_factory=list)
    recent_yellows: list[int] = field(default_factory=list)
    recent_reds: list[int] = field(default_factory=list)

    def update(self, gf: int, ga: int, match_date: date, stats: dict | None = None):
        pts = 3 if gf > ga else 1 if gf == ga else 0
        self.recent_pts.append(pts)
        self.recent_gf.append(gf)
        self.recent_ga.append(ga)
        
        # Obtener estadísticas del JSON stats o usar valores por defecto
        home_stats = stats.get("home", {}) if stats else {}
        away_stats = stats.get("away", {}) if stats else {}
        
        # Nota: el stats JSON contiene "home" y "away". Necesitamos saber si este equipo
        # es el local o el visitante. Asumimos local si gf matches home score, o lo inferimos
        # por simplicidad desde el dict. Si no viene, usamos defaults de BASE_METRICS.
        is_home_side = True
        if stats:
            # Si hay stats, podemos inferir de cuál lado es este equipo comparando los goles
            if home_stats.get("shots") is not None:
                # Si los goles no coinciden unívocamente, miramos goles del JSON
                pass
        
        # Para simplificar: el que llama al update pasará las estadísticas ya filtradas para ESTE equipo
        # como un dict plano (ej. stats={"possession": 0.55, "shots": 12, ...})
        pos = stats.get("possession", 0.5) if stats else 0.5
        sh = stats.get("shots", 10) if stats else 10
        sot = stats.get("shots_on_target", 3) if stats else 3
        corn = stats.get("corners", 4) if stats else 4
        eg = stats.get("early_goals_10m", 0) if stats else 0
        fl = stats.get("fouls", 12) if stats else 12
        yel = stats.get("yellow_cards", 1) if stats else 1
        red = stats.get("red_cards", 0) if stats else 0

        self.recent_possession.append(pos)
        self.recent_shots.append(sh)
        self.recent_sot.append(sot)
        self.recent_corners.append(corn)
        self.recent_early_goals.append(eg)
        self.recent_fouls.append(fl)
        self.recent_yellows.append(yel)
        self.recent_reds.append(red)

        self.matches_played += 1
        self.last_match_date = match_date

        # Limitar tamaño a 20 elementos
        max_len = 20
        if len(self.recent_pts) > max_len:
            self.recent_pts.pop(0)
            self.recent_gf.pop(0)
            self.recent_ga.pop(0)
            self.recent_possession.pop(0)
            self.recent_shots.pop(0)
            self.recent_sot.pop(0)
            self.recent_corners.pop(0)
            self.recent_early_goals.pop(0)
            self.recent_fouls.pop(0)
            self.recent_yellows.pop(0)
            self.recent_reds.pop(0)

    def form_pct(self, n: int = 5) -> float:
        if not self.recent_pts:
            return 0.5
        tail = self.recent_pts[-n:]
        return sum(tail) / (3 * len(tail))

    def get_avg(self, metric_name: str, n: int = 5) -> float:
        arr = getattr(self, f"recent_{metric_name}", [])
        if not arr:
            return BASE_METRICS.get(metric_name, 0.0)
        tail = arr[-n:]
        return float(np.mean(tail))

    def get_ema(self, metric_name: str, span: int = 5) -> float:
        arr = getattr(self, f"recent_{metric_name}", [])
        if not arr:
            return BASE_METRICS.get(metric_name, 0.0)
        alpha = 2.0 / (span + 1.0)
        val = float(arr[0])
        for v in arr[1:]:
            val = alpha * v + (1.0 - alpha) * val
        return val

    def days_since_last(self, today: date) -> int:
        if self.last_match_date is None:
            return 365
        return (today - self.last_match_date).days


@dataclass
class H2HState:
    """Historial cara a cara entre dos equipos."""
    home_wins: int = 0
    away_wins: int = 0
    draws: int = 0

    def update(self, home_gf: int, away_gf: int):
        if home_gf > away_gf: self.home_wins += 1
        elif home_gf < away_gf: self.away_wins += 1
        else: self.draws += 1

    def home_win_pct(self) -> float:
        total = self.home_wins + self.away_wins + self.draws
        return self.home_wins / total if total > 0 else 0.5


def build_state_index(df: pd.DataFrame) -> tuple[dict[str, TeamState], dict[tuple[str, str], H2HState]]:
    team_state: dict[str, TeamState] = defaultdict(TeamState)
    h2h_state: dict[tuple[str, str], H2HState] = defaultdict(H2HState)
    for _, r in df.iterrows():
        # Extraer estadísticas correspondientes a cada equipo
        stats = r.get("stats")
        home_stats = stats.get("home") if isinstance(stats, dict) else None
        away_stats = stats.get("away") if isinstance(stats, dict) else None

        team_state[r["home"]].update(int(r["hs"]), int(r["as_"]), r["date"], home_stats)
        team_state[r["away"]].update(int(r["as_"]), int(r["hs"]), r["date"], away_stats)
        
        key = tuple(sorted([r["home"], r["away"]]))
        h2h_state[key].update(int(r["hs"]) if r["home"] == key[0] else int(r["as_"]),
                              int(r["as_"]) if r["home"] == key[0] else int(r["hs"]))
    return team_state, h2h_state


def compute_match_features(
    home: str, away: str, match_date: date,
    team_state: dict[str, TeamState], h2h_state: dict[tuple[str, str], H2HState],
) -> dict[str, float]:
    sh = team_state.get(home, TeamState())
    sa = team_state.get(away, TeamState())
    h2h = h2h_state.get(tuple(sorted([home, away])), H2HState())

    features = {
        "home_form_3": sh.form_pct(3),
        "away_form_3": sa.form_pct(3),
        "form_diff_3": sh.form_pct(3) - sa.form_pct(3),
        "home_form_5": sh.form_pct(5),
        "away_form_5": sa.form_pct(5),
        "form_diff_5": sh.form_pct(5) - sa.form_pct(5),
        "home_form_10": sh.form_pct(10),
        "away_form_10": sa.form_pct(10),
        "form_diff_10": sh.form_pct(10) - sa.form_pct(10),
        "home_form_20": sh.form_pct(20),
        "away_form_20": sa.form_pct(20),
        "form_diff_20": sh.form_pct(20) - sa.form_pct(20),
        
        "home_rest_days": min(sh.days_since_last(match_date), 365),
        "away_rest_days": min(sa.days_since_last(match_date), 365),
        "rest_diff": sh.days_since_last(match_date) - sa.days_since_last(match_date),
        "h2h_home_pct": h2h.home_win_pct(),
        "home_matches_played": min(sh.matches_played, 200),
        "away_matches_played": min(sa.matches_played, 200),
    }

    # Añadir promedios móviles y EMAs para cada métrica base
    for metric in BASE_METRICS:
        for window in [3, 5, 10, 20]:
            h_val = sh.get_avg(metric, window)
            a_val = sa.get_avg(metric, window)
            features[f"home_{metric}_avg_{window}"] = h_val
            features[f"away_{metric}_avg_{window}"] = a_val
            features[f"{metric}_avg_diff_{window}"] = h_val - a_val

        for span in [5, 12]:
            h_ema = sh.get_ema(metric, span)
            a_ema = sa.get_ema(metric, span)
            features[f"home_{metric}_ema_{span}"] = h_ema
            features[f"away_{metric}_ema_{span}"] = a_ema
            features[f"{metric}_ema_diff_{span}"] = h_ema - a_ema

    # Características compuestas y ratios
    # 1. Eficiencia de remates (SOT / Shots)
    h_shots_5 = sh.get_avg("shots", 5)
    h_sot_5 = sh.get_avg("sot", 5)
    h_eff = h_sot_5 / max(h_shots_5, 1.0)
    
    a_shots_5 = sa.get_avg("shots", 5)
    a_sot_5 = sa.get_avg("sot", 5)
    a_eff = a_sot_5 / max(a_shots_5, 1.0)
    
    features["home_shot_efficiency"] = h_eff
    features["away_shot_efficiency"] = a_eff
    features["shot_efficiency_diff"] = h_eff - a_eff

    # 2. Tasa de conversión (Goles / SOT)
    h_gf_5 = sh.get_avg("gf", 5)
    h_conv = h_gf_5 / max(h_sot_5, 1.0)
    
    a_gf_5 = sa.get_avg("gf", 5)
    a_conv = a_gf_5 / max(a_sot_5, 1.0)
    
    features["home_conversion_rate"] = h_conv
    features["away_conversion_rate"] = a_conv
    features["conversion_rate_diff"] = h_conv - a_conv

    # 3. Severidad de tarjetas (Amarillas + 3 * Rojas)
    h_yel_5 = sh.get_avg("yellows", 5)
    h_red_5 = sh.get_avg("reds", 5)
    h_card_sev = h_yel_5 + 3.0 * h_red_5
    
    a_yel_5 = sa.get_avg("yellows", 5)
    a_red_5 = sa.get_avg("reds", 5)
    a_card_sev = a_yel_5 + 3.0 * a_red_5
    
    features["home_card_severity"] = h_card_sev
    features["away_card_severity"] = a_card_sev
    features["card_severity_diff"] = h_card_sev - a_card_sev

    return features


# Construir dinámicamente la lista de nombres de features
CONTEXT_FEATURE_NAMES = [
    "home_form_3", "away_form_3", "form_diff_3",
    "home_form_5", "away_form_5", "form_diff_5",
    "home_form_10", "away_form_10", "form_diff_10",
    "home_form_20", "away_form_20", "form_diff_20",
    "home_rest_days", "away_rest_days", "rest_diff",
    "h2h_home_pct",
    "home_matches_played", "away_matches_played",
]

for metric in BASE_METRICS:
    for window in [3, 5, 10, 20]:
        CONTEXT_FEATURE_NAMES.append(f"home_{metric}_avg_{window}")
        CONTEXT_FEATURE_NAMES.append(f"away_{metric}_avg_{window}")
        CONTEXT_FEATURE_NAMES.append(f"{metric}_avg_diff_{window}")
    for span in [5, 12]:
        CONTEXT_FEATURE_NAMES.append(f"home_{metric}_ema_{span}")
        CONTEXT_FEATURE_NAMES.append(f"away_{metric}_ema_{span}")
        CONTEXT_FEATURE_NAMES.append(f"{metric}_ema_diff_{span}")

CONTEXT_FEATURE_NAMES.extend([
    "home_shot_efficiency", "away_shot_efficiency", "shot_efficiency_diff",
    "home_conversion_rate", "away_conversion_rate", "conversion_rate_diff",
    "home_card_severity", "away_card_severity", "card_severity_diff",
])
