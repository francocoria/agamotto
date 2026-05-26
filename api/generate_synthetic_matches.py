"""
generate_synthetic_matches.py
Generates rich synthetic historical match data for all 57 WC2026 teams.
Completely standalone — no DB required.
"""
import json
import random
import math
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Team profiles ────────────────────────────────────────────────────────────
# Each team has: elo, attack_str, defense_str, possession_style, tempo
TEAMS = {
    "ARG": {"elo": 1975, "att": 1.85, "def": 0.75, "pos": 0.54, "tempo": "medium"},
    "BRA": {"elo": 1960, "att": 1.90, "def": 0.70, "pos": 0.57, "tempo": "high"},
    "FRA": {"elo": 1950, "att": 1.80, "def": 0.68, "pos": 0.55, "tempo": "medium"},
    "ENG": {"elo": 1900, "att": 1.70, "def": 0.72, "pos": 0.53, "tempo": "high"},
    "ESP": {"elo": 1895, "att": 1.65, "def": 0.65, "pos": 0.62, "tempo": "medium"},
    "GER": {"elo": 1890, "att": 1.72, "def": 0.70, "pos": 0.56, "tempo": "high"},
    "POR": {"elo": 1880, "att": 1.78, "def": 0.73, "pos": 0.54, "tempo": "medium"},
    "BEL": {"elo": 1865, "att": 1.68, "def": 0.74, "pos": 0.52, "tempo": "medium"},
    "NED": {"elo": 1855, "att": 1.62, "def": 0.71, "pos": 0.55, "tempo": "medium"},
    "ITA": {"elo": 1850, "att": 1.55, "def": 0.60, "pos": 0.56, "tempo": "low"},
    "URU": {"elo": 1830, "att": 1.60, "def": 0.67, "pos": 0.50, "tempo": "medium"},
    "COL": {"elo": 1810, "att": 1.58, "def": 0.74, "pos": 0.51, "tempo": "medium"},
    "MEX": {"elo": 1790, "att": 1.45, "def": 0.76, "pos": 0.50, "tempo": "medium"},
    "USA": {"elo": 1780, "att": 1.42, "def": 0.77, "pos": 0.49, "tempo": "high"},
    "CAN": {"elo": 1755, "att": 1.38, "def": 0.79, "pos": 0.47, "tempo": "high"},
    "ECU": {"elo": 1740, "att": 1.35, "def": 0.78, "pos": 0.48, "tempo": "medium"},
    "CRI": {"elo": 1720, "att": 1.20, "def": 0.72, "pos": 0.45, "tempo": "low"},
    "HON": {"elo": 1670, "att": 1.10, "def": 0.82, "pos": 0.43, "tempo": "low"},
    "PAN": {"elo": 1660, "att": 1.08, "def": 0.83, "pos": 0.43, "tempo": "low"},
    "MAR": {"elo": 1820, "att": 1.55, "def": 0.65, "pos": 0.49, "tempo": "medium"},
    "SEN": {"elo": 1800, "att": 1.52, "def": 0.70, "pos": 0.48, "tempo": "medium"},
    "NGA": {"elo": 1770, "att": 1.48, "def": 0.74, "pos": 0.47, "tempo": "high"},
    "EGY": {"elo": 1750, "att": 1.45, "def": 0.75, "pos": 0.48, "tempo": "medium"},
    "CMR": {"elo": 1730, "att": 1.42, "def": 0.76, "pos": 0.46, "tempo": "medium"},
    "GHA": {"elo": 1710, "att": 1.38, "def": 0.78, "pos": 0.46, "tempo": "medium"},
    "TUN": {"elo": 1700, "att": 1.30, "def": 0.72, "pos": 0.47, "tempo": "medium"},
    "CIV": {"elo": 1720, "att": 1.40, "def": 0.75, "pos": 0.47, "tempo": "medium"},
    "MLI": {"elo": 1680, "att": 1.28, "def": 0.77, "pos": 0.46, "tempo": "medium"},
    "RSA": {"elo": 1660, "att": 1.22, "def": 0.80, "pos": 0.45, "tempo": "medium"},
    "ALG": {"elo": 1715, "att": 1.35, "def": 0.73, "pos": 0.48, "tempo": "medium"},
    "JPN": {"elo": 1840, "att": 1.60, "def": 0.68, "pos": 0.53, "tempo": "high"},
    "KOR": {"elo": 1800, "att": 1.52, "def": 0.72, "pos": 0.51, "tempo": "high"},
    "AUS": {"elo": 1760, "att": 1.42, "def": 0.76, "pos": 0.49, "tempo": "high"},
    "IRN": {"elo": 1790, "att": 1.38, "def": 0.65, "pos": 0.48, "tempo": "low"},
    "SAU": {"elo": 1740, "att": 1.32, "def": 0.74, "pos": 0.47, "tempo": "medium"},
    "CHN": {"elo": 1710, "att": 1.28, "def": 0.79, "pos": 0.49, "tempo": "medium"},
    "IDN": {"elo": 1660, "att": 1.18, "def": 0.84, "pos": 0.45, "tempo": "medium"},
    "UZB": {"elo": 1690, "att": 1.25, "def": 0.78, "pos": 0.46, "tempo": "medium"},
    "THA": {"elo": 1650, "att": 1.15, "def": 0.82, "pos": 0.47, "tempo": "medium"},
    "SUI": {"elo": 1870, "att": 1.58, "def": 0.65, "pos": 0.54, "tempo": "medium"},
    "CRO": {"elo": 1860, "att": 1.62, "def": 0.67, "pos": 0.53, "tempo": "medium"},
    "DEN": {"elo": 1845, "att": 1.55, "def": 0.66, "pos": 0.52, "tempo": "high"},
    "SWE": {"elo": 1830, "att": 1.50, "def": 0.68, "pos": 0.51, "tempo": "medium"},
    "NOR": {"elo": 1825, "att": 1.65, "def": 0.70, "pos": 0.50, "tempo": "high"},
    "AUT": {"elo": 1810, "att": 1.55, "def": 0.69, "pos": 0.52, "tempo": "high"},
    "UKR": {"elo": 1800, "att": 1.48, "def": 0.71, "pos": 0.50, "tempo": "medium"},
    "POL": {"elo": 1795, "att": 1.50, "def": 0.72, "pos": 0.50, "tempo": "medium"},
    "SCO": {"elo": 1780, "att": 1.45, "def": 0.73, "pos": 0.49, "tempo": "high"},
    "SRB": {"elo": 1790, "att": 1.52, "def": 0.72, "pos": 0.50, "tempo": "medium"},
    "ROU": {"elo": 1770, "att": 1.42, "def": 0.73, "pos": 0.50, "tempo": "medium"},
    "HUN": {"elo": 1760, "att": 1.38, "def": 0.74, "pos": 0.49, "tempo": "medium"},
    "CZE": {"elo": 1775, "att": 1.45, "def": 0.71, "pos": 0.51, "tempo": "medium"},
    "PER": {"elo": 1780, "att": 1.45, "def": 0.73, "pos": 0.50, "tempo": "medium"},
    "CHI": {"elo": 1760, "att": 1.40, "def": 0.74, "pos": 0.51, "tempo": "medium"},
    "VEN": {"elo": 1740, "att": 1.35, "def": 0.76, "pos": 0.48, "tempo": "medium"},
    "PAR": {"elo": 1720, "att": 1.30, "def": 0.76, "pos": 0.48, "tempo": "medium"},
    "BOL": {"elo": 1680, "att": 1.22, "def": 0.80, "pos": 0.46, "tempo": "low"},
}

