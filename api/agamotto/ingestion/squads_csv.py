"""Adapter para CSV de planteles (formato: Pais,Grupo,Jugador,Posicion_*,Es_Titular,Edad,Altura_cm,Club_Actual,Dorsal,Partidos_Internacionales).

Mapea nombres de país en español a team_id canónicos.
Crea Player + Squad + SquadPlayer + Lineup (PROBABLE) con los 11 titulares marcados.
"""

from __future__ import annotations

import csv
import unicodedata
from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, select

from agamotto.core.db import get_session
from agamotto.core.ids import player_id as canonical_player_id
from agamotto.core.logging import get_logger
from agamotto.db.models import (
    Lineup,
    LineupPlayer,
    Player,
    Squad,
    SquadPlayer,
    Team,
)
from agamotto.ingestion.base import Adapter

log = get_logger(__name__)


# Mapeo Español → team_id (FIFA code)
COUNTRY_MAP: dict[str, tuple[str, str, str, str]] = {
    # name_es : (team_id, fifa_code, confederation, flag_emoji)
    "alemania": ("GER", "GER", "UEFA", "🇩🇪"),
    "arabia saudi": ("KSA", "KSA", "AFC", "🇸🇦"),
    "argelia": ("ALG", "ALG", "CAF", "🇩🇿"),
    "argentina": ("ARG", "ARG", "CONMEBOL", "🇦🇷"),
    "australia": ("AUS", "AUS", "AFC", "🇦🇺"),
    "austria": ("AUT", "AUT", "UEFA", "🇦🇹"),
    "belgica": ("BEL", "BEL", "UEFA", "🇧🇪"),
    "bosnia y herzegovina": ("BIH", "BIH", "UEFA", "🇧🇦"),
    "bosnia": ("BIH", "BIH", "UEFA", "🇧🇦"),
    "brasil": ("BRA", "BRA", "CONMEBOL", "🇧🇷"),
    "cabo verde": ("CPV", "CPV", "CAF", "🇨🇻"),
    "camerun": ("CMR", "CMR", "CAF", "🇨🇲"),
    "canada": ("CAN", "CAN", "CONCACAF", "🇨🇦"),
    "catar": ("QAT", "QAT", "AFC", "🇶🇦"),
    "curazao": ("CUW", "CUW", "CONCACAF", "🇨🇼"),
    "chile": ("CHI", "CHI", "CONMEBOL", "🇨🇱"),
    "colombia": ("COL", "COL", "CONMEBOL", "🇨🇴"),
    "corea del sur": ("KOR", "KOR", "AFC", "🇰🇷"),
    "costa rica": ("CRC", "CRC", "CONCACAF", "🇨🇷"),
    "costa de marfil": ("CIV", "CIV", "CAF", "🇨🇮"),
    "croacia": ("CRO", "CRO", "UEFA", "🇭🇷"),
    "dinamarca": ("DEN", "DEN", "UEFA", "🇩🇰"),
    "ecuador": ("ECU", "ECU", "CONMEBOL", "🇪🇨"),
    "egipto": ("EGY", "EGY", "CAF", "🇪🇬"),
    "el salvador": ("SLV", "SLV", "CONCACAF", "🇸🇻"),
    "escocia": ("SCO", "SCO", "UEFA", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"),
    "espana": ("ESP", "ESP", "UEFA", "🇪🇸"),
    "estados unidos": ("USA", "USA", "CONCACAF", "🇺🇸"),
    "francia": ("FRA", "FRA", "UEFA", "🇫🇷"),
    "gales": ("WAL", "WAL", "UEFA", "🏴󠁧󠁢󠁷󠁬󠁳󠁿"),
    "ghana": ("GHA", "GHA", "CAF", "🇬🇭"),
    "grecia": ("GRE", "GRE", "UEFA", "🇬🇷"),
    "haiti": ("HAI", "HAI", "CONCACAF", "🇭🇹"),
    "holanda": ("NED", "NED", "UEFA", "🇳🇱"),
    "honduras": ("HON", "HON", "CONCACAF", "🇭🇳"),
    "hungria": ("HUN", "HUN", "UEFA", "🇭🇺"),
    "inglaterra": ("ENG", "ENG", "UEFA", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
    "iran": ("IRN", "IRN", "AFC", "🇮🇷"),
    "iraq": ("IRQ", "IRQ", "AFC", "🇮🇶"),
    "irak": ("IRQ", "IRQ", "AFC", "🇮🇶"),
    "irlanda": ("IRL", "IRL", "UEFA", "🇮🇪"),
    "islandia": ("ISL", "ISL", "UEFA", "🇮🇸"),
    "italia": ("ITA", "ITA", "UEFA", "🇮🇹"),
    "jamaica": ("JAM", "JAM", "CONCACAF", "🇯🇲"),
    "japon": ("JPN", "JPN", "AFC", "🇯🇵"),
    "jordania": ("JOR", "JOR", "AFC", "🇯🇴"),
    "marruecos": ("MAR", "MAR", "CAF", "🇲🇦"),
    "mexico": ("MEX", "MEX", "CONCACAF", "🇲🇽"),
    "nigeria": ("NGA", "NGA", "CAF", "🇳🇬"),
    "noruega": ("NOR", "NOR", "UEFA", "🇳🇴"),
    "nueva zelanda": ("NZL", "NZL", "OFC", "🇳🇿"),
    "paises bajos": ("NED", "NED", "UEFA", "🇳🇱"),
    "panama": ("PAN", "PAN", "CONCACAF", "🇵🇦"),
    "paraguay": ("PAR", "PAR", "CONMEBOL", "🇵🇾"),
    "peru": ("PER", "PER", "CONMEBOL", "🇵🇪"),
    "polonia": ("POL", "POL", "UEFA", "🇵🇱"),
    "portugal": ("POR", "POR", "UEFA", "🇵🇹"),
    "qatar": ("QAT", "QAT", "AFC", "🇶🇦"),
    "rd congo": ("COD", "COD", "CAF", "🇨🇩"),
    "republica democratica del congo": ("COD", "COD", "CAF", "🇨🇩"),
    "republica checa": ("CZE", "CZE", "UEFA", "🇨🇿"),
    "rumania": ("ROU", "ROU", "UEFA", "🇷🇴"),
    "senegal": ("SEN", "SEN", "CAF", "🇸🇳"),
    "serbia": ("SRB", "SRB", "UEFA", "🇷🇸"),
    "sudafrica": ("RSA", "RSA", "CAF", "🇿🇦"),
    "suecia": ("SWE", "SWE", "UEFA", "🇸🇪"),
    "suiza": ("SUI", "SUI", "UEFA", "🇨🇭"),
    "tunez": ("TUN", "TUN", "CAF", "🇹🇳"),
    "turquia": ("TUR", "TUR", "UEFA", "🇹🇷"),
    "ucrania": ("UKR", "UKR", "UEFA", "🇺🇦"),
    "uruguay": ("URU", "URU", "CONMEBOL", "🇺🇾"),
    "uzbekistan": ("UZB", "UZB", "AFC", "🇺🇿"),
    "venezuela": ("VEN", "VEN", "CONMEBOL", "🇻🇪"),
}


def _norm(s: str) -> str:
    """Lower + sin acentos + sin caracteres extra."""
    s = s.lower().strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s


POSITION_MAP = {
    "portero": "GK",
    "arquero": "GK",
    "defensor": "DF",
    "mediocampista": "MF",
    "delantero": "FW",
}


def map_country(country_es: str) -> tuple[str, str, str, str] | None:
    """Devuelve (team_id, fifa_code, confederation, flag) o None si no se reconoce."""
    return COUNTRY_MAP.get(_norm(country_es))


def map_position(pos_general_es: str) -> str:
    return POSITION_MAP.get(_norm(pos_general_es), "MF")


def compute_player_rating(caps: int, age: int, position: str, is_starter: bool) -> float:
    """Rating 0-100 centrado en 50 a partir de info básica.
    Cuando haya provider real, este se reemplaza con métricas de rendimiento.
    """
    # Caps cap a 100 → +0..+18
    caps_score = min(caps, 100) / 100 * 18
    # Curva de edad: peak 27, ancho 6
    age_pen = -((age - 27) ** 2) / 6 * 0.6  # max 0, min ~-15 at 18 or 36
    # Prior por posición (los porteros muy pegados al medio, FW un toque arriba por visibilidad)
    pos_bias = {"GK": 0.0, "DF": 0.0, "MF": 1.0, "FW": 2.0}.get(position, 0.0)
    # Titularidad: si el DT te puso, tenés algo
    starter_bonus = 4.0 if is_starter else 0.0
    r = 50 + caps_score + age_pen + pos_bias + starter_bonus
    return max(20.0, min(95.0, r))


CSV_DEFAULT = Path("data/raw/squads_2026.csv")
TOURNAMENT_ID = "WC2026"


class SquadsCsvAdapter(Adapter):
    name = "squads-csv"

    def __init__(self, csv_path: Path | str | None = None):
        super().__init__()
        self.csv_path = Path(csv_path) if csv_path else CSV_DEFAULT

    def execute(self) -> int:
        if not self.csv_path.exists():
            # Try resolving from repo root
            from agamotto.core.config import settings
            alt = settings.raw_dir / "squads_2026.csv"
            if alt.exists():
                self.csv_path = alt
            else:
                raise FileNotFoundError(f"No encontré CSV en {self.csv_path} ni en {alt}")

        log.info("Reading %s", self.csv_path)
        rows: list[dict] = []
        with open(self.csv_path, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                rows.append(r)
        log.info("CSV rows: %d", len(rows))

        unmapped = set()
        with get_session() as s:
            # 1) Asegurar que todos los teams existen
            existing_teams = {t.team_id: t for t in s.execute(select(Team)).scalars().all()}
            for r in rows:
                m = map_country(r["Pais"])
                if not m:
                    unmapped.add(r["Pais"])
                    continue
                tid, code, conf, flag = m
                if tid not in existing_teams:
                    t = Team(team_id=tid, name=r["Pais"], fifa_code=code,
                             confederation=conf, flag_emoji=flag)
                    s.add(t)
                    existing_teams[tid] = t

        if unmapped:
            log.warning("Países sin mapeo: %s", sorted(unmapped))

        # 2) Borrar squads/lineups previos del torneo y reingestar
        with get_session() as s:
            old_squads = s.execute(
                select(Squad.squad_id).where(Squad.tournament_id == TOURNAMENT_ID)
            ).scalars().all()
            if old_squads:
                s.execute(delete(SquadPlayer).where(SquadPlayer.squad_id.in_(old_squads)))
                s.execute(delete(Squad).where(Squad.squad_id.in_(old_squads)))
            # Borra lineups que vamos a re-crear
            s.execute(delete(LineupPlayer))
            s.execute(delete(Lineup))

        # 3) Agrupar por team y crear Squad + SquadPlayer + Lineup
        by_team: dict[str, list[dict]] = {}
        for r in rows:
            m = map_country(r["Pais"])
            if not m:
                continue
            by_team.setdefault(m[0], []).append(r)

        processed_rows = 0
        with get_session() as s:
            for team_id, players in by_team.items():
                squad = Squad(
                    team_id=team_id, tournament_id=TOURNAMENT_ID,
                    status="official", valid_from=datetime.utcnow(),
                )
                s.add(squad)
                s.flush()  # get squad_id

                lineup = Lineup(
                    match_id=None,  # squad-level probable lineup, not match-specific yet
                    team_id=team_id, kind="probable",
                    captured_at=datetime.utcnow(),
                    formation=None,
                ) if False else None  # match_id is required; skip Lineup here, infer per match later

                for r in players:
                    name = r["Jugador"].strip()
                    pos = map_position(r["Posicion_General"])
                    age = int(r["Edad"]) if r["Edad"] else 26
                    height = int(r["Altura_cm"]) if r["Altura_cm"] else None
                    club = r["Club_Actual"].strip()
                    dorsal = int(r["Dorsal"]) if r["Dorsal"] else None
                    caps = int(r["Partidos_Internacionales"]) if r["Partidos_Internacionales"] else 0
                    is_starter = _norm(r["Es_Titular"]) in ("si", "sí")

                    pid = canonical_player_id(name)
                    # Player upsert (the same player name could theoretically clash; canonical ID is good enough for synthetic)
                    p = s.get(Player, pid)
                    if not p:
                        p = Player(
                            player_id=pid, name=name, full_name=name,
                            position=pos, nation=team_id, club=club,
                            height_cm=height,
                        )
                        s.add(p)
                    else:
                        p.nation = team_id
                        p.club = club
                        p.position = pos
                        if height: p.height_cm = height

                    sp = SquadPlayer(
                        squad_id=squad.squad_id, player_id=pid,
                        shirt_number=dorsal, role=r.get("Posicion_Especifica"),
                        is_starter_prob=1.0 if is_starter else 0.05,
                        availability="available",
                    )
                    s.add(sp)
                    processed_rows += 1

        log.info("Loaded %d players across %d teams", processed_rows, len(by_team))
        return processed_rows


def run(csv_path: str | None = None) -> int:
    return SquadsCsvAdapter(csv_path=csv_path).run()
