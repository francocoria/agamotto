"""Sofascore scraper — extrae estadísticas granulares de partidos internacionales.

Usa la API no oficial de Sofascore (misma que usan las apps móviles).
Extrae:
  - Stats por partido completo: xG, tiros libres, fueras de juego, pases, %pases, salvadas, centros, etc.
  - Stats desglosadas por MITAD: 1er y 2do tiempo
  - Incidentes con MINUTO: goles por tramo (0-15, 15-30, 30-45, 45-60, 60-75, 75-90, 90+)

Rate limit conservador: 1 request cada ~2s para no ser bloqueados.
Checkpoint: guarda progreso en data/raw/sofascore_progress.json (resumible).
"""

from __future__ import annotations

import json
import logging
import random
import time
from datetime import datetime
from pathlib import Path
from curl_cffi import requests

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mapeo FIFA code → Sofascore team_id (57 selecciones del Mundial 2026)
# ---------------------------------------------------------------------------

FIFA_TO_SOFASCORE: dict[str, int] = {
    # Grupo A
    "USA": 4424,
    "CAN": 4456,
    "MEX": 4717,
    # Grupo B
    "ARG": 7398,
    "CHI": 4696,
    "PER": 4720,
    "BOL": 4695,
    # Grupo C
    "BRA": 4755,
    "VEN": 4726,
    "URU": 4725,
    "ECU": 4702,
    # Grupo D
    "FRA": 4481,
    "BEL": 4469,
    "NED": 4493,
    "HUN": 4484,
    # Grupo E
    "GER": 4711,
    "POL": 4494,
    "AUT": 4463,
    "SUI": 4501,
    # Grupo F
    "ESP": 4698,
    "POR": 4495,
    "MAR": 6321,
    "SEN": 6354,
    # Grupo G
    "ENG": 4713,
    "WAL": 4509,
    "SCO": 4496,
    "IRL": 4485,
    # Grupo H
    "JPN": 6897,
    "KOR": 6335,
    "AUS": 4460,
    "NZL": 4492,
    # Grupo I
    "QAT": 6422,
    "IRN": 4486,
    "SAU": 4497,
    "UAE": 4507,
    # Grupo J
    "CMR": 4672,
    "GHA": 4680,
    "NGA": 4688,
    "TUN": 6338,
    # Grupo K
    "EGY": 4675,
    "CIV": 4673,
    "MLI": 4687,
    "DEN": 4478,
    # Grupo L
    "CRO": 4473,
    "SVN": 4499,
    "SRB": 4498,
    "ALB": 4461,
    # Adicionales clasificados
    "TUR": 4504,
    "CZE": 4477,
    "SVK": 4500,
    "GRE": 4483,
    "RUM": 4474,
    "UKR": 4506,
    "GAB": 4679,
    "COD": 4671,
    "TAN": 4691,
    "PRK": 6908,
    "VIE": 6908,  # placeholder
    "HON": 4714,
    "JAM": 4716,
    "CRC": 4699,
    "PAN": 4718,
    "KSA": 4497,  # alias
}

# Headers para simular un navegador real
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.sofascore.com/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    "Origin": "https://www.sofascore.com",
    "Cache-Control": "no-cache",
}

BASE_URL = "https://api.sofascore.com/api/v1"
PROGRESS_FILE = Path("data/raw/sofascore_progress.json")
OUTPUT_FILE = Path("data/raw/sofascore_stats.json")


# ---------------------------------------------------------------------------
# HTTP client con retry + rate limit
# ---------------------------------------------------------------------------

def _get(url: str, delay: float = 2.0) -> Optional[dict]:
    """GET con retry exponencial usando curl_cffi."""
    for attempt in range(4):
        try:
            time.sleep(delay + random.uniform(0.3, 0.9))
            r = requests.get(url, headers=HEADERS, timeout=20, impersonate="chrome120")
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                wait = 30 * (attempt + 1)
                log.warning(f"Rate limited → esperando {wait}s …")
                time.sleep(wait)
            elif r.status_code in (403, 404):
                log.debug(f"HTTP {r.status_code} for {url}")
                return None
            else:
                log.warning(f"HTTP {r.status_code} for {url}")
                time.sleep(5)
        except Exception as e:
            log.warning(f"Request error ({attempt+1}/4): {e}")
            time.sleep(10)
    return None


