"""48 selecciones seed para el Mundial 2026.

NOTA: lista plausible para arrancar el sistema. El usuario debe ajustar
cuando FIFA confirme las 48 clasificadas. Incluye los 3 anfitriones
garantizados (USA, MEX, CAN) y los típicos clasificados por confederación.
"""

# 48 equipos seed: hosts + plausibles por confederación
# Estructura: (team_id, name, fifa_code, confederation, fifa_rank_aprox, elo_seed, flag)

TEAMS_2026 = [
    # Anfitriones
    ("CAN", "Canada", "CAN", "CONCACAF", 30, 1700, "🇨🇦"),
    ("MEX", "Mexico", "MEX", "CONCACAF", 18, 1780, "🇲🇽"),
    ("USA", "United States", "USA", "CONCACAF", 16, 1790, "🇺🇸"),

    # CONMEBOL (6 plazas + repechaje)
    ("ARG", "Argentina", "ARG", "CONMEBOL", 1, 2160, "🇦🇷"),
    ("BRA", "Brazil", "BRA", "CONMEBOL", 5, 2010, "🇧🇷"),
    ("URU", "Uruguay", "URU", "CONMEBOL", 14, 1880, "🇺🇾"),
    ("COL", "Colombia", "COL", "CONMEBOL", 12, 1870, "🇨🇴"),
    ("ECU", "Ecuador", "ECU", "CONMEBOL", 22, 1760, "🇪🇨"),
    ("PAR", "Paraguay", "PAR", "CONMEBOL", 41, 1660, "🇵🇾"),
    ("VEN", "Venezuela", "VEN", "CONMEBOL", 53, 1620, "🇻🇪"),

    # UEFA (16 plazas)
    ("FRA", "France", "FRA", "UEFA", 2, 2050, "🇫🇷"),
    ("ESP", "Spain", "ESP", "UEFA", 3, 2030, "🇪🇸"),
    ("ENG", "England", "ENG", "UEFA", 4, 2010, "🏴󠁧󠁢󠁥󠁮󠁧󠁿"),
    ("POR", "Portugal", "POR", "UEFA", 6, 2000, "🇵🇹"),
    ("NED", "Netherlands", "NED", "UEFA", 7, 1985, "🇳🇱"),
    ("BEL", "Belgium", "BEL", "UEFA", 8, 1960, "🇧🇪"),
    ("GER", "Germany", "GER", "UEFA", 9, 1955, "🇩🇪"),
    ("ITA", "Italy", "ITA", "UEFA", 10, 1950, "🇮🇹"),
    ("CRO", "Croatia", "CRO", "UEFA", 11, 1900, "🇭🇷"),
    ("SUI", "Switzerland", "SUI", "UEFA", 19, 1840, "🇨🇭"),
    ("DEN", "Denmark", "DEN", "UEFA", 21, 1830, "🇩🇰"),
    ("AUT", "Austria", "AUT", "UEFA", 25, 1810, "🇦🇹"),
    ("UKR", "Ukraine", "UKR", "UEFA", 28, 1780, "🇺🇦"),
    ("TUR", "Turkey", "TUR", "UEFA", 27, 1790, "🇹🇷"),
    ("SWE", "Sweden", "SWE", "UEFA", 35, 1730, "🇸🇪"),
    ("POL", "Poland", "POL", "UEFA", 33, 1740, "🇵🇱"),

    # CAF (9 plazas + repechaje)
    ("MAR", "Morocco", "MAR", "CAF", 13, 1860, "🇲🇦"),
    ("SEN", "Senegal", "SEN", "CAF", 17, 1820, "🇸🇳"),
    ("EGY", "Egypt", "EGY", "CAF", 36, 1700, "🇪🇬"),
    ("ALG", "Algeria", "ALG", "CAF", 37, 1690, "🇩🇿"),
    ("NGA", "Nigeria", "NGA", "CAF", 40, 1680, "🇳🇬"),
    ("CIV", "Ivory Coast", "CIV", "CAF", 42, 1670, "🇨🇮"),
    ("CMR", "Cameroon", "CMR", "CAF", 45, 1650, "🇨🇲"),
    ("TUN", "Tunisia", "TUN", "CAF", 46, 1640, "🇹🇳"),
    ("GHA", "Ghana", "GHA", "CAF", 67, 1580, "🇬🇭"),

    # AFC (8 plazas + repechaje)
    ("JPN", "Japan", "JPN", "AFC", 15, 1830, "🇯🇵"),
    ("IRN", "Iran", "IRN", "AFC", 20, 1810, "🇮🇷"),
    ("KOR", "South Korea", "KOR", "AFC", 23, 1790, "🇰🇷"),
    ("AUS", "Australia", "AUS", "AFC", 26, 1770, "🇦🇺"),
    ("KSA", "Saudi Arabia", "KSA", "AFC", 56, 1620, "🇸🇦"),
    ("QAT", "Qatar", "QAT", "AFC", 50, 1640, "🇶🇦"),
    ("UZB", "Uzbekistan", "UZB", "AFC", 57, 1610, "🇺🇿"),
    ("IRQ", "Iraq", "IRQ", "AFC", 58, 1600, "🇮🇶"),
    ("JOR", "Jordan", "JOR", "AFC", 64, 1580, "🇯🇴"),

    # CONCACAF (resto: 3 plazas + repechaje, fuera de anfitriones)
    ("PAN", "Panama", "PAN", "CONCACAF", 39, 1680, "🇵🇦"),
    ("CRC", "Costa Rica", "CRC", "CONCACAF", 47, 1650, "🇨🇷"),
    ("JAM", "Jamaica", "JAM", "CONCACAF", 60, 1590, "🇯🇲"),

    # OFC (1 plaza + repechaje)
    ("NZL", "New Zealand", "NZL", "OFC", 95, 1500, "🇳🇿"),
]

assert len(TEAMS_2026) == 48, f"Expected 48 teams, got {len(TEAMS_2026)}"