TOURNAMENTS = [
    "FIFA World Cup Qualifier",
    "Friendly International",
    "FIFA World Cup",
    "Copa América",
    "CONCACAF Gold Cup",
    "African Cup of Nations",
    "Asian Cup",
    "UEFA Nations League",
    "EURO 2024",
    "Copa del Mundo FIFA",
]

OPPONENTS_BY_CONF = {
    "CONMEBOL": ["ARG", "BRA", "URU", "COL", "ECU", "PER", "CHI", "VEN", "PAR", "BOL"],
    "UEFA": ["FRA", "ENG", "ESP", "GER", "POR", "BEL", "NED", "ITA", "SUI", "CRO", "DEN", "SWE", "NOR", "AUT", "UKR", "POL", "SCO", "SRB", "ROU", "HUN", "CZE"],
    "CONCACAF": ["MEX", "USA", "CAN", "CRI", "HON", "PAN"],
    "CAF": ["MAR", "SEN", "NGA", "EGY", "CMR", "GHA", "TUN", "CIV", "MLI", "RSA", "ALG"],
    "AFC": ["JPN", "KOR", "AUS", "IRN", "SAU", "CHN", "IDN", "UZB", "THA"],
}

def get_conf(team_id):
    for conf, teams in OPPONENTS_BY_CONF.items():
        if team_id in teams:
            return conf
    return "UEFA"

