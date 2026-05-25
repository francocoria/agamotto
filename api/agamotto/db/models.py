"""SQLAlchemy ORM models. Mirrors the schema in docs/Agamotto_Plan_Integral.md (Anexo B)."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from agamotto.core.db import Base


# ------------------------------------------------------------------
# Core entities
# ------------------------------------------------------------------

class Tournament(Base):
    __tablename__ = "tournaments"
    tournament_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    host_countries: Mapped[list] = mapped_column(JSON, default=list)
    start_date: Mapped[Date | None] = mapped_column(Date)
    end_date: Mapped[Date | None] = mapped_column(Date)


class Team(Base):
    __tablename__ = "teams"
    team_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    fifa_code: Mapped[str | None] = mapped_column(String(4))
    confederation: Mapped[str] = mapped_column(String, nullable=False)
    fifa_rank: Mapped[int | None] = mapped_column(Integer)
    elo: Mapped[float | None] = mapped_column(Float)
    flag_emoji: Mapped[str | None] = mapped_column(String(8))


class TeamAlias(Base):
    __tablename__ = "team_aliases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.team_id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_id: Mapped[str] = mapped_column(String, nullable=False)
    __table_args__ = (UniqueConstraint("provider", "provider_id"),)


class Venue(Base):
    __tablename__ = "venues"
    venue_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    altitude_m: Mapped[int | None] = mapped_column(Integer)
    capacity: Mapped[int | None] = mapped_column(Integer)
    surface: Mapped[str | None] = mapped_column(String)
    roof: Mapped[str | None] = mapped_column(String)
    timezone: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)


class Player(Base):
    __tablename__ = "players"
    player_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String)
    dob: Mapped[Date | None] = mapped_column(Date)
    position: Mapped[str | None] = mapped_column(String(4))
    foot: Mapped[str | None] = mapped_column(String(8))
    height_cm: Mapped[int | None] = mapped_column(Integer)
    nation: Mapped[str | None] = mapped_column(String)
    club: Mapped[str | None] = mapped_column(String)
    league: Mapped[str | None] = mapped_column(String)
    market_value_eur: Mapped[float | None] = mapped_column(Float)


class PlayerAlias(Base):
    __tablename__ = "player_aliases"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.player_id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    provider_id: Mapped[str] = mapped_column(String, nullable=False)
    __table_args__ = (UniqueConstraint("provider", "provider_id"),)


class Squad(Base):
    __tablename__ = "squads"
    squad_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.team_id"), nullable=False)
    tournament_id: Mapped[str] = mapped_column(ForeignKey("tournaments.tournament_id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)  # provisional/announced/official/replacement
    valid_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime)


class SquadPlayer(Base):
    __tablename__ = "squad_players"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    squad_id: Mapped[int] = mapped_column(ForeignKey("squads.squad_id"), nullable=False)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.player_id"), nullable=False)
    shirt_number: Mapped[int | None] = mapped_column(Integer)
    role: Mapped[str | None] = mapped_column(String)
    is_starter_prob: Mapped[float | None] = mapped_column(Float)
    availability: Mapped[str] = mapped_column(String, default="available")


class Referee(Base):
    __tablename__ = "referees"
    referee_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str | None] = mapped_column(String)
    avg_yellows: Mapped[float | None] = mapped_column(Float)
    avg_reds: Mapped[float | None] = mapped_column(Float)
    avg_pens: Mapped[float | None] = mapped_column(Float)


class Match(Base):
    __tablename__ = "matches"
    match_id: Mapped[str] = mapped_column(String, primary_key=True)
    tournament_id: Mapped[str] = mapped_column(ForeignKey("tournaments.tournament_id"), nullable=False)
    stage: Mapped[str] = mapped_column(String, nullable=False)  # group/round_32/round_16/...
    group_label: Mapped[str | None] = mapped_column(String(4))
    match_number: Mapped[int | None] = mapped_column(Integer)
    kickoff_utc: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.venue_id"))
    home_team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.team_id"))
    away_team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.team_id"))
    home_score: Mapped[int | None] = mapped_column(Integer)
    away_score: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="scheduled")
    referee_id: Mapped[str | None] = mapped_column(ForeignKey("referees.referee_id"))

    venue = relationship("Venue", lazy="joined")
    home_team = relationship("Team", foreign_keys=[home_team_id], lazy="joined")
    away_team = relationship("Team", foreign_keys=[away_team_id], lazy="joined")

    __table_args__ = (
        Index("ix_matches_tournament_stage", "tournament_id", "stage"),
        Index("ix_matches_kickoff", "kickoff_utc"),
    )


class Lineup(Base):
    __tablename__ = "lineups"
    lineup_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.match_id"), nullable=False)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.team_id"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)  # probable/official
    formation: Mapped[str | None] = mapped_column(String(16))
    captured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    payload: Mapped[dict | None] = mapped_column(JSON)


class LineupPlayer(Base):
    __tablename__ = "lineup_players"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lineup_id: Mapped[int] = mapped_column(ForeignKey("lineups.lineup_id"), nullable=False)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.player_id"), nullable=False)
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[str | None] = mapped_column(String(4))


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.match_id"), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    temp_c: Mapped[float | None] = mapped_column(Float)
    feels_like_c: Mapped[float | None] = mapped_column(Float)
    humidity: Mapped[float | None] = mapped_column(Float)
    precipitation_mm: Mapped[float | None] = mapped_column(Float)
    precipitation_prob: Mapped[float | None] = mapped_column(Float)
    wind_kmh: Mapped[float | None] = mapped_column(Float)
    air_quality: Mapped[float | None] = mapped_column(Float)


class Odds(Base):
    __tablename__ = "odds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.match_id"), nullable=False)
    bookmaker: Mapped[str] = mapped_column(String, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    home: Mapped[float | None] = mapped_column(Float)
    draw: Mapped[float | None] = mapped_column(Float)
    away: Mapped[float | None] = mapped_column(Float)
    over_2_5: Mapped[float | None] = mapped_column(Float)
    under_2_5: Mapped[float | None] = mapped_column(Float)
    btts_yes: Mapped[float | None] = mapped_column(Float)
    btts_no: Mapped[float | None] = mapped_column(Float)


class Injury(Base):
    __tablename__ = "injuries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.player_id"), nullable=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    description: Mapped[str | None] = mapped_column(Text)
    expected_return: Mapped[Date | None] = mapped_column(Date)
    severity: Mapped[str | None] = mapped_column(String)


# ------------------------------------------------------------------
# Historical results (for training Elo / Poisson)
# ------------------------------------------------------------------

class HistoricalMatch(Base):
    __tablename__ = "historical_matches"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_date: Mapped[Date] = mapped_column(Date, nullable=False)
    home_team: Mapped[str] = mapped_column(String, nullable=False)
    away_team: Mapped[str] = mapped_column(String, nullable=False)
    home_score: Mapped[int] = mapped_column(Integer, nullable=False)
    away_score: Mapped[int] = mapped_column(Integer, nullable=False)
    tournament: Mapped[str | None] = mapped_column(String)
    city: Mapped[str | None] = mapped_column(String)
    country: Mapped[str | None] = mapped_column(String)
    neutral: Mapped[bool] = mapped_column(Boolean, default=False)
    stats: Mapped[dict | None] = mapped_column(JSON)

    __table_args__ = (
        Index("ix_hist_date", "match_date"),
        Index("ix_hist_home", "home_team"),
        Index("ix_hist_away", "away_team"),
    )


# ------------------------------------------------------------------
# Analytical
# ------------------------------------------------------------------

class FeatureSnapshot(Base):
    __tablename__ = "feature_snapshots"
    snapshot_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.match_id"), nullable=False)
    feature_set_version: Mapped[str] = mapped_column(String, nullable=False)
    as_of_kickoff: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    features: Mapped[dict] = mapped_column(JSON, nullable=False)


class ModelVersion(Base):
    __tablename__ = "model_versions"
    model_version_id: Mapped[str] = mapped_column(String, primary_key=True)
    family: Mapped[str] = mapped_column(String, nullable=False)  # elo/poisson/dixon-coles/ml/ensemble/...
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    params: Mapped[dict | None] = mapped_column(JSON)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    artifact_path: Mapped[str | None] = mapped_column(String)


class Prediction(Base):
    __tablename__ = "predictions"
    prediction_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.match_id"), nullable=False)
    model_version_id: Mapped[str] = mapped_column(ForeignKey("model_versions.model_version_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    p_home: Mapped[float | None] = mapped_column(Float)
    p_draw: Mapped[float | None] = mapped_column(Float)
    p_away: Mapped[float | None] = mapped_column(Float)
    lambda_home: Mapped[float | None] = mapped_column(Float)
    lambda_away: Mapped[float | None] = mapped_column(Float)
    expected_goals_home: Mapped[float | None] = mapped_column(Float)
    expected_goals_away: Mapped[float | None] = mapped_column(Float)
    p_over_2_5: Mapped[float | None] = mapped_column(Float)
    p_btts: Mapped[float | None] = mapped_column(Float)
    scoreline_matrix: Mapped[dict | None] = mapped_column(JSON)
    top_factors: Mapped[list | None] = mapped_column(JSON)

    __table_args__ = (Index("ix_pred_match_model", "match_id", "model_version_id"),)


class Simulation(Base):
    __tablename__ = "simulations"
    simulation_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tournament_id: Mapped[str] = mapped_column(ForeignKey("tournaments.tournament_id"), nullable=False)
    model_version_id: Mapped[str] = mapped_column(ForeignKey("model_versions.model_version_id"), nullable=False)
    n_runs: Mapped[int] = mapped_column(Integer, nullable=False)
    seed: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    aggregates: Mapped[dict] = mapped_column(JSON, nullable=False)
    conditions: Mapped[list | None] = mapped_column(JSON)  # null for baseline; list for counterfactual
    parent_simulation_id: Mapped[int | None] = mapped_column(ForeignKey("simulations.simulation_id"))


class Counterfactual(Base):
    __tablename__ = "counterfactuals"
    scenario_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str | None] = mapped_column(String)
    conditions: Mapped[list] = mapped_column(JSON, nullable=False)
    simulation_id: Mapped[int | None] = mapped_column(ForeignKey("simulations.simulation_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


# ------------------------------------------------------------------
# Operational
# ------------------------------------------------------------------

class RawPayload(Base):
    __tablename__ = "raw_payloads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    endpoint: Mapped[str | None] = mapped_column(String)
    captured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    payload_hash: Mapped[str | None] = mapped_column(String(64))
    payload: Mapped[dict | str | None] = mapped_column(JSON)


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    rows_processed: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String, default="running")
    error: Mapped[str | None] = mapped_column(Text)


__all__ = [
    "Tournament", "Team", "TeamAlias", "Venue", "Player", "PlayerAlias",
    "Squad", "SquadPlayer", "Referee", "Match", "Lineup", "LineupPlayer",
    "WeatherForecast", "Odds", "Injury", "HistoricalMatch",
    "FeatureSnapshot", "ModelVersion", "Prediction", "Simulation", "Counterfactual",
    "RawPayload", "IngestionRun",
]
