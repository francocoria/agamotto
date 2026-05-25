"""Mapeo curado de clubes → tier (1=elite, 4=otros).

Tier 1: top de Europa con más Champions League en últimos 10 años.
Tier 2: top-5 ligas europeas, no-elite + finalistas Europa League.
Tier 3: otras ligas top europeas (Eredivisie, Liga Portugal, Bélgica, etc.).
Tier 4: resto (MLS, Saudi Pro, Asian, Sudamérica top, etc.).
Default: tier 3.5 (cuando no se reconoce).
"""

from __future__ import annotations

import re
import unicodedata


# Normalizadores
def _norm(s: str) -> str:
    s = s.lower().strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"\s+", " ", s)
    return s


# Tier 1: élite global (campeones / habituales Champions semis)
TIER_1 = {
    "real madrid", "barcelona", "fc barcelona", "barca",
    "manchester city", "man city", "manchester c",
    "bayern munich", "bayern", "fc bayern munich", "bayern munich",
    "psg", "paris saint germain", "paris saint-germain", "paris s g",
    "liverpool", "liverpool fc",
    "manchester united", "man utd", "man united",
    "arsenal", "arsenal fc",
    "chelsea", "chelsea fc",
    "inter", "internazionale", "inter milan",
    "ac milan", "milan",
    "juventus", "juve",
    "atletico madrid", "atletico", "atletico de madrid", "atlético madrid",
    "borussia dortmund", "dortmund", "bvb",
    "napoli", "ssc napoli",
    "tottenham", "tottenham hotspur", "spurs",
}

# Tier 2: top-5 European leagues (Premier, La Liga, Serie A, Bundesliga, Ligue 1)
TIER_2 = {
    # Premier League (no élite)
    "newcastle", "newcastle united", "aston villa", "brighton",
    "west ham", "west ham united", "everton", "crystal palace",
    "wolves", "wolverhampton", "leicester", "leicester city",
    "brentford", "bournemouth", "fulham", "nottingham forest",
    "leeds", "leeds united", "southampton", "burnley",
    "sheffield united",
    # La Liga
    "real sociedad", "athletic", "athletic club", "athletic bilbao",
    "villarreal", "valencia", "real betis", "betis",
    "sevilla", "celta", "celta vigo", "osasuna",
    "girona", "rayo vallecano", "mallorca", "las palmas",
    "getafe", "alaves", "alavés", "espanyol",
    # Serie A
    "roma", "as roma", "lazio", "atalanta", "fiorentina",
    "torino", "bologna", "sampdoria", "udinese", "sassuolo",
    "monza", "verona", "hellas verona", "genoa", "cagliari",
    "lecce", "salernitana", "frosinone", "empoli",
    # Bundesliga
    "bayer leverkusen", "leverkusen", "rb leipzig", "leipzig",
    "eintracht frankfurt", "frankfurt", "vfb stuttgart", "stuttgart",
    "wolfsburg", "vfl wolfsburg", "borussia monchengladbach", "monchengladbach",
    "freiburg", "sc freiburg", "hoffenheim", "tsg hoffenheim",
    "union berlin", "1 fc union berlin", "fc augsburg", "augsburg",
    "fsv mainz 05", "mainz", "werder bremen", "werder", "bremen",
    "hamburger sv", "hsv", "hertha", "hertha bsc",
    # Ligue 1
    "marseille", "om", "olympique marseille",
    "monaco", "as monaco", "lyon", "ol", "olympique lyonnais",
    "lille", "losc", "rennes", "stade rennais",
    "nice", "ogc nice", "lens", "rc lens",
    "strasbourg", "nantes", "fc nantes", "montpellier",
    "reims", "stade de reims", "toulouse", "brest", "stade brestois",
}

# Tier 3: otras ligas top europeas + algunas sudamericanas elite
TIER_3 = {
    # Eredivisie
    "ajax", "psv", "psv eindhoven", "feyenoord", "az", "az alkmaar",
    "twente", "fc twente", "utrecht", "fc utrecht", "vitesse",
    # Primeira Liga
    "benfica", "sl benfica", "porto", "fc porto", "sporting", "sporting cp",
    "braga", "sc braga", "vitoria sc", "boavista",
    # Belgian Pro
    "club brugge", "brugge", "anderlecht", "rsc anderlecht",
    "genk", "krc genk", "standard liege", "antwerp", "royal antwerp",
    "gent", "kaa gent", "union sg",
    # Scottish Premiership
    "celtic", "rangers", "hibernian", "aberdeen",
    # Turkish Süper Lig
    "galatasaray", "fenerbahce", "fenerbahçe", "besiktas", "beşiktaş",
    "trabzonspor", "basaksehir", "başakşehir",
    # Greek Super League
    "olympiacos", "panathinaikos", "aek athens", "paok",
    # Other Europe
    "shakhtar donetsk", "shakhtar", "dynamo kiev", "dynamo kyiv",
    "red star belgrade", "crvena zvezda", "partizan", "dinamo zagreb",
    "ferencvaros", "slavia praha", "sparta praha", "salzburg", "red bull salzburg",
    "lazio", "rb salzburg",
    # Brazilian Serie A
    "flamengo", "palmeiras", "corinthians", "sao paulo", "são paulo",
    "fluminense", "internacional", "gremio", "grêmio", "santos",
    "atletico mineiro", "atlético mineiro", "botafogo", "vasco da gama",
    "athletico paranaense", "fortaleza",
    # Argentine Primera
    "river plate", "boca juniors", "racing", "racing club",
    "san lorenzo", "independiente", "estudiantes",
    "velez", "vélez sarsfield", "lanus", "lanús", "talleres",
    # MLS top
    "inter miami", "los angeles fc", "lafc", "atlanta united",
    "seattle sounders", "new york city fc", "ny city fc",
    # J1 League / K League top
    "kawasaki frontale", "yokohama f marinos", "urawa", "ulsan", "jeonbuk hyundai motors",
    # Saudi Pro
    "al hilal", "al nassr", "al ittihad", "al ahli",
}


def get_club_tier(club_name: str) -> float:
    """Devuelve 1.0..4.0. 1=elite, 4=otros desconocidos."""
    n = _norm(club_name)
    if not n:
        return 3.5
    if n in TIER_1:
        return 1.0
    if n in TIER_2:
        return 2.0
    if n in TIER_3:
        return 3.0
    # Substring match para variantes
    for cand in TIER_1:
        if cand in n or n in cand:
            return 1.0
    for cand in TIER_2:
        if cand in n or n in cand:
            return 2.0
    for cand in TIER_3:
        if cand in n or n in cand:
            return 3.0
    return 4.0
