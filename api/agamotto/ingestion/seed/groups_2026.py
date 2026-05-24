"""Sorteo seed de los 12 grupos (A-L) del Mundial 2026.

Distribución plausible respetando:
- Anfitriones cabeza de serie: MEX (A), CAN (B), USA (D).
- No repetir equipos.
- Aproximación a distribución por bombo.

Reemplazar con el sorteo oficial cuando esté disponible.
"""

from agamotto.ingestion.seed.teams_2026 import TEAMS_2026

# Sorteo plausible
GROUPS_2026 = {
    "A": ["MEX", "POL", "MAR", "JAM"],
    "B": ["CAN", "POR", "EGY", "KSA"],
    "C": ["ARG", "ITA", "TUN", "CRC"],
    "D": ["USA", "GER", "GHA", "UZB"],
    "E": ["FRA", "DEN", "SEN", "QAT"],
    "F": ["ESP", "BEL", "ALG", "IRQ"],
    "G": ["ENG", "SUI", "NGA", "AUS"],
    "H": ["BRA", "UKR", "CIV", "KOR"],
    "I": ["NED", "AUT", "CMR", "IRN"],
    "J": ["URU", "SWE", "ECU", "PAN"],
    "K": ["COL", "CRO", "PAR", "JPN"],
    "L": ["VEN", "TUR", "NZL", "JOR"],
}


def _validate() -> dict[str, list[str]]:
    all_team_ids = [t[0] for t in TEAMS_2026]
    distributed: list[str] = []
    for grp, teams in GROUPS_2026.items():
        assert len(teams) == 4, f"Group {grp} has {len(teams)} teams"
        distributed.extend(teams)
    if len(set(distributed)) != 48 or set(distributed) != set(all_team_ids):
        # Fallback: distribuir uniformemente
        return {chr(65 + i): all_team_ids[i * 4 : (i + 1) * 4] for i in range(12)}
    return GROUPS_2026


GROUPS_2026 = _validate()
