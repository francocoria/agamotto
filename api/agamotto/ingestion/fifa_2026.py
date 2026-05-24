"""Adapter de seed data del Mundial 2026: tournament, venues, teams, fixtures."""

from datetime import date

from sqlalchemy import delete

from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import Match, Team, Tournament, Venue
from agamotto.ingestion.base import Adapter
from agamotto.ingestion.seed.fixtures_2026 import all_fixtures
from agamotto.ingestion.seed.teams_2026 import TEAMS_2026
from agamotto.ingestion.seed.venues_2026 import VENUES_2026

log = get_logger(__name__)

TOURNAMENT_ID = "WC2026"


class Fifa2026Adapter(Adapter):
    name = "fifa-2026"

    def execute(self) -> int:
        with get_session() as s:
            # Limpieza para reingesta
            s.execute(delete(Match).where(Match.tournament_id == TOURNAMENT_ID))
            s.execute(delete(Tournament).where(Tournament.tournament_id == TOURNAMENT_ID))
            # NO borramos teams ni venues — son referenciados por históricos / otros torneos

            # Tournament
            s.add(Tournament(
                tournament_id=TOURNAMENT_ID,
                name="FIFA World Cup 2026",
                year=2026,
                host_countries=["USA", "Mexico", "Canada"],
                start_date=date(2026, 6, 11),
                end_date=date(2026, 7, 19),
            ))

            # Venues — upsert
            existing_venues = {v.venue_id for v in s.query(Venue).all()}
            for v in VENUES_2026:
                if v["venue_id"] not in existing_venues:
                    s.add(Venue(**v))

            # Teams — upsert
            existing_teams = {t.team_id for t in s.query(Team).all()}
            for tid, name, code, conf, rank, elo, flag in TEAMS_2026:
                if tid not in existing_teams:
                    s.add(Team(
                        team_id=tid, name=name, fifa_code=code,
                        confederation=conf, fifa_rank=rank, elo=elo, flag_emoji=flag,
                    ))

            # Fixtures
            for f in all_fixtures():
                s.add(Match(
                    match_id=f["match_id"],
                    tournament_id=TOURNAMENT_ID,
                    stage=f["stage"],
                    group_label=f["group_label"],
                    match_number=f["match_number"],
                    kickoff_utc=f["kickoff_utc"],
                    venue_id=f["venue_id"],
                    home_team_id=f["home_team_id"],
                    away_team_id=f["away_team_id"],
                    status="scheduled",
                ))

        return len(VENUES_2026) + len(TEAMS_2026) + len(all_fixtures())


def run() -> int:
    return Fifa2026Adapter().run()