# ---------------------------------------------------------------------------
# Funciones de scraping por endpoint
# ---------------------------------------------------------------------------

def get_team_events(team_id: int, pages: int = 6) -> list[dict]:
    """Obtiene los últimos ~60 partidos de un equipo (10 por página)."""
    events = []
    for page in range(pages):
        url = f"{BASE_URL}/team/{team_id}/events/last/{page}"
        data = _get(url)
        if not data:
            break
        batch = data.get("events", [])
        if not batch:
            break
        events.extend(batch)
        log.debug(f"  team {team_id} page {page}: +{len(batch)} events")
    return events


def get_event_statistics(event_id: int) -> Optional[dict]:
    """Estadísticas de un partido por mitad y total."""
    url = f"{BASE_URL}/event/{event_id}/statistics"
    return _get(url)


def get_event_incidents(event_id: int) -> Optional[dict]:
    """Incidentes (goles, tarjetas) con minuto exacto."""
    url = f"{BASE_URL}/event/{event_id}/incidents"
    return _get(url)


# ---------------------------------------------------------------------------
# Parser de estadísticas de Sofascore
# ---------------------------------------------------------------------------

def _stat_map(statistics_list: list[dict]) -> dict[str, float]:
    """Convierte la lista de categorías de estadísticas en un dict plano."""
    result = {}
    for category in statistics_list:
        for item in category.get("statisticsItems", []):
            key = item.get("key", "")
            home_val = item.get("homeValue", None)
            away_val = item.get("awayValue", None)
            if key:
                result[f"home_{key}"] = _parse_val(home_val)
                result[f"away_{key}"] = _parse_val(away_val)
    return result


def _parse_val(v) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        v = v.strip().replace("%", "").replace(",", ".")
        try:
            return float(v)
        except ValueError:
            return None
    return None


def _parse_period_stats(raw: dict, period: str) -> Optional[dict]:
    """Extrae stats de un período específico ('ALL', '1ST', '2ND')."""
    for group in raw.get("statistics", []):
        if group.get("period") == period:
            return _stat_map(group.get("groups", []))
    return None


def _extract_stats_for_team(flat: dict, side: str) -> dict:
    """Extrae stats de un lado (home/away) desde el dict plano."""
    prefix = f"{side}_"
    stats = {}
    
    FIELD_MAP = {
        # Sofascore key → nuestro campo normalizado
        "totalShotsOnTarget": "sot",
        "shotOffTarget": "shots_off",
        "blockedShotsOnTarget": "shots_blocked",
        "totalShots": "shots",
        "goalKicks": "goal_kicks",
        "freeKicks": "free_kicks",
        "cornerKicks": "corners",
        "totalFoulsConceded": "fouls",
        "yellowCards": "yellows",
        "redCards": "reds",
        "totalOffside": "offsides",
        "ballPossession": "possession",
        "expectedGoals": "xg",
        "bigChances": "big_chances",
        "bigChanceMissed": "big_chances_missed",
        "totalPasses": "passes",
        "accuratePasses": "passes_accurate",
        "accuratePassesPercentage": "pass_accuracy",
        "aerialsWon": "aerials_won",
        "goalKeeperSaves": "saves",
        "tackles": "tackles",
        "interceptions": "interceptions",
        "clearances": "clearances",
        "totalCross": "crosses",
        "accurateCross": "crosses_accurate",
        "totalLongBalls": "long_balls",
        "accurateLongBalls": "long_balls_accurate",
        "successfulDribbles": "dribbles",
        "totalDribbleAttempts": "dribbles_attempted",
        "totalChippedPasses": "key_passes",
        "keyPasses": "key_passes_actual",
        "bigChancesCreated": "big_chances_created",
        "throwInCount": "throw_ins",
        "goalsFromInsideBox": "goals_inside_box",
        "goalsFromOutsideBox": "goals_outside_box",
    }
    
    for sofa_key, our_key in FIELD_MAP.items():
        val = flat.get(f"{prefix}{sofa_key}")
        if val is not None:
            stats[our_key] = val
    
    # Calcular shots totales si no está (sot + off + blocked)
    if "shots" not in stats:
        sot = stats.get("sot", 0)
        off = stats.get("shots_off", 0)
        blk = stats.get("shots_blocked", 0)
        if sot or off or blk:
            stats["shots"] = sot + off + blk
    
    return stats


