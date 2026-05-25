from datetime import datetime

from pydantic import BaseModel


class TeamOut(BaseModel):
    team_id: str
    name: str
    fifa_code: str | None = None
    confederation: str
    fifa_rank: int | None = None
    elo: float | None = None
    flag_emoji: str | None = None


class VenueOut(BaseModel):
    venue_id: str
    name: str
    city: str
    country: str
    altitude_m: int | None = None
    capacity: int | None = None
    surface: str | None = None
    roof: str | None = None
    timezone: str
    latitude: float | None = None
    longitude: float | None = None


class PredictionInline(BaseModel):
    p_home: float
    p_draw: float
    p_away: float
    lambda_home: float
    lambda_away: float
    p_over_2_5: float | None = None
    p_btts: float | None = None
    top_scorelines: list[ScorelineOut] = []
    top_factors: list[FactorOut] = []


class MatchOut(BaseModel):
    match_id: str
    tournament_id: str
    stage: str
    group_label: str | None = None
    match_number: int | None = None
    kickoff_utc: datetime
    venue: VenueOut | None = None
    home_team: TeamOut | None = None
    away_team: TeamOut | None = None
    home_score: int | None = None
    away_score: int | None = None
    status: str
    prediction: PredictionInline | None = None


class ScorelineOut(BaseModel):
    score: str
    p: float


class FactorOut(BaseModel):
    name: str
    value: float
    direction: str
    weight: float


class MatchPredictionOut(BaseModel):
    match_id: str
    model_version: str
    as_of: datetime
    home_team: TeamOut | None = None
    away_team: TeamOut | None = None
    venue: VenueOut | None = None
    p_home: float
    p_draw: float
    p_away: float
    lambda_home: float
    lambda_away: float
    p_over_2_5: float | None = None
    p_btts: float | None = None
    top_scorelines: list[ScorelineOut]
    top_factors: list[FactorOut]


class TeamOutlookOut(BaseModel):
    team_id: str
    name: str | None = None
    p_group_winner: float
    p_runner_up: float
    p_best_third: float
    p_round_32: float
    p_round_16: float
    p_quarter: float
    p_semi: float
    p_final: float
    p_champion: float


class ChampionDistEntry(BaseModel):
    team: str
    p: float


class SimulationOut(BaseModel):
    simulation_id: int
    tournament_id: str
    model_version: str
    n_runs: int
    created_at: datetime
    champion_distribution: list[ChampionDistEntry]
    team_outlook: dict[str, dict]
    sampled_universes: list[dict]


class CounterfactualInput(BaseModel):
    conditions: list[dict]
    n_runs: int = 5000


class PivotMatch(BaseModel):
    match_id: str
    home_team_id: str | None
    away_team_id: str | None
    impact_score: float
    description: str


class CalibrationOut(BaseModel):
    model_version: str
    bins: list[dict]
    brier: float | None = None
    log_loss: float | None = None
