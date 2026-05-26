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
    # Partido Completo
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
    "free_kicks": 11.0,
    "offsides": 1.8,
    "passes": 400.0,
    "pass_accuracy": 78.0,
    "aerials_won": 12.0,
    "saves": 3.0,
    "xg": 1.1,
    "tackles": 14.0,
    "interceptions": 8.0,
    "clearances": 12.0,
    "big_chances": 2.5,
    "crosses": 18.0,
    "long_balls": 35.0,
    "dribbles": 5.0,

    # Primer Tiempo
    "first_half_goals": 0.6,
    "first_half_shots": 4.8,
    "first_half_sot": 1.6,
    "first_half_corners": 2.2,
    "first_half_fouls": 6.0,
    "first_half_free_kicks": 5.0,
    "first_half_offsides": 0.8,
    "first_half_possession": 0.5,
    "first_half_xg": 0.5,
    
    # Segundo Tiempo
    "second_half_goals": 0.6,
    "second_half_shots": 5.2,
    "second_half_sot": 1.9,
    "second_half_corners": 2.3,
    "second_half_fouls": 6.5,
    "second_half_free_kicks": 5.5,
    "second_half_offsides": 1.0,
    "second_half_possession": 0.5,
    "second_half_xg": 0.6,
    
    # Goles por tramo
    "goals_0_15": 0.1,
    "goals_15_30": 0.15,
    "goals_30_45": 0.18,
    "goals_45_60": 0.15,
    "goals_60_75": 0.18,
    "goals_75_90": 0.22,
    "goals_90plus": 0.08,
}


@dataclass
class TeamState:
    """Estado acumulado de un equipo hasta una fecha de corte, incluyendo estadísticas avanzadas."""
    matches_played: int = 0
    last_match_date: date | None = None
    
    # Form: lista de "points" (3=W, 1=D, 0=L) ordenada cronológicamente
    recent_pts: list[int] = field(default_factory=list)
    
    # Diccionario con el historial de cada métrica (máximo últimas 20 para eficiencia)
    metrics: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))

    # Properties para compatibilidad con código que acceda directamente
    @property
    def recent_gf(self): return self.metrics["gf"]
    @property
    def recent_ga(self): return self.metrics["ga"]
    @property
    def recent_possession(self): return self.metrics["possession"]
    @property
    def recent_shots(self): return self.metrics["shots"]
    @property
    def recent_sot(self): return self.metrics["sot"]
    @property
    def recent_corners(self): return self.metrics["corners"]
    @property
    def recent_early_goals(self): return self.metrics["early_goals"]
    @property
    def recent_fouls(self): return self.metrics["fouls"]
    @property
    def recent_yellows(self): return self.metrics["yellows"]
    @property
    def recent_reds(self): return self.metrics["reds"]

    def update(self, gf: int, ga: int, match_date: date, stats: dict | None = None):
        pts = 3 if gf > ga else 1 if gf == ga else 0
        self.recent_pts.append(pts)
        
        self.metrics["gf"].append(float(gf))
        self.metrics["ga"].append(float(ga))
        
        for metric in BASE_METRICS:
            if metric in ("gf", "ga"):
                continue
            
            val = None
            if stats:
                if metric.startswith("first_half_"):
                    sub_key = metric.replace("first_half_", "")
                    if sub_key == "goals":
                        val = stats.get("first_half", {}).get("goals")
                    else:
                        val = stats.get("first_half", {}).get(sub_key)
                elif metric.startswith("second_half_"):
                    sub_key = metric.replace("second_half_", "")
                    if sub_key == "goals":
                        val = stats.get("second_half", {}).get("goals")
                    else:
                        val = stats.get("second_half", {}).get(sub_key)
                elif metric.startswith("goals_"):
                    period = metric.replace("goals_", "")
                    val = stats.get("goals_by_period", {}).get(period)
                elif metric == "early_goals":
                    val = stats.get("early_goals_10m")
                else:
                    val = stats.get(metric)
            
            if val is None:
                val = BASE_METRICS.get(metric, 0.0)
            
            self.metrics[metric].append(float(val))

        self.matches_played += 1
        self.last_match_date = match_date

        # Limitar tamaño a 20 elementos en todas las métricas
        max_len = 20
        if len(self.recent_pts) > max_len:
            self.recent_pts.pop(0)
            for k in list(self.metrics.keys()):
                if len(self.metrics[k]) > max_len:
                    self.metrics[k].pop(0)

    def form_pct(self, n: int = 5) -> float:
        if not self.recent_pts:
            return 0.5
        tail = self.recent_pts[-n:]
        return sum(tail) / (3 * len(tail))

    def get_avg(self, metric_name: str, n: int = 5) -> float:
        arr = self.metrics.get(metric_name)
        if not arr:
            arr = getattr(self, f"recent_{metric_name}", [])
        if not arr:
            return BASE_METRICS.get(metric_name, 0.0)
        tail = arr[-n:]
        return float(np.mean(tail))

    def get_ema(self, metric_name: str, span: int = 5) -> float:
        arr = self.metrics.get(metric_name)
        if not arr:
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