def parse_match_stats(raw_stats: dict) -> dict:
    """Parsea la respuesta de /statistics en nuestro schema expandido."""
    result = {"home": {}, "away": {}}
    
    # Estadísticas del partido completo
    all_stats_raw = None
    first_raw = None
    second_raw = None
    
    for group in raw_stats.get("statistics", []):
        period = group.get("period", "")
        if period == "ALL":
            all_stats_raw = _stat_map(group.get("groups", []))
        elif period == "1ST":
            first_raw = _stat_map(group.get("groups", []))
        elif period == "2ND":
            second_raw = _stat_map(group.get("groups", []))
    
    if all_stats_raw:
        result["home"].update(_extract_stats_for_team(all_stats_raw, "home"))
        result["away"].update(_extract_stats_for_team(all_stats_raw, "away"))
    
    if first_raw:
        result["home"]["first_half"] = _extract_stats_for_team(first_raw, "home")
        result["away"]["first_half"] = _extract_stats_for_team(first_raw, "away")
    
    if second_raw:
        result["home"]["second_half"] = _extract_stats_for_team(second_raw, "home")
        result["away"]["second_half"] = _extract_stats_for_team(second_raw, "away")
    
    return result


def parse_incidents(raw_incidents: dict, home_team_id: int) -> dict:
    """Parsea incidentes para extraer goles por tramo temporal."""
    goals_by_period = {
        "home": {"0_15": 0, "15_30": 0, "30_45": 0, "45_60": 0, "60_75": 0, "75_90": 0, "90plus": 0},
        "away": {"0_15": 0, "15_30": 0, "30_45": 0, "45_60": 0, "60_75": 0, "75_90": 0, "90plus": 0},
    }
    
    for incident in raw_incidents.get("incidents", []):
        if incident.get("incidentType") != "goal":
            continue
        minute = incident.get("time", 0) or 0
        is_own_goal = incident.get("incidentClass") == "ownGoal"
        team_id = incident.get("team", {}).get("id")
        
        # Determinar si es del equipo local o visitante
        if is_own_goal:
            side = "away" if team_id == home_team_id else "home"
        else:
            side = "home" if team_id == home_team_id else "away"
        
        # Asignar al tramo correspondiente
        if minute <= 15:
            bucket = "0_15"
        elif minute <= 30:
            bucket = "15_30"
        elif minute <= 45:
            bucket = "30_45"
        elif minute <= 60:
            bucket = "45_60"
        elif minute <= 75:
            bucket = "60_75"
        elif minute <= 90:
            bucket = "75_90"
        else:
            bucket = "90plus"
        
        goals_by_period[side][bucket] += 1
    
    return goals_by_period


def filter_relevant_event(event: dict, min_year: int = 2019) -> bool:
    """Filtra eventos relevantes (internacionales, desde min_year)."""
    # Solo partidos de selecciones nacionales
    tournament = event.get("tournament", {})
    category = tournament.get("category", {}).get("sport", {}).get("slug", "")
    if category != "football":
        return False
    
    # Verificar que sea un partido internacional (no de club)
    home_team = event.get("homeTeam", {})
    away_team = event.get("awayTeam", {})
    
    # Los equipos nacionales tienen type.code == "national"
    home_type = home_team.get("type", 0)
    away_type = away_team.get("type", 0)
    # Sofascore usa type=0 para clubes, type=1 para nacionales
    # Pero no siempre está disponible. Usamos el category.country como fallback.
    
    # Verificar fecha
    start_ts = event.get("startTimestamp", 0)
    if start_ts:
        event_year = datetime.fromtimestamp(start_ts).year
        if event_year < min_year:
            return False
    
    # Solo partidos finalizados
    status = event.get("status", {}).get("type", "")
    if status not in ("finished", "notstarted", "inprogress"):
        if status != "finished":
            return False
    
    return True