def poisson_sample(lam, rng):
    """Sample from Poisson distribution."""
    lam = max(0.1, lam)
    L = math.exp(-lam)
    k, p = 0, 1.0
    while True:
        k += 1
        p *= rng.random()
        if p <= L:
            break
    return k - 1

def generate_match(home_id, away_id, match_idx, date_str, tournament, neutral=False, rng=None):
    if rng is None:
        rng = random.Random(f"{home_id}_{away_id}_{match_idx}")
    
    hp = TEAMS.get(home_id, TEAMS["MEX"])
    ap = TEAMS.get(away_id, TEAMS["MEX"])
    
    elo_diff = (hp["elo"] - ap["elo"]) / 400.0
    home_adv = 0.0 if neutral else 0.1
    
    # Lambda goals (Poisson)
    lambda_home = hp["att"] * (1 / ap["def"]) * math.exp(elo_diff * 0.5 + home_adv) * 1.15
    lambda_away = ap["att"] * (1 / hp["def"]) * math.exp(-elo_diff * 0.5) * 1.0
    lambda_home = max(0.3, min(4.5, lambda_home))
    lambda_away = max(0.3, min(4.5, lambda_away))
    
    hs = poisson_sample(lambda_home, rng)
    as_ = poisson_sample(lambda_away, rng)
    
    # Possession
    pos_base = hp["pos"]
    if not neutral:
        pos_base = min(0.70, pos_base + 0.03)
    pos_base += (elo_diff * 0.08)
    pos_base = max(0.30, min(0.70, pos_base + rng.gauss(0, 0.04)))
    home_pos = round(pos_base, 3)
    away_pos = round(1.0 - home_pos, 3)
    
    # Shots
    home_shots = max(hs, int(round(4 + hs * 2.0 + (home_pos - 0.5) * 12 + rng.gauss(0, 3))))
    away_shots = max(as_, int(round(4 + as_ * 2.0 + (away_pos - 0.5) * 12 + rng.gauss(0, 3))))
    
    # SOT
    home_sot = hs + min(home_shots - hs, int(rng.gauss((home_shots - hs) * 0.45, 1.5)))
    home_sot = max(hs, min(home_shots, home_sot))
    away_sot = as_ + min(away_shots - as_, int(rng.gauss((away_shots - as_) * 0.45, 1.5)))
    away_sot = max(as_, min(away_shots, away_sot))
    
    # Corners
    home_corners = max(0, int(round(2 + home_pos * 10 + rng.gauss(0, 2))))
    away_corners = max(0, int(round(2 + away_pos * 10 + rng.gauss(0, 2))))
    
    # Fouls
    home_fouls = max(5, int(round(11 + rng.gauss(0, 3))))
    away_fouls = max(5, int(round(12 + rng.gauss(0, 3))))
    
    # Cards
    home_yellows = max(0, int(rng.gauss(1.4, 0.9)))
    away_yellows = max(0, int(rng.gauss(1.6, 0.9)))
    home_reds = 1 if rng.random() < 0.05 else 0
    away_reds = 1 if rng.random() < 0.05 else 0
    
    # xG
    home_xg = round(lambda_home * (0.85 + rng.gauss(0, 0.12)), 2)
    away_xg = round(lambda_away * (0.85 + rng.gauss(0, 0.12)), 2)
    home_xg = max(0.1, home_xg)
    away_xg = max(0.1, away_xg)
    
    # Passes
    home_passes = max(150, int(round(home_pos * 800 + rng.gauss(0, 30))))
    away_passes = max(150, int(round(away_pos * 800 + rng.gauss(0, 30))))
    
    # Pass accuracy
    home_pass_acc = round(max(60, min(95, 68 + home_pos * 20 + rng.gauss(0, 3))), 1)
    away_pass_acc = round(max(60, min(95, 68 + away_pos * 20 + rng.gauss(0, 3))), 1)
    
    # Free kicks (= opponent fouls + variation)
    home_free_kicks = away_fouls + rng.randint(-2, 3)
    away_free_kicks = home_fouls + rng.randint(-2, 3)
    home_free_kicks = max(3, home_free_kicks)
    away_free_kicks = max(3, away_free_kicks)
    
    # Offsides
    home_offsides = max(0, int(rng.gauss(1.8, 1.2)))
    away_offsides = max(0, int(rng.gauss(1.8, 1.2)))
    
    # Aerials
    home_aerials = max(3, int(rng.gauss(12, 4)))
    away_aerials = max(3, int(rng.gauss(12, 4)))
    
    # Saves
    home_saves = max(0, away_sot - as_)
    away_saves = max(0, home_sot - hs)
    
    # Goals by period (7 buckets, Poisson-like distribution)
    PERIOD_WEIGHTS = [0.11, 0.14, 0.15, 0.13, 0.15, 0.20, 0.12]  # 0-15, 15-30, 30-45, 45-60, 60-75, 75-90, 90+
    
    def distribute_goals(n_goals, weights, seed_extra):
        buckets = {"0_15": 0, "15_30": 0, "30_45": 0, "45_60": 0, "60_75": 0, "75_90": 0, "90plus": 0}
        keys = list(buckets.keys())
        local_rng = random.Random(f"{home_id}{away_id}{match_idx}{seed_extra}")
        for _ in range(n_goals):
            r = local_rng.random()
            cum = 0
            for i, w in enumerate(weights):
                cum += w
                if r <= cum:
                    buckets[keys[i]] += 1
                    break
        return buckets
    
    periods_home = distribute_goals(hs, PERIOD_WEIGHTS, "h")
    periods_away = distribute_goals(as_, PERIOD_WEIGHTS, "a")
    
    early_goals_home = periods_home["0_15"]
    early_goals_away = periods_away["0_15"]
    
    fh_goals_home = periods_home["0_15"] + periods_home["15_30"] + periods_home["30_45"]
    sh_goals_home = hs - fh_goals_home
    fh_goals_away = periods_away["0_15"] + periods_away["15_30"] + periods_away["30_45"]
    sh_goals_away = as_ - fh_goals_away
    
    # Half splits helper
    def split(total, ratio, noise=0.08):
        h1 = int(round(total * ratio + rng.gauss(0, noise * total + 0.5)))
        h1 = max(0, min(total, h1))
        return h1, total - h1
    
    fh_shots_h, sh_shots_h = split(home_shots, 0.44)
    fh_shots_a, sh_shots_a = split(away_shots, 0.44)
    fh_sot_h, sh_sot_h = split(home_sot, 0.44)
    fh_sot_a, sh_sot_a = split(away_sot, 0.44)
    fh_corn_h, sh_corn_h = split(home_corners, 0.48)
    fh_corn_a, sh_corn_a = split(away_corners, 0.48)
    fh_fouls_h, sh_fouls_h = split(home_fouls, 0.47)
    fh_fouls_a, sh_fouls_a = split(away_fouls, 0.47)
    fh_free_h, sh_free_h = split(home_free_kicks, 0.48)
    fh_free_a, sh_free_a = split(away_free_kicks, 0.48)
    fh_offs_h, sh_offs_h = split(home_offsides, 0.50)
    fh_offs_a, sh_offs_a = split(away_offsides, 0.50)
    
    fh_pos_h = round(max(0.30, min(0.70, home_pos + rng.gauss(0, 0.02))), 3)
    sh_pos_h = round(1.0 - fh_pos_h, 3)
    
    fh_xg_h = round(max(0.05, home_xg * 0.44 + rng.gauss(0, 0.08)), 2)
    sh_xg_h = round(max(0.05, home_xg - fh_xg_h), 2)
    fh_xg_a = round(max(0.05, away_xg * 0.44 + rng.gauss(0, 0.08)), 2)
    sh_xg_a = round(max(0.05, away_xg - fh_xg_a), 2)
    
    return {
        "date": date_str,
        "home": home_id,
        "away": away_id,
        "home_score": hs,
        "away_score": as_,
        "neutral": neutral,
        "tournament": tournament,
        "stats": {
            "home": {
                "possession": home_pos,
                "shots": home_shots,
                "shots_on_target": home_sot,
                "corners": home_corners,
                "early_goals_10m": early_goals_home,
                "fouls": home_fouls,
                "yellow_cards": home_yellows,
                "red_cards": home_reds,
                "free_kicks": home_free_kicks,
                "offsides": home_offsides,
                "passes": home_passes,
                "pass_accuracy": home_pass_acc,
                "aerials_won": home_aerials,
                "saves": home_saves,
                "xg": home_xg,
                "goals_by_period": periods_home,
                "first_half": {
                    "goals": fh_goals_home,
                    "possession": fh_pos_h,
                    "shots": fh_shots_h,
                    "shots_on_target": fh_sot_h,
                    "corners": fh_corn_h,
                    "fouls": fh_fouls_h,
                    "free_kicks": fh_free_h,
                    "offsides": fh_offs_h,
                    "xg": fh_xg_h
                },
                "second_half": {
                    "goals": sh_goals_home,
                    "possession": sh_pos_h,
                    "shots": sh_shots_h,
                    "shots_on_target": sh_sot_h,
                    "corners": sh_corn_h,
                    "fouls": sh_fouls_h,
                    "free_kicks": sh_free_h,
                    "offsides": sh_offs_h,
                    "xg": sh_xg_h
                }
            },
            "away": {
                "possession": away_pos,
                "shots": away_shots,
                "shots_on_target": away_sot,
                "corners": away_corners,
                "early_goals_10m": early_goals_away,
                "fouls": away_fouls,
                "yellow_cards": away_yellows,
                "red_cards": away_reds,
                "free_kicks": away_free_kicks,
                "offsides": away_offsides,
                "passes": away_passes,
                "pass_accuracy": away_pass_acc,
                "aerials_won": away_aerials,
                "saves": away_saves,
                "xg": away_xg,
                "goals_by_period": periods_away,
                "first_half": {
                    "goals": fh_goals_away,
                    "possession": round(1.0 - fh_pos_h, 3),
                    "shots": fh_shots_a,
                    "shots_on_target": fh_sot_a,
                    "corners": fh_corn_a,
                    "fouls": fh_fouls_a,
                    "free_kicks": fh_free_a,
                    "offsides": fh_offs_a,
                    "xg": fh_xg_a
                },
                "second_half": {
                    "goals": sh_goals_away,
                    "possession": round(1.0 - sh_pos_h, 3),
                    "shots": sh_shots_a,
                    "shots_on_target": sh_sot_a,
                    "corners": sh_corn_a,
                    "fouls": sh_fouls_a,
                    "free_kicks": sh_free_a,
                    "offsides": sh_offs_a,
                    "xg": sh_xg_a
                }
            }
        }
    }

