"""Scraper de planteles de selecciones desde Wikipedia EN.

Para cada team_id en la DB, busca la página oficial 'X national football team'
y extrae la tabla del 'Current squad' (lo más cercano a una convocatoria
oficial del Mundial 2026 disponible públicamente, ya que el torneo no empezó).

Output:
  - CSV en data/raw/squads_wikipedia.csv con el mismo formato que squads_2026.csv,
    para que se pueda inspeccionar/editar antes de ingestar.

Uso:
  agamotto ingest wikipedia-squads
  agamotto ingest squads-csv --path data/raw/squads_wikipedia.csv
"""

from __future__ import annotations

import csv
import re
import time
from datetime import date, datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from sqlalchemy import select

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import Team
from agamotto.ingestion.base import Adapter

log = get_logger(__name__)

USER_AGENT = "Agamotto/1.0 (academic research; https://github.com/francocoria/agamotto)"
WIKI_BASE = "https://en.wikipedia.org/wiki/"
RATE_LIMIT_SEC = 1.0  # one request per second, polite

# team_id → Wikipedia page slug (uses English names)
TEAM_TO_WIKI: dict[str, str] = {
    # Hosts
    "CAN": "Canada_men%27s_national_soccer_team",
    "MEX": "Mexico_national_football_team",
    "USA": "United_States_men%27s_national_soccer_team",
    # CONMEBOL
    "ARG": "Argentina_national_football_team",
    "BRA": "Brazil_national_football_team",
    "URU": "Uruguay_national_football_team",
    "COL": "Colombia_national_football_team",
    "ECU": "Ecuador_national_football_team",
    "PAR": "Paraguay_national_football_team",
    "VEN": "Venezuela_national_football_team",
    "PER": "Peru_national_football_team",
    "CHI": "Chile_national_football_team",
    "BOL": "Bolivia_national_football_team",
    # UEFA
    "FRA": "France_national_football_team",
    "ESP": "Spain_national_football_team",
    "ENG": "England_national_football_team",
    "POR": "Portugal_national_football_team",
    "NED": "Netherlands_national_football_team",
    "BEL": "Belgium_national_football_team",
    "GER": "Germany_national_football_team",
    "ITA": "Italy_national_football_team",
    "CRO": "Croatia_national_football_team",
    "SUI": "Switzerland_national_football_team",
    "DEN": "Denmark_national_football_team",
    "AUT": "Austria_national_football_team",
    "UKR": "Ukraine_national_football_team",
    "TUR": "Turkey_national_football_team",
    "SWE": "Sweden_national_football_team",
    "POL": "Poland_national_football_team",
    "BIH": "Bosnia_and_Herzegovina_national_football_team",
    "SRB": "Serbia_national_football_team",
    "NOR": "Norway_national_football_team",
    "CZE": "Czech_Republic_national_football_team",
    "WAL": "Wales_national_football_team",
    "SCO": "Scotland_national_football_team",
    "IRL": "Republic_of_Ireland_national_football_team",
    "HUN": "Hungary_national_football_team",
    "GRE": "Greece_national_football_team",
    "ROU": "Romania_national_football_team",
    "ISL": "Iceland_national_football_team",
    # CAF
    "MAR": "Morocco_national_football_team",
    "SEN": "Senegal_national_football_team",
    "EGY": "Egypt_national_football_team",
    "ALG": "Algeria_national_football_team",
    "NGA": "Nigeria_national_football_team",
    "CIV": "Ivory_Coast_national_football_team",
    "CMR": "Cameroon_national_football_team",
    "TUN": "Tunisia_national_football_team",
    "GHA": "Ghana_national_football_team",
    "CPV": "Cape_Verde_national_football_team",
    "COD": "DR_Congo_national_football_team",
    "RSA": "South_Africa_national_football_team",
    # AFC
    "JPN": "Japan_national_football_team",
    "IRN": "Iran_national_football_team",
    "KOR": "South_Korea_national_football_team",
    "AUS": "Australia_men%27s_national_soccer_team",
    "KSA": "Saudi_Arabia_national_football_team",
    "QAT": "Qatar_national_football_team",
    "UZB": "Uzbekistan_national_football_team",
    "IRQ": "Iraq_national_football_team",
    "JOR": "Jordan_national_football_team",
    # CONCACAF
    "PAN": "Panama_national_football_team",
    "CRC": "Costa_Rica_national_football_team",
    "JAM": "Jamaica_national_football_team",
    "CUW": "Cura%C3%A7ao_national_football_team",
    "SLV": "El_Salvador_national_football_team",
    "HON": "Honduras_national_football_team",
    "HAI": "Haiti_national_football_team",
    # OFC
    "NZL": "New_Zealand_national_football_team",
}


