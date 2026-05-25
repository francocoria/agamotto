"""Enricher de estadísticas de partidos históricos.

Cruza goalscorers.csv para obtener minutos de goles reales (goles en los primeros 10 min)
y genera de manera probabilística y consistente tiros, tiros al arco, corners y posesión.
"""

from __future__ import annotations

import csv
from datetime import date, datetime
import random
from collections import defaultdict
import requests

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch

log = get_logger(__name__)

GOALSCORERS_URL = "https://raw.githubusercontent.com/martj42/international_results/master/goalscorers.csv"


def download_goalscorers() -> dict[tuple[str, str, str], list[int]]:
    """Descarga y agrupa los minutos de los goles por (fecha, home_team, away_team)."""
    raw_path = settings.raw_dir / "martj42_goalscorers.csv"
    log.info("Descargando goleadores de %s", GOALSCORERS_URL)
    r = requests.get(GOALSCORERS_URL, timeout=120)
    r.raise_for_status()
    raw_path.write_bytes(r.content)
    log.info("Guardados goleadores en %s (%d bytes)", raw_path, len(r.content))

    # Mapeo: (date_str, home, away) -> lista de minutos
    goal_minutes = defaultdict(list)
    with open(raw_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                dt = row["date"].strip()
                home = row["home_team"].strip()
                away = row["away_team"].strip()
                minute = int(row["minute"])
                goal_minutes[(dt, home, away)].append(minute)
            except (ValueError, KeyError):
                continue
    return goal_minutes


def enrich_stats() -> int:
    # 1. Obtener minutos de goles reales de goalscorers.csv
    goal_minutes_map = download_goalscorers()

    # 2. Iniciar sesión y recorrer partidos históricos
    log.info("Iniciando enriquecimiento de estadísticas en la base de datos...")
    random.seed(42)  # reproducibilidad en simulaciones

    updated_count = 0
    with get_session() as s:
        matches = s.query(HistoricalMatch).all()
        log.info("Procesando %d partidos históricos...", len(matches))

        for idx, m in enumerate(matches):
            dt_str = m.match_date.isoformat()
            home = m.home_team
            away = m.away_team
            hs = m.home_score
            as_ = m.away_score
            neutral = m.neutral

            # Minutos de goles reales (si existen)
            mins = goal_minutes_map.get((dt_str, home, away), [])
            
            # Goles en primeros 10 min
            early_goals_home = 0
            early_goals_away = 0
            
            # Si hay registro de minutos, los contamos de forma exacta
            if mins:
                # Nota: como goalscorers.csv no especifica de forma directa el equipo en el formato
                # más obvio sin mapeo extra, asumimos una distribución aleatoria o usamos
                # proporciones según los goles del partido
                for min_val in mins:
                    if min_val <= 10:
                        # Asignar gol temprano al local o visita proporcional al marcador final
                        if hs > 0 and as_ > 0:
                            if random.random() < (hs / (hs + as_)):
                                early_goals_home += 1
                            else:
                                early_goals_away += 1
                        elif hs > 0:
                            early_goals_home += 1
                        elif as_ > 0:
                            early_goals_away += 1
            else:
                # Heurística si el partido es viejo y no está en goalscorers.csv
                # ~5% de chance por cada gol marcado de ocurrir en los primeros 10 min
                for _ in range(hs):
                    if random.random() < 0.08:
                        early_goals_home += 1
                for _ in range(as_):
                    if random.random() < 0.08:
                        early_goals_away += 1

            # Generar estadísticas realistas basadas en el marcador final y ventaja de localía
            # Posesión
            base_home_pos = 50.0
            if not neutral:
                base_home_pos += 3.0  # ventaja de local
            
            # Ajustar posesión según diferencia de goles
            base_home_pos += (hs - as_) * 3.0
            
            # Ruido
            home_pos = base_home_pos + random.uniform(-6, 6)
            home_pos = max(30.0, min(70.0, home_pos))
            away_pos = 100.0 - home_pos

            # Remates totales (correlacionados con goles y posesión)
            home_shots = int(round(5.0 + hs * 1.8 + (home_pos - 50.0) * 0.15 + random.uniform(0, 6)))
            away_shots = int(round(5.0 + as_ * 1.8 + (away_pos - 50.0) * 0.15 + random.uniform(0, 6)))
            
            home_shots = max(hs, home_shots)
            away_shots = max(as_, away_shots)

            # Remates al arco (SOT)
            home_sot = hs + int(random.randint(0, max(0, int((home_shots - hs) * 0.4))))
            away_sot = as_ + int(random.randint(0, max(0, int((away_shots - as_) * 0.4))))
            
            home_sot = min(home_shots, home_sot)
            away_sot = min(away_shots, away_sot)

            # Tiros de esquina (corners)
            home_corners = int(round(2.0 + home_pos * 0.08 + random.uniform(-1, 3)))
            away_corners = int(round(2.0 + away_pos * 0.08 + random.uniform(-1, 3)))
            
            home_corners = max(0, home_corners)
            away_corners = max(0, away_corners)

            # Tarjetas y Faltas
            home_fouls = random.randint(8, 20)
            away_fouls = random.randint(8, 20)
            
            home_yellows = random.randint(0, 3 if hs < as_ else 2)
            away_yellows = random.randint(0, 3 if as_ < hs else 2)
            
            home_reds = 1 if random.random() < 0.05 else 0
            away_reds = 1 if random.random() < 0.05 else 0

            # Guardar JSON de estadísticas
            m.stats = {
                "home": {
                    "possession": float(round(home_pos / 100.0, 3)),
                    "shots": int(home_shots),
                    "shots_on_target": int(home_sot),
                    "corners": int(home_corners),
                    "early_goals_10m": int(early_goals_home),
                    "fouls": int(home_fouls),
                    "yellow_cards": int(home_yellows),
                    "red_cards": int(home_reds)
                },
                "away": {
                    "possession": float(round(away_pos / 100.0, 3)),
                    "shots": int(away_shots),
                    "shots_on_target": int(away_sot),
                    "corners": int(away_corners),
                    "early_goals_10m": int(early_goals_away),
                    "fouls": int(away_fouls),
                    "yellow_cards": int(away_yellows),
                    "red_cards": int(away_reds)
                }
            }
            updated_count += 1

            if idx > 0 and idx % 5000 == 0:
                s.flush()
                log.info("  %d partidos procesados...", idx)

        s.commit()
    log.info("¡Enriquecimiento completado! %d partidos actualizados.", updated_count)
    return updated_count


def run() -> int:
    return enrich_stats()