def main():
    print("Generating synthetic match data for all 57 WC2026 teams...")
    
    team_ids = list(TEAMS.keys())
    
    # Date range: 2021-01-01 to 2025-12-01 (48 months)
    import datetime
    base_date = datetime.date(2021, 1, 1)
    
    result = {}
    total_matches = 0
    
    for team_id in team_ids:
        conf = get_conf(team_id)
        
        # Build list of opponents (same conf + some cross-conf)
        conf_teams = [t for t in OPPONENTS_BY_CONF.get(conf, []) if t != team_id]
        other_teams = [t for t in team_ids if t not in conf_teams and t != team_id]
        
        rng = random.Random(team_id + "_schedule")
        
        # Pick 30 opponents, weighted toward same-conf
        opponents = []
        for _ in range(22):
            if conf_teams:
                opponents.append(rng.choice(conf_teams))
        for _ in range(12):
            if other_teams:
                opponents.append(rng.choice(other_teams))
        
        rng.shuffle(opponents)
        
        matches = []
        for i, opp in enumerate(opponents[:30]):
            # Spread over 4 years
            days_offset = int((i / 30) * 4 * 365) + rng.randint(-10, 10)
            match_date = base_date + datetime.timedelta(days=days_offset)
            date_str = match_date.isoformat()
            
            # Alternate home/away/neutral
            if i % 3 == 0:
                home_id, away_id = team_id, opp
                neutral = False
            elif i % 3 == 1:
                home_id, away_id = opp, team_id
                neutral = False
            else:
                home_id, away_id = team_id, opp
                neutral = True
            
            tournament = rng.choice(TOURNAMENTS)
            
            match_rng = random.Random(f"{home_id}_{away_id}_{i}_{team_id}")
            match = generate_match(home_id, away_id, i, date_str, tournament, neutral, rng=match_rng)
            matches.append(match)
        
        # Sort by date descending (most recent first)
        matches.sort(key=lambda m: m["date"], reverse=True)
        result[team_id] = matches
        total_matches += len(matches)
        print(f"  {team_id}: {len(matches)} partidos generados")
    
    out_path = OUTPUT_DIR / "team-recent-matches.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
    
    size_kb = out_path.stat().st_size / 1024
    print(f"\n✅ Done! {total_matches} total matches for {len(team_ids)} teams")
    print(f"   File: {out_path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