# Wikipedia abbreviates positions inside cells like "1 GK", "16 DF" — extract the code
POS_CODE_RE = re.compile(r"\b(GK|DF|MF|FW)\b", re.I)
# Normalize positions
POS_TO_ESP_ESP = {"GK": "Arquero", "DF": "Defensor Central", "MF": "Mediocampista", "FW": "Delantero"}
POS_TO_ESP_GEN = {"GK": "Portero", "DF": "Defensor", "MF": "Mediocampista", "FW": "Delantero"}

DOB_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _parse_int(s: str) -> int | None:
    s = re.sub(r"[^\d]", "", s)
    return int(s) if s else None


def _extract_position(cell_text: str) -> str | None:
    m = POS_CODE_RE.search(cell_text)
    return m.group(1).upper() if m else None


def _extract_shirt(cell_text: str) -> int | None:
    # Cell often looks like "1 GK", "16 DF". Grab leading number.
    m = re.match(r"^\s*(\d+)", cell_text)
    return int(m.group(1)) if m else None


def _extract_dob_age(cell_text: str) -> tuple[date | None, int | None]:
    m = DOB_RE.search(cell_text)
    dob = None
    if m:
        try:
            dob = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    age = None
    am = re.search(r"\(age\s+(\d+)\)", cell_text)
    if am:
        age = int(am.group(1))
    elif dob:
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return dob, age


def _find_squad_table(soup: BeautifulSoup):
    """Encuentra la primera tabla con header 'Pos.' o 'Position' después de un H3 'Current squad' o similar."""
    heading_keywords = re.compile(r"current squad|most recent squad|recent call.?ups", re.I)
    for h in soup.find_all(["h2", "h3", "h4"]):
        if heading_keywords.search(h.get_text()):
            tbl = h.find_next("table")
            if tbl and "wikitable" in (tbl.get("class") or []):
                return tbl
    # Fallback: any wikitable that has 'Caps' and 'Club' headers
    for tbl in soup.select("table.wikitable"):
        headers = [th.get_text(strip=True).lower() for th in tbl.select("tr th")]
        if "caps" in " ".join(headers) and "club" in " ".join(headers):
            return tbl
    return None


def fetch_squad(team_id: str, slug: str, timeout: int = 25) -> list[dict] | None:
    url = WIKI_BASE + slug
    try:
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
        r.raise_for_status()
    except Exception as e:
        log.warning("  %s · fetch error: %s", team_id, e)
        return None
    soup = BeautifulSoup(r.text, "lxml")
    tbl = _find_squad_table(soup)
    if tbl is None:
        log.warning("  %s · no squad table found", team_id)
        return None

    # Build column index from header
    head_cells = [th.get_text(" ", strip=True).lower() for th in tbl.select("tr th")]
    # We expect: No. | Pos. | Player | Date of birth (age) | Caps | Goals | Club
    # But sometimes No. is missing, or columns differ. Handle robustly.

    rows = []
    for tr in tbl.select("tr"):
        cells = tr.find_all(["th", "td"])
        if len(cells) < 4:
            continue
        # Header row: skip
        if all(c.name == "th" for c in cells):
            continue
        # Heuristic mapping: try to find pos cell (has GK/DF/MF/FW token) and player cell (link to person)
        pos_code = None
        shirt = None
        player = None
        dob_text = None
        caps = None
        goals = None
        club = None

        for i, c in enumerate(cells):
            txt = _norm(c.get_text(" ", strip=True))
            # Position code?
            if pos_code is None and POS_CODE_RE.search(txt) and len(txt) <= 8:
                pos_code = _extract_position(txt)
                if shirt is None:
                    s = _extract_shirt(txt)
                    if s is not None:
                        shirt = s
                continue
            # Player name: cell with an internal link to a person, no digits
            if player is None and c.find("a") and not re.search(r"\d{4}", txt):
                # avoid pos cells (already handled) and dob cells
                if not POS_CODE_RE.search(txt):
                    player = txt
                    continue
            # DOB cell: has YYYY-MM-DD
            if dob_text is None and DOB_RE.search(txt):
                dob_text = txt
                continue
            # Numeric cells: caps and goals
            n = _parse_int(txt)
            if n is not None:
                if caps is None: caps = n
                elif goals is None: goals = n
                continue
            # Last non-empty cell with letters → club
            if txt and any(ch.isalpha() for ch in txt):
                club = txt

        if not player or pos_code is None:
            continue
        dob, age = _extract_dob_age(dob_text or "")
        rows.append({
            "shirt": shirt,
            "pos": pos_code,
            "player": player,
            "dob": dob.isoformat() if dob else "",
            "age": age,
            "caps": caps or 0,
            "goals": goals or 0,
            "club": club or "",
        })
    return rows