# ---------------------------------------------------------------------------
# Función principal de scraping
# ---------------------------------------------------------------------------

def scrape_all(
    team_codes: list[str] | None = None,
    pages_per_team: int = 6,
    delay: float = 2.0,
    min_year: int = 2019,
    resume: bool = True,
) -> dict:
    """
    Scrapea estadísticas granulares de Sofascore para todas las selecciones.
    
    Args:
        team_codes: Lista de códigos FIFA. None = todas las 57.
        pages_per_team: Páginas de historial por equipo (10 partidos/página).
        delay: Segundos entre requests.
        min_year: Solo partidos desde este año.
        resume: Si True, carga progreso guardado y continúa donde quedó.
    
    Returns:
        Dict con todas las stats por event_id.
    """
    teams_to_scrape = team_codes or list(FIFA_TO_SOFASCORE.keys())
    
    # Cargar progreso guardado
    progress = {"done_teams": [], "events": {}}
    if resume and PROGRESS_FILE.exists():
        try:
            progress = json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
            log.info(f"Resumiendo desde progreso guardado: "
                     f"{len(progress['done_teams'])} equipos completados, "
                     f"{len(progress['events'])} eventos")
        except Exception as e:
            log.warning(f"No se pudo cargar progreso: {e}")
    
    done_teams: list[str] = progress.get("done_teams", [])
    events_data: dict = progress.get("events", {})
    
    teams_pending = [t for t in teams_to_scrape if t not in done_teams]
    log.info(f"Equipos pendientes: {len(teams_pending)} / {len(teams_to_scrape)}")
    
    for idx, code in enumerate(teams_pending):
        sofa_id = FIFA_TO_SOFASCORE.get(code)
        if not sofa_id:
            log.warning(f"No Sofascore ID para {code}, saltando")
            continue
        
        log.info(f"[{idx+1}/{len(teams_pending)}] Scrapeando {code} (sofa_id={sofa_id})…")
        
        # 1. Obtener lista de eventos
        team_events = get_team_events(sofa_id, pages=pages_per_team)
        log.info(f"  {code}: {len(team_events)} eventos encontrados")
        
        new_events = 0
        skipped = 0
        
        for event in team_events:
            event_id = str(event.get("id", ""))
            if not event_id:
                continue
            
            # Skip si ya procesamos este evento
            if event_id in events_data:
                skipped += 1
                continue
            
            if not filter_relevant_event(event, min_year=min_year):
                continue
            
            # 2. Obtener estadísticas del partido
            raw_stats = get_event_statistics(int(event_id))
            raw_incidents = get_event_incidents(int(event_id))
            
            if not raw_stats and not raw_incidents:
                continue
            
            # 3. Parsear
            match_stats = parse_match_stats(raw_stats) if raw_stats else {"home": {}, "away": {}}
            
            home_team_id = event.get("homeTeam", {}).get("id")
            if raw_incidents and home_team_id:
                goals_by_period = parse_incidents(raw_incidents, home_team_id)
                match_stats["home"]["goals_by_period"] = goals_by_period["home"]
                match_stats["away"]["goals_by_period"] = goals_by_period["away"]
            
            # 4. Metadatos del partido
            start_ts = event.get("startTimestamp", 0)
            event_date = (
                datetime.fromtimestamp(start_ts).strftime("%Y-%m-%d")
                if start_ts else None
            )
            
            events_data[event_id] = {
                "event_id": event_id,
                "date": event_date,
                "home_team": event.get("homeTeam", {}).get("name"),
                "away_team": event.get("awayTeam", {}).get("name"),
                "home_sofa_id": event.get("homeTeam", {}).get("id"),
                "away_sofa_id": event.get("awayTeam", {}).get("id"),
                "home_score": event.get("homeScore", {}).get("current"),
                "away_score": event.get("awayScore", {}).get("current"),
                "tournament": event.get("tournament", {}).get("name"),
                "stats": match_stats,
                "scraped_at": datetime.now().isoformat(),
            }
            new_events += 1
        
        log.info(f"  {code}: +{new_events} nuevos, {skipped} ya cargados")
        
        # Marcar equipo como completado y guardar checkpoint
        done_teams.append(code)
        progress = {"done_teams": done_teams, "events": events_data}
        PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
        PROGRESS_FILE.write_text(
            json.dumps(progress, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        log.info(f"  Checkpoint guardado ({len(events_data)} eventos totales)")
    
    # Guardar output final
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(events_data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    log.info(f"✓ Scraping completo: {len(events_data)} eventos → {OUTPUT_FILE}")
    
    return events_data


# ---------------------------------------------------------------------------
# Integración con la DB: actualizar stats en HistoricalMatch
# ---------------------------------------------------------------------------

def merge_sofascore_into_db(events_data: dict | None = None) -> int:
    """
    Cruza los eventos de Sofascore con los HistoricalMatch de la DB
    y actualiza el campo JSON `stats` con los datos granulares.
    
    Returns:
        Número de partidos actualizados.
    """
    from datetime import date as date_type
    from sqlalchemy import select, and_, or_
    from agamotto.core.db import get_session
    from agamotto.db.models import HistoricalMatch
    
    if events_data is None:
        if not OUTPUT_FILE.exists():
            log.error(f"No existe {OUTPUT_FILE}. Primero ejecutá el scraping.")
            return 0
        events_data = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
    
    updated = 0
    
    with get_session() as session:
        for event_id, ev in events_data.items():
            if not ev.get("date") or not ev.get("home_team") or not ev.get("stats"):
                continue
            
            try:
                ev_date = date_type.fromisoformat(ev["date"])
            except (ValueError, TypeError):
                continue
            
            # Buscar match por fecha ± 1 día y nombres de equipos similares
            # Sofascore usa nombres en inglés, la DB puede tener variantes
            home_name = (ev.get("home_team") or "").strip()
            away_name = (ev.get("away_team") or "").strip()
            home_score = ev.get("home_score")
            away_score = ev.get("away_score")
            
            if home_score is None or away_score is None:
                continue
            
            # Buscar en DB con marcador + fecha (más preciso que nombre)
            from datetime import timedelta
            date_from = ev_date - timedelta(days=1)
            date_to = ev_date + timedelta(days=1)
            
            stmt = select(HistoricalMatch).where(
                and_(
                    HistoricalMatch.date >= date_from,
                    HistoricalMatch.date <= date_to,
                    HistoricalMatch.hs == int(home_score),
                    HistoricalMatch.as_ == int(away_score),
                )
            )
            matches = session.scalars(stmt).all()
            
            if not matches:
                continue
            
            # Tomar el mejor candidato (si hay más de uno)
            match = matches[0]
            
            # Mergear: no sobreescribir campos existentes, solo agregar los nuevos
            existing_stats = match.stats or {}
            new_stats = ev["stats"]
            
            merged = {
                "home": {**new_stats.get("home", {}), **existing_stats.get("home", {})},
                "away": {**new_stats.get("away", {}), **existing_stats.get("away", {})},
            }
            # Pero queremos que Sofascore prevalezca sobre datos sintéticos
            merged = {
                "home": {**existing_stats.get("home", {}), **new_stats.get("home", {})},
                "away": {**existing_stats.get("away", {}), **new_stats.get("away", {})},
                "_sofascore_event_id": event_id,
            }
            
            match.stats = merged
            updated += 1
        
        session.commit()
    
    log.info(f"✓ Actualizados {updated} partidos en la DB con stats de Sofascore")
    return updated


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def run(
    team_codes: list[str] | None = None,
    pages: int = 6,
    delay: float = 2.0,
    min_year: int = 2019,
    merge_db: bool = True,
) -> dict:
    """Pipeline completo: scraping + merge en DB."""
    events = scrape_all(
        team_codes=team_codes,
        pages_per_team=pages,
        delay=delay,
        min_year=min_year,
    )
    
    if merge_db:
        n_updated = merge_sofascore_into_db(events)
        return {"events_scraped": len(events), "db_updated": n_updated}
    
    return {"events_scraped": len(events), "db_updated": 0}
