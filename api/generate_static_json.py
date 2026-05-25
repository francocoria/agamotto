import json
import os
import random
from datetime import date, datetime
from pathlib import Path
from sqlalchemy import select

from agamotto.core.db import get_session
from agamotto.db.models import Team, Venue, Match, HistoricalMatch

# API route functions
from agamotto.api.routes.teams import list_teams
from agamotto.api.routes.venues import list_venues
from agamotto.api.routes.matches import list_matches
from agamotto.api.routes.simulation import latest, bracket
from agamotto.api.routes.multiverse import champions, pivot_matches
from agamotto.api.routes.validation import calibration, baselines, models

# Path setup
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def custom_json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def get_or_generate_match_stats(m):
    if m.stats:
        return m.stats
    
    # Generate stats dynamically and deterministically based on match ID
    random.seed(m.id)
    hs = m.home_score
    as_ = m.away_score
    neutral = m.neutral
    
    # Early goals (approximate)
    early_goals_home = 0
    early_goals_away = 0
    for _ in range(hs):
        if random.random() < 0.08:
            early_goals_home += 1
    for _ in range(as_):
        if random.random() < 0.08:
            early_goals_away += 1

    # Possession
    base_home_pos = 50.0
    if not neutral:
        base_home_pos += 3.0
    base_home_pos += (hs - as_) * 3.0
    home_pos = base_home_pos + random.uniform(-6, 6)
    home_pos = max(30.0, min(70.0, home_pos))
    away_pos = 100.0 - home_pos

    # Shots
    home_shots = int(round(5.0 + hs * 1.8 + (home_pos - 50.0) * 0.15 + random.uniform(0, 6)))
    away_shots = int(round(5.0 + as_ * 1.8 + (away_pos - 50.0) * 0.15 + random.uniform(0, 6)))
    home_shots = max(hs, home_shots)
    away_shots = max(as_, away_shots)

    # SOT
    home_sot = hs + int(random.randint(0, max(0, int((home_shots - hs) * 0.4))))
    away_sot = as_ + int(random.randint(0, max(0, int((away_shots - as_) * 0.4))))
    home_sot = min(home_shots, home_sot)
    away_sot = min(away_shots, away_sot)

    # Corners
    home_corners = int(round(2.0 + home_pos * 0.08 + random.uniform(-1, 3)))
    away_corners = int(round(2.0 + away_pos * 0.08 + random.uniform(-1, 3)))
    home_corners = max(0, home_corners)
    away_corners = max(0, away_corners)

    # Fouls / Cards
    home_fouls = random.randint(8, 20)
    away_fouls = random.randint(8, 20)
    home_yellows = random.randint(0, 3 if hs < as_ else 2)
    away_yellows = random.randint(0, 3 if as_ < hs else 2)
    home_reds = 1 if random.random() < 0.05 else 0
    away_reds = 1 if random.random() < 0.05 else 0

    return {
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

def main():
    print("Generating static JSON files...")
    
    with get_session() as s:
        # 1. teams.json
        print("  Writing teams.json...")
        teams_data = list_teams(s)
        # Convert Pydantic schemas to dict if necessary
        teams_data_raw = [t.model_dump() if hasattr(t, "model_dump") else t for t in teams_data]
        with open(OUTPUT_DIR / "teams.json", "w", encoding="utf-8") as f:
            json.dump(teams_data_raw, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 2. venues.json
        print("  Writing venues.json...")
        venues_data = list_venues(s)
        venues_data_raw = [v.model_dump() if hasattr(v, "model_dump") else v for v in venues_data]
        with open(OUTPUT_DIR / "venues.json", "w", encoding="utf-8") as f:
            json.dump(venues_data_raw, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 3. matches.json (all WC 2026 matches)
        print("  Writing matches.json...")
        matches_data = list_matches(s, limit=200)
        matches_data_raw = [m.model_dump() if hasattr(m, "model_dump") else m for m in matches_data]
        with open(OUTPUT_DIR / "matches.json", "w", encoding="utf-8") as f:
            json.dump(matches_data_raw, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 4. simulation-latest.json
        print("  Writing simulation-latest.json...")
        sim_data = latest(s)
        with open(OUTPUT_DIR / "simulation-latest.json", "w", encoding="utf-8") as f:
            json.dump(sim_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 5. bracket.json
        print("  Writing bracket.json...")
        bracket_data = bracket(s)
        with open(OUTPUT_DIR / "bracket.json", "w", encoding="utf-8") as f:
            json.dump(bracket_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 6. multiverse-champions.json
        print("  Writing multiverse-champions.json...")
        champions_data = champions(s)
        with open(OUTPUT_DIR / "multiverse-champions.json", "w", encoding="utf-8") as f:
            json.dump(champions_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 7. pivot-matches.json
        print("  Writing pivot-matches.json...")
        pivot_data = pivot_matches(s)
        with open(OUTPUT_DIR / "pivot-matches.json", "w", encoding="utf-8") as f:
            json.dump(pivot_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 8. calibration.json
        print("  Writing calibration.json...")
        calibration_data = calibration(s)
        with open(OUTPUT_DIR / "calibration.json", "w", encoding="utf-8") as f:
            json.dump(calibration_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 9. baselines.json
        print("  Writing baselines.json...")
        baselines_data = baselines()
        with open(OUTPUT_DIR / "baselines.json", "w", encoding="utf-8") as f:
            json.dump(baselines_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 10. models.json
        print("  Writing models.json...")
        models_data = models(s)
        with open(OUTPUT_DIR / "models.json", "w", encoding="utf-8") as f:
            json.dump(models_data, f, ensure_ascii=False, indent=2, default=custom_json_serializer)
            
        # 11. team-recent-matches.json (historical matches for the 57 teams)
        print("  Writing team-recent-matches.json...")
        teams_list = [t["team_id"] for t in teams_data_raw]
        recent_matches_by_team = {}
        
        for team_id in teams_list:
            # Query recent matches for this team
            rows = s.execute(
                select(HistoricalMatch)
                .where((HistoricalMatch.home_team == team_id) | (HistoricalMatch.away_team == team_id))
                .order_by(HistoricalMatch.match_date.desc())
                .limit(30)
            ).scalars().all()
            
            recent_matches_by_team[team_id] = [
                {
                    "date": str(m.match_date),
                    "home": m.home_team,
                    "away": m.away_team,
                    "home_score": m.home_score,
                    "away_score": m.away_score,
                    "neutral": m.neutral,
                    "tournament": m.tournament,
                    "stats": get_or_generate_match_stats(m)
                }
                for m in rows
            ]
            
        with open(OUTPUT_DIR / "team-recent-matches.json", "w", encoding="utf-8") as f:
            json.dump(recent_matches_by_team, f, ensure_ascii=False, separators=(",", ":"))
            
        print("Done! All static JSON files written successfully to:", OUTPUT_DIR)

if __name__ == "__main__":
    main()