def _mark_likely_starters(rows: list[dict]) -> list[dict]:
    """Heurística simple: top por caps en cada posición = titulares (1 GK, 4 DF, 4 MF, 2 FW)."""
    targets = {"GK": 1, "DF": 4, "MF": 4, "FW": 2}
    by_pos = {"GK": [], "DF": [], "MF": [], "FW": []}
    for r in rows:
        by_pos.setdefault(r["pos"], []).append(r)
    starters = set()
    for pos, n in targets.items():
        candidates = sorted(by_pos.get(pos, []), key=lambda r: -(r.get("caps") or 0))[:n]
        for c in candidates:
            starters.add(id(c))
    for r in rows:
        r["is_starter"] = id(r) in starters
    return rows


class WikipediaSquadsAdapter(Adapter):
    name = "wikipedia-squads"

    def __init__(self, only: list[str] | None = None, out_csv: Path | None = None):
        super().__init__()
        self.only = set(s.upper() for s in (only or []))
        self.out_csv = Path(out_csv) if out_csv else (settings.raw_dir / "squads_wikipedia.csv")

    def execute(self) -> int:
        # Cargar groups del seed para la columna Grupo
        try:
            from agamotto.ingestion.seed.groups_2026 import GROUPS_2026
            team_to_group = {tid: f"Grupo {g}" for g, ts in GROUPS_2026.items() for tid in ts}
        except Exception:
            team_to_group = {}

        # Equipos a scrapear
        with get_session() as s:
            teams_to_fetch = s.execute(
                select(Team.team_id, Team.name, Team.confederation, Team.flag_emoji)
            ).all()
        if self.only:
            teams_to_fetch = [t for t in teams_to_fetch if t[0] in self.only]
        log.info("Fetching squads for %d teams from Wikipedia...", len(teams_to_fetch))

        all_rows: list[dict] = []
        ok, failed = 0, []
        for tid, name, conf, flag in teams_to_fetch:
            slug = TEAM_TO_WIKI.get(tid)
            if not slug:
                log.warning("  %s · no Wikipedia slug mapped", tid)
                failed.append(tid)
                continue
            log.info("  %s · %s", tid, slug)
            rows = fetch_squad(tid, slug)
            time.sleep(RATE_LIMIT_SEC)
            if not rows:
                failed.append(tid)
                continue
            rows = _mark_likely_starters(rows)
            grp = team_to_group.get(tid, "")
            for r in rows:
                all_rows.append({
                    "Pais": name,
                    "Grupo": grp,
                    "Jugador": r["player"],
                    "Posicion_Especifica": POS_TO_ESP_ESP.get(r["pos"], "Mediocampista"),
                    "Posicion_General": POS_TO_ESP_GEN.get(r["pos"], "Mediocampista"),
                    "Es_Titular": "Sí" if r["is_starter"] else "No",
                    "Edad": r["age"] if r["age"] is not None else "",
                    "Altura_cm": "",
                    "Club_Actual": r["club"],
                    "Dorsal": r["shirt"] if r["shirt"] is not None else "",
                    "Partidos_Internacionales": r["caps"] or 0,
                })
            ok += 1

        # Write CSV
        self.out_csv.parent.mkdir(parents=True, exist_ok=True)
        with open(self.out_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "Pais", "Grupo", "Jugador", "Posicion_Especifica", "Posicion_General",
                "Es_Titular", "Edad", "Altura_cm", "Club_Actual", "Dorsal",
                "Partidos_Internacionales",
            ])
            writer.writeheader()
            writer.writerows(all_rows)
        log.info("Wrote %d rows to %s · ok=%d · failed=%s", len(all_rows), self.out_csv, ok, failed)
        return len(all_rows)


def run(only: list[str] | None = None, out_csv: str | None = None) -> int:
    return WikipediaSquadsAdapter(only=only, out_csv=Path(out_csv) if out_csv else None).run()
