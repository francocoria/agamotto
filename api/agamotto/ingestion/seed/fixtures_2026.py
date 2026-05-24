"""Generador de fixtures del Mundial 2026.

Genera los 72 partidos de fase de grupos + 32 de eliminación = 104.
Asigna sedes y horarios en una distribución plausible entre el 11/06/2026 y el 19/07/2026.

NOTA: el calendario real difiere; este es un template funcional.
El usuario reemplaza con el calendario oficial cuando esté disponible.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from agamotto.ingestion.seed.groups_2026 import GROUPS_2026
from agamotto.ingestion.seed.venues_2026 import VENUES_2026

TOURNAMENT_START = datetime(2026, 6, 11, 18, 0)  # UTC
TOURNAMENT_END = datetime(2026, 7, 19, 20, 0)

_VENUE_IDS = [v["venue_id"] for v in VENUES_2026]


def _round_robin_pairs(teams: list[str]) -> list[tuple[str, str]]:
    """Round-robin para 4 equipos: 6 partidos.

    Schedule estándar Mundial:
      J1: 1v2, 3v4
      J2: 1v3, 2v4
      J3: 1v4, 2v3   (último día con ambos partidos a la misma hora)
    """
    t = teams
    return [
        (t[0], t[1]), (t[2], t[3]),
        (t[0], t[2]), (t[1], t[3]),
        (t[0], t[3]), (t[1], t[2]),
    ]


def generate_group_stage_fixtures() -> list[dict]:
    """Genera los 72 partidos de fase de grupos."""
    fixtures: list[dict] = []
    match_no = 1
    # 18 días de fase de grupos (11/06 - 28/06 aprox)
    day_offset = 0
    venue_idx = 0
    for group_label, teams in GROUPS_2026.items():
        pairs = _round_robin_pairs(teams)
        for i, (home, away) in enumerate(pairs):
            day_in_group = i // 2
            kickoff = TOURNAMENT_START + timedelta(days=day_offset + day_in_group, hours=(i % 2) * 4)
            venue = _VENUE_IDS[venue_idx % len(_VENUE_IDS)]
            venue_idx += 1
            fixtures.append({
                "match_id": f"WC2026_GROUP_{group_label}{i+1:02d}",
                "stage": "group",
                "group_label": group_label,
                "match_number": match_no,
                "kickoff_utc": kickoff,
                "venue_id": venue,
                "home_team_id": home,
                "away_team_id": away,
            })
            match_no += 1
        day_offset += 1  # cada grupo arranca un día después
    return fixtures


def generate_knockout_template() -> list[dict]:
    """Genera los 32 partidos de eliminación con placeholders de equipos.

    El simulador completa los equipos al recorrer cada universo.
    """
    fixtures: list[dict] = []
    match_no = 73
    day_offset = 25  # 32avos arrancan ~día 25
    venue_idx = 0

    # 32avos: 16 partidos
    stage_specs = [
        ("round_32", 16, 25, 4),
        ("round_16", 8, 30, 4),
        ("quarter", 4, 34, 6),
        ("semi", 2, 38, 4),
        ("third_place", 1, 41, 0),
        ("final", 1, 42, 0),
    ]
    for stage, n_matches, day_off, spread in stage_specs:
        for i in range(n_matches):
            day = day_off + (i // 2 if spread > 0 else 0)
            kickoff = TOURNAMENT_START + timedelta(days=day, hours=18 + (i % 2) * 3)
            venue = _VENUE_IDS[venue_idx % len(_VENUE_IDS)]
            venue_idx += 1
            fixtures.append({
                "match_id": f"WC2026_{stage.upper()}_{i+1:02d}",
                "stage": stage,
                "group_label": None,
                "match_number": match_no,
                "kickoff_utc": kickoff,
                "venue_id": venue,
                "home_team_id": None,  # filled by simulator
                "away_team_id": None,
            })
            match_no += 1
    return fixtures


def all_fixtures() -> list[dict]:
    return generate_group_stage_fixtures() + generate_knockout_template()


if __name__ == "__main__":
    fx = all_fixtures()
    print(f"Total fixtures: {len(fx)}")
    print(f"  Group stage: {sum(1 for f in fx if f['stage'] == 'group')}")
    print(f"  Knockout: {sum(1 for f in fx if f['stage'] != 'group')}")
